// Landmarks & easter eggs — all hand-placed at REAL coordinates via the zone's
// lat/lon origin, all art drawn procedurally on canvases (original designs).
//   · Times Square: glowing billboard canyon at Broadway & 45th
//   · Daily Bugle rooftop sign (the old NYT tower block, repurposed)
//   · Delmar's Deli — warm lit bodega storefront with the cat in the window
//   · Sanctum Sanctorum — a townhouse with a glowing round sigil window
//   · Comic-book graffiti scattered through alleys at street level
// Plus quiet ambient life: one patrol helicopter and street steam vents.
(function () {
  const R = 6371000;

  function makeCanvas(w, h, draw) {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    draw(cv.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(cv);
    t.encoding = THREE.sRGBEncoding;
    return t;
  }

  // ---------- billboard art: original parody designs in the styles of real
  // Times Square LED walls — fashion, soda, campaign, musicals, tech, news ----
  const scanlines = (c, w, h) => {
    c.fillStyle = 'rgba(255,255,255,0.05)';
    for (let y = 0; y < h; y += 8) c.fillRect(0, y, w, 3);
  };
  const AD_MAKERS = [
    // 0 loud brand block
    (c, w, h, r) => {
      const B = [['#e8262d','#ffffff','WEB-AID','STICKS WITH YOU'],
                 ['#123a8c','#ffd94a','BUGLE','READ IT FIRST'],
                 ['#f2b21c','#181818','KRAVEN','GYM & FITNESS'],
                 ['#7a1fa8','#ffffff','MIDTOWN','NEVER SLEEPS'],
                 ['#0f6b3c','#eafff2','LATTE LAND','OPEN ALL NIGHT'],
                 ['#16161c','#ff5a3c','ROXXON','ENERGY FOR ALL']][(r * 6) | 0];
      c.fillStyle = B[0]; c.fillRect(0, 0, w, h);
      scanlines(c, w, h);
      c.fillStyle = B[1]; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = '900 ' + (h * 0.34 | 0) + 'px Helvetica, Arial, sans-serif';
      c.fillText(B[2], w / 2, h * 0.42);
      c.font = '700 ' + (h * 0.13 | 0) + 'px Helvetica, Arial, sans-serif';
      c.globalAlpha = 0.85; c.fillText(B[3], w / 2, h * 0.72); c.globalAlpha = 1;
      c.strokeStyle = B[1]; c.lineWidth = 8; c.strokeRect(8, 8, w - 16, h - 16);
    },
    // 1 fashion — duotone gradient + gowned silhouette
    (c, w, h, r) => {
      const P = [['#0c3833','#7de8c9','MODE NY'], ['#3a1030','#ff9ad8','ARANEA'],
                 ['#101a3a','#9ab8ff','SILK & CO'], ['#4a2c08','#ffd88a','GILDED']][(r * 4) | 0];
      const g = c.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, P[1]); g.addColorStop(0.55, P[0]); g.addColorStop(1, '#050508');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      // figure
      c.fillStyle = 'rgba(8,8,12,0.85)';
      const cx = w / 2, top = h * 0.18;
      c.beginPath(); c.arc(cx, top, h * 0.055, 0, 6.3); c.fill();          // head
      c.beginPath();                                                        // gown
      c.moveTo(cx - w * 0.05, top + h * 0.07);
      c.quadraticCurveTo(cx - w * 0.02, h * 0.45, cx - w * 0.16, h * 0.95);
      c.lineTo(cx + w * 0.2, h * 0.95);
      c.quadraticCurveTo(cx + w * 0.04, h * 0.45, cx + w * 0.05, top + h * 0.07);
      c.closePath(); c.fill();
      c.fillStyle = '#f4f0e8'; c.textAlign = 'center';
      c.font = (h * 0.09 | 0) + 'px Georgia, serif';
      c.fillText(P[2], w / 2, h * 0.1);
      c.font = (h * 0.045 | 0) + 'px Georgia, serif';
      c.globalAlpha = 0.8; c.fillText('NEW YORK · PARIS · TOKYO', w / 2, h * 0.965);
      c.globalAlpha = 1;
      scanlines(c, w, h);
    },
    // 2 soda — big ring logo, bubbles
    (c, w, h, r) => {
      const P = [['#0d8a4f','#eafff2','OZ-COLA','ICE COLD'],
                 ['#c81f3a','#fff','FIZZ POP','TASTE THE CITY']][(r * 2) | 0];
      c.fillStyle = P[0]; c.fillRect(0, 0, w, h);
      c.strokeStyle = 'rgba(255,255,255,0.25)';
      for (let i = 0; i < 14; i++) {
        c.beginPath();
        c.arc((i * 97) % w, (i * 61) % h, 6 + (i * 13) % 18, 0, 6.3);
        c.lineWidth = 3; c.stroke();
      }
      c.beginPath(); c.arc(w * 0.28, h * 0.5, h * 0.3, 0, 6.3);
      c.lineWidth = h * 0.07; c.strokeStyle = P[1]; c.stroke();
      c.fillStyle = P[1]; c.textAlign = 'left'; c.textBaseline = 'middle';
      c.font = '900 ' + (h * 0.24 | 0) + 'px Helvetica, Arial, sans-serif';
      c.save(); c.translate(w * 0.48, h * 0.44); c.rotate(-0.05);
      c.fillText(P[2], 0, 0); c.restore();
      c.font = '700 ' + (h * 0.1 | 0) + 'px Helvetica, Arial, sans-serif';
      c.globalAlpha = 0.85; c.fillText(P[3], w * 0.5, h * 0.68); c.globalAlpha = 1;
      scanlines(c, w, h);
    },
    // 3 campaign — JJJ FOR MAYOR
    (c, w, h) => {
      c.fillStyle = '#f4f2ee'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#16307a'; c.fillRect(0, 0, w, h * 0.42);
      c.fillStyle = '#c81f2e'; c.fillRect(0, h * 0.72, w, h * 0.28);
      c.fillStyle = '#ffffff'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = '900 ' + (h * 0.3 | 0) + 'px Helvetica, Arial, sans-serif';
      c.fillText('JJJ', w / 2, h * 0.22);
      c.fillStyle = '#16307a';
      c.font = '900 ' + (h * 0.17 | 0) + 'px Helvetica, Arial, sans-serif';
      c.fillText('FOR MAYOR', w / 2, h * 0.57);
      c.fillStyle = '#ffffff';
      c.font = '700 ' + (h * 0.1 | 0) + 'px Helvetica, Arial, sans-serif';
      c.fillText('★ TRUSTED · LOUD · TIRELESS ★', w / 2, h * 0.86);
    },
    // 4 musical — spotlight + serif title
    (c, w, h, r) => {
      const T = [['WEB SIDE STORY','#ff4a6a'], ["AIN'T TOO TOUGH",'#ffd94a'],
                 ['THWIP!','#3ee0ff']][(r * 3) | 0];
      c.fillStyle = '#0a0a10'; c.fillRect(0, 0, w, h);
      const g = c.createRadialGradient(w / 2, h * 0.42, 8, w / 2, h * 0.42, h * 0.75);
      g.addColorStop(0, 'rgba(255,240,200,0.35)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      c.fillStyle = T[1]; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = '900 ' + (h * 0.2 | 0) + 'px Georgia, serif';
      c.fillText(T[0], w / 2, h * 0.4);
      c.fillStyle = '#f4f0e8';
      c.font = (h * 0.08 | 0) + 'px Georgia, serif';
      c.fillText('A NEW MUSICAL', w / 2, h * 0.62);
      c.font = '700 ' + (h * 0.07 | 0) + 'px Helvetica, Arial, sans-serif';
      c.globalAlpha = 0.75; c.fillText('TICKETS AT THE BOOTH', w / 2, h * 0.88);
      c.globalAlpha = 1;
    },
    // 5 tech — glowing product slab
    (c, w, h, r) => {
      const P = [['OZPHONE X','#3ee0ff'], ['VOLTEX','#9aff5a']][(r * 2) | 0];
      c.fillStyle = '#08080c'; c.fillRect(0, 0, w, h);
      scanlines(c, w, h);
      c.strokeStyle = P[1]; c.lineWidth = 5;
      const pw = w * 0.16, ph = h * 0.56;
      c.shadowColor = P[1]; c.shadowBlur = 24;
      c.strokeRect(w * 0.2 - pw / 2, h * 0.48 - ph / 2, pw, ph);
      c.shadowBlur = 0;
      c.fillStyle = '#f0f4f8'; c.textAlign = 'left'; c.textBaseline = 'middle';
      c.font = '800 ' + (h * 0.17 | 0) + 'px Helvetica, Arial, sans-serif';
      c.fillText(P[0], w * 0.36, h * 0.42);
      c.fillStyle = P[1];
      c.font = '600 ' + (h * 0.08 | 0) + 'px Helvetica, Arial, sans-serif';
      c.fillText('PRE-ORDER NOW', w * 0.36, h * 0.62);
    },
    // 6 news — header + headline bars + ticker
    (c, w, h) => {
      c.fillStyle = '#eef1f5'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#123a8c'; c.fillRect(0, 0, w, h * 0.24);
      c.fillStyle = '#ffffff'; c.textAlign = 'left'; c.textBaseline = 'middle';
      c.font = '900 ' + (h * 0.14 | 0) + 'px Helvetica, Arial, sans-serif';
      c.fillText('MIDTOWN 1', w * 0.04, h * 0.13);
      c.fillStyle = '#c8ccd4';
      for (let i = 0; i < 3; i++)
        c.fillRect(w * 0.04, h * (0.34 + i * 0.14), w * (0.9 - i * 0.2), h * 0.07);
      c.fillStyle = '#c81f2e'; c.fillRect(0, h * 0.86, w, h * 0.14);
      c.fillStyle = '#ffffff';
      c.font = '700 ' + (h * 0.09 | 0) + 'px Helvetica, Arial, sans-serif';
      c.fillText('BREAKING · WEB-SLINGER SPOTTED OVER MIDTOWN', w * 0.03, h * 0.93);
    },
    // 7 repeated word wall (OUR OUR OUR style)
    (c, w, h, r) => {
      const P = [['#c81f3a','#ffd6de','WOW'], ['#0d4ac8','#cfe0ff','NOW'],
                 ['#c88a0d','#fff0cc','OSB']][(r * 3) | 0];
      c.fillStyle = P[0]; c.fillRect(0, 0, w, h);
      c.fillStyle = P[1]; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = '900 ' + (h * 0.3 | 0) + 'px Helvetica, Arial, sans-serif';
      for (let i = 0; i < 3; i++) c.fillText(P[2], w / 2, h * (0.2 + i * 0.3));
      scanlines(c, w, h);
    },
  ];
  function adTexture(rnd, portrait) {
    const styles = portrait ? [1, 4, 5, 1] : [0, 1, 2, 3, 4, 5, 6, 7];
    const st = styles[(rnd() * styles.length) | 0];
    return makeCanvas(portrait ? 256 : 512, portrait ? 512 : 256,
      (c, w, h) => AD_MAKERS[st](c, w, h, rnd()));
  }
  // ---- texture atlas of ads: one shared texture -> one draw call for a
  // whole wall of billboards, instead of a mesh+material per board ----
  function makeAdAtlas(rnd, portrait) {
    const cols = portrait ? 8 : 4, rows = portrait ? 4 : 8;
    const cw = portrait ? 256 : 512, ch = portrait ? 512 : 256;
    const cv = document.createElement('canvas');
    cv.width = cols * cw; cv.height = rows * ch;
    const c = cv.getContext('2d');
    const styles = portrait ? [1, 4, 5] : [0, 1, 2, 3, 4, 5, 6, 7];
    const count = cols * rows;
    for (let i = 0; i < count; i++) {
      const cx = (i % cols) * cw, cy = ((i / cols) | 0) * ch;
      c.save();
      c.translate(cx, cy);
      c.beginPath(); c.rect(0, 0, cw, ch); c.clip();
      AD_MAKERS[styles[(rnd() * styles.length) | 0]](c, cw, ch, rnd());
      c.restore();
    }
    const t = new THREE.CanvasTexture(cv);
    t.encoding = THREE.sRGBEncoding;
    return { tex: t, cols, rows, count };
  }
  // merge board quads (world-space) into one geometry with atlas UVs
  function batchBoards(boards, atlas) {
    const pos = [], nrm = [], uv = [], idx = [];
    for (const b of boards) {
      const hx = b.ux * b.w / 2, hz = b.uz * b.w / 2, hy = b.h / 2;
      const base = pos.length / 3;
      pos.push(b.x - hx, b.y - hy, b.z - hz,  b.x + hx, b.y - hy, b.z + hz,
               b.x + hx, b.y + hy, b.z + hz,  b.x - hx, b.y + hy, b.z - hz);
      for (let k = 0; k < 4; k++) nrm.push(b.nx, 0, b.nz);
      const ci = b.ad % atlas.count;
      const u0 = (ci % atlas.cols) / atlas.cols, u1 = u0 + 1 / atlas.cols;
      const v1 = 1 - ((ci / atlas.cols) | 0) / atlas.rows, v0 = v1 - 1 / atlas.rows;
      // u mirrored to match the flipped winding below — text reads correctly
      // from the street side
      uv.push(u1, v0, u0, v0, u0, v1, u1, v1);
      // wound so the visible face points along +n (out from the facade)
      idx.push(base, base + 2, base + 1, base, base + 3, base + 2);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    return new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: atlas.tex, toneMapped: true }));
  }

  // scrolling news ticker strip (offset animated in update)
  function tickerTexture() {
    const t = makeCanvas(1024, 64, (c, w, h) => {
      c.fillStyle = '#101018'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#ffd94a'; c.textBaseline = 'middle'; c.textAlign = 'left';
      c.font = '700 40px Helvetica, Arial, sans-serif';
      c.fillText('SPIDER-MAN SAVES QUEENS FERRY — AGAIN  ·  JJJ DEMANDS ANSWERS  ·  62° CLEAR  ·', 8, h / 2);
    });
    t.wrapS = THREE.RepeatWrapping;
    return t;
  }

  // ---------- comic graffiti: halftone burst + action word ----------
  const GRAFFITI = [
    'THWIP!', 'POW!', 'GO WEBS GO', 'WITH GREAT POWER', 'SPIDEY WUZ HERE',
    'WEB-HEAD', 'AMAZING!', 'GREAT RESPONSIBILITY', 'ANYONE CAN WEAR THE MASK',
    'FRIENDLY NEIGHBORHOOD', 'EXPECT DISAPPOINTMENT', 'SPECTACULAR',
    'NUEVA YORK 2099', 'EXCELSIOR!', 'LOOK OUT!', 'BITTEN BY A SPIDER'];
  // Murals come in five hand-styles so no two walls read alike:
  //   0 blob clouds + Spidey silhouette + script word (the classic)
  //   1 giant sprayed chest-logo spider + tag
  //   2 two huge mask eyes + quote
  //   3 corner web + block-letter quote
  //   4 comic starburst + halftone + word
  function graffitiTexture(word, hue, style) {
    return muralTexture(word, hue, style || 0);
  }
  function drawSpiderLogo(c, cx, cy, sc, color) {
    c.strokeStyle = color; c.fillStyle = color;
    c.lineCap = 'round'; c.lineWidth = 9 * sc;
    c.beginPath(); c.ellipse(cx, cy - 18 * sc, 11 * sc, 15 * sc, 0, 0, 6.3); c.fill();
    c.beginPath(); c.ellipse(cx, cy + 22 * sc, 9 * sc, 30 * sc, 0, 0, 6.3); c.fill();
    const legs = [[-58, -62, -110, -118], [-64, -20, -128, -44],
                  [-64, 14, -128, 36], [-56, 48, -104, 108]];
    for (const sgn of [-1, 1]) for (const [mx, my, ex, ey] of legs) {
      c.beginPath();
      c.moveTo(cx + sgn * 8 * sc, cy + my * 0.28 * sc);
      c.quadraticCurveTo(cx + sgn * mx * sc, cy + my * 0.7 * sc,
                         cx + sgn * ex * 0.8 * sc, cy + ey * 0.8 * sc);
      c.stroke();
    }
  }
  function drawMaskEyes(c, cx, cy, sc) {
    for (const sgn of [-1, 1]) {
      c.save(); c.translate(cx + sgn * 62 * sc, cy); c.rotate(sgn * 0.35);
      c.fillStyle = '#0c0c10';
      c.beginPath(); c.ellipse(0, 0, 52 * sc, 66 * sc, 0, 0, 6.3); c.fill();
      c.fillStyle = '#f4f6f8';
      c.beginPath();
      c.moveTo(-38 * sc, 30 * sc);
      c.quadraticCurveTo(-44 * sc, -34 * sc, sgn > 0 ? -6 * sc : 6 * sc, -52 * sc);
      c.quadraticCurveTo(40 * sc, -30 * sc, 34 * sc, 26 * sc);
      c.quadraticCurveTo(0, 52 * sc, -38 * sc, 30 * sc);
      c.closePath(); c.fill();
      c.restore();
    }
  }
  function drawCornerWeb(c, w, h, color) {
    c.strokeStyle = color; c.lineWidth = 5; c.lineCap = 'round';
    for (let a = 0; a <= 7; a++) {
      const ang = a / 7 * Math.PI / 2;
      c.beginPath(); c.moveTo(0, 0);
      c.lineTo(Math.cos(ang) * w * 0.62, Math.sin(ang) * w * 0.62); c.stroke();
    }
    for (let r = 55; r < w * 0.6; r += 52) {
      c.beginPath();
      for (let a = 0; a <= 7; a++) {
        const ang = a / 7 * Math.PI / 2;
        const rr = r * (1 + 0.06 * Math.sin(a * 2.7));
        const px = Math.cos(ang) * rr, py = Math.sin(ang) * rr;
        a ? c.lineTo(px, py) : c.moveTo(px, py);
      }
      c.stroke();
    }
  }
  function blobCloud(c, cx, cy, rw, rh, color, n, seedK) {
    c.fillStyle = color;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + seedK;
      const px = cx + Math.cos(a) * rw * (0.55 + 0.45 * Math.sin(i * 2.7 + seedK));
      const py = cy + Math.sin(a) * rh * (0.55 + 0.45 * Math.cos(i * 1.9 + seedK));
      const r = rh * (0.34 + 0.22 * Math.sin(i * 3.3 + seedK * 2));
      c.beginPath(); c.arc(px, py, r, 0, 6.3); c.fill();
    }
    c.beginPath(); c.ellipse(cx, cy, rw, rh, 0, 0, 6.3); c.fill();
  }
  function spideySilhouette(c, cx, cy, sc) {
    // white spray outline of a standing figure (Spider-Verse mural centre)
    c.strokeStyle = 'rgba(255,255,255,0.95)';
    c.lineWidth = 7 * sc; c.lineJoin = c.lineCap = 'round';
    c.beginPath();
    c.arc(cx, cy - 96 * sc, 26 * sc, 0, 6.3);                 // head
    c.moveTo(cx - 22 * sc, cy - 66 * sc);                     // shoulders → body
    c.lineTo(cx - 30 * sc, cy + 10 * sc);                     // left side
    c.lineTo(cx - 20 * sc, cy + 14 * sc);
    c.lineTo(cx - 24 * sc, cy + 108 * sc);                    // left leg
    c.moveTo(cx + 22 * sc, cy - 66 * sc);
    c.lineTo(cx + 30 * sc, cy + 10 * sc);                     // right side
    c.lineTo(cx + 20 * sc, cy + 14 * sc);
    c.lineTo(cx + 24 * sc, cy + 108 * sc);                    // right leg
    c.moveTo(cx - 22 * sc, cy - 60 * sc);                     // arms down
    c.lineTo(cx - 44 * sc, cy + 26 * sc);
    c.moveTo(cx + 22 * sc, cy - 60 * sc);
    c.lineTo(cx + 44 * sc, cy + 26 * sc);
    c.stroke();
    // dripping fill inside the figure
    c.fillStyle = 'rgba(10,10,14,0.85)';
    c.beginPath(); c.ellipse(cx, cy - 10 * sc, 24 * sc, 78 * sc, 0, 0, 6.3); c.fill();
    for (let i = -1; i <= 1; i++) {
      c.fillRect(cx + i * 12 * sc - 3 * sc, cy + 60 * sc, 6 * sc, (44 + 18 * ((i + 2) % 3)) * sc);
    }
    // eyes
    c.fillStyle = '#fff';
    c.beginPath(); c.ellipse(cx - 10 * sc, cy - 98 * sc, 9 * sc, 12 * sc, -0.3, 0, 6.3); c.fill();
    c.beginPath(); c.ellipse(cx + 10 * sc, cy - 98 * sc, 9 * sc, 12 * sc, 0.3, 0, 6.3); c.fill();
  }
  function muralTexture(word, hue, style) {
    return makeCanvas(512, 512, (c, w, h) => {
      // weathered wall backing: tinted concrete block
      const walls = ['#5a6b5e', '#5e5a52', '#4e5560', '#5c5248'];
      c.fillStyle = walls[hue % walls.length]; c.fillRect(0, 0, w, h);
      c.strokeStyle = 'rgba(0,0,0,0.28)'; c.lineWidth = 2;
      for (let y = 0; y < h; y += 26) {
        c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke();
        const off = (y / 26) % 2 ? 34 : 0;
        for (let x = off; x < w; x += 68) {
          c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 26); c.stroke();
        }
      }
      // style-specific composition on the shared wall
      if (style === 1) {
        // giant sprayed chest-logo spider over a color pop
        blobCloud(c, w * 0.5, h * 0.48, w * 0.3, h * 0.2, `hsl(${hue},85%,58%)`, 8, hue * 0.4);
        drawSpiderLogo(c, w * 0.5 - 6, h * 0.44 - 6, 1.35, 'rgba(244,246,248,0.5)');
        drawSpiderLogo(c, w * 0.5, h * 0.44, 1.35, 'rgba(12,12,16,0.92)');
      } else if (style === 2) {
        // two huge mask lenses
        blobCloud(c, w * 0.5, h * 0.42, w * 0.32, h * 0.17, `hsl(${(hue + 200) % 360},70%,52%)`, 8, hue * 0.6);
        drawMaskEyes(c, w * 0.5, h * 0.4, 1.1);
      } else if (style === 3) {
        // corner web + a second small web opposite
        drawCornerWeb(c, w, h, `hsla(${(hue + 40) % 360},90%,70%,0.9)`);
        c.save(); c.translate(w, h); c.rotate(Math.PI);
        drawCornerWeb(c, w * 0.55, h * 0.55, 'rgba(244,246,248,0.5)');
        c.restore();
        blobCloud(c, w * 0.55, h * 0.55, w * 0.26, h * 0.13, `hsl(${hue},80%,56%)`, 7, hue);
      } else if (style === 4) {
        // comic starburst + halftone dots
        c.save(); c.translate(w / 2, h * 0.46);
        c.fillStyle = `hsl(${hue},90%,56%)`;
        c.beginPath();
        for (let i = 0; i < 24; i++) {
          const r = i % 2 ? 120 : 195;
          const a = (i / 24) * Math.PI * 2;
          c[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r * 1.15, Math.sin(a) * r * 0.9);
        }
        c.closePath(); c.fill();
        c.strokeStyle = '#0c0c10'; c.lineWidth = 12; c.stroke();
        c.restore();
        c.fillStyle = 'rgba(12,12,16,0.4)';
        for (let x = w * 0.16; x < w * 0.84; x += 24)
          for (let y = h * 0.2 + ((x / 24) % 2) * 12; y < h * 0.72; y += 24)
            { c.beginPath(); c.arc(x, y, 3.2, 0, 6.3); c.fill(); }
      } else {
        // classic: layered spray blob clouds
        blobCloud(c, w * 0.50, h * 0.52, w * 0.34, h * 0.20, `hsl(${(hue + 330) % 360},78%,58%)`, 9, hue * 0.3);
        blobCloud(c, w * 0.30, h * 0.44, w * 0.16, h * 0.12, `hsl(${(hue + 20) % 360},92%,62%)`, 7, hue * 0.7);
        blobCloud(c, w * 0.72, h * 0.46, w * 0.14, h * 0.11, `hsl(${(hue + 190) % 360},85%,60%)`, 7, hue * 1.3);
        blobCloud(c, w * 0.55, h * 0.64, w * 0.18, h * 0.09, `hsl(${(hue + 45) % 360},95%,64%)`, 6, hue * 2.1);
      }
      // doodles: crosses, triangles, rings
      c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 4;
      for (let i = 0; i < 7; i++) {
        const dx = 40 + (i * 149 + hue * 13) % (w - 80);
        const dy = 60 + (i * 97 + hue * 29) % (h * 0.4);
        if (i % 3 === 0) {
          c.beginPath(); c.moveTo(dx - 9, dy - 9); c.lineTo(dx + 9, dy + 9);
          c.moveTo(dx + 9, dy - 9); c.lineTo(dx - 9, dy + 9); c.stroke();
        } else if (i % 3 === 1) {
          c.beginPath(); c.arc(dx, dy, 10, 0, 6.3); c.stroke();
        } else {
          c.beginPath(); c.moveTo(dx, dy - 11); c.lineTo(dx + 10, dy + 7);
          c.lineTo(dx - 10, dy + 7); c.closePath(); c.stroke();
        }
      }
      // paint drips from the clouds
      for (let i = 0; i < 12; i++) {
        const x = 26 + (i * 41 + hue * 7) % (w - 52);
        c.fillStyle = `hsla(${(hue + (i * 67)) % 360},85%,58%,0.6)`;
        c.fillRect(x, h * 0.62, 5, 30 + (i * 53) % 70);
      }
      // white-outline Spidey figure only on the classic composition
      if (style === 0) spideySilhouette(c, w * 0.32, h * 0.5, 1.05);
      // the word/quote — size adapts to length, position adapts to style
      const fs = word.length >= 16 ? 40 : word.length >= 10 ? 56 : 84;
      c.font = 'italic 900 ' + fs + 'px "Marker Felt", "Comic Sans MS", cursive';
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.lineJoin = 'round';
      const tx = style === 0 ? w * 0.58 : w * 0.5;
      const ty = style === 2 ? h * 0.72 : style === 1 ? h * 0.82 : h * 0.5;
      c.save(); c.translate(tx, ty); c.rotate(-0.07);
      c.lineWidth = 18; c.strokeStyle = 'rgba(12,12,20,0.9)'; c.strokeText(word, 0, 0);
      c.fillStyle = `hsl(${(hue + 55) % 360},95%,62%)`; c.fillText(word, 0, 0);
      c.lineWidth = 3; c.strokeStyle = '#2438b8'; c.strokeText(word, 0, 0);
      c.restore();
      // corner tag
      c.font = '700 30px "Marker Felt", "Comic Sans MS", cursive';
      c.fillStyle = 'rgba(255,255,255,0.8)';
      c.fillText('WF', w - 52, h - 40);
    });
  }

  class Landmarks {
    constructor(city, scene) {
      this.city = city;
      this.scene = scene;
      this.group = new THREE.Group();
      this.flicker = [];        // billboard materials that shimmer
      this.steam = [];
      this.joggers = [];
      this.eggs = [];           // {x, z, label, icon} — minimap reveal targets
      const [lat0, lon0] = city.zone.origin;
      this._cos = Math.cos(lat0 * Math.PI / 180);
      this._lat0 = lat0; this._lon0 = lon0;

      const inMap = (p) => p.x > city.bounds.minX && p.x < city.bounds.maxX &&
                           p.z > city.bounds.minZ && p.z < city.bounds.maxZ;

      const timesSq = this.ll(40.7580, -73.9855);
      if (inMap(timesSq)) {
        this._buildTimesSquare(timesSq);
        this.eggs.push({ id: 'timessq', x: timesSq.x, z: timesSq.z, r: 60,
                         label: 'Times Square', icon: '#ffd94a' });
      }
      const bugle = this.ll(40.7559, -73.9903);
      if (inMap(bugle)) {
        this._buildBugle(bugle);
        this.eggs.push({ id: 'bugle', x: bugle.x, z: bugle.z, r: 34,
                         label: 'Daily Bugle', icon: '#ff5a4a' });
      }
      const delmar = this.ll(40.7480, -73.9845);
      if (inMap(delmar)) {
        this._buildDelmars(delmar);
        const dsp = this._delmarSpot || delmar;
        this.eggs.push({ id: 'delmar', x: dsp.x, z: dsp.z, r: 26,
                         label: "Delmar's Deli", icon: '#4ade5a' });
      }
      const sanctum = this.ll(40.7448, -73.9905);   // spiritual home: map's SW
      if (inMap(sanctum)) {
        this._buildSanctum(sanctum);
        const sp = this._sanctumSpot || sanctum;
        this.eggs.push({ id: 'sanctum', x: sp.x, z: sp.z, r: 30,
                         label: 'Sanctum Sanctorum', icon: '#c8922f' });
      }
      this._buildGraffiti();
      this._buildStorefronts();
      this._buildStreetClutter();
      this._buildStreetBlades();
      this._buildGargoyles();
      this._buildFiskTower();
      this._buildBlot();
      this._buildSandSite();
      this._buildStanLee();
      this._buildMidtownHigh();
      this._buildHelicopter();
      this._buildSteam();
      this._buildParkLife();
      scene.add(this.group);
    }

    ll(lat, lon) {
      return { x: (lon - this._lon0) * Math.PI / 180 * R * this._cos,
               z: -(lat - this._lat0) * Math.PI / 180 * R };
    }

    // nearest building to a point, optional filter
    _near(pt, maxD, filt) {
      let best = null, bd = maxD * maxD;
      for (const b of this.city.buildings) {
        if (filt && !filt(b)) continue;
        const cx = (b.bx0 + b.bx1) / 2, cz = (b.bz0 + b.bz1) / 2;
        const d = (cx - pt.x) ** 2 + (cz - pt.z) ** 2;
        if (d < bd) { bd = d; best = b; }
      }
      return best;
    }

    // longest facade edge of a building + its outward normal
    _facade(b) {
      let e = null, bl = 0;
      const poly = b.poly;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const dx = poly[i][0] - poly[j][0], dz = poly[i][1] - poly[j][1];
        const L = Math.hypot(dx, dz);
        if (L > bl) {
          bl = L;
          e = { mx: (poly[i][0] + poly[j][0]) / 2, mz: (poly[i][1] + poly[j][1]) / 2,
                nx: dz / L, nz: -dx / L, len: L,
                ux: dx / L, uz: dz / L };
        }
      }
      return e;
    }

    _panel(tex, w, h, pos, nx, nz, emissive) {
      const mat = new THREE.MeshBasicMaterial({ map: tex, toneMapped: true });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
      m.position.set(pos.x, pos.y, pos.z);
      m.rotation.y = Math.atan2(nx, nz);
      this.group.add(m);
      if (emissive) this.flicker.push(mat);
      return m;
    }

    // ---- TIMES SQUARE: stacked glowing billboards on every facade facing
    // the bowtie. The area reads as a canyon of light. ----
    _buildTimesSquare(ctr) {
      let seed = 9;
      const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      this.tickers = [];
      this.tsGlows = [];
      const boardsL = [], boardsP = [];   // landscape / portrait, atlas-batched
      let placed = 0, megas = 0, ticks = 0;

      // Every facade edge that faces the bowtie gets a WALL of stacked LED
      // boards — corners wrap naturally because each poly edge qualifies on
      // its own. Nearby = floor-to-crown coverage; farther = upper boards.
      // distance measured to the bowtie AXIS (42nd → 48th along Broadway),
      // not the centre point — the square is 500m long, a radius around its
      // midpoint left both ends bare
      const A = this.ll(40.7560, -73.9866), Bx = this.ll(40.7602, -73.9851);
      const axD = (x, z) => {
        const dx = Bx.x - A.x, dz = Bx.z - A.z;
        const t = Math.max(0, Math.min(1,
          ((x - A.x) * dx + (z - A.z) * dz) / (dx * dx + dz * dz)));
        return Math.hypot(x - (A.x + dx * t), z - (A.z + dz * t));
      };
      const cand = [];
      for (const b of this.city.buildings) {
        // nearest point of the footprint bbox — big blocks front the plaza
        // even when their centre is far from the axis
        const d = Math.min(
          axD((b.bx0 + b.bx1) / 2, (b.bz0 + b.bz1) / 2),
          axD(b.bx0, b.bz0), axD(b.bx1, b.bz0),
          axD(b.bx0, b.bz1), axD(b.bx1, b.bz1));
        if (d > 130 || b.h < 14) continue;
        cand.push({ b, d });
      }
      cand.sort((a, b2) => a.d - b2.d);

      for (const { b, d } of cand) {
        const poly = b.poly;
        for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
          const dx = poly[i][0] - poly[j][0], dz = poly[i][1] - poly[j][1];
          const len = Math.hypot(dx, dz);
          if (len < 9) continue;
          const f = { mx: (poly[i][0] + poly[j][0]) / 2, mz: (poly[i][1] + poly[j][1]) / 2,
                      nx: dz / len, nz: -dx / len, ux: dx / len, uz: dz / len, len };
          // Boards go on facades that FRONT OPEN STREET — that's what makes
          // the canyon: every wall you can actually see from the bowtie is
          // covered. (A dot-toward-center test buried boards on inner-block
          // walls that other buildings occlude.)
          const ox = f.mx + f.nx * 8, oz = f.mz + f.nz * 8;   // 8m: narrow cross-streets still count as open
          let open = true;
          for (const ob of this.city.buildingsNear(ox, oz)) {
            if (ox > ob.bx0 && ox < ob.bx1 && oz > ob.bz0 && oz < ob.bz1) {
              open = false; break;
            }
          }
          if (!open) continue;

          // stack boards up the facade (collected, then batched into ONE mesh)
          let y = 5.5 + rnd() * 2;
          const yMax = Math.min(b.h - 2, d < 90 ? Math.max(60, b.h * 0.55) : 40);
          while (y < yMax && placed < 380) {
            const bh = 5.5 + rnd() * 7.5;
            if (y + bh / 2 > yMax) break;
            const bw = Math.min(len * (0.62 + rnd() * 0.26), 26);
            const off = (rnd() - 0.5) * Math.max(0, len - bw - 2);
            boardsL.push({ x: f.mx + f.ux * off + f.nx * 0.45, y: y + bh / 2,
                           z: f.mz + f.uz * off + f.nz * 0.45,
                           w: bw, h: bh, nx: f.nx, nz: f.nz, ux: f.ux, uz: f.uz,
                           ad: (rnd() * 32) | 0 });
            placed++;
            y += bh + 0.9 + rnd() * 1.6;
          }

          // mega vertical board on tall close towers
          if (megas < 10 && b.h > 48 && d < 110 && len > 12) {
            const mw = Math.min(16, len * 0.55);
            const mh = Math.min(b.h * 0.62, 58);
            boardsP.push({ x: f.mx + f.nx * 0.6, y: b.h * 0.55, z: f.mz + f.nz * 0.6,
                           w: mw, h: mh, nx: f.nx, nz: f.nz, ux: f.ux, uz: f.uz,
                           ad: (rnd() * 32) | 0 });
            megas++;
          }

          // scrolling ticker band low on close facades
          if (ticks < 5 && d < 120 && len > 14) {
            const tex = tickerTexture();
            const tw = Math.min(len * 0.85, 24);
            tex.repeat.set(tw / 10, 1);
            const m = this._panel(tex, tw, 1.25,
              { x: f.mx + f.nx * 0.5, y: 4.4, z: f.mz + f.nz * 0.5 },
              f.nx, f.nz, false);
            this.tickers.push(m.material);
            ticks++;
          }
        }
      }

      // batch every board into two meshes (two atlases) — ~2 draw calls for
      // the whole set piece instead of one per board
      if (boardsL.length) {
        const m = batchBoards(boardsL, makeAdAtlas(rnd, false));
        this.group.add(m); this.flicker.push(m.material);
      }
      if (boardsP.length) {
        const m = batchBoards(boardsP, makeAdAtlas(rnd, true));
        this.group.add(m); this.flicker.push(m.material);
      }

      // ---- the bowtie PLAZA: Broadway x 7th Ave pedestrian ground —
      // real Times Square is an open paved square walled by towers ----
      {
        const quad = [[40.75560,-73.98730], [40.76030,-73.98580],
                      [40.76050,-73.98460], [40.75580,-73.98610]]
          .map(ll => this.ll(ll[0], ll[1]));
        const shape = new THREE.Shape();
        quad.forEach((p, i) => i ? shape.lineTo(p.x, p.z) : shape.moveTo(p.x, p.z));
        const g = new THREE.ShapeGeometry(shape);
        g.rotateX(Math.PI / 2);
        const plaza = new THREE.Mesh(g, new THREE.MeshLambertMaterial({
          color: 0x232529, side: THREE.DoubleSide }));
        plaza.position.y = 0.25;
        this.group.add(plaza);
      }

      // ---- TKTS red stairs: glowing stepped wedge at the bowtie center ----
      const stairs = new THREE.Group();
      const stepMat = new THREE.MeshLambertMaterial({
        color: 0xc81f2e, emissive: 0x8a0e1c, emissiveIntensity: 0.9,
        transparent: true, opacity: 0.92 });
      for (let i = 0; i < 12; i++) {
        const st = new THREE.Mesh(new THREE.BoxGeometry(10.4, 0.34, 1.1), stepMat);
        st.position.set(0, 0.34 * i + 0.17, -1.05 * i);
        stairs.add(st);
      }
      // LED riser wall under the stair front, facing down the bowtie
      const riser = new THREE.Mesh(new THREE.PlaneGeometry(10.4, 3.4),
        new THREE.MeshBasicMaterial({ map: makeCanvas(512, 170, (c, w, h) => {
          c.fillStyle = '#c81f2e'; c.fillRect(0, 0, w, h);
          scanlines(c, w, h);
          c.fillStyle = '#ffffff'; c.textAlign = 'center'; c.textBaseline = 'middle';
          c.font = '900 120px Helvetica, Arial, sans-serif';
          c.fillText('TIX', w / 2, h / 2);
        }) }));
      riser.position.set(0, 1.7, 0.56);
      stairs.add(riser);
      stairs.position.set(ctr.x, 0.02, ctr.z);
      this.group.add(stairs);

      // ---- neon ground bounce: flat additive pools of colour on the street,
      // fed by the billboards; strongest at night (opacity driven in update) ----
      const glowTex = makeCanvas(128, 128, (c, w, h) => {
        const g = c.createRadialGradient(w/2, h/2, 4, w/2, h/2, w/2);
        g.addColorStop(0, 'rgba(255,255,255,0.65)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = g; c.fillRect(0, 0, w, h);
      });
      const glowCols = [0xff4a8a, 0x3ee0ff, 0xffd94a];
      for (let i = 0; i < 3; i++) {
        const gm = new THREE.MeshBasicMaterial({ map: glowTex, transparent: true,
          depthWrite: false, blending: THREE.AdditiveBlending,
          color: glowCols[i], opacity: 0.08 });
        const gp = new THREE.Mesh(new THREE.PlaneGeometry(110, 110), gm);
        gp.rotation.x = -Math.PI / 2;
        gp.position.set(ctr.x + (i - 1) * 46 * (rnd() - 0.2), 0.5,
                        ctr.z + (i - 1) * 52 * (rnd() + 0.2));
        this.group.add(gp);
        this.tsGlows.push(gm);
      }
      // hovering haze glow over the bowtie
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: makeCanvas(128, 128, (c, w, h) => {
          const g = c.createRadialGradient(w/2, h/2, 4, w/2, h/2, w/2);
          g.addColorStop(0, 'rgba(255,190,120,0.5)');
          g.addColorStop(1, 'rgba(255,120,180,0)');
          c.fillStyle = g; c.fillRect(0, 0, w, h);
        }),
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      }));
      glow.position.set(ctr.x, 46, ctr.z);
      glow.scale.set(340, 200, 1);
      this.group.add(glow);
      this.tsHaze = glow.material;
      this.timesSquare = ctr;
    }

    // ---- DAILY BUGLE rooftop sign on the old Times tower block ----
    _buildBugle(pt) {
      const b = this._near(pt, 160, x => x.h > 50);
      if (!b) return;
      // Raimi-style: RED NEON LETTERS stacked VERTICALLY down the building's
      // upper corner, one column per street face — like the Flatiron sign
      const vertical = (word) => makeCanvas(128, 1024, (c, w, h) => {
        c.fillStyle = 'rgba(16,16,20,0.85)'; c.fillRect(0, 0, w, h);
        c.textAlign = 'center'; c.textBaseline = 'middle';
        const cellH = h / word.length;
        for (let i = 0; i < word.length; i++) {
          c.font = '900 ' + (cellH * 0.74 | 0) + 'px Georgia, "Times New Roman", serif';
          c.shadowColor = '#ff2a20'; c.shadowBlur = 26;
          c.fillStyle = '#e8262d';
          c.fillText(word[i], w / 2, cellH * (i + 0.5));
          c.shadowBlur = 0;
        }
        c.strokeStyle = 'rgba(232,38,45,0.6)'; c.lineWidth = 5;
        c.strokeRect(6, 6, w - 12, h - 12);
      });
      // the two longest facades get DAILY and BUGLE columns near their
      // shared corner region
      const edges = [];
      const poly = b.poly;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const dx = poly[i][0] - poly[j][0], dz = poly[i][1] - poly[j][1];
        const L = Math.hypot(dx, dz);
        if (L > 10) edges.push({
          mx: (poly[i][0] + poly[j][0]) / 2, mz: (poly[i][1] + poly[j][1]) / 2,
          nx: dz / L, nz: -dx / L, len: L });
      }
      edges.sort((a, b2) => b2.len - a.len);
      const words = ['DAILY', 'BUGLE'];
      const segH = Math.min(b.h * 0.55, 42), segW = segH * 0.125;
      edges.slice(0, 2).forEach((f, i) => {
        this._panel(vertical(words[i] || 'BUGLE'), segW, segH,
          { x: f.mx + f.nx * 0.5, y: b.h - segH / 2 - 3, z: f.mz + f.nz * 0.5 },
          f.nx, f.nz, true);
      });
      // rooftop globe beacon (the Bugle's masthead flourish)
      const globe = new THREE.Mesh(new THREE.SphereGeometry(2.4, 12, 9),
        new THREE.MeshBasicMaterial({ color: 0xe8262d }));
      globe.position.set((b.bx0 + b.bx1) / 2, b.h + 4.5, (b.bz0 + b.bz1) / 2);
      this.group.add(globe);
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 5, 6),
        new THREE.MeshLambertMaterial({ color: 0x2a2c30 }));
      mast.position.set(globe.position.x, b.h + 2.2, globe.position.z);
      this.group.add(mast);
    }

    // ---- DELMAR'S: the Homecoming corner deli — red awnings wrapping the
    // corner, cream sign band, oval logo, produce out front, cat inside ----
    _buildDelmars(pt) {
      // candidate low buildings near the target, closest first, but ONLY
      // accept one whose main facade fronts open street — the first pick
      // dressed an interior alley nobody could see
      const cands = [];
      for (const x of this.city.buildings) {
        if (!x.poly || x.h <= 6 || x.h >= 30) continue;
        const cx = (x.bx0 + x.bx1) / 2, cz = (x.bz0 + x.bz1) / 2;
        const d = Math.hypot(cx - pt.x, cz - pt.z);
        if (d < 260) cands.push({ x, d });
      }
      cands.sort((a, b2) => a.d - b2.d);
      let b = null, f = null;
      for (const { x } of cands) {
        const ff = this._facade(x);
        if (!ff || ff.len < 10) continue;
        const ox = ff.mx + ff.nx * 9, oz = ff.mz + ff.nz * 9;
        let open = true;
        for (const ob of this.city.buildingsNear(ox, oz)) {
          if (ox > ob.bx0 && ox < ob.bx1 && oz > ob.bz0 && oz < ob.bz1) {
            open = false; break;
          }
        }
        if (open) { b = x; f = ff; break; }
      }
      if (!b) return;
      this._delmarSpot = { x: f.mx + f.nx * 2, z: f.mz + f.nz * 2 };
      // second face: the adjacent street edge (wrap the corner like the film)
      const poly = b.poly;
      let f2 = null;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const dx = poly[i][0] - poly[j][0], dz = poly[i][1] - poly[j][1];
        const L = Math.hypot(dx, dz);
        if (L < 7 || L >= f.len) continue;
        const e = { mx: (poly[i][0] + poly[j][0]) / 2, mz: (poly[i][1] + poly[j][1]) / 2,
                    nx: dz / L, nz: -dx / L, ux: dx / L, uz: dz / L, len: L };
        // roughly perpendicular to the main face AND fronting open space
        if (Math.abs(e.nx * f.nx + e.nz * f.nz) >= 0.4) continue;
        const ox2 = e.mx + e.nx * 9, oz2 = e.mz + e.nz * 9;
        let open2 = true;
        for (const ob of this.city.buildingsNear(ox2, oz2)) {
          if (ox2 > ob.bx0 && ox2 < ob.bx1 && oz2 > ob.bz0 && oz2 < ob.bz1) {
            open2 = false; break;
          }
        }
        if (open2 && (!f2 || e.len > f2.len)) f2 = e;
      }
      const bandTex = makeCanvas(1024, 128, (c, w, h) => {
        c.fillStyle = '#f2ead8'; c.fillRect(0, 0, w, h);          // cream band
        c.fillStyle = '#a81c1c';
        c.font = '900 78px Georgia, "Times New Roman", serif';
        c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText("DELMAR'S DELI-GROCERY", w / 2, h / 2);
        // LOTTO / stripes corner chips like the reference
        c.fillStyle = '#123a8c'; c.fillRect(0, 0, 110, h);
        c.fillStyle = '#ffd94a';
        c.font = '900 40px Helvetica, Arial, sans-serif';
        c.fillText('LOTTO', 55, h / 2);
        for (let i = 0; i < 5; i++) {
          c.fillStyle = i % 2 ? '#a81c1c' : '#123a8c';
          c.fillRect(w - 90 + i * 18, 0, 18, h);
        }
      });
      const awnMat = new THREE.MeshLambertMaterial({ color: 0x9e2020 });
      const ovalTex = makeCanvas(256, 128, (c, w, h) => {
        c.clearRect(0, 0, w, h);
        c.fillStyle = '#f2ead8';
        c.beginPath(); c.ellipse(w / 2, h / 2, w * 0.46, h * 0.44, 0, 0, 6.3); c.fill();
        c.strokeStyle = '#7a1414'; c.lineWidth = 5;
        c.beginPath(); c.ellipse(w / 2, h / 2, w * 0.46, h * 0.44, 0, 0, 6.3); c.stroke();
        c.fillStyle = '#a81c1c';
        c.font = 'italic 900 44px Georgia, serif';
        c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText("Delmar's", w / 2, h / 2);
      });
      const faces = f2 ? [f, f2] : [f];
      for (const e of faces) {
        const len = Math.min(e.len - 1, 14);
        // cream sign band above the awning
        this._panel(bandTex, len, 1.5,
          { x: e.mx + e.nx * 0.42, y: 4.6, z: e.mz + e.nz * 0.42 }, e.nx, e.nz, true);
        // sloped red awning slab
        const awn = new THREE.Mesh(new THREE.BoxGeometry(len, 0.14, 2.0), awnMat);
        awn.position.set(e.mx + e.nx * 1.1, 3.6, e.mz + e.nz * 1.1);
        awn.rotation.order = 'YXZ';           // yaw first, then tilt outward
        awn.rotation.y = Math.atan2(e.nx, e.nz);
        awn.rotation.x = -0.3;
        this.group.add(awn);
        // oval logo hanging from the awning edge
        this._panel(ovalTex, 2.6, 1.3,
          { x: e.mx + e.nx * 2.1, y: 2.9, z: e.mz + e.nz * 2.1 }, e.nx, e.nz, true)
          .material.transparent = true;
        // produce crates on the sidewalk
        for (let k = 0; k < 4; k++) {
          const crate = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.6, 0.7),
            new THREE.MeshLambertMaterial({
              color: [0x3f7a2e, 0xc8542a, 0xd8b02e, 0x7a3f2e][k] }));
          crate.position.set(
            e.mx + e.nx * 1.6 + e.ux * (k - 1.5) * 1.2, 0.55,
            e.mz + e.nz * 1.6 + e.uz * (k - 1.5) * 1.2);
          this.group.add(crate);
        }
      }
      // warm storefront glow + cat silhouette
      const win = makeCanvas(384, 192, (c, w, h) => {
        c.fillStyle = '#ffb85e'; c.fillRect(0, 0, w, h);
        c.fillStyle = 'rgba(255,240,200,0.85)'; c.fillRect(12, 12, w - 24, h - 24);
        // the cat
        c.fillStyle = '#221c18';
        c.beginPath(); c.ellipse(w * 0.72, h * 0.72, 42, 26, 0, 0, 6.3); c.fill();  // body
        c.beginPath(); c.arc(w * 0.72 + 40, h * 0.62, 17, 0, 6.3); c.fill();        // head
        c.beginPath();                                                              // ears
        c.moveTo(w * 0.72 + 28, h * 0.56); c.lineTo(w * 0.72 + 33, h * 0.44); c.lineTo(w * 0.72 + 40, h * 0.54);
        c.moveTo(w * 0.72 + 46, h * 0.53); c.lineTo(w * 0.72 + 53, h * 0.43); c.lineTo(w * 0.72 + 56, h * 0.55);
        c.fill();
        c.strokeStyle = '#221c18'; c.lineWidth = 7; c.lineCap = 'round';
        c.beginPath(); c.moveTo(w * 0.72 - 40, h * 0.75);
        c.quadraticCurveTo(w * 0.72 - 62, h * 0.62, w * 0.72 - 56, h * 0.45); c.stroke(); // tail
      });
      this._panel(win, Math.min(f.len * 0.55, 7), 2.4,
        { x: f.mx + f.nx * 0.35 + f.ux * 1.5, y: 1.5, z: f.mz + f.nz * 0.35 + f.uz * 1.5 },
        f.nx, f.nz, true);
    }

    // register a decorative structure as SOLID so the player can land on it
    _registerSolid(x, z, w, d, h) {
      const poly = [[x - w/2, z - d/2], [x + w/2, z - d/2],
                    [x + w/2, z + d/2], [x - w/2, z + d/2]];
      const rec = { poly, h, bx0: x - w/2, bx1: x + w/2, bz0: z - d/2, bz1: z + d/2 };
      this.city.buildings.push(rec);
      const GRID = 48;
      for (let cx = Math.floor(rec.bx0 / GRID); cx <= Math.floor(rec.bx1 / GRID); cx++)
        for (let cz = Math.floor(rec.bz0 / GRID); cz <= Math.floor(rec.bz1 / GRID); cz++) {
          const k = this.city._key(cx, cz);
          if (!this.city.grid.get(k)) this.city.grid.set(k, []);
          this.city.grid.get(k).push(rec);
        }
    }

    // ---- SANCTUM: a full 177A Bleecker-style townhouse built in an open
    // spot — brownstone, bay windows, mansard roof, the big glowing round
    // Seal window on the top floor ----
    _buildSanctum(pt) {
      // find open ground near the target
      let spot = null;
      outer:
      for (let r = 16; r < 150; r += 14) {
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 7) {
          const x = pt.x + Math.cos(a) * r, z = pt.z + Math.sin(a) * r;
          let clear = true;
          for (const ob of this.city.buildingsNear(x, z)) {
            if (x + 9 > ob.bx0 && x - 9 < ob.bx1 && z + 8 > ob.bz0 && z - 8 < ob.bz1) {
              clear = false; break;
            }
          }
          // and not in the middle of a street: keep clear of road centrelines
          if (clear) {
            for (const rd of this.city.zone.roads) {
              for (let k = 1; k < rd.p.length && clear; k++) {
                const [ax, az] = rd.p[k - 1], [bx, bz] = rd.p[k];
                if (Math.min(ax, bx) > x + 30 || Math.max(ax, bx) < x - 30 ||
                    Math.min(az, bz) > z + 30 || Math.max(az, bz) < z - 30) continue;
                const ddx = bx - ax, ddz = bz - az;
                const L2 = ddx * ddx + ddz * ddz || 1;
                const t = Math.max(0, Math.min(1, ((x - ax) * ddx + (z - az) * ddz) / L2));
                const qx = ax + ddx * t, qz = az + ddz * t;
                if (Math.hypot(x - qx, z - qz) < rd.w / 2 + 9) clear = false;
              }
              if (!clear) break;
            }
          }
          if (clear) { spot = { x, z }; break outer; }
        }
      }
      if (!spot) spot = { x: pt.x, z: pt.z };
      this._sanctumSpot = spot;
      const W = 13, D = 11, H = 13.5;
      const face = { nx: (pt.x - spot.x) || 1, nz: pt.z - spot.z };
      const fl = Math.hypot(face.nx, face.nz) || 1;
      face.nx /= fl; face.nz /= fl;
      const yaw = Math.atan2(face.nx, face.nz);
      const house = new THREE.Group();
      house.position.set(spot.x, 0, spot.z);
      house.rotation.y = yaw;
      // brownstone facade texture
      const stone = makeCanvas(256, 256, (c, w, h) => {
        c.fillStyle = '#6e4a38'; c.fillRect(0, 0, w, h);
        c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 2;
        for (let y = 0; y < h; y += 20) {
          c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke();
        }
        // tall arched windows, warm-lit
        for (let i = 0; i < 3; i++) {
          const x = 30 + i * 72;
          c.fillStyle = '#2c2016'; c.fillRect(x, 96, 40, 84);
          c.fillStyle = '#ffca6e'; c.fillRect(x + 5, 102, 30, 72);
          c.fillStyle = '#2c2016';
          c.beginPath(); c.arc(x + 20, 100, 20, Math.PI, 0); c.fill();
          c.fillStyle = '#ffca6e';
          c.beginPath(); c.arc(x + 20, 100, 14, Math.PI, 0); c.fill();
        }
        // door
        c.fillStyle = '#241a12'; c.fillRect(104, 190, 48, 66);
      });
      stone.encoding = THREE.sRGBEncoding;
      const bodyMat = new THREE.MeshLambertMaterial({ map: stone });
      const body = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), bodyMat);
      body.position.y = H / 2;
      body.castShadow = body.receiveShadow = true;
      house.add(body);
      // cornice + mansard roof
      const cor = new THREE.Mesh(new THREE.BoxGeometry(W + 1.2, 0.6, D + 1.2),
        new THREE.MeshLambertMaterial({ color: 0x4a3626 }));
      cor.position.y = H + 0.3;
      house.add(cor);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(W - 1, 3.2, D - 1),
        new THREE.MeshLambertMaterial({ color: 0x2e2a30 }));
      roof.position.y = H + 2.2;
      roof.scale.set(1, 1, 1);
      house.add(roof);
      // chimneys
      for (const sx of [-1, 1]) {
        const ch = new THREE.Mesh(new THREE.BoxGeometry(1, 2.2, 1),
          new THREE.MeshLambertMaterial({ color: 0x51392c }));
        ch.position.set(sx * (W / 2 - 2), H + 4.2, -D / 4);
        house.add(ch);
      }
      // stoop steps
      for (let i = 0; i < 4; i++) {
        const st = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.3, 0.8),
          new THREE.MeshLambertMaterial({ color: 0x5a4232 }));
        st.position.set(0, 0.15 + i * 0.3, D / 2 + 1.6 - i * 0.4);
        house.add(st);
      }
      this.group.add(house);
      this._registerSolid(spot.x, spot.z, W, D, H + 3.8);
      // face the sigil out the front (toward +z local)
      const f = { mx: spot.x + face.nx * (D / 2), mz: spot.z + face.nz * (D / 2),
                  nx: face.nx, nz: face.nz };
      const b = { h: H };
      const sigil = makeCanvas(256, 256, (c, w, h) => {
        c.clearRect(0, 0, w, h);
        const cx = w / 2, cy = h / 2;
        const g = c.createRadialGradient(cx, cy, 8, cx, cy, w / 2);
        g.addColorStop(0, 'rgba(255,214,120,0.95)');
        g.addColorStop(0.75, 'rgba(200,140,70,0.75)');
        g.addColorStop(1, 'rgba(120,70,30,0.0)');
        c.fillStyle = g; c.beginPath(); c.arc(cx, cy, w / 2 - 4, 0, 6.3); c.fill();
        c.strokeStyle = '#3a2c18'; c.lineWidth = 9;
        c.beginPath(); c.arc(cx, cy, w / 2 - 10, 0, 6.3); c.stroke();
        // original geometric sigil: crossing arcs + a diamond
        c.lineWidth = 6;
        for (const a of [0, Math.PI / 3, -Math.PI / 3]) {
          c.beginPath();
          c.ellipse(cx, cy, w * 0.36, w * 0.14, a, 0, 6.3); c.stroke();
        }
        c.beginPath();
        c.moveTo(cx, cy - 34); c.lineTo(cx + 24, cy); c.lineTo(cx, cy + 34);
        c.lineTo(cx - 24, cy); c.closePath(); c.stroke();
      });
      const m = new THREE.Mesh(new THREE.CircleGeometry(2.6, 28),
        new THREE.MeshBasicMaterial({ map: sigil, transparent: true, toneMapped: false }));
      m.position.set(f.mx + f.nx * 0.55, b.h - 2.6, f.mz + f.nz * 0.55);
      m.rotation.y = Math.atan2(f.nx, f.nz);
      this.group.add(m);
      this.flicker.push(m.material);
    }

    // ---- comic MURALS: one per city sector so they're spread out, painted
    // over the whole lower wall (opaque — the "windows" are painted over),
    // facing open street so they're visible from a swing ----
    _buildGraffiti() {
      let seed = 31;
      const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      const B = this.city.bounds;
      const COLS = 4, ROWS = 4;
      const sw = (B.maxX - B.minX) / COLS, sh = (B.maxZ - B.minZ) / ROWS;
      let placed = 0;
      const sectors = [];
      for (let i = 0; i < COLS; i++) for (let j = 0; j < ROWS; j++) sectors.push([i, j]);
      for (const [si, sj] of sectors) {
        if (placed >= 14) break;
        const x0 = B.minX + si * sw, z0 = B.minZ + sj * sh;
        // candidate walls inside this sector: mid-rise, long straight facade
        let best = null, bestScore = 0;
        for (let t = 0; t < 260; t++) {
          const b = this.city.buildings[(rnd() * this.city.buildings.length) | 0];
          if (!b || b.h < 12 || b.h > 90) continue;
          const cx = (b.bx0 + b.bx1) / 2, cz = (b.bz0 + b.bz1) / 2;
          if (cx < x0 || cx > x0 + sw || cz < z0 || cz > z0 + sh) continue;
          const f = this._facade(b);
          if (!f || f.len < 12) continue;
          // must front open street (same test as the billboards)
          const ox = f.mx + f.nx * 8, oz = f.mz + f.nz * 8;
          let open = true;
          for (const ob of this.city.buildingsNear(ox, oz)) {
            if (ox > ob.bx0 && ox < ob.bx1 && oz > ob.bz0 && oz < ob.bz1) {
              open = false; break;
            }
          }
          if (!open) continue;
          const score = Math.min(f.len, 24) + Math.min(b.h, 30);
          if (score > bestScore) { bestScore = score; best = { b, f }; }
        }
        if (!best) continue;
        const { b, f } = best;
        const word = GRAFFITI[placed % GRAFFITI.length];
        const tex = graffitiTexture(word, (placed * 47 + 10) % 360, placed % 5);
        // mural covers the lower wall: as wide as the facade allows, ~2.5
        // storeys tall, base just above the street
        const mw = Math.min(f.len - 2, 16);
        const mh = mw;                        // square texture, square mural
        this._panel(tex, mw, mh,
          { x: f.mx + f.nx * 0.35, y: 1.2 + mh / 2, z: f.mz + f.nz * 0.35 },
          f.nx, f.nz, false);
        this.eggs.push({ id: 'graffiti-' + placed, x: f.mx, z: f.mz, r: 22,
                         label: 'Graffiti: ' + word, icon: '#b06ee8' });
        placed++;
      }
    }

    // ---- ambient STOREFRONTS: sign bands + awnings along street-level
    // facades across the whole city. Two draw calls: one atlas mesh for all
    // signs, one merged vertex-colored mesh for all awnings. ----
    _buildStorefronts() {
      let seed = 71;
      const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      const SHOPS = [
        ["MICK'S PIZZA", '#c8232a', '#ffffff'], ['CITY BAGELS', '#d8a018', '#20180c'],
        ['EMPIRE COFFEE', '#2c1e14', '#e8d5b0'], ['LUCKY NAILS', '#d84a90', '#ffffff'],
        ['BIG APPLE DELI', '#1a7a34', '#ffe9a8'], ['CORNER MARKET', '#144a8c', '#ffffff'],
        ['GOLDEN DRAGON', '#a81c1c', '#ffd94a'], ['STARDUST DINER', '#10162c', '#7de8ff'],
        ['QUICK WASH', '#2a9ad8', '#ffffff'], ['MIDTOWN HARDWARE', '#c85a1a', '#181410'],
        ['WEB CITY BOOKS', '#3a2c50', '#e8ddc8'], ["RAY'S FAMOUS", '#b81e28', '#fff2cc'],
        ['BODEGA 24HR', '#e8bc1c', '#141414'], ['HARLEM FLOWERS', '#3f7a2e', '#ffffff'],
        ['CHELSEA SHOES', '#6e2438', '#e8d5c8'], ['MOON GARDEN', '#14343c', '#8ee8c8'],
      ];
      // 4x4 atlas of shop sign bands
      const AT = 4;
      const cv = document.createElement('canvas');
      cv.width = 2048; cv.height = 512;
      const c = cv.getContext('2d');
      for (let i = 0; i < 16; i++) {
        const [name, bg, fg] = SHOPS[i];
        const x0 = (i % AT) * 512, y0 = ((i / AT) | 0) * 128;
        c.save(); c.translate(x0, y0);
        c.fillStyle = bg; c.fillRect(0, 0, 512, 128);
        c.fillStyle = fg; c.textAlign = 'center'; c.textBaseline = 'middle';
        const serif = i % 3 === 0;
        c.font = (serif ? '900 52px Georgia, serif' : '900 46px Helvetica, Arial, sans-serif');
        c.fillText(name, 256, 64);
        c.strokeStyle = fg; c.globalAlpha = 0.65; c.lineWidth = 4;
        c.strokeRect(6, 6, 500, 116); c.globalAlpha = 1;
        c.restore();
      }
      const atlasTex = new THREE.CanvasTexture(cv);
      atlasTex.encoding = THREE.sRGBEncoding;

      const sPos = [], sNrm = [], sUv = [], sIdx = [];
      const aPos = [], aNrm = [], aCol = [], aIdx = [];
      const AWN = [0x9e2020, 0x1e5c34, 0x1e3c7a, 0x6e3418, 0x333844].map(h => new THREE.Color(h));
      const B = this.city.bounds;
      let placed = 0;
      for (let bi = 0; bi < this.city.buildings.length && placed < 420; bi += 7) {
        const b = this.city.buildings[(bi + ((rnd() * 7) | 0)) % this.city.buildings.length];
        if (!b || !b.poly || b.h < 8 || b.h > 60) continue;
        const poly = b.poly;
        // longest street-fronting edge
        let f = null;
        for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
          const dx = poly[i][0] - poly[j][0], dz = poly[i][1] - poly[j][1];
          const L = Math.hypot(dx, dz);
          if (L < 9) continue;
          const e = { mx: (poly[i][0] + poly[j][0]) / 2, mz: (poly[i][1] + poly[j][1]) / 2,
                      nx: dz / L, nz: -dx / L, ux: dx / L, uz: dz / L, len: L };
          if (!f || e.len > f.len) f = e;
        }
        if (!f) continue;
        const ox = f.mx + f.nx * 8, oz = f.mz + f.nz * 8;
        let open = true;
        for (const ob of this.city.buildingsNear(ox, oz)) {
          if (ox > ob.bx0 && ox < ob.bx1 && oz > ob.bz0 && oz < ob.bz1) { open = false; break; }
        }
        if (!open) continue;
        const len = Math.min(f.len * 0.72, 12);
        const shop = (rnd() * 16) | 0;
        // sign band quad
        {
          const hx = f.ux * len / 2, hz = f.uz * len / 2, hy = 0.7;
          const x = f.mx + f.nx * 0.4, y = 3.5, z = f.mz + f.nz * 0.4;
          const base = sPos.length / 3;
          sPos.push(x - hx, y - hy, z - hz,  x + hx, y - hy, z + hz,
                    x + hx, y + hy, z + hz,  x - hx, y + hy, z - hz);
          for (let k = 0; k < 4; k++) sNrm.push(f.nx, 0, f.nz);
          const u0 = (shop % AT) / AT, u1 = u0 + 1 / AT;
          const v1 = 1 - ((shop / AT) | 0) / AT, v0 = v1 - 1 / AT;
          sUv.push(u1, v0, u0, v0, u0, v1, u1, v1);
          sIdx.push(base, base + 2, base + 1, base, base + 3, base + 2);
        }
        // night glow pool on the sidewalk in front of the shop
        {
          const gx2 = f.mx + f.nx * 2.2, gz2 = f.mz + f.nz * 2.2;
          const hx = f.ux * len / 2, hz = f.uz * len / 2;
          const dxn = f.nx * 1.8, dzn = f.nz * 1.8;
          const base = (this._glowPos = this._glowPos || []).length / 3;
          this._glowPos.push(gx2 - hx - dxn, 0.26, gz2 - hz - dzn,
                             gx2 + hx - dxn, 0.26, gz2 + hz - dzn,
                             gx2 + hx + dxn, 0.26, gz2 + hz + dzn,
                             gx2 - hx + dxn, 0.26, gz2 - hz + dzn);
          (this._glowIdx = this._glowIdx || []).push(base, base + 2, base + 1,
                                                     base, base + 3, base + 2);
        }
        // awning slab (60% of shops)
        if (rnd() < 0.6) {
          const col = AWN[(rnd() * AWN.length) | 0];
          const ax = f.mx + f.nx * 1.0, ay = 2.9, az = f.mz + f.nz * 1.0;
          const hx = f.ux * len / 2, hz = f.uz * len / 2;
          const dxn = f.nx * 0.9, dzn = f.nz * 0.9;
          const base = aPos.length / 3;
          // sloped quad: wall edge high, street edge low
          aPos.push(ax - hx - dxn, ay + 0.5, az - hz - dzn,
                    ax + hx - dxn, ay + 0.5, az + hz - dzn,
                    ax + hx + dxn, ay, az + hz + dzn,
                    ax - hx + dxn, ay, az - hz + dzn);
          for (let k = 0; k < 4; k++) { aNrm.push(0, 1, 0); aCol.push(col.r, col.g, col.b); }
          aIdx.push(base, base + 2, base + 1, base, base + 3, base + 2);
        }
        placed++;
      }
      if (sIdx.length) {
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(sPos, 3));
        g.setAttribute('normal', new THREE.Float32BufferAttribute(sNrm, 3));
        g.setAttribute('uv', new THREE.Float32BufferAttribute(sUv, 2));
        g.setIndex(sIdx);
        this.group.add(new THREE.Mesh(g,
          new THREE.MeshBasicMaterial({ map: atlasTex, toneMapped: true })));
      }
      if (aIdx.length) {
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(aPos, 3));
        g.setAttribute('normal', new THREE.Float32BufferAttribute(aNrm, 3));
        g.setAttribute('color', new THREE.Float32BufferAttribute(aCol, 3));
        g.setIndex(aIdx);
        this.group.add(new THREE.Mesh(g, new THREE.MeshLambertMaterial({
          vertexColors: true, side: THREE.DoubleSide })));
      }
      // warm sidewalk glow pools — invisible by day, fade in with night
      if (this._glowIdx && this._glowIdx.length) {
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(this._glowPos, 3));
        g.setIndex(this._glowIdx);
        this._shopGlowMat = new THREE.MeshBasicMaterial({
          color: 0xffb45e, transparent: true, opacity: 0,
          blending: THREE.AdditiveBlending, depthWrite: false });
        const mesh = new THREE.Mesh(g, this._shopGlowMat);
        mesh.frustumCulled = false;
        this.group.add(mesh);
        this._glowPos = this._glowIdx = null;
      }
    }

    // shared: spots along sidewalks (offset from road centrelines), skipping
    // anything inside a building footprint
    _sidewalkSpots(rnd, every, cap) {
      const out = [];
      for (const r of this.city.zone.roads) {
        for (let i = 1; i < r.p.length && out.length < cap; i++) {
          const [ax, az] = r.p[i - 1], [bx, bz] = r.p[i];
          const L = Math.hypot(bx - ax, bz - az);
          if (L < every) continue;
          for (let t = every / 2; t < L && out.length < cap; t += every) {
            if (rnd() > 0.5) continue;
            const ux = (bx - ax) / L, uz = (bz - az) / L;
            const side = rnd() < 0.5 ? 1 : -1;
            const off = r.w / 2 + 1.9;
            const x = ax + ux * t - uz * off * side;
            const z = az + uz * t + ux * off * side;
            if (this.city.isSolid(x, 1, z)) continue;
            // reject anything that would land in another street's roadway
            if (GAME.CityPlan.inRoadway(x, z, this.city.zone.roads, 0.4)) continue;
            out.push({ x, z, rot: Math.atan2(ux, uz) + (side > 0 ? Math.PI : 0) });
          }
        }
      }
      return out;
    }

    // ---- STREET CLUTTER: hydrants, mailboxes, newsstands (instanced),
    // traffic lights at real intersections ----
    _buildStreetClutter() {
      let seed = 641;
      const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      const merge = (parts) => {
        const ps = [], ns = [], cs = [], ix = [];
        for (const [g, hex] of parts) {
          const col = new THREE.Color(hex);
          const b0 = ps.length / 3, gp = g.attributes.position, gn = g.attributes.normal;
          for (let i = 0; i < gp.count; i++) {
            ps.push(gp.getX(i), gp.getY(i), gp.getZ(i));
            ns.push(gn.getX(i), gn.getY(i), gn.getZ(i));
            cs.push(col.r, col.g, col.b);
          }
          for (let i = 0; i < g.index.count; i++) ix.push(b0 + g.index.getX(i));
          g.dispose();
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(ps, 3));
        g.setAttribute('normal', new THREE.Float32BufferAttribute(ns, 3));
        g.setAttribute('color', new THREE.Float32BufferAttribute(cs, 3));
        g.setIndex(ix);
        return g;
      };
      const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
      const place = (geo, spots) => {
        if (!spots.length) return;
        const im = new THREE.InstancedMesh(geo, mat, spots.length);
        const m = new THREE.Matrix4(), q = new THREE.Quaternion(),
              v = new THREE.Vector3(), sc = new THREE.Vector3(1, 1, 1);
        const UP = new THREE.Vector3(0, 1, 0);
        spots.forEach((s2, i) => {
          v.set(s2.x, 0.22, s2.z);
          q.setFromAxisAngle(UP, s2.rot);
          m.compose(v, q, sc);
          im.setMatrixAt(i, m);
        });
        im.frustumCulled = false;
        this.group.add(im);
      };
      // hydrant: squat red cylinder + dome + side caps
      const cyl = (r0, r1, h, x, y, z) => {
        const g = new THREE.CylinderGeometry(r0, r1, h, 7); g.translate(x, y, z); return g; };
      const box = (w, h, d, x, y, z) => {
        const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); return g; };
      place(merge([[cyl(0.16, 0.2, 0.7, 0, 0.35, 0), 0xb42020],
                   [cyl(0.12, 0.16, 0.18, 0, 0.78, 0), 0xb42020],
                   [box(0.5, 0.12, 0.14, 0, 0.5, 0), 0x8a1616]]),
        this._sidewalkSpots(rnd, 210, 340));
      // mailbox: blue rounded box on legs
      place(merge([[box(0.62, 0.5, 0.5, 0, 0.72, 0), 0x1c4a9e],
                   [cyl(0.31, 0.31, 0.62, 0, 0.97, 0), 0x1c4a9e],
                   [box(0.5, 0.45, 0.4, 0, 0.28, 0), 0x163a7e]]),
        this._sidewalkSpots(rnd, 420, 130));
      // newsstand: green kiosk with awning lip + magazine rack
      place(merge([[box(2.4, 2.2, 1.5, 0, 1.1, 0), 0x1e5c34],
                   [box(2.8, 0.1, 2.0, 0, 2.3, 0.15), 0x17492a],
                   [box(2.0, 0.9, 0.1, 0, 1.0, 0.78), 0xc8b890]]),
        this._sidewalkSpots(rnd, 900, 55));

      // traffic lights: at real intersections, planted on the CORNER SIDEWALK
      // (CityPlan finds a spot clear of every roadway — never in the street)
      const roads = this.city.zone.roads;
      const inters = GAME.CityPlan.intersections(roads).filter(e => e.n >= 3);
      const lights = [];
      this._corners = [];
      for (const it of inters) {
        if (lights.length >= 240) break;
        const spot = GAME.CityPlan.sidewalkSpotNear(it.x, it.z, roads, 2.2);
        if (!spot || this.city.isSolid(spot.x, 1, spot.z)) continue;
        this._corners.push({ x: spot.x, z: spot.z, nx: spot.nx, nz: spot.nz, it });
        if (rnd() < 0.5) continue;
        lights.push({ x: spot.x, z: spot.z, rot: Math.atan2(-spot.nx, -spot.nz) });
      }
      place(merge([[cyl(0.09, 0.11, 5.2, 0, 2.6, 0), 0x2a2c30],
                   [box(0.28, 0.8, 0.24, 0, 4.6, 0.1), 0x1c1e22],
                   [cyl(0.07, 0.07, 2.6, 0, 5.15, 0), 0x2a2c30]]), lights);
      // lit lenses (unlit material → glows day and night)
      if (lights.length) {
        const lens = merge([[box(0.14, 0.14, 0.05, 0, 4.85, 0.24), 0xff3826],
                            [box(0.14, 0.14, 0.05, 0, 4.38, 0.24), 0x2ee85a]]);
        const im = new THREE.InstancedMesh(lens,
          new THREE.MeshBasicMaterial({ vertexColors: true }), lights.length);
        const m = new THREE.Matrix4(), q = new THREE.Quaternion(),
              v = new THREE.Vector3(), sc = new THREE.Vector3(1, 1, 1);
        const UP = new THREE.Vector3(0, 1, 0);
        lights.forEach((s2, i) => {
          v.set(s2.x, 0.22, s2.z);
          q.setFromAxisAngle(UP, s2.rot);
          m.compose(v, q, sc);
          im.setMatrixAt(i, m);
        });
        im.frustumCulled = false;
        this.group.add(im);
      }
      this._intersections = lights;
    }

    // ---- NYC STREET BLADES: real grid names derived from position.
    // Manhattan's grid is rotated ~29° — rotate into grid space, calibrate
    // street numbers on Times Sq (45th) and 110th at the park's NW corner ----
    _buildStreetBlades() {
      const GA = 29 * Math.PI / 180;                 // grid angle east of north
      const upx = Math.sin(GA), upz = -Math.cos(GA); // uptown direction
      const u = (x, z) => x * upx + z * upz;         // uptown coordinate
      const v = (x, z) => x * -upz + z * upx;        // crosstown coordinate
      const ts = this.ll(40.7580, -73.9855);         // 45.5th st
      const nw = this.ll(40.8005, -73.9582);         // 110th & CPW
      const uTS = u(ts.x, ts.z), uNW = u(nw.x, nw.z);
      const mPerSt = (uNW - uTS) / (110 - 45.5);
      const streetOf = (x, z) => Math.round(45.5 + (u(x, z) - uTS) / mPerSt);
      const a5 = this.ll(40.7551, -73.9866);         // 5th Ave & 42nd
      const a8 = this.ll(40.7681, -73.9819);         // CPW(8th) & 59th
      const v5 = v(a5.x, a5.z), v8 = v(a8.x, a8.z);
      const mPerAve = (v8 - v5) / 3;
      const AVE = { 1: '1 AVE', 2: '2 AVE', 3: '3 AVE', 4: 'PARK AVE', 5: '5 AVE',
                    6: '6 AVE', 7: '7 AVE', 8: '8 AVE', 9: '9 AVE', 10: '10 AVE',
                    11: '11 AVE', 12: '12 AVE' };
      const aveOf = (x, z) => Math.round(5 + (v(x, z) - v5) / mPerAve);

      // collect needed names at a sample of intersections
      let seed = 977;
      const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      const posts = [];
      for (const cn of (this._corners || [])) {
        if (rnd() < 0.45) continue;
        const st = streetOf(cn.x, cn.z), av = aveOf(cn.x, cn.z);
        if (st < 14 || st > 120) continue;
        // the post stands on the corner sidewalk spot itself (already clear of
        // every roadway) — no more blades in the middle of the street
        posts.push({ x: cn.x, z: cn.z,
                     st: 'W ' + st + ' ST', av: AVE[av] || (av + ' AVE') });
      }
      const names = [...new Set(posts.flatMap(p2 => [p2.st, p2.av]))];
      if (!names.length) return;
      // atlas of blade faces
      const COLS = 8, CW = 256, CH = 64;
      const rows = Math.ceil(names.length / COLS);
      const cv = document.createElement('canvas');
      cv.width = COLS * CW; cv.height = rows * CH;
      const c = cv.getContext('2d');
      const cell = new Map();
      names.forEach((name, i) => {
        const x0 = (i % COLS) * CW, y0 = ((i / COLS) | 0) * CH;
        c.fillStyle = '#0c6e38'; c.fillRect(x0 + 2, y0 + 6, CW - 4, CH - 12);
        c.strokeStyle = '#f0f4ee'; c.lineWidth = 3;
        c.strokeRect(x0 + 6, y0 + 10, CW - 12, CH - 20);
        c.fillStyle = '#f0f4ee'; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.font = '700 34px Helvetica, Arial, sans-serif';
        c.fillText(name, x0 + CW / 2, y0 + CH / 2 + 1);
        cell.set(name, i);
      });
      const tex = new THREE.CanvasTexture(cv);
      tex.encoding = THREE.sRGBEncoding;
      // merged blade quads (double-sided) + instanced posts
      const pos = [], nrm = [], uv = [], idx = [];
      const bladeQuad = (x, y, z, ang, name) => {
        const w = 2.0, h = 0.5;
        const ux2 = Math.cos(ang), uz2 = -Math.sin(ang);
        const i0 = pos.length / 3;
        pos.push(x - ux2 * w/2, y - h/2, z - uz2 * w/2,  x + ux2 * w/2, y - h/2, z + uz2 * w/2,
                 x + ux2 * w/2, y + h/2, z + uz2 * w/2,  x - ux2 * w/2, y + h/2, z - uz2 * w/2);
        for (let k = 0; k < 4; k++) nrm.push(uz2, 0, ux2);
        const ci = cell.get(name);
        const u0 = (ci % COLS) / COLS, u1 = u0 + 1 / COLS;
        const v1 = 1 - ((ci / COLS) | 0) / rows, v0 = v1 - 1 / rows;
        uv.push(u0, v0, u1, v0, u1, v1, u0, v1);
        idx.push(i0, i0 + 1, i0 + 2, i0, i0 + 2, i0 + 3);
      };
      const gridAng = Math.atan2(upx, upz);          // avenue direction
      for (const p2 of posts) {
        bladeQuad(p2.x, 3.6, p2.z, gridAng + Math.PI / 2, p2.st);  // street blade runs E-W
        bladeQuad(p2.x, 3.15, p2.z, gridAng, p2.av);               // avenue blade runs N-S
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g.setIndex(idx);
      this.group.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({
        map: tex, side: THREE.DoubleSide, toneMapped: true })));
      // posts
      const post = new THREE.CylinderGeometry(0.05, 0.06, 3.9, 5);
      post.translate(0, 1.95, 0);
      const im = new THREE.InstancedMesh(post,
        new THREE.MeshLambertMaterial({ color: 0x2e5c3a }), posts.length);
      const m = new THREE.Matrix4();
      posts.forEach((p2, i) => {
        m.makeTranslation(p2.x, 0.22, p2.z);
        im.setMatrixAt(i, m);
      });
      im.frustumCulled = false;
      this.group.add(im);
    }

    // ---- STAN LEE cameo: the man himself on a corner near Delmar's ----
    _buildStanLee() {
      const base = this._delmarSpot || { x: 0, z: 0 };
      // put him ON A SIDEWALK: nearest road segment to the deli, offset to
      // the walking strip, ~35m down the block
      let spot = null, bd = 1e9;
      for (const r of this.city.zone.roads) {
        for (let i = 1; i < r.p.length; i++) {
          const [ax, az] = r.p[i - 1], [bx, bz] = r.p[i];
          const mx = (ax + bx) / 2, mz = (az + bz) / 2;
          const d = Math.hypot(mx - base.x, mz - base.z);
          if (d < 20 || d > 90 || d >= bd) continue;
          const L = Math.hypot(bx - ax, bz - az);
          if (L < 10) continue;
          const ux = (bx - ax) / L, uz = (bz - az) / L;
          const off = r.w / 2 + 1.7;
          for (const side of [1, -1]) {
            const x = mx - uz * off * side, z = mz + ux * off * side;
            if (this.city.isSolid(x, 1, z)) continue;
            bd = d; spot = { x, z };
          }
        }
      }
      if (!spot) return;
      const g = new THREE.Group();
      const mat = (c2) => new THREE.MeshLambertMaterial({ color: c2 });
      const add = (geo, m2, x, y, z) => {
        const mesh = new THREE.Mesh(geo, m2); mesh.position.set(x, y, z); g.add(mesh); };
      add(new THREE.BoxGeometry(0.44, 0.62, 0.26), mat(0x8a4a3a), 0, 1.05, 0);   // cardigan
      add(new THREE.BoxGeometry(0.4, 0.5, 0.24), mat(0x3a3f4a), 0, 0.5, 0);      // slacks
      add(new THREE.SphereGeometry(0.16, 8, 6), mat(0xd8a882), 0, 1.55, 0);      // head
      add(new THREE.BoxGeometry(0.34, 0.08, 0.2), mat(0xcccccc), 0, 1.66, 0);    // silver hair
      add(new THREE.BoxGeometry(0.3, 0.05, 0.05), mat(0x181818), 0, 1.56, 0.13); // glasses
      add(new THREE.BoxGeometry(0.14, 0.03, 0.04), mat(0xb8b8b8), 0, 1.47, 0.14);// moustache
      // waving right arm
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.1), mat(0x8a4a3a));
      arm.position.set(0.3, 1.35, 0); arm.rotation.z = -0.7;
      g.add(arm);
      add(new THREE.BoxGeometry(0.1, 0.5, 0.1), mat(0x8a4a3a), -0.27, 1.0, 0);   // left arm
      g.position.set(spot.x, 0.22, spot.z);
      g.rotation.y = Math.atan2(base.x - spot.x, base.z - spot.z);
      this.group.add(g);
      this._stan = g;
      this.eggs.push({ id: 'stanlee', x: spot.x, z: spot.z, r: 10,
                       label: 'A Familiar Cameo', icon: '#e8e8e8' });
    }

    // ---- MIDTOWN HIGH: dress a school-sized building — banner, pediment,
    // flag, and the yellow school bus at the curb ----
    _buildMidtownHigh() {
      const pt = this.ll(40.7526, -73.9755);   // a quiet mid-east block
      let b = null, f = null;
      const cands = [];
      for (const x of this.city.buildings) {
        if (!x.poly || x.h < 10 || x.h > 30) continue;
        const cx = (x.bx0 + x.bx1) / 2, cz = (x.bz0 + x.bz1) / 2;
        const d = Math.hypot(cx - pt.x, cz - pt.z);
        if (d < 400) cands.push({ x, d });
      }
      cands.sort((a, b2) => a.d - b2.d);
      for (const { x } of cands) {
        const ff = this._facade(x);
        if (!ff || ff.len < 22) continue;
        const ox = ff.mx + ff.nx * 9, oz = ff.mz + ff.nz * 9;
        let open = true;
        for (const ob of this.city.buildingsNear(ox, oz)) {
          if (ox > ob.bx0 && ox < ob.bx1 && oz > ob.bz0 && oz < ob.bz1) { open = false; break; }
        }
        if (open) { b = x; f = ff; break; }
      }
      if (!b) return;
      const banner = makeCanvas(1024, 128, (c, w, h) => {
        c.fillStyle = '#12275c'; c.fillRect(0, 0, w, h);
        c.strokeStyle = '#f2c33a'; c.lineWidth = 6; c.strokeRect(6, 6, w - 12, h - 12);
        c.fillStyle = '#f4f2ea'; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.font = '700 46px Georgia, serif';
        c.fillText('MIDTOWN SCHOOL OF SCIENCE & TECHNOLOGY', w / 2, h / 2);
      });
      const len = Math.min(f.len - 2, 26);
      this._panel(banner, len, len * 0.125,
        { x: f.mx + f.nx * 0.42, y: 6.2, z: f.mz + f.nz * 0.42 }, f.nx, f.nz, false);
      const crest = makeCanvas(256, 256, (c, w, h) => {
        c.clearRect(0, 0, w, h);
        c.fillStyle = '#12275c';
        c.beginPath(); c.moveTo(w/2, 12); c.lineTo(w-24, 60); c.lineTo(w-40, h-30);
        c.lineTo(w/2, h-8); c.lineTo(40, h-30); c.lineTo(24, 60); c.closePath(); c.fill();
        c.strokeStyle = '#f2c33a'; c.lineWidth = 8; c.stroke();
        c.fillStyle = '#f2c33a'; c.textAlign = 'center';
        c.font = '900 100px Georgia, serif'; c.fillText('M', w/2, h*0.62);
      });
      this._panel(crest, 4, 4,
        { x: f.mx + f.nx * 0.45, y: 10.5, z: f.mz + f.nz * 0.45 }, f.nx, f.nz, false)
        .material.transparent = true;
      // flag pole + pennant
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 9, 5),
        new THREE.MeshLambertMaterial({ color: 0xb8bcc4 }));
      pole.position.set(f.mx + f.nx * 5, 4.5 + 0.22, f.mz + f.nz * 5);
      this.group.add(pole);
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.2),
        new THREE.MeshLambertMaterial({ color: 0x12275c, side: THREE.DoubleSide }));
      flag.position.set(pole.position.x + 1.1, 8.6, pole.position.z);
      this.group.add(flag);
      // yellow school bus at the curb
      const bus = new THREE.Group();
      const busMat = new THREE.MeshLambertMaterial({ color: 0xe8a51c });
      const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.6, 7.5), busMat);
      body.position.y = 1.3; bus.add(body);
      const hood = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.0, 1.4), busMat);
      hood.position.set(0, 1.0, 4.4); bus.add(hood);
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.24, 0.18, 7.5),
        new THREE.MeshLambertMaterial({ color: 0x16161c }));
      stripe.position.y = 1.15; bus.add(stripe);
      for (const [zx, zz] of [[0.85, 2.6], [-0.85, 2.6], [0.85, -2.6], [-0.85, -2.6]]) {
        const wl = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 8),
          new THREE.MeshLambertMaterial({ color: 0x16161c }));
        wl.rotation.z = Math.PI / 2;
        wl.position.set(zx, 0.45, zz);
        bus.add(wl);
      }
      bus.position.set(f.mx + f.nx * 8, 0.22, f.mz + f.nz * 8);
      bus.rotation.y = Math.atan2(f.ux, f.uz);
      this.group.add(bus);
      this.eggs.push({ id: 'midtownhigh', x: f.mx + f.nx * 3, z: f.mz + f.nz * 3, r: 26,
                       label: 'Midtown High', icon: '#f2c33a' });
    }

    // ---- GARGOYLES: weathered stone sentinels crouched on the cornices of
    // select masonry towers, facing out over the street ----
    _buildGargoyles() {
      const box = (w, h, d, x, y, z) => {
        const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); return g; };
      // hunched crouch leaning forward over the ledge, head thrust out and
      // down toward the street, wings swept up behind — the classic gargoyle
      const body = new THREE.BoxGeometry(0.66, 0.62, 0.7);
      body.rotateX(0.35); body.translate(0, 0.5, 0.05);           // hunched torso
      const neck = box(0.32, 0.34, 0.5, 0, 0.66, 0.5);            // craned neck
      const head = box(0.4, 0.34, 0.42, 0, 0.52, 0.82);           // head thrust forward/down
      const snout = box(0.2, 0.18, 0.26, 0, 0.46, 1.02);          // muzzle
      const parts = [
        body, neck, head, snout,
        box(0.13, 0.2, 0.13, 0.14, 0.66, 0.72),                   // horn L
        box(0.13, 0.2, 0.13, -0.14, 0.66, 0.72),                  // horn R
        box(0.16, 0.42, 0.16, 0.26, 0.22, 0.5),                   // foreleg L (gripping)
        box(0.16, 0.42, 0.16, -0.26, 0.22, 0.5),                  // foreleg R
        box(0.2, 0.16, 0.34, 0.26, 0.05, 0.62),                   // clawed foot L
        box(0.2, 0.16, 0.34, -0.26, 0.05, 0.62),                  // clawed foot R
        box(0.16, 0.5, 0.18, 0, 0.28, -0.32),                     // haunches/tail base
      ];
      // wings swept UP and back into a pointed folded silhouette
      const wingL = new THREE.BoxGeometry(0.1, 1.05, 0.55);
      wingL.rotateZ(0.6); wingL.rotateY(-0.5); wingL.translate(0.4, 0.85, -0.28);
      const wingR = new THREE.BoxGeometry(0.1, 1.05, 0.55);
      wingR.rotateZ(-0.6); wingR.rotateY(0.5); wingR.translate(-0.4, 0.85, -0.28);
      parts.push(wingL, wingR);
      // merge to one geometry
      const ps = [], ns = [], ix = [];
      for (const g of parts) {
        const b0 = ps.length / 3, gp = g.attributes.position, gn = g.attributes.normal;
        for (let i = 0; i < gp.count; i++) {
          ps.push(gp.getX(i), gp.getY(i), gp.getZ(i));
          ns.push(gn.getX(i), gn.getY(i), gn.getZ(i));
        }
        for (let i = 0; i < g.index.count; i++) ix.push(b0 + g.index.getX(i));
        g.dispose();
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(ps, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(ns, 3));
      geo.setIndex(ix);

      const spots = [];
      for (const b of this.city.buildings) {
        if (!b.fam || b.fam === 'glass' || b.h < 30 || b.h > 95) continue;
        if ((b.hash % 11) >= 2 || spots.length >= 70) continue;
        const poly = b.poly;
        // the corner whose outward direction points most toward open street
        let best = null, bestOpen = -1;
        for (let i = 0; i < poly.length; i++) {
          const j = (i + 1) % poly.length, p = (i - 1 + poly.length) % poly.length;
          const cx = poly[i][0], cz = poly[i][1];
          // average of the two adjacent edge normals = outward corner dir
          const e1x = poly[i][0] - poly[p][0], e1z = poly[i][1] - poly[p][1];
          const e2x = poly[j][0] - poly[i][0], e2z = poly[j][1] - poly[i][1];
          let nx = (e1z + e2z), nz = -(e1x + e2x);
          const nl = Math.hypot(nx, nz) || 1; nx /= nl; nz /= nl;
          const ox = cx + nx * 7, oz = cz + nz * 7;
          let open = 1;
          for (const ob of this.city.buildingsNear(ox, oz)) {
            if (ox > ob.bx0 && ox < ob.bx1 && oz > ob.bz0 && oz < ob.bz1) { open = 0; break; }
          }
          if (open > bestOpen) { bestOpen = open; best = { cx, cz, nx, nz }; }
        }
        if (!best) continue;
        spots.push({ x: best.cx + best.nx * 0.3, y: (b.parapetTop || b.h) - 0.1,
                     z: best.cz + best.nz * 0.3, rot: Math.atan2(best.nx, best.nz) });
      }
      if (!spots.length) return;
      const im = new THREE.InstancedMesh(geo,
        new THREE.MeshLambertMaterial({ color: 0x2b2a26 }), spots.length);   // dark weathered stone
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(),
            v = new THREE.Vector3(), sc = new THREE.Vector3(1.15, 1.15, 1.15);
      const UP = new THREE.Vector3(0, 1, 0);
      spots.forEach((s2, i) => {
        v.set(s2.x, s2.y, s2.z);
        q.setFromAxisAngle(UP, s2.rot);
        m.compose(v, q, sc);
        im.setMatrixAt(i, m);
      });
      im.castShadow = true; im.frustumCulled = false;
      this.group.add(im);
    }

    // ---- FISK TOWER: a tall dark tower crowned with a lit penthouse (the
    // Kingpin's office light is always on) ----
    _buildFiskTower() {
      const pt = this.ll(40.7614, -73.9776);   // midtown-east, near the real
      let b = null, bd = 1e9;                    // corporate glass spine
      for (const x of this.city.buildings) {
        if (!x.fam || x.h < 120) continue;
        const cx = (x.bx0 + x.bx1) / 2, cz = (x.bz0 + x.bz1) / 2;
        const d = Math.hypot(cx - pt.x, cz - pt.z);
        if (d < bd) { bd = d; b = x; }
      }
      if (!b || bd > 900) return;
      const cx = (b.bx0 + b.bx1) / 2, cz = (b.bz0 + b.bz1) / 2;
      const w = Math.min((b.bx1 - b.bx0), (b.bz1 - b.bz0)) * 0.72;
      // inset dark-glass penthouse block on the roof
      const pent = new THREE.Mesh(new THREE.BoxGeometry(w, 9, w),
        new THREE.MeshStandardMaterial({ color: 0x14161c, metalness: 0.6, roughness: 0.35 }));
      pent.position.set(cx, b.h + 4.5, cz);
      this.group.add(pent);
      // the penthouse LIGHT: a warm glowing window band wrapping the block
      const lit = makeCanvas(256, 64, (c, W, H) => {
        c.fillStyle = '#0c0e14'; c.fillRect(0, 0, W, H);
        for (let i = 0; i < 12; i++) {
          c.fillStyle = (i % 3) ? '#ffca7a' : '#f4b45a';
          c.fillRect(6 + i * 21, 14, 15, 36);
        }
      });
      const glowMat = new THREE.MeshBasicMaterial({ map: lit, toneMapped: true });
      const band = new THREE.Mesh(new THREE.BoxGeometry(w + 0.1, 3.4, w + 0.1), glowMat);
      band.position.set(cx, b.h + 3.2, cz);
      this.group.add(band);
      // flat crown slab + a slim antenna mast with a red aircraft light
      const crown = new THREE.Mesh(new THREE.BoxGeometry(w + 1.4, 0.6, w + 1.4),
        new THREE.MeshLambertMaterial({ color: 0x1a1c22 }));
      crown.position.set(cx, b.h + 9.3, cz);
      this.group.add(crown);
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 10, 6),
        new THREE.MeshLambertMaterial({ color: 0x2a2c30 }));
      mast.position.set(cx, b.h + 14, cz);
      this.group.add(mast);
      this._fiskBeacon = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6),
        new THREE.MeshBasicMaterial({ color: 0xff2222 }));
      this._fiskBeacon.position.set(cx, b.h + 19.2, cz);
      this.group.add(this._fiskBeacon);
      // FISK wordmark facing the avenue
      const f = this._facade(b);
      const sign = makeCanvas(512, 128, (c, W, H) => {
        c.fillStyle = 'rgba(10,10,14,0.85)'; c.fillRect(0, 0, W, H);
        c.fillStyle = '#c8ccd4'; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.font = '900 74px Georgia, "Times New Roman", serif';
        c.fillText('FISK', W / 2, H / 2 + 4);
        c.strokeStyle = '#8a8e96'; c.lineWidth = 4; c.strokeRect(8, 8, W - 16, H - 16);
      });
      this._panel(sign, Math.min(f.len * 0.5, 14), Math.min(f.len * 0.5, 14) * 0.25,
        { x: f.mx + f.nx * 0.5, y: b.h - 6, z: f.mz + f.nz * 0.5 }, f.nx, f.nz, false);
      this.eggs.push({ id: 'fisk', x: cx, z: cz, r: 40, label: 'Fisk Tower', icon: '#c8ccd4' });
    }

    // ---- THE BLOT: the Spot's portals — ragged black holes hanging in the
    // air, white-rimmed, slowly drifting. A tear in reality over midtown. ----
    _buildBlot() {
      const base = this.ll(40.7638, -73.9605);   // high over the east side
      const tex = makeCanvas(256, 256, (c, w, h) => {
        c.clearRect(0, 0, w, h);
        // wobbly-edged black blob with a soft white rim
        const cx = w / 2, cy = h / 2;
        c.beginPath();
        for (let i = 0; i <= 40; i++) {
          const a = i / 40 * Math.PI * 2;
          const r = 96 * (1 + 0.14 * Math.sin(a * 3.3) + 0.08 * Math.sin(a * 7.1));
          const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r * 0.94;
          i ? c.lineTo(px, py) : c.moveTo(px, py);
        }
        c.closePath();
        c.strokeStyle = 'rgba(245,245,250,0.95)'; c.lineWidth = 7; c.stroke();
        c.fillStyle = '#050507'; c.fill();
      });
      this._blots = [];
      // a Spider-Man body ≈ 2 m; drop the portals ~2 body-lengths so they hang
      // lower and can be swung/dived through
      const DROP = 4;
      const spots = [[0, 150, 0, 9], [55, 185, 40, 6], [-70, 130, 60, 5],
                     [30, 215, -75, 7], [-45, 245, -30, 4.5]];
      for (const [ox, y, oz, r] of spots) {
        const m = new THREE.Mesh(new THREE.CircleGeometry(r, 36),
          new THREE.MeshBasicMaterial({ map: tex, transparent: true,
            side: THREE.DoubleSide, depthWrite: false }));
        m.position.set(base.x + ox, y - DROP, base.z + oz);
        m.rotation.y = Math.random() * Math.PI;
        m.userData.ph = Math.random() * 6.28;
        m.userData.r = r;                 // for portal pass-through detection
        this.group.add(m);
        this._blots.push(m);
      }
      // expose the portals so the player can be teleported between them
      GAME.portals = this._blots;
      this.eggs.push({ id: 'blot', x: base.x, z: base.z, r: 45,
                       label: 'A Hole in Reality', icon: '#111116' });
    }

    // ---- SANDMAN SITE: a construction lot — steel skeleton, sand heap, the
    // cracked concrete slab and a sledgehammer (Flint Marko was here) ----
    _buildSandSite() {
      const pt = this.ll(40.7508, -73.9689);
      let spot = null;
      outer2:
      for (let r = 14; r < 160; r += 12) {
        for (let a = 0; a < 6.28; a += 0.7) {
          const x = pt.x + Math.cos(a) * r, z = pt.z + Math.sin(a) * r;
          let clear = true;
          for (const ob of this.city.buildingsNear(x, z)) {
            if (x + 14 > ob.bx0 && x - 14 < ob.bx1 && z + 11 > ob.bz0 && z - 11 < ob.bz1) {
              clear = false; break;
            }
          }
          if (clear && !GAME.CityPlan.inRoadway(x, z, this.city.zone.roads, 12)) {
            spot = { x, z }; break outer2;
          }
        }
      }
      if (!spot) return;
      const g = new THREE.Group();
      g.position.set(spot.x, 0.24, spot.z);
      const mat = (c2) => new THREE.MeshLambertMaterial({ color: c2 });
      const add = (geo, m2, x, y, z, ry) => {
        const mesh = new THREE.Mesh(geo, m2);
        mesh.position.set(x, y, z);
        if (ry) mesh.rotation.y = ry;
        mesh.castShadow = true;
        g.add(mesh); return mesh;
      };
      // dirt pad
      add(new THREE.BoxGeometry(26, 0.28, 20), mat(0x8a7354), 0, 0.1, 0);
      // steel I-beam skeleton (2 bays)
      const steel = mat(0xa3552e);
      for (const [px, pz] of [[-9, -6], [0, -6], [9, -6], [-9, 6], [0, 6], [9, 6]])
        add(new THREE.BoxGeometry(0.5, 9, 0.5), steel, px, 4.6, pz);
      for (const py of [4.4, 8.8]) {
        add(new THREE.BoxGeometry(18.8, 0.4, 0.5), steel, 0, py, -6);
        add(new THREE.BoxGeometry(18.8, 0.4, 0.5), steel, 0, py, 6);
        for (const px of [-9, 0, 9])
          add(new THREE.BoxGeometry(0.5, 0.4, 12), steel, px, py, 0);
      }
      // cracked concrete slab (SM3 pit homage)
      const crack = makeCanvas(256, 256, (c, w, h) => {
        c.fillStyle = '#9a968c'; c.fillRect(0, 0, w, h);
        c.strokeStyle = '#3c3830'; c.lineJoin = 'round';
        const cx = w * 0.42, cy = h * 0.5;
        for (let a = 0; a < 12; a++) {
          const ang = a / 12 * Math.PI * 2 + 0.2;
          c.lineWidth = 4 - a % 3;
          c.beginPath(); c.moveTo(cx, cy);
          let px = cx, py = cy;
          for (let sgm = 0; sgm < 4; sgm++) {
            px += Math.cos(ang + (sgm % 2 ? 0.35 : -0.3)) * (18 + sgm * 12);
            py += Math.sin(ang + (sgm % 2 ? 0.35 : -0.3)) * (18 + sgm * 12);
            c.lineTo(px, py);
          }
          c.stroke();
        }
        for (let r = 22; r < 90; r += 24) {          // web-like rings
          c.lineWidth = 2;
          c.beginPath(); c.arc(cx, cy, r, 0, 6.3); c.stroke();
        }
      });
      const slab = new THREE.Mesh(new THREE.BoxGeometry(10, 0.5, 8),
        new THREE.MeshLambertMaterial({ map: crack }));
      slab.position.set(-5.5, 0.5, 1.5);
      slab.rotation.y = 0.3;
      g.add(slab);
      // sand heap (Flint's calling card)
      const heap = new THREE.Mesh(new THREE.ConeGeometry(2.6, 1.7, 12),
        mat(0xd8c084));
      heap.position.set(6.5, 1.05, -2);
      g.add(heap);
      add(new THREE.ConeGeometry(1.3, 0.9, 10), mat(0xd0b878), 4.2, 0.65, 2.8);
      // sledgehammer leaning on the slab
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 2.3, 7),
        mat(0x8a6a44));
      handle.position.set(-1.2, 1.25, 4.2);
      handle.rotation.z = 0.55;
      g.add(handle);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.34, 0.36),
        mat(0x3c4046));
      head.position.set(-0.62, 2.22, 4.2);
      head.rotation.z = 0.55;
      g.add(head);
      this.group.add(g);
      this._sandSpot = spot;
      this.eggs.push({ id: 'sandsite', x: spot.x, z: spot.z, r: 24,
                       label: 'The Dig Site', icon: '#d8c084' });
    }

    // ---- one patrol helicopter, far and high, blinking ----
    _buildHelicopter() {
      this.heli = new THREE.Group();
      const body = new THREE.Mesh(new THREE.SphereGeometry(1.6, 8, 6),
        new THREE.MeshLambertMaterial({ color: 0x22242a }));
      body.scale.set(1, 0.7, 2.2);
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 4.4),
        new THREE.MeshLambertMaterial({ color: 0x22242a }));
      tail.position.z = -3.2;
      this.blink = new THREE.Mesh(new THREE.SphereGeometry(0.35, 6, 5),
        new THREE.MeshBasicMaterial({ color: 0xff2222 }));
      this.blink.position.y = 1.1;
      this.rotor = new THREE.Mesh(new THREE.BoxGeometry(9, 0.08, 0.5),
        new THREE.MeshLambertMaterial({ color: 0x333338 }));
      this.rotor.position.y = 1.4;
      this.heli.add(body, tail, this.blink, this.rotor);
      this.group.add(this.heli);
      this._heliT = 0;
    }

    // ---- street steam vents (very sparse — ambience, not spectacle) ----
    _buildSteam() {
      let seed = 77;
      const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      const tex = makeCanvas(64, 64, (c, w, h) => {
        const g = c.createRadialGradient(w/2, h/2, 2, w/2, h/2, w/2);
        g.addColorStop(0, 'rgba(235,235,235,0.55)');
        g.addColorStop(1, 'rgba(235,235,235,0)');
        c.fillStyle = g; c.fillRect(0, 0, w, h);
      });
      const roads = this.city.zone.roads;
      for (let i = 0; i < 10 && roads.length; i++) {
        const r = roads[(rnd() * roads.length) | 0];
        const [x, z] = r.p[(rnd() * r.p.length) | 0];
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({
          map: tex, transparent: true, depthWrite: false, opacity: 0.5 }));
        sp.position.set(x + (rnd() - 0.5) * 4, 1, z + (rnd() - 0.5) * 4);
        sp.scale.set(3, 4, 1);
        sp.userData = { t: rnd() * 6, x: sp.position.x, z: sp.position.z };
        this.group.add(sp);
        this.steam.push(sp);
      }
    }

    // ---- CENTRAL PARK LIFE: lakes, the loop drive, cross paths, joggers ----
    _buildParkLife() {
      const park = (this.city.zone.parks || []).find(k => k.n === 'Central Park');
      if (!park) return;
      const poly = park.p, PK = GAME.PARK;
      let seed = 53;
      const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

      // lakes — wobbly ellipses in park space so shorelines read natural
      const waterMat = new THREE.MeshLambertMaterial({ color: 0x2a5a78, side: THREE.DoubleSide });
      for (const L of PK.lakes) {
        const shape = new THREE.Shape();
        for (let i = 0; i <= 30; i++) {
          const a = i / 30 * Math.PI * 2;
          const wob = 1 + 0.16 * Math.sin(a * 3 + L.cx * 20) + 0.09 * Math.sin(a * 5);
          const p = GAME.parkXZ(poly, L.cx + Math.cos(a) * L.rx * wob,
                                      L.cy + Math.sin(a) * L.ry * wob);
          if (i === 0) shape.moveTo(p.x, p.z); else shape.lineTo(p.x, p.z);
        }
        const g = new THREE.ShapeGeometry(shape);
        g.rotateX(Math.PI / 2);                       // shape XY → ground XZ
        const m = new THREE.Mesh(g, waterMat);
        m.position.y = 0.26;
        this.group.add(m);
      }

      // path ribbon builder: flat strip through a list of (u,v) points
      // unlit grey so no colored skylight can tint it; update() darkens it as
      // the evening comes on (fog still applies to MeshBasic)
      const pathMat = this._pathMat = new THREE.MeshBasicMaterial({ color: 0x8b8d92 });
      const ribbon = (uv, w) => {
        const pts = uv.map(([u, v]) => GAME.parkXZ(poly, u, v));
        const pos = [], idx = [];
        for (let i = 0; i < pts.length; i++) {
          const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
          let dx = b.x - a.x, dz = b.z - a.z;
          const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
          pos.push(pts[i].x - dz * w / 2, 0.28, pts[i].z + dx * w / 2,
                   pts[i].x + dz * w / 2, 0.28, pts[i].z - dx * w / 2);
          if (i) idx.push(2*i-2, 2*i-1, 2*i, 2*i-1, 2*i+1, 2*i);
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        const nn = new Float32Array(pos.length);
        for (let i = 1; i < nn.length; i += 3) nn[i] = 1;   // flat ground: all up
        g.setAttribute('normal', new THREE.BufferAttribute(nn, 3));
        g.setIndex(idx);
        const m = new THREE.Mesh(g, pathMat);
        m.material.side = THREE.DoubleSide;
        this.group.add(m);
        return pts;
      };

      // the loop drive: rounded rectangle circuit around the park
      const { u0, u1, v0, v1 } = PK.loop, cr = 0.05;
      const loopUV = [];
      const arc = (cu, cv, a0, a1) => {
        for (let i = 0; i <= 6; i++) {
          const a = a0 + (a1 - a0) * i / 6;
          loopUV.push([cu + Math.cos(a) * cr, cv + Math.sin(a) * cr * 0.28]);
        }
      };
      arc(u0 + cr, v0 + cr * 0.28, Math.PI, Math.PI * 1.5);
      arc(u1 - cr, v0 + cr * 0.28, Math.PI * 1.5, Math.PI * 2);
      arc(u1 - cr, v1 - cr * 0.28, 0, Math.PI * 0.5);
      arc(u0 + cr, v1 - cr * 0.28, Math.PI * 0.5, Math.PI);
      loopUV.push(loopUV[0]);
      const loopPts = ribbon(loopUV, 7);

      // transverse footpaths
      for (const cv of PK.crossV) ribbon([[u0, cv], [u1, cv]], 4);

      // arc-length table for the loop so joggers move at constant speed
      const cum = [0];
      for (let i = 1; i < loopPts.length; i++)
        cum.push(cum[i - 1] + Math.hypot(loopPts[i].x - loopPts[i-1].x,
                                         loopPts[i].z - loopPts[i-1].z));
      this._loop = { pts: loopPts, cum, L: cum[cum.length - 1] };

      // joggers: low-poly figures in a mid-stride pose; the bob + lean in
      // update() sells the run. Non-interactable ambience.
      const parts = [];
      const box = (w, h, d, x, y, z) => {
        const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); return g; };
      parts.push(box(0.34, 0.52, 0.2, 0, 1.06, 0));            // torso
      parts.push(box(0.16, 0.16, 0.18, 0, 1.48, 0.02));        // head
      parts.push(box(0.1, 0.48, 0.1, 0.1, 0.42, 0.12));        // leg fwd
      parts.push(box(0.1, 0.48, 0.1, -0.1, 0.42, -0.14));      // leg back
      parts.push(box(0.08, 0.36, 0.08, 0.24, 1.06, -0.1));     // arm back
      parts.push(box(0.08, 0.36, 0.08, -0.24, 1.06, 0.12));    // arm fwd
      const merged = new THREE.BufferGeometry();
      {
        const ps = [], ns = [], ix = [];
        for (const g of parts) {
          const b0 = ps.length / 3, gp = g.attributes.position, gn = g.attributes.normal;
          for (let i = 0; i < gp.count; i++) {
            ps.push(gp.getX(i), gp.getY(i), gp.getZ(i));
            ns.push(gn.getX(i), gn.getY(i), gn.getZ(i));
          }
          for (let i = 0; i < g.index.count; i++) ix.push(b0 + g.index.getX(i));
          g.dispose();
        }
        merged.setAttribute('position', new THREE.Float32BufferAttribute(ps, 3));
        merged.setAttribute('normal', new THREE.Float32BufferAttribute(ns, 3));
        merged.setIndex(ix);
      }
      const N = 64;   // ~one per 150m of loop — visible on any pass over
      this.jogIM = new THREE.InstancedMesh(merged,
        new THREE.MeshLambertMaterial({ color: 0xffffff }), N);
      const cols = [0xc8524a, 0x4a7ac8, 0x58b060, 0xd8c84a, 0x9a6ee0, 0xe0e0e6, 0x30343c];
      for (let i = 0; i < N; i++) {
        this.joggers.push({ s: rnd() * this._loop.L, sp: 2.6 + rnd() * 1.8,
                            dir: rnd() < 0.5 ? 1 : -1, ph: rnd() * 6.28 });
        this.jogIM.setColorAt(i, new THREE.Color(cols[(rnd() * cols.length) | 0])
          .multiplyScalar(0.7 + rnd() * 0.5));
      }
      this.jogIM.instanceColor.needsUpdate = true;
      // instances span the whole park but the geometry bounding sphere sits at
      // the origin — default frustum culling would hide them all
      this.jogIM.frustumCulled = false;
      this.group.add(this.jogIM);
      this._jm = new THREE.Matrix4(); this._jq = new THREE.Quaternion();
      this._jp = new THREE.Vector3(); this._js = new THREE.Vector3(1, 1, 1);
      this._jUp = new THREE.Vector3(0, 1, 0);
    }

    update(dt, rig) {
      const nightK = rig ? rig.headlights : 0;   // 0 day → 1 sunset/night
      // park paths: grey by day, graphite as the light goes
      if (this._pathMat)
        this._pathMat.color.setHex(0x8b8d92).lerp(new THREE.Color(0x3b3d44), nightK);
      // Times Square: tickers crawl, street glow pools bloom after dark
      this._tickT = (this._tickT || 0) + dt;
      if (this.tickers) for (const m of this.tickers)
        m.map.offset.x = (this._tickT * 0.06) % 1;
      if (this.tsGlows) for (const g of this.tsGlows)
        g.opacity = 0.04 + 0.24 * nightK;
      // additive 340m sprite — anything past ~0.35 washes out the whole view
      // when you stand inside the square
      if (this.tsHaze) this.tsHaze.opacity = 0.14 + 0.2 * nightK;
      // billboard shimmer
      this._flickT = (this._flickT || 0) + dt;
      if (this._flickT > 0.12) {
        this._flickT = 0;
        for (const m of this.flicker)
          m.color.setScalar(0.92 + Math.random() * 0.1);
      }
      // helicopter patrol: a slow wide circle high over the city
      this._heliT += dt * 0.028;
      const B = this.city.bounds;
      const cx = (B.minX + B.maxX) / 2, cz = (B.minZ + B.maxZ) / 2;
      const rx = (B.maxX - B.minX) * 0.34, rz = (B.maxZ - B.minZ) * 0.34;
      this.heli.position.set(cx + Math.cos(this._heliT) * rx, 320 + Math.sin(this._heliT * 2.7) * 25,
                             cz + Math.sin(this._heliT) * rz);
      this.heli.rotation.y = -this._heliT + Math.PI / 2;
      this.rotor.rotation.y += dt * 28;
      this.blink.material.color.setHex(
        (performance.now() % 1200) < 140 ? 0xff2222 : 0x330808);
      // steam drifts up and recycles
      for (const sp of this.steam) {
        sp.userData.t += dt;
        const k = sp.userData.t % 5 / 5;
        sp.position.y = 0.8 + k * 7;
        sp.material.opacity = 0.4 * (1 - k) + 0.05;
        const sc = 2.5 + k * 5;
        sp.scale.set(sc, sc * 1.3, 1);
      }
      // egg discovery: reaching an egg unlocks its universe's suit
      this._eggT = (this._eggT || 0) + dt;
      if (this._eggT > 0.5 && GAME.player && GAME.unlocks) {
        this._eggT = 0;
        const p = GAME.player.pos;
        for (const e of this.eggs) {
          if (e.found) continue;
          if (GAME.unlocks.eggs.has(e.id)) { e.found = true; continue; }
          const dx = p.x - e.x, dz = p.z - e.z;
          // graffiti is street art — you have to come DOWN to see it
          if (e.id.startsWith('graffiti') && p.y > 14) continue;
          if (dx * dx + dz * dz < e.r * e.r) {
            e.found = true;
            GAME.unlocks.foundEgg(e.id);
          }
        }
      }
      // Blot portals drift and slowly turn
      if (this._blots) {
        for (const m of this._blots) {
          m.userData.ph += dt * 0.4;
          m.rotation.y += dt * 0.12;
          m.position.y += Math.sin(m.userData.ph) * dt * 0.5;
        }
      }
      // shop glow rises with night; Stan gives a slow wave
      const nightK2 = rig ? rig.headlights : 0;
      if (this._shopGlowMat) this._shopGlowMat.opacity = 0.28 * nightK2;
      if (this._fiskBeacon)
        this._fiskBeacon.material.color.setHex(
          (performance.now() % 1400) < 160 ? 0xff2222 : 0x330808);
      if (this._stan) {
        this._stanT = (this._stanT || 0) + dt;
        this._stan.children[6].rotation.z = -0.7 + Math.sin(this._stanT * 2.2) * 0.25;
      }
      // joggers around the park loop
      if (this._loop) {
        const { pts, cum, L } = this._loop;
        for (let i = 0; i < this.joggers.length; i++) {
          const j = this.joggers[i];
          j.s = (j.s + j.sp * j.dir * dt + L) % L;
          let lo = 0, hi = pts.length - 1;
          while (lo < hi) { const m = (lo + hi) >> 1; if (cum[m + 1] < j.s) lo = m + 1; else hi = m; }
          const t = (j.s - cum[lo]) / (cum[lo + 1] - cum[lo] || 1);
          const x = pts[lo].x + (pts[lo + 1].x - pts[lo].x) * t;
          const z = pts[lo].z + (pts[lo + 1].z - pts[lo].z) * t;
          const dx = (pts[lo + 1].x - pts[lo].x) * j.dir, dz = (pts[lo + 1].z - pts[lo].z) * j.dir;
          j.ph += dt * j.sp * 2.4;
          this._jp.set(x, 0.28 + Math.abs(Math.sin(j.ph)) * 0.09, z);
          this._jq.setFromAxisAngle(this._jUp, Math.atan2(dx, dz));
          this._jm.compose(this._jp, this._jq, this._js);
          this.jogIM.setMatrixAt(i, this._jm);
        }
        this.jogIM.instanceMatrix.needsUpdate = true;
      }
    }

    dispose() {
      this.scene.remove(this.group);
      this.group.traverse(o => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); }
      });
    }
  }

  GAME.Landmarks = Landmarks;
})();
