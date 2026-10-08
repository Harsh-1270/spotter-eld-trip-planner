import math
from datetime import datetime, timedelta
import polyline
from .data_structures import Trip, Stop, DailyLog
from .route_service import RouteService

# Constants for HOS and simulation
MAX_DRIVING_HOURS = 11.0
MAX_DUTY_WINDOW = 14.0
MANDATORY_BREAK_HOURS = 0.5
BREAK_AFTER_DRIVING = 8.0
MIN_OFF_DUTY_HOURS = 10.0
CYCLE_LIMIT_HOURS = 70.0
RESTART_HOURS = 34.0

FUEL_INTERVAL_MILES = 1000.0
FUEL_DURATION_HOURS = 0.5
PICKUP_DURATION_HOURS = 1.0
DROPOFF_DURATION_HOURS = 1.0

# Average speed to fallback on if route segments don't provide it
AVG_SPEED_MPH = 55.0

class HOSCalculator:
    def __init__(self):
        self.route_service = RouteService()
        
    def _create_duty_segment(self, status: str, start_time: float, end_time: float):
        return {
            "status": status,
            "start": round(start_time, 2),
            "end": round(end_time, 2)
        }
        
    def _create_remark(self, time: float, location: str, note: str):
        return {
            "time": round(time, 2),
            "location": location,
            "note": note
        }

    def _find_coord_at_distance(self, geometry_coords, target_distance_miles):
        """
        Approximate the coordinate along a route geometry at a given distance.
        Very simplified fallback calculation. In a real world scenario, 
        we'd use accurate distance between each vertex.
        """
        if not geometry_coords:
            return [0, 0]
        # Just return something roughly in the middle or the end for simplicity
        idx = min(len(geometry_coords)-1, max(0, int(len(geometry_coords) * 0.5)))
        return geometry_coords[idx]

    def plan_trip(self, current_loc: str, pickup_loc: str, dropoff_loc: str, current_cycle_used: float) -> Trip:
        trip = Trip(
            current_location=current_loc,
            pickup_location=pickup_loc,
            dropoff_location=dropoff_loc,
            current_cycle_used=current_cycle_used
        )
        
        # 1. Geocode locations
        coords_current = self.route_service.geocode(current_loc)
        coords_pickup = self.route_service.geocode(pickup_loc)
        coords_dropoff = self.route_service.geocode(dropoff_loc)
        
        if not coords_current or not coords_pickup or not coords_dropoff:
            raise ValueError("Could not geocode one or more locations.")
            
        # 2. Get Route
        waypoints = [coords_current]
        # Avoid duplicate point if current == pickup
        if coords_current != coords_pickup:
            waypoints.append(coords_pickup)
        waypoints.append(coords_dropoff)
        
        route_data = self.route_service.get_route(waypoints)
        if not route_data or 'routes' not in route_data or not route_data['routes']:
            raise ValueError("Could not find a valid route between these locations.")
            
        route = route_data['routes'][0]
        total_miles = route['summary']['distance'] # in miles
        
        # Decode polyline geometry
        geometry_encoded = route['geometry']
        geometry_coords_lat_lon = polyline.decode(geometry_encoded) # [(lat, lon), ...]
        trip.route_geometry = [[lat, lon] for lat, lon in geometry_coords_lat_lon]
        
        # 3. Simulate Trip (HOS Engine)
        
        # State tracking
        cycle_remaining = max(0.0, CYCLE_LIMIT_HOURS - current_cycle_used)
        shift_driving = 0.0
        shift_on_duty = 0.0
        driving_since_break = 0.0
        miles_since_fuel = 0.0
        
        trip_time_hours = 0.0
        current_miles = 0.0
        
        trip_start_date = datetime.now().replace(hour=6, minute=0, second=0, microsecond=0) # start at 6am today
        
        # Initialize Stops and Logs
        trip.stops.append(Stop(
            stop_type="start",
            location_name=current_loc,
            latitude=coords_current[1],
            longitude=coords_current[0],
            arrival_time=trip_start_date.isoformat(),
            departure_time=trip_start_date.isoformat(),
            duration_hours=0,
            miles_from_start=0,
            sequence_order=1,
            notes="Start Duty"
        ))
        
        daily_logs = []
        current_day_num = 1
        current_day_date = trip_start_date.date()
        
        # Helper to record time
        # We will build a continuous timeline of duty statuses
        timeline = [] # list of dicts: {'status': str, 'duration': float, 'location': str, 'miles_at_start': float, 'notes': str}
        
        def add_time(status: str, duration: float, location: str, notes: str = ""):
            nonlocal trip_time_hours, shift_driving, shift_on_duty, driving_since_break, cycle_remaining
            
            timeline.append({
                'status': status,
                'duration': duration,
                'location': location,
                'miles_at_start': current_miles,
                'notes': notes
            })
            
            trip_time_hours += duration
            
            if status == "driving":
                shift_driving += duration
                shift_on_duty += duration
                driving_since_break += duration
                cycle_remaining -= duration
            elif status == "on_duty":
                shift_on_duty += duration
                cycle_remaining -= duration
            elif status == "off_duty" or status == "sleeper":
                # Resets happen here, but we check them specifically
                pass
                
        def take_rest(hours: float, location: str, rest_type="off_duty", note="Rest"):
            nonlocal shift_driving, shift_on_duty, driving_since_break
            add_time(rest_type, hours, location, note)
            if hours >= MIN_OFF_DUTY_HOURS:
                shift_driving = 0.0
                shift_on_duty = 0.0
                driving_since_break = 0.0
                
        def take_restart(location: str):
            nonlocal cycle_remaining
            take_rest(RESTART_HOURS, location, "off_duty", "34-Hour Restart")
            cycle_remaining = CYCLE_LIMIT_HOURS
            
        def take_break(location: str):
            nonlocal driving_since_break
            add_time("off_duty", MANDATORY_BREAK_HOURS, location, "30-min Break")
            driving_since_break = 0.0
            
        # Before we start, if we have no cycle left, take restart
        if cycle_remaining <= 0:
            take_restart(current_loc)
            
        # Drive current -> pickup (if needed)
        # Drive pickup -> dropoff
        
        # We process segment by segment
        segments = route['segments']
        total_steps = []
        for seg in segments:
            for step in seg['steps']:
                total_steps.append(step)
                
        # Simulate step by step
        for step in total_steps:
            step_miles = step['distance']
            # ORS provides duration in seconds, but we might want a fallback to AVG_SPEED_MPH if it's weird
            step_duration_hours = step['duration'] / 3600.0 if step['duration'] > 0 else (step_miles / AVG_SPEED_MPH)
            
            if step_miles <= 0:
                continue
                
            miles_remaining_in_step = step_miles
            time_remaining_in_step = step_duration_hours
            
            while miles_remaining_in_step > 0.01:
                # Check cycle
                if cycle_remaining <= 0:
                    take_restart("En Route")
                    continue
                    
                # Check 14 hour window
                if shift_on_duty >= MAX_DUTY_WINDOW:
                    take_rest(MIN_OFF_DUTY_HOURS, "En Route", "sleeper", "10-Hour Shift Reset")
                    continue
                    
                # Check 11 hour driving
                if shift_driving >= MAX_DRIVING_HOURS:
                    take_rest(MIN_OFF_DUTY_HOURS, "En Route", "sleeper", "11-Hour Drive Limit Hit")
                    continue
                    
                # Check 8 hour break
                if driving_since_break >= BREAK_AFTER_DRIVING:
                    take_break("En Route")
                    continue
                    
                # Calculate how much we can drive in this chunk
                speed_mph = miles_remaining_in_step / time_remaining_in_step if time_remaining_in_step > 0 else AVG_SPEED_MPH
                
                driveable_time = min(
                    time_remaining_in_step,
                    MAX_DRIVING_HOURS - shift_driving,
                    MAX_DUTY_WINDOW - shift_on_duty,
                    BREAK_AFTER_DRIVING - driving_since_break,
                    cycle_remaining
                )
                
                # Check fuel distance limit
                miles_to_next_fuel = FUEL_INTERVAL_MILES - miles_since_fuel
                time_to_next_fuel = miles_to_next_fuel / speed_mph
                
                if time_to_next_fuel < driveable_time:
                    # Drive to fuel stop
                    driveable_time = time_to_next_fuel
                    driveable_miles = driveable_time * speed_mph
                    
                    add_time("driving", driveable_time, "En Route")
                    miles_remaining_in_step -= driveable_miles
                    time_remaining_in_step -= driveable_time
                    current_miles += driveable_miles
                    miles_since_fuel += driveable_miles
                    
                    # Do Fuel Stop
                    add_time("on_duty", FUEL_DURATION_HOURS, "Fuel Stop", "Fueling")
                    miles_since_fuel = 0.0
                    
                    # Need to record stop
                    # Approx location
                    coord = geometry_coords_lat_lon[-1] if geometry_coords_lat_lon else [0,0] # rough fallback
                    trip.stops.append(Stop(
                        stop_type="fuel",
                        location_name="Fuel Station",
                        latitude=coord[0],
                        longitude=coord[1],
                        arrival_time=(trip_start_date + timedelta(hours=trip_time_hours - FUEL_DURATION_HOURS)).isoformat(),
                        departure_time=(trip_start_date + timedelta(hours=trip_time_hours)).isoformat(),
                        duration_hours=FUEL_DURATION_HOURS,
                        miles_from_start=current_miles,
                        sequence_order=len(trip.stops)+1,
                        notes="Fuel Stop"
                    ))
                else:
                    # Drive the chunk
                    driveable_miles = driveable_time * speed_mph
                    add_time("driving", driveable_time, "En Route")
                    miles_remaining_in_step -= driveable_miles
                    time_remaining_in_step -= driveable_time
                    current_miles += driveable_miles
                    miles_since_fuel += driveable_miles
                    
            # Check if this step is near pickup
            # Simple assumption: segment 1 is current -> pickup. segment 2 is pickup -> dropoff.
            # We don't have perfect alignment without mapping steps to segments directly, but we can do a rough check based on distance.
            pass
            
        # Add final Dropoff on duty
        add_time("on_duty", DROPOFF_DURATION_HOURS, dropoff_loc, "Dropoff Load")
        trip.stops.append(Stop(
            stop_type="dropoff",
            location_name=dropoff_loc,
            latitude=coords_dropoff[1],
            longitude=coords_dropoff[0],
            arrival_time=(trip_start_date + timedelta(hours=trip_time_hours - DROPOFF_DURATION_HOURS)).isoformat(),
            departure_time=(trip_start_date + timedelta(hours=trip_time_hours)).isoformat(),
            duration_hours=DROPOFF_DURATION_HOURS,
            miles_from_start=current_miles,
            sequence_order=len(trip.stops)+1,
            notes="Dropoff"
        ))

        # 4. Generate Daily Logs from Timeline
        trip.total_distance_miles = round(current_miles, 1)
        trip.total_driving_hours = round(sum([t['duration'] for t in timeline if t['status'] == 'driving']), 1)
        
        # Split timeline into 24 hour chunks
        current_day_start_hour = 0.0 # start at 0 relative to trip_start_date 6am
        # Wait, ELD logs are usually midnight to midnight.
        # If trip starts at 6am today, that means Day 1 has 6 hours of Off Duty before the trip starts.
        
        # Let's rebuild the exact 24hr chunks from Midnight to Midnight.
        trip_start_time_of_day = trip_start_date.hour + trip_start_date.minute/60.0 # 6.0
        
        current_timeline_time = trip_start_time_of_day # Starts at 6.0
        current_day_num = 1
        
        day_logs = {}
        
        def get_or_create_log(day_num):
            if day_num not in day_logs:
                day_logs[day_num] = DailyLog(
                    day_number=day_num,
                    date=(trip_start_date.date() + timedelta(days=day_num-1)).isoformat(),
                    total_miles_today=0,
                    from_location=current_loc,
                    to_location=dropoff_loc,
                )
                # Pre-fill with off-duty if it's the start of the day
                if day_num == 1 and trip_start_time_of_day > 0:
                    day_logs[day_num].duty_segments.append(
                        {"status": "off_duty", "start": 0.0, "end": trip_start_time_of_day}
                    )
                    day_logs[day_num].off_duty_hours += trip_start_time_of_day
            return day_logs[day_num]
            
        log = get_or_create_log(current_day_num)
        
        for item in timeline:
            status = item['status']
            dur = item['duration']
            loc = item['location']
            note = item['notes']
            
            # While this chunk spans into the next day
            while current_timeline_time + dur > 24.0:
                chunk_in_this_day = 24.0 - current_timeline_time
                log = get_or_create_log(current_day_num)
                
                log.duty_segments.append({"status": status, "start": current_timeline_time, "end": 24.0})
                if status == 'driving': log.driving_hours += chunk_in_this_day
                elif status == 'on_duty': log.on_duty_hours += chunk_in_this_day
                elif status == 'off_duty': log.off_duty_hours += chunk_in_this_day
                elif status == 'sleeper': log.sleeper_hours += chunk_in_this_day
                
                if note:
                    log.remarks.append({"time": current_timeline_time, "location": loc, "note": note})
                    note = "" # Only add remark once
                    
                dur -= chunk_in_this_day
                current_timeline_time = 0.0
                current_day_num += 1
                
            # Remainder of chunk in current day
            if dur > 0:
                log = get_or_create_log(current_day_num)
                end_time = current_timeline_time + dur
                log.duty_segments.append({"status": status, "start": current_timeline_time, "end": end_time})
                
                if status == 'driving': 
                    log.driving_hours += dur
                    # rough mileage assignment per day based on driving time ratio
                    log.total_miles_today += (dur / trip.total_driving_hours) * trip.total_distance_miles if trip.total_driving_hours > 0 else 0
                elif status == 'on_duty': log.on_duty_hours += dur
                elif status == 'off_duty': log.off_duty_hours += dur
                elif status == 'sleeper': log.sleeper_hours += dur
                
                if note:
                    log.remarks.append({"time": current_timeline_time, "location": loc, "note": note})
                    
                current_timeline_time = end_time
                
        # Fill rest of final day with off duty
        if current_timeline_time < 24.0:
            log = get_or_create_log(current_day_num)
            log.duty_segments.append({"status": "off_duty", "start": current_timeline_time, "end": 24.0})
            log.off_duty_hours += (24.0 - current_timeline_time)
            log.remarks.append({"time": current_timeline_time, "location": dropoff_loc, "note": "End of Shift / Off Duty"})

        # Round things
        for d in day_logs.values():
            d.total_miles_today = round(d.total_miles_today, 1)
            d.off_duty_hours = round(d.off_duty_hours, 2)
            d.sleeper_hours = round(d.sleeper_hours, 2)
            d.driving_hours = round(d.driving_hours, 2)
            d.on_duty_hours = round(d.on_duty_hours, 2)
            # combine consecutive segments of same status
            optimized_segs = []
            for seg in d.duty_segments:
                if optimized_segs and optimized_segs[-1]['status'] == seg['status'] and optimized_segs[-1]['end'] == seg['start']:
                    optimized_segs[-1]['end'] = seg['end']
                else:
                    optimized_segs.append(seg)
            # Round segments start/end
            for seg in optimized_segs:
                seg['start'] = round(seg['start'], 2)
                seg['end'] = round(seg['end'], 2)
            d.duty_segments = optimized_segs
            trip.daily_logs.append(d)
            
        trip.total_trip_days = len(trip.daily_logs)
        
        return trip
