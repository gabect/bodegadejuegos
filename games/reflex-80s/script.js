// Reflex 80s
// A one-player neon survival paddle game built with vanilla JavaScript.
// Keep the ball alive for as long as possible while the arena gets meaner.

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const restartButton = document.getElementById('restartButton');

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const BEST_TIME_KEY = 'reflex80sBestTime';

const keys = {
  left: false,
  right: false,
};

let paddle;
let ball;
let obstacles;
let wheels;
let sparks;
let scanlineOffset;
let elapsedTime;
let bestTime;
let speedLevel;
let normalBallSpeed;
let speedBoostTimer;
let gameOver;
let paused;
let lastTime = 0;
let activePointerId = null;

function resetGame() {
  paddle = {
    width: 150,
    height: 18,
    x: WIDTH / 2 - 75,
    y: HEIGHT - 64,
    speed: 560,
  };

  normalBallSpeed = 300;
  ball = {
    x: WIDTH / 2,
    y: HEIGHT - 130,
    radius: 11,
    vx: 190,
    vy: -230,
    speed: normalBallSpeed,
  };

  obstacles = [];
  wheels = [];
  sparks = [];
  scanlineOffset = 0;
  elapsedTime = 0;
  speedLevel = 1;
  speedBoostTimer = 0;
  gameOver = false;
  paused = false;
  bestTime = loadBestTime();
  activePointerId = null;
  restartButton.classList.remove('show');
}

function loadBestTime() {
  const saved = Number.parseFloat(localStorage.getItem(BEST_TIME_KEY));
  return Number.isFinite(saved) ? saved : 0;
}

function saveBestTime() {
  if (elapsedTime > bestTime) {
    bestTime = elapsedTime;
    localStorage.setItem(BEST_TIME_KEY, bestTime.toFixed(2));
  }
}

function update(deltaTime) {
  if (gameOver || paused) {
    updateSparks(deltaTime);
    return;
  }

  elapsedTime += deltaTime;
  scanlineOffset = (scanlineOffset + deltaTime * 18) % 6;

  updateDifficulty(deltaTime);
  updatePaddle(deltaTime);
  updateBall(deltaTime);
  updateSparks(deltaTime);
}

function updateDifficulty(deltaTime) {
  const nextSpeedLevel = Math.floor(elapsedTime / 10) + 1;
  if (nextSpeedLevel !== speedLevel) {
    speedLevel = nextSpeedLevel;
    normalBallSpeed = Math.min(300 + (speedLevel - 1) * 42, 720);
    setBallSpeed(speedBoostTimer > 0 ? normalBallSpeed * 1.38 : normalBallSpeed);
    burst(ball.x, ball.y, '#ffc64a', 12);
  }

  const wantedObstacleCount = Math.min(Math.floor(elapsedTime / 20), 6);
  while (obstacles.length < wantedObstacleCount) {
    addObstacle(obstacles.length);
  }

  const wantedWheelCount = elapsedTime >= 40 ? Math.min(Math.floor((elapsedTime - 40) / 25) + 1, 4) : 0;
  while (wheels.length < wantedWheelCount) {
    addWheel(wheels.length);
  }

  if (speedBoostTimer > 0) {
    speedBoostTimer -= deltaTime;
    if (speedBoostTimer <= 0) {
      speedBoostTimer = 0;
      setBallSpeed(normalBallSpeed);
    }
  }
}

function updatePaddle(deltaTime) {
  let direction = 0;
  if (keys.left) direction -= 1;
  if (keys.right) direction += 1;

  paddle.x += direction * paddle.speed * deltaTime;
  paddle.x = clamp(paddle.x, 20, WIDTH - paddle.width - 20);
}

