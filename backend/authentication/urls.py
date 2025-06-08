from django.urls import path

urlpatterns = []
from .views import (
    RegisterView,
    PasswordResetRequestView,
    PasswordResetConfirmView
   
)
urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path('password-reset/', PasswordResetRequestView.as_view()),
    path('password-reset-confirm/', PasswordResetConfirmView.as_view()),
]