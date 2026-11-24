"use strict";

const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");
const W = canvas.width;
const H = canvas.height;
const byId = id => document.getElementById(id);
const overlay = byId("overlay");
const button = byId("start");
const keys = new Set();
const pressed = new Set();
const geometry = [
  [[0, 1240], [98, 1217], [235, 1170], [300, 1136], [360, 1120]],
  [[425, 1100], [515, 1077], [657, 1047], [746, 1002], [780, 993]],
  [[860, 940], [939, 901], [1028, 879], [1094, 865], [1170, 848]],
  [[1270, 790], [1350, 770], [1440, 749], [1545, 717], [1618, 700]],
  [[1705, 638], [1811, 614], [1902, 571], [1986, 551], [2060, 535]],
  [[2170, 476], [2260, 432], [2370, 411], [2450, 389], [2508, 374]],
  [[2610, 311], [2686, 268], [2750, 251], [2864, 234], [2950, 224]],
  [[3030, 170], [3110, 151], [3260, 105], [3332, 88], [3470, 63]],
].map(points => ({points, left: points[0][0], right: points.at(-1)[0]}));
const placements = [
  [235, "melee", 0], [635, "projectile", 1], [990, "flying", 2],
  [1420, "melee", 3], [1940, "projectile", 4], [2020, "flying", 4],
  [2320, "melee", 5], [2790, "projectile", 6], [2850, "flying", 6],
  [3170, "melee", 7],
];
const checkpoints = [{x: 60, platform: 0}, {x: 1735, platform: 4}];
const summit = 3370;
const maxArmor = 5;
const camera = {x: 0, y: 0};
let player, enemies, shots, sparks, checkpoint, state, stageTime, noticeTime;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
function ground({points}, x) {
  for (let i = 1; i < points.length; i++) {
    const [right, top] = points[i];
    if (x <= right) {
      const [left, bottom] = points[i - 1];
      return bottom + (top - bottom) * Math.max(0, (x - left) / (right - left));
    }
  }
  return points.at(-1)[1];
}

function spawn(index) {
  const {x, platform} = checkpoints[index];
  player = {x, y: ground(geometry[platform], x), vy: 0, vx: 0, platform, facing: 1,
    lastGround: ground(geometry[platform], x), armor: maxArmor, invulnerable: 0, swing: 0, cooldown: 0, rocketFlash: 0};
  enemies = placements.map(([x, type, platform]) => ({x, home: x, type, platform,
    y: ground(geometry[platform], x) - (type === "flying" ? 105 : 0),
    hp: type === "flying" ? 1 : 2, timer: .45, phase: x, windup: 0, flash: 0}));
  shots = [];
  sparks = [];
  checkpoint = index;
  stageTime = 0;
  noticeTime = 0;
  snapCamera();
  updateHud();
}

function snapCamera() {
  camera.x = clamp(player.x - 280, 0, 2510);
  camera.y = player.y - 340;
}

function showScreen(next, title, description, action) {
  state = next;
  gameAudio.setPlaying(false);
  byId("headline").textContent = title;
  byId("brief").textContent = description;
  button.textContent = action;
  overlay.hidden = false;
  button.focus();
  keys.clear();
  pressed.clear();
}

function begin() {
  if (state !== "paused") spawn(state === "lost" ? checkpoint : 0);
  state = "playing";
  gameAudio.unlock();
  gameAudio.setPlaying(true);
  overlay.hidden = true;
  button.blur();
  keys.clear();
  pressed.clear();
}
button.addEventListener("click", begin);
const soundButton = byId("sound");
function toggleSound() {
  const muted = gameAudio.toggleMute();
  soundButton.textContent = muted ? "Unmute audio" : "Mute audio";
}
soundButton.addEventListener("click", toggleSound);
const controls = new Set(["KeyA", "KeyD", "ArrowLeft", "ArrowRight", "Space", "ShiftLeft", "ShiftRight", "KeyJ", "KeyR", "KeyM", "Escape"]);
function press(code) {
  if (!keys.has(code)) pressed.add(code);
  keys.add(code);
}
window.addEventListener("keydown", event => {
  if (!controls.has(event.code)) return;
  if (event.code === "Space" && (!overlay.hidden || document.activeElement === soundButton)) return;
  event.preventDefault();
  if (event.code === "KeyM") {
    if (!event.repeat) toggleSound();
    return;
  }
  if (event.repeat && !keys.has(event.code)) return;
  if (event.code === "Escape" && !event.repeat) {
    if (state === "playing") showScreen("paused", "Paused", "Resume the climb when you’re ready.", "Resume");
    else if (state === "paused") begin();
    return;
  }
  press(event.code);
});
window.addEventListener("keyup", event => keys.delete(event.code));
window.addEventListener("blur", () => {
  if (state === "playing") showScreen("paused", "Paused", "Resume the climb when you’re ready.", "Resume");
});
document.querySelectorAll("[data-key]").forEach(control => {
  control.addEventListener("pointerdown", event => {
    if (state !== "playing") return;
    control.setPointerCapture(event.pointerId);
    press(control.dataset.key);
  });
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) {
    control.addEventListener(type, () => keys.delete(control.dataset.key));
  }
});

