const $ = id => document.getElementById(id);
const pad = n => String(n).padStart(2, "0");
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const Q = new URLSearchParams(location.search);           // preview: ?code=63&hour=18.5&cc=80
let state = null, wx = null, wxAt = 0;

const now = () => {
  const d = new Date();
  if (Q.has("hour")) { const h = +Q.get("hour"); d.setHours(Math.floor(h), Math.round(h % 1 * 60)); }
  return d;
};

/* ---------- sky colour by sun altitude (degrees) ---------- */
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
const P = (alt, zen, mid, hor, sun) => ({ alt, zen: hex(zen), mid: hex(mid), hor: hex(hor), sun });
const MORNING = [
  P(-90, "#03050c", "#070b18", "#0e1529", [0, 0, 0]),
  P(-14, "#04060e", "#0a1022", "#151d38", [0, 0, 0]),
  P(-8,  "#0b1330", "#1f2b55", "#4b4d78", [.12, .08, .16]),
  P(-3,  "#1c2a4c", "#5e6590", "#e3a185", [.9, .45, .3]),
  P(3,   "#3a5a88", "#a7aec2", "#f4c48f", [1, .6, .32]),
  P(12,  "#3070b4", "#7fb0dc", "#d9e7f0", [1, .9, .74]),
  P(35,  "#2463a9", "#6aa2d8", "#cfe3f2", [1, .96, .88]),
  P(90,  "#2463a9", "#6aa2d8", "#cfe3f2", [1, .96, .88]),
];
const EVENING = MORNING.map(k => k.alt === -3 ? P(-3, "#141b3a", "#5a3f6b", "#d4735a", [.95, .4, .25])
  : k.alt === 3 ? P(3, "#33507e", "#c99a72", "#f6c486", [1, .55, .28]) : k);
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const lum = c => .2126 * c[0] + .7152 * c[1] + .0722 * c[2];
function palette(alt, evening) {
  const K = evening ? EVENING : MORNING;
  let i = 0; while (i < K.length - 2 && alt > K[i + 1].alt) i++;
  const a = K[i], b = K[i + 1], t = Math.min(1, Math.max(0, (alt - a.alt) / (b.alt - a.alt)));
  const s = t * t * (3 - 2 * t);
  return { zen: mix(a.zen, b.zen, s), mid: mix(a.mid, b.mid, s), hor: mix(a.hor, b.hor, s), sun: mix(a.sun, b.sun, s) };
}

/* ---------- WMO weather code -> sky parameters ---------- */
const NAMES = { 0: "Clear", 1: "Mostly clear", 2: "Partly cloudy", 3: "Overcast", 45: "Fog", 48: "Rime fog",
  51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle", 56: "Freezing drizzle", 57: "Freezing drizzle",
  61: "Light rain", 63: "Rain", 65: "Heavy rain", 66: "Freezing rain", 67: "Freezing rain",
  71: "Light snow", 73: "Snow", 75: "Heavy snow", 77: "Snow grains", 80: "Showers", 81: "Showers", 82: "Violent showers",
  85: "Snow showers", 86: "Snow showers", 95: "Thunderstorm", 96: "Thunder · hail", 99: "Thunder · hail" };
const RAIN = { 51: .3, 53: .42, 55: .55, 56: .4, 57: .5, 61: .5, 63: .75, 65: 1, 66: .6, 67: .9, 80: .55, 81: .8, 82: 1, 95: .9, 96: 1, 99: 1 };
const SNOW = { 71: .4, 73: .7, 75: 1, 77: .3, 85: .6, 86: 1 };
function weatherParams(code, cover, windKmh, windDir) {
  const rain = RAIN[code] || 0, snow = SNOW[code] || 0, fog = code === 45 || code === 48 ? .78 : 0;
  let cloud = cover;
  if (code === 2) cloud = Math.max(cloud, .45);
  if (code === 3 || rain || snow) cloud = Math.max(cloud, .93);
  if (code <= 1) cloud = Math.min(cloud, .25);
  const dark = rain || snow ? .85 : code === 3 ? .65 : cloud * .3;
  const r = windDir * Math.PI / 180, k = .4 + windKmh / 10;
  return { rain, snow, fog, cloud, dark, thunder: code >= 95, wind: [-Math.sin(r) * k, .08] };
}
const compass = d => ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(d / 45) % 8];

