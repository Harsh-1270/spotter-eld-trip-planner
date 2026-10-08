# 🚛 ELD Trip Planner — Complete Implementation Plan

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| **Backend** | Django + Django REST Framework | Required by assessment |
| **Frontend** | React (Vite) | Required by assessment |
| **Map API** | Leaflet.js + OpenRouteService API (free) | Free, reliable routing with directions |
| **Map Tiles** | OpenStreetMap (via Leaflet) | Free, no API key needed for tiles |
| **ELD Drawing** | HTML5 Canvas | Pixel-perfect log sheet drawing |
| **Hosting** | Backend: Railway/Render · Frontend: Vercel | Free tiers available |

---

## 🏗️ Project Structure

```
spotter-eld-trip-planner/
├── backend/                          # Django Project
│   ├── manage.py
│   ├── requirements.txt
│   ├── config/                       # Django project settings
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   └── trips/                        # Main Django app
│       ├── views.py                  # API views (stateless, no DB)
│       ├── urls.py                   # API routes
│       ├── hos_calculator.py         # 🧠 Core HOS logic engine
│       ├── route_service.py          # OpenRouteService integration
│       └── tests.py                  # Unit tests for HOS logic
│
├── frontend/                         # React (Vite) Project
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   ├── public/
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── index.css                 # Global styles & design system
│       ├── api/
│       │   └── tripApi.js            # API client
│       ├── components/
│       │   ├── TripForm/             # Input form component
│       │   │   ├── TripForm.jsx
│       │   │   └── TripForm.css
│       │   ├── RouteMap/             # Interactive map
│       │   │   ├── RouteMap.jsx
│       │   │   └── RouteMap.css
│       │   ├── LogSheet/             # ELD log sheet canvas
│       │   │   ├── LogSheet.jsx
│       │   │   └── LogSheet.css
│       │   ├── TripSummary/          # Route details & stops
│       │   │   ├── TripSummary.jsx
│       │   │   └── TripSummary.css
│       │   └── common/               # Shared UI components
│       │       ├── Header.jsx
│       │       ├── LoadingSpinner.jsx
│       │       └── StopCard.jsx
│       └── utils/
│           ├── constants.js          # HOS constants
│           └── formatters.js         # Time/distance formatters
```

---

## 🔙 Backend Architecture

> [!NOTE]
> **No database needed.** The assessment only requires input → compute → output. The backend is a stateless computation API — no models, no migrations, no database. Everything is calculated in memory and returned in the response.

### Data Structures (Python Dataclasses — In-Memory Only)

```python
# trips/data_structures.py (plain Python dataclasses, NOT Django models)
from dataclasses import dataclass, field
from typing import List, Optional

@dataclass
class Trip:
    current_location:    str
    pickup_location:     str
    dropoff_location:    str
    current_cycle_used:  float          # Hours used in 70hr cycle
    
    # Computed after calculation
    total_distance_miles: float = 0
    total_driving_hours:  float = 0
    total_trip_days:      int = 0
    route_geometry:       list = field(default_factory=list)


@dataclass
class Stop:
    """Each stop along the route (fuel, rest, pickup, dropoff)"""
    stop_type:       str    # 'start', 'pickup', 'dropoff', 'fuel', 'rest', 'overnight'
    location_name:   str
    latitude:        float
    longitude:       float
    arrival_time:    str    # ISO format timestamp
    departure_time:  str
    duration_hours:  float
    miles_from_start: float
    sequence_order:  int
    notes:           str = ""


@dataclass
class DailyLog:
    """One log sheet per 24-hour period"""
    day_number:       int              # Day 1, 2, 3...
    date:             str              # "2026-10-08"
    
    # Log header info
    total_miles_today: float
    from_location:     str
    to_location:       str
    
    # The duty status segments for this day
    duty_segments:     list = field(default_factory=list)
    # Example: [
    #   {"status": "off_duty", "start": 0, "end": 6.0},
    #   {"status": "driving",  "start": 6.0, "end": 10.5},
    #   {"status": "on_duty",  "start": 10.5, "end": 11.5},
    # ]
    
    # Total hours per status (for the totals column)
    off_duty_hours:   float = 0
    sleeper_hours:    float = 0
    driving_hours:    float = 0
    on_duty_hours:    float = 0
    
    remarks:          list = field(default_factory=list)
    # Example: [
    #   {"time": 6.0, "location": "Dallas, TX", "note": "Start driving"},
    #   {"time": 10.5, "location": "Amarillo, TX", "note": "Fuel stop"},
    # ]
```