function updateHud() {
  byId("armor").textContent = "◆".repeat(player.armor) + "◇".repeat(maxArmor - player.armor);
  byId("rocket").textContent = player.platform >= 0 ? "READY" : "AIRBORNE";
  byId("ascent").textContent = Math.floor(clamp((player.x - 60) / (summit - 60), 0, 1) * 100) + "%";
  byId("notice").textContent = noticeTime > 0 ? "CHECKPOINT ACTIVE · ARMOR RESTORED" : "";
}

function burst(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 45 + Math.random() * 170;
    sparks.push({x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: .25 + Math.random() * .25, color});
  }
}

function damage(x) {
  if (player.invulnerable || state !== "playing") return;
  player.armor--;
  gameAudio.effect("hurt");
  player.invulnerable = .9;
  player.platform = -1;
  player.vy = -235;
  player.vx = player.x >= x ? 230 : -230;
  burst(player.x, player.y - 23, "#ff657e", 13);
  if (!player.armor) lose();
}

function lose() {
  gameAudio.effect("fall");
  showScreen("lost", "Return to the climb",
    checkpoint ? "Restart from the checkpoint." : "Restart at the foot of the ruins.", "Try again");
}

function hammer() {
  player.swing = .24;
  player.cooldown = .36;
  gameAudio.effect("swing");
  let hit = false;
  for (const enemy of enemies) {
    const dx = (enemy.x - player.x) * player.facing;
    if (enemy.hp && dx >= -15 && dx <= 92 && Math.abs(enemy.y - player.y) < 71) {
      hit = true;
      enemy.hp--;
      enemy.flash = .16;
      enemy.windup = 0;
      enemy.timer = .65;
      burst(enemy.x, enemy.y - 17, "#ffd38c", enemy.hp ? 9 : 20);
    }
  }
  shots = shots.filter(shot => {
    const dx = (shot.x - player.x) * player.facing;
    if (dx < -15 || dx > 92 || Math.abs(shot.y - player.y + 24) > 35) return true;
    hit = true;
    burst(shot.x, shot.y, "#ffe4a4", 7);
    return false;
  });
  if (hit) gameAudio.effect("impact");
}

function move(dt) {
  const p = player;
  const direction = Number(keys.has("KeyD") || keys.has("ArrowRight")) - Number(keys.has("KeyA") || keys.has("ArrowLeft"));
  if (direction) p.facing = direction;
  let grounded = p.platform >= 0;
  if (grounded) {
    const surface = geometry[p.platform];
    const downhill = (ground(surface, p.x + 4) - ground(surface, p.x - 4)) / 8;
    const acceleration = direction ? 860 : 0;
    const drag = direction ? 3 : 4.5;
    p.vx += (direction * acceleration + downhill * 440 - p.vx * drag) * dt;
    if (!direction && p.vx < -22 && downhill < -.18 && Math.random() < dt * 12) {
      burst(p.x, p.y - 2, "#c59a91", 1);
    }
  } else if (direction) {
    p.vx += (direction * 285 - p.vx) * 2.4 * dt;
  }
  const rocketJump = pressed.has("ShiftLeft") || pressed.has("ShiftRight");
  if (grounded && (rocketJump || pressed.has("Space"))) {
    grounded = false;
    p.platform = -1;
    if (rocketJump) {
      const launchSpeed = 270 + Math.max(0, p.vx * p.facing) * .55;
      p.vx = launchSpeed * p.facing;
      p.vy = -555;
      p.rocketFlash = .16;
      gameAudio.effect("boost");
      burst(p.x - p.facing * 14, p.y - 18, "#61f9ed", 18);
    } else {
      p.vy = -425;
      gameAudio.effect("jump");
      burst(p.x, p.y, "#8a7b9d", 5);
    }
  }
  const oldX = p.x;
  const oldY = p.y;
  p.x += p.vx * dt;
  if (grounded) {
    const surface = geometry[p.platform];
    if (p.x >= surface.left && p.x <= surface.right) {
      p.y = ground(surface, p.x);
    } else {
      p.platform = -1;
      p.vy = 0;
      grounded = false;
    }
  }
  if (!grounded) {
    p.vy += 1040 * dt;
    p.y += p.vy * dt;
    for (const [index, surface] of geometry.entries()) {
      if (p.x < surface.left || p.x > surface.right) continue;
      const height = ground(surface, p.x);
      if (oldY <= ground(surface, oldX) + .01 && p.y >= height) {
        if (p.vy > 145) gameAudio.effect("land");
        p.y = height;
        p.vy = 0;
        p.rocketFlash = 0;
        p.platform = index;
        break;
      }
    }
  }
}

