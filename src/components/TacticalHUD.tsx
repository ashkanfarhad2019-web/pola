/**
 * Tactical HUD & Unified Navigation Rail
 * Dark iron and antique gold grand strategy interface
 * Inspired by Mount & Blade, Crusader Kings, and Total War
 */
import React, { useState } from 'react';
import { FactionId, GameState, Settlement } from '../types/game';
import { TRANSLATIONS, Language } from '../localization/translations';
import { sfx } from '../audio/soundFx';
import { MapCameraControls } from './WorldMap3D';
import {
  Coins,
  Users,
  Wheat,
  Play,
  Pause,
  FastForward,
  Map,
  Building2,
  Scale,
  Scroll,
  Save,
  ChevronDown,
  ChevronUp,
  Compass,
  Eye,
  Crown,
  Shield,
  Sun,
  Moon,
  Swords,
  Crosshair,
  ZoomIn,
  ZoomOut,
  X,
  Castle,
  Store,
  Beer,
  Footprints,
  Flame
} from 'lucide-react';

interface TacticalHUDProps {
  gameState: GameState;
  lang: Language;
  activeView: 'map' | 'city' | 'party' | 'diplomacy' | 'news' | 'log' | 'siege_camp';
  currentSettlementId: string | null;
  selectedSettlementId?: string | null;
  cameraControls?: MapCameraControls | null;
  onSelectSettlement?: (settlementId: string | null) => void;
  onEnterSettlement?: (settlementId: string) => void;
  onMarchToSettlement?: (settlementId: string) => void;
  onOpenView: (view: 'map' | 'city' | 'party' | 'diplomacy' | 'news' | 'log' | 'siege_camp') => void;
  onOpenSaveModal: () => void;
  onChangeSpeed: (speed: 0 | 1 | 2 | 5) => void;
  onOpenSiegeCamp?: (settlementId: string) => void;
  onStartSiegeCamp?: (settlementId: string) => void;
  onInitiateSiege?: (settlementId: string) => void;
}

