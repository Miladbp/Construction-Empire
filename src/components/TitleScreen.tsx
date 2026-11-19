import React from 'react';
import { GameMode, Language } from '../game/types';
import { TRANSLATIONS } from '../game/i18n';

interface TitleScreenProps {
  lang: Language;
  hasSave: boolean;
  onStartMode: (mode: GameMode) => void;
  onContinue: () => void;
  onToggleLang: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  lang,
  hasSave,
  onStartMode,
  onContinue,
  onToggleLang,
}) => {
  const t = TRANSLATIONS[lang];
  const isRtl = lang === 'fa';

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-20 flex flex-col justify-between pointer-events-none"
      style={{
        background: isRtl
          ? 'linear-gradient(270deg, rgba(14,20,27,0.92) 0%, rgba(14,20,27,0.72) 38%, rgba(14,20,27,0.12) 72%, rgba(14,20,27,0) 100%)'
          : 'linear-gradient(90deg, rgba(14,20,27,0.92) 0%, rgba(14,20,27,0.72) 38%, rgba(14,20,27,0.12) 72%, rgba(14,20,27,0) 100%)',
      }}
    >
      {/* Top Safe Bar: Language Switcher */}
      <div className="flex items-center justify-end p-5 sm:p-7">
        <button
          type="button"
          onClick={onToggleLang}
          aria-label={t.languageLabel}
          className="pointer-events-auto px-4 py-2 text-sm font-semibold text-slate-100 bg-[#182230] hover:bg-[#223044] border border-slate-600/70 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
        >
          {t.languageLabel}
        </button>
      </div>

      {/* Main Asymmetric Title Lockup */}
      <div className="px-6 sm:px-14 max-w-xl my-auto pointer-events-auto">
        {/* Custom Inline SVG Industrial Emblem */}
        <div className="mb-5 flex items-center gap-4">
          <svg
            viewBox="0 0 64 64"
            className="w-14 h-14 shrink-0"
            aria-hidden="true"
          >
            <polygon
              points="32,3 58,18 58,46 32,61 6,46 6,18"
              fill="#19222d"
              stroke="#f59e0b"
              strokeWidth="3"
            />
            <path
              d="M18 46 L18 22 L46 22 M30 22 L30 33"
              fill="none"
              stroke="#f8fafc"
              strokeWidth="3.5"
              strokeLinecap="square"
            />
            <path
              d="M18 32 L28 22 M36 22 L44 30"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2.5"
            />
            <rect x="26" y="33" width="8" height="6" rx="1" fill="#f59e0b" />
            <path
              d="M30 39 L30 43 C30 46 34 46 34 43"
              fill="none"
              stroke="#f8fafc"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <rect x="14" y="46" width="36" height="4" fill="#f59e0b" />
          </svg>
          <div className="h-10 w-px bg-amber-500/40" aria-hidden="true" />
          <p className="text-sm font-medium text-slate-300 leading-snug max-w-xs">
            {t.subtitle}
          </p>
        </div>

        <h1 className="font-display text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-[1.06] hud-stroke mb-8">
          {t.title}
        </h1>

        {/* Primary CTA Stack */}
        <div className="flex flex-col gap-3 max-w-xs">
          {hasSave ? (
            <button
              type="button"
              data-start="true"
              onClick={onContinue}
              className="w-full py-3.5 px-6 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-display font-bold text-lg rounded-lg shadow-lg transition-colors cursor-pointer text-center"
            >
              {t.continueGame}
            </button>
          ) : (
            <button
              type="button"
              data-start="true"
              onClick={() => onStartMode('career')}
              className="w-full py-3.5 px-6 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-display font-bold text-lg rounded-lg shadow-lg transition-colors cursor-pointer text-center"
            >
              {t.startCareer}
            </button>
          )}

          <div className="grid grid-cols-2 gap-2.5">
            {hasSave && (
              <button
                type="button"
                onClick={() => onStartMode('career')}
                className="col-span-2 py-2.5 px-4 bg-[#1c2736] hover:bg-[#263549] text-slate-100 font-semibold text-sm rounded-lg border border-slate-600/70 transition-colors cursor-pointer"
              >
                {t.startCareer}
              </button>
            )}
            <button
              type="button"
              onClick={() => onStartMode('sandbox')}
              className="py-2.5 px-4 bg-[#17212e] hover:bg-[#223044] text-slate-100 font-semibold text-sm rounded-lg border border-slate-600/70 transition-colors cursor-pointer"
            >
              {t.sandboxMode}
            </button>
            <button
              type="button"
              onClick={() => onStartMode('challenge')}
              className="py-2.5 px-4 bg-[#17212e] hover:bg-[#223044] text-slate-100 font-semibold text-sm rounded-lg border border-slate-600/70 transition-colors cursor-pointer"
            >
              {t.challengeMode}
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Safe Control Hint Line */}
      <div className="px-6 sm:px-14 pb-6">
        <p className="text-xs sm:text-sm text-slate-300/90 font-medium hud-stroke">
          {t.controlHint}
        </p>
      </div>
    </div>
  );
};