function updateEnemies(dt) {
  for (const e of enemies) {
    if (!e.hp) continue;
    e.flash = Math.max(0, e.flash - dt);
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const direction = Math.sign(dx);
    e.timer -= dt;
    if (e.type === "flying") {
      const targetX = Math.abs(dx) < 310 ? clamp(player.x, e.home - 125, e.home + 125) : e.home;
      e.x += clamp(targetX - e.x, -98 * dt, 98 * dt);
      const height = ground(geometry[e.platform], e.x);
      const targetY = Math.abs(dx) < 220 ? clamp(player.y - 27, height - 175, height - 38) : height - 105;
      e.y += (targetY + Math.sin(stageTime * 4 + e.phase) * 14 - e.y) * dt * 2.6;
      if (Math.abs(dx) < 25 && Math.abs(dy - 12) < 31) damage(e.x);
    } else if (e.type === "melee") {
      if (e.windup > 0) {
        e.windup -= dt;
        if (e.windup <= 0) {
          if (Math.abs(dx) < 58 && Math.abs(dy) < 45) damage(e.x);
          e.timer = .65;
        }
      } else if (Math.abs(dx) < 46 && Math.abs(dy) < 45 && e.timer <= 0) {
        e.windup = .34;
      } else if (Math.abs(dx) < 225 && Math.abs(dx) > 34) {
        const {left, right} = geometry[e.platform];
        e.x = clamp(e.x + direction * 114 * dt, left + 20, right - 20);
        e.y = ground(geometry[e.platform], e.x);
      }
    } else if (Math.abs(dx) < 480 && Math.abs(dy) < 225 && e.timer <= 0) {
      if (!e.windup) {
        e.windup = .45;
      } else {
        e.windup -= dt;
        if (e.windup <= 0) {
          e.windup = 0;
          e.timer = 1.5;
          const angle = Math.atan2(dy + 9, dx);
          gameAudio.effect("shot");
          shots.push({x: e.x, y: e.y - 30, vx: Math.cos(angle) * 330, vy: Math.sin(angle) * 330, life: 2});
        }
      }
    } else if (e.type === "projectile") {
      e.windup = 0;
    }
  }
}

function update(dt) {
  if (pressed.has("KeyR")) spawn(0);
  stageTime += dt;
  noticeTime -= dt;
  for (const timer of ["invulnerable", "swing", "cooldown", "rocketFlash"]) player[timer] = Math.max(0, player[timer] - dt);
  move(dt);
  if (pressed.has("KeyJ") && !player.cooldown) hammer();
  if (player.platform === 4 && !checkpoint) {
    checkpoint = 1;
    player.armor = maxArmor;
    noticeTime = 2.5;
    gameAudio.effect("checkpoint");
  }
  if (player.platform >= 0) player.lastGround = player.y;
  updateEnemies(dt);
  shots = shots.filter(s => {
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.life -= dt;
    if (Math.abs(s.x - player.x) < 19 && Math.abs(s.y - player.y + 22) < 24) {
      damage(s.x);
      return false;
    }
    return s.life > 0 && !geometry.some(g => s.x >= g.left && s.x <= g.right && s.y >= ground(g, s.x));
  });
  sparks = sparks.filter(s => {
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.vy += 320 * dt;
    s.life -= dt;
    return s.life > 0;
  });
  if (state === "playing") {
    if (player.y > player.lastGround + 410) lose();
    else if (player.x >= summit && player.platform === 7) {
      gameAudio.effect("summit");
      showScreen("won", "Summit reached", "Sisyphus has cleared the ascent.", "Climb again");
    }
  }
  camera.x += (clamp(player.x - 280, 0, 2510) - camera.x) * Math.min(1, 6 * dt);
  camera.y += (Math.min(player.y, player.lastGround + 55) - 340 - camera.y) * 4 * dt;
  updateHud();
}

