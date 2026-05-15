const isEmbedded = new URLSearchParams(window.location.search).has('embed');
document.documentElement.classList.toggle('embed', isEmbedded);
document.body.classList.toggle('embed', isEmbedded);

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestScoreEl = document.getElementById('bestScore');
const heightScoreEl = document.getElementById('heightScore');
const bonusScoreEl = document.getElementById('bonusScore');
const powerStatusEl = document.getElementById('powerStatus');
const overlay = document.getElementById('overlay');
const startButton = document.getElementById('startButton');
const pauseButton = document.getElementById('pauseButton');
const miniPauseButton = document.getElementById('miniPauseButton');
const restartButton = document.getElementById('restartButton');
const screenShell = document.getElementById('screenShell');

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const WORLD_START_Y = 520;
const BEST_KEY = 'climbingJungleEscapeBest';
const GRAVITY = 1900;
const MOVE_SPEED = 430;
const AIR_CONTROL = 0.82;
const JUMP_POWER = 760;
const BOOST_POWER = 1020;
const PLAYER_SIZE = { width: 34, height: 46 };
const PLATFORM_TYPES = ['branch', 'stone', 'plank', 'vine'];
const POWERUP_TYPES = ['boost', 'shield', 'slow'];

const input = {
  left: false,
  right: false,
  jump: false,
  jumpPressed: false,
};

let player;
let platforms;
let collectibles;
let hazards;
let powerups;
let particles;
let floatingTexts;
let clouds;
let cameraY;
let highestY;
let score;
let bonusScore;
let bestScore;
let generatorY;
let running;
let paused;
let gameOver;
let lastTime;
let shake;
let messageTimer;

function resetGame(startImmediately = false) {
  player = {
    x: WIDTH / 2 - PLAYER_SIZE.width / 2,
    y: WORLD_START_Y - 90,
    width: PLAYER_SIZE.width,
    height: PLAYER_SIZE.height,
    vx: 0,
    vy: 0,
    onGround: false,
    facing: 1,
    shield: 0,
    boost: 0,
    slow: 0,
    invincible: 0,
  };

  platforms = [
    createPlatform(190, WORLD_START_Y, 260, 'stone'),
    createPlatform(66, WORLD_START_Y - 96, 150, 'branch'),
    createPlatform(420, WORLD_START_Y - 184, 150, 'plank'),
    createPlatform(230, WORLD_START_Y - 274, 170, 'vine'),
  ];
  collectibles = [];
  hazards = [];
  powerups = [];
  particles = [];
  floatingTexts = [];
  clouds = Array.from({ length: 8 }, (_, index) => ({
    x: (index * 113) % WIDTH,
    y: 38 + ((index * 79) % 280),
    speed: 7 + (index % 4) * 5,
    scale: 0.72 + (index % 3) * 0.22,
  }));

  cameraY = 0;
  highestY = player.y;
  score = 0;
  bonusScore = 0;
  bestScore = Number(localStorage.getItem(BEST_KEY) || 0);
  generatorY = WORLD_START_Y - 370;
  running = startImmediately;
  paused = false;
  gameOver = false;
  lastTime = 0;
  shake = 0;
  messageTimer = 0;

  while (generatorY > -2200) {
    generateChunk();
  }

  updateHud();
  updateOverlay(startImmediately ? '' : 'ready');
}

function createPlatform(x, y, width, type) {
  return {
    x,
    y,
    width,
    height: type === 'vine' ? 16 : 22,
    type,
    falling: false,
    fallDelay: 0,
    vy: 0,
    touched: false,
  };
}

