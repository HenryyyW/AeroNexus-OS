import assert from 'node:assert/strict';
import test from 'node:test';
import { createBatteryReplayBuilder } from './batteryReplay.mjs';

const header = '\uFEFFDate_Time,Test_Time (s),Cycle_Index,Current (A),Voltage (V),Charge_Capacity (Ah),Discharge_Capacity (Ah),Cell_Temperature (C)';

function row({ time, cycle, current, charge = 0, discharge = 0, voltage = 3.2, temperature = 25 }) {
  return [time, Number(String(time).replace(/^t/, '')), cycle, current, voltage, charge, discharge, temperature].join(',');
}

test('aggregates measured bidirectional cycles and normalizes against the first eligible cycle', () => {
  const builder = createBatteryReplayBuilder();
  builder.addLine(header);

  for (let index = 1; index <= 10; index += 1) {
    const charging = index <= 4;
    builder.addLine(row({
      time: `t${index}`,
      cycle: 1,
      current: charging ? 0.5 : -0.5,
      charge: charging ? index / 4 : 1,
      discharge: charging ? 9 : (index - 4) / 3,
    }));
  }

  builder.addLine(row({ time: 't11', cycle: 2, current: 0.5, charge: 1 }));
  builder.addLine(row({ time: 't12', cycle: 2, current: -0.5, charge: 1, discharge: 1.8 }));
  builder.addLine(row({ time: 't13', cycle: 3, current: 0.5, charge: 1 }));
  builder.addLine(row({ time: 't14', cycle: 4, current: -0.5, discharge: 1 }));
  builder.addLine(row({ time: 't15', cycle: 5, current: 0.5, charge: 1 }));
  builder.addLine(row({ time: 't16', cycle: 5, current: -0.5, charge: 1, discharge: 0 }));
  builder.addLine('malformed,row');
  builder.addLine(row({ time: 't17', cycle: 6, current: 'not-a-number' }));

  const replay = builder.finish();
  const [firstCycle, secondCycle, chargeOnlyCycle, dischargeOnlyCycle, zeroCapacityCycle] = replay.cycles;

  assert.equal(replay.source.sourceRows, 16);
  assert.equal(replay.source.skippedRows, 2);
  assert.equal(firstCycle.peakDischargeCapacityAh, 2);
  assert.equal(firstCycle.samples[0].timestamp, 't1');
  assert.equal(firstCycle.samples.at(-1).timestamp, 't10');
  assert.equal(firstCycle.samples.length, 3);
  assert.equal(secondCycle.capacityRetentionPercent, 90);
  assert.equal(chargeOnlyCycle.capacityRetentionPercent, null);
  assert.equal(dischargeOnlyCycle.capacityRetentionPercent, null);
  assert.equal(zeroCapacityCycle.capacityRetentionPercent, null);
  assert.equal(replay.capacityTrend.eligibleCycleCount, 2);
  assert.equal(replay.capacityTrend.referenceCycleIndex, 1);
  assert.equal(replay.source.protocolMetadataAvailable, false);
  assert.equal(replay.source.dischargeCutoffVoltageV, null);
  assert.equal(replay.source.fullDischargeVerified, false);
});

test('rejects a source header without required measurement columns', () => {
  const builder = createBatteryReplayBuilder();
  assert.throws(() => builder.addLine('Date_Time,Voltage (V)'), /Missing required columns/);
});

test('rejects a file with no valid time-series records', () => {
  const builder = createBatteryReplayBuilder();
  builder.addLine(header);
  assert.throws(() => builder.finish(), /No valid battery time-series rows/);
});