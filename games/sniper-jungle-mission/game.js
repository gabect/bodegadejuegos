const GAME_WIDTH = 1280;
const GAME_HEIGHT = 720;
const SCOPE_RADIUS = 314;

const MISSION = {
  title: 'SNIPER: JUNGLE MISSION',
  targets: 5,
  shots: 6,
  seconds: 60,
  enemies: [
    { x: 222, y: 462, scale: 0.78, cover: 'fern', patrol: 18 },
    { x: 526, y: 394, scale: 0.63, cover: 'tree', patrol: 14 },
    { x: 815, y: 482, scale: 0.76, cover: 'bush', patrol: 17 },
    { x: 1035, y: 386, scale: 0.58, cover: 'vines', patrol: 12 },
    { x: 682, y: 556, scale: 0.86, cover: 'grass', patrol: 20 },
  ],
};

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#050c07',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: { preload, create, update },
};

new Phaser.Game(config);

const restartButton = document.getElementById('restartButton');
restartButton?.addEventListener('click', () => {
  window.location.reload();
});

let world;
let crosshair;
let scopeMask;
let scopeRing;
let enemies = [];
let windOffset = 0;
let score = 0;
let ammo = MISSION.shots;
let missionTime = MISSION.seconds;
let missionEnded = false;
let scoreText;
let ammoText;
let timerText;
let messageText;
let statusText;
let timerEvent;
let lastPointer = new Phaser.Math.Vector2(GAME_WIDTH / 2, GAME_HEIGHT / 2);
let jungleLayers = [];

function preload() {}

function create() {
  resetMissionState();
  this.input.setDefaultCursor('none');

  createWorld(this);
  createScopeMask(this);
  createEnemies(this);
  createScopeOverlay(this);
  createHUD(this);
  bindInput(this);
  startTimer(this);

  showMessage(MISSION.title, 'Identify and tag 5 hidden hostiles. 6 shots. 60 seconds.');
}

function update(time, delta) {
  if (!world) return;

  windOffset += delta * 0.00045;
  world.x = Math.sin(windOffset) * 5;
  world.y = Math.cos(windOffset * 0.72) * 3;

  jungleLayers.forEach((layer, index) => {
    layer.x = Math.sin(windOffset + index) * (index + 1.5);
    layer.y = Math.cos(windOffset * 0.8 + index) * (index + 0.8);
  });

  enemies.forEach((enemy) => updateEnemy(enemy, time));
  drawCrosshair(lastPointer.x, lastPointer.y);
}

function resetMissionState() {
  enemies = [];
  jungleLayers = [];
  windOffset = 0;
  score = 0;
  ammo = MISSION.shots;
  missionTime = MISSION.seconds;
  missionEnded = false;
}

function bindInput(scene) {
  scene.input.on('pointermove', (pointer) => {
    lastPointer.set(pointer.x, pointer.y);
  });

  scene.input.on('pointerdown', (pointer) => {
    lastPointer.set(pointer.x, pointer.y);
    fireShot(scene, pointer.x, pointer.y);
  });
}

function startTimer(scene) {
  timerEvent = scene.time.addEvent({
    delay: 1000,
    loop: true,
    callback: () => {
      if (missionEnded) return;

      missionTime -= 1;
      timerText.setText(`TIME ${missionTime}`);

      if (missionTime <= 10) timerText.setColor('#ffd166');
      if (missionTime <= 0) endMission(false, 'TIME EXPIRED');
    },
  });
}

function createWorld(scene) {
  world = scene.add.container(0, 0).setDepth(1);
  world.add(createSky(scene));
  createMountainLayer(scene, 250, 0x0c2413, 0.72);
  createTreeLayer(scene, 355, 0x143b20, 0x247139, 34);
  createTreeLayer(scene, 470, 0x0b2a16, 0x1e5a2d, 44);
  createMist(scene);
  createVines(scene);
  createForegroundLeaves(scene);
}