function generateChunk() {
  const climb = Math.max(0, WORLD_START_Y - generatorY);
  const difficulty = Math.min(1, climb / 5200);
  const gap = 78 + Math.random() * (54 + difficulty * 52);
  const width = 104 + Math.random() * (94 - difficulty * 42);
  const x = 28 + Math.random() * (WIDTH - width - 56);
  const type = PLATFORM_TYPES[Math.floor(Math.random() * PLATFORM_TYPES.length)];
  const platform = createPlatform(x, generatorY, width, type);

  if (Math.random() < 0.14 + difficulty * 0.24 && generatorY < WORLD_START_Y - 460) {
    platform.falling = true;
  }

  platforms.push(platform);

  if (Math.random() < 0.56) {
    collectibles.push({
      x: x + 20 + Math.random() * Math.max(12, width - 40),
      y: generatorY - 34 - Math.random() * 20,
      radius: 10,
      type: Math.random() < 0.55 ? 'coin' : 'fruit',
      wobble: Math.random() * Math.PI * 2,
      collected: false,
    });
  }

  if (Math.random() < 0.1 + difficulty * 0.12) {
    powerups.push({
      x: x + width / 2 - 13,
      y: generatorY - 60,
      width: 26,
      height: 26,
      type: POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)],
      wobble: Math.random() * Math.PI * 2,
      collected: false,
    });
  }

  if (Math.random() < 0.18 + difficulty * 0.35 && generatorY < WORLD_START_Y - 700) {
    const hazardType = Math.random() < 0.48 ? 'insect' : Math.random() < 0.74 ? 'rock' : 'thorns';
    hazards.push(createHazard(hazardType, generatorY - 48, difficulty));
  }

  generatorY -= gap;
}

function createHazard(type, y, difficulty) {
  if (type === 'rock') {
    return {
      type,
      x: 40 + Math.random() * (WIDTH - 80),
      y,
      radius: 16 + Math.random() * 6,
      vx: (Math.random() < 0.5 ? -1 : 1) * (90 + difficulty * 110),
      vy: 0,
      rotation: 0,
    };
  }

  if (type === 'thorns') {
    return {
      type,
      x: 32 + Math.random() * (WIDTH - 180),
      y: y + 30,
      width: 120 + Math.random() * 48,
      height: 24,
      sway: Math.random() * Math.PI * 2,
    };
  }

  return {
    type,
    x: 36 + Math.random() * (WIDTH - 72),
    baseX: 0,
    y,
    width: 34,
    height: 26,
    vx: (Math.random() < 0.5 ? -1 : 1) * (105 + difficulty * 150),
    phase: Math.random() * Math.PI * 2,
  };
}

function startGame() {
  if (gameOver) {
    resetGame(true);
  } else {
    running = true;
    paused = false;
    updateOverlay('');
  }
}

function setPaused(forceValue) {
  if (!running || gameOver) return;
  paused = typeof forceValue === 'boolean' ? forceValue : !paused;
  updateOverlay(paused ? 'paused' : '');
}

function endGame() {
  gameOver = true;
  running = false;
  shake = 20;
  burst(player.x + player.width / 2, player.y + player.height / 2, '#ffdf5d', 22);
  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem(BEST_KEY, String(bestScore));
  }
  updateHud();
  updateOverlay('gameover');
}

function update(time = 0) {
  const rawDelta = Math.min(0.032, (time - lastTime) / 1000 || 0);
  lastTime = time;
  const delta = player?.slow > 0 ? rawDelta * 0.62 : rawDelta;

  if (running && !paused && !gameOver) {
    updatePlayer(delta);
    updateWorld(delta);
    updateCamera(delta);
    cleanupWorld();
    updateHud();
  }

  updateEffects(rawDelta);
  render(rawDelta);
  input.jumpPressed = false;
  requestAnimationFrame(update);
}

function updatePlayer(delta) {
  const accel = player.onGround ? 13 : 9 * AIR_CONTROL;
  const direction = Number(input.right) - Number(input.left);
  const targetVx = direction * MOVE_SPEED;
  player.vx += (targetVx - player.vx) * Math.min(1, accel * delta);

  if (direction !== 0) player.facing = direction;
  if (input.jumpPressed && player.onGround) {
    player.vy = -(player.boost > 0 ? BOOST_POWER : JUMP_POWER);
    player.onGround = false;
    shake = Math.max(shake, 4);
    burst(
      player.x + player.width / 2,
      player.y + player.height,
      player.boost > 0 ? '#50e6ff' : '#fff8dc',
      8,
    );
    playTone(540, 0.05, 'triangle');
  }

  player.vy += GRAVITY * delta;
  player.vy = Math.min(player.vy, 1200);
  player.x += player.vx * delta;
  player.y += player.vy * delta;

  if (player.x < -player.width) player.x = WIDTH;
  if (player.x > WIDTH) player.x = -player.width;

  player.onGround = false;
  resolvePlatformCollisions(delta);
  collectItems();
  checkHazards();

  highestY = Math.min(highestY, player.y);
  const heightScore = Math.max(0, Math.floor((WORLD_START_Y - highestY) / 9));
  score = heightScore + bonusScore;

  player.shield = Math.max(0, player.shield - delta);
  player.boost = Math.max(0, player.boost - delta);
  player.slow = Math.max(0, player.slow - delta);
  player.invincible = Math.max(0, player.invincible - delta);

  if (player.y - cameraY > HEIGHT + 120) {
    endGame();
  }
}

