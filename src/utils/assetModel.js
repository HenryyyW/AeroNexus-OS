const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, value));

function alertFromHealth(health) {
  if (health == null) return 'Unknown';
  if (health <= 70) return 'Critical';
  if (health <= 85) return 'Warning';
  return 'Nominal';
}

const alertRank = { Unknown: 0, Nominal: 1, Monitoring: 2, Warning: 3, Critical: 4 };

function worstAlert(nodes) {
  return nodes.reduce((worst, node) => (
    alertRank[node.alertLevel] > alertRank[worst] ? node.alertLevel : worst
  ), 'Unknown');
}

// Aggregate confidence from children (weighted by health availability)
function aggregateConfidence(children) {
  const validChildren = children.filter(c => c.confidence != null);
  if (validChildren.length === 0) return null;
  // Weight by inverse of uncertainty (higher confidence = more weight)
  const totalWeight = validChildren.reduce((sum, c) => sum + (c.confidence || 0.1), 0);
  if (totalWeight === 0) return validChildren[0].confidence;
  const weightedSum = validChildren.reduce((sum, c) => sum + (c.confidence || 0) * (c.confidence || 0.1), 0);
  return Math.round((weightedSum / totalWeight) * 10000) / 10000;
}

// Merge sensor health flags from children (AND logic: all must be OK)
function mergeSensorHealth(children) {
  const merged = {};
  children.forEach(child => {
    if (child.sensorOK) {
      Object.entries(child.sensorOK).forEach(([key, value]) => {
        if (merged[key] === undefined) merged[key] = value;
        else merged[key] = merged[key] && value; // all children must be OK
      });
    }
  });
  return merged;
}

// Merge validation details (collect all, then AND for validity)
function mergeValidationDetails(children) {
  const merged = {};
  children.forEach(child => {
    if (child.validationDetails) {
      Object.entries(child.validationDetails).forEach(([key, value]) => {
        if (!merged[key]) merged[key] = [];
        merged[key].push(value);
      });
    }
  });
  // For each sensor, determine overall validity (all children must be valid)
  const result = {};
  Object.entries(merged).forEach(([key, validations]) => {
    result[key] = {
      valid: validations.every(v => v.valid),
      corrected: validations.some(v => v.corrected),
      reasons: [...new Set(validations.map(v => v.reason).filter(Boolean))],
      details: validations
    };
  });
  return result;
}

// Merge anomaly flags from children (take max severity per type)
function mergeAnomalyFlags(children) {
  const merged = {};
  children.forEach(child => {
    if (child.anomalyFlags) {
      Object.entries(child.anomalyFlags).forEach(([key, flag]) => {
        if (!merged[key]) {
          merged[key] = { ...flag }; // copy
        } else {
          // keep the higher severity
          if (flag.severity > merged[key].severity) {
            merged[key] = { ...flag };
          }
        }
      });
    }
  });
  return merged;
}

function node({
  id,
  parentId,
  name,
  kind,
  health = null,
  operatingCondition = { state: 'Unknown', metrics: [] },
  remainingLife = { value: null, unit: 'Unknown', basis: 'No validated life model or source data.' },
  alertLevel = alertFromHealth(health),
  lastUpdated = null,
  source = 'No connected telemetry source',
  method = 'No condition model configured.',
  children = [],
  // New fields for alignment & credibility
  sensorOK = null,
  validationDetails = null,
  confidence = null,
  eventTime = null,
  processingTime = null,
  // New fields for analysis capability
  anomalyFlags = null,
  diagnosis = null,
  predictedRulHours = null,
  maintenanceSuggestion = null
}) {
  return {
    id,
    parentId,
    name,
    kind,
    health: health == null ? null : Math.round(health),
    operatingCondition,
    remainingLife,
    alertLevel,
    lastUpdated,
    source,
    method,
    children,
    // New fields
    sensorOK,
    validationDetails,
    confidence,
    eventTime,
    processingTime,
    // Analysis fields
    anomalyFlags,
    diagnosis,
    predictedRulHours,
    maintenanceSuggestion
  };
}

function metric(name, value, unit, source = 'Aircraft-level simulated telemetry') {
  return { name, value, unit, source };
}

