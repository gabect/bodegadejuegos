// Jungle Snake
// An original 16-bit jungle arcade snake-style game using only Canvas, CSS, and vanilla JavaScript.

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('highScore');
const levelEl = document.getElementById('level');
const lengthEl = document.getElementById('length');
const unlockedPreyEl = document.getElementById('unlockedPrey');
const warningEl = document.getElementById('warning');
const overlay = document.getElementById('overlay');
const startButton = document.getElementById('startButton');

const GRID_SIZE = 20;
const CELL_SIZE = canvas.width / GRID_SIZE;
const HIGH_SCORE_KEY = 'jungleSnakeHighScore';
const SAFE_WARNING = 'Find safe prey to grow.';
const DIRECTIONS = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  KeyW: { x: 0, y: -1 },
  KeyS: { x: 0, y: 1 },
  KeyA: { x: -1, y: 0 },
  KeyD: { x: 1, y: 0 },
};

const PREY_TYPES = [
  { name: 'Insect', plural: 'Insects', icon: 'bug', unlockLevel: 1, minLength: 4, points: 10, growth: 1, color: '#ffe66d', accent: '#111400' },
  { name: 'Mouse', plural: 'Mice', icon: 'mouse', unlockLevel: 1, minLength: 4, points: 15, growth: 1, color: '#c9c2a4', accent: '#5b5241' },
  { name: 'Frog', plural: 'Frogs', icon: 'frog', unlockLevel: 3, minLength: 11, points: 35, growth: 2, color: '#6bff62', accent: '#124f21' },
  { name: 'Small Bird', plural: 'Birds', icon: 'bird', unlockLevel: 3, minLength: 11, points: 40, growth: 2, color: '#59d8ff', accent: '#102a78' },
  { name: 'Chicken', plural: 'Chickens', icon: 'chicken', unlockLevel: 5, minLength: 18, points: 80, growth: 3, color: '#fff2bc', accent: '#ff5547' },
  { name: 'Rabbit', plural: 'Rabbits', icon: 'rabbit', unlockLevel: 5, minLength: 18, points: 95, growth: 3, color: '#e8e0d1', accent: '#ff9ec7' },
  { name: 'Wild Cat', plural: 'Wild Cats', icon: 'cat', unlockLevel: 7, minLength: 26, points: 160, growth: 4, color: '#ffb347', accent: '#271103' },
  { name: 'Hawk', plural: 'Hawks', icon: 'hawk', unlockLevel: 8, minLength: 31, points: 210, growth: 4, color: '#c1854b', accent: '#f8f2c4' },
  { name: 'Jungle Predator', plural: 'Predators', icon: 'predator', unlockLevel: 9, minLength: 36, points: 300, growth: 5, color: '#ff405d', accent: '#42101a' },
];

let snake;
let direction;
let queuedDirection;
let foods;
let obstacles;
let particles;
let score;
let highScore;
let level;
let pendingGrowth;
let moveTimer;
let moveDelay;
let running;
let paused;
let gameOver;
let warningTimer;
let touchStart;
let lastFrameTime = 0;

function resetGame(startImmediately = false) {
  snake = [
    { x: 8, y: 10 },
    { x: 7, y: 10 },
    { x: 6, y: 10 },
    { x: 5, y: 10 },
  ];
  direction = { x: 1, y: 0 };
  queuedDirection = { x: 1, y: 0 };
  foods = [];
  obstacles = [];
  particles = [];
  score = 0;
  highScore = loadHighScore();
  level = 1;
  pendingGrowth = 0;
  moveTimer = 0;
  running = startImmediately;
  paused = false;
  gameOver = false;
  warningTimer = 0;
  touchStart = null;
  updateLevelAndSpeed();
  rebuildObstacles();
  spawnFoods();
  setWarning(startImmediately ? SAFE_WARNING : 'Press Start or Enter to enter the jungle.', 0);
  overlay.classList.toggle('hidden', startImmediately);
  updateHud();
  draw();
}

function loadHighScore() {
  const saved = Number.parseInt(localStorage.getItem(HIGH_SCORE_KEY), 10);
  return Number.isFinite(saved) ? saved : 0;
}

