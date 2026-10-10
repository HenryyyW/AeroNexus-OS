import { useEffect, useRef } from 'react';

const DETECTOR_LOCATION_CSV_URL =
  '/traffic_speed_volume_occ_info.csv';
const DETECTOR_TELEMETRY_XML_URL =
  '/rawSpeedVol-all.xml';
const DETECTOR_VISUALIZATION_ENABLED = false;

function formatMetric(value, digits = 1) {
  const num = Number(value);
  if (Number.isNaN(num)) return 'N/A';
  return num.toFixed(digits);
}

function getMetricTone(value) {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return { fillColor: '#94a3b8', radius: 3 };
  }
  if (numeric >= 70) {
    return { fillColor: '#ef4444', radius: 5 };
  }
  if (numeric >= 35) {
    return { fillColor: '#f59e0b', radius: 4 };
  }
  return { fillColor: '#22c55e', radius: 3 };
}

function getMetricSeverity(value) {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return 0; // grey
  if (numeric >= 70) return 3; // red
  if (numeric >= 35) return 2; // yellow
  return 1; // green
}

function getDetectorColorValue(metrics) {
  const occupancy = Number(metrics?.occupancy);
  if (!Number.isNaN(occupancy)) return occupancy;
  const volume = Number(metrics?.volume);
  if (!Number.isNaN(volume)) return volume;
  return null;
}

function updateDetectorPopup(marker, detectorInfo, metrics) {
  if (!marker || !detectorInfo) return;

  const speed = formatMetric(metrics?.speed, 1);
  const volume = formatMetric(metrics?.volume, 0);
  const occupancy = formatMetric(metrics?.occupancy, 1);
  const updateTime = metrics?.dateTime || 'N/A';

  marker.bindPopup(
    `<div style="font-size:12px;line-height:1.4">
      <strong>${detectorInfo.aid}</strong><br/>
      ${detectorInfo.roadEn}<br/>
      ${detectorInfo.district}<br/>
      <hr style="margin:6px 0;border-color:#334155"/>
      Speed: ${speed} km/h<br/>
      Volume: ${volume} veh/hr<br/>
      Occupancy: ${occupancy}%<br/>
      Updated: ${updateTime}
    </div>`
  );

  const colorValue = getDetectorColorValue(metrics);
  const tone = getMetricTone(colorValue);
  marker.setStyle({
    fillColor: tone.fillColor,
    radius: tone.radius,
  });
}

function parseDetectorCsv(csvText) {
  const rows = csvText.trim().split('\n');
  if (rows.length <= 1) return [];

  const headers = rows[0].split(',').map((h) => h.trim());
  const aidIndex = headers.indexOf('AID_ID_Number');
  const roadEnIndex = headers.indexOf('Road_EN');
  const districtIndex = headers.indexOf('District');
  const latIndex = headers.indexOf('Latitude');
  const lngIndex = headers.indexOf('Longitude');

  if ([aidIndex, latIndex, lngIndex].some((idx) => idx < 0)) {
    throw new Error('Detector CSV schema mismatch');
  }

  const detectors = [];
  for (let i = 1; i < rows.length; i += 1) {
    const cols = rows[i].split(',');
    const lat = Number(cols[latIndex]);
    const lng = Number(cols[lngIndex]);
    if (Number.isNaN(lat) || Number.isNaN(lng)) continue;

    detectors.push({
      aid: (cols[aidIndex] || '').trim(),
      roadEn: (cols[roadEnIndex] || '').trim(),
      district: (cols[districtIndex] || '').trim(),
      lat,
      lng,
    });
  }

  return detectors;
}

