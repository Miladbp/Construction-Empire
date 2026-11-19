import {
  CompletionSnapshot,
  ConstructionStageId,
  ContractSpec,
  ExcavationCell,
  GameMode,
  GameState,
  MaterialCatalogItem,
  MaterialKey,
  MaterialsInventory,
  SiteProgress,
  WorkerDef,
  WorkerRole,
} from './types';

export const SAVE_VERSION = 1;
export const SAVE_STORAGE_KEY = 'construction_empire_3d_save_v1';

export const STAGE_ORDER: readonly ConstructionStageId[] = [
  'site_prep',
  'excavation',
  'foundation',
  'concrete',
  'structure',
  'finishing',
  'inspection',
] as const;

export const MATERIAL_CATALOG: readonly MaterialCatalogItem[] = [
  { key: 'rebar', unitCost: 350, packSize: 4, unit: 't' },
  { key: 'concrete', unitCost: 220, packSize: 6, unit: 'm³' },
  { key: 'timber', unitCost: 280, packSize: 4, unit: 'u' },
  { key: 'finishing', unitCost: 420, packSize: 4, unit: 'kit' },
] as const;

export const WORKER_CATALOG: readonly WorkerDef[] = [
  {
    id: 'w_laborer',
    role: 'laborer',
    hireCost: 1400,
    speedBonus: 0.25,
    accentHex: '#f59e0b',
  },
  {
    id: 'w_operator',
    role: 'operator',
    hireCost: 2200,
    speedBonus: 0.35,
    accentHex: '#0ea5e9',
  },
  {
    id: 'w_concrete',
    role: 'concrete_tech',
    hireCost: 2600,
    speedBonus: 0.45,
    accentHex: '#10b981',
  },
] as const;

export const CONTRACTS: readonly ContractSpec[] = [
  {
    id: 'oakridge_bungalow',
    requiredLevel: 1,
    floors: 1,
    reward: 18500,
    xpReward: 120,
    deadlineSeconds: 240,
    accentColor: '#d97706',
    roofColor: '#7c2d12',
    wallColor: '#f3efe6',
    materialRequirements: { rebar: 4, concrete: 8, timber: 6, finishing: 4 },
  },
  {
    id: 'harborview_duplex',
    requiredLevel: 2,
    floors: 2,
    reward: 34000,
    xpReward: 220,
    deadlineSeconds: 300,
    accentColor: '#0284c7',
    roofColor: '#334155',
    wallColor: '#e8eef2',
    materialRequirements: { rebar: 6, concrete: 10, timber: 8, finishing: 6 },
  },
  {
    id: 'metro_studio',
    requiredLevel: 3,
    floors: 3,
    reward: 58000,
    xpReward: 380,
    deadlineSeconds: 360,
    accentColor: '#0d9488',
    roofColor: '#1e293b',
    wallColor: '#dde5ec',
    materialRequirements: { rebar: 8, concrete: 14, timber: 10, finishing: 8 },
  },
] as const;

export const MIXER_RENTAL_COST = 800;
export const REFUEL_COST = 150;
export const EXCAVATOR_UPGRADE_COSTS = [0, 3500, 6800] as const;

export function getContractById(id: string): ContractSpec {
  return CONTRACTS.find((c) => c.id === id) ?? CONTRACTS[0];
}

export function createInitialExcavationGrid(): ExcavationCell[] {
  const cells: ExcavationCell[] = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      cells.push({
        index: row * 3 + col,
        row,
        col,
        depth: 0,
      });
    }
  }
  return cells;
}

export function createSiteProgress(contractId: string): SiteProgress {
  return {
    contractId,
    stageIndex: 0,
    debrisCleared: [false, false, false, false],
    excavationCells: createInitialExcavationGrid(),
    formworkPlaced: 0,
    concretePoured: 0,
    concreteCured: 0,
    structureBuilt: 0,
    finishingDone: 0,
    inspectionPassed: false,
    elapsedSeconds: 0,
  };
}

