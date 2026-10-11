import { useEffect, useState } from 'react';

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, AreaChart, Area } from 'recharts';

import { ChevronDown, ChevronRight, Pause, Play, Radar } from 'lucide-react';

import { cn, getStatusTone, normalizeEvtolId, parseAnalysisItem } from '../utils/evtolUtils';

import { buildAircraftAssetTree } from '../utils/assetModel';



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



function AssetStatus({ level }) {

  const tone = {

    Critical: 'border-red-500/30 bg-red-500/10 text-red-300',

    Warning: 'border-amber-500/30 bg-amber-500/10 text-amber-200',

    Monitoring: 'border-sky-500/30 bg-sky-500/10 text-sky-200',

    Nominal: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',

    Unknown: 'border-white/10 bg-white/[0.04] text-slate-400',

  };

  return <span className={cn('rounded-full border px-2 py-0.5 text-[10px] uppercase', tone[level] || tone.Unknown)}>{level}</span>;

}



// New components for alignment & credibility

function EventTimeDisplay({ eventTime, processingTime }) {

  const eventDate = eventTime ? new Date(eventTime) : null;

  const processDate = processingTime ? new Date(processingTime) : null;



  return (

    <div className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-3 text-xs">

      <div className="flex items-center justify-between gap-2">

        <span className="font-medium">Event Time:</span>

        <span className="font-mono text-cyan-300">{eventDate ? eventDate.toLocaleString() : 'N/A'}</span>

      </div>

      <div className="flex items-center justify-between gap-2">

        <span className="font-medium">Processed:</span>

        <span className="font-mono text-slate-300">{processDate ? processDate.toLocaleString() : 'N/A'}</span>

      </div>

    </div>

  );

}



