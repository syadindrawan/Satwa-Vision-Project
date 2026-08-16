/* emoji diambil dari Twemoji (https://github.com/twitter/twemoji), di-render lewat twemoji.parse() */
const SPECIES = [
  { key:"anjing",    label:"Anjing",     idx:"01", accent:"var(--rust)",   emoji:"🐶" },
  { key:"ayam",      label:"Ayam",       idx:"02", accent:"var(--teal)",   emoji:"🐔" },
  { key:"domba",     label:"Domba",      idx:"03", accent:"var(--gold)",   emoji:"🐑" },
  { key:"gajah",     label:"Gajah",      idx:"04", accent:"var(--forest)", emoji:"🐘" },
  { key:"kucing",    label:"Kucing",     idx:"05", accent:"var(--rust)",   emoji:"🐱" },
  { key:"kuda",      label:"Kuda",       idx:"06", accent:"var(--teal)",   emoji:"🐴" },
  { key:"kupu-kupu", label:"Kupu-kupu",  idx:"07", accent:"var(--gold)",   emoji:"🦋" },
  { key:"laba-laba", label:"Laba-laba",  idx:"08", accent:"var(--forest)", emoji:"🕷️" },
  { key:"sapi",      label:"Sapi",       idx:"09", accent:"var(--rust)",   emoji:"🐄" },
  { key:"tupai",     label:"Tupai",      idx:"10", accent:"var(--teal)",   emoji:"🐿️" },
];

const grid = document.querySelector('#beranda .grid.grid-cols-2');
grid.innerHTML = SPECIES.map(s => `
  <div class="specimen-card paper-card rounded-2xl p-4 flex flex-col items-center text-center">
    <span class="tag-index self-start" style="color:${s.accent}">CLASS ${s.idx}</span>
    <div class="my-3 specimen-emoji">${s.emoji}</div>
    <p class="font-display text-base" style="color:var(--forest)">${s.label}</p>
  </div>
`).join('');

// Twemoji mengubah karakter emoji di atas jadi <img> SVG konsisten di semua browser/OS.
if (window.twemoji) {
  twemoji.parse(grid, { folder: 'svg', ext: '.svg' });
}

/*  NAV: mobile menu  */
const menuBtn = document.getElementById('menuBtn');
const mobileMenu = document.getElementById('mobileMenu');
menuBtn.addEventListener('click', () => {
  const isOpen = mobileMenu.style.maxHeight && mobileMenu.style.maxHeight !== '0px';
  mobileMenu.style.maxHeight = isOpen ? '0px' : mobileMenu.scrollHeight + 'px';
});
mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => { mobileMenu.style.maxHeight = '0px'; }));

const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-link');
const spy = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navLinks.forEach(l => l.classList.toggle('active', l.getAttribute('href') === '#' + entry.target.id));
    }
  });
}, { rootMargin: '-40% 0px -55% 0px' });
sections.forEach(s => spy.observe(s));

/*  BACKEND STATUS CHECK DIAWAL */
//  cek sekali di awal apakah backend + model siap
let backendReady = false;
const modelStatus = document.getElementById('modelStatus');

async function checkBackend(){
  try {
    const res = await fetch('/health');
    const data = await res.json();
    backendReady = true;
    modelStatus.textContent = data.model_loaded
      ? 'Server siap — unggah gambar untuk mencoba.'
      : 'Server hidup, tapi model belum ditemukan. Pastikan model/animal_classifier.keras ada.';
  } catch (err) {
    modelStatus.textContent = 'Tidak bisa terhubung ke server. Pastikan app.py sedang dijalankan (python app.py).';
    console.warn('Backend tidak terjangkau:', err);
  }
  document.getElementById('classifyBtn').disabled = !currentFile;
}
checkBackend();

/*  UPLOAD & PREDICTION  */
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const dropContent = document.getElementById('dropContent');
const previewImg = document.getElementById('previewImg');
const classifyBtn = document.getElementById('classifyBtn');
const resetBtn = document.getElementById('resetBtn');
const scanOverlay = document.getElementById('scanOverlay');
const emptyState = document.getElementById('emptyState');
const resultState = document.getElementById('resultState');
const predictedLabel = document.getElementById('predictedLabel');
const predictedConf = document.getElementById('predictedConf');
const barsWrap = document.getElementById('barsWrap');

let currentFile = null;

dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', e => {
  e.preventDefault(); dropZone.classList.remove('dragover');
  if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', e => { if (e.target.files[0]) handleFile(e.target.files[0]); });

function handleFile(file){
  if (!file.type.startsWith('image/')) return;
  currentFile = file;
  const reader = new FileReader();
  reader.onload = e => {
    previewImg.src = e.target.result;
    previewImg.classList.remove('hidden');
    dropContent.classList.add('hidden');
    classifyBtn.disabled = !backendReady;
    resetBtn.classList.remove('hidden');
  };
  reader.readAsDataURL(file);
}

resetBtn.addEventListener('click', () => {
  currentFile = null;
  previewImg.src = '';
  previewImg.classList.add('hidden');
  dropContent.classList.remove('hidden');
  classifyBtn.disabled = true;
  resetBtn.classList.add('hidden');
  emptyState.classList.remove('hidden');
  resultState.classList.add('hidden');
  fileInput.value = '';
});

classifyBtn.addEventListener('click', async () => {
  if (!currentFile) return;
  scanOverlay.classList.remove('hidden');
  classifyBtn.disabled = true;

  try {
    const formData = new FormData();
    formData.append('file', currentFile);

    const res = await fetch('/predict', { method: 'POST', body: formData });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Server gagal memproses gambar.');
    }

    const results = data.all_scores.map(r => ({ name: r.class, score: r.confidence }));
    renderResults(results, data.is_confident);
  } catch (err) {
    modelStatus.textContent = err.message;
    console.error(err);
  } finally {
    scanOverlay.classList.add('hidden');
    classifyBtn.disabled = false;
  }
});

function renderResults(results, isConfident){
  emptyState.classList.add('hidden');
  resultState.classList.remove('hidden');

  const top = results[0];
  const meta = SPECIES.find(s => s.key === top.name) || { label: top.name };

  if (isConfident) {
    predictedLabel.textContent = meta.label || top.name;
    predictedLabel.style.color = 'var(--forest)';
    predictedConf.textContent = (top.score * 100).toFixed(1) + '% yakin';
  } else {
    predictedLabel.textContent = 'Tidak dikenali';
    predictedLabel.style.color = 'var(--rust)';
    predictedConf.textContent = 'keyakinan tertinggi cuma ' + (top.score * 100).toFixed(1) + '%';
  }

  barsWrap.innerHTML = (isConfident ? '' : `
    <p class="text-xs text-var(--ink)/60 mb-3">
      Gambar ini sepertinya bukan salah satu dari 10 hewan yang dikenali model
      (atau fotonya kurang jelas). Rincian skor per kelas tetap ditampilkan di bawah
      untuk referensi:
    </p>`) + results.map(r => {
    const m = SPECIES.find(s => s.key === r.name) || { label: r.name };
    const pct = (r.score * 100).toFixed(1);
    return `
      <div>
        <div class="flex justify-between text-xs font-mono mb-1">
          <span>${m.label}</span><span>${pct}%</span>
        </div>
        <div class="bar-track h-2 rounded-full overflow-hidden">
          <div class="bar-fill h-full rounded-full" style="width:${pct}%"></div>
        </div>
      </div>`;
  }).join('');
}