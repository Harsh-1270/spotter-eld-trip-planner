import { useState } from 'react'
import { Truck } from 'lucide-react'
import './index.css'

import TripForm from './components/TripForm'
import RouteMap from './components/RouteMap'
import TripSummary from './components/TripSummary'
import LogSheet from './components/LogSheet'

function App() {
  const [tripData, setTripData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handlePlanTrip = async (formData) => {
    setIsLoading(true);
    setError(null);
    try {
      // API call to our Django backend
      const response = await fetch('http://localhost:8000/api/plan-trip/', {
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
        <Truck color="#4F8CFF" size={28} />
        <h1>Spotter ELD Trip Planner</h1>
      </header>

      <main className="main-content">
        
        {error && (
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', padding: '16px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        <div className="top-row">
          <div className="glass-card" style={{ padding: '24px' }}>
            <h2 style={{ marginBottom: '20px', fontSize: '1.1rem' }}>Trip Planning Details</h2>
            <TripForm onSubmit={handlePlanTrip} isLoading={isLoading} />
          </div>

          <div className="glass-card" style={{ overflow: 'hidden' }}>
            <RouteMap tripData={tripData} />
          </div>
        </div>

        {tripData && (
          <>
            <div className="glass-card" style={{ padding: '24px' }}>
              <h2 style={{ marginBottom: '20px', fontSize: '1.1rem' }}>Trip Summary & Itinerary</h2>
              <TripSummary tripData={tripData} />
            </div>

            <div className="glass-card" style={{ padding: '24px' }}>
              <h2 style={{ marginBottom: '20px', fontSize: '1.1rem' }}>ELD Daily Logs</h2>
              <LogSheet logs={tripData.daily_logs} />
            </div>
          </>
        )}
      </main>
    </div>
  )
}

export default App
