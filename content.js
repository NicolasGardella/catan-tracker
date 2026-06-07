// ============================================================
// Catan Tracker para Colonist.io
// Cuenta las cartas de cada jugador leyendo el log de eventos
// ============================================================

const RESOURCES = ['Lumber', 'Brick', 'Wool', 'Grain', 'Ore'];

// Estado: { nombre: { Lumber, Brick, Wool, Grain, Ore, unknown } }
const players = {};

// Nombre real del jugador local (para unificar "you"/"You")
let SELF = null;

// Color de cada jugador (tomado del log del juego): { nombre: "#RRGGBB" }
const playerColors = {};

// Índices de mensajes ya procesados (evita doble conteo por scroll virtual)
const processedIndices = new Set();

function ensurePlayer(name) {
  if (!players[name]) {
    players[name] = {
      Lumber: 0, Brick: 0, Wool: 0, Grain: 0, Ore: 0, unknown: 0, stolen: 0,
      // Construcciones y cartas de desarrollo (para el tooltip)
      roads: 0, settlements: 0, cities: 0, devBought: 0,
      knights: 0, monopoly: 0, yearPlenty: 0, roadBuilding: 0
    };
  }
  return players[name];
}

// Normaliza el nombre: "you"/"You" -> nombre real del jugador local
function norm(name) {
  if (!name) return name;
  if (name.toLowerCase() === 'you') return SELF || 'You';
  return name;
}

function spend(name, resource) {
  const p = ensurePlayer(norm(name));
  if (p[resource] > 0) p[resource]--;
  else if (p.unknown > 0) p.unknown--;
}

function gain(name, resource) {
  ensurePlayer(norm(name))[resource]++;
}

// Robo oculto: a la víctima le quitaron 1 carta de tipo desconocido.
// No tocamos sus recursos conocidos; solo marcamos +1 en "le robaron" (🥷).
function loseHiddenCard(name) {
  ensurePlayer(norm(name)).stolen++;
}

// Busca el primer recurso entre las imágenes de un elemento (case-insensitive).
// Útil para el Monopolio, cuyo ícono usa alt en minúscula (ore, brick, ...).
function resourceFromImgs(el) {
  for (const img of el.querySelectorAll('img')) {
    const a = (img.alt || '').toLowerCase();
    const found = RESOURCES.find(r => r.toLowerCase() === a);
    if (found) return found;
  }
  return null;
}

// ============================================================
// Parser: recorre los nodos del mensaje EN ORDEN
// ============================================================
function parseMessage(span) {
  const result = { text: span.innerText.trim(), names: [], gave: [], got: [], all: [] };
  let section = 'got';

  span.childNodes.forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      const t = node.textContent.toLowerCase();
      if (/\bgave\b/.test(t)) section = 'gave';
      if (/\b(got|took|received)\b/.test(t)) section = 'got';
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      if (node.tagName === 'SPAN' && /font-weight/i.test(node.getAttribute('style') || '')) {
        const n = node.innerText.trim();
        if (n) {
          result.names.push(n);
          // Captura el color del jugador (ej: "color:#CF4449")
          const match = (node.getAttribute('style') || '').match(/color:\s*(#[0-9a-fA-F]{3,6})/);
          if (match) playerColors[n] = match[1];
        }
      }
      if (node.tagName === 'IMG' && RESOURCES.includes(node.alt)) {
        result[section].push(node.alt);
        result.all.push(node.alt);
      }
    }
  });
  return result;
}