function resolvePlatformCollisions(delta) {
  if (player.vy < 0) return;

  const previousBottom = player.y + player.height - player.vy * delta;
  const currentBottom = player.y + player.height;

  platforms.forEach((platform) => {
    const withinX =
      player.x + player.width > platform.x + 5 && player.x < platform.x + platform.width - 5;
    const crossed = previousBottom <= platform.y + 8 && currentBottom >= platform.y;
    const visible = platform.y - cameraY > -80 && platform.y - cameraY < HEIGHT + 120;

    if (withinX && crossed && visible && platform.vy < 420) {
      player.y = platform.y - player.height;
      player.vy = 0;
      player.onGround = true;
      if (!platform.touched) {
        platform.touched = true;
        burst(
          player.x + player.width / 2,
          platform.y,
          platform.type === 'stone' ? '#d9b778' : '#86f26b',
          5,
        );
      }
      if (platform.falling && platform.fallDelay === 0) {
        platform.fallDelay = 0.2;
        shake = Math.max(shake, 5);
      }
    }
  });
}

function collectItems() {
  collectibles.forEach((item) => {
    if (item.collected) return;
    const dx = player.x + player.width / 2 - item.x;
    const dy = player.y + player.height / 2 - item.y;
    if (Math.hypot(dx, dy) < item.radius + 23) {
      item.collected = true;
      const points = item.type === 'coin' ? 50 : 80;
      bonusScore += points;
      floatingTexts.push({
        x: item.x,
        y: item.y,
        text: `+${points}`,
        life: 0.8,
        color: item.type === 'coin' ? '#ffe66d' : '#ff8a3d',
      });
      burst(item.x, item.y, item.type === 'coin' ? '#ffe66d' : '#ff8a3d', 12);
      playTone(item.type === 'coin' ? 880 : 720, 0.04, 'sine');
    }
  });

  powerups.forEach((powerup) => {
    if (powerup.collected || !rectsOverlap(player, powerup)) return;
    powerup.collected = true;
    activatePowerup(powerup.type);
    burst(
      powerup.x + powerup.width / 2,
      powerup.y + powerup.height / 2,
      powerupColor(powerup.type),
      18,
    );
  });
}

function activatePowerup(type) {
  if (type === 'boost') {
    player.boost = 8;
    messageTimer = 1.2;
    floatingTexts.push({
      x: player.x,
      y: player.y - 18,
      text: 'Jump Boost!',
      life: 1,
      color: '#50e6ff',
    });
    playTone(980, 0.08, 'triangle');
  } else if (type === 'shield') {
    player.shield = 9;
    player.invincible = Math.max(player.invincible, 0.8);
    floatingTexts.push({
      x: player.x,
      y: player.y - 18,
      text: 'Shield!',
      life: 1,
      color: '#8ef06a',
    });
    playTone(660, 0.1, 'sine');
  } else {
    player.slow = 7;
    floatingTexts.push({
      x: player.x,
      y: player.y - 18,
      text: 'Slow Motion!',
      life: 1,
      color: '#b391ff',
    });
    playTone(440, 0.12, 'sawtooth');
  }
}

function checkHazards() {
  if (player.invincible > 0) return;

  const hit = hazards.some((hazard) => {
    if (hazard.type === 'rock') {
      return circleRectOverlap(hazard, player);
    }
    return rectsOverlap(player, hazard);
  });

  if (!hit) return;

  if (player.shield > 0) {
    player.shield = 0;
    player.invincible = 1.2;
    player.vy = -650;
    shake = 12;
    floatingTexts.push({
      x: player.x,
      y: player.y - 20,
      text: 'Shield Block!',
      life: 1,
      color: '#8ef06a',
    });
    burst(player.x + player.width / 2, player.y + player.height / 2, '#8ef06a', 22);
    playTone(220, 0.1, 'square');
  } else {
    endGame();
  }
}

