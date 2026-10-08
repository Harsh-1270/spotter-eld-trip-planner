"""
Trips app URL configuration.
"""
from django.urls import path
from . import views

urlpatterns = [
    path('plan-trip/', views.PlanTripView.as_view(), name='plan-trip'),
    path('autocomplete/', views.AutocompleteView.as_view(), name='autocomplete'),
]
