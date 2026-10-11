// src/analytics/analysis.js
export const SENSOR_RANGES = {
  temperature: { min: -40, max: 150, unit: '°C' },
  voltage: { min: 0, max: 600, unit: 'V' },
  soc: { min: 0, max: 100, unit: '%' },
  vibration: { min: 0, max: 200, unit: 'unit' },
  motorRpm: { min: 0, max: 8000, unit: 'RPM' },
  batteryCapacity: { min: 0, max: 10, unit: 'Ah' },
  internalResistance: { min: 0, max: 1, unit: 'Ω' }
};

export function anomalyFlagSeverity(flag) {
  return flag ? flag.severity : 0;
}

export function detectAnomaly(name, value, prevValue, histories) {
  const range = SENSOR_RANGES[name];
  if (!range) return { type: 'normal', severity: 0 };
  
  // Out of range (use validation result)
  // We'll rely on validationDetails elsewhere; here we just check raw vs range
  if (value < range.min || value > range.max) {
    const excessBelow = range.min - value;
    const excessAbove = value - range.max;
    const excess = Math.max(excessBelow, excessAbove);
    const severity = Math.min(excess / ((range.max - range.min) * 0.2), 1); // 20% of range as max
    return { type: 'outOfRange', severity };
  }
  
  // Spike: sudden change from previous validated value
  if (prevValue !== null) {
    const change = Math.abs(value - prevValue);
    const spikeThreshold = (range.max - range.min) * 0.15; // 15% of range
    if (change > spikeThreshold) {
      const severity = Math.min(change / ((range.max - range.min) * 0.3), 1); // cap at 30%
      return { type: 'spike', severity };
    }
  }
  
  // Drift: detect significant trend over recent window
  const hist = histories[name] || [];
  let driftSeverity = 0;
  if (hist.length >= 10) {
    // Use last 10 points to compute slope (simple linear regression)
    const recent = hist.slice(-10);
    const n = recent.length;
    const sumT = recent.reduce((s, p) => s + (p.t - recent[0].t), 0);
    const sumV = recent.reduce((s, p) => s + p.v, 0);
    const sumTV = recent.reduce((s, p) => s + p.t * p.v, 0);
    const sumT2 = recent.reduce((s, p) => s + p.t * p.t, 0);
    const slope = (n * sumTV - sumT * sumV) / (n * sumT2 - sumT * sumT);
    // Normalize slope by range and time window (per ms)
    const timeWindow = recent[recent.length - 1].t - recent[0].t;
    const normalizedSlope = Math.abs(slope) * (timeWindow > 0 ? 1000 / timeWindow : 0); // per second scaled
    // Expected drift per second threshold: 0.1% of range per second
    const driftThreshold = (range.max - range.min) * 0.001;
    if (normalizedSlope > driftThreshold) {
      driftSeverity = Math.min(normalizedSlope / (driftThreshold * 5), 1);
    }
  }
  
  // Statistical: detect deviation from recent mean using standard deviation (SPC-like)
  let statSeverity = 0;
  if (hist.length >= 10) {
    const values = hist.slice(-10).map(p => p.v);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const std = Math.sqrt(variance);
    if (std > 0) {
      const zScore = Math.abs((value - mean) / std);
      // Consider anomaly if |z| > 3, severity scaled up to 1 at |z| = 6
      statSeverity = Math.min(zScore / 3, 1);
    }
  }
  
  // If we have not returned due to outOfRange or spike, choose the highest severity among drift and statistical
  if (driftSeverity >= statSeverity) {
    if (driftSeverity > 0) {
      return { type: 'drift', severity: driftSeverity };
    }
  } else {
    if (statSeverity > 0) {
      return { type: 'statistical', severity: statSeverity };
    }
  }
  
  return { type: 'normal', severity: 0 };
}