export function createInitialGameState(mode: GameMode = 'career', contractId = 'oakridge_bungalow'): GameState {
  const isSandbox = mode === 'sandbox';
  return {
    version: SAVE_VERSION,
    mode,
    money: isSandbox ? 9999999 : mode === 'challenge' ? 14000 : 25000,
    totalEarned: 0,
    xp: 0,
    level: isSandbox ? 3 : 1,
    reputation: 50,
    contractsCompleted: 0,
    completedContractIds: [],
    materials: isSandbox
      ? { rebar: 99, concrete: 99, timber: 99, finishing: 99 }
      : { rebar: 4, concrete: 8, timber: 6, finishing: 4 },
    hiredWorkers: [],
    equipment: {
      excavatorFuel: 100,
      excavatorLevel: 1,
      mixerRented: isSandbox,
      craneUnlocked: isSandbox,
    },
    site: createSiteProgress(contractId),
    placementRotation: 0,
  };
}

export function getActiveStageId(site: SiteProgress): ConstructionStageId {
  return STAGE_ORDER[Math.min(Math.max(site.stageIndex, 0), STAGE_ORDER.length - 1)];
}

export function getLevelForXp(xp: number): number {
  if (xp >= 520) return 4;
  if (xp >= 300) return 3;
  if (xp >= 100) return 2;
  return 1;
}

export function getStageProgressFraction(site: SiteProgress, stageId: ConstructionStageId): number {
  switch (stageId) {
    case 'site_prep': {
      const done = site.debrisCleared.filter(Boolean).length;
      return done / site.debrisCleared.length;
    }
    case 'excavation': {
      const sum = site.excavationCells.reduce((acc, c) => acc + Math.min(1, c.depth), 0);
      return sum / site.excavationCells.length;
    }
    case 'foundation':
      return Math.min(1, site.formworkPlaced / 4);
    case 'concrete':
      return Math.min(1, (site.concretePoured * 0.65 + site.concreteCured * 0.35) / 100);
    case 'structure':
      return Math.min(1, site.structureBuilt / 6);
    case 'finishing':
      return Math.min(1, site.finishingDone / 4);
    case 'inspection':
      return site.inspectionPassed ? 1 : 0;
  }
}

export function getOverallProgressPercent(site: SiteProgress): number {
  const weights = [0.1, 0.2, 0.14, 0.16, 0.22, 0.13, 0.05];
  let total = 0;
  for (let i = 0; i < STAGE_ORDER.length; i++) {
    total += getStageProgressFraction(site, STAGE_ORDER[i]) * weights[i];
  }
  return Math.round(total * 100);
}

export interface ActionResult {
  state: GameState;
  changed: boolean;
  errorKey?: 'insufficientFunds' | 'insufficientMaterials' | 'sequenceBlocked' | 'outOfFuel';
  rewardDelta?: number;
  stageAdvanced?: boolean;
  completed?: CompletionSnapshot;
}

function advanceStageIfComplete(site: SiteProgress): { site: SiteProgress; advanced: boolean } {
  let idx = site.stageIndex;
  let advanced = false;
  while (idx < STAGE_ORDER.length - 1) {
    const id = STAGE_ORDER[idx];
    const frac = getStageProgressFraction(site, id);
    if (frac >= 0.999) {
      idx += 1;
      advanced = true;
    } else {
      break;
    }
  }
  if (!advanced) return { site, advanced: false };
  return { site: { ...site, stageIndex: idx }, advanced: true };
}

export function clearDebrisPile(state: GameState, pileIndex?: number): ActionResult {
  if (getActiveStageId(state.site) !== 'site_prep') {
    return { state, changed: false, errorKey: 'sequenceBlocked' };
  }
  const idx =
    pileIndex !== undefined && pileIndex >= 0 && pileIndex < state.site.debrisCleared.length && !state.site.debrisCleared[pileIndex]
      ? pileIndex
      : state.site.debrisCleared.findIndex((c) => !c);

  if (idx === -1) return { state, changed: false };

  const nextDebris = [...state.site.debrisCleared];
  nextDebris[idx] = true;
  const rawSite: SiteProgress = { ...state.site, debrisCleared: nextDebris };
  const { site, advanced } = advanceStageIfComplete(rawSite);

  const bonus = 150;
  return {
    state: {
      ...state,
      money: state.mode === 'sandbox' ? state.money : state.money + bonus,
      site,
    },
    changed: true,
    rewardDelta: bonus,
    stageAdvanced: advanced,
  };
}

