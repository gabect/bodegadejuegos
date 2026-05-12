import { Howl, Howler } from 'howler';

const SILENT_WAV =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=';
const sounds = new Map();

export class AudioSystem {
  static boot() {
    Howler.volume(0.55);
    this.register('wind', { src: [SILENT_WAV], loop: true, volume: 0.18 });
    this.register('water', { src: [SILENT_WAV], loop: true, volume: 0.14 });
    this.register('birds', { src: [SILENT_WAV], loop: true, volume: 0.1 });
    this.register('music', { src: [SILENT_WAV], loop: true, volume: 0.22 });
    this.register('footstep', { src: [SILENT_WAV], volume: 0.08 });
    this.register('interact', { src: [SILENT_WAV], volume: 0.2 });
  }

  static register(key, config) {
    if (!sounds.has(key)) {
      sounds.set(key, new Howl({ html5: false, ...config }));
    }
  }

  static play(key) {
    const sound = sounds.get(key);
    if (sound && !sound.playing()) sound.play();
  }

  static pulse(key) {
    const sound = sounds.get(key);
    if (sound) sound.play();
  }
}
