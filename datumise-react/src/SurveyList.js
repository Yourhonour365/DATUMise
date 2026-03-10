import React from "react";
import { useState, useEffect } from "react";
import api from "./api/api";

function SurveyList() {

 const [surveys, setSurveys] = useState([]);
 const [loading, setLoading] = useState(true);

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
      <h3>Surveys ({surveys.length})</h3>
      {loading && <p>Loading surveys...</p>}
      {!loading &&
        surveys.map((survey) => (
            <div key={survey.id} className="card mb-3 shadow-sm">
            <div className="card-body">
                <h5 className="mb-1">{survey.name}</h5>
                <small className="text-muted">
                Status: {survey.status}
                </small>
            </div>
            </div>
        ))}
    </div>
  );
}

export default SurveyList;