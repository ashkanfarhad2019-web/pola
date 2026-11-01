/**
 * Military Party & Troop Upgrade Management Screen
 */
import React from 'react';
import { GameState, TroopStack } from '../types/game';
import { TROOP_CATALOG, TRADE_GOODS } from '../data/worldData';
import { TRANSLATIONS, Language } from '../localization/translations';
import { sfx } from '../audio/soundFx';
import { 
  Users, 
  Shield, 
  ChevronUp, 
  Trash2, 
  Coins, 
  Wheat, 
  X,
  Swords
} from 'lucide-react';

interface PartyViewProps {
  gameState: GameState;
  lang: Language;
  onClose: () => void;
  onUpgradeTroop: (troopId: string, targetTroopId: string, count: number) => void;
  onDisbandTroop: (troopId: string, count: number) => void;
}

export const PartyView: React.FC<PartyViewProps> = ({
  gameState,
  lang,
  onClose,
  onUpgradeTroop,
  onDisbandTroop,
}) => {
  const t = TRANSLATIONS[lang];
  const player = gameState.player;

  let totalWages = 0;
  let totalTroopCount = 0;
  player.troops.forEach((stack) => {
    const tDef = TROOP_CATALOG[stack.troopId];
    if (tDef) {
      totalWages += tDef.dailyWage * stack.count;
      totalTroopCount += stack.count;
    }
  });

  return (
    <div className="absolute inset-0 z-30 bg-stone-950/95 flex flex-col pointer-events-auto backdrop-blur-none text-stone-100 animate-fade-in overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-900/90">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-950 border border-purple-500/40 text-purple-300">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wide text-amber-200">
              {t.partyManagement} ({totalTroopCount} {t.troops})
            </h1>
            <p className="text-xs text-stone-400">
              {t.dailyWages}: <span className="text-yellow-400 font-bold">{totalWages} دینار</span> / ڕۆژ
            </p>
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

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Troops List (Col 1 & 2) */}
        <div className="md:col-span-2 space-y-3">
          <h3 className="text-xs uppercase tracking-wider text-stone-400 font-bold mb-2">
            جەنگاوەرانی ناو سوپاکەت
          </h3>

          {player.troops.length === 0 ? (
            <div className="p-8 text-center bg-stone-900/60 border border-stone-800 rounded-2xl text-stone-400 text-sm">
              سوپاکەت لە ئێستادا بەتاڵە! لە مەیخانەی شارەکان سەرباز وەربگرە.
            </div>
          ) : (
            player.troops.map((stack) => {
              const tDef = TROOP_CATALOG[stack.troopId];
              if (!tDef) return null;

              return (
                <div
                  key={stack.troopId}
                  className="bg-stone-900/80 border border-stone-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg hover:border-stone-700 transition"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-950/70 border border-purple-800/80 flex items-center justify-center font-bold text-lg text-purple-300">
                      {stack.count}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-stone-200">
                          {lang === 'ku' ? tDef.nameKu : tDef.name}
                        </h4>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-stone-800 text-amber-400 font-bold border border-stone-700">
                          {t.tier} {tDef.tier}
                        </span>
                      </div>

                      <div className="flex gap-4 text-xs text-stone-400 mt-1">
                        <span>{t.hp}: <b className="text-emerald-400">{tDef.maxHp}</b></span>
                        <span>{t.attack}: <b className="text-red-400">{tDef.meleeAttack || tDef.rangedAttack}</b></span>
                        <span>{t.defense}: <b className="text-blue-400">{tDef.armor}</b></span>
                        <span>مەعاش: <b className="text-yellow-400">{tDef.dailyWage}z</b></span>
                      </div>
                    </div>
                  </div>

                  {/* Actions: Upgrade or Disband */}
                  <div className="flex items-center gap-2">
                    {tDef.upgradeTo && tDef.upgradeTo.length > 0 && (
                      <div className="flex gap-2">
                        {tDef.upgradeTo.map((targetId) => {
                          const targetDef = TROOP_CATALOG[targetId];
                          const upgradeCost = tDef.upgradeCost || 35;
                          const canAfford = player.dinars >= upgradeCost;

                          return (
                            <button
                              key={targetId}
                              disabled={!canAfford}
                              onClick={() => {
                                sfx.playCoin();
                                onUpgradeTroop(stack.troopId, targetId, 1);
                              }}
                              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-30 text-stone-950 font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                              بۆ {lang === 'ku' ? targetDef?.nameKu.split(' ')[0] : targetDef?.name.split(' ')[0]} ({upgradeCost}z)
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <button
                      onClick={() => {
                        sfx.playClick();
                        onDisbandTroop(stack.troopId, 1);
                      }}
                      className="p-2 rounded-xl bg-stone-800 hover:bg-red-950 hover:text-red-300 text-stone-500 transition"
                      title="دەرکردن لە سوپا"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Inventory & Food Status (Col 3) */}
        <div className="space-y-4">
          <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-5 shadow-xl">
            <h3 className="text-base font-bold text-amber-300 mb-3 flex items-center gap-2">
              <Wheat className="w-5 h-5 text-amber-400" />
              کۆگای خۆراک و کەلوپەل
            </h3>

            <div className="space-y-2 max-h-72 overflow-y-auto">
              {Object.entries(player.inventory).map(([goodKey, count]) => {
                if (!count || count <= 0) return null;
                const itemDef = TRADE_GOODS[goodKey as keyof typeof TRADE_GOODS];

                return (
                  <div
                    key={goodKey}
                    className="flex justify-between items-center bg-stone-950/60 p-2.5 rounded-xl border border-stone-800/80 text-xs"
                  >
                    <span className="font-semibold text-stone-300">
                      {lang === 'ku' ? itemDef?.nameKu : itemDef?.name}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-stone-800 font-bold text-purple-300">
                      {count} دانە ({itemDef ? itemDef.weight * count : 0} kg)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
