from django.urls import path
from rest_framework_simplejwt.views import (
    
    TokenRefreshView,
)
urlpatterns = []
from .views import (
    RegisterView,
    PasswordResetRequestView,
    PasswordResetConfirmView,
   MyTokenObtainPairView
)
urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path('password-reset/', PasswordResetRequestView.as_view()),
    path('password-reset-confirm/', PasswordResetConfirmView.as_view()),
    path('login/', MyTokenObtainPairView.as_view(), name='token_obtain_pair'),  # login JWT custom
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]