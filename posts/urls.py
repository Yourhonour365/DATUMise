from django.urls import path
from .views import ObservationList, ObservationDetail

urlpatterns = [
    path("observations/", ObservationList.as_view(), name="observation-list"),
    path("observations/<int:pk>/", ObservationDetail.as_view(), name="observation-detail"),
]