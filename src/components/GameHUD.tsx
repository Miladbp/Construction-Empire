import React, { useState } from 'react';
import {
  Camera,
  ChevronDown,
  ChevronUp,
  Sun,
  Sunset,
  Moon,
  Volume2,
  VolumeX,
  Pause,
  Fuel,
  Hammer,
  Package,
  Users,
  FileText,
  Check,
  Lock,
  RotateCw,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import {
  CameraMode,
  FloatingToast,
  GameState,
  Language,
  MaterialKey,
  TelemetrySnapshot,
  TimeOfDay,
  WorkerRole,
} from '../game/types';
import {
  CONTRACTS,
  EXCAVATOR_UPGRADE_COSTS,
  getActiveStageId,
  getContractById,
  getOverallProgressPercent,
  getStageProgressFraction,
  MATERIAL_CATALOG,
  MIXER_RENTAL_COST,
  STAGE_ORDER,
  WORKER_CATALOG,
} from '../game/rules';
import { TRANSLATIONS } from '../game/i18n';

type DockTab = 'build' | 'materials' | 'crew' | 'contracts';

interface GameHUDProps {
  state: GameState;
  lang: Language;
  cameraMode: CameraMode;
  timeOfDay: TimeOfDay;
  muted: boolean;
  telemetry: TelemetrySnapshot;
  toasts: FloatingToast[];
  onPrimaryAction: () => void;
  onRotatePreview: () => void;
  onBuyMaterial: (key: MaterialKey) => void;
  onHireWorker: (role: WorkerRole) => void;
  onUpgradeExcavator: () => void;
  onRentMixer: () => void;
  onRefuel: () => void;
  onSwitchContract: (contractId: string) => void;
  onCycleCamera: () => void;
  onCycleTimeOfDay: () => void;
  onToggleMute: () => void;
  onToggleLang: () => void;
  onPause: () => void;
  onVirtualMove: (forward: number, turn: number) => void;
}

function formatMoney(amount: number): string {
  return `$${Math.round(amount).toLocaleString('en-US')}`;
}

function formatTimer(sec: number): string {
  const clamped = Math.max(0, Math.floor(sec));
  const m = Math.floor(clamped / 60);
  const s = clamped % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  state,
  lang,
  cameraMode,
  timeOfDay,
  muted,
  telemetry,
  toasts,
  onPrimaryAction,
  onRotatePreview,
  onBuyMaterial,
  onHireWorker,
  onUpgradeExcavator,
  onRentMixer,
  onRefuel,
  onSwitchContract,
  onCycleCamera,
  onCycleTimeOfDay,
  onToggleMute,
  onToggleLang,
  onPause,
  onVirtualMove,
}) => {
  const [dockOpen, setDockOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<DockTab>('build');

  const t = TRANSLATIONS[lang];
  const isRtl = lang === 'fa';
  const activeStage = getActiveStageId(state.site);
  const stageMeta = t.stages[activeStage];
  const contract = getContractById(state.site.contractId);
  const contractMeta = t.contracts[contract.id] ?? t.contracts.oakridge_bungalow;
  const overallPct = getOverallProgressPercent(state.site);
  const stagePct = Math.round(getStageProgressFraction(state.site, activeStage) * 100);
  const isCuring = activeStage === 'concrete' && state.site.concretePoured >= 100 && state.site.concreteCured < 100;

  const challengeRemaining = Math.max(0, contract.deadlineSeconds - state.site.elapsedSeconds);

  const stageStepCountText = (() => {
    switch (activeStage) {
      case 'site_prep':
        return `${state.site.debrisCleared.filter(Boolean).length}/4`;
      case 'excavation':
        return `${state.site.excavationCells.filter((c) => c.depth >= 1).length}/9`;
      case 'foundation':
        return `${state.site.formworkPlaced}/4`;
      case 'concrete':
        return isCuring ? `${Math.round(state.site.concreteCured)}%` : `${Math.round(state.site.concretePoured)}%`;
      case 'structure':
        return `${state.site.structureBuilt}/6`;
      case 'finishing':
        return `${state.site.finishingDone}/4`;
      case 'inspection':
        return state.site.inspectionPassed ? '1/1' : '0/1';
    }
  })();

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="fixed inset-0 z-10 pointer-events-none">
      {/* Top Perimeter Bar: Left Company Readout + Right Utility Controls */}
      <div className="flex items-start justify-between p-2.5 sm:p-4 gap-2 sm:gap-3">
        {/* Top-Left Financial & Contract Strip */}
        <div
          className="pointer-events-auto bg-[#121923]/92 border border-slate-700/80 rounded-lg px-3 py-2 sm:px-4 sm:py-2.5 shadow-xl flex flex-wrap items-center gap-x-3 sm:gap-x-5 gap-y-1.5 min-w-0 shrink"
          data-testid="hud-company-bar"
        >
          <div>
            <div className="text-[10px] sm:text-[11px] font-semibold tracking-wider text-amber-400/90 uppercase">
              {t.cash}
            </div>
            <div
              className="font-mono-num text-base sm:text-2xl font-bold text-white leading-tight"
              data-testid="hud-money"
            >
              {state.mode === 'sandbox' ? t.unlimited : formatMoney(state.money)}
            </div>
          </div>

          <div className="h-8 w-px bg-slate-700/80 hidden sm:block" aria-hidden="true" />

          <div className="flex items-center gap-3 sm:gap-4 text-xs">
            <div>
              <div className="text-slate-400 font-medium text-[10px] sm:text-xs">{t.level}</div>
              <div className="font-mono-num text-sm sm:text-base font-bold text-slate-100" data-testid="hud-level">
                {state.level}
              </div>
            </div>
            <div className="hidden sm:block">
              <div className="text-slate-400 font-medium">{t.reputation}</div>
              <div className="font-mono-num text-base font-bold text-emerald-400">
                {state.reputation}%
              </div>
            </div>
          </div>

          <div className="h-8 w-px bg-slate-700/80 hidden md:block" aria-hidden="true" />

          <div className="min-w-[110px] sm:min-w-[140px]">
            <div className="flex items-center justify-between gap-2 text-[11px] sm:text-xs mb-1">
              <span className="font-semibold text-slate-100 truncate max-w-[115px] sm:max-w-[160px]">{contractMeta.name}</span>
              <span className="font-mono-num font-bold text-amber-400" data-testid="hud-progress">
                {overallPct}%
              </span>
            </div>
            <div className="w-full h-1.5 sm:h-2 bg-slate-800 rounded-sm overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-all duration-200"
                style={{ width: `${overallPct}%` }}
              />
            </div>
          </div>

          {state.mode === 'challenge' && (
            <div className="px-2 py-1 bg-rose-950/90 border border-rose-500/60 rounded text-xs">
              <div className="text-rose-300 text-[10px] font-semibold uppercase">{t.timeRemaining}</div>
              <div className="font-mono-num text-sm font-bold text-white">{formatTimer(challengeRemaining)}</div>
            </div>
          )}
        </div>

        {/* Top-Right Compact Square Utility Controls */}
        <div className="pointer-events-auto flex items-center gap-1 sm:gap-1.5 shrink-0">
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onCycleCamera();
            }}
            aria-label={`${t.cameraLabel}: ${t.cameraModes[cameraMode]}`}
            title={`${t.cameraLabel} [C]`}
            className="h-8 w-8 sm:h-10 sm:w-auto sm:px-2.5 bg-[#121923]/92 hover:bg-[#1d2838] text-slate-100 border border-slate-700/80 rounded-lg flex items-center justify-center sm:gap-1.5 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
          >
            <Camera className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">{t.cameraModes[cameraMode]}</span>
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onCycleTimeOfDay();
            }}
            aria-label={`${t.lightingLabel}: ${t.timeModes[timeOfDay]}`}
            title={t.timeModes[timeOfDay]}
            className="w-8 h-8 sm:w-10 sm:h-10 bg-[#121923]/92 hover:bg-[#1d2838] text-slate-100 border border-slate-700/80 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
          >
            {timeOfDay === 'day' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : timeOfDay === 'dusk' ? (
              <Sunset className="w-4 h-4 text-orange-400" />
            ) : (
              <Moon className="w-4 h-4 text-sky-300" />
            )}
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleMute();
            }}
            aria-label={t.audioLabel}
            title={`${t.audioLabel} [M]`}
            className="w-8 h-8 sm:w-10 sm:h-10 bg-[#121923]/92 hover:bg-[#1d2838] text-slate-100 border border-slate-700/80 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
          >
            {muted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleLang();
            }}
            aria-label={t.languageLabel}
            className="h-8 px-2 sm:h-10 sm:px-2.5 bg-[#121923]/92 hover:bg-[#1d2838] text-slate-100 border border-slate-700/80 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
          >
            {lang === 'en' ? 'فا' : 'EN'}
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onPause();
            }}
            aria-label={t.pauseLabel}
            title={`${t.pauseLabel} [Esc]`}
            className="w-8 h-8 sm:w-10 sm:h-10 bg-[#121923]/92 hover:bg-[#1d2838] text-slate-100 border border-slate-700/80 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
          >
            <Pause className="w-4 h-4 text-slate-100" />
          </button>
        </div>
      </div>

      {/* Floating Cash & Action Toasts */}
      <div className="fixed top-20 left-1/2 -translate-x-1/2 pointer-events-none flex flex-col items-center gap-1.5 z-20">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`animate-float-reward font-mono-num text-sm font-bold px-3.5 py-1.5 rounded-md shadow-lg border ${
              toast.positive
                ? 'bg-[#12261e]/95 text-emerald-300 border-emerald-500/60'
                : 'bg-[#2a1519]/95 text-rose-200 border-rose-500/60'
            }`}
          >
            {toast.text}
          </div>
        ))}
      </div>

      {/* Responsive Mobile Touch D-Pad (shown when dock is collapsed so it never sits behind dock) */}
      {!dockOpen && (
        <div className="md:hidden fixed bottom-14 left-3 pointer-events-auto grid grid-cols-3 gap-1 w-28">
          <div />
          <button
            type="button"
            aria-label="Drive Forward"
            onPointerDown={() => onVirtualMove(1, 0)}
            onPointerUp={() => onVirtualMove(0, 0)}
            onPointerLeave={() => onVirtualMove(0, 0)}
            className="h-9 bg-[#121923]/90 active:bg-amber-500 active:text-slate-950 border border-slate-600 rounded flex items-center justify-center text-white"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
          <div />
          <button
            type="button"
            aria-label="Turn Left"
            onPointerDown={() => onVirtualMove(0, 1)}
            onPointerUp={() => onVirtualMove(0, 0)}
            onPointerLeave={() => onVirtualMove(0, 0)}
            className="h-9 bg-[#121923]/90 active:bg-amber-500 active:text-slate-950 border border-slate-600 rounded flex items-center justify-center text-white"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            aria-label="Drive Reverse"
            onPointerDown={() => onVirtualMove(-1, 0)}
            onPointerUp={() => onVirtualMove(0, 0)}
            onPointerLeave={() => onVirtualMove(0, 0)}
            className="h-9 bg-[#121923]/90 active:bg-amber-500 active:text-slate-950 border border-slate-600 rounded flex items-center justify-center text-white"
          >
            <ArrowDown className="w-4 h-4" />
          </button>
          <button
            type="button"
            aria-label="Turn Right"
            onPointerDown={() => onVirtualMove(0, -1)}
            onPointerUp={() => onVirtualMove(0, 0)}
            onPointerLeave={() => onVirtualMove(0, 0)}
            className="h-9 bg-[#121923]/90 active:bg-amber-500 active:text-slate-950 border border-slate-600 rounded flex items-center justify-center text-white"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Unified Collapsible Bottom Construction Dock */}
      <div className="fixed bottom-3 left-1/2 -translate-x-1/2 w-[min(880px,95vw)] flex flex-col items-center pointer-events-none">
        {/* Collapse / Expand Drawer Handle */}
        <button
          type="button"
          tabIndex={-1}
          onClick={(e) => {
            e.currentTarget.blur();
            setDockOpen((o) => !o);
          }}
          className="pointer-events-auto mb-1 px-3.5 py-1 bg-[#121923]/92 hover:bg-[#1c2635] text-slate-200 border border-slate-700/80 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          {dockOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          <span>{dockOpen ? t.dockHide : t.dockShow}</span>
        </button>

        {dockOpen && (
          <div className="pointer-events-auto w-full bg-[#121923]/94 border border-slate-700/85 rounded-xl shadow-2xl overflow-hidden">
            {/* Segmented Tab Header */}
            <div className="flex items-center justify-between border-b border-slate-700/80 px-3 py-1.5 bg-[#0d131b]/90 gap-2 overflow-x-auto">
              <div className="flex items-center gap-1" role="tablist">
                {(
                  [
                    { id: 'build', label: t.tabs.build, icon: Hammer },
                    { id: 'materials', label: t.tabs.materials, icon: Package },
                    { id: 'crew', label: t.tabs.crew, icon: Users },
                    { id: 'contracts', label: t.tabs.contracts, icon: FileText },
                  ] as const
                ).map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === id}
                    onClick={() => setActiveTab(id)}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      activeTab === id
                        ? 'bg-amber-500 text-slate-950'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>

              {/* Compact Fuel & Excavator Readout */}
              <div className="hidden sm:flex items-center gap-3 text-xs text-slate-300 shrink-0">
                <div className="flex items-center gap-1.5">
                  <Fuel className="w-3.5 h-3.5 text-amber-400" />
                  <span className="font-mono-num font-semibold">{Math.round(state.equipment.excavatorFuel)}%</span>
                </div>
                {state.mode !== 'sandbox' && state.equipment.excavatorFuel < 60 && (
                  <button
                    type="button"
                    onClick={onRefuel}
                    className="px-2 py-0.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 rounded text-[11px] font-semibold cursor-pointer"
                  >
                    {t.refuel}
                  </button>
                )}
              </div>
            </div>

            {/* Tab 1: Active Construction Stage & Primary Action */}
            {activeTab === 'build' && (
              <div className="p-3 sm:p-4 flex flex-col gap-3">
                {/* 7-Stage Progress Rail */}
                <div className="grid grid-cols-7 gap-1.5" aria-label="Construction stages">
                  {STAGE_ORDER.map((stageId, idx) => {
                    const isDone = idx < state.site.stageIndex || state.site.inspectionPassed;
                    const isCurrent = idx === state.site.stageIndex && !state.site.inspectionPassed;
                    return (
                      <div
                        key={stageId}
                        className={`px-2 py-1.5 rounded border text-center transition-colors ${
                          isDone
                            ? 'bg-emerald-950/70 border-emerald-600/60 text-emerald-300'
                            : isCurrent
                              ? 'bg-amber-500/18 border-amber-500 text-amber-300'
                              : 'bg-slate-900/70 border-slate-800 text-slate-500'
                        }`}
                      >
                        <div className="flex items-center justify-center gap-1 text-[10px] font-mono-num font-bold">
                          {isDone ? <Check className="w-3 h-3" /> : <span>{idx + 1}</span>}
                        </div>
                        <div className="text-[10px] font-medium truncate mt-0.5 hidden sm:block">
                          {t.stages[stageId].title}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Active Objective + Primary CTA */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs text-amber-400 font-semibold">
                      <span>
                        {t.stage} {state.site.stageIndex + 1}/7
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-num" data-testid="hud-stage-counter">
                        {stageStepCountText}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-num text-slate-300">{stagePct}%</span>
                    </div>
                    <h2 className="font-display text-base sm:text-lg font-bold text-white leading-tight mt-0.5">
                      {stageMeta.title}
                    </h2>
                    <p className="text-xs text-slate-300 mt-0.5">
                      {isCuring
                        ? t.curingNote
                        : activeStage === 'excavation' && telemetry.excavatorNearTarget
                          ? t.digPrompt
                          : stageMeta.task}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {(activeStage === 'foundation' || activeStage === 'structure') && (
                      <button
                        type="button"
                        onClick={onRotatePreview}
                        aria-label={t.rotateHint}
                        title={t.rotateHint}
                        className="px-3 py-2.5 bg-[#1c2736] hover:bg-[#27364a] text-slate-200 border border-slate-600/80 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                      >
                        <RotateCw className="w-4 h-4 text-sky-400" />
                        <span>R</span>
                      </button>
                    )}

                    <button
                      type="button"
                      data-testid="primary-stage-action"
                      onClick={onPrimaryAction}
                      className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-display font-bold text-sm rounded-lg shadow-md transition-colors cursor-pointer whitespace-nowrap flex items-center gap-2"
                    >
                      <span>{stageMeta.action}</span>
                      <span className="font-mono-num text-[11px] bg-slate-950/20 px-1.5 py-0.5 rounded">Space</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Material Supply Depot */}
            {activeTab === 'materials' && (
              <div className="p-3 sm:p-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {MATERIAL_CATALOG.map((item) => {
                  const packPrice = item.unitCost * item.packSize;
                  const stock = state.materials[item.key];
                  const req = contract.materialRequirements[item.key];
                  const canAfford = state.mode === 'sandbox' || state.money >= packPrice;
                  return (
                    <div
                      key={item.key}
                      className="bg-[#182230] border border-slate-700/80 rounded-lg p-3 flex flex-col justify-between gap-2"
                    >
                      <div>
                        <div className="text-xs font-bold text-white">{t.materials[item.key]}</div>
                        <div className="mt-1 flex items-baseline justify-between text-xs">
                          <span className="text-slate-400">{t.inStock}</span>
                          <span className="font-mono-num font-bold text-amber-400">
                            {state.mode === 'sandbox' ? '∞' : `${stock} ${item.unit}`}
                          </span>
                        </div>
                        <div className="flex items-baseline justify-between text-[11px] text-slate-400">
                          <span>{t.needed}</span>
                          <span className="font-mono-num">
                            {req} {item.unit}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={!canAfford}
                        onClick={() => onBuyMaterial(item.key)}
                        className="w-full py-1.5 px-2 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-400 text-slate-950 font-semibold text-xs rounded transition-colors cursor-pointer disabled:cursor-not-allowed whitespace-nowrap"
                      >
                        +{item.packSize} · {state.mode === 'sandbox' ? '$0' : formatMoney(packPrice)}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Tab 3: Workers & Heavy Equipment */}
            {activeTab === 'crew' && (
              <div className="p-3 sm:p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Workers */}
                <div className="flex flex-col gap-2">
                  {WORKER_CATALOG.map((w) => {
                    const isHired = state.hiredWorkers.includes(w.role);
                    const meta = t.workers[w.role];
                    const canAfford = state.mode === 'sandbox' || state.money >= w.hireCost;
                    return (
                      <div
                        key={w.id}
                        className="bg-[#182230] border border-slate-700/80 rounded-lg px-3 py-2 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white">{meta.name}</div>
                          <div className="text-[11px] text-slate-400 truncate">{meta.desc}</div>
                        </div>
                        <button
                          type="button"
                          disabled={isHired || !canAfford}
                          onClick={() => onHireWorker(w.role)}
                          className={`px-3 py-1.5 rounded text-xs font-semibold shrink-0 whitespace-nowrap transition-colors ${
                            isHired
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-600/60'
                              : 'bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-400 text-slate-950 cursor-pointer'
                          }`}
                        >
                          {isHired ? t.hired : `${t.hire} · ${formatMoney(w.hireCost)}`}
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Heavy Equipment */}
                <div className="flex flex-col gap-2">
                  <div className="bg-[#182230] border border-slate-700/80 rounded-lg px-3 py-2.5 flex items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-white">
                        {t.excavatorName} · T{state.equipment.excavatorLevel}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono-num">
                        {t.fuel}: {Math.round(state.equipment.excavatorFuel)}%
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {state.mode !== 'sandbox' && state.equipment.excavatorFuel < 95 && (
                        <button
                          type="button"
                          onClick={onRefuel}
                          className="px-2.5 py-1.5 bg-[#233245] hover:bg-[#2d4057] text-slate-100 rounded text-xs font-semibold cursor-pointer whitespace-nowrap"
                        >
                          {t.refuel}
                        </button>
                      )}
                      {state.equipment.excavatorLevel < 3 ? (
                        <button
                          type="button"
                          onClick={onUpgradeExcavator}
                          className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded text-xs font-semibold cursor-pointer whitespace-nowrap"
                        >
                          {t.upgradeHydraulics} · {formatMoney(EXCAVATOR_UPGRADE_COSTS[state.equipment.excavatorLevel])}
                        </button>
                      ) : (
                        <span className="text-xs font-semibold text-emerald-400">{t.maxLevel}</span>
                      )}
                    </div>
                  </div>

                  <div className="bg-[#182230] border border-slate-700/80 rounded-lg px-3 py-2.5 flex items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-white">{t.mixerTruck}</div>
                      <div className="text-[11px] text-slate-400">
                        {state.equipment.mixerRented ? t.mixerActive : formatMoney(MIXER_RENTAL_COST)}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={state.equipment.mixerRented}
                      onClick={onRentMixer}
                      className={`px-3 py-1.5 rounded text-xs font-semibold whitespace-nowrap ${
                        state.equipment.mixerRented
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-600/60'
                          : 'bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer'
                      }`}
                    >
                      {state.equipment.mixerRented ? t.mixerActive : t.rentMixer}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 4: Construction Contracts */}
            {activeTab === 'contracts' && (
              <div className="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {CONTRACTS.map((c) => {
                  const meta = t.contracts[c.id];
                  const isActive = state.site.contractId === c.id;
                  const isLocked = state.mode !== 'sandbox' && state.level < c.requiredLevel;
                  const isDone = state.completedContractIds.includes(c.id);
                  return (
                    <div
                      key={c.id}
                      className={`rounded-lg p-3 border flex flex-col justify-between gap-2 ${
                        isActive
                          ? 'bg-amber-500/12 border-amber-500'
                          : 'bg-[#182230] border-slate-700/80'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 text-[11px] text-slate-400">
                          <span>{meta.district}</span>
                          {isDone && <span className="text-emerald-400 font-semibold">{t.completed}</span>}
                        </div>
                        <div className="text-sm font-bold text-white mt-0.5">{meta.name}</div>
                        <div className="text-[11px] text-slate-300 mt-1 line-clamp-2">{meta.desc}</div>
                        <div className="mt-2 font-mono-num text-xs font-bold text-amber-400">
                          {t.reward}: {formatMoney(c.reward)} · +{c.xpReward} XP
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={isActive || isLocked}
                        onClick={() => onSwitchContract(c.id)}
                        className={`w-full py-1.5 px-3 rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
                          isActive
                            ? 'bg-amber-500/25 text-amber-300'
                            : isLocked
                              ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                              : 'bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer'
                        }`}
                      >
                        {isLocked && <Lock className="w-3.5 h-3.5" />}
                        <span>
                          {isActive
                            ? t.activeContract
                            : isLocked
                              ? `${t.lockedLevel} ${c.requiredLevel}`
                              : t.startContract}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
