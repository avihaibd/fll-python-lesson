/*@@MISSIONS@@*/
const SIMCORE = String.raw`@@SIMCORE@@`;
const FILES = {
  "src/lib/pybricks/__init__.py": SIMCORE,
  "src/lib/pybricks/hubs.py": "from pybricks import PrimeHub\n",
  "src/lib/pybricks/pupdevices.py": "from pybricks import Motor, ColorSensor, ForceSensor\n",
  "src/lib/pybricks/parameters.py": "from pybricks import Port, Color, Direction\n",
  "src/lib/pybricks/robotics.py": "from pybricks import DriveBase\n",
  "src/lib/pybricks/tools.py": "from pybricks import wait, multitask, run_task\n",
};
const $ = (id) => document.getElementById(id);
const store = { get(k){ try { return localStorage.getItem(k); } catch(e){ return null; } }, set(k,v){ try { localStorage.setItem(k,v); } catch(e){} } };

/* ---- tabs ---- */
const PRACTICE = /[?&](practice=(true|1)|s=q7x2)(&|#|$)/.test(location.search);
const PAGES = { plan: "plan", slides: "slides-tab", videos: "videos-tab", terms: "terms-tab", sim: "sim", planner: "planner-tab", code: "code-tab", ideas: "ideas-tab" };
if (PRACTICE) {
  delete PAGES.plan;
  ["plan", "t-plan"].forEach(id => { const e = document.getElementById(id); if (e) e.remove(); });
  const sol = document.getElementById("mSol"); if (sol) sol.closest("details").remove();
  const chip = document.createElement("span"); chip.textContent = "מצב תרגול"; chip.style.cssText = "margin-inline-start:auto;align-self:center;font-size:13px;font-weight:700;color:var(--accent);white-space:nowrap";
  document.querySelector("nav.tabs .wrap").appendChild(chip);
} else {
  const wrap = document.querySelector("nav.tabs .wrap"), mk = (t, f, first) => { const b = document.createElement("button"); b.textContent = t; b.onclick = f; b.style.cssText = "font-size:13px;border:1px solid var(--line);border-radius:8px;padding:6px 10px;margin-block:6px;background:var(--surface);color:var(--fg);white-space:nowrap;cursor:pointer" + (first ? ";margin-inline-start:auto" : ""); wrap.appendChild(b); return b; };
  const base = () => location.origin + location.pathname + "?s=q7x2";
  mk("פתח מצב תרגול", () => { location.href = base() + "#sim"; }, true);
  const cp = mk("העתק קישור תרגול", () => { const u = base(); try { navigator.clipboard.writeText(u); } catch (e) { prompt("הקישור:", u); } cp.textContent = "הועתק"; setTimeout(() => { cp.textContent = "העתק קישור תרגול"; }, 1500); });
}
function showTab(name){
  if(!PAGES[name]) name = PRACTICE ? "sim" : "plan";
  for (const [k, id] of Object.entries(PAGES)) { $(id).classList.toggle("hidden", k !== name); $("t-" + k).setAttribute("aria-selected", String(k === name)); }
  if (name === "sim") drawIdle();
}
document.querySelectorAll("nav.tabs button[data-tab]").forEach(b => b.addEventListener("click", () => { showTab(b.dataset.tab); window.scrollTo(0, 0); }));

/* ---- canvas ---- */
const cv = $("cv"), ctx = cv.getContext("2d");
const ZC = { RED: "#e0463a", GREEN: "#2f9e62", BLUE: "#2f6fe0", YELLOW: "#f0c32c", WHITE: "#f7fafc", BLACK: "#222" };
let world = null, frames = [], idx = 0, raf = 0, speed = 1, running = false, result = null;
function zoneAt(x, y, w = world){ for (const z of w.zones) if (x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h) return z.color; return "WHITE"; }
let bgMode = "none", customImg = null, bgOp = 1;
const seasonImg = new Image(); seasonImg.src = "data:image/jpeg;base64,@@SEASONMAP@@"; seasonImg.onload = () => { if (world) draw(); };
function setBgMode(m){ bgMode = m; $("bgSel").value = m; if (world) draw(); }
$("bgSel").addEventListener("change", e => {
  if (e.target.value === "custom" && !customImg) { $("bgFile").click(); setBgMode(bgMode); return; }
  setBgMode(e.target.value);
});
$("bgFile").addEventListener("change", e => {
  const f = e.target.files[0]; if (!f) return; const r = new FileReader();
  r.onload = () => { const im = new Image(); im.onload = () => {
    const k = Math.min(1, 1600 / Math.max(im.width, im.height)), c = document.createElement("canvas");
    c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
    const t = new Image(); t.onload = () => { customImg = t; setBgMode("custom"); }; t.src = c.toDataURL("image/jpeg", .85); }; im.src = r.result; };
  r.readAsDataURL(f); e.target.value = "";
});
$("bgOp").addEventListener("input", e => { bgOp = e.target.value / 100; draw(); });
function draw(){ renderField(ctx, cv, world, frames, idx); }
function renderField(ctx, cv, world, frames, idx){
  const s = cv.width / world.size[0];
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#e7edf3"; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.strokeStyle = "#cdd7e1"; ctx.lineWidth = 1; ctx.beginPath();
  for (let x = 0; x <= world.size[0]; x += 100) { ctx.moveTo(x * s, 0); ctx.lineTo(x * s, cv.height); }
  for (let y = 0; y <= world.size[1]; y += 100) { ctx.moveTo(0, y * s); ctx.lineTo(cv.width, y * s); }
  ctx.stroke();
  const bg = cv.id !== "cv" ? null : (bgMode === "season" ? (seasonImg.naturalWidth ? seasonImg : null) : bgMode === "custom" ? customImg : null), useBg = !!bg;
  if (useBg) { ctx.globalAlpha = bgOp; ctx.drawImage(bg, 0, 0, cv.width, cv.height); ctx.globalAlpha = 1; }
  for (const z of world.zones) {
    if (useBg && z.color === "WHITE") continue;
    ctx.fillStyle = ZC[z.color]; ctx.globalAlpha = z.color === "WHITE" ? 1 : .9; ctx.fillRect(z.x * s, z.y * s, z.w * s, z.h * s); ctx.globalAlpha = 1;
    if (z.label) { ctx.strokeStyle = "#7d8da0"; ctx.setLineDash([6, 4]); ctx.strokeRect(z.x * s, z.y * s, z.w * s, z.h * s); ctx.setLineDash([]);
      ctx.fillStyle = "#4a5a6c"; ctx.font = "bold 15px Heebo, sans-serif"; ctx.textAlign = "center"; ctx.fillText(z.label, (z.x + z.w / 2) * s, (z.y + z.h + 28) * s * 1); }
  }
  ctx.fillStyle = "#3b4a5c"; for (const w of world.walls) { if (w.avoid || w.target) { ctx.globalAlpha = .55; ctx.fillStyle = w.target ? "#12805c" : "#c62828"; } ctx.fillRect(w.x * s, w.y * s, w.w * s, w.h * s); ctx.globalAlpha = 1; ctx.fillStyle = "#3b4a5c"; if (w.label) { ctx.fillStyle = "#fff"; ctx.font = "bold 14px Heebo, sans-serif"; ctx.textAlign = "center"; ctx.fillText(w.label, (w.x + w.w / 2) * s, (w.y + w.h / 2 + 5) * s); ctx.fillStyle = "#3b4a5c"; } }
  ctx.strokeStyle = "#3b4a5c"; ctx.lineWidth = 4; ctx.strokeRect(0, 0, cv.width, cv.height);
  const f = frames[idx] || frames[0];
  ctx.strokeStyle = "rgba(232,64,47,.65)"; ctx.lineWidth = 2; ctx.beginPath();
  for (let i = 0; i <= idx; i += 2) { const p = frames[i]; i === 0 ? ctx.moveTo(p[1] * s, p[2] * s) : ctx.lineTo(p[1] * s, p[2] * s); }
  ctx.lineTo(f[1] * s, f[2] * s); ctx.stroke();
  ctx.save(); ctx.translate(f[1] * s, f[2] * s); ctx.rotate(f[3] * Math.PI / 180); ctx.scale(s, s);
  ctx.fillStyle = "#0b2447"; ctx.fillRect(-60, -80, 120, 160);
  ctx.fillStyle = "#222"; ctx.fillRect(-70, -50, 12, 70); ctx.fillRect(58, -50, 12, 70);
  ctx.fillStyle = f[4] ? "#ff3b30" : "#8a97a6"; ctx.fillRect(-40, -90, 80, 12);
  ctx.save(); ctx.translate(-50, -70); ctx.rotate(Math.PI + (f[5] || 0) * Math.PI / 180); ctx.fillStyle = "#f59e0b"; ctx.fillRect(0, -7, 90, 14); ctx.restore();
  ctx.fillStyle = "#e8402f"; ctx.beginPath(); ctx.moveTo(0, -62); ctx.lineTo(-18, -28); ctx.lineTo(18, -28); ctx.closePath(); ctx.fill();
  ctx.fillStyle = ZC[zoneAt(f[1], f[2], world)]; ctx.strokeStyle = "#fff"; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, 18, 18, 0, 7); ctx.fill(); ctx.stroke();
  ctx.restore();
}
function setWorld(w){ world = w; cv.height = Math.round(cv.width * w.size[1] / w.size[0]); frames = [[0, w.start[0], w.start[1], w.start[2], 0]]; idx = 0; draw(); }

/* ---- missions ---- */
let cur = MISSIONS[0], solved = new Set(JSON.parse(store.get("fll-solved") || "[]"));
function rnd(){ return Math.random(); }
function drawIdle(){ if (!world) pick(cur.id); else draw(); }
function renderMissionBtns(){
  const box = $("missionBtns"); box.innerHTML = "";
  for (const m of MISSIONS) {
    const b = document.createElement("button"); b.textContent = m.id + ". " + m.title;
    b.setAttribute("aria-pressed", String(m.id === cur.id)); if (solved.has(m.id)) b.className = "done";
    b.addEventListener("click", () => pick(m.id)); box.appendChild(b);
  }
}
function pick(id){
  cancelAnimationFrame(raf); running = false;
  cur = MISSIONS.find(m => m.id === id);
  $("mTitle").textContent = cur.id + ". " + cur.title; $("mDesc").textContent = cur.desc; $("mHint").textContent = cur.hint; if ($("mSol")) $("mSol").textContent = cur.solution;
  $("hdr").textContent = HEADER;
  $("code").value = store.get("fll-code-" + cur.id) || cur.template; bps.clear(); onCodeChanged(); session = false; $("code").readOnly = false;
  $("console").textContent = ""; $("banner").className = "hidden";
  setBgMode(cur.id === 10 ? "season" : "none"); setWorld(cur.world(rnd)); renderMissionBtns(); updateButtons();
}
function updateButtons(){ $("run").disabled = !ready || running; $("dbg").disabled = !ready || running; ["skip","stop","pause","step","stepBack"].forEach(i => $(i).disabled = !running); }