function createSky(scene) {
  const sky = scene.add.graphics();
  sky.fillGradientStyle(0x173c22, 0x173c22, 0x071209, 0x071209, 1);
  sky.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  for (let i = 0; i < 70; i += 1) {
    sky.fillStyle(0xb9ffd0, Phaser.Math.FloatBetween(0.04, 0.14));
    sky.fillCircle(
      Phaser.Math.Between(0, GAME_WIDTH),
      Phaser.Math.Between(20, 320),
      Phaser.Math.Between(1, 3),
    );
  }

  return sky;
}

function createMountainLayer(scene, baseY, color, alpha) {
  const layer = scene.add.graphics().setAlpha(alpha);
  layer.fillStyle(color, 1);
  layer.beginPath();
  layer.moveTo(-80, GAME_HEIGHT);

  for (let x = -80; x <= GAME_WIDTH + 80; x += 110) {
    layer.lineTo(x, baseY + Phaser.Math.Between(-52, 48));
  }

  layer.lineTo(GAME_WIDTH + 80, GAME_HEIGHT);
  layer.closePath();
  layer.fillPath();
  world.add(layer);
  jungleLayers.push(layer);
}

function createTreeLayer(scene, groundY, trunkColor, leafColor, count) {
  const layer = scene.add.graphics();

  for (let i = 0; i < count; i += 1) {
    const x = Phaser.Math.Between(-90, GAME_WIDTH + 90);
    const height = Phaser.Math.Between(145, 365);
    const width = Phaser.Math.Between(15, 34);

    layer.fillStyle(trunkColor, 1);
    layer.fillRoundedRect(x, groundY - height, width, height, 9);
    layer.lineStyle(2, 0x06140a, 0.28);
    layer.lineBetween(x + width * 0.45, groundY - height + 10, x + width * 0.28, groundY - 8);

    for (let j = 0; j < 7; j += 1) {
      layer.fillStyle(leafColor, Phaser.Math.FloatBetween(0.72, 0.96));
      layer.fillEllipse(
        x + Phaser.Math.Between(-54, 58),
        groundY - height + Phaser.Math.Between(-26, 105),
        Phaser.Math.Between(72, 158),
        Phaser.Math.Between(26, 76),
      );
    }
  }

  layer.fillStyle(0x06170b, 0.72);
  layer.fillRect(-80, groundY, GAME_WIDTH + 160, GAME_HEIGHT - groundY);
  world.add(layer);
  jungleLayers.push(layer);
}

function createMist(scene) {
  const mist = scene.add.graphics();
  for (let i = 0; i < 9; i += 1) {
    mist.fillStyle(0xb6ffd0, 0.025);
    mist.fillEllipse(
      Phaser.Math.Between(80, GAME_WIDTH - 80),
      Phaser.Math.Between(260, 575),
      Phaser.Math.Between(360, 720),
      Phaser.Math.Between(38, 74),
    );
  }
  world.add(mist);
  jungleLayers.push(mist);
}

function createVines(scene) {
  const layer = scene.add.graphics();

  for (let i = 0; i < 34; i += 1) {
    const x = Phaser.Math.Between(-30, GAME_WIDTH + 30);
    const y = Phaser.Math.Between(-20, 140);
    const length = Phaser.Math.Between(150, 390);

    layer.lineStyle(Phaser.Math.Between(2, 5), 0x2b7138, Phaser.Math.FloatBetween(0.45, 0.82));
    layer.beginPath();
    layer.moveTo(x, y);
    for (let t = 0; t < length; t += 28) {
      layer.lineTo(x + Math.sin((t + i * 11) * 0.055) * 22, y + t);
    }
    layer.strokePath();
  }

  world.add(layer);
  jungleLayers.push(layer);
}

function createForegroundLeaves(scene) {
  const layer = scene.add.graphics();

  for (let i = 0; i < 115; i += 1) {
    const color = Phaser.Display.Color.GetColor(
      Phaser.Math.Between(10, 32),
      Phaser.Math.Between(65, 130),
      Phaser.Math.Between(24, 58),
    );

    layer.fillStyle(color, Phaser.Math.FloatBetween(0.62, 0.95));
    layer.fillEllipse(
      Phaser.Math.Between(-130, GAME_WIDTH + 130),
      Phaser.Math.Between(420, GAME_HEIGHT + 70),
      Phaser.Math.Between(52, 190),
      Phaser.Math.Between(18, 62),
    );
  }

  world.add(layer);
  jungleLayers.push(layer);
}

