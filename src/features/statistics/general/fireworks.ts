import confetti from 'canvas-confetti';

/** Festejo tipo fuegos artificiales (confetti + bursts). */
export function launchProfitFireworks(durationMs = 4000) {
  const end = Date.now() + durationMs;

  const frame = () => {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.7 },
      colors: ['#e11d48', '#f59e0b', '#34d399', '#38bdf8', '#f472b6', '#fbbf24'],
      zIndex: 4000,
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.7 },
      colors: ['#e11d48', '#f59e0b', '#34d399', '#38bdf8', '#f472b6', '#fbbf24'],
      zIndex: 4000,
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  };

  // Bursts centrales
  confetti({
    particleCount: 120,
    spread: 100,
    startVelocity: 45,
    origin: { x: 0.5, y: 0.55 },
    colors: ['#e11d48', '#fb7185', '#f59e0b', '#34d399', '#38bdf8'],
    zIndex: 4000,
  });
  setTimeout(() => {
    confetti({
      particleCount: 80,
      spread: 360,
      startVelocity: 35,
      origin: { x: 0.3, y: 0.4 },
      zIndex: 4000,
    });
    confetti({
      particleCount: 80,
      spread: 360,
      startVelocity: 35,
      origin: { x: 0.7, y: 0.4 },
      zIndex: 4000,
    });
  }, 400);

  frame();
}