function buildSubsystem({ aircraft, id, name, children, lastUpdated }) {
  const availableHealth = children.filter((child) => child.health != null);
  const health = availableHealth.length
    ? availableHealth.reduce((sum, child) => sum + child.health, 0) / availableHealth.length
    : null;
  const states = [...new Set(children.map((child) => child.operatingCondition.state))];

  // Aggregate new fields from children
  const sensorOK = mergeSensorHealth(children);
  const validationDetails = mergeValidationDetails(children);
  const confidence = aggregateConfidence(children);
  const anomalyFlags = mergeAnomalyFlags(children);
  const eventTime = children.length > 0 ? children[0].eventTime : null;
  const processingTime = children.length > 0 ? children[0].processingTime : null;

  return node({
    id,
    parentId: aircraft.id,
    name,
    kind: 'subsystem',
    health,
    operatingCondition: { state: states.length === 1 ? states[0] : 'Mixed component states', metrics: [] },
    remainingLife: { value: null, unit: 'Not calculated', basis: 'Subsystem life requires a validated aggregation model.' },
    alertLevel: worstAlert(children),
    lastUpdated,
    source: 'Aggregated from child asset records',
    method: 'Subsystem health is the mean of available child health estimates; alert is the highest child alert.',
    children,
    // New aggregated fields
    sensorOK,
    validationDetails,
    confidence,
    anomalyFlags,
    eventTime,
    processingTime
    // diagnosis, predictedRulHours, maintenanceSuggestion are not aggregated (null)
  });
}