// Detecta el nombre del jugador local (avatar icon_player_loggedin)
function detectSelf(msgEl) {
  if (SELF) return;
  const avatar = msgEl.querySelector('img.avatarImage-JNCoQelY, [class*="avatarImage-"]');
  if (avatar && /icon_player_loggedin/.test(avatar.src)) {
    const nameSpan = msgEl.querySelector('span[style*="font-weight"]');
    if (nameSpan) {
      SELF = nameSpan.innerText.trim();
      const match = (nameSpan.getAttribute('style') || '').match(/color:\s*(#[0-9a-fA-F]{3,6})/);
      if (match) playerColors[SELF] = match[1];
      // Fusiona la fila "You" huérfana (creada antes de detectar el nombre) en SELF
      if (players['You'] && SELF !== 'You') {
        const dest = ensurePlayer(SELF);
        Object.keys(players['You']).forEach(k => { dest[k] += players['You'][k]; });
        delete players['You'];
      }
      console.log('%c[Catan Tracker] Jugador local detectado: ' + SELF, 'color: #2ecc71; font-weight: bold');
    }
  }
}

// ============================================================
// Procesa un mensaje del log
// ============================================================
function processMessage(msgEl) {
  detectSelf(msgEl);

  const span = msgEl.querySelector('[class*="messagePart-"]');
  if (!span) return;

  const m = parseMessage(span);
  const text = m.text;
  if (!text) return;

  // actor = quien ejecuta la acción
  const actor = /^you\b/i.test(text) ? 'You' : m.names[0];

  // --- COMERCIO: "X gave ... and got ... from Y" / "X gave bank ... and took ..." ---
  if (/\bgave\b/.test(text) && /\b(got|took)\b/i.test(text)) {
    const partner = /from you\b/i.test(text) ? 'You'
                   : (m.names.length >= 2 ? m.names[m.names.length - 1] : null);
    m.gave.forEach(r => spend(actor, r));
    m.got.forEach(r => gain(actor, r));
    if (partner) {
      m.gave.forEach(r => gain(partner, r));
      m.got.forEach(r => spend(partner, r));
    }
  }

  // --- MONOPOLIO: "X stole N <recurso>" (toma TODO ese recurso de todos) ---
  else if (/\bstole\s+\d+/i.test(text)) {
    const amount = parseInt(text.match(/stole\s+(\d+)/i)[1], 10);
    const res = resourceFromImgs(msgEl);  // el ícono viene en minúscula (ore, brick...)
    if (res) {
      // Todos los demás pierden TODO ese recurso
      Object.keys(players).forEach(n => { if (norm(n) !== norm(actor)) players[n][res] = 0; });
      // El que jugó el monopolio gana el total robado
      ensurePlayer(norm(actor))[res] += amount;
    }
  }

  // --- ROBO (ladrón) ---
  else if (/\bstole\b/i.test(text)) {
    const thief = actor;
    const victim = /from you\b/i.test(text) ? 'You' : m.names[m.names.length - 1];
    if (m.all.length > 0) {
      m.all.forEach(r => { gain(thief, r); spend(victim, r); });
    } else {
      ensurePlayer(norm(thief)).unknown++;
      loseHiddenCard(victim);
    }
  }

  // --- GANAR recursos ---
  else if (/\bgot\b|received starting resources/i.test(text) && actor && m.all.length) {
    m.all.forEach(r => gain(actor, r));
  }

  // --- DESCARTAR (por 7) ---
  else if (/\bdiscarded\b/i.test(text) && actor && m.all.length) {
    m.all.forEach(r => spend(actor, r));
  }

  // --- COLOCACIÓN INICIAL (gratis, usa "placed" en vez de "built") ---
  else if (/placed a Road/i.test(text) && actor) {
    ensurePlayer(norm(actor)).roads++;
  }
  else if (/placed a Settlement/i.test(text) && actor) {
    ensurePlayer(norm(actor)).settlements++;
  }

  // --- CONSTRUIR ---
  else if (/built a Road/i.test(text) && actor) {
    spend(actor, 'Lumber'); spend(actor, 'Brick');
    ensurePlayer(norm(actor)).roads++;
  }
  else if (/built a Settlement/i.test(text) && actor) {
    spend(actor, 'Lumber'); spend(actor, 'Brick'); spend(actor, 'Wool'); spend(actor, 'Grain');
    ensurePlayer(norm(actor)).settlements++;
  }
  else if (/built a City/i.test(text) && actor) {
    spend(actor, 'Grain'); spend(actor, 'Grain'); spend(actor, 'Ore'); spend(actor, 'Ore'); spend(actor, 'Ore');
    const p = ensurePlayer(norm(actor));
    p.cities++;
    if (p.settlements > 0) p.settlements--;  // la ciudad reemplaza una casa
  }
  // Carta de desarrollo comprada (mensaje: "X bought 🃏")
  else if (/\bbought\b/i.test(text) && actor) {
    spend(actor, 'Wool'); spend(actor, 'Grain'); spend(actor, 'Ore');
    ensurePlayer(norm(actor)).devBought++;
  }
  // Carta de desarrollo usada (mensaje: "X used <carta>")
  // El tipo de carta está en un div hermano (tooltipTrigger), no en el messagePart.
  // Por eso analizamos TODO el mensaje (texto + alt + src de todas sus imágenes).
  else if (/\bused\b/i.test(text) && actor) {
    const p = ensurePlayer(norm(actor));
    const imgInfo = [...msgEl.querySelectorAll('img')].map(i => (i.alt || '') + ' ' + (i.src || '')).join(' ');
    const blob = (msgEl.innerText + ' ' + imgInfo).toLowerCase();
    if (/knight|soldier/.test(blob)) p.knights++;
    else if (/monopoly/.test(blob)) p.monopoly++;
    else if (/plenty/.test(blob)) p.yearPlenty++;
    else if (/road.?building/.test(blob)) p.roadBuilding++;
    else console.log('%c[Catan Tracker] Dev card usada NO reconocida:', 'color:#e74c3c', text, '\nHTML:', msgEl.innerHTML);
  }

  // Limpieza de negativos
  Object.values(players).forEach(p =>
    Object.keys(p).forEach(k => { if (p[k] < 0) p[k] = 0; })
  );

  renderOverlay();
}

// Procesa un feedMessage solo si su data-index no fue visto antes
function handleFeedMessage(msgEl) {
  const indexEl = msgEl.closest('[data-index]');
  const idx = indexEl ? indexEl.dataset.index : null;
  if (idx !== null) {
    if (processedIndices.has(idx)) return; // ya contado
    processedIndices.add(idx);
  }
  processMessage(msgEl);
}

// ============================================================
// Observador del log (scroll virtual)
// ============================================================
function startObserving() {
  const container = document.querySelector('[class*="gameFeedsContainer-"]');
  if (!container) { setTimeout(startObserving, 2000); return; }

  console.log('%c[Catan Tracker] Log encontrado. Observando...', 'color: #2ecc71; font-weight: bold');

  container.querySelectorAll('[class*="feedMessage-"]').forEach(handleFeedMessage);

  new MutationObserver(muts => {
    muts.forEach(mut => mut.addedNodes.forEach(node => {
      if (node.nodeType !== 1) return;
      const msgs = node.matches?.('[class*="feedMessage-"]')
        ? [node]
        : [...(node.querySelectorAll?.('[class*="feedMessage-"]') || [])];
      msgs.forEach(handleFeedMessage);
    }));
  }).observe(container, { childList: true, subtree: true });

  createOverlay();
  renderOverlay();

  // Lee TODO el historial al iniciar (por si se cargó a mitad de partida)
  reloadHistory();

  // Envía el mensaje automático en el chat (una vez por partida)
  setTimeout(() => maybeGreet(), 6000);

  // Auto-reconciliación periódica + reenvío del mensaje cada 300 mensajes de log
  setInterval(() => {
    reconcileWithGame();
    renderOverlay();
    if (greeted && processedIndices.size - lastGreetSize >= 300) {
      sendChat(GREETING);
      lastGreetSize = processedIndices.size;
      console.log('%c[Catan Tracker] Mensaje reenviado (cada 300 msgs)', 'color:#2ecc71');
    }
  }, 1500);
}

// ============================================================
// Overlay visual
// ============================================================
const ICON = { Lumber: '🌲', Brick: '🧱', Wool: '🐑', Grain: '🌾', Ore: '⛏️', unknown: '❓', stolen: '🥷' };
const TIP = {
  Lumber: 'Madera',
  Brick: 'Ladrillo',
  Wool: 'Lana / oveja',
  Grain: 'Trigo',
  Ore: 'Piedra / mineral',
  unknown: 'Cartas que robó (tipo no identificado)',
  stolen: 'Cartas que le robaron (tipo no identificado)'
};
const COLS = [...RESOURCES, 'unknown', 'stolen'];

function createOverlay() {
  if (document.getElementById('catan-tracker-overlay')) return;
  const div = document.createElement('div');
  div.id = 'catan-tracker-overlay';
  div.innerHTML = `<div id="ct-header">📊 Catan Tracker <span><span id="ct-reload" title="Releer todo el historial">🔄</span> <span id="ct-close">✕</span></span></div><table id="ct-table"></table>`;
  document.body.appendChild(div);

  const style = document.createElement('style');
  style.textContent = `
    #catan-tracker-overlay { position: fixed; top: 80px; left: 10px; z-index: 999999;
      background: rgba(26,26,46,0.95); color: #eee; font-family: sans-serif; font-size: 13px;
      border: 1px solid #e67e22; border-radius: 8px; padding: 8px; min-width: 250px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.5); }
    #ct-header { font-weight: bold; color: #e67e22; margin-bottom: 6px; cursor: move;
      display: flex; justify-content: space-between; }
    #ct-close { cursor: pointer; color: #e74c3c; }
    #ct-reload { cursor: pointer; margin-right: 4px; }
    #ct-table { border-collapse: collapse; width: 100%; }
    #ct-table th, #ct-table td { padding: 2px 5px; text-align: center; }
    #ct-table th[title] { cursor: help; }
    #ct-table th:first-child, #ct-table td:first-child { text-align: left; }
    #ct-table tr:nth-child(even) { background: rgba(255,255,255,0.05); }
    #ct-table td.unk { color: #f1c40f; }
    #ct-table td.stl { color: #e67e22; }
  `;
  document.head.appendChild(style);

  document.getElementById('ct-close').onclick = () => div.remove();
  document.getElementById('ct-reload').onclick = (e) => reloadHistory(e.target);
  let drag = false, ox = 0, oy = 0;
  const header = document.getElementById('ct-header');
  header.onmousedown = e => { drag = true; ox = e.clientX - div.offsetLeft; oy = e.clientY - div.offsetTop; };
  document.onmousemove = e => { if (drag) { div.style.left = (e.clientX - ox) + 'px'; div.style.top = (e.clientY - oy) + 'px'; } };
  document.onmouseup = () => drag = false;
}

// Devuelve el orden de jugadores tal como los muestra el panel del juego
function getGameOrder() {
  const panel = document.querySelector('[class*="gamePlayerInformationContainer-"]');
  if (!panel) return null;
  const text = panel.innerText;
  const known = Object.keys(players);
  // Ordena según la posición de cada nombre en el panel del juego
  return known.slice().sort((a, b) => {
    const ia = text.indexOf(a), ib = text.indexOf(b);
    return (ia === -1 ? 9999 : ia) - (ib === -1 ? 9999 : ib);
  });
}

// Lee el total de cartas de cada jugador desde el panel del juego.
// Formato por jugador: nombre + [Puntos, Cartas, Desarrollo, Caballeros, Camino]
// El 2º número es el total de cartas de recurso.
function readGameCardCounts() {
  const panel = document.querySelector('[class*="gamePlayerInformationContainer-"]');
  if (!panel) return null;
  const lines = panel.innerText.split('\n').map(s => s.trim()).filter(Boolean);
  // Reconoce números, incluido el formato del jugador local "7 (8)" -> 7
  const numRe = /^(\d+)(\s*\(\d+\))?$/;
  const counts = {};
  for (let i = 0; i < lines.length; i++) {
    // Es un nombre si contiene alguna letra (descarta "7 (8)" y números sueltos)
    if (/[A-Za-z]/.test(lines[i]) && !numRe.test(lines[i])) {
      const name = lines[i];
      const nums = [];
      let j = i + 1;
      let mm;
      while (j < lines.length && (mm = lines[j].match(numRe)) && nums.length < 5) {
        nums.push(parseInt(mm[1], 10)); j++;
      }
      if (nums.length >= 2) counts[name] = nums[1];  // 2º número = cartas
      i = j - 1;
    }
  }
  return counts;
}

// Ajusta el conteo de cada jugador para que su total coincida con el juego.
// Confía en el número oficial del juego y corrige la incertidumbre (❓).
function reconcileWithGame() {
  const counts = readGameCardCounts();
  if (!counts) return;
  Object.keys(counts).forEach(rawName => {
    const name = norm(rawName);
    // No reconciliamos al jugador local (su mano se calcula con precisión desde el log)
    // ni a nombres que no son jugadores reales
    if (name === SELF) return;
    if (!players[name]) return;
    const p = players[name];
    const target = counts[rawName];
    const knownSum = RESOURCES.reduce((a, r) => a + p[r], 0);
    let unknown = target - knownSum + p.stolen;
    if (unknown >= 0) {
      p.unknown = unknown;                    // ajusta las cartas inciertas
    } else {
      // Teníamos de más en conocidos -> quitamos el exceso del recurso más abundante
      let excess = knownSum - p.stolen - target;
      p.unknown = 0;
      while (excess-- > 0) {
        let best = null, max = 0;
        RESOURCES.forEach(r => { if (p[r] > max) { max = p[r]; best = r; } });
        if (best) p[best]--; else break;
      }
    }
  });
}
window.catanReconcile = () => { reconcileWithGame(); renderOverlay(); };
// Diagnóstico: muestra qué número de cartas estoy leyendo del panel para cada jugador
window.catanCounts = () => {
  const panel = document.querySelector('[class*="gamePlayerInformationContainer-"]');
  if (panel) console.log('Líneas crudas del panel:\n', JSON.stringify(panel.innerText.split('\n').map(s=>s.trim()).filter(Boolean)));
  console.log('Cartas que leo (readGameCardCounts):', readGameCardCounts());
};

// Diagnóstico del orden de jugadores
window.catanOrder = () => {
  const panel = document.querySelector('[class*="gamePlayerInformationContainer-"]');
  console.log('Panel encontrado:', !!panel);
  if (panel) console.log('Texto del panel:', JSON.stringify(panel.innerText));
  console.log('Orden calculado:', getGameOrder());
  console.log('Orden de inserción:', Object.keys(players));
};

// ============================================================
// Re-lectura completa del historial (botón 🔄)
// Hace scroll por el log virtual para capturar TODOS los mensajes
// ============================================================
const sleep = ms => new Promise(r => setTimeout(r, ms));

function findScroller() {
  const c = document.querySelector('[class*="gameFeedsContainer-"]');
  if (!c) return null;
  // Prefiere el contenedor virtual (el que tiene el scroll real)
  const vc = c.querySelector('[class*="virtualContainer-"]');
  if (vc && vc.scrollHeight > vc.clientHeight + 5) return vc;
  const candidates = [c, ...c.querySelectorAll('*')];
  for (const e of candidates) {
    if (e.scrollHeight > e.clientHeight + 20) return e;
  }
  return vc || c;
}

let reloadInProgress = false;

async function reloadHistory(btn) {
  if (reloadInProgress) return;
  reloadInProgress = true;
  if (btn) btn.textContent = '⏳';
  // Reinicia el estado (mantiene SELF y colores ya detectados)
  Object.keys(players).forEach(k => delete players[k]);
  processedIndices.clear();

  const scroller = findScroller();
  if (scroller) {
    // Dos pasadas para asegurar que React renderice todos los bloques
    for (let pass = 0; pass < 2; pass++) {
      scroller.scrollTop = 0;
      await sleep(180);
      let guard = 0, lastTop = -1;
      const step = Math.max(40, scroller.clientHeight * 0.5);
      while (guard++ < 1500) {
        document.querySelectorAll('[class*="feedMessage-"]').forEach(handleFeedMessage);
        const atBottom = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2;
        if (atBottom && scroller.scrollTop === lastTop) break;
        lastTop = scroller.scrollTop;
        scroller.scrollTop = Math.min(scroller.scrollTop + step, scroller.scrollHeight);
        await sleep(90);
      }
    }
  }
  // Captura final
  document.querySelectorAll('[class*="feedMessage-"]').forEach(handleFeedMessage);
  reconcileWithGame();
  renderOverlay();
  if (btn) btn.textContent = '🔄';
  reloadInProgress = false;
  console.log('%c[Catan Tracker] Historial releído. Mensajes procesados: ' + processedIndices.size, 'color: #2ecc71; font-weight: bold');
}

// Construye el texto del tooltip del jugador (construcciones y dev cards)
function buildPlayerTooltip(p) {
  const usedCount = p.knights + p.monopoly + p.yearPlenty + p.roadBuilding;
  const held = Math.max(0, p.devBought - usedCount);  // compradas y aún sin usar (tipo desconocido)
  const parts = [
    `Caminos: ${p.roads}/15`,
    `Casas: ${p.settlements}/5`,
    `Ciudades: ${p.cities}/4`,
    `Cartas de desarrollo compradas: ${p.devBought}`,
    `En mano sin usar (tipo desconocido): ${held}`
  ];
  const used = [];
  if (p.knights) used.push(`Caballero x${p.knights}`);
  if (p.monopoly) used.push(`Monopolio x${p.monopoly}`);
  if (p.yearPlenty) used.push(`Año de la abundancia x${p.yearPlenty}`);
  if (p.roadBuilding) used.push(`Construcción de caminos x${p.roadBuilding}`);
  parts.push('Desarrollo usadas: ' + (used.length ? used.join(', ') : 'ninguna'));
  return parts.join('\n');
}

function renderOverlay() {
  const table = document.getElementById('ct-table');
  if (!table) return;
  let html = `<tr><th>Jugador</th>${COLS.map(c => `<th title="${TIP[c]}">${ICON[c]}</th>`).join('')}<th title="Total de cartas">Σ</th></tr>`;
  const order = getGameOrder() || Object.keys(players);
  order.forEach(name => {
    const p = players[name];
    // Total real = recursos conocidos + cartas robadas en mano (❓) - cartas que le robaron (🥷)
    const total = Math.max(0, RESOURCES.reduce((a, r) => a + p[r], 0) + p.unknown - p.stolen);
    const color = playerColors[name] || '#eee';
    // Sombra/borde negro para que los colores oscuros también se lean sobre el fondo oscuro
    const shadow = '-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000,1px 1px 0 #000';
    const tip = buildPlayerTooltip(p);
    html += `<tr><td title="${tip}" style="color:${color};font-weight:700;text-shadow:${shadow};cursor:help">${name}</td>${COLS.map(c =>
      `<td class="${c === 'unknown' ? 'unk' : (c === 'stolen' ? 'stl' : '')}">${p[c] || 0}</td>`).join('')}<td><b>${total}</b></td></tr>`;
  });
  table.innerHTML = html;
}

// ============================================================
// Mensaje automático en el chat al iniciar la partida
// ============================================================
let greeted = false;
let lastGreetSize = 0;  // tamaño del log en el último envío (para reenviar cada 300)
const GREETING = 'Using the Chrome extension for Colonist developed by Nikito. Download: https://github.com/NicolasGardella/catan-tracker/releases/latest';

// Busca el botón de enviar (icon_send) cerca del input de chat
function findSendButton(input) {
  // Botón conocido del lobby
  const known = document.querySelector('#lobby_chat_button');
  if (known && known.offsetParent !== null) return known;

  const scopes = [
    input.form,
    input.parentElement,
    input.parentElement?.parentElement,
    input.parentElement?.parentElement?.parentElement
  ].filter(Boolean);

  for (const sc of scopes) {
    // Cualquier elemento clickeable que contenga un ícono de "send"
    const img = sc.querySelector('img[src*="send" i], img[src*="icon_send" i]');
    if (img) return img.closest('button, [role="button"]') || img.parentElement;
    // O un botón con clase relacionada
    const btn = sc.querySelector('button.chatButton, button[class*="send" i], [class*="chatButton" i]');
    if (btn) return btn;
  }
  return null;
}

function sendChat(text) {
  // Puede haber varios inputs de chat (lobby oculto + juego). Elegimos el VISIBLE.
  const inputs = [...document.querySelectorAll('#lobby_chat_input, input[placeholder*="message" i], textarea[placeholder*="message" i]')];
  const input = inputs.find(el => el.offsetParent !== null) || inputs[0];
  if (!input) return false;

  // Setear el valor de forma que React lo registre
  const proto = input.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
  setter.call(input, text);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));

  // Clic en el botón de enviar (el método que realmente funciona en Colonist)
  const sendBtn = findSendButton(input);
  if (sendBtn) {
    sendBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    sendBtn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    sendBtn.click?.();
    return true;
  }

  // Fallback: Enter
  ['keydown', 'keypress', 'keyup'].forEach(type =>
    input.dispatchEvent(new KeyboardEvent(type, { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }))
  );
  return true;
}

