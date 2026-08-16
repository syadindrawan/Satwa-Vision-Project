# 🦁 SatwaVision

Klasifikasi citra 10 spesies hewan (anjing, ayam, domba, gajah, kucing, kuda,
kupu-kupu, laba-laba, sapi, tupai) memakai transfer learning + fine-tuning di
atas **MobileNetV2**, dibungkus dalam landing page web yang bisa dicoba
langsung oleh siapa pun.

![Python](https://img.shields.io/badge/Python-3.11-blue)
![TensorFlow](https://img.shields.io/badge/TensorFlow-2.16-orange)
![Flask](https://img.shields.io/badge/Flask-3.0-black)
![License](https://img.shields.io/badge/License-MIT-green)

---

## Daftar Isi

- [Tentang Proyek](#tentang-proyek)
- [Fitur](#fitur)
- [Tech Stack](#tech-stack)
- [Struktur Proyek](#struktur-proyek)
- [Menjalankan Secara Lokal](#menjalankan-secara-lokal)
- [Melatih Ulang Model](#melatih-ulang-model)
- [Dokumentasi API](#dokumentasi-api)
- [Build Production](#build-production)
- [Keterbatasan](#keterbatasan)
- [Deployment](#deployment)
- [Lisensi](#lisensi)

---

## Tentang Proyek

SatwaVision adalah studi kasus transfer learning: alih-alih melatih CNN dari
nol, model memakai bobot **MobileNetV2** yang sudah dilatih di ImageNet
sebagai fondasi, lalu di-fine-tuning dua tahap khusus untuk mengenali 10
spesies hewan. Proyek ini mencakup seluruh alur — dari notebook training di
Google Colab, backend Flask yang menyajikan prediksi, sampai landing page
yang responsif untuk mencobanya langsung.

Model divalidasi dengan **akurasi ~97%** pada data validasi (lihat
`classification_report` yang dihasilkan `train.py`/`train_colab.ipynb` untuk
rincian precision/recall per kelas).

Panduan setup super detail (dataset, training, build) ada di [SETUP.md](SETUP.md).

## Fitur

- 🎯 Klasifikasi 10 spesies hewan dari satu foto
- 🔄 Transfer learning + fine-tuning 2 tahap (freeze head → unfreeze sebagian backbone)
- 🖥️ Landing page responsif (mobile, tablet, desktop) dengan 5 section: Beranda, Tentang, Teknologi, Fitur, Coba Sekarang
- 🔌 REST API (`/predict`, `/health`) — bisa dipakai ulang di luar landing page ini
- ⚠️ Deteksi *out-of-distribution* sederhana lewat confidence threshold (gambar yang bukan salah satu dari 10 kelas ditandai "tidak dikenali", bukan dipaksa dapat label)
- ☁️ Notebook training siap pakai di Google Colab (GPU gratis)
- 🎨 CSS/JS terpisah, ikon lewat [Twemoji](https://github.com/twitter/twemoji), Tailwind di-compile untuk production (bukan CDN)

## Tech Stack

| Layer | Teknologi |
|---|---|
| Model | TensorFlow / Keras, MobileNetV2 (pretrained ImageNet) |
| Backend | Flask, Gunicorn |
| Frontend | HTML, Tailwind CSS v4, vanilla JavaScript |
| Training | Google Colab (GPU), scikit-learn (evaluasi) |
| Deployment | Render (lihat [Deployment](#deployment)) |

## Struktur Proyek

```
satwavision/
├── app.py                     # Backend Flask (endpoint /predict, /health)
├── train.py                   # Script training lokal
├── train_colab.ipynb          # Notebook training untuk Google Colab (GPU)
├── requirements-backend.txt   # Dependency untuk menjalankan app.py
├── requirements.txt           # Dependency untuk training
├── Procfile                   # Perintah start untuk platform hosting (gunicorn)
├── package.json               # Build Tailwind CSS untuk production
├── templates/
│   └── index.html             # Landing page (di-render Flask)
├── static/
│   ├── css/
│   │   ├── input.css          # Source Tailwind (boleh diedit)
│   │   └── style.css          # Hasil compile (JANGAN diedit manual)
│   ├── js/
│   │   └── main.js            # Logic upload & panggil API /predict
│   └── favicon.svg
└── model/
    ├── animal_classifier.keras
    └── class_indices.json
```

## Menjalankan Secara Lokal

Prasyarat: Python 3.10+ dan Node.js (untuk build CSS).

```bash
# 1. Clone repo
git clone https://github.com/USERNAME/satwavision.git
cd satwavision

# 2. Install dependency Python
pip install -r requirements-backend.txt

# 3. Install & build Tailwind CSS
npm install tailwindcss @tailwindcss/cli
npm run build:css

# 4. Jalankan server
python app.py
```

Buka `http://localhost:5000` di browser.

> Pastikan folder `model/` sudah berisi `animal_classifier.keras` dan
> `class_indices.json` — kalau belum ada, lihat bagian [Melatih Ulang Model](#melatih-ulang-model).

## Melatih Ulang Model

Cara paling praktis: pakai `train_colab.ipynb` di [Google Colab](https://colab.research.google.com)
(gratis, dapat GPU). Ringkasnya:

1. Susun dataset dengan struktur `dataset/<nama_kelas>/*.jpg` (satu folder per kelas).
2. Upload sebagai `dataset.zip` ke Google Drive.
3. Buka `train_colab.ipynb` di Colab, aktifkan GPU (`Runtime` → `Change runtime type`), jalankan semua sel.
4. Model final (`animal_classifier.keras`) dan `class_indices.json` otomatis tersimpan ke Google Drive.

Untuk training di komputer sendiri, pakai `python train.py` (butuh `pip install -r requirements.txt`).

Detail lengkap (struktur dataset, arsitektur, hyperparameter) ada di [SETUP.md](SETUP.md).

## Dokumentasi API

### `GET /health`

Cek status server & apakah model berhasil dimuat.

```json
{ "status": "ok", "model_loaded": true }
```

### `POST /predict`

Kirim gambar sebagai `multipart/form-data` dengan field `file`.

```bash
curl -X POST -F "file=@kucing.jpg" http://localhost:5000/predict
```

**Response (percaya diri):**
```json
{
  "prediction": "kucing",
  "confidence": 0.94,
  "is_confident": true,
  "threshold": 0.6,
  "all_scores": [
    { "class": "kucing", "confidence": 0.94 },
    { "class": "anjing", "confidence": 0.03 }
  ]
}
```

**Response (confidence di bawah threshold — kemungkinan bukan salah satu dari 10 kelas):**
```json
{
  "prediction": null,
  "confidence": 0.42,
  "is_confident": false,
  "threshold": 0.6,
  "all_scores": [ "..." ]
}
```

**Error responses:** `400` (file tidak valid/tidak ada), `503` (model belum termuat di server), `500` (gagal memproses gambar) — semua dengan body `{ "error": "pesan" }`.

## Build Production

Landing page memakai Tailwind CSS v4 yang **wajib di-compile**, bukan lewat CDN (CDN cuma untuk development).

```bash
npm run build:css    # build sekali
npm run watch:css    # auto-rebuild tiap ada perubahan (development)
```

Detail lengkap ada di [SETUP.md](SETUP.md).

## Keterbatasan

- Model dilatih hanya untuk 10 kelas — gambar apa pun yang bukan salah satu dari 10 kelas ini tetap akan diproses (softmax secara matematis selalu memaksa output ke salah satu kelas), namun ditandai `is_confident: false` kalau confidence-nya di bawah threshold (`0.6` secara default, bisa disesuaikan di `app.py`).
- Dataset dikumpulkan dengan jumlah gambar tidak seimbang antar kelas — beberapa kelas berpotensi punya recall lebih rendah dari yang lain.
