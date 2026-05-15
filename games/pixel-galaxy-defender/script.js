const isEmbedded = new URLSearchParams(window.location.search).has('embed');
document.documentElement.classList.toggle('embed', isEmbedded);
document.body.classList.toggle('embed', isEmbedded);

// Pixel Galaxy Defender
// A beginner-friendly canvas game inspired by classic arcade space shooters.
// Everything is drawn with rectangles so students can edit the shapes easily.

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const restartButton = document.getElementById('restartButton');

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

const keys = {
  left: false,
  right: false,
  fire: false,
};

let player;
let enemies;
let playerShots;
let enemyShots;
let particles;
let stars;
let score;
let lives;
let wave;
let enemyDirection;
let enemySpeed;
let enemyDrop;
let enemyFireChance;
let enemyShotSpeed;
let enemyAggression;
let fireCooldown;
let gameOver;
let highScore;
let waveIntroTimer;
let waveIntroText;
let boss;
let elapsedTime;
let lastTime = 0;

const HIGH_SCORE_KEY = 'pixelGalaxyDefenderHighScore';

// Pixel sprites are tiny maps. X means "draw a square" and . means "empty".
const playerSprite = [
  '..X..',
  '.XXX.',
  'XXXXX',
  'X.X.X',
];

const enemySprites = [
  ['.XXX.', 'X.X.X', 'XXXXX', '.X.X.'],
  ['X...X', '.XXX.', 'XXXXX', 'X.X.X'],
  ['.X.X.', 'XXXXX', 'XX.XX', '.X.X.'],
];

const bossSprite = [
  '..XXXXXX..',
  '.XXXXXXXX.',
  'XXX.XX.XXX',
  'XXXXXXXXXX',
  '..XX..XX..',
];

function resetGame() {
  player = {
    x: WIDTH / 2 - 24,
    y: HEIGHT - 72,
    width: 48,
    height: 36,
    speed: 360,
    invincibleTimer: 0,
  };

  playerShots = [];
  enemyShots = [];
  particles = [];
  stars = makeStars();
  score = 0;
  lives = 3;
  wave = 1;
  highScore = loadHighScore();
  fireCooldown = 0;
  gameOver = false;
  boss = null;
  elapsedTime = 0;
  restartButton.classList.remove('show');
  startWave();
}

function makeStars() {
  const newStars = [];
  for (let i = 0; i < 95; i++) {
    newStars.push({
      x: Math.random() * WIDTH,
      y: Math.random() * HEIGHT,
      size: Math.random() > 0.82 ? 3 : 2,
      speed: 15 + Math.random() * 38,
      color: Math.random() > 0.75 ? '#29f5ff' : '#ffffff',
    });
  }
  return newStars;
}

function startWave() {
  enemies = [];
  enemyShots = [];
  playerShots = [];
  boss = null;

  const difficulty = getWaveDifficulty(wave);
  enemyDirection = 1;
  enemySpeed = difficulty.enemySpeed;
  enemyDrop = difficulty.enemyDrop;
  enemyFireChance = difficulty.fireChance;
  enemyShotSpeed = difficulty.shotSpeed;
  enemyAggression = difficulty.aggression;
  waveIntroTimer = 2.1;
  waveIntroText = isBossWave(wave) ? `WAVE ${wave}  -  BOSS WAVE` : `WAVE ${wave}`;

  if (isBossWave(wave)) {
    startBossWave(difficulty);
    return;
  }

  const rows = Math.min(2 + Math.floor((wave + 1) / 2), 5);
  const cols = wave <= 3 ? 7 : 9;
  const startX = cols === 7 ? 156 : 88;
  const startY = 76;
  const gapX = 68;
  const gapY = 54;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      enemies.push({
        x: startX + col * gapX,
        y: startY + row * gapY,
        homeY: startY + row * gapY,
        width: 38,
        height: 30,
        sprite: enemySprites[row % enemySprites.length],
        color: row % 2 === 0 ? '#73ff85' : '#ff4fd8',
        points: (rows - row) * 10 + wave * 2,
        phase: Math.random() * Math.PI * 2,
        diving: false,
        diveCooldown: 2 + Math.random() * 4,
        diveVy: 0,
      });
    }
  }
}

