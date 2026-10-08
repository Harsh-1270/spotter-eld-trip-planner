from dataclasses import dataclass, field
from typing import List, Dict, Any

@dataclass
class Stop:
    """Each stop along the route (fuel, rest, pickup, dropoff)"""
    stop_type: str    # 'start', 'pickup', 'dropoff', 'fuel', 'rest', 'overnight'
    location_name: str
    latitude: float
    longitude: float
    arrival_time: str    # ISO format timestamp
    departure_time: str
    duration_hours: float
    miles_from_start: float
    sequence_order: int
    notes: str = ""

@dataclass
class DailyLog:
    """One log sheet per 24-hour period"""
    day_number: int              # Day 1, 2, 3...
    date: str                    # "2026-10-08"
    
    # Log header info
    total_miles_today: float
    from_location: str
    to_location: str
    
    # The duty status segments for this day
    duty_segments: List[Dict[str, Any]] = field(default_factory=list)
    # Example: [{"status": "off_duty", "start": 0, "end": 6.0}, ...]
    
    # Total hours per status (for the totals column)
    off_duty_hours: float = 0
    sleeper_hours: float = 0
    driving_hours: float = 0
    on_duty_hours: float = 0
    
    remarks: List[Dict[str, Any]] = field(default_factory=list)
    # Example: [{"time": 6.0, "location": "Dallas, TX", "note": "Start driving"}]

@dataclass
class Trip:
    """Main trip object holding all calculated data"""
    current_location: str
    pickup_location: str
    dropoff_location: str
    current_cycle_used: float
    
    # Computed after calculation
    total_distance_miles: float = 0
    total_driving_hours: float = 0
    total_trip_days: int = 0
    route_geometry: List[List[float]] = field(default_factory=list) # [[lat, lng], ...]
    
    stops: List[Stop] = field(default_factory=list)
    daily_logs: List[DailyLog] = field(default_factory=list)
