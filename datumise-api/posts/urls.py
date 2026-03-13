from django.urls import path
from .views import ObservationList, ObservationDetail, CommentList, CommentDetail, SurveyList, SurveyDetail, ObservationLikeToggle, CommentLikeToggle, ClientList, ClientSiteList

urlpatterns = [
    path("observations/", ObservationList.as_view(), name="observation-list"),
    path("observations/<int:pk>/", ObservationDetail.as_view(), name="observation-detail"),
    path("comments/", CommentList.as_view(), name="comment-list"),
    path("comments/<int:pk>/", CommentDetail.as_view(), name="comment-detail"),
    path("surveys/", SurveyList.as_view(), name="survey-list"),
    path("surveys/<int:pk>/", SurveyDetail.as_view()),
    path("observations/<int:pk>/like/", ObservationLikeToggle.as_view(), name="observation-like"),
    path("comments/<int:pk>/like/", CommentLikeToggle.as_view(), name="comment-like"),
    path("clients/", ClientList.as_view(), name="client-list"),
    path("sites/", ClientSiteList.as_view(), name="site-list"),
]