function startBossWave(difficulty) {
  const bossNumber = Math.floor(wave / 5);
  boss = {
    x: WIDTH / 2 - 80,
    y: 78,
    width: 160,
    height: 80,
    health: 32 + bossNumber * 18,
    maxHealth: 32 + bossNumber * 18,
    speed: Math.min(70 + bossNumber * 18, 170),
    direction: 1,
    fireTimer: Math.max(1.15 - bossNumber * 0.1, 0.48),
    patternStep: 0,
    points: 1000 + wave * 200,
    color: '#ffe66d',
  };
}

function getWaveDifficulty(currentWave) {
  if (currentWave <= 3) {
    return {
      enemySpeed: 34 + currentWave * 8,
      enemyDrop: 16,
      fireChance: 0.008 + currentWave * 0.002,
      shotSpeed: 150 + currentWave * 12,
      aggression: 0,
    };
  }

  if (currentWave <= 7) {
    return {
      enemySpeed: 58 + (currentWave - 3) * 12,
      enemyDrop: 18 + currentWave,
      fireChance: 0.018 + (currentWave - 4) * 0.004,
      shotSpeed: 190 + currentWave * 14,
      aggression: 1,
    };
  }

  if (currentWave <= 12) {
    return {
      enemySpeed: 105 + (currentWave - 8) * 10,
      enemyDrop: 25 + currentWave,
      fireChance: 0.034 + (currentWave - 8) * 0.005,
      shotSpeed: 250 + currentWave * 12,
      aggression: 2,
    };
  }

  const extraWaves = currentWave - 13;
  return {
    enemySpeed: Math.min(150 + extraWaves * 5, 225),
    enemyDrop: Math.min(38 + extraWaves, 58),
    fireChance: Math.min(0.055 + extraWaves * 0.0025, 0.095),
    shotSpeed: Math.min(400 + extraWaves * 10, 560),
    aggression: 3,
  };
}

function isBossWave(currentWave) {
  return currentWave % 5 === 0;
}

function loadHighScore() {
  const savedScore = Number.parseInt(localStorage.getItem(HIGH_SCORE_KEY), 10);
  return Number.isFinite(savedScore) ? savedScore : 0;
}

function saveHighScore() {
  if (score > highScore) {
    highScore = score;
    localStorage.setItem(HIGH_SCORE_KEY, String(highScore));
  }
}

function update(delta) {
  if (gameOver) return;

  elapsedTime += delta;
  updateStars(delta);
  updatePlayer(delta);
  updatePlayerShots(delta);

  if (waveIntroTimer > 0) {
    waveIntroTimer = Math.max(0, waveIntroTimer - delta);
  } else {
    updateEnemies(delta);
    updateBoss(delta);
  }

  updateEnemyShots(delta);
  updateParticles(delta);
  checkCollisions();

  fireCooldown = Math.max(0, fireCooldown - delta);
  player.invincibleTimer = Math.max(0, player.invincibleTimer - delta);

  if (enemies.length === 0 && !boss) {
    advanceWave();
  }
}

function updateStars(delta) {
  stars.forEach((star) => {
    star.y += star.speed * delta;
    if (star.y > HEIGHT) {
      star.y = 0;
      star.x = Math.random() * WIDTH;
    }
  });
}

function updatePlayer(delta) {
  if (keys.left) player.x -= player.speed * delta;
  if (keys.right) player.x += player.speed * delta;

  player.x = clamp(player.x, 16, WIDTH - player.width - 16);

  if (keys.fire && fireCooldown <= 0) {
    playerShots.push({
      x: player.x + player.width / 2 - 3,
      y: player.y - 12,
      width: 6,
      height: 18,
      speed: 520,
    });
    fireCooldown = 0.22;
  }
}

function updatePlayerShots(delta) {
  playerShots.forEach((shot) => {
    shot.y -= shot.speed * delta;
  });
  playerShots = playerShots.filter((shot) => shot.y + shot.height > 0);
}

