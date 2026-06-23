
import React, { useEffect, Suspense, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, Environment, OrbitControls, useGLTF, Float, Bounds, Center, useAnimations } from '@react-three/drei';
import { Activity, AlertTriangle, CheckCircle2, ChevronRight, Cpu, Home, Plane, Radar, Settings, Thermometer, Wrench } from 'lucide-react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, AreaChart, Area } from 'recharts';
import { evtolFleet, settingsSections } from './data/evtolData';

const APP_START_TIME = Date.now();
const USE_REAL_MODEL = true;
const FORCE_DESKTOP = true;

const navItems = [
  { key: 'home', label: 'Home', icon: Home },
  { key: 'details', label: 'Asset Diagnostics', icon: Plane },
  { key: 'twins', label: 'Spatial Synchronization', icon: Cpu },
  { key: 'settings', label: 'System Configuration', icon: Settings },
];


function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const handleSubmit = (e) => { e.preventDefault(); onLogin(); };
  return (
    <div className="min-h-screen bg-[#030914] text-white">
      <div className="fixed inset-0 opacity-50 pointer-events-none" style={{ background:'radial-gradient(circle at 12% 18%, rgba(0,240,255,.08), transparent 22%), radial-gradient(circle at 80% 14%, rgba(55,242,155,.06), transparent 20%), linear-gradient(180deg, #03101e 0%, #030914 100%)' }} />
      <div className="relative flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl border border-cyan-500/20 bg-[#07111f]/90 p-8 backdrop-blur-xl shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
          <div className="mb-6">
            <div className="text-[10px] uppercase tracking-[0.38em] text-cyan-400/80">Ascendo Nexus OS</div>
            <h1 className="mt-2 text-3xl font-semibold text-white">Nexus OS Workspace</h1>
            <p className="mt-2 text-sm leading-6 text-slate-400">Please sign in to access the home dashboard.</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><label className="mb-2 block text-sm text-slate-300">Username</label><input value={username} onChange={(e) => setUsername(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none focus:border-cyan-400/50" placeholder="Enter username" /></div>
            <div><label className="mb-2 block text-sm text-slate-300">Password</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none focus:border-cyan-400/50" placeholder="Enter password" /></div>
            <button type="submit" className="w-full rounded-2xl bg-cyan-500 px-4 py-3 font-medium text-slate-950 transition-colors hover:bg-cyan-400">Login</button>
          </form>
        </div>
      </div>
    </div>
  );
}



function useSimulatedFleet(fleet) {
  const [liveFleet, setLiveFleet] = useState(fleet);
  useEffect(() => {
    setLiveFleet(fleet);
    const interval = setInterval(() => {
      setLiveFleet(prev => (prev || []).map(aircraft => {
        const jitter = (val, maxVariation) => typeof val !== 'number' ? val : Number((val + (Math.random() - 0.5) * maxVariation).toFixed(1));

        const newTemp = jitter(aircraft.temperature, 0.6);
        const newVib = jitter(aircraft.vibration, 2);
        const newRpm = jitter(aircraft.motorRpm, 150);

        let newTrends = aircraft.pdm?.trends ? [...aircraft.pdm.trends] : [];
        if (true) {
           const now = new Date();
           const timeStr = `${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`;
           newTrends.push({ t: timeStr, temp: newTemp, vib: newVib, rpm: newRpm });
           if (newTrends.length > 15) newTrends.shift();
        }

        return {
          ...aircraft,
          health: jitter(aircraft.health, 0.4),
          temperature: newTemp,
          motorRpm: newRpm,
          vibration: newVib,
          voltage: jitter(aircraft.voltage, 1.5),
          altitude: jitter(aircraft.altitude, 10),
          speed: jitter(aircraft.speed, 5),
          range: jitter(aircraft.range, 0.5),
          pdm: {
             ...(aircraft.pdm || {}),
             rul: jitter(aircraft.pdm?.rul || 0, 0.2),
             trends: newTrends.length > 0 ? newTrends : aircraft.pdm?.trends
          }
        };
      }));
    }, 1500);
    return () => clearInterval(interval);
  }, [fleet]);
  return liveFleet;
}

function cn(...classes) { return classes.filter(Boolean).join(' '); }

function getStatusTone(status) {
  if (status === 'Warning') return { chip: 'bg-red-500/15 text-red-300 border border-red-500/30', glow: '#ff4d6d' };
  if (status === 'Monitoring') return { chip: 'bg-amber-400/15 text-amber-200 border border-amber-400/30', glow: '#ffd166' };
  return { chip: 'bg-emerald-400/15 text-emerald-200 border border-emerald-400/30', glow: '#37f29b' };
}

function normalizeEvtolId(label) {
  const match = label.trim().toUpperCase().match(/^EVTOL-(\d+)$/);
  if (!match) return label.trim().toUpperCase();
  return `EVTOL-${match[1].padStart(2, '0')}`;
}

function parseAnalysisItem(item = '') {
  const trimmed = item.trim();
  const withoutEmoji = trimmed.replace(/^[\u2705\u2714\u2716\u2717\u2718\u274C\u274E\u26A0\u26A0\uFE0F!x×✕✖]+\s*/i, '');
  let level = 'neutral';
  if (/^[✅✔]/.test(trimmed)) level = 'success';
  else if (/^[⚠!]/.test(trimmed)) level = 'warning';
  else if (/^[❌x×✕✖]/.test(trimmed)) level = 'danger';
  return { text: withoutEmoji, level };
}

function parseAgentResponseFile(rawText) {
  const responses = {};
  const normalizedText = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blockPattern = /^evtol-(\d+):\s*$([\s\S]*?)(?=^evtol-\d+:|\s*$)/gim;
  let match;

  while ((match = blockPattern.exec(normalizedText)) !== null) {
    const label = `EVTOL-${match[1].padStart(2, '0')}`;
    const jsonText = match[2].trim().replace(/,\s*(?=[}\]])/g, '');
    if (!jsonText) continue;
    try {
      responses[label] = JSON.parse(jsonText);
    } catch (error) {
      console.warn('Failed to parse agent response block for', label, error.message);
    }
  }

  return responses;
}

