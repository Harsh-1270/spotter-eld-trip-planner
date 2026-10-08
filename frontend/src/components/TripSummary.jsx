import { MapPin, Navigation, Clock, Calendar, Fuel } from 'lucide-react';

export default function TripSummary({ tripData }) {
  if (!tripData) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Top Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        <div className="stat-box">
          <Navigation size={18} color="var(--accent-primary)" />
          <div className="stat-value">{tripData.total_distance_miles.toLocaleString()} mi</div>
          <div className="stat-label">Total Distance</div>
        </div>
        <div className="stat-box">
          <Clock size={18} color="var(--accent-primary)" />
          <div className="stat-value">{tripData.total_driving_hours.toFixed(1)} hrs</div>
          <div className="stat-label">Driving Time</div>
        </div>
        <div className="stat-box">
          <Calendar size={18} color="var(--accent-primary)" />
          <div className="stat-value">{tripData.total_trip_days}</div>
          <div className="stat-label">Trip Days</div>
        </div>
        <div className="stat-box">
          <Fuel size={18} color="var(--accent-primary)" />
          <div className="stat-value">{tripData.stops.filter(s => s.stop_type === 'fuel').length}</div>
          <div className="stat-label">Fuel Stops</div>
        </div>
      </div>

      <style>{`
        .stat-box {
          background-color: var(--bg-tertiary);
          border-radius: var(--radius-md);
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .stat-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--text-primary);
        }
        .stat-label {
          font-size: 0.8rem;
          color: var(--text-secondary);
        }
        
        .timeline {
          position: relative;
          padding-left: 24px;
        }
        .timeline::before {
          content: '';
          position: absolute;
          left: 7px;
          top: 8px;
          bottom: 8px;
          width: 2px;
          background-color: var(--border);
        }
        .timeline-item {
          position: relative;
          padding-bottom: 24px;
        }
        .timeline-item:last-child {
          padding-bottom: 0;
        }
        .timeline-dot {
          position: absolute;
          left: -24px;
          top: 4px;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background-color: var(--bg-tertiary);
          border: 2px solid var(--accent-primary);
          z-index: 1;
        }
      `}</style>

      {/* Itinerary Timeline */}
      <div>
        <h3 style={{ fontSize: '1rem', marginBottom: '16px', color: 'var(--text-secondary)' }}>Itinerary</h3>
        <div className="timeline">
          {tripData.stops.map((stop, index) => {
            
            let color = 'var(--accent-primary)';
            if (stop.stop_type === 'start') color = 'var(--accent-success)';
            if (stop.stop_type === 'pickup') color = 'var(--accent-warning)';
            if (stop.stop_type === 'dropoff') color = 'var(--accent-danger)';
            if (stop.stop_type === 'fuel') color = 'var(--accent-warning)';
            
            return (
              <div key={index} className="timeline-item">
                <div className="timeline-dot" style={{ borderColor: color, backgroundColor: color, boxShadow: `0 0 8px ${color}40` }}></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: '600', textTransform: 'capitalize' }}>
                      {stop.stop_type} - {stop.location_name}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      {stop.notes} {stop.duration_hours > 0 ? `(${stop.duration_hours} hrs)` : ''}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'right' }}>
                    <div>{new Date(stop.arrival_time).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                    <div>{new Date(stop.arrival_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
