import os
import requests
from django.conf import settings

class RouteService:
    """Handles all interactions with the OpenRouteService API"""
    
    BASE_URL = "https://api.openrouteservice.org"
    
    def __init__(self):
        self.api_key = getattr(settings, 'ORS_API_KEY', None)
        if not self.api_key or self.api_key == 'your_openrouteservice_api_key_here':
            print("WARNING: OpenRouteService API key is missing or invalid.")
    
    def get_headers(self):
        return {
            'Authorization': self.api_key,
            'Accept': 'application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8',
            'Content-Type': 'application/json'
        }

    def geocode(self, address: str):
        """Convert a text address to [longitude, latitude] coordinates."""
        if not address:
            return None
            
        url = f"{self.BASE_URL}/geocode/search"
        params = {
            'api_key': self.api_key,
            'text': address,
            'size': 1  # We only need the top result
        }
        
        try:
            response = requests.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            if data.get('features') and len(data['features']) > 0:
                coords = data['features'][0]['geometry']['coordinates']
                # OpenRouteService returns [longitude, latitude]
                # Returning it as [longitude, latitude] to be consistent with ORS directions API
                return coords
            return None
        except Exception as e:
            print(f"Geocoding error for '{address}': {e}")
            return None

    def get_route(self, coordinates: list):
        """
        Get route data for a list of coordinates.
        coordinates format: [[lon, lat], [lon, lat], ...]
        """
        url = f"{self.BASE_URL}/v2/directions/driving-hgv"
        
        payload = {
            "coordinates": coordinates,
            "instructions": True, # We need this to get 'segments' and 'steps' data
            "geometry": True,
            "units": "mi" # Miles
        }
        
        try:
            response = requests.post(url, json=payload, headers=self.get_headers())
            
            # If the HGV profile cannot find a road (e.g. mountainous/remote regions like Srinagar)
            # fallback to standard driving car profile.
            if response.status_code in [404, 400]:
                url_fallback = f"{self.BASE_URL}/directions/driving-car"
                fallback_resp = requests.post(url_fallback, json=payload, headers=self.get_headers())
                if fallback_resp.status_code == 200:
                    return fallback_resp.json()
            
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Routing error: {e}")
            if hasattr(e, 'response') and e.response is not None:
                print(f"Response data: {e.response.text}")
            return None
            
    def get_nearby_city(self, lon: float, lat: float):
        """Reverse geocode to get a city/location name from coordinates."""
        url = f"{self.BASE_URL}/geocode/reverse"
        params = {
            'api_key': self.api_key,
            'point.lon': lon,
            'point.lat': lat,
            'size': 1
        }
        
        try:
            response = requests.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            if data.get('features') and len(data['features']) > 0:
                props = data['features'][0]['properties']
                # Try to construct a good location name
                locality = props.get('locality') or props.get('county') or props.get('region')
                region = props.get('region') or props.get('country')
                if locality and region and locality != region:
                    return f"{locality}, {region}"
                elif locality:
                    return locality
                return "Unknown Location"
            return "Unknown Location"
        except Exception as e:
            print(f"Reverse geocoding error: {e}")
            return "Unknown Location"

    def autocomplete(self, text: str):
        """Get location suggestions as the user types."""
        if not text or len(text) < 2:
            return []
            
        # The /geocode/autocomplete endpoint often returns 403 for free tier keys, 
        # so we use /geocode/search as a fallback.
        url = f"{self.BASE_URL}/geocode/autocomplete"
        params = {
            'api_key': self.api_key,
            'text': text,
            'size': 5
        }
        
        try:
            response = requests.get(url, params=params)
            if response.status_code == 200:
                data = response.json()
                suggestions = []
                for feature in data.get('features', []):
                    props = feature['properties']
                    # Use label which usually has "City, Region, Country"
                    label = props.get('label') or props.get('name')
                    if label and label not in suggestions:
                        suggestions.append(label)
                return suggestions
            else:
                print(f"Autocomplete API returned {response.status_code}: {response.text}")
            return []
        except Exception as e:
            print(f"Autocomplete error: {e}")
            return []
