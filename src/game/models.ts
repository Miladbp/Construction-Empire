import * as THREE from 'three';
import { ContractSpec } from './types';
import { ProceduralTextureSet } from './textures';

export interface ExcavatorRig {
  root: THREE.Group;
  turretGroup: THREE.Group;
  boomGroup: THREE.Group;
  stickGroup: THREE.Group;
  bucketGroup: THREE.Group;
  beaconMesh: THREE.Mesh;
  leftTrack: THREE.Mesh;
  rightTrack: THREE.Mesh;
}

export interface MixerTruckRig {
  root: THREE.Group;
  drumGroup: THREE.Group;
  pourStream: THREE.Mesh;
  wheels: THREE.Mesh[];
}

export interface WorkerRig {
  root: THREE.Group;
  leftLeg: THREE.Mesh;
  rightLeg: THREE.Mesh;
  leftArm: THREE.Mesh;
  rightArm: THREE.Mesh;
  angle: number;
  speed: number;
  radius: number;
}

export interface TrafficCarRig {
  root: THREE.Group;
  laneZ: number;
  dir: number;
  speed: number;
}

function makeContactShadow(textures: ProceduralTextureSet, width: number, depth: number): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(width, depth);
  const mat = new THREE.MeshBasicMaterial({
    map: textures.contactShadow,
    transparent: true,
    opacity: 0.48,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.025;
  return mesh;
}

export function createExcavatorModel(textures: ProceduralTextureSet): ExcavatorRig {
  const root = new THREE.Group();

  const yellowMat = new THREE.MeshStandardMaterial({ color: 0xebb115, roughness: 0.42, metalness: 0.16 });
  const darkSteelMat = new THREE.MeshStandardMaterial({ color: 0x262c34, roughness: 0.55, metalness: 0.6 });
  const trackRubberMat = new THREE.MeshStandardMaterial({ color: 0x1c2026, roughness: 0.9, metalness: 0.08 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xd8e0e8, roughness: 0.18, metalness: 0.88 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x7ec4e8,
    roughness: 0.12,
    metalness: 0.25,
    transparent: true,
    opacity: 0.62,
  });
  const hazardMat = new THREE.MeshStandardMaterial({ map: textures.hazard, roughness: 0.55, metalness: 0.1 });
  const beaconMat = new THREE.MeshStandardMaterial({
    color: 0xff9500,
    emissive: 0xff6a00,
    emissiveIntensity: 0.9,
    roughness: 0.2,
  });

  // Contact shadow
  root.add(makeContactShadow(textures, 4.4, 5.2));

  // Undercarriage H-frame
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.36, 2.7), darkSteelMat);
  chassis.position.y = 0.45;
  chassis.castShadow = true;
  chassis.receiveShadow = true;
  root.add(chassis);

  // Left & Right Crawler Tracks
  const trackGeo = new THREE.BoxGeometry(0.68, 0.72, 3.6);
  const leftTrack = new THREE.Mesh(trackGeo, trackRubberMat);
  leftTrack.position.set(-1.18, 0.38, 0);
  leftTrack.castShadow = true;
  leftTrack.receiveShadow = true;
  root.add(leftTrack);

  const rightTrack = new THREE.Mesh(trackGeo, trackRubberMat);
  rightTrack.position.set(1.18, 0.38, 0);
  rightTrack.castShadow = true;
  rightTrack.receiveShadow = true;
  root.add(rightTrack);

  // Track drive sprockets (front and rear)
  const sprocketGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.72, 12);
  sprocketGeo.rotateZ(Math.PI / 2);
  const sprocketOffsets: [number, number][] = [
    [-1.18, 1.68],
    [-1.18, -1.68],
    [1.18, 1.68],
    [1.18, -1.68],
  ];
  for (const [sx, sz] of sprocketOffsets) {
    const sp = new THREE.Mesh(sprocketGeo, darkSteelMat);
    sp.position.set(sx, 0.38, sz);
    root.add(sp);
  }

  // Slewing ring pedestal
  const slewRing = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.05, 0.28, 16), darkSteelMat);
  slewRing.position.y = 0.76;
  root.add(slewRing);

  // Rotating Upper Turret
  const turretGroup = new THREE.Group();
  turretGroup.position.y = 0.9;
  root.add(turretGroup);

  // Main engine deck body
  const deck = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.82, 2.9), yellowMat);
  deck.position.set(0, 0.44, -0.2);
  deck.castShadow = true;
  deck.receiveShadow = true;
  turretGroup.add(deck);

  // Rear Counterweight with hazard stripe
  const counterWeight = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.88, 0.85), darkSteelMat);
  counterWeight.position.set(0, 0.46, -1.65);
  counterWeight.castShadow = true;
  turretGroup.add(counterWeight);

  const hazardBumper = new THREE.Mesh(new THREE.BoxGeometry(2.54, 0.24, 0.14), hazardMat);
  hazardBumper.position.set(0, 0.32, -2.06);
  turretGroup.add(hazardBumper);

  // Engine Hood & Exhaust Stack
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.48, 1.7), yellowMat);
  hood.position.set(0.55, 1.02, -0.65);
  hood.castShadow = true;
  turretGroup.add(hood);

  const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 1.15, 10), chromeMat);
  exhaust.position.set(0.85, 1.48, -1.1);
  turretGroup.add(exhaust);

  // Operator Cabin (Left Side)
  const cabFrame = new THREE.Mesh(new THREE.BoxGeometry(1.12, 1.28, 1.55), darkSteelMat);
  cabFrame.position.set(-0.62, 1.42, 0.22);
  cabFrame.castShadow = true;
  turretGroup.add(cabFrame);

  const cabGlass = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.86, 1.38), glassMat);
  cabGlass.position.set(-0.62, 1.52, 0.28);
  turretGroup.add(cabGlass);

  const cabRoof = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.14, 1.66), yellowMat);
  cabRoof.position.set(-0.62, 2.1, 0.22);
  cabRoof.castShadow = true;
  turretGroup.add(cabRoof);

  // Warning Beacon
  const beaconMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.22, 12), beaconMat);
  beaconMesh.position.set(-0.62, 2.26, -0.15);
  turretGroup.add(beaconMesh);

  // Front Headlights
  const lightMat = new THREE.MeshStandardMaterial({ color: 0xfff8dc, emissive: 0xffe49c, emissiveIntensity: 0.7 });
  const hlLeft = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.1), lightMat);
  hlLeft.position.set(-0.75, 0.62, 1.28);
  turretGroup.add(hlLeft);
  const hlRight = hlLeft.clone();
  hlRight.position.x = 0.75;
  turretGroup.add(hlRight);

  // Articulated Boom Arm (front-right mount)
  const boomGroup = new THREE.Group();
  boomGroup.position.set(0.32, 0.82, 1.05);
  turretGroup.add(boomGroup);

  const boomLower = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.44, 2.5), yellowMat);
  boomLower.position.set(0, 0.75, 0.95);
  boomLower.rotation.x = -0.58;
  boomLower.castShadow = true;
  boomGroup.add(boomLower);

  const boomUpper = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.36, 1.9), yellowMat);
  boomUpper.position.set(0, 1.65, 2.65);
  boomUpper.rotation.x = -0.15;
  boomUpper.castShadow = true;
  boomGroup.add(boomUpper);

  // Hydraulic Cylinder on Boom
  const boomPiston = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.6, 10), chromeMat);
  boomPiston.position.set(0, 0.52, 0.95);
  boomPiston.rotation.x = 0.95;
  boomGroup.add(boomPiston);

  // Articulated Dipper Stick
  const stickGroup = new THREE.Group();
  stickGroup.position.set(0, 1.82, 3.45);
  boomGroup.add(stickGroup);

  const stickArm = new THREE.Mesh(new THREE.BoxGeometry(0.28, 2.35, 0.32), yellowMat);
  stickArm.position.set(0, -1.05, 0.32);
  stickArm.rotation.x = -0.28;
  stickArm.castShadow = true;
  stickGroup.add(stickArm);

  const stickPiston = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 1.25, 10), chromeMat);
  stickPiston.position.set(0, -0.35, -0.02);
  stickPiston.rotation.x = -0.12;
  stickGroup.add(stickPiston);

  // Toothed Digging Bucket
  const bucketGroup = new THREE.Group();
  bucketGroup.position.set(0, -2.15, 0.65);
  stickGroup.add(bucketGroup);

  const bucketBody = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.64, 0.76), darkSteelMat);
  bucketBody.position.set(0, -0.25, -0.1);
  bucketBody.castShadow = true;
  bucketGroup.add(bucketBody);

  const bucketLip = new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.12, 0.38), darkSteelMat);
  bucketLip.position.set(0, -0.52, -0.45);
  bucketGroup.add(bucketLip);

  for (let i = -1.5; i <= 1.5; i += 1) {
    const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.24, 6), chromeMat);
    tooth.rotation.x = -Math.PI / 2;
    tooth.position.set(i * 0.23, -0.52, -0.7);
    bucketGroup.add(tooth);
  }

  return {
    root,
    turretGroup,
    boomGroup,
    stickGroup,
    bucketGroup,
    beaconMesh,
    leftTrack,
    rightTrack,
  };
}

