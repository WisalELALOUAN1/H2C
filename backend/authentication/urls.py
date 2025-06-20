from django.urls import path
from rest_framework_simplejwt.views import (
    
    TokenRefreshView,
)
urlpatterns = []
from .views import (
    RegisterView,
    PasswordResetRequestView,
    PasswordResetConfirmView,
    CustomLoginView,
    FirstPasswordChangeView,
    PasswordChangeSerializer,
    PasswordChangeView,
    ProfileUpdateView,
   #MyTokenObtainPairView,
   UserProfileView,
)
urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path('password-reset/', PasswordResetRequestView.as_view()),
    path('password-reset-confirm/', PasswordResetConfirmView.as_view()),
    #path('login/', MyTokenObtainPairView.as_view(), name='token_obtain_pair'),  # login JWT custom
    path('login/', CustomLoginView.as_view(), name='custom_login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('first-password-change/', FirstPasswordChangeView.as_view(), name='first_password_change'),
    path('user/update/', ProfileUpdateView.as_view(), name='user_update'),
    path('user/change-password/', PasswordChangeView.as_view(), name='user_change_password'),
    path('user/profile/', UserProfileView.as_view(), name='user_profile'),

]