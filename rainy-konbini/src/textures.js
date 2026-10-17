import * as THREE from 'three';

const JP_FONT = '"Yu Gothic", "YuGothic", "Meiryo", "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif';
const EN_FONT = '"Trebuchet MS", "Avenir Next", "Segoe UI", sans-serif';

function canvasTexture(width, height, draw, { repeat = null, srgb = true } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  draw(ctx, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  texture.anisotropy = 8;
  if (repeat) {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeat[0], repeat[1]);
  }
  texture.needsUpdate = true;
  return texture;
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function sparkle(ctx, cx, cy, outer, inner, points = 4, rotation = 0) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = rotation + (i * Math.PI) / points;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

export function makeAsphaltTexture() {
  return canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#1b2735';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 4800; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const r = Math.random() * 1.8 + 0.2;
      const l = 24 + Math.random() * 35;
      ctx.fillStyle = `rgba(${l + 18}, ${l + 28}, ${l + 45}, ${0.18 + Math.random() * 0.35})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // Long, wet smears in the grain.
    ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < 35; i++) {
      ctx.strokeStyle = `rgba(90,120,150,${0.015 + Math.random() * 0.035})`;
      ctx.lineWidth = 1 + Math.random() * 9;
      ctx.beginPath();
      const x = Math.random() * w;
      ctx.moveTo(x, 0);
      ctx.bezierCurveTo(x + 20, h * 0.35, x - 20, h * 0.7, x + 8, h);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
  }, { repeat: [3.4, 3.4] });
}

export function makePavementTexture() {
  return canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#7b8290';
    ctx.fillRect(0, 0, w, h);
    const cell = 64;
    for (let y = 0; y < h; y += cell) {
      for (let x = 0; x < w; x += cell) {
        const tint = 121 + Math.floor(Math.random() * 17);
        ctx.fillStyle = `rgb(${tint},${tint + 5},${tint + 11})`;
        ctx.fillRect(x + 2, y + 2, cell - 4, cell - 4);
        ctx.strokeStyle = 'rgba(45,52,64,.3)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, cell - 2, cell - 2);
        for (let i = 0; i < 8; i++) {
          ctx.fillStyle = `rgba(50,58,70,${0.03 + Math.random() * 0.08})`;
          ctx.fillRect(x + Math.random() * cell, y + Math.random() * cell, Math.random() * 5, Math.random() * 5);
        }
      }
    }
    const gradient = ctx.createLinearGradient(0, 0, w, h);
    gradient.addColorStop(0, 'rgba(28,48,70,.14)');
    gradient.addColorStop(0.55, 'rgba(255,255,255,.02)');
    gradient.addColorStop(1, 'rgba(20,32,48,.18)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  }, { repeat: [2.8, 2.8] });
}

export function makeStoreFloorTexture() {
  return canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#ddcfb7';
    ctx.fillRect(0, 0, w, h);
    const cell = 128;
    for (let y = 0; y < h; y += cell) {
      for (let x = 0; x < w; x += cell) {
        ctx.fillStyle = ((x / cell + y / cell) % 2 === 0) ? '#e7dac5' : '#d8c9b1';
        ctx.fillRect(x, y, cell, cell);
        ctx.strokeStyle = 'rgba(105,91,72,.16)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, cell, cell);
      }
    }
    ctx.globalCompositeOperation = 'multiply';
    for (let i = 0; i < 140; i++) {
      ctx.fillStyle = `rgba(102,91,72,${0.02 + Math.random() * 0.03})`;
      ctx.beginPath();
      ctx.arc(Math.random() * w, Math.random() * h, 5 + Math.random() * 18, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }, { repeat: [4, 4] });
}

export function makeSignTexture() {
  return canvasTexture(1536, 256, (ctx, w, h) => {
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#fff8e7');
    bg.addColorStop(0.55, '#f7e9cc');
    bg.addColorStop(1, '#edd9b4');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#173f47';
    ctx.fillRect(0, 0, w, 14);
    ctx.fillRect(0, h - 14, w, 14);
    ctx.fillStyle = '#df5d44';
    ctx.fillRect(0, 14, w, 5);

    // Sparkling shop mark.
    ctx.save();
    ctx.translate(126, h / 2);
    ctx.fillStyle = '#e76a4e';
    sparkle(ctx, 0, 0, 68, 23, 4, -Math.PI / 2);
    ctx.fill();
    ctx.fillStyle = '#f2c365';
    ctx.beginPath();
    ctx.arc(0, 0, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#173f47';
    ctx.font = `700 112px ${JP_FONT}`;
    ctx.fillText('ほしみマート', 232, 118);
    ctx.fillStyle = '#37656a';
    ctx.font = `600 30px ${EN_FONT}`;
    ctx.letterSpacing = '10px';
    ctx.fillText('HOSHIMI  MART  ·  SINCE 1987', 238, 197);
    ctx.letterSpacing = '0px';

    roundRect(ctx, w - 260, 48, 185, 160, 26);
    ctx.fillStyle = '#df5d44';
    ctx.fill();
    ctx.fillStyle = '#fff7e5';
    ctx.textAlign = 'center';
    ctx.font = `800 92px ${EN_FONT}`;
    ctx.fillText('24H', w - 168, 116);
    ctx.font = `700 25px ${EN_FONT}`;
    ctx.fillText('OPEN', w - 168, 174);

    ctx.strokeStyle = 'rgba(23,63,71,.2)';
    ctx.lineWidth = 2;
    ctx.strokeRect(16, 32, w - 32, h - 64);
  });
}

export function makeVerticalSignTexture() {
  return canvasTexture(256, 1024, (ctx, w, h) => {
    ctx.fillStyle = '#f9edd6';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#174850';
    ctx.lineWidth = 12;
    ctx.strokeRect(8, 8, w - 16, h - 16);
    ctx.fillStyle = '#df5d44';
    ctx.beginPath();
    ctx.arc(w / 2, 100, 54, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f9edd6';
    sparkle(ctx, w / 2, 100, 38, 12, 4, -Math.PI / 2);
    ctx.fill();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#174850';
    ctx.font = `700 100px ${JP_FONT}`;
    const chars = ['ほ', 'し', 'み', 'マ', 'ー', 'ト'];
    chars.forEach((char, i) => ctx.fillText(char, w / 2, 250 + i * 112));
    ctx.fillStyle = '#df5d44';
    ctx.font = `800 57px ${EN_FONT}`;
    ctx.fillText('24H', w / 2, 945);
  });
}

export function makePosterTexture(index = 0) {
  const themes = [
    { bg: '#f6c04e', accent: '#d44c39', title: '新発売', sub: 'とろける カレーパン', color: '#3a2b20', motif: 'curry' },
    { bg: '#e85f51', accent: '#ffe8b7', title: 'からあげ', sub: 'ジューシー 4個入', color: '#fff7e6', motif: 'karaage' },
    { bg: '#2d7075', accent: '#f5d478', title: 'HOT', sub: 'ブレンドコーヒー', color: '#fff7e6', motif: 'coffee' },
    { bg: '#f2ead8', accent: '#df5d44', title: 'おにぎり', sub: '鮭・ツナ・梅', color: '#244a4f', motif: 'onigiri' },
    { bg: '#7fa9c8', accent: '#fff0ca', title: 'アイス', sub: '夏の新作 ソーダ味', color: '#17334b', motif: 'ice' },
    { bg: '#d7a7bb', accent: '#fff9ec', title: 'スイーツ', sub: '雨の日 プリン', color: '#54333e', motif: 'pudding' },
  ];
  const t = themes[index % themes.length];
  return canvasTexture(420, 600, (ctx, w, h) => {
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, t.bg);
    grad.addColorStop(1, t.accent);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,.12)';
    ctx.beginPath();
    ctx.arc(w * 0.8, h * 0.16, 130, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.65)';
    ctx.lineWidth = 6;
    ctx.strokeRect(20, 20, w - 40, h - 40);

    ctx.fillStyle = t.color;
    ctx.textAlign = 'left';
    ctx.font = `800 54px ${JP_FONT}`;
    ctx.fillText(t.title, 42, 100);
    ctx.font = `600 23px ${JP_FONT}`;
    ctx.fillText(t.sub, 44, 142);

    // Simple food illustration, specific to each poster.
    ctx.save();
    ctx.translate(w / 2, h * 0.59);
    if (t.motif === 'coffee') {
      ctx.fillStyle = '#f7f0dd';
      roundRect(ctx, -92, -70, 184, 180, 24);
      ctx.fill();
      ctx.fillStyle = '#5b3524';
      roundRect(ctx, -77, -54, 154, 70, 12);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.6)';
      ctx.beginPath();
      ctx.ellipse(0, -20, 44, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.55)';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(0, -85, 34, Math.PI * 1.1, Math.PI * 1.8);
      ctx.stroke();
    } else if (t.motif === 'onigiri') {
      ctx.fillStyle = '#fffaf0';
      ctx.beginPath();
      ctx.moveTo(0, -105);
      ctx.lineTo(120, 88);
      ctx.lineTo(-120, 88);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#263f37';
      ctx.fillRect(-57, 30, 114, 92);
      ctx.fillStyle = '#f28a78';
      ctx.beginPath();
      ctx.arc(0, 15, 24, 0, Math.PI * 2);
      ctx.fill();
    } else if (t.motif === 'karaage') {
      ctx.fillStyle = '#f9e3b6';
      roundRect(ctx, -130, -50, 260, 170, 28);
      ctx.fill();
      const colors = ['#b95b2d', '#d8863a', '#9f4c29', '#e1a252'];
      for (let i = 0; i < 13; i++) {
        ctx.fillStyle = colors[i % colors.length];
        const x = -92 + (i % 5) * 44 + (Math.random() - 0.5) * 10;
        const y = -12 + Math.floor(i / 5) * 42 + (Math.random() - 0.5) * 10;
        ctx.beginPath();
        ctx.arc(x, y, 19 + Math.random() * 7, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (t.motif === 'curry') {
      ctx.fillStyle = '#f7d68f';
      ctx.beginPath();
      ctx.ellipse(0, 25, 140, 88, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#9b4b24';
      ctx.beginPath();
      ctx.ellipse(0, 20, 100, 56, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e9b35c';
      ctx.beginPath();
      ctx.ellipse(-30, 0, 30, 20, 0.25, 0, Math.PI * 2);
      ctx.fill();
    } else if (t.motif === 'ice') {
      ctx.fillStyle = '#f0f6ef';
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(-35 + i * 35, -20 + (i % 2) * 18, 48, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#75c9d1';
      ctx.fillRect(-75, 20, 150, 120);
    } else {
      ctx.fillStyle = '#fff5dd';
      ctx.beginPath();
      ctx.moveTo(-95, 95);
      ctx.lineTo(-72, -20);
      ctx.quadraticCurveTo(0, -70, 72, -20);
      ctx.lineTo(95, 95);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#d29a4b';
      ctx.beginPath();
      ctx.ellipse(0, -20, 56, 22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#a44731';
      ctx.beginPath();
      ctx.arc(0, -80, 15, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    ctx.fillStyle = t.color;
    ctx.textAlign = 'center';
    ctx.font = `700 24px ${JP_FONT}`;
    ctx.fillText('期間限定  ·  24時間 営業', w / 2, h - 48);
  });
}

export function makeMagazineTexture(index = 0) {
  const palettes = [
    ['#ed6a5a', '#ffe9cf', 'CITY', '雨の街'],
    ['#274f72', '#f5d076', 'SCENE', '夜の喫茶'],
    ['#5c8a76', '#faf1d7', 'LIFE', '小さな暮らし'],
    ['#e8ad4d', '#283c4a', 'WEEKLY', '星と海'],
    ['#b56c8f', '#fff4e1', 'STYLE', '秋の服'],
    ['#3f736f', '#f0b9a4', 'COMIC', '放課後'],
    ['#d6d0be', '#3e4f62', 'TRAVEL', 'ローカル線'],
    ['#dd5b4d', '#ffe6c3', 'FOOD', '深夜ごはん'],
  ];
  const p = palettes[index % palettes.length];
  return canvasTexture(300, 410, (ctx, w, h) => {
    ctx.fillStyle = p[0];
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = p[1];
    ctx.fillRect(14, 14, w - 28, h - 28);
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = p[0];
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.48, 92, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(w * 0.38, h * 0.44, 52, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = p[1];
    ctx.font = `800 37px ${EN_FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText(p[2], 28, 62);
    ctx.fillStyle = p[0];
    ctx.font = `800 55px ${JP_FONT}`;
    ctx.fillText(p[3], 28, h - 66);
    ctx.font = `500 17px ${EN_FONT}`;
    ctx.fillText('HOSHIMI BOOKS  ·  OCTOBER', 30, h - 30);
  });
}