function saveHighScore() {
  if (score > highScore) {
    highScore = score;
    localStorage.setItem(HIGH_SCORE_KEY, String(highScore));
  }
}

function gameLoop(timestamp = 0) {
  const delta = Math.min((timestamp - lastFrameTime) / 1000 || 0, 0.08);
  lastFrameTime = timestamp;

  update(delta);
  draw();
  requestAnimationFrame(gameLoop);
}

function update(delta) {
  updateParticles(delta);

  if (!running || paused || gameOver) {
    return;
  }

  warningTimer = Math.max(0, warningTimer - delta);
  if (warningTimer === 0 && warningEl.textContent !== SAFE_WARNING) {
    warningEl.textContent = SAFE_WARNING;
  }

  moveTimer += delta * 1000;
  if (moveTimer >= moveDelay) {
    moveTimer %= moveDelay;
    stepSnake();
  }
}

function stepSnake() {
  if (!isReverse(queuedDirection, direction)) {
    direction = queuedDirection;
  }

  const head = snake[0];
  const nextHead = { x: head.x + direction.x, y: head.y + direction.y };

  if (isOutsideGrid(nextHead) || hitsBody(nextHead) || hitsObstacle(nextHead)) {
    endGame('The jungle claimed the trail. Press Enter to restart.');
    return;
  }

  const foodIndex = foods.findIndex((food) => sameCell(food, nextHead));
  if (foodIndex >= 0) {
    const food = foods[foodIndex];
    if (!isPreyUnlocked(food.type)) {
      bounceFromLockedPrey(food);
      return;
    }

    eatPrey(food, foodIndex, nextHead);
    return;
  }

  snake.unshift(nextHead);
  if (pendingGrowth > 0) {
    pendingGrowth -= 1;
  } else {
    snake.pop();
  }
}

function eatPrey(food, foodIndex, nextHead) {
  snake.unshift(nextHead);
  pendingGrowth += food.type.growth;
  score += food.type.points * level;
  foods.splice(foodIndex, 1);
  burst(nextHead, food.type.color, 18);
  setWarning(`${food.type.name} eaten! +${food.type.points * level} points`, 1.6);
  saveHighScore();
  updateLevelAndSpeed();
  rebuildObstacles();
  spawnFoods();
  updateHud();
}

function bounceFromLockedPrey(food) {
  const damage = Math.min(2, Math.max(1, snake.length - 2));
  for (let i = 0; i < damage; i += 1) {
    snake.pop();
  }

  direction = { x: -direction.x, y: -direction.y };
  queuedDirection = direction;
  burst(food, '#ff405d', 14);
  setWarning(`Too small for ${food.type.name}! Tail damage. Grow to length ${food.type.minLength}.`, 2.6);

  if (snake.length < 2) {
    endGame('Too much jungle damage. Press Enter to restart.');
    return;
  }

  updateLevelAndSpeed();
  rebuildObstacles();
  updateHud();
}

function endGame(message) {
  gameOver = true;
  running = false;
  saveHighScore();
  setWarning(message, 0);
  overlay.querySelector('h2').textContent = 'Game Over';
  overlay.querySelectorAll('p')[0].textContent = `Score ${score} • High Score ${highScore}`;
  overlay.querySelectorAll('p')[1].textContent = 'Press Enter or Start Run to try again.';
  startButton.textContent = 'Restart';
  overlay.classList.remove('hidden');
  updateHud();
}

function updateLevelAndSpeed() {
  level = Math.max(1, Math.floor((snake.length - 4) / 4) + 1);
  moveDelay = Math.max(70, 168 - (level - 1) * 10);
}

function rebuildObstacles() {
  const targetCount = Math.min(Math.max(0, level - 2), 9);
  while (obstacles.length < targetCount) {
    const obstacle = randomEmptyCell();
    if (obstacle) {
      obstacles.push(obstacle);
    } else {
      break;
    }
  }
  while (obstacles.length > targetCount) {
    obstacles.pop();
  }
}

function spawnFoods() {
  const wantedFoods = Math.min(3 + Math.floor(level / 2), 7);
  while (foods.length < wantedFoods) {
    const type = choosePreyType();
    const cell = randomEmptyCell();
    if (!cell) {
      return;
    }
    foods.push({ ...cell, type, pulse: Math.random() * Math.PI * 2 });
  }
}