// Diagnóstico: vuelca el HTML del área del chat para depurar el envío
window.catanChatDump = () => {
  const inputs = [...document.querySelectorAll('#lobby_chat_input, input[placeholder*="message" i], textarea[placeholder*="message" i]')];
  const input = inputs.find(el => el.offsetParent !== null) || inputs[0];
  if (!input) { console.log('Input de chat NO encontrado'); return; }
  console.log('Inputs de chat encontrados:', inputs.length, '| usando el visible:', input.offsetParent !== null);
  let box = input.parentElement;
  for (let i = 0; i < 3 && box.parentElement; i++) box = box.parentElement;
  console.log('HTML del área de chat:\n', box.outerHTML);
};

function maybeGreet(tries = 0) {
  if (greeted) return;
  if (sendChat(GREETING)) {
    greeted = true;
    lastGreetSize = processedIndices.size;
    console.log('%c[Catan Tracker] Mensaje de bienvenida enviado', 'color:#2ecc71');
  } else if (tries < 12) {
    setTimeout(() => maybeGreet(tries + 1), 2500);
  }
}
window.catanGreet = () => { greeted = false; maybeGreet(); };

window.catanPlayers = () => console.table(players);
// Diagnóstico: vuelca el panel de jugadores del juego para calibrar la lectura de cartas
window.catanPanel = () => {
  const panel = document.querySelector('[class*="gamePlayerInformationContainer-"]');
  if (!panel) { console.log('Panel NO encontrado'); return; }
  console.log('--- innerText del panel ---');
  console.log(panel.innerText);
  console.log('--- bloques por jugador ---');
  [...panel.children].forEach((child, i) => {
    console.log(`Bloque [${i}]:`, JSON.stringify(child.innerText), child);
  });
};
window.catanColors = () => console.log(playerColors);
window.catanReset = () => { Object.keys(players).forEach(k => delete players[k]); processedIndices.clear(); renderOverlay(); };
window.catanReload = () => reloadHistory();

