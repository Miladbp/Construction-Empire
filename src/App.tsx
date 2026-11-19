import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CameraMode,
  CompletionSnapshot,
  FloatingToast,
  GameMode,
  GameScreenState,
  GameState,
  Language,
  MaterialKey,
  TelemetrySnapshot,
  TimeOfDay,
  WorkerRole,
} from './game/types';
import {
  ActionResult,
  buyMaterialPack,
  createInitialGameState,
  createSiteProgress,
  deserializeSaveData,
  getActiveStageId,
  getNextContractId,
  hireWorker,
  performPrimaryStageAction,
  refuelExcavator,
  rentMixerTruck,
  SAVE_STORAGE_KEY,
  serializeSaveData,
  switchContract,
  tickGameSimulation,
  upgradeExcavator,
} from './game/rules';
import { SceneController } from './game/SceneController';
import { soundEngine } from './game/audio';
import { TRANSLATIONS } from './game/i18n';
import { TitleScreen } from './components/TitleScreen';
import { GameHUD } from './components/GameHUD';
import { OutcomeModal, PauseModal } from './components/Modals';

function loadSavedGame(): GameState | null {
  try {
    return deserializeSaveData(window.localStorage.getItem(SAVE_STORAGE_KEY));
  } catch {
    return null;
  }
}

function persistGame(state: GameState): void {
  try {
    window.localStorage.setItem(SAVE_STORAGE_KEY, serializeSaveData(state));
  } catch {
    // Ignore storage quota errors
  }
}

