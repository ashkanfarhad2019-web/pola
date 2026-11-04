/**
 * Tactical HUD & Grand Medieval Strategy Interface
 * Implements:
 * A. Top Resource & Time Bar (Monarch profile, Dinars, Food, Renown, Soldiers, Date/Time, Speed, Archives)
 * B. Left Vertical Navigation (World Map, Military, Diplomacy, Economy, Espionage, Chronicle)
 * C. Right Contextual Settlement Information Panel (Citadel visual, population, food, prosperity, public order, defense, 3 shortcut buttons)
 * E. Bottom Navigation Dock (World Map, Kingdoms, War, Intelligence, Chronicle)
 * F. Bottom-Left Interactive Real-Time Minimap (Terrain, Settlements, Parties, Camera Viewport, Pan interaction)
 */
import React, { useEffect, useRef, useState } from 'react';
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
  Flame,
  Trophy,
  Landmark,
  ShieldAlert,
  ChevronRight,
  Maximize2
} from 'lucide-react';

interface TacticalHUDProps {
  gameState: GameState;
  lang: Language;
  activeView: 'map' | 'city' | 'party' | 'diplomacy' | 'news' | 'log' | 'siege_camp';
  currentSettlementId: string | null;
  selectedSettlementId?: string | null;
  cameraControls?: MapCameraControls | null;
  onSelectSettlement?: (settlementId: string | null) => void;
  onEnterSettlement?: (
    settlementId: string,
    section?: 'hub' | 'market' | 'tavern' | 'keep' | 'workshops' | 'siege'
  ) => void;
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
  const minimapCanvasRef = useRef<HTMLCanvasElement>(null);

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

