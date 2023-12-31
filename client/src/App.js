import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Alert } from 'react-bootstrap';
import { HomePage } from './HomePageComponents';
import { MyNavbar } from './NavbarComponents';
import { LoginForm } from './LoginComponents';
import { useEffect, useState } from 'react';
import API from './API';
import { CreatePlan } from './CreatePlanComponents';
import Toast from 'react-bootstrap/Toast'
import ToastContainer from 'react-bootstrap/ToastContainer'

function App() {
  return (
    <Router>
      <App2 />
    </Router>
  )
}

function App2() {

  const [exams, setExams] = useState([]);
  const [studyPlan, setStudyPlan] = useState([]);
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState({});
  const [dirty, setDirty] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const navigate = useNavigate();

  const handleSuccess = (msg) => {
    setSuccessMessage(msg);
    setShowSuccess(true);
  }

  const handleError = (err, msg) => {
    //console.log(err);  //uncomment for debugging
    setErrorMessage(msg);
  }

  const checkAuth = async () => {
    try {
      const user = await API.getUserInfo();
      setLoggedIn(true);
      setUser(user);
    } catch (err) {
    }
  };

  useEffect(() => {
    checkAuth();
    API.getAllCourses()
      .then((exams) => { setExams(exams); setDirty(false); })
      .catch(err => handleError(err, "Errore nel caricamento dei corsi"))
  }, [dirty])

  useEffect(() => {
    if (loggedIn)
      API.getStudyPlan()
        .then((courses) => { setStudyPlan(courses); setDirty(false); })
        .catch(err => handleError(err, "Errore nel caricamento del piano di studio"))
  }, [loggedIn, dirty])

  const doLogIn = (credentials) => {
    API.logIn(credentials)
      .then(user => {
        setLoggedIn(true);
        setUser(user);
        navigate('/');
      })
      .catch(err => {
        handleError(err, err);
      }
      )
  }

  const doLogOut = async () => {
    await API.logOut();
    setLoggedIn(false);
    setUser({});
    setStudyPlan([]);
    navigate('/');
  }

  //To delete studyplan from db
  const deleteStudyPlan = async () => {
    API.decrementStudentsNumber() //decrement number of students enrolled
      .then(() => API.deleteStudyPlan())  //delete study plan
      .then(() => API.setEnrollmentNull()) //set enrollment null
      .then(() => {
        navigate('/');
        handleSuccess("Piano di studio eliminato correttamente");
        setStudyPlan([]);
        user.enrollment = null;
        setDirty(true);
      })
      .catch(err => {
        handleError(err, "Errore durante la cancellazione del piano di studio. Impossibile completare l'operazione.");
      })
  }

  const addStudyPlan = async (enrollment, studyPlan) => {

    if (user.enrollment !== null) {
      //delete old study plan
      await API.decrementStudentsNumber()
        .then(() => API.deleteStudyPlan())
        .catch(err => {
          handleError(err, "Errore durante la cancellazione del piano di studio. Impossibile completare l'operazione.");
         })
    }
    //update student's enrollment
    API.updateEnrollment(enrollment)
      //add new study plan
      .then(() => API.addStudyPlan(studyPlan.map((e)=>e.code)))
      //update number of students
      .then(() => API.incrementStudentsNumber())
      .then(() => {
        navigate('/');
        handleSuccess("Piano di studio inserito correttamente")
        setStudyPlan(studyPlan);
        user.enrollment = enrollment;
        setDirty(true);
      })
      .catch(err => {
          handleError(err, "Errore durante l'inserimento del piano di studio. Impossibile completare l'operazione.");
      })
  }

  return (
    <>
      <MyNavbar name={user.name} loggedIn={loggedIn} logout={doLogOut} />
      <br />
      <Container>
        {errorMessage ?  //Error Alert
          <Row className="justify-content-center"><Col xs={6}>
            <Alert variant='danger' onClose={() => setErrorMessage('')} dismissible>{errorMessage}</Alert>
          </Col></Row>
          : false}
        {showSuccess ?  //Success toast
          (<div className="position-relative">
            <ToastContainer position='top-center'>
              <Toast bg='success' onClose={() => setShowSuccess(false)} show={showSuccess} delay={2000} autohide>
                <Toast.Body className='text-white'>{successMessage}</Toast.Body>
              </Toast>
            </ToastContainer>
          </div>)
          : false}

        <Routes>
          <Route path='/' element={<HomePage exams={exams} studyPlan={studyPlan} delete={deleteStudyPlan} loggedIn={loggedIn} user={user}></HomePage>} />
          <Route path='/login' element={loggedIn ?
            <Navigate to='/' />
            : <LoginForm login={doLogIn} setDirty={setDirty} setErrorMessage={setErrorMessage} />} />
          <Route path='/edit' element={loggedIn ?
            <CreatePlan exams={exams} setExams={setExams} studyPlan={studyPlan} user={user} save={addStudyPlan} setDirty={setDirty} />
            : <Navigate to='/login' />} />
          <Route path='*' element={<h1 className='text-center'>Page not found</h1>}> </Route>
        </Routes>
      </Container>
    </>
  );
}

export default App;
