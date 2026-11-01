/**
 * 3D Tactical Battlefield and Siege Assault Simulation
 * Real-time clash between Player forces and Enemy hosts/Garrisons
 */
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { BattleState, CombatUnit, GameState, TroopStack } from '../types/game';
import { TROOP_CATALOG } from '../data/worldData';
import { sfx } from '../audio/soundFx';
import { TRANSLATIONS, Language } from '../localization/translations';
import { Shield, Swords, ArrowRight, ArrowLeft, Trophy, Skull } from 'lucide-react';

interface Battlefield3DProps {
  gameState: GameState;
  battle: BattleState;
  lang: Language;
  onFinishBattle: (result: 'victory' | 'defeat' | 'retreat', lootDinars: number, capturedPrisoners: TroopStack[]) => void;
}

export const Battlefield3D: React.FC<Battlefield3DProps> = ({
  gameState,
  battle,
  lang,
  onFinishBattle,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const t = TRANSLATIONS[lang];

  const [currentOrder, setCurrentOrder] = useState<'charge' | 'hold' | 'advance' | 'retreat'>('charge');
  const [battleResolved, setBattleResolved] = useState<'victory' | 'defeat' | 'retreat' | null>(null);
  const [playerAlive, setPlayerAlive] = useState(battle.playerUnits.filter((u) => !u.isDead).length);
  const [enemyAlive, setEnemyAlive] = useState(battle.enemyUnits.filter((u) => !u.isDead).length);

  const unitsRef = useRef({
    player: [...battle.playerUnits],
    enemy: [...battle.enemyUnits],
  });
  const orderRef = useRef(currentOrder);
  orderRef.current = currentOrder;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Detect software GL
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // Scene & Camera
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x181c22);
    scene.fog = new THREE.FogExp2(0x181c22, 0.012);

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.5,
      500
    );
    camera.position.set(0, 30, 45);
    camera.lookAt(0, 2, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.shadowMap.enabled = !isSoftwareGl;
    container.appendChild(renderer.domElement);

    // Lighting
    const hemi = new THREE.HemisphereLight(0xd9e5f3, 0x47382d, 1.2);
    scene.add(hemi);

    const dirLight = new THREE.DirectionalLight(0xffedd5, 1.8);
    dirLight.position.set(25, 45, 20);
    dirLight.castShadow = !isSoftwareGl;
    scene.add(dirLight);

    // Battlefield Ground (Natural, eye-comfort grass green)
    const groundGeo = new THREE.PlaneGeometry(120, 120);
    groundGeo.rotateX(-Math.PI / 2);
    const groundMat = new THREE.MeshStandardMaterial({
      color: battle.isSiege ? 0x2e3b2b : 0x243821,
      roughness: 0.9,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.receiveShadow = !isSoftwareGl;
    scene.add(ground);

    // If Siege: Construct Fortress Wall & Towers in background
    if (battle.isSiege) {
      const stoneMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9 });
      const wallMesh = new THREE.Mesh(new THREE.BoxGeometry(60, 8, 4), stoneMat);
      wallMesh.position.set(0, 4, -25);
      scene.add(wallMesh);

      // Towers
      [-30, 0, 30].forEach((tx) => {
        const tower = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 4, 12, 8), stoneMat);
        tower.position.set(tx, 6, -25);
        scene.add(tower);
      });
    }

    // Procedural soldier meshes
    const unitMeshMap = new Map<string, THREE.Group>();

    function createSoldierMesh(u: CombatUnit): THREE.Group {
      const g = new THREE.Group();
      // Sovereign Obsidian Black for Player forces, Crimson for Enemies
      const factionColor = u.isPlayerSide ? 0x111115 : 0xdc2626;

      const bodyMat = new THREE.MeshStandardMaterial({
        color: u.type === 'cavalry' ? (u.isPlayerSide ? 0x18181b : 0x334155) : factionColor,
        roughness: 0.5,
        metalness: u.isPlayerSide ? 0.6 : 0.3,
      });

      if (u.type === 'cavalry') {
        // Horse
        const horse = new THREE.Mesh(
          new THREE.BoxGeometry(0.7, 0.8, 1.8),
          new THREE.MeshStandardMaterial({ color: 0x3a2318, roughness: 0.8 })
        );
        horse.position.y = 0.9;
        g.add(horse);
      }

      // Torso
      const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 1.1, 6), bodyMat);
      torso.position.y = u.type === 'cavalry' ? 1.7 : 0.8;
      g.add(torso);

      // Head / Helmet
      const helmet = new THREE.Mesh(
        new THREE.SphereGeometry(0.25, 6, 6),
        new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.2 })
      );
      helmet.position.y = u.type === 'cavalry' ? 2.4 : 1.5;
      g.add(helmet);

      // Shield or Bow
      if (u.type === 'archer') {
        const bow = new THREE.Mesh(
          new THREE.TorusGeometry(0.4, 0.04, 4, 8, Math.PI),
          new THREE.MeshStandardMaterial({ color: 0x78350f })
        );
        bow.rotation.y = Math.PI / 2;
        bow.position.set(0.4, 0.8, 0);
        g.add(bow);
      } else {
        const shield = new THREE.Mesh(
          new THREE.BoxGeometry(0.1, 0.7, 0.5),
          new THREE.MeshStandardMaterial({ color: factionColor, roughness: 0.3 })
        );
        shield.position.set(-0.4, u.type === 'cavalry' ? 1.7 : 0.8, 0);
        g.add(shield);
      }

      // Floating HP Bar
      const hpBg = new THREE.Mesh(
        new THREE.PlaneGeometry(0.9, 0.12),
        new THREE.MeshBasicMaterial({ color: 0x000000 })
      );
      hpBg.position.y = u.type === 'cavalry' ? 2.9 : 2.0;
      g.add(hpBg);

      const hpFill = new THREE.Mesh(
        new THREE.PlaneGeometry(0.86, 0.08),
        new THREE.MeshBasicMaterial({ color: u.isPlayerSide ? 0x22c55e : 0xef4444 })
      );
      hpFill.position.set(0, u.type === 'cavalry' ? 2.9 : 2.0, 0.01);
      g.add(hpFill);
      g.userData.hpFill = hpFill;

      g.position.set(u.x, 0, u.z);
      return g;
    }

    // Populate initial soldier meshes
    [...unitsRef.current.player, ...unitsRef.current.enemy].forEach((u) => {
      const mesh = createSoldierMesh(u);
      scene.add(mesh);
      unitMeshMap.set(u.id, mesh);
    });

    // Sound effect on start
    sfx.playWarHorn();

    // Combat Simulation Loop
    let animId = 0;
    let lastTime = performance.now();

    const combatTick = () => {
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      const pUnits = unitsRef.current.player;
      const eUnits = unitsRef.current.enemy;

      let pActiveCount = 0;
      let eActiveCount = 0;

      // Simulate player units
      pUnits.forEach((p) => {
        if (p.isDead) return;
        pActiveCount++;
        p.cooldown = Math.max(0, p.cooldown - dt);

        // Find closest enemy
        let closestE: CombatUnit | null = null;
        let minDist = Infinity;
        eUnits.forEach((e) => {
          if (e.isDead) return;
          const dist = Math.hypot(e.x - p.x, e.z - p.z);
          if (dist < minDist) {
            minDist = dist;
            closestE = e;
          }
        });

        const mesh = unitMeshMap.get(p.id);

        if (closestE) {
          const e = closestE as CombatUnit;
          const dx = e.x - p.x;
          const dz = e.z - p.z;
          const dist = minDist;

          // React to orders
          const order = orderRef.current;
          let moveTargetDist = p.type === 'archer' ? 14 : 1.2;
          if (order === 'hold') {
            moveTargetDist = 999; // Stay still
          } else if (order === 'retreat') {
            // Move back towards south
            p.z += 3.5 * dt;
          }

          if (order !== 'hold' && order !== 'retreat' && dist > moveTargetDist) {
            const step = (p.type === 'cavalry' ? 5.5 : 3.2) * dt;
            p.x += (dx / dist) * Math.min(step, dist);
            p.z += (dz / dist) * Math.min(step, dist);
          }

          // Attack when in range
          const attackRange = p.type === 'archer' ? 18 : 1.8;
          if (dist <= attackRange && p.cooldown <= 0) {
            p.cooldown = p.type === 'archer' ? 2.2 : 1.2;
            const troopDef = TROOP_CATALOG[p.troopId];
            const dmg = p.type === 'archer' ? (troopDef?.rangedAttack || 20) : (troopDef?.meleeAttack || 25);
            e.hp -= Math.max(5, dmg - (TROOP_CATALOG[e.troopId]?.armor || 10) * 0.4);

            sfx.playSwordClash();

            if (e.hp <= 0) {
              e.isDead = true;
              p.kills++;
            }
          }

          if (mesh) {
            mesh.position.x = p.x;
            mesh.position.z = p.z;
            mesh.rotation.y = Math.atan2(dx, dz);
            // Update HP bar scale
            const fillMesh = mesh.userData.hpFill as THREE.Mesh;
            if (fillMesh) {
              fillMesh.scale.x = Math.max(0.01, p.hp / p.maxHp);
            }
          }
        }
      });

      // Simulate enemy units
      eUnits.forEach((e) => {
        if (e.isDead) return;
        eActiveCount++;
        e.cooldown = Math.max(0, e.cooldown - dt);

        let closestP: CombatUnit | null = null;
        let minDist = Infinity;
        pUnits.forEach((p) => {
          if (p.isDead) return;
          const dist = Math.hypot(p.x - e.x, p.z - e.z);
          if (dist < minDist) {
            minDist = dist;
            closestP = p;
          }
        });

        const mesh = unitMeshMap.get(e.id);

        if (closestP) {
          const p = closestP as CombatUnit;
          const dx = p.x - e.x;
          const dz = p.z - e.z;
          const dist = minDist;

          const attackRange = e.type === 'archer' ? 18 : 1.8;
          const moveTargetDist = e.type === 'archer' ? 14 : 1.2;

          if (dist > moveTargetDist) {
            const step = (e.type === 'cavalry' ? 5.2 : 3.0) * dt;
            e.x += (dx / dist) * Math.min(step, dist);
            e.z += (dz / dist) * Math.min(step, dist);
          }

          if (dist <= attackRange && e.cooldown <= 0) {
            e.cooldown = e.type === 'archer' ? 2.2 : 1.2;
            const troopDef = TROOP_CATALOG[e.troopId];
            const dmg = e.type === 'archer' ? (troopDef?.rangedAttack || 20) : (troopDef?.meleeAttack || 25);
            p.hp -= Math.max(5, dmg - (TROOP_CATALOG[p.troopId]?.armor || 10) * 0.4);

            if (p.hp <= 0) {
              p.isDead = true;
              e.kills++;
            }
          }

          if (mesh) {
            mesh.position.x = e.x;
            mesh.position.z = e.z;
            mesh.rotation.y = Math.atan2(dx, dz);
            const fillMesh = mesh.userData.hpFill as THREE.Mesh;
            if (fillMesh) {
              fillMesh.scale.x = Math.max(0.01, e.hp / e.maxHp);
            }
          }
        }
      });

      // Update state counters
      setPlayerAlive(pActiveCount);
      setEnemyAlive(eActiveCount);

      // Check battle conclusion
      if (eActiveCount === 0 && pActiveCount > 0 && !battleResolved) {
        setBattleResolved('victory');
        sfx.playVictory();
      } else if (pActiveCount === 0 && !battleResolved) {
        setBattleResolved('defeat');
        sfx.playDefeat();
      }

      renderer.render(scene, camera);
      animId = requestAnimationFrame(combatTick);
    };

    animId = requestAnimationFrame(combatTick);

    return () => {
      cancelAnimationFrame(animId);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  const handleOrder = (order: 'charge' | 'hold' | 'advance' | 'retreat') => {
    sfx.playClick();
    setCurrentOrder(order);
  };

  const handleClaimVictory = () => {
    sfx.playCoin();
    const loot = battle.lootDinars || Math.floor(150 + Math.random() * 300);
    const captured: TroopStack[] = [
      { troopId: 'footman', count: Math.floor(2 + Math.random() * 4), wounded: 0 },
    ];
    onFinishBattle('victory', loot, captured);
  };

  const handleAcceptDefeat = () => {
    sfx.playClick();
    onFinishBattle('defeat', 0, []);
  };

  return (
    <div className="absolute inset-0 z-40 bg-black/90 flex flex-col pointer-events-auto">
      {/* 3D Canvas Mount */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />

      {/* Top Combat Status Cluster */}
      <div className="relative z-10 flex items-center justify-between px-6 py-3 bg-gradient-to-b from-stone-950/90 to-transparent pointer-events-none">
        <div className="flex items-center gap-3 bg-stone-900/90 border border-purple-500/40 rounded-xl px-4 py-2 pointer-events-auto shadow-xl">
          <Shield className="w-5 h-5 text-purple-400" />
          <div>
            <div className="text-xs text-stone-400 uppercase tracking-wider">{t.yourForces}</div>
            <div className="text-lg font-bold text-purple-200 tabular-nums">
              {playerAlive} / {battle.initialPlayerCount}
            </div>
          </div>
        </div>

        <div className="text-center bg-stone-900/90 border border-stone-700/60 rounded-xl px-6 py-2 shadow-xl">
          <div className="text-sm font-bold text-amber-300">
            {battle.isSiege ? t.siegeTitle : t.battleTitle}
          </div>
          <div className="text-xs text-stone-400">
            {battle.isSiege ? t.stormWalls : 'Tactical Command'}
          </div>
        </div>

        <div className="flex items-center gap-3 bg-stone-900/90 border border-red-500/40 rounded-xl px-4 py-2 pointer-events-auto shadow-xl">
          <Swords className="w-5 h-5 text-red-400" />
          <div>
            <div className="text-xs text-stone-400 uppercase tracking-wider">{t.enemyForces}</div>
            <div className="text-lg font-bold text-red-200 tabular-nums">
              {enemyAlive} / {battle.initialEnemyCount}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Tactical Order Bar */}
      {!battleResolved && (
        <div className="mt-auto relative z-10 p-4 flex justify-center items-center gap-3 bg-gradient-to-t from-stone-950/95 via-stone-950/60 to-transparent">
          <button
            onClick={() => handleOrder('charge')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all border ${
              currentOrder === 'charge'
                ? 'bg-amber-600 border-amber-400 text-white shadow-lg shadow-amber-900/50 scale-105'
                : 'bg-stone-900/80 border-stone-700 text-stone-300 hover:bg-stone-800'
            }`}
          >
            <Swords className="w-4 h-4" />
            {t.orderCharge}
          </button>

          <button
            onClick={() => handleOrder('hold')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all border ${
              currentOrder === 'hold'
                ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-900/50 scale-105'
                : 'bg-stone-900/80 border-stone-700 text-stone-300 hover:bg-stone-800'
            }`}
          >
            <Shield className="w-4 h-4" />
            {t.orderHold}
          </button>

          <button
            onClick={() => handleOrder('advance')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all border ${
              currentOrder === 'advance'
                ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg shadow-emerald-900/50 scale-105'
                : 'bg-stone-900/80 border-stone-700 text-stone-300 hover:bg-stone-800'
            }`}
          >
            <ArrowRight className="w-4 h-4" />
            {t.orderAdvance}
          </button>

          <button
            onClick={() => handleOrder('retreat')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all border ${
              currentOrder === 'retreat'
                ? 'bg-red-700 border-red-500 text-white shadow-lg shadow-red-900/50 scale-105'
                : 'bg-stone-900/80 border-stone-700 text-stone-300 hover:bg-stone-800'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            {t.orderRetreat}
          </button>
        </div>
      )}

      {/* Battle Resolution Modal */}
      {battleResolved === 'victory' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/75 p-6 animate-fade-in">
          <div className="bg-stone-900 border-2 border-amber-500/80 rounded-2xl p-6 max-w-md w-full text-center shadow-2xl">
            <div className="w-16 h-16 mx-auto mb-4 bg-amber-500/20 border border-amber-400/50 rounded-full flex items-center justify-center text-amber-300">
              <Trophy className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-amber-200 mb-2">{t.victory}</h2>
            <p className="text-stone-300 text-sm mb-4">
              {battle.isSiege
                ? 'شووراکانی قەڵا بە تەواوی ڕووخان و کۆنتڕۆڵی شار کەوتە ژێر دەستی تۆ!'
                : 'سوپای دوژمن تێکشکێنرا و ڕایانکرد. مەیدانی شەڕەکە لەژێر دەستی تۆدایە.'}
            </p>

            <div className="bg-stone-950/70 border border-stone-800 rounded-xl p-3 mb-5 text-left text-sm space-y-1">
              <div className="flex justify-between text-stone-300">
                <span>{t.dinars}:</span>
                <span className="font-bold text-amber-300">+{battle.lootDinars || 350}</span>
              </div>
              <div className="flex justify-between text-stone-300">
                <span>{t.renown}:</span>
                <span className="font-bold text-purple-300">+15</span>
              </div>
              <div className="flex justify-between text-stone-300">
                <span>{t.prisonersCaptured}:</span>
                <span className="font-bold text-emerald-300">3 {t.troops}</span>
              </div>
            </div>

            <button
              onClick={handleClaimVictory}
              className="w-full py-3 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-950 font-bold rounded-xl shadow-lg border border-amber-400"
            >
              {t.lootClaim}
            </button>
          </div>
        </div>
      )}

      {battleResolved === 'defeat' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 p-6 animate-fade-in">
          <div className="bg-stone-900 border-2 border-red-700 rounded-2xl p-6 max-w-md w-full text-center shadow-2xl">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-950 border border-red-600 rounded-full flex items-center justify-center text-red-400">
              <Skull className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-red-300 mb-2">{t.defeat}</h2>
            <p className="text-stone-300 text-sm mb-5">
              سوپاکەت لە شەڕدا کەوت و سەربازەکانت بە دیل گیران. بە زەحمەت توانیت خۆت لە مەیدانەکە ڕزگار بکەیت.
            </p>
            <button
              onClick={handleAcceptDefeat}
              className="w-full py-3 bg-red-800 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg border border-red-500"
            >
              کشانەوە و خۆڕێکخستنەوە
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
