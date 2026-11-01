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

interface WorldMap3DProps {
  gameState: GameState;
  onSelectSettlement: (settlementId: string) => void;
  onSelectParty: (partyId: string) => void;
  onSetDestination: (x: number, z: number, targetSettlementId?: string, targetPartyId?: string) => void;
}

export const WorldMap3D: React.FC<WorldMap3DProps> = ({
  gameState,
  onSelectSettlement,
  onSelectParty,
  onSetDestination,
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

  // Zoom In / Out Buttons for Desktop Users
  const handleZoom = (delta: number) => {
    sfx.playClick();
    zoomLevelRef.current = Math.max(0.65, Math.min(3.4, zoomLevelRef.current + delta));
  };

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

    // 1. Scene & Camera Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x11161d);
    scene.fog = new THREE.FogExp2(0x161e28, 0.0055);

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
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    // Environment map
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 2. Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0xd4e5f7, 0x3d352e, 1.25);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xfff3db, 2.2);
    dirLight.position.set(70, 120, 50);
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

    // 3. Terrain Generation (Procedural elevation & biome coloring)
    const terrainSize = 260;
    const segments = 128;
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
        h = Math.sin(x * 0.08) * Math.cos(z * 0.08) * 10 + Math.sin(x * 0.15) * 4.5;
        h = Math.max(0, h * 1.4);
      } else if (z > 20) {
        h = Math.sin(x * 0.05 + z * 0.08) * 3.2 + Math.sin(z * 0.12) * 1.6;
      } else {
        h = Math.sin(x * 0.04) * Math.cos(z * 0.04) * 2.8;
      }

      posAttr.setY(i, h);

      if (z > 25) {
        colorHelper.setRGB(0.85, 0.72, 0.45); // Desert sand
      } else if (z < -50) {
        colorHelper.setRGB(0.72, 0.78, 0.85); // Frostgard snow
      } else if (h > 6.5) {
        colorHelper.setRGB(0.55, 0.52, 0.5); // Mountain peaks
      } else if (x < -20 && z > 0) {
        colorHelper.setRGB(0.2, 0.42, 0.22); // Forest green
      } else if (x > -15 && x < 5 && z > -5 && z < 15) {
        colorHelper.setRGB(0.35, 0.5, 0.38); // Coast
      } else {
        colorHelper.setRGB(0.32, 0.48, 0.26); // Fertile plains
      }
      colors.push(colorHelper.r, colorHelper.g, colorHelper.b);
    }

    terrainGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    terrainGeo.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.85,
      metalness: 0.05,
      flatShading: true,
    });
    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.receiveShadow = !isSoftwareGl;
    scene.add(terrainMesh);

    function getGroundHeight(x: number, z: number): number {
      if (x > 15 && z < -5) {
        const val = Math.sin(x * 0.08) * Math.cos(z * 0.08) * 10 + Math.sin(x * 0.15) * 4.5;
        return Math.max(0, val * 1.4);
      }
      if (z > 20) {
        return Math.sin(x * 0.05 + z * 0.08) * 3.2 + Math.sin(z * 0.12) * 1.6;
      }
      return Math.sin(x * 0.04) * Math.cos(z * 0.04) * 2.8;
    }

    // 3D floating canvas text badge for cities/castles
    function createSettlementBadge(s: Settlement): THREE.Sprite {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 96;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const faction = stateRef.current.factions[s.factionId];
        const bgColor = faction ? faction.color : '#334155';

        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.beginPath();
        ctx.roundRect(6, 6, 244, 84, 18);
        ctx.fill();

        ctx.strokeStyle = bgColor;
        ctx.lineWidth = 4;
        ctx.stroke();

        ctx.fillStyle = bgColor;
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(s.type === 'town' ? '🏛️ ' + s.nameKu : '🏰 ' + s.nameKu, 128, 42);

        ctx.fillStyle = '#cbd5e1';
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText(s.type === 'town' ? 'شار' : 'قەڵا', 128, 72);
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

    // 4. Procedural Settlements
    const settlementGroup = new THREE.Group();
    scene.add(settlementGroup);

    function buildSettlementModel(s: Settlement): THREE.Group {
      const group = new THREE.Group();
      const faction = stateRef.current.factions[s.factionId];
      const factionColor = faction ? faction.color : '#ffffff';

      const wallMat = new THREE.MeshStandardMaterial({
        color: s.factionId === 'saruq' ? 0xd8b589 : s.factionId === 'frostgard' ? 0x94a3b8 : 0x6e7681,
        roughness: 0.9,
        metalness: 0.1,
      });
      const roofMat = new THREE.MeshStandardMaterial({
        color: factionColor,
        roughness: 0.6,
        metalness: 0.2,
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
        const poleMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8 });
        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.set(0, 7.5, 0);
        group.add(pole);

        const flagGeo = new THREE.BoxGeometry(1.8, 0.9, 0.06);
        const flag = new THREE.Mesh(flagGeo, roofMat);
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
      }

      const badge = createSettlementBadge(s);
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
      const color = isPlayer ? 0x8b5cf6 : new THREE.Color(p.bannerColor);

      const bannerMat = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.4,
        metalness: 0.3,
      });

      const horseBody = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.7, 1.8),
        new THREE.MeshStandardMaterial({ color: 0x452b1f, roughness: 0.8 })
      );
      horseBody.position.y = 1.0;
      group.add(horseBody);

      const rider = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.4, 1.0, 6),
        new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7, roughness: 0.3 })
      );
      rider.position.set(0, 1.7, -0.1);
      group.add(rider);

      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 4.0),
        new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.8 })
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
        cameraTargetRef.current.x = Math.max(-75, Math.min(75, cameraTargetRef.current.x - dx * panSpeed));
        cameraTargetRef.current.z = Math.max(-75, Math.min(75, cameraTargetRef.current.z - dy * panSpeed));
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

      {/* Clean, Non-Intrusive Navigation Pills in Top-Right */}
      <div className="absolute top-16 right-3 sm:right-6 z-20 flex flex-col items-end gap-2 pointer-events-auto">
        <div className="flex items-center gap-1.5 bg-stone-900/90 border border-stone-800 rounded-2xl p-1 shadow-2xl backdrop-blur-none">
          {/* Zoom In button */}
          <button
            onClick={() => handleZoom(-0.35)}
            className="w-8 h-8 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-300 flex items-center justify-center transition active:scale-95"
            title="نزیککردنەوە"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          {/* Zoom Out button */}
          <button
            onClick={() => handleZoom(0.35)}
            className="w-8 h-8 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-300 flex items-center justify-center transition active:scale-95"
            title="دوورخستنەوە"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          {/* Full Continent Overview */}
          <button
            onClick={handleFullMapOverview}
            className="px-3 py-1.5 rounded-xl bg-purple-950/80 hover:bg-purple-900 text-purple-200 text-xs font-bold flex items-center gap-1.5 transition active:scale-95"
            title="بینینی تەواوی ماپ"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">تەواوی ماپ</span>
          </button>

          {/* Center Character Focus */}
          <button
            onClick={handleFocusPlayer}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95 ${
              isFollowing
                ? 'bg-emerald-600 text-white'
                : 'bg-stone-800 text-stone-300 hover:text-emerald-300'
            }`}
            title="گەڕانەوە بۆ سەر کارەکتەر"
          >
            <MapPin className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">کارەکتەر</span>
          </button>
        </div>
      </div>

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