export function createMixerTruckModel(textures: ProceduralTextureSet): MixerTruckRig {
  const root = new THREE.Group();
  const cabMat = new THREE.MeshStandardMaterial({ color: 0xf4f6f9, roughness: 0.38, metalness: 0.1 });
  const accentMat = new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.45, metalness: 0.12 });
  const chassisMat = new THREE.MeshStandardMaterial({ color: 0x2a313b, roughness: 0.65, metalness: 0.45 });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x191d23, roughness: 0.92, metalness: 0.05 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x72b6dc, roughness: 0.14, metalness: 0.25 });

  root.add(makeContactShadow(textures, 3.6, 7.6));

  // Chassis rails
  const frame = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.42, 6.4), chassisMat);
  frame.position.set(0, 0.72, 0);
  frame.castShadow = true;
  root.add(frame);

  // Cab
  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.15, 1.85, 1.85), cabMat);
  cab.position.set(0, 1.82, 2.25);
  cab.castShadow = true;
  root.add(cab);

  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.96, 0.78, 0.1), glassMat);
  windshield.position.set(0, 2.1, 3.16);
  root.add(windshield);

  const grille = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.55, 0.1), chassisMat);
  grille.position.set(0, 1.25, 3.16);
  root.add(grille);

  const bumper = new THREE.Mesh(new THREE.BoxGeometry(2.26, 0.3, 0.26), accentMat);
  bumper.position.set(0, 0.72, 3.24);
  root.add(bumper);

  // Rotating Drum
  const drumGroup = new THREE.Group();
  drumGroup.position.set(0, 2.05, -0.75);
  drumGroup.rotation.x = 0.22;
  root.add(drumGroup);

  const drumBody = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.18, 3.3, 14), cabMat);
  drumBody.rotation.x = Math.PI / 2;
  drumBody.castShadow = true;
  drumGroup.add(drumBody);

  const drumStripe = new THREE.Mesh(new THREE.CylinderGeometry(1.09, 1.14, 0.72, 14), accentMat);
  drumStripe.rotation.x = Math.PI / 2;
  drumStripe.position.z = 0.2;
  drumGroup.add(drumStripe);

  const drumCone = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.95, 1.0, 14), accentMat);
  drumCone.rotation.x = Math.PI / 2;
  drumCone.position.z = -2.1;
  drumGroup.add(drumCone);

  // Discharge chute
  const chute = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.16, 1.65), chassisMat);
  chute.position.set(0, 1.4, -3.55);
  chute.rotation.x = 0.35;
  root.add(chute);

  // Concrete pour stream (visible only while pouring)
  const streamMat = new THREE.MeshStandardMaterial({ color: 0x7c858e, roughness: 0.3, metalness: 0.1 });
  const pourStream = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.28, 1.4, 10), streamMat);
  pourStream.position.set(0, 0.65, -4.25);
  pourStream.visible = false;
  root.add(pourStream);

  // 6 Wheels
  const wheelGeo = new THREE.CylinderGeometry(0.52, 0.52, 0.42, 12);
  wheelGeo.rotateZ(Math.PI / 2);
  const wheels: THREE.Mesh[] = [];
  const wheelZ = [2.25, -1.0, -2.25];
  for (const wz of wheelZ) {
    for (const wx of [-1.14, 1.14]) {
      const w = new THREE.Mesh(wheelGeo, tireMat);
      w.position.set(wx, 0.52, wz);
      w.castShadow = true;
      root.add(w);
      wheels.push(w);
    }
  }

  return { root, drumGroup, pourStream, wheels };
}