function polygon(color, points) {
  ctx.fillStyle = color;
  ctx.beginPath();
  points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.closePath();
  ctx.fill();
}

function rect(color, x, y, w, h) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function line(color, width, ...points) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.stroke();
}

const random = n => {
  const value = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
};

function backdrop() {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#110e27");
  sky.addColorStop(.53, "#402247");
  sky.addColorStop(1, "#a35465");
  rect(sky, 0, 0, W, H);
  for (let i = 0; i < 130; i++) {
    const x = ((random(i) * W - camera.x * .045) + W) % W;
    const y = random(i + 200) * 375;
    rect(i % 7 ? "#cf8dab55" : "#fcd1b7bb", x, y, i % 7 ? 1 : 2, 1);
  }

  const sunX = 725 - camera.x * .077;
  ctx.save();
  ctx.beginPath();
  ctx.arc(sunX, 206, 123, 0, Math.PI * 2);
  ctx.clip();
  const sun = ctx.createLinearGradient(0, 80, 0, 330);
  sun.addColorStop(0, "#ffd6a0");
  sun.addColorStop(1, "#d25483");
  rect(sun, sunX - 125, 80, 250, 250);
  for (let y = 154; y < 330; y += 11) rect("#7e355b", sunX - 125, y, 250, 1 + (y - 154) / 32);
  ctx.restore();

  for (let layer = 0; layer < 2; layer++) {
    const depth = layer ? .23 : .11;
    const base = (layer ? 486 : 427) + (900 - camera.y) * .045;
    const offset = camera.x * depth;
    for (let i = Math.floor(offset / 64); i <= (offset + W) / 64; i++) {
      const x = i * 64 - offset;
      const height = 32 + random(i + layer * 80) * (layer ? 110 : 155);
      const y = base - height;
      const w = 40 + random(i + 95) * 32;
      const color = layer ? "#211a34" : "#402844";
      rect(color, x, y, w, H - y);
      rect(color, x + 8, y - 9, w - 17, 10);
      if (i % 3 === 0) line("#513457", 2, [x + 17, y], [x + 17, y - 43]);
      for (let row = y + 12; row < H; row += 16) {
        for (let col = 7; col < w - 5; col += 10) {
          if (random(i * 91 + row - y + col) > .54) rect(layer ? "#a74b7d88" : "#c0749277", x + col, row, 4, 2);
        }
      }
    }
  }
  const haze = ctx.createLinearGradient(0, 350, 0, H);
  haze.addColorStop(0, "#ee659400");
  haze.addColorStop(1, "#bd668348");
  rect(haze, 0, 350, W, H - 350);
}

function column(x, bottom, height, width) {
  const top = bottom - height;
  rect("#594053", x, top, width, height);
  rect("#9e7376", x + 3, top, 4, height);
  for (let i = 10; i < width - 2; i += 6) rect("#c894861f", x + i, top, 2, height);
  for (const y of [top, bottom - 8]) {
    rect("#a38081", x - 5, y, width + 10, 8);
    rect("#e5ad8d", x - 7, y, width + 14, 2);
  }
}

function temple(x, y, size, goal) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size, size);
  const glow = goal ? "#65fff1" : "#d768a2";
  rect("#21192e", 0, -142, 166, 142);
  for (let i = 0; i < 4; i++) column(i * 45 + 4, 0, 133, 23);
  polygon("#98707a", [[-9, -140], [83, -197], [176, -140]]);
  polygon("#442d49", [[9, -144], [83, -186], [158, -144]]);
  line("#f2b88f", 2, [-9, -140], [83, -197], [176, -140]);
  rect("#83566a", -7, -141, 181, 13);
  rect(glow, -7, -129, 181, 2);
  if (goal) {
    const portal = ctx.createLinearGradient(52, 0, 114, 0);
    portal.addColorStop(0, "#154d61");
    portal.addColorStop(.5, "#74f8de");
    portal.addColorStop(1, "#154d61");
    rect(portal, 61, -104, 46, 104);
    for (let y = -101; y < 0; y += 8) rect("#b3fff17a", 62, y, 44, 1);
    rect(glow, 60, -106, 48, 4);
  }
  ctx.restore();
}

