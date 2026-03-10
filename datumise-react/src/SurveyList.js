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
      <h3>Surveys</h3>
      {loading && <p>Loading surveys...</p>}
      {!loading && <p>{surveys.length} surveys found.</p>}
    </div>
  );
}

export default SurveyList;