export default function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<SceneController | null>(null);
  const workerAccRef = useRef<{ value: number }>({ value: 0 });
  const toastIdRef = useRef(1);

  const [savedExists, setSavedExists] = useState<boolean>(() => loadSavedGame() !== null);
  const [screenState, setScreenState] = useState<GameScreenState>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('autostart') === '1' ? 'playing' : 'title';
  });
  const [gameState, setGameState] = useState<GameState>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      return loadSavedGame() ?? createInitialGameState('career');
    }
    return createInitialGameState('career');
  });
  const [lang, setLang] = useState<Language>('en');
  const [cameraMode, setCameraMode] = useState<CameraMode>('orbit');
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('day');
  const [muted, setMuted] = useState(false);
  const [toasts, setToasts] = useState<FloatingToast[]>([]);
  const [outcomeSnapshot, setOutcomeSnapshot] = useState<CompletionSnapshot | null>(null);
  const [telemetry, setTelemetry] = useState<TelemetrySnapshot>({
    excavatorX: -7.6,
    excavatorZ: 7.6,
    excavatorSpeed: 0,
    excavatorNearTarget: false,
    nearestTargetLabel: 'site_prep',
  });

  // Refs for latest state inside event listeners & SceneController callbacks
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;
  const screenStateRef = useRef(screenState);
  screenStateRef.current = screenState;
  const langRef = useRef(lang);
  langRef.current = lang;

  const pushToast = useCallback((text: string, positive = true) => {
    const id = toastIdRef.current++;
    setToasts((prev) => [...prev.slice(-3), { id, text, positive }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 1450);
  }, []);

  const applyActionResult = useCallback(
    (res: ActionResult, stageHint?: string) => {
      const t = TRANSLATIONS[langRef.current];
      if (!res.changed) {
        if (res.errorKey === 'insufficientFunds') {
          soundEngine.playErrorBump();
          pushToast(t.insufficientFunds, false);
        } else if (res.errorKey === 'insufficientMaterials') {
          soundEngine.playErrorBump();
          pushToast(t.insufficientMaterials, false);
        } else if (res.errorKey === 'outOfFuel') {
          soundEngine.playErrorBump();
          pushToast(t.refuel, false);
        }
        return;
      }

      setGameState(res.state);
      persistGame(res.state);
      setSavedExists(true);

      if (res.rewardDelta && res.rewardDelta > 0) {
        pushToast(`+$${res.rewardDelta.toLocaleString('en-US')}`, true);
      } else if (res.rewardDelta && res.rewardDelta < 0) {
        pushToast(`-$${Math.abs(res.rewardDelta).toLocaleString('en-US')}`, false);
      }

      if (res.completed) {
        soundEngine.playStageFanfare();
        sceneRef.current?.triggerVictoryCelebration();
        setOutcomeSnapshot(res.completed);
        setScreenState('gameover');
        return;
      }

      if (res.stageAdvanced) {
        soundEngine.playCashChime();
      } else if (stageHint === 'excavation' || stageHint === 'site_prep') {
        soundEngine.playDigScoop();
      } else if (stageHint === 'concrete') {
        soundEngine.playConcretePour();
      } else {
        soundEngine.playBuildClack();
      }
    },
    [pushToast],
  );

  const handlePrimaryStageAction = useCallback(
    (explicitTargetIndex?: number) => {
      if (screenStateRef.current !== 'playing') return;
      const current = gameStateRef.current;
      const stage = getActiveStageId(current.site);

      let targetIdx = explicitTargetIndex;
      if (targetIdx === undefined && stage === 'excavation') {
        targetIdx = sceneRef.current?.getNearestExcavationCellIndex();
      } else if (targetIdx === undefined && stage === 'site_prep') {
        targetIdx = sceneRef.current?.getNearestDebrisIndex();
      }

      const res = performPrimaryStageAction(current, targetIdx);
      if (res.changed) {
        if (stage === 'excavation' && targetIdx !== undefined && targetIdx >= 0) {
          const cell = current.site.excavationCells[targetIdx];
          if (cell) {
            sceneRef.current?.triggerDigAnimation((cell.col - 1) * 3.55, (cell.row - 1) * 3.55);
          } else {
            sceneRef.current?.triggerDigAnimation();
          }
        } else if (stage === 'site_prep') {
          sceneRef.current?.triggerDigAnimation();
        } else if (stage === 'concrete') {
          sceneRef.current?.triggerPourEffect();
        } else {
          sceneRef.current?.triggerBuildEffect();
        }
      }
      applyActionResult(res, stage);
    },
    [applyActionResult],
  );

  // Sync document.body.dataset.state & SceneController screenState
  useEffect(() => {
    document.body.dataset.state = screenState;
    sceneRef.current?.setScreenState(screenState);
  }, [screenState]);

  // Sync Three.js visuals whenever gameState changes
  useEffect(() => {
    sceneRef.current?.applyGameState(gameState);
  }, [gameState]);

  // Mount Three.js WebGLRenderer once
  useEffect(() => {
    if (!mountRef.current) return;
    const ctrl = new SceneController(mountRef.current, gameStateRef.current, {
      onInteractTarget: (type, index) => {
        if (type === 'debris' || type === 'excavation') {
          handlePrimaryStageAction(index);
        } else {
          handlePrimaryStageAction();
        }
      },
      onTelemetry: (snap) => {
        setTelemetry(snap);
      },
      onFuelBurn: (amount) => {
        setGameState((prev) => {
          if (prev.mode === 'sandbox' || prev.equipment.excavatorFuel <= 0) return prev;
          return {
            ...prev,
            equipment: {
              ...prev.equipment,
              excavatorFuel: Math.max(0, prev.equipment.excavatorFuel - amount),
            },
          };
        });
      },
    });
    sceneRef.current = ctrl;
    ctrl.setScreenState(screenStateRef.current);

    return () => {
      ctrl.dispose();
      sceneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Deterministic simulation tick (curing, hired worker assistance, challenge timer) at 4Hz
  useEffect(() => {
    if (screenState !== 'playing') return;
    const interval = window.setInterval(() => {
      const current = gameStateRef.current;
      const { state: next, stageAdvanced, timeoutSnapshot } = tickGameSimulation(current, 0.25, workerAccRef.current);
      if (next !== current) {
        setGameState(next);
        if (stageAdvanced) {
          soundEngine.playCashChime();
          persistGame(next);
        }
      }
      if (timeoutSnapshot) {
        soundEngine.playErrorBump();
        setOutcomeSnapshot(timeoutSnapshot);
        setScreenState('gameover');
      }
    }, 250);
    return () => window.clearInterval(interval);
  }, [screenState]);

  const startNewGame = useCallback((mode: GameMode) => {
    const fresh = createInitialGameState(mode, 'oakridge_bungalow');
    setGameState(fresh);
    setOutcomeSnapshot(null);
    persistGame(fresh);
    setSavedExists(true);
    setScreenState('playing');
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, []);

  const continueSavedGame = useCallback(() => {
    const loaded = loadSavedGame();
    if (loaded) {
      setGameState(loaded);
    }
    setOutcomeSnapshot(null);
    setScreenState('playing');
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, []);

  const cycleCameraMode = useCallback(() => {
    setCameraMode((prev) => {
      const next: CameraMode = prev === 'orbit' ? 'follow' : prev === 'follow' ? 'iso' : 'orbit';
      sceneRef.current?.setCameraMode(next, true);
      return next;
    });
  }, []);

  const cycleTimeOfDay = useCallback(() => {
    setTimeOfDay((prev) => {
      const next: TimeOfDay = prev === 'day' ? 'dusk' : prev === 'dusk' ? 'night' : 'day';
      sceneRef.current?.applyTimeOfDay(next);
      return next;
    });
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      soundEngine.setMuted(next);
      return next;
    });
  }, []);

  const toggleLang = useCallback(() => {
    setLang((prev) => (prev === 'en' ? 'fa' : 'en'));
  }, []);

  const rotatePreview = useCallback(() => {
    setGameState((prev) => ({
      ...prev,
      placementRotation: (prev.placementRotation + Math.PI / 2) % (Math.PI * 2),
    }));
    soundEngine.playBuildClack();
  }, []);

  // Global keyboard shortcuts (Title start handshake, Space action, Esc/P pause, C camera, R rotate, M mute)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const currentScreen = screenStateRef.current;

      if (currentScreen === 'title') {
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          if (loadSavedGame()) {
            continueSavedGame();
          } else {
            startNewGame('career');
          }
        }
        return;
      }

      if (e.code === 'Escape' || e.code === 'KeyP') {
        e.preventDefault();
        if (currentScreen === 'playing') setScreenState('paused');
        else if (currentScreen === 'paused') setScreenState('playing');
        return;
      }

      if (currentScreen !== 'playing') return;

      if (e.code === 'Space') {
        e.preventDefault();
        handlePrimaryStageAction();
      } else if (e.code === 'KeyC') {
        cycleCameraMode();
      } else if (e.code === 'KeyR') {
        rotatePreview();
      } else if (e.code === 'KeyM') {
        toggleMute();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [continueSavedGame, cycleCameraMode, handlePrimaryStageAction, rotatePreview, startNewGame, toggleMute]);

  const handleBuyMaterial = useCallback(
    (key: MaterialKey) => {
      applyActionResult(buyMaterialPack(gameStateRef.current, key));
    },
    [applyActionResult],
  );

  const handleHireWorker = useCallback(
    (role: WorkerRole) => {
      applyActionResult(hireWorker(gameStateRef.current, role));
    },
    [applyActionResult],
  );

  const handleUpgradeExcavator = useCallback(() => {
    applyActionResult(upgradeExcavator(gameStateRef.current));
  }, [applyActionResult]);

  const handleRentMixer = useCallback(() => {
    applyActionResult(rentMixerTruck(gameStateRef.current));
  }, [applyActionResult]);

  const handleRefuel = useCallback(() => {
    applyActionResult(refuelExcavator(gameStateRef.current));
  }, [applyActionResult]);

  const handleSwitchContract = useCallback(
    (contractId: string) => {
      const res = switchContract(gameStateRef.current, contractId);
      if (res.changed) {
        setGameState(res.state);
        persistGame(res.state);
        soundEngine.playCashChime();
      }
    },
    [],
  );

  const handleNextContract = useCallback(() => {
    const cur = gameStateRef.current;
    const nextId =
      outcomeSnapshot?.outcome === 'timeout'
        ? cur.site.contractId
        : getNextContractId(cur.site.contractId, cur.level, cur.mode);
    const nextState: GameState = {
      ...cur,
      site: createSiteProgress(nextId),
      equipment: { ...cur.equipment, excavatorFuel: 100 },
    };
    setGameState(nextState);
    persistGame(nextState);
    setOutcomeSnapshot(null);
    setScreenState('playing');
  }, [outcomeSnapshot]);

  const handleRestartSite = useCallback(() => {
    const cur = gameStateRef.current;
    const resetState: GameState = {
      ...cur,
      site: createSiteProgress(cur.site.contractId),
      equipment: { ...cur.equipment, excavatorFuel: 100 },
    };
    setGameState(resetState);
    persistGame(resetState);
    setScreenState('playing');
  }, []);

  const handleManualSave = useCallback(() => {
    persistGame(gameStateRef.current);
    setSavedExists(true);
    pushToast(TRANSLATIONS[langRef.current].savedToast, true);
    setScreenState('playing');
  }, [pushToast]);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#0e141b]">
      {/* Isolated WebGL Canvas Container — never unmounts on HUD state changes */}
      <div
        ref={mountRef}
        data-testid="three-canvas-container"
        className="absolute inset-0 w-full h-full"
      />

      {screenState === 'title' && (
        <TitleScreen
          lang={lang}
          hasSave={savedExists}
          onStartMode={startNewGame}
          onContinue={continueSavedGame}
          onToggleLang={toggleLang}
        />
      )}

      {screenState === 'playing' && (
        <GameHUD
          state={gameState}
          lang={lang}
          cameraMode={cameraMode}
          timeOfDay={timeOfDay}
          muted={muted}
          telemetry={telemetry}
          toasts={toasts}
          onPrimaryAction={() => handlePrimaryStageAction()}
          onRotatePreview={rotatePreview}
          onBuyMaterial={handleBuyMaterial}
          onHireWorker={handleHireWorker}
          onUpgradeExcavator={handleUpgradeExcavator}
          onRentMixer={handleRentMixer}
          onRefuel={handleRefuel}
          onSwitchContract={handleSwitchContract}
          onCycleCamera={cycleCameraMode}
          onCycleTimeOfDay={cycleTimeOfDay}
          onToggleMute={toggleMute}
          onToggleLang={toggleLang}
          onPause={() => setScreenState('paused')}
          onVirtualMove={(f, turn) => sceneRef.current?.setVirtualInput(f, turn)}
        />
      )}

      {screenState === 'paused' && (
        <PauseModal
          lang={lang}
          muted={muted}
          onResume={() => setScreenState('playing')}
          onSave={handleManualSave}
          onRestart={handleRestartSite}
          onToggleMute={toggleMute}
          onToggleLang={toggleLang}
          onMainMenu={() => setScreenState('title')}
        />
      )}

      {screenState === 'gameover' && outcomeSnapshot && (
        <OutcomeModal
          lang={lang}
          snapshot={outcomeSnapshot}
          onNextContract={handleNextContract}
          onMainMenu={() => setScreenState('title')}
        />
      )}
    </main>
  );
}
