import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  CameraMode,
  GameScreenState,
  GameState,
  TelemetrySnapshot,
  TimeOfDay,
} from './types';
import { getActiveStageId, getContractById } from './rules';
import { createProceduralTextures, ProceduralTextureSet } from './textures';
import {
  BuildingStageMeshes,
  createConstructionBuildingVisuals,
  createDebrisPile,
  createExcavatorModel,
  createMixerTruckModel,
  createNeighborhoodHouse,
  createSiteTrailerModel,
  createTowerCraneModel,
  createTrafficCar,
  createWorkerModel,
  ExcavatorRig,
  MixerTruckRig,
  TrafficCarRig,
  WorkerRig,
} from './models';
import { soundEngine } from './audio';

// Module-scope pre-allocated scratch math helpers (zero GC in render loop)
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _mat4 = new THREE.Matrix4();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3();
const _color = new THREE.Color();

interface ParticleSlot {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  size: number;
}

const MAX_PARTICLES = 140;

export interface SceneCallbacks {
  onInteractTarget: (type: 'debris' | 'excavation' | 'site', index?: number) => void;
  onTelemetry: (telemetry: TelemetrySnapshot) => void;
  onFuelBurn: (amount: number) => void;
}

export class SceneController {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private textures: ProceduralTextureSet;
  private isSoftwareGl: boolean;
  private callbacks: SceneCallbacks;

  private sunLight!: THREE.DirectionalLight;
  private hemiLight!: THREE.HemisphereLight;
  private rimLight!: THREE.DirectionalLight;
  private fog!: THREE.FogExp2;

  private excavator!: ExcavatorRig;
  private mixerTruck!: MixerTruckRig;
  private towerCrane!: { root: THREE.Group; jibGroup: THREE.Group };
  private buildingVisuals!: BuildingStageMeshes;
  private currentContractId = 'oakridge_bungalow';

  private debrisMeshes: THREE.Group[] = [];
  private soilCellMeshes: THREE.Mesh[] = [];
  private soilHighlightMeshes: THREE.Mesh[] = [];
  private siteClickProxy!: THREE.Mesh;
  private interactables: THREE.Object3D[] = [];

  private workerRigs: Map<string, WorkerRig> = new Map();
  private trafficCars: TrafficCarRig[] = [];

  // Particle InstancedMesh pool
  private particleMesh!: THREE.InstancedMesh;
  private particles: ParticleSlot[] = [];
  private particleCursor = 0;

  // Input & Driving state
  private keys = new Set<string>();
  private virtualMove = { forward: 0, turn: 0 };
  private excSpeed = 0;
  private excHeading = Math.PI * 0.15;
  private turretAngle = 0;
  private digAnimTimer = 0;
  private pourAnimTimer = 0;
  private cameraTrauma = 0;

  // Game & Camera state
  private screenState: GameScreenState = 'title';
  private cameraMode: CameraMode = 'orbit';
  private timeOfDay: TimeOfDay = 'day';
  private latestGameState: GameState;
  private cameraPresetTarget = new THREE.Vector3(0, 1.5, 0);
  private cameraPresetPos = new THREE.Vector3(24, 19, 25);
  private cameraTransitioning = false;
  private flyoverAngle = 0.65;

  // Raycasting
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private pointerDownPos = { x: 0, y: 0 };

  // Loop & timing
  private frameId = 0;
  private disposed = false;
  private lastTime = performance.now();
  private telemetryTimer = 0;
  private resizeObserver: ResizeObserver;