export const TacticalHUD: React.FC<TacticalHUDProps> = ({
  gameState,
  lang,
  activeView,
  currentSettlementId,
  selectedSettlementId,
  cameraControls,
  onSelectSettlement,
  onEnterSettlement,
  onMarchToSettlement,
  onOpenView,
  onOpenSaveModal,
  onChangeSpeed,
  onOpenSiegeCamp,
  onStartSiegeCamp,
  onInitiateSiege,
}) => {
  const t = TRANSLATIONS[lang];

  const player = gameState.player;
  const playerParty = gameState.parties['player_party'];
  const totalTroops = player.troops.reduce((a, b) => a + b.count, 0);
  const maxTroops = 30 + Math.floor(player.renown / 2);

  // Compute food consumption & runway
  const grain = player.inventory.grain || 0;
  const meat = player.inventory.meat || 0;
  const totalFoodItems = grain + meat;
  const dailyConsumption = Math.max(1, Math.ceil(totalTroops / 8));
  const daysFoodLeft = Math.floor(totalFoodItems / dailyConsumption);

  // Daily workshop profit
  const workshopProfit = (player.workshops || []).reduce((sum, w) => sum + (w.dailyProfit || 0), 0);

  // Player faction
  const playerFaction = player.factionId !== 'independent'
    ? gameState.factions[player.factionId as FactionId]
    : null;

  // Astronomical cycle
  const currentHour = Math.floor(gameState.hour);
  const isDaytime = currentHour >= 6 && currentHour < 19;

  // Selected settlement details
  const selectedSettlement = selectedSettlementId ? gameState.settlements[selectedSettlementId] : null;
  const isSelectedCity = selectedSettlement?.type === 'town';
  const isSelectedSettlementNear = selectedSettlement && playerParty
    ? Math.hypot(playerParty.x - selectedSettlement.x, playerParty.z - selectedSettlement.z) <= 3.5
    : false;

  const distanceToSelected = selectedSettlement && playerParty
    ? Math.hypot(playerParty.x - selectedSettlement.x, playerParty.z - selectedSettlement.z)
    : 0;

  const isSelectedEnemy = selectedSettlement && playerFaction
    ? (playerFaction.relations[selectedSettlement.factionId] ?? 0) < -25 ||
      playerFaction.treaties?.some(tr => tr.targetFactionId === selectedSettlement.factionId && tr.type === 'war')
    : false;

  const selectedFaction = selectedSettlement ? gameState.factions[selectedSettlement.factionId] : null;
  const selectedLord = selectedSettlement?.lordOwnerId ? gameState.lords[selectedSettlement.lordOwnerId] : null;

  return (
    <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between overflow-hidden">
      {/* =========================================================================
          1. TOP RESOURCE & TIME BAR (Compact Cast-Iron & Antique Gold)
         ========================================================================= */}
      <header className="w-full pointer-events-auto bg-gradient-to-b from-[#0e0d12]/95 via-[#15141b]/90 to-transparent border-b border-amber-600/25 px-2.5 sm:px-5 py-2 flex items-center justify-between shadow-2xl backdrop-blur-[2px]">
        {/* Left: Monarch Dynasty Crest & Title */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-gradient-to-br from-amber-600/40 via-amber-900/60 to-stone-950 border border-amber-400/60 shadow-lg shadow-amber-950/40">
            <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300 drop-shadow" />
            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-stone-900 border border-amber-400/50 flex items-center justify-center text-[8px] font-bold text-amber-300">
              ⚔
            </div>
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 truncate">
              <span className="font-bold text-xs sm:text-sm text-stone-100 font-serif tracking-wide truncate">
                {player.name}
              </span>
              <span className="text-[10px] sm:text-xs text-amber-400 font-semibold px-1.5 py-0.2 rounded bg-amber-950/70 border border-amber-500/30">
                {player.title}
              </span>
            </div>
            <div className="text-[10px] sm:text-[11px] text-stone-400 truncate flex items-center gap-1">
              <Shield className="w-2.5 h-2.5 text-amber-400/80" />
              <span>
                {lang === 'ku'
                  ? playerFaction?.nameKu || 'سەربەخۆ'
                  : playerFaction?.name || 'Independent'}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Logistics & Strategic Resources Cluster */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 max-w-full overflow-x-auto py-0.5">
          {/* Gold Dinars */}
          <div
            className="medieval-panel-subtle rounded-lg px-2.5 py-1 flex items-center gap-1.5 shadow"
            title={`${t.dinars} • ${t.workshopIncome}: +${workshopProfit}/day`}
          >
            <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 shrink-0" />
            <div className="flex items-baseline gap-1">
              <span className="font-bold text-xs sm:text-sm text-amber-300 tabular-nums">
                {player.dinars.toLocaleString()}
              </span>
              {workshopProfit > 0 && (
                <span className="hidden md:inline text-[9px] text-emerald-400 font-semibold">
                  +{workshopProfit}
                </span>
              )}
            </div>
          </div>

          {/* Warband Troops */}
          <div
            className="medieval-panel-subtle rounded-lg px-2.5 py-1 flex items-center gap-1.5 shadow"
            title={`${t.troops} (${totalTroops}/${maxTroops})`}
          >
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-300 shrink-0" />
            <span className="font-bold text-xs sm:text-sm text-indigo-200 tabular-nums">
              {totalTroops}
              <span className="text-stone-400 text-[10px] sm:text-xs">/{maxTroops}</span>
            </span>
          </div>

          {/* Granary Supplies */}
          <div
            className={`medieval-panel-subtle rounded-lg px-2.5 py-1 flex items-center gap-1.5 shadow ${
              daysFoodLeft < 3 ? 'border-red-500/60 bg-red-950/40 text-red-300' : ''
            }`}
            title={`${t.food}: ${totalFoodItems} (${daysFoodLeft} ${t.foodDays})`}
          >
            <Wheat
              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${
                daysFoodLeft < 3 ? 'text-red-400 animate-pulse' : 'text-amber-400'
              }`}
            />
            <span
              className={`font-bold text-xs sm:text-sm tabular-nums ${
                daysFoodLeft < 3 ? 'text-red-300' : 'text-stone-200'
              }`}
            >
              {daysFoodLeft}
              <span className="text-[10px] font-normal text-stone-400 sm:inline hidden"> {t.day}</span>
            </span>
          </div>

          {/* Renown */}
          <div
            className="hidden lg:flex medieval-panel-subtle rounded-lg px-2.5 py-1 items-center gap-1.5 shadow"
            title={t.renown}
          >
            <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="font-bold text-xs sm:text-sm text-stone-200 tabular-nums">
              {player.renown}
            </span>
          </div>
        </div>

        {/* Right: Astronomical Clock, Simulation Controls & Archive */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Date & Hour Astronomical Capsule */}
          <div className="medieval-panel-subtle rounded-lg px-2 sm:px-2.5 py-1 flex items-center gap-1.5 text-xs text-amber-200/90 shadow">
            {isDaytime ? (
              <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
            )}
            <span className="font-bold tabular-nums text-xs">
              {t.day} {gameState.day}
            </span>
            <span className="text-stone-400 text-[10px] hidden sm:inline">
              • {currentHour}:00
            </span>
          </div>

          {/* Segmented Time Speed Controls */}
          <div className="medieval-panel rounded-lg p-0.5 flex items-center gap-0.5 shadow-md">
            {/* Pause */}
            <button
              onClick={() => {
                sfx.playClick();
                onChangeSpeed(0);
              }}
              className={`p-1.5 rounded transition ${
                gameState.timeSpeed === 0
                  ? 'bg-amber-500 text-stone-950 font-bold shadow'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
              title={t.pause}
            >
              <Pause className="w-3.5 h-3.5" />
            </button>

            {/* 1x Speed */}
            <button
              onClick={() => {
                sfx.playClick();
                onChangeSpeed(1);
              }}
              className={`px-1.5 sm:px-2 py-1 rounded text-xs font-bold transition ${
                gameState.timeSpeed === 1
                  ? 'bg-amber-500 text-stone-950 shadow'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              1x
            </button>

            {/* 2x Speed */}
            <button
              onClick={() => {
                sfx.playClick();
                onChangeSpeed(2);
              }}
              className={`px-1.5 sm:px-2 py-1 rounded text-xs font-bold transition ${
                gameState.timeSpeed === 2
                  ? 'bg-amber-500 text-stone-950 shadow'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              2x
            </button>

            {/* 5x Speed */}
            <button
              onClick={() => {
                sfx.playClick();
                onChangeSpeed(5);
              }}
              className={`px-1.5 sm:px-2 py-1 rounded text-xs font-bold transition ${
                gameState.timeSpeed === 5
                  ? 'bg-amber-500 text-stone-950 shadow'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
              title={t.speed5x}
            >
              5x
            </button>
          </div>

          {/* Active Siege Camp Quick Badge */}
          {gameState.player.isBesiegingSettlementId && (
            <button
              onClick={() => {
                sfx.playClick();
                onOpenView('siege_camp');
              }}
              className="medieval-crimson-btn px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 shadow-lg animate-pulse"
              title={t.siegeTitle}
            >
              <Flame className="w-3.5 h-3.5 text-amber-300" />
              <span className="hidden md:inline">{t.siegeTitle}</span>
            </button>
          )}

          {/* Royal Archives / Save & Settings */}
          <button
            onClick={() => {
              sfx.playClick();
              onOpenSaveModal();
            }}
            className="medieval-iron-btn p-2 rounded-lg text-amber-300 shadow"
            title={`${t.settings} / ${t.saveGame}`}
          >
            <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </header>

      {/* =========================================================================
          2. MAIN VIEWPORT: UNIFIED NAVIGATION RAIL & CONTEXTUAL SETTLEMENT DRAWER
         ========================================================================= */}
      <div className="relative flex-1 flex items-stretch justify-between p-2 sm:p-4 pointer-events-none">
        {/* Unified Navigation Rail (Left side on landscape/desktop) */}
        <aside className="pointer-events-auto flex flex-col justify-between self-center sm:self-start gap-2 z-30">
          <div className="medieval-panel rounded-xl p-1 sm:p-1.5 flex flex-col gap-1 shadow-2xl">
            {/* World Map */}
            <button
              onClick={() => {
                sfx.playClick();
                onOpenView('map');
              }}
              className={`group flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-bold transition ${
                activeView === 'map'
                  ? 'medieval-gold-btn'
                  : 'text-stone-300 hover:bg-stone-800/80 hover:text-amber-300'
              }`}
              title={t.tabWorld}
            >
              <Map className="w-4 h-4 shrink-0 text-amber-400 group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline">{t.tabWorld}</span>
            </button>

            {/* Current Settlement / Castle (Active when player is inside or near) */}
            {currentSettlementId && (
              <button
                onClick={() => {
                  sfx.playClick();
                  onOpenView('city');
                }}
                className={`group flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-bold transition ${
                  activeView === 'city'
                    ? 'medieval-gold-btn'
                    : 'text-stone-300 hover:bg-stone-800/80 hover:text-amber-300 border border-amber-500/40'
                }`}
                title={t.tabSettlement}
              >
                <Building2 className="w-4 h-4 shrink-0 text-amber-300 group-hover:scale-110 transition-transform" />
                <span className="hidden sm:inline">{t.tabSettlement}</span>
              </button>
            )}

            {/* Army & Troops */}
            <button
              onClick={() => {
                sfx.playClick();
                onOpenView('party');
              }}
              className={`group flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-bold transition ${
                activeView === 'party'
                  ? 'medieval-gold-btn'
                  : 'text-stone-300 hover:bg-stone-800/80 hover:text-amber-300'
              }`}
              title={t.tabMilitary}
            >
              <Users className="w-4 h-4 shrink-0 text-indigo-300 group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline">{t.tabMilitary}</span>
            </button>

            {/* Sovereign Diplomacy */}
            <button
              onClick={() => {
                sfx.playClick();
                onOpenView('diplomacy');
              }}
              className={`group flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-bold transition ${
                activeView === 'diplomacy'
                  ? 'medieval-gold-btn'
                  : 'text-stone-300 hover:bg-stone-800/80 hover:text-amber-300'
              }`}
              title={t.tabDiplomacy}
            >
              <Scale className="w-4 h-4 shrink-0 text-amber-400 group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline">{t.tabDiplomacy}</span>
            </button>

            {/* News & Intelligence */}
            <button
              onClick={() => {
                sfx.playClick();
                onOpenView('news');
              }}
              className={`group flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-bold transition ${
                activeView === 'news'
                  ? 'medieval-gold-btn'
                  : 'text-stone-300 hover:bg-stone-800/80 hover:text-amber-300'
              }`}
              title="هەواڵ و سیخوڕی (Intelligence)"
            >
              <Eye className="w-4 h-4 shrink-0 text-emerald-400 group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline">{lang === 'ku' ? 'سیخوڕی' : 'Spies'}</span>
            </button>

            {/* World Event Annals */}
            <button
              onClick={() => {
                sfx.playClick();
                onOpenView('log');
              }}
              className={`group flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-bold transition ${
                activeView === 'log'
                  ? 'medieval-gold-btn'
                  : 'text-stone-300 hover:bg-stone-800/80 hover:text-amber-300'
              }`}
              title={t.tabLog}
            >
              <Scroll className="w-4 h-4 shrink-0 text-stone-300 group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline">{t.tabLog}</span>
            </button>

            {/* Divider */}
            <div className="h-px bg-amber-500/20 my-1" />

            {/* Integrated Map Viewport Controls (No duplicates anywhere) */}
            {cameraControls && (
              <div className="flex flex-col gap-1">
                {/* Center Camera on Monarch */}
                <button
                  onClick={() => {
                    sfx.playClick();
                    cameraControls.focusPlayer();
                  }}
                  className={`group flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition ${
                    cameraControls.isFollowing
                      ? 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-300'
                      : 'text-stone-400 hover:bg-stone-800/70 hover:text-stone-200'
                  }`}
                  title={lang === 'ku' ? 'سەر کارەکتەر' : 'Center on Hero'}
                >
                  <Crosshair className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                  <span className="hidden sm:inline">
                    {lang === 'ku' ? 'کارەکتەر' : 'Hero'}
                  </span>
                </button>

                {/* Full Realm Strategic Overview */}
                <button
                  onClick={() => {
                    sfx.playClick();
                    cameraControls.fullOverview();
                  }}
                  className="group flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-stone-400 hover:bg-stone-800/70 hover:text-stone-200 transition"
                  title={lang === 'ku' ? 'تەواوی نەخشە' : 'Realm Overview'}
                >
                  <Map className="w-3.5 h-3.5 shrink-0 text-amber-400/80" />
                  <span className="hidden sm:inline">
                    {lang === 'ku' ? 'تەواوی ماپ' : 'Realm'}
                  </span>
                </button>

                {/* Zoom In & Zoom Out Row */}
                <div className="flex items-center gap-1 justify-center pt-0.5">
                  <button
                    onClick={() => {
                      sfx.playClick();
                      cameraControls.zoomIn();
                    }}
                    className="p-1 rounded bg-stone-900/90 hover:bg-stone-800 text-stone-300 hover:text-amber-300 border border-stone-800 transition"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      sfx.playClick();
                      cameraControls.zoomOut();
                    }}
                    className="p-1 rounded bg-stone-900/90 hover:bg-stone-800 text-stone-300 hover:text-amber-300 border border-stone-800 transition"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Center Canvas Area: Keep completely open for 3D Green Map focus */}
        <div className="flex-1 pointer-events-none" />

        {/* =========================================================================
            3. CONTEXTUAL SETTLEMENT INFORMATION PANEL (Right Side Drawer)
            Shown ONLY when a settlement is selected on the map!
           ========================================================================= */}
        {selectedSettlement && (
          <aside className="pointer-events-auto w-72 sm:w-80 max-w-[85vw] self-start z-30 animate-slide-left">
            <div className="medieval-panel rounded-2xl p-3 sm:p-4 shadow-2xl relative border-amber-500/40">
              {/* Header: Heraldry Banner & Close button */}
              <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-amber-500/25">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-600/30 via-stone-900 to-stone-950 border border-amber-400/50 flex items-center justify-center text-amber-300 shadow">
                    {isSelectedCity ? (
                      <Castle className="w-5 h-5 text-amber-300" />
                    ) : (
                      <Shield className="w-5 h-5 text-stone-300" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm sm:text-base text-stone-100 font-serif leading-tight">
                      {lang === 'ku' ? selectedSettlement.nameKu : selectedSettlement.name}
                    </h3>
                    <div className="text-[11px] text-amber-400/90 flex items-center gap-1">
                      <span>
                        {isSelectedCity
                          ? lang === 'ku'
                            ? 'شارێکی گەورە'
                            : 'Major City'
                          : lang === 'ku'
                          ? 'قەڵایەکی بەهێز'
                          : 'Fortified Castle'}
                      </span>
                      <span>•</span>
                      <span className="text-stone-400">
                        {lang === 'ku' ? selectedFaction?.nameKu : selectedFaction?.name}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Close Inspector */}
                <button
                  onClick={() => {
                    sfx.playClick();
                    onSelectSettlement?.(null);
                  }}
                  className="p-1 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition"
                  title="داخستن"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Lord In Residence */}
              <div className="py-2 text-[11px] text-stone-300 flex items-center justify-between border-b border-stone-800/80">
                <span className="text-stone-400">{lang === 'ku' ? 'سەرداری شار:' : 'Ruler:'}</span>
                <span className="font-semibold text-amber-300">
                  {selectedLord
                    ? (lang === 'ku' ? selectedLord.nameKu : selectedLord.name)
                    : (lang === 'ku' ? 'فەرمانڕەوای نییە' : 'None')}
                </span>
              </div>

              {/* Core Strategic Stats Grid */}
              <div className="grid grid-cols-2 gap-2 my-2.5 text-xs">
                {/* Garrison */}
                <div className="medieval-panel-subtle rounded-lg p-2 flex flex-col">
                  <span className="text-[10px] text-stone-400 flex items-center gap-1">
                    <Shield className="w-3 h-3 text-indigo-400" />
                    {t.garrisonStrength}
                  </span>
                  <span className="font-bold text-stone-100 tabular-nums mt-0.5">
                    {selectedSettlement.garrison.reduce((a, b) => a + b.count, 0)}{' '}
                    <span className="text-[10px] font-normal text-stone-400">{t.troops}</span>
                  </span>
                </div>

                {/* Prosperity */}
                <div className="medieval-panel-subtle rounded-lg p-2 flex flex-col">
                  <span className="text-[10px] text-stone-400 flex items-center gap-1">
                    <Crown className="w-3 h-3 text-amber-400" />
                    {t.prosperity}
                  </span>
                  <span className="font-bold text-amber-300 tabular-nums mt-0.5">
                    {selectedSettlement.prosperity}%
                  </span>
                </div>

                {/* Fortifications */}
                <div className="medieval-panel-subtle rounded-lg p-2 flex flex-col">
                  <span className="text-[10px] text-stone-400 flex items-center gap-1">
                    <Castle className="w-3 h-3 text-stone-300" />
                    {t.defenseLevel}
                  </span>
                  <span className="font-bold text-stone-200 tabular-nums mt-0.5">
                    {selectedSettlement.defenseLevel || 1} / 5
                  </span>
                </div>

                {/* Food reserves */}
                <div className="medieval-panel-subtle rounded-lg p-2 flex flex-col">
                  <span className="text-[10px] text-stone-400 flex items-center gap-1">
                    <Wheat className="w-3 h-3 text-amber-400" />
                    {t.food}
                  </span>
                  <span className="font-bold text-stone-200 tabular-nums mt-0.5">
                    {selectedSettlement.foodReservesDays || 30}{' '}
                    <span className="text-[10px] font-normal text-stone-400">{t.day}</span>
                  </span>
                </div>
              </div>

              {/* Strategic Actions based on distance */}
              <div className="pt-1 flex flex-col gap-1.5">
                {isSelectedSettlementNear ? (
                  <>
                    {/* Enter Settlement (Primary Gold Action) */}
                    <button
                      onClick={() => {
                        sfx.playClick();
                        onEnterSettlement?.(selectedSettlement.id);
                      }}
                      className="medieval-gold-btn w-full py-2 px-3 rounded-xl flex items-center justify-center gap-2 text-xs"
                    >
                      <Building2 className="w-4 h-4 text-stone-950" />
                      <span>{isSelectedCity ? t.enterCity : t.enterCastle}</span>
                    </button>

                    {/* Secondary Quick Access Bar */}
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => {
                          sfx.playClick();
                          onEnterSettlement?.(selectedSettlement.id);
                        }}
                        className="medieval-iron-btn py-1.5 px-2 rounded-lg text-[11px] flex items-center justify-center gap-1.5"
                      >
                        <Store className="w-3.5 h-3.5 text-amber-400" />
                        <span>{t.cityMarket}</span>
                      </button>

                      <button
                        onClick={() => {
                          sfx.playClick();
                          onEnterSettlement?.(selectedSettlement.id);
                        }}
                        className="medieval-iron-btn py-1.5 px-2 rounded-lg text-[11px] flex items-center justify-center gap-1.5"
                      >
                        <Beer className="w-3.5 h-3.5 text-amber-300" />
                        <span>{t.cityTavern}</span>
                      </button>
                    </div>

                    {/* Enemy Siege Option */}
                    {isSelectedEnemy && (
                      <button
                        onClick={() => {
                          sfx.playWarHorn();
                          if (selectedSettlement.siegeCamp) {
                            onOpenSiegeCamp?.(selectedSettlement.id);
                          } else {
                            onStartSiegeCamp?.(selectedSettlement.id);
                          }
                        }}
                        className="medieval-crimson-btn w-full py-2 px-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold mt-1"
                      >
                        <Swords className="w-4 h-4 text-red-200" />
                        <span>
                          {selectedSettlement.siegeCamp
                            ? t.siegeTitle
                            : t.laySiege}
                        </span>
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    {/* Distance & March Action */}
                    <div className="text-[11px] text-stone-400 text-center py-1 flex items-center justify-center gap-1.5">
                      <Footprints className="w-3.5 h-3.5 text-amber-400" />
                      <span>
                        {lang === 'ku'
                          ? `دووری: نزیکەی ${Math.round(distanceToSelected * 10)} فرسەخ`
                          : `Distance: ~${Math.round(distanceToSelected * 10)} leagues`}
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        sfx.playClick();
                        onMarchToSettlement?.(selectedSettlement.id);
                      }}
                      className="medieval-gold-btn w-full py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 text-xs"
                    >
                      <Footprints className="w-4 h-4 text-stone-950" />
                      <span>
                        {lang === 'ku' ? 'بەرەو ئێرە بڕۆ (March)' : 'March Army Here'}
                      </span>
                    </button>

                    {isSelectedEnemy && (
                      <button
                        onClick={() => {
                          sfx.playClick();
                          onMarchToSettlement?.(selectedSettlement.id);
                        }}
                        className="medieval-crimson-btn w-full py-1.5 px-2 rounded-lg text-[11px] flex items-center justify-center gap-1.5 mt-0.5"
                      >
                        <Swords className="w-3.5 h-3.5 text-red-200" />
                        <span>{lang === 'ku' ? 'بڕۆ بۆ گەمارۆدان' : 'March to Besiege'}</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* Subtle Bottom Ambient Gradient */}
      <div className="h-4 bg-gradient-to-t from-stone-950/80 to-transparent pointer-events-none" />
    </div>
  );
};
