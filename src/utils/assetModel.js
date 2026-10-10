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
  });
}

export function buildAircraftAssetTree(aircraft) {
  const lastUpdated = aircraft.lastUpdatedAt || null;
  const source = 'Simulated fleet demo data';
  const inFlight = Number(aircraft.speed || 0) > 1;
  const rotorHealth = [aircraft.componentHealth?.rotorA, aircraft.componentHealth?.rotorB];
  const vibration = Number(aircraft.vibration || 0);
  const temperature = Number(aircraft.temperature || 0);

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
          metric('Motor speed', Math.round(aircraft.motorRpm || 0), 'rpm'),
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
      lastUpdated,
      source,
      method: 'Warning at vibration ≥ 40 or temperature ≥ 70°C; critical at vibration ≥ 55 or temperature ≥ 85°C. Per-rotor sensors are not connected; the same aircraft-level signals are shown for each group.',
    });
  });

  const batteryHealthBase = aircraft.componentHealth?.battery;
  const batteryHealth = batteryHealthBase == null
    ? null
    : clamp(batteryHealthBase - Math.max(0, temperature - 55) * 0.15 - Math.max(0, 20 - Number(aircraft.soc || 0)) * 0.5);
  let batteryAlert = alertFromHealth(batteryHealth);
  if (temperature >= 80 || Number(aircraft.soc || 0) <= 10) batteryAlert = 'Critical';
  else if ((temperature >= 65 || Number(aircraft.soc || 0) <= 20) && alertRank[batteryAlert] < alertRank.Warning) batteryAlert = 'Warning';

  const powerChildren = [node({
    id: `${aircraft.id}-battery-pack`,
    parentId: `${aircraft.id}-power`,
    name: 'Battery Pack',
    kind: 'component',
    health: batteryHealth,
    operatingCondition: {
      state: Number(aircraft.soc || 0) <= 10 || temperature >= 80 ? 'Critical operating range' : 'Operating',
      metrics: [
        metric('State of charge', Number(aircraft.soc || 0), '%'),
        metric('Pack temperature', temperature.toFixed(1), '°C'),
        metric('Cycle count', Number(aircraft.batteryCycles || 0), 'cycles'),
      ],
    },
    remainingLife: {
      value: batteryHealth,
      unit: 'health-proxy %',
      basis: 'Demo proxy derived from configured pack health, temperature and state of charge; cell-level capacity fade model is not connected.',
    },
    alertLevel: batteryAlert,
    lastUpdated,
    source,
    method: 'Warning at temperature ≥ 65°C or SOC ≤ 20%; critical at temperature ≥ 80°C or SOC ≤ 10%.',
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
  }));

  const structureChildren = [node({
    id: `${aircraft.id}-airframe`,
    parentId: `${aircraft.id}-structure`,
    name: 'Airframe',
    kind: 'component',
    health: aircraft.componentHealth?.frame ?? null,
    operatingCondition: {
      state: inFlight ? 'In flight' : 'On ground',
      metrics: [metric('Altitude', Number(aircraft.altitude || 0), 'm'), metric('Speed', Number(aircraft.speed || 0), 'km/h')],
    },
    remainingLife: {
      value: aircraft.rul ?? null,
      unit: 'demo days',
      basis: 'Existing demo fleet RUL field; not derived from structural loads or inspection records.',
    },
    lastUpdated,
    source,
    method: 'Health uses the configured demo frame score. No strain, fatigue-cycle or inspection data is connected.',
  })];

  const subsystems = [
    buildSubsystem({ aircraft, id: `${aircraft.id}-propulsion`, name: 'Propulsion', children: motors, lastUpdated }),
    buildSubsystem({ aircraft, id: `${aircraft.id}-power`, name: 'Power', children: powerChildren, lastUpdated }),
    buildSubsystem({ aircraft, id: `${aircraft.id}-avionics`, name: 'Avionics & Sensors', children: avionicsChildren, lastUpdated }),
    buildSubsystem({ aircraft, id: `${aircraft.id}-structure`, name: 'Structure', children: structureChildren, lastUpdated }),
  ];

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
        metric('State of charge', Number(aircraft.soc || 0), '%'),
      ],
    },
    remainingLife: {
      value: aircraft.rul ?? null,
      unit: 'demo days',
      basis: 'Existing demo fleet field; not a validated aircraft life prediction.',
    },
    alertLevel: aircraft.status === 'Warning' ? 'Warning' : aircraft.status === 'Critical' ? 'Critical' : aircraft.status === 'Monitoring' ? 'Monitoring' : 'Nominal',
    lastUpdated,
    source,
    method: 'Aircraft state is assembled from the current simulated fleet fields; subsystem alerts are evaluated independently using the demo rules shown on each component.',
    children: subsystems,
  });
}
