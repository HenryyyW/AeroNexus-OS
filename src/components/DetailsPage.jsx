import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, AreaChart, Area } from 'recharts';
import { Radar } from 'lucide-react';
import { cn, getStatusTone, normalizeEvtolId, parseAnalysisItem } from '../utils/evtolUtils';

function DetailMetric({ label, value, accent = 'text-cyan-300' }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-2.5">
      <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500">{label}</div>
      <div className={cn('mt-1 text-base font-mono', accent)}>{value}</div>
    </div>
  );
}

function MetadataRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2">
      <span className="shrink-0 text-slate-400">{label}</span>
      <span className="min-w-0 font-mono text-cyan-300">{value}</span>
    </div>
  );
}

function PdMTrendChart({ data, dataKey, color, title }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-[#07111f]/85 p-2.5">
      <div className="mb-2 text-sm font-medium text-slate-300">{title}</div>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis dataKey="t" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip contentStyle={{ backgroundColor: '#050b14', border: '1px solid rgba(0,240,255,.15)', borderRadius: '12px', color: '#e2f7ff' }} />
            <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2.3} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function PdMAreaChart({ data }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-[#07111f]/85 p-2.5">
      <div className="mb-2 text-sm font-medium text-slate-300">Degradation Vector Analysis</div>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <XAxis dataKey="t" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip contentStyle={{ backgroundColor: '#050b14', border: '1px solid rgba(255,77,109,.18)', borderRadius: '12px' }} />
            <Area type="monotone" dataKey="temp" stroke="#ff4d6d" fill="#ff4d6d22" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ComponentsDataPanel({ aircraft, agentResponse: agentResponseProp }) {
  const rotors = Array.from({ length: 4 }).map((_, i) => {
    const rpmOffset = Math.sin(Date.now() / 1000 + i) * 15;
    const tempOffset = Math.cos(Date.now() / 2000 + i) * 2;
    const vibOffset = Math.sin(Date.now() / 500 + i) * 0.5;
    const vib = Number(aircraft.vibration || 0) + vibOffset;
    return {
      id: `Rotor 0${i + 1}`,
      rpm: Math.round((aircraft.motorRpm || 0) + rpmOffset),
      temp: ((aircraft.temperature || 0) + tempOffset).toFixed(1),
      vib: Math.max(0, vib).toFixed(1),
      status: vib > 40 ? 'Warning' : 'Nominal',
    };
  });

  const batteries = [
    { id: 'Battery Pack A', soc: aircraft.soc || 0, voltage: (aircraft.voltage || 400).toFixed(1), temp: (aircraft.temperature || 0).toFixed(1), status: (aircraft.soc || 0) < 20 ? 'Warning' : 'Nominal' },
    { id: 'Battery Pack B', soc: Math.max(0, (aircraft.soc || 0) - 2), voltage: Math.max(0, (aircraft.voltage || 400) - 0.4).toFixed(1), temp: ((aircraft.temperature || 0) + 1.2).toFixed(1), status: (aircraft.soc || 0) < 22 ? 'Warning' : 'Nominal' },
  ];

  const cockpitVideoMap = {
    'EVTOL-01': '/videos/evtol-1.mp4',
    'EVTOL-02': '/videos/evtol-2.mp4',
    'EVTOL-03': '/videos/evtol-3.mp4',
    'EVTOL-04': '/videos/evtol-4.mp4',
  };
  const cockpitVideoSrc = cockpitVideoMap[aircraft.id] || '/videos/evtol-1.mp4';

  const agentResponse = agentResponseProp || {
    safety_risk_assessment: { risk_level: 'Unknown', primary_risk: 'No agent response loaded.' },
    detailed_analysis: { visual: {}, audio: {}, fusion: 'No fusion analysis available.' },
    possible_causes: [],
    recommended_actions: [],
  };

  const visualItems = Object.values(agentResponse.detailed_analysis.visual || {}).map(parseAnalysisItem);
  const audioItems = Object.values(agentResponse.detailed_analysis.audio || {}).map(parseAnalysisItem);

  return (
    <div className="flex flex-col rounded-3xl border border-cyan-500/20 bg-[#07111f]/90 p-5 h-full">
      <div className="mb-5">
        <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-400/80">Real-time Telemetry</div>
        <h2 className="mt-1 text-[clamp(1rem,1.5vw,1.25rem)] font-semibold text-white tracking-wide">Subsystem Telemetry Stream</h2>
      </div>
      <div className="flex-1 space-y-6 pr-2">
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-[0.15em]">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            Propulsion System
          </h3>
          <div className="grid grid-cols-2 gap-2.5">
            {rotors.map((r) => (
              <div key={r.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 hover:border-cyan-500/30 transition-colors">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-bold text-slate-200">{r.id}</span>
                  <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium tracking-wider uppercase', r.status === 'Warning' ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20')}>{r.status}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[10px]">
                  <div className="bg-black/20 rounded-xl p-2"><span className="text-slate-500 block mb-1">RPM</span><div className="text-cyan-300 font-mono text-sm">{r.rpm}</div></div>
                  <div className="bg-black/20 rounded-xl p-2"><span className="text-slate-500 block mb-1">TMP</span><div className={cn('font-mono text-sm', r.temp > 65 ? 'text-amber-300' : 'text-cyan-300')}>{r.temp}°C</div></div>
                  <div className="bg-black/20 rounded-xl p-2"><span className="text-slate-500 block mb-1">VIB</span><div className={cn('font-mono text-sm', r.vib > 35 ? 'text-amber-300' : 'text-cyan-300')}>{r.vib}</div></div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-[0.15em]">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Power System
          </h3>
          <div className="grid grid-cols-2 gap-2.5">
            {batteries.map((b) => (
              <div key={b.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 hover:border-emerald-500/30 transition-colors">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-bold text-slate-200">{b.id}</span>
                  <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium tracking-wider uppercase', b.status === 'Warning' ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20')}>{b.status}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[10px]">
                  <div className="bg-black/20 rounded-xl p-2"><span className="text-slate-500 block mb-1">SOC</span><div className="text-emerald-300 font-mono text-sm">{b.soc}%</div></div>
                  <div className="bg-black/20 rounded-xl p-2"><span className="text-slate-500 block mb-1">VOLT</span><div className="text-emerald-300 font-mono text-sm">{b.voltage}V</div></div>
                  <div className="bg-black/20 rounded-xl p-2"><span className="text-slate-500 block mb-1">TMP</span><div className="text-emerald-300 font-mono text-sm">{b.temp}°C</div></div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-[0.15em]">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Avionics & Sensors
          </h3>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="flex justify-between items-center rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
              <div className="text-sm font-medium text-slate-200">Main Flight Computer</div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">Online</div>
            </div>
            <div className="flex justify-between items-center rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
              <div className="text-sm font-medium text-slate-200">LiDAR Array</div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">Active</div>
            </div>
            <div className="flex justify-between items-center rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
              <div className="text-sm font-medium text-slate-200">Comm Link</div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">Stable</div>
            </div>
            <div className="flex justify-between items-center rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
              <div className="text-sm font-medium text-slate-200">Nav Sensors</div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">Nominal</div>
            </div>
          </div>
        </div>
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-[0.15em]">
            <div className="w-1.5 h-1.5 rounded-full bg-sky-400" />
            Cockpit
          </h3>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
            <div className="flex justify-between items-center mb-3">
              <div className="text-sm font-bold text-slate-200">View</div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">Live</div>
            </div>
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">
              <video autoPlay loop muted playsInline className="w-full aspect-video object-cover" src={cockpitVideoSrc} />
            </div>
          </div>
        </div>
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-[0.15em]">
            <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
            Agentic Guard
          </h3>
          <div className="rounded-3xl border border-white/10 bg-[#07111f]/90 p-3.5">
            <div className="grid gap-3">
              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-slate-100">Safety Risk Assessment</div>
                  <div className="text-[10px] font-medium uppercase tracking-[0.25em] text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">{agentResponse.safety_risk_assessment?.risk_level || 'Unknown'}</div>
                </div>
                <div className="mt-3 text-sm leading-6 text-slate-300">{agentResponse.safety_risk_assessment?.primary_risk || 'No agent response loaded.'}</div>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="text-sm font-semibold text-slate-100 mb-3">Visual Analysis</div>
                  <div className="space-y-2 text-sm text-slate-300">
                    {visualItems.length > 0 ? visualItems.map((item, idx) => (
                      <div key={idx} className={cn('rounded-2xl border p-2 flex items-start gap-3', item.level === 'danger' ? 'border-red-500/30 bg-red-500/10 text-red-100' : item.level === 'warning' ? 'border-amber-500/30 bg-amber-500/10 text-amber-100' : item.level === 'success' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100' : 'border-white/10 bg-slate-950/80 text-slate-200')}>
                        <span className={cn('mt-1 h-2.5 w-2.5 rounded-full', item.level === 'danger' ? 'bg-red-400' : item.level === 'warning' ? 'bg-amber-300' : item.level === 'success' ? 'bg-emerald-300' : 'bg-slate-500')} />
                        <span>{item.text}</span>
                      </div>
                    )) : <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-2">No visual analysis available.</div>}
                  </div>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="text-sm font-semibold text-slate-100 mb-3">Audio Analysis</div>
                  <div className="space-y-2 text-sm text-slate-300">
                    {audioItems.length > 0 ? audioItems.map((item, idx) => (
                      <div key={idx} className={cn('rounded-2xl border p-2 flex items-start gap-3', item.level === 'danger' ? 'border-red-500/30 bg-red-500/10 text-red-100' : item.level === 'warning' ? 'border-amber-500/30 bg-amber-500/10 text-amber-100' : item.level === 'success' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100' : 'border-white/10 bg-slate-950/80 text-slate-200')}>
                        <span className={cn('mt-1 h-2.5 w-2.5 rounded-full', item.level === 'danger' ? 'bg-red-400' : item.level === 'warning' ? 'bg-amber-300' : item.level === 'success' ? 'bg-emerald-300' : 'bg-slate-500')} />
                        <span>{item.text}</span>
                      </div>
                    )) : <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-2">No audio analysis available.</div>}
                  </div>
                  <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/80 p-3 text-sm text-slate-300">
                    <div className="text-slate-100 font-semibold mb-2">Fusion</div>
                    {agentResponse.detailed_analysis?.fusion || 'No fusion analysis available.'}
                  </div>
                </div>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="text-sm font-semibold text-slate-100 mb-3">Possible Causes</div>
                  {agentResponse.possible_causes?.length > 0 ? (
                    <ul className="list-disc list-inside space-y-2 text-sm text-slate-300">
                      {agentResponse.possible_causes.map((cause, idx) => <li key={idx}>{cause}</li>)}
                    </ul>
                  ) : (
                    <div className="text-sm text-slate-500">No possible causes available.</div>
                  )}
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="text-sm font-semibold text-slate-100 mb-3">Recommended Actions</div>
                  {agentResponse.recommended_actions?.length > 0 ? (
                    <ul className="list-disc list-inside space-y-2 text-sm text-slate-300">
                      {agentResponse.recommended_actions.map((action, idx) => <li key={idx}>{action}</li>)}
                    </ul>
                  ) : (
                    <div className="text-sm text-slate-500">No recommended actions available.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DetailsPage({ selectedAircraft, agentResponses }) {
  if (!selectedAircraft) return null;
  const tone = getStatusTone(selectedAircraft.status);
  const responseKey = normalizeEvtolId(selectedAircraft.id);
  const inlineAgent = selectedAircraft.agent || selectedAircraft?.agenticGuard || null;
  const agentResp = inlineAgent || agentResponses[responseKey] || null;

  return (
    <section className="grid grid-cols-[1.02fr_0.98fr] gap-2">
      <ComponentsDataPanel aircraft={selectedAircraft} agentResponse={agentResp} />
      <div className="grid min-w-0 gap-2">
        <div className="rounded-3xl border border-white/10 bg-[#07111f]/90 p-2.5">
          <div className="mb-3 flex items-start justify-between gap-2">
            <div>
              <div className="text-[10px] uppercase tracking-[0.28em] text-slate-500">PdM Data</div>
              <div className="mt-1 text-xl font-semibold text-white">{selectedAircraft.id} RUL Predictive Matrix</div>
            </div>
            <div className={cn('rounded-full px-2 py-1 text-[10px] font-medium', tone.chip)}>{selectedAircraft.pdm.riskLevel} Risk</div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <DetailMetric label="Motor RPM" value={Math.round(selectedAircraft.motorRpm)} />
            <DetailMetric label="Vibration" value={`${Number(selectedAircraft.vibration || 0).toFixed(1)} Hz`} accent={selectedAircraft.vibration > 50 ? 'text-red-300' : 'text-emerald-300'} />
            <DetailMetric label="Battery Delta" value={`${selectedAircraft.batteryDelta}%`} accent={selectedAircraft.batteryDelta > 3 ? 'text-red-300' : 'text-cyan-300'} />
            <DetailMetric label="Anomaly Score" value={selectedAircraft.anomalyScore.toFixed(2)} accent={selectedAircraft.anomalyScore > 0.4 ? 'text-red-300' : 'text-amber-300'} />
          </div>
          <div className="mt-2 rounded-2xl border border-white/10 bg-white/[0.03] p-2.5">
            <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Maintenance Warning</div>
            <div className={cn('mt-1 text-sm leading-6', selectedAircraft.status === 'Warning' ? 'text-red-300' : 'text-slate-300')}>
              {selectedAircraft.pdm.warning}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <PdMTrendChart data={selectedAircraft.pdm.trends} dataKey="temp" color="#ff4d6d" title="Battery Temperature Trend" />
          <PdMTrendChart data={selectedAircraft.pdm.trends} dataKey="vib" color="#37f29b" title="Rotor Vibration Trend" />
          <PdMTrendChart data={selectedAircraft.pdm.trends} dataKey="rpm" color="#00f0ff" title="Motor RPM Trend" />
          <PdMAreaChart data={selectedAircraft.pdm.trends} />
        </div>
        <div className="grid grid-cols-[1fr_1fr] gap-2">
          <div className="rounded-3xl border border-white/10 bg-[#07111f]/90 p-2.5">
            <div className="text-sm font-medium text-white">Asset Metadata</div>
            <div className="mt-2 space-y-2 text-sm text-slate-300">
              <MetadataRow label="Mission" value={selectedAircraft.mission} />
              <MetadataRow label="Role" value={selectedAircraft.role} />
              <MetadataRow label="Last Maintenance" value={selectedAircraft.lastMaintenance} />
              <MetadataRow label="Next Inspection" value={selectedAircraft.nextInspection} />
              <MetadataRow label="Battery Cycles" value={selectedAircraft.batteryCycles} />
              <MetadataRow label="PKM" value={selectedAircraft.pkm} />
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-[#07111f]/90 p-2.5">
            <div className="text-sm font-medium text-white">Digital Twin Notes</div>
            <div className="mt-2 space-y-2">
              {selectedAircraft.twinNotes.map((note) => (
                <div key={note} className="flex gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-2 text-sm text-slate-300">
                  <Radar size={14} className="mt-0.5 shrink-0 text-cyan-300" />
                  <span>{note}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