function updateEnemies(delta) {
  let shouldDrop = false;

  enemies.forEach((enemy) => {
    enemy.x += enemyDirection * enemySpeed * delta;

    if (enemyAggression >= 1 && !enemy.diving) {
      enemy.y = enemy.homeY + Math.sin(elapsedTime * 3 + enemy.phase) * (4 + enemyAggression * 3);
    }

    if (enemyAggression >= 2) {
      enemy.diveCooldown -= delta;
      if (!enemy.diving && enemy.diveCooldown <= 0 && Math.random() < 0.006 * enemyAggression) {
        enemy.diving = true;
        enemy.diveVy = 135 + enemyAggression * 35;
      }
    }

    if (enemy.diving) {
      enemy.y += enemy.diveVy * delta;
      enemy.x += Math.sign(player.x + player.width / 2 - (enemy.x + enemy.width / 2)) * (70 + enemyAggression * 30) * delta;
      if (enemy.y > HEIGHT + enemy.height) {
        enemy.y = -enemy.height;
        enemy.homeY = 76 + Math.random() * 120;
        enemy.diving = false;
        enemy.diveCooldown = 2.5 + Math.random() * 4;
      }
    }

    if (enemy.x < 18 || enemy.x + enemy.width > WIDTH - 18) {
      shouldDrop = true;
    }
  });

  if (shouldDrop) {
    enemyDirection *= -1;
    enemies.forEach((enemy) => {
      enemy.homeY += enemyDrop;
      enemy.y += enemyDrop;
    });
  }

  if (enemies.length > 0 && Math.random() < enemyFireChance) {
    const shooter = enemies[Math.floor(Math.random() * enemies.length)];
    enemyShots.push({
      x: shooter.x + shooter.width / 2 - 3,
      y: shooter.y + shooter.height,
      width: 6,
      height: 16,
      speed: enemyShotSpeed,
      vx: enemyAggression >= 2 ? (Math.random() - 0.5) * 80 : 0,
    });
  }

  if (enemies.some((enemy) => enemy.y + enemy.height >= player.y)) {
    loseLife();
  }
}

function updateBoss(delta) {
  if (!boss) return;

  boss.x += boss.direction * boss.speed * delta;
  boss.y = 76 + Math.sin(elapsedTime * (1.4 + wave * 0.04)) * 18;
  if (boss.x < 26 || boss.x + boss.width > WIDTH - 26) {
    boss.direction *= -1;
    boss.x = clamp(boss.x, 26, WIDTH - boss.width - 26);
  }

  boss.fireTimer -= delta;
  if (boss.fireTimer <= 0) {
    fireBossPattern();
    const bossNumber = Math.floor(wave / 5);
    boss.fireTimer = Math.max(1.15 - bossNumber * 0.1, 0.48);
  }
}

function fireBossPattern() {
  const centerX = boss.x + boss.width / 2;
  const baseY = boss.y + boss.height - 4;
  const bulletSpeed = Math.min(170 + wave * 18, 500);
  const pattern = boss.patternStep % 3;

  if (pattern === 0) {
    [-140, -70, 0, 70, 140].forEach((vx) => addEnemyShot(centerX, baseY, vx, bulletSpeed));
  } else if (pattern === 1) {
    for (let i = -3; i <= 3; i++) {
      addEnemyShot(centerX + i * 18, baseY, i * 34, bulletSpeed * 0.92);
    }
  } else {
    const aim = clamp((player.x + player.width / 2 - centerX) * 0.7, -180, 180);
    [-60, 0, 60].forEach((offset) => addEnemyShot(centerX, baseY, aim + offset, bulletSpeed));
  }

  boss.patternStep++;
}

function addEnemyShot(x, y, vx, speed) {
  enemyShots.push({
    x: x - 3,
    y,
    width: 6,
    height: 16,
    speed,
    vx,
  });
}

function advanceWave() {
  if (wave % 5 === 0) {
    score += wave * 250;
    saveHighScore();
  }
  wave++;
  startWave();
}

function updateEnemyShots(delta) {
  enemyShots.forEach((shot) => {
    shot.x += (shot.vx || 0) * delta;
    shot.y += shot.speed * delta;
  });
  enemyShots = enemyShots.filter((shot) => shot.y < HEIGHT + shot.height && shot.x > -40 && shot.x < WIDTH + 40);
}

function updateParticles(delta) {
  particles.forEach((particle) => {
    particle.x += particle.vx * delta;
    particle.y += particle.vy * delta;
    particle.life -= delta;
  });
  particles = particles.filter((particle) => particle.life > 0);
}