---

### API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/plan-trip/` | Takes trip inputs, computes everything, returns full result (route + stops + logs) |

### POST `/api/trips/` — Request Body
```json
{
    "current_location": "San Francisco, CA",
    "pickup_location": "Los Angeles, CA",
    "dropoff_location": "New York, NY",
    "current_cycle_used": 20
}
```

### POST `/api/trips/` — Response
```json
{
    "id": "uuid-here",
    "current_location": "San Francisco, CA",
    "pickup_location": "Los Angeles, CA",
    "dropoff_location": "New York, NY",
    "current_cycle_used": 20,
    "total_distance_miles": 2850,
    "total_driving_hours": 42.5,
    "total_trip_days": 5,
    "route": {
        "geometry": [[lat, lng], ...],
        "segments": [
            {"from": "San Francisco, CA", "to": "Los Angeles, CA", "miles": 380, "hours": 5.8},
            {"from": "Los Angeles, CA", "to": "New York, NY", "miles": 2470, "hours": 36.7}
        ]
    },
    "stops": [
        {"type": "start", "location": "San Francisco, CA", "lat": 37.77, "lng": -122.42, "arrival": "...", "departure": "...", "duration": 0},
        {"type": "pickup", "location": "Los Angeles, CA", "lat": 34.05, "lng": -118.24, "arrival": "...", "departure": "...", "duration": 1.0},
        {"type": "fuel", "location": "Flagstaff, AZ", "lat": 35.19, "lng": -111.65, "arrival": "...", "departure": "...", "duration": 0.5},
        {"type": "rest", "location": "Albuquerque, NM", "lat": 35.08, "lng": -106.65, "arrival": "...", "departure": "...", "duration": 0.5},
        {"type": "overnight", "location": "Amarillo, TX", "lat": 35.22, "lng": -101.83, "arrival": "...", "departure": "...", "duration": 10},
        ...
    ],
    "daily_logs": [
        {
            "day_number": 1,
            "date": "2026-10-08",
            "total_miles_today": 520,
            "from_location": "San Francisco, CA",
            "to_location": "Amarillo, TX",
            "duty_segments": [...],
            "off_duty_hours": 14.0,
            "sleeper_hours": 0,
            "driving_hours": 9.0,
            "on_duty_hours": 1.0,
            "remarks": [...]
        },
        ...
    ]
}
```

---

### 🧠 HOS Calculation Engine — Core Algorithm

This is the **most critical** part of the application. Here's the step-by-step logic:

```
hos_calculator.py — Algorithm Outline
```

#### Constants
```
MAX_DRIVING_HOURS    = 11      # Per shift
MAX_DUTY_WINDOW      = 14      # Hours from start of shift
MANDATORY_BREAK      = 0.5     # 30-min break
BREAK_AFTER_DRIVING  = 8       # Break required after 8 hrs driving
MIN_OFF_DUTY         = 10      # Hours off between shifts
CYCLE_LIMIT          = 70      # Hours in 8-day cycle
CYCLE_DAYS           = 8
RESTART_HOURS        = 34      # Full cycle reset
FUEL_INTERVAL_MILES  = 1000    # Fuel every 1000 miles
PICKUP_DURATION      = 1.0     # 1 hour
DROPOFF_DURATION     = 1.0     # 1 hour
FUEL_STOP_DURATION   = 0.5     # 30 min assumed for fueling
AVG_SPEED_MPH        = 55      # Average driving speed assumption (used for fallback)
```

