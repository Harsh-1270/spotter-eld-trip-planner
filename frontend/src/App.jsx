import { useState, useEffect } from 'react'
import { Activity, Sun, Moon } from 'lucide-react'
import './index.css'

import TripForm from './components/TripForm'
import RouteMap from './components/RouteMap'
import TripSummary from './components/TripSummary'
import LogSheet from './components/LogSheet'

function App() {
  const [tripData, setTripData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [theme, setTheme] = useState('dark');

  // Apply theme to document element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handlePlanTrip = async (formData) => {
    setIsLoading(true);
    setError(null);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/plan-trip/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to calculate trip');
      }

      const data = await response.json();
      setTripData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="brand">
          <div className="brand-icon-wrapper">
            <Activity color="var(--accent-primary)" size={24} strokeWidth={2.5} />
          </div>
          <h1 style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: '800', letterSpacing: '-0.02em', fontSize: '1.3rem' }}>
            SPOTTER <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>ELD</span>
          </h1>
        </div>
        
        <button onClick={toggleTheme} className="theme-toggle" aria-label="Toggle Theme">
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>
      </header>

      <main className="main-content">
        
        {error && (
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', padding: '16px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        <div className="top-row">
          <div className="glass-card" style={{ padding: '32px', display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ marginBottom: '24px', fontSize: '1.2rem', fontWeight: '600' }}>Plan Your Route</h2>
            <TripForm onSubmit={handlePlanTrip} isLoading={isLoading} />
          </div>

          <div className="glass-card" style={{ overflow: 'hidden', minHeight: '550px' }}>
            <RouteMap tripData={tripData} theme={theme} />
          </div>
        </div>

        {tripData && (
          <>
            <div className="glass-card" style={{ padding: '32px' }}>
              <h2 style={{ marginBottom: '24px', fontSize: '1.2rem', fontWeight: '600' }}>Trip Summary & Itinerary</h2>
              <TripSummary tripData={tripData} />
            </div>

            <div className="glass-card" style={{ padding: '32px' }}>
              <h2 style={{ marginBottom: '24px', fontSize: '1.2rem', fontWeight: '600' }}>ELD Daily Logs</h2>
              <LogSheet logs={tripData.daily_logs} theme={theme} />
            </div>
          </>
        )}
      </main>
    </div>
  )
}

export default App