function choosePreyType() {
  const availablePool = PREY_TYPES.filter((type) => type.unlockLevel <= Math.max(level + 2, 3));
  const weighted = [];
  availablePool.forEach((type) => {
    const unlocked = isPreyUnlocked(type);
    const weight = unlocked ? Math.max(1, 8 - type.unlockLevel) : 2;
    for (let i = 0; i < weight; i += 1) {
      weighted.push(type);
    }
  });
  return weighted[Math.floor(Math.random() * weighted.length)] || PREY_TYPES[0];
}

function isPreyUnlocked(type) {
  return level >= type.unlockLevel && snake.length >= type.minLength;
}

function randomEmptyCell() {
  for (let tries = 0; tries < 220; tries += 1) {
    const cell = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
    if (!snake.some((part) => sameCell(part, cell)) && !foods.some((food) => sameCell(food, cell)) && !hitsObstacle(cell)) {
      return cell;
    }
  }
  return null;
}

function updateHud() {
  scoreEl.textContent = score;
  highScoreEl.textContent = highScore;
  levelEl.textContent = level;
  lengthEl.textContent = snake.length;
  unlockedPreyEl.textContent = PREY_TYPES
    .filter((type) => isPreyUnlocked(type))
    .map((type) => type.plural)
    .join(' • ');
}

function setWarning(message, seconds) {
  warningEl.textContent = message;
  warningTimer = seconds;
}

function draw() {
  drawJungleBackground();
  drawObstacles();
  foods.forEach(drawFood);
  drawSnake();
  drawParticles();

  if (paused && !gameOver) {
    drawCenterText('PAUSED', 'Press P to return');
  }
}

function drawJungleBackground() {
  ctx.fillStyle = '#031009';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      const odd = (x + y) % 2 === 0;
      ctx.fillStyle = odd ? '#062414' : '#082b17';
      ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      if ((x * 7 + y * 11) % 9 === 0) {
        ctx.fillStyle = 'rgba(54, 135, 55, 0.28)';
        pixelRect(x, y, 4, 6, 14, 4);
        pixelRect(x, y, 9, 10, 10, 4);
      }
    }
  }

  ctx.strokeStyle = 'rgba(147, 255, 56, 0.08)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= GRID_SIZE; i += 1) {
    ctx.beginPath();
    ctx.moveTo(i * CELL_SIZE, 0);
    ctx.lineTo(i * CELL_SIZE, canvas.height);
    ctx.moveTo(0, i * CELL_SIZE);
    ctx.lineTo(canvas.width, i * CELL_SIZE);
    ctx.stroke();
  }
}

function drawObstacles() {
  obstacles.forEach((rock) => {
    ctx.fillStyle = '#2f2a20';
    pixelRect(rock.x, rock.y, 4, 7, 24, 18);
    ctx.fillStyle = '#574c39';
    pixelRect(rock.x, rock.y, 8, 4, 13, 7);
    ctx.fillStyle = '#1b1712';
    pixelRect(rock.x, rock.y, 3, 23, 27, 5);
    ctx.fillStyle = '#3d8c35';
    pixelRect(rock.x, rock.y, 3, 3, 6, 5);
    pixelRect(rock.x, rock.y, 22, 2, 5, 7);
  });
}