#### Algorithm Flow

```
FUNCTION plan_trip(current_loc, pickup_loc, dropoff_loc, cycle_used):

    ┌─────────────────────────────────────────────────┐
    │  STEP 1: GET ROUTES FROM MAP API                │
    │                                                 │
    │  Route A: current_loc → pickup_loc              │
    │  Route B: pickup_loc → dropoff_loc              │
    │                                                 │
    │  Get: total_miles, total_drive_time,             │
    │       route_geometry, waypoints                  │
    └─────────────────────────────────────────────────┘
                        │
                        ▼
    ┌─────────────────────────────────────────────────┐
    │  STEP 2: IDENTIFY FUEL STOPS                    │
    │                                                 │
    │  Every 1,000 miles along the route,             │
    │  find nearest city/fuel location                │
    │  using route waypoints                          │
    └─────────────────────────────────────────────────┘
                        │
                        ▼
    ┌─────────────────────────────────────────────────┐
    │  STEP 3: SIMULATE THE TRIP (HOS Engine)         │
    │                                                 │
    │  Initialize:                                    │
    │    shift_driving = 0                            │
    │    shift_on_duty = 0                            │
    │    cycle_remaining = 70 - cycle_used            │
    │    current_time = trip_start_time               │
    │    miles_since_fuel = 0                         │
    │    driving_since_break = 0                      │
    │                                                 │
    │  FOR each segment of the route:                 │
    │                                                 │
    │    WHILE segment has remaining miles:            │
    │                                                 │
    │      // Check: Need fuel?                       │
    │      IF miles_since_fuel + next_chunk ≥ 1000:   │
    │        → Insert FUEL stop (30 min, on-duty)     │
    │        → Reset miles_since_fuel                 │
    │                                                 │
    │      // Check: Need 30-min break?               │
    │      IF driving_since_break ≥ 8:                │
    │        → Insert REST break (30 min)             │
    │        → Reset driving_since_break              │
    │                                                 │
    │      // Check: Hitting 11-hr driving limit?     │
    │      IF shift_driving ≥ 11:                     │
    │        → Must take 10-hr off-duty               │
    │        → Reset shift counters                   │
    │                                                 │
    │      // Check: Hitting 14-hr window?            │
    │      IF shift_on_duty ≥ 14:                     │
    │        → Must take 10-hr off-duty               │
    │        → Reset shift counters                   │
    │                                                 │
    │      // Check: Hitting 70-hr cycle limit?       │
    │      IF cycle_remaining ≤ 0:                    │
    │        → Must take 34-hr restart                │
    │        → Reset cycle to 70                      │
    │                                                 │
    │      // Drive the next chunk                    │
    │      driveable = MIN(                           │
    │        11 - shift_driving,                      │
    │        14 - shift_on_duty,                      │
    │        8 - driving_since_break,                 │
    │        cycle_remaining,                         │
    │        remaining_segment_time,                  │
    │        time_to_next_fuel_stop                   │
    │      )                                          │
    │      → Add driving segment                      │
    │      → Update all counters                      │
    │                                                 │
    │    AT pickup: Add 1-hr on-duty (not driving)    │
    │    AT dropoff: Add 1-hr on-duty (not driving)   │
    │                                                 │
    └─────────────────────────────────────────────────┘
                        │
                        ▼
    ┌─────────────────────────────────────────────────┐
    │  STEP 4: GENERATE DAILY LOG SHEETS              │
    │                                                 │
    │  Split the timeline into 24-hour periods        │
    │  For each day:                                  │
    │    - Collect all duty segments in that window   │
    │    - Calculate total hours per status            │
    │    - Build remarks from location changes         │
    │    - Create DailyLog record                     │
    └─────────────────────────────────────────────────┘
                        │
                        ▼
    ┌─────────────────────────────────────────────────┐
    │  STEP 5: RETURN RESULTS                         │
    │                                                 │
    │  Return: route, stops, daily_logs               │
    └─────────────────────────────────────────────────┘
```