/* ---- python ---- */
let ready = false, outBuf = "";
const bps = new Set();
let evs = [], evk = -1, paused = false, simT = 0, lastNow = 0, session = false, errLine = null;
function builtinRead(x){
  if (FILES[x] !== undefined) return FILES[x];
  if (!Sk.builtinFiles || Sk.builtinFiles.files[x] === undefined) throw "File not found: '" + x + "'";
  return Sk.builtinFiles.files[x];
}
function initSkulpt(){
  if (typeof Sk === "undefined" || !Sk.configure) { $("status").textContent = "לא הצלחנו לטעון את מפרש הפייתון. בדקו חיבור לאינטרנט ורעננו את הדף."; return; }
  Sk.configure({ output: (t) => { outBuf += t; }, read: builtinRead, __future__: Sk.python3, execLimit: 10000 });
  ready = true; $("status").textContent = "מוכן. כתבו קוד ולחצו הרץ או דיבאג."; updateButtons();
}
function runPy(src, name){ Sk.execStart = new Date(); return Sk.misceval.asyncToPromise(() => Sk.importMainWithBody(name, false, src, true)); }
function pyLit(o){
  if (o === true) return "True"; if (o === false) return "False"; if (o === null || o === undefined) return "None";
  if (Array.isArray(o)) return "[" + o.map(pyLit).join(", ") + "]";
  if (typeof o === "object") return "{" + Object.keys(o).map(k => JSON.stringify(k) + ": " + pyLit(o[k])).join(", ") + "}";
  return JSON.stringify(o);
}

/* scan one line: track open brackets, triple-quoted strings and backslash continuation (strings and comments ignored) */
function scanLine(ln, st){
  let i = 0, q = null;
  while (i < ln.length) {
    const c = ln[i];
    if (st.tri) { if (ln.startsWith(st.tri, i)) { i += 3; st.tri = null; } else i++; continue; }
    if (q) { if (c === "\\") i += 2; else { if (c === q) q = null; i++; } continue; }
    if (c === "#") break;
    if (c === '"' || c === "'") { if (ln.startsWith(c.repeat(3), i)) { st.tri = c.repeat(3); i += 3; } else { q = c; i++; } continue; }
    if ("([{".includes(c)) st.depth++; else if (")]}".includes(c)) st.depth = Math.max(0, st.depth - 1);
    i++;
  }
  st.cont = !st.tri && /\\\s*$/.test(ln);
}
function stripCom(ln){ let q = null; for (let i = 0; i < ln.length; i++) { const c = ln[i]; if (q) { if (c === "\\") i++; else if (c === q) q = null; } else if (c === '"' || c === "'") q = c; else if (c === "#") return ln.slice(0, i); } return ln; }
/* async def -> generator def; "await f(args)" -> yield pybricks.A(f, args) (our tiny scheduler runs the generators) */
function asyncLine(ln){
  const d = /^(\s*)async\s+def\s/.exec(ln);
  if (d) return { line: ln.replace(/^(\s*)async\s+def\s/, "$1def "), isDef: true, ind: d[1] };
  const a = /^(\s*)((?:[A-Za-z_]\w*\s*=\s*)?)await\s+([A-Za-z_][\w.]*)\((.*)\)$/.exec(stripCom(ln).trimEnd());
  if (a) return { line: a[1] + a[2] + "yield pybricks.A(" + a[3] + (a[4].trim() ? ", " + a[4] : "") + ")" };
  return { line: ln };
}
/* put pybricks.L(n) before each statement so we know which line is running; map[k] = user line of body line k */
function instrument(user, w = world){
  const body = [], map = [0];
  for (const h of HEADER.split("\n").slice(0, -1)) { body.push(h); map.push(0); }
  const st = { depth: 0, tri: null, cont: false };
  const ul = user.split("\n");
  for (let i = 0; i < ul.length; i++) {
    const ln = ul[i], first = i + 1, t = ln.trim();
    const stmt = !st.tri && !st.cont && st.depth === 0 && t && !t.startsWith("#") && !/^(elif|else|except|finally)\b/.test(t);
    if (stmt) { body.push(ln.match(/^\s*/)[0] + "pybricks.L(" + first + ")"); map.push(first); }
    let o = { line: ln }, scanned = false;
    if (!st.tri && !st.cont) {
      if (st.depth === 0 && /^\s*(?:[A-Za-z_]\w*\s*=\s*)?await\s/.test(stripCom(ln))) {
        /* an await call may span several lines: join them first */
        let joined = stripCom(ln).trimEnd(); scanLine(ln, st); scanned = true;
        while (st.depth > 0 && i + 1 < ul.length) { i++; joined += " " + stripCom(ul[i]).trim(); scanLine(ul[i], st); }
        o = asyncLine(joined);
      } else o = asyncLine(ln);
    }
    body.push(o.line); map.push(first);
    if (o.isDef) { body.push(o.ind + "    if 0: yield"); map.push(first); }
    if (!scanned) scanLine(ln, st);
  }
  const src = "import pybricks\npybricks.start(" + pyLit(w) + ")\ntry:\n" + body.map(l => "    " + l).join("\n") + "\nexcept BaseException as _e:\n    pybricks.out()\n    raise\npybricks.out()\n";
  return { src, map };
}
const HINTS = { NameError: "השם לא מוכר. בדקו איות, אותיות גדולות וקטנות, ושהגדרתם אותו קודם.", TypeError: "משהו לא מתאים בסוג או במספר הארגומנטים, למשל חסר מספר בתוך הסוגריים.", AttributeError: "אין פקודה בשם הזה. בדקו איות, למשל robot.straight.", ParseError: "שגיאת כתיבה: בדקו נקודתיים אחרי if, while ו-for, סוגריים שנסגרו, והזחה של ארבעה רווחים.", IndentationError: "הזחה לא נכונה: השורות בתוך לולאה צריכות להיות מוזזות באותה כמות רווחים.", TimeLimitError: "התוכנית רצה יותר מדי זמן. אולי לולאה שלא נגמרת?", SyntaxError: "שגיאת כתיבה: בדקו נקודתיים, סוגריים והזחה." };
function explain(e, map){
  let name = (e && e.tp$name) || "שגיאה", msg = "";
  try { msg = e.args && e.args.v && e.args.v[0] ? e.args.v[0].v : String(e); } catch (x) { msg = String(e); }
  let line = null;
  if (name === "TypeError" && /concatenate/i.test(msg)) msg += " (אי אפשר לחבר טקסט ומספר עם +. השתמשו בפסיק או ב-f-string)";
  try { for (const f of (e.traceback || [])) { const u = map[f.lineno - 3]; if (u) line = u; } } catch (x) {}
  if (line === null) { const m = /line (\d+)/.exec(String(e)); if (m) { const u = map[+m[1] - 3]; if (u) line = u; } }
  return { line, text: (line ? "שורה " + line + ": " : "") + name + (msg ? ": " + msg : "") + (HINTS[name] ? "  ←  " + HINTS[name] : "") };
}

/* ---- editor decorations ---- */
const LH = 22, PAD = 10;
function onCodeChanged(){ refreshGutter(); setMark("hlErr", null); errLine = null; if (!running) setMark("hl", null); }
function refreshGutter(){
  const n = $("code").value.split("\n").length; let h = "";
  for (let i = 1; i <= n; i++) h += '<div class="g' + (bps.has(i) ? " bp" : "") + '" data-n="' + i + '">' + i + "</div>";
  $("gutIn").innerHTML = h; syncScroll();
}
function syncScroll(){ const t = $("code").scrollTop; $("gutIn").style.transform = "translateY(" + (-t) + "px)"; for (const id of ["hl", "hlErr"]) if ($(id).dataset.n) placeMark(id); }
const marks = {};
function placeMark(id){ const el = $(id), n = +el.dataset.n; el.style.top = (PAD + (n - 1) * LH - $("code").scrollTop) + "px"; }
function setMark(id, n, reveal){
  const el = $(id); if (!n) { el.style.display = "none"; el.dataset.n = ""; return; }
  el.dataset.n = n; el.style.display = "block";
  if (reveal) { const ta = $("code"), top = PAD + (n - 1) * LH; if (top < ta.scrollTop) ta.scrollTop = top - LH; else if (top + LH > ta.scrollTop + ta.clientHeight) ta.scrollTop = top + LH - ta.clientHeight + PAD; }
  placeMark(id);
}
$("gut").addEventListener("click", (e) => { const g = e.target.closest(".g"); if (!g) return; const n = +g.dataset.n; bps.has(n) ? bps.delete(n) : bps.add(n); refreshGutter(); });
$("code").addEventListener("scroll", syncScroll);
$("code").addEventListener("input", () => { store.set("fll-code-" + cur.id, $("code").value); onCodeChanged(); });

/* ---- session: run / debug ---- */
const CN = { WHITE: "לבן", RED: "אדום", GREEN: "ירוק", BLUE: "כחול", YELLOW: "צהוב", BLACK: "שחור" };
function updateState(){
  const f = frames[idx] || frames[0], ln = running && evk >= 0 && evk < evs.length ? evs[evk].line : null;
  const cells = [["שורה", ln || "-"], ["זמן", (f[0] / 1000).toFixed(1) + " ש'"], ["מיקום", Math.round(f[1] / 10) + ", " + Math.round(f[2] / 10) + " ס\"מ"],
    ["כיוון", Math.round(((f[3] % 360) + 360) % 360) + "°"], ["חיישן מגע", f[4] ? "לחוץ" : "לא לחוץ"], ["צבע", CN[zoneAt(f[1], f[2])]], ["זרוע", Math.round(f[5] || 0) + "°"]];
  $("state").innerHTML = cells.map(c => "<div>" + c[0] + "<b>" + c[1] + "</b></div>").join("");
}
function render(){ draw(); updateState(); setMark("hl", running && evk >= 0 && evk < evs.length ? evs[evk].line : null, true); }
function isEnd(){ return idx >= frames.length - 1 && evk >= evs.length - 1; }
function pauseNow(p){ paused = p; const b = $("pause"), t = p ? "המשך" : "השהה"; b.title = t; b.setAttribute("aria-label", t);
  b.firstChild.innerHTML = p ? '<path d="M7 4l13 8-13 8z" fill="currentColor"/>' : '<path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor"/>'; }
