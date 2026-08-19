const STORAGE_KEY = "most-goal:v1";

const els = {
  gaugeFill: document.getElementById('gaugeFill'),
  gaugeDot: document.getElementById('gaugeDot'),
  wizard: document.getElementById('wizard'),
  result: document.getElementById('result'),
  tracker: document.getElementById('tracker'),
  goalRows: document.getElementById('goalRows'),
  goalRecap: document.getElementById('goalRecap'),
  statusBanner: document.getElementById('statusBanner'),
  generateBtn: document.getElementById('generateBtn'),
  saveBtn: document.getElementById('saveBtn'),
  editBtn: document.getElementById('editBtn'),
  checkBtn: document.getElementById('checkBtn'),
  newGoalBtn: document.getElementById('newGoalBtn'),
  resetAllBtn: document.getElementById('resetAllBtn'),
  streakNum: document.getElementById('streakNum'),
  streakWord: document.getElementById('streakWord'),
  dots: document.getElementById('dots'),
  toast: document.getElementById('toast'),
  stressSlider: document.getElementById('stressSlider'),
  stressVal: document.getElementById('stressVal'),
  miniChart: document.getElementById('miniChart'),
  miniChartLabels: document.getElementById('miniChartLabels'),
  breatheCard: document.getElementById('breatheCard'),
  breatheCircle: document.getElementById('breatheCircle'),
  breatheWord: document.getElementById('breatheWord'),
  breatheCountdown: document.getElementById('breatheCountdown'),
  breatheNote: document.getElementById('breatheNote'),
  breatheToggle: document.getElementById('breatheToggle'),
  installBanner: document.getElementById('installBanner'),
  installBtn: document.getElementById('installBtn'),
};
const inputs = {
  M: document.getElementById('inpM'),
  O: document.getElementById('inpO'),
  S: document.getElementById('inpS'),
  T: document.getElementById('inpT'),
};
const warnS = document.getElementById('warnS');
const letters = {
  M: document.getElementById('letM'),
  O: document.getElementById('letO'),
  S: document.getElementById('letS'),
  T: document.getElementById('letT'),
};

// data shape: { goal: {m,o,s,days,text,createdAt}, checks: { "YYYY-MM-DD": {done:true, stress:5} } }
let data = loadData();

function loadData(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw) return JSON.parse(raw);
  }catch(e){ console.error('localStorage read error', e); }
  return { goal: null, checks: {} };
}
function saveData(){
  try{
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }catch(e){ console.error('localStorage write error', e); }
}

function showToast(msg){
  els.toast.textContent = msg;
  els.toast.classList.add('show');
  setTimeout(()=>els.toast.classList.remove('show'), 1800);
}
function todayStr(){ return new Date().toISOString().slice(0,10); }

/* ---------------- Wizard / gauge ---------------- */
const UNIT_WORDS = /(minutes?|min\b|secondes?|sec\b|heures?|\bh\b|jours?|\bj\b|semaines?|mois|fois|pages?|verres?|pas\b|respirations?|km|kilom[eè]tres?|\%)/i;
function hasNakedNumber(text){
  const matches = text.match(/\d+/g);
  if(!matches) return false;
  // if there's at least one number, check that a unit word appears somewhere nearby in the text
  return !UNIT_WORDS.test(text);
}

function updateGauge(){
  const sVal = inputs.S.value.trim();
  const sIsAmbiguous = sVal.length > 2 && hasNakedNumber(sVal);
  warnS.style.display = sIsAmbiguous ? 'block' : 'none';

  const filled = ['M','O','S'].filter(k => inputs[k].value.trim().length > 2).length
               + (Number(inputs.T.value) > 0 ? 1 : 0);
  const pct = (filled/4)*100;
  els.gaugeFill.style.width = pct + '%';
  els.gaugeDot.style.left = `calc(${6 + pct*0.85}%)`;
  if(filled >= 4){
    els.gaugeDot.style.background = 'var(--calm)';
    els.gaugeDot.style.boxShadow = '0 0 0 5px rgba(127,216,166,0.18)';
  } else {
    els.gaugeDot.style.background = 'var(--alert)';
    els.gaugeDot.style.boxShadow = '0 0 0 5px rgba(232,115,90,0.15)';
  }
  ['M','O','S'].forEach(k=>{
    letters[k].classList.toggle('done', inputs[k].value.trim().length > 2);
  });
  letters.T.classList.toggle('done', Number(inputs.T.value) > 0);
  els.generateBtn.disabled = filled < 4 || sIsAmbiguous;
}
Object.values(inputs).forEach(inp => inp.addEventListener('input', updateGauge));

