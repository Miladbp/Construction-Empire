import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyFinishingStep,
  buildStructureStep,
  buyMaterialPack,
  clearDebrisPile,
  completeInspection,
  createInitialGameState,
  deserializeSaveData,
  excavateCell,
  getActiveStageId,
  getOverallProgressPercent,
  hireWorker,
  placeFormworkSegment,
  pourConcreteStep,
  serializeSaveData,
  switchContract,
  tickGameSimulation,
} from './rules';

test('enforces strict construction stage sequence (cannot skip ahead)', () => {
  const state = createInitialGameState('career');
  assert.equal(getActiveStageId(state.site), 'site_prep');

  // Cannot excavate, place formwork, pour concrete, or inspect before site prep
  assert.equal(excavateCell(state).errorKey, 'sequenceBlocked');
  assert.equal(placeFormworkSegment(state).errorKey, 'sequenceBlocked');
  assert.equal(pourConcreteStep(state).errorKey, 'sequenceBlocked');
  assert.equal(buildStructureStep(state).errorKey, 'sequenceBlocked');
  assert.equal(applyFinishingStep(state).errorKey, 'sequenceBlocked');
  assert.equal(completeInspection(state).errorKey, 'sequenceBlocked');
});

test('full contract can be completed from site prep to final payout and level up', () => {
  let state = createInitialGameState('career');
  const startMoney = state.money;

  // Stage 1: Clear 4 debris piles
  for (let i = 0; i < 4; i++) {
    const res = clearDebrisPile(state, i);
    assert.equal(res.changed, true);
    state = res.state;
  }
  assert.equal(getActiveStageId(state.site), 'excavation');

  // Stage 2: Excavate 9 cells
  for (let i = 0; i < 9; i++) {
    const res = excavateCell(state, i);
    assert.equal(res.changed, true);
    state = res.state;
  }
  assert.equal(getActiveStageId(state.site), 'foundation');

  // Stage 3: Place 4 formwork & rebar cages
  for (let i = 0; i < 4; i++) {
    const res = placeFormworkSegment(state);
    assert.equal(res.changed, true);
    state = res.state;
  }
  assert.equal(getActiveStageId(state.site), 'concrete');
  assert.equal(state.materials.rebar, 0);

  // Stage 4: Pour concrete (auto-rents mixer on first pour) + cure via simulation tick
  for (let i = 0; i < 4; i++) {
    const res = pourConcreteStep(state);
    assert.equal(res.changed, true);
    state = res.state;
  }
  assert.equal(state.site.concretePoured, 100);
  assert.equal(state.equipment.mixerRented, true);

  const acc = { value: 0 };
  const ticked = tickGameSimulation(state, 4.0, acc);
  state = ticked.state;
  assert.equal(getActiveStageId(state.site), 'structure');

  // Stage 5: Build 6 structure elements
  for (let i = 0; i < 6; i++) {
    const res = buildStructureStep(state);
    assert.equal(res.changed, true);
    state = res.state;
  }
  assert.equal(getActiveStageId(state.site), 'finishing');

  // Stage 6: Apply 4 finishing steps
  for (let i = 0; i < 4; i++) {
    const res = applyFinishingStep(state);
    assert.equal(res.changed, true);
    state = res.state;
  }
  assert.equal(getActiveStageId(state.site), 'inspection');

  // Stage 7: Complete inspection & receive payout + XP + Level 2 unlock
  const fin = completeInspection(state);
  assert.equal(fin.changed, true);
  assert.ok(fin.completed);
  assert.equal(fin.completed.outcome, 'victory');
  assert.equal(fin.state.level, 2);
  assert.equal(fin.state.contractsCompleted, 1);
  assert.equal(getOverallProgressPercent(fin.state.site), 100);
  assert.ok(fin.state.money > startMoney);

  // Contract 2 should now be unlocked at Level 2
  const nextRes = switchContract(fin.state, 'harborview_duplex');
  assert.equal(nextRes.changed, true);
  assert.equal(nextRes.state.site.contractId, 'harborview_duplex');
});

test('economy rejects insufficient funds and supports hiring workers & buying materials', () => {
  let state = createInitialGameState('career');
  state = { ...state, money: 100 };

  assert.equal(buyMaterialPack(state, 'rebar').errorKey, 'insufficientFunds');
  assert.equal(hireWorker(state, 'laborer').errorKey, 'insufficientFunds');

  state = { ...state, money: 5000 };
  const buyRes = buyMaterialPack(state, 'rebar');
  assert.equal(buyRes.changed, true);
  assert.equal(buyRes.state.materials.rebar, state.materials.rebar + 4);
  assert.equal(buyRes.state.money, 5000 - 350 * 4);

  const hireRes = hireWorker(buyRes.state, 'laborer');
  assert.equal(hireRes.changed, true);
  assert.deepEqual(hireRes.state.hiredWorkers, ['laborer']);
});

test('sandbox mode allows unlimited resources without deducting money or materials', () => {
  let state = createInitialGameState('sandbox');
  const initialMoney = state.money;
  const buyRes = buyMaterialPack(state, 'concrete');
  assert.equal(buyRes.state.money, initialMoney);

  const hireRes = hireWorker(buyRes.state, 'operator');
  assert.equal(hireRes.state.money, initialMoney);
  assert.equal(hireRes.state.hiredWorkers.includes('operator'), true);
});

test('versioned save serialization and deserialization round-trip cleanly', () => {
  let state = createInitialGameState('career');
  state = clearDebrisPile(state, 0).state;
  state = hireWorker(state, 'laborer').state;

  const raw = serializeSaveData(state);
  const loaded = deserializeSaveData(raw);
  assert.ok(loaded);
  assert.equal(loaded.money, state.money);
  assert.equal(loaded.site.debrisCleared[0], true);
  assert.deepEqual(loaded.hiredWorkers, ['laborer']);

  // Corrupt or future-version save returns null safely
  assert.equal(deserializeSaveData('{bad json'), null);
  assert.equal(deserializeSaveData(JSON.stringify({ version: 999 })), null);
});