function advance(){
  for (;;) {
    const nx = evs[evk + 1];
    if (nx && nx.fi <= idx) { evk++; if (bps.has(nx.line)) { pauseNow(true); return; } continue; }
    if (idx < frames.length - 1 && frames[idx + 1][0] <= simT) { idx++; continue; }
    return;
  }
}
function tick(now){
  if (!running) return;
  const dt = Math.min(now - lastNow, 50); lastNow = now;
  if (!paused) { simT += dt * speed; advance(); }
  render();
  if (!paused && isEnd()) { finish(); return; }
  raf = requestAnimationFrame(tick);
}
function stepFwd(){
  if (!running) return; pauseNow(true);
  if (evk + 1 < evs.length) { evk++; idx = Math.max(idx, evs[evk].fi); simT = frames[idx][0]; }
  else { idx = frames.length - 1; simT = frames[idx][0]; if (isEnd()) { render(); finish(); return; } }
  render();
}
function stepBack(){
  if (!running || evk <= 0) return; pauseNow(true);
  evk--; idx = evs[evk].fi; simT = frames[idx][0]; render();
}
async function run(debug){
  if (!ready || running) return;
  const user = $("code").value; store.set("fll-code-" + cur.id, user);
  setWorld(world);
  const { src, map } = instrument(user);
  outBuf = ""; $("banner").className = "hidden"; let err = null; errLine = null;
  setMark("hlErr", null); setMark("hl", null);
  running = true; updateButtons();
  try { await runPy(src, "main"); } catch (e) { const x = explain(e, map); err = x.text; errLine = x.line; }
  const lines = outBuf.split("\n"), ri = lines.findIndex(l => l.startsWith("@@RES|"));
  const logLines = lines.filter((l, i) => i !== ri && l !== "");
  const con = $("console"); con.textContent = logLines.join("\n") + (logLines.length ? "\n" : "");
  if (err) { const d = document.createElement("div"); d.className = "err"; d.textContent = err; con.appendChild(d); }
  if (ri < 0) { running = false; updateButtons(); if (errLine) setMark("hlErr", errLine, true); return; }
  const p = lines[ri].split("|");
  result = { ok: p[1] === "1", msg: p[2] };
  evs = p[9] ? p[9].split(";").filter(Boolean).map(s => { const a = s.split(":"); return { fi: +a[0], line: +a[1] }; }) : [];
  frames = p.slice(10).join("|").split(";").map(s => s.split(",").map(Number));
  idx = 0; simT = 0; evk = -1; session = true; $("code").readOnly = true;
  pauseNow(false); lastNow = performance.now();
  if (debug) { stepFwd(); } else { advance(); render(); }
  raf = requestAnimationFrame(tick);
}
function finish(){
  cancelAnimationFrame(raf); running = false; session = false; updateButtons(); $("code").readOnly = false;
  idx = frames.length - 1; draw(); updateState(); setMark("hl", null); if (errLine) setMark("hlErr", errLine, true);
  const b = $("banner"), g = world.goal.type;
  if (g === "none") { b.className = "no"; b.style.background = "var(--soft)"; b.style.color = "var(--ink)"; b.textContent = "הריצה הסתיימה. שנו משהו ונסו שוב."; return; }
  b.style.background = ""; b.style.color = "";
  if (result.ok) { b.className = "ok"; b.textContent = "המשימה הושלמה!"; solved.add(cur.id); store.set("fll-solved", JSON.stringify([...solved])); renderMissionBtns(); }
  else { b.className = "no"; b.textContent = result.msg || "עוד לא. שנו את הקוד ונסו שוב."; }
}
function stopSession(){ cancelAnimationFrame(raf); running = false; session = false; $("code").readOnly = false; setMark("hl", null); updateButtons(); }
$("copyOut").addEventListener("click", async () => {
  const t = $("console").innerText, b = $("copyOut");
  try { await navigator.clipboard.writeText(t); b.textContent = "הועתק"; }
  catch (e) { const r = document.createRange(); r.selectNodeContents($("console")); const s = getSelection(); s.removeAllRanges(); s.addRange(r); b.textContent = "סומן, לחצו Ctrl+C"; }
  setTimeout(() => b.textContent = "העתק פלט", 2000);
});
$("run").addEventListener("click", () => run(false));
$("dbg").addEventListener("click", () => run(true));
$("step").addEventListener("click", stepFwd);
$("stepBack").addEventListener("click", stepBack);
$("pause").addEventListener("click", () => { if (!running) return; pauseNow(!paused); lastNow = performance.now(); });
$("stop").addEventListener("click", () => { stopSession(); setWorld(world); });
$("skip").addEventListener("click", () => { if (!running) return; idx = frames.length - 1; evk = evs.length - 1; finish(); });
$("resetField").addEventListener("click", () => { stopSession(); $("banner").className = "hidden"; setWorld(world); });
$("newField").addEventListener("click", () => { stopSession(); $("banner").className = "hidden"; setWorld(cur.world(rnd)); });
$("resetCode").addEventListener("click", () => { $("code").value = cur.template; store.set("fll-code-" + cur.id, cur.template); onCodeChanged(); });
$("code").addEventListener("keydown", (e) => {
  if (e.key === "Tab") { e.preventDefault(); const t = e.target, s = t.selectionStart; t.value = t.value.slice(0, s) + "    " + t.value.slice(t.selectionEnd); t.selectionStart = t.selectionEnd = s + 4; onCodeChanged(); }
  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); run(false); }
});
document.querySelectorAll("[data-speed]").forEach(b => b.addEventListener("click", () => { speed = +b.dataset.speed; document.querySelectorAll("[data-speed]").forEach(x => x.setAttribute("aria-pressed", String(x === b))); }));