  constructor(container: HTMLElement, initialState: GameState, callbacks: SceneCallbacks) {
    this.container = container;
    this.latestGameState = initialState;
    this.callbacks = callbacks;
    this.currentContractId = initialState.site.contractId;

    // Software WebGL detection from GPU renderer string
    this.isSoftwareGl = (() => {
      const probeCanvas = document.createElement('canvas');
      const gl = probeCanvas.getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const width = Math.max(container.clientWidth, 320);
    const height = Math.max(container.clientHeight, 240);
    this.renderer.setSize(width, height);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.fog = new THREE.FogExp2(0xcde2f5, 0.0052);
    this.scene.fog = this.fog;
    this.scene.background = new THREE.Color(0xcde2f5);

    // Mandatory studio environment reflection (RoomEnvironment)
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    this.camera = new THREE.PerspectiveCamera(48, width / height, 0.3, 360);
    this.camera.position.set(22, 18.5, 27);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = !this.isSoftwareGl;
    this.controls.dampingFactor = 0.07;
    this.controls.maxPolarAngle = Math.PI * 0.46;
    this.controls.minPolarAngle = 0.2;
    this.controls.minDistance = 10;
    this.controls.maxDistance = 68;
    this.controls.target.set(1.2, 2.2, -1.2);
    this.controls.addEventListener('start', () => {
      this.cameraTransitioning = false;
    });

    this.textures = createProceduralTextures(this.renderer);

    this.setupLighting();
    this.buildNeighborhoodWorld();
    this.buildActiveConstructionSite();
    this.setupParticlePool();
    this.applyGameState(initialState);
    this.applyTimeOfDay('day');

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.bindEvents();

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(container);

    this.lastTime = performance.now();
    this.tick();
  }

  private setupLighting(): void {
    this.hemiLight = new THREE.HemisphereLight(0xb5dcff, 0x5d6e4c, 0.72);
    this.hemiLight.position.set(0, 60, 0);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff1d6, 2.15);
    this.sunLight.position.set(34, 48, 28);
    this.sunLight.castShadow = !this.isSoftwareGl;
    this.sunLight.shadow.mapSize.set(1024, 1024);
    this.sunLight.shadow.camera.near = 5;
    this.sunLight.shadow.camera.far = 140;
    const d = 38;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.025;
    this.scene.add(this.sunLight);

    this.rimLight = new THREE.DirectionalLight(0x9ec5fe, 0.55);
    this.rimLight.position.set(-32, 22, -28);
    this.scene.add(this.rimLight);
  }

  private buildNeighborhoodWorld(): void {
    // Extended outdoor rolling grass terrain (no floating void box)
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(340, 340),
      new THREE.MeshStandardMaterial({ map: this.textures.grass, color: 0xffffff, roughness: 0.92 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.04;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Distant perimeter hills so horizon feels natural and grounded
    const hillMat = new THREE.MeshStandardMaterial({ color: 0x5c8c46, roughness: 0.95 });
    const hillPositions: [number, number, number, number][] = [
      [-85, -75, 42, 16],
      [-25, -92, 48, 19],
      [45, -88, 46, 17],
      [96, -45, 38, 14],
      [-98, 20, 40, 15],
      [88, 72, 44, 16],
      [-55, 88, 42, 14],
    ];
    for (const [hx, hz, rad, hh] of hillPositions) {
      const hill = new THREE.Mesh(new THREE.ConeGeometry(rad, hh, 7), hillMat);
      hill.position.set(hx, hh * 0.42, hz);
      this.scene.add(hill);
    }

    // Main East-West Avenue (Z = 18) and Cross Street (X = -24)
    const roadMat = new THREE.MeshStandardMaterial({ map: this.textures.asphalt, color: 0xffffff, roughness: 0.84 });
    const mainRoad = new THREE.Mesh(new THREE.PlaneGeometry(8.5, 220), roadMat);
    mainRoad.rotation.x = -Math.PI / 2;
    mainRoad.rotation.z = Math.PI / 2;
    mainRoad.position.set(0, 0.01, 18.5);
    mainRoad.receiveShadow = true;
    this.scene.add(mainRoad);

    const crossRoad = new THREE.Mesh(new THREE.PlaneGeometry(7.8, 220), roadMat);
    crossRoad.rotation.x = -Math.PI / 2;
    crossRoad.position.set(-24, 0.015, 0);
    crossRoad.receiveShadow = true;
    this.scene.add(crossRoad);

    // Concrete Sidewalks framing the construction block (split for driveway entrance)
    const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0xc2c7ce, roughness: 0.85 });
    const swLeft = new THREE.Mesh(new THREE.BoxGeometry(14.5, 0.14, 2.2), sidewalkMat);
    swLeft.position.set(-11.2, 0.05, 13.4);
    swLeft.receiveShadow = true;
    this.scene.add(swLeft);

    const swRight = new THREE.Mesh(new THREE.BoxGeometry(14.5, 0.14, 2.2), sidewalkMat);
    swRight.position.set(11.2, 0.05, 13.4);
    swRight.receiveShadow = true;
    this.scene.add(swRight);

    // Concrete Driveway Apron connecting avenue to site entrance
    const apron = new THREE.Mesh(
      new THREE.BoxGeometry(8.2, 0.08, 3.2),
      new THREE.MeshStandardMaterial({ map: this.textures.concrete, color: 0xd0d5dc, roughness: 0.86 }),
    );
    apron.position.set(0, 0.03, 13.1);
    apron.receiveShadow = true;
    this.scene.add(apron);

    // Active Construction Plot Compacted Dirt Pad (26m x 24m)
    const dirtPad = new THREE.Mesh(
      new THREE.PlaneGeometry(28, 24),
      new THREE.MeshStandardMaterial({ map: this.textures.dirt, color: 0xffffff, roughness: 0.94 }),
    );
    dirtPad.rotation.x = -Math.PI / 2;
    dirtPad.position.set(0, 0.02, 0);
    dirtPad.receiveShadow = true;
    this.scene.add(dirtPad);

    // Site Safety Perimeter Fence & Hazard Posts (leaving open access driveway in front)
    const postMat = new THREE.MeshStandardMaterial({ color: 0x374151, roughness: 0.6, metalness: 0.4 });
    const railMat = new THREE.MeshStandardMaterial({ map: this.textures.hazard, roughness: 0.55 });
    const fenceSegments: [number, number, number, number][] = [
      [-14, -12, 28, 0], // Back fence
      [-14, -12, 24, Math.PI / 2], // Left fence
      [14, -12, 24, Math.PI / 2], // Right fence
      [-14, 12, 8.5, 0], // Front-left fence
      [5.5, 12, 8.5, 0], // Front-right fence
    ];
    for (const [fx, fz, len, rotY] of fenceSegments) {
      const group = new THREE.Group();
      group.position.set(fx, 0, fz);
      group.rotation.y = rotY;
      const rail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.24, 0.12), railMat);
      rail.position.set(len / 2, 0.92, 0);
      group.add(rail);
      const count = Math.max(2, Math.floor(len / 3.5));
      for (let i = 0; i <= count; i++) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.15, 0.14), postMat);
        post.position.set((i / count) * len, 0.575, 0);
        group.add(post);
      }
      this.scene.add(group);
    }

    // Company HQ Site Trailer (left edge of lot)
    const trailer = createSiteTrailerModel(this.textures);
    trailer.position.set(-10.5, 0, -7.8);
    trailer.rotation.y = Math.PI * 0.5;
    this.scene.add(trailer);

    // Tall Iconic Tower Crane Landmark (framed in upper-right vista behind the lot)
    this.towerCrane = createTowerCraneModel();
    this.towerCrane.root.position.set(13.5, 0, -14.2);
    this.towerCrane.jibGroup.rotation.y = -0.82;
    this.scene.add(this.towerCrane.root);

    // Neighborhood Houses across the street and adjacent blocks
    const houses: { x: number; z: number; rot: number; wall: number; roof: number; floors: number }[] = [
      { x: -12, z: 30, rot: Math.PI, wall: 0xf4ede1, roof: 0x8b3a2b, floors: 1 },
      { x: 2, z: 31, rot: Math.PI, wall: 0xe6eff4, roof: 0x3b4e63, floors: 2 },
      { x: 16, z: 30, rot: Math.PI, wall: 0xf7e7d3, roof: 0x6b4226, floors: 1 },
      { x: 26, z: 2, rot: -Math.PI / 2, wall: 0xebeef2, roof: 0x475569, floors: 2 },
      { x: -37, z: -4, rot: Math.PI / 2, wall: 0xf2e4d5, roof: 0x92400e, floors: 1 },
      { x: -37, z: 10, rot: Math.PI / 2, wall: 0xe4edf2, roof: 0x334155, floors: 2 },
      { x: -4, z: -26, rot: 0, wall: 0xf0e9dc, roof: 0x7c2d12, floors: 1 },
      { x: 32, z: -24, rot: -0.4, wall: 0xdde5ec, roof: 0x1e293b, floors: 3 },
    ];
    for (const h of houses) {
      const house = createNeighborhoodHouse(h.wall, h.roof, 8.6, 7.2, h.floors);
      house.position.set(h.x, 0, h.z);
      house.rotation.y = h.rot;
      this.scene.add(house);
    }

    // Instanced Multi-Part Stylized Trees across the neighborhood park & perimeter (>35 trees)
    const treeCoords: [number, number][] = [];
    for (let i = 0; i < 42; i++) {
      const angle = (i / 42) * Math.PI * 2;
      const dist = 34 + (i % 4) * 9.5;
      const tx = Math.cos(angle) * dist + ((i * 13) % 7) - 3;
      const tz = Math.sin(angle) * dist + ((i * 17) % 7) - 3;
      // Avoid roads and center lot
      if (Math.abs(tz - 18.5) < 6.5 || Math.abs(tx + 24) < 6.5) continue;
      if (Math.abs(tx) < 20 && Math.abs(tz) < 18) continue;
      treeCoords.push([tx, tz]);
    }
    // Park grove near front-right corner
    treeCoords.push([23, 12], [27, 13], [24, 9], [19, 10], [-19, 11], [-18, -14], [12, -20]);

    const trunkGeo = new THREE.CylinderGeometry(0.22, 0.34, 2.2, 7);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6c4829, roughness: 0.9 });
    const crownLowerGeo = new THREE.ConeGeometry(1.9, 2.8, 7);
    const crownUpperGeo = new THREE.ConeGeometry(1.3, 2.5, 7);
    const crownMat = new THREE.MeshStandardMaterial({ color: 0x4f8a3c, roughness: 0.82 });

    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCoords.length);
    const crownsLower = new THREE.InstancedMesh(crownLowerGeo, crownMat, treeCoords.length);
    const crownsUpper = new THREE.InstancedMesh(crownUpperGeo, crownMat, treeCoords.length);
    trunks.castShadow = !this.isSoftwareGl;
    crownsLower.castShadow = !this.isSoftwareGl;
    crownsUpper.castShadow = !this.isSoftwareGl;

    treeCoords.forEach(([tx, tz], i) => {
      const sc = 0.85 + ((i * 29) % 30) / 100;
      _scale.set(sc, sc, sc);
      _quat.setFromAxisAngle(_v1.set(0, 1, 0), i * 1.1);
      _mat4.compose(_v2.set(tx, 1.1 * sc, tz), _quat, _scale);
      trunks.setMatrixAt(i, _mat4);

      _mat4.compose(_v2.set(tx, (2.2 + 1.15) * sc, tz), _quat, _scale);
      crownsLower.setMatrixAt(i, _mat4);

      _mat4.compose(_v2.set(tx, (2.2 + 2.65) * sc, tz), _quat, _scale);
      crownsUpper.setMatrixAt(i, _mat4);

      _color.setHSL(0.28 + ((i % 5) - 2) * 0.015, 0.44, 0.35 + (i % 3) * 0.04);
      crownsLower.setColorAt(i, _color);
      _color.offsetHSL(0, 0.02, 0.05);
      crownsUpper.setColorAt(i, _color);
    });
    trunks.instanceMatrix.needsUpdate = true;
    crownsLower.instanceMatrix.needsUpdate = true;
    crownsUpper.instanceMatrix.needsUpdate = true;
    if (crownsLower.instanceColor) crownsLower.instanceColor.needsUpdate = true;
    if (crownsUpper.instanceColor) crownsUpper.instanceColor.needsUpdate = true;
    trunks.computeBoundingSphere();
    crownsLower.computeBoundingSphere();
    crownsUpper.computeBoundingSphere();
    this.scene.add(trunks);
    this.scene.add(crownsLower);
    this.scene.add(crownsUpper);

    // Streetlights along the main avenue
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x3b424c, roughness: 0.45, metalness: 0.65 });
    const lampMat = new THREE.MeshStandardMaterial({ color: 0xfff3cc, emissive: 0xffd27d, emissiveIntensity: 0.85 });
    for (const lx of [-15, 0, 15, 30]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 5.4, 8), poleMat);
      pole.position.set(lx, 2.7, 13.8);
      this.scene.add(pole);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.16, 0.38), lampMat);
      head.position.set(lx, 5.4, 14.2);
      this.scene.add(head);
    }

    // Animated Ambient Traffic Cars along the main avenue
    const carColors = [0xd9463e, 0x2563eb, 0xf8fafc, 0x10b981, 0x475569];
    for (let i = 0; i < 5; i++) {
      const dir = i % 2 === 0 ? 1 : -1;
      const laneZ = dir > 0 ? 20.4 : 16.6;
      const car = createTrafficCar(carColors[i], laneZ, dir, this.textures);
      car.root.position.x = -48 + i * 24;
      this.scene.add(car.root);
      this.trafficCars.push(car);
    }
  }

  private buildActiveConstructionSite(): void {
    // 1. Excavatable 3x3 Foundation Soil Grid (center 0, 0, 0)
    const soilGeo = new THREE.BoxGeometry(3.48, 0.82, 3.48);
    const hlGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(3.52, 0.12, 3.52));
    const hlMat = new THREE.LineBasicMaterial({ color: 0xf59e0b });

    // Pit floor dark bed underneath
    const pitBed = new THREE.Mesh(
      new THREE.PlaneGeometry(11.1, 11.1),
      new THREE.MeshStandardMaterial({ color: 0x4b3825, roughness: 0.96 }),
    );
    pitBed.rotation.x = -Math.PI / 2;
    pitBed.position.y = -0.34;
    this.scene.add(pitBed);

    this.soilCellMeshes = [];
    this.soilHighlightMeshes = [];
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const idx = row * 3 + col;
        const cx = (col - 1) * 3.55;
        const cz = (row - 1) * 3.55;

        const soilMat = new THREE.MeshStandardMaterial({
          color: idx % 2 === 0 ? 0x8b6742 : 0x7f5d3b,
          roughness: 0.95,
        });
        const cell = new THREE.Mesh(soilGeo, soilMat);
        cell.position.set(cx, -0.36, cz); // top sits at +0.05 when depth=0
        cell.receiveShadow = true;
        cell.userData = { interactType: 'excavation', index: idx };
        this.scene.add(cell);
        this.soilCellMeshes.push(cell);
        this.interactables.push(cell);

        // Flat clickable outline highlight cap when in excavation stage
        const cap = new THREE.Mesh(
          new THREE.PlaneGeometry(3.2, 3.2),
          new THREE.MeshBasicMaterial({
            color: 0xf59e0b,
            transparent: true,
            opacity: 0.24,
            depthWrite: false,
          }),
        );
        cap.rotation.x = -Math.PI / 2;
        cap.position.set(cx, 0.08, cz);
        const outline = new THREE.LineSegments(hlGeo, hlMat);
        outline.rotation.x = Math.PI / 2;
        cap.add(outline);
        cap.visible = false;
        this.scene.add(cap);
        this.soilHighlightMeshes.push(cap);
      }
    }

    // 2. Four Debris Piles for Stage 1
    const debrisCoords: [number, number][] = [
      [-3.4, -3.2],
      [3.5, -2.9],
      [-3.1, 3.4],
      [3.4, 3.2],
    ];
    this.debrisMeshes = [];
    debrisCoords.forEach(([dx, dz], idx) => {
      const pile = createDebrisPile(idx);
      pile.position.set(dx, 0.02, dz);
      this.scene.add(pile);
      this.debrisMeshes.push(pile);
      this.interactables.push(pile);
    });

    // 3. Click Proxy over the construction footprint for placing formwork/pouring/building
    this.siteClickProxy = new THREE.Mesh(
      new THREE.BoxGeometry(11.4, 3.2, 11.4),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    this.siteClickProxy.position.set(0, 1.5, 0);
    this.siteClickProxy.userData = { interactType: 'site' };
    this.scene.add(this.siteClickProxy);
    this.interactables.push(this.siteClickProxy);

    // 4. Progressive Building Visuals
    this.rebuildBuildingMeshes(this.currentContractId);

    // 5. Controllable Excavator (spawned on open site driveway facing the pit, never facing a wall)
    this.excavator = createExcavatorModel(this.textures);
    this.excavator.root.position.set(-7.6, 0, 7.6);
    this.excHeading = Math.PI * 0.72;
    this.excavator.root.rotation.y = this.excHeading;
    this.scene.add(this.excavator.root);

    // 6. Concrete Mixer Truck (staged on right side of construction lot)
    this.mixerTruck = createMixerTruckModel(this.textures);
    this.mixerTruck.root.position.set(10.2, 0, 4.2);
    this.mixerTruck.root.rotation.y = Math.PI * 0.32;
    this.scene.add(this.mixerTruck.root);
  }

  private rebuildBuildingMeshes(contractId: string): void {
    if (this.buildingVisuals) {
      this.scene.remove(this.buildingVisuals.root);
    }
    this.currentContractId = contractId;
    const contract = getContractById(contractId);
    this.buildingVisuals = createConstructionBuildingVisuals(contract, this.textures);
    this.scene.add(this.buildingVisuals.root);
  }

  private setupParticlePool(): void {
    const geo = new THREE.DodecahedronGeometry(0.18, 0);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
    this.particleMesh = new THREE.InstancedMesh(geo, mat, MAX_PARTICLES);
    this.particleMesh.frustumCulled = false;

    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particles.push({
        active: false,
        x: 0,
        y: -50,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 1,
        size: 1,
      });
      _mat4.makeTranslation(0, -50, 0);
      this.particleMesh.setMatrixAt(i, _mat4);
      this.particleMesh.setColorAt(i, _color.setHex(0xc29b6c));
    }
    this.particleMesh.instanceMatrix.needsUpdate = true;
    if (this.particleMesh.instanceColor) this.particleMesh.instanceColor.needsUpdate = true;
    this.scene.add(this.particleMesh);
  }

  public spawnBurst(x: number, y: number, z: number, count: number, colorHex: number, spread = 3.2): void {
    _color.setHex(colorHex);
    for (let i = 0; i < count; i++) {
      const slot = this.particles[this.particleCursor];
      this.particleCursor = (this.particleCursor + 1) % MAX_PARTICLES;
      slot.active = true;
      slot.x = x + (Math.random() - 0.5) * 1.1;
      slot.y = y + Math.random() * 0.5;
      slot.z = z + (Math.random() - 0.5) * 1.1;
      slot.vx = (Math.random() - 0.5) * spread;
      slot.vy = 2.4 + Math.random() * 3.8;
      slot.vz = (Math.random() - 0.5) * spread;
      slot.life = 0;
      slot.maxLife = 0.55 + Math.random() * 0.45;
      slot.size = 0.7 + Math.random() * 0.9;
      this.particleMesh.setColorAt(this.particleCursor === 0 ? MAX_PARTICLES - 1 : this.particleCursor - 1, _color);
    }
    if (this.particleMesh.instanceColor) this.particleMesh.instanceColor.needsUpdate = true;
  }

  public triggerDigAnimation(targetWorldX?: number, targetWorldZ?: number): void {
    this.digAnimTimer = 0.68;
    this.cameraTrauma = Math.min(1, this.cameraTrauma + 0.35);
    if (targetWorldX !== undefined && targetWorldZ !== undefined) {
      const dx = targetWorldX - this.excavator.root.position.x;
      const dz = targetWorldZ - this.excavator.root.position.z;
      const desiredWorldAngle = Math.atan2(dx, dz);
      this.turretAngle = desiredWorldAngle - this.excHeading;
      this.spawnBurst(targetWorldX, 0.25, targetWorldZ, 18, 0x9c764c, 3.8);
    } else {
      const bx = this.excavator.root.position.x + Math.sin(this.excHeading + this.turretAngle) * 3.8;
      const bz = this.excavator.root.position.z + Math.cos(this.excHeading + this.turretAngle) * 3.8;
      this.spawnBurst(bx, 0.25, bz, 16, 0x9c764c, 3.5);
    }
  }

  public triggerPourEffect(): void {
    this.pourAnimTimer = 1.4;
    this.spawnBurst(2.5, 0.4, 1.5, 16, 0x9aa3ad, 2.8);
  }

  public triggerBuildEffect(): void {
    this.cameraTrauma = Math.min(1, this.cameraTrauma + 0.2);
    this.spawnBurst(0, 2.2, 0, 20, 0xe5e7eb, 5.2);
  }

  public triggerVictoryCelebration(): void {
    this.spawnBurst(-3, 5.5, 3, 24, 0xf59e0b, 6.5);
    this.spawnBurst(3, 5.5, -2, 24, 0x38bdf8, 6.5);
    this.spawnBurst(0, 6.2, 0, 24, 0x10b981, 6.5);
  }

  public setScreenState(screenState: GameScreenState): void {
    const prev = this.screenState;
    this.screenState = screenState;
    if (screenState !== 'playing') {
      this.keys.clear();
      this.virtualMove = { forward: 0, turn: 0 };
      soundEngine.updateEngineHum(0, false);
    } else if (prev === 'title') {
      // Smoothly transition from title flyover into playable orbit view
      this.setCameraMode(this.cameraMode, true);
    }
  }

  public setCameraMode(mode: CameraMode, animate = true): void {
    this.cameraMode = mode;
    if (mode === 'orbit') {
      this.cameraPresetPos.set(22, 18.5, 27);
      this.cameraPresetTarget.set(1.2, 2.2, -1.2);
      this.cameraTransitioning = animate;
    } else if (mode === 'iso') {
      this.cameraPresetPos.set(30, 29, 30);
      this.cameraPresetTarget.set(0.5, 1.0, -0.5);
      this.cameraTransitioning = animate;
    } else if (mode === 'follow') {
      this.cameraTransitioning = false;
    }
  }

  public applyTimeOfDay(tod: TimeOfDay): void {
    this.timeOfDay = tod;
    if (tod === 'day') {
      this.scene.background = new THREE.Color(0xcde2f5);
      this.fog.color.setHex(0xcde2f5);
      this.sunLight.color.setHex(0xfff1d6);
      this.sunLight.intensity = 2.15;
      this.sunLight.position.set(34, 48, 28);
      this.hemiLight.color.setHex(0xb5dcff);
      this.hemiLight.groundColor.setHex(0x5d6e4c);
      this.hemiLight.intensity = 0.72;
      this.renderer.toneMappingExposure = 1.08;
    } else if (tod === 'dusk') {
      this.scene.background = new THREE.Color(0xd99b72);
      this.fog.color.setHex(0xd99b72);
      this.sunLight.color.setHex(0xff9b54);
      this.sunLight.intensity = 1.85;
      this.sunLight.position.set(-42, 19, 26);
      this.hemiLight.color.setHex(0xffb480);
      this.hemiLight.groundColor.setHex(0x3a3240);
      this.hemiLight.intensity = 0.58;
      this.renderer.toneMappingExposure = 1.02;
    } else {
      this.scene.background = new THREE.Color(0x162235);
      this.fog.color.setHex(0x162235);
      this.sunLight.color.setHex(0x88b4e8);
      this.sunLight.intensity = 0.88;
      this.sunLight.position.set(-22, 36, -24);
      this.hemiLight.color.setHex(0x3b5882);
      this.hemiLight.groundColor.setHex(0x1b232e);
      this.hemiLight.intensity = 0.5;
      this.renderer.toneMappingExposure = 0.96;
    }
  }

  public setVirtualInput(forward: number, turn: number): void {
    this.virtualMove.forward = forward;
    this.virtualMove.turn = turn;
  }

  public getNearestExcavationCellIndex(): number {
    let bestIdx = -1;
    let bestDist = Infinity;
    const ex = this.excavator.root.position.x;
    const ez = this.excavator.root.position.z;
    for (const cell of this.latestGameState.site.excavationCells) {
      if (cell.depth >= 1) continue;
      const cx = (cell.col - 1) * 3.55;
      const cz = (cell.row - 1) * 3.55;
      const d = Math.hypot(cx - ex, cz - ez);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = cell.index;
      }
    }
    return bestIdx;
  }

  public getNearestDebrisIndex(): number {
    let bestIdx = -1;
    let bestDist = Infinity;
    const ex = this.excavator.root.position.x;
    const ez = this.excavator.root.position.z;
    this.debrisMeshes.forEach((mesh, idx) => {
      if (this.latestGameState.site.debrisCleared[idx]) return;
      const d = Math.hypot(mesh.position.x - ex, mesh.position.z - ez);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = idx;
      }
    });
    return bestIdx;
  }

  public applyGameState(state: GameState): void {
    this.latestGameState = state;
    if (state.site.contractId !== this.currentContractId) {
      this.rebuildBuildingMeshes(state.site.contractId);
    }

    const stage = getActiveStageId(state.site);

    // 1. Debris piles visibility
    this.debrisMeshes.forEach((pile, idx) => {
      pile.visible = !state.site.debrisCleared[idx];
    });

    // 2. Excavation soil cells & highlight frames
    state.site.excavationCells.forEach((cell, idx) => {
      const mesh = this.soilCellMeshes[idx];
      const hl = this.soilHighlightMeshes[idx];
      if (!mesh || !hl) return;
      // Depth 0 => top at +0.05 (center -0.36). Depth 1 => sunken underground (-0.82)
      mesh.position.y = -0.36 - cell.depth * 0.56;
      mesh.visible = cell.depth < 0.99;
      hl.visible = stage === 'excavation' && cell.depth < 1;
    });

    // 3. Formwork & Rebar
    this.buildingVisuals.formworkSegments.forEach((seg, idx) => {
      seg.visible = idx < state.site.formworkPlaced;
    });

    // 4. Concrete Slab height + wet-to-cured transition
    const pouredFrac = state.site.concretePoured / 100;
    const curedFrac = state.site.concreteCured / 100;
    this.buildingVisuals.concreteSlab.visible = pouredFrac > 0.01;
    this.buildingVisuals.concreteSlab.scale.y = Math.max(0.08, pouredFrac);
    this.buildingVisuals.concreteSlab.position.y = -0.72 + pouredFrac * 0.48;
    _color.setHex(0x636b75).lerp(new THREE.Color(0xd8dde2), curedFrac);
    this.buildingVisuals.concreteMat.color.copy(_color);
    this.buildingVisuals.concreteMat.roughness = 0.28 + curedFrac * 0.58;

    // 5. Structure Steps (0..5)
    this.buildingVisuals.structureSteps.forEach((grp, idx) => {
      grp.visible = idx < state.site.structureBuilt;
    });

    // 6. Finishing Steps (0..3)
    this.buildingVisuals.finishingSteps.forEach((grp, idx) => {
      grp.visible = idx < state.site.finishingDone;
    });

    // 7. Blueprint Placement Ghost (visible during foundation & structure stages; rotates with R)
    this.buildingVisuals.previewGhost.visible = stage === 'foundation' || stage === 'structure';
    this.buildingVisuals.previewGhost.rotation.y = state.placementRotation;

    // 8. Mixer Truck positioning: pulls to pit edge ONLY during concrete stage; parks cleanly at staging bay otherwise
    if (stage === 'concrete') {
      this.mixerTruck.root.position.set(8.6, 0, 6.4);
      this.mixerTruck.root.rotation.y = Math.PI * 0.25;
    } else {
      this.mixerTruck.root.position.set(10.8, 0, 7.6);
      this.mixerTruck.root.rotation.y = Math.PI * 0.14;
    }

    // Keep excavator cleanly outside building walls once structure begins
    if (stage === 'structure' || stage === 'finishing' || stage === 'inspection') {
      const ex = this.excavator.root.position.x;
      const ez = this.excavator.root.position.z;
      if (Math.abs(ex) < 7.2 && Math.abs(ez) < 7.0) {
        this.excavator.root.position.set(-8.6, 0, 7.4);
        this.excHeading = Math.PI * 0.65;
        this.excavator.root.rotation.y = this.excHeading;
      }
    }

    // 9. Sync hired animated workers on site
    const roleColors: Record<string, string> = {
      laborer: '#f59e0b',
      operator: '#0ea5e9',
      concrete_tech: '#10b981',
    };
    for (const role of state.hiredWorkers) {
      if (!this.workerRigs.has(role)) {
        const rig = createWorkerModel(roleColors[role] ?? '#f59e0b', this.textures);
        this.scene.add(rig.root);
        this.workerRigs.set(role, rig);
      }
    }
    for (const [role, rig] of this.workerRigs.entries()) {
      if (!state.hiredWorkers.includes(role as GameState['hiredWorkers'][number])) {
        this.scene.remove(rig.root);
        this.workerRigs.delete(role);
      }
    }
  }

  private bindEvents(): void {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onWindowBlur);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    this.renderer.domElement.addEventListener('pointerdown', this.onPointerDown);
    this.renderer.domElement.addEventListener('pointerup', this.onPointerUp);
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (this.screenState !== 'playing') return;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
    this.keys.add(e.code);
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
  };

  private onWindowBlur = (): void => {
    this.keys.clear();
    this.virtualMove = { forward: 0, turn: 0 };
  };

  private onVisibilityChange = (): void => {
    if (document.hidden) {
      this.keys.clear();
      this.virtualMove = { forward: 0, turn: 0 };
    }
  };

  private onPointerDown = (e: PointerEvent): void => {
    this.pointerDownPos = { x: e.clientX, y: e.clientY };
  };

  private onPointerUp = (e: PointerEvent): void => {
    if (this.screenState !== 'playing') return;
    const dist = Math.hypot(e.clientX - this.pointerDownPos.x, e.clientY - this.pointerDownPos.y);
    if (dist > 8) return; // Ignore orbit drags

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.interactables, true);
    if (hits.length === 0) return;

    const stage = getActiveStageId(this.latestGameState.site);
    for (const hit of hits) {
      let cur: THREE.Object3D | null = hit.object;
      while (cur) {
        const type = cur.userData?.interactType as 'debris' | 'excavation' | 'site' | undefined;
        if (type === 'debris' && stage === 'site_prep' && cur.visible) {
          this.callbacks.onInteractTarget('debris', cur.userData.index);
          return;
        }
        if (type === 'excavation' && stage === 'excavation' && cur.visible) {
          this.callbacks.onInteractTarget('excavation', cur.userData.index);
          return;
        }
        if (type === 'site' && stage !== 'site_prep' && stage !== 'excavation') {
          this.callbacks.onInteractTarget('site');
          return;
        }
        cur = cur.parent;
      }
    }
  };

  private handleResize(): void {
    if (this.disposed) return;
    const w = Math.max(this.container.clientWidth, 320);
    const h = Math.max(this.container.clientHeight, 240);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  private updateExcavatorPhysics(dt: number): void {
    const canDrive =
      this.screenState === 'playing' &&
      (this.latestGameState.mode === 'sandbox' || this.latestGameState.equipment.excavatorFuel > 0.2);

    let forwardInput = this.virtualMove.forward;
    let turnInput = this.virtualMove.turn;
    if (canDrive) {
      if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) forwardInput += 1;
      if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) forwardInput -= 1;
      if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) turnInput += 1;
      if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) turnInput -= 1;
      if (this.keys.has('KeyQ')) this.turretAngle += 1.8 * dt;
      if (this.keys.has('KeyE')) this.turretAngle -= 1.8 * dt;
    }

    const levelBoost = 1 + (this.latestGameState.equipment.excavatorLevel - 1) * 0.22;
    const maxSpeed = 7.2 * levelBoost;
    const targetSpeed = THREE.MathUtils.clamp(forwardInput, -1, 1) * maxSpeed;

    this.excSpeed = THREE.MathUtils.damp(this.excSpeed, targetSpeed, 5.5, dt);
    if (Math.abs(turnInput) > 0.05) {
      this.excHeading += THREE.MathUtils.clamp(turnInput, -1, 1) * 1.95 * dt;
    }

    const vx = Math.sin(this.excHeading) * this.excSpeed * dt;
    const vz = Math.cos(this.excHeading) * this.excSpeed * dt;
    const nextX = THREE.MathUtils.clamp(this.excavator.root.position.x + vx, -13.2, 13.2);
    const nextZ = THREE.MathUtils.clamp(this.excavator.root.position.z + vz, -11.2, 11.4);

    // Keep excavator outside completed walls during structure/finishing stages
    const stage = getActiveStageId(this.latestGameState.site);
    const wallsUp = stage === 'structure' || stage === 'finishing' || stage === 'inspection';
    if (wallsUp && Math.abs(nextX) < 6.4 && Math.abs(nextZ) < 6.2) {
      this.excSpeed *= 0.2;
    } else {
      this.excavator.root.position.x = nextX;
      this.excavator.root.position.z = nextZ;
    }

    this.excavator.root.rotation.y = this.excHeading;
    this.excavator.turretGroup.rotation.y = THREE.MathUtils.damp(
      this.excavator.turretGroup.rotation.y,
      this.turretAngle,
      8.0,
      dt,
    );

    // Subtle suspension bob while driving
    const speedNorm = Math.abs(this.excSpeed) / maxSpeed;
    if (speedNorm > 0.08) {
      this.excavator.root.position.y = Math.abs(Math.sin(performance.now() * 0.014)) * 0.045 * speedNorm;
      if (this.latestGameState.mode !== 'sandbox') {
        const burn = dt * 0.65 * speedNorm * (this.latestGameState.hiredWorkers.includes('operator') ? 0.6 : 1);
        this.callbacks.onFuelBurn(burn);
      }
      if (Math.random() < 0.22) {
        this.spawnBurst(
          this.excavator.root.position.x,
          0.1,
          this.excavator.root.position.z,
          1,
          0xb4966e,
          1.2,
        );
      }
    } else {
      this.excavator.root.position.y = THREE.MathUtils.damp(this.excavator.root.position.y, 0, 10, dt);
    }

    soundEngine.updateEngineHum(speedNorm, this.screenState === 'playing');

    // Articulated hydraulic dig animation
    if (this.digAnimTimer > 0) {
      this.digAnimTimer = Math.max(0, this.digAnimTimer - dt);
      const p = 1 - this.digAnimTimer / 0.68;
      const scoopWave = Math.sin(p * Math.PI);
      this.excavator.boomGroup.rotation.x = THREE.MathUtils.lerp(0, 0.42, scoopWave);
      this.excavator.stickGroup.rotation.x = THREE.MathUtils.lerp(0, -0.58, scoopWave);
      this.excavator.bucketGroup.rotation.x = THREE.MathUtils.lerp(0, 0.95, scoopWave);
    } else {
      this.excavator.boomGroup.rotation.x = THREE.MathUtils.damp(this.excavator.boomGroup.rotation.x, 0, 7, dt);
      this.excavator.stickGroup.rotation.x = THREE.MathUtils.damp(this.excavator.stickGroup.rotation.x, 0, 7, dt);
      this.excavator.bucketGroup.rotation.x = THREE.MathUtils.damp(this.excavator.bucketGroup.rotation.x, 0, 7, dt);
    }
  }

  private updateAmbientWorld(dt: number, elapsed: number): void {
    // Slow tower crane slewing
    this.towerCrane.jibGroup.rotation.y = -0.65 + Math.sin(elapsed * 0.14) * 0.35;

    // Mixer truck drum spin & pour stream
    const stage = getActiveStageId(this.latestGameState.site);
    const pouring = this.pourAnimTimer > 0 || (stage === 'concrete' && this.latestGameState.site.concretePoured > 0 && this.latestGameState.site.concretePoured < 100);
    if (this.pourAnimTimer > 0) this.pourAnimTimer = Math.max(0, this.pourAnimTimer - dt);
    const drumSpeed = pouring ? 2.6 : 0.45;
    this.mixerTruck.drumGroup.rotation.z += drumSpeed * dt;
    this.mixerTruck.pourStream.visible = this.pourAnimTimer > 0;

    // Animated Traffic Cars along the avenue
    for (const car of this.trafficCars) {
      car.root.position.x += car.dir * car.speed * dt;
      if (car.root.position.x > 68) car.root.position.x = -68;
      if (car.root.position.x < -68) car.root.position.x = 68;
    }

    // Animated Hired Workers walking around site perimeter & gesturing
    for (const worker of this.workerRigs.values()) {
      worker.angle += worker.speed * dt;
      const wx = Math.cos(worker.angle) * worker.radius;
      const wz = Math.sin(worker.angle) * worker.radius;
      worker.root.position.set(wx, 0.02, wz);
      worker.root.rotation.y = -worker.angle;
      const stride = Math.sin(worker.angle * 16) * 0.48;
      worker.leftLeg.rotation.x = stride;
      worker.rightLeg.rotation.x = -stride;
      worker.leftArm.rotation.x = -stride * 0.85;
      worker.rightArm.rotation.x = stride * 0.85;
    }

    // Update pooled particles
    let dirty = false;
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      dirty = true;
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        _mat4.makeTranslation(0, -50, 0);
        this.particleMesh.setMatrixAt(i, _mat4);
        continue;
      }
      p.vy -= 9.5 * dt;
      p.x += p.vx * dt;
      p.y = Math.max(0.05, p.y + p.vy * dt);
      p.z += p.vz * dt;
      const fade = 1 - p.life / p.maxLife;
      const sc = p.size * fade;
      _scale.set(sc, sc, sc);
      _quat.identity();
      _mat4.compose(_v1.set(p.x, p.y, p.z), _quat, _scale);
      this.particleMesh.setMatrixAt(i, _mat4);
    }
    if (dirty) {
      this.particleMesh.instanceMatrix.needsUpdate = true;
    }
  }

  private updateCamera(dt: number): void {
    if (this.screenState === 'title') {
      // Live world camera flyover on Title screen
      this.flyoverAngle += dt * 0.12;
      const radius = 31;
      this.camera.position.set(
        Math.cos(this.flyoverAngle) * radius,
        15.5 + Math.sin(this.flyoverAngle * 0.7) * 2.2,
        Math.sin(this.flyoverAngle) * radius,
      );
      this.camera.lookAt(0, 2.2, 0);
      return;
    }

    if (this.cameraMode === 'follow') {
      const ex = this.excavator.root.position.x;
      const ez = this.excavator.root.position.z;
      const desiredX = ex - Math.sin(this.excHeading) * 13.5;
      const desiredZ = ez - Math.cos(this.excHeading) * 13.5;
      this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, desiredX, 4.5, dt);
      this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, 9.2, 4.5, dt);
      this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, desiredZ, 4.5, dt);
      this.controls.target.x = THREE.MathUtils.damp(this.controls.target.x, ex, 6.0, dt);
      this.controls.target.y = THREE.MathUtils.damp(this.controls.target.y, 1.4, 6.0, dt);
      this.controls.target.z = THREE.MathUtils.damp(this.controls.target.z, ez, 6.0, dt);
    } else if (this.cameraTransitioning) {
      this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, this.cameraPresetPos.x, 5.2, dt);
      this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, this.cameraPresetPos.y, 5.2, dt);
      this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, this.cameraPresetPos.z, 5.2, dt);
      this.controls.target.x = THREE.MathUtils.damp(this.controls.target.x, this.cameraPresetTarget.x, 5.2, dt);
      this.controls.target.y = THREE.MathUtils.damp(this.controls.target.y, this.cameraPresetTarget.y, 5.2, dt);
      this.controls.target.z = THREE.MathUtils.damp(this.controls.target.z, this.cameraPresetTarget.z, 5.2, dt);
      if (this.camera.position.distanceTo(this.cameraPresetPos) < 0.2) {
        this.cameraTransitioning = false;
      }
    }

    this.controls.update();

    // Subtle decaying trauma shake on heavy dig/build impacts
    if (this.cameraTrauma > 0.005) {
      this.cameraTrauma = Math.max(0, this.cameraTrauma - dt * 1.9);
      const shake = this.cameraTrauma * this.cameraTrauma * 0.25;
      this.camera.position.x += (Math.random() - 0.5) * shake;
      this.camera.position.y += (Math.random() - 0.5) * shake;
    }
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) {
        if (sync) gl.deleteSync(sync);
        return;
      }
      const status = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (status === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private tick = (): void => {
    if (this.disposed) return;

    const now = performance.now();
    const rawDt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    const dt = Math.min(Math.max(rawDt, 0.001), 0.05);
    const elapsed = now / 1000;

    if (this.screenState !== 'paused') {
      this.updateExcavatorPhysics(dt);
      this.updateAmbientWorld(dt, elapsed);
    }
    this.updateCamera(dt);

    this.renderer.render(this.scene, this.camera);

    // Throttled telemetry (~6Hz)
    this.telemetryTimer += dt;
    if (this.telemetryTimer >= 0.16 && this.screenState === 'playing') {
      this.telemetryTimer = 0;
      const distToCenter = Math.hypot(this.excavator.root.position.x, this.excavator.root.position.z);
      this.callbacks.onTelemetry({
        excavatorX: Math.round(this.excavator.root.position.x * 10) / 10,
        excavatorZ: Math.round(this.excavator.root.position.z * 10) / 10,
        excavatorSpeed: Math.round(Math.abs(this.excSpeed) * 10) / 10,
        excavatorNearTarget: distToCenter < 10.5,
        nearestTargetLabel: getActiveStageId(this.latestGameState.site),
      });
    }

    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    this.resizeObserver.disconnect();
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onWindowBlur);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.renderer.domElement.removeEventListener('pointerdown', this.onPointerDown);
    this.renderer.domElement.removeEventListener('pointerup', this.onPointerUp);
    this.controls.dispose();
    this.textures.dispose();
    soundEngine.updateEngineHum(0, false);
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