export function diagnoseFault(anomalyFlags) {
  // Rule: battery capacity drift + soc drift -> battery degradation
  if (anomalyFlags.batteryCapacity && anomalyFlagSeverity(anomalyFlags.batteryCapacity) > 0.5 &&
      anomalyFlags.soc && anomalyFlagSeverity(anomalyFlags.soc) > 0.4) {
    return {
      subsystem: 'power',
      component: 'batteryPack',
      confidence: 0.85,
      message: '電池容量與 SOC 同時漂移，疑似電池老化加速'
    };
  }
  // Rule: voltage out of range + internal resistance drift -> power electronics issue
  if (anomalyFlags.voltage && anomalyFlagSeverity(anomalyFlags.voltage) > 0.6 &&
      anomalyFlags.internalResistance && anomalyFlagSeverity(anomalyFlags.internalResistance) > 0.5) {
    return {
      subsystem: 'power',
      component: 'powerElectronics',
      confidence: 0.78,
      message: '電壓異常並伴隨內部電阻漂移，可能是功率電子故障'
    };
  }
  // Rule: vibration spike + motorRpm normal -> mechanical imbalance or looseness
  if (anomalyFlags.vibration && anomalyFlagSeverity(anomalyFlags.vibration) > 0.7 &&
      (anomalyFlags.motorRpm?.type === 'normal' || !anomalyFlags.motorRpm)) {
    return {
      subsystem: 'structure',
      component: 'airframe',
      confidence: 0.8,
      message: '振動突升而轉速正常，疑似結構鬆脫或葉片不平衡'
    };
  }
  // Rule: multiple sensor spikes -> possible EMI or avionics glitch
  const spikeCount = Object.values(anomalyFlags).filter(f => f.type === 'spike').length;
  if (spikeCount >= 3) {
    return {
      subsystem: 'avionics',
      confidence: 0.7,
      message: '多個感測器同時出現突訊，可能是電磁干擾或航電故障'
    };
  }
  // Rule: temperature drift + voltage drift -> possible cooling system issue
  if (anomalyFlags.temperature && anomalyFlagSeverity(anomalyFlags.temperature) > 0.5 &&
      anomalyFlags.voltage && anomalyFlagSeverity(anomalyFlags.voltage) > 0.4) {
    return {
      subsystem: 'power',
      component: 'coolingSystem',
      confidence: 0.72,
      message: '溫度與電壓同時漂移，可能散熱系統效能下降'
    };
  }
  // Rule: high vibration + high temperature -> bearing wear
  if (anomalyFlags.vibration && anomalyFlagSeverity(anomalyFlags.vibration) > 0.6 &&
      anomalyFlags.temperature && anomalyFlagSeverity(anomalyFlags.temperature) > 0.6) {
    return {
      subsystem: 'structure',
      component: 'bearing',
      confidence: 0.75,
      message: '振動與溫度同時升高，疑似軸承磨損'
    };
  }
  // Rule: rapid SOC drop + high temperature -> thermal runaway risk
  if (anomalyFlags.soc && anomalyFlagSeverity(anomalyFlags.soc) > 0.6 &&
      anomalyFlags.temperature && anomalyFlagSeverity(anomalyFlags.temperature) > 0.7) {
    return {
      subsystem: 'power',
      component: 'batteryThermalManagement',
      confidence: 0.8,
      message: 'SOC 快速下降伴隨高溫，熱失控風險'
    };
  }
  // Rule: increasing internal resistance + capacity fade -> aging acceleration
  if (anomalyFlags.internalResistance && anomalyFlagSeverity(anomalyFlags.internalResistance) > 0.5 &&
      anomalyFlags.batteryCapacity && anomalyFlagSeverity(anomalyFlags.batteryCapacity) > 0.4) {
    return {
      subsystem: 'power',
      component: 'batteryPack',
      confidence: 0.7,
      message: '內部電阻增加及容量衰減，電池老化加速'
    };
  }
  return null;
}

