import { MapPin, Navigation, Clock, Calendar, Fuel } from 'lucide-react';
import { useEffect, useState } from 'react';

// Animated Counter Hook
function useAnimatedCounter(endValue, duration = 1000) {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // easeOutQuart
      const ease = 1 - Math.pow(1 - progress, 4);
      setCount(progress === 1 ? endValue : endValue * ease);
      if (progress < 1) window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame(step);
  }, [endValue, duration]);

  return count;
}

export default function TripSummary({ tripData }) {
  if (!tripData) return null;
  
  const animDist = useAnimatedCounter(tripData.total_distance_miles);
  const animHours = useAnimatedCounter(tripData.total_driving_hours);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* KPI Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
        <div className="kpi-card">
          <div className="kpi-icon" style={{ backgroundColor: 'var(--accent-primary-light)', color: 'var(--accent-primary)' }}>
            <Navigation size={20} />
          </div>
          <div className="kpi-value">{Math.round(animDist).toLocaleString()} <span className="kpi-unit">mi</span></div>
          <div className="kpi-label">Total Distance</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon" style={{ backgroundColor: 'rgba(5, 150, 105, 0.1)', color: 'var(--status-d)' }}>
            <Clock size={20} />
          </div>
          <div className="kpi-value">{animHours.toFixed(1)} <span className="kpi-unit">hrs</span></div>
          <div className="kpi-label">Driving Time</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon" style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)', color: 'var(--status-sb)' }}>
            <Calendar size={20} />
          </div>
          <div className="kpi-value">{tripData.total_trip_days} <span className="kpi-unit">days</span></div>
          <div className="kpi-label">Trip Duration</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon" style={{ backgroundColor: 'rgba(217, 119, 6, 0.1)', color: 'var(--status-on)' }}>
            <Fuel size={20} />
          </div>
          <div className="kpi-value">{tripData.stops.filter(s => s.stop_type === 'fuel').length}</div>
          <div className="kpi-label">Required Fuel Stops</div>
        </div>
      </div>

      <style>{`
        .kpi-card {
          background-color: var(--bg-tertiary);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .kpi-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }
        .kpi-icon {
          width: 40px;
          height: 40px;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .kpi-value {
          font-family: var(--font-heading);
          font-size: 2rem;
          font-weight: 700;
          color: var(--text-primary);
          line-height: 1;
          font-variant-numeric: tabular-nums;
        }
        .kpi-unit {
          font-size: 1rem;
          font-weight: 500;
          color: var(--text-muted);
        }
        .kpi-label {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        
        .timeline {
          position: relative;
          padding-left: 28px;
          margin-top: 8px;
        }
        .timeline::before {
          content: '';
          position: absolute;
          left: 9px;
          top: 12px;
          bottom: 12px;
          width: 2px;
          background-color: var(--border);
        }
        .timeline-item {
          position: relative;
          padding-bottom: 28px;
          animation: fadeUp 0.5s ease-out backwards;
        }
        .timeline-item:last-child {
          padding-bottom: 0;
        }
        .timeline-dot {
          position: absolute;
          left: -28px;
          top: 4px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background-color: var(--bg-secondary);
          border: 4px solid var(--accent-primary);
          z-index: 1;
        }
        .time-chip {
          background-color: var(--bg-primary);
          border: 1px solid var(--border);
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-secondary);
          display: inline-block;
          margin-top: 8px;
        }
      `}</style>

      {/* Itinerary Timeline */}
      <div>
        <h4 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '24px', color: 'var(--text-primary)' }}>Route Itinerary</h4>
        <div className="timeline">
          {tripData.stops.map((stop, index) => {
            
            let color = 'var(--accent-primary)';
            if (stop.stop_type === 'start') color = 'var(--status-d)';
            if (stop.stop_type === 'pickup') color = 'var(--status-on)';
            if (stop.stop_type === 'dropoff') color = 'var(--accent-primary)';
            if (stop.stop_type === 'fuel') color = 'var(--status-on)';
            if (stop.stop_type === 'overnight') color = 'var(--status-sb)';
            
            return (
              <div key={index} className="timeline-item" style={{ animationDelay: `${index * 0.1}s` }}>
                <div className="timeline-dot" style={{ borderColor: color }}></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-heading)', fontWeight: '700', fontSize: '1rem', color: 'var(--text-primary)' }}>
                      {stop.location_name}
                    </div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '4px', fontWeight: '500' }}>
                      <span style={{ color, textTransform: 'capitalize' }}>{stop.stop_type}</span> • {stop.notes}
                    </div>
                    {stop.duration_hours > 0 && (
                      <div className="time-chip">
                        {stop.duration_hours} hr {stop.stop_type === 'driving' ? 'drive' : 'stop'}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', backgroundColor: 'var(--bg-tertiary)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                      {new Date(stop.arrival_time).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                      {new Date(stop.arrival_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
                    </div>
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