/* ---------- drive the sky ---------- */
function updateSky() {
  const s = state?.settings || {}, lat = s.lat ?? 28.61, lon = s.lon ?? 77.21, d = now();
  const sun = SunCalc.getPosition(d, lat, lon), moon = SunCalc.getMoonPosition(d, lat, lon);
  const ill = SunCalc.getMoonIllumination(d), alt = sun.altitude * 180 / Math.PI;
  const evening = d.getHours() >= 12;
  const pal = palette(alt, evening);

  const code = Q.has("code") ? +Q.get("code") : wx?.current.weather_code ?? 1;
  const cover = Q.has("cc") ? +Q.get("cc") / 100 : (wx?.current.cloud_cover ?? 10) / 100;
  const w = weatherParams(code, cover, wx?.current.wind_speed_10m ?? 8, wx?.current.wind_direction_10m ?? 270);

  // overcast/wet skies lose saturation and pull toward a cool grey of the same brightness
  const g = Math.min(.8, w.dark * .75 + w.fog * .4);
  const grey = c => { const L = lum(c); return mix(c, [L * .96, L * 1.0, L * 1.06], g); };
  const dim = 1 - w.dark * .28;
  ["zen", "mid", "hor"].forEach(k => Sky[k] = grey(pal[k]).map(v => v * dim));
  Sky.sunCol = pal.sun;

  const X = az => Math.min(.9, Math.max(.1, .5 + az / Math.PI * .62));
  const Y = a => .06 + Math.max(-.2, a) / (Math.PI / 2) * .9;
  Sky.sun = [X(sun.azimuth), Y(sun.altitude), Math.min(1, Math.max(0, (alt + 1.5) / 3))];
  const ma = moon.altitude * 180 / Math.PI;
  Sky.moon = [X(moon.azimuth), Y(moon.altitude), ill.phase, Math.max(0, Math.min(1, ma / 3)) * (alt > 0 ? .35 : 1)];
  Sky.stars = Math.min(1, Math.max(0, (-alt - 6) / 8));
  Sky.lum = lum(Sky.mid);
  Object.assign(Sky, { cloud: w.cloud, dark: w.dark, rain: w.rain, snow: w.snow, fog: w.fog, thunder: w.thunder, wind: w.wind });

  const sc = Scene.update({ ...Sky, sun: Sky.sun.slice(), alt }, Q.get("scene") || s.scene || "desk");
  const inkL = lum(mix(Sky.mid, Sky.hor, .6));
  document.body.classList.toggle("light", !sc && inkL > .52);
  document.body.classList.toggle("scene", !!sc);
  const ns = s.nightStart ?? 0, ne = s.nightEnd ?? 6, h = d.getHours();
  document.body.classList.toggle("standby", ns <= ne ? h >= ns && h < ne : h >= ns || h < ne);
  return { code, sunTimes: SunCalc.getTimes(d, lat, lon), alt };
}

