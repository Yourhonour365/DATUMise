from django.urls import path
from .views import (
    ObservationList, ObservationDetail,
    CommentList, CommentDetail,
    SurveyList, SurveyDetail, SurveyAssign,
    ObservationLikeToggle, CommentLikeToggle,
    ClientList, ClientDetail,
    ClientSiteList, ClientSiteDetail,
    TeamList, TeamDetail,
)

urlpatterns = [
    path(
        "observations/",
        ObservationList.as_view(),
        name="observation-list",
    ),
    path(
        "observations/<int:pk>/",
        ObservationDetail.as_view(),
        name="observation-detail",
    ),
    path(
        "comments/",
        CommentList.as_view(),
        name="comment-list",
    ),
    path(
        "comments/<int:pk>/",
        CommentDetail.as_view(),
        name="comment-detail",
    ),
    path(
        "surveys/",
        SurveyList.as_view(),
        name="survey-list",
    ),
    path(
        "surveys/<int:pk>/",
        SurveyDetail.as_view(),
    ),
    path(
        "surveys/<int:pk>/assign/",
        SurveyAssign.as_view(),
        name="survey-assign",
    ),
    path(
        "observations/<int:pk>/like/",
        ObservationLikeToggle.as_view(),
        name="observation-like",
    ),
    path(
        "comments/<int:pk>/like/",
        CommentLikeToggle.as_view(),
        name="comment-like",
    ),
    path(
        "clients/",
        ClientList.as_view(),
        name="client-list",
    ),
    path(
        "clients/<int:pk>/",
        ClientDetail.as_view(),
        name="client-detail",
    ),
    path(
        "sites/",
        ClientSiteList.as_view(),
        name="site-list",
    ),
    path(
        "sites/<int:pk>/",
        ClientSiteDetail.as_view(),
        name="site-detail",
    ),
    path(
        "team/",
        TeamList.as_view(),
        name="team-list",
    ),
    path(
        "team/<int:pk>/",
        TeamDetail.as_view(),
        name="team-detail",
    ),
]
