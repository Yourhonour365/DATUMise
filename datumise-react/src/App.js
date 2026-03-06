import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

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
  return (
    <div className="container mt-5">
      <h2>Observations</h2>
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
      </Routes>
    </Router>
  );
}

export default App;