function arcade(x, y, bays) {
  ctx.save();
  ctx.translate(x, y);
  for (let i = 0; i < bays; i++) {
    const left = i * 48;
    rect("#523952", left, -70, 48, 88);
    ctx.fillStyle = "#21192e";
    ctx.beginPath();
    ctx.arc(left + 24, -34, 15, Math.PI, 0);
    ctx.lineTo(left + 39, 18);
    ctx.lineTo(left + 9, 18);
    ctx.closePath();
    ctx.fill();
    rect("#b48783", left, -67, 5, 80);
  }
  rect("#e990a3", 0, -70, bays * 48, 3);
  ctx.restore();
}

function conduits(x, y) {
  for (let i = 0; i < 3; i++) {
    const offset = i * 39;
    const height = 62 + i * 22;
    column(x + offset, y - i * 10, height, 25);
    rect("#193544", x + offset + 8, y - i * 10 - height + 12, 9, height - 22);
    rect("#62e4db", x + offset + 11, y - i * 10 - height + 12, 2, height - 22);
  }
}

function terrain() {
  for (const [index, g] of geometry.entries()) {
    const {left: a, right: b, points} = g;
    if (b < camera.x || a > camera.x + W) continue;
    const y = points[0][1];
    const z = points.at(-1)[1];
    const center = ground(g, a + 146);
    if (index === 7) temple(3252, ground(g, 3335) + 4, 1.4, true);
    else if (index === 1 || index === 5) arcade(a + 48, center + 12, 4);
    else if (index === 2 || index === 6) conduits(a + 98, center + 13);
    else {
      temple(a + 43, center + 28, index === 4 ? 1.05 : .84, false);
      column(b - 52, z + 9, index === 3 ? 124 : 97, 18);
    }
    polygon("#170f23", [...points, [b - 21, z + 89], [b - 70, z + 154], [b - 126, z + 257], [a + 45, y + 299], [a + 13, y + 133]]);
    polygon("#483045", [...points, ...points.map(([x, top]) => [x, top + 23]).reverse()]);
    line("#f1ae91", 3, ...points);
    line(index % 2 ? "#e969a5" : "#5fe4df", 2, ...points.map(([x, top]) => [x, top + 11]));
    for (let x = a + 18; x < b - 28; x += 27) {
      const top = ground(g, x);
      line("#77516a", 2, [x, top + 18], [x, top + 35], [x + 11, top + 33], [x + 11, top + 25], [x + 5, top + 26]);
      if (Math.floor(x / 27) % 3 === 0) {
        line("#53354e", 2, [x, top + 55], [x, top + 95], [x + 14, top + 108]);
        rect("#85485f", x, top + 55, 8, 3);
      }
    }
  }
  const marker = checkpoints[1];
  const y = ground(geometry[marker.platform], marker.x);
  rect("#805867", marker.x - 3, y - 65, 6, 65);
  rect(checkpoint ? "#68fff0" : "#f9bb7e", marker.x - 12, y - 68, 24, 9);
}