export function createTowerCraneModel(): { root: THREE.Group; jibGroup: THREE.Group } {
  const root = new THREE.Group();
  const craneYellow = new THREE.MeshStandardMaterial({ color: 0xf0ad15, roughness: 0.45, metalness: 0.25 });
  const concreteMat = new THREE.MeshStandardMaterial({ color: 0x9aa3ad, roughness: 0.85, metalness: 0.05 });
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x2f3742, roughness: 0.48, metalness: 0.65 });

  // Ballast base
  const base = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.2, 4.2), concreteMat);
  base.position.y = 0.6;
  base.castShadow = true;
  base.receiveShadow = true;
  root.add(base);

  // Lattice Mast (4 corner chords + horizontal rings)
  const mastHeight = 25;
  const chordGeo = new THREE.BoxGeometry(0.24, mastHeight, 0.24);
  for (const cx of [-0.75, 0.75]) {
    for (const cz of [-0.75, 0.75]) {
      const chord = new THREE.Mesh(chordGeo, craneYellow);
      chord.position.set(cx, 1.2 + mastHeight / 2, cz);
      chord.castShadow = true;
      root.add(chord);
    }
  }
  const ringGeo = new THREE.BoxGeometry(1.75, 0.16, 1.75);
  for (let y = 3; y < 25; y += 3) {
    const ring = new THREE.Mesh(ringGeo, craneYellow);
    ring.position.y = y;
    root.add(ring);
  }

  // Rotating Jib Assembly
  const jibGroup = new THREE.Group();
  jibGroup.position.y = 26.2;
  root.add(jibGroup);

  // Operator cabin
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.0, 1.8), steelMat);
  cab.position.set(1.2, -0.5, 0.6);
  jibGroup.add(cab);

  // Cathead apex
  const apex = new THREE.Mesh(new THREE.ConeGeometry(1.1, 4.2, 4), craneYellow);
  apex.position.y = 2.4;
  apex.rotation.y = Math.PI / 4;
  jibGroup.add(apex);

  // Forward Jib
  const jib = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.25, 22), craneYellow);
  jib.position.set(0, 0.4, 9.5);
  jib.castShadow = true;
  jibGroup.add(jib);

  // Counter-Jib + Counterweights
  const counterJib = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.0, 8.5), craneYellow);
  counterJib.position.set(0, 0.35, -4.5);
  jibGroup.add(counterJib);

  const ballast = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.5, 2.4), concreteMat);
  ballast.position.set(0, 0.85, -7.2);
  jibGroup.add(ballast);

  // Trolley & Hook Cable
  const trolley = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.45, 1.2), steelMat);
  trolley.position.set(0, -0.35, 13);
  jibGroup.add(trolley);

  const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 9.5, 6), steelMat);
  cable.position.set(0, -5.2, 13);
  jibGroup.add(cable);

  const hook = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.9, 0.4), craneYellow);
  hook.position.set(0, -10.0, 13);
  jibGroup.add(hook);

  return { root, jibGroup };
}