/* ---------- weather ---------- */
async function loadWeather() {
  const s = state?.settings; if (!s) return;
  wxAt = Date.now();
  try {
    const u = `https://api.open-meteo.com/v1/forecast?latitude=${s.lat}&longitude=${s.lon}&timezone=auto&forecast_days=2` +
      `&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,precipitation` +
      `&hourly=temperature_2m,precipitation_probability&daily=temperature_2m_max,temperature_2m_min`;
    const w = await (await fetch(u)).json();
    try { w.aqi = (await (await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${s.lat}&longitude=${s.lon}&current=us_aqi`)).json()).current.us_aqi; } catch {}
    wx = w;
  } catch { wxAt = Date.now() - 25 * 60e3; }   // retry in 5 min
}

/* ---------- typography ---------- */
const fmtT = d => d instanceof Date && !isNaN(d) ? `${pad(d.getHours())}:${pad(d.getMinutes())}` : "--:--";
const aqiWord = a => a <= 50 ? "Good" : a <= 100 ? "Moderate" : a <= 150 ? "Poor" : a <= 200 ? "Unhealthy" : "Very unhealthy";
let tickIdx = 0, tickAt = 0, tickKey = "";

function render() {
  const d = now(), sky = updateSky(), s = state?.settings || {}, c = wx?.current, t = sky.sunTimes;
  $("hh").textContent = pad(d.getHours()); $("mm").textContent = pad(d.getMinutes());
  $("date").textContent = d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  $("place").textContent = s.place || "New Delhi";
  const sunTxt = d < t.sunrise ? `Sunrise ${fmtT(t.sunrise)}` : d < t.sunset ? `Sunset ${fmtT(t.sunset)}`
    : `Sunrise ${fmtT(SunCalc.getTimes(new Date(+d + 864e5), s.lat ?? 28.61, s.lon ?? 77.21).sunrise)}`;
  $("status").textContent = sunTxt;

  $("temp").textContent = c ? `${Math.round(c.temperature_2m)}°` : "";
  $("condBig").textContent = NAMES[sky.code] || "";
  $("hilo").textContent = c ? `H ${Math.round(wx.daily.temperature_2m_max[0])}°  L ${Math.round(wx.daily.temperature_2m_min[0])}°` : "";

  slot(d);
  ticker(d, sunTxt);
  const k = d.getHours(); $("ui").style.transform = `translate(${(k * 7) % 4 - 1.5}px,${(k * 5) % 4 - 1.5}px)`;  // burn-in drift
}

/* One "now" slot: the single thing worth acting on, then the nearest deadline. */
function slot(d) {
  if (!state) { $("slot").innerHTML = ""; return; }
  const out = [], tm = state.timer, open = state.tasks.filter(t => !t.done);
  if (tm?.running && tm.endsAt > Date.now()) {
    const L = Math.round((tm.endsAt - Date.now()) / 1000);
    out.push(`<div class="item"><div class="k">${esc(tm.label || "Focus")}</div><div class="v big hot">${pad(Math.floor(L / 60))}:${pad(L % 60)}</div></div>`);
  } else if (open.length) {
    out.push(`<div class="item"><div class="k">Next · ${open.length} left</div><div class="v">${esc(open[0].text)}</div></div>`);
  }
  const cd = (state.settings.countdowns || []).map(c => ({ ...c, ms: new Date(c.date) - d })).filter(c => c.ms > 0).sort((a, b) => a.ms - b.ms)[0];
  if (cd) out.push(`<div class="item"><div class="k">${esc(cd.label)}</div><div class="v">${Math.floor(cd.ms / 864e5)}<small>days</small> ${Math.floor(cd.ms % 864e5 / 36e5)}<small>hrs</small></div></div>`);
  $("slot").innerHTML = out.join(""); $("slot").style.display = out.length ? "" : "none";
}

/* Everything secondary rotates through one readable line instead of crowding the screen. */
function ticker(d, sunTxt) {
  const c = wx?.current, items = [], sep = `<span class="sepd">·</span>`;
  if (c) items.push(`<span class="k">Outside</span>Feels <b>${Math.round(c.apparent_temperature)}°</b>${sep}Wind <b>${Math.round(c.wind_speed_10m)} km/h ${compass(c.wind_direction_10m)}</b>${sep}Humidity <b>${c.relative_humidity_2m}%</b>` +
    (wx.aqi != null ? `${sep}AQI <b class="${wx.aqi > 150 ? "hot" : ""}">${wx.aqi} ${aqiWord(wx.aqi)}</b>` : ""));
  if (wx?.hourly) {
    const H = wx.hourly, iso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:00`;
    const i0 = Math.max(0, H.time.indexOf(iso)), v = H.temperature_2m.slice(i0, i0 + 13), pp = H.precipitation_probability.slice(i0, i0 + 13);
    const pm = Math.max(...pp), at = (d.getHours() + pp.indexOf(pm)) % 24;
    items.push(`<span class="k">Next 12 h</span>${pm >= 40 ? `<b class="hot">Rain likely around ${pad(at)}:00 (${pm}%)</b>` : "No rain expected"}${sep}<b>${Math.round(Math.min(...v))}° – ${Math.round(Math.max(...v))}°</b>${sep}${sunTxt}`);
  }
  if (state?.tasks?.length) {
    const open = state.tasks.filter(t => !t.done).length, done = state.tasks.length - open;
    items.push(`<span class="k">Today</span><b>${done} of ${state.tasks.length}</b> tasks done${open ? `${sep}${open} to go` : `${sep}all clear`}`);
  }
  if (state?.pc) { const p = state.pc; items.push(`<span class="k">${esc(p.host || "PC")}</span>CPU <b>${Math.round(p.cpu)}%</b>${sep}RAM <b>${Math.round(p.ram)}%</b>${p.cpu_temp != null ? `${sep}<b>${Math.round(p.cpu_temp)}°C</b>` : ""}`); }
  const b = state?.battery;
  if (b) items.push(`<span class="k">Dock</span>Battery <b>${b.capacity ?? "?"}%</b>${sep}<b class="${b.temp_c >= 40 ? "hot" : ""}">${b.temp_c ?? "?"} °C</b>${sep}${b.guard?.charging_allowed === false ? "Charging paused (guard)" : esc(b.status || "")}`);
  if (!items.length) return;
  for (let n = 0; n < items.length; n++) items[n] = items[n].split(sep).map(x => `<span class="seg">${x}</span>`).join(sep);
  if (Q.has("tick")) tickIdx = +Q.get("tick"); else if (Date.now() - tickAt > 7000) { tickAt = Date.now(); tickIdx = (tickIdx + 1) % items.length; }
  const i = tickIdx % items.length, key = i + items[i];
  if (key !== tickKey) {
    const el = $("ticker"); tickKey = key; el.style.opacity = 0;
    setTimeout(() => { el.innerHTML = items[i]; el.style.opacity = 1; }, tickKey && el.innerHTML ? 300 : 0);
  }
  $("dots").innerHTML = items.map((_, k) => `<i class="${k === i ? "on" : ""}"></i>`).join("");
}

async function refresh() {
  try { state = await (await fetch("/api/state")).json(); } catch {}
  if (state && Date.now() - wxAt > 30 * 60e3) await loadWeather();
  render();
}
window.refresh = refresh;
document.fonts?.ready.then(render);
setInterval(render, 1000);
setInterval(refresh, 5000);
refresh();
