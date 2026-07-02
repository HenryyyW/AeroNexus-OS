import { useState, Suspense, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, Environment, OrbitControls, useGLTF, Float, Bounds, Center, useAnimations } from '@react-three/drei';
import { getStatusTone, cn } from '../utils/evtolUtils';
import { weatherStations } from '../data/weatherStations';
import useWindData from '../hooks/useWindData';
import AnimatedMap from './AnimatedMap';

const USE_REAL_MODEL = true;

function RealEvtolModel() {
  const group = useRef();
  const { scene, animations } = useGLTF('/evtol.glb');
  const { actions } = useAnimations(animations, group);

  useEffect(() => {
    if (actions) {
      Object.values(actions).forEach((action) => { if (action) action.play(); });
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
  useFrame((state) => {
    if (rotorRef.current) rotorRef.current.rotation.y = state.clock.elapsedTime * 18;
  });
  return (
    <group position={position}>
      <mesh>
        <cylinderGeometry args={[0.3, 0.3, 0.2, 16]} />
        <meshStandardMaterial color="#37f29b" />
      </mesh>
      <mesh ref={rotorRef} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.14, 0]}>
        <cylinderGeometry args={[0.62, 0.62, 0.02, 40]} />
        <meshBasicMaterial color="#d9fbff" transparent opacity={0.18} depthWrite={false} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, Math.PI / 4]} position={[0, 0.145, 0]}>
        <boxGeometry args={[1.1, 0.03, 0.08]} />
        <meshBasicMaterial color="#e7fdff" transparent opacity={0.12} />
      </mesh>
    </group>
  );
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
    return (
      <group ref={craftRef}>
        <Suspense fallback={<mesh><boxGeometry args={[1, 1, 1]} /><meshStandardMaterial color="gray" wireframe /></mesh>}>
          <RealEvtolModel />
        </Suspense>
      </group>
    );
  }

  const color = aircraft.status === 'Warning' ? '#ff4d6d' : (aircraft.status === 'Monitoring' ? '#fcd34d' : '#cbd5e1');
  return (
    <group ref={craftRef} position={[0, 0.5, 0]}>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[3, 0.8, 1.5]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.8} />
      </mesh>
      <RotorBlur position={[1, 0.5, 0.8]} />
      <RotorBlur position={[1, 0.5, -0.8]} />
      <RotorBlur position={[-1, 0.5, 0.8]} />
      <RotorBlur position={[-1, 0.5, -0.8]} />
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[0.6, 0.6, 0.6]} />
        <meshStandardMaterial color="#00f0ff" emissive="#00f0ff" emissiveIntensity={0.5} wireframe />
      </mesh>
    </group>
  );
}

function DigitalTwinViewer({ aircraft, title = 'Live Asset Replication' }) {
  const tone = getStatusTone(aircraft.status);
  return (
    <section className="relative flex min-h-[360px] flex-col overflow-hidden rounded-3xl border border-cyan-500/20 bg-[#07111f]/90">
      <div className="absolute left-3 top-2.5 z-10 rounded-xl border border-cyan-500/30 bg-black/40 px-2 py-1 text-[10px] font-mono uppercase tracking-[0.2em] text-cyan-300">{title}</div>
      <div className="absolute right-3 top-2.5 z-10 rounded-xl border border-white/10 bg-black/40 px-2 py-1 text-[10px] text-slate-300">{aircraft.id} · {aircraft.model}</div>
      <div className="absolute bottom-3 left-3 z-10 flex flex-wrap gap-2">
        {Object.entries(aircraft.componentHealth || {}).slice(0, 2).map(([key, value]) => (
          <div key={key} className="rounded-xl border border-white/10 bg-black/35 px-2 py-1 text-[10px] text-slate-300">
            <div className="uppercase tracking-[0.18em] text-slate-500">{key}</div>
            <div className={cn('mt-1 font-mono', value < 85 ? 'text-red-400' : 'text-emerald-300')}>{value}%</div>
          </div>
        ))}
      </div>
      <div className="h-full w-full min-h-[360px]">
        <Canvas camera={{ position: [5, 4.2, 5], fov: 42 }} dpr={[1, 1.5]}>
          <ambientLight intensity={0.85} />
          <directionalLight position={[10, 12, 8]} intensity={1.8} color="#fff7e8" />
          <directionalLight position={[-6, 4, -8]} intensity={0.45} color="#9ad8ff" />
          <pointLight position={[0, 3, 0]} intensity={0.6} color={tone.glow} />
          <Environment files="/skybox.exr" background blur={0.05} />
          <AircraftModel aircraft={aircraft} />
          <OrbitControls autoRotate autoRotateSpeed={aircraft.status === 'Warning' ? 1.6 : 0.55} />
          <ContactShadows position={[0, -1.2, 0]} scale={15} blur={2.6} opacity={0.15} resolution={256} frames={1} />
        </Canvas>
      </div>
    </section>
  );
}