export function createNeighborhoodHouse(wallHex: number, roofHex: number, width = 8.5, depth = 7.2, floors = 1): THREE.Group {
  const group = new THREE.Group();
  const h = floors * 3.4;

  const plinthMat = new THREE.MeshStandardMaterial({ color: 0x8b929a, roughness: 0.85 });
  const wallMat = new THREE.MeshStandardMaterial({ color: wallHex, roughness: 0.78 });
  const roofMat = new THREE.MeshStandardMaterial({ color: roofHex, roughness: 0.68 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.6 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x5c8fb2, roughness: 0.16, metalness: 0.25 });
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x5a3921, roughness: 0.65 });

  // Foundation Plinth
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(width + 0.35, 0.45, depth + 0.35), plinthMat);
  plinth.position.y = 0.225;
  plinth.receiveShadow = true;
  group.add(plinth);

  // Main Volume
  const body = new THREE.Mesh(new THREE.BoxGeometry(width, h, depth), wallMat);
  body.position.y = 0.45 + h / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Pitched Gable Roof via 4-sided cone stretched or extruded triangle
  const roofShape = new THREE.Shape();
  const rw = width / 2 + 0.55;
  roofShape.moveTo(-rw, 0);
  roofShape.lineTo(rw, 0);
  roofShape.lineTo(0, 2.35);
  roofShape.closePath();
  const roofGeo = new THREE.ExtrudeGeometry(roofShape, { depth: depth + 0.9, bevelEnabled: false });
  roofGeo.translate(0, 0, -(depth + 0.9) / 2);
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.position.y = 0.45 + h;
  roof.castShadow = true;
  group.add(roof);

  // Chimney
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.85, 2.1, 0.85), plinthMat);
  chimney.position.set(width * 0.26, 0.45 + h + 1.15, -depth * 0.15);
  chimney.castShadow = true;
  group.add(chimney);

  // Door + jamb frame on +Z face
  const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(1.45, 2.25, 0.16), trimMat);
  doorFrame.position.set(0, 0.45 + 1.125, depth / 2 + 0.04);
  group.add(doorFrame);
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.18, 2.12, 0.18), doorMat);
  door.position.set(0, 0.45 + 1.06, depth / 2 + 0.06);
  group.add(door);

  // Windows on each floor
  for (let f = 0; f < floors; f++) {
    const wy = 0.45 + f * 3.4 + 1.85;
    for (const wx of [-width * 0.28, width * 0.28]) {
      const frame = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.35, 0.14), trimMat);
      frame.position.set(wx, wy, depth / 2 + 0.04);
      group.add(frame);
      const pane = new THREE.Mesh(new THREE.BoxGeometry(1.36, 1.12, 0.16), glassMat);
      pane.position.set(wx, wy, depth / 2 + 0.06);
      group.add(pane);
    }
  }

  return group;
}

export function createSiteTrailerModel(textures: ProceduralTextureSet): THREE.Group {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xe6ecf2, roughness: 0.55 });
  const stripeMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.45 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x3b4450, roughness: 0.7 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x629fc4, roughness: 0.15, metalness: 0.25 });

  group.add(makeContactShadow(textures, 7.6, 3.8));

  const chassis = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.45, 2.8), roofMat);
  chassis.position.y = 0.225;
  group.add(chassis);

  const container = new THREE.Mesh(new THREE.BoxGeometry(6.6, 2.55, 2.7), bodyMat);
  container.position.y = 0.45 + 1.275;
  container.castShadow = true;
  container.receiveShadow = true;
  group.add(container);

  const stripe = new THREE.Mesh(new THREE.BoxGeometry(6.66, 0.42, 2.74), stripeMat);
  stripe.position.y = 0.45 + 0.65;
  group.add(stripe);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(6.9, 0.2, 2.95), roofMat);
  roof.position.y = 3.1;
  group.add(roof);

  for (const wx of [-1.8, 0.3, 2.1]) {
    const win = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.9, 0.1), glassMat);
    win.position.set(wx, 2.0, 1.35);
    group.add(win);
  }

  return group;
}

