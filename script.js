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
let fireCooldown;
let gameOver;
let lastTime = 0;

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
  fireCooldown = 0;
  gameOver = false;
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
  enemyDirection = 1;
  enemySpeed = 28 + wave * 11;
  enemyDrop = 18 + wave * 2;

  const rows = Math.min(3 + Math.floor(wave / 2), 5);
  const cols = 9;
  const startX = 88;
  const startY = 74;
  const gapX = 68;
  const gapY = 54;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      enemies.push({
        x: startX + col * gapX,
        y: startY + row * gapY,
        width: 38,
        height: 30,
        sprite: enemySprites[row % enemySprites.length],
        color: row % 2 === 0 ? '#73ff85' : '#ff4fd8',
        points: (rows - row) * 10,
      });
    }
  }
}

function update(delta) {
  if (gameOver) return;

  updateStars(delta);
  updatePlayer(delta);
  updatePlayerShots(delta);
  updateEnemies(delta);
  updateEnemyShots(delta);
  updateParticles(delta);
  checkCollisions();

  fireCooldown = Math.max(0, fireCooldown - delta);
  player.invincibleTimer = Math.max(0, player.invincibleTimer - delta);

  if (enemies.length === 0) {
    wave++;
    enemyShots = [];
    startWave();
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
    if (enemy.x < 18 || enemy.x + enemy.width > WIDTH - 18) {
      shouldDrop = true;
    }
  });

  if (shouldDrop) {
    enemyDirection *= -1;
    enemies.forEach((enemy) => {
      enemy.y += enemyDrop;
    });
  }

  // Enemy firing chance grows slowly each wave.
  const fireChance = Math.min(0.018 + wave * 0.004, 0.05);
  if (enemies.length > 0 && Math.random() < fireChance) {
    const shooter = enemies[Math.floor(Math.random() * enemies.length)];
    enemyShots.push({
      x: shooter.x + shooter.width / 2 - 3,
      y: shooter.y + shooter.height,
      width: 6,
      height: 16,
      speed: 190 + wave * 18,
    });
  }

  if (enemies.some((enemy) => enemy.y + enemy.height >= player.y)) {
    loseLife();
  }
}

function updateEnemyShots(delta) {
  enemyShots.forEach((shot) => {
    shot.y += shot.speed * delta;
  });
  enemyShots = enemyShots.filter((shot) => shot.y < HEIGHT + shot.height);
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
        makeExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.color);
        break;
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
  drawShots();
  drawParticles();

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
  ctx.fillText('Press Enter or tap Restart', WIDTH / 2, HEIGHT / 2 + 28);
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
