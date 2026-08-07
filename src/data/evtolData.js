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
    mission: 'Mission Alpha',
    locationLabel: 'Route Alpha',
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
      { lat: 22.296887, lng: 113.9663 },
      { lat: 22.318771, lng: 114.017 },
      { lat: 22.335181, lng: 114.06575 },
      { lat: 22.348855, lng: 114.1145 },
      { lat: 22.362527, lng: 114.173 },
      { lat: 22.377839, lng: 114.22175 },
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
    mission: 'Mission Beta',
    locationLabel: 'Route Beta',
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
      { lat: 22.310887, lng: 114.22175 },
      { lat: 22.328394, lng: 114.1847 },
      { lat: 22.343711, lng: 114.14375 },
      { lat: 22.351916, lng: 114.099875 },
      { lat: 22.36012, lng: 114.051125 },
      { lat: 22.368324, lng: 114.00725 },
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
    mission: 'Mission Gamma',
    locationLabel: 'Route Gamma',
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
      { lat: 22.386401, lng: 113.97995 },
      { lat: 22.37109, lng: 114.0248 },
      { lat: 22.35359, lng: 114.0677 },
      { lat: 22.332805, lng: 114.1067 },
      { lat: 22.3153, lng: 114.1418 },
      { lat: 22.289038, lng: 114.19445 },
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
    mission: 'Mission Delta',
    locationLabel: 'Route Delta',
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
      { lat: 22.404084, lng: 114.1925 },
      { lat: 22.388775, lng: 114.1613 },
      { lat: 22.375652, lng: 114.12815 },
      { lat: 22.359793, lng: 114.095 },
      { lat: 22.337916, lng: 114.06575 },
      { lat: 22.319865, lng: 114.03845 },
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