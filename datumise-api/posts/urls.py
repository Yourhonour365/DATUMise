from django.urls import path
from .views import ObservationList, ObservationDetail, CommentList, CommentDetail, SurveyList, SurveyDetail, ObservationLikeToggle


urlpatterns = [
    path("observations/", ObservationList.as_view(), name="observation-list"),
    path("observations/<int:pk>/", ObservationDetail.as_view(), name="observation-detail"),
    path("comments/", CommentList.as_view(), name="comment-list"),
    path("comments/<int:pk>/", CommentDetail.as_view(), name="comment-detail"),
    path("surveys/", SurveyList.as_view(), name="survey-list"),
    path("surveys/<int:pk>/", SurveyDetail.as_view()),
    path("observations/<int:pk>/like/", ObservationLikeToggle.as_view(), name="observation-like"),
]