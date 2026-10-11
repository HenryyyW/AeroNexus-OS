import { useEffect, useState, useRef } from 'react';

import { predictBatteryRUL as analyzeBatteryRUL, predictStructuralRUL as analyzeStructuralRUL } from '../analytics/analysis.js';



// Validation ranges for sensor data

const SENSOR_RANGES = {

  temperature: { min: -40, max: 150, unit: '°C' },

  voltage: { min: 0, max: 600, unit: 'V' },

  soc: { min: 0, max: 100, unit: '%' },

  vibration: { min: 0, max: 200, unit: 'unit' },

  motorRpm: { min: 0, max: 8000, unit: 'RPM' },

  batteryCapacity: { min: 0, max: 10, unit: 'Ah' },

  internalResistance: { min: 0, max: 1, unit: 'Ω' }

};



// Validate sensor reading and return { value, valid, corrected }

function validateSensor(name, value, previousValue) {

  const range = SENSOR_RANGES[name];

  if (!range) return { value, valid: true, corrected: false };



  if (value === null || value === undefined || Number.isNaN(value)) {

    return {

      value: previousValue ?? range.min,

      valid: false,

      corrected: true,

      reason: 'missing_or_nan'

    };

  }



  if (value < range.min || value > range.max) {

    return {

      value: previousValue ?? Math.max(range.min, Math.min(range.max, value)),

      valid: false,

      corrected: true,

      reason: 'out_of_range'

    };

  }



  return { value, valid: true, corrected: false };

}



// Calculate confidence score based on multiple factors

function calculateConfidence(factors) {

  const {

    sensorHealth = 1.0,      // 0-1, proportion of healthy sensors

    dataFreshness = 1.0,     // 0-1, how recent the data is

    modelUncertainty = 0.95, // 0-1, model inherent uncertainty

    packetLossRate = 0.0,    // 0-1, recent packet loss rate

    validationScore = 1.0    // 0-1, proportion of validated sensors

  } = factors;



  // Weighted geometric mean for confidence

  const weights = {

    sensorHealth: 0.30,

    dataFreshness: 0.25,

    modelUncertainty: 0.20,

    packetLossRate: 0.15,

    validationScore: 0.10

  };



  const packetLossFactor = 1 - packetLossRate;



  const confidence = Math.pow(sensorHealth, weights.sensorHealth) *

                     Math.pow(dataFreshness, weights.dataFreshness) *

                     Math.pow(modelUncertainty, weights.modelUncertainty) *

                     Math.pow(packetLossFactor, weights.packetLossRate) *

                     Math.pow(validationScore, weights.validationScore);



  return Math.max(0, Math.min(1, confidence));

}



// Compute data freshness based on time since last valid update

function computeDataFreshness(lastValidTimestamp, maxAgeMs = 10000) {

  if (!lastValidTimestamp) return 0;

  const age = Date.now() - new Date(lastValidTimestamp).getTime();

  if (age <= 0) return 1;

  return Math.max(0, 1 - age / maxAgeMs);

}



// Initialize physics state for each aircraft

function initializePhysicsState(initialFleet) {

  return initialFleet.map((aircraft) => {

    if (aircraft._physicsInit) return aircraft;

    const socFraction = aircraft.soc != null ? aircraft.soc / 100 : 0.8;

    return {

      ...aircraft,

      _physicsInit: true,

      batterySOC: socFraction,

      batteryCapacity: 5.0,

      batteryInternalResistance: 0.05,

      batteryVpol: 0.0,

      motorCurrent: 0.0,

      motorTorque: 0.0,

      structuralDamage: 0.0,

      _lastValidUpdate: null,

      _packetLossCount: 0,

      _totalUpdates: 0,

      _sensorHealthHistory: [],

      // For anomaly detection we need histories

      _histories: {}, // will be filled per sensor

      _prevValues: {} // previous validated values for spike detection

    };

  });

}



// Update history buffer for a sensor

function updateHistory(histories, name, value, maxLen = 50) {

  if (!histories[name]) histories[name] = [];

  histories[name].push({ t: Date.now(), v: value });

  if (histories[name].length > maxLen) histories[name].shift();

  return histories;

}



// Detect anomalies for a sensor