function updateWorld(delta) {
  const climb = Math.max(0, WORLD_START_Y - highestY);
  const difficulty = Math.min(1, climb / 5200);

  while (generatorY > cameraY - 900) {
    generateChunk();
  }

  platforms.forEach((platform) => {
    if (platform.fallDelay > 0) {
      platform.fallDelay -= delta;
      if (platform.fallDelay <= 0) platform.vy = 90;
    }
    if (platform.vy > 0) {
      platform.vy += GRAVITY * 0.75 * delta;
      platform.y += platform.vy * delta;
    }
  });

  hazards.forEach((hazard) => {
    if (hazard.type === 'rock') {
      hazard.vy += GRAVITY * (0.18 + difficulty * 0.18) * delta;
      hazard.x += hazard.vx * delta;
      hazard.y += hazard.vy * delta;
      hazard.rotation += hazard.vx * delta * 0.02;
      if (hazard.x < hazard.radius || hazard.x > WIDTH - hazard.radius) hazard.vx *= -1;
    } else if (hazard.type === 'insect') {
      hazard.x += hazard.vx * delta;
      hazard.y += Math.sin(performance.now() / 180 + hazard.phase) * 0.55;
      if (hazard.x < 18 || hazard.x > WIDTH - hazard.width - 18) hazard.vx *= -1;
    } else {
      hazard.sway += delta * 2;
    }
  });

  clouds.forEach((cloud) => {
    cloud.x += cloud.speed * delta;
    if (cloud.x > WIDTH + 80) cloud.x = -130;
  });
}

function updateCamera(delta) {
  const targetY = Math.min(cameraY, player.y - HEIGHT * 0.48);
  cameraY += (targetY - cameraY) * Math.min(1, 5.5 * delta);
}

function updateEffects(delta) {
  shake = Math.max(0, shake - 38 * delta);
  messageTimer = Math.max(0, messageTimer - delta);

  particles.forEach((particle) => {
    particle.life -= delta;
    particle.x += particle.vx * delta;
    particle.y += particle.vy * delta;
    particle.vy += 360 * delta;
  });
  particles = particles.filter((particle) => particle.life > 0);

  floatingTexts.forEach((text) => {
    text.life -= delta;
    text.y -= 42 * delta;
  });
  floatingTexts = floatingTexts.filter((text) => text.life > 0);
}

function cleanupWorld() {
  const bottom = cameraY + HEIGHT + 260;
  platforms = platforms.filter((platform) => platform.y < bottom);
  collectibles = collectibles.filter((item) => !item.collected && item.y < bottom);
  powerups = powerups.filter((item) => !item.collected && item.y < bottom);
  hazards = hazards.filter((hazard) => hazard.y < bottom + 140);
}

function updateHud() {
  const heightScore = Math.max(0, Math.floor((WORLD_START_Y - highestY) / 9));
  scoreEl.textContent = score.toLocaleString();
  bestScoreEl.textContent = bestScore.toLocaleString();
  heightScoreEl.textContent = `${heightScore}m`;
  bonusScoreEl.textContent = bonusScore.toLocaleString();
  powerStatusEl.textContent = getPowerStatus();
  pauseButton.textContent = paused ? 'Resume' : 'Pause';
  miniPauseButton.textContent = paused ? 'Resume' : 'Pause';
}

function getPowerStatus() {
  const active = [];
  if (player.boost > 0) active.push(`Boost ${Math.ceil(player.boost)}s`);
  if (player.shield > 0) active.push(`Shield ${Math.ceil(player.shield)}s`);
  if (player.slow > 0) active.push(`Slow ${Math.ceil(player.slow)}s`);
  return active.length ? active.join(' • ') : 'Ready';
}

function updateOverlay(state) {
  if (!state) {
    overlay.classList.add('hidden');
    return;
  }

  overlay.classList.remove('hidden');
  if (state === 'paused') {
    overlay.innerHTML = `
      <p class="overlay-kicker">Canopy break</p>
      <h2>Paused</h2>
      <p>Press P or tap Resume to keep climbing.</p>
      <button id="startButton" type="button">Resume</button>
    `;
  } else if (state === 'gameover') {
    overlay.innerHTML = `
      <p class="overlay-kicker">Run ended</p>
      <h2>Game Over</h2>
      <p>Score: ${score.toLocaleString()} • Best: ${bestScore.toLocaleString()}</p>
      <p>Grab boosts, shields, and slow-motion charms for a higher climb.</p>
      <button id="startButton" type="button">Restart Climb</button>
    `;
  } else {
    overlay.innerHTML = `
      <p class="overlay-kicker">Climb High</p>
      <h2>Climbing Jungle Escape</h2>
      <p>Move with ← → / A D. Jump with Space or W.</p>
      <p>Dodge falling branches, rolling rocks, vines, and insects.</p>
      <button id="startButton" type="button">Start Climb</button>
    `;
  }
  overlay.querySelector('button')?.addEventListener('click', startGame);
}

