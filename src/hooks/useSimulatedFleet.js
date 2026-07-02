import { useEffect, useState } from 'react';

export default function useSimulatedFleet(fleet) {
  const [liveFleet, setLiveFleet] = useState(fleet);

  useEffect(() => {
    setLiveFleet(fleet);
    const interval = setInterval(() => {
      setLiveFleet((prev) => {
        return (prev || []).map((aircraft) => {
          const jitter = (val, maxVariation) => typeof val !== 'number' ? val : Number((val + (Math.random() - 0.5) * maxVariation).toFixed(1));
          const newTemp = jitter(aircraft.temperature, 0.6);
          const newVib = jitter(aircraft.vibration, 2);
          const newRpm = jitter(aircraft.motorRpm, 150);

          let newTrends = aircraft.pdm?.trends ? [...aircraft.pdm.trends] : [];
          const now = new Date();
          const timeStr = `${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
          newTrends.push({ t: timeStr, temp: newTemp, vib: newVib, rpm: newRpm });
          if (newTrends.length > 15) newTrends.shift();

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
            trends: newTrends.length > 0 ? newTrends : aircraft.pdm?.trends,
          },
        };
        });
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [fleet]);

  return liveFleet;
}

