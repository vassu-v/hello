/* Hand-drawn scenes layered over the live sky (Canvas 2D, no images).
 * A scene is { draw(ctx, W, H, env, kit), fx?(ctx, W, H, env, kit, dt, state) }.
 * draw() re-runs whenever light/weather changes; fx() runs at 24fps for small motion.
 * Every colour is derived from the sky: layer = mix(skyHorizon, ink, depth), so scenes
 * always sit inside the real light. Add a scene with Scene.register(name, scene). */
const Scene = (() => {
  const cv = document.getElementById("scene"), cx = cv.getContext("2d");
  const fx = document.getElementById("fx"), fc = fx.getContext("2d");
  const reg = {}; let W = 0, H = 0, R = 1, env = null, cur = null, sig = "", lastDraw = 0, fxState = null, lastFx = 0;

  /* ---------------- kit ---------------- */
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  const mul = (a, k) => a.map(v => v * k);
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
  const css = (c, a = 1) => `rgba(${c.map(v => Math.round(clamp(v) * 255)).join(",")},${a})`;
  const lum = c => .2126 * c[0] + .7152 * c[1] + .0722 * c[2];
  const desat = (c, t) => mix(c, [lum(c), lum(c), lum(c)], t);
  const h1 = (s, i) => { const n = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return n - Math.floor(n); };
  const vn = (s, x) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return h1(s, i) * (1 - u) + h1(s, i + 1) * u; };
  const fbm = (s, x, oct = 3) => { let v = 0, a = .5, f = 1, n = 0; for (let o = 0; o < oct; o++) { v += a * vn(s + o * 13, x * f); n += a; a *= .5; f *= 2.13; } return v / n; };
  const rng = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const bell = (x, c, w) => Math.exp(-(((x - c) / w) ** 2));

  /** Lighting palette for the current sky. */
  function look(e) {
    const day = clamp((e.alt - 4) / 16), gold = bell(e.alt, 3, 5) * (1 - e.dark), night = clamp((-e.alt - 4) / 8);
    const over = clamp(e.dark * 1.2 + e.fog * .5);
    let ink = mix(mul(e.zen, .3), hex("#151230"), .35);
    ink = mix(ink, hex("#2f4a3a"), day * .55);
    ink = mix(ink, hex("#3a2f4a"), gold * .7);
    ink = mix(ink, hex("#0d1222"), night * .85);
    let haze = e.hor.slice();
    if (gold > .05) haze = mix(haze, hex("#f2a65a"), gold * .35);
    if (night > 0) haze = mix(haze, desat(haze, .4), night);
    ink = mix(desat(ink, over * .5), hex("#8c949c"), over * .15 * (1 - night));
    haze = mix(desat(haze, over * .5), mul(hex("#8c949c"), .3 + .7 * e.lum + .1), over * .15);
    if (e.rain > 0) { ink = mul(ink, .9); haze = mul(haze, .9); }
    const amb = clamp(.05 + e.lum * 1.5) * (1 - e.dark * .2);
    const rimA = e.sun[2] * (1 - over) * (.3 * gold + .1 * day);
    return { ink, haze, amb, day, gold, night, over, rimA, rim: gold > .2 ? hex("#ffd08a") : e.sunCol,
      layer: d => mix(haze, ink, .2 + .7 * d) };
  }

  /** One ridge. Asymmetric peaks: fbm plus its own slope, so one face is gentle and one steep. */
  function ridgePts(x0, w, base, amp, seed, o = {}) {
    const pts = [], step = Math.max(2, w / 260), f = o.freq || 2.4, oct = o.oct || 3;
    const g = t => fbm(seed, t * f + seed * .37, oct);
    for (let x = 0; x <= w + step; x += step) {
      const t = x / w, v = g(t), dv = (v - g(t - .012)) * 9;
      let y = clamp(v + clamp(dv, -.2, .35) * .5, 0, 1.3);
      if (o.peak != null) y *= .55 + .65 * bell(t, o.peak, .2);
      pts.push([x0 + x, base - amp * y]);
    }
    return pts;
  }
  function fillRidge(ctx, pts, bottom, col, o = {}) {
    const top = Math.min(...pts.map(p => p[1]));
    ctx.beginPath(); ctx.moveTo(pts[0][0], bottom); pts.forEach(p => ctx.lineTo(p[0], p[1])); ctx.lineTo(pts[pts.length - 1][0], bottom); ctx.closePath();
    const g = ctx.createLinearGradient(0, top, 0, bottom);           // 7% lighter at the crest
    g.addColorStop(0, css(mul(col, 1.07) .map((v, i) => v + .012), o.alpha ?? 1)); g.addColorStop(1, css(col, o.alpha ?? 1));
    ctx.fillStyle = g; ctx.fill();
  }
  function rimStroke(ctx, pts, L, sunX) {        // 1px light on sun-facing slopes only
    if (L.rimA < .01) return;
    ctx.strokeStyle = css(L.rim, L.rimA); ctx.lineWidth = 1; ctx.beginPath();
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1], [bx, by] = pts[i], facing = (by - ay) * (sunX > bx ? -1 : 1) < 0;
      if (facing) { ctx.moveTo(ax, ay); ctx.lineTo(bx, by); }
    }
    ctx.stroke();
  }
  function hazeBand(ctx, x0, w, y, h, L, k = 1) {
    const g = ctx.createLinearGradient(0, y - h, 0, y + h * .4);
    const a = clamp((.25 + .15 * L.over + (env.rain > 0 ? .2 : 0) + env.fog * .45) * k, 0, .75);
    g.addColorStop(0, css(L.haze, 0)); g.addColorStop(.75, css(L.haze, a)); g.addColorStop(1, css(L.haze, 0));
    ctx.fillStyle = g; ctx.fillRect(x0, y - h, w, h * 1.4);
  }
  function snowCap(ctx, pts, L, base, amp, k) {   // light fill above a jagged snow line
    ctx.save(); ctx.beginPath(); ctx.moveTo(pts[0][0], base); pts.forEach(p => ctx.lineTo(p[0], p[1])); ctx.lineTo(pts[pts.length - 1][0], base); ctx.clip();
    const snow = mix(hex("#eef2f6"), L.haze, .35 + L.night * .4), line = base - amp * .55;
    ctx.fillStyle = css(mul(snow, .35 + .65 * L.amb + .1), k); ctx.beginPath(); ctx.moveTo(pts[0][0], line);
    pts.forEach((p, i) => ctx.lineTo(p[0], line - amp * .12 * fbm(9, i * .21, 2) - (i % 3) * amp * .02));
    ctx.lineTo(pts[pts.length - 1][0], base - amp * 2); ctx.lineTo(pts[0][0], base - amp * 2); ctx.fill(); ctx.restore();
  }
  function pines(ctx, pts, col, h, clusters, seed) {   // tiered, jittered, in clusters
    const r = rng(seed); ctx.fillStyle = css(col); ctx.strokeStyle = css(col);
    const x0 = pts[0][0], w = pts[pts.length - 1][0] - x0;
    clusters.forEach(([a, b]) => {
      for (let x = x0 + w * a; x < x0 + w * b; x += h * (.18 + r() * .35)) {
        const p = pts[Math.min(pts.length - 1, Math.round((x - x0) / w * (pts.length - 1)))], th = h * (.45 + r() * .7), tw = th * (.22 + r() * .08);
        ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, p[1] + 3); ctx.lineTo(x, p[1] - th * .2); ctx.stroke();
        for (let t = 0; t < 3; t++) {
          const yb = p[1] - th * (.12 + t * .27), yt = yb - th * .42, ww = tw * (1 - t * .25);
          ctx.beginPath(); ctx.moveTo(x + (r() - .5) * .8, yt); ctx.lineTo(x + ww, yb); ctx.lineTo(x - ww * (.85 + r() * .3), yb); ctx.fill();
        }
      }
    });
  }
  /** Full mountain range in a box. bases/amps are fractions of box height. */
  function range(ctx, box, e, L, o) {
    const [x0, y0, w, h] = box, n = o.bases.length, sunX = x0 + e.sun[0] * w, out = [];
    for (let i = 0; i < n; i++) {
      const d = i / (n - 1), base = y0 + h * o.bases[i], amp = h * o.amps[i], col = L.layer(d);
      const pts = ridgePts(x0, w, base, amp, o.seed + i * 17, { peak: i < 2 ? o.peak : null, freq: 2 + i * .6 });
      const fogA = i < n - 1 ? clamp(1 - e.fog * (1.1 - d * .5), .12, 1) : 1;
      if (o.beforeLayer) o.beforeLayer(i, base, out);
      fillRidge(ctx, pts, y0 + h, col, { alpha: fogA });
      if (i < 2 && (L.day > .2 || L.gold > .2 || e.snow > 0)) snowCap(ctx, pts, L, base, amp, (i ? .5 : .8) * fogA * (1 - L.night));
      rimStroke(ctx, pts, L, sunX);
      if (e.snow > 0) { ctx.strokeStyle = css(hex("#eef2f6"), .5 * e.snow * (.3 + L.amb)); ctx.lineWidth = 1.5; ctx.beginPath(); pts.forEach((p, k) => k ? ctx.lineTo(p[0], p[1] + 1) : ctx.moveTo(p[0], p[1] + 1)); ctx.stroke(); }
      if (o.pines && i === n - 1) pines(ctx, pts, mul(col, .9), h * .09, o.pines, o.seed);
      if (i < n - 1) hazeBand(ctx, x0, w, base + h * .02, h * .05, L, 1 - d * .4);
      out.push({ pts, base, amp, col });
    }
    return out;
  }
  let grainPat = null;
  function grain(ctx) {                              // 1–2% grain on painted pixels only
    if (!grainPat) {
      const t = document.createElement("canvas"); t.width = t.height = 128; const g = t.getContext("2d"), im = g.createImageData(128, 128);
      for (let i = 0; i < im.data.length; i += 4) { const v = Math.random() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
      g.putImageData(im, 0, 0); grainPat = ctx.createPattern(t, "repeat");
    }
    ctx.save(); ctx.globalCompositeOperation = "source-atop"; ctx.globalAlpha = .045; ctx.fillStyle = grainPat; ctx.fillRect(0, 0, W, H); ctx.restore();
  }
  function scrim(ctx, e) {                          // keeps the header legible on bright skies
    const g = ctx.createLinearGradient(0, 0, 0, H * .28);
    g.addColorStop(0, `rgba(0,0,0,${.1 + e.lum * .22})`); g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H * .28);
  }
  const inDataCorner = (x, y) => y > H * .78 && (x < W * .25 || x > W * .75);
  const kit = { clamp, mix, mul, hex, css, lum, desat, fbm, rng, bell, look, ridgePts, fillRidge, rimStroke, hazeBand, pines, range, grain, scrim, inDataCorner };

  /* ---------------- engine ---------------- */
  function resize() {
    R = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight;
    [cv, fx].forEach(c => { c.width = W * R; c.height = H * R; });
    cx.setTransform(R, 0, 0, R, 0, 0); fc.setTransform(R, 0, 0, R, 0, 0); grainPat = null; sig = ""; fxState = null; redraw();
  }
  function redraw() {
    cx.clearRect(0, 0, W, H); const s = reg[cur]; if (!s || !env || !W || !H) return;
    try { s.draw(cx, W, H, env, kit); grain(cx); } catch (err) { console.error("scene", err.stack); }
    lastDraw = Date.now();
  }
  function update(e, name) {
    env = e;
    if (name !== cur) { cur = name; sig = ""; fxState = null; fc.clearRect(0, 0, W, H); }
    const k = [e.lum, e.alt, e.cloud, e.rain, e.snow, e.fog, e.dark].map(v => (+v).toFixed(2)).join() + W + "x" + H;
    if (k !== sig || Date.now() - lastDraw > 60e3) { sig = k; redraw(); }
    return reg[cur] || null;
  }
  function fxLoop(t) {
    requestAnimationFrame(fxLoop);
    const s = reg[cur]; if (!s || !env || document.hidden || t - lastFx < 1000 / 24) return;
    const dt = Math.min(.1, (t - lastFx) / 1000); lastFx = t;
    fc.clearRect(0, 0, W, H);
    try {
    if (s.fx) fxState = s.fx(fc, W, H, env, kit, dt, fxState);
    if (s.outdoor) precipState = precip(fc, env, dt, precipState);
    const fl = (typeof Sky !== "undefined" && Sky.flash) || 0;
    if (fl > .02) { fc.fillStyle = `rgba(215,225,255,${fl * .45})`; fc.fillRect(0, 0, W, H); }
    } catch (err) { console.error('fx', err.stack); }
  }
  /* rain streaks / snowflakes drawn in front of outdoor scenery */
  let precipState = null;
  function precip(ctx, e, dt, st) {
    const n = Math.round(e.rain * 140 + e.snow * 90); if (!n) return null;
    if (!st || st.length !== n) st = Array.from({ length: n }, () => ({ x: Math.random() * W, y: Math.random() * H, z: .4 + Math.random() * .6 }));
    const L = look(e), wx = e.wind[0] * 40, snow = e.snow > e.rain;
    ctx.strokeStyle = css(mix(L.haze, [1, 1, 1], .5), .22 + .1 * L.amb); ctx.fillStyle = css([.96, .97, 1], .75);
    ctx.lineWidth = 1; ctx.beginPath();
    for (const p of st) {
      if (snow) { p.y += 30 * p.z * dt; p.x += (wx * .3 + Math.sin(p.y * .03 + p.z * 9) * 10) * dt; }
      else { p.y += 620 * p.z * dt; p.x += wx * p.z * dt; }
      if (p.y > H) { p.y = -20; p.x = Math.random() * W; } if (p.x > W) p.x -= W; if (p.x < 0) p.x += W;
      if (snow) { ctx.moveTo(p.x + 1.6 * p.z, p.y); ctx.arc(p.x, p.y, 1.6 * p.z, 0, 7); }
      else { const len = 14 * p.z; ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - wx * .02 * len, p.y - len); }
    }
    snow ? ctx.fill() : ctx.stroke();
    return st;
  }

  addEventListener("resize", resize);
  requestAnimationFrame(() => { resize(); requestAnimationFrame(fxLoop); });
  return { register: (n, s) => reg[n] = s, update, names: () => Object.keys(reg) };
})();

