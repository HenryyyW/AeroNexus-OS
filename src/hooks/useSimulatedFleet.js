import { useEffect, useState } from 'react';

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
    };
  });
}

export default function useSimulatedFleet(fleet) {
  const [liveFleet, setLiveFleet] = useState(() => initializePhysicsState(fleet));
  const [previousFleet, setPreviousFleet] = useState(fleet);

  if (fleet !== previousFleet) {
    setPreviousFleet(fleet);
    setLiveFleet(initializePhysicsState(fleet));
  }

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveFleet((prev) => {
        return (prev || []).map((aircraft) => {
          const now = new Date();
          const eventTime = now.toISOString();
          const processingTime = now.getTime();

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