function render(delta) {
  ctx.save();
  const shakeX = shake > 0 ? (Math.random() - 0.5) * shake : 0;
  const shakeY = shake > 0 ? (Math.random() - 0.5) * shake : 0;
  ctx.translate(shakeX, shakeY);
  drawBackground(delta);
  ctx.translate(0, -cameraY);
  drawPlatforms();
  drawCollectibles(performance.now() / 1000);
  drawPowerups(performance.now() / 1000);
  drawHazards();
  drawPlayer();
  drawParticles();
  drawFloatingTexts();
  ctx.restore();
  drawScreenHud();
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  gradient.addColorStop(0, '#5fd8ff');
  gradient.addColorStop(0.55, '#86ed83');
  gradient.addColorStop(1, '#35b85c');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  drawSun();
  drawClouds();
  drawMountains();
  drawDistantTrees(0.16, '#2c9b5c', 130, 0.5);
  drawTempleLayer();
  drawDistantTrees(0.34, '#168348', 84, 0.82);
  drawVines();
}

function drawSun() {
  ctx.fillStyle = '#ffe66d';
  ctx.beginPath();
  ctx.arc(92, 88, 44, 0, Math.PI * 2);
  ctx.fill();
}

function drawClouds() {
  ctx.fillStyle = 'rgba(255, 248, 220, 0.82)';
  clouds.forEach((cloud) => {
    ctx.save();
    ctx.translate(cloud.x, cloud.y + ((-cameraY * 0.05) % HEIGHT));
    ctx.scale(cloud.scale, cloud.scale);
    ctx.beginPath();
    ctx.arc(0, 16, 22, 0, Math.PI * 2);
    ctx.arc(28, 6, 28, 0, Math.PI * 2);
    ctx.arc(62, 18, 21, 0, Math.PI * 2);
    ctx.fillRect(-4, 16, 76, 22);
    ctx.fill();
    ctx.restore();
  });
}

function drawMountains() {
  const offset = ((-cameraY * 0.1) % HEIGHT) - HEIGHT;
  ctx.fillStyle = 'rgba(119, 153, 104, 0.42)';
  for (let y = offset; y < HEIGHT * 2; y += HEIGHT) {
    ctx.beginPath();
    ctx.moveTo(-60, y + 500);
    ctx.lineTo(118, y + 248);
    ctx.lineTo(290, y + 500);
    ctx.lineTo(430, y + 282);
    ctx.lineTo(700, y + 500);
    ctx.closePath();
    ctx.fill();
  }
}

