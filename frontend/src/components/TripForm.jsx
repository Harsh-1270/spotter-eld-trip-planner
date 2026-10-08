import { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, Clock, Loader2 } from 'lucide-react';

function LocationInput({ label, id, name, value, onChange, icon: Icon, iconColor, placeholder }) {
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch suggestions
  useEffect(() => {
    if (!value || value.length < 3 || !isOpen) {
      setSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      setLoading(true);
      try {
        const res = await fetch(`http://localhost:8000/api/autocomplete/?text=${encodeURIComponent(value)}`);
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
    }, 300); // 300ms delay to prevent too many API calls

    return () => clearTimeout(debounce);
  }, [value, isOpen]);

  const handleSelect = (suggestion) => {
    // Manually trigger onChange like a normal input event
    onChange({ target: { name, value: suggestion } });
    setIsOpen(false);
  };

  return (
    <div className="form-group" ref={wrapperRef}>
      <label className="form-label" htmlFor={id}>{label}</label>
      <div style={{ position: 'relative' }}>
        <Icon size={18} color={iconColor} style={{ position: 'absolute', left: '12px', top: '10px' }} />
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
          style={{ width: '100%', paddingLeft: '40px' }}
          required
          autoComplete="off"
        />
        
        {/* Dropdown Menu */}
        {isOpen && (suggestions.length > 0 || loading) && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: 'var(--bg-tertiary)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            marginTop: '4px',
            zIndex: 10,
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            maxHeight: '200px',
            overflowY: 'auto'
          }}>
            {loading ? (
              <div style={{ padding: '12px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Loading...</div>
            ) : (
              suggestions.map((s, idx) => (
                <div 
                  key={idx}
                  onClick={() => handleSelect(s)}
                  style={{
                    padding: '10px 12px',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    borderBottom: idx < suggestions.length - 1 ? '1px solid var(--border)' : 'none',
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--bg-secondary)'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                >
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
        label="Current Location"
        id="current_location"
        name="current_location"
        value={formData.current_location}
        onChange={handleChange}
        icon={Navigation}
        iconColor="var(--accent-primary)"
        placeholder="e.g. San Francisco, CA"
      />

      <LocationInput 
        label="Pickup Location"
        id="pickup_location"
        name="pickup_location"
        value={formData.pickup_location}
        onChange={handleChange}
        icon={MapPin}
        iconColor="var(--accent-warning)"
        placeholder="e.g. Los Angeles, CA"
      />

      <LocationInput 
        label="Dropoff Location"
        id="dropoff_location"
        name="dropoff_location"
        value={formData.dropoff_location}
        onChange={handleChange}
        icon={MapPin}
        iconColor="var(--accent-danger)"
        placeholder="e.g. New York, NY"
      />

      <div className="form-group" style={{ marginBottom: 'auto' }}>
        <label className="form-label" htmlFor="current_cycle_used">Current Cycle Used (Hours)</label>
        <div style={{ position: 'relative' }}>
          <Clock size={18} color="var(--text-secondary)" style={{ position: 'absolute', left: '12px', top: '10px' }} />
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
            style={{ width: '100%', paddingLeft: '40px' }}
            required
          />
        </div>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Hours already consumed in your 70-hour/8-day cycle.
        </span>
      </div>

      <button type="submit" className="btn-primary" disabled={isLoading} style={{ marginTop: '24px' }}>
        {isLoading ? (
          <>
            <Loader2 size={18} className="lucide-spin" style={{ animation: 'spin 2s linear infinite' }} />
            Calculating Route...
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
