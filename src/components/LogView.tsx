/**
 * Chronicles & World Events Log Modal
 */
import React from 'react';
import { GameLogMessage } from '../types/game';
import { TRANSLATIONS, Language } from '../localization/translations';
import { sfx } from '../audio/soundFx';
import { Scroll, X, ShieldAlert, Swords, Coins, Building2 } from 'lucide-react';

interface LogViewProps {
  logs: GameLogMessage[];
  lang: Language;
  onClose: () => void;
}

export const LogView: React.FC<LogViewProps> = ({ logs, lang, onClose }) => {
  const t = TRANSLATIONS[lang];

  return (
    <div className="absolute inset-0 z-30 bg-stone-950/95 flex flex-col pointer-events-auto backdrop-blur-none text-stone-100 animate-fade-in overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-900/90">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40">
            <Scroll className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-amber-200">{t.tabLog}</h2>
            <p className="text-xs text-stone-400">مێژوو و ڕووداوەکانی شانشینەکان و بازرگانی سوپا</p>
          </div>
        </div>

        <button
          onClick={() => {
            sfx.playClick();
            onClose();
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-300 text-sm font-semibold transition"
        >
          <X className="w-4 h-4" />
          {t.leaveSettlement}
        </button>
      </div>

      {/* Log list */}
      <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full space-y-3">
        {logs.map((log) => {
          let Icon = Scroll;
          let badgeColor = 'bg-stone-800 text-stone-300';

          if (log.type === 'politics') {
            Icon = Swords;
            badgeColor = 'bg-red-950 text-red-300 border border-red-800';
          } else if (log.type === 'fief') {
            Icon = Coins;
            badgeColor = 'bg-amber-950 text-amber-300 border border-amber-800';
          } else if (log.type === 'alert') {
            Icon = ShieldAlert;
            badgeColor = 'bg-purple-950 text-purple-300 border border-purple-800';
          }

          return (
            <div
              key={log.id}
              className="p-4 bg-stone-900/80 border border-stone-800 rounded-2xl flex items-start gap-4 shadow"
            >
              <div className={`p-2 rounded-xl ${badgeColor} shrink-0`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1 text-xs text-stone-500">
                  <span>ڕۆژی {log.day} • کاتژمێر {Math.floor(log.hour)}:00</span>
                  <span className="capitalize">{log.type}</span>
                </div>
                <p className="text-sm text-stone-200 leading-relaxed">
                  {lang === 'ku' ? log.textKu : log.textEn}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
