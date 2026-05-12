import Phaser from 'phaser';
import WebFont from 'webfontloader';
import '../style.css';
import { BootScene } from './scenes/BootScene.js';
import { PreloadScene } from './scenes/PreloadScene.js';
import { WorldScene } from './scenes/WorldScene.js';
import { InteriorScene } from './scenes/InteriorScene.js';

const startGame = () => {
  const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    backgroundColor: '#101821',
    pixelArt: true,
    roundPixels: true,
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: window.innerWidth,
      height: window.innerHeight,
    },
    physics: {
      default: 'arcade',
      arcade: { debug: false, gravity: { y: 0 } },
    },
    scene: [BootScene, PreloadScene, WorldScene, InteriorScene],
  };

  new Phaser.Game(config);
};

WebFont.load({
  google: { families: ['Press Start 2P'] },
  active: startGame,
  inactive: startGame,
  timeout: 1800,
});