export function excavateCell(state: GameState, cellIndex?: number): ActionResult {
  if (getActiveStageId(state.site) !== 'excavation') {
    return { state, changed: false, errorKey: 'sequenceBlocked' };
  }
  if (state.mode !== 'sandbox' && state.equipment.excavatorFuel <= 0.5) {
    return { state, changed: false, errorKey: 'outOfFuel' };
  }

  const targetIndex =
    cellIndex !== undefined && cellIndex >= 0 && cellIndex < state.site.excavationCells.length && state.site.excavationCells[cellIndex].depth < 1
      ? cellIndex
      : state.site.excavationCells.findIndex((c) => c.depth < 1);

  if (targetIndex === -1) return { state, changed: false };

  const digPower = state.equipment.excavatorLevel >= 2 ? 1 : 1; // crisp 1 scoop per cell (upgraded level gives bonus payout/efficiency)
  const cells = state.site.excavationCells.map((c, idx) =>
    idx === targetIndex ? { ...c, depth: Math.min(1, c.depth + digPower) } : c,
  );

  const fuelBurn = state.hiredWorkers.includes('operator') ? 1.8 : 3.2;
  const nextFuel = state.mode === 'sandbox' ? 100 : Math.max(0, state.equipment.excavatorFuel - fuelBurn);

  const rawSite: SiteProgress = { ...state.site, excavationCells: cells };
  const { site, advanced } = advanceStageIfComplete(rawSite);
  const milestoneBonus = advanced ? 450 : 75;

  return {
    state: {
      ...state,
      money: state.mode === 'sandbox' ? state.money : state.money + milestoneBonus,
      equipment: { ...state.equipment, excavatorFuel: nextFuel },
      site,
    },
    changed: true,
    rewardDelta: milestoneBonus,
    stageAdvanced: advanced,
  };
}

export function placeFormworkSegment(state: GameState): ActionResult {
  if (getActiveStageId(state.site) !== 'foundation') {
    return { state, changed: false, errorKey: 'sequenceBlocked' };
  }
  if (state.site.formworkPlaced >= 4) return { state, changed: false };

  const rebarCost = 1;
  if (state.mode !== 'sandbox' && state.materials.rebar < rebarCost) {
    return { state, changed: false, errorKey: 'insufficientMaterials' };
  }

  const nextMaterials: MaterialsInventory =
    state.mode === 'sandbox'
      ? state.materials
      : { ...state.materials, rebar: Math.max(0, state.materials.rebar - rebarCost) };

  const rawSite: SiteProgress = { ...state.site, formworkPlaced: state.site.formworkPlaced + 1 };
  const { site, advanced } = advanceStageIfComplete(rawSite);

  return {
    state: { ...state, materials: nextMaterials, site },
    changed: true,
    rewardDelta: advanced ? 400 : 0,
    stageAdvanced: advanced,
  };
}

export function pourConcreteStep(state: GameState): ActionResult {
  if (getActiveStageId(state.site) !== 'concrete') {
    return { state, changed: false, errorKey: 'sequenceBlocked' };
  }
  if (state.site.concretePoured >= 100) {
    // Allow player click to accelerate curing slightly
    const nextCured = Math.min(100, state.site.concreteCured + 25);
    const rawSite: SiteProgress = { ...state.site, concreteCured: nextCured };
    const { site, advanced } = advanceStageIfComplete(rawSite);
    return { state: { ...state, site }, changed: nextCured !== state.site.concreteCured, stageAdvanced: advanced };
  }

  let nextMoney = state.money;
  let mixerRented = state.equipment.mixerRented;

  if (!mixerRented) {
    if (state.mode !== 'sandbox' && nextMoney < MIXER_RENTAL_COST) {
      return { state, changed: false, errorKey: 'insufficientFunds' };
    }
    if (state.mode !== 'sandbox') nextMoney -= MIXER_RENTAL_COST;
    mixerRented = true;
  }

  const concreteCost = 2;
  if (state.mode !== 'sandbox' && state.materials.concrete < concreteCost) {
    return { state, changed: false, errorKey: 'insufficientMaterials' };
  }

  const nextMaterials: MaterialsInventory =
    state.mode === 'sandbox'
      ? state.materials
      : { ...state.materials, concrete: Math.max(0, state.materials.concrete - concreteCost) };

  const nextPoured = Math.min(100, state.site.concretePoured + 25);
  const rawSite: SiteProgress = { ...state.site, concretePoured: nextPoured };
  const { site, advanced } = advanceStageIfComplete(rawSite);

  return {
    state: {
      ...state,
      money: nextMoney,
      materials: nextMaterials,
      equipment: { ...state.equipment, mixerRented },
      site,
    },
    changed: true,
    stageAdvanced: advanced,
  };
}

