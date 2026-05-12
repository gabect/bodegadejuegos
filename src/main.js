const games = {
  'jungle-snake': {
    title: 'Jungle Snake',
    url: '/games/jungle-snake/',
    color: '#9be8bd',
  },
  'reflex-80s': {
    title: 'Reflex 80s',
    url: '/games/reflex-80s/',
    color: '#ffc08a',
  },
  'pixel-galaxy-defender': {
    title: 'Pixel Galaxy Defender',
    url: '/games/pixel-galaxy-defender/',
    color: '#c8d7ff',
  },
  'frontline-echo': {
    title: 'Frontline Echo',
    url: '/games/frontline-echo/',
    color: '#f2b9ff',
  },
};

const clock = document.querySelector('[data-clock]');
const navButtons = document.querySelectorAll('[data-nav]');
const views = document.querySelectorAll('[data-view]');
const gameApps = document.querySelectorAll('[data-game]');
const gameWindow = document.querySelector('[data-window]');
const gameFrame = document.querySelector('[data-game-frame]');
const windowTitle = document.querySelector('[data-window-title]');
const windowIcon = document.querySelector('[data-window-icon]');
const closeButtons = document.querySelectorAll('[data-close-window]');
const fullscreenButton = document.querySelector('[data-fullscreen]');

const updateClock = () => {
  if (!clock) return;

  const now = new Date();
  const formattedTime = new Intl.DateTimeFormat('es', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(now);

  clock.textContent = formattedTime;
  clock.setAttribute('datetime', now.toISOString());
};

const showView = (viewName) => {
  views.forEach((view) => {
    view.hidden = view.dataset.view !== viewName;
  });

  navButtons.forEach((button) => {
    button.classList.toggle('is-active', button.dataset.nav === viewName);
  });

  if (gameWindow?.classList.contains('is-open')) {
    closeGameWindow();
  }
};

function closeGameWindow() {
  if (!gameWindow || !gameFrame) return;

  gameWindow.classList.remove('is-open');
  gameWindow.setAttribute('aria-hidden', 'true');

  window.setTimeout(() => {
    if (!gameWindow.classList.contains('is-open')) {
      gameFrame.removeAttribute('src');
    }
  }, 320);
}

const openGameWindow = (gameId) => {
  const game = games[gameId];
  if (!game || !gameWindow || !gameFrame) return;

  showView('home');

  gameApps.forEach((app) => {
    app.classList.toggle('is-focused', app.dataset.game === gameId);
  });

  windowTitle.textContent = game.title;
  windowIcon.style.background = game.color;
  windowIcon.style.boxShadow = `0 0 24px ${game.color}99`;
  gameFrame.src = game.url;
  gameWindow.classList.add('is-open');
  gameWindow.setAttribute('aria-hidden', 'false');
};

const requestWindowFullscreen = async () => {
  if (!gameWindow || !document.fullscreenEnabled) return;

  if (document.fullscreenElement) {
    await document.exitFullscreen();
    return;
  }

  await gameWindow.requestFullscreen();
};

updateClock();
window.setInterval(updateClock, 30_000);

navButtons.forEach((button) => {
  button.addEventListener('click', (event) => {
    event.preventDefault();
    showView(button.dataset.nav);
  });
});

gameApps.forEach((app) => {
  app.addEventListener('pointerenter', () => {
    gameApps.forEach((candidate) => candidate.classList.remove('is-focused'));
    app.classList.add('is-focused');
  });

  app.addEventListener('click', () => {
    openGameWindow(app.dataset.game);
  });
});

closeButtons.forEach((button) => {
  button.addEventListener('click', closeGameWindow);
});

fullscreenButton?.addEventListener('click', requestWindowFullscreen);

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeGameWindow();
  }
});
