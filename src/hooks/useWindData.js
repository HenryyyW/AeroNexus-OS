import { useEffect, useState } from 'react';

function convertToWeatherProxyUrl(originalUrl) {
  const targetDomain = 'https://data.weather.gov.hk';
  const proxyPrefix = '/api/weather';
  if (originalUrl.startsWith(targetDomain)) {
    return originalUrl.replace(targetDomain, proxyPrefix);
  }
  return originalUrl;
}

export default function useWindData(stationUrl) {
  const [windData, setWindData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!stationUrl) return;
    setLoading(true);
    setError(null);

    const fetchWindData = async () => {
      try {
        const proxyURL = convertToWeatherProxyUrl(stationUrl);
        const response = await fetch(proxyURL);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const csv = await response.text();
        const lines = csv.trim().split('\n');
        if (lines.length < 2) {
          setWindData(null);
          return;
        }
        const headers = lines[0].split(',').map((h) => h.trim());
        const lastLine = lines[lines.length - 1].split(',').map((v) => v.trim());
        const data = {};
        headers.forEach((header, idx) => { data[header] = lastLine[idx]; });
        setWindData(data);
        setError(null);
      } catch (err) {
        console.warn('Failed to fetch wind data:', err);
        setError('Unable to load wind data');
        setWindData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchWindData();
  }, [stationUrl]);

  return { windData, loading, error };
}