export function buildStructureStep(state: GameState): ActionResult {
  if (getActiveStageId(state.site) !== 'structure') {
    return { state, changed: false, errorKey: 'sequenceBlocked' };
  }
  if (state.site.structureBuilt >= 6) return { state, changed: false };

  const timberCost = 1;
  if (state.mode !== 'sandbox' && state.materials.timber < timberCost) {
    return { state, changed: false, errorKey: 'insufficientMaterials' };
  }

  const nextMaterials: MaterialsInventory =
    state.mode === 'sandbox'
      ? state.materials
      : { ...state.materials, timber: Math.max(0, state.materials.timber - timberCost) };

  const rawSite: SiteProgress = { ...state.site, structureBuilt: state.site.structureBuilt + 1 };
  const { site, advanced } = advanceStageIfComplete(rawSite);

  return {
    state: { ...state, materials: nextMaterials, site },
    changed: true,
    rewardDelta: advanced ? 600 : 0,
    stageAdvanced: advanced,
  };
}

export function applyFinishingStep(state: GameState): ActionResult {
  if (getActiveStageId(state.site) !== 'finishing') {
    return { state, changed: false, errorKey: 'sequenceBlocked' };
  }
  if (state.site.finishingDone >= 4) return { state, changed: false };

  const finCost = 1;
  if (state.mode !== 'sandbox' && state.materials.finishing < finCost) {
    return { state, changed: false, errorKey: 'insufficientMaterials' };
  }

  const nextMaterials: MaterialsInventory =
    state.mode === 'sandbox'
      ? state.materials
      : { ...state.materials, finishing: Math.max(0, state.materials.finishing - finCost) };

  const rawSite: SiteProgress = { ...state.site, finishingDone: state.site.finishingDone + 1 };
  const { site, advanced } = advanceStageIfComplete(rawSite);

  return {
    state: { ...state, materials: nextMaterials, site },
    changed: true,
    rewardDelta: advanced ? 500 : 0,
    stageAdvanced: advanced,
  };
}

export function completeInspection(state: GameState): ActionResult {
  if (getActiveStageId(state.site) !== 'inspection') {
    return { state, changed: false, errorKey: 'sequenceBlocked' };
  }
  if (state.site.inspectionPassed) return { state, changed: false };

  const contract = getContractById(state.site.contractId);
  const speedBonus = state.site.elapsedSeconds < contract.deadlineSeconds * 0.65 ? Math.round(contract.reward * 0.12) : 0;
  const totalPayout = contract.reward + speedBonus;
  const nextXp = state.xp + contract.xpReward;
  const nextLevel = Math.max(state.level, getLevelForXp(nextXp));
  const nextCompletedCount = state.contractsCompleted + 1;
  const nextReputation = Math.min(100, state.reputation + 15);
  const completedIds = state.completedContractIds.includes(contract.id)
    ? state.completedContractIds
    : [...state.completedContractIds, contract.id];

  const nextState: GameState = {
    ...state,
    money: state.mode === 'sandbox' ? state.money : state.money + totalPayout,
    totalEarned: state.totalEarned + totalPayout,
    xp: nextXp,
    level: nextLevel,
    reputation: nextReputation,
    contractsCompleted: nextCompletedCount,
    completedContractIds: completedIds,
    site: { ...state.site, inspectionPassed: true },
  };

  const completed: CompletionSnapshot = {
    contractId: contract.id,
    payout: contract.reward,
    bonus: speedBonus,
    xpEarned: contract.xpReward,
    elapsedSeconds: Math.round(state.site.elapsedSeconds),
    newLevel: nextLevel,
    contractsCompleted: nextCompletedCount,
    reputation: nextReputation,
    outcome: 'victory',
  };

  return {
    state: nextState,
    changed: true,
    rewardDelta: totalPayout,
    completed,
  };
}

export function performPrimaryStageAction(state: GameState, targetIndex?: number): ActionResult {
  const stage = getActiveStageId(state.site);
  switch (stage) {
    case 'site_prep':
      return clearDebrisPile(state, targetIndex);
    case 'excavation':
      return excavateCell(state, targetIndex);
    case 'foundation':
      return placeFormworkSegment(state);
    case 'concrete':
      return pourConcreteStep(state);
    case 'structure':
      return buildStructureStep(state);
    case 'finishing':
      return applyFinishingStep(state);
    case 'inspection':
      return completeInspection(state);
  }
}

