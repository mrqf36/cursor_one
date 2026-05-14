const { ipcRenderer } = require('electron');

const MODES = {
  work: { minutes: 25, color: '#e94560' },
  shortBreak: { minutes: 5, color: '#0f3460' },
  longBreak: { minutes: 15, color: '#533483' },
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
const progressRing = document.querySelector('.progress-ring-fill');
const completedCountEl = document.getElementById('completedCount');
const totalFocusEl = document.getElementById('totalFocus');

const CIRCUMFERENCE = 2 * Math.PI * 120;
progressRing.style.strokeDasharray = `${CIRCUMFERENCE} ${CIRCUMFERENCE}`;

updateStats();

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return { m: String(m).padStart(2, '0'), s: String(s).padStart(2, '0') };
}

function updateDisplay() {
  const { m, s } = formatTime(timeLeft);
  minutesEl.textContent = m;
  secondsEl.textContent = s;

  const offset = CIRCUMFERENCE - (timeLeft / totalTime) * CIRCUMFERENCE;
  progressRing.style.strokeDashoffset = offset;

  document.title = `${m}:${s} - 番茄钟`;
}

function switchMode(mode) {
  currentMode = mode;
  totalTime = MODES[mode].minutes * 60;
  timeLeft = totalTime;
  isRunning = false;
  clearInterval(timerInterval);
  toggleBtn.textContent = '开始';

  modeBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });

  progressRing.style.stroke = MODES[mode].color;
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
  toggleBtn.textContent = '开始';
  playBeep();

  if (currentMode === 'work') {
    completedSessions++;
    totalFocusMinutes += MODES.work.minutes;
    localStorage.setItem('completedSessions', completedSessions);
    localStorage.setItem('totalFocusMinutes', totalFocusMinutes);
    updateStats();
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
  if (isRunning) {
    clearInterval(timerInterval);
    isRunning = false;
    toggleBtn.textContent = '继续';
  } else {
    timerInterval = setInterval(tick, 1000);
    isRunning = true;
    toggleBtn.textContent = '暂停';
  }
}

function resetTimer() {
  clearInterval(timerInterval);
  isRunning = false;
  timeLeft = totalTime;
  toggleBtn.textContent = '开始';
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

updateDisplay();
