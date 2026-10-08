import { useState, useEffect } from 'react';
import { Activity, Sun, Moon, Map, User } from 'lucide-react';
import './index.css';

import TripForm from './components/TripForm';
import RouteMap from './components/RouteMap';
import TripSummary from './components/TripSummary';
import LogSheet from './components/LogSheet';

function App() {
  const [tripData, setTripData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('spotter-theme');
    if (saved) return saved;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // Apply data-theme immediately on mount/render before passive effects
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', theme);
  }

  useEffect(() => {
    localStorage.setItem('spotter-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => {
      const nextTheme = prev === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', nextTheme);
      return nextTheme;
    });
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
            <Activity size={20} strokeWidth={3} />
          </div>
          <h1>SPOTTER <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>ELD</span></h1>
        </div>
        
        <div className="header-nav">
          <span className="nav-link active">Plan Trip</span>
          <span className="nav-link">Logs</span>
          <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border)', margin: '0 8px' }} />
          <button onClick={toggleTheme} className="theme-toggle" aria-label="Switch Theme">
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <div style={{ 
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            width: '36px', height: '36px', borderRadius: '50%', 
            backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)',
            cursor: 'pointer'
          }}>
            <User size={18} color="var(--text-secondary)" />
          </div>
        </div>
      </header>

      <main className="main-content">
        <div className="page-hero">
          <h2 className="page-title">Trip Planning & ELD</h2>
          <p className="page-subtitle">Calculate FMCSA compliant HOS logs, optimal routing, and fuel stops.</p>
        </div>

        {error && (
          <div style={{ backgroundColor: 'rgba(220, 38, 38, 0.1)', color: 'var(--accent-danger)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(220, 38, 38, 0.2)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ fontWeight: '600' }}>Routing Error:</div>
            <div>{error}</div>
          </div>
        )}

        <div className="top-row">
          <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ marginBottom: '24px', fontSize: '1.1rem', fontWeight: '700' }}>Route Parameters</h3>
            <TripForm onSubmit={handlePlanTrip} isLoading={isLoading} />
          </div>

          <div className="glass-card" style={{ overflow: 'hidden', minHeight: '550px', position: 'relative' }}>
            {isLoading && !tripData ? (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-primary)', zIndex: 10 }}>
                <div className="skeleton" style={{ width: '100%', height: '100%' }}></div>
              </div>
            ) : null}
            <RouteMap tripData={tripData} theme={theme} />
            
            {!tripData && !isLoading && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-secondary)', zIndex: 10, color: 'var(--text-muted)' }}>
                <Map size={48} strokeWidth={1} style={{ marginBottom: '16px', opacity: 0.5 }} />
                <p>Generate a trip to view the interactive map.</p>
              </div>
            )}
          </div>
        </div>

        {isLoading && tripData && (
          <div style={{ display: 'flex', gap: '24px', flexDirection: 'column', animation: 'pulse-subtle 2s infinite' }}>
            <div className="glass-card skeleton" style={{ height: '200px' }}></div>
            <div className="glass-card skeleton" style={{ height: '400px' }}></div>
          </div>
        )}

        {tripData && !isLoading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', animation: 'fadeUp 0.5s ease-out' }}>
            <div className="glass-card" style={{ padding: '32px' }}>
              <h3 style={{ marginBottom: '24px', fontSize: '1.25rem', fontWeight: '700' }}>Trip Summary</h3>
              <TripSummary tripData={tripData} />
            </div>

            <div className="glass-card" style={{ padding: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '700' }}>FMCSA ELD Logs</h3>
              </div>
              <LogSheet logs={tripData.daily_logs} theme={theme} />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
