import Phaser from 'phaser';
import { HOUSE_LINES } from '../data/worldText.js';
import { AudioSystem } from '../systems/AudioSystem.js';

export class InteriorScene extends Phaser.Scene {
  constructor() {
    super('InteriorScene');
  }

  create(data = {}) {
    this.house = data.house ?? 'mossroot-cottage';
    this.createRoom();
    this.createPlayer();
    this.createControls();
    this.createHud();
    this.cameras.main.fadeIn(320, 8, 12, 18);
    this.showDialogue(HOUSE_LINES[this.house] ?? 'The room smells like cedar, rain, and old stories.');
  }

  createRoom() {
    const tile = 16;
    const width = 15;
    const height = 12;
    const g = this.add.graphics();
    g.fillStyle(0x151820, 1).fillRect(0, 0, width * tile, height * tile);
    g.fillStyle(0x67515f, 1).fillRect(16, 16, 208, 48);
    g.fillStyle(0x9d744d, 1).fillRect(16, 64, 208, 112);
    g.lineStyle(1, 0x7a5638, 0.75);
    for (let x = 16; x <= 224; x += tile) g.lineBetween(x, 64, x, 176);
    for (let y = 64; y <= 176; y += tile) g.lineBetween(16, y, 224, y);
    g.fillStyle(0x2a1d17, 1).fillRect(104, 160, 32, 16);
    g.fillStyle(0xc18a53, 1).fillRect(48, 86, 48, 24);
    g.fillStyle(0x40313c, 1).fillRect(152, 82, 40, 50);
    g.fillStyle(0xffb347, 1).fillRect(30, 42, 8, 10).fillRect(202, 42, 8, 10);
    g.fillStyle(0xfff18a, 0.72).fillCircle(34, 44, 12).fillCircle(206, 44, 12);

    this.physics.world.setBounds(16, 18, 208, 158);
    this.colliders = this.physics.add.staticGroup();
    [
      [16, 16, 208, 48],
      [16, 176, 208, 16],
      [0, 16, 16, 176],
      [224, 16, 16, 176],
      [48, 86, 48, 24],
      [152, 82, 40, 50],
    ].forEach(([x, y, w, h]) => {
      const body = this.add.rectangle(x, y, w, h).setOrigin(0);
      this.physics.add.existing(body, true);
      this.colliders.add(body);
      body.setVisible(false);
    });

    this.exitZone = this.add.zone(104, 158, 32, 24).setOrigin(0);
    this.physics.add.existing(this.exitZone, true);
  }

  createPlayer() {
    this.player = this.physics.add.sprite(120, 142, 'traveler', 0);
    this.player.setSize(9, 10).setOffset(7, 12).setDrag(850).setMaxVelocity(96).setCollideWorldBounds(true);
    this.physics.add.collider(this.player, this.colliders);
  }

  createControls() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,E,SPACE');
    this.input.keyboard.on('keydown-E', () => this.tryExit());
    this.input.keyboard.on('keydown-SPACE', () => this.tryExit());
  }

  createHud() {
    this.cameras.main.setZoom(3).centerOn(120, 96);
    this.dialogue = this.add
      .text(10, 10, '', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '7px',
        color: '#fff3d4',
        backgroundColor: 'rgba(16, 22, 30, 0.88)',
        padding: { x: 8, y: 7 },
        wordWrap: { width: 210 },
        lineSpacing: 7,
      })
      .setScrollFactor(0)
      .setDepth(100);
    this.prompt = this.add
      .text(122, 150, 'E: leave', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '6px',
        color: '#fff0a6',
      })
      .setOrigin(0.5)
      .setDepth(100);
  }

  update() {
    const left = this.cursors.left.isDown || this.keys.A.isDown;
    const right = this.cursors.right.isDown || this.keys.D.isDown;
    const up = this.cursors.up.isDown || this.keys.W.isDown;
    const down = this.cursors.down.isDown || this.keys.S.isDown;
    const vector = new Phaser.Math.Vector2(Number(right) - Number(left), Number(down) - Number(up));
    if (vector.lengthSq() > 0) {
      vector.normalize().scale(560);
      this.player.setAcceleration(vector.x, vector.y);
      const facing = Math.abs(vector.x) > Math.abs(vector.y) ? (vector.x > 0 ? 'right' : 'left') : vector.y > 0 ? 'down' : 'up';
      this.player.anims.play(`walk-${facing}`, true);
    } else {
      this.player.setAcceleration(0, 0);
      this.player.anims.stop();
    }
  }

  tryExit() {
    const bounds = this.exitZone.getBounds();
    if (!Phaser.Geom.Rectangle.Contains(bounds, this.player.x, this.player.y + 7)) return;
    AudioSystem.pulse('interact');
    this.cameras.main.fadeOut(280, 8, 12, 18);
    this.time.delayedCall(300, () => this.scene.start('WorldScene', { spawn: { x: 392, y: 544 } }));
  }

  showDialogue(text) {
    this.dialogue.setText(`${text}\n\nPress E near the lower doorway to return outside.`);
  }
}