/* ======================= MOUNTAINS ======================= */
Scene.register("mountains", {
  outdoor: true,
  draw(ctx, W, H, e, k) {
    const L = k.look(e), port = H > W;
    k.scrim(ctx, e);
    const bases = port ? [.55, .63, .71, .80, .92] : [.52, .60, .68, .78, .90];
    const amps = [.18, .14, .11, .08, .06].map(a => a * (port ? .8 : 1));
    const lakeTop = H * (port ? .82 : .80), lakeBot = H * (port ? .92 : .90);
    k.range(ctx, [0, 0, W, H], e, L, {
      seed: 5, bases, amps, peak: .67, pines: [[.30, .42], [.50, .56], [.62, .70]],
      beforeLayer: (i, _b, built) => {
        if (i !== 4) return;                                  // lake between layer 4 and the foreground
        const wc = k.mix(L.haze, L.ink, .5), g = ctx.createLinearGradient(0, lakeTop, 0, lakeBot);
        g.addColorStop(0, k.css(k.mul(wc, 1.08))); g.addColorStop(1, k.css(k.mul(wc, .8)));
        ctx.fillStyle = g; ctx.fillRect(0, lakeTop, W, lakeBot - lakeTop);
        ctx.save(); ctx.beginPath(); ctx.rect(0, lakeTop, W, lakeBot - lakeTop); ctx.clip();
        ctx.translate(0, lakeTop * 2); ctx.scale(1, -1);       // soft mirrored ranges
        built.slice(2, 4).forEach(l => k.fillRidge(ctx, l.pts, lakeTop - (lakeBot - lakeTop), l.col, { alpha: .4 }));
        ctx.restore();
        const r = k.rng(77); ctx.fillStyle = k.css(k.mix(L.haze, [1, 1, 1], .2), .18 + .12 * L.amb);
        for (let j = 0; j < 26; j++) ctx.fillRect(W * (.2 + r() * .7), lakeTop + r() * (lakeBot - lakeTop), 6 + r() * 40, 1);
      },
    });
  },
});

