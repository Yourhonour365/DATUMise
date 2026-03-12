import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import api from "./api/api";
import ObservationCreateForm from "./ObservationCreateForm";
import ObservationDetail from "./ObservationDetail"; 
import ObservationEditForm from "./ObservationEditForm";
import ObservationList from "./ObservationList";
import SurveyList from "./SurveyList";
import SurveyDetail from "./SurveyDetail";
import SurveyCapture from "./SurveyCapture";
import Register from "./Register";
import Login from "./Login";

function Home() {
  return (
    <div className="container mt-5">
      <h1>DATUMise Observations</h1>
      <p>Structured site observations platform.</p>
    </div>
  );
}





  

function App() {

  const handleLogout = async () => {
    try {
      await api.post("/api/auth/logout/");
    } catch (err) {
      console.log("Logout error:", err.response?.data);
    } finally {
      localStorage.removeItem("token");
      setIsLoggedIn(false);
      window.location.href = "/";
    }
  };


const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem("token"));





  return (
    <Router>

      <nav className="navbar navbar-light bg-light px-3">
        
        <Link className="navbar-brand" to="/">DATUMise</Link>
        <Link className="btn btn-outline-dark btn-sm me-2" to="/observations">
          Observations
        </Link>
        <Link className="btn btn-outline-dark btn-sm me-2" to="/surveys">
          Surveys
        </Link>
        
        <div>
          {isLoggedIn ? (
            <button className="btn btn-outline-danger btn-sm" onClick={handleLogout}>
              Logout
            </button>
          ) : (
            <>
              <Link className="btn btn-outline-primary btn-sm me-2" to="/login">Login</Link>
              <Link className="btn btn-outline-secondary btn-sm" to="/register">Register</Link>
            </>
          )}
        </div>
      
      </nav>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/observations" element={<ObservationList />} />
        <Route path="/observations/survey/:surveyId" element={<ObservationList />} />
        <Route path="/observations/create" element={<ObservationCreateForm />} />
        <Route path="/observations/:id" element={<ObservationDetail />} />
        <Route path="/observations/:id/edit" element={<ObservationEditForm />} />
        <Route path="/surveys" element={<SurveyList />} />
        <Route path="/surveys/:id" element={<SurveyDetail />} />
        <Route path="/surveys/:id/capture" element={<SurveyCapture />} />
      </Routes>
    </Router>
  );
}

export default App;