import './style.css';
import { SubwaySurfersGame } from './game.js';
import { sounds } from './audio.js';

// High Score Persistence
const HIGH_SCORE_KEY = 'subway_runners_highscore';
let highScore = parseInt(localStorage.getItem(HIGH_SCORE_KEY) || '0', 10);

// DOM Elements
const canvasContainer = document.getElementById('canvas-container');
const hud = document.getElementById('hud');
const coinCounter = document.getElementById('coin-counter');
const scoreCounter = document.getElementById('score-counter');
const multiplierBadge = document.getElementById('multiplier-badge');
const powerupTimers = document.getElementById('powerup-timers');
const btnSound = document.getElementById('btn-sound');
const btnPause = document.getElementById('btn-pause');

// Screen Overlays
const startScreen = document.getElementById('start-screen');
const menuHighScore = document.getElementById('menu-high-score');
const btnStart = document.getElementById('btn-start');

const gameoverScreen = document.getElementById('gameover-screen');
const gameoverScore = document.getElementById('gameover-score');
const gameoverCoins = document.getElementById('gameover-coins');
const gameoverBest = document.getElementById('gameover-best');
const newHighScoreBanner = document.getElementById('new-high-score-banner');
const btnRestart = document.getElementById('btn-restart');

const pauseScreen = document.getElementById('pause-screen');
const btnResume = document.getElementById('btn-resume');
const btnQuit = document.getElementById('btn-quit');

menuHighScore.textContent = highScore.toLocaleString();

// Powerup Configurations
const POWERUP_CONFIG = {
  magnet: { icon: '🧲', color: '#ff2244', max: 10 },
  jetpack: { icon: '🚀', color: '#ff9900', max: 10 },
  sneakers: { icon: '👟', color: '#00e676', max: 12 },
  multiplier: { icon: '⭐', color: '#aa00ff', max: 15 }
};

// UI Callbacks
const uiCallbacks = {
  onUpdateHUD: (data) => {
    // Score formatted with leading zeroes
    scoreCounter.textContent = String(data.score).padStart(6, '0');
    coinCounter.textContent = data.coins.toLocaleString();
    multiplierBadge.textContent = `x${data.multiplier}`;

    // Render powerup timers
    let html = '';
    for (let key in data.powerups) {
      const remaining = data.powerups[key];
      if (remaining > 0) {
        const conf = POWERUP_CONFIG[key];
        const pct = Math.min(100, Math.max(0, (remaining / conf.max) * 100));
        html += `
          <div class="powerup-bar-wrap">
            <span class="powerup-icon">${conf.icon}</span>
            <div class="powerup-progress-track">
              <div class="powerup-progress-fill" style="width: ${pct}%; background: ${conf.color};"></div>
            </div>
          </div>
        `;
      }
    }
    powerupTimers.innerHTML = html;
  },

  onStateChange: (state) => {
    if (state === 'RUNNING') {
      hud.classList.remove('hidden');
      startScreen.classList.add('hidden');
      gameoverScreen.classList.add('hidden');
      pauseScreen.classList.add('hidden');
    } else if (state === 'PAUSED') {
      pauseScreen.classList.remove('hidden');
    } else if (state === 'MENU') {
      hud.classList.add('hidden');
      startScreen.classList.remove('hidden');
      gameoverScreen.classList.add('hidden');
      pauseScreen.classList.add('hidden');
    }
  },

  onGameOver: (stats) => {
    hud.classList.add('hidden');
    gameoverScreen.classList.remove('hidden');

    gameoverScore.textContent = stats.score.toLocaleString();
    gameoverCoins.textContent = stats.coins.toLocaleString();

    let isNewHigh = false;
    if (stats.score > highScore) {
      highScore = stats.score;
      localStorage.setItem(HIGH_SCORE_KEY, String(highScore));
      isNewHigh = true;
    }

    if (isNewHigh) {
      newHighScoreBanner.classList.remove('hidden');
    } else {
      newHighScoreBanner.classList.add('hidden');
    }

    gameoverBest.textContent = highScore.toLocaleString();
    menuHighScore.textContent = highScore.toLocaleString();
  }
};

// Initialize Game Engine
const game = new SubwaySurfersGame(canvasContainer, uiCallbacks);

// Event Listeners for UI
btnStart.addEventListener('click', () => {
  game.startGame();
});

btnRestart.addEventListener('click', () => {
  game.startGame();
});

btnPause.addEventListener('click', () => {
  game.togglePause();
});

btnResume.addEventListener('click', () => {
  game.togglePause();
});

btnQuit.addEventListener('click', () => {
  pauseScreen.classList.add('hidden');
  game.state = 'MENU';
  game.resetPlayerPosition();
  uiCallbacks.onStateChange('MENU');
});

btnSound.addEventListener('click', () => {
  const isMuted = sounds.toggleMute();
  btnSound.textContent = isMuted ? '🔇' : '🔊';
});