function detectAnomaly(name, value, prevValue, histories) {

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



// Fault diagnosis based on anomaly flags

function diagnoseFault(anomalyFlags) {

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

  return null;

}



function anomalyFlagSeverity(flag) {

  return flag ? flag.severity : 0;

}



export default function useSimulatedFleet(fleet) {

  const [liveFleet, setLiveFleet] = useState(() => initializePhysicsState(fleet));

  const [previousFleet, setPreviousFleet] = useState(fleet);

  const historyRef = useRef({}); // map aircraft id -> { histories, prevValues }



  if (fleet !== previousFleet) {

    setPreviousFleet(fleet);

    setLiveFleet(initializePhysicsState(fleet));

  }



  useEffect(() => {

    historyRef.current = {};

    fleet.forEach(ac => {

      historyRef.current[ac.id] = { histories: {}, prevValues: {} };

    });

  }, [fleet]);



  useEffect(() => {

    const interval = setInterval(() => {

      setLiveFleet((prev) => {

        return (prev || []).map((aircraft) => {

          const now = new Date();

          const eventTime = now.toISOString();

          const processingTime = now.getTime();



          // Ensure history entry exists

          if (!historyRef.current[aircraft.id]) {

            historyRef.current[aircraft.id] = { histories: {}, prevValues: {} };

          }

          const { histories, prevValues } = historyRef.current[aircraft.id];



          // Track update counts for packet loss rate

          const totalUpdates = (aircraft._totalUpdates ?? 0) + 1;



          // --- Packet loss simulation (10% chance to skip update) ---

          const isPacketLoss = Math.random() < 0.1;

          const packetLossCount = (aircraft._packetLossCount ?? 0) + (isPacketLoss ? 1 : 0);



          if (isPacketLoss) {

            // Return aircraft with updated tracking but same physical state

            return {

              ...aircraft,

              _totalUpdates: totalUpdates,

              _packetLossCount: packetLossCount,

              // Update confidence even on packet loss (degraded)

              confidence: calculateConfidence({

                sensorHealth: 0.5,

                dataFreshness: computeDataFreshness(aircraft._lastValidUpdate),

                packetLossRate: packetLossCount / totalUpdates,

                validationScore: 0.5

              })

            };

          }



          const dt = 1.5; // seconds (matches interval)

          const rawTemp = aircraft.temperature ?? 25;

          const T_C = rawTemp;

          const T_K = T_C + 273.15;

          const R_GAS = 8.314;



          // ----- Constants -----

          const Q_NOM = 5.0;

          const Q_NOM_AS = Q_NOM * 3600;

          const R0_REF = 0.05;

          const Ea_R = 30000;

          const T_REF = 298.15;

          const CAP_LOSS_RATE_REF = 1e-8;

          const Ea_CAP = 40000;

          const m_CAP = 1.0;

          const n_CAP = 0.5;

          const I_REF = 10.0;



          const R0 = R0_REF * Math.exp((Ea_R / R_GAS) * (1/T_K - 1/T_REF));

          const capLossRate = CAP_LOSS_RATE_REF *

            Math.exp((Ea_CAP / R_GAS) * (1/T_K - 1/T_REF)) *

            Math.pow(Math.max(aircraft.batterySOC ?? 0.8, 0.001), m_CAP) *

            Math.pow(Math.max(Math.abs(aircraft.motorCurrent ?? 0), 0.001) / I_REF, n_CAP);



          // ----- Battery ECM & SOC update -----

          const kPower = 1e-7;

          const P_mech = kPower * Math.pow(aircraft.motorRpm ?? 0, 2);

          const eta = 0.9;

          const P_elec = P_mech / eta;

          const V_term = aircraft.voltage ?? 3.7 * 2;

          const I = P_elec / Math.max(V_term, 0.1);

          const I_clamped = Math.min(Math.max(I, -50), 50);



          // Update SOC (Coulomb counting)

          let soc = aircraft.batterySOC ?? 0.8;

          soc = soc - (I_clamped * dt) / Q_NOM_AS;

          soc = Math.min(Math.max(soc, 0), 1);



          // Update polarization voltage (first-order RC)

          const Rpol = 0.02;

          const Cpol = 5000;

          let Vpol = aircraft.batteryVpol ?? 0.0;

          Vpol += dt * (I_clamped / Cpol - Vpol / (Rpol * Cpol));



          // Open-circuit voltage approximation

          const OCV0 = 3.0;

          const OCV1 = 0.8;

          const OCV = OCV0 + OCV1 * soc;

          const alpha_T = 0.001;

          const OCV_T = OCV * (1 + alpha_T * (T_C - 25));

          const Vterminal = OCV_T - I_clamped * 0.01 - Vpol;

          const newVoltage = Math.max(Vterminal, 0);



          // Update battery capacity (fade)

          let capacity = aircraft.batteryCapacity ?? Q_NOM;

          capacity = Math.max(capacity - capLossRate * dt, 2.0);

          const internalResistance = R0;



          // Keep the configured speed until a motor demand and inertia model are available.

          const motorRpmNew = Math.max(aircraft.motorRpm ?? 0, 0);

          const motorCurrentNew = I_clamped;



          // ----- Structural fatigue -----

          const Kstress = 1e6;

          const stressMPa = (Kstress * Math.max(aircraft.vibration ?? 0, 0)) / 1e6;

          const A = 12.0;

          const fatigueExponent = 3.0;

          let N = 1;

          if (stressMPa > 0) {

            N = Math.pow(10, A - fatigueExponent * Math.log10(stressMPa));

          }

          const freq = 20.0;

          const damagePerSecond = (freq / N) > 0 ? (freq / N) : 0;

          let damage = aircraft.structuralDamage ?? 0;

          damage = Math.min(damage + damagePerSecond * dt, 1.0);

          const remainingLifePct = (1 - damage) * 100;



          // ----- Sensor Validation & Health Flags -----

          const prevVoltage = aircraft.voltage;

          const prevSoc = aircraft.batterySOC ?? soc;

          const prevVibration = aircraft.vibration;

          const prevMotorRpm = aircraft.motorRpm;



          const tempValidation = validateSensor('temperature', T_C, aircraft.temperature);

          const voltageValidation = validateSensor('voltage', newVoltage, prevVoltage);

          const socValidation = validateSensor('soc', soc * 100, prevSoc * 100);

          const vibrationValidation = validateSensor('vibration', aircraft.vibration ?? 0, prevVibration);

          const motorRpmValidation = validateSensor('motorRpm', motorRpmNew, prevMotorRpm);

          const capacityValidation = validateSensor('batteryCapacity', capacity, aircraft.batteryCapacity);

          const resistanceValidation = validateSensor('internalResistance', internalResistance, aircraft.batteryInternalResistance);



          // Use validated values for state

          const validatedTemp = tempValidation.value;

          const validatedVoltage = voltageValidation.value;

          const validatedSoc = socValidation.value / 100; // back to fraction

          const validatedVibration = vibrationValidation.value;

          const validatedMotorRpm = motorRpmValidation.value;

          const validatedCapacity = capacityValidation.value;

          const validatedResistance = resistanceValidation.value;



          // Sensor health flags

          const sensorOK = {

            temperature: tempValidation.valid,

            voltage: voltageValidation.valid,

            soc: socValidation.valid,

            vibration: vibrationValidation.valid,

            motorRpm: motorRpmValidation.valid,

            batteryCapacity: capacityValidation.valid,

            internalResistance: resistanceValidation.valid

          };



          // Validation details for debugging/traceability

          const validationDetails = {

            temperature: tempValidation,

            voltage: voltageValidation,

            soc: socValidation,

            vibration: vibrationValidation,

            motorRpm: motorRpmValidation,

            batteryCapacity: capacityValidation,

            internalResistance: resistanceValidation

          };



          // Update histories for each sensor (using validated values)

          updateHistory(histories, 'temperature', validatedTemp);

          updateHistory(histories, 'voltage', validatedVoltage);

          updateHistory(histories, 'soc', validatedSoc * 100); // keep as % for consistency

          updateHistory(histories, 'vibration', validatedVibration);

          updateHistory(histories, 'motorRpm', validatedMotorRpm);

          updateHistory(histories, 'batteryCapacity', validatedCapacity);

          updateHistory(histories, 'internalResistance', validatedResistance);

          // Also store structural damage history for RUL

          updateHistory(histories, 'structuralDamage', damage);



          // Detect anomalies

          const anomalyFlags = {};

          const sensorNames = ['temperature', 'voltage', 'soc', 'vibration', 'motorRpm', 'batteryCapacity', 'internalResistance'];

          sensorNames.forEach(name => {

            const cur = (name === 'soc') ? validatedSoc * 100 :

                       (name === 'batteryCapacity') ? validatedCapacity :

                       (name === 'internalResistance') ? validatedResistance :

                       (name === 'temperature') ? validatedTemp :

                       (name === 'voltage') ? validatedVoltage :

                       (name === 'vibration') ? validatedVibration :

                       (name === 'motorRpm') ? validatedMotorRpm : 0;

            const prev = prevValues[name] ?? null;

            anomalyFlags[name] = detectAnomaly(name, cur, prev, histories);

            // store current as previous for next tick

            prevValues[name] = cur;

          });



          // Count healthy sensors

          const healthyCount = Object.values(sensorOK).filter(v => v).length;

          const totalSensors = Object.keys(sensorOK).length;

          const sensorHealthRatio = healthyCount / totalSensors;

          const validationScore = Object.values(validationDetails).filter(v => v.valid).length / totalSensors;



          // Update last valid timestamp

          const lastValidUpdate = eventTime;



          // Packet loss rate

          const packetLossRate = packetLossCount / totalUpdates;



          // Data freshness

          const dataFreshness = computeDataFreshness(lastValidUpdate);



          // ----- Confidence Calculation -----

          const confidence = calculateConfidence({

            sensorHealth: sensorHealthRatio,

            dataFreshness,

            modelUncertainty: 0.95,

            packetLossRate,

            validationScore

          });



          // Health calculation based on validated data

          const healthFromCapacity = (validatedCapacity / Q_NOM) * 100;

          const healthFromStructure = (aircraft.componentHealth?.frame ?? 100) * (1 - damage);

          const health = Number(Math.min(healthFromCapacity, healthFromStructure).toFixed(1));



          // Fault diagnosis

          const diagnosis = diagnoseFault(anomalyFlags);



          // RUL predictions

          const predictionAircraft = {

            ...aircraft,

            batteryCapacity: validatedCapacity,

            structuralDamage: damage

          };

          const predictionHistories = { ...histories, capacity: histories.batteryCapacity };

          const predictedBattery = analyzeBatteryRUL(predictionAircraft, predictionHistories);

          const predictedStructural = analyzeStructuralRUL(predictionAircraft, predictionHistories);

          let predictedRul = null;

          let predictedRulStatus = 'unknown';

          let rulCiLower = null;

          let rulCiUpper = null;

          let batterySlope = null;

          let batteryIntercept = null;

          let damageSlope = null;

          let damageIntercept = null;

          if (predictedBattery !== null) {

            batterySlope = predictedBattery.slope;

            batteryIntercept = predictedBattery.intercept;

          }

          if (predictedStructural !== null) {

            damageSlope = predictedStructural.slope;

            damageIntercept = predictedStructural.intercept;

          }

          const batteryHasFiniteRul = Number.isFinite(predictedBattery?.rul);

          const structureHasFiniteRul = Number.isFinite(predictedStructural?.rul);

          if (batteryHasFiniteRul && structureHasFiniteRul) {

            if (predictedBattery.rul <= predictedStructural.rul) {

              predictedRul = predictedBattery.rul;

              rulCiLower = predictedBattery.lower;

              rulCiUpper = predictedBattery.upper;

            } else {

              predictedRul = predictedStructural.rul;

              rulCiLower = predictedStructural.lower;

              rulCiUpper = predictedStructural.upper;

            }

          } else if (batteryHasFiniteRul) {

            predictedRul = predictedBattery.rul;

            rulCiLower = predictedBattery.lower;

            rulCiUpper = predictedBattery.upper;

          } else if (structureHasFiniteRul) {

            predictedRul = predictedStructural.rul;

            rulCiLower = predictedStructural.lower;

            rulCiUpper = predictedStructural.upper;

          } else if (predictedBattery?.status === 'max' && predictedStructural?.status === 'max') {

            predictedRulStatus = 'max';

          }

          if (predictedRul !== null) predictedRulStatus = 'finite';



          // Maintenance suggestion (simple threshold)

          let maintenanceSuggestion = null;

          if (predictedRul !== null) {

            if (predictedRul < 1) maintenanceSuggestion = '立即檢查';

            else if (predictedRul < 10) maintenanceSuggestion = '建議於 10 小時內檢查';

            else if (predictedRul < 50) maintenanceSuggestion = '建議於 50 小時內檢查';

            else maintenanceSuggestion = '狀態正常，按常規維護';

          }



          // ----- Assemble new aircraft state -----

          return {

            ...aircraft,

            // Updated measurable fields (using validated values)

            voltage: Number(validatedVoltage.toFixed(2)),

            motorRpm: Number(validatedMotorRpm.toFixed(1)),

            motorCurrent: Number(motorCurrentNew.toFixed(2)),

            temperature: Number(validatedTemp.toFixed(1)),

            vibration: Number(validatedVibration.toFixed(1)),

            soc: Number((validatedSoc * 100).toFixed(1)),



            // Internal physics state (preserved for next step)

            batterySOC: validatedSoc,

            batteryCapacity: Number(validatedCapacity.toFixed(3)),

            batteryInternalResistance: Number(validatedResistance.toFixed(4)),

            batteryVpol: Number(Vpol.toFixed(4)),

            structuralDamage: Number(damage.toFixed(6)),



            // Derived status fields

            health,

            remainingLife: Number(remainingLifePct.toFixed(1)),



            // Preserve other fields

            altitude: aircraft.altitude,

            speed: aircraft.speed,

            range: aircraft.range,

            id: aircraft.id,

            displayName: aircraft.displayName,

            model: aircraft.model,

            role: aircraft.role,

            status: aircraft.status,

            lastUpdatedAt: aircraft.lastUpdatedAt,

            mission: aircraft.mission,

            locationLabel: aircraft.locationLabel,

            pkm: aircraft.pkm,

            batteryCycles: aircraft.batteryCycles,

            componentHealth: aircraft.componentHealth,

            route: aircraft.route,

            twinNotes: aircraft.twinNotes,



            // === NEW FIELDS FOR ALIGNMENT & CREDIBILITY ===

            // 1. Event timestamp

            eventTime,

            processingTime,



            // 2. Sensor health flags & validation details

            sensorOK,

            validationDetails,



            // 3. Confidence score (0-1)

            confidence: Number(confidence.toFixed(4)),



            // 4. Anomaly detection flags

            anomalyFlags,



            // 5. Fault diagnosis

            diagnosis: diagnosis ?? null,



            // 6. Remaining useful life predictions (hours)

            predictedRulHours: predictedRul !== null ? Number(predictedRul.toFixed(1)) : null,

            predictedRulStatus,

            rulCiLower: rulCiLower !== null ? Number(rulCiLower.toFixed(1)) : null,

            rulCiUpper: rulCiUpper !== null ? Number(rulCiUpper.toFixed(1)) : null,

            batterySlope: batterySlope !== null ? Number(batterySlope.toFixed(6)) : null,

            batteryIntercept: batteryIntercept !== null ? Number(batteryIntercept.toFixed(3)) : null,

            damageSlope: damageSlope !== null ? Number(damageSlope.toFixed(6)) : null,

            damageIntercept: damageIntercept !== null ? Number(damageIntercept.toFixed(3)) : null,



            // 7. Maintenance suggestion

            maintenanceSuggestion,



            // Tracking for next iteration

            _lastValidUpdate: lastValidUpdate,

            _packetLossCount: packetLossCount,

            _totalUpdates: totalUpdates,

            _sensorHealthHistory: [

              ...(aircraft._sensorHealthHistory ?? []).slice(-9),

              sensorHealthRatio

            ],



            pdm: {

              ...(aircraft.pdm || {}),

              rul: Number(((validatedCapacity / Q_NOM) * 100).toFixed(1)),

              trends: (() => {

                const timeStr = `${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

                const newTrends = (aircraft.pdm?.trends ?? []).slice();

                newTrends.push({

                  t: timeStr,

                  temp: validatedTemp,

                  vib: validatedVibration,

                  rpm: validatedMotorRpm

                });

                if (newTrends.length > 15) newTrends.shift();

                return newTrends;

              })()

            }

          };

        });

      });

    }, 1500);



    return () => clearInterval(interval);

  }, []);



  return liveFleet;

}