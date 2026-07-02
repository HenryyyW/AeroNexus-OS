import { Activity, Cpu, Settings, Wrench, ChevronRight } from 'lucide-react';
import useLocalStorageState from '../hooks/useLocalStorageState';

const localSettingsOptions = {
  general: [
    { id: 'environment', label: 'Environment', value: 'Live Operations', options: ['Live Operations', 'Engineering Dev', 'Production Live'] },
    { id: 'theme', label: 'Theme', value: 'Dark / Cyberpunk', options: ['Dark / Cyberpunk', 'Light / Clean', 'High Contrast'] },
    { id: 'language', label: 'Language', value: 'English', options: ['English', 'Traditional Chinese', 'Simplified Chinese', 'Japanese'] },
    { id: 'alertThreshold', label: 'Tolerance & Sensitivity Matrix', value: 'Urban Air Mobility', options: ['Urban Air Mobility', 'Strict Safety', 'Cargo Transport', 'Custom'] },
    { id: 'refreshInterval', label: 'Refresh Interval', value: '1 second', options: ['Real-time (0.1s)', '1 second', '5 seconds', 'Manual'] },
  ],
  twin: [
    { id: 'defaultModel', label: 'Default Aircraft Model', value: 'Eve-100', options: ['Eve-100', 'Joby S4', 'Archer Midnight', 'Volocopter'] },
    { id: 'renderQuality', label: '3D Render Quality', value: 'High', options: ['Ultra (Ray Tracing)', 'High', 'Medium', 'Low (Performance)'] },
    { id: 'cameraMode', label: 'Camera Mode', value: 'Orbital', options: ['Orbital', 'Free Fly', 'Cockpit View', 'Follow Mode'] },
    { id: 'highlight', label: 'Component Highlight', value: 'Health-based', options: ['Health-based', 'Temperature-based', 'Vibration-based', 'None'] },
    { id: 'telemetrySync', label: 'Telemetry Sync Rate', value: '1 Hz', options: ['10 Hz', '5 Hz', '1 Hz', '0.2 Hz'] },
  ],
  logging: [
    { id: 'telemetrySource', label: 'Telemetry Source', value: 'MQTT / WebSocket', options: ['MQTT / WebSocket', 'REST API Polling', 'Simulated Data', 'Historical Playback'] },
    { id: 'dataRetention', label: 'Data Retention', value: '30 days', options: ['7 days', '30 days', '90 days', '1 year', 'Indefinite'] },
    { id: 'logLevel', label: 'Log Level', value: 'Operational + Warning', options: ['Debug', 'Info', 'Operational + Warning', 'Critical Only'] },
  ],
  advanced: [
    { id: 'predictiveModel', label: 'Predictive Model', value: 'Hybrid Ensemble', options: ['Hybrid Ensemble', 'Deep Neural Network (DNN)', 'Random Forest', 'Rule-based Heuristics'] },
    { id: 'autoCorrection', label: 'Auto-Correction', value: 'Disabled', options: ['Disabled', 'Notify Only', 'Semi-Autonomous', 'Fully Autonomous'] },
    { id: 'apiAccess', label: 'External API Access', value: 'Read-only', options: ['Disabled', 'Read-only', 'Read/Write (Authenticated)'] },
  ],
};

function SettingsBlock({ title, icon: Icon, sectionKey, settingsState, updateSetting }) {
  const items = localSettingsOptions[sectionKey];
  return (
    <section className="rounded-3xl border border-white/10 bg-[#07111f]/90 p-2.5">
      <div className="flex items-center gap-2">
        <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-2 text-cyan-300">
          <Icon size={16} />
        </div>
        <div className="text-xl font-semibold text-white">{title}</div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {items.map((item) => (
          <div key={item.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-2.5 flex flex-col justify-between">
            <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">{item.label}</div>
            <div className="mt-1 relative">
              <select
                value={settingsState[item.id] || item.value}
                onChange={(e) => updateSetting(item.id, e.target.value)}
                className="w-full appearance-none bg-transparent text-sm font-medium text-slate-200 outline-none cursor-pointer border-b border-transparent focus:border-cyan-400/50 pb-1 transition-colors relative z-10"
              >
                {item.options.map((opt) => (
                  <option key={opt} value={opt} className="bg-[#0b1b31] text-slate-200">{opt}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center text-slate-500 z-0">
                <ChevronRight size={14} className="rotate-90" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function SettingsPage() {
  const [settingsState, setSettingsState] = useLocalStorageState('evtol_settings', {});

  const updateSetting = (id, value) => {
    const newState = { ...settingsState, [id]: value };
    setSettingsState(newState);
  };

  return (
    <section className="grid gap-2">
      <SettingsBlock title="General" icon={Settings} sectionKey="general" settingsState={settingsState} updateSetting={updateSetting} />
      <SettingsBlock title="Spatial Sync Settings" icon={Cpu} sectionKey="twin" settingsState={settingsState} updateSetting={updateSetting} />
      <SettingsBlock title="Data and Logging" icon={Activity} sectionKey="logging" settingsState={settingsState} updateSetting={updateSetting} />
      <SettingsBlock title="Advanced" icon={Wrench} sectionKey="advanced" settingsState={settingsState} updateSetting={updateSetting} />
    </section>
  );
}
