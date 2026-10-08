"""
Django settings for ELD Trip Planner.

FRONTEND_URL is the CENTRAL configuration for the React frontend origin.
Update it in the .env file when deploying to any platform.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

# =============================================================
# CENTRAL FRONTEND URL CONFIGURATION
# Change this in .env when deploying to any platform
# =============================================================
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:5173')

SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-change-this-in-production')
DEBUG = os.getenv('DEBUG', 'True').lower() in ('true', '1', 'yes')

ALLOWED_HOSTS = ['*']

# =============================================================
# OpenRouteService API Key
# =============================================================
ORS_API_KEY = os.getenv('ORS_API_KEY', '')

# =============================================================
# Installed Apps (minimal — no database apps needed)
# =============================================================
INSTALLED_APPS = [
    'rest_framework',
    'corsheaders',
    'trips',
]

# =============================================================
# Middleware (minimal — no auth/session needed)
# =============================================================
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
]

# =============================================================
# CORS Configuration (uses FRONTEND_URL)
# =============================================================
CORS_ALLOWED_ORIGINS = [
    FRONTEND_URL,
]

# Also allow localhost variations for development
if DEBUG:
    CORS_ALLOWED_ORIGINS += [
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:5174',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:3000',
    ]
    # Remove duplicates
    CORS_ALLOWED_ORIGINS = list(set(CORS_ALLOWED_ORIGINS))

CORS_ALLOW_ALL_ORIGINS = DEBUG  # Allow all in development

ROOT_URLCONF = 'config.urls'

# Templates (minimal)
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# =============================================================
# NO DATABASE — Stateless API
# =============================================================
DATABASES = {}

# =============================================================
# REST Framework Configuration
# =============================================================
REST_FRAMEWORK = {
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'DEFAULT_PARSER_CLASSES': [
        'rest_framework.parsers.JSONParser',
    ],
    # No authentication needed
    'DEFAULT_AUTHENTICATION_CLASSES': [],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',
    ],
    'UNAUTHENTICATED_USER': None,
}

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = False
USE_TZ = True

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
