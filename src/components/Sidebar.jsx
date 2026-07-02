import { Cpu, Home, Plane, Settings } from 'lucide-react';
import { cn } from '../utils/evtolUtils';

const navItems = [
  { key: 'home', label: 'Home', icon: Home },
  { key: 'details', label: 'Asset Diagnostics', icon: Plane },
  { key: 'twins', label: 'Spatial Synchronization', icon: Cpu },
  { key: 'settings', label: 'System Configuration', icon: Settings },
];

export default function Sidebar({ activePage, setActivePage }) {
  return (
    <aside className="w-[220px] shrink-0 rounded-3xl border border-cyan-500/20 bg-[#07111f]/90 p-2.5 backdrop-blur-xl self-start sticky top-2.5">
      <div className="mb-3 px-1">
        <div className="text-[10px] uppercase tracking-[0.38em] text-cyan-400/80">Ascendo Nexus OS</div>
        <div className="mt-2 text-lg font-semibold tracking-wide text-white">Nexus OS Workspace</div>
      </div>
      <nav className="space-y-2">
        {navItems.map(({ key, label, icon: Icon }) => {
          const active = activePage === key;
          return (
            <button key={key} onClick={() => setActivePage(key)} className={cn('flex w-full items-center gap-2 rounded-2xl border px-4 py-3 text-left transition-colors', active ? 'border-cyan-400/50 bg-cyan-400/10 text-cyan-300' : 'border-white/10 bg-white/[0.02] text-slate-300 hover:border-cyan-500/30 hover:bg-cyan-500/5')}>
              <Icon size={17} />
              <span className="text-sm font-medium">{label}</span>
            </button>
          );
        })}
      </nav>
      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-2.5">
        <div className="flex items-center gap-2 text-sm text-emerald-300"><div className="h-2 w-2 rounded-full bg-emerald-400" />NETWORK NOMINAL</div>
        <div className="mt-2 text-xs leading-6 text-slate-400">Federated Intelligence & Predictive Health Platform.</div>
      </div>
    </aside>
  );
}
