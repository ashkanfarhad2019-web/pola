/**
 * Tactical HUD & Collapsible Bottom Dock
 * Zero-occlusion viewport craft with touch-friendly actions
 */
import React, { useState } from 'react';
import { GameState } from '../types/game';
import { TRANSLATIONS, Language } from '../localization/translations';
import { sfx } from '../audio/soundFx';
import { 
  Coins, 
  Users, 
  Wheat, 
  Play, 
  Pause, 
  FastForward, 
  Map, 
  Building2, 
  Store, 
  Scale, 
  Scroll, 
  Save, 
  ChevronDown, 
  ChevronUp, 
  Maximize2,
  Compass,
  RotateCw,
  Eye
} from 'lucide-react';

interface TacticalHUDProps {
  gameState: GameState;
  lang: Language;
  activeView: 'map' | 'city' | 'party' | 'diplomacy' | 'news' | 'log';
  currentSettlementId: string | null;
  onOpenView: (view: 'map' | 'city' | 'party' | 'diplomacy' | 'news' | 'log') => void;
  onOpenSaveModal: () => void;
  onChangeSpeed: (speed: 0 | 1 | 2 | 5) => void;
}

export const TacticalHUD: React.FC<TacticalHUDProps> = ({
  gameState,
  lang,
  activeView,
  currentSettlementId,
  onOpenView,
  onOpenSaveModal,
  onChangeSpeed,
}) => {
  const t = TRANSLATIONS[lang];
  const [isDockCollapsed, setIsDockCollapsed] = useState(false);

  const player = gameState.player;
  const totalTroops = player.troops.reduce((a, b) => a + b.count, 0);

  // Compute food days left
  const grain = player.inventory.grain || 0;
  const meat = player.inventory.meat || 0;
  const totalFoodItems = grain + meat;
  const dailyConsumption = Math.max(1, Math.ceil(totalTroops / 8));
  const daysFoodLeft = Math.floor(totalFoodItems / dailyConsumption);

  return (
    <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between overflow-hidden">
      {/* Top Status Cluster */}
      <div className="flex flex-wrap items-center justify-between p-3 sm:px-6 sm:py-3 bg-gradient-to-b from-stone-950/90 via-stone-950/40 to-transparent">
        {/* Left: Player Profile & Kingdom */}
        <div className="flex items-center gap-3 pointer-events-auto">
          <div className="bg-stone-900/90 border border-stone-800 rounded-2xl px-3.5 py-1.5 flex items-center gap-3 shadow-xl">
            <div className="w-8 h-8 rounded-xl bg-purple-600/30 border border-purple-500/50 flex items-center justify-center font-bold text-sm text-purple-300">
              ⚔
            </div>
            <div>
              <div className="font-bold text-xs text-stone-200">
                {player.name} • <span className="text-amber-400 font-semibold">{player.title}</span>
              </div>
              <div className="text-[10px] text-stone-400">
                {lang === 'ku'
                  ? gameState.factions[player.factionId as keyof typeof gameState.factions]?.nameKu || 'سەربەخۆ'
                  : gameState.factions[player.factionId as keyof typeof gameState.factions]?.name || 'Independent'}
              </div>
            </div>
          </div>
        </div>

        {/* Center: Dinars, Troops, Food, Time */}
        <div className="flex items-center gap-2 sm:gap-3 pointer-events-auto my-1 sm:my-0">
          {/* Dinars */}
          <div className="bg-stone-900/90 border border-stone-800 rounded-xl px-3 py-1.5 flex items-center gap-2 shadow-lg">
            <Coins className="w-4 h-4 text-yellow-400" />
            <span className="font-bold text-xs text-yellow-300 tabular-nums">
              {player.dinars.toLocaleString()}
            </span>
          </div>

          {/* Troops */}
          <div className="bg-stone-900/90 border border-stone-800 rounded-xl px-3 py-1.5 flex items-center gap-2 shadow-lg">
            <Users className="w-4 h-4 text-purple-400" />
            <span className="font-bold text-xs text-purple-200 tabular-nums">
              {totalTroops}
            </span>
          </div>

          {/* Food */}
          <div className="bg-stone-900/90 border border-stone-800 rounded-xl px-3 py-1.5 flex items-center gap-2 shadow-lg">
            <Wheat className={`w-4 h-4 ${daysFoodLeft < 3 ? 'text-red-400' : 'text-amber-400'}`} />
            <span className={`font-bold text-xs tabular-nums ${daysFoodLeft < 3 ? 'text-red-300' : 'text-stone-300'}`}>
              {daysFoodLeft} {t.day}
            </span>
          </div>

          {/* Day & Time */}
          <div className="bg-stone-900/90 border border-stone-800 rounded-xl px-3 py-1.5 flex items-center gap-2 shadow-lg">
            <Compass className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-xs text-emerald-300 tabular-nums">
              {t.day} {gameState.day} • {Math.floor(gameState.hour)}:00
            </span>
          </div>
        </div>

        {/* Right: Time Speed & Settings */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Speed Controls */}
          <div className="bg-stone-900/90 border border-stone-800 rounded-xl p-1 flex items-center gap-1 shadow-lg">
            <button
              onClick={() => {
                sfx.playClick();
                onChangeSpeed(0);
              }}
              className={`p-1.5 rounded-lg transition ${
                gameState.timeSpeed === 0 ? 'bg-amber-500 text-stone-950 font-bold' : 'text-stone-400 hover:text-stone-200'
              }`}
              title={t.pause}
            >
              <Pause className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => {
                sfx.playClick();
                onChangeSpeed(1);
              }}
              className={`px-2 py-1 rounded-lg text-xs font-bold transition ${
                gameState.timeSpeed === 1 ? 'bg-amber-500 text-stone-950' : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              1x
            </button>

            <button
              onClick={() => {
                sfx.playClick();
                onChangeSpeed(2);
              }}
              className={`px-2 py-1 rounded-lg text-xs font-bold transition ${
                gameState.timeSpeed === 2 ? 'bg-amber-500 text-stone-950' : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              2x
            </button>

            <button
              onClick={() => {
                sfx.playClick();
                onChangeSpeed(5);
              }}
              className={`px-2 py-1 rounded-lg text-xs font-bold transition ${
                gameState.timeSpeed === 5 ? 'bg-amber-500 text-stone-950' : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              5x
            </button>
          </div>

          {/* Save / Settings Button */}
          <button
            onClick={() => {
              sfx.playClick();
              onOpenSaveModal();
            }}
            className="p-2 rounded-xl bg-stone-900/90 hover:bg-stone-800 border border-stone-800 text-amber-300 transition shadow-lg"
            title="سەیڤ و ڕێکخستن"
          >
            <Save className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Landscape Orientation Hint Banner (Shows on small portrait screens) */}
      <div className="block sm:hidden landscape:hidden mx-auto mt-2 pointer-events-auto">
        <div className="bg-amber-950/80 border border-amber-600/70 rounded-full px-3 py-1 flex items-center gap-2 text-[11px] text-amber-200 shadow-xl">
          <RotateCw className="w-3 h-3 text-amber-400 animate-spin" />
          <span>مۆبایلەکەت بخەرە سەر کەلەکە (Landscape)</span>
        </div>
      </div>

      {/* Collapsible Bottom Control Dock */}
      <div className="relative pointer-events-auto flex flex-col items-center pb-3 px-4">
        {/* Toggle Collapse Pill */}
        <button
          onClick={() => {
            sfx.playClick();
            setIsDockCollapsed(!isDockCollapsed);
          }}
          className="mb-1 px-3 py-0.5 rounded-full bg-stone-900/80 border border-stone-800 text-stone-400 hover:text-stone-200 text-[10px] flex items-center gap-1 shadow-lg transition"
        >
          {isDockCollapsed ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          <span>{isDockCollapsed ? 'پیشاندانی مێنۆ' : 'شاردنەوە'}</span>
        </button>

        {!isDockCollapsed && (
          <div className="bg-stone-900/95 border border-stone-800/90 rounded-2xl p-1.5 flex items-center gap-1 sm:gap-2 shadow-2xl max-w-full overflow-x-auto">
            {/* World Map */}
            <button
              onClick={() => {
                sfx.playClick();
                onOpenView('map');
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeView === 'map'
                  ? 'bg-amber-500 text-stone-950 shadow-md'
                  : 'text-stone-300 hover:bg-stone-800/70'
              }`}
            >
              <Map className="w-4 h-4" />
              <span>{t.tabWorld}</span>
            </button>

            {/* City / Castle */}
            {currentSettlementId && (
              <button
                onClick={() => {
                  sfx.playClick();
                  onOpenView('city');
                }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  activeView === 'city'
                    ? 'bg-amber-500 text-stone-950 shadow-md'
                    : 'text-stone-300 hover:bg-stone-800/70'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>{t.tabSettlement}</span>
              </button>
            )}

            {/* Army & Troops */}
            <button
              onClick={() => {
                sfx.playClick();
                onOpenView('party');
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeView === 'party'
                  ? 'bg-amber-500 text-stone-950 shadow-md'
                  : 'text-stone-300 hover:bg-stone-800/70'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>{t.tabMilitary}</span>
            </button>

            {/* Politics & Diplomacy */}
            <button
              onClick={() => {
                sfx.playClick();
                onOpenView('diplomacy');
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeView === 'diplomacy'
                  ? 'bg-amber-500 text-stone-950 shadow-md'
                  : 'text-stone-300 hover:bg-stone-800/70'
              }`}
            >
              <Scale className="w-4 h-4" />
              <span>{t.tabDiplomacy}</span>
            </button>

            {/* News & Spies */}
            <button
              onClick={() => {
                sfx.playClick();
                onOpenView('news');
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeView === 'news'
                  ? 'bg-amber-500 text-stone-950 shadow-md'
                  : 'text-stone-300 hover:bg-stone-800/70'
              }`}
            >
              <Eye className="w-4 h-4 text-amber-400" />
              <span>هەواڵ و سیخوڕی</span>
            </button>

            {/* Chronicles / Log */}
            <button
              onClick={() => {
                sfx.playClick();
                onOpenView('log');
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeView === 'log'
                  ? 'bg-amber-500 text-stone-950 shadow-md'
                  : 'text-stone-300 hover:bg-stone-800/70'
              }`}
            >
              <Scroll className="w-4 h-4" />
              <span>{t.tabLog}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
