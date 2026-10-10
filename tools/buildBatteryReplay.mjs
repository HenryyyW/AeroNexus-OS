import { createReadStream, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { createBatteryReplayBuilder } from './batteryReplay.mjs';

const sourcePath = resolve('data/SNL_18650_LFP_25C_0-100_0.5-2C_a_timeseries.txt');
const outputPath = resolve('public/telemetry/battery-replay.json');
const builder = createBatteryReplayBuilder();
const input = createInterface({ input: createReadStream(sourcePath), crlfDelay: Infinity });

for await (const line of input) {
  builder.addLine(line);
}

const output = builder.finish();
const pairedCycles = output.cycles.filter((cycle) => cycle.hasPairedChargeDischarge);
const finalEligibleCycle = pairedCycles.at(-1);

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(output)}\n`);
console.log(JSON.stringify({
  outputPath,
  outputBytes: statSync(outputPath).size,
  sourceRows: output.source.sourceRows,
  skippedRows: output.source.skippedRows,
  cycles: output.cycles.length,
  samples: output.cycles.reduce((sum, cycle) => sum + cycle.samples.length, 0),
  capacityTrend: output.capacityTrend,
  firstEligibleCycle: pairedCycles[0] && {
    cycleIndex: pairedCycles[0].cycleIndex,
    dischargeCapacityAh: pairedCycles[0].peakDischargeCapacityAh,
    rows: pairedCycles[0].sourceRowCount,
  },
  lastEligibleCycle: finalEligibleCycle && {
    cycleIndex: finalEligibleCycle.cycleIndex,
    dischargeCapacityAh: finalEligibleCycle.peakDischargeCapacityAh,
    capacityRetentionPercent: finalEligibleCycle.capacityRetentionPercent,
  },
}, null, 2));