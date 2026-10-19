// gameplay.js — functional core loop for Calle del Hambre.
// Customer walks to the head of the line → order bubble appears → tap the
// customer to take the order → drag ingredients from grill/trays/bottles onto
// the board → ¡SERVIR! validates vs the order → customer pays in cash bills
// on the counter → tap bills to collect. Functionality over aesthetics.
import * as THREE from './assets/vendor/three.module.js';

const ING = {
  sausage: { icon: '🌭', name: 'carne',    color: '#a8502a' },
  cheese:  { icon: '🧀', name: 'queso',    color: '#f6b735' },
  onion:   { icon: '🧅', name: 'cebolla',  color: '#9a4c91' },
  lettuce: { icon: '🥬', name: 'lechuga',  color: '#77b94f' },
  tomato:  { icon: '🍅', name: 'tomate',   color: '#c9362d' },
  ketchup: { icon: '🥫', name: 'ketchup',  color: '#c92420' },
  mustard: { icon: '🟡', name: 'mostaza',  color: '#e5a719' },
};
const TOPPINGS = ['cheese', 'onion', 'lettuce', 'tomato'];
const SAUCES = ['ketchup', 'mustard'];

function makeOrder() {
  const tops = [...TOPPINGS].sort(() => Math.random() - 0.5).slice(0, 1 + Math.floor(Math.random() * 3));
  const sauces = SAUCES.filter(() => Math.random() < 0.55);
  return { items: ['sausage', ...tops, ...sauces] };
}

