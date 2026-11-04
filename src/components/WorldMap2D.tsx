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
  selectedSettlementId?: string | null;
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
  selectedSettlementId,
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

  // Touch, Pointer, and Pinch-Zoom handlers
  const pointerDownTimeRef = useRef<number>(0);
  const activeTouchesRef = useRef<Map<number, { x: number; y: number }>>(new Map());

  const handlePointerDown = (e: React.PointerEvent) => {
    pointerDownPosRef.current = { x: e.clientX, y: e.clientY };
    pointerDownTimeRef.current = performance.now();
    isDraggingRef.current = false;
    panStartRef.current = { ...pan };

    activeTouchesRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activeTouchesRef.current.size === 2) {
      const touches = Array.from(activeTouchesRef.current.values());
      initialPinchDistRef.current = Math.hypot(touches[0].x - touches[1].x, touches[0].y - touches[1].y);
      initialPinchZoomRef.current = zoom;
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    activeTouchesRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Handle 2-finger pinch zoom on mobile
    if (activeTouchesRef.current.size === 2) {
      const touches = Array.from(activeTouchesRef.current.values());
      const currentDist = Math.hypot(touches[0].x - touches[1].x, touches[0].y - touches[1].y);
      if (initialPinchDistRef.current > 0) {
        const scaleChange = currentDist / initialPinchDistRef.current;
        const newZoom = Math.max(0.65, Math.min(3.2, initialPinchZoomRef.current * scaleChange));
        setZoom(newZoom);
        setIsFollowing(false);
      }
      return;
    }

    const dx = e.clientX - pointerDownPosRef.current.x;
    const dy = e.clientY - pointerDownPosRef.current.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 8) {
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
    activeTouchesRef.current.delete(e.pointerId);

    const container = containerRef.current;
    if (!container) return;

    const dx = e.clientX - pointerDownPosRef.current.x;
    const dy = e.clientY - pointerDownPosRef.current.y;
    const dragDistance = Math.hypot(dx, dy);
    const duration = performance.now() - pointerDownTimeRef.current;

    // Distinguish between dragging and tapping (touch friendly 10px threshold)
    if (!isDraggingRef.current && dragDistance < 10 && duration < 600) {
      const rect = container.getBoundingClientRect();
      const clickClientX = e.clientX - rect.left;
      const clickClientY = e.clientY - rect.top;

      // Convert client tap to map coordinate space
      const mapPixelX = (clickClientX - pan.x) / zoom;
      const mapPixelY = (clickClientY - pan.y) / zoom;

      // 1. Proximity check: did user tap on or near any settlement? (32px radius)
      let nearestSettlement: Settlement | null = null;
      let minSettlementDist = 32;

      Object.values(gameState.settlements).forEach((s) => {
        const sx = (s.x / 100) * MAP_WIDTH;
        const sy = (s.z / 100) * MAP_HEIGHT;
        const d = Math.hypot(mapPixelX - sx, mapPixelY - sy);
        if (d < minSettlementDist) {
          minSettlementDist = d;
          nearestSettlement = s;
        }
      });

      if (nearestSettlement) {
        sfx.playClick();
        onSelectSettlement((nearestSettlement as Settlement).id);
        handlePanTo((nearestSettlement as Settlement).x, (nearestSettlement as Settlement).z);
        return;
      }

      // 2. Proximity check: did user tap near an AI party? (24px radius)
      let nearestParty: Party | null = null;
      let minPartyDist = 24;

      Object.values(gameState.parties).forEach((p) => {
        if (p.id === 'player_party') return;
        const px = (p.x / 100) * MAP_WIDTH;
        const py = (p.z / 100) * MAP_HEIGHT;
        const d = Math.hypot(mapPixelX - px, mapPixelY - py);
        if (d < minPartyDist) {
          minPartyDist = d;
          nearestParty = p;
        }
      });

      if (nearestParty) {
        sfx.playClick();
        onSelectParty((nearestParty as Party).id);
        return;
      }

      // 3. Otherwise: march order to tapped terrain coordinate
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
      onPointerCancel={() => {
        activeTouchesRef.current.clear();
        isDraggingRef.current = false;
      }}
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
            2. ROAD NETWORK MOVEMENT TRAILS (SVG Layer)
           ========================================================================= */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
          viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
        >
          <defs>
            <linearGradient id="marchPathGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#d97706" stopOpacity="0.4" />
            </linearGradient>
            <filter id="glowGold" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Player March Route line */}
          {playerParty && playerParty.targetX !== undefined && playerParty.targetZ !== undefined && (
            <g filter="url(#glowGold)">
              {/* Waypoints line */}
              {playerParty.pathWaypoints && playerParty.pathWaypoints.length > 0 ? (
                <>
                  <polyline
                    points={[
                      `${(playerParty.x / 100) * MAP_WIDTH},${(playerParty.z / 100) * MAP_HEIGHT}`,
                      ...playerParty.pathWaypoints.map(
                        (wp) => `${(wp.x / 100) * MAP_WIDTH},${(wp.z / 100) * MAP_HEIGHT}`
                      ),
                    ].join(' ')}
                    fill="none"
                    stroke="url(#marchPathGrad)"
                    strokeWidth="3"
                    strokeDasharray="6, 4"
                    strokeLinecap="round"
                    className="animate-pulse"
                  />
                  {playerParty.pathWaypoints.map((wp, idx) => (
                    <circle
                      key={idx}
                      cx={(wp.x / 100) * MAP_WIDTH}
                      cy={(wp.z / 100) * MAP_HEIGHT}
                      r="2.5"
                      fill="#fbbf24"
                      stroke="#18181b"
                      strokeWidth="1"
                    />
                  ))}
                </>
              ) : (
                <line
                  x1={(playerParty.x / 100) * MAP_WIDTH}
                  y1={(playerParty.z / 100) * MAP_HEIGHT}
                  x2={(playerParty.targetX / 100) * MAP_WIDTH}
                  y2={(playerParty.targetZ / 100) * MAP_HEIGHT}
                  stroke="url(#marchPathGrad)"
                  strokeWidth="2.5"
                  strokeDasharray="5, 3"
                  strokeLinecap="round"
                />
              )}
            </g>
          )}
        </svg>

        {/* Destination Beacon */}
        {playerParty && playerParty.targetX !== undefined && playerParty.targetZ !== undefined && (
          <div
            style={{
              left: `${(playerParty.targetX / 100) * MAP_WIDTH}px`,
              top: `${(playerParty.targetZ / 100) * MAP_HEIGHT}px`,
            }}
            className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-15"
          >
            <div className="relative flex items-center justify-center">
              <div className="w-9 h-9 rounded-full border-2 border-amber-400 animate-ping opacity-75" />
              <div className="absolute w-5 h-5 rounded-full bg-amber-400/80 border-2 border-stone-950 flex items-center justify-center text-[9px] shadow-lg text-stone-950 font-bold">
                🎯
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            3. INTERACTIVE CASTLES, CITIES & SETTLEMENTS (Phase 2 & 5)
           ========================================================================= */}
        {Object.values(gameState.settlements).map((s) => {
          const posX = (s.x / 100) * MAP_WIDTH;
          const posY = (s.z / 100) * MAP_HEIGHT;
          const faction = gameState.factions[s.factionId];
          const isPlayerOwned = s.factionId === 'player_kingdom';
          const bannerColor = isPlayerOwned ? '#18181b' : faction?.color || '#2563eb';
          const garrisonCount = s.garrison.reduce((acc, stack) => acc + stack.count, 0);
          const isBesieged = !!s.siegeCamp || !!s.underSiegeBy;
          const isSelected = selectedSettlementId === s.id;

          return (
            <div
              key={s.id}
              style={{
                left: `${posX}px`,
                top: `${posY}px`,
              }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 select-none ${
                isSelected ? 'z-40' : 'z-20 hover:z-30'
              }`}
            >
              {/* Selected Castle Golden Halo & Aura */}
              {isSelected && (
                <div className="absolute -inset-4 rounded-full border-2 border-amber-400 animate-spin-slow bg-amber-500/20 shadow-[0_0_20px_rgba(251,191,36,0.6)] pointer-events-none" />
              )}

              {/* Besieged Smoke / Fire Aura */}
              {isBesieged && (
                <div className="absolute -inset-3 rounded-full border-2 border-red-500 animate-pulse bg-red-950/50 shadow-[0_0_15px_rgba(239,68,68,0.7)] pointer-events-none" />
              )}

              {/* Explicit Touch Target (44x44px for reliable mobile finger taps) */}
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onPointerUp={(e) => {
                  e.stopPropagation();
                  sfx.playClick();
                  onSelectSettlement(s.id);
                  handlePanTo(s.x, s.z);
                }}
                className={`relative w-11 h-11 rounded-full flex items-center justify-center transition-transform active:scale-90 focus:outline-none pointer-events-auto ${
                  isSelected ? 'scale-125' : 'hover:scale-115'
                }`}
                title={s.nameKu || s.name}
              >
                {/* Shield background badge */}
                <div
                  className="w-8 h-8 rounded-full border-2 flex items-center justify-center shadow-2xl relative"
                  style={{
                    backgroundColor: isSelected ? '#78350f' : 'rgba(20, 18, 24, 0.94)',
                    borderColor: isSelected ? '#fbbf24' : isPlayerOwned ? '#d4af37' : bannerColor,
                    boxShadow: isSelected
                      ? '0 0 14px rgba(251, 191, 36, 0.9)'
                      : '0 4px 10px rgba(0,0,0,0.8)',
                  }}
                >
                  {isBesieged ? (
                    <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
                  ) : s.type === 'town' ? (
                    <Crown className="w-4 h-4" style={{ color: isSelected ? '#fbbf24' : '#f59e0b' }} />
                  ) : (
                    <Castle className="w-4 h-4" style={{ color: isSelected ? '#fbbf24' : '#e2e8f0' }} />
                  )}

                  {/* Faction color dot */}
                  <div
                    className="absolute -top-1 -right-1 w-3 h-3 rounded-full border border-white shadow"
                    style={{ backgroundColor: bannerColor }}
                  />
                </div>
              </button>

              {/* Castle Label (with pointer-events-none to prevent blocking neighboring castle taps!) */}
              <div className="flex flex-col items-center pointer-events-none -mt-1">
                <div
                  className={`px-2 py-0.5 rounded-md border flex items-center gap-1.5 shadow-lg backdrop-blur-sm whitespace-nowrap transition-all ${
                    isSelected
                      ? 'bg-amber-950/95 border-amber-400 text-amber-200 ring-1 ring-amber-400/50 scale-105'
                      : 'bg-stone-950/90 border-stone-700/80 text-stone-200'
                  }`}
                >
                  <span className="font-bold text-[10.5px] font-serif tracking-wide drop-shadow">
                    {s.nameKu || s.name}
                  </span>

                  <span className="text-[9px] font-mono font-semibold text-amber-300 bg-stone-900/90 px-1 rounded border border-amber-500/20">
                    {garrisonCount}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {/* =========================================================================
            4. DETAILED ANIMATED MEDIEVAL ARMIES & BANNERS (Phase 4)
           ========================================================================= */}
        {Object.values(gameState.parties).map((p) => {
          const posX = (p.x / 100) * MAP_WIDTH;
          const posY = (p.z / 100) * MAP_HEIGHT;
          const isPlayer = p.type === 'player';
          const troopTotal = p.troops.reduce((acc, st) => acc + st.count, 0);
          const isMoving = p.targetX !== undefined && p.targetZ !== undefined;

          return (
            <div
              key={p.id}
              style={{
                left: `${posX}px`,
                top: `${posY}px`,
              }}
              onPointerDown={(e) => e.stopPropagation()}
              onPointerUp={(e) => {
                e.stopPropagation();
                sfx.playClick();
                if (!isPlayer) {
                  onSelectParty(p.id);
                }
              }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 select-none cursor-pointer transition-transform ${
                isPlayer ? 'z-35 scale-110 active:scale-95' : 'z-25 hover:scale-115 active:scale-95'
              }`}
            >
              {isPlayer ? (
                /* Player Warband Hero Sprite */
                <div className="relative flex flex-col items-center">
                  {/* Commander Plume & Heraldic Banner */}
                  <div className="relative px-2 py-1 rounded-xl bg-gradient-to-br from-amber-700 via-amber-900 to-stone-950 border-2 border-amber-300 shadow-[0_4px_16px_rgba(217,119,6,0.6)] flex items-center gap-1.5">
                    {/* Animated Walking Horse / Knight Icon */}
                    <div className="w-5 h-5 rounded-lg bg-amber-500/30 border border-amber-400/50 flex items-center justify-center">
                      <Crown className="w-3.5 h-3.5 text-amber-200" />
                    </div>

                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-amber-100 font-serif leading-none">
                        تۆ (فەرماندە)
                      </span>
                      <span className="text-[8.5px] font-mono text-amber-300/90 leading-tight">
                        {troopTotal} جەنگاوەر
                      </span>
                    </div>

                    {isMoving && (
                      <Footprints className="w-3 h-3 text-amber-400 animate-bounce ml-0.5" />
                    )}
                  </div>

                  {/* Marching direction pointer */}
                  {isMoving && (
                    <div className="w-2 h-2 rotate-45 bg-amber-400 border border-stone-950 -mt-1 shadow" />
                  )}
                </div>
              ) : p.type === 'caravan' ? (
                /* Trade Caravan Token */
                <div className="relative flex flex-col items-center group">
                  <div className="px-2 py-0.5 rounded-lg border border-amber-500/60 bg-stone-950/95 shadow-xl flex items-center gap-1.5">
                    <div className="w-3.5 h-3.5 rounded-full bg-amber-600/40 border border-amber-400 flex items-center justify-center text-[9px]">
                      🐫
                    </div>
                    <span className="text-[9px] font-bold text-amber-300">
                      کاروان ({troopTotal})
                    </span>
                  </div>
                  <div className="hidden group-hover:flex absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap bg-stone-950/95 border border-amber-500/50 rounded px-2 py-0.5 text-[9px] font-semibold text-amber-300 shadow-xl pointer-events-none">
                    {p.nameKu || p.name}
                  </div>
                </div>
              ) : p.type === 'bandit' ? (
                /* Bandit Raider Token */
                <div className="relative flex flex-col items-center group">
                  <div className="px-2 py-0.5 rounded-lg border border-red-600/70 bg-stone-950/95 shadow-xl flex items-center gap-1.5">
                    <div className="w-3.5 h-3.5 rounded-full bg-red-950 border border-red-500 flex items-center justify-center text-[9px]">
                      🗡️
                    </div>
                    <span className="text-[9px] font-bold text-red-300">
                      ڕێگر ({troopTotal})
                    </span>
                  </div>
                  <div className="hidden group-hover:flex absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap bg-stone-950/95 border border-red-500/50 rounded px-2 py-0.5 text-[9px] font-semibold text-red-300 shadow-xl pointer-events-none">
                    {p.nameKu || p.name}
                  </div>
                </div>
              ) : (
                /* Lord Host / Military Army Token */
                <div className="relative flex flex-col items-center group">
                  <div
                    className="px-2 py-0.5 rounded-lg border shadow-xl flex items-center gap-1.5 bg-stone-950/95 transition-transform"
                    style={{ borderColor: p.bannerColor || '#38bdf8' }}
                  >
                    <div
                      className="w-3.5 h-3.5 rounded-full border border-white/80 shrink-0 shadow flex items-center justify-center"
                      style={{ backgroundColor: p.bannerColor || '#38bdf8' }}
                    >
                      <Swords className="w-2 h-2 text-white" />
                    </div>

                    <div className="flex flex-col">
                      <span className="text-[9.5px] font-bold text-stone-200 font-serif leading-none">
                        {p.nameKu?.split(' ')[0] || p.name.split(' ')[0]}
                      </span>
                      <span className="text-[8px] font-mono text-stone-400 leading-tight">
                        {troopTotal} سەرباز
                      </span>
                    </div>

                    {isMoving && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    )}
                  </div>

                  {/* Tooltip on hover */}
                  <div className="hidden group-hover:flex absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-stone-950/95 border border-amber-500/50 rounded-lg px-2.5 py-1 text-[9.5px] font-semibold text-amber-300 shadow-2xl pointer-events-none z-50">
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