/* ---- slides ---- */
const vid = (u, t) => '<a class="vidlink" href="' + u + '" target="_blank" rel="noopener">סרטון: ' + t + '</a>';
const SLIDES = [
 `<div class="slide title"><h2>פייתון לרובוט</h2><p>שיעור הכרות לקבוצת FLL: למה תוכנה, ואיך כותבים אותה</p></div>`,
 `<h2>מי מזיז את הרובוט?</h2><div class="two"><div><p class="big">בשלט</p><p>אנחנו מחליטים בכל רגע. מתעייפים, מפספסים, לא חוזרים על אותו דבר.</p></div><div><p class="big">בתוכנה</p><p>החלטנו פעם אחת. הרובוט עושה את זה 10 פעמים אותו דבר.</p></div></div><p>מי מצליח לנסוע בדיוק 50 ס"מ, עשר פעמים ברצף, ביד?</p>${vid("https://www.youtube.com/watch?v=QAUuk_v2c_o", "בקר Xbox עם Spike Prime")}`,
 `<h2>מה תוכנה נותנת לנו</h2><ul><li><b>דיוק:</b> 500 מילימטר הם תמיד 500 מילימטר.</li><li><b>חזרתיות:</b> אותה משימה, בכל סיבוב, בלי לעייף.</li><li><b>החלטות:</b> אם החיישן רואה קיר, עוצרים. אם רואה כחול, מפסיקים.</li></ul>`,
 `<h2>הדרך מהמקלדת למנוע</h2><div class="flow" style="font-size:clamp(14px,2.2vw,22px)"><span>כותבים קוד</span><i>←</i><span>VS Code / Pybricks</span><i>←</i><span>בלוטות'</span><i>←</i><span>בקר Spike Prime</span><i>←</i><span>מנועים וחיישנים</span></div><p>המחשב עושה בדיוק מה שכתוב, שורה אחרי שורה, מלמעלה למטה.</p>${vid("https://www.youtube.com/watch?v=1YSpXzGSiEs", "למה משתמשים ב-Pybricks ב-FLL")}`,
 `<h2>פייתון בשלוש דקות</h2><pre class="runnable" data-w="1"># הערה: הרובוט מתעלם ממנה
print("שלום רובוט!")     # הדפסה
speed = 200               # משתנה: שם לערך
print(speed * 2)          # חשבון</pre><p>שגיאה היא לא כישלון: היא אומרת לנו באיזו שורה לחפש.</p>`,
 `<h2>חידון: מה ידפיס?</h2><p>הצבעה ביד לפני שלוחצים.</p><pre class="runnable" data-w="1">x = 5
x = x + 2
print(x)</pre><div class="quiz"><button class="opt" data-ok="0">5</button><button class="opt" data-ok="1">7</button><button class="opt" data-ok="0">52</button></div><p class="fb hidden">7. השורה השנייה אומרת: קחו את x, הוסיפו 2 ושמרו שוב ב-x. הסימן = אומר "שמור", לא "שווה". אפשר להריץ ולבדוק.</p>`,
 `<h2>שגיאה ראשונה: טקסט ועוד מספר</h2><pre class="runnable" data-w="1">dist = 300
print("מרחק: " + dist)</pre><p>הריצו וקראו את ההודעה: היא אומרת באיזו שורה לחפש ומה לא מתאים. אי אפשר לחבר טקסט ומספר עם +.</p><p>על הרובוט האמיתי ההודעה הזאת מופיעה רק אם מריצים מתוך VS Code. אם מריצים מההאב ישירות, הרובוט פשוט לא זז ואין הסבר.</p>`,
 `<h2>שתי דרכים נכונות להדפיס</h2><pre class="runnable" data-w="1">dist = 300
print("מרחק:", dist)            # 1. פסיק
print(f"מרחק: {dist} mm")        # 2. f-string</pre><p>גם <span class="code-inline">str(dist)</span> עובד, עם + בין שני טקסטים.</p>`,
 `<h2>פקודות נסיעה</h2><pre class="runnable" data-w="1">robot.straight(500)   # קדימה, במילימטרים
robot.turn(90)        # פנייה, במעלות (ימינה)
robot.turn(-90)       # שמאלה</pre><p>המעבר מכאן לרובוט האמיתי: אותן פקודות בדיוק.</p>`,
 `<h2>הרובוט מריץ שורה אחרי שורה</h2><pre class="runnable" data-w="3" data-auto="1">robot.straight(400)
robot.turn(90)
robot.straight(400)
robot.turn(90)</pre><p>השורה הצהובה היא מה שהרובוט עושה עכשיו. ההדגמה חוזרת על עצמה.</p>`,
 `<h2>נחשו לפני שמריצים</h2><pre class="runnable" data-w="1">robot.straight(500)
robot.turn(90)
robot.straight(300)</pre><p>הרובוט מתחיל משמאל ומסתכל ימינה. איפה הוא יסיים: למעלה, למטה או ימינה? הרימו יד, ואז לחצו "הרץ".</p>`,
 `<h2>הרובוט האנושי: עיניים עצומות</h2><div class="two"><div><ul><li>מתנדב.ת אחד.ת הוא הרובוט וסוגר.ת עיניים. מתנדב.ת שני.ה הוא המתכנת.ת ונותן.ת פקודות.</li><li>פקודות מותרות: "צעד קדימה" עם מספר, "פנה ימינה", "פנה שמאלה". אין "קצת", ואין "לך לכיסא".</li><li>היעד: הכיסא, בלי לעבור את השולחן. שאר הכיתה כותבת את התוכנית על הלוח.</li></ul></div><div><p class="big">אחרי הניסוי</p><ul><li>מה קרה כשחסר מספר צעדים?</li><li>מה קרה כשהפקודה לא הייתה מדויקת?</li><li>הרובוט לא רואה: איפה היה עוזר חיישן?</li><li>מחליפים תפקידים ומנסים שוב.</li></ul></div></div>`,
 `<h2>לולאות: לא כותבים אותו דבר ארבע פעמים</h2><pre class="runnable" data-w="3">for i in range(4):
    robot.straight(400)
    robot.turn(90)</pre><p>נקודתיים בסוף השורה, וארבעה רווחים לפני כל שורה בתוך הלולאה.</p>`, 
 `<h2>לולאה אנושית: ריבוע על הרצפה</h2><div class="two"><div><ul><li>מסמנים ריבוע על הרצפה בסרט. המתכנת.ת כותב.ת על הלוח תוכנית בלי לולאה: שמונה שורות.</li><li>עכשיו מקצרים: "חזור 4 פעמים: 3 צעדים, פנה ימינה".</li><li>הרובוט (עיניים עצומות) מבצע. אחר כך משנים ל-3 חזרות ובודקים מה יצא.</li></ul></div><div><p class="big">בקוד</p><pre>for i in range(4):
    robot.straight(300)
    robot.turn(90)</pre><ul><li>כמה שורות חסכנו?</li><li>איך מקבלים משולש?</li></ul></div></div>`,
 `<h2>מצאו את הבאג</h2><pre class="runnable" data-w="3">for i in range(4)
    robot.straight(400)
    robot.turn(90)</pre><p>הרובוט לא זז ויש שגיאה. מה חסר?</p><button class="btn reveal">הראו תשובה</button><p class="answer note hidden">נקודתיים בסוף שורת ה-for. פייתון כותבת SyntaxError ומסמנת את השורה.</p>`,
 `<h2>חיישנים: הרובוט מחליט</h2><pre class="runnable" data-w="4">while not force.pressed():
    robot.drive(150, 0)
robot.stop()</pre><pre>if color.color() == Color.BLUE:
    print("מצאתי כחול!")</pre><p>הקיר לא תמיד באותו מקום (הריצו כמה פעמים), ולכן אי אפשר לנחש מספר.</p>`, 
 `<h2>חיישן אנושי: ללכת עד שנוגעים</h2><div class="two"><div><ul><li>הרובוט (עיניים עצומות) הולך קדימה עד שמישהו נוגע לו בכתף, ואז עוצר מיד.</li><li>המתכנת.ת לא נותן.ת מספר צעדים. הפקודה היחידה: "קדימה עד שנוגעים".</li><li>בכל סבב ה"קיר" (תלמיד עם ידיים מושטות) עומד במרחק אחר.</li></ul></div><div><p class="big">בקוד</p><pre>while not force.pressed():
    robot.drive(150, 0)
robot.stop()</pre><ul><li>למה אי אפשר לנחש מספר צעדים?</li><li>בונוס: קלף אדום, פנה שמאלה. קלף כחול, פנה ימינה (חיישן צבע).</li></ul></div></div>`,
 `<h2>חידון: מתי הלולאה נגמרת?</h2><pre>while not force.pressed():
    robot.drive(150, 0)
robot.stop()</pre><p>לולאת ה-<span class="code-inline">while</span> שלמעלה, זו שבשקף הקודם. מתי היא מפסיקה לחזור, והרובוט עובר לשורה <span class="code-inline">robot.stop()</span>?</p><div class="quiz"><button class="opt" data-ok="0">אחרי שלוש שניות</button><button class="opt" data-ok="1">כשחיישן המגע נלחץ</button><button class="opt" data-ok="0">אף פעם</button></div><p class="fb hidden">כשהחיישן נלחץ. התנאי "not force.pressed()" נכון כל עוד עוד לא לחצו. אפשר לראות בשקף הקודם.</p>`,
 `<h2>async, await ו-multitask</h2><pre class="runnable" data-w="8" data-rate="0.8">async def drive_task():
    await robot.straight(600)

async def arm_task():
    await arm.run_angle(60, 90)

async def main():
    await multitask(drive_task(), arm_task())

run_task(main())</pre><p>await: חכו שהפעולה תסתיים. multitask: שתי פעולות יחד. נסו להחליף ל-<span class="code-inline">await drive_task()</span> ואז <span class="code-inline">await arm_task()</span> ולהשוות זמן, במשימה 8.</p>`, 
 `<h2>multitask אנושי: שני דברים יחד</h2><div class="two"><div><ul><li>שני מתנדבים: הרובוט הולך חמישה צעדים, והזרוע מרימה יד למשך שלוש שניות.</li><li>סבב 1: אחד אחרי השני (כמו <span class="code-inline">await</span> פעמיים). מודדים זמן בשעון עצר.</li><li>סבב 2: שניהם יחד (כמו <span class="code-inline">multitask</span>). מודדים שוב.</li></ul></div><div><p class="big">אחרי הניסוי</p><ul><li>כמה זמן לקח כל סבב?</li><li>מה היה קשה בתיאום?</li><li>איפה בקוד של הקבוצה זה קורה?</li></ul></div></div>`,
 `<h2>דיוק: מהר או לאט?</h2><div class="two"><div><ul><li>התחלה והאטה עדינות מונעות החלקה, ולכן הרובוט נוסע ישר יותר.</li><li>מהר מפיל בעוצמה, לאט מפיל בעדינות. בוחרים מהירות לפי המשימה.</li><li>אחרי נסיעה מהירה ממתינים רגע לפני פנייה.</li></ul></div><div><p class="big">נסו: מהר ואז לאט</p><pre class="runnable" data-w="1">robot.settings(straight_speed=500)
robot.straight(400)     # מהר
robot.settings(straight_speed=150)
robot.straight(100)     # לאט, בדיוק
wait(150)
robot.turn(90)</pre></div></div>`,
 `<h2>סימולציה מול המציאות</h2><ul><li>בסימולטור אין חיכוך, סחיפה או סוללה חלשה.</li><li>ברובוט האמיתי הגלגלים מחליקים והכיוון זז.</li><li>לכן בקוד של הקבוצה יש גירוסקופ ובקר PID שמתקן את הכיוון.</li></ul>`,
 `<h2>עכשיו אתם</h2><ul><li>פותחים את לשונית "סימולטור ותרגול".</li><li>משימות 1 עד 3 ו-9 לכולם. 4 עד 6 למי שמתקדם. 7, 8 ו-10 לאתגר.</li><li>נתקעתם? קודם רמז, אחר כך שאלה לחבר, ואז אלינו.</li><li>לחצו "דיבאג" כדי לראות איזו שורה רצה עכשיו.</li></ul>`,
 `<h2>הצעדים הבאים</h2><ul><li>התקנת VS Code ו-Pybricks, וחיבור רובוט אמיתי.</li><li>להריץ את הקוד שכתבתם היום על הרובוט.</li><li>להכיר את הקוד של שנה שעברה: מחלקת Robot ושלט.</li><li>להמשיך לבד: קורסי פייתון בעברית בקמפוס IL (בלשונית הסרטונים והחומרים).</li></ul><p class="big">כרטיס יציאה: מילה אחת על מה שלמדתי, ודבר אחד שלא ברור.</p>${vid("https://www.youtube.com/watch?v=_jbuG3N5pWI", "הגדרת VS Code עם Pybricks")}`,
];
/* ---- runnable examples inside slides ---- */
let miniRaf = 0, autoTimer = 0, miniBusy = false;
const esc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
async function simulate(user, w){
  const { src, map } = instrument(user, w);
  outBuf = ""; let err = null, errLine = null;
  try { await runPy(src, "main"); } catch (e) { const x = explain(e, map); err = x.text; errLine = x.line; }
  const lines = outBuf.split("\n"), ri = lines.findIndex(l => l.startsWith("@@RES|"));
  const log = lines.filter((l, i) => i !== ri && l !== "");
  if (ri < 0) return { err, errLine, log, frames: null };
  const p = lines[ri].split("|");
  return { err, errLine, log,
    evs: p[9] ? p[9].split(";").filter(Boolean).map(s => { const q = s.split(":"); return { fi: +q[0], line: +q[1] }; }) : [],
    frames: p.slice(10).join("|").split(";").map(s => s.split(",").map(Number)) };
}
function setupRunnables(){
  document.querySelectorAll("#slide pre.runnable").forEach((pre) => {
    const code = pre.textContent; pre.dataset.code = code;
    pre.innerHTML = code.split("\n").map((l, i) => '<span class="ln" data-n="' + (i + 1) + '">' + (esc(l) || " ") + "</span>").join("");
    const wrap = document.createElement("div"); wrap.className = "runwrap";
    const left = document.createElement("div"); left.className = "runleft";
    const out = document.createElement("div"); out.className = "runout"; out.hidden = true;
    const btn = document.createElement("button"); btn.className = "btn primary"; btn.textContent = "הרץ";
    pre.replaceWith(wrap); left.append(pre, btn); wrap.append(left, out);
    btn.addEventListener("click", () => miniRun(pre, out, btn, !!pre.dataset.auto));
    if (pre.dataset.auto) { const t0 = Date.now(), tryAuto = () => { if (ready) miniRun(pre, out, btn, true); else if (Date.now() - t0 < 15000) autoTimer = setTimeout(tryAuto, 400); }; autoTimer = setTimeout(tryAuto, 500); }
  });
}
async function miniRun(pre, out, btn, loop){
  if (!ready || running || miniBusy) return;
  miniBusy = true; btn.disabled = true; cancelAnimationFrame(miniRaf);
  const mark = (n, cls) => { pre.querySelectorAll(".ln." + cls).forEach(x => x.classList.remove(cls)); const el = n && pre.querySelector('.ln[data-n="' + n + '"]'); if (el) el.classList.add(cls); };
  mark(0, "errln"); mark(0, "cur");
  const w = MISSIONS.find(m => m.id === +(pre.dataset.w || 1)).world(rnd);
  out.hidden = false; out.parentElement.classList.add("has-out");
  out.innerHTML = '<canvas></canvas><div class="rlog"></div><div class="rban"></div>';
  const cvs = out.querySelector("canvas"), c2 = cvs.getContext("2d"), logEl = out.querySelector(".rlog"), ban = out.querySelector(".rban");
  cvs.width = 700; cvs.height = Math.round(700 * w.size[1] / w.size[0]);
  const r = await simulate(pre.dataset.code, w);
  logEl.textContent = r.log.join("\n");
  if (r.err) { const d = document.createElement("div"); d.className = "err"; d.textContent = r.err; logEl.appendChild(d); mark(r.errLine, "errln"); }
  if (!r.frames) { cvs.hidden = true; miniBusy = false; btn.disabled = false; return; }
  const fr = r.frames, evs = r.evs;
  if (fr.length <= 3) { cvs.hidden = true; miniBusy = false; btn.disabled = false; mark(0, "cur"); return; }
  let idx = 0, evk = -1; const t0 = performance.now(), rate = +pre.dataset.rate || 2;
  const tick = (now) => {
    const st = (now - t0) * rate;
    while (idx < fr.length - 1 && fr[idx + 1][0] <= st) idx++;
    while (evk + 1 < evs.length && evs[evk + 1].fi <= idx) evk++;
    renderField(c2, cvs, w, fr, idx); mark(evk >= 0 ? evs[evk].line : 0, "cur");
    if (idx < fr.length - 1) { miniRaf = requestAnimationFrame(tick); return; }
    mark(0, "cur"); miniBusy = false; btn.disabled = false;
    ban.textContent = "זמן בסימולטור: " + (fr[idx][0] / 1000).toFixed(1) + " שניות";
    if (loop) { const cur = si; autoTimer = setTimeout(() => { if (cur === si) miniRun(pre, out, btn, true); }, 2000); }
  };
  miniRaf = requestAnimationFrame(tick);
}
let si = 0;
function renderSlide(){
  const el = $("slide"), html = SLIDES[si];
  el.className = html.startsWith('<div class="slide title">') ? "slide title" : "slide";
  el.innerHTML = html.startsWith('<div class="slide title">') ? html.replace(/^<div class="slide title">/, "").replace(/<\/div>$/, "") : html;
  $("sCount").textContent = (si + 1) + " / " + SLIDES.length;
  $("sPrev").disabled = si === 0; $("sNext").disabled = si === SLIDES.length - 1;
  cancelAnimationFrame(miniRaf); clearTimeout(autoTimer); miniBusy = false; setupRunnables();
}
function goSlide(d){ si = Math.max(0, Math.min(SLIDES.length - 1, si + d)); renderSlide(); }
$("sPrev").addEventListener("click", () => goSlide(-1));
$("sNext").addEventListener("click", () => goSlide(1));
$("fs").addEventListener("click", () => { try { const p = $("slideBox").requestFullscreen(); if (p && p.catch) p.catch(() => {}); } catch (e) {} });
document.addEventListener("keydown", (e) => {
  if ($("slides-tab").classList.contains("hidden") || /^(TEXTAREA|INPUT|SELECT)$/.test((e.target.tagName || ""))) return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const next = e.key === "ArrowLeft" || e.key === " " || e.key === "PageDown", prev = e.key === "ArrowRight" || e.key === "Backspace" || e.key === "PageUp";
  if (!next && !prev) return;
  e.preventDefault(); if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  goSlide(next ? 1 : -1);
});
renderSlide();
function openInSim(code){ showTab("sim"); pick(1); $("code").value = code; onCodeChanged(); window.scrollTo(0, 0); }
$("slide").addEventListener("click", (e) => {
  const t = e.target.closest("button"); if (!t) return;
  const s = t.closest(".slide");
  if (t.classList.contains("opt")) {
    s.querySelectorAll(".opt").forEach(o => { o.disabled = true; if (o.dataset.ok === "1") o.classList.add("ok"); });
    if (t.dataset.ok !== "1") t.classList.add("bad");
    const fb = s.querySelector(".fb"); if (fb) fb.classList.remove("hidden");
  } else if (t.classList.contains("reveal")) { const n = s.querySelector(".answer"); if (n) n.classList.toggle("hidden"); }
  else if (t.classList.contains("trysim")) { const p = s.querySelector("pre"); if (p) openInSim(p.textContent); }
  else if (t.classList.contains("gomission")) { showTab("sim"); pick(+t.dataset.m); window.scrollTo(0, 0); }
});

