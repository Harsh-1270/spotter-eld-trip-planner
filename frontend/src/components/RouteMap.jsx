import { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Clean SaaS Map Icons
const createIcon = (color, size = 14) => {
  return L.divIcon({
    className: 'custom-icon',
    html: `<div style="background-color: ${color}; width: ${size}px; height: ${size}px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3)"></div>`,
    iconSize: [size, size],
    iconAnchor: [size/2, size/2]
  });
};

const ICONS = {
  start: createIcon('var(--status-d)', 16),
  pickup: createIcon('var(--status-on)', 16),
  dropoff: createIcon('var(--accent-primary)', 16),
  fuel: createIcon('var(--status-on)', 12),
  rest: createIcon('var(--text-muted)', 12),
  overnight: createIcon('var(--status-sb)', 12),
};

function MapBounds({ routeGeometry }) {
  const map = useMap();
  useEffect(() => {
    if (routeGeometry && routeGeometry.length > 0) {
      const bounds = L.latLngBounds(routeGeometry);
      map.fitBounds(bounds, { padding: [60, 60] });
    }
  }, [routeGeometry, map]);
  return null;
}

export default function RouteMap({ tripData, theme }) {
  const defaultCenter = [39.8283, -98.5795];
  const zoom = 4;

  if (!tripData) return null;

  return (
    <div style={{ height: '100%', width: '100%', minHeight: '550px', backgroundColor: 'var(--bg-primary)' }}>
      <MapContainer 
        center={defaultCenter} 
        zoom={zoom} 
        style={{ height: '100%', width: '100%', zIndex: 1 }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          className="map-tiles"
        />
        
        {tripData.route_geometry && (
          <Polyline 
            positions={tripData.route_geometry} 
            color="var(--accent-primary)" 
            weight={4} 
            opacity={0.9}
            lineCap="round"
            lineJoin="round"
          />
        )}

        {tripData.stops && tripData.stops.map((stop, index) => (
          <Marker 
            key={index} 
            position={[stop.latitude, stop.longitude]}
            icon={ICONS[stop.stop_type] || ICONS.rest}
          >
            <Popup className="saas-popup">
              <div style={{ padding: '8px', minWidth: '150px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '4px', letterSpacing: '0.05em' }}>
                  {stop.stop_type} Stop
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>
                  {stop.location_name}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {stop.notes}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        <MapBounds routeGeometry={tripData.route_geometry} />
      </MapContainer>
      
      <style>{`
        .leaflet-popup-content-wrapper {
          border-radius: var(--radius-md) !important;
          box-shadow: var(--shadow-lg) !important;
          background-color: var(--bg-secondary) !important;
          border: 1px solid var(--border) !important;
        }
        .leaflet-popup-tip {
          background-color: var(--bg-secondary) !important;
          border: 1px solid var(--border) !important;
        }
        .leaflet-container {
          font-family: var(--font-sans) !important;
        }
      `}</style>
    </div>
  );
}
