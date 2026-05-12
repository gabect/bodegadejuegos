(() => {
  "use strict";

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const overlay = document.getElementById("overlay");
  const restartButton = document.getElementById("restartButton");

  const W = canvas.width;
  const H = canvas.height;
  const FOV = Math.PI / 3;
  const MAX_DEPTH = 18;
  const PLAYER_RADIUS = 0.18;
  const ENEMY_RADIUS = 0.2;
  const ENEMY_CHASE_RADIUS = 3.15;
  const ENEMY_DAMAGE_RADIUS = 0.68;
  const ENEMY_DAMAGE_PER_SECOND = 18;
  const EXTRACTION_RADIUS = 0.72;
  const MAX_HEALTH = 100;

  const map = [
    "111111111111",
    "100000000001",
    "101111011101",
    "100001010001",
    "111101010111",
    "100001000001",
    "101111110101",
    "100000010101",
    "101011010101",
    "101000000001",
    "1000111110E1",
    "111111111111"
  ];

  const playerStart = { x: 1.6, y: 1.6, angle: 0 };
  const enemyStart = { x: 9.5, y: 9.5, patrolIndex: 0 };
  const enemyPatrol = [
    { x: 9.5, y: 9.5 },
    { x: 5.5, y: 9.5 },
    { x: 3.5, y: 9.5 }
  ];
  const extraction = findExtraction();

  const state = {
    mode: "ready",
    player: { ...playerStart, health: MAX_HEALTH },
    enemy: { ...enemyStart },
    keys: new Set(),
    pointerLocked: false,
    won: false,
    lastTime: 0
  };

  function findExtraction() {
    for (let y = 0; y < map.length; y++) {
      const x = map[y].indexOf("E");
      if (x !== -1) return { x: x + 0.5, y: y + 0.5 };
    }
    return { x: 10.5, y: 10.5 };
  }

  function resetGame() {
    state.player = { ...playerStart, health: MAX_HEALTH };
    state.enemy = { ...enemyStart };
    state.mode = "playing";
    state.won = false;
    hideOverlay();
  }

  function showOverlay(title, lines, prompt = "Click the game screen or press Enter to start") {
    overlay.innerHTML = `
      <div class="overlay-card">
        <h2>${title}</h2>
        ${lines.map((line) => `<p>${line}</p>`).join("")}
        <p class="prompt">${prompt}</p>
      </div>
    `;
    overlay.classList.add("is-visible");
  }

  function hideOverlay() {
    overlay.classList.remove("is-visible");
    overlay.innerHTML = "";
  }

  function isWallAt(x, y) {
    const mx = Math.floor(x);
    const my = Math.floor(y);
    if (my < 0 || my >= map.length || mx < 0 || mx >= map[my].length) return true;
    return map[my][mx] === "1";
  }

  function collidesWithRadius(x, y, radius) {
    return (
      isWallAt(x - radius, y - radius) ||
      isWallAt(x + radius, y - radius) ||
      isWallAt(x - radius, y + radius) ||
      isWallAt(x + radius, y + radius)
    );
  }

  function collides(x, y) {
    return collidesWithRadius(x, y, PLAYER_RADIUS);
  }

  function movePlayer(dx, dy) {
    const p = state.player;
    const nextX = p.x + dx;
    const nextY = p.y + dy;

    if (!collides(nextX, p.y)) p.x = nextX;
    if (!collides(p.x, nextY)) p.y = nextY;
  }

  function wrapAngle(angle) {
    while (angle < -Math.PI) angle += Math.PI * 2;
    while (angle > Math.PI) angle -= Math.PI * 2;
    return angle;
  }

  function moveEnemy(dx, dy) {
    const e = state.enemy;
    const nextX = e.x + dx;
    const nextY = e.y + dy;

    if (!collidesWithRadius(nextX, e.y, ENEMY_RADIUS)) e.x = nextX;
    if (!collidesWithRadius(e.x, nextY, ENEMY_RADIUS)) e.y = nextY;
  }

  function hasLineOfSight(from, to) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distance = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.ceil(distance / 0.12));

    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      if (isWallAt(from.x + dx * t, from.y + dy * t)) return false;
    }

    return true;
  }

  function updateEnemy(dt) {
    const e = state.enemy;
    const p = state.player;
    const distanceToPlayer = Math.hypot(p.x - e.x, p.y - e.y);
    const canSeePlayer = distanceToPlayer <= ENEMY_CHASE_RADIUS && hasLineOfSight(e, p);
    const target = canSeePlayer ? p : enemyPatrol[e.patrolIndex];
    const dx = target.x - e.x;
    const dy = target.y - e.y;
    const distanceToTarget = Math.hypot(dx, dy);

    if (!canSeePlayer && distanceToTarget < 0.18) {
      e.patrolIndex = (e.patrolIndex + 1) % enemyPatrol.length;
      return;
    }

    if (distanceToTarget > 0.02) {
      const speed = (canSeePlayer ? 0.82 : 0.58) * dt;
      const step = Math.min(speed, distanceToTarget);
      moveEnemy((dx / distanceToTarget) * step, (dy / distanceToTarget) * step);
    }

    if (distanceToPlayer <= ENEMY_DAMAGE_RADIUS && hasLineOfSight(e, p)) {
      p.health = Math.max(0, p.health - ENEMY_DAMAGE_PER_SECOND * dt);
      if (p.health <= 0) {
        state.mode = "gameover";
        showOverlay(
          "Game Over",
          ["The patrol caught you before extraction.", "Press Restart to try the route again."],
          "Click Restart or press Enter"
        );
      }
    }
  }

  function castRay(angle) {
    const sin = Math.sin(angle);
    const cos = Math.cos(angle);
    let depth = 0;

    while (depth < MAX_DEPTH) {
      const x = state.player.x + cos * depth;
      const y = state.player.y + sin * depth;
      if (isWallAt(x, y)) {
        return {
          depth,
          wallX: x,
          wallY: y,
          sideShade: Math.abs(x - Math.floor(x) - 0.5) > Math.abs(y - Math.floor(y) - 0.5) ? 1 : 0
        };
      }
      depth += 0.02;
    }

    return { depth: MAX_DEPTH, wallX: state.player.x + cos * MAX_DEPTH, wallY: state.player.y + sin * MAX_DEPTH, sideShade: 0 };
  }

  function update(dt) {
    if (state.mode !== "playing") return;

    const p = state.player;
    const turnSpeed = 2.4;
    if (state.keys.has("ArrowLeft")) p.angle -= turnSpeed * dt;
    if (state.keys.has("ArrowRight")) p.angle += turnSpeed * dt;
    p.angle = wrapAngle(p.angle);

    const forward = Number(state.keys.has("KeyW")) - Number(state.keys.has("KeyS"));
    const strafe = Number(state.keys.has("KeyD")) - Number(state.keys.has("KeyA"));
    const length = Math.hypot(forward, strafe) || 1;
    const speed = 2.35 * dt;

    const forwardX = Math.cos(p.angle) * (forward / length);
    const forwardY = Math.sin(p.angle) * (forward / length);
    const strafeX = Math.cos(p.angle + Math.PI / 2) * (strafe / length);
    const strafeY = Math.sin(p.angle + Math.PI / 2) * (strafe / length);
    movePlayer((forwardX + strafeX) * speed, (forwardY + strafeY) * speed);
    updateEnemy(dt);

    if (state.mode !== "playing") return;

    if (Math.hypot(p.x - extraction.x, p.y - extraction.y) <= EXTRACTION_RADIUS) {
      state.mode = "won";
      state.won = true;
      showOverlay(
        "Extraction Reached",
        ["Prototype complete: you reached the green extraction zone.", "Press Restart to run the route again."],
        "Click Restart or press Enter"
      );
    }
  }

  function drawSkyAndGround() {
    const sky = ctx.createLinearGradient(0, 0, 0, H / 2);
    sky.addColorStop(0, "#66707a");
    sky.addColorStop(1, "#b0ac8f");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H / 2);

    const ground = ctx.createLinearGradient(0, H / 2, 0, H);
    ground.addColorStop(0, "#514432");
    ground.addColorStop(1, "#1a140e");
    ctx.fillStyle = ground;
    ctx.fillRect(0, H / 2, W, H / 2);
  }

  function drawExtractionMarker() {
    const dx = extraction.x - state.player.x;
    const dy = extraction.y - state.player.y;
    const distance = Math.hypot(dx, dy);
    const relativeAngle = wrapAngle(Math.atan2(dy, dx) - state.player.angle);

    if (Math.abs(relativeAngle) > FOV * 0.62 || distance < 0.1) return;

    const screenX = W / 2 + (relativeAngle / (FOV / 2)) * (W / 2);
    const markerHeight = Math.min(H * 0.8, H / Math.max(distance, 0.65));
    const markerWidth = markerHeight * 0.45;
    const baseY = H / 2 + markerHeight / 2;

    ctx.save();
    ctx.globalAlpha = Math.max(0.25, 1 - distance / 15);
    ctx.fillStyle = "#43ff69";
    ctx.shadowColor = "#43ff69";
    ctx.shadowBlur = 18;
    ctx.fillRect(screenX - markerWidth / 2, baseY - markerHeight, markerWidth, markerHeight);
    ctx.restore();
  }

  function drawWorld() {
    const zBuffer = new Array(W);

    drawSkyAndGround();
    drawExtractionMarker();

    for (let column = 0; column < W; column++) {
      const rayAngle = state.player.angle - FOV / 2 + (column / W) * FOV;
      const hit = castRay(rayAngle);
      const correctedDepth = hit.depth * Math.cos(rayAngle - state.player.angle);
      zBuffer[column] = correctedDepth;
      const wallHeight = Math.min(H, (H * 0.86) / Math.max(correctedDepth, 0.001));
      const top = H / 2 - wallHeight / 2;
      const shade = Math.max(0.2, 1 - correctedDepth / MAX_DEPTH);
      const textureLine = (Math.floor(hit.wallX * 3) + Math.floor(hit.wallY * 3)) % 2 ? 10 : -6;
      const base = hit.sideShade ? 92 : 112;

      ctx.fillStyle = `rgb(${Math.floor((base + textureLine) * shade)}, ${Math.floor((74 + textureLine) * shade)}, ${Math.floor(42 * shade)})`;
      ctx.fillRect(column, top, 1, wallHeight);
    }

    return zBuffer;
  }

  function drawEnemy(zBuffer) {
    const e = state.enemy;
    const dx = e.x - state.player.x;
    const dy = e.y - state.player.y;
    const distance = Math.hypot(dx, dy);
    const relativeAngle = wrapAngle(Math.atan2(dy, dx) - state.player.angle);

    if (Math.abs(relativeAngle) > FOV * 0.72 || distance < 0.1) return;

    const screenX = W / 2 + (relativeAngle / (FOV / 2)) * (W / 2);
    const height = Math.min(H * 0.78, (H * 0.62) / Math.max(distance, 0.28));
    const width = height * 0.46;
    const left = Math.floor(screenX - width / 2);
    const right = Math.floor(screenX + width / 2);
    const top = Math.floor(H / 2 - height * 0.46);
    const bottom = Math.floor(H / 2 + height * 0.54);

    let visible = false;

    for (let x = left; x <= right; x++) {
      if (x < 0 || x >= W || distance > zBuffer[x] + 0.04) continue;
      visible = true;

      const t = (x - left) / Math.max(1, right - left);
      const shade = 0.62 + (1 - Math.abs(t - 0.5) * 2) * 0.38;
      const red = Math.floor(210 * shade);
      const green = Math.floor(42 * shade);
      const blue = Math.floor(36 * shade);

      ctx.fillStyle = `rgb(${red}, ${green}, ${blue})`;
      ctx.fillRect(x, top, 1, bottom - top);

      if (x % 3 === 0) {
        ctx.fillStyle = "rgba(60, 10, 8, 0.55)";
        ctx.fillRect(x, top + height * 0.35, 1, height * 0.18);
      }
    }

    if (!visible) return;

    const eyeY = top + height * 0.3;
    ctx.fillStyle = "#1a0504";
    ctx.fillRect(screenX - width * 0.2, eyeY, Math.max(1, width * 0.12), Math.max(1, height * 0.04));
    ctx.fillRect(screenX + width * 0.08, eyeY, Math.max(1, width * 0.12), Math.max(1, height * 0.04));
  }

  function drawMinimap() {
    const scale = 8;
    const pad = 12;

    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = "rgba(6, 7, 6, 0.76)";
    ctx.fillRect(pad - 6, pad - 6, map[0].length * scale + 12, map.length * scale + 12);

    for (let y = 0; y < map.length; y++) {
      for (let x = 0; x < map[y].length; x++) {
        ctx.fillStyle = map[y][x] === "1" ? "#5b4427" : "#1f2a1e";
        if (map[y][x] === "E") ctx.fillStyle = "#43ff69";
        ctx.fillRect(pad + x * scale, pad + y * scale, scale - 1, scale - 1);
      }
    }

    ctx.fillStyle = "#d12e2e";
    ctx.fillRect(pad + state.enemy.x * scale - 2, pad + state.enemy.y * scale - 2, 4, 4);

    ctx.fillStyle = "#f5e6a8";
    ctx.beginPath();
    ctx.arc(pad + state.player.x * scale, pad + state.player.y * scale, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#f5e6a8";
    ctx.beginPath();
    ctx.moveTo(pad + state.player.x * scale, pad + state.player.y * scale);
    ctx.lineTo(pad + (state.player.x + Math.cos(state.player.angle) * 0.7) * scale, pad + (state.player.y + Math.sin(state.player.angle) * 0.7) * scale);
    ctx.stroke();
    ctx.restore();
  }

  function drawHud() {
    const distance = Math.hypot(state.player.x - extraction.x, state.player.y - extraction.y);

    ctx.fillStyle = "rgba(8, 9, 8, 0.72)";
    ctx.fillRect(0, H - 54, W, 54);
    ctx.fillStyle = "#e0d39a";
    ctx.font = "16px 'Courier New', monospace";
    ctx.fillText("OBJECTIVE: Reach the green extraction zone", 18, H - 31);
    ctx.fillStyle = "#43ff69";
    ctx.fillText(`Distance: ${distance.toFixed(1)}m`, 18, H - 12);

    const health = Math.ceil(state.player.health);
    ctx.fillStyle = health > 35 ? "#e0d39a" : "#ff5c4d";
    ctx.fillText(`Health: ${health}`, W - 132, H - 31);
    ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
    ctx.fillRect(W - 134, H - 24, 104, 10);
    ctx.fillStyle = health > 35 ? "#43ff69" : "#ff5c4d";
    ctx.fillRect(W - 132, H - 22, Math.max(0, state.player.health), 6);

    ctx.strokeStyle = "rgba(224, 211, 154, 0.85)";
    ctx.beginPath();
    ctx.moveTo(W / 2 - 8, H / 2);
    ctx.lineTo(W / 2 + 8, H / 2);
    ctx.moveTo(W / 2, H / 2 - 8);
    ctx.lineTo(W / 2, H / 2 + 8);
    ctx.stroke();
  }

  function draw() {
    const zBuffer = drawWorld();
    drawEnemy(zBuffer);
    drawMinimap();
    drawHud();
  }

  function loop(timestamp) {
    const dt = Math.min(0.05, (timestamp - state.lastTime) / 1000 || 0);
    state.lastTime = timestamp;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  document.addEventListener("keydown", (event) => {
    if (["KeyW", "KeyA", "KeyS", "KeyD", "ArrowLeft", "ArrowRight", "Enter", "Space"].includes(event.code)) {
      event.preventDefault();
    }

    if (event.code === "Enter" || event.code === "Space") {
      if (state.mode !== "playing") resetGame();
      return;
    }

    state.keys.add(event.code);
  });

  document.addEventListener("keyup", (event) => {
    state.keys.delete(event.code);
  });

  canvas.addEventListener("click", () => {
    if (state.mode !== "playing") resetGame();
    canvas.requestPointerLock?.();
  });

  document.addEventListener("pointerlockchange", () => {
    state.pointerLocked = document.pointerLockElement === canvas;
  });

  document.addEventListener("mousemove", (event) => {
    if (state.mode === "playing" && state.pointerLocked) {
      state.player.angle = wrapAngle(state.player.angle + event.movementX * 0.0028);
    }
  });

  restartButton.addEventListener("click", resetGame);

  showOverlay(
    "Frontline Echo Prototype",
    [
      "Small flat trench map. One red patrol enemy. No weapons. No mission loop.",
      "Move with WASD. Look with mouse after clicking the screen, or use the left and right arrow keys.",
      "Goal: walk into the green extraction zone. Walls block movement."
    ]
  );
  draw();
  requestAnimationFrame(loop);
})();
