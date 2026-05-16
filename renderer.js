const { ipcRenderer } = require('electron');

const MODES = {
  work: { minutes: 25, label: '专注模式' },
  shortBreak: { minutes: 5, label: '短休模式' },
  longBreak: { minutes: 15, label: '长休模式' },
};

let currentMode = 'work';
let timeLeft = MODES.work.minutes * 60;
let totalTime = timeLeft;
let isRunning = false;
let timerInterval = null;
let completedSessions = parseInt(localStorage.getItem('completedSessions') || '0');
let totalFocusMinutes = parseInt(localStorage.getItem('totalFocusMinutes') || '0');

const minutesEl = document.getElementById('minutes');
const secondsEl = document.getElementById('seconds');
const toggleBtn = document.getElementById('toggleBtn');
const resetBtn = document.getElementById('resetBtn');
const modeBtns = document.querySelectorAll('.mode-btn');
const gaugeFill = document.querySelector('.gauge-fill');
const gaugeTip = document.querySelector('.gauge-tip');
const modeNameEl = document.getElementById('modeName');
const sessionNumEl = document.getElementById('sessionNum');
const completedCountEl = document.getElementById('completedCount');
const totalFocusEl = document.getElementById('totalFocus');
const knobIcon = toggleBtn.querySelector('.knob-icon');
const knobLabel = toggleBtn.querySelector('.knob-label');

const GAUGE_LENGTH = Math.PI * 120;
gaugeFill.style.strokeDasharray = `${GAUGE_LENGTH} ${GAUGE_LENGTH}`;

updateStats();
updateSessionNum();

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return { m: String(m).padStart(2, '0'), s: String(s).padStart(2, '0') };
}

function updateDisplay() {
  const { m, s } = formatTime(timeLeft);
  minutesEl.textContent = m;
  secondsEl.textContent = s;

  const ratio = timeLeft / totalTime;
  const offset = GAUGE_LENGTH - ratio * GAUGE_LENGTH;
  gaugeFill.style.strokeDashoffset = offset;

  // 旋转 gauge tip：弧线是上半圆，逆时针从正左到正右
  const angle = -180 * (1 - ratio);
  gaugeTip.setAttribute('transform', `rotate(${angle}, 150, 150)`);

  document.title = `${m}:${s} - Chronos`;
}

function updateSessionNum() {
  const num = completedSessions + 1;
  sessionNumEl.textContent = String(num).padStart(2, '0');
}

function switchMode(mode) {
  currentMode = mode;
  totalTime = MODES[mode].minutes * 60;
  timeLeft = totalTime;
  isRunning = false;
  clearInterval(timerInterval);

  modeBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });

  document.body.setAttribute('data-mode', mode);
  modeNameEl.textContent = MODES[mode].label;

  toggleBtn.classList.remove('pulse-glow');
  knobIcon.textContent = '▶';
  knobLabel.textContent = '开始';

  updateDisplay();
}

function playBeep() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = 880;
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.5);
}

function notify(title, body) {
  ipcRenderer.send('show-notification', { title, body });
}

function onComplete() {
  isRunning = false;
  clearInterval(timerInterval);
  knobIcon.textContent = '▶';
  knobLabel.textContent = '开始';
  toggleBtn.classList.add('pulse-glow');
  playBeep();

  if (currentMode === 'work') {
    completedSessions++;
    totalFocusMinutes += MODES.work.minutes;
    localStorage.setItem('completedSessions', completedSessions);
    localStorage.setItem('totalFocusMinutes', totalFocusMinutes);
    updateStats();
    updateSessionNum();
    notify('专注完成！', '该休息一下了');
  } else {
    notify('休息结束！', '准备好开始新的专注了吗？');
  }
}

function tick() {
  timeLeft--;
  updateDisplay();
  if (timeLeft <= 0) {
    onComplete();
  }
}

function toggleTimer() {
  if (timeLeft <= 0) {
    resetTimer();
    return;
  }

  if (isRunning) {
    clearInterval(timerInterval);
    isRunning = false;
    knobIcon.textContent = '▶';
    knobLabel.textContent = '继续';
    toggleBtn.classList.remove('pulse-glow');
  } else {
    timerInterval = setInterval(tick, 1000);
    isRunning = true;
    knobIcon.textContent = '⏸';
    knobLabel.textContent = '暂停';
    toggleBtn.classList.remove('pulse-glow');
  }
}

function resetTimer() {
  clearInterval(timerInterval);
  isRunning = false;
  timeLeft = totalTime;
  knobIcon.textContent = '▶';
  knobLabel.textContent = '开始';
  toggleBtn.classList.remove('pulse-glow');
  updateDisplay();
}

function updateStats() {
  completedCountEl.textContent = completedSessions;
  totalFocusEl.textContent = totalFocusMinutes;
}

toggleBtn.addEventListener('click', toggleTimer);
resetBtn.addEventListener('click', resetTimer);

modeBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    switchMode(btn.dataset.mode);
  });
});

// 初始化
document.body.setAttribute('data-mode', 'work');
updateDisplay();
