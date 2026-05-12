import Phaser from 'phaser';
import { INTRO_TEXT } from '../data/worldText.js';
import { AudioSystem } from '../systems/AudioSystem.js';
import { SaveSystem } from '../systems/SaveSystem.js';

const SPEED = 112;
const ACCELERATION = 720;
const DRAG = 920;
const TILE_SIZE = 16;

const getProps = (object) =>
  Object.fromEntries((object.properties ?? []).map((property) => [property.name, property.value]));

export class WorldScene extends Phaser.Scene {
  constructor() {
    super('WorldScene');
    this.nearbyObject = null;
    this.lastSaveAt = 0;
  }

  create(data = {}) {
    this.map = this.make.tilemap({ key: 'eldervaleMap' });
    const tileset = this.map.addTilesetImage('eldervale-tiles', 'eldervaleTiles');
    this.ground = this.map.createLayer('Ground', tileset, 0, 0);
    this.details = this.map.createLayer('Details', tileset, 0, 0);
    this.foreground = this.map.createLayer('Foreground', tileset, 0, 0);
    this.foreground.setDepth(40).setAlpha(0.72);
    this.details.setCollisionByProperty({ collides: true });

    const save = SaveSystem.load();
    const spawn = data.spawn ?? save?.world ?? { x: 392, y: 544 };
    this.player = this.physics.add.sprite(spawn.x, spawn.y, 'traveler', 0);
    this.player.setSize(9, 10).setOffset(7, 12).setDepth(25).setDrag(DRAG).setMaxVelocity(SPEED);
    this.physics.add.collider(this.player, this.details);

    this.createAnimations();
    this.createControls();
    this.createInteractions();
    this.createAtmosphere();
    this.createCamera();
    this.createHud();

    AudioSystem.play('music');
    AudioSystem.play('wind');
    AudioSystem.play('birds');
    AudioSystem.play('water');

    this.time.delayedCall(350, () => this.showDialogue(INTRO_TEXT));
    this.cameras.main.fadeIn(450, 12, 18, 24);
  }

  createAnimations() {
    const rows = { down: 0, left: 1, right: 2, up: 3 };
    Object.entries(rows).forEach(([direction, row]) => {
      this.anims.create({
        key: `walk-${direction}`,
        frames: this.anims.generateFrameNumbers('traveler', { start: row * 4, end: row * 4 + 3 }),
        frameRate: 8,
        repeat: -1,
      });
      this.anims.create({ key: `idle-${direction}`, frames: [{ key: 'traveler', frame: row * 4 }] });
    });
    this.facing = 'down';
  }