/* ---- idea tiles: pop-up ---- */
let lastTile = null;
function openIdea(t){
  lastTile = t;
  $("mTtl").textContent = t.querySelector(".ttl").textContent;
  const tag = t.querySelector('[class^="tag"]'), sum = t.querySelector(".sum");
  $("mMeta").innerHTML = (tag ? tag.outerHTML : "") + "<span>" + (sum ? sum.textContent : "") + "</span>";
  $("mBody").innerHTML = t.querySelector(".ibody").innerHTML;
  $("modal").hidden = false; document.body.style.overflow = "hidden"; $("mClose").focus();
}
function closeIdea(){ $("modal").hidden = true; document.body.style.overflow = ""; if (lastTile) lastTile.focus(); }
document.addEventListener("click", (e) => { const t = e.target.closest(".tile"); if (t) openIdea(t); else if (e.target === $("modal")) closeIdea(); });
$("mClose").addEventListener("click", closeIdea);
document.addEventListener("keydown", (e) => {
  if (!$("modal").hidden) { if (e.key === "Escape") closeIdea(); return; }
  const t = e.target.closest && e.target.closest(".tile");
  if (t && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); openIdea(t); }
});
const TERMS = [
["חשיבה תכנותית","אלגוריתם","סדרת צעדים ברורה ומדויקת שפותרת בעיה, כמו מתכון. מחשב ורובוט לא מנחשים, ולכן כל צעד וכל מספר צריכים להיות כתובים. אלגוריתם אפשר לכתוב בעברית, בציור או בפייתון.","1. סעו עד שחיישן המגע נלחץ\n2. עצרו וחזרו אחורה 10 ס\"מ\n3. הפעילו את הדגם"],
["חשיבה תכנותית","פסאודו-קוד","כתיבת האלגוריתם במילים רגילות, בשורות קצרות, לפני שכותבים פייתון. קל לתקן אותו כשעוד אין קוד.","חזור 4 פעמים:\n    סע 300\n    פנה ימינה 90"],
["חשיבה תכנותית","תרשים זרימה","ציור של האלגוריתם: מלבן לפעולה, מעוין לתנאי וחיצים לסדר. עוזר לראות איפה יש החלטה ואיפה יש לולאה.",""],
["חשיבה תכנותית","רצף, תנאי ולולאה","שלושת אבני הבניין של כל אלגוריתם: פעולות בסדר (רצף), החלטה (תנאי) וחזרה (לולאה). כמעט כל קוד של רובוט בנוי מהם.","רצף: straight, turn\nתנאי: if / else\nלולאה: for / while"],
["חשיבה תכנותית","פירוק לבעיות קטנות","מפרקים משימה גדולה (הרצה שלמה) לחלקים קטנים (נסיעה לדגם, הפעלה, חזרה), פותרים כל חלק לחוד ומחברים. כל חלק יכול להיות פונקציה.","def go_to_model(): ...\ndef solve(): ...\ndef back_home(): ..."],
["חשיבה תכנותית","הפשטה","להשתמש בפקודה בלי לדעת איך היא עובדת מבפנים. robot.straight(500) מסתיר חישובי גלגלים, מנועים ו-PID. פונקציה שכתבתם מסתירה פרטים כדי שהקוד יהיה קריא.",""],
["חשיבה תכנותית","קלט ופלט","קלט הוא מה שהתוכנית מקבלת מהעולם (חיישנים, כפתורים, שלט). פלט הוא מה שהיא עושה (מנועים, מטריצת אורות, צפצוף, print).","קלט: color.color()\nפלט: robot.straight(300)"],
["חשיבה תכנותית","תנאי בוליאני","ביטוי שהתשובה עליו היא כן או לא (True או False). לולאות ו-if מחליטים לפיו.","force.pressed()  # True או False\nspeed > 200"],
["חשיבה תכנותית","שגיאת תחביר מול שגיאה לוגית","שגיאת תחביר: הקוד כתוב לא נכון ופייתון לא מריצה אותו (נקודתיים חסרות). שגיאה לוגית: הקוד רץ, אבל האלגוריתם לא עושה מה שרצינו (פנייה לצד הלא נכון). את השנייה מוצאים רק בבדיקה על המגרש או בדיבאג.",""],
["חשיבה תכנותית","איטרציה: נסו, מדדו, שפרו","תכנון טוב נעשה במחזורים: מריצים, מודדים מה קרה, משנים דבר אחד וחוזרים. לא מנסים לתקן חמישה דברים בבת אחת.",""],
["חשיבה תכנותית","אופטימיזציה","שיפור של פתרון שכבר עובד: מהיר יותר, מדויק יותר או קצר יותר. קודם שהוא עובד, אחר כך ממהרים.",""],
["חשיבה תכנותית","קבועים ומספרי קסם","מספר שמופיע בקוד בלי הסבר (637) הוא \"מספר קסם\". נותנים לו שם בראש הקובץ כדי שאפשר יהיה להבין אותו ולשנות במקום אחד.","DIST_TO_MODEL = 637\nrobot.straight(DIST_TO_MODEL)"],
["פייתון","range","יוצרת סדרת מספרים שלמים, והלולאה for עוברת עליהם. range(4) נותנת 0, 1, 2, 3 ולכן הלולאה חוזרת 4 פעמים. range(2, 5) נותנת 2, 3, 4 (הסוף לא נכלל), ו-range(0, 10, 3) קופצת ב-3. אפשר להשתמש במשתנה של הלולאה כדי לשנות משהו בכל חזרה.","for i in range(4):\n    robot.straight(100 * (i + 1))   # 100, 200, 300, 400\n    robot.turn(90)"],
["פייתון","משתנה","שם שמחזיק ערך, כמו תווית על קופסה. אפשר לשנות את הערך אחר כך.","speed = 200\nspeed = speed + 50"],
["פייתון","סוגי נתונים","מספר שלם (int), מספר עשרוני (float), טקסט (str) וכן/לא (bool). פעולה על סוג לא מתאים גורמת לשגיאה.","10, 2.5, \"שלום\", True"],
["פייתון","print","מדפיסה ערך לפלט. הכלי הכי פשוט להבין מה קורה בקוד.","print(\"מרחק:\", robot.distance())"],
["פייתון","הערה","טקסט שפייתון מתעלם ממנו, שמסביר לבני אדם.","# סעו 50 ס\"מ"],
["פייתון","הזחה","הרווחים בתחילת שורה. הם קובעים אילו שורות שייכות לתנאי, ללולאה או לפונקציה.","if x > 3:\n    print(\"גדול\")"],
["פייתון","תנאי (if)","הקוד מתבצע רק אם התנאי נכון. elif ו-else מטפלים בשאר המקרים.","if color.color() == Color.BLUE:\n    robot.stop()"],
["פייתון","לולאת for","חוזרת מספר ידוע של פעמים.","for i in range(4):\n    robot.straight(300)"],
["פייתון","לולאת while","חוזרת כל עוד תנאי נכון. מתאימה ל\"סעו עד שמשהו קורה\".","while not force.pressed():\n    robot.drive(100, 0)"],
["פייתון","רשימה","אוסף ערכים לפי סדר. הספירה מתחילה מ-0.","dists = [200, 300, 150]\nprint(dists[0])"],
["פייתון","פונקציה","קטע קוד עם שם שאפשר להפעיל שוב ושוב, עם פרמטרים ואולי ערך מוחזר.","def square(side):\n    for i in range(4):\n        robot.straight(side)\n        robot.turn(90)"],
["פייתון","פרמטר וארגומנט","פרמטר הוא השם בהגדרת הפונקציה, ארגומנט הוא הערך שנותנים בקריאה.","square(250)"],
["פייתון","import","טעינת כלים מספרייה או מקובץ אחר, כמו pybricks.","from pybricks.tools import wait"],
["פייתון","מחלקה ואובייקט","מחלקה היא תבנית, אובייקט הוא עותק שנוצר ממנה. כך מגדירים רובוט עם יכולות (מחלקת Robot של הקבוצה).","robot = DriveBase(left, right, 62.4, 120)"],
["פייתון","שגיאה (Traceback)","הודעה שמסבירה מה נכשל ובאיזו שורה. שגיאה היא מידע, לא כישלון: קוראים מהשורה האחרונה. על הרובוט האמיתי רואים אותה רק כשמריצים מתוך VS Code (בטרמינל של Pybricks). בהרצה מההאב ישירות הרובוט פשוט לא זז.","TypeError: can't add str and int"],
["פייתון","דיבאג","מעבר על הקוד שורה אחר שורה כדי לראות איפה הוא שונה ממה שתכננתם.","print(...) או נקודת עצירה"],
["רובוט","SPIKE Prime ו-Hub","הרובוט של LEGO וה\"מוח\" שלו, הקופסה עם המעבד, הסוללה והחיבורים. מחוברים אליו מנועים וחיישנים בפורטים A–F.","hub = PrimeHub()"],
["רובוט","מטריצת האורות (display)","מסך של 5×5 נקודות על ההאב. מציג ציור (Icon), מספר, טקסט או נקודות בודדות בעוצמת אור 0–100. טוב להראות איזו הרצה נבחרה או באיזה שלב הקוד נמצא. הצבע נשלט בנפרד, באור הסטטוס של ההאב.","hub.display.icon(Icon.HEART)\nhub.display.number(42)\nhub.display.text(\"Hi\")\nhub.display.pixel(2, 2, 100)\nhub.light.on(Color.GREEN)"],
["רובוט","Pybricks","קושחה וספריית פייתון חלופיות להאב, שנותנות שליטה מדויקת וכתיבה בעורך רגיל כמו VS Code.","from pybricks.hubs import PrimeHub"],
["רובוט","פורט (Port)","החיבור הפיזי בהאב שבו מחובר מנוע או חיישן. בקוד כותבים באיזה פורט.","Motor(Port.D)"],
["רובוט","מנועי הנעה","שני המנועים שמסובבים את הגלגלים ומחוברים יחד ל-DriveBase. הם קובעים נסיעה ופנייה, ולכן לא נוגעים בהם ישירות בזמן נסיעה. מנוע שמותקן הפוך צריך Direction.COUNTERCLOCKWISE.","left = Motor(Port.F, Direction.COUNTERCLOCKWISE)\nright = Motor(Port.D)\nrobot = DriveBase(left, right, 62.4, 120)"],
["רובוט","מנועי משימות (הלבשה)","מנועים נוספים שמפעילים את ההלבשות: זרוע, מנוף, מנגנון שחרור. הם עצמאיים מההנעה, ולכן אפשר להפעיל אותם בזמן נסיעה (multitask). פוקדים עליהם במעלות או במהירות, וצריך לדעת מה המנגנון עושה לדגם.","arm = Motor(Port.E)\narm.run_angle(200, 90)  # 90 מעלות במהירות 200"],
["רובוט","DriveBase","אובייקט שמחבר שני מנועי גלגלים לרובוט אחד שנוסע ישר ופונה.","robot.straight(500)\nrobot.turn(90)"],
["רובוט","קוטר גלגל ורוחב סרן","המידות שהרובוט צריך כדי לתרגם מילימטרים ומעלות לסיבובי גלגל. מדידה לא נכונה גורמת לנסיעה לא מדויקת.","wheel_diameter=62.4, axle_track=120"],
["רובוט","מ\"מ, מעלות ומהירות","מרחק נמדד במילימטרים, פנייה במעלות, ומהירות ב-מ\"מ לשנייה. בלי יחידות אי אפשר לדעת מה הקוד עושה.","robot.straight(500)  # 50 ס\"מ"],
["רובוט","חיישן צבע","מחזיר את הצבע שמול החיישן. תלוי בתאורה ובמרחק מהמשטח.","color.color() == Color.BLUE"],
["רובוט","חיישן מגע (ForceSensor)","מזהה לחיצה ואפילו כמה חזק לוחצים. מתאים כדי לעצור כשנוגעים בקיר או בדגם. בקוד קוראים לו ForceSensor.","force.pressed()"],
["דיוק","האצה והאטה","האצה גבוהה גורמת לגלגלים להחליק בהתחלה, ובעצירה חדה הרובוט מתכופף ונע. האצה והאטה עדינות נותנות נסיעה ישרה ומדויקת יותר, במחיר של קצת זמן. בגרסאות חדשות אפשר להגדיר האטה בנפרד מהאצה (בדקו בתיעוד של הגרסה שלכם).","robot.settings(straight_acceleration=300)"],
["דיוק","נסיעה בשני שלבים","נוסעים מהר רוב הדרך ומאטים בסוף. כך חוסכים זמן ועדיין עוצרים במקום מדויק, כי רוב השגיאה נוצרת בעצירה.","robot.settings(straight_speed=500)\nrobot.straight(400)\nrobot.settings(straight_speed=150)\nrobot.straight(100)"],
["דיוק","מהירות ועוצמת פגיעה","מהירות גבוהה מפילה דגם בעוצמה, ומהירות נמוכה בעדינות. כשצריך להפיל משהו, ולא לפגוע בדגם שלידו, בוחרים מהירות לכל משימה ושומרים אותה בטבלה.","robot.settings(straight_speed=120)  # עדינה"],
["דיוק","דיוק פנייה אחרי נסיעה מהירה","אחרי נסיעה או עצירה מהירה הרובוט עדיין רועד ונע. פנייה מיד אחריה יוצאת לא מדויקת. עוזרים: להמתין רגע (wait), להוריד את מהירות הפנייה, או להשתמש בגירוסקופ.","robot.straight(500)\nwait(150)\nrobot.turn(90)"],
["דיוק","סוג העצירה","אחרי נסיעה אפשר שהמנועים ינעלו את המקום (HOLD), יבלמו (BRAKE) או ירפו (COAST). HOLD שומר על דיוק, COAST מתאים כשרוצים שהרובוט ימשיך להתגלגל, למשל כדי להישען על קיר.","robot.straight(300, then=Stop.COAST)"],
["דיוק","משקל ההלבשה","הלבשה כבדה או בולטת משנה את נקודת המאזן: יותר החלקה ופחות דיוק. מה שמתאים לרובוט בלי הלבשה לא תמיד מתאים איתה, ולכן מכווננים בנפרד.",""],
["דיוק","קונסיסטנטיות (עקביות)","רובוט עקבי עושה את אותו הדבר בכל ריצה. עדיף רובוט עקבי עם סטייה קטנה וידועה, שאפשר לתקן בקוד, מרובוט שפעם מדויק ופעם לא. מקורות לחוסר עקביות: מיקום התחלה שונה, סוללה חלשה, גלגלים מלוכלכים, הלבשה רופפת. מתחילים תמיד מאותה נקודה, מיישרים על קיר, ובודקים כמה ריצות ברצף.","# עקבי: אותה התחלה, אותה תוצאה\nrobot.straight(400)\nrobot.turn(90)"],
["דיוק","צ'ק ליסט לפני ריצה","רשימת בדיקות קבועה שעוברים עליה לפני כל ריצה, כדי שלא נשכח דבר ונקבל ריצות עקביות: סוללה טעונה, הלבשה נעולה וחזקה, גלגלים נקיים, רובוט במקום ההתחלה ובכיוון הנכון, התוכנית הנכונה נבחרה, חיישנים מכוסים או מכוילים, ההלבשה הנכונה לריצה. אפשר להדפיס את הרשימה ולסמן V, כמו טייסים לפני המראה.",""],
["דיוק","מדידה לפני כיוונון","לפני ששמים ערך חדש (מהירות, האצה, PID) נוסעים חמש פעמים ורושמים את הסטייה. רובוט אחד לא עקבי, ולכן ממוצע של כמה ריצות אומר יותר מריצה אחת.",""],
["מכניקה למשימות","גלגלי שיניים והעברת כוח","גלגלי שיניים מעבירים תנועה בין צירים ומשנים כוח ומהירות. גלגל קטן שמסובב גדול נותן יותר כוח ופחות מהירות. תולעת (worm) נותנת הרבה כוח ומחזיקה את המצב בלי שהמנוע ימשיך לעבוד. שימו לב לשחק (backlash) בין השיניים: הוא גורם לאי דיוק.","יחס 1:3 = מנוע מסתובב 3 פעמים לכל סיבוב אחד של הציר"],
["מכניקה למשימות","חוט, כננת וגלגלת","חוט שמתפתל על ציר מושך או מרים דגם או חלק של הלבשה. פשוט וקל, אבל מושך רק לכיוון אחד (צריך קפיץ, גומי או משקל שיחזירו), והחוט עלול להסתבך או להימתח.",""],
["מכניקה למשימות","מנוף, כן ומוט דוחף","מוט על ציר שמגביר כוח או טווח, או מוט שדוחף דגם בקו ישר. הדרך הכי פשוטה לפתוח, לדחוף או לשחרר משהו על המפה.",""],
["מכניקה למשימות","מסילה ושן (rack and pinion) וקמה","גלגל שיניים שמזיז מסילה ישרה הופך סיבוב לתנועה קווית. קמה (cam) היא צורה לא עגולה שדוחפת מוט לפי הזווית שלה.",""],
["מכניקה למשימות","איך בוחרים מנגנון","שואלים: איזה כוח צריך, כמה מרחק ובאיזה כיוון, ומה קורה אם הרובוט לא מדויק? מנגנון שסולח על טעויות (משטח רחב, כניסה בצורת משפך) מקל על התוכנה.",""],
["עוגנים (לתוכנה)","עוגן (anchor)","נקודת ייחוס ידועה במגרש שהרובוט יכול לחזור אליה כדי לאפס טעות שהצטברה. בלי עוגן, כל נסיעה מוסיפה סטייה. עם עוגן, מתחילים כל קטע ממצב ידוע.",""],
["עוגנים (לתוכנה)","התיישרות על קיר","נוסעים לאחור לתוך הקיר עד שהרובוט נעצר ויושר. אחרי זה המיקום והכיוון ידועים, ואפשר לאפס מרחק וגירוסקופ. חיישן מגע בקדמת הרובוט עושה את אותו הדבר קדימה.","robot.straight(-300)  # נסיעה לאחור אל הקיר\nhub.imu.reset_heading(0)"],
["עוגנים (לתוכנה)","קו ושינוי צבע","חיישן הצבע מזהה קו או צבע במפה, ועוצרים בו. מתאים כעוגן לצד, כמו להגיע לקו שחור ואז להמשיך ממיקום ידוע.","while color.color() != Color.BLACK:\n    robot.drive(150, 0)"],
["עוגנים (לתוכנה)","חיישן כעוגן","במקום \"סעו 637 מ\"מ\" כותבים \"סעו עד שמשהו קורה\" (מגע, צבע). זה מחליף חישוב מרחק במדידה של המציאות, ולכן סולח על סטייה.","while not force.pressed():\n    robot.drive(150, 0)"],
["עוגנים (לתוכנה)","איפוס גירוסקופ","אחרי התיישרות או עוגן אחר מאפסים את הזווית, כך שהסחיפה שהצטברה נמחקת.","hub.imu.reset_heading(0)"],
["רובוט","גירוסקופ","חיישן בהאב שמודד כמה הרובוט הסתובב. עוזר לפנות ולנסוע ישר בלי סחיפה.","hub.imu.heading()"],
["רובוט","PID","בקר שמתקן שגיאה (כמה הרובוט רחוק ממה שרצינו) שוב ושוב. P מתקן לפי השגיאה הנוכחית. I מתקן לפי השגיאה שהצטברה לאורך זמן. D מסתכל על קצב השינוי של השגיאה, ולכן מנבא לאן היא הולכת ומרסן תיקון חזק מדי. ב-Pybricks הוא כבר מובנה בתוך DriveBase ובמנועים.","# הערכים של הבקר המובנה\nrobot.heading_control.pid(kp=200, ki=0, kd=50)"],
["רובוט","משימה והרצה","משימה היא עבודה אחת על המגרש, הרצה היא קטע שהרובוט מבצע ביציאה אחת מהבית, ולרוב כוללת כמה משימות.",""],
["רובוט","הלבשה","תוסף שמחבר לרובוט כדי לבצע משימה. הוא משנה מידות ומשקל, ולכן גם את הנסיעה.",""],
["מקביליות","async ו-await","async מגדירה פונקציה שאפשר להמתין בתוכה, ו-await אומר \"חכו שזה יסתיים, ובינתיים אפשר לעשות דברים אחרים\".","async def run():\n    await robot.straight(500)"],
["מקביליות","multitask","מריץ כמה פעולות במקביל, למשל לנסוע ולהרים זרוע באותו זמן.","await multitask(drive(), lift())"],
["מקביליות","run_task","מתחילה את התוכנית האסינכרונית מהקוד הרגיל.","run_task(main())"],
["מקביליות","wait","השהיה במילישניות. בלי await היא עוצרת את כל התוכנית.","wait(500)"],
["כלים","VS Code","עורך הקוד. עם תוספים אפשר להריץ ולנפות ולהתחבר להאב.",""],
["כלים","טרמינל","חלון שבו מקלידים פקודות במקום ללחוץ על כפתורים.","python main.py"],
["כלים","Git ומאגר (repo)","היסטוריה של הקוד. מאגר הוא התיקייה המשותפת של הקבוצה, ואפשר לחזור לכל גרסה קודמת.","git commit -m \"עדכון הרצה 3\""],
];
(function(){
  const box = $("glist"), q = $("glq"), ORDER = ["פייתון","חשיבה תכנותית","רובוט","דיוק","מכניקה למשימות","עוגנים (לתוכנה)","מקביליות","כלים"];
  let openSet = new Set();
  const card = t => '<div class="gc"><h3>' + t[1] + "</h3><p>" + t[2] + "</p>" + (t[3] ? "<pre>" + t[3].replace(/&/g,"&amp;").replace(/</g,"&lt;") + "</pre>" : "") + "</div>";
  function draw(){
    const f = q.value.trim().toLowerCase(), list = TERMS.filter(t => !f || (t[1] + " " + t[2]).toLowerCase().includes(f));
    const cats = ORDER.concat([...new Set(list.map(t => t[0]))].filter(c => !ORDER.includes(c)));
    const h = cats.map(c => { const it = list.filter(t => t[0] === c); if (!it.length) return "";
      return '<details class="gd" data-c="' + c + '"' + (f || openSet.has(c) ? " open" : "") + "><summary>" + c + ' <span class="cnt">(' + it.length + ")</span></summary><div class=\"gl\">" + it.map(card).join("") + "</div></details>"; }).join("");
    box.innerHTML = h || "<p>לא נמצא מושג.</p>";
  }
  box.addEventListener("toggle", e => { const d = e.target; if (d.dataset && d.dataset.c && !q.value.trim()) { if (d.open) openSet.add(d.dataset.c); else openSet.delete(d.dataset.c); } }, true);
  $("glOpen").onclick = () => { openSet = new Set(ORDER); draw(); }; $("glClose").onclick = () => { openSet = new Set(); draw(); };
  q.addEventListener("input", draw); draw();
})();

