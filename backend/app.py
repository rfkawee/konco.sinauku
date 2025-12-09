from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
import PyPDF2
import io
import os
from dotenv import load_dotenv

# Load API Key dari file .env
load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

app = Flask(__name__)
CORS(app) # Izinkan frontend mengakses backend ini

# Konfigurasi Gemini
genai.configure(api_key=api_key)
model = genai.GenerativeModel('gemini-2.5-flash') # Gunakan 1.5-flash agar lebih stabil

# Variabel global sementara untuk menyimpan teks (di production sebaiknya pakai database)
pdf_content = {"text": ""}

@app.route('/upload', methods=['POST'])
def upload_pdf():
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    
    file = request.files['file']
    try:
        pdf_reader = PyPDF2.PdfReader(file)
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"
        
        pdf_content["text"] = text # Simpan teks di memori
        return jsonify({"message": "Success", "length": len(text)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/summarize', methods=['POST'])
def summarize():
    if not pdf_content["text"]:
        return jsonify({"error": "No PDF uploaded yet"}), 400
    
    try:
        # Batasi konteks jika perlu, atau kirim semua (Gemini 1.5 kuat menampung banyak teks)
        text_data = pdf_content["text"][:30000] 
        prompt = f"Buatkan ringkasan komprehensif dari teks ini:\n\n{text_data}"
        response = model.generate_content(prompt)
        return jsonify({"result": response.text})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/chat', methods=['POST'])
def chat():
    data = request.json
    question = data.get('question')
    
    if not pdf_content["text"]:
        return jsonify({"error": "No PDF uploaded yet"}), 400

    try:
        text_data = pdf_content["text"][:30000]
        prompt = f"Berdasarkan konteks dokumen ini:\n{text_data}\n\nJawab pertanyaan: {question}"
        response = model.generate_content(prompt)
        return jsonify({"result": response.text})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/quiz', methods=['POST'])
@app.route('/quiz', methods=['POST'])
def quiz():
    if not pdf_content["text"]:
        return jsonify({"error": "No PDF uploaded yet"}), 400
    
    # Ambil jumlah soal dari request, default 3 jika tidak ada
    data = request.json
    num = data.get('num_questions', 3)
        
    try:
        text_data = pdf_content["text"][:20000] # Perbesar context window
        prompt = f"""
        Buatkan {num} soal pilihan ganda dari teks ini dalam format JSON array murni.
        Strukturnya harus seperti ini:
        [
            {{"question": "Pertanyaan 1", "options": ["A. ..", "B. ..", "C. ..", "D. .."], "answer": "A", "explanation": "Penjelasan kenapa A benar"}}
        ]
        
        PENTING: 
        1. Pastikan output adalah JSON yang valid.
        2. Jangan gunakan markdown (```json).
        3. Opsi jawaban harus diawali huruf A., B., C., D.
        
        Teks: {text_data}
        """
        
        response = model.generate_content(prompt)
        cleaned_text = response.text.replace("```json", "").replace("```", "").strip()
        return jsonify({"result": cleaned_text}) 
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)