  createControls() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,E,SPACE,M');
    this.input.keyboard.on('keydown-E', () => this.tryInteract());
    this.input.keyboard.on('keydown-SPACE', () => this.tryInteract());
    this.input.keyboard.on('keydown-M', () => this.toggleMinimap());
  }

  createInteractions() {
    const objects = this.map.getObjectLayer('Objects')?.objects ?? [];
    this.interactables = objects.map((object) => {
      const props = getProps(object);
      const zone = this.add.zone(object.x, object.y, object.width, object.height).setOrigin(0);
      this.physics.add.existing(zone, true);
      zone.name = object.name;
      zone.props = props;
      zone.centerPoint = new Phaser.Math.Vector2(object.x + object.width / 2, object.y + object.height / 2);
      return zone;
    });
    this.glow = this.add.image(0, 0, 'interactGlow').setDepth(60).setVisible(false).setAlpha(0.85);
    this.tweens.add({ targets: this.glow, alpha: 0.45, yoyo: true, repeat: -1, duration: 950 });
  }

  createAtmosphere() {
    this.add.rectangle(0, 0, this.map.widthInPixels, this.map.heightInPixels, 0x182035, 0.18).setOrigin(0).setDepth(55);
    this.particles = this.add.particles(0, 0, 'mote', {
      x: { min: 0, max: this.map.widthInPixels },
      y: { min: 0, max: this.map.heightInPixels },
      lifespan: 9000,
      speedX: { min: -4, max: 9 },
      speedY: { min: -12, max: -2 },
      frequency: 220,
      alpha: { start: 0.38, end: 0 },
      scale: { min: 0.7, max: 1.6 },
      blendMode: 'ADD',
    });
    this.particles.setDepth(70);
  }

  createCamera() {
    const camera = this.cameras.main;
    camera.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
    camera.startFollow(this.player, true, 0.11, 0.11);
    camera.setDeadzone(Math.min(120, camera.width * 0.18), Math.min(80, camera.height * 0.14));
    camera.setZoom(2);
  }

  createHud() {
    this.dialogue = this.add
      .text(16, 16, '', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '8px',
        color: '#fff3d4',
        backgroundColor: 'rgba(16, 22, 30, 0.86)',
        padding: { x: 10, y: 8 },
        wordWrap: { width: 310 },
        lineSpacing: 8,
      })
      .setScrollFactor(0)
      .setDepth(100)
      .setVisible(false);

    this.prompt = this.add
      .text(0, 0, 'E', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '8px',
        color: '#1b2530',
        backgroundColor: '#fff0a6',
        padding: { x: 5, y: 4 },
      })
      .setOrigin(0.5)
      .setDepth(100)
      .setVisible(false);

    this.minimap = this.add.graphics().setScrollFactor(0).setDepth(95);
    this.minimapVisible = true;
  }

  update(time) {
    this.handleMovement();
    this.updateNearbyObject();
    this.updateMinimap();
    this.updateDepth();
    if (time - this.lastSaveAt > 1800) {
      this.lastSaveAt = time;
      SaveSystem.save({ world: { x: Math.round(this.player.x), y: Math.round(this.player.y) } });
    }
  }

  handleMovement() {
    const left = this.cursors.left.isDown || this.keys.A.isDown;
    const right = this.cursors.right.isDown || this.keys.D.isDown;
    const up = this.cursors.up.isDown || this.keys.W.isDown;
    const down = this.cursors.down.isDown || this.keys.S.isDown;
    const vector = new Phaser.Math.Vector2(Number(right) - Number(left), Number(down) - Number(up));

    if (vector.lengthSq() > 0) {
      vector.normalize().scale(ACCELERATION);
      this.player.setAcceleration(vector.x, vector.y);
      this.facing = Math.abs(vector.x) > Math.abs(vector.y) ? (vector.x > 0 ? 'right' : 'left') : vector.y > 0 ? 'down' : 'up';
      this.player.anims.play(`walk-${this.facing}`, true);
    } else {
      this.player.setAcceleration(0, 0);
      this.player.anims.play(`idle-${this.facing}`, true);
    }
  }

  updateNearbyObject() {
    const playerPoint = new Phaser.Math.Vector2(this.player.x, this.player.y + 6);
    this.nearbyObject = this.interactables.find((zone) => playerPoint.distance(zone.centerPoint) < 30);
    const visible = Boolean(this.nearbyObject);
    this.glow.setVisible(visible);
    this.prompt.setVisible(visible);
    if (visible) {
      this.glow.setPosition(this.nearbyObject.centerPoint.x, this.nearbyObject.centerPoint.y);
      const camera = this.cameras.main;
      this.prompt.setPosition(
        (this.nearbyObject.centerPoint.x - camera.scrollX) * camera.zoom,
        (this.nearbyObject.centerPoint.y - 18 - camera.scrollY) * camera.zoom,
      );
    }
  }

  tryInteract() {
    if (!this.nearbyObject) return;
    AudioSystem.pulse('interact');
    const { props, name } = this.nearbyObject;
    if (props.type === 'door') {
      this.cameras.main.fadeOut(300, 8, 12, 18);
      this.time.delayedCall(320, () => this.scene.start('InteriorScene', { house: name }));
      return;
    }
    this.showDialogue(props.message ?? 'There is a quiet magic here.');
  }

  showDialogue(lines) {
    const text = Array.isArray(lines) ? lines.join('\n\n') : lines;
    this.dialogue.setText(text).setVisible(true);
    this.dialogueTimer?.remove(false);
    this.dialogueTimer = this.time.delayedCall(5200, () => this.dialogue?.setVisible(false));
  }

  updateMinimap() {
    this.minimap.clear();
    if (!this.minimapVisible) return;
    const size = 112;
    const x = this.scale.width - size - 14;
    const y = 14;
    const sx = size / this.map.widthInPixels;
    const sy = size / this.map.heightInPixels;
    this.minimap.fillStyle(0x111821, 0.76).fillRoundedRect(x - 4, y - 4, size + 8, size + 8, 5);
    this.minimap.fillStyle(0x3f8d51, 0.95).fillRect(x, y, size, size);
    this.minimap.fillStyle(0x2e83b7, 0.95).fillEllipse(x + 58 * TILE_SIZE * sx, y + 17 * TILE_SIZE * sy, 26 * TILE_SIZE * sx, 16 * TILE_SIZE * sy);
    this.minimap.fillStyle(0xb98a55, 0.9).fillRect(x + 13 * TILE_SIZE * sx, y + 31 * TILE_SIZE * sy, 35 * TILE_SIZE * sx, 3 * TILE_SIZE * sy);
    this.minimap.fillStyle(0xfff0a6, 1).fillCircle(x + this.player.x * sx, y + this.player.y * sy, 2.5);
  }

  toggleMinimap() {
    this.minimapVisible = !this.minimapVisible;
  }

  updateDepth() {
    this.player.setDepth(25 + this.player.y / 1000);
  }
}