/* ===== planner ===== */
(function(){
  const FW = 2362, FH = 1143, cv = $("plcv"), c = cv.getContext("2d"), S = cv.width / FW;
  const MIS = [[1,"Drone Survey",1036,1050],[2,"Exploding Seeds",746,594],[3,"Flip the Rock",100,464],[4,"Lucky Leaves",180,150],[5,"Reaching Roots",464,80],[6,"Leafcutter Frenzy",1780,80],[7,"Humongous Fungus",1930,80],[8,"Tangled",636,80],[9,"Research Platform",770,80],[10,"Fragile Microhabitats (שמאלי)",924,120],["10b","Fragile Microhabitats (אמצעי)",1290,370],[11,"Window to the Past",1656,536],[12,"Forest Elder",2270,376]];
  const R = 110;
  let pts = [], mode = "plan", mA = null, mB = null, drag = -1, target = null, sel = -1, acts = [], actsSig = "", simPose = null, simRaf = 0, simMsg = "", trail = [];
  const misSel = $("plMis"); MIS.forEach((m, i) => misSel.add(new Option(m[0] + " · " + m[1], i)));
  const num = id => +$(id).value || 0, rad = d => d * Math.PI / 180, deg = r => r * 180 / Math.PI;
  const norm = a => { a = ((a + 180) % 360 + 360) % 360 - 180; return a === -180 ? 180 : a; };
  const dims = () => ({ W: num("plW"), L: num("plL"), F: $("plAtt").checked ? num("plAF") : 0, Sd: $("plAtt").checked ? num("plAS") : 0 });
  const start = () => ({ x: num("plX"), y: num("plY"), h: num("plH") });
  function corners(x, y, h){ const d = dims(), a = rad(h), f = [Math.sin(a), -Math.cos(a)], r = [Math.cos(a), Math.sin(a)];
    return [[-d.L / 2, -(d.W / 2 + d.Sd)], [d.L / 2 + d.F, -(d.W / 2 + d.Sd)], [d.L / 2 + d.F, d.W / 2 + d.Sd], [-d.L / 2, d.W / 2 + d.Sd]].map(([u, v]) => [x + u * f[0] + v * r[0], y + u * f[1] + v * r[1]]); }
  function hitsModel(x, y, h, m){ const d = dims(), a = rad(h), dx = m[2] - x, dy = m[3] - y;
    const u = dx * Math.sin(a) - dy * Math.cos(a), v = dx * Math.cos(a) + dy * Math.sin(a);
    const cu = Math.max(-d.L / 2, Math.min(d.L / 2 + d.F, u)), cvv = Math.max(-(d.W / 2 + d.Sd), Math.min(d.W / 2 + d.Sd, v));
    return Math.hypot(u - cu, v - cvv) < R; }
  function segs(){ const st = start(), out = []; let px = st.x, py = st.y, h = st.h;
    pts.forEach(p => { const dx = p[0] - px, dy = p[1] - py, dist = Math.hypot(dx, dy); if (dist < 1) return;
      const nh = deg(Math.atan2(dx, -dy)); out.push({ turn: norm(nh - h), dist, h: nh, from: [px, py], to: [p[0], p[1]], pt: p }); px = p[0]; py = p[1]; h = nh; });
    return out; }
  function warnings(sg){ const w = [], st = start(), tm = target === null ? null : MIS[target]; const bad = new Set(); let outside = false;
    const chk = (x, y, h) => { MIS.forEach(m => { if (m !== tm && hitsModel(x, y, h, m)) bad.add(m[0]); });
      corners(x, y, h).forEach(q => { if (q[0] < 0 || q[1] < 0 || q[0] > FW || q[1] > FH) outside = true; }); };
    chk(st.x, st.y, st.h);
    sg.forEach(s => { const n = Math.max(1, Math.round(s.dist / 25)); for (let i = 0; i <= n; i++) chk(s.from[0] + (s.to[0] - s.from[0]) * i / n, s.from[1] + (s.to[1] - s.from[1]) * i / n, s.h); });
    if (bad.size) w.push("הרובוט (עם המידות שהוגדרו) קרוב מדי לדגמים: " + [...bad].join(", "));
    if (outside) w.push("חלק מהרובוט יוצא מגבולות המגרש.");
    return w; }
  const MN = { arm: "arm", arm2: "arm2" }, actDur = a => Math.abs(a.angle) / Math.max(1, Math.abs(a.speed));
  const call = a => MN[a.motor] + ".run_angle(" + Math.round(a.speed) + ", " + Math.round(a.angle) + ")";
  function genCode(sg){
    const par = acts.some(a => a.mode === "during" && a.pt !== null), aw = par ? "await " : "", L = [];
    const used = [...new Set(acts.map(a => a.motor))].map(m => "# " + (m === "arm" ? "arm = Motor(Port.E)" : "arm2 = Motor(Port.A)  # הגדירו בקוד"));
    acts.filter(a => a.pt === null).forEach(a => L.push(aw + call(a)));
    sg.forEach(s => { if (Math.abs(s.turn) >= 1) L.push(aw + "robot.turn(" + Math.round(s.turn) + ")");
      const dr = acts.filter(a => a.pt === s.pt && a.mode === "during"), af = acts.filter(a => a.pt === s.pt && a.mode !== "during");
      L.push(dr.length ? "await multitask(robot.straight(" + Math.round(s.dist) + "), " + dr.map(call).join(", ") + ")" : aw + "robot.straight(" + Math.round(s.dist) + ")");
      af.forEach(a => L.push(aw + call(a))); });
    const body = par ? "async def main():\n" + (L.length ? L.map(l => "    " + l).join("\n") : "    pass") + "\n\nrun_task(main())\n" : L.join("\n") + (L.length ? "\n" : "");
    return (used.length ? used.join("\n") + "\n" : "") + body; }
  function buildActs(){
    const box = $("plActs"); box.innerHTML = "";
    acts.forEach((a, i) => { const r = document.createElement("div"); r.className = "pl-act";
      const opt = (v, t, cur) => '<option value="' + v + '"' + (String(v) === String(cur) ? " selected" : "") + ">" + t + "</option>";
      const pi = a.pt === null ? -1 : pts.indexOf(a.pt);
      r.innerHTML = "<span>בנקודה</span><select data-k=pt>" + opt(-1, "התחלה", pi) + pts.map((_, k) => opt(k, "נקודה " + (k + 1), pi)).join("") + "</select>"
        + "<select data-k=motor>" + opt("arm", "arm (E)", a.motor) + opt("arm2", "arm2 (A)", a.motor) + "</select>"
        + '<span>זווית °</span><input type="number" data-k=angle value="' + a.angle + '"><span>מהירות °/ש\'</span><input type="number" data-k=speed value="' + a.speed + '">'
        + "<select data-k=mode>" + opt("after", "אחרי ההגעה", a.mode) + opt("during", "במקביל לנסיעה אליה", a.mode) + "</select>";
      r.querySelectorAll("[data-k]").forEach(el => el.addEventListener("input", () => { const k = el.dataset.k;
        if (k === "pt") a.pt = +el.value < 0 ? null : pts[+el.value]; else if (k === "angle" || k === "speed") a[k] = +el.value || 0; else a[k] = el.value; stopSim(); render(); }));
      const d = document.createElement("button"); d.className = "btn"; d.textContent = "מחק"; d.onclick = () => { acts.splice(i, 1); stopSim(); render(); }; r.appendChild(d); box.appendChild(r); }); }
  $("plAddAct").onclick = () => { acts.push({ pt: sel >= 0 ? pts[sel] : (pts.length ? pts[pts.length - 1] : null), motor: "arm", angle: 90, speed: 200, mode: "after" }); stopSim(); render(); };
  function render(){
    acts = acts.filter(a => a.pt === null || pts.includes(a.pt));
    const sig = pts.length + "|" + acts.length; if (sig !== actsSig) { actsSig = sig; buildActs(); }
    const sg = segs(), st = start();
    c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = "#e7edf3"; c.fillRect(0, 0, cv.width, cv.height);
    if (seasonImg.naturalWidth) c.drawImage(seasonImg, 0, 0, cv.width, cv.height);
    c.strokeStyle = "rgba(255,255,255,.35)"; c.lineWidth = 1; c.beginPath();
    for (let x = 0; x <= FW; x += 200) { c.moveTo(x * S, 0); c.lineTo(x * S, cv.height); } for (let y = 0; y <= FH; y += 200) { c.moveTo(0, y * S); c.lineTo(cv.width, y * S); } c.stroke();
    MIS.forEach((m, i) => { c.beginPath(); c.arc(m[2] * S, m[3] * S, 13, 0, 7); c.fillStyle = i === target ? "#12805c" : "#e8402f"; c.fill(); c.fillStyle = "#fff"; c.font = "bold 11px Heebo"; c.textAlign = "center"; c.fillText(m[0], m[2] * S, m[3] * S + 4);
      if (i === target) { c.strokeStyle = "#12805c"; c.setLineDash([4, 3]); c.beginPath(); c.arc(m[2] * S, m[3] * S, R * S, 0, 7); c.stroke(); c.setLineDash([]); } });
    const poly = (x, y, h, fill, stroke) => { const q = corners(x, y, h); c.beginPath(); q.forEach((p, i) => i ? c.lineTo(p[0] * S, p[1] * S) : c.moveTo(p[0] * S, p[1] * S)); c.closePath(); c.fillStyle = fill; c.fill(); c.strokeStyle = stroke; c.lineWidth = 1.5; c.stroke();
      const a = rad(h); c.beginPath(); c.moveTo(x * S, y * S); c.lineTo((x + Math.sin(a) * 60) * S, (y - Math.cos(a) * 60) * S); c.stroke(); };
    c.strokeStyle = "#0b2447"; c.lineWidth = 3; c.beginPath(); c.moveTo(st.x * S, st.y * S); pts.forEach(p => c.lineTo(p[0] * S, p[1] * S)); c.stroke();
    sg.forEach(s => poly(s.to[0], s.to[1], s.h, "rgba(11,36,71,.15)", "#0b2447"));
    poly(st.x, st.y, st.h, "rgba(232,64,47,.3)", "#e8402f");
    pts.forEach((p, i) => { c.beginPath(); c.arc(p[0] * S, p[1] * S, 8, 0, 7); c.fillStyle = i === sel ? "#e8402f" : "#0b2447"; c.fill(); c.fillStyle = "#fff"; c.font = "bold 10px Heebo"; c.textAlign = "center"; c.fillText(i + 1, p[0] * S, p[1] * S + 3.5); });
    const mk = (pt, n) => { const q = pt || [st.x, st.y]; c.beginPath(); c.arc(q[0] * S + 14, q[1] * S - 14, 9, 0, 7); c.fillStyle = "#a15c00"; c.fill(); c.fillStyle = "#fff"; c.font = "bold 10px Heebo"; c.textAlign = "center"; c.fillText("M" + (n > 1 ? n : ""), q[0] * S + 14, q[1] * S - 11); };
    [null].concat(pts).forEach(pt => { const n = acts.filter(a => a.pt === pt).length; if (n) mk(pt, n); });
    if (trail.length > 1) { c.strokeStyle = "#a15c00"; c.lineWidth = 2; c.beginPath(); trail.forEach((q, i) => i ? c.lineTo(q[0] * S, q[1] * S) : c.moveTo(q[0] * S, q[1] * S)); c.stroke(); }
    if (simPose) poly(simPose.x, simPose.y, simPose.h, simPose.crash ? "rgba(198,40,40,.55)" : "rgba(255,170,0,.55)", "#a15c00");
    if (mA) { c.strokeStyle = "#a15c00"; c.lineWidth = 2.5; c.setLineDash([6, 4]); c.beginPath(); c.moveTo(mA[0] * S, mA[1] * S); if (mB) c.lineTo(mB[0] * S, mB[1] * S); c.stroke(); c.setLineDash([]);
      [mA, mB].forEach(p => { if (p) { c.beginPath(); c.arc(p[0] * S, p[1] * S, 5, 0, 7); c.fillStyle = "#a15c00"; c.fill(); } }); }
    // table + code
    let h = 0, tot = 0, code = "# התחלה: " + ($("plSide").value === "L" ? "שמאל" : "ימין") + " (" + Math.round(st.x) + ", " + Math.round(st.y) + "), זווית " + Math.round(st.h) + "°\n";
    let t = "<tr><th>#</th><th>פנייה °</th><th>נסיעה מ\"מ</th><th>כיוון °</th></tr>";
    sg.forEach((s, i) => { tot += s.dist; t += "<tr><td>" + (i + 1) + "</td><td>" + s.turn.toFixed(0) + "</td><td>" + s.dist.toFixed(0) + "</td><td>" + s.h.toFixed(0) + "</td></tr>"; });
    code += genCode(sg);
    if (!sg.length && !acts.length) code += "# לחצו על המפה כדי להוסיף נקודות\n"; else if (sg.length) t += "<tr><th colspan=2>סה\"כ</th><th>" + tot.toFixed(0) + "</th><th>" + (sg[sg.length - 1].h).toFixed(0) + "</th></tr>";
    $("plTbl").innerHTML = t; $("plCode").textContent = code; $("plWarn").textContent = warnings(sg).join(" | ");
    $("plMeasure").textContent = simMsg ? simMsg : mA && mB ? "מרחק " + Math.hypot(mB[0] - mA[0], mB[1] - mA[1]).toFixed(0) + " מ\"מ | כיוון " + deg(Math.atan2(mB[0] - mA[0], -(mB[1] - mA[1]))).toFixed(0) + "° | ΔX " + (mB[0] - mA[0]).toFixed(0) + " ΔY " + (mB[1] - mA[1]).toFixed(0) : (mode === "measure" ? "לחצו על שתי נקודות למדידה" : "");
  }
  function at(e){ const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * FW, (e.clientY - r.top) / r.height * FH]; }
  const tolMm = () => 18 * FW / cv.getBoundingClientRect().width;
  const segDist = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2));
    return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy); };
  cv.addEventListener("pointerdown", e => { const p = at(e); cv.focus(); stopSim();
    if (mode === "measure") { if (!mA || mB) { mA = p; mB = null; } else mB = p; render(); return; }
    const tol = tolMm(), st = start();
    drag = pts.findIndex(q => Math.hypot(q[0] - p[0], q[1] - p[1]) < tol);
    if (drag < 0 && Math.hypot(st.x - p[0], st.y - p[1]) < Math.max(tol * 2, 60)) drag = -2;
    if (drag === -1) { const path = [[st.x, st.y]].concat(pts);
      for (let i = 0; i < pts.length; i++) if (segDist(p, path[i], path[i + 1]) < tol * 0.8) { pts.splice(i, 0, p); drag = i; break; } }
    if (drag === -1) { pts.push(p); drag = pts.length - 1; }
    sel = drag >= 0 ? drag : -1; cv.setPointerCapture(e.pointerId); render(); });
  cv.addEventListener("pointermove", e => { if (drag >= 0) { const q = at(e); pts[drag][0] = q[0]; pts[drag][1] = q[1]; render(); }
    else if (drag === -2) { const p = at(e); $("plX").value = Math.round(p[0]); $("plY").value = Math.round(p[1]); render(); }
    else if (mode === "measure" && mA && !mB) { const sv = mB; mB = at(e); render(); mB = sv; } });
  cv.addEventListener("pointerup", () => { drag = -1; });
  cv.addEventListener("dblclick", e => { const p = at(e), i = pts.findIndex(q => Math.hypot(q[0] - p[0], q[1] - p[1]) < tolMm()); if (i >= 0) { pts.splice(i, 1); sel = -1; render(); } });
  cv.addEventListener("keydown", e => { if ((e.key === "Delete" || e.key === "Backspace") && sel >= 0) { e.preventDefault(); pts.splice(sel, 1); sel = -1; render(); } });
  function stopSim(){ cancelAnimationFrame(simRaf); simRaf = 0; simPose = null; simMsg = ""; trail = []; $("plStop").disabled = true; $("plSim").disabled = false; }
  $("plStop").onclick = () => { stopSim(); render(); };
  $("plSim").onclick = () => {
    const sg = segs(); if (!sg.length) { simMsg = "אין מסלול להרצה"; render(); simMsg = ""; return; }
    const V = Math.max(10, num("plV")), T = Math.max(10, num("plT")), st = start(), tl = []; let t = 0, h = st.h, pos = { x: st.x, y: st.y, h: st.h };
    const pushAct = list => { const d = Math.max(0, ...list.map(actDur)); if (d > 0) { tl.push({ t0: t, t1: t + d, k: "act", pos: { ...pos } }); t += d; } };
    pushAct(acts.filter(a => a.pt === null));
    sg.forEach(s => { const dt = Math.abs(s.turn) / T; if (dt > 0) { tl.push({ t0: t, t1: t + dt, k: "turn", h0: h, h1: h + s.turn, s }); t += dt; h += s.turn; }
      const dd = s.dist / V; tl.push({ t0: t, t1: t + dd, k: "go", h: s.h, s }); t += dd; pos = { x: s.to[0], y: s.to[1], h: s.h };
      const dr = acts.filter(a => a.pt === s.pt && a.mode === "during"); if (dr.length) { const ex = Math.max(...dr.map(actDur)) - dd; if (ex > 0) { tl.push({ t0: t, t1: t + ex, k: "act", pos: { ...pos } }); t += ex; } }
      pushAct(acts.filter(a => a.pt === s.pt && a.mode !== "during")); });
    const total = t, tm = target === null ? null : MIS[target]; trail = [[st.x, st.y]]; $("plStop").disabled = false; $("plSim").disabled = true;
    const t0 = performance.now();
    const frame = now => { const el = Math.min(total, (now - t0) / 1000), it = tl.find(x => el <= x.t1) || tl[tl.length - 1], f = it.t1 > it.t0 ? (el - it.t0) / (it.t1 - it.t0) : 1;
      let pose; if (it.k === "act") pose = { ...it.pos }; else if (it.k === "turn") pose = { x: it.s.from[0], y: it.s.from[1], h: it.h0 + (it.h1 - it.h0) * f };
      else pose = { x: it.s.from[0] + (it.s.to[0] - it.s.from[0]) * f, y: it.s.from[1] + (it.s.to[1] - it.s.from[1]) * f, h: it.h };
      const hit = MIS.find(m => m !== tm && hitsModel(pose.x, pose.y, pose.h, m)), out = corners(pose.x, pose.y, pose.h).some(q => q[0] < 0 || q[1] < 0 || q[0] > FW || q[1] > FH);
      simPose = pose; if (it.k === "go") trail.push([pose.x, pose.y]);
      if (hit || out) { simPose.crash = true; simMsg = "פגיעה: " + (hit ? "דגם " + hit[0] : "יציאה מהמגרש") + " אחרי " + el.toFixed(1) + " שניות"; $("plStop").disabled = false; $("plSim").disabled = false; render(); return; }
      simMsg = "סימולציה: " + el.toFixed(1) + " מתוך " + total.toFixed(1) + " שניות" + (it.k === "act" ? " | מנוע פועל" : "");
      render(); if (el < total) simRaf = requestAnimationFrame(frame); else { simMsg = "הסתיים ב-" + total.toFixed(1) + " שניות (ללא פגיעות)"; $("plSim").disabled = false; render(); } };
    simRaf = requestAnimationFrame(frame); };
  function setMode(m){ mode = m; mA = mB = null; $("plModePlan").setAttribute("aria-pressed", String(m === "plan")); $("plModeMeasure").setAttribute("aria-pressed", String(m === "measure")); render(); }
  $("plModePlan").onclick = () => setMode("plan"); $("plModeMeasure").onclick = () => setMode("measure");
  $("plUndo").onclick = () => { stopSim(); pts.pop(); sel = -1; render(); }; $("plClear").onclick = () => { stopSim(); pts = []; target = null; sel = -1; mA = mB = null; render(); };
  $("plSide").onchange = () => { $("plX").value = $("plSide").value === "L" ? 270 : FW - 270; $("plY").value = 980; render(); };
  ["plX","plY","plH","plW","plL","plAtt","plAF","plAS"].forEach(id => $(id).addEventListener("input", render));
  $("plSuggest").onclick = () => {
    const i = +misSel.value, m = MIS[i], d = dims(), st = start(), last = pts.length ? pts[pts.length - 1] : [st.x, st.y];
    target = i; const dx = m[2] - last[0], dy = m[3] - last[1], len = Math.hypot(dx, dy) || 1, gap = d.L / 2 + d.F + 30;
    const end = [m[2] - dx / len * Math.max(gap, R * 0.6), m[3] - dy / len * Math.max(gap, R * 0.6)];
    const trial = list => { const saved = pts; pts = saved.concat(list); const ok = !warnings(segs()).some(w => w.includes("דגמים")); pts = saved; return ok; };
    let route = [end];
    if (!trial(route)) { const mx = (last[0] + end[0]) / 2, my = (last[1] + end[1]) / 2, nx = -dy / len, ny = dx / len;
      for (const off of [250, -250, 400, -400, 550, -550]) { const via = [mx + nx * off, my + ny * off]; if (trial([via, end])) { route = [via, end]; break; } } }
    pts = pts.concat(route); render();
  };
  $("plCopy").onclick = () => { const t = $("plCode").textContent; try { navigator.clipboard.writeText(t); } catch (e) { const a = document.createElement("textarea"); a.value = t; document.body.appendChild(a); a.select(); try { document.execCommand("copy"); } catch (x) {} a.remove(); } };
  seasonImg.addEventListener("load", render); render();
})();

pick(1); initSkulpt(); showTab(location.hash.slice(1));
