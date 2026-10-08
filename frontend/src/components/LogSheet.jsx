import { useState, useEffect, useRef } from 'react';

// Status row mapping (0 = Off Duty, 1 = Sleeper, 2 = Driving, 3 = On Duty)
const STATUS_ROWS = {
  'off_duty': 0,
  'sleeper': 1,
  'driving': 2,
  'on_duty': 3
};

const STATUS_COLORS = {
  'off_duty': '#94A3B8', // Grey
  'sleeper': '#A78BFA',  // Purple
  'driving': '#34D399',  // Emerald Green
  'on_duty': '#EF4444'   // Coral Red
};

export default function LogSheet({ logs, theme }) {
  const [activeDay, setActiveDay] = useState(1);
  const canvasRef = useRef(null);
  
  const activeLog = logs?.find(l => l.day_number === activeDay);

  useEffect(() => {
    if (!activeLog || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Canvas dimensions and styling for high-DPI
    const width = canvas.offsetWidth;
    const height = 300; // Fixed height
    
    // Set actual canvas size (handle retina displays)
    const scale = window.devicePixelRatio || 1;
    canvas.width = width * scale;
    canvas.height = height * scale;
    ctx.scale(scale, scale);
    
    // Drawing constants
    const padding = 20;
    const headerHeight = 60;
    const leftMargin = 100;
    const rightMargin = 40;
    const gridWidth = width - leftMargin - rightMargin;
    const rowHeight = 35;
    const gridHeight = rowHeight * 4;
    const gridTop = headerHeight + padding;
    
    // Use exact hex colors based on the theme prop to avoid DOM CSS variable race conditions
    const isDark = theme === 'dark';
    const bgColor = isDark ? '#12141D' : '#FFFFFF';
    const textColor = isDark ? '#9CA3AF' : '#6B7280';
    const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)';

    // Clear canvas
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);
    
    // --- DRAW BACKGROUND & GRID ---
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.fillStyle = textColor;
    ctx.font = '12px Inter';
    ctx.textBaseline = 'middle';
    
    // Status Labels
    const labels = ['OFF DUTY', 'SLEEPER', 'DRIVING', 'ON DUTY'];
    labels.forEach((label, i) => {
      const y = gridTop + (i * rowHeight) + (rowHeight / 2);
      ctx.fillText(label, padding, y);
      
      // Horizontal grid lines
      ctx.beginPath();
      ctx.moveTo(leftMargin, gridTop + (i * rowHeight));
      ctx.lineTo(leftMargin + gridWidth, gridTop + (i * rowHeight));
      ctx.stroke();
    });
    // Bottom grid line
    ctx.beginPath();
    ctx.moveTo(leftMargin, gridTop + gridHeight);
    ctx.lineTo(leftMargin + gridWidth, gridTop + gridHeight);
    ctx.stroke();

    // Vertical time lines (24 hours)
    ctx.textAlign = 'center';
    for (let i = 0; i <= 24; i++) {
      const x = leftMargin + (i * (gridWidth / 24));
      
      // Hourly line
      ctx.beginPath();
      ctx.moveTo(x, gridTop);
      ctx.lineTo(x, gridTop + gridHeight);
      ctx.stroke();
      
      // Hour Labels
      if (i < 24) {
        let label = '';
        if (i === 0 || i === 24) label = 'M';
        else if (i === 12) label = 'N';
        else label = (i % 12).toString();
        ctx.fillText(label, x + (gridWidth / 48), gridTop - 15);
      }
      
      // 15-minute tick marks (except on the last line)
      if (i < 24) {
        for (let j = 1; j <= 3; j++) {
          const tickX = x + (j * (gridWidth / 96));
          ctx.beginPath();
          ctx.moveTo(tickX, gridTop);
          ctx.lineTo(tickX, gridTop + 5);
          ctx.stroke();
          
          ctx.beginPath();
          ctx.moveTo(tickX, gridTop + gridHeight - 5);
          ctx.lineTo(tickX, gridTop + gridHeight);
          ctx.stroke();
        }
      }
    }

    // --- DRAW DUTY STATUS LINES ---
    if (activeLog.duty_segments && activeLog.duty_segments.length > 0) {
      
      // First pass: Fill the background for driving/on_duty for visual pop
      activeLog.duty_segments.forEach((seg) => {
        if (seg.status === 'driving' || seg.status === 'on_duty') {
          const row = STATUS_ROWS[seg.status];
          const x1 = leftMargin + (seg.start * (gridWidth / 24));
          const w = (seg.end - seg.start) * (gridWidth / 24);
          const y = gridTop + (row * rowHeight);
          
          ctx.fillStyle = STATUS_COLORS[seg.status] + '33'; // 20% opacity
          ctx.fillRect(x1, y, w, rowHeight);
        }
      });
      
      // Second pass: Draw the thick continuous line
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      
      let lastX = null;
      let lastY = null;
      
      activeLog.duty_segments.forEach((seg, index) => {
        const row = STATUS_ROWS[seg.status];
        const x1 = leftMargin + (seg.start * (gridWidth / 24));
        const x2 = leftMargin + (seg.end * (gridWidth / 24));
        const y = gridTop + (row * rowHeight) + (rowHeight / 2);
        
        ctx.strokeStyle = STATUS_COLORS[seg.status];
        
        ctx.beginPath();
        
        // Draw vertical drop line from previous status if not the first segment
        if (index > 0 && lastX !== null && lastY !== null) {
          ctx.moveTo(lastX, lastY);
          ctx.lineTo(x1, y);
        } else {
          ctx.moveTo(x1, y);
        }
        
        // Draw horizontal status line
        ctx.lineTo(x2, y);
        ctx.stroke();
        
        lastX = x2;
        lastY = y;
      });
    }

  }, [activeLog, theme]); // Added theme dependency to redraw canvas on toggle

  if (!logs || logs.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Day Tabs */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
        {logs.map(log => (
          <button
            key={log.day_number}
            onClick={() => setActiveDay(log.day_number)}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              border: 'none',
              backgroundColor: activeDay === log.day_number ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
              color: activeDay === log.day_number ? 'white' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontWeight: activeDay === log.day_number ? '600' : '400',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s'
            }}
          >
            Day {log.day_number} ({log.date})
          </button>
        ))}
      </div>

      {activeLog && (
        <>
          {/* Header Info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', padding: '16px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '8px' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>From</div>
              <div style={{ fontWeight: '500' }}>{activeLog.from_location}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>To</div>
              <div style={{ fontWeight: '500' }}>{activeLog.to_location}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Total Miles Today</div>
              <div style={{ fontWeight: '500' }}>{activeLog.total_miles_today} mi</div>
            </div>
          </div>

          {/* Canvas Wrapper */}
          <div style={{ width: '100%', height: '300px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)' }}>
            <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
          </div>
          
          {/* Totals & Remarks */}
          <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '24px' }}>
            <div style={{ padding: '16px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '8px' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Daily Totals (24 hrs)</h4>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: STATUS_COLORS.off_duty }}>Off Duty:</span>
                <strong>{activeLog.off_duty_hours.toFixed(1)}h</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: STATUS_COLORS.sleeper }}>Sleeper:</span>
                <strong>{activeLog.sleeper_hours.toFixed(1)}h</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: STATUS_COLORS.driving }}>Driving:</span>
                <strong>{activeLog.driving_hours.toFixed(1)}h</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: STATUS_COLORS.on_duty }}>On Duty:</span>
                <strong>{activeLog.on_duty_hours.toFixed(1)}h</strong>
              </div>
            </div>
            
            <div style={{ padding: '16px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '8px' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Remarks / Locations</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '120px', overflowY: 'auto' }}>
                {activeLog.remarks.map((r, i) => {
                  const timeParts = r.time.toString().split('.');
                  const hrs = parseInt(timeParts[0]);
                  const mins = timeParts.length > 1 ? Math.round(parseFloat('0.' + timeParts[1]) * 60) : 0;
                  const timeStr = `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
                  
                  return (
                    <div key={i} style={{ fontSize: '0.85rem', display: 'flex', gap: '16px' }}>
                      <span style={{ color: 'var(--accent-primary)', minWidth: '45px' }}>{timeStr}</span>
                      <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>{r.location}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>- {r.note}</span>
                    </div>
                  );
                })}
                {activeLog.remarks.length === 0 && (
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No remarks for this day.</div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