export function makeVendingTexture() {
  return canvasTexture(600, 980, (ctx, w, h) => {
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#eff8ff');
    bg.addColorStop(0.5, '#d8ebf5');
    bg.addColorStop(1, '#fbe9d0');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#c8453f';
    ctx.fillRect(0, 0, w, 74);
    ctx.fillStyle = '#fff8e8';
    ctx.font = `800 36px ${EN_FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText('DRINK  STATION', 30, 48);
    ctx.fillStyle = '#f2cc6b';
    ctx.font = `700 22px ${JP_FONT}`;
    ctx.textAlign = 'right';
    ctx.fillText('つめた〜い', w - 28, 48);

    const groups = [
      { name: 'COFFEE', colors: ['#3c2a24', '#b2663d', '#6d4b31', '#d7a95a'], y: 110 },
      { name: 'TEA', colors: ['#5e8d43', '#c9d36e', '#81623a', '#3d6b50'], y: 350 },
      { name: 'SODA', colors: ['#4c8fc7', '#e9b94e', '#d06755', '#76b9ad'], y: 590 },
    ];
    groups.forEach((group, gi) => {
      ctx.fillStyle = 'rgba(28,50,62,.76)';
      ctx.fillRect(20, group.y - 30, w - 40, 26);
      ctx.fillStyle = '#fff';
      ctx.font = `700 19px ${EN_FONT}`;
      ctx.textAlign = 'left';
      ctx.fillText(group.name, 30, group.y - 9);
      group.colors.forEach((color, i) => {
        const x = 56 + i * 135;
        const y = group.y + 100;
        ctx.fillStyle = color;
        roundRect(ctx, x, y - 118, 76, 128, 16);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.83)';
        roundRect(ctx, x + 8, y - 72, 60, 40, 6);
        ctx.fill();
        ctx.fillStyle = color;
        ctx.font = `700 16px ${JP_FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText(['微糖', '無糖', '茶', '果実'][i], x + 38, y - 46);
        ctx.fillStyle = '#f2c851';
        roundRect(ctx, x + 4, y + 15, 68, 24, 5);
        ctx.fill();
        ctx.fillStyle = '#193d44';
        ctx.font = `700 16px ${EN_FONT}`;
        ctx.fillText('¥130', x + 38, y + 32);
      });
      ctx.fillStyle = '#2b4148';
      for (let i = 0; i < 4; i++) ctx.fillRect(52 + i * 135, group.y + 154, 84, 10);
      if (gi < 2) {
        ctx.fillStyle = 'rgba(255,255,255,.5)';
        ctx.fillRect(24, group.y + 188, w - 48, 3);
      }
    });

    ctx.fillStyle = '#1b3038';
    ctx.fillRect(35, h - 130, w - 70, 74);
    ctx.fillStyle = '#9cb1b7';
    ctx.font = `700 18px ${EN_FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('PUSH  ·  COLD  ·  HOT', w / 2, h - 88);
  });
}

export function makeStreetSignTexture() {
  return canvasTexture(512, 200, (ctx, w, h) => {
    ctx.fillStyle = '#145d7d';
    roundRect(ctx, 4, 4, w - 8, h - 8, 18);
    ctx.fill();
    ctx.strokeStyle = '#eaf4f2';
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.fillStyle = '#f8f3df';
    ctx.textAlign = 'center';
    ctx.font = `700 62px ${JP_FONT}`;
    ctx.fillText('星見町 二丁目', w / 2, 92);
    ctx.font = `600 24px ${EN_FONT}`;
    ctx.letterSpacing = '4px';
    ctx.fillText('HOSHIMI-CHO  2', w / 2, 137);
    ctx.letterSpacing = '0px';
    ctx.fillStyle = '#f8f3df';
    ctx.beginPath();
    ctx.moveTo(w - 74, 28);
    ctx.lineTo(w - 40, 62);
    ctx.lineTo(w - 74, 96);
    ctx.closePath();
    ctx.fill();
  });
}

export function makeParkingSignTexture() {
  return canvasTexture(300, 440, (ctx, w, h) => {
    ctx.fillStyle = '#f9f1dd';
    roundRect(ctx, 6, 6, w - 12, h - 12, 16);
    ctx.fill();
    ctx.strokeStyle = '#38636a';
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.fillStyle = '#24565f';
    ctx.textAlign = 'center';
    ctx.font = `800 190px ${EN_FONT}`;
    ctx.fillText('P', w / 2, 205);
    ctx.font = `700 31px ${JP_FONT}`;
    ctx.fillText('24時間', w / 2, 280);
    ctx.fillStyle = '#df5d44';
    ctx.fillRect(52, 314, w - 104, 3);
    ctx.fillStyle = '#4a5454';
    ctx.font = `600 21px ${JP_FONT}`;
    ctx.fillText('空車あり', w / 2, 354);
    ctx.fillText('HOSHIMI MART', w / 2, 389);
  });
}

export function makeBulletinTexture() {
  return canvasTexture(600, 440, (ctx, w, h) => {
    ctx.fillStyle = '#705844';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = `rgba(${60 + Math.random() * 60},${40 + Math.random() * 45},${25 + Math.random() * 30},.25)`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
    ctx.fillStyle = 'rgba(22,35,50,.5)';
    ctx.fillRect(0, 0, w, 10);
    ctx.fillRect(0, h - 10, w, 10);
    const flyers = [
      { x: 38, y: 44, w: 172, h: 218, bg: '#f5e9cd', color: '#9c3f33', title: '秋祭り', sub: '10.24  SATA' },
      { x: 235, y: 58, w: 152, h: 196, bg: '#f1c85c', color: '#31565a', title: '防災訓練', sub: '町内会' },
      { x: 405, y: 40, w: 156, h: 238, bg: '#dce8e3', color: '#31565a', title: '子猫', sub: '里親募集' },
      { x: 72, y: 290, w: 194, h: 122, bg: '#efd5dc', color: '#7a4659', title: 'ピアノ教室', sub: '体験レッスン' },
      { x: 310, y: 297, w: 214, h: 114, bg: '#e9e4d9', color: '#3d4b56', title: '星見町だより', sub: '10月号' },
    ];
    flyers.forEach((f, i) => {
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate((i - 2) * 0.015);
      ctx.fillStyle = 'rgba(20,25,30,.24)';
      ctx.fillRect(5, 7, f.w, f.h);
      ctx.fillStyle = f.bg;
      ctx.fillRect(0, 0, f.w, f.h);
      ctx.fillStyle = f.color;
      ctx.textAlign = 'left';
      ctx.font = `700 26px ${JP_FONT}`;
      ctx.fillText(f.title, 14, 42);
      ctx.font = `500 15px ${JP_FONT}`;
      ctx.fillText(f.sub, 15, 68);
      ctx.fillStyle = 'rgba(0,0,0,.12)';
      ctx.fillRect(14, 88, f.w - 28, 2);
      ctx.fillStyle = 'rgba(0,0,0,.08)';
      for (let l = 0; l < 6; l++) ctx.fillRect(15, 104 + l * 14, f.w - 30 - (l % 3) * 12, 4);
      ctx.fillStyle = '#c24c43';
      ctx.beginPath();
      ctx.arc(f.w / 2, 12, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  });
}

export function makeReflectionTexture() {
  return canvasTexture(128, 512, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(255,255,255,0)');
    grad.addColorStop(0.12, 'rgba(255,255,255,.95)');
    grad.addColorStop(0.45, 'rgba(255,255,255,.35)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    // Soft, broken vertical bands to imitate wet asphalt.
    ctx.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 110; i++) {
      const y = Math.random() * h;
      const alpha = Math.random() * 0.55;
      ctx.fillStyle = `rgba(0,0,0,${alpha})`;
      ctx.fillRect(0, y, w, 1 + Math.random() * 5);
    }
    for (let i = 0; i < 26; i++) {
      ctx.fillStyle = `rgba(0,0,0,${0.15 + Math.random() * 0.35})`;
      ctx.fillRect(Math.random() * w, 0, 1 + Math.random() * 3, h);
    }
    ctx.globalCompositeOperation = 'source-over';
  });
}

export function makeWindowStickerTexture(title, sub, {
  bg = '#f7f1df', fg = '#28575d', accent = '#d95f49',
} = {}) {
  return canvasTexture(420, 240, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    roundRect(ctx, 4, 4, w - 8, h - 8, 22);
    ctx.fillStyle = bg;
    ctx.fill();
    ctx.strokeStyle = 'rgba(40,87,93,.28)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = accent;
    ctx.fillRect(26, 30, 8, h - 60);
    ctx.fillStyle = fg;
    ctx.textAlign = 'center';
    ctx.font = `700 ${title.length > 4 ? 53 : 68}px ${EN_FONT}`;
    ctx.fillText(title, w / 2, h / 2 + 4);
    if (sub) {
      ctx.globalAlpha = 0.6;
      ctx.font = `600 20px ${JP_FONT}`;
      ctx.fillText(sub, w / 2, h - 30);
      ctx.globalAlpha = 1;
    }
  });
}

export function makeAFrameTexture() {
  return canvasTexture(520, 660, (ctx, w, h) => {
    ctx.fillStyle = '#294845';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#d8c39b';
    ctx.lineWidth = 12;
    ctx.strokeRect(9, 9, w - 18, h - 18);
    ctx.fillStyle = '#f5e9cf';
    ctx.textAlign = 'center';
    ctx.font = `700 49px ${JP_FONT}`;
    ctx.fillText('ほっと一息', w / 2, 92);
    ctx.fillStyle = '#f0c56d';
    ctx.fillRect(105, 116, w - 210, 4);
    ctx.fillStyle = '#f7efdd';
    ctx.font = `800 74px ${EN_FONT}`;
    ctx.fillText('HOT', w / 2, 210);
    ctx.font = `800 92px ${EN_FONT}`;
    ctx.fillText('COFFEE', w / 2, 303);
    ctx.fillStyle = '#f0c56d';
    ctx.beginPath();
    ctx.arc(w / 2, 397, 54, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#294845';
    ctx.font = `800 42px ${EN_FONT}`;
    ctx.fillText('¥100', w / 2, 412);
    ctx.fillStyle = '#f5e9cf';
    ctx.font = `600 30px ${JP_FONT}`;
    ctx.fillText('からあげ  ¥180', w / 2, 510);
    ctx.font = `500 21px ${JP_FONT}`;
    ctx.fillText('雨の日は あったかく。', w / 2, 565);
    ctx.fillStyle = '#df6a4d';
    sparkle(ctx, w / 2, 613, 17, 6, 4, -Math.PI / 2);
    ctx.fill();
  });
}

export function makeStorefrontReflectionTexture() {
  return canvasTexture(1024, 768, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    ctx.filter = 'blur(9px)';

    // Warm shop windows, the white fascia, a teal frame and a coral sign bleed.
    const columns = [
      { x: 0, w: 150, colors: ['rgba(255,218,151,0)', 'rgba(255,192,104,.82)', 'rgba(255,157,72,0)'] },
      { x: 120, w: 76, colors: ['rgba(255,244,213,0)', 'rgba(255,240,196,.9)', 'rgba(255,192,117,0)'] },
      { x: 190, w: 118, colors: ['rgba(255,198,122,0)', 'rgba(255,168,82,.78)', 'rgba(255,140,80,0)'] },
      { x: 285, w: 46, colors: ['rgba(151,214,198,0)', 'rgba(96,184,171,.65)', 'rgba(73,155,157,0)'] },
      { x: 332, w: 94, colors: ['rgba(255,236,184,0)', 'rgba(255,221,157,.95)', 'rgba(255,176,102,0)'] },
      { x: 418, w: 130, colors: ['rgba(255,186,111,0)', 'rgba(255,151,103,.7)', 'rgba(243,108,88,0)'] },
      { x: 538, w: 118, colors: ['rgba(255,226,163,0)', 'rgba(255,196,122,.82)', 'rgba(255,143,91,0)'] },
      { x: 635, w: 54, colors: ['rgba(146,212,212,0)', 'rgba(101,193,186,.62)', 'rgba(69,143,151,0)'] },
      { x: 690, w: 140, colors: ['rgba(255,218,160,0)', 'rgba(255,181,110,.78)', 'rgba(255,141,101,0)'] },
      { x: 818, w: 88, colors: ['rgba(255,245,214,0)', 'rgba(255,229,173,.92)', 'rgba(250,172,115,0)'] },
      { x: 900, w: 124, colors: ['rgba(255,162,130,0)', 'rgba(239,110,89,.62)', 'rgba(228,86,71,0)'] },
    ];
    columns.forEach((column) => {
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, column.colors[1]);
      grad.addColorStop(0.5, column.colors[2]);
      grad.addColorStop(0.82, column.colors[0]);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(column.x, 0, column.w, h);
    });

    // Broad haze at the bright, facade-facing end of the reflection.
    const haze = ctx.createRadialGradient(w * 0.46, h * 0.18, 20, w * 0.46, h * 0.18, w * 0.6);
    haze.addColorStop(0, 'rgba(255,191,117,.2)');
    haze.addColorStop(0.55, 'rgba(255,152,95,.06)');
    haze.addColorStop(1, 'rgba(255,130,80,0)');
    ctx.fillStyle = haze;
    ctx.fillRect(0, 0, w, h);

    // Wet asphalt breaks the reflection into horizontal ripples.
    ctx.filter = 'none';
    ctx.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 76; i++) {
      const y = Math.random() * h;
      const alpha = 0.04 + Math.random() * 0.18;
      ctx.fillStyle = `rgba(0,0,0,${alpha})`;
      const wobble = Math.sin(y * 0.055) * 12;
      ctx.fillRect(wobble, y, w, 1 + Math.random() * 3);
    }
    for (let i = 0; i < 34; i++) {
      const x = Math.random() * w;
      ctx.fillStyle = `rgba(0,0,0,${0.04 + Math.random() * 0.12})`;
      ctx.fillRect(x, 0, 1 + Math.random() * 3, h);
    }
    const edgeX = w * 0.17;
    const leftFade = ctx.createLinearGradient(0, 0, edgeX, 0);
    leftFade.addColorStop(0, 'rgba(0,0,0,1)');
    leftFade.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = leftFade;
    ctx.fillRect(0, 0, edgeX, h);
    const rightFade = ctx.createLinearGradient(w - edgeX, 0, w, 0);
    rightFade.addColorStop(0, 'rgba(0,0,0,0)');
    rightFade.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = rightFade;
    ctx.fillRect(w - edgeX, 0, edgeX, h);
    const bottomFade = ctx.createLinearGradient(0, h * 0.68, 0, h);
    bottomFade.addColorStop(0, 'rgba(0,0,0,0)');
    bottomFade.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = bottomFade;
    ctx.fillRect(0, h * 0.68, w, h * 0.32);
    ctx.globalCompositeOperation = 'source-over';
  });
}

export function makeGlowTexture() {
  return canvasTexture(256, 256, (ctx, w, h) => {
    const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.15, 'rgba(255,255,255,.72)');
    grad.addColorStop(0.42, 'rgba(255,255,255,.2)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  });
}

export function makeRainStreakTexture() {
  return canvasTexture(32, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(255,255,255,0)');
    grad.addColorStop(0.35, 'rgba(255,255,255,.35)');
    grad.addColorStop(0.72, 'rgba(255,255,255,.85)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(w / 2, h / 2, 3.2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
  });
}

export function makeMatTexture() {
  return canvasTexture(600, 360, (ctx, w, h) => {
    ctx.fillStyle = '#243f42';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#b98d55';
    ctx.lineWidth = 14;
    ctx.strokeRect(12, 12, w - 24, h - 24);
    ctx.strokeStyle = 'rgba(223,196,151,.32)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 28; i++) {
      ctx.beginPath();
      ctx.moveTo(20, 24 + i * 11);
      ctx.lineTo(w - 20, 24 + i * 11);
      ctx.stroke();
    }
    ctx.fillStyle = '#e9d7b1';
    ctx.textAlign = 'center';
    ctx.font = `600 48px ${JP_FONT}`;
    ctx.fillText('いらっしゃいませ', w / 2, 170);
    ctx.font = `500 25px ${EN_FONT}`;
    ctx.fillText('WELCOME  ·  HOSHIMI MART', w / 2, 224);
    ctx.fillStyle = '#d2604a';
    sparkle(ctx, w / 2, 280, 18, 7, 4, -Math.PI / 2);
    ctx.fill();
  });
}

export function makeRoadTextTexture(text = '止まれ') {
  return canvasTexture(640, 300, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(235,240,235,.9)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 152px ${JP_FONT}`;
    ctx.fillText(text, w / 2, h / 2 + 4);
    ctx.fillStyle = 'rgba(32,45,57,.18)';
    for (let i = 0; i < 45; i++) {
      ctx.fillRect(Math.random() * w, Math.random() * h, Math.random() * 20, 2);
    }
  });
}