function drawSnake() {
  snake.forEach((part, index) => {
    const isHead = index === 0;
    const inset = isHead ? 2 : 4;
    ctx.fillStyle = isHead ? '#a8ff43' : index % 2 === 0 ? '#49d43b' : '#2fb832';
    pixelRect(part.x, part.y, inset, inset, CELL_SIZE - inset * 2, CELL_SIZE - inset * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
    pixelRect(part.x, part.y, inset + 4, inset + 3, 9, 4);
    ctx.fillStyle = '#0d3a13';
    pixelRect(part.x, part.y, CELL_SIZE - 9, inset + 7, 4, 4);
    pixelRect(part.x, part.y, inset + 6, CELL_SIZE - 10, 4, 4);

    if (isHead) {
      drawSnakeFace(part);
    }
  });
}

function drawSnakeFace(head) {
  ctx.fillStyle = '#061109';
  const eyeA = { x: 10 + direction.y * 5 + direction.x * 5, y: 9 - direction.x * 5 + direction.y * 5 };
  const eyeB = { x: 10 - direction.y * 5 + direction.x * 5, y: 9 + direction.x * 5 + direction.y * 5 };
  pixelRect(head.x, head.y, eyeA.x, eyeA.y, 4, 4);
  pixelRect(head.x, head.y, eyeB.x, eyeB.y, 4, 4);
  ctx.fillStyle = '#ff405d';
  pixelRect(head.x, head.y, 14 + direction.x * 8, 14 + direction.y * 8, 4, 4);
}

function drawFood(food) {
  const unlocked = isPreyUnlocked(food.type);
  const baseColor = unlocked ? food.type.color : '#ff405d';
  const accent = unlocked ? food.type.accent : '#ffd45a';
  const pulse = Math.sin(performance.now() / 180 + food.pulse) * 2;

  if (!unlocked) {
    ctx.fillStyle = 'rgba(255, 64, 93, 0.22)';
    pixelRect(food.x, food.y, 1, 1, 30, 30);
    ctx.fillStyle = '#ffd45a';
    pixelRect(food.x, food.y, 14, 4, 4, 16);
    pixelRect(food.x, food.y, 14, 23, 4, 4);
  }

  ctx.fillStyle = baseColor;
  drawPreyIcon(food, pulse);
  ctx.fillStyle = accent;
  drawPreyAccent(food);
}

function drawPreyIcon(food, pulse) {
  const yOffset = Math.round(pulse);
  switch (food.type.icon) {
    case 'bug':
      pixelRect(food.x, food.y, 10, 9 + yOffset, 12, 14);
      pixelRect(food.x, food.y, 6, 12 + yOffset, 5, 4);
      pixelRect(food.x, food.y, 21, 12 + yOffset, 5, 4);
      break;
    case 'mouse':
      pixelRect(food.x, food.y, 8, 11 + yOffset, 17, 11);
      pixelRect(food.x, food.y, 6, 8 + yOffset, 6, 6);
      pixelRect(food.x, food.y, 23, 21 + yOffset, 6, 3);
      break;
    case 'frog':
      pixelRect(food.x, food.y, 7, 10 + yOffset, 18, 13);
      pixelRect(food.x, food.y, 4, 8 + yOffset, 7, 7);
      pixelRect(food.x, food.y, 21, 8 + yOffset, 7, 7);
      break;
    case 'bird':
      pixelRect(food.x, food.y, 8, 10 + yOffset, 16, 12);
      pixelRect(food.x, food.y, 3, 13 + yOffset, 8, 5);
      pixelRect(food.x, food.y, 21, 8 + yOffset, 6, 6);
      break;
    case 'chicken':
      pixelRect(food.x, food.y, 8, 10 + yOffset, 17, 15);
      pixelRect(food.x, food.y, 20, 6 + yOffset, 6, 7);
      break;
    case 'rabbit':
      pixelRect(food.x, food.y, 8, 13 + yOffset, 17, 11);
      pixelRect(food.x, food.y, 12, 5 + yOffset, 4, 10);
      pixelRect(food.x, food.y, 19, 5 + yOffset, 4, 10);
      break;
    case 'cat':
      pixelRect(food.x, food.y, 7, 10 + yOffset, 18, 15);
      pixelRect(food.x, food.y, 8, 6 + yOffset, 5, 6);
      pixelRect(food.x, food.y, 20, 6 + yOffset, 5, 6);
      break;
    case 'hawk':
      pixelRect(food.x, food.y, 8, 10 + yOffset, 16, 12);
      pixelRect(food.x, food.y, 2, 12 + yOffset, 9, 5);
      pixelRect(food.x, food.y, 22, 12 + yOffset, 9, 5);
      break;
    default:
      pixelRect(food.x, food.y, 6, 8 + yOffset, 20, 17);
      pixelRect(food.x, food.y, 2, 11 + yOffset, 7, 7);
      pixelRect(food.x, food.y, 23, 11 + yOffset, 7, 7);
      break;
  }
}

function drawPreyAccent(food) {
  pixelRect(food.x, food.y, 12, 13, 3, 3);
  pixelRect(food.x, food.y, 19, 13, 3, 3);
  pixelRect(food.x, food.y, 13, 22, 8, 3);
}

function burst(cell, color, amount) {
  for (let i = 0; i < amount; i += 1) {
    particles.push({
      x: (cell.x + 0.5) * CELL_SIZE,
      y: (cell.y + 0.5) * CELL_SIZE,
      vx: (Math.random() - 0.5) * 120,
      vy: (Math.random() - 0.5) * 120,
      life: 0.45 + Math.random() * 0.35,
      maxLife: 0.8,
      color,
    });
  }
}

function updateParticles(delta) {
  particles.forEach((particle) => {
    particle.x += particle.vx * delta;
    particle.y += particle.vy * delta;
    particle.life -= delta;
  });
  particles = particles.filter((particle) => particle.life > 0);
}

function drawParticles() {
  particles.forEach((particle) => {
    ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
    ctx.fillStyle = particle.color;
    ctx.fillRect(Math.round(particle.x), Math.round(particle.y), 5, 5);
    ctx.globalAlpha = 1;
  });
}

function drawCenterText(title, subtitle) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.62)';
  ctx.fillRect(0, canvas.height / 2 - 74, canvas.width, 148);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#93ff38';
  ctx.font = '58px Impact, sans-serif';
  ctx.fillText(title, canvas.width / 2, canvas.height / 2 - 6);
  ctx.fillStyle = '#fff2bc';
  ctx.font = '22px Trebuchet MS, sans-serif';
  ctx.fillText(subtitle, canvas.width / 2, canvas.height / 2 + 36);
  ctx.textAlign = 'start';
}

