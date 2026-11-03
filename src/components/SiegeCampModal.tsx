/**
 * Advanced Siege Camp & Assault Operations Modal
 * Manages multi-day siege logistics, engine construction (ladders, ram, catapults),
 * wall breaches, granary starvation, and bloodless capitulation.
 */
import React, { useState } from 'react';
import { GameState, Settlement, SiegeEngineType } from '../types/game';
import { SIEGE_CONFIG } from '../systems/MilitaryEngine';
import { sfx } from '../audio/soundFx';
import { Language, TRANSLATIONS } from '../localization/translations';
import { 
  ShieldAlert, 
  Flame, 
  Hammer, 
  Hourglass, 
  Wheat, 
  Swords, 
  Flag, 
  X, 
  AlertTriangle, 
  CheckCircle2,
  Castle,
  Layers,
  ArrowRight
} from 'lucide-react';

interface SiegeCampModalProps {
  settlement: Settlement;
  gameState: GameState;
  lang: Language;
  onClose: () => void;
  onQueueEngine: (settlementId: string, engineType: SiegeEngineType) => void;
  onDemandSurrender: (settlementId: string) => void;
  onOrderAssault: (settlementId: string) => void;
  onAbandonSiege: (settlementId: string) => void;
}

export const SiegeCampModal: React.FC<SiegeCampModalProps> = ({
  settlement,
  gameState,
  lang,
  onClose,
  onQueueEngine,
  onDemandSurrender,
  onOrderAssault,
  onAbandonSiege,
}) => {
  const t = TRANSLATIONS[lang];
  const player = gameState.player;
  const camp = settlement.siegeCamp;
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!camp) return null;

  const totalGarrison = settlement.garrison.reduce((acc, st) => acc + st.count, 0);
  const playerTroops = player.troops.reduce((acc, st) => acc + st.count, 0);
  const playerTimber = player.inventory.timber || 0;

  const handleBuild = (type: SiegeEngineType) => {
    setErrorMessage(null);
    const cfg = SIEGE_CONFIG[type];

    if (camp.activeConstruction) {
      setErrorMessage(`ئامێری (${camp.activeConstruction.nameKu}) لە ژێر دروستکردندایە! چاوەڕێ بکە.`);
      sfx.playClick();
      return;
    }

    const currentCount = camp.engines.filter((e) => e.type === type).length;
    if (currentCount >= cfg.maxAllowed) {
      setErrorMessage(`نەگەیشتوویتە سنووری دروستکردنی (${cfg.nameKu})!`);
      sfx.playClick();
      return;
    }

    if (playerTimber < cfg.timberCost) {
      setErrorMessage(`داری پێویستت نییە! پێویستت بە ${cfg.timberCost} داری ڕەق هەیە (بەردەست: ${playerTimber}).`);
      sfx.playClick();
      return;
    }

    sfx.playTroopMarch();
    onQueueEngine(settlement.id, type);
  };

  const isSurrenderPossible = camp.surrenderWillingness >= 75;

  return (
    <div className="absolute inset-0 z-40 bg-stone-950/90 flex flex-col items-center justify-center p-3 sm:p-6 backdrop-blur-sm pointer-events-auto text-stone-100 animate-fade-in">
      <div className="w-full max-w-3xl bg-stone-900/95 border border-stone-800 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-950/80 border border-amber-600/40 text-amber-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-amber-200">
                  {lang === 'ku' ? `کەمپی گەمارۆی ${settlement.nameKu}` : `Siege Camp of ${settlement.name}`}
                </h1>
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-red-950 border border-red-800/60 text-red-300">
                  {lang === 'ku' ? `ڕۆژی ${camp.daysBesieged}` : `Day ${camp.daysBesieged}`}
                </span>
              </div>
              <p className="text-xs text-stone-400">
                {lang === 'ku'
                  ? 'بەڕێوەبردنی کەمپی گەمارۆدان، دروستکردنی کەرەستە، پچڕاندنی خۆراک و هێرشبردن'
                  : 'Manage siege blockade, construct siege machinery, starve defenders, and breach walls'}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              sfx.playClick();
              onClose();
            }}
            className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-stone-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">

          {/* Status Metrics Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Wall Defense & Breaches */}
            <div className="p-3.5 rounded-2xl bg-stone-950/70 border border-stone-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-stone-400 text-xs font-semibold mb-1">
                <span>{lang === 'ku' ? 'دیوار و کەلێن' : 'Ramparts & Breaches'}</span>
                <Castle className="w-4 h-4 text-stone-400" />
              </div>
              <div className="font-bold text-base text-stone-200">
                {lang === 'ku' ? `ئاستی ${settlement.defenseLevel}` : `Tier ${settlement.defenseLevel}`}
              </div>
              <div className="text-[11px] font-semibold text-amber-400 mt-1">
                {camp.wallBreaches > 0
                  ? (lang === 'ku' ? `💥 ${camp.wallBreaches} کەلێنی تێکەوتووە` : `💥 ${camp.wallBreaches} Breach Opened`)
                  : (lang === 'ku' ? 'شوورا پتەوە' : 'Walls Intact')}
              </div>
            </div>

            {/* Defender Food Days */}
            <div className="p-3.5 rounded-2xl bg-stone-950/70 border border-stone-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-stone-400 text-xs font-semibold mb-1">
                <span>{lang === 'ku' ? 'ئازووقەی ناو قەڵا' : 'Garrison Rations'}</span>
                <Wheat className="w-4 h-4 text-amber-400" />
              </div>
              <div className={`font-bold text-base ${settlement.foodReservesDays <= 2 ? 'text-red-400' : 'text-stone-200'}`}>
                {settlement.foodReservesDays} {lang === 'ku' ? 'ڕۆژ ماوە' : 'Days Left'}
              </div>
              <div className="text-[11px] text-stone-400 mt-1">
                {settlement.foodReservesDays === 0
                  ? (lang === 'ku' ? '⚠️ قەیرانی برسیەتی هەیە' : '⚠️ Starving')
                  : (lang === 'ku' ? 'ڕێگای ئازووقە گیراوە' : 'Blockaded')}
              </div>
            </div>

            {/* Garrison vs Besiegers */}
            <div className="p-3.5 rounded-2xl bg-stone-950/70 border border-stone-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-stone-400 text-xs font-semibold mb-1">
                <span>{lang === 'ku' ? 'سوپای بەرامبەر' : 'Forces Ratio'}</span>
                <Swords className="w-4 h-4 text-purple-400" />
              </div>
              <div className="font-bold text-sm text-stone-200">
                <span className="text-purple-300 font-bold">{playerTroops}</span> {lang === 'ku' ? 'بەرامبەر' : 'vs'}{' '}
                <span className="text-red-400 font-bold">{totalGarrison}</span>
              </div>
              <div className="text-[11px] text-stone-400 mt-1">
                {lang === 'ku' ? 'تۆمارکراوی پاسەوانان' : 'Defending garrison'}
              </div>
            </div>

            {/* Surrender Readiness */}
            <div className="p-3.5 rounded-2xl bg-stone-950/70 border border-stone-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-stone-400 text-xs font-semibold mb-1">
                <span>{lang === 'ku' ? 'ئامادەیی تەسلیمبوون' : 'Surrender Will'}</span>
                <Flag className="w-4 h-4 text-emerald-400" />
              </div>
              <div className={`font-bold text-base ${isSurrenderPossible ? 'text-emerald-300' : 'text-stone-300'}`}>
                {camp.surrenderWillingness}٪
              </div>
              <div className="text-[11px] text-stone-400 mt-1">
                {isSurrenderPossible
                  ? (lang === 'ku' ? 'دەتوانی تەسلیمیان بکەیت' : 'Capitulation Ready')
                  : (lang === 'ku' ? 'بەرگری دەکەن' : 'Refusing Surrender')}
              </div>
            </div>
          </div>

          {/* Error / Alert notice */}
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-red-950/80 border border-red-700/60 text-red-200 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Active Construction Progress */}
          {camp.activeConstruction && (
            <div className="p-4 rounded-2xl bg-stone-950/80 border border-amber-600/40 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-amber-300 flex items-center gap-2">
                  <Hammer className="w-4 h-4 animate-bounce text-amber-400" />
                  {lang === 'ku' ? 'لە ژێر دروستکردندایە:' : 'Under Construction:'}{' '}
                  {camp.activeConstruction.nameKu}
                </span>
                <span className="text-stone-400 font-semibold">
                  {camp.activeConstruction.progressDays} / {camp.activeConstruction.totalDays}{' '}
                  {lang === 'ku' ? 'ڕۆژ' : 'Days'}
                </span>
              </div>
              <div className="w-full bg-stone-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(
                      100,
                      (camp.activeConstruction.progressDays / camp.activeConstruction.totalDays) * 100
                    )}%`,
                  }}
                />
              </div>
              <p className="text-[11px] text-stone-400">
                {lang === 'ku'
                  ? 'کاتژمێری یارییەکە بجوڵێنە تاوەکو ڕۆژەکان تێپەڕ دەبن و ئامێرەکە ئامادە دەبێت.'
                  : 'Advance simulation time on 1x or 2x speed for construction to complete.'}
              </p>
            </div>
          )}

          {/* Constructed Siege Engines Ready */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2.5 flex items-center gap-2">
              <Layers className="w-4 h-4 text-stone-400" />
              {lang === 'ku' ? 'ئامێرە ئامادەکراوەکانی کەمپ' : 'Prepared Siege Machinery'}
            </h2>

            {camp.engines.length === 0 ? (
              <div className="p-3.5 rounded-2xl bg-stone-950/40 border border-dashed border-stone-800 text-center text-xs text-stone-500">
                {lang === 'ku'
                  ? 'هێشتا هیچ ئامێرێکی گەمارۆدان دروست نەکراوە. لە خوارەوە یەکێک هەڵبژێرە!'
                  : 'No siege machinery built yet. Commission an engine below to breach defenses!'}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {camp.engines.map((eng, idx) => (
                  <div
                    key={`${eng.id}_${idx}`}
                    className="p-3 rounded-2xl bg-stone-950/80 border border-stone-800 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-xs text-amber-200">{eng.nameKu}</div>
                      <div className="text-[10px] text-stone-400">
                        {eng.type === 'catapult'
                          ? (lang === 'ku' ? 'ڕۆژانە بەرد دەهاوێژێت' : 'Bombards daily')
                          : (lang === 'ku' ? 'ئامادەیە بۆ هێرش' : 'Ready for assault')}
                      </div>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Commission New Siege Engines */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-stone-400 flex items-center gap-2">
                <Hammer className="w-4 h-4 text-stone-400" />
                {lang === 'ku' ? 'دروستکردنی ئامێری نوێ' : 'Commission Machinery'}
              </h2>
              <span className="text-xs font-bold text-amber-300">
                {lang === 'ku' ? `داری بەردەستت: ${playerTimber}` : `Your Timber: ${playerTimber}`}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(Object.keys(SIEGE_CONFIG) as SiegeEngineType[]).map((type) => {
                const cfg = SIEGE_CONFIG[type];
                const count = camp.engines.filter((e) => e.type === type).length;
                const canAfford = playerTimber >= cfg.timberCost;
                const isMax = count >= cfg.maxAllowed;
                const isBusy = !!camp.activeConstruction;

                return (
                  <div
                    key={type}
                    className="p-3.5 rounded-2xl bg-stone-950/80 border border-stone-800 flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-stone-200">{cfg.nameKu}</span>
                        <span className="text-[10px] text-stone-400">
                          {count}/{cfg.maxAllowed}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-400 leading-relaxed mb-2">
                        {cfg.descriptionKu}
                      </p>
                      <div className="flex items-center gap-3 text-[11px] text-amber-400 font-semibold">
                        <span>🪵 {cfg.timberCost} دار</span>
                        <span>⏳ {cfg.totalDays} ڕۆژ</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleBuild(type)}
                      disabled={isBusy || isMax || !canAfford}
                      className={`w-full py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                        isBusy || isMax || !canAfford
                          ? 'bg-stone-800 text-stone-500 cursor-not-allowed border border-stone-700/50'
                          : 'bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold shadow-lg'
                      }`}
                    >
                      <Hammer className="w-3.5 h-3.5" />
                      {isMax
                        ? (lang === 'ku' ? 'پڕبووە' : 'Maxed')
                        : isBusy
                        ? (lang === 'ku' ? 'کارکردن هەیە' : 'Busy')
                        : (lang === 'ku' ? 'دروستی بکە' : 'Build')}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:px-6 border-t border-stone-800 bg-stone-950/90 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => {
              sfx.playClick();
              onAbandonSiege(settlement.id);
            }}
            className="px-4 py-2.5 rounded-2xl bg-stone-800 hover:bg-red-950/60 border border-stone-700 hover:border-red-800/80 text-stone-300 hover:text-red-300 text-xs font-bold transition"
          >
            {lang === 'ku' ? 'هەڵگرتنی کەمپی گەمارۆدان' : 'Abandon Siege'}
          </button>

          <div className="flex items-center gap-2">
            {/* Bloodless Surrender Button */}
            <button
              onClick={() => {
                sfx.playWarHorn();
                onDemandSurrender(settlement.id);
              }}
              disabled={!isSurrenderPossible}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 ${
                isSurrenderPossible
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-stone-950 shadow-lg animate-pulse'
                  : 'bg-stone-800 text-stone-500 cursor-not-allowed border border-stone-700/60'
              }`}
            >
              <Flag className="w-4 h-4" />
              {lang === 'ku' ? 'داوای تەسلیمبوون بکە' : 'Demand Surrender'}
            </button>

            {/* Assault Ramparts Button */}
            <button
              onClick={() => {
                sfx.playWarHorn();
                onOrderAssault(settlement.id);
              }}
              className="px-5 py-2.5 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-xl transition flex items-center gap-2"
            >
              <Swords className="w-4 h-4" />
              {lang === 'ku' ? 'دەستپێکردنی هێرشی سەر قەڵا' : 'Launch Assault'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