function createScopeMask(scene) {
  const maskShape = scene.make.graphics({ add: false });
  maskShape.fillStyle(0xffffff);
  maskShape.fillCircle(GAME_WIDTH / 2, GAME_HEIGHT / 2, SCOPE_RADIUS);
  scopeMask = maskShape.createGeometryMask();
  world.setMask(scopeMask);
}

function createEnemies(scene) {
  MISSION.enemies.forEach((data, index) => {
    enemies.push(createEnemy(scene, data, index));
  });
}

function createEnemy(scene, data, index) {
  const group = scene.add.container(data.x, data.y).setDepth(18 + index);
  const s = data.scale;

  group.add(scene.add.ellipse(0, 48 * s, 66 * s, 16 * s, 0x000000, 0.28));
  group.add(scene.add.rectangle(0, 0, 28 * s, 54 * s, 0x31451f));
  group.add(scene.add.rectangle(0, 2 * s, 18 * s, 38 * s, 0x536932));
  group.add(scene.add.rectangle(-21 * s, 2 * s, 10 * s, 42 * s, 0x24351e).setAngle(-5));
  group.add(scene.add.rectangle(21 * s, 2 * s, 10 * s, 42 * s, 0x24351e).setAngle(5));
  group.add(scene.add.rectangle(-8 * s, 44 * s, 10 * s, 38 * s, 0x1d2a18));
  group.add(scene.add.rectangle(8 * s, 44 * s, 10 * s, 38 * s, 0x1d2a18));
  group.add(scene.add.circle(0, -39 * s, 14 * s, 0x697542));
  group.add(scene.add.arc(0, -45 * s, 18 * s, 180, 360, false, 0x203018));

  addEnemyCover(scene, group, data.cover, s);
  world.add(group);

  return {
    group,
    originX: data.x,
    originY: data.y,
    scale: s,
    patrol: data.patrol,
    seed: index * 1.9 + 0.7,
    active: true,
  };
}

function addEnemyCover(scene, group, cover, scale) {
  const coverLayer = scene.add.graphics();
  const leafColor = cover === 'tree' ? 0x173a20 : 0x1c5b2c;
  coverLayer.fillStyle(leafColor, 0.82);

  if (cover === 'vines') {
    coverLayer.lineStyle(5 * scale, 0x286c34, 0.82);
    for (let i = -2; i <= 2; i += 1) {
      coverLayer.lineBetween(i * 12 * scale, -72 * scale, i * 7 * scale, 54 * scale);
    }
  } else {
    for (let i = 0; i < 8; i += 1) {
      coverLayer.fillEllipse(
        Phaser.Math.Between(-42, 42) * scale,
        Phaser.Math.Between(-20, 58) * scale,
        Phaser.Math.Between(34, 86) * scale,
        Phaser.Math.Between(16, 38) * scale,
      );
    }
  }

  group.add(coverLayer);
}

function updateEnemy(enemy, time) {
  if (!enemy.active) return;

  const sway = Math.sin(time * 0.001 + enemy.seed);
  const bob = Math.cos(time * 0.00125 + enemy.seed) * 2.2;
  enemy.group.x = enemy.originX + sway * enemy.patrol;
  enemy.group.y = enemy.originY + bob;
}