export function buildAircraftAssetTree(aircraft) {
  // Use validated data from aircraft (already validated in useSimulatedFleet)
  const lastUpdated = aircraft.lastUpdatedAt || null;
  const source = 'Simulated fleet demo data';
  const inFlight = Number(aircraft.speed || 0) > 1;
  
  // Use validated sensor data from aircraft
  const vibration = Number(aircraft.vibration || 0);
  const temperature = Number(aircraft.temperature || 0);
  const soc = Number(aircraft.soc || 0);
  const motorRpm = Number(aircraft.motorRpm || 0);
  const voltage = Number(aircraft.voltage || 0);
  const batteryCapacity = Number(aircraft.batteryCapacity || 5.0);
  const internalResistance = Number(aircraft.batteryInternalResistance || 0.05);
  const structuralDamage = Number(aircraft.structuralDamage || 0);
  const frameHealth = aircraft.componentHealth?.frame == null
    ? null
    : clamp(aircraft.componentHealth.frame * (1 - structuralDamage));

  const rotorHealth = [aircraft.componentHealth?.rotorA, aircraft.componentHealth?.rotorB];

  const motors = rotorHealth.map((baseHealth, index) => {
    const vibrationPenalty = Math.max(0, vibration - 35) * 0.2;
    const temperaturePenalty = Math.max(0, temperature - 65) * 0.15;
    const health = baseHealth == null
      ? null
      : clamp(baseHealth - vibrationPenalty - temperaturePenalty);
    let alertLevel = alertFromHealth(health);
    if (vibration >= 55 || temperature >= 85) alertLevel = 'Critical';
    else if (vibration >= 40 || temperature >= 70) {
      if (alertRank[alertLevel] < alertRank.Warning) alertLevel = 'Warning';
    }

    return node({
      id: `${aircraft.id}-motor-${index + 1}`,
      parentId: `${aircraft.id}-propulsion`,
      name: `Motor / Rotor Group ${index === 0 ? 'A' : 'B'}`,
      kind: 'component',
      health,
      operatingCondition: {
        state: vibration >= 55 || temperature >= 85 ? 'Outside demo operating threshold' : inFlight ? 'Operating' : 'Standby',
        metrics: [
          metric('Motor speed', Math.round(motorRpm), 'rpm'),
          metric('Vibration', vibration.toFixed(1), 'demo units'),
          metric('Temperature', temperature.toFixed(1), '°C'),
        ],
      },
      remainingLife: {
        value: health,
        unit: 'health-proxy %',
        basis: 'Heuristic: component baseline health minus shared aircraft vibration and temperature penalties. Not a certified RUL prediction.',
      },
      alertLevel,
      lastUpdated: aircraft.eventTime || lastUpdated,
      source,
      method: 'Warning at vibration ≥ 40 or temperature ≥ 70°C; critical at vibration ≥ 55 or temperature ≥ 85°C. Per-rotor sensors are not connected; the same aircraft-level signals are shown for each group.',
      // Propagate new fields
      sensorOK: aircraft.sensorOK ? {
        temperature: aircraft.sensorOK.temperature,
        vibration: aircraft.sensorOK.vibration,
        motorRpm: aircraft.sensorOK.motorRpm
      } : null,
      validationDetails: aircraft.validationDetails ? {
        temperature: aircraft.validationDetails.temperature,
        vibration: aircraft.validationDetails.vibration,
        motorRpm: aircraft.validationDetails.motorRpm
      } : null,
      confidence: aircraft.confidence ?? null,
      eventTime: aircraft.eventTime ?? null,
      processingTime: aircraft.processingTime ?? null
      // analysis fields: null for components
    });
  });

  const batteryHealthBase = aircraft.componentHealth?.battery;
  const batteryHealth = batteryHealthBase == null
    ? null
    : clamp(batteryHealthBase - Math.max(0, temperature - 55) * 0.15 - Math.max(0, 20 - soc) * 0.5);
  let batteryAlert = alertFromHealth(batteryHealth);
  if (temperature >= 80 || soc <= 10) batteryAlert = 'Critical';
  else if ((temperature >= 65 || soc <= 20) && alertRank[batteryAlert] < alertRank.Warning) batteryAlert = 'Warning';

  const powerChildren = [node({
    id: `${aircraft.id}-battery-pack`,
    parentId: `${aircraft.id}-power`,
    name: 'Battery Pack',
    kind: 'component',
    health: batteryHealth,
    operatingCondition: {
      state: soc <= 10 || temperature >= 80 ? 'Critical operating range' : 'Operating',
      metrics: [
        metric('State of charge', soc, '%'),
        metric('Pack temperature', temperature.toFixed(1), '°C'),
        metric('Cycle count', Number(aircraft.batteryCycles || 0), 'cycles'),
        metric('Capacity', batteryCapacity.toFixed(2), 'Ah'),
        metric('Internal Resistance', internalResistance.toFixed(4), 'Ω'),
      ],
    },
    remainingLife: {
      value: batteryHealth,
      unit: 'health-proxy %',
      basis: 'Demo proxy derived from configured pack health, temperature and state of charge; cell-level capacity fade model is not connected.',
    },
    alertLevel: batteryAlert,
    lastUpdated: aircraft.eventTime || lastUpdated,
    source,
    method: 'Warning at temperature ≥ 65°C or SOC ≤ 20%; critical at temperature ≥ 80°C or SOC ≤ 10%.',
    // Propagate new fields
    sensorOK: aircraft.sensorOK ? {
      soc: aircraft.sensorOK.soc,
      voltage: aircraft.sensorOK.voltage,
      temperature: aircraft.sensorOK.temperature,
      batteryCapacity: aircraft.sensorOK.batteryCapacity,
      internalResistance: aircraft.sensorOK.internalResistance
    } : null,
    validationDetails: aircraft.validationDetails ? {
      soc: aircraft.validationDetails.soc,
      voltage: aircraft.validationDetails.voltage,
      temperature: aircraft.validationDetails.temperature,
      batteryCapacity: aircraft.validationDetails.batteryCapacity,
      internalResistance: aircraft.validationDetails.internalResistance
    } : null,
    confidence: aircraft.confidence ?? null,
    eventTime: aircraft.eventTime ?? null,
    processingTime: aircraft.processingTime ?? null
    // analysis fields: null for components
  })];

  const avionicsChildren = [
    ['flight-computer', 'Main Flight Computer'],
    ['lidar', 'LiDAR Array'],
    ['communications', 'Communication Link'],
    ['navigation', 'Navigation Sensors'],
  ].map(([id, name]) => node({
    id: `${aircraft.id}-${id}`,
    parentId: `${aircraft.id}-avionics`,
    name,
    kind: 'component',
    health: null,
    operatingCondition: { state: 'Unknown · no component telemetry', metrics: [] },
    remainingLife: { value: null, unit: 'Unknown', basis: 'No component-specific data or life model is connected.' },
    alertLevel: 'Unknown',
    source: 'No connected component telemetry',
    method: 'Status is intentionally unknown; the previous UI label was static and is not treated as telemetry.',
    // Propagate new fields (unknown)
    sensorOK: null,
    validationDetails: null,
    confidence: null,
    eventTime: aircraft.eventTime ?? null,
    processingTime: aircraft.processingTime ?? null
    // analysis fields: null
  }));

  const structureChildren = [node({
    id: `${aircraft.id}-airframe`,
    parentId: `${aircraft.id}-structure`,
    name: 'Airframe',
    kind: 'component',
    health: frameHealth,
    operatingCondition: {
      state: inFlight ? 'In flight' : 'On ground',
      metrics: [metric('Altitude', Number(aircraft.altitude || 0), 'm'), metric('Speed', Number(aircraft.speed || 0), 'km/h')],
    },
    remainingLife: {
      value: aircraft.rul ?? null,
      unit: 'demo days',
      basis: 'Existing demo fleet RUL field; not derived from structural loads or inspection records.',
    },
    lastUpdated: aircraft.eventTime || lastUpdated,
    source,
    method: 'Configured demo frame score adjusted by simulated structural damage; not a certified fatigue-life estimate.',
    // Propagate new fields
    sensorOK: aircraft.sensorOK ? {
      vibration: aircraft.sensorOK.vibration,
      temperature: aircraft.sensorOK.temperature
    } : null,
    validationDetails: aircraft.validationDetails ? {
      vibration: aircraft.validationDetails.vibration,
      temperature: aircraft.validationDetails.temperature
    } : null,
    confidence: aircraft.confidence ?? null,
    eventTime: aircraft.eventTime ?? null,
    processingTime: aircraft.processingTime ?? null
    // analysis fields: null
  })];

  const subsystems = [
    buildSubsystem({ aircraft, id: `${aircraft.id}-propulsion`, name: 'Propulsion', children: motors, lastUpdated }),
    buildSubsystem({ aircraft, id: `${aircraft.id}-power`, name: 'Power', children: powerChildren, lastUpdated }),
    buildSubsystem({ aircraft, id: `${aircraft.id}-avionics`, name: 'Avionics & Sensors', children: avionicsChildren, lastUpdated }),
    buildSubsystem({ aircraft, id: `${aircraft.id}-structure`, name: 'Structure', children: structureChildren, lastUpdated })
  ];

  // Aggregate confidence at aircraft level
  const aircraftConfidence = aggregateConfidence(subsystems);
  // Aggregate anomaly flags at aircraft level
  const aircraftAnomalyFlags = mergeAnomalyFlags(subsystems);

  return node({
    id: aircraft.id,
    parentId: null,
    name: `${aircraft.id} · ${aircraft.model}`,
    kind: 'aircraft',
    health: aircraft.health ?? null,
    operatingCondition: {
      state: inFlight ? 'In flight' : 'On ground',
      metrics: [
        metric('Altitude', Number(aircraft.altitude || 0), 'm'),
        metric('Speed', Number(aircraft.speed || 0), 'km/h'),
        metric('State of charge', soc, '%'),
        metric('Voltage', voltage.toFixed(2), 'V'),
      ],
    },
    remainingLife: {
      value: aircraft.rul ?? null,
      unit: 'demo days',
      basis: 'Existing demo fleet field; not a validated aircraft life prediction.',
    },
    alertLevel: aircraft.status === 'Warning' ? 'Warning' : aircraft.status === 'Critical' ? 'Critical' : aircraft.status === 'Monitoring' ? 'Monitoring' : 'Nominal',
    lastUpdated: aircraft.eventTime || lastUpdated,
    source,
    method: 'Aircraft state is assembled from the current simulated fleet fields; subsystem alerts are evaluated independently using the demo rules shown on each component.',
    children: subsystems,
    // New aggregated fields at aircraft level
    sensorOK: aircraft.sensorOK ?? null,
    validationDetails: aircraft.validationDetails ?? null,
    confidence: aircraftConfidence,
    anomalyFlags: aircraftAnomalyFlags,
    // Analysis fields from aircraft (computed in useSimulatedFleet)
    diagnosis: aircraft.diagnosis ?? null,
    predictedRulHours: aircraft.predictedRulHours ?? null,
    maintenanceSuggestion: aircraft.maintenanceSuggestion ?? null,
    eventTime: aircraft.eventTime ?? null,
    processingTime: aircraft.processingTime ?? null
  });
}