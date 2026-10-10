import { ChevronRight } from 'lucide-react';
import { cn, getStatusTone } from '../utils/evtolUtils';

function MetricPill({ label, value, tone = 'default' }) {
  const styles = {
    default: 'border-white/10 bg-white/[0.03] text-slate-200',
    ok: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200',
    warn: 'border-amber-400/20 bg-amber-400/10 text-amber-200',
    danger: 'border-red-500/20 bg-red-500/10 text-red-200',
  };
  return (
    <div className={cn('rounded-2xl border p-2', styles[tone])}>
      <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">{label}</div>
      <div className="mt-1 text-base font-mono">{value}</div>
    </div>
  );
}

function FleetCard({ aircraft, selected, onClick }) {
  const tone = getStatusTone(aircraft.status);
  return (
    <button onClick={onClick} className={cn('group flex h-full min-h-[200px] flex-col rounded-3xl border p-2.5 text-left transition-colors', selected ? 'border-cyan-400/50 bg-cyan-400/10' : 'border-white/10 bg-[#08111d]/85 hover:border-cyan-500/30 hover:bg-cyan-500/5')}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Aircraft</div>
          <div className="mt-1 truncate text-xl font-bold text-white">{aircraft.displayName}</div>
          <div className="mt-1 text-xs text-slate-400">{aircraft.id} · {aircraft.model}</div>
        </div>
        <div className={cn('shrink-0 rounded-full px-2 py-1 text-[10px] font-medium', tone.chip)}>{aircraft.status}</div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <MetricPill label="Health" value={`${aircraft.health}%`} tone={aircraft.health < 90 ? 'danger' : 'ok'} />
        <MetricPill label="SoC" value={`${aircraft.soc}%`} />
        <MetricPill label="Temp" value={`${aircraft.temperature}°C`} tone={aircraft.temperature >= 65 ? 'danger' : 'warn'} />
        <MetricPill label="RUL" value={`${aircraft.rul} days`} tone={aircraft.rul < 60 ? 'danger' : 'ok'} />
      </div>
      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-2.5">
        <div className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Mission</div>
        <div className="mt-1 text-sm font-medium text-slate-200">{aircraft.mission}</div>
        <div className="mt-1 text-xs text-slate-400">{aircraft.role}</div>
      </div>
      <div className="mt-auto flex items-center justify-between pt-3 text-xs">
        <span className="text-slate-400">Access Asset Telemetry</span>
        <span className="flex items-center gap-1 text-cyan-300">Diagnose <ChevronRight size={14} /></span>
      </div>
    </button>
  );
}

export default function HomePage({ fleet, selectedAircraft, setSelectedAircraft, setActivePage }) {
  return (
    <section className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {fleet.map((aircraft) => (
        <FleetCard
              key={aircraft.id}
              aircraft={aircraft}
              selected={selectedAircraft.id === aircraft.id}
              onClick={() => {
                setSelectedAircraft(aircraft);
                setActivePage('details');
              }}
        />
      ))}
    </section>
  );
}