function createScopeOverlay(scene) {
  const shade = scene.add.graphics().setDepth(100);
  shade.fillStyle(0x000000, 0.86);
  shade.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT / 2 - SCOPE_RADIUS);
  shade.fillRect(0, GAME_HEIGHT / 2 + SCOPE_RADIUS, GAME_WIDTH, GAME_HEIGHT);
  shade.fillRect(0, 0, GAME_WIDTH / 2 - SCOPE_RADIUS, GAME_HEIGHT);
  shade.fillRect(GAME_WIDTH / 2 + SCOPE_RADIUS, 0, GAME_WIDTH, GAME_HEIGHT);

  scopeRing = scene.add.graphics().setDepth(110);
  scopeRing.lineStyle(34, 0x020403, 0.98);
  scopeRing.strokeCircle(GAME_WIDTH / 2, GAME_HEIGHT / 2, SCOPE_RADIUS + 17);
  scopeRing.lineStyle(5, 0x3a4f39, 1);
  scopeRing.strokeCircle(GAME_WIDTH / 2, GAME_HEIGHT / 2, SCOPE_RADIUS);
  scopeRing.lineStyle(1, 0xa8ffb8, 0.18);
  scopeRing.strokeCircle(GAME_WIDTH / 2, GAME_HEIGHT / 2, SCOPE_RADIUS - 20);

  addRangeTicks(scene);
  crosshair = scene.add.graphics().setDepth(220);
}

function addRangeTicks(scene) {
  const ticks = scene.add.graphics().setDepth(120);
  ticks.lineStyle(2, 0xa8ffb8, 0.36);

  for (let i = 0; i < 24; i += 1) {
    const angle = Phaser.Math.DegToRad(i * 15);
    const inner = SCOPE_RADIUS - (i % 3 === 0 ? 22 : 12);
    const outer = SCOPE_RADIUS - 3;
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    ticks.lineBetween(
      cx + Math.cos(angle) * inner,
      cy + Math.sin(angle) * inner,
      cx + Math.cos(angle) * outer,
      cy + Math.sin(angle) * outer,
    );
  }
}

function createHUD(scene) {
  const hudStyle = {
    fontFamily: 'Arial, Helvetica, sans-serif',
    fontSize: '22px',
    fontStyle: 'bold',
    color: '#b9ffc1',
    stroke: '#031006',
    strokeThickness: 4,
  };

  scene.add
    .text(34, 24, MISSION.title, { ...hudStyle, fontSize: '18px', color: '#eef7d2' })
    .setDepth(300);
  scoreText = scene.add.text(34, 54, `TARGETS ${score}/${MISSION.targets}`, hudStyle).setDepth(300);
  ammoText = scene.add.text(34, 86, `AMMO ${ammo}`, hudStyle).setDepth(300);
  timerText = scene.add.text(GAME_WIDTH - 162, 24, `TIME ${missionTime}`, hudStyle).setDepth(300);
  statusText = scene.add
    .text(GAME_WIDTH - 214, 55, 'MISSION LIVE', {
      ...hudStyle,
      fontSize: '15px',
      color: '#d8ffdc',
    })
    .setDepth(300);

  messageText = scene.add
    .text(GAME_WIDTH / 2, GAME_HEIGHT - 68, '', {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#ffffff',
      align: 'center',
      backgroundColor: 'rgba(4, 16, 8, 0.72)',
      padding: { x: 20, y: 11 },
    })
    .setOrigin(0.5)
    .setDepth(300);
}

function drawCrosshair(x, y) {
  if (!crosshair) return;

  crosshair.clear();
  const insideScope =
    Phaser.Math.Distance.Between(x, y, GAME_WIDTH / 2, GAME_HEIGHT / 2) <= SCOPE_RADIUS;
  const color = insideScope ? 0xb8ffc0 : 0x69756b;
  const alpha = insideScope ? 0.92 : 0.42;

  crosshair.lineStyle(2, color, alpha);
  crosshair.strokeCircle(x, y, 34);
  crosshair.strokeCircle(x, y, 7);

  crosshair.lineStyle(1, color, alpha * 0.9);
  crosshair.beginPath();
  crosshair.moveTo(x - 86, y);
  crosshair.lineTo(x - 12, y);
  crosshair.moveTo(x + 12, y);
  crosshair.lineTo(x + 86, y);
  crosshair.moveTo(x, y - 86);
  crosshair.lineTo(x, y - 12);
  crosshair.moveTo(x, y + 12);
  crosshair.lineTo(x, y + 86);
  crosshair.strokePath();

  crosshair.fillStyle(color, alpha);
  crosshair.fillCircle(x, y, 2.5);
}