function updateBall(deltaTime) {
  ball.x += ball.vx * deltaTime;
  ball.y += ball.vy * deltaTime;

  if (ball.x - ball.radius < 18) {
    ball.x = 18 + ball.radius;
    ball.vx = Math.abs(ball.vx);
    burst(ball.x, ball.y, '#42f6ff', 5);
  }

  if (ball.x + ball.radius > WIDTH - 18) {
    ball.x = WIDTH - 18 - ball.radius;
    ball.vx = -Math.abs(ball.vx);
    burst(ball.x, ball.y, '#42f6ff', 5);
  }

  if (ball.y - ball.radius < 58) {
    ball.y = 58 + ball.radius;
    ball.vy = Math.abs(ball.vy);
    burst(ball.x, ball.y, '#ff4ab8', 6);
  }

  if (ball.vy > 0 && circleRectCollides(ball, paddle)) {
    bounceOffPaddle();
  }

  for (const obstacle of obstacles) {
    if (!obstacle.cooldown && circleRectCollides(ball, obstacle)) {
      bounceOffObstacle(obstacle);
      obstacle.cooldown = 0.14;
      burst(ball.x, ball.y, obstacle.color, 8);
    }
    obstacle.cooldown = Math.max(0, obstacle.cooldown - deltaTime);
  }

  for (const wheel of wheels) {
    wheel.rotation += wheel.spin * deltaTime;
    if (!wheel.cooldown && circleCircleCollides(ball, wheel)) {
      const angle = Math.atan2(ball.y - wheel.y, ball.x - wheel.x);
      ball.vx = Math.cos(angle) * normalBallSpeed * 1.38 + Math.cos(wheel.rotation) * 60;
      ball.vy = Math.sin(angle) * normalBallSpeed * 1.38 + Math.sin(wheel.rotation) * 60;
      speedBoostTimer = 3.2;
      setBallSpeed(normalBallSpeed * 1.38);
      wheel.cooldown = 0.65;
      burst(wheel.x, wheel.y, '#ffc64a', 18);
    }
    wheel.cooldown = Math.max(0, wheel.cooldown - deltaTime);
  }

  if (ball.y - ball.radius > HEIGHT) {
    endGame();
  }
}

function bounceOffPaddle() {
  ball.y = paddle.y - ball.radius - 1;
  const paddleCenter = paddle.x + paddle.width / 2;
  const hitPosition = clamp((ball.x - paddleCenter) / (paddle.width / 2), -1, 1);
  const angle = -Math.PI / 2 + hitPosition * 0.88;
  setBallVelocityFromAngle(angle, speedBoostTimer > 0 ? normalBallSpeed * 1.38 : normalBallSpeed);
  burst(ball.x, paddle.y, '#42f6ff', 10);
}

function bounceOffObstacle(obstacle) {
  const ballCenterX = ball.x;
  const ballCenterY = ball.y;
  const rectCenterX = obstacle.x + obstacle.width / 2;
  const rectCenterY = obstacle.y + obstacle.height / 2;
  const dx = ballCenterX - rectCenterX;
  const dy = ballCenterY - rectCenterY;

  if (Math.abs(dx / obstacle.width) > Math.abs(dy / obstacle.height)) {
    ball.vx *= -1;
    ball.vy += obstacle.tilt * 35;
  } else {
    ball.vy *= -1;
    ball.vx += obstacle.tilt * 55;
  }

  setBallSpeed(speedBoostTimer > 0 ? normalBallSpeed * 1.38 : normalBallSpeed);
}

function setBallVelocityFromAngle(angle, speed) {
  ball.vx = Math.cos(angle) * speed;
  ball.vy = Math.sin(angle) * speed;
  ball.speed = speed;
}

function setBallSpeed(speed) {
  const currentAngle = Math.atan2(ball.vy, ball.vx);
  setBallVelocityFromAngle(currentAngle, speed);
}

function addObstacle(index) {
  const row = index % 3;
  const width = 135 - row * 14;
  const height = 12;
  const x = 95 + ((index * 151) % (WIDTH - 260));
  const y = 150 + row * 92 + Math.floor(index / 3) * 45;

  obstacles.push({
    x,
    y: Math.min(y, HEIGHT - 190),
    width,
    height,
    tilt: index % 2 === 0 ? 1 : -1,
    color: index % 2 === 0 ? '#ff4ab8' : '#42f6ff',
    cooldown: 0,
  });
}

function addWheel(index) {
  const positions = [
    { x: WIDTH * 0.24, y: HEIGHT * 0.37 },
    { x: WIDTH * 0.75, y: HEIGHT * 0.45 },
    { x: WIDTH * 0.42, y: HEIGHT * 0.25 },
    { x: WIDTH * 0.58, y: HEIGHT * 0.58 },
  ];
  const spot = positions[index % positions.length];

  wheels.push({
    x: spot.x,
    y: spot.y,
    radius: 24,
    rotation: index,
    spin: index % 2 === 0 ? 4.2 : -4.8,
    cooldown: 0,
  });
}

