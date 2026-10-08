import { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, Clock, Loader2 } from 'lucide-react';

function LocationInput({ label, id, name, value, onChange, icon: Icon, iconColor, placeholder }) {
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!value || value.length < 3 || !isOpen) {
      setSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      setLoading(true);
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const res = await fetch(`${apiUrl}/api/autocomplete/?text=${encodeURIComponent(value)}`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data);
        }
      } catch (e) {
        console.error("Autocomplete failed", e);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(() => {
      fetchSuggestions();
    }, 300);

    return () => clearTimeout(debounce);
  }, [value, isOpen]);

  const handleSelect = (suggestion) => {
    onChange({ target: { name, value: suggestion } });
    setIsOpen(false);
  };

  return (
    <div className="form-group" ref={wrapperRef}>
      <label className="form-label" htmlFor={id}>{label}</label>
      <div style={{ position: 'relative' }}>
        <Icon size={18} color={iconColor} style={{ position: 'absolute', left: '14px', top: '13px' }} />
        <input 
          type="text" 
          id={id}
          name={name}
          className="form-input" 
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            onChange(e);
            setIsOpen(true);
          }}
          onFocus={() => value && value.length >= 3 && setIsOpen(true)}
          style={{ width: '100%', paddingLeft: '44px', height: '44px' }}
          required
          autoComplete="off"
        />
        
        {isOpen && (suggestions.length > 0 || loading) && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            marginTop: '8px',
            zIndex: 50,
            boxShadow: 'var(--shadow-lg)',
            maxHeight: '220px',
            overflowY: 'auto',
            padding: '4px'
          }}>
            {loading ? (
              <div style={{ padding: '12px 16px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Searching locations...</div>
            ) : (
              suggestions.map((s, idx) => (
                <div 
                  key={idx}
                  onClick={() => handleSelect(s)}
                  style={{
                    padding: '10px 12px',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--bg-tertiary)'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                >
                  <MapPin size={14} color="var(--text-muted)" />
                  {s}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function TripForm({ onSubmit, isLoading }) {
  const [formData, setFormData] = useState({
    current_location: '',
    pickup_location: '',
    dropoff_location: '',
    current_cycle_used: 0
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'current_cycle_used' ? parseFloat(value) || 0 : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      
      <LocationInput 
        label="Start Location"
        id="current_location"
        name="current_location"
        value={formData.current_location}
        onChange={handleChange}
        icon={Navigation}
        iconColor="var(--status-d)"
        placeholder="Where is the truck now?"
      />

      <LocationInput 
        label="Pickup Load"
        id="pickup_location"
        name="pickup_location"
        value={formData.pickup_location}
        onChange={handleChange}
        icon={MapPin}
        iconColor="var(--status-on)"
        placeholder="Where is the load picking up?"
      />

      <LocationInput 
        label="Dropoff Destination"
        id="dropoff_location"
        name="dropoff_location"
        value={formData.dropoff_location}
        onChange={handleChange}
        icon={MapPin}
        iconColor="var(--accent-primary)"
        placeholder="Final destination"
      />

      <div className="form-group" style={{ marginBottom: 'auto' }}>
        <label className="form-label" htmlFor="current_cycle_used">Cycle Hours Used (70hr/8day)</label>
        <div style={{ position: 'relative' }}>
          <Clock size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '13px' }} />
          <input 
            type="number" 
            step="0.1"
            min="0"
            max="70"
            id="current_cycle_used"
            name="current_cycle_used"
            className="form-input" 
            placeholder="0.0"
            value={formData.current_cycle_used}
            onChange={handleChange}
            style={{ width: '100%', paddingLeft: '44px', height: '44px' }}
            required
          />
        </div>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '6px', lineHeight: '1.4' }}>
          Hours currently consumed in your active DOT cycle before starting this trip.
        </span>
      </div>

      <button type="submit" className="btn-primary" disabled={isLoading} style={{ marginTop: '32px', height: '48px' }}>
        {isLoading ? (
          <>
            <Loader2 size={18} className="lucide-spin" style={{ animation: 'spin 1s linear infinite' }} />
            Routing & Calculating HOS...
          </>
        ) : (
          'Generate Trip Plan & Logs'
        )}
      </button>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </form>
  );
}
