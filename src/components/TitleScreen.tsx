/**
 * Game Title Screen with atmospheric medieval crest lockup,
 * new campaign start, continue save, and landscape orientation guidance.
 */
import React from 'react';
import { TRANSLATIONS, Language } from '../localization/translations';
import { sfx } from '../audio/soundFx';
import { Swords, Play, RotateCcw, Globe, Volume2, VolumeX, Shield, Crown } from 'lucide-react';

interface TitleScreenProps {
  lang: Language;
  hasExistingSave: boolean;
  isMuted: boolean;
  onStartNewGame: () => void;
  onContinueGame: () => void;
  onToggleLanguage: () => void;
  onToggleSound: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  lang,
  hasExistingSave,
  isMuted,
  onStartNewGame,
  onContinueGame,
  onToggleLanguage,
  onToggleSound,
}) => {
  const t = TRANSLATIONS[lang];

  return (
    <div className="absolute inset-0 z-50 bg-stone-950 flex flex-col items-center justify-between p-6 overflow-hidden select-none">
      {/* Background radial gradient glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-950/20 via-stone-950/80 to-stone-950 pointer-events-none" />

      {/* Top utility row */}
      <div className="w-full max-w-5xl flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              sfx.playClick();
              onToggleLanguage();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-900 border border-stone-800 text-stone-300 hover:text-amber-300 text-xs font-bold transition shadow"
          >
            <Globe className="w-4 h-4 text-amber-400" />
            <span>{lang === 'ku' ? 'کوردی سۆرانی' : 'English'}</span>
          </button>
        </div>

        <button
          onClick={() => {
            sfx.playClick();
            onToggleSound();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-900 border border-stone-800 text-stone-300 hover:text-amber-300 text-xs font-bold transition shadow"
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          <span>{isMuted ? t.soundOff : t.soundOn}</span>
        </button>
      </div>

      {/* Central Hero Lockup & Title */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-xl my-auto">
        {/* Bespoke Heraldic Crest SVG */}
        <div className="mb-6 relative">
          <svg className="w-28 h-28 text-amber-500/90 filter drop-shadow-[0_0_15px_rgba(245,158,11,0.3)]" viewBox="0 0 100 100" fill="none" stroke="currentColor">
            {/* Outer Shield */}
            <path
              d="M50 8 L88 22 C88 56 65 82 50 94 C35 82 12 56 12 22 Z"
              strokeWidth="2.5"
              fill="rgba(30, 24, 18, 0.7)"
            />
            {/* Inner Crest Line */}
            <path
              d="M50 15 L80 26 C80 52 61 74 50 84 C39 74 20 52 20 26 Z"
              strokeWidth="1.2"
              strokeDasharray="2 2"
              fill="rgba(245, 158, 11, 0.08)"
            />
            {/* Crossed Broadswords */}
            <path d="M30 30 L70 70 M30 36 L36 30 M68 64 L74 70" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M70 30 L30 70 M70 36 L64 30 M32 64 L26 70" strokeWidth="2.2" strokeLinecap="round" />
            {/* Imperial Crown at center */}
            <path
              d="M40 52 L42 43 L47 48 L50 40 L53 48 L58 43 L60 52 Z"
              fill="currentColor"
              strokeWidth="1"
            />
          </svg>
        </div>

        {/* Title */}
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-wider text-amber-200 mb-3 drop-shadow-md">
          {t.appTitle}
        </h1>
        <p className="text-xs sm:text-sm text-stone-400 max-w-md leading-relaxed mb-8">
          {t.appSubtitle}
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
          {hasExistingSave && (
            <button
              onClick={() => {
                sfx.playClick();
                onContinueGame();
              }}
              className="flex-1 py-3.5 px-6 rounded-2xl bg-stone-800 hover:bg-stone-700 text-stone-100 font-bold text-sm transition flex items-center justify-center gap-2 border border-stone-700 shadow-xl"
            >
              <RotateCcw className="w-4 h-4 text-purple-400" />
              <span>{t.continueGame}</span>
            </button>
          )}

          <button
            onClick={() => {
              sfx.playWarHorn();
              onStartNewGame();
            }}
            className="flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-extrabold text-sm transition flex items-center justify-center gap-2 shadow-2xl shadow-amber-950/60 border border-amber-400"
          >
            <Play className="w-4 h-4 fill-stone-950" />
            <span>{t.newGame}</span>
          </button>
        </div>
      </div>

      {/* Bottom Hint */}
      <div className="relative z-10 text-center">
        <div className="text-[11px] text-stone-500 tracking-wide">
          {t.landscapeTip} • کلیک بۆ جووڵە • یاسای ژیانی ڕاستەقینە
        </div>
      </div>
    </div>
  );
};
