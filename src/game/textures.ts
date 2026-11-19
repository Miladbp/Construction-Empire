import * as THREE from 'three';

function makeCanvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

function finalizeColorTexture(canvas: HTMLCanvasElement, repeatX: number, repeatY: number, maxAniso: number): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = Math.min(8, maxAniso);
  tex.needsUpdate = true;
  return tex;
}

export interface ProceduralTextureSet {
  asphalt: THREE.CanvasTexture;
  grass: THREE.CanvasTexture;
  dirt: THREE.CanvasTexture;
  concrete: THREE.CanvasTexture;
  hazard: THREE.CanvasTexture;
  contactShadow: THREE.CanvasTexture;
  dispose: () => void;
}

export function createProceduralTextures(renderer: THREE.WebGLRenderer): ProceduralTextureSet {
  const maxAniso = renderer.capabilities.getMaxAnisotropy();

  // 1. Asphalt Road with dashed yellow centerline & subtle aggregate
  const [aCanvas, aCtx] = makeCanvas(256);
  aCtx.fillStyle = '#363b42';
  aCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2400; i++) {
    const x = (i * 73) % 256;
    const y = (i * 139) % 256;
    aCtx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.08)';
    aCtx.fillRect(x, y, 2, 2);
  }
  // White shoulder edges
  aCtx.fillStyle = '#d4dae2';
  aCtx.fillRect(10, 0, 6, 256);
  aCtx.fillRect(240, 0, 6, 256);
  // Dashed amber centerline
  aCtx.fillStyle = '#f5b83d';
  aCtx.fillRect(124, 16, 8, 92);
  aCtx.fillRect(124, 144, 8, 92);
  const asphalt = finalizeColorTexture(aCanvas, 1, 14, maxAniso);

  // 2. Stylized Grass Terrain
  const [gCanvas, gCtx] = makeCanvas(256);
  gCtx.fillStyle = '#6da34d';
  gCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1600; i++) {
    const x = (i * 97) % 256;
    const y = (i * 53) % 256;
    gCtx.fillStyle = i % 3 === 0 ? '#7ab259' : i % 3 === 1 ? '#5e9240' : '#85bc64';
    gCtx.fillRect(x, y, 5, 5);
  }
  const grass = finalizeColorTexture(gCanvas, 18, 18, maxAniso);

  // 3. Construction Site Compacted Earth / Soil
  const [dCanvas, dCtx] = makeCanvas(256);
  dCtx.fillStyle = '#a48358';
  dCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2200; i++) {
    const x = (i * 61) % 256;
    const y = (i * 113) % 256;
    dCtx.fillStyle = i % 3 === 0 ? '#b7966b' : i % 3 === 1 ? '#8c6d45' : '#9b7a50';
    dCtx.fillRect(x, y, 4, 4);
  }
  const dirt = finalizeColorTexture(dCanvas, 5, 5, maxAniso);

  // 4. Architectural Concrete Slab with expansion joints
  const [cCanvas, cCtx] = makeCanvas(256);
  cCtx.fillStyle = '#c9cdd1';
  cCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1800; i++) {
    const x = (i * 89) % 256;
    const y = (i * 47) % 256;
    cCtx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.09)' : 'rgba(40,48,56,0.06)';
    cCtx.fillRect(x, y, 3, 3);
  }
  cCtx.strokeStyle = 'rgba(70,76,84,0.28)';
  cCtx.lineWidth = 2;
  cCtx.strokeRect(2, 2, 124, 124);
  cCtx.strokeRect(130, 2, 124, 124);
  cCtx.strokeRect(2, 130, 124, 124);
  cCtx.strokeRect(130, 130, 124, 124);
  const concrete = finalizeColorTexture(cCanvas, 3, 3, maxAniso);

  // 5. Industrial Safety Hazard Chevron
  const [hCanvas, hCtx] = makeCanvas(128);
  hCtx.fillStyle = '#f5b301';
  hCtx.fillRect(0, 0, 128, 128);
  hCtx.fillStyle = '#1f242c';
  for (let i = -128; i < 256; i += 32) {
    hCtx.beginPath();
    hCtx.moveTo(i, 0);
    hCtx.lineTo(i + 16, 0);
    hCtx.lineTo(i + 144, 128);
    hCtx.lineTo(i + 128, 128);
    hCtx.closePath();
    hCtx.fill();
  }
  const hazard = finalizeColorTexture(hCanvas, 2, 1, maxAniso);

  // 6. Soft Radial Contact Shadow
  const [sCanvas, sCtx] = makeCanvas(128);
  const grad = sCtx.createRadialGradient(64, 64, 8, 64, 64, 62);
  grad.addColorStop(0, 'rgba(10,14,20,0.65)');
  grad.addColorStop(0.55, 'rgba(10,14,20,0.32)');
  grad.addColorStop(1, 'rgba(10,14,20,0)');
  sCtx.fillStyle = grad;
  sCtx.fillRect(0, 0, 128, 128);
  const contactShadow = new THREE.CanvasTexture(sCanvas);
  contactShadow.colorSpace = THREE.SRGBColorSpace;
  contactShadow.needsUpdate = true;

  return {
    asphalt,
    grass,
    dirt,
    concrete,
    hazard,
    contactShadow,
    dispose: () => {
      asphalt.dispose();
      grass.dispose();
      dirt.dispose();
      concrete.dispose();
      hazard.dispose();
      contactShadow.dispose();
    },
  };
}
