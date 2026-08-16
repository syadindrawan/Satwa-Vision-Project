# Panduan Setup Detail

> Ini dokumen referensi teknis lengkap (dataset prep, training Colab, build
> Tailwind, dst). Untuk overview project, lihat [README.md](README.md).

# SatwaVision — Klasifikasi 10 Kelas Hewan

Proyek ini terdiri dari dua bagian:
1. **Training (Python)** — transfer learning + fine-tuning MobileNetV2 untuk mengklasifikasi anjing, ayam, domba, gajah, kucing, kuda, kupu-kupu, laba-laba, sapi, dan tupai.
2. **Landing page (HTML + Tailwind + TensorFlow.js)** — UI 5 section (Beranda, Tentang, Teknologi, Fitur, Coba Sekarang) yang menjalankan model langsung di browser pengguna, tanpa backend server.

## 1. Siapkan dataset

Buat folder `dataset/` dengan struktur berikut, isi masing-masing folder dengan foto (disarankan minimal 150–300 gambar per kelas untuk hasil yang layak):

```
dataset/
├── anjing/
├── ayam/
├── domba/
├── gajah/
├── kucing/
├── kuda/
├── kupu-kupu/
├── laba-laba/
├── sapi/
└── tupai/
```

`train.py` dan `train_colab.ipynb` otomatis mendeteksi nama & jumlah kelas dari nama
folder di `dataset/` — jadi tidak perlu mengedit kode apa pun kalau susunan foldernya
berubah lagi, cukup pastikan nama folder sesuai nama kelas yang diinginkan.

## 2.  Lakukan training di Google Colab pakai GPU

Kalau tidak mau melatih model di laptop sendiri, pakai `train_colab.ipynb`:

1. Kompres folder `dataset/` menjadi `dataset.zip`, lalu upload ke Google Drive (misal ke `MyDrive/satwavision/dataset.zip`).
2. Buka [Google Colab](https://colab.research.google.com), upload `train_colab.ipynb` (`File` → `Upload notebook`).
3. Aktifkan GPU: `Runtime` → `Change runtime type` → pilih **GPU**.
4. Jalankan sel satu per satu dari atas ke bawah. Notebook ini akan:
   - Mount Google Drive
   - Ekstrak dataset
   - Melatih model (2 tahap: freeze head lalu fine-tuning) memakai GPU Colab
   - Menyimpan `animal_classifier.keras` + `class_indices.json` langsung ke Google Drive (`MyDrive/satwavision/model/`) — jadi aman meski Colab disconnect
   - (Opsional) mengonversi ke TensorFlow.js kalau kamu pakai versi web client-side
   - Menyediakan sel untuk download semua hasil sebagai satu file zip

Setelah selesai, lanjut ke bagian **"5. Jalankan landing page"** atau **"Opsi B: Backend Flask"**
di bawah — cukup pindahkan file hasil training dari Google Drive/zip ke folder proyek lokal
sesuai struktur yang dijelaskan.


## 3 Jalankan dengan Backend Flask (`app.py`) 

Model tetap sama (`model/animal_classifier.keras` dari `train.py`), hanya cara
menjalankannya yang beda: prediksi dilakukan di server, frontend mengirim gambar
lewat `fetch()`.

**Struktur folder yang dibutuhkan:**

```
project/
├── app.py
├── requirements-backend.txt
├── templates/
│   └── index.html          <- versi frontend yang fetch ke /predict
├── static/
│   ├── css/style.css
│   └── js/main.js
└── model/
    ├── animal_classifier.keras
    └── class_indices.json
```

**Langkah menjalankan:**

```bash
pip install -r requirements-backend.txt
python app.py
```

Buka `http://localhost:5000`. `di opsi ini — `app.py` langsung memuat file `.keras` memakai
`tf.keras.models.load_model()`.

**Alur teknis:**
1. `templates/index.html` — sama seperti versi client-side (5 section, desain identik), hanya bagian JS klasifikasi diganti: gambar dikirim sebagai `FormData` ke `POST /predict`.
2. `app.py` — memuat model sekali saat server start, endpoint `/predict` menerima file gambar, melakukan preprocessing (resize 224×224 + normalisasi MobileNetV2), lalu mengembalikan JSON berisi kelas prediksi + confidence tiap kelas. 