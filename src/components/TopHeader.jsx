import { Activity } from 'lucide-react';

export default function TopHeader({ activePage, selectedAircraft, fleetStats, onLogout }) {
  const titles = {
    home: 'Fleet Health Overview',
    twins: 'Spatial Synchronization',
    details: 'Asset Diagnostics',
    'agentic-guard': 'Agentic Guard',
    settings: 'System Configuration',
  };

  return (
    <header className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-cyan-500/20 bg-[#07111f]/85 px-6 py-4 backdrop-blur-xl">
      <div>
        <div className="text-[10px] uppercase tracking-[0.38em] text-cyan-400/80">Active Sync Environment</div>
        <h1 className="mt-1 text-2xl font-bold tracking-wide text-white">{titles[activePage]}</h1>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 border-r border-white/10 pr-6">
          <div className="flex flex-col text-right">
            <div className="text-[10px] uppercase tracking-[0.28em] text-cyan-300/70">Fleet Assets</div>
            <div className="font-mono text-lg font-bold text-cyan-300">4</div>
          </div>
          <div className="h-6 w-px bg-white/10" />
          <div className="flex flex-col">
            <div className="text-[10px] uppercase tracking-[0.28em] text-red-300/70">Warnings</div>
            <div className="font-mono text-lg font-bold text-red-300">{fleetStats.activeWarnings}</div>
          </div>
        </div>
        <div className="flex flex-col text-right">
          <div className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Active Trajectories</div>
          <div className="mt-1 font-mono text-sm text-cyan-300">{selectedAircraft?.id}</div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex h-10 shrink-0 items-center whitespace-nowrap rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 text-sm font-medium text-emerald-300"><Activity size={15} className="mr-2" />AI Monitoring Enabled</div>
          <button onClick={onLogout} className="flex h-10 items-center rounded-2xl border border-red-500/30 bg-red-500/10 px-4 text-sm font-medium text-red-200 transition-colors hover:bg-red-500/15">Logout</button>
        </div>
      </div>
    </header>
  );
}