#### HOS Rule Priority (when checking what to do next):
1. **70-hour cycle limit** → 34-hour restart if exhausted
2. **14-hour window** → 10-hour off-duty (non-negotiable, clock doesn't stop)
3. **11-hour driving limit** → 10-hour off-duty
4. **8-hour driving → 30-min break** → Insert 30-min break
5. **1,000-mile fuel stop** → Insert fuel stop
6. **Pickup/Dropoff** → 1-hour on-duty not driving

---

### Route Service (OpenRouteService Integration)

```python
# trips/route_service.py

class RouteService:
    """Handles all map/routing API calls"""
    
    BASE_URL = "https://api.openrouteservice.org"
    
    def geocode(address: str) -> (lat, lng):
        """Convert address to coordinates"""
        # GET /geocode/search?text={address}
    
    def get_route(origin: tuple, destination: tuple) -> dict:
        """Get driving route between two points"""
        # POST /v2/directions/driving-hgv  (heavy goods vehicle profile)
        # Returns: distance, duration, geometry, step-by-step directions
    
    def get_nearby_city(lat, lng) -> str:
        """Reverse geocode to get city name for a coordinate"""
        # GET /geocode/reverse?point.lat={lat}&point.lon={lng}
    
    def find_point_along_route(route_geometry, target_miles) -> (lat, lng):
        """Find the coordinate at a specific mileage along the route"""
        # Used for placing fuel stops every 1000 miles
```

---

## 🎨 Frontend Architecture

### Page Layout

```
┌──────────────────────────────────────────────────────────────┐
│  🚛 ELD Trip Planner                              [Header]  │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │              TRIP INPUT FORM                         │    │
│  │                                                      │    │
│  │  📍 Current Location    [ _____________________ ]    │    │
│  │  📦 Pickup Location     [ _____________________ ]    │    │
│  │  🏁 Dropoff Location    [ _____________________ ]    │    │
│  │  ⏱️ Current Cycle Used  [ ___ ] hrs                  │    │
│  │                                                      │    │
│  │              [ 🚀 Plan My Trip ]                     │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │              ROUTE MAP (Full Width)                  │    │
│  │                                                      │    │
│  │   Leaflet map showing:                               │    │
│  │   • Blue route line                                  │    │
│  │   • 🟢 Start marker                                  │    │
│  │   • 📦 Pickup marker                                 │    │
│  │   • 🏁 Dropoff marker                                │    │
│  │   • ⛽ Fuel stop markers                              │    │
│  │   • 🛏️ Rest/overnight markers                        │    │
│  │   • Popups with stop details on click                │    │
│  │                                                      │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │            TRIP SUMMARY                              │    │
│  │                                                      │    │
│  │  Total Distance: 2,850 mi  │  Driving: 42.5 hrs     │    │
│  │  Total Days: 5             │  Stops: 12              │    │
│  │                                                      │    │
│  │  Stop Timeline:                                      │    │
│  │  ● Start → SF, CA (6:00 AM)                         │    │
│  │  ● Drive 5.8 hrs (380 mi)                           │    │
│  │  ● Pickup → LA, CA (11:48 AM - 12:48 PM)            │    │
│  │  ● Drive 4.2 hrs (265 mi)                           │    │
│  │  ● Rest Break (30 min)                               │    │
│  │  ● Drive 3.8 hrs (240 mi)                           │    │
│  │  ● Overnight Rest → Flagstaff, AZ (10 hrs)          │    │
│  │  ...                                                 │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │          DAILY LOG SHEETS (ELD)                      │    │
│  │                                                      │    │
│  │  [Day 1] [Day 2] [Day 3] [Day 4] [Day 5]  ← Tabs   │    │
│  │                                                      │    │
│  │  ┌──────────────────────────────────────────────┐    │    │
│  │  │  Drivers Daily Log - Day 1                   │    │    │
│  │  │  Date: 10/08/2026                            │    │    │
│  │  │  From: San Francisco, CA                     │    │    │
│  │  │  To: Amarillo, TX                            │    │    │
│  │  │  Miles: 520                                  │    │    │
│  │  │                                              │    │    │
│  │  │  ┌──────────────────────────────────────┐    │    │    │
│  │  │  │ Mid  1  2  3  4  5 ... 11 N 1 ... 11 │    │    │    │
│  │  │  │ night                         night  │    │    │    │
│  │  │  │ ─── Off Duty ─────────────────────── │    │    │    │
│  │  │  │ ─── Sleeper ──────────────────────── │    │    │    │
│  │  │  │ ─── Driving ──────────────────────── │    │    │    │
│  │  │  │ ─── On Duty ──────────────────────── │    │    │    │
│  │  │  │                                      │    │    │    │
│  │  │  │  (Canvas-drawn graph with lines      │    │    │    │
│  │  │  │   showing duty status over 24 hrs)   │    │    │    │
│  │  │  └──────────────────────────────────────┘    │    │    │
│  │  │                                              │    │    │
│  │  │  Remarks:                                    │    │    │
│  │  │  6:00 AM - San Francisco, CA - Start duty    │    │    │
│  │  │  7:00 AM - San Francisco, CA - Begin driving │    │    │
│  │  │  ...                                         │    │    │
│  │  │                                              │    │    │
│  │  │  Total: Off 14.0 | SB 0.0 | Dr 9.0 | OD 1.0│    │    │
│  │  └──────────────────────────────────────────────┘    │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Component Breakdown

#### 1. `TripForm` — Input Form
- 3 location inputs with autocomplete (geocoding suggestions)
- Numeric input for cycle hours (0-70 range, validation)
- Submit button triggers API call
- Loading state while calculating
- Error handling for invalid inputs

#### 2. `RouteMap` — Interactive Map
- Leaflet.js with OpenStreetMap tiles
- Route polyline drawn on map (blue line)
- Custom markers for each stop type with distinct icons/colors:
  - 🟢 Green = Start
  - 📦 Orange = Pickup  
  - 🏁 Red = Dropoff
  - ⛽ Yellow = Fuel
  - 🔵 Blue = Rest break
  - 🛏️ Purple = Overnight rest
- Popup on marker click showing stop details
- Auto-fit bounds to show entire route

#### 3. `TripSummary` — Route Details
- Summary stats cards (distance, time, days, stops)
- Vertical timeline showing each stop chronologically
- Color-coded by stop type
- Shows driving segments between stops

#### 4. `LogSheet` — ELD Daily Log (Canvas-Drawn)
- **This is the showpiece component** — must look like an actual paper log
- Drawn using HTML5 Canvas to replicate the blank paper log format
- Tab navigation for each day
- Canvas draws:
  - Grid lines (24 hours × 4 status rows)
  - Hour labels (Midnight, 1, 2... Noon... 11, Midnight)
  - 15-minute tick marks
  - **Continuous duty status lines** (thick black lines showing status)
  - Vertical transition lines between status changes
  - Header info (date, miles, from/to locations)
  - Remarks section below the grid
  - Total hours per status

---

## 🎨 Design System

### Color Palette
```css
--bg-primary:      #0F1117;       /* Deep dark background */
--bg-secondary:    #1A1D27;       /* Card backgrounds */
--bg-tertiary:     #242836;       /* Elevated surfaces */
--accent-primary:  #4F8CFF;       /* Primary blue */
--accent-success:  #34D399;       /* Green for start */
--accent-warning:  #FBBF24;       /* Yellow for fuel */
--accent-danger:   #F87171;       /* Red for dropoff */
--accent-purple:   #A78BFA;       /* Purple for rest */
--text-primary:    #F1F5F9;       /* Main text */
--text-secondary:  #94A3B8;       /* Muted text */
--border:          #2D3348;       /* Subtle borders */
```

### Typography
- **Font**: Inter (Google Fonts) — clean, modern, professional
- **Headings**: 600–700 weight
- **Body**: 400 weight

### UI Features
- Dark mode design (professional, modern)
- Glassmorphism cards with subtle backdrop blur
- Smooth transitions and micro-animations
- Responsive layout (desktop-first, mobile-friendly)
- Loading skeleton states

---

## 📦 Implementation Phases

### Phase 1: Backend Setup & Core Logic
1. Initialize Django project with DRF (no database needed)
2. Create data structures (dataclasses for Trip, Stop, DailyLog)
3. Implement `route_service.py` — OpenRouteService integration
4. Implement `hos_calculator.py` — **Core HOS engine**
5. Create API endpoints with serializers
6. Write tests for HOS calculation edge cases

### Phase 2: Frontend Setup & UI
1. Initialize React project with Vite
2. Set up design system (CSS variables, global styles)
3. Build `Header` component
4. Build `TripForm` component with validation
5. Set up API client (`tripApi.js`)

### Phase 3: Map Integration
1. Install & configure react-leaflet
2. Build `RouteMap` component
3. Add route polyline rendering
4. Add custom markers for stops
5. Add popups and auto-fit bounds

### Phase 4: ELD Log Sheet Drawing
1. Build `LogSheet` component with Canvas
2. Draw the grid structure (matching blank paper log)
3. Draw duty status lines from segment data
4. Render header info, remarks, and totals
5. Add tab navigation for multiple days

### Phase 5: Trip Summary & Polish
1. Build `TripSummary` with timeline
2. Add loading states and error handling
3. Polish animations and transitions
4. Responsive design adjustments
5. End-to-end testing

### Phase 6: Deployment
1. Deploy Django backend to Railway/Render
2. Deploy React frontend to Vercel
3. Configure CORS and environment variables
4. Test hosted version for accuracy
5. Record Loom video

---

## ⚠️ Key Edge Cases to Handle

| Scenario | Handling |
|---|---|
| Trip starts with cycle almost exhausted (e.g., 68/70 hrs used) | Trigger 34-hr restart early |
| Very short trip (< 1 hour driving) | Single log sheet, mostly off-duty |
| Very long trip (3000+ miles, 5+ days) | Multiple log sheets, multiple overnight rests |
| Pickup is same as current location | Skip first route segment |
| 30-min break coincides with fuel stop | Combine them (fuel stop counts as break) |
| Remaining cycle allows less than a full driving shift | Drive partial shift, then 34-hr restart |
| 14-hour window hit before 11-hour driving (due to on-duty time at pickup/fuel) | Enforce 14-hour window as the binding constraint |

---

## 🔗 External API: OpenRouteService

- **Free tier**: 2,000 requests/day (more than enough)
- **Signup**: https://openrouteservice.org/dev/#/signup
- **Key endpoints used**:
  - `POST /v2/directions/driving-hgv` — Route for heavy vehicles
  - `GET /geocode/search` — Address to coordinates
  - `GET /geocode/reverse` — Coordinates to address/city name

---

> [!IMPORTANT]
> The **HOS calculator** is the heart of this assessment. Accuracy here is what they will test. The algorithm must correctly enforce all FMCSA rules in the right priority order and generate log sheets that match what a real driver would fill out.

> [!TIP]
> The assessment says **"UI and UX must be good. Pay attention to good design and aesthetics, it can compensate for some inaccuracies in output."** — So we need to nail BOTH the logic AND the design.