function drawDistantTrees(parallax, color, canopyBase, alpha) {
  const offset = ((-cameraY * parallax) % 260) - 260;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  for (let y = offset; y < HEIGHT + 260; y += 260) {
    for (let x = -30; x < WIDTH + 80; x += 92) {
      ctx.fillRect(x + 34, y + 76, 14, 160);
      ctx.beginPath();
      ctx.arc(x + 40, y + canopyBase, 48, 0, Math.PI * 2);
      ctx.arc(x + 10, y + canopyBase + 28, 36, 0, Math.PI * 2);
      ctx.arc(x + 72, y + canopyBase + 26, 40, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function drawTempleLayer() {
  const offset = ((-cameraY * 0.22) % 360) - 360;
  ctx.fillStyle = 'rgba(140, 103, 66, 0.48)';
  for (let y = offset; y < HEIGHT + 360; y += 360) {
    ctx.fillRect(444, y + 190, 112, 178);
    ctx.fillRect(416, y + 238, 168, 24);
    ctx.fillRect(390, y + 296, 220, 30);
    ctx.fillStyle = 'rgba(91, 69, 44, 0.42)';
    ctx.fillRect(484, y + 228, 34, 70);
    ctx.fillStyle = 'rgba(140, 103, 66, 0.48)';
  }
}

function drawVines() {
  ctx.strokeStyle = 'rgba(22, 118, 61, 0.48)';
  ctx.lineWidth = 7;
  for (let x = 38; x < WIDTH; x += 112) {
    ctx.beginPath();
    for (let y = -40; y <= HEIGHT + 40; y += 28) {
      const sway = Math.sin((y + cameraY) * 0.013 + x) * 13;
      if (y === -40) ctx.moveTo(x + sway, y);
      else ctx.lineTo(x + sway, y);
    }
    ctx.stroke();
  }
}

function drawPlatforms() {
  platforms.forEach((platform) => {
    if (!isInView(platform.y, 80)) return;
    if (platform.type === 'branch') drawBranch(platform);
    if (platform.type === 'stone') drawStone(platform);
    if (platform.type === 'plank') drawPlank(platform);
    if (platform.type === 'vine') drawVinePlatform(platform);
  });
}

function drawBranch(platform) {
  roundRect(platform.x, platform.y, platform.width, platform.height, 12, '#7a4524');
  roundRect(platform.x + 6, platform.y - 5, platform.width - 12, 10, 8, '#a96532');
  ctx.fillStyle = '#2cc864';
  for (let x = platform.x + 20; x < platform.x + platform.width - 8; x += 38) {
    ctx.beginPath();
    ctx.ellipse(x, platform.y - 8, 18, 8, -0.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawStone(platform) {
  roundRect(platform.x, platform.y, platform.width, platform.height, 4, '#d9b778');
  ctx.fillStyle = '#b58a55';
  ctx.fillRect(platform.x + 12, platform.y + 6, platform.width * 0.28, 4);
  ctx.fillRect(platform.x + platform.width * 0.58, platform.y + 13, platform.width * 0.24, 4);
}

function drawPlank(platform) {
  roundRect(platform.x, platform.y, platform.width, platform.height, 6, '#b36a32');
  ctx.fillStyle = '#6f3c1f';
  ctx.fillRect(platform.x + platform.width * 0.32, platform.y + 2, 4, platform.height - 4);
  ctx.fillRect(platform.x + platform.width * 0.66, platform.y + 2, 4, platform.height - 4);
  ctx.fillStyle = '#f3b46b';
  ctx.fillRect(platform.x + 10, platform.y + 5, platform.width - 20, 3);
}

function drawVinePlatform(platform) {
  ctx.strokeStyle = '#116d39';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(platform.x, platform.y + 8);
  for (let x = 0; x <= platform.width; x += 16) {
    ctx.lineTo(platform.x + x, platform.y + 8 + Math.sin(x * 0.2) * 5);
  }
  ctx.stroke();
  ctx.fillStyle = '#8ef06a';
  for (let x = platform.x + 10; x < platform.x + platform.width; x += 28) {
    ctx.beginPath();
    ctx.ellipse(x, platform.y + 2, 12, 6, 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCollectibles(time) {
  collectibles.forEach((item) => {
    if (item.collected || !isInView(item.y, 70)) return;
    const bob = Math.sin(time * 5 + item.wobble) * 4;
    if (item.type === 'coin') {
      ctx.fillStyle = '#ffe66d';
      ctx.beginPath();
      ctx.arc(item.x, item.y + bob, item.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#b87819';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = '#fff8dc';
      ctx.fillRect(item.x - 2, item.y + bob - 6, 4, 12);
    } else {
      ctx.fillStyle = '#ff8a3d';
      ctx.beginPath();
      ctx.arc(item.x, item.y + bob, item.radius + 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2cc864';
      ctx.beginPath();
      ctx.ellipse(item.x + 5, item.y + bob - 11, 9, 5, -0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

function drawPowerups(time) {
  powerups.forEach((powerup) => {
    if (powerup.collected || !isInView(powerup.y, 80)) return;
    const bob = Math.sin(time * 4 + powerup.wobble) * 5;
    const color = powerupColor(powerup.type);
    roundRect(powerup.x, powerup.y + bob, powerup.width, powerup.height, 8, color);
    ctx.strokeStyle = '#17311f';
    ctx.lineWidth = 3;
    ctx.strokeRect(powerup.x + 3, powerup.y + bob + 3, powerup.width - 6, powerup.height - 6);
    ctx.fillStyle = '#17311f';
    ctx.font = '900 15px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      powerup.type === 'boost' ? 'J' : powerup.type === 'shield' ? 'S' : 'T',
      powerup.x + 13,
      powerup.y + bob + 14,
    );
  });
}

function drawHazards() {
  hazards.forEach((hazard) => {
    if (!isInView(hazard.y, 110)) return;
    if (hazard.type === 'rock') drawRock(hazard);
    if (hazard.type === 'insect') drawInsect(hazard);
    if (hazard.type === 'thorns') drawThorns(hazard);
  });
}

function drawRock(rock) {
  ctx.save();
  ctx.translate(rock.x, rock.y);
  ctx.rotate(rock.rotation);
  ctx.fillStyle = '#8c6742';
  ctx.beginPath();
  ctx.moveTo(-rock.radius, -4);
  ctx.lineTo(-8, -rock.radius);
  ctx.lineTo(rock.radius * 0.8, -rock.radius * 0.72);
  ctx.lineTo(rock.radius, 5);
  ctx.lineTo(6, rock.radius);
  ctx.lineTo(-rock.radius * 0.82, rock.radius * 0.7);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#d9b778';
  ctx.fillRect(-5, -9, 10, 5);
  ctx.restore();
}

function drawInsect(insect) {
  ctx.fillStyle = '#f04f45';
  ctx.beginPath();
  ctx.ellipse(insect.x + 17, insect.y + 14, 17, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 248, 220, 0.72)';
  ctx.beginPath();
  ctx.ellipse(insect.x + 8, insect.y + 8, 12, 7, -0.6, 0, Math.PI * 2);
  ctx.ellipse(insect.x + 26, insect.y + 8, 12, 7, 0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#17311f';
  ctx.fillRect(insect.x + 24, insect.y + 12, 4, 4);
}

function drawThorns(thorns) {
  ctx.fillStyle = '#126d39';
  ctx.fillRect(thorns.x, thorns.y + thorns.height - 6, thorns.width, 6);
  ctx.fillStyle = '#f04f45';
  for (let x = thorns.x; x < thorns.x + thorns.width; x += 18) {
    ctx.beginPath();
    ctx.moveTo(x, thorns.y + thorns.height);
    ctx.lineTo(x + 9, thorns.y + Math.sin(thorns.sway + x) * 3);
    ctx.lineTo(x + 18, thorns.y + thorns.height);
    ctx.closePath();
    ctx.fill();
  }
}

function drawPlayer() {
  const cx = player.x + player.width / 2;
  const cy = player.y + player.height / 2;
  if (player.shield > 0) {
    ctx.strokeStyle = 'rgba(142, 240, 106, 0.88)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(cx, cy, 34 + Math.sin(performance.now() / 90) * 3, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (player.invincible > 0 && Math.floor(performance.now() / 80) % 2 === 0) return;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(player.facing, 1);
  roundRect(-15, -16, 30, 34, 10, '#ffb347');
  ctx.fillStyle = '#fff8dc';
  ctx.beginPath();
  ctx.arc(0, -24, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#17311f';
  ctx.fillRect(4, -27, 4, 4);
  ctx.fillStyle = '#22c55e';
  ctx.beginPath();
  ctx.ellipse(-2, -38, 18, 8, -0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#17311f';
  ctx.fillRect(-12, 15, 8, 14);
  ctx.fillRect(5, 15, 8, 14);
  ctx.fillStyle = '#ffe66d';
  ctx.fillRect(-22, -7, 9, 21);
  ctx.fillRect(13, -7, 9, 21);
  ctx.restore();
}

function drawParticles() {
  particles.forEach((particle) => {
    ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
    ctx.fillStyle = particle.color;
    ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
    ctx.globalAlpha = 1;
  });
}

function drawFloatingTexts() {
  ctx.font = '900 18px Trebuchet MS, Arial';
  ctx.textAlign = 'center';
  floatingTexts.forEach((text) => {
    ctx.globalAlpha = Math.max(0, text.life);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#17311f';
    ctx.strokeText(text.text, text.x, text.y);
    ctx.fillStyle = text.color;
    ctx.fillText(text.text, text.x, text.y);
    ctx.globalAlpha = 1;
  });
}

function drawScreenHud() {
  if (!isEmbedded) return;
  ctx.fillStyle = 'rgba(23, 49, 31, 0.64)';
  roundRect(12, 12, 196, 54, 14, 'rgba(23, 49, 31, 0.64)');
  ctx.fillStyle = '#fff8dc';
  ctx.font = '900 18px Trebuchet MS, Arial';
  ctx.textAlign = 'left';
  ctx.fillText(`Score ${score.toLocaleString()}`, 28, 36);
  ctx.font = '800 13px Trebuchet MS, Arial';
  ctx.fillText(`Best ${bestScore.toLocaleString()}`, 28, 56);

  if (player.boost > 0 || player.shield > 0 || player.slow > 0 || messageTimer > 0) {
    ctx.fillStyle = 'rgba(255, 248, 220, 0.82)';
    roundRect(WIDTH - 210, 14, 194, 42, 12, 'rgba(255, 248, 220, 0.82)');
    ctx.fillStyle = '#17311f';
    ctx.font = '900 14px Trebuchet MS, Arial';
    ctx.textAlign = 'center';
    ctx.fillText(getPowerStatus(), WIDTH - 113, 40);
  }
}

function burst(x, y, color, count) {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 70 + Math.random() * 220;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 80,
      size: 3 + Math.random() * 5,
      color,
      life: 0.35 + Math.random() * 0.35,
      maxLife: 0.7,
    });
  }
}

function roundRect(x, y, width, height, radius, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
  ctx.fill();
}

function powerupColor(type) {
  if (type === 'boost') return '#50e6ff';
  if (type === 'shield') return '#8ef06a';
  return '#b391ff';
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function circleRectOverlap(circle, rect) {
  const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width));
  const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height));
  return Math.hypot(circle.x - closestX, circle.y - closestY) < circle.radius;
}

function isInView(y, margin = 0) {
  return y > cameraY - margin && y < cameraY + HEIGHT + margin;
}

let audioContext;
function playTone(frequency, duration, type = 'sine') {
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.035, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
  } catch {
    // Audio is optional; gameplay continues if a browser blocks sound creation.
  }
}

function setKey(code, isDown) {
  if (code === 'ArrowLeft' || code === 'KeyA') input.left = isDown;
  if (code === 'ArrowRight' || code === 'KeyD') input.right = isDown;
  if (code === 'Space' || code === 'KeyW' || code === 'ArrowUp') {
    if (isDown && !input.jump) input.jumpPressed = true;
    input.jump = isDown;
  }
}

window.addEventListener('keydown', (event) => {
  if (
    ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'Space', 'KeyA', 'KeyD', 'KeyW'].includes(event.code)
  ) {
    event.preventDefault();
    setKey(event.code, true);
  }
  if (event.code === 'KeyP') setPaused();
  if (event.code === 'Enter') resetGame(true);
});

window.addEventListener('keyup', (event) => {
  setKey(event.code, false);
});

function bindTouchControls() {
  document.querySelectorAll('[data-touch]').forEach((button) => {
    const action = button.dataset.touch;
    const start = (event) => {
      event.preventDefault();
      if (action === 'left') input.left = true;
      if (action === 'right') input.right = true;
      if (action === 'jump') {
        if (!input.jump) input.jumpPressed = true;
        input.jump = true;
      }
    };
    const end = (event) => {
      event.preventDefault();
      if (action === 'left') input.left = false;
      if (action === 'right') input.right = false;
      if (action === 'jump') input.jump = false;
    };
    button.addEventListener('pointerdown', start);
    button.addEventListener('pointerup', end);
    button.addEventListener('pointercancel', end);
    button.addEventListener('pointerleave', end);
  });

  screenShell.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse') return;
    const rect = screenShell.getBoundingClientRect();
    if (event.clientX < rect.left + rect.width * 0.38) input.left = true;
    if (event.clientX > rect.left + rect.width * 0.62) input.right = true;
    if (!input.jump) input.jumpPressed = true;
    input.jump = true;
  });

  screenShell.addEventListener('pointerup', () => {
    input.left = false;
    input.right = false;
    input.jump = false;
  });
}

startButton.addEventListener('click', startGame);
pauseButton.addEventListener('click', () => setPaused());
miniPauseButton.addEventListener('click', () => setPaused());
restartButton.addEventListener('click', () => resetGame(true));
bindTouchControls();
resetGame(false);
requestAnimationFrame(update);
