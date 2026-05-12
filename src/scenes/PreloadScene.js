import Phaser from 'phaser';
import { AudioSystem } from '../systems/AudioSystem.js';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload() {
    this.load.image('eldervaleTiles', '/assets/tiles/eldervale-tiles.svg');
    this.load.tilemapTiledJSON('eldervaleMap', '/maps/eldervale.json');
  }

  create() {
    this.createPlayerTexture();
    this.createGlowTexture();
    this.createParticleTexture();
    AudioSystem.boot();
    document.body.classList.add('game-ready');
    this.scene.start('WorldScene');
  }

  createPlayerTexture() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    const frame = 24;
    const drawFrame = (col, row, tunic, footShift = 0) => {
      const x = col * frame;
      const y = row * frame;
      g.fillStyle(0x1f2630, 1).fillRect(x + 8, y + 19, 8, 3);
      g.fillStyle(0x7a4a2b, 1).fillRect(x + 8, y + 4, 8, 5);
      g.fillStyle(0xf3bd85, 1).fillRect(x + 7, y + 8, 10, 7);
      g.fillStyle(0x2e6b58, 1).fillRect(x + 6, y + 14, 12, 6);
      g.fillStyle(tunic, 1).fillRect(x + 7, y + 13, 10, 7);
      g.fillStyle(0x17251f, 1).fillRect(x + 7 + footShift, y + 20, 3, 2);
      g.fillRect(x + 14 - footShift, y + 20, 3, 2);
      g.fillStyle(0x2b1d17, 1).fillRect(x + 9, y + 7, 2, 1).fillRect(x + 14, y + 7, 2, 1);
      g.fillStyle(0xf8df9d, 1).fillRect(x + 10, y + 3, 5, 2);
    };

    for (let row = 0; row < 4; row += 1) {
      drawFrame(0, row, 0x4da36f, 0);
      drawFrame(1, row, 0x5fbd80, 2);
      drawFrame(2, row, 0x4da36f, 0);
      drawFrame(3, row, 0x5fbd80, -2);
    }
    g.generateTexture('traveler', frame * 4, frame * 4);
    g.destroy();
  }

  createGlowTexture() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xfff0a6, 0.18).fillCircle(16, 16, 15);
    g.lineStyle(2, 0xfff0a6, 0.7).strokeCircle(16, 16, 12);
    g.generateTexture('interactGlow', 32, 32);
    g.destroy();
  }

  createParticleTexture() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xffe9a8, 1).fillRect(0, 0, 2, 2);
    g.generateTexture('mote', 2, 2);
    g.destroy();
  }
}