function checkCollisions() {
  // Player laser hits enemy.
  for (let shotIndex = playerShots.length - 1; shotIndex >= 0; shotIndex--) {
    const shot = playerShots[shotIndex];
    for (let enemyIndex = enemies.length - 1; enemyIndex >= 0; enemyIndex--) {
      const enemy = enemies[enemyIndex];
      if (rectsTouch(shot, enemy)) {
        playerShots.splice(shotIndex, 1);
        enemies.splice(enemyIndex, 1);
        score += enemy.points;
        saveHighScore();
        makeExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.color);
        break;
      }
    }

    if (boss && playerShots[shotIndex] && rectsTouch(playerShots[shotIndex], boss)) {
      playerShots.splice(shotIndex, 1);
      boss.health--;
      makeExplosion(
        boss.x + 20 + Math.random() * (boss.width - 40),
        boss.y + 16 + Math.random() * (boss.height - 24),
        '#ffe66d',
      );
      if (boss.health <= 0) {
        score += boss.points;
        saveHighScore();
        makeExplosion(boss.x + boss.width / 2, boss.y + boss.height / 2, '#ffe66d');
        boss = null;
      }
    }
  }

  // Enemy laser hits player. Invincibility prevents instant repeated hits.
  if (player.invincibleTimer <= 0) {
    for (let i = enemyShots.length - 1; i >= 0; i--) {
      if (rectsTouch(enemyShots[i], player)) {
        enemyShots.splice(i, 1);
        loseLife();
        break;
      }
    }
  }
}

function loseLife() {
  if (player.invincibleTimer > 0) return;

  lives--;
  makeExplosion(player.x + player.width / 2, player.y + player.height / 2, '#ffe66d');
  enemyShots = [];
  player.invincibleTimer = 1.7;

  if (lives <= 0) {
    gameOver = true;
    saveHighScore();
    restartButton.classList.add('show');
  }
}

function makeExplosion(x, y, color) {
  for (let i = 0; i < 22; i++) {
    particles.push({
      x,
      y,
      size: 3 + Math.random() * 5,
      vx: (Math.random() - 0.5) * 190,
      vy: (Math.random() - 0.5) * 190,
      life: 0.35 + Math.random() * 0.45,
      color: Math.random() > 0.35 ? color : '#ffffff',
    });
  }
}

function draw() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  drawBackground();
  drawHud();
  drawPlayer();
  drawEnemies();
  drawBoss();
  drawShots();
  drawParticles();

  if (waveIntroTimer > 0 && !gameOver) {
    drawWaveIntro();
  }

  if (gameOver) {
    drawGameOver();
  }
}

function drawBackground() {
  ctx.fillStyle = '#050714';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  stars.forEach((star) => {
    ctx.fillStyle = star.color;
    ctx.fillRect(Math.round(star.x), Math.round(star.y), star.size, star.size);
  });

  // Retro scan lines.
  ctx.fillStyle = 'rgba(255, 255, 255, 0.035)';
  for (let y = 0; y < HEIGHT; y += 8) {
    ctx.fillRect(0, y, WIDTH, 2);
  }
}

function drawHud() {
  ctx.fillStyle = '#29f5ff';
  ctx.font = '22px Courier New';
  ctx.fillText(`SCORE ${score}`, 22, 32);
  ctx.fillText(`HI ${highScore}`, 22, 58);
  ctx.fillText(`WAVE ${wave}`, WIDTH / 2 - 52, 32);
  ctx.fillText(`LIVES ${lives}`, WIDTH - 132, 32);
}

function drawPlayer() {
  if (player.invincibleTimer > 0 && Math.floor(player.invincibleTimer * 10) % 2 === 0) {
    return;
  }

  drawPixelSprite(playerSprite, player.x, player.y, 9, '#29f5ff');
  ctx.fillStyle = '#ffe66d';
  ctx.fillRect(player.x + 18, player.y + 36, 12, 8);
  ctx.fillStyle = '#ff4fd8';
  ctx.fillRect(player.x + 21, player.y + 44, 6, 10);
}

function drawEnemies() {
  enemies.forEach((enemy) => {
    drawPixelSprite(enemy.sprite, enemy.x, enemy.y, 7, enemy.color);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(enemy.x + 14, enemy.y + 9, 4, 4);
    ctx.fillRect(enemy.x + 25, enemy.y + 9, 4, 4);
  });
}

