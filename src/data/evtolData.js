export const evtolFleet = [
  {
    id: 'EVTOL-01',
    displayName: '#1 eVTOL',
    model: 'Eve-100',
    role: 'Passenger Shuttle',
    status: 'Nominal',
    health: 96,
    soc: 82,
    temperature: 54,
    rul: 1180,
    altitude: 320,
    speed: 88,
    mission: 'South Bay Shuttle',
    locationLabel: 'Ocean Park South',
    pkm: '12.4',
    batteryCycles: 218,
    vibration: 32,
    motorRpm: 5820,
    lastMaintenance: '2026-04-08',
    nextInspection: '2026-05-02',
    anomalyScore: 0.08,
    batteryDelta: 1.2,
    componentHealth: {
      battery: 95,
      rotorA: 97,
      rotorB: 94,
      avionics: 98,
      frame: 96,
    },
    route: [
      { x: 68, y: 280 },
      { x: 120, y: 240 },
      { x: 170, y: 210 },
      { x: 220, y: 185 },
      { x: 280, y: 160 },
      { x: 330, y: 132 },
    ],
    twinNotes: [
      'Primary shuttle aircraft for high-frequency tourist route.',
      'Battery thermal profile within normal envelope.',
      'No structural anomalies detected in last 24 hours.',
    ],
    pdm: {
      riskLevel: 'Low',
      warning: 'No active maintenance warning.',
      trends: [
        { t: '08:00', temp: 52, vib: 30, rpm: 5760 },
        { t: '08:05', temp: 53, vib: 31, rpm: 5790 },
        { t: '08:10', temp: 54, vib: 31, rpm: 5810 },
        { t: '08:15', temp: 54, vib: 32, rpm: 5820 },
        { t: '08:20', temp: 55, vib: 31, rpm: 5800 },
        { t: '08:25', temp: 54, vib: 32, rpm: 5820 },
      ],
    },
    agent: {
      "safety_risk_assessment": {
        "risk_level": "Low",
        "primary_risk": "No immediate safety risks detected during the observed flight segment."
      },
      "detailed_analysis": {
        "visual": {
          "pilot_status": "✅ Attentive, hands on controls, no signs of fatigue or distraction.",
          "cockpit_environment": "✅ Clean, no visible smoke, debris, or structural damage.",
          "instrument_display": "✅ Digital displays active and clear, showing navigation data."
        },
        "audio": {
          "mechanical_noises": "✅ Consistent rotor hum, no unusual clanking or grinding.",
          "alarms": "✅ None detected.",
          "pilot_communication": "✅ No audible stress or urgent vocalizations."
        },
        "fusion": "Pilot appears competent and environment stable; all systems functioning nominally."
      },
      "possible_causes": [
        "Routine urban eVTOL transit.",
        "Normal pre-programmed flight path execution."
      ],
      "recommended_actions": [
        "Continue monitoring for next visual/audio anomaly.",
        "Verify pre-flight checklist completion upon landing."
      ],
    }
  },
  {
    id: 'EVTOL-02',
    displayName: '#2 eVTOL',
    model: 'Eve-100',
    role: 'Coastal Patrol',
    status: 'Monitoring',
    health: 91,
    soc: 76,
    temperature: 61,
    rul: 840,
    altitude: 410,
    speed: 94,
    mission: 'Coastal Scan',
    locationLabel: 'Deep Water Track',
    pkm: '18.7',
    batteryCycles: 264,
    vibration: 41,
    motorRpm: 5680,
    lastMaintenance: '2026-04-05',
    nextInspection: '2026-04-28',
    anomalyScore: 0.22,
    batteryDelta: 2.6,
    componentHealth: {
      battery: 89,
      rotorA: 92,
      rotorB: 90,
      avionics: 95,
      frame: 93,
    },
    route: [
      { x: 330, y: 280 },
      { x: 292, y: 248 },
      { x: 250, y: 220 },
      { x: 205, y: 205 },
      { x: 155, y: 190 },
      { x: 110, y: 175 },
    ],
    twinNotes: [
      'Moderate rotor vibration increase under headwind conditions.',
      'Recommended inspection of left-side motor assembly within 84 minutes RUL window.',
      'Map route overlaps coastal surveillance corridor.',
    ],
    pdm: {
      riskLevel: 'Medium',
      warning: 'Rotor harmonic signature drifting above nominal baseline.',
      trends: [
        { t: '08:00', temp: 58, vib: 36, rpm: 5740 },
        { t: '08:05', temp: 59, vib: 38, rpm: 5720 },
        { t: '08:10', temp: 60, vib: 39, rpm: 5700 },
        { t: '08:15', temp: 60, vib: 40, rpm: 5690 },
        { t: '08:20', temp: 61, vib: 41, rpm: 5680 },
        { t: '08:25', temp: 61, vib: 41, rpm: 5680 },
      ],
    },
    agent:{
      "safety_risk_assessment": {
        "risk_level": "Medium",
        "primary_risk": "Pilot appears fatigued and distracted, potentially compromising situational awareness"
      },
      "detailed_analysis": {
        "visual": {
          "pilot_status": "⚠️ Fatigued (yawning), distracted (adjusting headset, looking away from controls)",
          "environment": "✅ Clear view outside, no immediate structural or environmental hazards visible"
        },
        "audio": {
          "mechanical_noises": "✅ Normal rotor sounds, no alarms",
          "pilot_communication": "⚠️ No active communication observed, but possible fatigue-related mumbling"
        },
        "fusion": "Pilot's yawning and distraction from primary controls may lead to delayed response to changing flight conditions."
      },
      "possible_causes": [
        "Pilot fatigue during long flight",
        "Cabin noise causing distraction"
      ],
      "recommended_actions": [
        "Immediate: Pilot should focus on controls and confirm communication protocol",
        "Follow-up: Flight operations should monitor for further signs of fatigue"
      ],
    }
  },
  {
    id: 'EVTOL-03',
    displayName: '#3 eVTOL',
    model: 'Eve-100',
    role: 'Medical Response',
    status: 'Warning',
    health: 87,
    soc: 68,
    temperature: 67,
    rul: 460,
    altitude: 280,
    speed: 79,
    mission: 'Rapid Response',
    locationLabel: 'Mid-Slope Air Lane',
    pkm: '21.1',
    batteryCycles: 312,
    vibration: 58,
    motorRpm: 5460,
    lastMaintenance: '2026-03-30',
    nextInspection: '2026-04-23',
    anomalyScore: 0.58,
    batteryDelta: 4.1,
    componentHealth: {
      battery: 82,
      rotorA: 84,
      rotorB: 80,
      avionics: 92,
      frame: 91,
    },
    route: [
      { x: 82, y: 120 },
      { x: 128, y: 148 },
      { x: 172, y: 180 },
      { x: 212, y: 218 },
      { x: 248, y: 250 },
      { x: 302, y: 298 },
    ],
    twinNotes: [
      'Battery pack B showing abnormal heat accumulation.',
      'Rotor vibration trend suggests near-term predictive maintenance event.',
      'High-priority aircraft for detailed inspection workflow.',
    ],
    pdm: {
      riskLevel: 'High',
      warning: 'Battery compartment thermal rise and rotor imbalance require immediate attention.',
      trends: [
        { t: '08:00', temp: 61, vib: 45, rpm: 5580 },
        { t: '08:05', temp: 63, vib: 47, rpm: 5550 },
        { t: '08:10', temp: 64, vib: 50, rpm: 5530 },
        { t: '08:15', temp: 65, vib: 53, rpm: 5500 },
        { t: '08:20', temp: 66, vib: 56, rpm: 5480 },
        { t: '08:25', temp: 67, vib: 58, rpm: 5460 },
      ],
    },
    agent: {
      "safety_risk_assessment": {
        "risk_level": "High",
        "primary_risk": "Smoke filling cockpit indicates possible engine or electrical fire"
      },
      "detailed_analysis": {
        "visual": {
          "pilot": "⚠️ Seemingly calm but environment is hazardous",
          "passenger": "⚠️ Covering mouth, appears distressed",
          "cabin_environment": "❌ Heavy smoke with red glow, possible fire",
          "instruments": "✅ Visible but obscured by smoke"
        },
        "audio": {
          "mechanical_noises": "⚠️ Unusual hissing/smoldering sounds",
          "pilot_voice": "✅ Clear but urgent commands",
          "passenger_sounds": "⚠️ Muffled coughing/gasping"
        },
        "fusion": "Active smoke and red glow strongly suggest an in-flight fire requiring immediate emergency response"
      },
      "possible_causes": [
        "Engine compartment fire",
        "Electrical short circuit"
      ],
      "recommended_actions": [
        "Initiate emergency fire suppression protocol",
        "Evacuate all occupants immediately"
      ],
    }
  },
  {
    id: 'EVTOL-04',
    displayName: '#4 eVTOL',
    model: 'AE200 Demo',
    role: 'Logistics Lift',
    status: 'Nominal',
    health: 94,
    soc: 79,
    temperature: 57,
    rul: 1020,
    altitude: 360,
    speed: 91,
    mission: 'Cargo Relay',
    locationLabel: 'North Ridge Corridor',
    pkm: '15.9',
    batteryCycles: 244,
    vibration: 35,
    motorRpm: 5740,
    lastMaintenance: '2026-04-11',
    nextInspection: '2026-05-06',
    anomalyScore: 0.13,
    batteryDelta: 1.8,
    componentHealth: {
      battery: 93,
      rotorA: 94,
      rotorB: 95,
      avionics: 96,
      frame: 94,
    },
    route: [
      { x: 300, y: 84 },
      { x: 268, y: 112 },
      { x: 234, y: 136 },
      { x: 200, y: 165 },
      { x: 170, y: 205 },
      { x: 142, y: 238 },
    ],
    twinNotes: [
      'Stable logistics corridor aircraft with low anomaly score.',
      'Minor energy efficiency drift compared to previous week baseline.',
      'No immediate intervention required.',
    ],
    pdm: {
      riskLevel: 'Low',
      warning: 'No active maintenance warning.',
      trends: [
        { t: '08:00', temp: 55, vib: 33, rpm: 5700 },
        { t: '08:05', temp: 56, vib: 34, rpm: 5720 },
        { t: '08:10', temp: 56, vib: 34, rpm: 5730 },
        { t: '08:15', temp: 57, vib: 35, rpm: 5740 },
        { t: '08:20', temp: 57, vib: 35, rpm: 5730 },
        { t: '08:25', temp: 57, vib: 35, rpm: 5740 },
      ],
    },
    agent: {
      "safety_risk_assessment": {
        "risk_level": "Low",
        "primary_risk": "No immediate safety threats detected."
      },
      "detailed_analysis": {
        "visual": {
          "pilot_status": "✅ Focused, hands on controls, no signs of fatigue or distraction.",
          "cockpit_instruments": "✅ All displays active, no visible errors or warnings.",
          "cabin_environment": "✅ Clear view outside, no smoke or debris detected."
        },
        "audio": {
          "mechanical_noises": "✅ Consistent engine hum, no unusual grinding or clanking.",
          "alarms": "✅ None detected.",
          "pilot_communication": "✅ Calm, controlled tone."
        },
        "fusion": "Pilot appears competent and environment stable with no detected anomalies."
      },
      "possible_causes": [
        "Normal pre-flight or cruise phase operation.",
        "Routine system checks being performed."
      ],
      "recommended_actions": [
        "Continue monitoring for any sudden changes in audio or visual indicators.",
        "Verify all systems remain stable during next scheduled check."
      ],
    }
  },
];

export const settingsSections = {
  general: [
    ['Platform Mode', 'Operations Demo'],
    ['Theme', 'Dark / Cyberpunk'],
    ['Language', 'English'],
    ['Alert Threshold Profile', 'Urban Air Mobility'],
    ['Refresh Interval', '1 second'],
  ],
  twin: [
    ['Default Aircraft Model', 'Eve-100'],
    ['3D Render Quality', 'High'],
    ['Camera Mode', 'Orbital'],
    ['Component Highlight', 'Health-based'],
    ['Telemetry Sync Rate', '1 Hz'],
  ],
  logging: [
    ['Telemetry Source', 'MQTT / WebSocket'],
    ['Data Retention', '30 days'],
    ['Log Level', 'Operational + Warning'],
    ['Export Format', 'CSV / JSON'],
    ['Audit Trail', 'Enabled'],
  ],
  advanced: [
    ['Simulation Engine', 'Enabled'],
    ['Fault Injection', 'Manual / Random'],
    ['AI Anomaly Inference', 'Enabled'],
    ['Debug Overlay', 'Available'],
    ['Developer Console', 'Restricted'],
  ],
};