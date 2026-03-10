import React from "react";
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import api from "./api/api";

function SurveyDetail() {
    const { id } = useParams();
    const [survey, setSurvey] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSurvey = async () => {
            try {
            const response = await api.get(`/api/surveys/${id}/`);
            setSurvey(response.data);
            setLoading(false);
            } catch (err) {
            console.log(err);
            }
        };

  fetchSurvey();
}, [id]);
    return (
        <div className="container mt-4">
        <h3>Survey Detail</h3>
        {loading && <p>Loading survey...</p>}
        {!loading && survey && <h5>{survey.name}</h5>}
        {!loading && survey && (
        <p className="text-muted">Status: {survey.status}</p>
        )}
        {!loading && survey && (
            <p className="text-muted">
                Created:{" "}
                {new Date(survey.created_at).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
                })}
            </p>
            )}
        {!loading && survey && (
            <p className="text-muted">
                Observations: {survey.observations?.length || 0}
            </p>
            )}
        </div>
    );
    }

export default SurveyDetail;