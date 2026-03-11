import React from "react";
import { useState, useEffect } from "react";
import api from "./api/api";
import { useNavigate } from "react-router-dom";


function SurveyList() {

 const [surveys, setSurveys] = useState([]);
 const [loading, setLoading] = useState(true);
 const navigate = useNavigate();
 const [searchTerm, setSearchTerm] = useState("");
 const [statusFilter, setStatusFilter] = useState("");
 const [nextPage, setNextPage] = useState(null);
 const [previousPage, setPreviousPage] = useState(null);
 const [error, setError] = useState("");

    useEffect(() => {
      const fetchSurveys = async () => {
        try {
          const response = await api.get(
            `/api/surveys/?search=${searchTerm}&status=${statusFilter}`
          );
          setSurveys(response.data.results);
          setNextPage(response.data.next);
          setPreviousPage(response.data.previous);
          setLoading(false);
        } catch (err) {
          console.log(err);
          setError("Failed to load surveys.");
          setLoading(false);
        }
      };

      fetchSurveys();
    }, [searchTerm, statusFilter]);

  return (
    <div className="container mt-4">

        <input
            type="text"
            className="form-control mb-3"
            placeholder="Search surveys..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button
            className="btn btn-outline-secondary btn-sm mb-3"
            onClick={() => setSearchTerm("")}
            >
            Clear Search
        </button>

        <select
            className="form-select mb-3"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            >
            <option value="">All statuses</option>
            <option value="created">Created</option>
            <option value="live">Live</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
            <option value="submitted">Submitted</option>
        </select>

        <button
            className="btn btn-outline-secondary btn-sm mb-3"
            onClick={() => {
                setSearchTerm("");
                setStatusFilter("");
            }}
            >
            Clear Filters
        </button>
        
      <h3 className="mb-4">Surveys ({surveys.length})</h3>

      {error && <p className="text-danger">{error}</p>}

      {loading && <p>Loading surveys...</p>}

      {!loading &&
          [...surveys]
          
            .sort((a, b) => b.urgent - a.urgent)
            .map((survey) => (

            <div
                key={survey.id}
                className="card mb-3 shadow-sm"
                style={{ cursor: "pointer" }}
                onClick={() => navigate(`/surveys/${survey.id}`)}
            >
            <div className="card-body">
                <h5 className="mb-1">
                    {survey.urgent && (
                        <span className="badge bg-danger me-2">URGENT</span>
                    )}
                    {survey.name}
                </h5>
                <small className="text-muted">
                    Status: 
                    <span className={`badge ms-1
                        ${survey.status === "created" ? "bg-secondary" : ""}
                        ${survey.status === "live" ? "bg-success" : ""}
                        ${survey.status === "paused" ? "bg-warning text-dark" : ""}
                        ${survey.status === "completed" ? "bg-primary" : ""}
                        ${survey.status === "submitted" ? "bg-dark" : ""}
                    `}>
                        {survey.status_display}
                    </span>
                    {" • "}
                    {new Date(survey.created_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                    })}
                </small>
            </div>
            </div>
                ))}

        <div className="d-flex justify-content-between mt-3">
          <button
            className="btn btn-outline-secondary"
            onClick={() =>
              previousPage &&
              api.get(previousPage).then((response) => {
                setSurveys(response.data.results);
                setNextPage(response.data.next);
                setPreviousPage(response.data.previous);
              })
            }
            disabled={!previousPage}
          >
            Previous
          </button>

          <button
            className="btn btn-outline-secondary"
            onClick={() =>
              nextPage &&
              api.get(nextPage).then((response) => {
                setSurveys(response.data.results);
                setNextPage(response.data.next);
                setPreviousPage(response.data.previous);
              })
            }
            disabled={!nextPage}
          >
            Next
          </button>
        </div>

    </div>
  );
}

export default SurveyList;