function SensorHealthDisplay({ sensorOK }) {

  if (!sensorOK) return null;



  const sensorItems = Object.entries(sensorOK).map(([name, ok]) => (

    <div key={name} className="flex items-center gap-2">

      <span className="text-xs font-medium">{name}:</span>

      <span className={cn('rounded-full px-2 py-0.5 text-[10px]', ok ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300')}>

        {ok ? 'OK' : 'FAIL'}

      </span>

    </div>

  ));



  return (

    <div className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-3 text-xs">

      <div className="text-[10px] font-medium mb-1">Sensor Health:</div>

      <div className="space-y-1">{sensorItems}</div>

    </div>

  );

}



function ValidationDisplay({ validationDetails }) {

  if (!validationDetails) return null;



  const validationItems = Object.entries(validationDetails).map(([name, detail]) => {

    const { valid, corrected, reason, reasons } = detail;

    const validationReason = reason || reasons?.filter(Boolean).join(', ');

    return (

      <div key={name} className="flex items-center justify-between gap-2">

        <span className="text-xs font-medium">{name}:</span>

        <div className="flex items-center gap-1">

          <span className={cn('rounded-full px-2 py-0.5 text-[10px]', valid ? (corrected ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300') : 'bg-red-500/20 text-red-300')}>

            {valid ? (corrected ? 'Corrected' : 'OK') : 'Invalid'}

          </span>

          {validationReason && (

            <span className="ml-1 text-[8px] italic text-slate-400">({validationReason})</span>

          )}

        </div>

      </div>

    );

  });



  return (

    <div className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-3 text-xs">

      <div className="text-[10px] font-medium mb-1">Validation:</div>

      <div className="space-y-1">{validationItems}</div>

    </div>

  );

}



function ConfidenceDisplay({ confidence }) {

  if (confidence === null) return null;



  const confidencePercent = (confidence * 100).toFixed(1);

  const tone = confidence >= 0.8 ? 'text-emerald-300' : confidence >= 0.6 ? 'text-amber-300' : 'text-red-300';



  return (

    <div className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-3 text-xs">

      <div className="text-[10px] font-medium mb-1">Confidence:</div>

      <div className="flex items-center justify-between gap-2">

        <span className="font-mono">{confidencePercent}%</span>

        <span className={tone}>●</span>

      </div>

    </div>

  );

}



function AssetTreeNode({ asset, depth = 0, selectedId, onSelect }) {

  const [expanded, setExpanded] = useState(depth < 3);

  const selected = selectedId === asset.id;

  return (

    <div>

      <div className={cn('flex items-center gap-1 rounded-lg pr-2', selected ? 'bg-cyan-400/10' : 'hover:bg-white/[0.04]')} style={{ paddingLeft: `${depth * 12 + 4}px` }}>

        {asset.children.length > 0 ? (

          <button type="button" className="grid size-7 shrink-0 place-items-center text-slate-400 hover:text-white" aria-label={`${expanded ? 'Collapse' : 'Expand'} ${asset.name}`} onClick={() => setExpanded(!expanded)}>

            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}

          </button>

        ) : <span className="size-7 shrink-0" />}

        <button type="button" onClick={() => onSelect(asset.id)} className="flex min-w-0 flex-1 items-center justify-between gap-2 py-1.5 text-left">

          <span className={cn('truncate text-xs', selected ? 'text-cyan-100' : 'text-slate-300')}>{asset.name}</span>

          <AssetStatus level={asset.alertLevel} />

        </button>

      </div>

      {expanded && asset.children.map((child) => <AssetTreeNode key={child.id} asset={child} depth={depth + 1} selectedId={selectedId} onSelect={onSelect} />)}

    </div>

  );

}



function AssetDetail({ asset }) {

  const updated = asset.lastUpdated ? new Date(asset.lastUpdated).toLocaleString() : 'Not available';



  return (

    <div className="min-w-0 space-y-4">

      <div className="flex flex-wrap items-center justify-between gap-2">

        <div>

          <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">{asset.kind} state</div>

          <h3 className="mt-1 text-base font-semibold text-white">{asset.name}</h3>

        </div>

        <AssetStatus level={asset.alertLevel} />

      </div>



      <div className="grid grid-cols-2 gap-2">

        <DetailMetric label="Health" value={asset.health == null ? 'Unknown' : `${asset.health}%`} accent={asset.health != null && asset.health <= 85 ? 'text-amber-300' : 'text-cyan-300'} />

        <DetailMetric label="Operating condition" value={asset.operatingCondition.state} accent="text-slate-200" />

        <DetailMetric label="Remaining life" value={asset.remainingLife.value == null ? 'Unknown' : `${asset.remainingLife.value} ${asset.remainingLife.unit}`} accent="text-slate-200" />

        <DetailMetric label="Last update" value={updated} accent="text-slate-300" />

      </div>



      {asset.operatingCondition.metrics.length > 0 && (

        <div className="grid grid-cols-2 gap-2">

          {asset.operatingCondition.metrics.map((item) => <DetailMetric key={item.name} label={item.name} value={`${item.value} ${item.unit}`} accent="text-cyan-200" />)}

        </div>

      )}



      <div className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-3 text-xs">

        <div><span className="text-slate-500">Source: </span><span className="text-slate-300">{asset.source}</span></div>

        <div><span className="text-slate-500">State rule: </span><span className="text-slate-300">{asset.method}</span></div>

        <div><span className="text-slate-500">Life basis: </span><span className="text-slate-300">{asset.remainingLife.basis}</span></div>

      </div>



      {/* Alignment & Credibility Section */}

      <div className="space-y-3">

        <div className="text-[10px] font-medium mb-1">Alignment & Credibility:</div>



        {/* Event Time */}

        {asset.eventTime && (

          <EventTimeDisplay

            eventTime={asset.eventTime}

            processingTime={asset.processingTime}

          />

        )}



        {/* Sensor Health */}

        {asset.sensorOK && (

          <SensorHealthDisplay sensorOK={asset.sensorOK} />

        )}



        {/* Validation Details */}

        {asset.validationDetails && (

          <ValidationDisplay validationDetails={asset.validationDetails} />

        )}



        {/* Confidence */}

        {asset.confidence !== null && (

          <ConfidenceDisplay confidence={asset.confidence} />

        )}

      </div>

    </div>

  );

}



function BatteryReplayPanel() {

  const [dataset, setDataset] = useState(null);

  const [cycleOffset, setCycleOffset] = useState(0);

  const [sampleOffset, setSampleOffset] = useState(0);

  const [isPlaying, setIsPlaying] = useState(false);

  const [loadError, setLoadError] = useState('');



  useEffect(() => {

    const controller = new AbortController();

    fetch('/telemetry/battery-replay.json', { signal: controller.signal })

      .then((res) => {

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        return res.json();

      })

      .then(setDataset)

      .catch((error) => {

        if (error.name !== 'AbortError') setLoadError('Recorded battery dataset could not be loaded.');

      });

    return () => controller.abort();

  }, []);



  const cycle = dataset?.cycles[cycleOffset];

  const samples = cycle?.samples || [];

  const eligibleCycles = dataset?.cycles.filter((item) => item.hasPairedChargeDischarge) || [];

  const sample = samples[Math.min(sampleOffset, Math.max(samples.length - 1, 0))];



  useEffect(() => {

    if (!isPlaying || samples.length < 2) return undefined;

    const interval = setInterval(() => {

      setSampleOffset((offset) => (offset + 1) % samples.length);

    }, 900);

    return () => clearInterval(interval);

  }, [isPlaying, samples.length]);



  return (

    <section className="rounded-xl border border-sky-400/20 bg-sky-950/20 p-3" aria-label="Recorded battery cell replay">

      <div className="flex flex-wrap items-start justify-between gap-2">

        <div>

          <div className="text-[10px] uppercase tracking-[0.18em] text-sky-300">Recorded Dataset Replay</div>

          <h3 className="mt-1 text-sm font-semibold text-white">18650 LFP bench-test cell</h3>

          <p className="mt-1 text-[11px] text-slate-400">Independent lab asset · not eVTOL battery telemetry</p>

        </div>

        {cycle && <span className="rounded-full border border-sky-300/20 px-2 py-1 text-[10px] text-sky-200">Cycle {cycle.cycleIndex}</span>}

      </div>



      {loadError ? <p className="mt-3 text-xs text-rose-300">{loadError}</p> : !dataset ? (

        <p className="mt-3 text-xs text-slate-400">Loading recorded battery data…</p>

      ) : cycle && sample ? (

        <>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">

            <DetailMetric label="Voltage" value={`${sample.voltageV.toFixed(3)} V`} accent="text-cyan-200" />

            <DetailMetric label="Current" value={`${sample.currentA.toFixed(3)} A`} accent="text-sky-200" />

            <DetailMetric label="Cell temperature" value={`${sample.cellTemperatureC.toFixed(2)} °C`} accent="text-amber-200" />

            <DetailMetric label="Charge capacity" value={`${sample.chargeCapacityAh.toFixed(3)} Ah`} accent="text-slate-200" />

            <DetailMetric label="Discharge capacity" value={`${sample.dischargeCapacityAh.toFixed(3)} Ah`} accent="text-slate-200" />

            <DetailMetric label="Relative discharge capacity" value={cycle.capacityRetentionPercent == null ? 'Not eligible' : `${cycle.capacityRetentionPercent.toFixed(2)}%`} accent="text-sky-200" />

            <DetailMetric label="Peak cycle temperature" value={`${cycle.peakCellTemperatureC.toFixed(2)} °C`} accent="text-slate-200" />

          </div>



          <div className="mt-3 rounded-lg border border-white/10 bg-black/20 p-2">

            <div className="flex flex-wrap items-center justify-between gap-2 px-1">

              <div className="text-xs font-medium text-slate-200">Capacity retention vs first eligible cycle</div>

              <div className="font-mono text-[10px] text-sky-200">Baseline {dataset.capacityTrend.referenceDischargeCapacityAh?.toFixed(3) ?? 'N/A'} Ah · Cycle {dataset.capacityTrend.referenceCycleIndex ?? 'N/A'}</div>

            </div>

            <div className="mt-2 h-36">

              <ResponsiveContainer width="100%" height="100%">

                <LineChart data={eligibleCycles}>

                  <XAxis dataKey="cycleIndex" tick={{ fill: '#64748b', fontSize: 9 }} axisLine={false} tickLine={false} />

                  <YAxis domain={['auto', 'auto']} tick={{ fill: '#64748b', fontSize: 9 }} width={38} />

                  <Tooltip contentStyle={{ backgroundColor: '#050b14', border: '1px solid rgba(255,255,255,.12)', borderRadius: '8px', color: '#e2f7ff' }} />

                  <Line type="monotone" dataKey="capacityRetentionPercent" name="Relative capacity (%)" stroke="#38bdf8" strokeWidth={1.7} dot={false} connectNulls={false} />

                </LineChart>

              </ResponsiveContainer>

            </div>

            <p className="mt-1 text-[10px] leading-4 text-slate-500">

              {dataset.capacityTrend.eligibleCycleCount.toLocaleString()} of {dataset.cycles.length.toLocaleString()} cycle indices contain both current directions and positive discharge capacity. The source does not provide a verified discharge cutoff, so this is a relative measured-capacity trend, not certified SOH or RUL.

            </p>

          </div>



          <div className="mt-3 h-36 rounded-lg border border-white/10 bg-black/20 p-2">

            <ResponsiveContainer width="100%" height="100%">

              <LineChart data={samples}>

                <XAxis dataKey="testTimeSeconds" tick={{ fill: '#64748b', fontSize: 9 }} axisLine={false} tickLine={false} />

                <YAxis yAxisId="voltage" domain={['auto', 'auto']} tick={{ fill: '#67e8f9', fontSize: 9 }} width={36} />

                <YAxis yAxisId="temperature" orientation="right" domain={['auto', 'auto']} tick={{ fill: '#fcd34d', fontSize: 9 }} width={36} />

                <Tooltip contentStyle={{ backgroundColor: '#050b14', border: '1px solid rgba(255,255,255,.12)', borderRadius: '8px', color: '#e2f7ff' }} />

                <Line yAxisId="voltage" type="monotone" dataKey="voltageV" name="Voltage (V)" stroke="#67e8f9" strokeWidth={1.7} dot={false} />

                <Line yAxisId="temperature" type="monotone" dataKey="cellTemperatureC" name="Cell temp (°C)" stroke="#fbbf24" strokeWidth={1.5} dot={false} />

              </LineChart>

            </ResponsiveContainer>

          </div>



          <div className="mt-3 flex items-center gap-2">

            <button type="button" onClick={() => setIsPlaying(!isPlaying)} className="grid size-8 shrink-0 place-items-center rounded-lg border border-white/10 text-slate-200 hover:bg-white/[0.06]" aria-label={isPlaying ? 'Pause replay' : 'Play replay'} title={isPlaying ? 'Pause replay' : 'Play replay'}>

              {isPlaying ? <Pause size={14} /> : <Play size={14} />}

            </button>

            <label className="min-w-0 flex-1">

              <span className="sr-only">Recorded sample position</span>

              <input type="range" min="0" max={Math.max(samples.length - 1, 0)} value={Math.min(sampleOffset, Math.max(samples.length - 1, 0))} onChange={(event) => setSampleOffset(Number(event.target.value))} className="w-full accent-cyan-300" />

            </label>

            <span className="shrink-0 font-mono text-[10px] text-slate-400">{sampleOffset + 1}/{samples.length}</span>

          </div>

          <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400">

            <span>Recorded: <time>{sample.timestamp}</time></span>

            <span>{cycle.sourceRowCount.toLocaleString()} source rows · {samples.length} replay samples</span>

          </div>

          <label className="mt-3 block text-[10px] text-slate-400">

            Cycle {cycleOffset + 1} of {dataset.cycles.length}

            <input type="range" min="0" max={dataset.cycles.length - 1} value={cycleOffset} onChange={(event) => { setCycleOffset(Number(event.target.value)); setSampleOffset(0); setIsPlaying(false); }} className="mt-1 w-full accent-sky-300" />

          </label>

          <div className="mt-2 break-words text-[10px] text-slate-500">Source file: {dataset.source.file} · Every {dataset.source.sampleEverySourceRows}th source row plus each cycle’s first and last rows.</div>

        </>

      ) : <p className="mt-3 text-xs text-slate-400">No replay samples are available.</p>}

    </section>

  );

}



function ComponentsDataPanel({ aircraft, agentResponse: agentResponseProp, view = 'asset-diagnosis' }) {

  const assetTree = buildAircraftAssetTree(aircraft);

  const allAssets = [];

  const collectAssets = (asset) => {

    allAssets.push(asset);

    asset.children.forEach(collectAssets);

  };

  collectAssets(assetTree);

  const componentAssets = allAssets.filter((asset) => asset.kind === 'component');

  const attentionCount = componentAssets.filter((asset) => ['Critical', 'Warning', 'Monitoring'].includes(asset.alertLevel)).length;

  const unknownCount = componentAssets.filter((asset) => asset.alertLevel === 'Unknown').length;

  const [selectedAssetId, setSelectedAssetId] = useState(assetTree.children[0]?.children[0]?.id || assetTree.id);

  const [isBatteryReplayVisible, setIsBatteryReplayVisible] = useState(false);

  const selectedAsset = allAssets.find((asset) => asset.id === selectedAssetId) || assetTree;



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

        <div className="text-[10px] uppercase tracking-[0.3em] text-amber-300/90">Digital Twin · Demo Model</div>

        <h2 className="mt-1 text-lg font-semibold text-white">{aircraft.id} {view === 'agentic-guard' ? 'Agentic Guard' : 'Asset Hierarchy'}</h2>

        <p className="mt-1 text-xs text-slate-400">{view === 'agentic-guard' ? 'Cockpit view and multimodal safety assessment.' : 'Fleet values are simulated; component-level sensors are not connected.'}</p>

      </div>

      <div className="flex-1 space-y-4 overflow-y-auto pr-1">
        {view === 'asset-diagnosis' ? (
          <>
            <section aria-label="Current component status" className="rounded-xl border border-white/10 bg-black/20 p-3">

              <div className="flex flex-wrap items-center justify-between gap-2">

                <div>

                  <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-200">Component status</h3>

                  <p className="mt-1 text-[10px] text-slate-500">

                    {attentionCount > 0 ? `${attentionCount} component(s) need attention` : 'No modeled component alerts'} · {unknownCount} unknown due to missing component telemetry

                  </p>

                </div>

                <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-200">Simulated fleet state</span>

              </div>

              <div className="mt-2 grid gap-1.5 sm:grid-cols-2">

                {componentAssets.map((asset) => (

                  <button

                    key={asset.id}

                    type="button"

                    onClick={() => setSelectedAssetId(asset.id)}

                    aria-pressed={selectedAssetId === asset.id}

                    className={cn('flex min-w-0 items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors', selectedAssetId === asset.id ? 'border-cyan-400/40 bg-cyan-400/[0.08]' : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05]')}

                  >

                    <span className="min-w-0">

                      <span className="block truncate text-xs text-slate-200">{asset.name}</span>

                      <span className="mt-0.5 block truncate text-[10px] text-slate-500">{asset.operatingCondition.state}</span>

                    </span>

                    <span className="flex shrink-0 flex-col items-end gap-1">

                      <AssetStatus level={asset.alertLevel} />

                      <span className="font-mono text-[10px] text-slate-500">{asset.health == null ? 'No health data' : `${asset.health}% health proxy`}</span>

                    </span>

                  </button>

                ))}

              </div>

            </section>

            <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(210px,0.8fr)_minmax(0,1.2fr)]">

              <nav aria-label="Aircraft asset hierarchy" className="min-w-0 rounded-xl border border-white/10 bg-black/20 p-2">

                <AssetTreeNode asset={assetTree} selectedId={selectedAssetId} onSelect={setSelectedAssetId} />

              </nav>

              <div className="min-w-0 rounded-xl border border-white/10 bg-black/20 p-3">

                <AssetDetail asset={selectedAsset} />

              </div>

            </div>

            <section className="rounded-xl border border-white/10 bg-black/20 p-3">

              <button

                type="button"

                aria-expanded={isBatteryReplayVisible}

                aria-controls="battery-replay-panel"

                onClick={() => setIsBatteryReplayVisible(!isBatteryReplayVisible)}

                className="flex w-full items-center justify-between gap-3 text-left"

              >

                <span>

                  <span className="block text-xs font-medium text-slate-200">Offline battery cell replay</span>

                  <span className="mt-1 block text-[10px] text-slate-500">Optional lab dataset · loads only when opened</span>

                </span>

                <span className="flex shrink-0 items-center gap-2 text-[10px] text-sky-200">

                  {isBatteryReplayVisible ? 'Hide replay' : 'Open replay'}

                  {isBatteryReplayVisible ? <ChevronDown size={14} /> : <ChevronRight size={14} />}

                </span>

              </button>

              {isBatteryReplayVisible && <div id="battery-replay-panel" className="mt-3"><BatteryReplayPanel /></div>}

            </section>
          </>
        ) : (
          <>
            <div>

              <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-[0.15em]">

                <div className="w-1.5 h-1.5 rounded-full bg-sky-400" />

                Cockpit

              </h3>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">

                <div className="flex justify-between items-center mb-3">

                  <div className="text-sm font-bold text-slate-200">View</div>

                  <div className="text-[10px] font-medium uppercase tracking-wider text-amber-200 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">Demo media</div>

                </div>

                <div className="overflow-hidden rounded-2xl border border-black">

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

                    </div>
                  </div>

                  <div className="grid gap-2 md:grid-cols-2">

                    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-3">

                      <div className="text-sm font-semibold text-slate-100 mb-2">Fusion</div>

                      {agentResponse.detailed_analysis?.fusion || 'No fusion analysis available.'}

                    </div>

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
          </>
        )}
      </div>
    </div>

  );

}



function WhatIfSimulationPanel({ aircraft }) {

  const [loadFactor, setLoadFactor] = useState(1.0);

  const [tempOffset, setTempOffset] = useState(0.0);

  const [vibFactor, setVibFactor] = useState(1.0);



  const baselineRul = aircraft.predictedRulHours ?? null;

  const baselineRulStatus = aircraft.predictedRulStatus ?? (baselineRul !== null ? 'finite' : 'unknown');

  const batterySlope = aircraft.batterySlope ?? null;

  const damageSlope = aircraft.damageSlope ?? null;

  const capacityNow = aircraft.batteryCapacity ?? 0.0;

  const capacityMin = 2.0;

  const damageNow = aircraft.structuralDamage ?? 0.0;

  const damageMax = 1.0;



  // Temperature factor: simple Arrhenius approximation

  const tempFactor = Math.exp(0.05 * tempOffset); // adjust as needed



  const adjBatterySlope = batterySlope === null ? null : batterySlope * loadFactor * tempFactor;

  const adjDamageSlope = damageSlope === null ? null : damageSlope * vibFactor;



  let batteryRul = null;

  if (adjBatterySlope !== null && adjBatterySlope < 0) {

    const capNow = capacityNow;

    if (capNow > capacityMin) {

      batteryRul = (capNow - capacityMin) / Math.abs(adjBatterySlope);

      if (batteryRul < 0) batteryRul = 0;

    } else {

      batteryRul = 0;

    }

  }



  let damageRul = null;

  if (adjDamageSlope !== null && adjDamageSlope > 0) {

    const damNow = damageNow;

    if (damNow < damageMax) {

      damageRul = (damageMax - damNow) / adjDamageSlope;

      if (damageRul < 0) damageRul = 0;

    } else {

      damageRul = 0;

    }

  }



  return (

    <div className="what-if-panel rounded-3xl border border-white/10 bg-[#07111f]/90 p-4">

      <div className="mb-4">

        <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-400/80">What-if Simulation</div>

        <h2 className="mt-1 text-lg font-semibold text-white">Adjust Parameters</h2>

      </div>

      <div className="space-y-4">

        <div>

          <div className="flex items-center justify-between gap-2 mb-2">

            <span className="text-xs font-medium">Load Factor (× motor current)</span>

            <span className="text-xs font-mono text-cyan-300">{loadFactor.toFixed(2)}</span>

          </div>

          <div className="flex items-center">

            <input type="range" min="0.5" max="2.0" step="0.1" value={loadFactor} onChange={e => setLoadFactor(parseFloat(e.target.value))} className="w-full accent-cyan-300" />

          </div>

        </div>

        <div>

          <div className="flex items-center justify-between gap-2 mb-2">

            <span className="text-xs font-medium">Temperature Offset (°C)</span>

            <span className="text-xs font-mono text-cyan-300">{tempOffset.toFixed(1)}</span>

          </div>

          <div className="flex items-center">

            <input type="range" min="-10" max="10" step="0.5" value={tempOffset} onChange={e => setTempOffset(parseFloat(e.target.value))} className="w-full accent-cyan-300" />

          </div>

        </div>

        <div>

          <div className="flex items-center justify-between gap-2 mb-2">

            <span className="text-xs font-medium">Vibration Factor (×)</span>

            <span className="text-xs font-mono text-cyan-300">{vibFactor.toFixed(2)}</span>

          </div>

          <div className="flex items-center">

            <input type="range" min="0.5" max="2.0" step="0.1" value={vibFactor} onChange={e => setVibFactor(parseFloat(e.target.value))} className="w-full accent-cyan-300" />

          </div>

        </div>

      </div>

      <div className="mt-4">

        <div className="text-[10px] font-medium mb-2">Projected RUL (hours)</div>

        <div className="grid grid-cols-2 gap-4">

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">

            <div className="text-[10px] font-medium">Battery</div>

            <div className="mt-2 text-2xl font-mono">{batteryRul !== null ? `${batteryRul.toFixed(1)} h` : batterySlope === null ? 'N/A' : 'MAX'}</div>

          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">

            <div className="text-[10px] font-medium">Structure</div>

            <div className="mt-2 text-2xl font-mono">{damageRul !== null ? `${damageRul.toFixed(1)} h` : damageSlope === null ? 'N/A' : 'MAX'}</div>

          </div>

        </div>

        <div className="mt-3 text-[10px] text-slate-400">

          Baseline RUL: {baselineRul !== null ? `${baselineRul.toFixed(1)} h` : baselineRulStatus === 'max' ? 'MAX' : 'N/A'}

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

      <ComponentsDataPanel key={selectedAircraft.id} aircraft={selectedAircraft} agentResponse={agentResp} />

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

        <WhatIfSimulationPanel aircraft={selectedAircraft} />

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

export function AgenticGuardPage({ selectedAircraft, agentResponses }) {
  if (!selectedAircraft) return null;

  const responseKey = normalizeEvtolId(selectedAircraft.id);
  const agentResponse = selectedAircraft.agent || selectedAircraft.agenticGuard || agentResponses[responseKey] || null;

  return (
    <section className="min-w-0 lg:w-1/2">
      <ComponentsDataPanel
        key={selectedAircraft.id}
        aircraft={selectedAircraft}
        agentResponse={agentResponse}
        view="agentic-guard"
      />
    </section>
  );
}