function escapeHtml(str){
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function goalRowsHtml(g){
  return `
    <div class="goal-row"><span class="goal-row-label">Motivation</span><span class="goal-row-value">${escapeHtml(g.m)}</span></div>
    <div class="goal-row"><span class="goal-row-label">Objectif</span><span class="goal-row-value">${escapeHtml(g.o)}</span></div>
    <div class="goal-row"><span class="goal-row-label">Action (Small)</span><span class="goal-row-value">${escapeHtml(g.s)}</span></div>
    <div class="goal-row"><span class="goal-row-label">Durée</span><span class="goal-row-value">${g.days} jours, renouvelables</span></div>
  `;
}

els.generateBtn.addEventListener('click', () => {
  const m = inputs.M.value.trim();
  const o = inputs.O.value.trim();
  const s = inputs.S.value.trim();
  const t = Number(inputs.T.value) || 30;

  const pending = { m, o, s, days: t };
  els.goalRows.innerHTML = goalRowsHtml(pending);

  data.pendingGoal = pending;
  els.wizard.style.display = 'none';
  els.result.style.display = 'block';
  window.scrollTo({top:0, behavior:'smooth'});
});

els.editBtn.addEventListener('click', () => {
  els.result.style.display = 'none';
  els.wizard.style.display = 'block';
});

els.saveBtn.addEventListener('click', () => {
  data.goal = { ...data.pendingGoal, createdAt: todayStr() };
  data.checks = {};
  delete data.pendingGoal;
  saveData();
  els.result.style.display = 'none';
  els.breatheCard.style.display = 'block';
  renderTracker();
  showToast('Objectif enregistré');
});

/* ---------------- Tracker ---------------- */
function computeStreak(checks){
  const doneDates = new Set(Object.keys(checks).filter(d => checks[d].done));
  let streak = 0;
  let d = new Date();
  if(!doneDates.has(todayStr())) d.setDate(d.getDate()-1);
  while(true){
    const ds = d.toISOString().slice(0,10);
    if(doneDates.has(ds)){ streak++; d.setDate(d.getDate()-1); }
    else break;
  }
  return streak;
}

function renderMiniChart(){
  els.miniChart.innerHTML = '';
  els.miniChartLabels.innerHTML = '';
  const days = 7;
  for(let i = days-1; i>=0; i--){
    const d = new Date();
    d.setDate(d.getDate()-i);
    const ds = d.toISOString().slice(0,10);
    const entry = data.checks[ds];
    const bar = document.createElement('div');
    bar.className = 'mini-bar' + (entry && typeof entry.stress === 'number' ? ' has-val' : '');
    const h = entry && typeof entry.stress === 'number' ? Math.max(6, entry.stress*5) : 3;
    bar.style.height = h + 'px';
    els.miniChart.appendChild(bar);

    const lab = document.createElement('span');
    lab.textContent = d.toLocaleDateString('fr-FR', {weekday:'narrow'});
    els.miniChartLabels.appendChild(lab);
  }
}

function renderTracker(){
  if(!data.goal) return;
  els.wizard.style.display = 'none';
  els.result.style.display = 'none';
  els.tracker.style.display = 'block';
  els.breatheCard.style.display = 'block';

  const g = data.goal;
  els.goalRecap.innerHTML = `<div class="result-rows" style="border-top:none; margin-bottom:0;">${goalRowsHtml(g)}</div><div style="margin-top:8px; color:var(--text-faint); font-size:11.5px;">Débuté le ${g.createdAt}</div>`;

  const streak = computeStreak(data.checks);
  els.streakNum.textContent = streak;
  els.streakWord.textContent = streak > 1 ? 'jours de suite' : 'jour de suite';

  const t = todayStr();
  const todayEntry = data.checks[t];
  const isDoneToday = !!(todayEntry && todayEntry.done);
  els.checkBtn.textContent = isDoneToday ? "Fait aujourd'hui ✓ (annuler)" : "Fait aujourd'hui ✓";
  els.statusBanner.style.display = isDoneToday ? 'flex' : 'none';
  els.stressSlider.value = todayEntry && typeof todayEntry.stress === 'number' ? todayEntry.stress : 5;
  els.stressVal.textContent = els.stressSlider.value;

  els.dots.innerHTML = '';
  const daysToShow = 21;
  for(let i = daysToShow-1; i>=0; i--){
    const d = new Date();
    d.setDate(d.getDate()-i);
    const ds = d.toISOString().slice(0,10);
    const dot = document.createElement('div');
    const done = data.checks[ds] && data.checks[ds].done;
    dot.className = 'day-dot' + (done ? ' done' : '') + (ds===t ? ' today' : '');
    els.dots.appendChild(dot);
  }

  renderMiniChart();
}

els.stressSlider.addEventListener('input', () => {
  els.stressVal.textContent = els.stressSlider.value;
});
els.stressSlider.addEventListener('change', () => {
  const t = todayStr();
  const existing = data.checks[t] || { done:false };
  data.checks[t] = { ...existing, stress: Number(els.stressSlider.value) };
  saveData();
  renderMiniChart();
});

els.checkBtn.addEventListener('click', () => {
  const t = todayStr();
  const existing = data.checks[t] || {};
  const nowDone = !existing.done;
  data.checks[t] = { ...existing, done: nowDone, stress: typeof existing.stress === 'number' ? existing.stress : Number(els.stressSlider.value) };
  saveData();
  renderTracker();
  if(nowDone) showToast('Bravo, noté ✓');
});

els.newGoalBtn.addEventListener('click', () => {
  data.goal = null;
  data.checks = {};
  saveData();
  Object.values(inputs).forEach(i => i.value = i===inputs.T ? '30' : '');
  updateGauge();
  els.tracker.style.display = 'none';
  els.breatheCard.style.display = 'none';
  els.wizard.style.display = 'block';
});

els.resetAllBtn.addEventListener('click', () => {
  localStorage.removeItem(STORAGE_KEY);
  data = { goal: null, checks: {} };
  Object.values(inputs).forEach(i => i.value = i===inputs.T ? '30' : '');
  updateGauge();
  els.tracker.style.display = 'none';
  els.result.style.display = 'none';
  els.breatheCard.style.display = 'none';
  els.wizard.style.display = 'block';
  showToast('Réinitialisé');
});

/* ---------------- Breathing widget (cohérence cardiaque, 1 min) ---------------- */
const BREATHE_DURATION = 60; // seconds
let breatheCycleTimer = null;
let breatheCountdownTimer = null;
let breathing = false;
let secondsLeft = BREATHE_DURATION;

function breatheCycle(){
  els.breatheCircle.classList.remove('exhale');
  els.breatheCircle.classList.add('inhale');
  els.breatheWord.textContent = 'inspire';
  els.breatheNote.textContent = '4 s inspiration';
  setTimeout(() => {
    if(!breathing) return;
    els.breatheCircle.classList.remove('inhale');
    els.breatheCircle.classList.add('exhale');
    els.breatheWord.textContent = 'expire';
    els.breatheNote.textContent = '6 s expiration';
  }, 4000);
}

function stopBreathing(completed){
  breathing = false;
  clearInterval(breatheCycleTimer);
  clearInterval(breatheCountdownTimer);
  els.breatheToggle.textContent = 'Démarrer (1 min)';
  els.breatheCircle.classList.remove('inhale','exhale');
  els.breatheWord.textContent = 'inspire';
  els.breatheNote.textContent = '4 s inspiration · 6 s expiration';
  secondsLeft = BREATHE_DURATION;
  els.breatheCountdown.textContent = `${BREATHE_DURATION} s`;
  if(completed) showToast('Pause terminée — bravo 🌿');
}

function startBreathing(){
  breathing = true;
  secondsLeft = BREATHE_DURATION;
  els.breatheToggle.textContent = 'Arrêter';
  els.breatheCountdown.textContent = `${secondsLeft} s`;
  breatheCycle();
  breatheCycleTimer = setInterval(breatheCycle, 10000);
  breatheCountdownTimer = setInterval(() => {
    secondsLeft -= 1;
    els.breatheCountdown.textContent = `${Math.max(secondsLeft,0)} s`;
    if(secondsLeft <= 0){
      stopBreathing(true);
    }
  }, 1000);
}

els.breatheToggle.addEventListener('click', () => {
  if(breathing){
    stopBreathing(false);
  } else {
    startBreathing();
  }
});

/* ---------------- Install prompt ---------------- */
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  els.installBanner.style.display = 'flex';
});
els.installBtn.addEventListener('click', async () => {
  if(!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  els.installBanner.style.display = 'none';
});
window.addEventListener('appinstalled', () => {
  els.installBanner.style.display = 'none';
});

/* ---------------- Service worker ---------------- */
if('serviceWorker' in navigator){
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(err => console.error('SW registration failed', err));
  });
}

/* ---------------- Init ---------------- */
(function init(){
  updateGauge();
  if(data.goal){
    renderTracker();
  }
})();