/* ======================= DESK BY THE WINDOW ======================= */
Scene.register("desk", {
  draw(ctx, W, H, e, k) {
    const L = k.look(e), port = H > W, u = Math.min(W, H) * .05;
    const [wx, wy, ww, wh] = port ? [W * .15, H * .08, W * .70, H * .37] : [W * .52, H * .10, W * .38, H * .52];
    const deskY = H * (port ? .75 : .70), lamp = e.alt < 1 ? 1 : e.dark > .6 ? .5 : 0;
    const warm = k.hex("#ffcf8a"), daylight = L.amb;

    // view outside
    ctx.save(); ctx.beginPath(); ctx.rect(wx, wy, ww, wh); ctx.clip();
    k.range(ctx, [wx, wy, ww, wh], e, L, { seed: 13, bases: [.62, .76, .92], amps: [.30, .2, .12], peak: .6, pines: [[.1, .45], [.6, .9]] });
    if (e.rain > 0) {                                      // beads + a few streaks on the glass
      const r = k.rng(31), bead = k.mix(L.haze, [1, 1, 1], .25);
      for (let i = 0; i < 30 + 30 * e.rain; i++) {
        const x = wx + r() * ww, y = wy + r() * wh, s = 2 + r() * 2;
        ctx.fillStyle = k.css(bead, .28); ctx.beginPath(); ctx.ellipse(x, y, s * .8, s, 0, 0, 7); ctx.fill();
        ctx.fillStyle = k.css([1, 1, 1], .4 + .2 * L.amb); ctx.beginPath(); ctx.arc(x - s * .3, y - s * .4, s * .25, 0, 7); ctx.fill();
        if (i % 9 === 0) { ctx.fillStyle = k.css(bead, .14); ctx.fillRect(x - .7, y + s, 1.4, wh * (.05 + r() * .15)); }
      }
    }
    ctx.restore();

    // wall (window cut out), lit by daylight and the lamp
    const wallC = k.mul(k.mix(e.hor, k.hex("#2a2730"), .8), .35 + .65 * daylight);
    const hole = () => { ctx.beginPath(); ctx.rect(0, 0, W, deskY); ctx.rect(wx, wy, ww, wh); };
    hole(); const wg = ctx.createLinearGradient(0, 0, 0, deskY);
    wg.addColorStop(0, k.css(k.mul(wallC, .85))); wg.addColorStop(1, k.css(k.mul(wallC, 1.05)));
    ctx.fillStyle = wg; ctx.fill("evenodd");
    // window light thrown onto the wall (skewed quad)
    const sk = (e.sun[0] - .5) * ww * .8;
    ctx.fillStyle = k.css(k.mix(e.hor, [1, 1, 1], .4), .08 * daylight * (1 - L.over * .6));
    ctx.beginPath(); ctx.moveTo(wx, wy + wh); ctx.lineTo(wx + ww, wy + wh); ctx.lineTo(wx + ww - sk - ww * .2, deskY); ctx.lineTo(wx - sk - ww * .2, deskY); ctx.fill();

    // frame + mullion cross + sill
    const fr = k.mul(wallC, .55);
    ctx.strokeStyle = k.css(fr); ctx.lineWidth = 8; ctx.strokeRect(wx - 4, wy - 4, ww + 8, wh + 8);
    ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(wx + ww / 2, wy); ctx.lineTo(wx + ww / 2, wy + wh); ctx.moveTo(wx, wy + wh * .45); ctx.lineTo(wx + ww, wy + wh * .45); ctx.stroke();
    ctx.fillStyle = k.css(k.mul(wallC, 1.3)); ctx.fillRect(wx - 14, wy + wh + 4, ww + 28, 5);
    ctx.fillStyle = k.css(k.mul(wallC, .45)); ctx.fillRect(wx - 14, wy + wh + 9, ww + 28, 3);

    // desk: lit top edge, dark front (calm zone for data)
    const wood = k.mul(k.mix(k.hex("#3a2a22"), e.hor, .12), .3 + .6 * daylight);
    ctx.fillStyle = k.css(k.mix(k.mul(wood, 1.35), warm, lamp * .25)); ctx.fillRect(0, deskY, W, u * .35);
    const dg = ctx.createLinearGradient(0, deskY + u * .35, 0, H);
    dg.addColorStop(0, k.css(k.mul(wood, .55))); dg.addColorStop(1, k.css(k.mul(wood, .25)));
    ctx.fillStyle = dg; ctx.fillRect(0, deskY + u * .35, W, H);
    const top = deskY + u * .12, objLit = c => k.mul(k.mix(c, e.hor, .1), .28 + .6 * daylight);

    // books (varied heights, muted spines)
    const bx = port ? W * .12 : W * .47;
    [["#5b4a42", 2.6, .5], ["#3f4a52", 2.3, .42], ["#6a5c48", 2.8, .34], ["#4a4038", 2.0, .46]].forEach(([c, len, th], i) => {
      const y = top - [.5, .92, 1.26, 1.72][i] * u, x = bx + [0, .15, .05, .3][i] * u;
      ctx.fillStyle = k.css(objLit(k.hex(c))); ctx.fillRect(x, y, len * u, th * u - 1);
      ctx.fillStyle = k.css(k.mix(objLit(k.hex(c)), warm, .35 * lamp + .08), .9); ctx.fillRect(x, y, len * u, 1.2);   // lit top face
    });
    // plant: pot + 6 leaves
    const px = port ? W * .45 : W * .645, pw = u * 1.05;
    ctx.fillStyle = k.css(objLit(k.hex("#8a5a44")));
    ctx.beginPath(); ctx.moveTo(px - pw / 2, top - pw); ctx.lineTo(px + pw / 2, top - pw); ctx.lineTo(px + pw * .38, top); ctx.lineTo(px - pw * .38, top); ctx.fill();
    const lr = k.rng(5), leaf = objLit(k.hex("#3d5a40"));
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + (i - 2.5) * .42 + (lr() - .5) * .2, len = pw * (1.1 + lr() * .8);
      ctx.save(); ctx.translate(px, top - pw); ctx.rotate(a);
      ctx.fillStyle = k.css(k.mul(leaf, .85 + lr() * .3)); ctx.beginPath(); ctx.ellipse(len / 2, 0, len / 2, pw * .17, 0, 0, 7); ctx.fill(); ctx.restore();
    }
    // mug
    const mx = port ? W * .62 : W * .73;
    ctx.fillStyle = k.css(objLit(k.hex("#c9c2b6"))); ctx.fillRect(mx, top - u * .85, u * .62, u * .85);
    ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = u * .1; ctx.beginPath(); ctx.arc(mx + u * .66, top - u * .45, u * .2, -1.3, 1.3); ctx.stroke();
    // lamp: base, two-stroke arm, cone shade
    const lx = port ? W * .84 : W * .9, jx = lx - u * .5, jy = top - u * 2.6, hx = lx - u * 2.3, hy = top - u * 3.4;
    const metal = k.mul(objLit(k.hex("#2b2a2e")), 1.1);
    ctx.strokeStyle = k.css(metal); ctx.lineWidth = u * .12; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(lx, top - u * .15); ctx.lineTo(jx, jy); ctx.lineTo(hx + u * .5, hy); ctx.stroke();
    ctx.fillStyle = k.css(metal); ctx.beginPath(); ctx.ellipse(lx, top - u * .08, u * .75, u * .16, 0, 0, 7); ctx.fill();
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(.5);
    ctx.beginPath(); ctx.moveTo(-u * .25, -u * .3); ctx.lineTo(u * .25, -u * .3); ctx.lineTo(u * .75, u * .55); ctx.lineTo(-u * .75, u * .55); ctx.closePath(); ctx.fill();
    if (lamp) { ctx.fillStyle = k.css([1, .93, .78], .95 * lamp); ctx.beginPath(); ctx.ellipse(0, u * .55, u * .7, u * .12, 0, 0, 7); ctx.fill(); }
    ctx.restore();
    if (lamp) {                                          // warm additive pool of light
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      const cxl = hx + u * .3, cyl = hy + u;
      const g = ctx.createRadialGradient(cxl, cyl, 2, cxl, top, W * .4);
      g.addColorStop(0, k.css(warm, .35 * lamp)); g.addColorStop(.4, k.css(warm, .1 * lamp)); g.addColorStop(1, k.css(warm, 0));
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      const g2 = ctx.createRadialGradient(cxl, top, 2, cxl, top, W * .22);   // brighter on the desk surface
      g2.addColorStop(0, k.css(warm, .22 * lamp)); g2.addColorStop(1, k.css(warm, 0));
      ctx.fillStyle = g2; ctx.fillRect(0, deskY, W, u * .6); ctx.restore();
    }
    this._mug = [mx + u * .31, top - u * .9, u];
  },
  fx(ctx, W, H, e, k, dt, st) {                     // two-segment steam, very faint
    st = st || { t: 0 }; st.t += dt; if (!this._mug) return st;
    const [x, y, u] = this._mug, a = .12 + .1 * (1 - k.look(e).amb);
    ctx.strokeStyle = `rgba(255,255,255,${a})`; ctx.lineWidth = 1.2; ctx.lineCap = "round";
    for (let i = 0; i < 2; i++) {
      const o = i * u * .25 - u * .12, s = Math.sin(st.t * .9 + i * 2) * u * .18;
      ctx.beginPath(); ctx.moveTo(x + o, y); ctx.quadraticCurveTo(x + o + s, y - u * .45, x + o - s * .6, y - u * .9);
      ctx.quadraticCurveTo(x + o - s, y - u * 1.3, x + o + s * .4, y - u * 1.6); ctx.stroke();
    }
    return st;
  },
});

