import io
import json
import os

import numpy as np
from flask import Flask, jsonify, render_template, request
from PIL import Image
import tensorflow as tf

app = Flask(__name__)

MODEL_PATH = os.path.join("model", "animal_classifier1.keras")
CLASS_PATH = os.path.join("model", "class_indices.json")
IMG_SIZE = (224, 224)
ALLOWED_EXT = {"png", "jpg", "jpeg", "webp"}
CONFIDENCE_THRESHOLD = 0.6 # Digunakan untuk membatasi kasus klasifikasi 
#diluar data yang dilatih ,but ga terlalu work. 

# Load model & label sekali saat server start
model = None
class_names = []

def load_artifacts():
    global model, class_names
    if not os.path.exists(MODEL_PATH):
        print(f"[PERINGATAN] Model belum ditemukan di {MODEL_PATH}. "
              f"Jalankan train.py terlebih dahulu.")
        return
    model = tf.keras.models.load_model(MODEL_PATH)
    with open(CLASS_PATH) as f:
        class_names = json.load(f)
    print(f"Model dimuat. Kelas: {class_names}")

load_artifacts()


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXT

def preprocess_image(file_bytes):
    img = Image.open(io.BytesIO(file_bytes)).convert("RGB")
    img = img.resize(IMG_SIZE)
    arr = np.array(img).astype("float32")
    arr = np.expand_dims(arr, axis=0)    # -> shape (1, 224, 224, 3), nilai pixel tetap 0-255
    return arr

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/health")
def health(): #check apakah model sudah dimuat di server
    return jsonify({"status": "ok", "model_loaded": model is not None})

@app.route("/predict", methods=["POST"])
def predict():
    if model is None:
        return jsonify({"error": "Model belum tersedia di server. Jalankan train.py dulu."}), 503

    if "file" not in request.files:
        return jsonify({"error": "Tidak ada file yang dikirim."}), 400

    file = request.files["file"]
    if file.filename == "" or not allowed_file(file.filename):
        return jsonify({"error": "Format file tidak didukung. Gunakan JPG/PNG/WEBP."}), 400

    try:
        arr = preprocess_image(file.read())
        preds = model.predict(arr, verbose=0)[0]  # shape (5,)

        results = [
            {"class": class_names[i], "confidence": float(preds[i])}
            for i in range(len(class_names))
        ]
        results.sort(key=lambda r: r["confidence"], reverse=True)

        top = results[0]
        is_confident = top["confidence"] >= CONFIDENCE_THRESHOLD

        return jsonify({
            "prediction": top["class"] if is_confident else None,
            "confidence": top["confidence"],
            "is_confident": is_confident,
            "threshold": CONFIDENCE_THRESHOLD,
            "all_scores": results,
        })
    except Exception as e:
        return jsonify({"error": f"Gagal memproses gambar: {str(e)}"}), 500


if __name__ == "__main__":

    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
    app.run(debug=debug, host="0.0.0.0", port=port)