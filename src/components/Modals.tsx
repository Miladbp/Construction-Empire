import React from 'react';
import { CompletionSnapshot, Language } from '../game/types';
import { TRANSLATIONS } from '../game/i18n';

interface PauseModalProps {
  lang: Language;
  muted: boolean;
  onResume: () => void;
  onSave: () => void;
  onRestart: () => void;
  onToggleMute: () => void;
  onToggleLang: () => void;
  onMainMenu: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  lang,
  muted,
  onResume,
  onSave,
  onRestart,
  onToggleMute,
  onToggleLang,
  onMainMenu,
}) => {
  const t = TRANSLATIONS[lang];
  return (
    <div
      dir={lang === 'fa' ? 'rtl' : 'ltr'}
      role="dialog"
      aria-modal="true"
      aria-label={t.pauseTitle}
      className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/75 p-4"
    >
      <div className="w-full max-w-sm bg-[#131b26] border border-slate-700 rounded-xl p-6 shadow-2xl">
        <h2 className="font-display text-2xl font-bold text-white mb-5">{t.pauseTitle}</h2>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onResume}
            className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-base rounded-lg transition-colors cursor-pointer"
          >
            {t.resume}
          </button>

          <button
            type="button"
            onClick={onSave}
            className="w-full py-2.5 px-4 bg-[#1d293a] hover:bg-[#27364d] text-slate-100 font-semibold text-sm rounded-lg border border-slate-600/70 transition-colors cursor-pointer"
          >
            {t.saveNow}
          </button>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onToggleMute}
              className="py-2.5 px-3 bg-[#182230] hover:bg-[#223044] text-slate-200 font-semibold text-xs rounded-lg border border-slate-700 cursor-pointer"
            >
              {muted ? t.soundOff : t.soundOn}
            </button>
            <button
              type="button"
              onClick={onToggleLang}
              className="py-2.5 px-3 bg-[#182230] hover:bg-[#223044] text-slate-200 font-semibold text-xs rounded-lg border border-slate-700 cursor-pointer"
            >
              {t.languageLabel}
            </button>
          </div>

          <button
            type="button"
            onClick={onRestart}
            className="w-full py-2.5 px-4 bg-[#182230] hover:bg-[#223044] text-slate-200 font-semibold text-sm rounded-lg border border-slate-700 transition-colors cursor-pointer"
          >
            {t.restartSite}
          </button>

          <button
            type="button"
            onClick={onMainMenu}
            className="w-full py-2.5 px-4 text-slate-400 hover:text-white font-semibold text-sm transition-colors cursor-pointer"
          >
            {t.mainMenu}
          </button>
        </div>
      </div>
    </div>
  );
};

interface OutcomeModalProps {
  lang: Language;
  snapshot: CompletionSnapshot;
  onNextContract: () => void;
  onMainMenu: () => void;
}

export const OutcomeModal: React.FC<OutcomeModalProps> = ({
  lang,
  snapshot,
  onNextContract,
  onMainMenu,
}) => {
  const t = TRANSLATIONS[lang];
  const isVictory = snapshot.outcome === 'victory';
  const mins = Math.floor(snapshot.elapsedSeconds / 60);
  const secs = snapshot.elapsedSeconds % 60;
  const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;

  return (
    <div
      dir={lang === 'fa' ? 'rtl' : 'ltr'}
      role="dialog"
      aria-modal="true"
      aria-label={isVictory ? t.victoryTitle : t.timeoutTitle}
      className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/58 p-4"
    >
      <div className="w-full max-w-md bg-[#131b26] border border-slate-700 rounded-xl p-6 shadow-2xl">
        <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${isVictory ? 'text-emerald-400' : 'text-rose-400'}`}>
          {t.contracts[snapshot.contractId]?.name ?? snapshot.contractId}
        </div>
        <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-white">
          {isVictory ? t.victoryTitle : t.timeoutTitle}
        </h2>
        <p className="text-sm text-slate-300 mt-1.5 mb-5">
          {isVictory ? t.victorySub : t.timeoutSub}
        </p>

        {/* Mastery Stat Tiles */}
        <div className="grid grid-cols-3 gap-2.5 mb-6">
          <div className="bg-[#1b2534] border border-slate-700/80 rounded-lg p-3">
            <div className="text-[11px] text-slate-400 font-medium">{t.payout}</div>
            <div className="font-mono-num text-base font-bold text-amber-400 mt-0.5">
              ${(snapshot.payout + snapshot.bonus).toLocaleString('en-US')}
            </div>
          </div>
          <div className="bg-[#1b2534] border border-slate-700/80 rounded-lg p-3">
            <div className="text-[11px] text-slate-400 font-medium">{t.clearTime}</div>
            <div className="font-mono-num text-base font-bold text-white mt-0.5">{timeStr}</div>
          </div>
          <div className="bg-[#1b2534] border border-slate-700/80 rounded-lg p-3">
            <div className="text-[11px] text-slate-400 font-medium">{t.xpEarned}</div>
            <div className="font-mono-num text-base font-bold text-emerald-400 mt-0.5">
              +{snapshot.xpEarned}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            data-start="true"
            onClick={onNextContract}
            className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-base rounded-lg transition-colors cursor-pointer"
          >
            {isVictory ? t.nextContract : t.playAgain}
          </button>
          <button
            type="button"
            onClick={onMainMenu}
            className="w-full py-2.5 px-4 bg-[#182230] hover:bg-[#223044] text-slate-200 font-semibold text-sm rounded-lg border border-slate-700 transition-colors cursor-pointer"
          >
            {t.mainMenu}
          </button>
        </div>
      </div>
    </div>
  );
};