export function makeStreetNamePlaqueTexture() {
  return canvasTexture(800, 100, (ctx, w, h) => {
    ctx.fillStyle = '#e9e3d4';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#174850';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 46px ${JP_FONT}`;
    ctx.fillText('星見町 二丁目  ·  雨坂通り', w / 2, h / 2);
  });
}

export function makeNameplateTexture() {
  return canvasTexture(900, 120, (ctx, w, h) => {
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, '#263539');
    grad.addColorStop(0.5, '#344b4e');
    grad.addColorStop(1, '#1e2b31');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#c6a56b';
    ctx.lineWidth = 3;
    ctx.strokeRect(7, 7, w - 14, h - 14);
    ctx.fillStyle = '#d8bd8c';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `500 37px ${JP_FONT}`;
    ctx.letterSpacing = '4px';
    ctx.fillText('雨夜の街角  ─  星見マート前', w / 2, h / 2 + 2);
    ctx.letterSpacing = '0px';
  });
}

export function makeAlleySignTexture() {
  return canvasTexture(260, 860, (ctx, w, h) => {
    ctx.fillStyle = '#a6373e';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#f0d9b9';
    ctx.lineWidth = 8;
    ctx.strokeRect(11, 11, w - 22, h - 22);
    ctx.fillStyle = '#f8e9cf';
    ctx.textAlign = 'center';
    ctx.font = `700 74px ${JP_FONT}`;
    ['路', '地', 'の', '灯'].forEach((ch, i) => ctx.fillText(ch, w / 2, 170 + i * 145));
    ctx.font = `500 21px ${EN_FONT}`;
    ctx.fillText('ROJI', w / 2, 790);
  });
}