// Vuelca TODO el log de la partida (texto + recursos por mensaje) y lo copia al portapapeles
window.catanDumpLog = async () => {
  const scroller = findScroller();
  const collected = new Map();  // index -> texto
  const grab = () => {
    document.querySelectorAll('[class*="feedMessage-"]').forEach(m => {
      const idxEl = m.closest('[data-index]');
      const idx = idxEl ? parseInt(idxEl.dataset.index, 10) : Math.random();
      const span = m.querySelector('[class*="messagePart-"]');
      let txt = m.innerText.trim().replace(/\s+/g, ' ');
      // Añade los recursos/íconos por su alt para no perder info
      const alts = [...m.querySelectorAll('img')].map(i => i.alt).filter(Boolean);
      if (alts.length) txt += '  [imgs: ' + alts.join(', ') + ']';
      if (txt) collected.set(idx, txt);
    });
  };
  if (scroller) {
    scroller.scrollTop = 0;
    await sleep(200);
    let last = -1, guard = 0;
    const step = Math.max(40, scroller.clientHeight * 0.5);
    while (guard++ < 1500) {
      grab();
      const atBottom = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2;
      if (atBottom && scroller.scrollTop === last) break;
      last = scroller.scrollTop;
      scroller.scrollTop = Math.min(scroller.scrollTop + step, scroller.scrollHeight);
      await sleep(80);
    }
  }
  grab();
  const ordered = [...collected.entries()].sort((a, b) => a[0] - b[0]).map(e => e[1]);
  const text = ordered.join('\n');
  console.log('%c[Catan Tracker] Log completo (' + ordered.length + ' mensajes):', 'color:#e67e22;font-weight:bold');
  console.log(text);
  try {
    await navigator.clipboard.writeText(text);
    console.log('%c[Catan Tracker] ✅ Copiado al portapapeles. Pegalo en el chat.', 'color:#2ecc71;font-weight:bold');
  } catch (e) {
    console.log('%c[Catan Tracker] No se pudo copiar automáticamente. Copiá el texto de arriba manualmente.', 'color:#e74c3c');
  }
  return ordered.length;
};

setTimeout(startObserving, 4000);

let lastUrl = location.href;
new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    Object.keys(players).forEach(k => delete players[k]);
    processedIndices.clear();
    SELF = null;
    greeted = false;
    setTimeout(startObserving, 4000);
  }
}).observe(document, { subtree: true, childList: true });
