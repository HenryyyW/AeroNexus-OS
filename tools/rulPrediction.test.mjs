import assert from 'node:assert/strict';
import test from 'node:test';
import { predictBatteryRUL, predictStructuralRUL } from '../src/analytics/analysis.js';

const hourlyHistory = (values) => values.map((v, index) => ({ t: index * 3_600_000, v }));

test('battery prediction distinguishes flat capacity from insufficient history', () => {
  const aircraft = { batteryCapacity: 5 };
  const flatHistory = { capacity: hourlyHistory([5, 5, 5, 5, 5]) };
  const shortHistory = { capacity: hourlyHistory([5, 5, 5, 5]) };

  assert.equal(predictBatteryRUL(aircraft, flatHistory).status, 'max');
  assert.equal(predictBatteryRUL(aircraft, shortHistory), null);
});

test('structural prediction distinguishes flat damage from insufficient history', () => {
  const aircraft = { structuralDamage: 0.1 };
  const flatHistory = { structuralDamage: hourlyHistory([0.1, 0.1, 0.1, 0.1, 0.1]) };
  const shortHistory = { structuralDamage: hourlyHistory([0.1, 0.1, 0.1, 0.1]) };

  assert.equal(predictStructuralRUL(aircraft, flatHistory).status, 'max');
  assert.equal(predictStructuralRUL(aircraft, shortHistory), null);
});