import React from "react";
import { useState, useEffect } from "react";
import api from "./api/api";
import { useNavigate } from "react-router-dom";


function SurveyList() {

 const [surveys, setSurveys] = useState([]);
 const [loading, setLoading] = useState(true);
 const navigate = useNavigate();

    useEffect(() => {
        const fetchSurveys = async () => {
            try {
            const response = await api.get("/api/surveys/");
            setSurveys(response.data.results);
            setLoading(false);
            } catch (err) {
            console.log(err);
            }
        };

  fetchSurveys();
}, []);

  return (
    <div className="container mt-4">
      <h3 className="mb-4">Surveys ({surveys.length})</h3>
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
                    Status: {survey.status} •{" "}
                    {new Date(survey.created_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                    })}
                </small>
            </div>
            </div>
        ))}
    </div>
  );
}

export default SurveyList;