function Sidebar({ activePage, setActivePage }) {
  return (
    <aside className="w-[220px] shrink-0 rounded-3xl border border-cyan-500/20 bg-[#07111f]/90 p-2.5 backdrop-blur-xl self-start sticky top-2.5">
      <div className="mb-3 px-1">
        <div className="text-[10px] uppercase tracking-[0.38em] text-cyan-400/80">Ascendo Nexus OS</div>
        <div className="mt-2 text-lg font-semibold tracking-wide text-white">Nexus OS Workspace</div>
      </div>
      <nav className="space-y-2">
        {navItems.map(({ key, label, icon: Icon }) => {
          const active = activePage === key;
          return (
            <button key={key} onClick={() => setActivePage(key)} className={cn('flex w-full items-center gap-2 rounded-2xl border px-4 py-3 text-left transition-colors', active ? 'border-cyan-400/50 bg-cyan-400/10 text-cyan-300' : 'border-white/10 bg-white/[0.02] text-slate-300 hover:border-cyan-500/30 hover:bg-cyan-500/5')}>
              <Icon size={17} />
              <span className="text-sm font-medium">{label}</span>
            </button>
          );
        })}
      </nav>
      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-2.5">
        <div className="flex items-center gap-2 text-sm text-emerald-300"><div className="h-2 w-2 rounded-full bg-emerald-400" />NETWORK NOMINAL</div>
        <div className="mt-2 text-xs leading-6 text-slate-400">Federated Intelligence & Predictive Health Platform.</div>
      </div>
    </aside>
  );
}

function TopHeader({ activePage, selectedAircraft, fleetStats, onLogout }) {
  const titles = { home: 'Fleet Health Overview', twins: 'Spatial Synchronization', details: 'Asset Diagnostics', settings: 'System Configuration' };
  return (
    <header className="mb-3 flex items-center justify-between gap-2 rounded-3xl border border-cyan-500/20 bg-[#07111f]/85 px-6 py-4 backdrop-blur-xl">
      <div>
        <div className="text-[10px] uppercase tracking-[0.38em] text-cyan-400/80">Active Sync Environment</div>
        <h1 className="mt-1 text-2xl font-bold tracking-wide text-white">{titles[activePage]}</h1>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 border-r border-white/10 pr-6">
          <div className="flex flex-col text-right">
             <div className="text-[10px] uppercase tracking-[0.28em] text-cyan-300/70">Fleet Assets</div>
             <div className="font-mono text-lg font-bold text-cyan-300">4</div>
          </div>
          <div className="h-6 w-px bg-white/10"></div>
          <div className="flex flex-col">
             <div className="text-[10px] uppercase tracking-[0.28em] text-red-300/70">Warnings</div>
             <div className="font-mono text-lg font-bold text-red-300">{fleetStats.activeWarnings}</div>
          </div>
        </div>

        <div className="flex flex-col text-right">
          <div className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Active Trajectories</div>
          <div className="mt-1 font-mono text-sm text-cyan-300">{selectedAircraft.id}</div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex h-10 items-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 text-sm font-medium text-emerald-300">
            AI Monitoring Enabled
          </div>
          <button onClick={onLogout} className="flex h-10 items-center rounded-2xl border border-red-500/30 bg-red-500/10 px-4 text-sm font-medium text-red-200 transition-colors hover:bg-red-500/15">
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}

function RealEvtolModel({ aircraft }) {
  const group = React.useRef();
  const { scene, animations } = useGLTF('/evtol.glb');
  const { actions } = useAnimations(animations, group);

  useEffect(() => {
    // 播放所有內建動畫（例如旋翼轉動）
    if (actions) {
      Object.values(actions).forEach(action => {
        if (action) action.play();
      });
    }
  }, [actions]);

  return (
    <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.4}>
      <Bounds fit clip margin={1.2}>
        <Center>
          <primitive ref={group} object={scene} />
        </Center>
      </Bounds>
    </Float>
  );
}

function RotorBlur({ position }) {
  const rotorRef = useRef();
  useFrame((state) => { if (rotorRef.current) rotorRef.current.rotation.y = state.clock.elapsedTime * 18; });
  return <group position={position}>
    <mesh><cylinderGeometry args={[0.3, 0.3, 0.2, 16]} /><meshStandardMaterial color="#37f29b" /></mesh>
    <mesh ref={rotorRef} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.14, 0]}><cylinderGeometry args={[0.62, 0.62, 0.02, 40]} /><meshBasicMaterial color="#d9fbff" transparent opacity={0.18} depthWrite={false} /></mesh>
    <mesh rotation={[Math.PI / 2, 0, Math.PI / 4]} position={[0, 0.145, 0]}><boxGeometry args={[1.1, 0.03, 0.08]} /><meshBasicMaterial color="#e7fdff" transparent opacity={0.12} /></mesh>
  </group>;
}


function AircraftModel({ aircraft }) {
  const craftRef = useRef();
  useFrame((state) => {
    if (!craftRef.current) return;
    const t = state.clock.elapsedTime;
    craftRef.current.position.y = 0.5 + Math.sin(t * 1.2) * 0.12;
    craftRef.current.rotation.z = Math.sin(t * 0.8) * 0.03;
    craftRef.current.rotation.x = Math.cos(t * 0.6) * 0.015;
  });
  if (USE_REAL_MODEL) {
    return <group ref={craftRef}><Suspense fallback={<mesh><boxGeometry args={[1,1,1]} /><meshStandardMaterial color="gray" wireframe /></mesh>}><RealEvtolModel aircraft={aircraft} /></Suspense></group>;
  }
  const color = aircraft.status === 'Warning' ? '#ff4d6d' : (aircraft.status === 'Monitoring' ? '#fcd34d' : '#cbd5e1');
  return <group ref={craftRef} position={[0,0.5,0]}>
    <mesh position={[0, 0, 0]}><boxGeometry args={[3, 0.8, 1.5]} /><meshStandardMaterial color={color} roughness={0.3} metalness={0.8} /></mesh>
    <RotorBlur position={[1, 0.5, 0.8]} />
    <RotorBlur position={[1, 0.5, -0.8]} />
    <RotorBlur position={[-1, 0.5, 0.8]} />
    <RotorBlur position={[-1, 0.5, -0.8]} />
    <mesh position={[0, 0.5, 0]}><boxGeometry args={[0.6, 0.6, 0.6]} /><meshStandardMaterial color="#00f0ff" emissive="#00f0ff" emissiveIntensity={0.5} wireframe /></mesh>
  </group>;
}


