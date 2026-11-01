/**
 * 3D Overland World Map Component
 * - Full Zoom In / Zoom Out and Continental Bird's-Eye Overview
 * - Mouse wheel, touch pinch, and on-screen tactile zoom buttons
 * - 3D Floating settlement nameplates & banners (visible from far away)
 * - March destination beacon & trajectory
 * - Smooth damped camera and click-to-march directly into settlements
 */
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GameState, Party, Settlement } from '../types/game';
import { sfx } from '../audio/soundFx';
import { ZoomIn, ZoomOut, MapPin, Compass, Eye } from 'lucide-react';

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

  // Zoom level ref: 0.7 (close tactical) to 3.5 (entire board continent overview)
  const zoomLevelRef = useRef<number>(1.1);
  const [zoomDisplay, setZoomDisplay] = useState<number>(1.1);

  // Pan offset ref for free camera inspection
  const panOffsetRef = useRef<{ x: number; z: number }>({ x: 0, z: 0 });
  const isFreeCamRef = useRef<boolean>(false);

  // Expose zoom controls to parent or local buttons
  const handleZoom = (delta: number) => {
    sfx.playClick();
    const newZoom = Math.max(0.6, Math.min(3.6, zoomLevelRef.current + delta));
    zoomLevelRef.current = newZoom;
    setZoomDisplay(newZoom);
  };

  const handleResetToPlayer = () => {
    sfx.playClick();
    isFreeCamRef.current = false;
    panOffsetRef.current = { x: 0, z: 0 };
    zoomLevelRef.current = 1.1;
    setZoomDisplay(1.1);
  };

  const handleFullMapOverview = () => {
    sfx.playClick();
    isFreeCamRef.current = true;
    panOffsetRef.current = { x: 0, z: 0 };
    zoomLevelRef.current = 3.2; // High altitude view of entire board
    setZoomDisplay(3.2);
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

    // 1. Scene & Renderer setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x11161d);
    scene.fog = new THREE.FogExp2(0x161e28, 0.0055);

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.5,
      1200
    );
    camera.position.set(-25, 65, 55);

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
        // Eisenreich iron mountains
        h = Math.sin(x * 0.08) * Math.cos(z * 0.08) * 10 + Math.sin(x * 0.15) * 4.5;
        h = Math.max(0, h * 1.4);
      } else if (z > 20) {
        // Desert rolling dunes
        h = Math.sin(x * 0.05 + z * 0.08) * 3.2 + Math.sin(z * 0.12) * 1.6;
      } else {
        // Valoria fertile gentle hills
        h = Math.sin(x * 0.04) * Math.cos(z * 0.04) * 2.8;
      }

      posAttr.setY(i, h);

      // Biome vertex coloring
      if (z > 25) {
        colorHelper.setRGB(0.85, 0.72, 0.45); // Desert gold sand
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

    // Helper: Create 3D floating canvas text badge for cities/castles
    function createSettlementBadge(s: Settlement): THREE.Sprite {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 96;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const faction = stateRef.current.factions[s.factionId];
        const bgColor = faction ? faction.color : '#334155';

        // Rounded pill background
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.beginPath();
        ctx.roundRect(6, 6, 244, 84, 18);
        ctx.fill();

        ctx.strokeStyle = bgColor;
        ctx.lineWidth = 4;
        ctx.stroke();

        // City Icon / Type
        ctx.fillStyle = bgColor;
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(s.type === 'town' ? '🏛️ ' + s.nameKu : '🏰 ' + s.nameKu, 128, 42);

        // Subtitle (Faction name / type)
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
        color: s.factionId === 'saruq' ? 0xd8b589 : 0x6e7681,
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

      // Add floating 3D Name Badge
      const badge = createSettlementBadge(s);
      group.add(badge);

      // HitBox for Raycasting
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

    // Target Destination Marker (Glowing Ring)
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

    // 6. Interaction, Drag Pan & Mouse Wheel Zoom
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let isDragging = false;
    let pointerDownPos = { x: 0, y: 0 };
    let initialPinchDist = 0;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY * 0.0018;
      const nextZoom = Math.max(0.6, Math.min(3.6, zoomLevelRef.current + delta));
      zoomLevelRef.current = nextZoom;
      setZoomDisplay(nextZoom);
    };

    container.addEventListener('wheel', onWheel, { passive: false });

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if ('touches' in e && e.touches.length === 2) {
        initialPinchDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        return;
      }
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      pointerDownPos = { x: clientX, y: clientY };
      isDragging = false;
    };

    const onPointerMove = (e: MouseEvent | TouchEvent) => {
      // Touch pinch zoom
      if ('touches' in e && e.touches.length === 2 && initialPinchDist > 0) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const pinchDelta = (initialPinchDist - dist) * 0.005;
        const nextZoom = Math.max(0.6, Math.min(3.6, zoomLevelRef.current + pinchDelta));
        zoomLevelRef.current = nextZoom;
        setZoomDisplay(nextZoom);
        initialPinchDist = dist;
        isDragging = true;
        return;
      }

      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const dx = clientX - pointerDownPos.x;
      const dy = clientY - pointerDownPos.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 10) {
        isDragging = true;
        // Pan camera if dragged
        isFreeCamRef.current = true;
        panOffsetRef.current.x -= dx * 0.08 * zoomLevelRef.current;
        panOffsetRef.current.z -= dy * 0.08 * zoomLevelRef.current;
        // Clamp free cam within world bounds
        panOffsetRef.current.x = Math.max(-65, Math.min(65, panOffsetRef.current.x));
        panOffsetRef.current.z = Math.max(-65, Math.min(65, panOffsetRef.current.z));
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

      // 1. Settlement Click
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

    // 7. Render Loop with Adaptive Zoom and Camera Tracking
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

      // Update Destination Marker
      const playerParty = currentParties['player_party'];
      if (playerParty && playerParty.targetX !== undefined && playerParty.targetZ !== undefined) {
        destMarker.visible = true;
        const groundY = getGroundHeight(playerParty.targetX, playerParty.targetZ);
        destMarker.position.set(playerParty.targetX, groundY + 0.15, playerParty.targetZ);
        destMarker.rotation.z += dt * 1.5;
      } else {
        destMarker.visible = false;
      }

      // Smooth Camera Positioning using Zoom Factor
      const zoom = zoomLevelRef.current;
      const baseY = 36 * zoom;
      const baseZOffset = 26 * zoom;

      let targetFocusX = 0;
      let targetFocusZ = 0;

      if (!isFreeCamRef.current && playerParty) {
        targetFocusX = playerParty.x;
        targetFocusZ = playerParty.z;
      } else {
        targetFocusX = panOffsetRef.current.x;
        targetFocusZ = panOffsetRef.current.z;
      }

      const camTargetX = targetFocusX;
      const camTargetZ = targetFocusZ + baseZOffset;
      const groundY = getGroundHeight(targetFocusX, targetFocusZ);
      const camTargetY = groundY + baseY;

      camera.position.x = THREE.MathUtils.damp(camera.position.x, camTargetX, 5, dt);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, camTargetY, 5, dt);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, camTargetZ, 5, dt);
      camera.lookAt(targetFocusX, groundY + 1.5, targetFocusZ);

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
    <div className="absolute inset-0 w-full h-full overflow-hidden select-none">
      {/* Three.js Canvas Container */}
      <div
        ref={containerRef}
        className="w-full h-full cursor-crosshair"
      />

      {/* Floating Tactical Zoom & Map Navigation Dock (Right side) */}
      <div className="absolute top-20 right-4 z-20 flex flex-col gap-2 pointer-events-auto">
        {/* Zoom In Button */}
        <button
          onClick={() => handleZoom(-0.35)}
          className="w-10 h-10 rounded-xl bg-stone-900/90 hover:bg-stone-800 border border-stone-700/80 text-amber-300 flex items-center justify-center shadow-2xl transition hover:scale-105 active:scale-95"
          title="نزیککردنەوە (Zoom In)"
        >
          <ZoomIn className="w-5 h-5" />
        </button>

        {/* Zoom Out Button */}
        <button
          onClick={() => handleZoom(0.35)}
          className="w-10 h-10 rounded-xl bg-stone-900/90 hover:bg-stone-800 border border-stone-700/80 text-amber-300 flex items-center justify-center shadow-2xl transition hover:scale-105 active:scale-95"
          title="دوورخستنەوە (Zoom Out)"
        >
          <ZoomOut className="w-5 h-5" />
        </button>

        {/* Full Continent Board Overview */}
        <button
          onClick={handleFullMapOverview}
          className="px-2.5 py-2 rounded-xl bg-purple-950/90 hover:bg-purple-900 border border-purple-500/60 text-purple-200 text-[11px] font-bold flex flex-col items-center gap-1 shadow-2xl transition hover:scale-105 active:scale-95"
          title="بینینی تەواوی نەخشەی جیهان (Full Realm View)"
        >
          <Eye className="w-4 h-4 text-purple-300" />
          <span>تەواوی ماپ</span>
        </button>

        {/* Center on Character Button */}
        <button
          onClick={handleResetToPlayer}
          className="px-2.5 py-2 rounded-xl bg-stone-900/90 hover:bg-stone-800 border border-stone-700/80 text-emerald-300 text-[11px] font-bold flex flex-col items-center gap-1 shadow-2xl transition hover:scale-105 active:scale-95"
          title="گەڕانەوە بۆ سەربازەکانت (Focus Character)"
        >
          <MapPin className="w-4 h-4 text-emerald-400" />
          <span>کارەکتەر</span>
        </button>
      </div>

      {/* Marching status notification pill at top-center when party has a target */}
      {gameState.targetDestinationName && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 pointer-events-none animate-fade-in">
          <div className="bg-stone-900/90 border border-amber-500/60 rounded-full px-4 py-1.5 flex items-center gap-2 shadow-xl text-xs font-semibold text-amber-200">
            <Compass className="w-4 h-4 text-amber-400 animate-spin" />
            <span>بەرەو {gameState.targetDestinationName} بەڕێکەوتوویت... کە گەیشتی ڕاستەوخۆ دەچیتە ژوورەوە</span>
          </div>
        </div>
      )}
    </div>
  );
};
