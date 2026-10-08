from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
import dataclasses
import uuid
from .hos_calculator import HOSCalculator

class PlanTripView(APIView):
    """
    POST /api/plan-trip/
    Takes current_location, pickup_location, dropoff_location, current_cycle_used
    Returns the full calculated trip with route geometry, stops, and daily logs.
    """
    
    def post(self, request, *args, **kwargs):
        # Extract inputs
        data = request.data
        current_loc = data.get('current_location')
        pickup_loc = data.get('pickup_location')
        dropoff_loc = data.get('dropoff_location')
        
        try:
            current_cycle_used = float(data.get('current_cycle_used', 0.0))
        except ValueError:
            return Response({"error": "current_cycle_used must be a number"}, status=status.HTTP_400_BAD_REQUEST)
            
        if not all([current_loc, pickup_loc, dropoff_loc]):
            return Response({"error": "Please provide current_location, pickup_location, and dropoff_location"}, 
                            status=status.HTTP_400_BAD_REQUEST)
                            
        # Initialize calculator
        calculator = HOSCalculator()
        
        try:
            # Plan the trip!
            trip = calculator.plan_trip(
                current_loc=current_loc,
                pickup_loc=pickup_loc,
                dropoff_loc=dropoff_loc,
                current_cycle_used=current_cycle_used
            )
            
            # Convert python dataclasses to dict for JSON serialization
            response_data = dataclasses.asdict(trip)
            # Add a unique ID for the frontend to use as a key if needed
            response_data['id'] = str(uuid.uuid4())
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except ValueError as e:
            # Known validation or routing errors
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            # Unexpected server errors
            import traceback
            traceback.print_exc()
            return Response({"error": f"An unexpected error occurred during trip calculation: {str(e)}"}, 
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)