function DigitalTwinViewer({ aircraft, title='Live Asset Replication' }) {
  const tone = getStatusTone(aircraft.status);
  return <section className="relative flex min-h-[360px] flex-col overflow-hidden rounded-3xl border border-cyan-500/20 bg-[#07111f]/90">
    <div className="absolute left-3 top-2.5 z-10 rounded-xl border border-cyan-500/30 bg-black/40 px-2 py-1 text-[10px] font-mono uppercase tracking-[0.2em] text-cyan-300">{title}</div>
    <div className="absolute right-3 top-2.5 z-10 rounded-xl border border-white/10 bg-black/40 px-2 py-1 text-[10px] text-slate-300">{aircraft.id} · {aircraft.model}</div>
    <div className="absolute bottom-3 left-3 z-10 flex flex-wrap gap-2">
      {Object.entries(aircraft.componentHealth || {}).slice(0,2).map(([key, value]) => <div key={key} className="rounded-xl border border-white/10 bg-black/35 px-2 py-1 text-[10px] text-slate-300"><div className="uppercase tracking-[0.18em] text-slate-500">{key}</div><div className={cn('mt-1 font-mono', value < 85 ? 'text-red-400' : 'text-emerald-300')}>{value}%</div></div>)}
    </div>
    <div className="h-full w-full min-h-[360px]">
      <Canvas camera={{ position:[5,4.2,5], fov:42 }} dpr={[1, 1.5]}>
        <ambientLight intensity={0.85} />
        <directionalLight position={[10,12,8]} intensity={1.8} color="#fff7e8" />
        <directionalLight position={[-6,4,-8]} intensity={0.45} color="#9ad8ff" />
        <pointLight position={[0,3,0]} intensity={0.6} color={tone.glow} />
        <Environment files="/skybox.exr" background blur={0.05} />
        <AircraftModel aircraft={aircraft} />
        <OrbitControls autoRotate autoRotateSpeed={aircraft.status === 'Warning' ? 1.6 : 0.55} />
        <ContactShadows position={[0,-1.2,0]} scale={15} blur={2.6} opacity={0.15} resolution={256} frames={1} />
      </Canvas>
    </div>
  </section>;
}


function FleetCard({ aircraft, selected, onClick }) {
  const tone = getStatusTone(aircraft.status);
  return <button onClick={onClick} className={cn('group flex h-full min-h-[200px] flex-col rounded-3xl border p-2.5 text-left transition-colors', selected ? 'border-cyan-400/50 bg-cyan-400/10' : 'border-white/10 bg-[#08111d]/85 hover:border-cyan-500/30 hover:bg-cyan-500/5')}>
    <div className="flex items-start justify-between gap-2"><div className="min-w-0"><div className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Aircraft</div><div className="mt-1 text-[clamp(1rem,1.4vw,1.5rem)] font-bold text-white tracking-tight truncate">{aircraft.displayName}</div><div className="mt-1  text-xs text-slate-400">{aircraft.id} · {aircraft.model}</div></div><div className={cn('shrink-0 rounded-full px-2 py-1 text-[10px] font-medium', tone.chip)}>{aircraft.status}</div></div>
    <div className="mt-4 grid grid-cols-2 gap-2"><MetricPill label="Health" value={`${aircraft.health}%`} tone={aircraft.health < 90 ? 'danger' : 'ok'} /><MetricPill label="SoC" value={`${aircraft.soc}%`} /><MetricPill label="Temp" value={`${aircraft.temperature}°C`} tone={aircraft.temperature >= 65 ? 'danger' : 'warn'} /><MetricPill label="RUL" value={`${aircraft.rul} days`} tone={aircraft.rul < 60 ? 'danger' : 'ok'} /></div>
    <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-2.5"><div className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Mission</div><div className="mt-1 text-sm font-medium text-slate-200">{aircraft.mission}</div><div className="mt-1 text-xs text-slate-400">{aircraft.role}</div></div>
    <div className="mt-auto flex items-center justify-between pt-3 text-xs"><span className="text-slate-400">Access Asset Telemetry</span><span className="flex items-center gap-1 text-cyan-300">Diagnose <ChevronRight size={14} /></span></div>
  </button>;
}

