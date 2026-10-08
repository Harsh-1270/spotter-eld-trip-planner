import { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Custom icons to match our dark theme
const createIcon = (color) => {
  return L.divIcon({
    className: 'custom-icon',
    html: `<div style="background-color: ${color}; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px ${color}"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  });
};

const ICONS = {
  start: createIcon('#10B981'), // Green
  pickup: createIcon('#F59E0B'), // Amber
  dropoff: createIcon('#EF4444'), // Red
  fuel: createIcon('#F59E0B'), // Amber
  rest: createIcon('#4F8CFF'), // Blue
  overnight: createIcon('#8B5CF6'), // Purple
};

// Component to auto-fit the map to the route bounds
function MapBounds({ routeGeometry }) {
  const map = useMap();
  useEffect(() => {
    if (routeGeometry && routeGeometry.length > 0) {
      const bounds = L.latLngBounds(routeGeometry);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [routeGeometry, map]);
  return null;
}

export default function RouteMap({ tripData }) {
  // Default center (US)
  const defaultCenter = [39.8283, -98.5795];
  const zoom = 4;

  if (!tripData) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
        <p>Enter trip details to view the route map.</p>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', width: '100%', minHeight: '400px', backgroundColor: '#1a1d24' }}>
      <MapContainer 
        center={defaultCenter} 
        zoom={zoom} 
        style={{ height: '100%', width: '100%', zIndex: 1 }}
        zoomControl={false}
      >
        {/* Dark mode map tiles (Using standard OSM with CSS inversion trick for free dark mode) */}
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          className="map-tiles"
        />
        
        {/* Draw Route Polyline */}
        {tripData.route_geometry && (
          <Polyline 
            positions={tripData.route_geometry} 
            color="#4F8CFF" 
            weight={4} 
            opacity={0.8}
          />
        )}

        {/* Draw Stops */}
        {tripData.stops && tripData.stops.map((stop, index) => (
          <Marker 
            key={index} 
            position={[stop.latitude, stop.longitude]}
            icon={ICONS[stop.stop_type] || ICONS.rest}
          >
            <Popup className="dark-popup">
              <div style={{ padding: '4px' }}>
                <h4 style={{ margin: '0 0 4px 0', textTransform: 'capitalize', color: 'black' }}>{stop.stop_type} Stop</h4>
                <p style={{ margin: '0 0 2px 0', fontSize: '0.85rem', color: '#333' }}>{stop.location_name}</p>
                <p style={{ margin: '0', fontSize: '0.8rem', color: '#666' }}>{stop.notes}</p>
              </div>
            </Popup>
          </Marker>
        ))}

        <MapBounds routeGeometry={tripData.route_geometry} />
      </MapContainer>
    </div>
  );
}
