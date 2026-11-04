/**
 * 3D Overland World Map Component
 * - Single-finger fluid map pan (Up, Down, Left, Right)
 * - Two-finger pinch-to-zoom (In & Out)
 * - Tap to march directly into castles & cities
 * - 20+ prominent cities and castles with 3D floating banners
 * - Minimalist floating action pills (Center character, Full realm overview)
 */
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GameState, Party, Settlement } from '../types/game';
import { sfx } from '../audio/soundFx';
import { 
  ZoomIn, 
  ZoomOut, 
  MapPin, 
  Eye, 
  Compass
} from 'lucide-react';

export interface MapCameraControls {
  focusPlayer: () => void;
  fullOverview: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  isFollowing: boolean;
  panTo?: (x: number, z: number) => void;
  getCameraTarget?: () => { x: number; z: number };
}

interface WorldMap3DProps {
  gameState: GameState;
  onSelectSettlement: (settlementId: string) => void;
  onSelectParty: (partyId: string) => void;
  onSetDestination: (x: number, z: number, targetSettlementId?: string, targetPartyId?: string) => void;
  onRegisterCameraControls?: (controls: MapCameraControls) => void;
}

export const WorldMap3D: React.FC<WorldMap3DProps> = ({
  gameState,
  onSelectSettlement,
  onSelectParty,
  onSetDestination,
  onRegisterCameraControls,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef(gameState);
  stateRef.current = gameState;

  // Continuous Camera Target: Initialized at player coordinates
  const initialPlayerX = gameState.parties['player_party']?.x ?? -25;
  const initialPlayerZ = gameState.parties['player_party']?.z ?? -15;

  const cameraTargetRef = useRef<{ x: number; z: number }>({
    x: initialPlayerX,
    z: initialPlayerZ,
  });

  const isFollowingPlayerRef = useRef<boolean>(true);
  const zoomLevelRef = useRef<number>(1.1);
  const [isFollowing, setIsFollowing] = useState<boolean>(true);

  // Full Continent Realm Overview
  const handleFullMapOverview = () => {
    sfx.playClick();
    isFollowingPlayerRef.current = false;
    setIsFollowing(false);
    cameraTargetRef.current = { x: 0, z: 0 };
    zoomLevelRef.current = 3.1;
  };

  // Focus Back on Player Character
  const handleFocusPlayer = () => {
    sfx.playClick();
    const playerParty = stateRef.current.parties['player_party'];
    if (playerParty) {
      cameraTargetRef.current = { x: playerParty.x, z: playerParty.z };
    }
    isFollowingPlayerRef.current = true;
    setIsFollowing(true);
    zoomLevelRef.current = 1.1;
  };

  // Pan Camera to specific world coordinate (from minimap or strategic jump)
  const handlePanTo = (x: number, z: number) => {
    isFollowingPlayerRef.current = false;
    setIsFollowing(false);
    cameraTargetRef.current = {
      x: Math.max(-125, Math.min(125, x)),
      z: Math.max(-135, Math.min(135, z)),
    };
  };

  // Zoom In / Out Buttons for Desktop Users
  const handleZoom = (delta: number) => {
    sfx.playClick();
    zoomLevelRef.current = Math.max(0.65, Math.min(3.4, zoomLevelRef.current + delta));
  };

  useEffect(() => {
    if (onRegisterCameraControls) {
      onRegisterCameraControls({
        focusPlayer: handleFocusPlayer,
        fullOverview: handleFullMapOverview,
        zoomIn: () => handleZoom(-0.35),
        zoomOut: () => handleZoom(0.35),
        isFollowing,
        panTo: handlePanTo,
        getCameraTarget: () => ({ x: cameraTargetRef.current.x, z: cameraTargetRef.current.z }),
      });
    }
  }, [isFollowing, onRegisterCameraControls]);

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

    // 1. Scene & Camera Setup (Lush Green Medieval Overworld)
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x13301f); // Soothing, rich forest canopy atmospheric green
    scene.fog = new THREE.FogExp2(0x163623, 0.0035);

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.5,
      1200
    );
    camera.position.set(cameraTargetRef.current.x, 60, cameraTargetRef.current.z + 35);
    camera.lookAt(cameraTargetRef.current.x, 0, cameraTargetRef.current.z);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    // Environment map
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 2. Natural Sunbeam & Medieval Ambient Lighting
    const hemiLight = new THREE.HemisphereLight(0xecfdf5, 0x1b3824, 1.4);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xfff7e2, 2.2);
    dirLight.position.set(70, 130, 50);
    dirLight.castShadow = !isSoftwareGl;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 10;
    dirLight.shadow.camera.far = 350;
    const shadowD = 140;
    dirLight.shadow.camera.left = -shadowD;
    dirLight.shadow.camera.right = shadowD;
    dirLight.shadow.camera.top = shadowD;
    dirLight.shadow.camera.bottom = -shadowD;
    dirLight.shadow.bias = -0.0004;
    scene.add(dirLight);

    // 3. 100% Lush Green Terrain Generation (Zero desert sand, zero snow, total eye comfort)
    const terrainSize = 380;
    const segments = 160;
    const terrainGeo = new THREE.PlaneGeometry(terrainSize, terrainSize, segments, segments);
    terrainGeo.rotateX(-Math.PI / 2);

    const posAttr = terrainGeo.attributes.position;
    const colors: number[] = [];
    const colorHelper = new THREE.Color();

    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const z = posAttr.getZ(i);

      let h = 0;
      if (x > 15 && z < -5) {
        h = Math.sin(x * 0.08) * Math.cos(z * 0.08) * 8.5 + Math.sin(x * 0.15) * 3.0;
        h = Math.max(0, h * 1.25);
      } else if (z > 20) {
        h = Math.sin(x * 0.05 + z * 0.08) * 2.6 + Math.sin(z * 0.12) * 1.2;
      } else {
        h = Math.sin(x * 0.04) * Math.cos(z * 0.04) * 2.4;
      }

      posAttr.setY(i, h);

      // Organic natural green biome coloring (pure eye comfort):
      const subtleNoise = (Math.sin(x * 0.22) + Math.cos(z * 0.22)) * 0.018;

      if (h > 6.0) {
        // High mountain crests: deep mossy evergreen slate green
        colorHelper.setRGB(0.19 + subtleNoise, 0.44 + subtleNoise, 0.21 + subtleNoise);
      } else if (h > 2.8) {
        // Rolling hill pastures: lush emerald highland green
        colorHelper.setRGB(0.24 + subtleNoise, 0.52 + subtleNoise, 0.23 + subtleNoise);
      } else if (x < -20 && z > 0) {
        // Western woodlands: deep calming spruce green
        colorHelper.setRGB(0.18 + subtleNoise, 0.43 + subtleNoise, 0.20 + subtleNoise);
      } else if (x > -15 && x < 8 && z > -8 && z < 18) {
        // Central river basin & valley: vibrant spring meadow green
        colorHelper.setRGB(0.23 + subtleNoise, 0.57 + subtleNoise, 0.23 + subtleNoise);
      } else if (z > 25) {
        // Southern river plains: rich warm clover green (100% green, zero sand glare)
        colorHelper.setRGB(0.26 + subtleNoise, 0.51 + subtleNoise, 0.24 + subtleNoise);
      } else if (z < -45) {
        // Northern mountains: deep pine forest green (100% green, zero blinding snow)
        colorHelper.setRGB(0.18 + subtleNoise, 0.43 + subtleNoise, 0.20 + subtleNoise);
      } else {
        // Continental heartlands: soothing natural pasture green
        colorHelper.setRGB(0.24 + subtleNoise, 0.53 + subtleNoise, 0.23 + subtleNoise);
      }
      colors.push(colorHelper.r, colorHelper.g, colorHelper.b);
    }

    terrainGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    terrainGeo.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.86,
      metalness: 0.04,
      flatShading: true,
    });
    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.receiveShadow = !isSoftwareGl;
    scene.add(terrainMesh);

    function getGroundHeight(x: number, z: number): number {
      if (x > 15 && z < -5) {
        const val = Math.sin(x * 0.08) * Math.cos(z * 0.08) * 8.5 + Math.sin(x * 0.15) * 3.0;
        return Math.max(0, val * 1.25);
      }
      if (z > 20) {
        return Math.sin(x * 0.05 + z * 0.08) * 2.6 + Math.sin(z * 0.12) * 1.2;
      }
      return Math.sin(x * 0.04) * Math.cos(z * 0.04) * 2.4;
    }

    // 3b. Winding Crystal Blue Medieval River Networks
    const riverGroup = new THREE.Group();
    scene.add(riverGroup);

    const riverMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.18,
      metalness: 0.12,
      transparent: true,
      opacity: 0.88,
    });

    function createRiverRibbon(points: Array<[number, number]>, width: number = 2.4): THREE.Mesh {
      const curve = new THREE.CatmullRomCurve3(
        points.map(([px, pz]) => new THREE.Vector3(px, getGroundHeight(px, pz) + 0.12, pz))
      );
      const samplePoints = curve.getPoints(90);
      const riverGeo = new THREE.BufferGeometry();
      const vertices: number[] = [];
      const indices: number[] = [];

      for (let j = 0; j < samplePoints.length; j++) {
        const p = samplePoints[j];
        const nextP = samplePoints[Math.min(j + 1, samplePoints.length - 1)];
        const prevP = samplePoints[Math.max(j - 1, 0)];
        const dir = nextP.clone().sub(prevP).normalize();
        const normal = new THREE.Vector3(-dir.z, 0, dir.x).normalize();

        const pLeft = p.clone().add(normal.clone().multiplyScalar(width / 2));
        const pRight = p.clone().sub(normal.clone().multiplyScalar(width / 2));

        vertices.push(pLeft.x, pLeft.y, pLeft.z);
        vertices.push(pRight.x, pRight.y, pRight.z);

        if (j < samplePoints.length - 1) {
          const row1 = j * 2;
          const row2 = (j + 1) * 2;
          indices.push(row1, row1 + 1, row2);
          indices.push(row1 + 1, row2 + 1, row2);
        }
      }

      riverGeo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      riverGeo.setIndex(indices);
      riverGeo.computeVertexNormals();

      return new THREE.Mesh(riverGeo, riverMat);
    }

    // River 1: Great Tigris & Valley River
    const river1 = createRiverRibbon([
      [-80, -95],
      [-55, -60],
      [-25, -20],
      [0, 10],
      [35, 38],
      [75, 55],
      [110, 80],
    ], 2.8);
    riverGroup.add(river1);

    // River 2: Euphrates & Levant Branch
    const river2 = createRiverRibbon([
      [-20, -100],
      [-15, -45],
      [-30, -10],
      [-25, 20],
      [-16, 45],
      [10, 75],
    ], 2.2);
    riverGroup.add(river2);

    // 3c. Medieval Trade Road Networks (Earthy tracks across the green landscape)
    const roadGroup = new THREE.Group();
    scene.add(roadGroup);
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x5a5538,
      roughness: 0.95,
      metalness: 0.05,
      transparent: true,
      opacity: 0.75,
    });

    function createRoadRibbon(points: Array<[number, number]>, width: number = 1.3): THREE.Mesh {
      const curve = new THREE.CatmullRomCurve3(
        points.map(([px, pz]) => new THREE.Vector3(px, getGroundHeight(px, pz) + 0.06, pz))
      );
      const samplePoints = curve.getPoints(50);
      const roadGeo = new THREE.BufferGeometry();
      const vertices: number[] = [];
      const indices: number[] = [];

      for (let j = 0; j < samplePoints.length; j++) {
        const p = samplePoints[j];
        const nextP = samplePoints[Math.min(j + 1, samplePoints.length - 1)];
        const prevP = samplePoints[Math.max(j - 1, 0)];
        const dir = nextP.clone().sub(prevP).normalize();
        const normal = new THREE.Vector3(-dir.z, 0, dir.x).normalize();

        const pLeft = p.clone().add(normal.clone().multiplyScalar(width / 2));
        const pRight = p.clone().sub(normal.clone().multiplyScalar(width / 2));

        vertices.push(pLeft.x, pLeft.y, pLeft.z);
        vertices.push(pRight.x, pRight.y, pRight.z);

        if (j < samplePoints.length - 1) {
          const row1 = j * 2;
          const row2 = (j + 1) * 2;
          indices.push(row1, row1 + 1, row2);
          indices.push(row1 + 1, row2 + 1, row2);
        }
      }

      roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      roadGeo.setIndex(indices);
      roadGeo.computeVertexNormals();

      return new THREE.Mesh(roadGeo, roadMat);
    }

    // Roads connecting key realm capitals
    roadGroup.add(createRoadRibbon([[-48, -30], [-24, -58], [8, -100]])); // Baban to Caucasus
    roadGroup.add(createRoadRibbon([[-48, -30], [20, -40], [65, -55]])); // Baban to Rawanduz
    roadGroup.add(createRoadRibbon([[-48, -30], [-16, 8], [-32, 28]])); // Baban to Levant
    roadGroup.add(createRoadRibbon([[-16, 8], [30, 72], [88, 40]])); // Levant to Diyarbakir to Baghdad
    roadGroup.add(createRoadRibbon([[-80, 24], [-64, 55], [-10, 80]])); // Badinan to Mardin

    // 3d. 3D Procedural Tree Groves (Lush Pine & Oak Woodlands)
    const treeGroup = new THREE.Group();
    scene.add(treeGroup);

    const trunkGeo = new THREE.CylinderGeometry(0.12, 0.2, 1.4, 5);
    const pineLeafGeo1 = new THREE.ConeGeometry(1.1, 1.8, 5);
    const pineLeafGeo2 = new THREE.ConeGeometry(0.8, 1.5, 5);
    const oakLeafGeo = new THREE.DodecahedronGeometry(1.2, 1);

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x3d2716, roughness: 0.9 });
    const pineGreenMat1 = new THREE.MeshStandardMaterial({ color: 0x194520, roughness: 0.75, flatShading: true });
    const pineGreenMat2 = new THREE.MeshStandardMaterial({ color: 0x22582b, roughness: 0.75, flatShading: true });
    const oakGreenMat = new THREE.MeshStandardMaterial({ color: 0x296e2e, roughness: 0.8, flatShading: true });

    // Seeded random pseudo-random generator for fixed natural tree placement
    let seed = 1234567;
    function pseudoRandom(): number {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    }

    // Place 240+ trees in organic clusters away from city centers
    const settlementPositions = Object.values(stateRef.current.settlements).map(s => ({ x: s.x, z: s.z }));

    for (let t = 0; t < 260; t++) {
      const rx = (pseudoRandom() - 0.5) * 320;
      const rz = (pseudoRandom() - 0.5) * 320;

      // Skip if too close to settlements
      const nearSettlement = settlementPositions.some(s => {
        const dx = s.x - rx;
        const dz = s.z - rz;
        return dx * dx + dz * dz < 120;
      });
      if (nearSettlement) continue;

      const gy = getGroundHeight(rx, rz);
      const isPine = pseudoRandom() > 0.45 || rz < -20;
      const scale = 0.85 + pseudoRandom() * 0.5;

      const singleTree = new THREE.Group();
      singleTree.position.set(rx, gy, rz);
      singleTree.scale.set(scale, scale, scale);

      const trunk = new THREE.Mesh(trunkGeo, woodMat);
      trunk.position.y = 0.7;
      singleTree.add(trunk);

      if (isPine) {
        const pine1 = new THREE.Mesh(pineLeafGeo1, pineGreenMat1);
        pine1.position.y = 1.8;
        singleTree.add(pine1);

        const pine2 = new THREE.Mesh(pineLeafGeo2, pineGreenMat2);
        pine2.position.y = 2.6;
        singleTree.add(pine2);
      } else {
        const oak = new THREE.Mesh(oakLeafGeo, oakGreenMat);
        oak.position.y = 2.1;
        singleTree.add(oak);
      }

      treeGroup.add(singleTree);
    }

    // 3D floating canvas text badge for cities/castles
    function createSettlementBadge(s: Settlement, isPlayerOwned: boolean): THREE.Sprite {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 96;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const faction = stateRef.current.factions[s.factionId];
        const strokeColor = isPlayerOwned ? '#f59e0b' : (faction ? faction.color : '#334155');

        // Dark obsidian slate background
        ctx.fillStyle = isPlayerOwned ? 'rgba(10, 10, 12, 0.96)' : 'rgba(15, 23, 42, 0.9)';
        ctx.beginPath();
        ctx.roundRect(6, 6, 244, 84, 18);
        ctx.fill();

        // Border: Double-gold for captured/player castles, faction color for others
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = isPlayerOwned ? 4.5 : 3.5;
        ctx.stroke();

        if (isPlayerOwned) {
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        // Title
        ctx.fillStyle = isPlayerOwned ? '#fbbf24' : strokeColor;
        ctx.font = 'bold 23px sans-serif';
        ctx.textAlign = 'center';
        const iconPrefix = isPlayerOwned ? '👑 ' : (s.type === 'town' ? '🏛️ ' : '🏰 ');
        ctx.fillText(iconPrefix + s.nameKu, 128, 42);

        // Subtitle tag
        if (s.siegeCamp) {
          ctx.fillStyle = '#f87171';
          ctx.font = 'bold 16px sans-serif';
          ctx.fillText(`⚔️ گەمارۆدراوە (ڕۆژی ${s.siegeCamp.daysBesieged})`, 128, 72);
        } else {
          ctx.fillStyle = isPlayerOwned ? '#e2e8f0' : '#cbd5e1';
          ctx.font = 'bold 17px sans-serif';
          const tagText = isPlayerOwned 
            ? (s.type === 'town' ? 'شاری تۆ (ڕەش)' : 'قەڵای تۆ (ڕەش)')
            : (s.type === 'town' ? 'شار' : 'قەڵا');
          ctx.fillText(tagText, 128, 72);
        }
      }

      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      const spriteMat = new THREE.SpriteMaterial({
        map: texture,
        depthTest: false,
        transparent: true,
      });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.scale.set(14, 5.2, 1);
      sprite.position.y = 12.5;
      return sprite;
    }

    // 4. Procedural Settlements with Dynamic Black Captured Castle Styling
    const settlementGroup = new THREE.Group();
    scene.add(settlementGroup);

    interface SettlementMeshRecord {
      group: THREE.Group;
      roofMat: THREE.MeshStandardMaterial;
      wallMat: THREE.MeshStandardMaterial;
      flagMat: THREE.MeshStandardMaterial;
      badgeSprite: THREE.Sprite;
      currentFactionId: string;
      isPlayerOwned: boolean;
      hasSiegeCamp?: boolean;
    }
    const settlementMeshMap = new Map<string, SettlementMeshRecord>();

    function buildSettlementModel(s: Settlement): THREE.Group {
      const group = new THREE.Group();
      const isPlayerOwned = s.factionId === 'player_kingdom' || s.lordOwnerId === 'player';
      const faction = stateRef.current.factions[s.factionId];
      
      // When captured by player: deep obsidian black roofs, pennants & dark noble granite walls
      const factionColor = isPlayerOwned ? '#0c0c0e' : (faction ? faction.color : '#ffffff');
      const wallColor = isPlayerOwned 
        ? 0x24262b 
        : (s.factionId === 'saruq' ? 0xd8b589 : s.factionId === 'frostgard' ? 0x94a3b8 : 0x6e7681);

      const wallMat = new THREE.MeshStandardMaterial({
        color: wallColor,
        roughness: 0.9,
        metalness: 0.1,
      });
      const roofMat = new THREE.MeshStandardMaterial({
        color: factionColor,
        roughness: isPlayerOwned ? 0.4 : 0.6,
        metalness: isPlayerOwned ? 0.5 : 0.2,
      });
      const flagMat = new THREE.MeshStandardMaterial({
        color: factionColor,
        roughness: 0.5,
        metalness: isPlayerOwned ? 0.4 : 0.2,
      });

      if (s.type === 'town') {
        const wallGeo = new THREE.CylinderGeometry(4.2, 4.8, 2.2, 8);
        const wallMesh = new THREE.Mesh(wallGeo, wallMat);
        wallMesh.position.y = 1.1;
        wallMesh.castShadow = true;
        group.add(wallMesh);

        const towerGeo = new THREE.CylinderGeometry(0.9, 1.1, 4.5, 6);
        const roofGeo = new THREE.ConeGeometry(1.3, 2.2, 6);

        const towerOffsets = [
          [-3, -3],
          [3, -3],
          [-3, 3],
          [3, 3],
        ];

        towerOffsets.forEach(([ox, oz]) => {
          const tower = new THREE.Mesh(towerGeo, wallMat);
          tower.position.set(ox, 2.25, oz);
          tower.castShadow = true;
          group.add(tower);

          const roof = new THREE.Mesh(roofGeo, roofMat);
          roof.position.set(ox, 5.0, oz);
          roof.castShadow = true;
          group.add(roof);
        });

        const keepGeo = new THREE.BoxGeometry(3.0, 5.5, 3.0);
        const keepMesh = new THREE.Mesh(keepGeo, wallMat);
        keepMesh.position.y = 2.75;
        keepMesh.castShadow = true;
        group.add(keepMesh);

        const poleGeo = new THREE.CylinderGeometry(0.08, 0.08, 4.0);
        const poleMat = new THREE.MeshStandardMaterial({ 
          color: isPlayerOwned ? 0xf59e0b : 0x475569, 
          metalness: 0.9 
        });
        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.set(0, 7.5, 0);
        group.add(pole);

        const flagGeo = new THREE.BoxGeometry(1.8, 0.9, 0.06);
        const flag = new THREE.Mesh(flagGeo, flagMat);
        flag.position.set(0.9, 8.8, 0);
        group.add(flag);
      } else {
        const keepGeo = new THREE.BoxGeometry(3.6, 4.0, 3.6);
        const keep = new THREE.Mesh(keepGeo, wallMat);
        keep.position.y = 2.0;
        group.add(keep);

        const battlements = new THREE.BoxGeometry(4.2, 0.8, 4.2);
        const batMesh = new THREE.Mesh(battlements, wallMat);
        batMesh.position.y = 4.2;
        group.add(batMesh);

        const flag = new THREE.Mesh(new THREE.ConeGeometry(1.6, 2.5, 4), roofMat);
        flag.position.set(0, 5.5, 0);
        group.add(flag);

        // Extra flag pole with pennant on castle keep
        const pole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.06, 0.06, 3.2),
          new THREE.MeshStandardMaterial({ color: isPlayerOwned ? 0xf59e0b : 0x475569, metalness: 0.9 })
        );
        pole.position.set(0, 7.0, 0);
        group.add(pole);

        const pennant = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.7, 0.05), flagMat);
        pennant.position.set(0.75, 7.8, 0);
        group.add(pennant);
      }

      const badge = createSettlementBadge(s, isPlayerOwned);
      group.add(badge);

      const hitBox = new THREE.Mesh(
        new THREE.CylinderGeometry(6.5, 6.5, 14.0, 8),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      hitBox.position.y = 7.0;
      hitBox.userData = { settlementId: s.id };
      group.add(hitBox);

      const groundY = getGroundHeight(s.x, s.z);
      group.position.set(s.x, groundY, s.z);

      settlementMeshMap.set(s.id, {
        group,
        roofMat,
        wallMat,
        flagMat,
        badgeSprite: badge,
        currentFactionId: s.factionId,
        isPlayerOwned,
      });

      return group;
    }

    Object.values(stateRef.current.settlements).forEach((s) => {
      const mesh = buildSettlementModel(s);
      settlementGroup.add(mesh);
    });

    // 5. Procedural Party Tokens
    const partyGroup = new THREE.Group();
    scene.add(partyGroup);
    const partyMeshMap = new Map<string, THREE.Group>();

    function buildPartyToken(p: Party): THREE.Group {
      const group = new THREE.Group();
      const isPlayer = p.type === 'player';
      // Player party proudly carries Jet Obsidian Black banner with gold crest
      const color = isPlayer ? '#0c0c0e' : p.bannerColor;

      const bannerMat = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.4,
        metalness: isPlayer ? 0.6 : 0.3,
      });

      const horseBody = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.7, 1.8),
        new THREE.MeshStandardMaterial({ 
          color: isPlayer ? 0x1f1f23 : 0x452b1f, 
          roughness: 0.8 
        })
      );
      horseBody.position.y = 1.0;
      group.add(horseBody);

      const rider = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.4, 1.0, 6),
        new THREE.MeshStandardMaterial({ 
          color: isPlayer ? 0x1e2024 : 0x334155, 
          metalness: 0.8, 
          roughness: 0.25 
        })
      );
      rider.position.set(0, 1.7, -0.1);
      group.add(rider);

      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 4.0),
        new THREE.MeshStandardMaterial({ 
          color: isPlayer ? 0xf59e0b : 0xe2e8f0, 
          metalness: 0.9 
        })
      );
      pole.position.set(0.5, 2.5, 0.4);
      group.add(pole);

      const pennant = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.8, 0.05), bannerMat);
      pennant.position.set(1.3, 4.0, 0.4);
      group.add(pennant);

      const shadow = new THREE.Mesh(
        new THREE.CircleGeometry(1.4, 12),
        new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.4 })
      );
      shadow.rotateX(-Math.PI / 2);
      shadow.position.y = 0.05;
      group.add(shadow);

      const hitBox = new THREE.Mesh(
        new THREE.CylinderGeometry(2.5, 2.5, 5.0, 6),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      hitBox.position.y = 2.5;
      hitBox.userData = { partyId: p.id };
      group.add(hitBox);

      return group;
    }

    // Destination Beacon Marker
    const destMarkerGeo = new THREE.RingGeometry(1.2, 1.8, 24);
    destMarkerGeo.rotateX(-Math.PI / 2);
    const destMarkerMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
    });
    const destMarker = new THREE.Mesh(destMarkerGeo, destMarkerMat);
    destMarker.visible = false;
    scene.add(destMarker);

    // 6. ONE-FINGER PAN & TWO-FINGER PINCH TO ZOOM
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let isDragging = false;
    let pointerDownPos = { x: 0, y: 0 };
    let initialPinchDist = 0;
    let initialPinchZoom = 1.1;

    // Mouse wheel zoom for desktop
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY * 0.0016;
      zoomLevelRef.current = Math.max(0.65, Math.min(3.4, zoomLevelRef.current + delta));
    };
    container.addEventListener('wheel', onWheel, { passive: false });

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if ('touches' in e && e.touches.length === 2) {
        // Two fingers -> Pinch to zoom!
        initialPinchDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        initialPinchZoom = zoomLevelRef.current;
        isDragging = true;
        return;
      }

      // One finger / Single mouse click -> Pan or Tap
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      pointerDownPos = { x: clientX, y: clientY };
      isDragging = false;
    };

    const onPointerMove = (e: MouseEvent | TouchEvent) => {
      // 1. Two-finger pinch-to-zoom
      if ('touches' in e && e.touches.length === 2 && initialPinchDist > 0) {
        const currentDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const scale = initialPinchDist / Math.max(1, currentDist);
        zoomLevelRef.current = Math.max(0.65, Math.min(3.4, initialPinchZoom * scale));
        isDragging = true;
        return;
      }

      // 2. Single-finger smooth map drag (Up, Down, Left, Right)
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const dx = clientX - pointerDownPos.x;
      const dy = clientY - pointerDownPos.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 7) {
        isDragging = true;
        isFollowingPlayerRef.current = false;
        setIsFollowing(false);

        // Continuous smooth pan without ANY jumping
        const panSpeed = 0.082 * zoomLevelRef.current;
        cameraTargetRef.current.x = Math.max(-125, Math.min(125, cameraTargetRef.current.x - dx * panSpeed));
        cameraTargetRef.current.z = Math.max(-135, Math.min(135, cameraTargetRef.current.z - dy * panSpeed));
        pointerDownPos = { x: clientX, y: clientY };
      }
    };

    const onPointerUp = (e: MouseEvent | TouchEvent) => {
      initialPinchDist = 0;
      if (isDragging) return;

      const rect = container.getBoundingClientRect();
      const clientX = 'changedTouches' in e ? e.changedTouches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'changedTouches' in e ? e.changedTouches[0].clientY : (e as MouseEvent).clientY;

      mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      // 1. Settlement Click -> March directly into settlement
      const settlementIntersects = raycaster.intersectObjects(settlementGroup.children, true);
      for (const hit of settlementIntersects) {
        let obj: THREE.Object3D | null = hit.object;
        while (obj && !obj.userData?.settlementId && obj.parent) {
          obj = obj.parent;
        }
        if (obj?.userData?.settlementId) {
          sfx.playClick();
          onSelectSettlement(obj.userData.settlementId);
          return;
        }
      }

      // 2. Party Click
      const partyIntersects = raycaster.intersectObjects(partyGroup.children, true);
      for (const hit of partyIntersects) {
        let obj: THREE.Object3D | null = hit.object;
        while (obj && !obj.userData?.partyId && obj.parent) {
          obj = obj.parent;
        }
        if (obj?.userData?.partyId && obj.userData.partyId !== 'player_party') {
          sfx.playClick();
          onSelectParty(obj.userData.partyId);
          return;
        }
      }

      // 3. Terrain Click -> March party there
      const terrainIntersects = raycaster.intersectObject(terrainMesh);
      if (terrainIntersects.length > 0) {
        const pt = terrainIntersects[0].point;
        sfx.playTroopMarch();
        onSetDestination(pt.x, pt.z);
      }
    };

    container.addEventListener('mousedown', onPointerDown);
    container.addEventListener('mousemove', onPointerMove);
    container.addEventListener('mouseup', onPointerUp);
    container.addEventListener('touchstart', onPointerDown, { passive: true });
    container.addEventListener('touchmove', onPointerMove, { passive: true });
    container.addEventListener('touchend', onPointerUp, { passive: true });

    // 7. Render Loop with Continuous Smooth Damping
    let animFrameId = 0;
    let lastTime = performance.now();

    const tick = () => {
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      // Dynamically sync settlement meshes with ownership (captured castles turn Obsidian Black instantly)
      const currentSettlements = stateRef.current.settlements;
      Object.values(currentSettlements).forEach((s) => {
        const rec = settlementMeshMap.get(s.id);
        const isPlayerOwned = s.factionId === 'player_kingdom' || s.lordOwnerId === 'player';
        const hasSiege = !!s.siegeCamp;
        if (rec && (rec.currentFactionId !== s.factionId || rec.isPlayerOwned !== isPlayerOwned || rec.hasSiegeCamp !== hasSiege)) {
          rec.currentFactionId = s.factionId;
          rec.isPlayerOwned = isPlayerOwned;
          rec.hasSiegeCamp = hasSiege;
          const faction = stateRef.current.factions[s.factionId];
          const factionColor = isPlayerOwned ? '#0c0c0e' : (faction ? faction.color : '#ffffff');
          const wallColor = isPlayerOwned 
            ? 0x24262b 
            : (s.factionId === 'saruq' ? 0xd8b589 : s.factionId === 'frostgard' ? 0x94a3b8 : 0x6e7681);

          rec.roofMat.color.set(factionColor);
          rec.flagMat.color.set(factionColor);
          rec.wallMat.color.setHex(wallColor);

          // Re-generate floating badge
          rec.group.remove(rec.badgeSprite);
          rec.badgeSprite.material.dispose();
          const newBadge = createSettlementBadge(s, isPlayerOwned);
          rec.badgeSprite = newBadge;
          rec.group.add(newBadge);
        }
      });

      // Update parties
      const currentParties = stateRef.current.parties;
      const seenPartyIds = new Set<string>();

      Object.values(currentParties).forEach((p) => {
        seenPartyIds.add(p.id);
        let mesh = partyMeshMap.get(p.id);
        if (!mesh) {
          mesh = buildPartyToken(p);
          partyGroup.add(mesh);
          partyMeshMap.set(p.id, mesh);
        }

        const targetY = getGroundHeight(p.x, p.z);
        mesh.position.x = THREE.MathUtils.damp(mesh.position.x, p.x, 8, dt);
        mesh.position.y = THREE.MathUtils.damp(mesh.position.y, targetY, 8, dt);
        mesh.position.z = THREE.MathUtils.damp(mesh.position.z, p.z, 8, dt);

        if (p.targetX !== undefined && p.targetZ !== undefined) {
          const angle = Math.atan2(p.targetX - p.x, p.targetZ - p.z);
          mesh.rotation.y = THREE.MathUtils.damp(mesh.rotation.y, angle, 6, dt);
        }
      });

      partyMeshMap.forEach((mesh, id) => {
        if (!seenPartyIds.has(id)) {
          partyGroup.remove(mesh);
          partyMeshMap.delete(id);
        }
      });

      // Destination Marker
      const playerParty = currentParties['player_party'];
      if (playerParty && playerParty.targetX !== undefined && playerParty.targetZ !== undefined) {
        destMarker.visible = true;
        const groundY = getGroundHeight(playerParty.targetX, playerParty.targetZ);
        destMarker.position.set(playerParty.targetX, groundY + 0.15, playerParty.targetZ);
        destMarker.rotation.z += dt * 1.5;
      } else {
        destMarker.visible = false;
      }

      // Smooth camera tracking: if following player, track player party smoothly
      if (isFollowingPlayerRef.current && playerParty) {
        cameraTargetRef.current.x = THREE.MathUtils.damp(cameraTargetRef.current.x, playerParty.x, 6, dt);
        cameraTargetRef.current.z = THREE.MathUtils.damp(cameraTargetRef.current.z, playerParty.z, 6, dt);
      }

      // Fixed classical RTS 45° perspective (North is always strictly Up)
      const zoom = zoomLevelRef.current;
      const altitudeY = 35 * zoom;
      const depthZ = 24 * zoom;

      const focusX = cameraTargetRef.current.x;
      const focusZ = cameraTargetRef.current.z;
      const groundY = getGroundHeight(focusX, focusZ);

      const targetCamX = focusX;
      const targetCamY = groundY + altitudeY;
      const targetCamZ = focusZ + depthZ;

      camera.position.x = THREE.MathUtils.damp(camera.position.x, targetCamX, 6, dt);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, targetCamY, 6, dt);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, targetCamZ, 6, dt);
      camera.lookAt(focusX, groundY + 1.2, focusZ);

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        const gl = renderer.getContext() as WebGL2RenderingContext;
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          const status = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (status === gl.UNSIGNALED) {
            setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            animFrameId = window.setTimeout(tick, 70);
          }
        };
        setTimeout(poll, 5);
      } else {
        animFrameId = requestAnimationFrame(tick);
      }
    };

    animFrameId = requestAnimationFrame(tick);

    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animFrameId);
      clearTimeout(animFrameId);
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('wheel', onWheel);
      container.removeEventListener('mousedown', onPointerDown);
      container.removeEventListener('mousemove', onPointerMove);
      container.removeEventListener('mouseup', onPointerUp);
      container.removeEventListener('touchstart', onPointerDown);
      container.removeEventListener('touchmove', onPointerMove);
      container.removeEventListener('touchend', onPointerUp);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden select-none touch-none">
      {/* Three.js Canvas Container */}
      <div
        ref={containerRef}
        className="w-full h-full cursor-grab active:cursor-grabbing touch-none"
      />

      {/* Target Destination notification banner at top */}
      {gameState.targetDestinationName && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 pointer-events-none animate-fade-in">
          <div className="bg-stone-900/90 border border-amber-500/60 rounded-full px-4 py-1.5 flex items-center gap-2 shadow-xl text-xs font-semibold text-amber-200">
            <Compass className="w-4 h-4 text-amber-400 animate-spin" />
            <span>بەرەو {gameState.targetDestinationName} دەڕۆیت... کە گەیشتی ڕاستەوخۆ دەچیتە ژوورەوە</span>
          </div>
        </div>
      )}
    </div>
  );
};
