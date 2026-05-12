const cards = document.querySelectorAll('[data-glow-card]');

const updateGlowPosition = (event) => {
  const card = event.currentTarget;
  const rect = card.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  card.style.setProperty('--glow-x', `${x}px`);
  card.style.setProperty('--glow-y', `${y}px`);
};

cards.forEach((card) => {
  card.addEventListener('pointermove', updateGlowPosition);
  card.addEventListener('pointerleave', () => {
    card.style.setProperty('--glow-x', '50%');
    card.style.setProperty('--glow-y', '50%');
  });
});