function drawEnemy(e) {
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.scale(player.x < e.x ? -1 : 1, 1);
  const hot = e.flash ? "#fff4d6" : e.windup ? "#fff0a0" : "#ff6d9d";
  if (e.type === "flying") {
    polygon("#7b456b", [[-12, -15], [-28, -28], [-35, -19], [-22, -8], [22, -8], [35, -19], [28, -28], [12, -15]]);
    polygon("#ce829b", [[-16, -18], [-8, -26], [12, -26], [19, -16], [10, -5], [-10, -5]]);
    rect("#262439", -11, -18, 22, 7);
    rect(hot, 2, -17, 12, 4);
    line("#fb97cd", 2, [-27, -12], [-22, 4]);
    line("#fb97cd", 2, [26, -12], [22, 4]);
  } else {
    const shell = e.type === "melee" ? "#d08d93" : "#a19bce";
    line("#614e70", 8, [-8, -23], [-9, -11], [-14, -3]);
    line(shell, 8, [7, -23], [10, -10], [11, -3]);
    rect("#a08a99", -19, -6, 13, 5);
    rect("#a08a99", 8, -6, 14, 5);
    polygon(shell, [[-14, -39], [12, -39], [14, -27], [6, -19], [-10, -21]]);
    rect("#6c4b6d", -8, -54, 18, 14);
    rect(hot, 0, -49, 12, 3);
    if (e.type === "melee") {
      line("#bdf0f4", 4, [13, -28], [e.windup ? 24 : 34, e.windup ? -60 : -23]);
      rect(hot, 10, -33, 7, 7);
    } else {
      rect("#594a77", 5, -36, 30, 11);
      rect(hot, 27, -35, 8, 4);
    }
  }
  ctx.restore();
}

function drawPlayer() {
  const p = player;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(p.facing, 1);
  if (p.invulnerable && Math.floor(p.invulnerable * 22) % 2) ctx.globalAlpha = .46;
  const pace = p.platform >= 0 ? Math.sin(stageTime * 16) * Math.abs(p.vx) / 24 : 6;
  if (p.rocketFlash > 0) {
    polygon("#29dbcbbb", [[-23, -28], [-13, -26], [-22 - p.rocketFlash * 125, 12 + p.rocketFlash * 110]]);
    polygon("#d8fff4", [[-21, -27], [-15, -27], [-18, 5]]);
  }
  polygon("#893553", [[-10, -37], [-23, -31], [-33, -22], [-29, -17], [-8, -27]]);
  line("#524761", 9, [-7, -25], [-9 - pace, -12], [-7 - pace, -3]);
  line("#cba17c", 9, [7, -25], [10 + pace, -13], [7 + pace, -3]);
  rect("#bdd1cf", 3 + pace, -5, 14, 5);
  rect("#687a87", -12 - pace, -5, 13, 5);
  rect("#8897a1", -22, -46, 10, 25);
  rect("#5bffff", -20, -34, 4, 12);
  polygon("#c6b6a1", [[-13, -46], [9, -45], [15, -32], [6, -22], [-10, -25]]);
  line("#50fff2", 3, [-9, -38], [2, -35], [9, -38]);
  polygon("#e0aa84", [[-7, -64], [7, -65], [15, -58], [10, -47], [-5, -47], [-10, -54]]);
  polygon("#49384b", [[-9, -64], [4, -68], [13, -64], [15, -58], [-9, -58]]);
  rect("#77ffeb", 4, -57, 12, 3);
  const angle = p.swing ? -2 + (1 - p.swing / .24) * 3.1 : -.75;
  if (p.swing) {
    ctx.beginPath();
    ctx.arc(9, -34, 64, angle - .82, angle + .24);
    ctx.strokeStyle = "#ffd27fbd";
    ctx.lineWidth = 5;
    ctx.stroke();
  }
  ctx.translate(9, -34);
  ctx.rotate(angle);
  line("#dbc2a1", 8, [0, 0], [16, 0]);
  rect("#a37263", 11, -2, 45, 4);
  rect("#87737f", 48, -13, 16, 26);
  rect("#dcc4ae", 49, -15, 15, 5);
  rect("#5ef6dc", 61, -9, 4, 16);
  ctx.restore();
}

function draw() {
  backdrop();
  ctx.save();
  ctx.translate(-camera.x, -camera.y);
  terrain();
  enemies.filter(e => e.hp).forEach(drawEnemy);
  for (const s of shots) {
    line("#fd77958c", 3, [s.x - s.vx * .05, s.y - s.vy * .05], [s.x, s.y]);
    rect("#ffe1ba", s.x - 4, s.y - 3, 8, 6);
  }
  drawPlayer();
  for (const s of sparks) rect(s.color, s.x, s.y, 3, 3);
  ctx.restore();
}

spawn(0);
state = "ready";
let last = performance.now();
let accumulator = 0;
const step = 1 / 120;
function frame(now) {
  accumulator += Math.min(.05, (now - last) / 1000);
  last = now;
  while (accumulator >= step) {
    if (state === "playing") update(step);
    pressed.clear();
    accumulator -= step;
  }
  gameAudio.tick();
  draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