function pixelRect(gridX, gridY, x, y, width, height) {
  ctx.fillRect(gridX * CELL_SIZE + x, gridY * CELL_SIZE + y, width, height);
}

function sameCell(a, b) {
  return a.x === b.x && a.y === b.y;
}

function isReverse(next, current) {
  return next.x + current.x === 0 && next.y + current.y === 0;
}

function isOutsideGrid(cell) {
  return cell.x < 0 || cell.x >= GRID_SIZE || cell.y < 0 || cell.y >= GRID_SIZE;
}

function hitsBody(cell) {
  return snake.some((part, index) => index > 0 && sameCell(part, cell));
}

function hitsObstacle(cell) {
  return obstacles.some((obstacle) => sameCell(obstacle, cell));
}

function startRun() {
  resetGame(true);
  overlay.querySelector('h2').textContent = 'Jungle Snake';
  overlay.querySelectorAll('p')[0].textContent = 'Arrow Keys / WASD or swipe to move';
  overlay.querySelectorAll('p')[1].textContent = 'P pauses • Enter restarts';
  startButton.textContent = 'Start Run';
}

window.addEventListener('keydown', (event) => {
  if (DIRECTIONS[event.code]) {
    event.preventDefault();
    if (running && !paused) {
      const next = DIRECTIONS[event.code];
      if (!isReverse(next, direction)) {
        queuedDirection = next;
      }
    }
  }

  if (event.code === 'KeyP' && running && !gameOver) {
    paused = !paused;
    setWarning(paused ? 'Paused. Press P to continue.' : SAFE_WARNING, paused ? 0 : 1);
  }

  if (event.code === 'Enter') {
    event.preventDefault();
    startRun();
  }
});

canvas.addEventListener('touchstart', (event) => {
  const touch = event.changedTouches[0];
  touchStart = { x: touch.clientX, y: touch.clientY };
}, { passive: true });

canvas.addEventListener('touchend', (event) => {
  if (!touchStart || !running || paused) {
    return;
  }
  const touch = event.changedTouches[0];
  const dx = touch.clientX - touchStart.x;
  const dy = touch.clientY - touchStart.y;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) {
    return;
  }
  const next = Math.abs(dx) > Math.abs(dy)
    ? { x: Math.sign(dx), y: 0 }
    : { x: 0, y: Math.sign(dy) };
  if (!isReverse(next, direction)) {
    queuedDirection = next;
  }
  touchStart = null;
}, { passive: true });

startButton.addEventListener('click', startRun);

resetGame(false);
requestAnimationFrame(gameLoop);
