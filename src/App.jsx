import { useEffect, useMemo, useState } from 'react';
import { evtolFleet } from './data/evtolData';
import LoginPage from './components/LoginPage';
import Sidebar from './components/Sidebar';
import TopHeader from './components/TopHeader';
import HomePage from './components/HomePage';
import TwinsPage from './components/TwinsPage';
import DetailsPage, { AgenticGuardPage } from './components/DetailsPage';
import SettingsPage from './components/SettingsPage';
import useLocalStorageState from './hooks/useLocalStorageState';
import useSimulatedFleet from './hooks/useSimulatedFleet';
import { parseAgentResponseFile } from './utils/evtolUtils';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useLocalStorageState('aeronexus_auth', false);
  const [activePage, setActivePage] = useState('home');
  const [selectedId, setSelectedId] = useState('EVTOL-01');
  const [agentResponses, setAgentResponses] = useState({});

  const liveFleetData = useSimulatedFleet(evtolFleet);
  const currentAircraft = liveFleetData.find((item) => item.id === selectedId) || liveFleetData[0];

  const fleetStats = useMemo(() => {
    const totalHealth = liveFleetData.reduce((sum, item) => sum + item.health, 0);
    const activeWarnings = liveFleetData.filter((item) => item.status === 'Warning').length;
    const avgTemp = Math.round(liveFleetData.reduce((sum, item) => sum + item.temperature, 0) / Math.max(liveFleetData.length, 1));
    return {
      avgHealth: Math.round(totalHealth / Math.max(liveFleetData.length, 1)),
      activeWarnings,
      avgTemp,
    };
  }, [liveFleetData]);

  useEffect(() => {
    fetch('/agent-response.txt')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((text) => setAgentResponses(parseAgentResponseFile(text)))
      .catch((error) => {
        console.warn('Unable to load agent responses:', error);
      });
  }, []);

  if (!isLoggedIn) {
    return (
      <LoginPage
        onLogin={() => {
          setIsLoggedIn(true);
          setActivePage('home');
        }}
      />
    );
  }

  return (
    <div className="grok-theme min-h-screen bg-[#08090b] text-white">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,rgba(69,130,205,0.08),transparent_38%)]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-[1800px] gap-3 p-4">
        <Sidebar
          activePage={activePage}
          setActivePage={setActivePage}
          fleet={liveFleetData}
          selectedAircraft={currentAircraft}
          setSelectedAircraft={(aircraft) => setSelectedId(aircraft.id)}
        />
        <main className="min-w-0 flex-1">
          <TopHeader
            activePage={activePage}
            selectedAircraft={currentAircraft}
            fleetStats={fleetStats}
            onLogout={() => {
              setIsLoggedIn(false);
              setActivePage('home');
            }}
          />
          <div className="min-w-0 pb-12">
            {activePage === 'home' && (
              <HomePage
                fleet={liveFleetData}
                selectedAircraft={currentAircraft}
                setSelectedAircraft={(aircraft) => setSelectedId(aircraft.id)}
                setActivePage={setActivePage}
              />
            )}
            {activePage === 'twins' && (
              <TwinsPage
                selectedAircraft={currentAircraft}
                fleet={liveFleetData}
                setSelectedAircraft={(aircraft) => setSelectedId(aircraft.id)}
              />
            )}
            {activePage === 'details' && <DetailsPage selectedAircraft={currentAircraft} agentResponses={agentResponses} />}
            {activePage === 'agentic-guard' && <AgenticGuardPage selectedAircraft={currentAircraft} agentResponses={agentResponses} />}
            {activePage === 'settings' && <SettingsPage />}
          </div>
        </main>
      </div>
    </div>
  );
}