export function createWorkerModel(helmetHex: string, textures: ProceduralTextureSet): WorkerRig {
  const root = new THREE.Group();
  const vestMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.65 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: 0x263445, roughness: 0.82 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xe6b895, roughness: 0.75 });
  const hatMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(helmetHex), roughness: 0.35, metalness: 0.1 });

  root.add(makeContactShadow(textures, 1.0, 1.0));

  const legGeo = new THREE.BoxGeometry(0.22, 0.72, 0.24);
  const leftLeg = new THREE.Mesh(legGeo, pantsMat);
  leftLeg.position.set(-0.14, 0.36, 0);
  leftLeg.castShadow = true;
  root.add(leftLeg);

  const rightLeg = new THREE.Mesh(legGeo, pantsMat);
  rightLeg.position.set(0.14, 0.36, 0);
  rightLeg.castShadow = true;
  root.add(rightLeg);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.68, 0.34), vestMat);
  torso.position.y = 1.04;
  torso.castShadow = true;
  root.add(torso);

  const armGeo = new THREE.BoxGeometry(0.18, 0.58, 0.2);
  const leftArm = new THREE.Mesh(armGeo, vestMat);
  leftArm.position.set(-0.39, 1.04, 0);
  root.add(leftArm);

  const rightArm = new THREE.Mesh(armGeo, vestMat);
  rightArm.position.set(0.39, 1.04, 0);
  root.add(rightArm);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.36, 0.36), skinMat);
  head.position.y = 1.56;
  head.castShadow = true;
  root.add(head);

  const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.27, 0.2, 10), hatMat);
  hat.position.y = 1.79;
  root.add(hat);

  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.05, 10), hatMat);
  brim.position.y = 1.7;
  root.add(brim);

  return {
    root,
    leftLeg,
    rightLeg,
    leftArm,
    rightArm,
    angle: Math.random() * Math.PI * 2,
    speed: 0.45 + Math.random() * 0.25,
    radius: 8.8 + Math.random() * 2.4,
  };
}

export function createTrafficCar(colorHex: number, laneZ: number, dir: number, textures: ProceduralTextureSet): TrafficCarRig {
  const root = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.32, metalness: 0.25 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x3a5266, roughness: 0.14, metalness: 0.3 });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x1a1e24, roughness: 0.9 });

  root.add(makeContactShadow(textures, 2.4, 4.4));

  const base = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.65, 3.9), bodyMat);
  base.position.y = 0.65;
  base.castShadow = true;
  root.add(base);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.62, 2.0), glassMat);
  cabin.position.set(0, 1.24, -0.15);
  cabin.castShadow = true;
  root.add(cabin);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.12, 1.9), bodyMat);
  roof.position.set(0, 1.58, -0.15);
  root.add(roof);

  const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.28, 10);
  wheelGeo.rotateZ(Math.PI / 2);
  for (const [wx, wz] of [
    [-0.95, 1.25],
    [0.95, 1.25],
    [-0.95, -1.25],
    [0.95, -1.25],
  ]) {
    const w = new THREE.Mesh(wheelGeo, tireMat);
    w.position.set(wx, 0.35, wz);
    root.add(w);
  }

  root.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
  root.position.set((Math.random() - 0.5) * 90, 0, laneZ);

  return { root, laneZ, dir, speed: 7.5 + Math.random() * 4.0 };
}

export function createDebrisPile(index: number): THREE.Group {
  const group = new THREE.Group();
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x7b746c, roughness: 0.9 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x9c6d3e, roughness: 0.82 });
  const crateMat = new THREE.MeshStandardMaterial({ color: 0xb9854a, roughness: 0.78 });

  const rock1 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.75, 0), rockMat);
  rock1.position.set(-0.35, 0.45, 0.2);
  rock1.scale.set(1.1, 0.7, 0.9);
  rock1.castShadow = true;
  group.add(rock1);

  const rock2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55, 0), rockMat);
  rock2.position.set(0.45, 0.32, -0.25);
  rock2.castShadow = true;
  group.add(rock2);

  const plank1 = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.14, 0.32), woodMat);
  plank1.position.set(0.1, 0.28, 0.38);
  plank1.rotation.set(0.12, 0.5 + index * 0.4, 0.18);
  plank1.castShadow = true;
  group.add(plank1);

  const crate = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.72, 0.85), crateMat);
  crate.position.set(-0.2, 0.36, -0.42);
  crate.rotation.y = index * 0.7;
  crate.castShadow = true;
  group.add(crate);

  group.userData = { interactType: 'debris', index };
  return group;
}

export interface BuildingStageMeshes {
  root: THREE.Group;
  formworkSegments: THREE.Group[];
  concreteSlab: THREE.Mesh;
  concreteMat: THREE.MeshStandardMaterial;
  structureSteps: THREE.Group[]; // 6 groups
  finishingSteps: THREE.Group[]; // 4 groups
  previewGhost: THREE.Group;
}