function endGame() {
  gameOver = true;
  saveBestTime();
  restartButton.classList.add('show');
  burst(ball.x, HEIGHT - 24, '#ff3131', 28);
}

function draw() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  drawBackground();
  drawHud();
  drawObstacles();
  drawWheels();
  drawPaddle();
  drawBall();
  drawSparks();
  drawScanlines();

  if (paused && !gameOver) {
    drawCenterPanel('PAUSED', 'Press P to resume');
  }

  if (gameOver) {
    drawGameOver();
  }
}

function drawBackground() {
  const gradient = ctx.createRadialGradient(WIDTH / 2, HEIGHT / 2, 80, WIDTH / 2, HEIGHT / 2, WIDTH);
  gradient.addColorStop(0, '#12080d');
  gradient.addColorStop(0.62, '#060405');
  gradient.addColorStop(1, '#020101');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.strokeStyle = 'rgba(66, 246, 255, 0.18)';
  ctx.lineWidth = 2;
  ctx.strokeRect(18, 58, WIDTH - 36, HEIGHT - 76);

  ctx.strokeStyle = 'rgba(255, 49, 49, 0.22)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(32, 78);
  ctx.lineTo(WIDTH - 32, 78);
  ctx.stroke();
}

function drawHud() {
  drawText(`TIME ${formatTime(elapsedTime)}`, 30, 35, '#42f6ff', 20, 'left');
  drawText(`BEST ${formatTime(bestTime)}`, WIDTH / 2, 35, '#ffc64a', 20, 'center');
  drawText(`SPEED LV ${speedLevel}`, WIDTH - 30, 35, '#ff4ab8', 20, 'right');
}

function drawPaddle() {
  ctx.save();
  ctx.shadowColor = '#42f6ff';
  ctx.shadowBlur = 22;
  ctx.fillStyle = '#42f6ff';
  ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
  ctx.shadowColor = '#ff4ab8';
  ctx.fillStyle = '#ff4ab8';
  ctx.fillRect(paddle.x + 10, paddle.y + 4, paddle.width - 20, 6);
  ctx.fillStyle = '#fff2cc';
  ctx.fillRect(paddle.x + paddle.width / 2 - 18, paddle.y - 3, 36, 4);
  ctx.restore();
}