export function buyMaterialPack(state: GameState, key: MaterialKey): ActionResult {
  const item = MATERIAL_CATALOG.find((m) => m.key === key);
  if (!item) return { state, changed: false };
  const totalCost = item.unitCost * item.packSize;
  if (state.mode !== 'sandbox' && state.money < totalCost) {
    return { state, changed: false, errorKey: 'insufficientFunds' };
  }
  return {
    state: {
      ...state,
      money: state.mode === 'sandbox' ? state.money : state.money - totalCost,
      materials: {
        ...state.materials,
        [key]: state.materials[key] + item.packSize,
      },
    },
    changed: true,
    rewardDelta: state.mode === 'sandbox' ? 0 : -totalCost,
  };
}

export function hireWorker(state: GameState, role: WorkerRole): ActionResult {
  if (state.hiredWorkers.includes(role)) return { state, changed: false };
  const def = WORKER_CATALOG.find((w) => w.role === role);
  if (!def) return { state, changed: false };

  if (state.mode !== 'sandbox' && state.money < def.hireCost) {
    return { state, changed: false, errorKey: 'insufficientFunds' };
  }
  return {
    state: {
      ...state,
      money: state.mode === 'sandbox' ? state.money : state.money - def.hireCost,
      hiredWorkers: [...state.hiredWorkers, role],
    },
    changed: true,
    rewardDelta: state.mode === 'sandbox' ? 0 : -def.hireCost,
  };
}

export function upgradeExcavator(state: GameState): ActionResult {
  if (state.equipment.excavatorLevel >= 3) return { state, changed: false };
  const cost = EXCAVATOR_UPGRADE_COSTS[state.equipment.excavatorLevel];
  if (state.mode !== 'sandbox' && state.money < cost) {
    return { state, changed: false, errorKey: 'insufficientFunds' };
  }
  return {
    state: {
      ...state,
      money: state.mode === 'sandbox' ? state.money : state.money - cost,
      equipment: {
        ...state.equipment,
        excavatorLevel: state.equipment.excavatorLevel + 1,
        excavatorFuel: 100,
      },
    },
    changed: true,
    rewardDelta: state.mode === 'sandbox' ? 0 : -cost,
  };
}

export function rentMixerTruck(state: GameState): ActionResult {
  if (state.equipment.mixerRented) return { state, changed: false };
  if (state.mode !== 'sandbox' && state.money < MIXER_RENTAL_COST) {
    return { state, changed: false, errorKey: 'insufficientFunds' };
  }
  return {
    state: {
      ...state,
      money: state.mode === 'sandbox' ? state.money : state.money - MIXER_RENTAL_COST,
      equipment: { ...state.equipment, mixerRented: true },
    },
    changed: true,
    rewardDelta: state.mode === 'sandbox' ? 0 : -MIXER_RENTAL_COST,
  };
}

export function refuelExcavator(state: GameState): ActionResult {
  if (state.equipment.excavatorFuel >= 99) return { state, changed: false };
  if (state.mode !== 'sandbox' && state.money < REFUEL_COST) {
    return { state, changed: false, errorKey: 'insufficientFunds' };
  }
  return {
    state: {
      ...state,
      money: state.mode === 'sandbox' ? state.money : state.money - REFUEL_COST,
      equipment: { ...state.equipment, excavatorFuel: 100 },
    },
    changed: true,
    rewardDelta: state.mode === 'sandbox' ? 0 : -REFUEL_COST,
  };
}

export function switchContract(state: GameState, contractId: string): ActionResult {
  const contract = CONTRACTS.find((c) => c.id === contractId);
  if (!contract) return { state, changed: false };
  if (state.mode !== 'sandbox' && state.level < contract.requiredLevel) {
    return { state, changed: false, errorKey: 'sequenceBlocked' };
  }
  return {
    state: {
      ...state,
      site: createSiteProgress(contract.id),
      equipment: {
        ...state.equipment,
        excavatorFuel: 100,
      },
    },
    changed: true,
  };
}

