const games = {
  'jungle-snake': './games/jungle-snake/',
  'reflex-80s': './games/reflex-80s/',
  'pixel-galaxy-defender': './games/pixel-galaxy-defender/',
  'frontline-echo': './games/frontline-echo/',
};

const launchButtons = document.querySelectorAll('[data-game]');
const gameWindow = document.querySelector('[data-window]');
const gameFrame = document.querySelector('[data-game-frame]');
const homeButton = document.querySelector('[data-home]');
const restartButton = document.querySelector('[data-restart]');
let currentGameUrl = '';

const closeGameWindow = () => {
  if (!gameWindow || !gameFrame) return;

  gameWindow.classList.remove('is-open');
  gameWindow.setAttribute('aria-hidden', 'true');

  window.setTimeout(() => {
    if (!gameWindow.classList.contains('is-open')) {
      gameFrame.removeAttribute('src');
      currentGameUrl = '';
    }
  }, 180);
};

const openGameWindow = (gameId) => {
  const gameUrl = games[gameId];
  if (!gameUrl || !gameWindow || !gameFrame) return;

  currentGameUrl = gameUrl;
  gameFrame.src = gameUrl;
  gameWindow.classList.add('is-open');
  gameWindow.setAttribute('aria-hidden', 'false');
};

const restartGame = () => {
  if (!gameFrame || !currentGameUrl) return;

  gameFrame.src = 'about:blank';
  window.setTimeout(() => {
    gameFrame.src = currentGameUrl;
  }, 0);
};

launchButtons.forEach((button) => {
  button.addEventListener('click', () => {
    openGameWindow(button.dataset.game);
  });
});

homeButton?.addEventListener('click', closeGameWindow);
restartButton?.addEventListener('click', restartGame);

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && gameWindow?.classList.contains('is-open')) {
    closeGameWindow();
  }
});
