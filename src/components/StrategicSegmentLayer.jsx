import { useEffect, useRef } from 'react';

const SEGMENT_ROUTE_CSV_URL = '/speed_segments_info.csv';
const SEGMENT_SPEED_XML_URL = '/irnAvgSpeed-all.xml';
const SEGMENT_GEOMETRY_GEOJSON_URL = '/road_segments.geojson';

function speedColor(speed) {
  if (speed == null) return '#6b7280';
  if (speed >= 60) return '#22c55e';
  if (speed >= 35) return '#f59e0b';
  return '#ef4444';
}

function parseRouteMap(csvText) {
  const rows = csvText.trim().split('\n');
  if (rows.length <= 1) return {};

  const headers = rows[0].split(',').map((h) => h.trim().toLowerCase());
  const irnIdx = headers.indexOf('irn_id');
  const routeIdx = headers.indexOf('ucase(route)');
  if (irnIdx < 0 || routeIdx < 0) return {};

  const routeMap = {};
  for (let i = 1; i < rows.length; i += 1) {
    const cols = rows[i].split(',');
    const irn = (cols[irnIdx] || '').trim();
    const route = (cols[routeIdx] || '').trim();
    if (!irn) continue;
    routeMap[irn] = route || 'N/A';
  }

  return routeMap;
}

function parseSegmentSpeeds(xmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'application/xml');
  const latestPeriod = Array.from(doc.querySelectorAll('period')).at(-1);
  const date = doc.querySelector('date')?.textContent?.trim() || '';
  const periodTo = latestPeriod?.querySelector('period_to')?.textContent?.trim() || '';
  const updatedAt = [date, periodTo].filter(Boolean).join(' ');

  const speedMap = {};
  latestPeriod?.querySelectorAll('segment').forEach((segmentNode) => {
    const segmentId = segmentNode.querySelector('segment_id')?.textContent?.trim();
    if (!segmentId) return;
    const speedValue = Number(segmentNode.querySelector('speed')?.textContent?.trim());
    const isValid = segmentNode.querySelector('valid')?.textContent?.trim() === 'Y';
    speedMap[segmentId] = {
      speed: Number.isNaN(speedValue) ? null : speedValue,
      valid: isValid,
    };
  });

  return { speedMap, updatedAt };
}

function featureSegmentId(feature) {
  const p = feature?.properties || {};
  return String(p.segment_id || p.SEGMENT_ID || p.irn_id || p.IRN_ID || p.id || p.ID || '').trim();
}

export default function StrategicSegmentLayer({ leafletMap }) {
  const routeMapRef = useRef({});
  const segmentLayerRef = useRef(null);
  const markerMapRef = useRef({});
  const refreshTimerRef = useRef(null);

  useEffect(() => {
    if (!leafletMap || typeof window === 'undefined') return;
    const L = window.L;
    if (!L) return;

    const applySegmentStyles = (speedMap, updatedAt) => {
      Object.entries(markerMapRef.current).forEach(([segmentId, layer]) => {
        const metric = speedMap[segmentId];
        const speed = metric?.valid ? metric.speed : null;
        const color = speedColor(speed);

        if (typeof layer.setStyle === 'function') {
          layer.setStyle({
            color,
            weight: speed == null ? 1.8 : 2.8,
            opacity: speed == null ? 0.45 : 0.9,
          });
        }

        const route = routeMapRef.current[segmentId] || 'N/A';
        const speedLabel = speed == null ? 'N/A' : `${speed.toFixed(1)} km/h`;
        layer.bindPopup(
          `<div style="font-size:12px;line-height:1.4">
            <strong>Segment ${segmentId}</strong><br/>
            Route: ${route}<br/>
            Speed: ${speedLabel}<br/>
            Updated: ${updatedAt || 'N/A'}
          </div>`
        );
      });
    };

    const refreshSegmentSpeeds = async () => {
      try {
        const response = await fetch(SEGMENT_SPEED_XML_URL);
        if (!response.ok) throw new Error('Failed to load segment speed XML');
        const xmlText = await response.text();
        const { speedMap, updatedAt } = parseSegmentSpeeds(xmlText);
        applySegmentStyles(speedMap, updatedAt);
      } catch (error) {
        console.warn('Failed to refresh segment speeds:', error);
      }
    };

    (async () => {
      try {
        const [routeResponse, geometryResponse] = await Promise.all([
          fetch(SEGMENT_ROUTE_CSV_URL),
          fetch(SEGMENT_GEOMETRY_GEOJSON_URL),
        ]);

        if (!routeResponse.ok) throw new Error('Failed to load speed_segments_info.csv');
        routeMapRef.current = parseRouteMap(await routeResponse.text());

        if (!geometryResponse.ok) {
          throw new Error('Missing road_segments.geojson in public folder');
        }

        const geojson = await geometryResponse.json();
        segmentLayerRef.current = L.geoJSON(geojson, {
          style: {
            color: '#6b7280',
            weight: 1.8,
            opacity: 0.45,
          },
          onEachFeature: (feature, layer) => {
            const segmentId = featureSegmentId(feature);
            if (!segmentId) return;
            markerMapRef.current[segmentId] = layer;
          },
        }).addTo(leafletMap);

        try {
          leafletMap.fitBounds(segmentLayerRef.current.getBounds(), { maxZoom: 14 });
        } catch (error) {
          // Bounds may be invalid if no features were loaded.
        }

        refreshSegmentSpeeds();
        refreshTimerRef.current = window.setInterval(refreshSegmentSpeeds, 60000);
      } catch (error) {
        console.warn('Strategic segment layer setup failed:', error);
      }
    })();

    return () => {
      if (refreshTimerRef.current) {
        window.clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      markerMapRef.current = {};
      routeMapRef.current = {};
      if (segmentLayerRef.current) {
        try {
          segmentLayerRef.current.remove();
        } catch (error) {
          // Ignore cleanup failure.
        }
        segmentLayerRef.current = null;
      }
    };
  }, [leafletMap]);

  return null;
}
