(() => {
  "use strict";

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const overlay = document.getElementById("overlay");
  const W = canvas.width;
  const H = canvas.height;
  const TAU = Math.PI * 2;
  const FOV = Math.PI / 3;
  const MAX_DEPTH = 18;
  const WALLS = { timber: 1, bunker: 2, wire: 3 };

  const objectives = [
    { type: "extract", label: "Reach extraction point" },
    { type: "radio", label: "Find radio equipment" },
    { type: "message", label: "Deliver message" },
    { type: "defend", label: "Defend position" },
    { type: "rescue", label: "Rescue lost ally" }
  ];

  const state = {
    mode: "title",
    mission: 1,
    bestMission: Number(localStorage.getItem("frontlineEchoBestMission") || 1),
    score: 0,
    map: [],
    size: 25,
    player: { x: 2.5, y: 2.5, a: 0, hp: 100, ammo: 8, reserve: 28, mag: 8, reload: 0, hurt: 0 },
    objective: objectives[0],
    objectiveItem: null,
    enemies: [],
    pickups: [],
    keys: new Set(),
    mouseLocked: false,
    defendTimer: 0,
    completeTimer: 0,
    messageHeld: false,
    mapFragments: 0,
    lastTime: 0
  };

  const rand = (min, max) => Math.random() * (max - min) + min;
  const dist = (a, b, c, d) => Math.hypot(a - c, b - d);
  const norm = angle => {
    while (angle < -Math.PI) angle += TAU;
    while (angle > Math.PI) angle -= TAU;
    return angle;
  };

  function showOverlay(title, lines, prompt = "Press Enter or Click to continue") {
    overlay.className = "overlay is-visible";
    overlay.innerHTML = `<div class="overlay-card"><h2>${title}</h2>${lines.map(line => `<p>${line}</p>`).join("")}<p class="prompt">${prompt}</p></div>`;
  }

  function hideOverlay() {
    overlay.className = "overlay";
    overlay.innerHTML = "";
  }

  function startGame() {
    state.mission = 1;
    state.score = 0;
    state.bestMission = Number(localStorage.getItem("frontlineEchoBestMission") || 1);
    state.player.hp = 100;
    state.player.reserve = 28;
    state.player.ammo = state.player.mag;
    state.mapFragments = 0;
    generateMission();
  }

  function carve(map, x, y) {
    map[y][x] = 0;
    const dirs = [[2, 0], [-2, 0], [0, 2], [0, -2]].sort(() => Math.random() - 0.5);
    for (const [dx, dy] of dirs) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx > 1 && ny > 1 && nx < state.size - 2 && ny < state.size - 2 && map[ny][nx]) {
        map[y + dy / 2][x + dx / 2] = 0;
        carve(map, nx, ny);
      }
    }
  }

  function openCells() {
    const cells = [];
    for (let y = 1; y < state.size - 1; y++) {
      for (let x = 1; x < state.size - 1; x++) {
        if (!state.map[y][x] && dist(x, y, state.player.x, state.player.y) > 4) cells.push({ x: x + 0.5, y: y + 0.5 });
      }
    }
    return cells.sort(() => Math.random() - 0.5);
  }

  function generateMission() {
    state.size = Math.min(25 + Math.floor(state.mission / 2) * 2, 39);
    state.map = Array.from({ length: state.size }, () => Array.from({ length: state.size }, () => 1));
    carve(state.map, 1, 1);

    // Add bunker blocks and wire-like walls as visual variety without blocking all corridors.
    for (let y = 1; y < state.size - 1; y++) {
      for (let x = 1; x < state.size - 1; x++) {
        if (state.map[y][x] && Math.random() < 0.22) state.map[y][x] = Math.random() < 0.45 ? WALLS.bunker : WALLS.wire;
      }
    }

    state.player.x = 1.5;
    state.player.y = 1.5;
    state.player.a = 0;
    state.player.reload = 0;
    state.messageHeld = false;
    state.defendTimer = 0;
    state.completeTimer = 0;
    state.objective = objectives[(state.mission - 1) % objectives.length];
    state.objectiveItem = null;
    state.enemies = [];
    state.pickups = [];

    const cells = openCells();
    const far = cells[cells.length - 1] || { x: state.size - 2.5, y: state.size - 2.5 };
    state.objectiveItem = { x: far.x, y: far.y, kind: state.objective.type, active: true };

    if (state.objective.type === "message") {
      const drop = cells[Math.floor(cells.length / 2)] || far;
      state.objectiveItem = { x: drop.x, y: drop.y, kind: "message-drop", active: true };
      state.messagePickup = { x: 1.5, y: 1.5, kind: "message", active: true };
      state.pickups.push(state.messagePickup);
    }

    const enemyCount = Math.min(3 + state.mission, 12);
    for (let i = 0; i < enemyCount; i++) {
      const c = cells[i] || far;
      state.enemies.push({ x: c.x, y: c.y, hp: 2 + Math.floor(state.mission / 5), cool: rand(0.5, 2), state: "patrol" });
    }

    const pickupKinds = ["ammo", "medkit", "map"];
    for (let i = 0; i < 6; i++) {
      const c = cells[enemyCount + i] || far;
      state.pickups.push({ x: c.x, y: c.y, kind: pickupKinds[i % pickupKinds.length], active: true });
    }

    state.mode = "playing";
    hideOverlay();
  }

  function isWall(x, y) {
    const mx = Math.floor(x);
    const my = Math.floor(y);
    if (mx < 0 || my < 0 || mx >= state.size || my >= state.size) return 1;
    return state.map[my][mx];
  }

  function moveEntity(entity, dx, dy) {
    if (!isWall(entity.x + dx, entity.y)) entity.x += dx;
    if (!isWall(entity.x, entity.y + dy)) entity.y += dy;
  }

  function raycast(angle) {
    const step = 0.025;
    let depth = 0;
    const sin = Math.sin(angle);
    const cos = Math.cos(angle);
    let hit = 0;
    while (depth < MAX_DEPTH) {
      const x = state.player.x + cos * depth;
      const y = state.player.y + sin * depth;
      hit = isWall(x, y);
      if (hit) {
        const shade = (Math.floor(x * 2) + Math.floor(y * 2)) % 2;
        return { depth, hit, shade };
      }
      depth += step;
    }
    return { depth: MAX_DEPTH, hit: 0, shade: 0 };
  }

  function fire() {
    if (state.mode !== "playing" || state.player.reload > 0 || state.player.ammo <= 0) return;
    state.player.ammo--;
    let target = null;
    let best = 0.16;
    for (const enemy of state.enemies) {
      if (enemy.hp <= 0) continue;
      const angle = Math.abs(norm(Math.atan2(enemy.y - state.player.y, enemy.x - state.player.x) - state.player.a));
      const d = dist(enemy.x, enemy.y, state.player.x, state.player.y);
      if (angle < best && d < 8 && raycast(state.player.a).depth + 0.25 >= d) {
        target = enemy;
        best = angle;
      }
    }
    if (target) {
      target.hp--;
      state.score += target.hp <= 0 ? 150 : 40;
    }
  }

  function reload() {
    if (state.player.reload > 0 || state.player.ammo === state.player.mag || state.player.reserve <= 0) return;
    state.player.reload = 1.1;
  }

  function interact() {
    if (state.mode !== "playing") return;
    const item = state.objectiveItem;
    if (item?.active && dist(state.player.x, state.player.y, item.x, item.y) < 1.15) {
      if (item.kind === "message-drop" && !state.messageHeld) return;
      if (item.kind === "radio" || item.kind === "extract" || item.kind === "message-drop" || item.kind === "rescue") completeMission();
      if (item.kind === "defend") state.defendTimer = Math.max(state.defendTimer, 16 + Math.min(state.mission, 10));
    }
  }

  function completeMission() {
    state.mode = "complete";
    state.score += 500 + state.mission * 75;
    state.bestMission = Math.max(state.bestMission, state.mission + 1);
    localStorage.setItem("frontlineEchoBestMission", String(state.bestMission));
    showOverlay("Mission Complete", [
      `Objective secured: ${state.objective.label}.`,
      `Score: ${state.score} • Next mission: ${state.mission + 1}`,
      `Best mission reached: ${state.bestMission}`
    ]);
  }

  function gameOver() {
    state.mode = "gameover";
    localStorage.setItem("frontlineEchoBestMission", String(Math.max(state.bestMission, state.mission)));
    showOverlay("Game Over", [
      "Your patrol fades into the fog. No gore, just an arcade reset.",
      `Final score: ${state.score} • Mission reached: ${state.mission}`,
      `Best mission reached: ${Math.max(state.bestMission, state.mission)}`
    ], "Press Enter or Click to restart");
  }

  function update(dt) {
    if (state.mode !== "playing") return;
    const p = state.player;
    const turn = 2.3 * dt;
    if (state.keys.has("ArrowLeft")) p.a -= turn;
    if (state.keys.has("ArrowRight")) p.a += turn;
    const speed = (state.keys.has("ShiftLeft") ? 2.4 : 1.65) * dt;
    let dx = 0;
    let dy = 0;
    if (state.keys.has("KeyW")) { dx += Math.cos(p.a) * speed; dy += Math.sin(p.a) * speed; }
    if (state.keys.has("KeyS")) { dx -= Math.cos(p.a) * speed; dy -= Math.sin(p.a) * speed; }
    if (state.keys.has("KeyA")) { dx += Math.cos(p.a - Math.PI / 2) * speed; dy += Math.sin(p.a - Math.PI / 2) * speed; }
    if (state.keys.has("KeyD")) { dx += Math.cos(p.a + Math.PI / 2) * speed; dy += Math.sin(p.a + Math.PI / 2) * speed; }
    moveEntity(p, dx, dy);

    if (p.reload > 0) {
      p.reload -= dt;
      if (p.reload <= 0) {
        const needed = p.mag - p.ammo;
        const loaded = Math.min(needed, p.reserve);
        p.ammo += loaded;
        p.reserve -= loaded;
      }
    }
    p.hurt = Math.max(0, p.hurt - dt);

    for (const pickup of state.pickups) {
      if (!pickup.active || dist(p.x, p.y, pickup.x, pickup.y) > 0.65) continue;
      pickup.active = false;
      if (pickup.kind === "ammo") p.reserve += 10;
      if (pickup.kind === "medkit") p.hp = Math.min(100, p.hp + 28);
      if (pickup.kind === "map") { state.mapFragments++; state.score += 80; }
      if (pickup.kind === "message") state.messageHeld = true;
    }

    for (const enemy of state.enemies) {
      if (enemy.hp <= 0) continue;
      const d = dist(enemy.x, enemy.y, p.x, p.y);
      const canSee = d < 7 && raycast(Math.atan2(enemy.y - p.y, enemy.x - p.x)).depth + 0.2 >= d;
      if (canSee) enemy.state = "chase";
      if (enemy.state === "chase") {
        const a = Math.atan2(p.y - enemy.y, p.x - enemy.x);
        moveEntity(enemy, Math.cos(a) * dt * (0.62 + state.mission * 0.025), Math.sin(a) * dt * (0.62 + state.mission * 0.025));
      }
      enemy.cool -= dt;
      if (d < 0.9 && enemy.cool <= 0) {
        p.hp -= 8 + Math.floor(state.mission / 4);
        p.hurt = 0.25;
        enemy.cool = 1.25;
      }
    }

    if (state.objective.type === "defend" && dist(p.x, p.y, state.objectiveItem.x, state.objectiveItem.y) < 1.2 && state.defendTimer <= 0) {
      state.defendTimer = 16 + Math.min(state.mission, 10);
    }
    if (state.defendTimer > 0) {
      state.defendTimer -= dt;
      if (state.defendTimer <= 0) completeMission();
    }
    if (state.objective.type === "extract" && dist(p.x, p.y, state.objectiveItem.x, state.objectiveItem.y) < 0.7) completeMission();
    if (state.objective.type === "message" && !state.messageHeld && state.objectiveItem) {
      // Delivery requires collecting the message satchel near spawn first.
    }
    if (p.hp <= 0) gameOver();
  }

  function drawSkyAndFloor() {
    const g = ctx.createLinearGradient(0, 0, 0, H / 2);
    g.addColorStop(0, "#53594f");
    g.addColorStop(1, "#242820");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H / 2);
    ctx.fillStyle = "#2b2116";
    ctx.fillRect(0, H / 2, W, H / 2);
    for (let y = H / 2; y < H; y += 8) {
      ctx.fillStyle = `rgba(0,0,0,${(y - H / 2) / H * 0.45})`;
      ctx.fillRect(0, y, W, 4);
    }
  }

  function wallColor(hit, depth, shade) {
    const fog = Math.min(depth / MAX_DEPTH, 1);
    const palettes = {
      1: [92, 68, 39],
      2: [72, 72, 62],
      3: [78, 83, 70]
    };
    const base = palettes[hit] || palettes[1];
    const stripe = shade ? 0.82 : 1;
    const r = base[0] * stripe * (1 - fog) + 64 * fog;
    const g = base[1] * stripe * (1 - fog) + 66 * fog;
    const b = base[2] * stripe * (1 - fog) + 58 * fog;
    return `rgb(${r | 0},${g | 0},${b | 0})`;
  }

  function drawWorld() {
    drawSkyAndFloor();
    const zBuffer = [];
    for (let x = 0; x < W; x += 2) {
      const angle = state.player.a - FOV / 2 + (x / W) * FOV;
      const ray = raycast(angle);
      const corrected = ray.depth * Math.cos(angle - state.player.a);
      const wallH = Math.min(H, H / Math.max(corrected, 0.001));
      const top = (H - wallH) / 2;
      ctx.fillStyle = wallColor(ray.hit, corrected, ray.shade);
      ctx.fillRect(x, top, 2, wallH);
      ctx.fillStyle = `rgba(11, 12, 10, ${Math.min(corrected / 14, 0.78)})`;
      ctx.fillRect(x, top, 2, wallH);
      zBuffer[x] = corrected;
      zBuffer[x + 1] = corrected;
    }
    drawSprites(zBuffer);
    ctx.fillStyle = "rgba(120,125,105,0.16)";
    for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);
  }

  function spriteList() {
    const sprites = [];
    if (state.objectiveItem?.active) sprites.push({ ...state.objectiveItem, sprite: "objective" });
    for (const p of state.pickups) if (p.active) sprites.push({ ...p, sprite: "pickup" });
    for (const e of state.enemies) if (e.hp > 0) sprites.push({ ...e, sprite: "enemy" });
    return sprites.sort((a, b) => dist(b.x, b.y, state.player.x, state.player.y) - dist(a.x, a.y, state.player.x, state.player.y));
  }

  function drawSprites(zBuffer) {
    for (const s of spriteList()) {
      const dx = s.x - state.player.x;
      const dy = s.y - state.player.y;
      const d = Math.hypot(dx, dy);
      const angle = norm(Math.atan2(dy, dx) - state.player.a);
      if (Math.abs(angle) > FOV / 1.6 || d < 0.2) continue;
      const size = Math.min(H, H / d * (s.sprite === "enemy" ? 0.72 : 0.46));
      const sx = W / 2 + Math.tan(angle) * W / FOV - size / 2;
      const sy = H / 2 - size / 2;
      const mid = Math.max(0, Math.min(W - 1, sx + size / 2 | 0));
      if (zBuffer[mid] && zBuffer[mid] < d) continue;
      if (s.sprite === "enemy") drawEnemy(sx, sy, size);
      else drawItem(s, sx, sy, size);
    }
  }

  function drawEnemy(x, y, size) {
    ctx.fillStyle = "#3f4b36";
    ctx.fillRect(x + size * 0.24, y + size * 0.24, size * 0.52, size * 0.58);
    ctx.fillStyle = "#22251f";
    ctx.fillRect(x + size * 0.32, y + size * 0.1, size * 0.36, size * 0.22);
    ctx.fillStyle = "#b8a86c";
    ctx.fillRect(x + size * 0.36, y + size * 0.35, size * 0.08, size * 0.08);
    ctx.fillRect(x + size * 0.56, y + size * 0.35, size * 0.08, size * 0.08);
    ctx.fillStyle = "#1a1710";
    ctx.fillRect(x + size * 0.18, y + size * 0.68, size * 0.64, size * 0.15);
  }

  function drawItem(s, x, y, size) {
    const colors = { ammo: "#c9a14a", medkit: "#d8d1b0", map: "#91a36f", message: "#b3894e", objective: "#8db1bd" };
    ctx.fillStyle = colors[s.kind] || colors.objective;
    ctx.fillRect(x + size * 0.22, y + size * 0.28, size * 0.56, size * 0.46);
    ctx.fillStyle = "#1a130c";
    ctx.fillRect(x + size * 0.32, y + size * 0.42, size * 0.36, size * 0.08);
    if (s.kind === "rescue") {
      ctx.fillStyle = "#7f9b62";
      ctx.fillRect(x + size * 0.36, y + size * 0.12, size * 0.28, size * 0.22);
    }
  }

  function drawHud() {
    const p = state.player;
    const objectiveText = state.objective.type === "defend" && state.defendTimer > 0
      ? `Defend: ${Math.ceil(state.defendTimer)}s`
      : state.objective.type === "message" && !state.messageHeld
        ? "Collect message satchel"
        : state.objective.label;
    ctx.fillStyle = "rgba(8, 9, 8, 0.72)";
    ctx.fillRect(0, 0, W, 44);
    ctx.fillRect(0, H - 56, W, 56);
    ctx.fillStyle = "#e0d39a";
    ctx.font = "16px Courier New";
    ctx.fillText(`HP ${Math.max(0, p.hp | 0)}`, 14, 24);
    ctx.fillText(`AMMO ${p.reload > 0 ? "RELOAD" : `${p.ammo}/${p.reserve}`}`, 100, 24);
    ctx.fillText(`MISSION ${state.mission}`, 250, 24);
    ctx.fillText(`SCORE ${state.score}`, 370, 24);
    ctx.fillText(`BEST ${state.bestMission}`, 500, 24);
    ctx.fillText(`OBJ: ${objectiveText}`, 14, H - 30);
    ctx.fillText(`DIR ${compass()}`, W - 120, H - 30);
    ctx.strokeStyle = "#e0d39a";
    ctx.beginPath();
    ctx.moveTo(W / 2 - 8, H / 2);
    ctx.lineTo(W / 2 + 8, H / 2);
    ctx.moveTo(W / 2, H / 2 - 8);
    ctx.lineTo(W / 2, H / 2 + 8);
    ctx.stroke();
    drawMiniMap();
    if (p.hurt > 0) {
      ctx.fillStyle = "rgba(200, 95, 73, 0.22)";
      ctx.fillRect(0, 0, W, H);
    }
  }

  function compass() {
    const dirs = ["E", "SE", "S", "SW", "W", "NW", "N", "NE"];
    return dirs[Math.round((((state.player.a % TAU) + TAU) % TAU) / (TAU / 8)) % 8];
  }

  function drawMiniMap() {
    if (state.mapFragments <= 0) return;
    const scale = 3;
    const ox = W - state.size * scale - 12;
    const oy = 50;
    ctx.fillStyle = "rgba(8,9,8,0.62)";
    ctx.fillRect(ox - 4, oy - 4, state.size * scale + 8, state.size * scale + 8);
    for (let y = 0; y < state.size; y++) {
      for (let x = 0; x < state.size; x++) {
        ctx.fillStyle = state.map[y][x] ? "#5b4427" : "#2b2116";
        ctx.fillRect(ox + x * scale, oy + y * scale, scale, scale);
      }
    }
    ctx.fillStyle = "#e0d39a";
    ctx.fillRect(ox + state.player.x * scale - 1, oy + state.player.y * scale - 1, 3, 3);
  }

  function render() {
    if (state.mode === "playing" || state.mode === "complete" || state.mode === "paused" || state.mode === "gameover") {
      drawWorld();
      drawHud();
    } else {
      ctx.fillStyle = "#10110d";
      ctx.fillRect(0, 0, W, H);
    }
  }

  function loop(t) {
    const dt = Math.min((t - state.lastTime) / 1000 || 0, 0.05);
    state.lastTime = t;
    update(dt);
    render();
    requestAnimationFrame(loop);
  }

  function continueFromOverlay() {
    if (state.mode === "title" || state.mode === "gameover") startGame();
    else if (state.mode === "complete") { state.mission++; generateMission(); }
  }

  document.addEventListener("keydown", event => {
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)) event.preventDefault();
    state.keys.add(event.code);
    if (event.code === "Enter") continueFromOverlay();
    if (event.code === "Space") fire();
    if (event.code === "KeyR") reload();
    if (event.code === "KeyE") interact();
    if (event.code === "KeyP") {
      if (state.mode === "playing") {
        state.mode = "paused";
        showOverlay("Paused", ["The trench is quiet for a moment.", "Press P to resume."], "Paused");
      } else if (state.mode === "paused") {
        state.mode = "playing";
        hideOverlay();
      }
    }
  });

  document.addEventListener("keyup", event => state.keys.delete(event.code));
  canvas.addEventListener("click", () => {
    if (state.mode === "playing") {
      canvas.requestPointerLock?.();
      fire();
    } else {
      continueFromOverlay();
    }
  });
  document.addEventListener("pointerlockchange", () => { state.mouseLocked = document.pointerLockElement === canvas; });
  document.addEventListener("mousemove", event => {
    if (state.mouseLocked && state.mode === "playing") state.player.a += event.movementX * 0.0025;
  });

  showOverlay("Frontline Echo", [
    "A fictional retro raycasting FPS set in moody arcade trenches.",
    "Complete endless missions: extract, radio, message, defend, and rescue.",
    `Best mission reached: ${state.bestMission}`
  ], "Press Enter or Click to start");
  requestAnimationFrame(loop);
})();
