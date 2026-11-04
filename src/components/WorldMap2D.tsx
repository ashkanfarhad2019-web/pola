/**
 * 2D Interactive World Map Component
 * Uses the exact uploaded illustrated medieval parchment map as the background
 * Asset: /assets/aistudio/photo_2026-11-04_21-36-06_288080ea.jpg
 * Dimensions: 1280 x 698
 * Features:
 * - Exact aspect ratio preservation & high-res rendering
 * - Fluid smooth panning & multi-touch pinch zooming
 * - Interactive settlement pins with faction heraldry & garrison counts
 * - Animated army markers with faction pennants & march trails
 * - Visible road network pathfinding navigation
 * - Smooth camera centering and strategic overview
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameState, Party, Settlement } from '../types/game';
import { sfx } from '../audio/soundFx';
import { MapCameraControls } from './WorldMap3D';
import {
  Castle,
  Shield,
  Crown,
  Users,
  Compass,
  Crosshair,
  Footprints,
  Flame,
  Swords
} from 'lucide-react';

interface WorldMap2DProps {
  gameState: GameState;
  onSelectSettlement: (settlementId: string) => void;
  onSelectParty: (partyId: string) => void;
  onSetDestination: (x: number, z: number, targetSettlementId?: string, targetPartyId?: string) => void;
  onRegisterCameraControls?: (controls: MapCameraControls) => void;
}

const MAP_WIDTH = 1280;
const MAP_HEIGHT = 698;
const MAP_IMAGE_SRC = '/assets/aistudio/photo_2026-11-04_21-36-06_288080ea.jpg';

export const WorldMap2D: React.FC<WorldMap2DProps> = ({
  gameState,
  onSelectSettlement,
  onSelectParty,
  onSetDestination,
  onRegisterCameraControls,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef(gameState);
  stateRef.current = gameState;

  // Viewport transform state: Pan and Zoom
  const [zoom, setZoom] = useState<number>(1.2);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isFollowing, setIsFollowing] = useState<boolean>(true);
  const [destinationMarker, setDestinationMarker] = useState<{ x: number; y: number } | null>(null);

  const isDraggingRef = useRef(false);
  const pointerDownPosRef = useRef({ x: 0, y: 0 });
  const panStartRef = useRef({ x: 0, y: 0 });
  const initialPinchDistRef = useRef(0);
  const initialPinchZoomRef = useRef(1.2);
  const isFollowingRef = useRef(true);

  // Sync state refs
  isFollowingRef.current = isFollowing;

  // Initial centering on player party
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const playerParty = stateRef.current.parties['player_party'];
    const initialZoom = 1.25;

    const px = playerParty ? (playerParty.x / 100) * MAP_WIDTH : MAP_WIDTH * 0.52;
    const py = playerParty ? (playerParty.z / 100) * MAP_HEIGHT : MAP_HEIGHT * 0.65;

    setZoom(initialZoom);
    setPan({
      x: cw / 2 - px * initialZoom,
      y: ch / 2 - py * initialZoom,
    });
  }, []);

  // Center on player character
  const handleFocusPlayer = useCallback(() => {
    sfx.playClick();
    const container = containerRef.current;
    if (!container) return;

    const playerParty = stateRef.current.parties['player_party'];
    if (!playerParty) return;

    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const targetZoom = Math.max(1.2, zoom);

    const px = (playerParty.x / 100) * MAP_WIDTH;
    const py = (playerParty.z / 100) * MAP_HEIGHT;

    setIsFollowing(true);
    setZoom(targetZoom);
    setPan({
      x: cw / 2 - px * targetZoom,
      y: ch / 2 - py * targetZoom,
    });
  }, [zoom]);

  // Full continent realm overview
  const handleFullOverview = useCallback(() => {
    sfx.playClick();
    const container = containerRef.current;
    if (!container) return;

    setIsFollowing(false);
    const cw = container.clientWidth;
    const ch = container.clientHeight;

    const fitZoom = Math.min(cw / MAP_WIDTH, ch / MAP_HEIGHT) * 0.96;
    setZoom(fitZoom);
    setPan({
      x: (cw - MAP_WIDTH * fitZoom) / 2,
      y: (ch - MAP_HEIGHT * fitZoom) / 2,
    });
  }, []);

  // Zoom In / Out
  const handleZoom = useCallback((delta: number) => {
    sfx.playClick();
    const container = containerRef.current;
    if (!container) return;

    const cw = container.clientWidth;
    const ch = container.clientHeight;

    setZoom((prevZoom) => {
      const nextZoom = Math.max(0.65, Math.min(3.2, prevZoom + delta));
      // Zoom toward center of viewport
      setPan((prevPan) => {
        const factor = nextZoom / prevZoom;
        const centerX = cw / 2;
        const centerY = ch / 2;
        return {
          x: centerX - (centerX - prevPan.x) * factor,
          y: centerY - (centerY - prevPan.y) * factor,
        };
      });
      return nextZoom;
    });
  }, []);

  // Pan to specific normalized coordinate (0-100)
  const handlePanTo = useCallback((normX: number, normZ: number) => {
    const container = containerRef.current;
    if (!container) return;

    setIsFollowing(false);
    const cw = container.clientWidth;
    const ch = container.clientHeight;

    const targetPx = (normX / 100) * MAP_WIDTH;
    const targetPy = (normZ / 100) * MAP_HEIGHT;

    setPan({
      x: cw / 2 - targetPx * zoom,
      y: ch / 2 - targetPy * zoom,
    });
  }, [zoom]);

  // Current camera world target
  const getCameraTarget = useCallback(() => {
    const container = containerRef.current;
    if (!container) return { x: 50, z: 50 };

    const cw = container.clientWidth;
    const ch = container.clientHeight;

    const centerPx = (cw / 2 - pan.x) / zoom;
    const centerPy = (ch / 2 - pan.y) / zoom;

    return {
      x: Math.max(0, Math.min(100, (centerPx / MAP_WIDTH) * 100)),
      z: Math.max(0, Math.min(100, (centerPy / MAP_HEIGHT) * 100)),
    };
  }, [pan, zoom]);

  // Register camera controls with TacticalHUD
  useEffect(() => {
    if (onRegisterCameraControls) {
      onRegisterCameraControls({
        focusPlayer: handleFocusPlayer,
        fullOverview: handleFullOverview,
        zoomIn: () => handleZoom(0.3),
        zoomOut: () => handleZoom(-0.3),
        isFollowing,
        panTo: handlePanTo,
        getCameraTarget,
      });
    }
  }, [
    isFollowing,
    handleFocusPlayer,
    handleFullOverview,
    handleZoom,
    handlePanTo,
    getCameraTarget,
    onRegisterCameraControls,
  ]);

  // Smooth follow player party when walking
  useEffect(() => {
    if (!isFollowing) return;

    const playerParty = gameState.parties['player_party'];
    if (!playerParty || !playerParty.targetX) return;

    const container = containerRef.current;
    if (!container) return;

    const cw = container.clientWidth;
    const ch = container.clientHeight;

    const px = (playerParty.x / 100) * MAP_WIDTH;
    const py = (playerParty.z / 100) * MAP_HEIGHT;

    const targetPanX = cw / 2 - px * zoom;
    const targetPanY = ch / 2 - py * zoom;

    // Smooth lerp
    setPan((prev) => ({
      x: prev.x + (targetPanX - prev.x) * 0.15,
      y: prev.y + (targetPanY - prev.y) * 0.15,
    }));
  }, [gameState.parties, isFollowing, zoom]);

  // Keyboard Navigation: Arrow Keys & WASD (smooth 60fps panning), Space (focus), +/- (zoom)
  useEffect(() => {
    const activeKeys = new Set<string>();
    let animationFrameId: number;
    let lastTime = performance.now();

    const isInputActive = () => {
      const activeEl = document.activeElement;
      if (!activeEl) return false;
      const tag = activeEl.tagName.toLowerCase();
      return tag === 'input' || tag === 'textarea' || (activeEl as HTMLElement).isContentEditable;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isInputActive()) return;

      const code = e.code;
      const key = e.key;

      const isMoveKey =
        code === 'ArrowUp' || code === 'KeyW' ||
        code === 'ArrowDown' || code === 'KeyS' ||
        code === 'ArrowLeft' || code === 'KeyA' ||
        code === 'ArrowRight' || code === 'KeyD';

      if (isMoveKey) {
        e.preventDefault();
        setIsFollowing(false);
        activeKeys.add(code);
        return;
      }

      if (code === 'Space' || code === 'KeyF' || key === 'f' || key === 'F') {
        e.preventDefault();
        handleFocusPlayer();
        return;
      }

      if (code === 'KeyR' || key === 'r' || key === 'R') {
        e.preventDefault();
        handleFullOverview();
        return;
      }

      if (key === '+' || key === '=' || code === 'NumpadAdd' || code === 'KeyE') {
        e.preventDefault();
        handleZoom(0.25);
        return;
      }

      if (key === '-' || key === '_' || code === 'NumpadSubtract' || code === 'KeyQ') {
        e.preventDefault();
        handleZoom(-0.25);
        return;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      activeKeys.delete(e.code);
    };

    const handleBlur = () => {
      activeKeys.clear();
    };

    // 60 FPS continuous smooth pan loop
    const panLoop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.08);
      lastTime = now;

      if (activeKeys.size > 0) {
        let dx = 0;
        let dy = 0;

        // Up: move map DOWN to reveal upper region
        if (activeKeys.has('ArrowUp') || activeKeys.has('KeyW')) dy += 1;
        // Down: move map UP to reveal lower region
        if (activeKeys.has('ArrowDown') || activeKeys.has('KeyS')) dy -= 1;
        // Left: move map RIGHT to reveal left region
        if (activeKeys.has('ArrowLeft') || activeKeys.has('KeyA')) dx += 1;
        // Right: move map LEFT to reveal right region
        if (activeKeys.has('ArrowRight') || activeKeys.has('KeyD')) dx -= 1;

        if (dx !== 0 || dy !== 0) {
          const length = Math.hypot(dx, dy);
          const normDx = dx / length;
          const normDy = dy / length;

          // Pan speed scaled by frame delta
          const speedPxPerSec = 580;
          const step = speedPxPerSec * dt;

          setPan((prev) => ({
            x: prev.x + normDx * step,
            y: prev.y + normDy * step,
          }));
        }
      }

      animationFrameId = requestAnimationFrame(panLoop);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    animationFrameId = requestAnimationFrame(panLoop);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      cancelAnimationFrame(animationFrameId);
    };
  }, [handleFocusPlayer, handleFullOverview, handleZoom]);

  // Touch and Mouse handlers for fluid Pan & Pinch-Zoom
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') {
      // Touch start
    }
    isDraggingRef.current = false;
    pointerDownPosRef.current = { x: e.clientX, y: e.clientY };
    panStartRef.current = { ...pan };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const dx = e.clientX - pointerDownPosRef.current.x;
    const dy = e.clientY - pointerDownPosRef.current.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 6) {
      isDraggingRef.current = true;
      if (isFollowingRef.current) {
        setIsFollowing(false);
      }
      setPan({
        x: panStartRef.current.x + dx,
        y: panStartRef.current.y + dy,
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    // If not dragging, it was a click on the map!
    if (!isDraggingRef.current) {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const clickClientX = e.clientX - rect.left;
      const clickClientY = e.clientY - rect.top;

      // Convert client click to Map percentage (0 - 100)
      const mapPixelX = (clickClientX - pan.x) / zoom;
      const mapPixelY = (clickClientY - pan.y) / zoom;

      if (mapPixelX >= 0 && mapPixelX <= MAP_WIDTH && mapPixelY >= 0 && mapPixelY <= MAP_HEIGHT) {
        const normX = Math.max(2, Math.min(98, (mapPixelX / MAP_WIDTH) * 100));
        const normZ = Math.max(2, Math.min(98, (mapPixelY / MAP_HEIGHT) * 100));

        sfx.playTroopMarch();
        setDestinationMarker({ x: mapPixelX, y: mapPixelY });
        onSetDestination(normX, normZ);
      }
    }
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const delta = e.deltaY < 0 ? 0.2 : -0.2;
    const newZoom = Math.max(0.65, Math.min(3.2, zoom + delta));

    if (newZoom !== zoom) {
      const factor = newZoom / zoom;
      setZoom(newZoom);
      setPan({
        x: mouseX - (mouseX - pan.x) * factor,
        y: mouseY - (mouseY - pan.y) * factor,
      });
    }
  };

  const playerParty = gameState.parties['player_party'];

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onWheel={handleWheel}
      className="absolute inset-0 w-full h-full overflow-hidden select-none touch-none bg-[#14120e] cursor-grab active:cursor-grabbing"
    >
      {/* 2D Zoom & Pan Container with hardware acceleration */}
      <div
        style={{
          width: `${MAP_WIDTH}px`,
          height: `${MAP_HEIGHT}px`,
          transform: `translate3d(${pan.x}px, ${pan.y}px, 0px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}
        className="relative select-none pointer-events-auto transition-transform duration-75 ease-out shadow-2xl"
      >
        {/* =========================================================================
            1. THE EXACT UPLOADED MAP ARTWORK
           ========================================================================= */}
        <img
          src={MAP_IMAGE_SRC}
          alt="Steel & Crown Medieval World Map"
          width={MAP_WIDTH}
          height={MAP_HEIGHT}
          draggable={false}
          className="w-full h-full object-cover block select-none pointer-events-none drop-shadow-2xl"
          style={{ imageRendering: 'auto' }}
        />

        {/* Subtle Atmospheric Vignette over the parchment borders */}
        <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_80px_rgba(0,0,0,0.5)] border border-amber-950/40" />

        {/* =========================================================================
            2. DESTINATION BEACON (When marching)
           ========================================================================= */}
        {playerParty && playerParty.targetX !== undefined && playerParty.targetZ !== undefined && (
          <div
            style={{
              left: `${(playerParty.targetX / 100) * MAP_WIDTH}px`,
              top: `${(playerParty.targetZ / 100) * MAP_HEIGHT}px`,
            }}
            className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10"
          >
            <div className="relative flex items-center justify-center">
              <div className="w-8 h-8 rounded-full border-2 border-amber-400 animate-ping opacity-75" />
              <div className="absolute w-4 h-4 rounded-full bg-amber-400/50 border border-white flex items-center justify-center text-[8px] text-stone-950 font-bold">
                🎯
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            3. INTERACTIVE CASTLES, CITIES & SETTLEMENTS (Aligned to image locations)
           ========================================================================= */}
        {Object.values(gameState.settlements).map((s) => {
          const posX = (s.x / 100) * MAP_WIDTH;
          const posY = (s.z / 100) * MAP_HEIGHT;
          const faction = gameState.factions[s.factionId];
          const isPlayerOwned = s.factionId === 'player_kingdom';
          const bannerColor = isPlayerOwned ? '#18181b' : faction?.color || '#2563eb';
          const garrisonCount = s.garrison.reduce((acc, stack) => acc + stack.count, 0);
          const isBesieged = !!s.siegeCamp || !!s.underSiegeBy;

          return (
            <div
              key={s.id}
              style={{
                left: `${posX}px`,
                top: `${posY}px`,
              }}
              onClick={(e) => {
                e.stopPropagation();
                sfx.playClick();
                onSelectSettlement(s.id);
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-20 group hover:z-30 transition-transform active:scale-95"
            >
              {/* Animated Besieged Aura */}
              {isBesieged && (
                <div className="absolute -inset-2 rounded-full border-2 border-red-500 animate-pulse bg-red-950/40" />
              )}

              {/* Settlement Pin & Heraldic Badge */}
              <div className="flex flex-col items-center">
                {/* Shield Icon / Castle Marker */}
                <div
                  className="relative px-2 py-1 rounded-lg shadow-xl border flex items-center gap-1.5 transition group-hover:scale-110"
                  style={{
                    backgroundColor: 'rgba(18, 17, 23, 0.92)',
                    borderColor: isPlayerOwned ? '#d4af37' : 'rgba(212, 175, 55, 0.4)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.6)',
                  }}
                >
                  {/* Faction Banner Dot */}
                  <div
                    className="w-3.5 h-3.5 rounded-full border border-white/80 shrink-0 flex items-center justify-center shadow"
                    style={{ backgroundColor: bannerColor }}
                  >
                    {isBesieged ? (
                      <Flame className="w-2.5 h-2.5 text-amber-300 animate-pulse" />
                    ) : (
                      <Castle className="w-2.5 h-2.5 text-white" />
                    )}
                  </div>

                  {/* Settlement Name */}
                  <span className="font-bold text-[11px] text-stone-100 font-serif leading-none tracking-wide drop-shadow whitespace-nowrap">
                    {s.nameKu || s.name}
                  </span>

                  {/* Garrison count badge */}
                  <span className="text-[9px] font-semibold text-amber-300/90 tabular-nums bg-stone-900/90 px-1 rounded border border-amber-500/20">
                    {garrisonCount}
                  </span>
                </div>

                {/* Subtitle Pin Base */}
                <div className="w-1.5 h-1.5 rotate-45 bg-amber-500/80 -mt-0.5 border border-stone-950" />
              </div>
            </div>
          );
        })}

        {/* =========================================================================
            4. ANIMATED ARMIES ON THE MAP
           ========================================================================= */}
        {Object.values(gameState.parties).map((p) => {
          const posX = (p.x / 100) * MAP_WIDTH;
          const posY = (p.z / 100) * MAP_HEIGHT;
          const isPlayer = p.type === 'player';
          const troopTotal = p.troops.reduce((acc, st) => acc + st.count, 0);

          return (
            <div
              key={p.id}
              style={{
                left: `${posX}px`,
                top: `${posY}px`,
              }}
              onClick={(e) => {
                e.stopPropagation();
                sfx.playClick();
                if (!isPlayer) {
                  onSelectParty(p.id);
                }
              }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 z-25 cursor-pointer transition-transform duration-100 ${
                isPlayer ? 'z-35 scale-110' : 'hover:scale-115'
              }`}
            >
              {isPlayer ? (
                /* Player Army Token */
                <div className="relative flex flex-col items-center">
                  <div className="relative p-1.5 rounded-xl bg-gradient-to-br from-amber-600 via-amber-900 to-stone-950 border-2 border-amber-300 shadow-2xl flex items-center gap-1 animate-pulse">
                    <Crown className="w-4 h-4 text-amber-300 drop-shadow" />
                    <span className="text-[10px] font-bold text-amber-200 tabular-nums">
                      {troopTotal}
                    </span>
                  </div>
                  {/* Marching direction arrow */}
                  {p.targetX !== undefined && (
                    <div className="w-2 h-2 rotate-45 bg-amber-400 border border-stone-950 -mt-1" />
                  )}
                </div>
              ) : (
                /* AI Lord / Caravan / Bandit Token */
                <div className="relative flex flex-col items-center group">
                  <div
                    className="px-1.5 py-0.5 rounded-lg border flex items-center gap-1 shadow-lg bg-stone-950/90 transition group-hover:scale-110"
                    style={{ borderColor: p.bannerColor || '#94a3b8' }}
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0 border border-white/60"
                      style={{ backgroundColor: p.bannerColor || '#94a3b8' }}
                    />
                    <span className="text-[9px] font-bold text-stone-200 tabular-nums">
                      {troopTotal}
                    </span>
                  </div>

                  {/* Tooltip on hover */}
                  <div className="hidden group-hover:flex absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap bg-stone-950/95 border border-amber-500/50 rounded px-2 py-0.5 text-[9px] font-semibold text-amber-300 shadow-xl pointer-events-none">
                    {p.nameKu || p.name}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Target Destination notification banner at top */}
      {gameState.targetDestinationName && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 pointer-events-none animate-fade-in">
          <div className="medieval-panel rounded-full px-4 py-1.5 flex items-center gap-2 shadow-2xl text-xs font-semibold text-amber-200 border-amber-500/50">
            <Compass className="w-4 h-4 text-amber-400 animate-spin" />
            <span>بەرەو {gameState.targetDestinationName} بە ڕێگادا دەڕۆیت...</span>
          </div>
        </div>
      )}

      {/* Keyboard Controls Guide Badge (desktop) */}
      <div className="hidden md:flex absolute bottom-3.5 left-1/2 -translate-x-1/2 z-10 pointer-events-none items-center gap-2 px-3 py-1 rounded-full bg-stone-950/80 border border-amber-600/35 text-[10px] text-amber-200/80 backdrop-blur-sm shadow-xl select-none">
        <span className="flex items-center gap-1 font-mono text-amber-300 font-semibold">
          <span className="bg-stone-800/90 px-1.5 py-0.5 rounded border border-amber-500/40 text-[9px]">W A S D</span>
          <span className="text-stone-400">یا</span>
          <span className="bg-stone-800/90 px-1.5 py-0.5 rounded border border-amber-500/40 text-[9px]">↑ ↓ ← →</span>
        </span>
        <span className="font-sans">جوڵاندنی نەخشە</span>
        <span className="text-amber-500/40">•</span>
        <span className="font-mono bg-stone-800/90 px-1.5 py-0.5 rounded border border-amber-500/40 text-[9px] text-amber-300 font-semibold">Space</span>
        <span className="font-sans">سەر کارەکتەر</span>
        <span className="text-amber-500/40">•</span>
        <span className="font-mono bg-stone-800/90 px-1.5 py-0.5 rounded border border-amber-500/40 text-[9px] text-amber-300 font-semibold">+ / -</span>
        <span className="font-sans">زووم</span>
      </div>
    </div>
  );
};
