export type GameScreenState = 'title' | 'playing' | 'paused' | 'gameover';

export type GameMode = 'career' | 'sandbox' | 'challenge';

export type Language = 'en' | 'fa';

export type CameraMode = 'orbit' | 'follow' | 'iso';

export type TimeOfDay = 'day' | 'dusk' | 'night';

export type ConstructionStageId =
  | 'site_prep'
  | 'excavation'
  | 'foundation'
  | 'concrete'
  | 'structure'
  | 'finishing'
  | 'inspection';

export type MaterialKey = 'rebar' | 'concrete' | 'timber' | 'finishing';

export type WorkerRole = 'laborer' | 'operator' | 'concrete_tech';

export interface MaterialsInventory {
  rebar: number;
  concrete: number;
  timber: number;
  finishing: number;
}

export interface MaterialCatalogItem {
  key: MaterialKey;
  unitCost: number;
  packSize: number;
  unit: string;
}

export interface WorkerDef {
  id: string;
  role: WorkerRole;
  hireCost: number;
  speedBonus: number; // progress units per second
  accentHex: string;
}

export interface ContractSpec {
  id: string;
  requiredLevel: number;
  floors: number;
  reward: number;
  xpReward: number;
  deadlineSeconds: number; // active in challenge mode
  accentColor: string;
  roofColor: string;
  wallColor: string;
  materialRequirements: MaterialsInventory;
}

export interface ExcavationCell {
  index: number;
  row: number;
  col: number;
  depth: number; // 0 = untouched, 1 = excavated
}

export interface SiteProgress {
  contractId: string;
  stageIndex: number; // 0..6
  debrisCleared: boolean[]; // length 4
  excavationCells: ExcavationCell[]; // 3x3 = 9 cells
  formworkPlaced: number; // 0..4 segments
  concretePoured: number; // 0..100
  concreteCured: number; // 0..100
  structureBuilt: number; // 0..6 (columns, slabs, walls, windows/doors, roof, MEP)
  finishingDone: number; // 0..4 (paint, trim, fixtures, landscaping)
  inspectionPassed: boolean;
  elapsedSeconds: number;
}

export interface EquipmentState {
  excavatorFuel: number; // 0..100
  excavatorLevel: number; // 1..3
  mixerRented: boolean;
  craneUnlocked: boolean;
}

export interface CompletionSnapshot {
  contractId: string;
  payout: number;
  bonus: number;
  xpEarned: number;
  elapsedSeconds: number;
  newLevel: number;
  contractsCompleted: number;
  reputation: number;
  outcome: 'victory' | 'timeout';
}

export interface GameState {
  version: number;
  mode: GameMode;
  money: number;
  totalEarned: number;
  xp: number;
  level: number;
  reputation: number; // 0..100
  contractsCompleted: number;
  completedContractIds: string[];
  materials: MaterialsInventory;
  hiredWorkers: WorkerRole[];
  equipment: EquipmentState;
  site: SiteProgress;
  placementRotation: number; // radians in 90-deg steps
}

export interface FloatingToast {
  id: number;
  text: string;
  positive: boolean;
}

export interface TelemetrySnapshot {
  excavatorX: number;
  excavatorZ: number;
  excavatorSpeed: number;
  excavatorNearTarget: boolean;
  nearestTargetLabel: string;
}
