import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAircraftAssetTree } from '../src/utils/assetModel.js';

function findAsset(asset, id) {
  if (asset.id === id) return asset;
  for (const child of asset.children) {
    const match = findAsset(child, id);
    if (match) return match;
  }
  return null;
}

function createAircraft(overrides = {}) {
  return {
    id: 'EVTOL-TEST',
    model: 'Demo model',
    status: 'Nominal',
    health: 96,
    soc: 60,
    temperature: 68,
    rul: 900,
    altitude: 0,
    speed: 0,
    batteryCycles: 25,
    vibration: 42,
    motorRpm: 5000,
    componentHealth: { battery: 92, rotorA: 94, rotorB: 91, frame: 95 },
    ...overrides,
  };
}

test('identifies component-level warnings independently from aircraft status', () => {
  const tree = buildAircraftAssetTree(createAircraft());

  assert.equal(tree.alertLevel, 'Nominal');
  assert.equal(findAsset(tree, 'EVTOL-TEST-motor-1').alertLevel, 'Warning');
  assert.equal(findAsset(tree, 'EVTOL-TEST-motor-2').alertLevel, 'Warning');
  assert.equal(findAsset(tree, 'EVTOL-TEST-battery-pack').alertLevel, 'Warning');
  assert.equal(findAsset(tree, 'EVTOL-TEST-motor-1').source, 'Simulated fleet demo data');
});

test('marks component thresholds as critical and missing avionics telemetry as unknown', () => {
  const tree = buildAircraftAssetTree(createAircraft({ vibration: 55, temperature: 85, soc: 8 }));

  assert.equal(findAsset(tree, 'EVTOL-TEST-motor-1').alertLevel, 'Critical');
  assert.equal(findAsset(tree, 'EVTOL-TEST-battery-pack').alertLevel, 'Critical');
  assert.equal(findAsset(tree, 'EVTOL-TEST-flight-computer').alertLevel, 'Unknown');
  assert.equal(findAsset(tree, 'EVTOL-TEST-lidar').operatingCondition.state, 'Unknown · no component telemetry');
  assert.equal(findAsset(tree, 'EVTOL-TEST-navigation').remainingLife.value, null);
});

test('includes stable aircraft and parent identifiers for every component', () => {
  const tree = buildAircraftAssetTree(createAircraft());
  const component = findAsset(tree, 'EVTOL-TEST-battery-pack');

  assert.equal(tree.id, 'EVTOL-TEST');
  assert.equal(component.parentId, 'EVTOL-TEST-power');
  assert.equal(component.kind, 'component');
});