function drawBall() {
  ctx.save();
  ctx.shadowColor = speedBoostTimer > 0 ? '#ffc64a' : '#ff3131';
  ctx.shadowBlur = speedBoostTimer > 0 ? 30 : 22;
  ctx.fillStyle = speedBoostTimer > 0 ? '#ffc64a' : '#ff3131';
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff2cc';
  ctx.beginPath();
  ctx.arc(ball.x - 3, ball.y - 4, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawObstacles() {
  for (const obstacle of obstacles) {
    ctx.save();
    ctx.translate(obstacle.x + obstacle.width / 2, obstacle.y + obstacle.height / 2);
    ctx.rotate(obstacle.tilt * 0.08);
    ctx.shadowColor = obstacle.color;
    ctx.shadowBlur = 16;
    ctx.fillStyle = obstacle.color;
    ctx.fillRect(-obstacle.width / 2, -obstacle.height / 2, obstacle.width, obstacle.height);
    ctx.fillStyle = '#fff2cc';
    ctx.fillRect(-obstacle.width / 2 + 8, -2, obstacle.width - 16, 3);
    ctx.restore();
  }
}

function drawWheels() {
  for (const wheel of wheels) {
    ctx.save();
    ctx.translate(wheel.x, wheel.y);
    ctx.rotate(wheel.rotation);
    ctx.shadowColor = '#ffc64a';
    ctx.shadowBlur = 22;
    ctx.strokeStyle = '#ffc64a';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, wheel.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#ff4ab8';
    for (let i = 0; i < 6; i++) {
      ctx.rotate(Math.PI / 3);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(wheel.radius, 0);
      ctx.stroke();
    }
    ctx.fillStyle = '#42f6ff';
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawGameOver() {
  drawCenterPanel('GAME OVER', `Final ${formatTime(elapsedTime)}   Best ${formatTime(bestTime)}   Press Enter or Restart`);
}

function drawCenterPanel(title, message) {
  ctx.save();
  ctx.fillStyle = 'rgba(5, 3, 4, 0.86)';
  ctx.fillRect(130, HEIGHT / 2 - 76, WIDTH - 260, 152);
  ctx.strokeStyle = '#ffc64a';
  ctx.lineWidth = 4;
  ctx.shadowColor = '#ffc64a';
  ctx.shadowBlur = 16;
  ctx.strokeRect(130, HEIGHT / 2 - 76, WIDTH - 260, 152);
  drawText(title, WIDTH / 2, HEIGHT / 2 - 16, '#ff4ab8', 42, 'center');
  drawText(message, WIDTH / 2, HEIGHT / 2 + 34, '#fff2cc', 18, 'center');
  ctx.restore();
}

function drawText(text, x, y, color, size, align) {
  ctx.save();
  ctx.font = `700 ${size}px "Courier New", monospace`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function burst(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 55 + Math.random() * 160;
    sparks.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.35 + Math.random() * 0.4,
      maxLife: 0.75,
      color,
    });
  }
}

function updateSparks(deltaTime) {
  for (const spark of sparks) {
    spark.x += spark.vx * deltaTime;
    spark.y += spark.vy * deltaTime;
    spark.vx *= 0.98;
    spark.vy *= 0.98;
    spark.life -= deltaTime;
  }
  sparks = sparks.filter((spark) => spark.life > 0);
}

function drawSparks() {
  for (const spark of sparks) {
    ctx.save();
    ctx.globalAlpha = clamp(spark.life / spark.maxLife, 0, 1);
    ctx.fillStyle = spark.color;
    ctx.shadowColor = spark.color;
    ctx.shadowBlur = 10;
    ctx.fillRect(spark.x, spark.y, 4, 4);
    ctx.restore();
  }
}

function drawScanlines() {
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = '#ffffff';
  for (let y = scanlineOffset; y < HEIGHT; y += 6) {
    ctx.fillRect(0, y, WIDTH, 1);
  }
  ctx.restore();
}

function circleRectCollides(circle, rect) {
  const closestX = clamp(circle.x, rect.x, rect.x + rect.width);
  const closestY = clamp(circle.y, rect.y, rect.y + rect.height);
  const dx = circle.x - closestX;
  const dy = circle.y - closestY;
  return dx * dx + dy * dy <= circle.radius * circle.radius;
}

function circleCircleCollides(circle, wheel) {
  const dx = circle.x - wheel.x;
  const dy = circle.y - wheel.y;
  const distance = circle.radius + wheel.radius;
  return dx * dx + dy * dy <= distance * distance;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function formatTime(time) {
  return `${time.toFixed(1)}s`;
}

function gameLoop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const deltaTime = Math.min((timestamp - lastTime) / 1000, 0.033);
  lastTime = timestamp;

  update(deltaTime);
  draw();
  requestAnimationFrame(gameLoop);
}

function restartGame() {
  resetGame();
  lastTime = 0;
}

window.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') {
    keys.left = true;
    event.preventDefault();
  }

  if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') {
    keys.right = true;
    event.preventDefault();
  }

  if (event.key.toLowerCase() === 'p' && !gameOver) {
    paused = !paused;
  }

  if (event.key === 'Enter' && gameOver) {
    restartGame();
  }
});

window.addEventListener('keyup', (event) => {
  if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') {
    keys.left = false;
  }

  if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') {
    keys.right = false;
  }
});

function movePaddleToClientX(clientX) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = WIDTH / rect.width;
  const canvasX = (clientX - rect.left) * scaleX;
  paddle.x = clamp(canvasX - paddle.width / 2, 20, WIDTH - paddle.width - 20);
}

canvas.addEventListener('pointerdown', (event) => {
  activePointerId = event.pointerId;
  canvas.setPointerCapture(event.pointerId);
  movePaddleToClientX(event.clientX);
});

canvas.addEventListener('pointermove', (event) => {
  if (event.pointerId === activePointerId) {
    movePaddleToClientX(event.clientX);
  }
});

canvas.addEventListener('pointerup', () => {
  activePointerId = null;
});

canvas.addEventListener('pointercancel', () => {
  activePointerId = null;
});

restartButton.addEventListener('click', restartGame);

resetGame();
requestAnimationFrame(gameLoop);