function MetricPill({ label, value, tone='default' }) {
  const styles = { default: 'border-white/10 bg-white/[0.03] text-slate-200', ok: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200', warn: 'border-amber-400/20 bg-amber-400/10 text-amber-200', danger: 'border-red-500/20 bg-red-500/10 text-red-200' };
  return <div className={cn('rounded-2xl border p-2', styles[tone])}><div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">{label}</div><div className="mt-1 text-base font-mono">{value}</div></div>;
}

function HomePage({ fleet, selectedAircraft, setSelectedAircraft, setActivePage }) { 
  return (
    <section className="grid grid-cols-4 gap-2">
      {fleet.map(aircraft => (
        <FleetCard 
          key={aircraft.id} 
          aircraft={aircraft} 
          selected={selectedAircraft.id===aircraft.id} 
          onClick={() => { 
            setSelectedAircraft(aircraft); 
            setActivePage('details');
          }} 
        />
      ))}
    </section>
  );
}

function AnimatedMap({ aircraft, showAll=false, fleet=[], onSelectAircraft, hideLabel=false }) {
  const [positions, setPositions] = useState({});

  useEffect(() => { 
    let frameId; 
    const animate = () => { 
      const elapsed = Date.now() - APP_START_TIME; 
      const newPositions = {};

      const fleetToAnimate = showAll && fleet.length ? fleet : [aircraft];

      fleetToAnimate.forEach((item, index) => {
        if (!item.route || !item.route.length) return;
        // give each aircraft a slightly different duration so they don't look completely synchronized
        const duration = 18000 + (index * 4000); 
        const rawProgress = elapsed / duration; 
        let progress = rawProgress % 1; 
        if (Math.floor(rawProgress) % 2 === 1) progress = 1 - progress; 

        const points = item.route; 
        const segments = points.length - 1; 
        if (segments < 1) {
            newPositions[item.id] = points[0];
            return;
        }

        const currentSegment = Math.min(Math.floor(progress * segments), segments - 1); 
        const localProgress = progress * segments - currentSegment; 
        const a = points[currentSegment]; 
        const b = points[currentSegment + 1]; 
        newPositions[item.id] = { x: a.x + (b.x - a.x) * localProgress, y: a.y + (b.y - a.y) * localProgress }; 
      });

      setPositions(newPositions);
      frameId = requestAnimationFrame(animate); 
    }; 
    frameId = requestAnimationFrame(animate); 
    return () => cancelAnimationFrame(frameId); 
  }, [aircraft, showAll, fleet]);
  const leafletMapRef = useRef(null);
  const leafletInstanceRef = useRef(null);

  useEffect(() => {
    // Initialize Leaflet map once the script has loaded
    if (!leafletMapRef.current || typeof window === 'undefined') return;
    const L = window.L;
    if (!L) return; // Leaflet not loaded yet (CDN script deferred)
    if (leafletInstanceRef.current) return;

    try {
      // Center map on Victoria Harbour (lat, lon)
      leafletInstanceRef.current = L.map(leafletMapRef.current, { attributionControl: false, zoomControl: true, scrollWheelZoom: false }).setView([22.293, 114.174], 14);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 20, attribution: '&copy; OpenStreetMap contributors &copy; CARTO' }).addTo(leafletInstanceRef.current);
    } catch (e) {
      console.warn('Leaflet init failed', e);
    }

    return () => {
      if (leafletInstanceRef.current) {
        try { leafletInstanceRef.current.remove(); } catch (e) {}
        leafletInstanceRef.current = null;
      }
    };
  }, [leafletMapRef]);
  return (
    <div className="relative h-full min-h-[360px] overflow-hidden rounded-3xl border border-cyan-500/20">
      {/* Leaflet map container (demo only) */}
      <div ref={leafletMapRef} className="absolute inset-0 z-0" />
      <div className="absolute inset-0 bg-[#06101b]/40 pointer-events-none" />
      {!hideLabel && (
        <div className="absolute left-3 top-2.5 z-20 rounded-xl border border-emerald-500/30 bg-black/40 px-2 py-1 text-[10px] font-mono uppercase tracking-[0.2em] text-emerald-300">Airspace Trajectory Map</div>
      )}

      {/* SVG overlay for demo routes (coordinates are visual-only) */}
      <div className="absolute inset-0 z-10 pointer-events-auto">
        <svg className="h-full w-full" viewBox="0 0 400 320" preserveAspectRatio="none">
          <defs>
            <linearGradient id="routeStroke" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#00f0ff" /><stop offset="100%" stopColor="#37f29b" /></linearGradient>
          </defs>
          {(showAll ? fleet : [aircraft]).map(item => {
            const active = item.id === aircraft.id;
            const startPoint = item.route?.[0] || { x: 0, y: 0 };
            const endPoint = item.route?.[item.route.length - 1] || { x: 0, y: 0 };
            return (
              <g key={`${item.id}-path`}>
                <path
                  d={`M ${(item.route || []).map(p => `${p.x} ${p.y}`).join(' L ')}`}
                  fill="none"
                  stroke={active ? (showAll ? '#00f0ff' : 'url(#routeStroke)') : 'rgba(255,255,255,.22)'}
                  strokeWidth={active ? 2.4 : 1.1}
                  strokeDasharray="5 6"
                  opacity="0.9"
                />
                <circle cx={startPoint.x} cy={startPoint.y} r={active ? "4.5" : "3.5"} fill={active ? '#00f0ff' : '#7a8aa0'} />
                <circle cx={endPoint.x} cy={endPoint.y} r={active ? "4.5" : "3.5"} fill={active ? '#37f29b' : '#7a8aa0'} />
              </g>
            );
          })}
          {(showAll ? fleet : [aircraft]).map(item => {
            const currentPos = positions[item.id] || item.route?.[0] || { x: 0, y: 0 };
            const active = item.id === aircraft.id;
            return (
              <g key={`${item.id}-marker`} transform={`translate(${currentPos.x}, ${currentPos.y})`} style={{ cursor: onSelectAircraft ? 'pointer' : 'default' }} onClick={() => onSelectAircraft && onSelectAircraft(item)}>
                <circle cx="0" cy="0" r={active ? 6 : 4.5} fill={item.status === 'Warning' ? '#ff4d6d' : (active ? '#37f29b' : '#94a3b8')} />
                <circle cx="0" cy="0" r={active ? 15 : 9} fill="none" stroke={item.status === 'Warning' ? '#ff4d6d' : (active ? '#37f29b' : '#64748b')} strokeWidth="1.5" opacity="0.7">
                  {item.status === 'Warning' && <animate attributeName="r" values="9; 18; 9" dur="1.5s" repeatCount="indefinite" />}
                  {item.status === 'Warning' && <animate attributeName="opacity" values="0.8; 0; 0.8" dur="1.5s" repeatCount="indefinite" />}
                </circle>
                <text x="10" y="-8" fill={item.status === 'Warning' ? '#ff4d6d' : (active ? '#37f29b' : '#cbd5e1')} fontSize="9" fontFamily="monospace">{item.id}</text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function TwinsPage({ selectedAircraft, fleet, setSelectedAircraft }) {
  if (!selectedAircraft) return null;
  
  
  return <section className="grid grid-cols-[1.12fr_0.88fr] gap-2">
    <DigitalTwinViewer aircraft={selectedAircraft} title="Live Asset Replication" />
    <div className="grid min-w-0 gap-2">
      <AnimatedMap aircraft={selectedAircraft} showAll fleet={fleet} onSelectAircraft={setSelectedAircraft} />
      <div className="grid grid-cols-2 gap-2">
        {fleet.map(item => { const tone = getStatusTone(item.status); const isSelected = item.id === selectedAircraft.id; return <button key={item.id} onClick={() => setSelectedAircraft(item)} className={cn('rounded-3xl border p-2.5 text-left transition-colors', isSelected ? 'border-cyan-400/50 bg-cyan-400/10' : 'border-white/10 bg-[#07111f]/90 hover:border-cyan-500/30 hover:bg-cyan-500/5')}><div className="flex items-center justify-between gap-2"><div className="min-w-0  font-mono text-sm text-white">{item.id}</div><div className={cn('rounded-full px-2 py-1 text-[10px]', tone.chip)}>{item.status}</div></div><div className="mt-2  text-xs text-slate-400">{item.locationLabel}</div><div className="mt-3 grid grid-cols-2 gap-2 text-[10px]"><div className="rounded-xl bg-white/[0.03] p-2 text-slate-300">ALT<div className="mt-1 font-mono text-cyan-300">{Math.round(item.altitude)} m</div></div><div className="rounded-xl bg-white/[0.03] p-2 text-slate-300">SPD<div className="mt-1 font-mono text-cyan-300">{Math.round(item.speed)} km/h</div></div></div></button>; })}
      </div>
    </div>
  </section>;
}

function DetailMetric({ label, value, accent='text-cyan-300' }) { return <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-2.5"><div className="text-[10px] uppercase tracking-[0.25em] text-slate-500">{label}</div><div className={cn('mt-1 text-base font-mono', accent)}>{value}</div></div>; }
function PdMTrendChart({ data, dataKey, color, title }) { return <div className="rounded-3xl border border-white/10 bg-[#07111f]/85 p-2.5"><div className="mb-2 text-sm font-medium text-slate-300">{title}</div><div className="h-40"><ResponsiveContainer width="100%" height="100%"><LineChart data={data}><XAxis dataKey="t" tick={{ fill:'#64748b', fontSize:10 }} axisLine={false} tickLine={false} /><YAxis hide /><Tooltip contentStyle={{ backgroundColor:'#050b14', border:'1px solid rgba(0,240,255,.15)', borderRadius:'12px', color:'#e2f7ff' }} /><Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2.3} dot={false} /></LineChart></ResponsiveContainer></div></div>; }
function PdMAreaChart({ data }) { return <div className="rounded-3xl border border-white/10 bg-[#07111f]/85 p-2.5"><div className="mb-2 text-sm font-medium text-slate-300">Degradation Vector Analysis</div><div className="h-40"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data}><XAxis dataKey="t" tick={{ fill:'#64748b', fontSize:10 }} axisLine={false} tickLine={false} /><YAxis hide /><Tooltip contentStyle={{ backgroundColor:'#050b14', border:'1px solid rgba(255,77,109,.18)', borderRadius:'12px' }} /><Area type="monotone" dataKey="temp" stroke="#ff4d6d" fill="#ff4d6d22" strokeWidth={2} /></AreaChart></ResponsiveContainer></div></div>; }

function ComponentsDataPanel({ aircraft, agentResponse: agentResponseProp }) {
  // 根據主機體數據產生各零件的模擬跳動數據
  const rotors = Array.from({ length: 4 }).map((_, i) => {
    // 製造一點隨機差異讓它看起來像真實各部位獨立的感測器
    const rpmOffset = Math.sin(Date.now() / 1000 + i) * 15;
    const tempOffset = Math.cos(Date.now() / 2000 + i) * 2;
    const vibOffset = Math.sin(Date.now() / 500 + i) * 0.5;

    const vib = Number(aircraft.vibration || 0) + vibOffset;
    return {
      id: `Rotor 0${i + 1}`,
      rpm: Math.round((aircraft.motorRpm || 0) + rpmOffset),
      temp: ((aircraft.temperature || 0) + tempOffset).toFixed(1),
      vib: Math.max(0, vib).toFixed(1),
      status: vib > 40 ? 'Warning' : 'Nominal'
    };
  });

  const batteries = [
    { id: 'Battery Pack A', soc: (aircraft.soc || 0), voltage: (aircraft.voltage || 400).toFixed(1), temp: (aircraft.temperature || 0).toFixed(1), status: (aircraft.soc || 0) < 20 ? 'Warning' : 'Nominal' },
    { id: 'Battery Pack B', soc: Math.max(0, (aircraft.soc || 0) - 2), voltage: Math.max(0, (aircraft.voltage || 400) - 0.4).toFixed(1), temp: ((aircraft.temperature || 0) + 1.2).toFixed(1), status: (aircraft.soc || 0) < 22 ? 'Warning' : 'Nominal' }
  ];

  const cockpitVideoMap = {
    'EVTOL-01': '/videos/evtol-1.mp4',
    'EVTOL-02': '/videos/evtol-2.mp4',
    'EVTOL-03': '/videos/evtol-3.mp4',
    'EVTOL-04': '/videos/evtol-4.mp4',
  };
  const cockpitVideoSrc = cockpitVideoMap[aircraft.id] || '/videos/evtol-1.mp4';

  const agentResponse = agentResponseProp || {
    safety_risk_assessment: { risk_level: 'Unknown', primary_risk: 'No agent response loaded.' },
    detailed_analysis: { visual: {}, audio: {}, fusion: 'No fusion analysis available.' },
    possible_causes: [],
    recommended_actions: [],
  };

  const visualItems = Object.values(agentResponse.detailed_analysis.visual || {}).map(parseAnalysisItem);
  const audioItems = Object.values(agentResponse.detailed_analysis.audio || {}).map(parseAnalysisItem);

  return (
    <div className="flex flex-col rounded-3xl border border-cyan-500/20 bg-[#07111f]/90 p-5 h-full">
      <div className="mb-5">
        <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-400/80">Real-time Telemetry</div>
        <h2 className="mt-1 text-[clamp(1rem,1.5vw,1.25rem)] font-semibold text-white tracking-wide">Subsystem Telemetry Stream</h2>
      </div>

      <div className="flex-1 space-y-6 pr-2">
        {/* Rotors */}
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-[0.15em]">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400"></div>
            Propulsion System
          </h3>
          <div className="grid grid-cols-2 gap-2.5">
            {rotors.map(r => (
              <div key={r.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 hover:border-cyan-500/30 transition-colors">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-bold text-slate-200">{r.id}</span>
                  <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium tracking-wider uppercase", r.status === 'Warning' ? "bg-red-500/20 text-red-300 border border-red-500/30" : "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20")}>{r.status}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[10px]">
                  <div className="bg-black/20 rounded-xl p-2"><span className="text-slate-500 block mb-1">RPM</span><div className="text-cyan-300 font-mono text-sm">{r.rpm}</div></div>
                  <div className="bg-black/20 rounded-xl p-2"><span className="text-slate-500 block mb-1">TMP</span><div className={cn("font-mono text-sm", r.temp > 65 ? "text-amber-300" : "text-cyan-300")}>{r.temp}°C</div></div>
                  <div className="bg-black/20 rounded-xl p-2"><span className="text-slate-500 block mb-1">VIB</span><div className={cn("font-mono text-sm", r.vib > 35 ? "text-amber-300" : "text-cyan-300")}>{r.vib}</div></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Batteries */}
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-[0.15em]">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
            Power System
          </h3>
          <div className="grid grid-cols-2 gap-2.5">
            {batteries.map(b => (
              <div key={b.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 hover:border-emerald-500/30 transition-colors">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-bold text-slate-200">{b.id}</span>
                  <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium tracking-wider uppercase", b.status === 'Warning' ? "bg-red-500/20 text-red-300 border border-red-500/30" : "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20")}>{b.status}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[10px]">
                  <div className="bg-black/20 rounded-xl p-2"><span className="text-slate-500 block mb-1">SOC</span><div className="text-emerald-300 font-mono text-sm">{b.soc}%</div></div>
                  <div className="bg-black/20 rounded-xl p-2"><span className="text-slate-500 block mb-1">VOLT</span><div className="text-emerald-300 font-mono text-sm">{b.voltage}V</div></div>
                  <div className="bg-black/20 rounded-xl p-2"><span className="text-slate-500 block mb-1">TMP</span><div className="text-emerald-300 font-mono text-sm">{b.temp}°C</div></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Avionics & Actuators */}
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-[0.15em]">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400"></div>
            Avionics & Sensors
          </h3>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="flex justify-between items-center rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
              <div className="text-sm font-medium text-slate-200">Main Flight Computer</div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">Online</div>
            </div>
            <div className="flex justify-between items-center rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
              <div className="text-sm font-medium text-slate-200">LiDAR Array</div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">Active</div>
            </div>
            <div className="flex justify-between items-center rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
              <div className="text-sm font-medium text-slate-200">Comm Link</div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">Stable</div>
            </div>
            <div className="flex justify-between items-center rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
              <div className="text-sm font-medium text-slate-200">Nav Sensors</div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">Nominal</div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-[0.15em]">
            <div className="w-1.5 h-1.5 rounded-full bg-sky-400"></div>
            Cockpit
          </h3>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
            <div className="flex justify-between items-center mb-3">
              <div className="text-sm font-bold text-slate-200">View</div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">Live</div>
            </div>
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">
              <video autoPlay loop muted playsInline className="w-full aspect-video object-cover" src={cockpitVideoSrc} />
            </div>
          </div>
        </div>

        <div>
          <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-[0.15em]">
            <div className="w-1.5 h-1.5 rounded-full bg-violet-400"></div>
            Agentic Guard
          </h3>
          <div className="rounded-3xl border border-white/10 bg-[#07111f]/90 p-3.5">
            <div className="grid gap-3">
              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-slate-100">Safety Risk Assessment</div>
                  <div className="text-[10px] font-medium uppercase tracking-[0.25em] text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">{agentResponse.safety_risk_assessment?.risk_level || 'Unknown'}</div>
                </div>
                <div className="mt-3 text-sm leading-6 text-slate-300">{agentResponse.safety_risk_assessment?.primary_risk || 'No agent response loaded.'}</div>
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="text-sm font-semibold text-slate-100 mb-3">Visual Analysis</div>
                  <div className="space-y-2 text-sm text-slate-300">
                    {visualItems.length > 0 ? visualItems.map((item, idx) => (
                      <div key={idx} className={cn('rounded-2xl border p-2 flex items-start gap-3', item.level === 'danger' ? 'border-red-500/30 bg-red-500/10 text-red-100' : item.level === 'warning' ? 'border-amber-500/30 bg-amber-500/10 text-amber-100' : item.level === 'success' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100' : 'border-white/10 bg-slate-950/80 text-slate-200')}>
                        <span className={cn('mt-1 h-2.5 w-2.5 rounded-full', item.level === 'danger' ? 'bg-red-400' : item.level === 'warning' ? 'bg-amber-300' : item.level === 'success' ? 'bg-emerald-300' : 'bg-slate-500')} />
                        <span>{item.text}</span>
                      </div>
                    )) : <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-2">No visual analysis available.</div>}
                  </div>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="text-sm font-semibold text-slate-100 mb-3">Audio Analysis</div>
                  <div className="space-y-2 text-sm text-slate-300">
                    {audioItems.length > 0 ? audioItems.map((item, idx) => (
                      <div key={idx} className={cn('rounded-2xl border p-2 flex items-start gap-3', item.level === 'danger' ? 'border-red-500/30 bg-red-500/10 text-red-100' : item.level === 'warning' ? 'border-amber-500/30 bg-amber-500/10 text-amber-100' : item.level === 'success' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100' : 'border-white/10 bg-slate-950/80 text-slate-200')}>
                        <span className={cn('mt-1 h-2.5 w-2.5 rounded-full', item.level === 'danger' ? 'bg-red-400' : item.level === 'warning' ? 'bg-amber-300' : item.level === 'success' ? 'bg-emerald-300' : 'bg-slate-500')} />
                        <span>{item.text}</span>
                      </div>
                    )) : <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-2">No audio analysis available.</div>}
                  </div>
                  <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/80 p-3 text-sm text-slate-300">
                    <div className="text-slate-100 font-semibold mb-2">Fusion</div>
                    {agentResponse.detailed_analysis?.fusion || 'No fusion analysis available.'}
                  </div>
                </div>
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="text-sm font-semibold text-slate-100 mb-3">Possible Causes</div>
                  {agentResponse.possible_causes?.length > 0 ? (
                    <ul className="list-disc list-inside space-y-2 text-sm text-slate-300">
                      {agentResponse.possible_causes.map((cause, idx) => <li key={idx}>{cause}</li>)}
                    </ul>
                  ) : (
                    <div className="text-sm text-slate-500">No possible causes available.</div>
                  )}
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="text-sm font-semibold text-slate-100 mb-3">Recommended Actions</div>
                  {agentResponse.recommended_actions?.length > 0 ? (
                    <ul className="list-disc list-inside space-y-2 text-sm text-slate-300">
                      {agentResponse.recommended_actions.map((action, idx) => <li key={idx}>{action}</li>)}
                    </ul>
                  ) : (
                    <div className="text-sm text-slate-500">No recommended actions available.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function DetailsPage({ selectedAircraft, agentResponses }) {
  if (!selectedAircraft) return null;

  const tone = getStatusTone(selectedAircraft.status);
  const responseKey = normalizeEvtolId(selectedAircraft.id);
  const inlineAgent = selectedAircraft.agent || selectedAircraft?.agenticGuard || null;
  const agentResp = inlineAgent || agentResponses[responseKey] || null;
  return <section className="grid grid-cols-[1.02fr_0.98fr] gap-2">
    <ComponentsDataPanel aircraft={selectedAircraft} agentResponse={agentResp} />
    <div className="grid min-w-0 gap-2">
      <div className="rounded-3xl border border-white/10 bg-[#07111f]/90 p-2.5">
        <div className="mb-3 flex items-start justify-between gap-2"><div><div className="text-[10px] uppercase tracking-[0.28em] text-slate-500">PdM Data</div><div className="mt-1 text-xl font-semibold text-white">{selectedAircraft.id} RUL Predictive Matrix</div></div><div className={cn('rounded-full px-2 py-1 text-[10px] font-medium', tone.chip)}>{selectedAircraft.pdm.riskLevel} Risk</div></div>
        <div className="grid grid-cols-4 gap-2"><DetailMetric label="Motor RPM" value={Math.round(selectedAircraft.motorRpm)} /><DetailMetric label="Vibration" value={`${Number(selectedAircraft.vibration || 0).toFixed(1)} Hz`} accent={selectedAircraft.vibration > 50 ? 'text-red-300' : 'text-emerald-300'} /><DetailMetric label="Battery Delta" value={`${selectedAircraft.batteryDelta}%`} accent={selectedAircraft.batteryDelta > 3 ? 'text-red-300' : 'text-cyan-300'} /><DetailMetric label="Anomaly Score" value={selectedAircraft.anomalyScore.toFixed(2)} accent={selectedAircraft.anomalyScore > 0.4 ? 'text-red-300' : 'text-amber-300'} /></div>
        <div className="mt-2 rounded-2xl border border-white/10 bg-white/[0.03] p-2.5"><div className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Maintenance Warning</div><div className={cn('mt-1 text-sm leading-6', selectedAircraft.status==='Warning' ? 'text-red-300' : 'text-slate-300')}>{selectedAircraft.pdm.warning}</div></div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <PdMTrendChart data={selectedAircraft.pdm.trends} dataKey="temp" color="#ff4d6d" title="Battery Temperature Trend" />
        <PdMTrendChart data={selectedAircraft.pdm.trends} dataKey="vib" color="#37f29b" title="Rotor Vibration Trend" />
        <PdMTrendChart data={selectedAircraft.pdm.trends} dataKey="rpm" color="#00f0ff" title="Motor RPM Trend" />
        <PdMAreaChart data={selectedAircraft.pdm.trends} />
      </div>
      <div className="grid grid-cols-[1fr_1fr] gap-2">
        <div className="rounded-3xl border border-white/10 bg-[#07111f]/90 p-2.5"><div className="text-sm font-medium text-white">Asset Metadata</div><div className="mt-2 space-y-2 text-sm text-slate-300"><MetadataRow label="Mission" value={selectedAircraft.mission} /><MetadataRow label="Role" value={selectedAircraft.role} /><MetadataRow label="Last Maintenance" value={selectedAircraft.lastMaintenance} /><MetadataRow label="Next Inspection" value={selectedAircraft.nextInspection} /><MetadataRow label="Battery Cycles" value={selectedAircraft.batteryCycles} /><MetadataRow label="PKM" value={selectedAircraft.pkm} /></div></div>
        <div className="rounded-3xl border border-white/10 bg-[#07111f]/90 p-2.5"><div className="text-sm font-medium text-white">Digital Twin Notes</div><div className="mt-2 space-y-2">{selectedAircraft.twinNotes.map(note => <div key={note} className="flex gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-2 text-sm text-slate-300"><Radar size={14} className="mt-0.5 shrink-0 text-cyan-300" /><span>{note}</span></div>)}</div></div>
      </div>
    </div>
  </section>;
}

function MetadataRow({ label, value }) { return <div className="flex items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2"><span className="shrink-0 text-slate-400">{label}</span><span className="min-w-0  font-mono text-cyan-300">{value}</span></div>; }
const localSettingsOptions = {
  general: [
    { id: 'environment', label: 'Environment', value: 'Live Operations', options: ['Live Operations', 'Engineering Dev', 'Production Live'] },
    { id: 'theme', label: 'Theme', value: 'Dark / Cyberpunk', options: ['Dark / Cyberpunk', 'Light / Clean', 'High Contrast'] },
    { id: 'language', label: 'Language', value: 'English', options: ['English', 'Traditional Chinese', 'Simplified Chinese', 'Japanese'] },
    { id: 'alertThreshold', label: 'Tolerance & Sensitivity Matrix', value: 'Urban Air Mobility', options: ['Urban Air Mobility', 'Strict Safety', 'Cargo Transport', 'Custom'] },
    { id: 'refreshInterval', label: 'Refresh Interval', value: '1 second', options: ['Real-time (0.1s)', '1 second', '5 seconds', 'Manual'] },
  ],
  twin: [
    { id: 'defaultModel', label: 'Default Aircraft Model', value: 'EH216-S', options: ['EH216-S', 'Joby S4', 'Archer Midnight', 'Volocopter'] },
    { id: 'renderQuality', label: '3D Render Quality', value: 'High', options: ['Ultra (Ray Tracing)', 'High', 'Medium', 'Low (Performance)'] },
    { id: 'cameraMode', label: 'Camera Mode', value: 'Orbital', options: ['Orbital', 'Free Fly', 'Cockpit View', 'Follow Mode'] },
    { id: 'highlight', label: 'Component Highlight', value: 'Health-based', options: ['Health-based', 'Temperature-based', 'Vibration-based', 'None'] },
    { id: 'telemetrySync', label: 'Telemetry Sync Rate', value: '1 Hz', options: ['10 Hz', '5 Hz', '1 Hz', '0.2 Hz'] },
  ],
  logging: [
    { id: 'telemetrySource', label: 'Telemetry Source', value: 'MQTT / WebSocket', options: ['MQTT / WebSocket', 'REST API Polling', 'Simulated Data', 'Historical Playback'] },
    { id: 'dataRetention', label: 'Data Retention', value: '30 days', options: ['7 days', '30 days', '90 days', '1 year', 'Indefinite'] },
    { id: 'logLevel', label: 'Log Level', value: 'Operational + Warning', options: ['Debug', 'Info', 'Operational + Warning', 'Critical Only'] },
  ],
  advanced: [
    { id: 'predictiveModel', label: 'Predictive Model', value: 'Hybrid Ensemble', options: ['Hybrid Ensemble', 'Deep Neural Network (DNN)', 'Random Forest', 'Rule-based Heuristics'] },
    { id: 'autoCorrection', label: 'Auto-Correction', value: 'Disabled', options: ['Disabled', 'Notify Only', 'Semi-Autonomous', 'Fully Autonomous'] },
    { id: 'apiAccess', label: 'External API Access', value: 'Read-only', options: ['Disabled', 'Read-only', 'Read/Write (Authenticated)'] },
  ]
};

function SettingsBlock({ title, icon: Icon, sectionKey, settingsState, updateSetting }) {
  const items = localSettingsOptions[sectionKey];
  return (
    <section className="rounded-3xl border border-white/10 bg-[#07111f]/90 p-2.5">
      <div className="flex items-center gap-2">
        <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-2 text-cyan-300">
          <Icon size={16} />
        </div>
        <div className="text-xl font-semibold text-white">{title}</div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {items.map((item) => (
          <div key={item.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-2.5 flex flex-col justify-between">
            <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">{item.label}</div>
            <div className="mt-1 relative">
              <select
                value={settingsState[item.id] || item.value}
                onChange={(e) => updateSetting(item.id, e.target.value)}
                className="w-full appearance-none bg-transparent text-sm font-medium text-slate-200 outline-none cursor-pointer border-b border-transparent focus:border-cyan-400/50 pb-1 transition-colors relative z-10"
              >
                {item.options.map(opt => (
                  <option key={opt} value={opt} className="bg-[#0b1b31] text-slate-200">{opt}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center text-slate-500 z-0">
                <ChevronRight size={14} className="rotate-90" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SettingsPage() {
  const [settingsState, setSettingsState] = useState(() => {
    try { return JSON.parse(localStorage.getItem('evtol_settings')) || {}; } catch(e) { return {}; }
  });

  const updateSetting = (id, value) => {
    const newState = { ...settingsState, [id]: value };
    setSettingsState(newState);
    try { localStorage.setItem('evtol_settings', JSON.stringify(newState)); } catch(e) {}
  };

  return (
    <section className="grid gap-2">
      <SettingsBlock title="General" icon={Settings} sectionKey="general" settingsState={settingsState} updateSetting={updateSetting} />
      <SettingsBlock title="Spatial Sync Settings" icon={Cpu} sectionKey="twin" settingsState={settingsState} updateSetting={updateSetting} />
      <SettingsBlock title="Data and Logging" icon={Activity} sectionKey="logging" settingsState={settingsState} updateSetting={updateSetting} />
      <SettingsBlock title="Advanced" icon={Wrench} sectionKey="advanced" settingsState={settingsState} updateSetting={updateSetting} />
    </section>
  );
}
function PageChromeCard({ icon: Icon, label, value, accent='cyan' }) { const styles={cyan:'border-cyan-500/20 bg-cyan-500/10 text-cyan-300',green:'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',amber:'border-amber-400/20 bg-amber-400/10 text-amber-300',red:'border-red-500/20 bg-red-500/10 text-red-300'}; return <div className="rounded-3xl border border-white/10 bg-[#07111f]/90 p-2.5"><div className="flex items-center justify-between gap-2"><div className="min-w-0"><div className="text-[10px] uppercase tracking-[0.25em] text-slate-500">{label}</div><div className="mt-1 text-xl font-semibold text-white">{value}</div></div><div className={cn('rounded-2xl border p-2', styles[accent])}><Icon size={16} /></div></div></div>; }


export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    try {
      return localStorage.getItem('ascendo_auth') === 'true';
    } catch (e) {
      return false;
    }
  });
  const [activePage, setActivePage] = useState('home');
  const [selectedId, setSelectedId] = useState('EVTOL-01');
  const [agentResponses, setAgentResponses] = useState({});
  const liveFleetData = useSimulatedFleet(evtolFleet);
  const currentAircraft = liveFleetData.find(a => a.id === selectedId) || liveFleetData[0];
  const fleetStats = useMemo(() => ({ avgHealth: Math.round(liveFleetData.reduce((s,i)=>s+i.health,0)/liveFleetData.length), activeWarnings: liveFleetData.filter(i=>i.status==='Warning').length, avgTemp: Math.round(liveFleetData.reduce((s,i)=>s+i.temperature,0)/liveFleetData.length) }), [liveFleetData]);

  useEffect(() => {
    fetch('/agent-response.txt')
      .then((response) => {
        if (!response.ok) throw new Error(`Failed to load agent responses: ${response.status}`);
        return response.text();
      })
      .then((text) => setAgentResponses(parseAgentResponseFile(text)))
      .catch((error) => {
        console.warn('Unable to load agent responses:', error);
      });
  }, []);
  if (!isLoggedIn) return <LoginPage onLogin={() => {
    setIsLoggedIn(true);
    setActivePage('home');
    try {
      localStorage.setItem('ascendo_auth', 'true');
    } catch (e) {}
  }} />;
  return <div className="min-h-screen bg-[#030914] text-white">
    <div className="fixed inset-0 opacity-50 pointer-events-none" style={{ background:'radial-gradient(circle at 12% 18%, rgba(0,240,255,.08), transparent 22%), radial-gradient(circle at 80% 14%, rgba(55,242,155,.06), transparent 20%), linear-gradient(180deg, #03101e 0%, #030914 100%)' }} />
    <div className="relative mx-auto flex min-h-screen w-full max-w-[1800px] gap-3 p-4">
      <Sidebar activePage={activePage} setActivePage={setActivePage} />
      <main className="min-w-0 flex-1">
         <TopHeader
          activePage={activePage}
          selectedAircraft={currentAircraft}
          fleetStats={fleetStats}
          onLogout={() => {
            setIsLoggedIn(false);
            setActivePage('home');
            try {
              localStorage.removeItem('ascendo_auth');
            } catch (e) {}
          }}
        />
        <div className="min-w-0 pb-12">{activePage==='home' && <HomePage fleet={liveFleetData} selectedAircraft={currentAircraft} setSelectedAircraft={(a) => setSelectedId(a.id)} setActivePage={setActivePage} />} {activePage==='twins' && <TwinsPage selectedAircraft={currentAircraft} fleet={liveFleetData} setSelectedAircraft={(a) => setSelectedId(a.id)} />} {activePage==='details' && <DetailsPage selectedAircraft={currentAircraft} agentResponses={agentResponses} />} {activePage==='settings' && <SettingsPage />}</div>
      </main>
    </div>
  </div>;
}