export function makeOpenSignTexture() {
  return canvasTexture(360, 220, (ctx, w, h) => {
    ctx.fillStyle = '#173f47';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#f5d37a';
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, w - 16, h - 16);
    ctx.fillStyle = '#ffdd84';
    ctx.textAlign = 'center';
    ctx.font = `800 94px ${EN_FONT}`;
    ctx.fillText('OPEN', w / 2, 112);
    ctx.fillStyle = '#f8eed9';
    ctx.font = `600 24px ${JP_FONT}`;
    ctx.fillText('24 時間 営業中', w / 2, 164);
  });
}

export function makeInteriorSignTexture(title, sub = '', {
  bg = '#f7ecd8', fg = '#23545a', accent = '#df5d44', width = 900, height = 240,
} = {}) {
  return canvasTexture(width, height, (ctx, w, h) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, 18, h);
    ctx.fillRect(0, h - 14, w, 14);
    ctx.fillStyle = fg;
    ctx.textAlign = 'center';
    ctx.font = `700 ${Math.round(h * 0.37)}px ${JP_FONT}`;
    ctx.fillText(title, w / 2 + 6, h * 0.49);
    if (sub) {
      ctx.fillStyle = fg;
      ctx.globalAlpha = 0.7;
      ctx.font = `600 ${Math.round(h * 0.12)}px ${EN_FONT}`;
      ctx.letterSpacing = '3px';
      ctx.fillText(sub, w / 2, h * 0.77);
      ctx.globalAlpha = 1;
      ctx.letterSpacing = '0px';
    }
    ctx.strokeStyle = 'rgba(35,84,90,.18)';
    ctx.lineWidth = 3;
    ctx.strokeRect(26, 22, w - 52, h - 44);
  });
}