const css = `
#ghud { position:fixed; inset:0; pointer-events:none; z-index:30; font-family:-apple-system,'Segoe UI',system-ui,sans-serif; }
#ghud .money { position:absolute; left:calc(48 * var(--ux,1px)); top:calc((var(--top-k,68) + var(--row2-k,52)) * var(--uy,1px));
  font-weight:800; font-size:calc(26px * var(--s,1)); color:#fff; text-shadow:0 2px 6px rgba(0,0,0,.5);
  transition:transform .15s; }
#ghud .money.bump { transform:scale(1.3); }
#ghud .ticket { position:absolute; left:50%; transform:translateX(-50%); top:calc(var(--top-k,68) * var(--uy,1px));
  width:calc(200px * var(--s,1)); background:rgba(255,249,236,.96); border:2px solid rgba(0,0,0,.18);
  border-radius:calc(18px * var(--s,1)); padding:calc(6px * var(--s,1)) calc(10px * var(--s,1)); text-align:center;
  opacity:0; transition:opacity .25s; box-shadow:0 6px 18px rgba(0,0,0,.25); }
#ghud .ticket.on { opacity:1; }
#ghud .t-items { font-size:calc(25px * var(--s,1)); line-height:1.35; display:flex; flex-wrap:wrap; gap:calc(4px * var(--s,1)); justify-content:center; }
#ghud .t-items span.done { opacity:.3; filter:grayscale(1); }
#ghud .t-bar { height:calc(5px * var(--s,1)); background:#e8dcc8; border-radius:3px; margin-top:calc(4px * var(--s,1)); overflow:hidden; }
#ghud .t-bar i { display:block; height:100%; background:#67b94f; width:100%; transition:width .3s linear; }
#ghud .t-bar i.low { background:#e05a3a; }
#ghud .dock { position:absolute; left:0; right:0; margin-inline:auto; width:fit-content; display:flex; gap:calc(12px * var(--s,1));
  bottom:calc(var(--bot-k,196) * var(--uy,1px) + env(safe-area-inset-bottom,0px));
  background:rgba(10,18,6,.55); border:2px solid rgba(255,255,255,.14); border-radius:calc(44px * var(--s,1));
  padding:calc(8px * var(--s,1)) calc(14px * var(--s,1)); backdrop-filter:blur(3px); pointer-events:auto; }
#ghud .dock button { border:0; border-radius:calc(30px * var(--s,1)); font-weight:800; font-family:inherit;
  font-size:calc(20px * var(--s,1)); padding:calc(10px * var(--s,1)) calc(18px * var(--s,1)); cursor:pointer; }
#ghud #g-serve { background:#67b94f; color:#fff; }
#ghud #g-serve:disabled { background:#7a8a72; color:#c9d4c2; }
#ghud #g-serve.ready { animation:pulse 1s infinite; }
#ghud #g-trash { background:#4a5460; color:#fff; }
@keyframes pulse { 50% { transform:scale(1.08); } }
#ghud .toast { position:absolute; left:0; right:0; margin-inline:auto; width:fit-content; max-width:calc(320px * var(--s,1));
  top:calc(160 * var(--uy,1px)); background:rgba(20,26,18,.88); color:#fff; font-weight:700;
  font-size:calc(18px * var(--s,1)); padding:calc(10px * var(--s,1)) calc(16px * var(--s,1)); border-radius:calc(14px * var(--s,1));
  opacity:0; transition:opacity .2s; text-align:center; }
#ghud .rail { position:absolute; left:0; right:0; margin-inline:auto; width:fit-content; max-width:96vw; display:flex; flex-wrap:nowrap;
  gap:calc(7px * var(--s,1)); bottom:calc((var(--bot-k,196) + 66) * var(--uy,1px) + env(safe-area-inset-bottom,0px));
  background:rgba(10,18,6,.55); border:2px solid rgba(255,255,255,.14); border-radius:calc(20px * var(--s,1));
  padding:calc(8px * var(--s,1)) calc(10px * var(--s,1)); backdrop-filter:blur(3px); pointer-events:auto; }
#ghud .chip { width:calc(46px * var(--s,1)); height:calc(46px * var(--s,1)); border-radius:calc(12px * var(--s,1));
  background:var(--c); border:calc(2px * var(--s,1)) solid rgba(255,255,255,.35); display:flex; flex-direction:column;
  align-items:center; justify-content:center; font-size:calc(22px * var(--s,1)); cursor:grab; touch-action:none;
  box-shadow:inset 0 -3px 0 rgba(0,0,0,.25), 0 3px 8px rgba(0,0,0,.3); }
#ghud .chip i { font-style:normal; font-weight:800; font-size:calc(9px * var(--s,1)); color:#fff;
  text-shadow:0 1px 2px rgba(0,0,0,.7); line-height:1; }
#ghud .chip:active { transform:scale(.92); }
#ghud .ghost { position:fixed; pointer-events:none; font-size:calc(46px * var(--s,1)); z-index:40;
  transform:translate(-50%,-110%); filter:drop-shadow(0 4px 6px rgba(0,0,0,.4)); display:none; }
#ghud .dropzone { position:fixed; pointer-events:none; border:calc(3px * var(--s,1)) dashed rgba(255,255,255,.75);
  border-radius:calc(14px * var(--s,1)); display:none; z-index:35; background:rgba(255,255,255,.06); }
#ghud .dropzone.hot { border-color:#a6ff7a; background:rgba(166,255,122,.18); }
#ghud .float { position:fixed; pointer-events:none; font-weight:800; color:#a6ff7a; font-size:calc(24px * var(--s,1));
  text-shadow:0 2px 4px rgba(0,0,0,.6); transition:transform .8s ease-out,opacity .8s; z-index:40; }
`;

