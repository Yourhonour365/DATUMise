import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import api from "./api/api";
import ObservationCreateForm from "./ObservationCreateForm";
  
function Home() {
  return (
    <div className="container mt-5">
      <h1>DATUMise</h1>
      <p>Structured site observations platform.</p>
    </div>
  );
}

function Login() {
  return (
    <div className="container mt-5">
      <h2>Login</h2>
    </div>
  );
}

function Register() {
  return (
    <div className="container mt-5">
      <h2>Register</h2>
    </div>
  );
}

function Observations() {
  const [observations, setObservations] = useState([]);

  useEffect(() => {
    api.get("/api/observations/")
      .then((response) => {
        setObservations(response.data);
      })
      .catch((error) => {
        console.error("Error fetching observations:", error);
      });
  }, []);

  return (
    <div className="container mt-5">
      <h2>Observations</h2>

      {observations.map((obs) => (
        <div key={obs.id} className="card mb-3">
          <div className="card-body">
            <h5>{obs.title}</h5>
            <p>{obs.description}</p>
            <small>Owner: {obs.owner}</small>
          </div>
        </div>
      ))}
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/observations" element={<Observations />} />
        <Route path="/observations/create" element={<ObservationCreateForm />} />
      </Routes>
    </Router>
  );
}

export default App;