export function predictBatteryRUL(aircraft, histories) {
  const capHist = histories.capacity || [];
  if (capHist.length < 5) return null; // need sufficient data for regression
  
  // Prepare data: convert timestamps to hours since first point for numerical stability
  const times = capHist.map(p => p.t);
  const capacities = capHist.map(p => p.v);
  const t0 = times[0];
  const x = times.map(t => (t - t0) / 3.6e6); // hours since first point
  const y = capacities;
  const n = x.length;
  
  // Calculate sums needed for linear regression
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += x[i];
    sumY += y[i];
    sumXY += x[i] * y[i];
    sumXX += x[i] * x[i];
  }
  
  // Calculate slope (b) and intercept (a): y = a + b*x
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return null; // avoid division by zero
  const b = (n * sumXY - sumX * sumY) / denom; // slope
  const a = (sumY - b * sumX) / n; // intercept
  
  // A non-negative slope means there is no predicted capacity degradation.
  if (b >= 0) return { status: 'max', rul: null, lower: null, upper: null, slope: b, intercept: a };
  
  // Predicted capacity at current time (using latest timestamp)
  const tNow = (times[times.length - 1] - t0) / 3.6e6; // hours since first point
  // Use actual latest capacity from aircraft state for more accuracy
  const capacityNowActual = aircraft.batteryCapacity;
  
  const capacityMin = 2.0; // Ah, practical minimum
  if (capacityNowActual <= capacityMin) {
    return { rul: 0, lower: 0, upper: 0, slope: b, intercept: a };
  }
  
  // Time when capacity reaches minimum: solve capacityMin = a + b * t => t = (capacityMin - a) / b
  const tMin = (capacityMin - a) / b;
  const rulHours = tMin - tNow; // remaining useful life in hours
  if (rulHours < 0) return { rul: 0, lower: 0, upper: 0, slope: b, intercept: a };
  
  // Calculate confidence interval for RUL using delta method
  // First, compute residual sum of squares and variance estimate
  let ssr = 0;
  for (let i = 0; i < n; i++) {
    const yPred = a + b * x[i];
    ssr += Math.pow(y[i] - yPred, 2);
  }
  const sigmaSq = ssr / (n - 2); // variance of residuals
  if (sigmaSq <= 0) return { rul: Math.max(rulHours, 0), lower: Math.max(rulHours, 0), upper: Math.max(rulHours, 0), slope: b, intercept: a };
  
  // Standard errors of slope and intercept
  const sumXXDev = sumXX - (sumX * sumX) / n; // Σ(xi - x̄)^2
  const seB = Math.sqrt(sigmaSq / sumXXDev); // standard error of slope
  const seA = Math.sqrt(sigmaSq * (1 / n + (sumX * sumX) / (n * sumXXDev))); // standard error of intercept
  // Covariance of intercept and slope
  const xBar = sumX / n;
  const covAB = - xBar * sigmaSq / sumXXDev;
  
  // Partial derivatives of tMin with respect to a and b
  // tMin = (capacityMin - a) / b
  const dtMinDa = -1 / b;
  const dtMinDb = -(capacityMin - a) / (b * b);
  
  // Variance of tMin using delta method
  const varTMin = dtMinDa * dtMinDa * seA * seA +
                  dtMinDb * dtMinDb * seB * seB +
                  2 * dtMinDa * dtMinDb * covAB;
  const seTMin = Math.sqrt(Math.max(varTMin, 0));
  
  // Use t-distribution critical value for 95% CI, degrees of freedom = n-2
  // For simplicity, use 2.0 for large n, otherwise we could use a table; we'll use 2.0 for n>10, else larger
  let tCrit = 2.0;
  if (n - 2 < 10) tCrit = 2.5; // rough approximation
  
  const margin = tCrit * seTMin;
  const lower = Math.max(rulHours - margin, 0);
  const upper = rulHours + margin;
  
  return { rul: Math.max(rulHours, 0), lower: Math.max(lower, 0), upper: Math.max(upper, 0), slope: b, intercept: a };
}