function drawBoss() {
  if (!boss) return;

  drawPixelSprite(bossSprite, boss.x, boss.y, 16, boss.color);
  ctx.fillStyle = '#ff4fd8';
  ctx.fillRect(boss.x + 16, boss.y + 34, 22, 10);
  ctx.fillRect(boss.x + boss.width - 38, boss.y + 34, 22, 10);

  ctx.fillStyle = '#11183c';
  ctx.fillRect(210, 48, 380, 14);
  ctx.fillStyle = '#ff4fd8';
  ctx.fillRect(210, 48, 380 * (boss.health / boss.maxHealth), 14);
  ctx.strokeStyle = '#ffe66d';
  ctx.lineWidth = 3;
  ctx.strokeRect(210, 48, 380, 14);
}

function drawShots() {
  ctx.fillStyle = '#ffe66d';
  playerShots.forEach((shot) => {
    ctx.fillRect(shot.x, shot.y, shot.width, shot.height);
  });

  ctx.fillStyle = '#ff4fd8';
  enemyShots.forEach((shot) => {
    ctx.fillRect(shot.x, shot.y, shot.width, shot.height);
  });
}

function drawParticles() {
  particles.forEach((particle) => {
    ctx.fillStyle = particle.color;
    ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
  });
}

function drawWaveIntro() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.52)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.textAlign = 'center';
  ctx.fillStyle = isBossWave(wave) ? '#ff4fd8' : '#ffe66d';
  ctx.font = '48px Courier New';
  ctx.fillText(waveIntroText, WIDTH / 2, HEIGHT / 2 - 12);

  ctx.fillStyle = '#29f5ff';
  ctx.font = '22px Courier New';
  ctx.fillText('HIGH SCORE RUN - NO FINAL WAVE', WIDTH / 2, HEIGHT / 2 + 32);
  ctx.textAlign = 'left';
}

function drawGameOver() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffe66d';
  ctx.font = '52px Courier New';
  ctx.fillText('GAME OVER', WIDTH / 2, HEIGHT / 2 - 54);

  ctx.fillStyle = '#29f5ff';
  ctx.font = '24px Courier New';
  ctx.fillText(`Final Score: ${score}`, WIDTH / 2, HEIGHT / 2 - 12);
  ctx.fillText(`High Score: ${highScore}`, WIDTH / 2, HEIGHT / 2 + 24);
  ctx.fillText('Press Enter or tap Restart', WIDTH / 2, HEIGHT / 2 + 64);
  ctx.textAlign = 'left';
}

function drawPixelSprite(sprite, x, y, blockSize, color) {
  ctx.fillStyle = color;
  sprite.forEach((row, rowIndex) => {
    [...row].forEach((pixel, colIndex) => {
      if (pixel === 'X') {
        ctx.fillRect(
          Math.round(x + colIndex * blockSize),
          Math.round(y + rowIndex * blockSize),
          blockSize,
          blockSize,
        );
      }
    });
  });
}

function rectsTouch(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function gameLoop(timestamp) {
  const delta = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;

  update(delta);
  draw();
  requestAnimationFrame(gameLoop);
}

function setButtonState(button, property) {
  const turnOn = (event) => {
    event.preventDefault();
    keys[property] = true;
  };
  const turnOff = (event) => {
    event.preventDefault();
    keys[property] = false;
  };

  button.addEventListener('pointerdown', turnOn);
  button.addEventListener('pointerup', turnOff);
  button.addEventListener('pointercancel', turnOff);
  button.addEventListener('pointerleave', turnOff);
}

window.addEventListener('keydown', (event) => {
  if (event.code === 'ArrowLeft' || event.code === 'KeyA') keys.left = true;
  if (event.code === 'ArrowRight' || event.code === 'KeyD') keys.right = true;
  if (event.code === 'Space') {
    keys.fire = true;
    event.preventDefault();
  }
  if (event.code === 'Enter' && gameOver) resetGame();
});

window.addEventListener('keyup', (event) => {
  if (event.code === 'ArrowLeft' || event.code === 'KeyA') keys.left = false;
  if (event.code === 'ArrowRight' || event.code === 'KeyD') keys.right = false;
  if (event.code === 'Space') keys.fire = false;
});

restartButton.addEventListener('click', resetGame);
setButtonState(document.getElementById('leftButton'), 'left');
setButtonState(document.getElementById('rightButton'), 'right');
setButtonState(document.getElementById('fireButton'), 'fire');

resetGame();
requestAnimationFrame(gameLoop);