export function createGameplay({ prep, canvas }) {
  const q = new URLSearchParams(location.search);
  if (q.has('nocart') || q.has('seg') || q.get('view') === 'carts') return { update() {} };

  // ---------- DOM HUD ----------
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
  const hud = document.createElement('div');
  hud.id = 'ghud';
  hud.innerHTML = `
    <div class="money">$0</div>
    <div class="ticket"><div class="t-items"></div><div class="t-bar"><i></i></div></div>
    <div class="rail">${Object.entries(ING).map(([k, v]) =>
      `<div class="chip" data-ing="${k}" style="--c:${v.color}" title="${v.name}">${v.icon}<i>${v.name}</i></div>`).join('')}</div>
    <div class="dock"><button id="g-serve" disabled>¡SERVIR!</button><button id="g-trash">🗑</button></div>
    <div class="toast"></div>
    <div class="ghost"></div>
    <div class="dropzone"></div>`;
  document.body.appendChild(hud);
  const moneyEl = hud.querySelector('.money');
  const ticketEl = hud.querySelector('.ticket');
  const tItems = hud.querySelector('.t-items');
  const tBar = hud.querySelector('.t-bar i');
  const serveBtn = hud.querySelector('#g-serve');
  const trashBtn = hud.querySelector('#g-trash');
  const toastEl = hud.querySelector('.toast');
  const ghostEl = hud.querySelector('.ghost');
  const dropEl = hud.querySelector('.dropzone');
  let toastT = null;
  const toast = (msg, ms = 1800) => {
    toastEl.textContent = msg; toastEl.style.opacity = 1;
    clearTimeout(toastT); toastT = setTimeout(() => { toastEl.style.opacity = 0; }, ms);
  };
  const floatText = (txt, x, y, color = '#a6ff7a') => {
    const el = document.createElement('div');
    el.className = 'float'; el.textContent = txt; el.style.color = color;
    el.style.left = x + 'px'; el.style.top = y + 'px';
    document.body.appendChild(el);
    requestAnimationFrame(() => { el.style.transform = 'translateY(-60px)'; el.style.opacity = 0; });
    setTimeout(() => el.remove(), 850);
  };

  // ---------- state ----------
  let money = 0;
  let current = null;        // front customer member with live order
  const made = [];           // ingredient ids dropped on the bun
  const bills = [];          // { mesh, value }
  const asmGroup = new THREE.Group();
  prep.parts.food.add(asmGroup);
  let asmY = prep.interact.assembly ? prep.interact.assembly.bunTopY : 1.56;
  let handover = null;       // { t, from, to }
  let zones = null;          // screen-space hit rects (camera is static)
  let drag = null;           // { ing, from }
  const grill = { slots: [], rawMat: new THREE.MeshStandardMaterial({ color: 0xd98f89, roughness: 0.6 }), doneMat: new THREE.MeshStandardMaterial({ color: 0x8a4a26, roughness: 0.55 }) };

  // ---------- world → screen helpers ----------
  const w2s = (v3) => {
    const v = v3.clone().project(prep.camera);
    return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight };
  };
  function objRect(obj) {
    const b = new THREE.Box3().setFromObject(obj);
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const cx of [b.min.x, b.max.x]) for (const cy of [b.min.y, b.max.y]) for (const cz of [b.min.z, b.max.z]) {
      const p = w2s(new THREE.Vector3(cx, cy, cz));
      x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y);
    }
    return { x0, y0, x1, y1 };
  }
  const inRect = (r, x, y, pad = 0) => x >= r.x0 - pad && x <= r.x1 + pad && y >= r.y0 - pad && y <= r.y1 + pad;
  function ensureZones() {
    if (zones) return;
    zones = {
      board: objRect(prep.interact.board),
      sources: prep.interact.sources.map(o => ({ ing: o.userData.ing, rect: objRect(o) })),
    };
    zones.grill = zones.sources.find(s => s.ing === 'sausage').rect;
    // patty slots on the 3D grill (local food coords — parts.food is shifted)
    for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) {
      grill.slots.push({ x: -1.78 + c * 0.42, z: -0.42 + r * 0.72, patty: null });
    }
  }
  addEventListener('resize', () => { zones = null; });

  // ---------- order bubble (3D sprite on the customer's head) ----------
  function bubbleSprite(items, gs = 1.55) {
    const c = document.createElement('canvas');
    c.width = 96 + items.length * 76; c.height = 170;
    const ctx = c.getContext('2d');
    ctx.fillStyle = 'rgba(255,252,244,.97)';
    ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.roundRect(8, 8, c.width - 16, 116, 30); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(c.width / 2 - 20, 120); ctx.lineTo(c.width / 2 + 20, 120); ctx.lineTo(c.width / 2, 162); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.font = '58px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    items.forEach((k, i) => ctx.fillText(ING[k].icon, 48 + 38 + i * 76, 68));
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
    sp.scale.set(c.width / 340 / gs, c.height / 340 / gs, 1);
    sp.position.set(0.15, 2.5 / gs, 0);
    sp.renderOrder = 20;
    return sp;
  }

  // ---------- ticket ----------
  function refreshTicket() {
    if (!current || !current.order) { ticketEl.classList.remove('on'); return; }
    ticketEl.classList.add('on');
    const counts = {};
    for (const k of made) counts[k] = (counts[k] || 0) + 1;
    const used = { ...counts };
    tItems.innerHTML = '';
    for (const k of current.order.items) {
      const s = document.createElement('span');
      s.textContent = ING[k].icon;
      if ((used[k] || 0) > 0) { s.className = 'done'; used[k]--; }
      tItems.appendChild(s);
    }
    const done = made.length === current.order.items.length &&
      [...new Set(current.order.items)].every(k => (counts[k] || 0) === 1);
    serveBtn.disabled = !current.taken || made.length === 0;
    serveBtn.classList.toggle('ready', done);
  }

  // ---------- assembly layers ----------
  const layerBuilders = {
    sausage: (g, y, m) => { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.62, 12), m.sausage ?? new THREE.MeshStandardMaterial({ color: 0xb84a22, roughness: 0.55 })); s.rotation.z = Math.PI / 2; s.rotation.y = -0.1; s.position.y = y; s.castShadow = true; g.add(s); },
    cheese: (g, y, m) => { const s = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.028, 0.36), m.cheese); s.rotation.y = 0.12; s.position.y = y; s.castShadow = true; g.add(s); },
    onion: (g, y, m) => { for (let i = 0; i < 3; i++) { const s = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.02, 8, 18), m.onion); s.rotation.x = Math.PI / 2; s.position.set(-0.22 + i * 0.22, y, (i % 2) * 0.1 - 0.05); g.add(s); } },
    lettuce: (g, y, m) => { for (let i = 0; i < 4; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), m.lettuce); s.scale.set(1.4, 0.2, 0.75); s.position.set(-0.3 + i * 0.2, y, (i % 2) * 0.1 - 0.05); g.add(s); } },
    tomato: (g, y, m) => { for (let i = 0; i < 3; i++) { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.028, 14), m.tomato); s.position.set(-0.22 + i * 0.22, y, i % 2 ? 0.09 : -0.06); g.add(s); } },
    ketchup: (g, y, m) => g.add(zigzag(y, m.sauceRed)),
    mustard: (g, y, m) => g.add(zigzag(y, m.sauceYellow)),
  };
  function zigzag(y, mat) {
    const pts = [-0.4, -0.2, 0, 0.2, 0.4].map((x, i) => new THREE.Vector3(x, y + 0.02, (i % 2 ? 0.13 : -0.11)));
    const t = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 30, 0.026, 8), mat);
    return t;
  }
  function addLayer(ing) {
    const g = new THREE.Group();
    g.name = 'asm:' + ing;
    g.position.set(prep.interact.assembly.cx, 0, prep.interact.assembly.cz);
    layerBuilders[ing]?.(g, asmY, prep.mats);
    asmGroup.add(g);
    asmY += 0.05;
    made.push(ing);
  }
  function clearAssembly() {
    while (asmGroup.children.length) asmGroup.remove(asmGroup.children[0]);
    made.length = 0;
    asmY = prep.interact.assembly.bunTopY;
  }

  // ---------- bills ----------
  const billMat = new THREE.MeshStandardMaterial({ color: 0x3f7d4e, roughness: 0.6 });
  const billBand = new THREE.MeshStandardMaterial({ color: 0xd8ecd2, roughness: 0.6 });
  function spawnBills(x) {
    const total = current.order.price;
    const vals = [Math.ceil(total / 2), Math.floor(total / 2 / 2), total - Math.ceil(total / 2) - Math.floor(total / 2 / 2)];
    vals.forEach((v, i) => {
      if (v <= 0) return;
      const g = new THREE.Group();
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.008, 0.13), billMat);
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.009, 0.131), billBand);
      g.add(b, band);
      g.position.set(THREE.MathUtils.clamp(x - 0.3 + i * 0.3, -1.9, 1.9), 1.41, 0.95 + (i % 2) * 0.18);
      g.rotation.y = (Math.random() - 0.5) * 0.8;
      g.userData.bill = true;
      prep.parts.food.add(g);
      bills.push({ mesh: g, value: v });
    });
  }
  function collectBill(bill) {
    const p = w2s(bill.mesh.getWorldPosition(new THREE.Vector3()));
    prep.parts.food.remove(bill.mesh);
    bills.splice(bills.indexOf(bill), 1);
    money += bill.value;
    moneyEl.textContent = '$' + money;
    moneyEl.classList.remove('bump'); void moneyEl.offsetWidth; moneyEl.classList.add('bump');
    floatText('+$' + bill.value, p.x - 20, p.y - 30);
  }

  // ---------- order lifecycle ----------
  prep.hooks.frontReady = (m) => {
    const order = makeOrder();
    order.price = 5 + order.items.length - 1; // $5 + $1/extra ingredient
    m.order = order;
    current = m;
    m.bubble = bubbleSprite(order.items, m.api.group.scale.x || 1.55);
    m.api.group.add(m.bubble);
    toast('¡Cliente nuevo! Tocalo para tomar el pedido 👆');
  };
  prep.hooks.orderExpired = (m) => {
    if (m === current) { current = null; refreshTicket(); }
    if (m.bubble) { m.api.group.remove(m.bubble); m.bubble = null; }
    toast('Se fue sin pedir... 😤');
  };
  const front = () => prep.queue.find(m => m.state === 'wait' && m.slot === 0);
  function takeOrder(m) {
    m.taken = true;
    if (m.bubble) { m.api.group.remove(m.bubble); m.bubble = null; }
    m.api.talk();
    toast('Pedido tomado ✍️ — arrastrá los ingredientes al pan');
    refreshTicket();
  }

  // ---------- pointer handling ----------
  const showDrop = (r) => {
    dropEl.style.display = 'block';
    dropEl.style.left = (r.x0 - 14) + 'px'; dropEl.style.top = (r.y0 - 14) + 'px';
    dropEl.style.width = (r.x1 - r.x0 + 28) + 'px'; dropEl.style.height = (r.y1 - r.y0 + 28) + 'px';
    dropEl.classList.remove('hot');
  };
  function startDrag(ing, x, y, from = 'chip') {
    drag = { ing, from };
    ghostEl.textContent = ING[ing].icon;
    ghostEl.style.display = 'block';
    ghostEl.style.left = x + 'px'; ghostEl.style.top = y + 'px';
    // raw meat goes to the grill; cooked patties and toppings go to the bun
    showDrop(ing === 'sausage' && from === 'chip' ? zones.grill : zones.board);
  }
  function endDrag(x, y) {
    const d = drag; drag = null;
    ghostEl.style.display = 'none';
    dropEl.style.display = 'none';
    if (!d) return;
    // raw sausage → drop on the grill to cook
    if (d.ing === 'sausage' && d.from === 'chip') {
      if (!inRect(zones.grill, x, y, 26)) return;
      const slot = grill.slots.find(s => !s.patty);
      if (!slot) { toast('¡La parrilla está llena!'); return; }
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.045, 14), grill.rawMat.clone());
      p.position.set(slot.x, 1.40, slot.z);
      p.castShadow = true;
      prep.parts.food.add(p);
      slot.patty = { mesh: p, t: 0, done: false };
      return;
    }
    // cooked patty → the bun
    if (d.from === 'patty') {
      if (!inRect(zones.board, x, y, 26)) return;
      if (!current?.taken) { toast('Primero tomale el pedido 👆'); return; }
      const slot = grill.slots.find(s => s.patty === d.patty);
      if (slot) { prep.parts.food.remove(d.patty.mesh); slot.patty = null; }
      addLayer('sausage');
      refreshTicket();
      return;
    }
    // toppings/sauces → the bun
    if (!inRect(zones.board, x, y, 26)) return;
    if (!current?.taken) { toast('Primero tomale el pedido 👆'); return; }
    if (made.length >= current.order.items.length + 2) { toast('¡Ya está muy cargado! 🗑 para tirar'); return; }
    addLayer(d.ing);
    refreshTicket();
  }
  // colored ingredient chips — the big, obvious drag areas (colors swap for
  // real food images later: each chip is just --c + an icon + a label)
  hud.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('pointerdown', (e) => {
      ensureZones();
      if (!current?.taken) { toast('Primero tomale el pedido 👆'); return; }
      e.preventDefault();
      startDrag(chip.dataset.ing, e.clientX, e.clientY);
    });
  });

  let downAt = null;
  canvas.addEventListener('pointerdown', (e) => {
    ensureZones();
    const x = e.clientX, y = e.clientY;
    downAt = { x, y, t: performance.now() };
    // tap customer to take the order
    const f = front();
    if (f && f.order && !f.taken) {
      const hp = w2s(f.api.group.position.clone().add(new THREE.Vector3(0, 1.9, 0)));
      if (Math.hypot(hp.x - x, hp.y - y) < 95 * (window.SnapUISync?.metrics?.scale ?? 1)) { takeOrder(f); return; }
    }
    // tap a bill to collect
    let hit = null, hd = 65;
    for (const b of bills) {
      const p = w2s(b.mesh.getWorldPosition(new THREE.Vector3()));
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < hd) { hd = d; hit = b; }
    }
    if (hit) { collectBill(hit); return; }
    // grab a cooked patty off the grill
    let patty = null, pd = 60;
    for (const s of grill.slots) {
      if (!s.patty?.done) continue;
      const p = w2s(s.patty.mesh.getWorldPosition(new THREE.Vector3()));
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < pd) { pd = d; patty = s.patty; }
    }
    if (patty) { startDrag('sausage', x, y, 'patty'); drag.patty = patty; return; }
    // start a drag from a 3D ingredient source on the counter too
    const src = zones.sources.find(s => inRect(s.rect, x, y, 8));
    if (src) {
      if (!current?.taken) { toast('Primero tomale el pedido al cliente 👆'); return; }
      if (src.ing === 'sausage') { toast('La carne va a la parrilla 🥩 → esperá que se cocine'); }
      startDrag(src.ing, x, y);
    }
  });
  addEventListener('pointermove', (e) => {
    if (!drag) return;
    ghostEl.style.left = e.clientX + 'px'; ghostEl.style.top = e.clientY + 'px';
    const r = (drag.ing === 'sausage' && drag.from === 'chip') ? zones.grill : zones.board;
    dropEl.classList.toggle('hot', inRect(r, e.clientX, e.clientY, 26));
  });
  addEventListener('pointerup', (e) => { if (drag) endDrag(e.clientX, e.clientY); });

  // ---------- serve ----------
  serveBtn.addEventListener('click', () => {
    const f = front();
    if (!f || f !== current || !f.taken || made.length === 0) return;
    const req = [...f.order.items].sort().join();
    const got = [...made].sort().join();
    if (req === got) {
      // correct! hand the sandwich over, customer pays and goes to eat
      f.state = 'served'; f.t = 1.4; f.orderAsked = false; f.taken = false;
      f.api.setMood('happy'); f.api.setIndicator('happy', 1);
      if (f.orderT > 22) f.order.price += 2; // speed tip
      handover = {
        t: 0,
        from: asmGroup.position.clone(),
        to: new THREE.Vector3(f.api.group.position.x, 1.45, f.api.group.position.z - 5.5),
      };
      spawnBills(f.api.group.position.x);
      current = null;
      refreshTicket();
      toast('¡Perfecto! 💸 dejó la plata en el mostrador');
    } else {
      f.api.setMood('angry'); f.api.setIndicator('angry', -1);
      setTimeout(() => { if (f.state === 'wait') { f.api.setMood('neutral'); f.api.setIndicator(null); } }, 2200);
      toast('¡No es eso! 😡 revisá el ticket o tirá 🗑');
    }
  });
  trashBtn.addEventListener('click', () => {
    if (made.length === 0) return;
    clearAssembly();
    refreshTicket();
    toast('Al tacho 🗑 — armalo de nuevo');
  });

  // ---------- per-frame ----------
  return {
    update(dt) {
      ensureZones();
      // patties cook on the grill: pink → browned over ~4s
      for (const s of grill.slots) {
        const p = s.patty;
        if (!p || p.done) continue;
        p.t += dt;
        const k = Math.min(1, p.t / 4);
        p.mesh.material.color.lerpColors(new THREE.Color(0xd98f89), new THREE.Color(0x8a4a26), k);
        if (k >= 1) { p.done = true; toast('¡Carne lista! Arrastrala al pan 🥩'); }
      }
      // patience bar on the ticket
      if (current?.orderT !== undefined && current.taken) {
        const frac = Math.max(0, current.orderT / 45);
        tBar.style.width = (frac * 100) + '%';
        tBar.classList.toggle('low', frac < 0.3);
      }
      // sandwich handover flight to the customer's hands
      if (handover) {
        handover.t += dt * 2.2;
        const k = Math.min(1, handover.t);
        asmGroup.position.lerpVectors(handover.from, handover.to, k);
        asmGroup.position.y = Math.sin(k * Math.PI) * 0.5;
        if (k >= 1) { clearAssembly(); asmGroup.position.set(0, 0, 0); handover = null; }
      }
    },
    get money() { return money; },
    get _dbg() { ensureZones(); return { zones, made, bills, grill: grill.slots, current }; },
  };
}
