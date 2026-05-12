const SAVE_KEY = 'eldervale-crossing-save-v1';

export class SaveSystem {
  static load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.warn('Unable to load save data:', error);
      return null;
    }
  }

  static save(data) {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ ...data, savedAt: Date.now() }));
    } catch (error) {
      console.warn('Unable to save game data:', error);
    }
  }

  static clear() {
    localStorage.removeItem(SAVE_KEY);
  }
}
