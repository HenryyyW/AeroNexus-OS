import { useEffect, useRef, useState } from 'react';

const APP_START_TIME = Date.now();

function usePositions(aircraft, showAll, fleet) {
  const [positions, setPositions] = useState({});

  useEffect(() => {
    let frameId;

    const animate = () => {
      const elapsed = Date.now() - APP_START_TIME;
      const newPositions = {};
      const fleetToAnimate = showAll && fleet.length ? fleet : [aircraft];

      fleetToAnimate.forEach((item, index) => {
        if (!item.route || !item.route.length) return;
        const duration = 18000 + index * 4000;
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

  return positions;
}

function speedColor(speed) {
  if (speed == null) return '#94a3b8';
  if (speed >= 50) return '#22c55e';
  if (speed >= 25) return '#f59e0b';
  return '#ef4444';
}

export default function AnimatedMap({ aircraft, showAll = false, fleet = [], onSelectAircraft, hideLabel = false }) {
  const [showDetectors, setShowDetectors] = useState(true);
  const positions = usePositions(aircraft, showAll, fleet);
  const leafletMapRef = useRef(null);
  const leafletInstanceRef = useRef(null);
  const detectorsLayerRef = useRef(null);
  const trafficMapRef = useRef({});

  const updateDetectorStyles = () => {
    if (!detectorsLayerRef.current) return;
    detectorsLayerRef.current.eachLayer((layer) => {
      const aid = (layer.feature?.properties?.AID_ID_Number || layer.feature?.properties?.OBJECTID || '').toString().trim().toUpperCase();
      const traffic = trafficMapRef.current[aid];
      layer.setStyle({ fillColor: speedColor(traffic?.avgSpeed ?? null) });
    });
  };

  const fetchTrafficUpdate = async () => {
    try {
      const res = await fetch('https://resource.data.one.gov.hk/td/traffic-detectors/rawSpeedVol_SLP-all.xml');
      if (!res.ok) throw new Error('Failed to load traffic XML');
      const xmlText = await res.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'application/xml');
      const trafficMap = {};

      xmlDoc.querySelectorAll('detector').forEach((detector) => {
        const id = detector.querySelector('detector_id')?.textContent?.trim();
        if (!id) return;
        const lanes = Array.from(detector.querySelectorAll('lane')).map((lane) => ({
          lane_id: lane.querySelector('lane_id')?.textContent?.trim() || 'Unknown',
          speed: Number(lane.querySelector('speed')?.textContent?.trim() || '0'),
          occupancy: Number(lane.querySelector('occupancy')?.textContent?.trim() || '0'),
          volume: Number(lane.querySelector('volume')?.textContent?.trim() || '0'),
          valid: lane.querySelector('valid')?.textContent?.trim() || '',
        }));
        const speeds = lanes.filter((l) => !Number.isNaN(l.speed)).map((l) => l.speed);
        const avgSpeed = speeds.length ? Number((speeds.reduce((sum, value) => sum + value, 0) / speeds.length).toFixed(1)) : null;
        trafficMap[id.toUpperCase()] = { lanes, avgSpeed };
      });

      trafficMapRef.current = trafficMap;
      updateDetectorStyles();
    } catch (e) {
      console.warn('Failed to update traffic data', e);
    }
  };

  useEffect(() => {
    if (!leafletMapRef.current || typeof window === 'undefined') return;
    const L = window.L;
    if (!L) return;
    if (leafletInstanceRef.current) return;

    try {
      leafletInstanceRef.current = L.map(leafletMapRef.current, {
        attributionControl: false,
        zoomControl: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        touchZoom: false,
        keyboard: false,
        dragging: true,
      }).setView([22.303, 114.194], 13);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 20,
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      }).addTo(leafletInstanceRef.current);

      try { L.control.zoom({ position: 'topright' }).addTo(leafletInstanceRef.current); } catch (e) {}
      leafletInstanceRef.current.scrollWheelZoom.disable();
      leafletInstanceRef.current.doubleClickZoom.disable();
      leafletInstanceRef.current.boxZoom.disable();
      leafletInstanceRef.current.touchZoom.disable();
      leafletInstanceRef.current.keyboard.disable();
    } catch (e) {
      console.warn('Leaflet init failed', e);
    }

    (async () => {
      try {
        const geoRes = await fetch('/Traffic_Detectors_SLP_gdb_Traffic_Detectors_SLP_converted.geojson');
        if (!geoRes.ok) throw new Error('Failed to load geojson');
        const geojson = await geoRes.json();

        const pointToLayer = (feature, latlng) => {
          const aid = (feature.properties?.AID_ID_Number || feature.properties?.OBJECTID || '').toString().trim().toUpperCase();
          const traffic = trafficMapRef.current[aid];
          return L.circleMarker(latlng, {
            radius: 8,
            fillColor: speedColor(traffic?.avgSpeed ?? null),
            color: '#0f172a',
            weight: 1.5,
            fillOpacity: 0.96,
            opacity: 0.95,
          });
        };

        detectorsLayerRef.current = L.geoJSON(geojson, { pointToLayer });
        if (showDetectors && detectorsLayerRef.current) {
          detectorsLayerRef.current.addTo(leafletInstanceRef.current);
          try {
            leafletInstanceRef.current.fitBounds(detectorsLayerRef.current.getBounds(), { maxZoom: 18 });
          } catch (e) {}
        }
      } catch (e) {
        console.warn('Failed to load detectors data', e);
      }
    })();

    return () => {
      if (leafletInstanceRef.current) {
        try { leafletInstanceRef.current.remove(); } catch (e) {}
        leafletInstanceRef.current = null;
      }
    };
  }, [showDetectors]);

  useEffect(() => {
    if (!leafletInstanceRef.current) return;
    fetchTrafficUpdate();
    const intervalId = window.setInterval(fetchTrafficUpdate, 60000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!leafletInstanceRef.current || !detectorsLayerRef.current) return;
    if (showDetectors) {
      try { detectorsLayerRef.current.addTo(leafletInstanceRef.current); } catch (e) {}
    } else {
      try { detectorsLayerRef.current.remove(); } catch (e) {}
    }
  }, [showDetectors]);

  return (
    <div className="relative h-full min-h-[360px] overflow-hidden rounded-3xl border border-cyan-500/20">
      <div ref={leafletMapRef} className="absolute inset-0 z-0" />
      <div className="absolute inset-0 bg-[#06101b]/40 pointer-events-none" />
      {!hideLabel && (
        <div className="absolute left-3 top-2.5 z-20 rounded-xl border border-emerald-500/30 bg-black/40 px-2 py-1 text-[10px] font-mono uppercase tracking-[0.2em] text-emerald-300">Airspace Trajectory Map</div>
      )}
      <div className="absolute inset-0 z-10 pointer-events-none">
        <svg className="h-full w-full" viewBox="0 0 400 320" preserveAspectRatio="none">
          <defs>
            <linearGradient id="routeStroke" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00f0ff" />
              <stop offset="100%" stopColor="#37f29b" />
            </linearGradient>
          </defs>
          {(showAll ? fleet : [aircraft]).map((item) => {
            const active = item.id === aircraft.id;
            const startPoint = item.route?.[0] || { x: 0, y: 0 };
            const endPoint = item.route?.[item.route.length - 1] || { x: 0, y: 0 };
            return (
              <g key={`${item.id}-path`}>
                <path
                  d={`M ${(item.route || []).map((p) => `${p.x} ${p.y}`).join(' L ')}`}
                  fill="none"
                  stroke={active ? (showAll ? '#00f0ff' : 'url(#routeStroke)') : 'rgba(255,255,255,.22)'}
                  strokeWidth={active ? 2.4 : 1.1}
                  strokeDasharray="5 6"
                  opacity="0.9"
                />
                <circle cx={startPoint.x} cy={startPoint.y} r={active ? '4.5' : '3.5'} fill={active ? '#00f0ff' : '#7a8aa0'} />
                <circle cx={endPoint.x} cy={endPoint.y} r={active ? '4.5' : '3.5'} fill={active ? '#37f29b' : '#7a8aa0'} />
              </g>
            );
          })}
          {(showAll ? fleet : [aircraft]).map((item) => {
            const currentPos = positions[item.id] || item.route?.[0] || { x: 0, y: 0 };
            const active = item.id === aircraft.id;
            return (
              <g key={`${item.id}-marker`} transform={`translate(${currentPos.x}, ${currentPos.y})`} style={{ cursor: onSelectAircraft ? 'pointer' : 'default', pointerEvents: onSelectAircraft ? 'auto' : 'none' }} onClick={() => onSelectAircraft && onSelectAircraft(item)}>
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