  // =========================================================================
  // F. BOTTOM-LEFT MINIMAP (Real-time dynamic canvas rendering)
  // =========================================================================
  useEffect(() => {
    const canvas = minimapCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Coordinate mapping: 0 to 100% of illustrated map
    const toMapX = (worldX: number) => (worldX / 100) * width;
    const toMapY = (worldZ: number) => (worldZ / 100) * height;

    // 1. Clear background parchment tone
    ctx.fillStyle = '#1c160f';
    ctx.fillRect(0, 0, width, height);

    // 2. Map border trim
    ctx.fillStyle = '#261f16';
    ctx.fillRect(1, 1, width - 2, height - 2);

    // 4. Draw Settlements
    Object.values(gameState.settlements).forEach((s) => {
      const sx = toMapX(s.x);
      const sy = toMapY(s.z);
      const f = gameState.factions[s.factionId];
      const color = f?.color || '#94a3b8';

      // Ring
      ctx.beginPath();
      ctx.arc(sx, sy, s.type === 'town' ? 3.5 : 2.5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#1a191e';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Selected settlement reticle
      if (selectedSettlementId === s.id) {
        ctx.beginPath();
        ctx.arc(sx, sy, 6, 0, Math.PI * 2);
        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    });

    // 5. Draw Roaming Parties
    Object.values(gameState.parties).forEach((p) => {
      if (p.id === 'player_party') return;
      const px = toMapX(p.x);
      const py = toMapY(p.z);
      ctx.beginPath();
      ctx.arc(px, py, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = p.type === 'bandit' ? '#ef4444' : p.type === 'caravan' ? '#f59e0b' : '#38bdf8';
      ctx.fill();
    });

    // 6. Draw Player Party
    if (playerParty) {
      const px = toMapX(playerParty.x);
      const py = toMapY(playerParty.z);

      // Pulse glow
      ctx.beginPath();
      ctx.arc(px, py, 5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(212, 175, 55, 0.4)';
      ctx.fill();

      // Core player dot
      ctx.beginPath();
      ctx.arc(px, py, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#fbbf24';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Destination line if marching
      if (playerParty.targetX !== undefined && playerParty.targetZ !== undefined) {
        ctx.setLineDash([2, 2]);
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.6)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(toMapX(playerParty.targetX), toMapY(playerParty.targetZ));
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // 7. Camera Viewport Zone
    const camPos = cameraControls?.getCameraTarget ? cameraControls.getCameraTarget() : playerParty;
    if (camPos) {
      const cx = toMapX(camPos.x);
      const cy = toMapY(camPos.z);
      const viewW = 28;
      const viewH = 20;
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.55)';
      ctx.lineWidth = 1;
      ctx.strokeRect(cx - viewW / 2, cy - viewH / 2, viewW, viewH);
    }
  }, [gameState, selectedSettlementId, cameraControls, playerParty]);

  // Handle Minimap Click / Drag to Pan
  const handleMinimapClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = minimapCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const worldX = (clickX / canvas.width) * 100;
    const worldZ = (clickY / canvas.height) * 100;

    sfx.playClick();
    if (cameraControls?.panTo) {
      cameraControls.panTo(worldX, worldZ);
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between overflow-hidden select-none">
      {/* =========================================================================
          A. TOP RESOURCE BAR (Full-width medieval iron and antique gold frame)
         ========================================================================= */}
      <header className="w-full pointer-events-auto medieval-panel border-b border-amber-600/35 px-2.5 sm:px-5 py-2 flex items-center justify-between shadow-2xl backdrop-blur-sm">
        {/* Left: Game Logo & Kingdom Identity */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="relative flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-amber-700/50 via-stone-900 to-stone-950 border border-amber-400/60 shadow-lg shadow-amber-950/60">
            <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300 drop-shadow" />
            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-stone-900 border border-amber-400/60 flex items-center justify-center text-[8px] font-bold text-amber-300">
              ⚜
            </div>
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 truncate">
              <span className="font-bold text-xs sm:text-sm text-stone-100 font-serif tracking-wider truncate">
                {lang === 'ku' ? 'پۆڵا و دەسەڵات' : 'Steel & Crown'}
              </span>
              <span className="text-[10px] sm:text-xs text-amber-400 font-semibold px-1.5 py-0.2 rounded bg-amber-950/80 border border-amber-500/40">
                {player.name} • {player.title}
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

        {/* Center: Gold, Food, Renown, Soldiers, Date & Time */}
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

          {/* Soldiers / Warband */}
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

          {/* Food Reserves */}
          <div
            className={`medieval-panel-subtle rounded-lg px-2.5 py-1 flex items-center gap-1.5 shadow ${
              daysFoodLeft < 3 ? 'border-red-500/60 bg-red-950/50 text-red-300' : ''
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

          {/* Date & Astronomical Hour */}
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
        </div>

        {/* Right: Simulation Speed & Settings Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Speed Controls Segment */}
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

          {/* Active Siege Camp Badge */}
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

          {/* Settings / Royal Archives */}
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
          MAIN VIEWPORT ROW:
          - B. Left Vertical Navigation
          - C. Central 3D World Map (Dominant Focus)
          - D. Right Contextual Settlement Information Panel
         ========================================================================= */}
      <div className="relative flex-1 flex items-stretch justify-between p-2 sm:p-3 pointer-events-none overflow-hidden">
        {/* =========================================================================
            B. LEFT VERTICAL NAVIGATION
           ========================================================================= */}
        <aside className="pointer-events-auto flex flex-col justify-start gap-2 z-30 self-start">
          <div className="medieval-panel rounded-2xl p-1.5 flex flex-col gap-1 shadow-2xl border-amber-600/35">
            {/* World Map */}
            <button
              onClick={() => {
                sfx.playClick();
                onOpenView('map');
              }}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition ${
                activeView === 'map'
                  ? 'medieval-gold-btn'
                  : 'text-stone-300 hover:bg-stone-800/80 hover:text-amber-300'
              }`}
              title={t.tabWorld}
            >
              <Map className="w-4 h-4 shrink-0 text-amber-400" />
              <span className="hidden sm:inline">{lang === 'ku' ? 'نەخشەی جیهان' : 'World Map'}</span>
            </button>

            {/* Military / Warband */}
            <button
              onClick={() => {
                sfx.playClick();
                onOpenView('party');
              }}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition ${
                activeView === 'party'
                  ? 'medieval-gold-btn'
                  : 'text-stone-300 hover:bg-stone-800/80 hover:text-amber-300'
              }`}
              title={t.tabMilitary}
            >
              <Swords className="w-4 h-4 shrink-0 text-red-400" />
              <span className="hidden sm:inline">{lang === 'ku' ? 'سوپا و چەکدار' : 'Military'}</span>
            </button>

            {/* Diplomacy / Politics */}
            <button
              onClick={() => {
                sfx.playClick();
                onOpenView('diplomacy');
              }}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition ${
                activeView === 'diplomacy'
                  ? 'medieval-gold-btn'
                  : 'text-stone-300 hover:bg-stone-800/80 hover:text-amber-300'
              }`}
              title={t.tabDiplomacy}
            >
              <Scale className="w-4 h-4 shrink-0 text-amber-400" />
              <span className="hidden sm:inline">{lang === 'ku' ? 'سیاسەت و پەیمان' : 'Diplomacy'}</span>
            </button>

            {/* Economy and Trade */}
            <button
              onClick={() => {
                sfx.playClick();
                if (currentSettlementId) {
                  onEnterSettlement?.(currentSettlementId, 'market');
                } else {
                  onOpenView('party');
                }
              }}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-stone-300 hover:bg-stone-800/80 hover:text-amber-300 transition"
              title={t.tabTrade}
            >
              <Store className="w-4 h-4 shrink-0 text-yellow-400" />
              <span className="hidden sm:inline">{lang === 'ku' ? 'بازرگانی و سەودا' : 'Economy'}</span>
            </button>

            {/* Espionage / Spies */}
            <button
              onClick={() => {
                sfx.playClick();
                onOpenView('news');
              }}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition ${
                activeView === 'news'
                  ? 'medieval-gold-btn'
                  : 'text-stone-300 hover:bg-stone-800/80 hover:text-amber-300'
              }`}
              title="سیخوڕی و زانیاری"
            >
              <Eye className="w-4 h-4 shrink-0 text-emerald-400" />
              <span className="hidden sm:inline">{lang === 'ku' ? 'سیخوڕی' : 'Espionage'}</span>
            </button>

            {/* Chronicle and News */}
            <button
              onClick={() => {
                sfx.playClick();
                onOpenView('log');
              }}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition ${
                activeView === 'log'
                  ? 'medieval-gold-btn'
                  : 'text-stone-300 hover:bg-stone-800/80 hover:text-amber-300'
              }`}
              title={t.tabLog}
            >
              <Scroll className="w-4 h-4 shrink-0 text-stone-300" />
              <span className="hidden sm:inline">{lang === 'ku' ? 'هەواڵ و مێژوو' : 'Chronicle'}</span>
            </button>
          </div>
        </aside>

        {/* Central Map Spacer: Keeps 3D Three.js Map fully interactive */}
        <div className="flex-1 pointer-events-none" />

        {/* =========================================================================
            D. RIGHT SETTLEMENT INFORMATION PANEL
            (Shown ONLY when a city or castle is selected on the map!)
           ========================================================================= */}
        {selectedSettlement && (
          <aside className="pointer-events-auto w-76 sm:w-84 max-w-[85vw] self-start z-30 animate-slide-left">
            <div className="medieval-panel rounded-2xl p-3 sm:p-4 shadow-2xl relative border-amber-500/40">
              {/* Close Button */}
              <button
                onClick={() => {
                  sfx.playClick();
                  onSelectSettlement?.(null);
                }}
                className="absolute top-3 right-3 p-1 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition z-10"
                title="داخستن"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Settlement Visual Artwork Banner */}
              <div className="relative w-full h-24 sm:h-28 rounded-xl overflow-hidden mb-2.5 border border-amber-600/30 bg-gradient-to-b from-[#1c1c24] to-[#0d0d12] flex items-center justify-center">
                {/* Stylized Medieval Citadel SVG Art */}
                <svg className="w-full h-full object-cover opacity-80" viewBox="0 0 200 100" preserveAspectRatio="none">
                  {/* Sky gradient background */}
                  <defs>
                    <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#2c2738" />
                      <stop offset="100%" stopColor="#141318" />
                    </linearGradient>
                    <linearGradient id="wallGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#45424e" />
                      <stop offset="100%" stopColor="#232128" />
                    </linearGradient>
                  </defs>
                  <rect width="200" height="100" fill="url(#skyGrad)" />
                  {/* Distant mountains */}
                  <polygon points="0,70 35,40 70,70 110,35 150,70 185,45 200,60 200,100 0,100" fill="#1e1c26" />
                  {/* Castle Fortress Silhouette */}
                  <rect x="25" y="45" width="22" height="55" fill="url(#wallGrad)" />
                  <rect x="153" y="45" width="22" height="55" fill="url(#wallGrad)" />
                  <rect x="47" y="55" width="106" height="45" fill="url(#wallGrad)" />
                  {/* Battlements / Crenellations */}
                  <rect x="23" y="40" width="6" height="6" fill="#524e5d" />
                  <rect x="33" y="40" width="6" height="6" fill="#524e5d" />
                  <rect x="43" y="40" width="6" height="6" fill="#524e5d" />
                  <rect x="151" y="40" width="6" height="6" fill="#524e5d" />
                  <rect x="161" y="40" width="6" height="6" fill="#524e5d" />
                  <rect x="171" y="40" width="6" height="6" fill="#524e5d" />
                  {/* Center Keep & Spire */}
                  <polygon points="100,20 85,55 115,55" fill="#524e5d" />
                  <rect x="90" y="55" width="20" height="45" fill="#32303a" />
                  {/* Citadel Gate */}
                  <path d="M 94,100 L 94,80 A 6,6 0 0 1 106,80 L 106,100 Z" fill="#121116" />
                  {/* Heraldic Flying Pennant */}
                  <polygon
                    points="100,20 100,28 118,24"
                    fill={selectedFaction?.color || '#d4af37'}
                  />
                </svg>

                {/* Overlay Badge with Faction Emblem */}
                <div className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-stone-950/85 border border-amber-500/40">
                  <div
                    className="w-3 h-3 rounded-full border border-white/60"
                    style={{ backgroundColor: selectedFaction?.color || '#d4af37' }}
                  />
                  <span className="text-[10px] font-bold text-amber-200">
                    {lang === 'ku' ? selectedFaction?.nameKu : selectedFaction?.name}
                  </span>
                </div>
              </div>

              {/* Settlement Name & Ruler */}
              <div className="pb-2 border-b border-amber-500/25">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-stone-100 font-serif leading-tight">
                    {lang === 'ku' ? selectedSettlement.nameKu : selectedSettlement.name}
                  </h3>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950/70 text-amber-300 border border-amber-500/30">
                    {isSelectedCity
                      ? lang === 'ku'
                        ? 'شار'
                        : 'City'
                      : lang === 'ku'
                      ? 'قەڵا'
                      : 'Castle'}
                  </span>
                </div>
                <div className="text-[11px] text-stone-300 mt-1 flex items-center justify-between">
                  <span className="text-stone-400">{lang === 'ku' ? 'فەرمانڕەوا:' : 'Ruler:'}</span>
                  <span className="font-semibold text-amber-300">
                    {selectedLord
                      ? lang === 'ku'
                        ? selectedLord.nameKu
                        : selectedLord.name
                      : lang === 'ku'
                      ? 'فەرمانڕەوای نییە'
                      : 'None'}
                  </span>
                </div>
              </div>

              {/* Required Settlement Metrics (Actual game state) */}
              <div className="grid grid-cols-2 gap-1.5 my-2.5 text-xs">
                {/* Population */}
                <div className="medieval-panel-subtle rounded-lg p-1.5 flex flex-col">
                  <span className="text-[10px] text-stone-400 flex items-center gap-1">
                    <Users className="w-3 h-3 text-sky-400" />
                    {lang === 'ku' ? 'دانیشتووان' : 'Population'}
                  </span>
                  <span className="font-bold text-stone-100 tabular-nums mt-0.5">
                    {selectedSettlement.population.toLocaleString()}
                  </span>
                </div>

                {/* Food Reserves */}
                <div className="medieval-panel-subtle rounded-lg p-1.5 flex flex-col">
                  <span className="text-[10px] text-stone-400 flex items-center gap-1">
                    <Wheat className="w-3 h-3 text-amber-400" />
                    {lang === 'ku' ? 'خۆراکی کۆگا' : 'Food Stock'}
                  </span>
                  <span className="font-bold text-stone-100 tabular-nums mt-0.5">
                    {selectedSettlement.foodReservesDays}{' '}
                    <span className="text-[10px] font-normal text-stone-400">{t.day}</span>
                  </span>
                </div>

                {/* Prosperity */}
                <div className="medieval-panel-subtle rounded-lg p-1.5 flex flex-col">
                  <span className="text-[10px] text-stone-400 flex items-center gap-1">
                    <Crown className="w-3 h-3 text-amber-400" />
                    {lang === 'ku' ? 'ئاوەدانی' : 'Prosperity'}
                  </span>
                  <span className="font-bold text-amber-300 tabular-nums mt-0.5">
                    {selectedSettlement.prosperity}%
                  </span>
                </div>

                {/* Public Order */}
                <div className="medieval-panel-subtle rounded-lg p-1.5 flex flex-col">
                  <span className="text-[10px] text-stone-400 flex items-center gap-1">
                    <Scale className="w-3 h-3 text-emerald-400" />
                    {lang === 'ku' ? 'ڕەزامەندی خەڵک' : 'Public Order'}
                  </span>
                  <span className="font-bold text-emerald-300 tabular-nums mt-0.5">
                    {selectedSettlement.publicOrder}%
                  </span>
                </div>

                {/* Defense Level */}
                <div className="medieval-panel-subtle rounded-lg p-1.5 flex flex-col">
                  <span className="text-[10px] text-stone-400 flex items-center gap-1">
                    <Shield className="w-3 h-3 text-stone-300" />
                    {lang === 'ku' ? 'قایمی شوورا' : 'Defense Level'}
                  </span>
                  <span className="font-bold text-stone-200 tabular-nums mt-0.5">
                    {selectedSettlement.defenseLevel || 1} / 5
                  </span>
                </div>

                {/* Garrison */}
                <div className="medieval-panel-subtle rounded-lg p-1.5 flex flex-col">
                  <span className="text-[10px] text-stone-400 flex items-center gap-1">
                    <Swords className="w-3 h-3 text-red-400" />
                    {lang === 'ku' ? 'پاسەوانان' : 'Garrison'}
                  </span>
                  <span className="font-bold text-stone-100 tabular-nums mt-0.5">
                    {selectedSettlement.garrison.reduce((a, b) => a + b.count, 0)} {t.troops}
                  </span>
                </div>
              </div>

              {/* Three Mandatory Shortcut Buttons */}
              <div className="grid grid-cols-3 gap-1.5 my-2">
                {/* City Management Button */}
                <button
                  onClick={() => {
                    sfx.playClick();
                    onEnterSettlement?.(selectedSettlement.id, 'keep');
                  }}
                  className="medieval-iron-btn py-1.5 px-1 rounded-lg text-[10px] sm:text-[11px] font-bold flex flex-col items-center justify-center gap-1"
                  title="بەڕێوەبردنی شار"
                >
                  <Castle className="w-3.5 h-3.5 text-amber-400" />
                  <span className="truncate w-full text-center">
                    {lang === 'ku' ? 'بەڕێوەبردن' : 'Manage'}
                  </span>
                </button>

                {/* Market Button */}
                <button
                  onClick={() => {
                    sfx.playClick();
                    onEnterSettlement?.(selectedSettlement.id, 'market');
                  }}
                  className="medieval-iron-btn py-1.5 px-1 rounded-lg text-[10px] sm:text-[11px] font-bold flex flex-col items-center justify-center gap-1"
                  title="بازاڕی کەلوپەل"
                >
                  <Store className="w-3.5 h-3.5 text-amber-300" />
                  <span className="truncate w-full text-center">
                    {lang === 'ku' ? 'بازاڕ' : 'Market'}
                  </span>
                </button>

                {/* Garrison Button */}
                <button
                  onClick={() => {
                    sfx.playClick();
                    onEnterSettlement?.(selectedSettlement.id, 'keep');
                  }}
                  className="medieval-iron-btn py-1.5 px-1 rounded-lg text-[10px] sm:text-[11px] font-bold flex flex-col items-center justify-center gap-1"
                  title="پاسەوانانی قەڵا"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-indigo-300" />
                  <span className="truncate w-full text-center">
                    {lang === 'ku' ? 'پاسەوان' : 'Garrison'}
                  </span>
                </button>
              </div>

              {/* Proximity Strategic Actions */}
              <div className="pt-1 flex flex-col gap-1.5">
                {isSelectedSettlementNear ? (
                  <>
                    <button
                      onClick={() => {
                        sfx.playClick();
                        onEnterSettlement?.(selectedSettlement.id, 'hub');
                      }}
                      className="medieval-gold-btn w-full py-2 px-3 rounded-xl flex items-center justify-center gap-2 text-xs"
                    >
                      <Building2 className="w-4 h-4 text-stone-950" />
                      <span>{isSelectedCity ? t.enterCity : t.enterCastle}</span>
                    </button>

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
                        className="medieval-crimson-btn w-full py-2 px-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold"
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
                    <div className="text-[11px] text-stone-400 text-center py-0.5 flex items-center justify-center gap-1.5">
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
                      className="medieval-gold-btn w-full py-2 px-3 rounded-xl flex items-center justify-center gap-2 text-xs"
                    >
                      <Footprints className="w-4 h-4 text-stone-950" />
                      <span>{lang === 'ku' ? 'بەرەو ئێرە بڕۆ (March)' : 'March Army Here'}</span>
                    </button>

                    {isSelectedEnemy && (
                      <button
                        onClick={() => {
                          sfx.playClick();
                          onMarchToSettlement?.(selectedSettlement.id);
                        }}
                        className="medieval-crimson-btn w-full py-1.5 px-2 rounded-lg text-[11px] flex items-center justify-center gap-1.5"
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

      {/* =========================================================================
          BOTTOM REGION:
          - F. Bottom-Left Interactive Minimap
          - E. Bottom Navigation Dock
         ========================================================================= */}
      <footer className="w-full pointer-events-none px-2 sm:px-4 pb-2.5 flex items-end justify-between z-30">
        {/* =========================================================================
            F. BOTTOM-LEFT MINIMAP (Representing real Three.js map & camera position)
           ========================================================================= */}
        <div className="pointer-events-auto medieval-panel rounded-2xl p-1.5 shadow-2xl border-amber-600/40 flex flex-col gap-1 w-36 sm:w-44">
          {/* Header & Controls bar */}
          <div className="flex items-center justify-between px-1 text-[10px] text-amber-300/90 font-serif font-bold border-b border-amber-500/20 pb-0.5">
            <span className="flex items-center gap-1">
              <Compass className="w-3 h-3 text-amber-400" />
              {lang === 'ku' ? 'نەخشەی نەخش' : 'Minimap'}
            </span>
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => {
                  sfx.playClick();
                  cameraControls?.focusPlayer();
                }}
                className="p-0.5 hover:text-white rounded"
                title="سەر کارەکتەر"
              >
                <Crosshair className="w-3 h-3" />
              </button>
              <button
                onClick={() => {
                  sfx.playClick();
                  cameraControls?.zoomIn();
                }}
                className="p-0.5 hover:text-white rounded"
                title="Zoom In"
              >
                <ZoomIn className="w-3 h-3" />
              </button>
              <button
                onClick={() => {
                  sfx.playClick();
                  cameraControls?.zoomOut();
                }}
                className="p-0.5 hover:text-white rounded"
                title="Zoom Out"
              >
                <ZoomOut className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Canvas Minimap Surface */}
          <div className="relative w-full h-24 sm:h-28 rounded-lg overflow-hidden border border-amber-600/25 bg-stone-950 cursor-crosshair">
            <canvas
              ref={minimapCanvasRef}
              width={160}
              height={110}
              onClick={handleMinimapClick}
              className="w-full h-full block"
              title="کلیک بکە بۆ جوڵاندنی کامێرا"
            />
            {/* Cardinal points */}
            <span className="absolute top-0.5 left-1/2 -translate-x-1/2 text-[8px] font-bold text-amber-400/80 pointer-events-none">
              N
            </span>
            <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[8px] font-bold text-amber-400/80 pointer-events-none">
              S
            </span>
            <span className="absolute left-0.5 top-1/2 -translate-y-1/2 text-[8px] font-bold text-amber-400/80 pointer-events-none">
              W
            </span>
            <span className="absolute right-0.5 top-1/2 -translate-y-1/2 text-[8px] font-bold text-amber-400/80 pointer-events-none">
              E
            </span>
          </div>
        </div>

        {/* =========================================================================
            E. BOTTOM NAVIGATION DOCK (Matching IMAGE 1 Structure)
           ========================================================================= */}
        <nav className="pointer-events-auto medieval-panel rounded-2xl p-1.5 flex items-center gap-1 sm:gap-2 shadow-2xl border-amber-600/40 mx-auto">
          {/* 1. World Map */}
          <button
            onClick={() => {
              sfx.playClick();
              onOpenView('map');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-bold transition ${
              activeView === 'map'
                ? 'medieval-gold-btn'
                : 'text-stone-300 hover:bg-stone-800/80 hover:text-amber-300'
            }`}
            title={t.tabWorld}
          >
            <Map className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">{lang === 'ku' ? 'نەخشەی جیهان' : 'World Map'}</span>
          </button>

          {/* 2. Kingdoms */}
          <button
            onClick={() => {
              sfx.playClick();
              onOpenView('diplomacy');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-bold transition ${
              activeView === 'diplomacy'
                ? 'medieval-gold-btn'
                : 'text-stone-300 hover:bg-stone-800/80 hover:text-amber-300'
            }`}
            title={t.tabDiplomacy}
          >
            <Crown className="w-4 h-4 text-amber-300" />
            <span className="hidden sm:inline">{lang === 'ku' ? 'شانشینەکان' : 'Kingdoms'}</span>
          </button>

          {/* 3. War */}
          <button
            onClick={() => {
              sfx.playClick();
              if (gameState.player.isBesiegingSettlementId) {
                onOpenView('siege_camp');
              } else {
                onOpenView('party');
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-bold transition ${
              activeView === 'party' || activeView === 'siege_camp'
                ? 'medieval-gold-btn'
                : 'text-stone-300 hover:bg-stone-800/80 hover:text-amber-300'
            }`}
            title="شەڕ و سوپا"
          >
            <Swords className="w-4 h-4 text-red-400" />
            <span className="hidden sm:inline">{lang === 'ku' ? 'شەڕ و سوپا' : 'War'}</span>
          </button>

          {/* 4. Intelligence and Events */}
          <button
            onClick={() => {
              sfx.playClick();
              onOpenView('news');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-bold transition ${
              activeView === 'news'
                ? 'medieval-gold-btn'
                : 'text-stone-300 hover:bg-stone-800/80 hover:text-amber-300'
            }`}
            title="سیخوڕی و هەواڵەکان"
          >
            <Eye className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">{lang === 'ku' ? 'سیخوڕی و هەواڵ' : 'Intelligence'}</span>
          </button>

          {/* 5. Achievements / Chronicle */}
          <button
            onClick={() => {
              sfx.playClick();
              onOpenView('log');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-bold transition ${
              activeView === 'log'
                ? 'medieval-gold-btn'
                : 'text-stone-300 hover:bg-stone-800/80 hover:text-amber-300'
            }`}
            title={t.tabLog}
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">{lang === 'ku' ? 'مێژوو و سەرکەوتن' : 'Chronicle'}</span>
          </button>
        </nav>

        {/* Empty placeholder on the right of footer to maintain center alignment of dock */}
        <div className="w-36 sm:w-44 pointer-events-none" />
      </footer>
    </div>
  );
};