function WindPanel({ selectedStationId }) {
  const station = weatherStations.find((s) => s.id === selectedStationId);
  const { windData, loading, error } = useWindData(station?.url);

  return (
    <div className="rounded-3xl border border-cyan-500/20 bg-[#07111f]/90 p-4 h-full flex flex-col">
      <div className="mb-4">
        <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-400/80">Weather Station</div>
        <h2 className="mt-1 text-lg font-semibold text-white">{station?.name}</h2>
      </div>
      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-slate-400 text-sm">Loading wind data...</div>
        </div>
      )}
      {error && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-red-400 text-sm">{error}</div>
        </div>
      )}
      {windData && !loading && (
        <div className="flex-1 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Wind Speed</div>
              <div className="mt-2 text-2xl font-mono text-cyan-300">{windData['10-Minute Mean Speed(km/hour)'] || 'N/A'}</div>
              <div className="text-xs text-slate-400 mt-1">km/h</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Wind Direction</div>
              <div className="mt-2 text-2xl font-mono text-emerald-300">{windData['10-Minute Mean Wind Direction(Compass points)'] || 'N/A'}</div>
              <div className="text-xs text-slate-400 mt-1">Compass</div>
            </div>
            {windData['10-Minute Maximum Gust(km/hour)'] && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Max Gust</div>
                <div className="mt-2 text-2xl font-mono text-amber-300">{windData['10-Minute Maximum Gust(km/hour)']}</div>
                <div className="text-xs text-slate-400 mt-1">km/h</div>
              </div>
            )}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Last Update</div>
              <div className="mt-2 text-sm font-mono text-slate-300">
                {windData['Date time (Hour)'] && windData['Date time (Minute)']
                  ? `${windData['Date time (Hour)']}:${windData['Date time (Minute)'].toString().padStart(2, '0')}`
                  : 'N/A'}
              </div>
              <div className="text-xs text-slate-400 mt-1">HK Time</div>
            </div>
          </div>
          <div className="text-xs text-slate-500 pt-2 border-t border-white/10">
            {station && (
              <>
                <div>Lat: {station.lat.toFixed(4)}</div>
                <div>Lng: {station.lng.toFixed(4)}</div>
              </>
            )}
          </div>
        </div>
      )}
      {!loading && !error && !windData && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-slate-400 text-sm">No data available</div>
        </div>
      )}
    </div>
  );
}

function StationSelector({ selectedStationId, onSelectStation }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-[#07111f]/90 p-4">
      <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-400/80 mb-3">Select Weather Station</div>
      <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-2">
        {weatherStations.map((station) => (
          <button
            key={station.id}
            onClick={() => onSelectStation(station.id)}
            className={cn('rounded-2xl border p-2.5 text-left transition-colors text-sm',
              selectedStationId === station.id
                ? 'border-cyan-400/50 bg-cyan-400/10 text-cyan-300'
                : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-cyan-500/30 hover:bg-cyan-500/5'
            )}
          >
            <div className="font-medium text-xs">{station.name}</div>
            <div className="text-[10px] text-slate-400 mt-1">{station.nameZh}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function TwinsPage({ selectedAircraft, fleet, setSelectedAircraft }) {
  const [selectedStationId, setSelectedStationId] = useState(0);
  if (!selectedAircraft) return null;

  return (
    <section className="grid grid-cols-[1.12fr_0.88fr] gap-2">
      <div className="flex min-w-0 flex-col gap-2">
        <DigitalTwinViewer aircraft={selectedAircraft} title="Live Asset Replication" />
        <div className="grid grid-cols-2 gap-2">
          {fleet.map((item) => {
            const tone = getStatusTone(item.status);
            const isSelected = item.id === selectedAircraft.id;
            return (
              <button
                key={item.id}
                onClick={() => setSelectedAircraft(item)}
                className={cn('rounded-3xl border p-2.5 text-left transition-colors', isSelected ? 'border-cyan-400/50 bg-cyan-400/10' : 'border-white/10 bg-[#07111f]/90 hover:border-cyan-500/30 hover:bg-cyan-500/5')}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 font-mono text-sm text-white">{item.id}</div>
                  <div className={cn('rounded-full px-2 py-1 text-[10px]', tone.chip)}>{item.status}</div>
                </div>
                <div className="mt-2 text-xs text-slate-400">{item.locationLabel}</div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
                  <div className="rounded-xl bg-white/[0.03] p-2 text-slate-300">
                    ALT<div className="mt-1 font-mono text-cyan-300">{Math.round(item.altitude)} m</div>
                  </div>
                  <div className="rounded-xl bg-white/[0.03] p-2 text-slate-300">
                    SPD<div className="mt-1 font-mono text-cyan-300">{Math.round(item.speed)} km/h</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid min-w-0 gap-2" style={{ gridTemplateRows: 'auto auto auto' }}>
        <AnimatedMap aircraft={selectedAircraft} showAll fleet={fleet} onSelectAircraft={setSelectedAircraft} />
        <WindPanel selectedStationId={selectedStationId} />
        <StationSelector selectedStationId={selectedStationId} onSelectStation={setSelectedStationId} />
      </div>
    </section>
  );
}