function fireShot(scene, x, y) {
  if (missionEnded || ammo <= 0) return;

  ammo -= 1;
  ammoText.setText(`AMMO ${ammo}`);
  scene.cameras.main.shake(95, 0.005);
  createShotFlash(scene, x, y);

  if (!isInsideScope(x, y)) {
    showMessage('SHOT BLOCKED', 'Keep the reticle inside the scope view.');
    evaluateAmmo();
    return;
  }

  const hitEnemy = enemies.find((enemy) => enemy.active && isHit(enemy, x, y));
  if (hitEnemy) {
    tagEnemy(hitEnemy);
  } else {
    showMessage('MISS', 'Adjust for foliage and patrol movement.');
  }

  evaluateAmmo();
}

function createShotFlash(scene, x, y) {
  const flash = scene.add.circle(x, y, 18, 0xd9ffe0, 0.76).setDepth(240);
  scene.tweens.add({
    targets: flash,
    radius: 3,
    alpha: 0,
    duration: 150,
    ease: 'Quad.easeOut',
    onComplete: () => flash.destroy(),
  });
}

function isInsideScope(x, y) {
  return Phaser.Math.Distance.Between(x, y, GAME_WIDTH / 2, GAME_HEIGHT / 2) <= SCOPE_RADIUS;
}

function isHit(enemy, x, y) {
  const bounds = new Phaser.Geom.Rectangle(
    enemy.group.x - 34 * enemy.scale,
    enemy.group.y - 62 * enemy.scale,
    68 * enemy.scale,
    128 * enemy.scale,
  );
  return Phaser.Geom.Rectangle.Contains(bounds, x - world.x, y - world.y);
}

function tagEnemy(enemy) {
  enemy.active = false;
  score += 1;
  scoreText.setText(`TARGETS ${score}/${MISSION.targets}`);
  statusText.setText(score === MISSION.targets ? 'AREA CLEAR' : 'TARGET TAGGED');

  enemy.group.each((part) => {
    part.setTint?.(0xb8ffc0);
  });

  if (window.gsap) {
    gsap.to(enemy.group, { alpha: 0, y: enemy.group.y + 22, duration: 0.45, ease: 'power2.out' });
  } else {
    enemy.group.setAlpha(0);
  }

  showMessage('TARGET TAGGED', `${MISSION.targets - score} remaining.`);

  if (score >= MISSION.targets) endMission(true, 'MISSION COMPLETE');
}

function evaluateAmmo() {
  if (ammo <= 0 && score < MISSION.targets) {
    endMission(false, 'OUT OF AMMO');
  }
}

function showMessage(headline, detail = '') {
  if (!messageText) return;

  messageText.setText(detail ? `${headline}\n${detail}` : headline);
  messageText.setAlpha(1);
  messageText.setScale(0.96);

  if (window.gsap) {
    gsap.killTweensOf(messageText);
    gsap.to(messageText, { scaleX: 1, scaleY: 1, duration: 0.18, ease: 'back.out(2)' });
    gsap.to(messageText, { alpha: 0, duration: 0.55, delay: 1.45, ease: 'sine.out' });
  }
}

function endMission(success, reason) {
  if (missionEnded) return;

  missionEnded = true;
  missionTime = Math.max(0, missionTime);
  timerText.setText(`TIME ${missionTime}`);
  statusText.setText(success ? 'MISSION WON' : 'MISSION FAILED');
  statusText.setColor(success ? '#b9ffc1' : '#ffd166');

  if (timerEvent) timerEvent.paused = true;

  messageText.setText(
    success ? 'MISSION COMPLETE\nAll targets tagged.' : `MISSION FAILED\n${reason}`,
  );
  messageText.setAlpha(1);
  messageText.setScale(1);

  if (window.gsap) {
    gsap.killTweensOf(messageText);
    gsap.fromTo(
      messageText,
      { scaleX: 0.92, scaleY: 0.92 },
      { scaleX: 1, scaleY: 1, duration: 0.35, ease: 'back.out(2)' },
    );
  }
}
