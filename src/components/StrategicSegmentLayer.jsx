import { useEffect, useRef } from 'react';

const SEGMENT_ROUTE_CSV_URL = '/speed_segments_info.csv';
const SEGMENT_SPEED_XML_URL = '/api/traffic/segment-speeds';
const SEGMENT_GEOMETRY_KML_URL = '/Road_Network_KML/Transportation_TNM_20260717_gdb_CENTERLINE_converted.kml';

function speedColor(speed) {
  if (speed == null) return '#6b7280';
  if (speed >= 60) return '#22c55e';
  if (speed >= 35) return '#f59e0b';
  return '#ef4444';
}

function speedBand(speed) {
  if (speed == null) return 'NO DATA';
  if (speed >= 60) return 'GREEN (FAST)';
  if (speed >= 35) return 'YELLOW (MODERATE)';
  return 'RED (SLOW)';
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

  const byName = (node, localName) => Array.from(node.getElementsByTagNameNS('*', localName));
  const firstText = (node, localName) => byName(node, localName)[0]?.textContent?.trim() || '';

  const periods = byName(doc, 'period');
  const latestPeriod = periods.at(-1) || null;
  const date = firstText(doc, 'date');
  const periodTo = latestPeriod ? firstText(latestPeriod, 'period_to') : '';
  const time = firstText(doc, 'time');
  const updatedAt = latestPeriod ? [date, periodTo].filter(Boolean).join(' ') : [date, time].filter(Boolean).join(' ');

  const speedMap = {};
  const segmentNodes = latestPeriod ? byName(latestPeriod, 'segment') : byName(doc, 'segment');

  segmentNodes.forEach((segmentNode) => {
    const segmentId = firstText(segmentNode, 'segment_id');
    if (!segmentId) return;
    const speedValue = Number(firstText(segmentNode, 'speed'));
    const isValid = firstText(segmentNode, 'valid') === 'Y';
    speedMap[segmentId] = {
      speed: Number.isNaN(speedValue) ? null : speedValue,
      valid: isValid,
    };
  });

  return { speedMap, updatedAt };
}

function featureSegmentId(feature) {
  const p = feature?.properties || {};
  return String(
    p.segment_id ||
      p.SEGMENT_ID ||
      p.irn_id ||
      p.IRN_ID ||
      p.route_id ||
      p.ROUTE_ID ||
      p.id ||
      p.ID ||
      ''
  ).trim();
}

function parseKmlCoordinates(coordinatesText) {
  return coordinatesText
    .trim()
    .split(/\s+/)
    .map((pair) => pair.split(',').map((value) => Number(value.trim())))
    .filter(([lng, lat]) => Number.isFinite(lng) && Number.isFinite(lat))
    .map(([lng, lat]) => [lng, lat]);
}

function parseRoadGeometryKml(kmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(kmlText, 'application/xml');
  const placemarks = Array.from(doc.getElementsByTagNameNS('*', 'Placemark'));

  return placemarks
    .map((placemark) => {
      const properties = {};

      Array.from(placemark.getElementsByTagNameNS('*', 'SimpleData')).forEach((simpleData) => {
        const name = simpleData.getAttribute('name');
        if (!name) return;
        properties[name] = simpleData.textContent?.trim() || '';
      });

      const placemarkName = Array.from(placemark.children).find((node) => node.localName === 'name')?.textContent?.trim() || '';
      if (placemarkName) properties.name = placemarkName;

      const lineString = placemark.getElementsByTagNameNS('*', 'LineString')[0] || null;
      const coordinatesNode = lineString?.getElementsByTagNameNS('*', 'coordinates')[0] || null;
      const coordinates = coordinatesNode ? parseKmlCoordinates(coordinatesNode.textContent || '') : null;
      if (!coordinates || coordinates.length < 2) return null;

      return {
        type: 'Feature',
        properties,
        geometry: {
          type: 'LineString',
          coordinates,
        },
      };
    })
    .filter(Boolean);
}

export default function StrategicSegmentLayer({ leafletMap }) {
  const routeMapRef = useRef({});
  const segmentLayerRef = useRef(null);
  const markerMapRef = useRef({});
  const refreshTimerRef = useRef(null);
  const renderedSegmentIdsRef = useRef(new Set());

  useEffect(() => {
    if (!leafletMap || typeof window === 'undefined') return;
    const L = window.L;
    if (!L) return;

    const applySegmentStyles = (speedMap, updatedAt) => {
      let matchedCount = 0;
      Object.entries(markerMapRef.current).forEach(([segmentId, layer]) => {
        const metric = speedMap[segmentId];
        const speed = metric?.valid ? metric.speed : null;
        if (speed == null) return;
        matchedCount += 1;
        const color = speedColor(speed);

        if (typeof layer.setStyle === 'function') {
          layer.setStyle({
            color,
            weight: speed == null ? 0.9 : 4.2,
            opacity: speed == null ? 0.14 : 1,
          });
        }

        if (speed != null && typeof layer.bringToFront === 'function') {
          layer.bringToFront();
        }

        const route = routeMapRef.current[segmentId] || 'N/A';
        const speedLabel = speed == null ? 'N/A' : `${speed.toFixed(1)} km/h`;
        const band = speedBand(speed);
        layer.bindPopup(
          `<div style="font-size:12px;line-height:1.4">
            <strong>Segment ${segmentId}</strong><br/>
            Route: ${route}<br/>
            Speed: ${speedLabel}<br/>
            Band: ${band}<br/>
            Updated: ${updatedAt || 'N/A'}
          </div>`
        );
      });

      console.info(`[StrategicSegmentLayer] rendered segments: ${Object.keys(markerMapRef.current).length}, active speeds: ${matchedCount}`);
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
        const [routeResponse, geometryResponse, speedResponse] = await Promise.all([
          fetch(SEGMENT_ROUTE_CSV_URL),
          fetch(SEGMENT_GEOMETRY_KML_URL),
          fetch(SEGMENT_SPEED_XML_URL),
        ]);

        if (!routeResponse.ok) throw new Error('Failed to load speed_segments_info.csv');
        routeMapRef.current = parseRouteMap(await routeResponse.text());

        if (!geometryResponse.ok) {
          throw new Error('Missing centerline KML in public folder');
        }

        if (!speedResponse.ok) {
          throw new Error('Failed to load segment speed XML');
        }

        const kmlText = await geometryResponse.text();
        const xmlText = await speedResponse.text();
        const { speedMap, updatedAt } = parseSegmentSpeeds(xmlText);
        const activeSegmentIds = new Set(
          Object.entries(speedMap)
            .filter(([, metric]) => metric?.valid && metric?.speed != null)
            .map(([segmentId]) => segmentId)
        );

        const geojson = {
          type: 'FeatureCollection',
          features: parseRoadGeometryKml(kmlText).filter((feature) => activeSegmentIds.has(featureSegmentId(feature))),
        };

        if (!geojson.features.length) {
          console.warn('[StrategicSegmentLayer] No road features parsed from KML.');
        }

        renderedSegmentIdsRef.current = activeSegmentIds;

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

        applySegmentStyles(speedMap, updatedAt);
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
      renderedSegmentIdsRef.current = new Set();
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