export function tickGameSimulation(
  state: GameState,
  dt: number,
  workerAccumulator: { value: number },
): { state: GameState; stageAdvanced: boolean; timeoutSnapshot?: CompletionSnapshot } {
  if (state.site.inspectionPassed) {
    return { state, stageAdvanced: false };
  }

  let nextSite: SiteProgress = {
    ...state.site,
    elapsedSeconds: state.site.elapsedSeconds + dt,
  };
  let nextState: GameState = { ...state, site: nextSite };
  let stageAdvanced = false;

  // Concrete accelerated curing once poured to 100%
  if (getActiveStageId(nextSite) === 'concrete' && nextSite.concretePoured >= 100 && nextSite.concreteCured < 100) {
    const hasSpecialist = state.hiredWorkers.includes('concrete_tech');
    const cureRate = hasSpecialist ? 44 : 28; // ~2.3s to 3.5s
    const nextCured = Math.min(100, nextSite.concreteCured + cureRate * dt);
    const advancedRes = advanceStageIfComplete({ ...nextSite, concreteCured: nextCured });
    nextSite = advancedRes.site;
    nextState = { ...nextState, site: nextSite };
    if (advancedRes.advanced) stageAdvanced = true;
  }

  // Hired workers assist active stage on an interval
  const activeStage = getActiveStageId(nextSite);
  if (state.hiredWorkers.length > 0 && activeStage !== 'inspection') {
    let rate = 0;
    if (state.hiredWorkers.includes('laborer') && (activeStage === 'site_prep' || activeStage === 'structure' || activeStage === 'finishing')) {
      rate += 0.28;
    }
    if (state.hiredWorkers.includes('operator') && activeStage === 'excavation') {
      rate += 0.25;
    }
    if (state.hiredWorkers.includes('concrete_tech') && (activeStage === 'foundation' || activeStage === 'concrete')) {
      rate += 0.32;
    }
    if (rate > 0) {
      workerAccumulator.value += rate * dt;
      if (workerAccumulator.value >= 1) {
        workerAccumulator.value -= 1;
        const res = performPrimaryStageAction(nextState);
        if (res.changed) {
          nextState = res.state;
          if (res.stageAdvanced) stageAdvanced = true;
        }
      }
    }
  }

  // Challenge mode deadline check
  if (nextState.mode === 'challenge') {
    const contract = getContractById(nextState.site.contractId);
    if (nextState.site.elapsedSeconds >= contract.deadlineSeconds) {
      const timeoutSnapshot: CompletionSnapshot = {
        contractId: contract.id,
        payout: 0,
        bonus: 0,
        xpEarned: 0,
        elapsedSeconds: Math.round(nextState.site.elapsedSeconds),
        newLevel: nextState.level,
        contractsCompleted: nextState.contractsCompleted,
        reputation: nextState.reputation,
        outcome: 'timeout',
      };
      return { state: nextState, stageAdvanced, timeoutSnapshot };
    }
  }

  return { state: nextState, stageAdvanced };
}

export function serializeSaveData(state: GameState): string {
  return JSON.stringify({ ...state, version: SAVE_VERSION });
}

export function deserializeSaveData(raw: string | null): GameState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<GameState>;
    if (!parsed || typeof parsed !== 'object') return null;
    if (typeof parsed.version !== 'number' || parsed.version > SAVE_VERSION) return null;
    if (!parsed.site || !Array.isArray(parsed.site.excavationCells) || parsed.site.excavationCells.length !== 9) {
      return null;
    }
    const base = createInitialGameState(parsed.mode ?? 'career', parsed.site.contractId ?? 'oakridge_bungalow');
    return {
      ...base,
      ...parsed,
      version: SAVE_VERSION,
      materials: { ...base.materials, ...(parsed.materials ?? {}) },
      equipment: { ...base.equipment, ...(parsed.equipment ?? {}) },
      site: { ...base.site, ...parsed.site },
      hiredWorkers: Array.isArray(parsed.hiredWorkers) ? parsed.hiredWorkers : [],
      completedContractIds: Array.isArray(parsed.completedContractIds) ? parsed.completedContractIds : [],
    };
  } catch {
    return null;
  }
}

export function getNextContractId(currentId: string, level: number, mode: GameMode): string {
  const idx = CONTRACTS.findIndex((c) => c.id === currentId);
  for (let offset = 1; offset <= CONTRACTS.length; offset++) {
    const candidate = CONTRACTS[(idx + offset) % CONTRACTS.length];
    if (mode === 'sandbox' || level >= candidate.requiredLevel) {
      return candidate.id;
    }
  }
  return CONTRACTS[0].id;
}