export function createConstructionBuildingVisuals(
  contract: ContractSpec,
  textures: ProceduralTextureSet,
): BuildingStageMeshes {
  const root = new THREE.Group();
  const floors = contract.floors;

  // Materials
  const timberMat = new THREE.MeshStandardMaterial({ color: 0xb88248, roughness: 0.8 });
  const rebarMat = new THREE.MeshStandardMaterial({ color: 0x4b5563, roughness: 0.4, metalness: 0.75 });
  const concreteMat = new THREE.MeshStandardMaterial({
    map: textures.concrete,
    color: 0x6b7280, // starts wet/dark, transitions to 0xf2f4f6 when cured
    roughness: 0.35,
    metalness: 0.08,
  });
  const colMat = new THREE.MeshStandardMaterial({ color: 0xc2c8ce, roughness: 0.78 });
  const rawWallMat = new THREE.MeshStandardMaterial({ color: 0xd4cfc4, roughness: 0.88 });
  const finishedWallMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(contract.wallColor), roughness: 0.72 });
  const roofMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(contract.roofColor), roughness: 0.62 });
  const accentMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(contract.accentColor), roughness: 0.48 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x68add6, roughness: 0.14, metalness: 0.3 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 });
  const copperMat = new THREE.MeshStandardMaterial({ color: 0xc26a3d, roughness: 0.35, metalness: 0.8 });
  const pipeBlueMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4, metalness: 0.35 });
  const foliageMat = new THREE.MeshStandardMaterial({ color: 0x4b8f3b, roughness: 0.82 });

  // 1. Formwork & Rebar (4 sides / quadrants)
  const formworkSegments: THREE.Group[] = [];
  const fwConfigs: { x: number; z: number; w: number; d: number }[] = [
    { x: 0, z: -5.45, w: 11.2, d: 0.24 },
    { x: 0, z: 5.45, w: 11.2, d: 0.24 },
    { x: -5.45, z: 0, w: 0.24, d: 11.0 },
    { x: 5.45, z: 0, w: 0.24, d: 11.0 },
  ];
  fwConfigs.forEach((cfg, idx) => {
    const seg = new THREE.Group();
    const board = new THREE.Mesh(new THREE.BoxGeometry(cfg.w, 0.95, cfg.d), timberMat);
    board.position.set(cfg.x, -0.22, cfg.z);
    board.castShadow = true;
    seg.add(board);

    // Steel rebar bars spanning a quadrant of the pit
    const qx = idx % 2 === 0 ? -2.5 : 2.5;
    const qz = idx < 2 ? -2.5 : 2.5;
    for (let r = -2; r <= 2; r += 1) {
      const barX = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 4.6, 6), rebarMat);
      barX.rotation.z = Math.PI / 2;
      barX.position.set(qx, -0.36, qz + r * 0.95);
      seg.add(barX);

      const barZ = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 4.6, 6), rebarMat);
      barZ.rotation.x = Math.PI / 2;
      barZ.position.set(qx + r * 0.95, -0.32, qz);
      seg.add(barZ);
    }

    seg.visible = false;
    root.add(seg);
    formworkSegments.push(seg);
  });

  // 2. Concrete Foundation Slab
  const concreteSlab = new THREE.Mesh(new THREE.BoxGeometry(10.8, 0.95, 10.8), concreteMat);
  concreteSlab.position.set(0, -0.7, 0);
  concreteSlab.receiveShadow = true;
  concreteSlab.visible = false;
  root.add(concreteSlab);

  // 3. Structural & Architectural Steps (6 progressive steps)
  const structureSteps: THREE.Group[] = [];
  const floorHeight = 3.25;
  const totalWallH = floors * floorHeight;
  const slabTopY = 0.25;

  // Step 0: Reinforced Concrete Columns
  const colGroup = new THREE.Group();
  const colPositions: [number, number][] = [
    [-4.8, -4.6],
    [0, -4.6],
    [4.8, -4.6],
    [-4.8, 4.6],
    [0, 4.6],
    [4.8, 4.6],
    [-4.8, 0],
    [4.8, 0],
  ];
  for (const [cx, cz] of colPositions) {
    const col = new THREE.Mesh(new THREE.BoxGeometry(0.46, totalWallH, 0.46), colMat);
    col.position.set(cx, slabTopY + totalWallH / 2, cz);
    col.castShadow = true;
    colGroup.add(col);
  }
  colGroup.visible = false;
  root.add(colGroup);
  structureSteps.push(colGroup);

  // Step 1: Structural Beams & Inter-Floor Slabs
  const beamGroup = new THREE.Group();
  for (let f = 1; f <= floors; f++) {
    const by = slabTopY + f * floorHeight;
    const deck = new THREE.Mesh(new THREE.BoxGeometry(10.1, 0.34, 9.7), colMat);
    deck.position.set(0, by, 0);
    deck.castShadow = true;
    deck.receiveShadow = true;
    beamGroup.add(deck);
  }
  beamGroup.visible = false;
  root.add(beamGroup);
  structureSteps.push(beamGroup);

  // Step 2: Exterior Structural Walls (with doorway gap & solid jambs)
  const wallGroup = new THREE.Group();
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(9.8, totalWallH, 0.36), rawWallMat);
  backWall.position.set(0, slabTopY + totalWallH / 2, -4.6);
  backWall.castShadow = true;
  backWall.receiveShadow = true;
  wallGroup.add(backWall);

  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.36, totalWallH, 9.2), rawWallMat);
  leftWall.position.set(-4.8, slabTopY + totalWallH / 2, 0);
  leftWall.castShadow = true;
  wallGroup.add(leftWall);

  const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.36, totalWallH, 9.2), rawWallMat);
  rightWall.position.set(4.8, slabTopY + totalWallH / 2, 0);
  rightWall.castShadow = true;
  wallGroup.add(rightWall);

  // Front wall split around doorway on ground floor
  const frontLeft = new THREE.Mesh(new THREE.BoxGeometry(3.9, totalWallH, 0.36), rawWallMat);
  frontLeft.position.set(-2.95, slabTopY + totalWallH / 2, 4.6);
  frontLeft.castShadow = true;
  wallGroup.add(frontLeft);

  const frontRight = new THREE.Mesh(new THREE.BoxGeometry(3.9, totalWallH, 0.36), rawWallMat);
  frontRight.position.set(2.95, slabTopY + totalWallH / 2, 4.6);
  frontRight.castShadow = true;
  wallGroup.add(frontRight);

  const frontHeaderH = totalWallH - 2.3;
  const frontHeader = new THREE.Mesh(new THREE.BoxGeometry(2.1, frontHeaderH, 0.36), rawWallMat);
  frontHeader.position.set(0, slabTopY + 2.3 + frontHeaderH / 2, 4.6);
  frontHeader.castShadow = true;
  wallGroup.add(frontHeader);

  wallGroup.visible = false;
  root.add(wallGroup);
  structureSteps.push(wallGroup);

  // Step 3: Windows & Door Assembly
  const openingsGroup = new THREE.Group();
  const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(2.05, 2.35, 0.44), trimMat);
  doorFrame.position.set(0, slabTopY + 1.175, 4.6);
  openingsGroup.add(doorFrame);
  const doorPanel = new THREE.Mesh(new THREE.BoxGeometry(1.72, 2.22, 0.48), accentMat);
  doorPanel.position.set(0, slabTopY + 1.11, 4.6);
  openingsGroup.add(doorPanel);

  for (let f = 0; f < floors; f++) {
    const wy = slabTopY + f * floorHeight + 1.75;
    for (const wx of [-2.95, 2.95]) {
      const wFrame = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.45, 0.44), trimMat);
      wFrame.position.set(wx, wy, 4.6);
      openingsGroup.add(wFrame);
      const wGlass = new THREE.Mesh(new THREE.BoxGeometry(1.82, 1.18, 0.48), glassMat);
      wGlass.position.set(wx, wy, 4.6);
      openingsGroup.add(wGlass);
    }
    // Side windows
    for (const wz of [-2.1, 2.1]) {
      const sFrameL = new THREE.Mesh(new THREE.BoxGeometry(0.44, 1.4, 1.9), trimMat);
      sFrameL.position.set(-4.8, wy, wz);
      openingsGroup.add(sFrameL);
      const sGlassL = new THREE.Mesh(new THREE.BoxGeometry(0.48, 1.12, 1.62), glassMat);
      sGlassL.position.set(-4.8, wy, wz);
      openingsGroup.add(sGlassL);

      const sFrameR = sFrameL.clone();
      sFrameR.position.x = 4.8;
      openingsGroup.add(sFrameR);
      const sGlassR = sGlassL.clone();
      sGlassR.position.x = 4.8;
      openingsGroup.add(sGlassR);
    }
  }
  openingsGroup.visible = false;
  root.add(openingsGroup);
  structureSteps.push(openingsGroup);

  // Step 4: Architectural Roof System
  const roofGroup = new THREE.Group();
  const roofBaseY = slabTopY + totalWallH + 0.16;
  if (floors >= 3) {
    // Commercial modern parapet roof + skylight
    const parapet = new THREE.Mesh(new THREE.BoxGeometry(10.5, 0.85, 10.1), roofMat);
    parapet.position.set(0, roofBaseY + 0.42, 0);
    parapet.castShadow = true;
    roofGroup.add(parapet);
    const skylight = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.55, 4.5), glassMat);
    skylight.position.set(0, roofBaseY + 0.95, 0);
    roofGroup.add(skylight);
  } else {
    const rShape = new THREE.Shape();
    rShape.moveTo(-5.65, 0);
    rShape.lineTo(5.65, 0);
    rShape.lineTo(0, 2.95);
    rShape.closePath();
    const rGeo = new THREE.ExtrudeGeometry(rShape, { depth: 10.5, bevelEnabled: false });
    rGeo.translate(0, 0, -5.25);
    const pitchedRoof = new THREE.Mesh(rGeo, roofMat);
    pitchedRoof.position.y = roofBaseY;
    pitchedRoof.castShadow = true;
    roofGroup.add(pitchedRoof);

    const chimney = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.3, 1.0), colMat);
    chimney.position.set(2.8, roofBaseY + 1.55, -2.0);
    chimney.castShadow = true;
    roofGroup.add(chimney);
  }
  roofGroup.visible = false;
  root.add(roofGroup);
  structureSteps.push(roofGroup);

  // Step 5: MEP Systems (Plumbing risers, Electrical Panel, HVAC / Solar)
  const mepGroup = new THREE.Group();
  const elecBox = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.95, 0.72), colMat);
  elecBox.position.set(5.06, slabTopY + 1.5, -2.8);
  mepGroup.add(elecBox);

  const conduit = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, totalWallH, 8), copperMat);
  conduit.position.set(5.05, slabTopY + totalWallH / 2, -2.2);
  mepGroup.add(conduit);

  const waterPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, totalWallH, 8), pipeBlueMat);
  waterPipe.position.set(5.05, slabTopY + totalWallH / 2, -1.7);
  mepGroup.add(waterPipe);

  const hvacUnit = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.95, 1.0), colMat);
  hvacUnit.position.set(5.65, 0.55, -2.0);
  hvacUnit.castShadow = true;
  mepGroup.add(hvacUnit);

  mepGroup.visible = false;
  root.add(mepGroup);
  structureSteps.push(mepGroup);

  // 4. Finishing & Landscaping (4 steps)
  const finishingSteps: THREE.Group[] = [];

  // Finish 0: Crisp Painted Facade Cladding & Base Stone Plinth
  const paintGroup = new THREE.Group();
  const paintBack = new THREE.Mesh(new THREE.BoxGeometry(9.92, totalWallH, 0.42), finishedWallMat);
  paintBack.position.set(0, slabTopY + totalWallH / 2, -4.6);
  paintGroup.add(paintBack);
  const paintLeft = new THREE.Mesh(new THREE.BoxGeometry(0.42, totalWallH, 9.32), finishedWallMat);
  paintLeft.position.set(-4.8, slabTopY + totalWallH / 2, 0);
  paintGroup.add(paintLeft);
  const paintRight = new THREE.Mesh(new THREE.BoxGeometry(0.42, totalWallH, 9.32), finishedWallMat);
  paintRight.position.set(4.8, slabTopY + totalWallH / 2, 0);
  paintGroup.add(paintRight);
  const paintFrontL = new THREE.Mesh(new THREE.BoxGeometry(3.96, totalWallH, 0.42), finishedWallMat);
  paintFrontL.position.set(-2.95, slabTopY + totalWallH / 2, 4.6);
  paintGroup.add(paintFrontL);
  const paintFrontR = new THREE.Mesh(new THREE.BoxGeometry(3.96, totalWallH, 0.42), finishedWallMat);
  paintFrontR.position.set(2.95, slabTopY + totalWallH / 2, 4.6);
  paintGroup.add(paintFrontR);
  const paintBand = new THREE.Mesh(new THREE.BoxGeometry(10.2, 0.28, 9.75), accentMat);
  paintBand.position.set(0, slabTopY + totalWallH - 0.14, 0);
  paintGroup.add(paintBand);
  paintGroup.visible = false;
  root.add(paintGroup);
  finishingSteps.push(paintGroup);

  // Finish 1: Entry Porch Awning, Columns & Lantern
  const porchGroup = new THREE.Group();
  const awning = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.22, 1.85), accentMat);
  awning.position.set(0, slabTopY + 2.55, 5.55);
  awning.castShadow = true;
  porchGroup.add(awning);
  for (const px of [-1.45, 1.45]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.5, 0.18), trimMat);
    post.position.set(px, slabTopY + 1.25, 6.25);
    porchGroup.add(post);
  }
  const steps = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.28, 1.4), colMat);
  steps.position.set(0, 0.14, 5.85);
  porchGroup.add(steps);
  const lantern = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 10, 10),
    new THREE.MeshStandardMaterial({ color: 0xfff0b3, emissive: 0xffc857, emissiveIntensity: 1.1 }),
  );
  lantern.position.set(1.25, slabTopY + 2.1, 4.9);
  porchGroup.add(lantern);
  porchGroup.visible = false;
  root.add(porchGroup);
  finishingSteps.push(porchGroup);

  // Finish 2: Front Stone Walkway
  const walkGroup = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const paver = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.08, 0.95), colMat);
    paver.position.set(0, 0.04, 7.1 + i * 1.15);
    paver.receiveShadow = true;
    walkGroup.add(paver);
  }
  walkGroup.visible = false;
  root.add(walkGroup);
  finishingSteps.push(walkGroup);

  // Finish 3: Yard Landscaping (Shrubs & Ornamental Trees)
  const yardGroup = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.88 });
  const shrubCoords: [number, number][] = [
    [-3.6, 5.75],
    [-2.4, 5.75],
    [2.4, 5.75],
    [3.6, 5.75],
  ];
  for (const [sx, sz] of shrubCoords) {
    const bush = new THREE.Mesh(new THREE.DodecahedronGeometry(0.62, 0), foliageMat);
    bush.position.set(sx, 0.5, sz);
    bush.scale.set(1.1, 0.78, 1.0);
    bush.castShadow = true;
    yardGroup.add(bush);
  }
  for (const tx of [-6.3, 6.3]) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 1.7, 7), trunkMat);
    trunk.position.set(tx, 0.85, 6.2);
    trunk.castShadow = true;
    yardGroup.add(trunk);
    const crown = new THREE.Mesh(new THREE.ConeGeometry(1.15, 2.3, 7), foliageMat);
    crown.position.set(tx, 2.4, 6.2);
    crown.castShadow = true;
    yardGroup.add(crown);
  }
  yardGroup.visible = false;
  root.add(yardGroup);
  finishingSteps.push(yardGroup);

  // Blueprint Preview Ghost (shown during placement stages; rotates with R)
  const previewGhost = new THREE.Group();
  const ghostMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    wireframe: true,
    transparent: true,
    opacity: 0.55,
  });
  const ghostBox = new THREE.Mesh(new THREE.BoxGeometry(10.6, 1.2, 10.6), ghostMat);
  ghostBox.position.y = 0.65;
  previewGhost.add(ghostBox);
  previewGhost.visible = false;
  root.add(previewGhost);

  return {
    root,
    formworkSegments,
    concreteSlab,
    concreteMat,
    structureSteps,
    finishingSteps,
    previewGhost,
  };
}