function parseXmlDetectorMetrics(xmlText) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, 'application/xml');

  const date = xmlDoc.querySelector('date')?.textContent?.trim() || '';
  const latestPeriod = Array.from(xmlDoc.querySelectorAll('period')).at(-1);
  const periodTo = latestPeriod?.querySelector('period_to')?.textContent?.trim() || '';
  const dateTime = [date, periodTo].filter(Boolean).join(' ');

  const toNumber = (value) => {
    const num = Number(value);
    return Number.isNaN(num) ? null : num;
  };

  const avg = (values) => {
    const filtered = values.filter((v) => v != null);
    if (!filtered.length) return null;
    return filtered.reduce((sum, value) => sum + value, 0) / filtered.length;
  };

  const metricsMap = {};
  latestPeriod?.querySelectorAll('detector').forEach((detectorNode) => {
    const detectorId = detectorNode.querySelector('detector_id')?.textContent?.trim();
    if (!detectorId) return;

    const lanes = Array.from(detectorNode.querySelectorAll('lane'));
    if (!lanes.length) return;

    const speedAvg = avg(lanes.map((lane) => toNumber(lane.querySelector('speed')?.textContent?.trim())));
    const occupancyAvg = avg(lanes.map((lane) => toNumber(lane.querySelector('occupancy')?.textContent?.trim())));
    const volumeSum = lanes
      .map((lane) => toNumber(lane.querySelector('volume')?.textContent?.trim()))
      .filter((v) => v != null)
      .reduce((sum, value) => sum + value, 0);

    metricsMap[detectorId.toUpperCase()] = {
      speed: speedAvg,
      occupancy: occupancyAvg,
      volume: volumeSum,
      dateTime,
    };
  });

  return metricsMap;
}

export default function TrafficDetectorLayer({ leafletMap }) {
  const detectorLayerRef = useRef(null);
  const detectorMarkerMapRef = useRef({});
  const detectorRefreshTimerRef = useRef(null);

  useEffect(() => {
    if (!DETECTOR_VISUALIZATION_ENABLED) return;
    if (!leafletMap || typeof window === 'undefined') return;
    const L = window.L;
    if (!L) return;

    const refreshDetectorMetrics = async () => {
      try {
        const response = await fetch(DETECTOR_TELEMETRY_XML_URL);
        if (!response.ok) throw new Error('Failed to load detector telemetry XML');

        const xmlText = await response.text();
        const metricsMap = parseXmlDetectorMetrics(xmlText);
        const markerOrder = [];

        Object.entries(metricsMap).forEach(([detectorId, metrics]) => {
          const markerEntry = detectorMarkerMapRef.current[detectorId];
          if (!markerEntry) return;
          updateDetectorPopup(markerEntry.marker, markerEntry.info, metrics);
          markerOrder.push({
            marker: markerEntry.marker,
            severity: getMetricSeverity(getDetectorColorValue(metrics)),
          });
        });

        // Layering priority: grey (bottom), green, yellow, red (top).
        markerOrder
          .sort((a, b) => a.severity - b.severity)
          .forEach(({ marker }) => {
            if (typeof marker.bringToFront === 'function') marker.bringToFront();
          });
      } catch (e) {
        console.warn('Failed to refresh detector telemetry', e);
      }
    };

    (async () => {
      try {
        const response = await fetch(DETECTOR_LOCATION_CSV_URL);
        if (!response.ok) throw new Error('Failed to load detector CSV');

        const csvText = await response.text();
        const detectors = parseDetectorCsv(csvText);

        const markers = detectors.map((detector) => {
          const marker = L.circleMarker([detector.lat, detector.lng], {
            radius: 3,
            fillColor: '#94a3b8',
            stroke: false,
            weight: 0,
            fillOpacity: 0.9,
            opacity: 0.9,
          });

          const info = {
            aid: detector.aid,
            roadEn: detector.roadEn,
            district: detector.district,
          };

          updateDetectorPopup(marker, info, null);
          detectorMarkerMapRef.current[detector.aid.toUpperCase()] = { marker, info };
          return marker;
        });

        detectorLayerRef.current = L.layerGroup(markers).addTo(leafletMap);
        refreshDetectorMetrics();
        detectorRefreshTimerRef.current = window.setInterval(refreshDetectorMetrics, 60000);
      } catch (e) {
        console.warn('Failed to load detector layer', e);
      }
    })();

    return () => {
      if (detectorRefreshTimerRef.current) {
        window.clearInterval(detectorRefreshTimerRef.current);
        detectorRefreshTimerRef.current = null;
      }
      if (detectorLayerRef.current) {
        try {
          detectorLayerRef.current.remove();
        } catch {
          // ignore cleanup errors
        }
        detectorLayerRef.current = null;
      }
      detectorMarkerMapRef.current = {};
    };
  }, [leafletMap]);

  return null;
}
