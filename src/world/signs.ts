import * as THREE from 'three';
import {
  panelSign,
  textOnly,
  flagTexture,
  stopSignTexture,
  diamondSignTexture,
  routeShieldTexture,
  sheriffDoorTexture,
  gasLogoTexture,
  makeCanvas,
  drawLines,
} from './textures';

export type SignId =
  | 'dons'
  | 'bank'
  | 'fruit'
  | 'market24'
  | 'liquor'
  | 'pawn'
  | 'auto'
  | 'gun'
  | 'diner'
  | 'sheriff'
  | 'motelV'
  | 'vacancy'
  | 'motelName'
  | 'church'
  | 'usedcars'
  | 'welcome'
  | 'lumber'
  | 'feed'
  | 'forsale'
  | 'stop'
  | 'ped'
  | 'curve'
  | 'us20'
  | 'sheriffDoor'
  | 'flag'
  | 'gas'
  | 'gasWord'
  | 'gasStore'
  | 'press'
  | 'speed25'
  | 'billboardCola'
  | 'billboardPark'
  | 'roadStop'
  | 'n911'
  | 'mail'
  | 'hardware'
  | 'postOffice';

function vertical(text: string, bg: string, fg: string, font: string, border: string): THREE.CanvasTexture {
  const W = 220;
  const H = 220 * text.length * 0.9 + 60;
  const [c, g] = makeCanvas(W, H);
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  g.strokeStyle = border;
  g.lineWidth = 14;
  g.strokeRect(7, 7, W - 14, H - 14);
  g.fillStyle = fg;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `700 170px "${font}"`;
  const step = (H - 60) / text.length;
  [...text].forEach((ch, i) => g.fillText(ch, W / 2, 30 + step * (i + 0.5) + 6));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Lazily builds and caches every sign texture in the town. */
export class SignBook {
  private cache = new Map<SignId, THREE.Texture>();

  get(id: SignId): THREE.Texture {
    let t = this.cache.get(id);
    if (!t) {
      t = this.make(id);
      t.name = id;
      this.cache.set(id, t);
    }
    return t;
  }

  private make(id: SignId): THREE.Texture {
    switch (id) {
      case 'dons':
        return panelSign(1024, 220, '#3a2e72', [
          { text: "DON'S DONUTS", font: 'Alfa Slab One', color: '#f7c832', y: 0.55, size: 0.62, stroke: '#1b1442', strokeW: 12, maxW: 0.92 },
        ], { border: '#251c55', borderW: 10 });
      case 'bank':
        return panelSign(1024, 200, '#b1252b', [{ text: 'American Bank', font: 'Rye', color: '#fbf6ec', y: 0.56, size: 0.58 }], {
          border: '#f2ece0',
          borderW: 12,
        });
      case 'fruit':
        return panelSign(1024, 280, '#efe3bf', [
          { text: 'Fruit Market', font: 'Rye', color: '#262626', y: 0.42, size: 0.46 },
          { text: '— SINCE 1956 —', font: 'Oswald', weight: '600', color: '#7a2a1a', y: 0.82, size: 0.17 },
        ], { border: '#3d3a30', borderW: 14 });
      case 'market24':
        return panelSign(1024, 200, '#151515', [{ text: 'MARKET 24H', font: 'Bebas Neue', color: '#ffd21f', y: 0.56, size: 0.78, letter: 6 }], {
          border: '#ffd21f',
          borderW: 6,
        });
      case 'liquor':
        return vertical('LIQUOR', '#f4efe2', '#b1252b', 'Oswald', '#2a2a2a');
      case 'pawn':
        return panelSign(1024, 220, '#f2efe6', [{ text: 'PAWN SHOP', font: 'Oswald', weight: '700', color: '#8e1f24', y: 0.55, size: 0.62 }], {
          border: '#8e1f24',
        });
      case 'auto':
        return panelSign(1400, 220, '#1d2f5a', [{ text: 'AUTO SERVICE  ·  CALL: 555-6743', font: 'Oswald', weight: '600', color: '#ffffff', y: 0.55, size: 0.52 }], {
          border: '#e9e9e9',
          borderW: 10,
        });
      case 'gun':
        return panelSign(1024, 220, '#1c2433', [{ text: 'GUN STORE', font: 'Oswald', weight: '700', color: '#f2d24b', y: 0.55, size: 0.62 }], {
          border: '#f2d24b',
        });
      case 'hardware':
        return panelSign(1024, 220, '#c33a2a', [{ text: 'HARDWARE', font: 'Alfa Slab One', color: '#ffffff', y: 0.55, size: 0.6 }], {
          border: '#ffffff',
          borderW: 10,
        });
      case 'diner':
        return panelSign(1024, 300, '#f6efe0', [{ text: 'Pine Cone Diner', font: 'Lobster', color: '#c8262c', y: 0.5, size: 0.58, stroke: '#ffffff', strokeW: 10 }], {
          border: '#1f6f6a',
          borderW: 16,
          radius: 40,
        });
      case 'sheriff':
        return panelSign(1200, 200, '#f4f0e2', [{ text: '★  COUNTY SHERIFF  ★', font: 'Oswald', weight: '700', color: '#2a2a2a', y: 0.55, size: 0.55 }], {
          border: '#3a3a3a',
          borderW: 8,
        });
      case 'motelV':
        return vertical('MOTEL', '#fbf7ee', '#d22b2b', 'Oswald', '#d22b2b');
      case 'vacancy':
        return panelSign(800, 200, '#161616', [{ text: 'VACANCY', font: 'Oswald', weight: '700', color: '#4dff86', y: 0.55, size: 0.6 }]);
      case 'motelName':
        return panelSign(1024, 256, '#2f6b6a', [{ text: 'Cascade Motor Inn', font: 'Lobster', color: '#fff7e6', y: 0.52, size: 0.55 }], {
          border: '#f3e7c8',
          borderW: 12,
          radius: 30,
        });
      case 'church':
        return panelSign(900, 300, '#ffffff', [
          { text: 'PINE HOLLOW', font: 'Oswald', weight: '600', color: '#333333', y: 0.3, size: 0.22 },
          { text: 'Community Church', font: 'Rye', color: '#2a3a5a', y: 0.66, size: 0.3 },
        ], { border: '#2a3a5a', borderW: 12 });
      case 'usedcars':
        return panelSign(1200, 300, '#ffffff', [
          { text: "BOB'S USED CARS", font: 'Alfa Slab One', color: '#c8262c', y: 0.42, size: 0.42 },
          { text: '★ EASY FINANCING ★', font: 'Oswald', weight: '600', color: '#1d3c7a', y: 0.8, size: 0.2 },
        ], { border: '#1d3c7a', borderW: 14 });
      case 'welcome':
        return panelSign(1200, 560, '#6d4a2c', [
          { text: 'Welcome to', font: 'Lobster', color: '#f3e6c4', y: 0.2, size: 0.14 },
          { text: 'PINE HOLLOW', font: 'Rye', color: '#f7ecd0', y: 0.47, size: 0.28, stroke: '#3a2615', strokeW: 10 },
          { text: 'EST. 1889  ·  POP. 2,140', font: 'Oswald', weight: '600', color: '#f3e6c4', y: 0.78, size: 0.1 },
        ], { border: '#3d2814', borderW: 22, radius: 34 });
      case 'lumber':
        return panelSign(1200, 240, '#2c4a2e', [{ text: 'CASCADE LUMBER CO.', font: 'Rye', color: '#f3e7c8', y: 0.56, size: 0.48 }], {
          border: '#f3e7c8',
          borderW: 10,
        });
      case 'feed':
        return panelSign(1024, 220, '#7a2a20', [{ text: 'FEED & SEED', font: 'Alfa Slab One', color: '#f6ecd6', y: 0.55, size: 0.6 }], {
          border: '#f6ecd6',
        });
      case 'postOffice':
        return panelSign(1200, 200, '#f4f1ea', [{ text: 'UNITED STATES POST OFFICE', font: 'Oswald', weight: '600', color: '#1d2f5a', y: 0.55, size: 0.45 }], {
          border: '#1d2f5a',
          borderW: 8,
        });
      case 'forsale':
        return panelSign(512, 380, '#d6312b', [
          { text: 'FOR', font: 'Oswald', weight: '700', color: '#ffffff', y: 0.2, size: 0.2 },
          { text: 'SALE', font: 'Oswald', weight: '700', color: '#ffffff', y: 0.47, size: 0.33 },
        ], {
          border: '#ffffff',
          borderW: 16,
          draw: (g, w, h) => {
            g.fillStyle = '#ffffff';
            g.fillRect(w * 0.12, h * 0.68, w * 0.76, h * 0.18);
          },
        });
      case 'stop':
        return stopSignTexture();
      case 'ped':
        return diamondSignTexture('ped');
      case 'curve':
        return diamondSignTexture('curve');
      case 'us20':
        return routeShieldTexture('20');
      case 'sheriffDoor':
        return sheriffDoorTexture();
      case 'flag':
        return flagTexture();
      case 'gas':
        return gasLogoTexture(false);
      case 'gasWord':
        return gasLogoTexture(true);
      case 'gasStore':
        return panelSign(1024, 200, '#f4f1ea', [{ text: '86  GASOLINE', font: 'Oswald', weight: '700', color: '#d8321c', y: 0.55, size: 0.6 }], {
          border: '#d8321c',
          borderW: 10,
        });
      case 'press':
        return panelSign(256, 128, '#f4f1ea', [{ text: 'PRESS', font: 'Oswald', weight: '700', color: '#1b1b1b', y: 0.55, size: 0.6 }]);
      case 'speed25':
        return panelSign(256, 320, '#ffffff', [
          { text: 'SPEED', font: 'Oswald', weight: '600', color: '#111', y: 0.17, size: 0.15 },
          { text: 'LIMIT', font: 'Oswald', weight: '600', color: '#111', y: 0.34, size: 0.15 },
          { text: '25', font: 'Oswald', weight: '700', color: '#111', y: 0.68, size: 0.42 },
        ], { border: '#111111', borderW: 10, radius: 16 });
      case 'billboardCola':
        return panelSign(1600, 560, '#c8262c', [
          { text: 'Ice Cold', font: 'Lobster', color: '#ffffff', y: 0.25, size: 0.2 },
          { text: 'TIMBER COLA', font: 'Alfa Slab One', color: '#ffd21f', y: 0.55, size: 0.3, stroke: '#7a1010', strokeW: 12 },
          { text: 'THE TASTE OF THE NORTHWEST', font: 'Oswald', weight: '600', color: '#ffffff', y: 0.84, size: 0.1 },
        ], { border: '#ffffff', borderW: 18 });
      case 'billboardPark':
        return panelSign(1600, 560, '#2f5a3a', [
          { text: 'MT. CASCADIA', font: 'Rye', color: '#f7ecd0', y: 0.34, size: 0.26 },
          { text: 'STATE PARK  ·  NEXT EXIT  ·  12 MI', font: 'Oswald', weight: '600', color: '#ffffff', y: 0.68, size: 0.12 },
        ], {
          border: '#f7ecd0',
          borderW: 18,
          draw: (g, w, h) => {
            g.fillStyle = '#e9eef2';
            g.beginPath();
            g.moveTo(w * 0.05, h * 0.92);
            g.lineTo(w * 0.2, h * 0.6);
            g.lineTo(w * 0.35, h * 0.92);
            g.fill();
            g.beginPath();
            g.moveTo(w * 0.65, h * 0.92);
            g.lineTo(w * 0.82, h * 0.55);
            g.lineTo(w * 0.97, h * 0.92);
            g.fill();
          },
        });
      case 'roadStop':
        return textOnly(512, 200, [{ text: 'STOP', font: 'Oswald', weight: '700', color: '#f1f1ec', y: 0.5, size: 0.95, maxW: 0.96 }]);
      case 'n911':
        return textOnly(256, 128, [{ text: '911', font: 'Oswald', weight: '700', color: '#161616', y: 0.5, size: 0.7 }]);
      case 'mail': {
        const [c, g] = makeCanvas(256, 128);
        g.fillStyle = '#2c4a8c';
        g.fillRect(0, 0, 256, 128);
        drawLines(g, 256, 128, [{ text: 'U.S. MAIL', font: 'Oswald', weight: '700', color: '#ffffff', y: 0.5, size: 0.45 }]);
        const t = new THREE.CanvasTexture(c);
        t.colorSpace = THREE.SRGBColorSpace;
        return t;
      }
    }
  }
}