/* ======================= CHERRY BLOSSOM ======================= */
Scene.register("sakura", {
  outdoor: true,
  draw(ctx, W, H, e, k) {
    const L = k.look(e), port = H > W, m = Math.min(W, H);
    k.scrim(ctx, e);
    // two very soft hills + ground
    [[.72, .07, 3], [.82, .05, 7]].forEach(([b, a, s], i) => {
      const pts = k.ridgePts(0, W, H * b, H * a, s, { freq: 1.1, oct: 2 });
      k.fillRidge(ctx, pts, H, L.layer(.35 + i * .35), { alpha: k.clamp(1 - e.fog * (.8 - i * .4), .2, 1) });
      k.hazeBand(ctx, 0, W, H * b + H * .03, H * .04, L, .8);
    });
    ctx.fillStyle = k.css(L.layer(1)); ctx.fillRect(0, H * .93, W, H * .07);

    // tree: trunk from the bottom-right, limbs reaching left across the top
    const r = k.rng(42), bark = k.mul(k.mix(L.ink, k.hex("#2a1a1a"), .5), .8), clusters = [];
    const snowy = e.snow > 0, bud = (x, y, s) => clusters.push([x, y, s]);
    function limb(x, y, a, len, wd, depth) {
      const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
      const qx = (x + x2) / 2 + Math.cos(a - 1.57) * len * (r() - .5) * .25, qy = (y + y2) / 2 + Math.sin(a - 1.57) * len * (r() - .5) * .25 + len * .06;
      ctx.strokeStyle = k.css(bark); ctx.lineWidth = wd; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(qx, qy, x2, y2); ctx.stroke();
      if (snowy) { ctx.strokeStyle = k.css(k.hex("#eef2f6"), .7); ctx.lineWidth = Math.max(1, wd * .25); ctx.beginPath(); ctx.moveTo(x, y - wd * .45); ctx.quadraticCurveTo(qx, qy - wd * .45, x2, y2 - wd * .45); ctx.stroke(); }
      if (depth === 0) { bud(x2, y2, 1); return; }
      if (depth <= 2) bud((x + x2) / 2, (y + y2) / 2, .7);
      const n = depth > 2 ? 2 : 2 + (r() > .5);
      for (let i = 0; i < n; i++) {
        const spread = (i - (n - 1) / 2) * (.45 + r() * .3);
        limb(x2, y2, a + spread - .1 /* droop */ + (r() - .5) * .25, len * (.66 + r() * .14), wd * .64, depth - 1);
      }
    }
    const tx = W * (port ? .96 : .93), ty = H * 1.02, s = port ? 1.05 : 1;
    // trunk
    ctx.strokeStyle = k.css(bark); ctx.lineWidth = m * .065; ctx.lineCap = "round";
    const kx = W * (port ? .86 : .87), ky = H * (port ? .5 : .42);
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.quadraticCurveTo(tx - m * .02, (ty + ky) / 2, kx, ky); ctx.stroke();
    limb(kx, ky, Math.PI + .62, m * .34 * s, m * .045, 4);      // main limb up-left
    limb(kx, ky, Math.PI + .25, m * .30 * s, m * .035, 3);      // lower limb left
    limb(kx, ky, Math.PI + 1.25, m * .22 * s, m * .03, 3);      // up
    // blossoms: underside, mid, top tones, then hero flowers
    const tone = h => k.mul(k.mix(k.mix(k.hex(h), k.hex("#c9a3c8"), k.clamp(L.night + (e.alt < 0 ? .5 : 0)) * .6), e.sunCol, L.gold * .15), .22 + .82 * L.amb);
    const tones = [[tone("#eaa3b8"), 2], [tone("#f6c9d4"), 0], [tone("#fbe3ea"), -2]];
    const br = k.rng(8);
    tones.forEach(([c, dy], ti) => clusters.forEach(([x, y, sc]) => {
      const n = Math.round((8 + br() * 12) * sc / 3);
      for (let i = 0; i < n; i++) {
        const rr = m * (.009 + br() * .016) * (1 - ti * .15);
        ctx.fillStyle = k.css(c, .8 + br() * .2);
        ctx.beginPath(); ctx.arc(x + (br() - .5) * m * .085 * sc, y + (br() - .5) * m * .055 * sc + dy * (1 + ti), rr, 0, 7); ctx.fill();
      }
    }));
    const hero = tone("#fbe3ea"), heart = k.mul(tone("#eaa3b8"), .8);
    clusters.forEach(([x, y, sc], ci) => {
      if (sc < 1 || ci % 2) return;
      for (let f = 0; f < 2; f++) {
        const fx = x + (br() - .5) * m * .07, fy = y + (br() - .5) * m * .04, pr = m * .009, rot = br() * 6;
        ctx.fillStyle = k.css(hero);
        for (let p = 0; p < 5; p++) { const a = rot + p * 1.2566; ctx.beginPath(); ctx.ellipse(fx + Math.cos(a) * pr, fy + Math.sin(a) * pr, pr, pr * .62, a, 0, 7); ctx.fill(); }
        ctx.fillStyle = k.css(heart); ctx.beginPath(); ctx.arc(fx, fy, pr * .35, 0, 7); ctx.fill();
      }
    });
  },
  fx(ctx, W, H, e, k, dt, st) {                    // ≤12 petals, slow sine drift, fade in data corners
    if (!st) { const r = k.rng(3); st = Array.from({ length: 12 }, () => ({ x: r() * W, y: r() * H, s: 2 + r() * 2.2, a: r() * 6, v: .5 + r() })); }
    const L = k.look(e), c = k.mul(k.hex("#f6c9d4"), .25 + .8 * L.amb), wind = e.wind[0] * 10;
    for (const p of st) {
      p.y += (10 + 9 * p.v) * dt; p.x += (wind - 8 + Math.sin(p.a * .7) * 14) * dt; p.a += dt * (.8 + p.v);
      if (p.y > H + 5) { p.y = -5; p.x = W * (.2 + Math.random()); } if (p.x < -10) p.x = W + 5; if (p.x > W + 10) p.x = -5;
      if (k.inDataCorner(p.x, p.y)) continue;
      ctx.fillStyle = k.css(c, .8); ctx.beginPath(); ctx.ellipse(p.x, p.y, p.s, p.s * .5 * Math.abs(Math.sin(p.a)) + .5, p.a, 0, 7); ctx.fill();
    }
    return st;
  },
});