export function makeCoolerHeaderTexture(name, color = '#f8f2df') {
  return canvasTexture(512, 128, (ctx, w, h) => {
    ctx.fillStyle = '#1b3f46';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 58px ${JP_FONT}`;
    ctx.fillText(name, w / 2, h / 2 - 8);
    ctx.fillStyle = 'rgba(255,255,255,.32)';
    ctx.fillRect(70, h - 24, w - 140, 3);
  });
}

export function makeShelfRailTexture() {
  return canvasTexture(512, 128, (ctx, w, h) => {
    ctx.fillStyle = '#f4ead6';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#e2d4b9';
    ctx.fillRect(0, 0, w, 18);
    const prices = ['¥128', '¥158', '¥98', '¥198', '¥138', '¥178'];
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < 6; i++) {
      const x = 36 + i * 78;
      ctx.fillStyle = '#f7c84d';
      ctx.fillRect(x, 38, 68, 58);
      ctx.fillStyle = '#273c40';
      ctx.font = `700 27px ${EN_FONT}`;
      ctx.fillText(prices[i], x + 34, 68);
    }
    ctx.fillStyle = '#ba4b3f';
    ctx.font = `700 16px ${JP_FONT}`;
    ctx.fillText('おすすめ', w - 46, 30);
  });
}

export function makeFloorArrowTexture() {
  return canvasTexture(256, 512, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(66,118,116,.75)';
    ctx.beginPath();
    ctx.moveTo(w / 2, 20);
    ctx.lineTo(w - 32, 160);
    ctx.lineTo(w * 0.68, 160);
    ctx.lineTo(w * 0.68, h - 24);
    ctx.lineTo(w * 0.32, h - 24);
    ctx.lineTo(w * 0.32, 160);
    ctx.lineTo(32, 160);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.textAlign = 'center';
    ctx.font = `700 26px ${JP_FONT}`;
    ctx.fillText('レジへ', w / 2, 224);
  });
}

export function makeDoorDecalTexture() {
  return canvasTexture(512, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,.78)';
    ctx.lineWidth = 5;
    roundRect(ctx, 8, 8, w - 16, h - 16, 22);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.textAlign = 'center';
    ctx.font = `600 40px ${JP_FONT}`;
    ctx.fillText('自動ドア', w / 2, 100);
    ctx.font = `500 25px ${EN_FONT}`;
    ctx.letterSpacing = '4px';
    ctx.fillText('AUTOMATIC DOOR', w / 2, 148);
    ctx.letterSpacing = '0px';
    ctx.fillStyle = 'rgba(223,93,68,.92)';
    ctx.beginPath();
    ctx.arc(w / 2, 196, 13, 0, Math.PI * 2);
    ctx.fill();
  });
}

export function makeBinLabelTexture(title, sub, color = '#f3ead7') {
  return canvasTexture(420, 220, (ctx, w, h) => {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(45,72,70,.35)';
    ctx.lineWidth = 5;
    ctx.strokeRect(8, 8, w - 16, h - 16);
    ctx.fillStyle = '#2d5252';
    ctx.textAlign = 'center';
    ctx.font = `700 52px ${JP_FONT}`;
    ctx.fillText(title, w / 2, 96);
    ctx.font = `600 23px ${EN_FONT}`;
    ctx.fillText(sub, w / 2, 145);
    ctx.fillStyle = '#d9604a';
    ctx.fillRect(w / 2 - 40, 172, 80, 5);
  });
}

export function makeNorenTexture() {
  return canvasTexture(512, 300, (ctx, w, h) => {
    ctx.fillStyle = '#233c50';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(241,228,204,.35)';
    ctx.lineWidth = 3;
    ctx.strokeRect(8, 8, w - 16, h - 16);
    ctx.strokeStyle = 'rgba(241,228,204,.75)';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(w / 2, h * 0.42, 72, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#f2e8d5';
    ctx.textAlign = 'center';
    ctx.font = `700 54px ${JP_FONT}`;
    ctx.fillText('路地', w / 2, h * 0.48);
    ctx.font = `500 22px ${EN_FONT}`;
    ctx.fillText('ROJI  YOKOCHO', w / 2, h * 0.72);
    ctx.fillStyle = 'rgba(241,228,204,.5)';
    ctx.fillRect(40, h - 28, w - 80, 3);
  });
}

export function makeVanishingPointTexture() {
  return canvasTexture(512, 512, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < 44; i++) {
      ctx.strokeStyle = `rgba(153,194,208,${0.018 + Math.random() * 0.05})`;
      ctx.lineWidth = 0.8 + Math.random() * 2;
      ctx.beginPath();
      const x = Math.random() * w;
      ctx.moveTo(x, 0);
      ctx.lineTo(x + (Math.random() - 0.5) * 80, h);
      ctx.stroke();
    }
  });
}