export function predictStructuralRUL(aircraft, histories) {
  const damageHist = histories.structuralDamage || [];
  if (damageHist.length < 5) return null; // need sufficient data for regression
  
  // Prepare data: convert timestamps to hours since first point for numerical stability
  const times = damageHist.map(p => p.t);
  const damages = damageHist.map(p => p.v);
  const t0 = times[0];
  const x = times.map(t => (t - t0) / 3.6e6); // hours since first point
  const y = damages;
  const n = x.length;
  
  // Calculate sums needed for linear regression
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += x[i];
    sumY += y[i];
    sumXY += x[i] * y[i];
    sumXX += x[i] * x[i];
  }
  
  // Calculate slope (b) and intercept (a): y = a + b*x
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return null; // avoid division by zero
  const b = (n * sumXY - sumX * sumY) / denom; // slope
  const a = (sumY - b * sumX) / n; // intercept
  
  // A non-positive slope means there is no predicted structural degradation.
  if (b <= 0) return { status: 'max', rul: null, lower: null, upper: null, slope: b, intercept: a };
  
  // Predicted damage at current time (using latest timestamp)
  const tNow = (times[times.length - 1] - t0) / 3.6e6; // hours since first point
  // Use actual latest damage from aircraft state for more accuracy
  const damageNowActual = aircraft.structuralDamage;
  
  const damageMax = 1.0; // maximum damage (failure)
  if (damageNowActual >= damageMax) {
    return { rul: 0, lower: 0, upper: 0, slope: b, intercept: a };
  }
  
  // Time when damage reaches maximum: solve damageMax = a + b * t => t = (damageMax - a) / b
  const tMax = (damageMax - a) / b;
  const rulHours = tMax - tNow; // remaining useful life in hours
  if (rulHours < 0) return { rul: 0, lower: 0, upper: 0, slope: b, intercept: a };
  
  // Calculate confidence interval for RUL using delta method
  // First, compute residual sum of squares and variance estimate
  let ssr = 0;
  for (let i = 0; i < n; i++) {
    const yPred = a + b * x[i];
    ssr += Math.pow(y[i] - yPred, 2);
  }
  const sigmaSq = ssr / (n - 2); // variance of residuals
  if (sigmaSq <= 0) return { rul: Math.max(rulHours, 0), lower: Math.max(rulHours, 0), upper: Math.max(rulHours, 0), slope: b, intercept: a };
  
  // Standard errors of slope and intercept
  const sumXXDev = sumXX - (sumX * sumX) / n; // Σ(xi - x̄)^2
  const seB = Math.sqrt(sigmaSq / sumXXDev); // standard error of slope
  const seA = Math.sqrt(sigmaSq * (1 / n + (sumX * sumX) / (n * sumXXDev))); // standard error of intercept
  // Covariance of intercept and slope
  const xBar = sumX / n;
  const covAB = - xBar * sigmaSq / sumXXDev;
  
  // Partial derivatives of tMax with respect to a and b
  // tMax = (damageMax - a) / b
  const dtMaxDa = -1 / b;
  const dtMaxDb = -(damageMax - a) / (b * b);
  
  // Variance of tMax using delta method
  const varTMax = dtMaxDa * dtMaxDa * seA * seA +
                  dtMaxDb * dtMaxDb * seB * seB +
                  2 * dtMaxDa * dtMaxDb * covAB;
  const seTMax = Math.sqrt(Math.max(varTMax, 0));   
  
  // Use t-distribution critical value for 95% CI, degrees of freedom = n-2
  // For simplicity, use 2.0 for large n, otherwise we could use a table; we'll use 2.0 for n>10, else larger
  let tCrit = 2.0;
  if (n - 2 < 10) tCrit = 2.5; // rough approximation
  
  const margin = tCrit * seTMax;
  const lower = Math.max(rulHours - margin, 0);
  const upper = rulHours + margin;
  
  return { rul: Math.max(rulHours, 0), lower: Math.max(lower, 0), upper: Math.max(upper, 0), slope: b, intercept: a };
}