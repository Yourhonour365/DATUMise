import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import api from "./api/api";
import ObservationCreateForm from "./ObservationCreateForm";
import ObservationDetail from "./ObservationDetail"; 
import ObservationEditForm from "./ObservationEditForm";

function Home() {
  return (
    <div className="container mt-5">
      <h1>DATUMise Observations</h1>
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
  const [loading, setLoading] = useState(true);
  const [nextPage, setNextPage] = useState(null);
  const [previousPage, setPreviousPage] = useState(null);

  useEffect(() => {
    api.get("/api/observations/")
      .then((response) => {
        setObservations(response.data.results);
        setNextPage(response.data.next);
        setPreviousPage(response.data.previous);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching observations:", error);
      });
  }, []);

  const handlePageChange = (url) => {
    window.scrollTo(0, 0);
    setLoading(true);

    api.get(url)
      .then((response) => {
        setObservations(response.data.results);
        setNextPage(response.data.next);
        setPreviousPage(response.data.previous);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching paginated observations:", error);
      });
  };



  return (
    <div className="container mt-5">
      
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3 className="mb-3">Observations</h3>
        <Link to="/observations/create" className="btn btn-primary btn-sm">
          + New Observation
        </Link>
      </div>
      
      {loading && <p>Loading observations...</p>}

      {!loading && observations.length === 0 && (
        <p>No observations yet.</p>
      )}

      {!loading && observations.map((obs) => (
        
        <div key={obs.id} className="card mb-3 shadow-sm">
          <div className="card-body d-flex gap-3 align-items-center">
            {obs.image && (
              <img
                src={obs.image}
                alt={obs.title}
                className="img-fluid rounded mb-2"
                style={{ maxHeight: "120px", objectFit: "contain" }}
              />
            )}
            
            <div style={{ flex: 1 }}>
            <h5>
              <Link to={`/observations/${obs.id}`}>{obs.title}</Link>
            </h5>

            

            <p>{obs.description.slice(0, 120)}{obs.description.length > 120 && "..."}</p>
            <small>
              <Link to={`/observations/${obs.id}#comment-form`} className="text-muted text-decoration-underline">
                💬 {
                  obs.comment_count === 0
                    ? "Add first comment"
                    : obs.comment_count === 1
                    ? "1 comment"
                    : `${obs.comment_count} comments`
                    }
              </Link>
            </small>
            <br />
            <small className="text-muted">
              {obs.owner} •{" "}
              {new Date(obs.created_at).toLocaleString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </small>
          </div>
        </div>
        </div>
      ))}
      <div className="d-flex justify-content-center gap-2 mt-4 mb-4">
        {previousPage && (
          <button
            className="btn btn-outline-secondary btn-sm"
            onClick={() => handlePageChange(previousPage)}
          >
            Previous
          </button>
        )}

        {nextPage && (
          <button
            className="btn btn-outline-secondary btn-sm"
            onClick={() => handlePageChange(nextPage)}
          >
            Next
          </button>
        )}
      </div>

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
        <Route path="/observations/:id" element={<ObservationDetail />} />
        <Route path="/observations/:id/edit" element={<ObservationEditForm />} />
      </Routes>
    </Router>
  );
}

export default App;