'use strict'
const sqlite = require('sqlite3');
const { Course } = require('./course');

const db = new sqlite.Database('studyPlan.db', (err) => {
  if (err) throw err;
});

//get all courses
exports.listCourses = () => {
  return new Promise((resolve, reject) => {
    const sql = "SELECT exams.code, name, CFU, student, maxStudent, prerequisite, incompatibility.code2 FROM exams LEFT JOIN incompatibility ON exams.code=incompatibility.code1 ORDER BY name";
    db.all(sql, [], (err, rows) => {
      if (err)
        reject(err);
      else {

        const temp = rows.map(row => new Course(row.code, row.name, row.cfu, row.student, row.maxStudent, row.prerequisite, [row.code2]));
        let course = [];

        //to merge courses with more than one incompatibility
        temp.forEach((item) => {
          let existing = course.filter(elem => {
            return elem.code === item.code;
          });
          if (existing.length) {
            let existingIndex = course.indexOf(existing[0]);
            course[existingIndex].incompatibility = [...course[existingIndex].incompatibility, item.incompatibility].flat();
          } else {
            course.push(item);
          }
        });

        resolve(course);
      }
    });
  })
}

// get study plan of a student
exports.listStudyPlan = (userId) => {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT exams.code, name, CFU, student, maxStudent, prerequisite FROM exams JOIN studyPlans ON exams.code=studyPlans.code WHERE id = ?';
    db.all(sql, [userId], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      const studyPlan = rows.map(row => new Course(row.code, row.name, row.cfu, row.student, row.maxStudent, row.prerequisite));
      resolve(studyPlan);
    });
  });
};

//delete studyPlan
exports.deleteStudyPlan = (user) => {
  return new Promise((resolve, reject) => {
    const sql = "DELETE FROM studyPlans WHERE id=?";
    db.run(sql, [user], function (err) {
      if (err) reject(err);
      else resolve(null);
    })
  });
}

//update enrollment
exports.updateEnrollment = (enrollment) => {
  return new Promise((resolve, reject) => {
    const sql = "UPDATE users SET enrollment=? WHERE id=?";
    db.run(sql, [enrollment.enrollment, enrollment.id], function (err) {
      if (err) {
        reject(err);
        return;
      }
      resolve(this.id);
    })
  });
}

//add exam to the study plan
exports.addStudyPlan = (studyPlan) => {
  return new Promise((resolve, reject) => {
    for (const exam of studyPlan.courses) {
      const sql = "INSERT INTO studyPlans(id, code) values (?,?)";
      db.run(sql, [studyPlan.id, exam], function (err) {
        if (err) {
          reject(err);
          return;
        } else resolve(this.id);
      })
    }
  });
}

//increment student's number
exports.incrementStudentsNumber = (id) => {
  return new Promise((resolve, reject) => {
    const sql = "UPDATE exams SET student=student+1 WHERE code IN (SELECT code FROM studyPlans WHERE id=?)";
      db.run(sql, [id], function (err) {
        if (err) {
          reject(err);
          return;
        } else resolve(this.id);
      })
  });
}

//decrement student's number
exports.decrementStudentsNumber = (id) => {
  return new Promise((resolve, reject) => {
      const sql = "UPDATE exams SET student=student-1 WHERE code IN (SELECT code FROM studyPlans WHERE id=?)";
      db.run(sql, [id], function (err) {
        if (err) {
          reject(err);
          return;
        } else resolve(this.id);
      })
  });
}