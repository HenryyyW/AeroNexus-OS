import { createElement } from 'react';
import { ChevronDown, Cpu, Home, Plane, Settings } from 'lucide-react';
import { cn } from '../utils/evtolUtils';

const navItems = [
  { key: 'home', label: 'Home', icon: Home },
  { key: 'details', label: 'Asset Diagnostics', icon: Plane },
  { key: 'twins', label: 'Spatial Synchronization', icon: Cpu },
  { key: 'settings', label: 'System Configuration', icon: Settings },
];

export default function Sidebar({ activePage, setActivePage, fleet, selectedAircraft, setSelectedAircraft }) {
  return (
    <aside className="w-[220px] shrink-0 self-start sticky top-2.5 rounded-3xl border border-cyan-500/20 bg-[#07111f]/90 p-2.5 backdrop-blur-xl">
      <div className="mb-3 px-1">
        <div className="text-[10px] uppercase tracking-[0.38em] text-cyan-400/80">AeroNexus OS</div>
        <div className="mt-2 text-lg font-semibold tracking-wide text-white">Nexus OS Workspace</div>
      </div>
      <nav className="space-y-2" aria-label="Main navigation">
        {navItems.map(({ key, label, icon: Icon }) => {
          const active = activePage === key;
          return (
            <button
              key={key}
              onClick={() => setActivePage(key)}
              className={cn('flex w-full items-center gap-2 rounded-2xl border px-4 py-3 text-left transition-colors', active ? 'border-cyan-400/50 bg-cyan-400/10 text-cyan-300' : 'border-white/10 bg-white/[0.02] text-slate-300 hover:border-cyan-500/30 hover:bg-cyan-500/5')}
            >
              {createElement(Icon, { size: 17 })}
              <span className="text-sm font-medium">{label}</span>
            </button>
          );
        })}
      </nav>
      <div className="mt-4 px-1">
        <label htmlFor="sidebar-aircraft-select" className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">
          Selected eVTOL
        </label>
        <div className="relative">
          <Plane size={15} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-cyan-300" />
          <select
            id="sidebar-aircraft-select"
            value={selectedAircraft?.id || ''}
            onChange={(event) => {
              const aircraft = fleet.find((item) => item.id === event.target.value);
              if (aircraft) setSelectedAircraft(aircraft);
            }}
            className="w-full appearance-none rounded-xl border border-cyan-500/25 bg-[#0b1725] py-2.5 pl-9 pr-8 text-xs font-medium text-slate-100 outline-none transition-colors hover:border-cyan-400/50 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/20"
          >
            {fleet.map((aircraft) => (
              <option key={aircraft.id} value={aircraft.id}>
                {aircraft.id} · {aircraft.displayName} ({aircraft.model})
              </option>
            ))}
          </select>
          <ChevronDown size={14} aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>
      </div>
      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-2.5">
        <div className="flex items-center gap-2 text-sm text-emerald-300"><div className="h-2 w-2 rounded-full bg-emerald-400" />NETWORK NOMINAL</div>
        <div className="mt-2 text-xs leading-6 text-slate-400">Federated Intelligence &amp; Predictive Health Platform.</div>
      </div>
    </aside>
  );
}
