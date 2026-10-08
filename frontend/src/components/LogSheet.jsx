import { useState, useEffect, useRef } from 'react';
import { Download } from 'lucide-react';

const STATUS_ROWS = { 'off_duty': 0, 'sleeper': 1, 'driving': 2, 'on_duty': 3 };

// Uses CSS variable colors to match theme
const getStatusColor = (status, isDark) => {
  const root = document.documentElement;
  const style = getComputedStyle(root);
  switch (status) {
    case 'off_duty': return style.getPropertyValue('--status-off').trim() || (isDark ? '#94A3B8' : '#64748B');
    case 'sleeper': return style.getPropertyValue('--status-sb').trim() || (isDark ? '#A78BFA' : '#8B5CF6');
    case 'driving': return style.getPropertyValue('--status-d').trim() || (isDark ? '#34D399' : '#059669');
    case 'on_duty': return style.getPropertyValue('--status-on').trim() || (isDark ? '#FBBF24' : '#D97706');
    default: return '#000';
  }
};

export default function LogSheet({ logs, theme }) {
  const [activeDay, setActiveDay] = useState(1);
  const canvasRef = useRef(null);

  const activeLog = logs?.find(l => l.day_number === activeDay);
  const isDark = theme === 'dark';

  useEffect(() => {
    if (!activeLog || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.offsetWidth;
    const height = 280;
    const scale = window.devicePixelRatio || 1;
    
    canvas.width = width * scale;
    canvas.height = height * scale;
    ctx.scale(scale, scale);

    const rootStyle = getComputedStyle(document.documentElement);
    const bgColor = rootStyle.getPropertyValue('--bg-secondary').trim() || (isDark ? '#121826' : '#FFFFFF');
    const textColor = rootStyle.getPropertyValue('--text-primary').trim() || (isDark ? '#F8FAFC' : '#0F172A');
    const mutedColor = rootStyle.getPropertyValue('--text-muted').trim() || (isDark ? '#64748B' : '#94A3B8');
    const gridColor = rootStyle.getPropertyValue('--border').trim() || (isDark ? '#1E293B' : '#E2E8F0');

    const padding = 20;
    const headerHeight = 50;
    const leftMargin = 90;
    const rightMargin = 20;
    const gridWidth = width - leftMargin - rightMargin;
    const rowHeight = 40;
    const gridHeight = rowHeight * 4;
    const gridTop = headerHeight + padding;

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    // Draw Background Highlights First
    if (activeLog.duty_segments && activeLog.duty_segments.length > 0) {
      activeLog.duty_segments.forEach((seg) => {
        if (seg.status === 'driving' || seg.status === 'on_duty') {
          const row = STATUS_ROWS[seg.status];
          const x1 = leftMargin + (seg.start * (gridWidth / 24));
          const w = (seg.end - seg.start) * (gridWidth / 24);
          const y = gridTop + (row * rowHeight);
          ctx.fillStyle = getStatusColor(seg.status, isDark) + (isDark ? '20' : '15'); 
          ctx.fillRect(x1, y, w, rowHeight);
        }
      });
    }

    // Draw Grid
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.fillStyle = textColor;
    ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
    ctx.textBaseline = 'middle';

    const labels = ['OFF DUTY', 'SLEEPER', 'DRIVING', 'ON DUTY'];
    labels.forEach((label, i) => {
      const y = gridTop + (i * rowHeight) + (rowHeight / 2);
      ctx.fillText(label, padding, y);

      ctx.beginPath();
      ctx.moveTo(leftMargin, gridTop + (i * rowHeight));
      ctx.lineTo(leftMargin + gridWidth, gridTop + (i * rowHeight));
      ctx.stroke();
    });
    
    ctx.beginPath();
    ctx.moveTo(leftMargin, gridTop + gridHeight);
    ctx.lineTo(leftMargin + gridWidth, gridTop + gridHeight);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = mutedColor;
    ctx.font = '500 10px Inter, sans-serif';
    
    for (let i = 0; i <= 24; i++) {
      const x = leftMargin + (i * (gridWidth / 24));
      
      // Hour lines
      ctx.beginPath();
      ctx.moveTo(x, gridTop);
      ctx.lineTo(x, gridTop + gridHeight);
      ctx.strokeStyle = i % 2 === 0 ? gridColor : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)');
      ctx.stroke();

      if (i < 24) {
        let label = (i === 0 || i === 24) ? 'M' : (i === 12 ? 'N' : (i % 12).toString());
        ctx.fillText(label, x + (gridWidth / 48), gridTop - 12);
        
        // 15 min ticks
        ctx.strokeStyle = gridColor;
        for (let j = 1; j <= 3; j++) {
          const tickX = x + (j * (gridWidth / 96));
          ctx.beginPath(); ctx.moveTo(tickX, gridTop); ctx.lineTo(tickX, gridTop + 4); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(tickX, gridTop + gridHeight - 4); ctx.lineTo(tickX, gridTop + gridHeight); ctx.stroke();
        }
      }
    }

    // Draw Logs Lines
    if (activeLog.duty_segments && activeLog.duty_segments.length > 0) {
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      let lastX = null;
      let lastY = null;

      activeLog.duty_segments.forEach((seg, index) => {
        const row = STATUS_ROWS[seg.status];
        const x1 = leftMargin + (seg.start * (gridWidth / 24));
        const x2 = leftMargin + (seg.end * (gridWidth / 24));
        const y = gridTop + (row * rowHeight) + (rowHeight / 2);

        ctx.strokeStyle = getStatusColor(seg.status, isDark);
        ctx.beginPath();
        if (index > 0 && lastX !== null && lastY !== null) {
          ctx.moveTo(lastX, lastY);
          ctx.lineTo(x1, y);
        } else {
          ctx.moveTo(x1, y);
        }
        ctx.lineTo(x2, y);
        ctx.stroke();

        lastX = x2;
        lastY = y;
      });
    }
  }, [activeLog, theme]);

  if (!logs || logs.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Segmented Controls / Day Tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ 
          display: 'flex', gap: '4px', overflowX: 'auto', 
          backgroundColor: 'var(--bg-tertiary)', padding: '4px', 
          borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' 
        }}>
          {logs.map(log => {
            const isActive = activeDay === log.day_number;
            return (
              <button
                key={log.day_number}
                onClick={() => setActiveDay(log.day_number)}
                style={{
                  padding: '8px 20px',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  backgroundColor: isActive ? 'var(--bg-secondary)' : 'transparent',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                  fontWeight: isActive ? '600' : '500',
                  fontSize: '0.9rem',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s',
                  boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
                }}
              >
                Day {log.day_number} <span style={{ opacity: 0.7, fontWeight: 400, marginLeft: '4px' }}>{log.date.slice(5)}</span>
              </button>
            );
          })}
        </div>
        
        <button className="btn-secondary">
          <Download size={16} /> Export PDF
        </button>
      </div>

      {activeLog && (
        <>
          {/* Header Strip */}
          <div style={{ 
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '16px', padding: '16px 24px', backgroundColor: 'var(--bg-tertiary)', 
            borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' 
          }}>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Origin</div>
              <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{activeLog.from_location}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Destination</div>
              <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{activeLog.to_location}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Distance Today</div>
              <div style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '1.1rem' }}>{activeLog.total_miles_today} <span style={{ fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-muted)' }}>mi</span></div>
            </div>
          </div>

          {/* Graph */}
          <div style={{ width: '100%', height: '280px', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)', boxShadow: 'var(--shadow-sm)' }}>
            <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
          </div>

          {/* Totals & Remarks */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2fr', gap: '24px' }}>
            
            {/* Totals Card */}
            <div className="glass-card" style={{ padding: '24px' }}>
              <h4 style={{ fontFamily: 'var(--font-heading)', margin: '0 0 20px 0', fontSize: '1rem', color: 'var(--text-primary)' }}>Daily Totals</h4>
              
              {[
                { label: 'Off Duty', hrs: activeLog.off_duty_hours, key: 'off_duty' },
                { label: 'Sleeper Berth', hrs: activeLog.sleeper_hours, key: 'sleeper' },
                { label: 'Driving', hrs: activeLog.driving_hours, key: 'driving' },
                { label: 'On Duty', hrs: activeLog.on_duty_hours, key: 'on_duty' }
              ].map(stat => (
                <div key={stat.key} style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>{stat.label}</span>
                    <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{stat.hrs.toFixed(1)}h</strong>
                  </div>
                  <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ 
                      width: `${(stat.hrs / 24) * 100}%`, 
                      height: '100%', 
                      backgroundColor: getStatusColor(stat.key, isDark),
                      borderRadius: '3px'
                    }}></div>
                  </div>
                </div>
              ))}
              
              <div style={{ borderTop: '1px solid var(--border)', marginTop: '20px', paddingTop: '16px', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>Total Hours</span>
                <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>24.0h</span>
              </div>
            </div>

            {/* Remarks List */}
            <div className="glass-card" style={{ padding: '24px' }}>
              <h4 style={{ fontFamily: 'var(--font-heading)', margin: '0 0 20px 0', fontSize: '1rem', color: 'var(--text-primary)' }}>Event Remarks</h4>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '250px', overflowY: 'auto', paddingRight: '8px' }}>
                {activeLog.remarks.map((r, i) => {
                  const timeParts = r.time.toString().split('.');
                  const hrs = parseInt(timeParts[0]);
                  const mins = timeParts.length > 1 ? Math.round(parseFloat('0.' + timeParts[1]) * 60) : 0;
                  const timeStr = `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;

                  return (
                    <div key={i} style={{ 
                      display: 'flex', gap: '16px', padding: '12px', 
                      backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border)'
                    }}>
                      <div style={{ 
                        backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)', 
                        padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', 
                        fontWeight: '700', color: 'var(--text-primary)', height: 'fit-content'
                      }}>
                        {timeStr}
                      </div>
                      <div>
                        <div style={{ color: 'var(--text-primary)', fontWeight: '600', fontSize: '0.95rem' }}>{r.location}</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '2px' }}>{r.note}</div>
                      </div>
                    </div>
                  );
                })}
                {activeLog.remarks.length === 0 && (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '32px 0' }}>
                    No manual remarks for this duty day.
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
