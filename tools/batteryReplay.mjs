const sampleEverySourceRows = 8;
const requiredColumns = [
  'Date_Time', 'Test_Time (s)', 'Cycle_Index', 'Current (A)', 'Voltage (V)',
  'Charge_Capacity (Ah)', 'Discharge_Capacity (Ah)', 'Cell_Temperature (C)',
];

const numericColumns = [
  'Test_Time (s)', 'Cycle_Index', 'Current (A)', 'Voltage (V)',
  'Charge_Capacity (Ah)', 'Discharge_Capacity (Ah)', 'Cell_Temperature (C)',
];

function createSample(values, columns) {
  const numberAt = (name) => {
    const rawValue = values[columns.get(name)]?.trim();
    if (!rawValue) return null;
    const parsedValue = Number(rawValue);
    return Number.isFinite(parsedValue) ? parsedValue : null;
  };

  const numbers = Object.fromEntries(numericColumns.map((name) => [name, numberAt(name)]));
  if (Object.values(numbers).some((value) => value == null)) return null;

  const timestamp = values[columns.get('Date_Time')]?.trim();
  if (!timestamp) return null;

  return {
    cycleIndex: numbers['Cycle_Index'],
    sample: {
      timestamp,
      testTimeSeconds: numbers['Test_Time (s)'],
      currentA: numbers['Current (A)'],
      voltageV: numbers['Voltage (V)'],
      chargeCapacityAh: numbers['Charge_Capacity (Ah)'],
      dischargeCapacityAh: numbers['Discharge_Capacity (Ah)'],
      cellTemperatureC: numbers['Cell_Temperature (C)'],
    },
  };
}

export function createBatteryReplayBuilder() {
  let columns = null;
  let headerColumnCount = 0;
  let sourceRows = 0;
  let skippedRows = 0;
  const cycles = new Map();

  function addLine(line) {
    if (!line.trim()) return;
    const values = line.split(',');

    if (!columns) {
      headerColumnCount = values.length;
      columns = new Map(values.map((name, index) => [name.replace(/^\uFEFF/, '').trim(), index]));
      const missingColumns = requiredColumns.filter((name) => !columns.has(name));
      if (missingColumns.length) {
        throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
      }
      return;
    }

    if (values.length !== headerColumnCount) {
      skippedRows += 1;
      return;
    }

    const parsed = createSample(values, columns);
    if (!parsed) {
      skippedRows += 1;
      return;
    }

    const { cycleIndex, sample } = parsed;
    sourceRows += 1;
    let cycle = cycles.get(cycleIndex);
    if (!cycle) {
      cycle = {
        cycleIndex,
        startTime: sample.timestamp,
        endTime: sample.timestamp,
        sourceRowCount: 0,
        chargeRows: 0,
        dischargeRows: 0,
        peakChargeCapacityAh: 0,
        peakDischargeCapacityAh: 0,
        peakCellTemperatureC: -Infinity,
        minVoltageV: Infinity,
        maxVoltageV: -Infinity,
        lastSample: null,
        samples: [],
      };
      cycles.set(cycleIndex, cycle);
    }

    cycle.endTime = sample.timestamp;
    cycle.sourceRowCount += 1;
    if (sample.currentA > 0.01) cycle.chargeRows += 1;
    if (sample.currentA < -0.01) cycle.dischargeRows += 1;
    cycle.peakChargeCapacityAh = Math.max(cycle.peakChargeCapacityAh, sample.chargeCapacityAh);
    if (sample.currentA < -0.01) {
      cycle.peakDischargeCapacityAh = Math.max(cycle.peakDischargeCapacityAh, sample.dischargeCapacityAh);
    }
    cycle.peakCellTemperatureC = Math.max(cycle.peakCellTemperatureC, sample.cellTemperatureC);
    cycle.minVoltageV = Math.min(cycle.minVoltageV, sample.voltageV);
    cycle.maxVoltageV = Math.max(cycle.maxVoltageV, sample.voltageV);
    cycle.lastSample = sample;

    if (cycle.sourceRowCount === 1 || (cycle.sourceRowCount - 1) % sampleEverySourceRows === 0) {
      cycle.samples.push(sample);
    }
  }

  function finish() {
    if (sourceRows === 0) throw new Error('No valid battery time-series rows were found.');

    const normalizedCycles = [...cycles.values()]
      .sort((left, right) => left.cycleIndex - right.cycleIndex)
      .map(({ lastSample, ...cycle }) => {
        const last = cycle.samples.at(-1);
        if (!last || last.timestamp !== lastSample.timestamp) cycle.samples.push(lastSample);
        return {
          ...cycle,
          peakCellTemperatureC: Number(cycle.peakCellTemperatureC.toFixed(3)),
          minVoltageV: Number(cycle.minVoltageV.toFixed(4)),
          maxVoltageV: Number(cycle.maxVoltageV.toFixed(4)),
          peakChargeCapacityAh: Number(cycle.peakChargeCapacityAh.toFixed(5)),
          peakDischargeCapacityAh: Number(cycle.peakDischargeCapacityAh.toFixed(5)),
        };
      });

    const pairedCycles = normalizedCycles.filter((cycle) => (
      cycle.chargeRows > 0 && cycle.dischargeRows > 0 && cycle.peakDischargeCapacityAh > 0
    ));
    const baselineCycle = pairedCycles[0] || null;
    const pairedCycleSet = new Set(pairedCycles);
    const cyclesWithRetention = normalizedCycles.map((cycle) => {
      const hasPairedChargeDischarge = pairedCycleSet.has(cycle);
      return {
        ...cycle,
        hasPairedChargeDischarge,
        capacityRetentionPercent: hasPairedChargeDischarge
          ? Number((cycle.peakDischargeCapacityAh / baselineCycle.peakDischargeCapacityAh * 100).toFixed(3))
          : null,
      };
    });

    return {
      schemaVersion: 1,
      asset: {
        id: 'SNL-18650-LFP-25C-0-100-0.5-2C-a',
        name: '18650 LFP bench-test cell',
        chemistry: 'LFP',
        format: '18650 single cell',
        isAircraftTelemetry: false,
      },
      source: {
        file: 'data/SNL_18650_LFP_25C_0-100_0.5-2C_a_timeseries.txt',
        dataType: 'Recorded laboratory time series; timestamps and measurements are preserved.',
        sampleEverySourceRows,
        sourceRows,
        skippedRows,
        protocolMetadataAvailable: false,
        dischargeCutoffVoltageV: null,
        fullDischargeVerified: false,
      },
      capacityTrend: {
        referenceCycleIndex: baselineCycle?.cycleIndex ?? null,
        referenceDischargeCapacityAh: baselineCycle?.peakDischargeCapacityAh ?? null,
        eligibleCycleCount: pairedCycles.length,
        definition: 'Relative measured discharge capacity vs the first cycle index with both positive and negative current rows and positive discharge capacity. This is not certified battery SOH or RUL; voltage cutoff completeness is not provided by the source metadata.',
      },
      cycles: cyclesWithRetention,
    };
  }

  return { addLine, finish };
}