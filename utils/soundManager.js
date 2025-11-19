// utils/soundManager.js

// cesty můžeš přizpůsobit – ideálně dej soubory do /public/sounds
const sources = {
  correct: "/sounds/correct.mp3",
  wrong: "/sounds/wrong.mp3",
  speedWin: "/sounds/speed-win.mp3",
  countdown: "/sounds/countdown-beep.mp3",
};

const cache = {};

function getAudio(type) {
  if (!sources[type]) return null;
  if (!cache[type]) {
    try {
      cache[type] = new Audio(sources[type]);
    } catch (e) {
      return null;
    }
  }
  return cache[type];
}

export function playSound(type) {
  const audio = getAudio(type);
  if (!audio) return;
  try {
    audio.currentTime = 0;
    audio.play().catch(() => {});
  } catch (e) {}
}

export function vibrate(type) {
  if (typeof navigator === "undefined" || !navigator.vibrate) return;

  if (type === "correct") navigator.vibrate([20, 40]);
  else if (type === "wrong") navigator.vibrate([50, 40, 50]);
  else if (type === "send") navigator.vibrate(18);
  else if (type === "result") navigator.vibrate(30);
}
