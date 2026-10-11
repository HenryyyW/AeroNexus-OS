import { useTelemetryStore } from '../store/useTelemetryStore';
import { 
  detectAnomaly, 
  anomalyFlagSeverity,
  diagnoseFault
} from '../analytics/analysis';
import sops from '../config/sops.json';

/**
 * FlightOps Agent Hook
 * Provides anomaly explanation and operational Q&A functionalities.
 */
export const useFlightOpsAgent = (aircraft = null) => {
  const { selectedUnit, telemetry, history, faultyUnit } = useTelemetryStore();

  /**
   * Get anomaly flags for a given telemetry object (at a point in time)
   * Returns an object mapping sensor names to their anomaly flag objects.
   */
  const getAnomalyFlags = (tel) => {
    const flags = {};
    const sensorNames = ['temperature', 'voltage', 'soc', 'vibration', 'motorRpm', 'batteryCapacity', 'internalResistance'];
    // Note: voltage and internalResistance may not be directly in telemetry; we approximate from available data.
    // For simplicity, we use what we have; missing sensors will be treated as normal.
    sensorNames.forEach(name => {
      const value = tel[name];
      if (value === null || value === undefined || !Number.isFinite(Number(value))) return;
      const prevValue = null; // In real implementation, we'd need previous value; we can approximate using history.
      const sensorHist = getSensorHistory(name);
      const result = detectAnomaly(name, Number(value), prevValue, { [name]: sensorHist });
      flags[name] = result;
    });
    return flags;
  };

  /**
   * Get history array for a specific sensor from the global history.
   * Each entry: { t: timestampInMs, v: value }
   */
  const getSensorHistory = (sensorName) => {
    // Convert history array to sensor-specific format
    return history.map(entry => {
      // We need to map time string to milliseconds since epoch for consistency.
      // For simplicity, we'll use a placeholder timestamp; in real app we should store proper timestamps.
      const timestamp = parseHistoryTime(entry.time);
      if (timestamp === null || entry[sensorName] === null || entry[sensorName] === undefined) return null;
      return {
        t: timestamp,
        v: Number(entry[sensorName])
      };
    }).filter(Boolean);
  };

  /**
   * Explain an anomaly for the selected unit at the current time (or given timestamp).
   * @param {Object} opts - { timestamp?: Date } optional timestamp to examine.
   * @returns {Object} Explanation including subsystem, component, confidence, message, raw flags, and SOP.
   */
  const explainAnomaly = ({ timestamp } = {}) => {
    // Determine which telemetry to use: if timestamp provided, find closest history entry; else use current telemetry.
    let tel = aircraft ? {
      ...aircraft,
      internalResistance: aircraft.batteryInternalResistance
    } : telemetry;
    if (timestamp) {
      // Find history entry closest to timestamp
      const targetTime = timestamp.getTime();
      const closest = history.reduce((best, curr) => {
        const currTime = parseHistoryTime(curr.time);
        if (currTime === null) return best;
        const bestTime = best ? parseHistoryTime(best.time) : null;
        return bestTime === null || Math.abs(currTime - targetTime) < Math.abs(bestTime - targetTime) ? curr : best;
      }, null);
      // Build telemetry object from history entry
      if (closest) {
        tel = {};
        Object.keys(closest).forEach(key => {
          if (key !== 'time') tel[key] = closest[key];
        });
      }
    }

    // Get anomaly flags for each sensor
    const flags = aircraft && !timestamp && aircraft.anomalyFlags
      ? aircraft.anomalyFlags
      : getAnomalyFlags(tel);
    // Compute severity for each flag
    const flagSeverities = {};
    Object.keys(flags).forEach(key => {
      flagSeverities[key] = anomalyFlagSeverity(flags[key]);
    });

    // Run fault diagnosis
    const fault = aircraft && !timestamp ? aircraft.diagnosis : diagnoseFault(flags);
    
    // Get SOP recommendation if fault detected
    let sopRecommendation = null;
    if (fault && sops[fault.component]) {
      sopRecommendation = sops[fault.component];
    }

    return {
      timestamp: timestamp ?? new Date(),
      telemetry: tel,
      anomalyFlags: flags,
      flagSeverities,
      faultDiagnosis: fault,
      sop: sopRecommendation,
      // Additional context: selected unit, faulty unit from store
      context: {
        selectedUnit: aircraft?.id ?? selectedUnit,
        faultyUnit
      }
    };
  };

  /**
   * Get critical alerts within the last N hours.
   * @param {number} hours - Lookback window in hours (default 24).
   * @returns {Array} List of alert objects, each with time, fault diagnosis, and severity.
   */
  const getCriticalAlerts = (hours = 24) => {
    const cutoffTime = Date.now() - hours * 60 * 60 * 1000;
    // We need to convert history entries to timestamps; we'll approximate using today's date.
    // For production, ensure history stores proper timestamps.
    const alerts = [];
    history.forEach(entry => {
      // Convert entry.time to timestamp (assuming today)
      const timeStr = entry.time;
      const [h, m, s] = timeStr.split(':').map(Number);
      const now = new Date();
      const entryTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, s).getTime();
      
      if (entryTime >= cutoffTime) {
        // Build telemetry object from entry
        const tel = {};
        Object.keys(entry).forEach(key => {
          if (key !== 'time') tel[key] = entry[key];
        });
        const flags = getAnomalyFlags(tel);
        const fault = diagnoseFault(flags);
        // Consider critical if fault detected with confidence > 0.6 or any flag severity > 0.8
        const isCritical = fault && fault.confidence > 0.6;
        if (isCritical) {
          alerts.push({
            time: new Date(entryTime),
            telemetry: tel,
            anomalyFlags: flags,
            faultDiagnosis: fault,
            severity: Math.max(...Object.values(flags).map(f => anomalyFlagSeverity(f)))
          });
        }
      }
    });
    return alerts;
  };

  /**
   * Get frequency of battery-related anomalies in the last N hours.
   * @param {number} hours - Lookback window in hours (default 24).
   * @returns {Object} Counts per battery-related sensor and total.
   */
  const getBatteryAnomalyFrequency = (hours = 24) => {
    const cutoffTime = Date.now() - hours * 60 * 60 * 1000;
    const batterySensors = ['soc', 'voltage', 'temperature', 'internalResistance', 'batteryCapacity'];
    const counts = batterySensors.reduce((acc, sensor) => {
      acc[sensor] = 0;
      return acc;
    }, {});
    let total = 0;

    history.forEach(entry => {
      const timeStr = entry.time;
      const [h, m, s] = timeStr.split(':').map(Number);
      const now = new Date();
      const entryTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, s).getTime();
      
      if (entryTime >= cutoffTime) {
        const tel = {};
        Object.keys(entry).forEach(key => {
          if (key !== 'time') tel[key] = entry[key];
        });
        batterySensors.forEach(sensor => {
          const value = tel[sensor];
          if (value !== undefined) {
            // Simple threshold-based anomaly detection for demonstration
            // In reality, use detectAnomaly with history.
            // We'll just flag if value is outside typical ranges (placeholder).
            let isAnomaly = false;
            switch (sensor) {
              case 'soc':
                isAnomaly = value < 20 || value > 95;
                break;
              case 'voltage':
                isAnomaly = value < 300 || value > 650;
                break;
              case 'temperature':
                isAnomaly = value < 0 || value > 80;
                break;
              case 'internalResistance':
                isAnomaly = value > 0.05; // example threshold
                break;
              case 'batteryCapacity':
                isAnomaly = value < 2.0; // Ah
                break;
            }
            if (isAnomaly) {
              counts[sensor] += 1;
              total += 1;
            }
          }
        });
      }
    });

    return {
      perSensor: counts,
      total,
      lookbackHours: hours
    };
  };

  /**
   * Get state (telemetry) before and after a specific alert time.
   * @param {Date} alertTime - The time of the alert.
   * @param {number} beforeMinutes - Minutes before alert to include.
   * @param {number} afterMinutes - Minutes after alert to include.
   * @returns {Object} Contains 'before', 'at', 'after' arrays of telemetry entries.
   */
  const getStateAroundAlert = (alertTime, beforeMinutes = 10, afterMinutes = 10) => {
    const beforeMs = beforeMinutes * 60 * 1000;
    const afterMs = afterMinutes * 60 * 1000;
    const alertMs = alertTime.getTime();
    
    const before = [];
    const at = [];
    const after = [];
    
    history.forEach(entry => {
      const timeStr = entry.time;
      const [h, m, s] = timeStr.split(':').map(Number);
      const now = new Date();
      const entryTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, s).getTime();
      
      if (entryTime >= alertMs - beforeMs && entryTime <= alertMs + afterMs) {
        const tel = {};
        Object.keys(entry).forEach(key => {
          if (key !== 'time') tel[key] = entry[key];
        });
        const entryObj = { time: new Date(entryTime), telemetry: tel };
        
        if (entryTime < alertMs - 1000) { // before by at least 1 second
          before.push(entryObj);
        } else if (entryTime > alertMs + 1000) { // after by at least 1 second
          after.push(entryObj);
        } else {
          at.push(entryObj);
        }
      }
    });
    
    // Sort by time
    before.sort((a, b) => a.time - b.time);
    at.sort((a, b) => a.time - b.time);
    after.sort((a, b) => a.time - b.time);
    
    return { before, at, after };
  };

  return {
    explainAnomaly,
    getCriticalAlerts,
    getBatteryAnomalyFrequency,
    getStateAroundAlert,
    // Expose raw data if needed
    telemetry,
    history,
    selectedUnit,
    faultyUnit
  };
};

function parseHistoryTime(time) {
  if (typeof time !== 'string') return null;
  const [hours, minutes, seconds] = time.split(':').map(Number);
  if (![hours, minutes, seconds].every(Number.isFinite)) return null;
  const date = new Date();
  date.setHours(hours, minutes, seconds, 0);
  return date.getTime();
}
