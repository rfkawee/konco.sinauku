// const API_URL = "[http://127.0.0.1:5000](http://127.0.0.1:5000)";
const API_URL = "http://127.0.0.1:5000"

// Fungsi Upload
async function uploadPDF() {
    const fileInput = document.getElementById('pdfFile');
    const status = document.getElementById('uploadStatus');
    
    if(fileInput.files.length === 0) {
        alert("Pilih file dulu!");
        return;
    }

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);

    status.innerText = "Mengupload...";
    
    try {
        const res = await fetch(`${API_URL}/upload`, {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        if(data.message) status.innerText = "✅ Berhasil! Teks terbaca.";
        else status.innerText = "❌ Gagal: " + data.error;
    } catch (e) {
        status.innerText = "Error koneksi ke server";
    }
}

// Fungsi Ringkasan
async function getSummary() {
    const output = document.getElementById('summaryResult');
    output.innerText = "Sedang berpikir...";
    
    try {
        const res = await fetch(`${API_URL}/summarize`, { method: 'POST' });
        const data = await res.json();
        output.innerText = data.result || data.error;
    } catch (e) {
        output.innerText = "Error mengambil ringkasan.";
    }
}

// Fungsi Chat
async function sendChat() {
    const input = document.getElementById('questionInput');
    const history = document.getElementById('chatHistory');
    const question = input.value;
    
    if(!question) return;

    // Tampilkan chat user
    history.innerHTML += `<div class="chat-message user-msg">${question}</div>`;
    input.value = "";

    try {
        const res = await fetch(`${API_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question: question })
        });
        const data = await res.json();
        history.innerHTML += `<div class="chat-message ai-msg">${data.result || data.error}</div>`;
        history.scrollTop = history.scrollHeight; // Auto scroll ke bawah
    } catch (e) {
        history.innerHTML += `<div class="chat-message ai-msg">Error koneksi</div>`;
    }
}

// Fungsi Quiz
// Variabel global untuk menyimpan data kuis saat ini
let currentQuizData = [];

async function generateQuiz() {
    const container = document.getElementById('quizContainer');
    const actions = document.getElementById('quizActions');
    const loading = document.getElementById('quizLoading');
    const scoreArea = document.getElementById('scoreArea');
    const numQ = document.getElementById('numQuestions').value;

    // Reset tampilan
    container.innerHTML = "";
    actions.style.display = "none";
    scoreArea.style.display = "none";
    loading.style.display = "block";
    
    try {
        const res = await fetch(`${API_URL}/quiz`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ num_questions: numQ })
        });
        const data = await res.json();
        
        // Simpan data soal ke variabel global
        currentQuizData = JSON.parse(data.result);
        
        loading.style.display = "none";
        
        // Render Soal
        let html = "";
        currentQuizData.forEach((q, index) => {
            html += `
            <div class="quiz-item" id="q-item-${index}">
                <p><strong>Soal ${index+1}:</strong> ${q.question}</p>
                <div class="options">
                    ${q.options.map(opt => `
                        <label style="display:block; margin: 5px 0; cursor:pointer;">
                            <input type="radio" name="q${index}" value="${opt.substring(0,1)}"> 
                            ${opt}
                        </label>
                    `).join('')}
                </div>
                <div class="explanation" id="expl-${index}" style="display:none;">
                    <strong>Analisis:</strong> ${q.explanation}
                </div>
            </div>`;
        });
        
        container.innerHTML = html;
        actions.style.display = "block"; // Munculkan tombol submit

    } catch (e) {
        loading.style.display = "none";
        container.innerHTML = `<p style="color:red">Gagal membuat kuis: ${e.message}</p>`;
    }
}

function submitQuiz() {
    let score = 0;
    const total = currentQuizData.length;
    
    currentQuizData.forEach((q, index) => {
        // 1. Ambil jawaban user
        // Mencari input radio yang dicentang untuk soal nomor sekian
        const selected = document.querySelector(`input[name="q${index}"]:checked`);
        const userAns = selected ? selected.value : null;
        const correctAns = q.answer; // Misal "A"
        
        const itemDiv = document.getElementById(`q-item-${index}`);
        const explDiv = document.getElementById(`expl-${index}`);
        
        // 2. Cek Jawaban & Beri Warna
        if (userAns === correctAns) {
            score++;
            itemDiv.classList.add('correct-answer');
            explDiv.innerHTML = `✅ <strong>Benar!</strong> ${q.explanation}`;
        } else {
            itemDiv.classList.add('wrong-answer');
            const msg = userAns ? `Anda menjawab ${userAns}.` : "Anda tidak menjawab.";
            explDiv.innerHTML = `❌ <strong>Salah.</strong> ${msg} <br>Jawaban yang benar adalah <strong>${correctAns}</strong>.<br>${q.explanation}`;
        }
        
        // 3. Tampilkan Penjelasan
        explDiv.style.display = "block";
        
        // 4. Disable semua radio button agar tidak bisa diganti
        const radios = document.getElementsByName(`q${index}`);
        radios.forEach(r => r.disabled = true);
    });

    // 5. Tampilkan Skor Akhir
    const scoreArea = document.getElementById('scoreArea');
    const finalScoreTxt = document.getElementById('finalScore');
    const scoreMsg = document.getElementById('scoreMessage');
    
    scoreArea.style.display = "block";
    const percentage = Math.round((score / total) * 100);
    
    finalScoreTxt.innerText = `Skor Anda: ${percentage}% (${score}/${total})`;
    
    if(percentage >= 80) scoreMsg.innerText = "🎉 Luar biasa! Anda sangat memahami materi.";
    else if(percentage >= 50) scoreMsg.innerText = "👍 Bagus, tapi masih perlu membaca ulang beberapa bagian.";
    else scoreMsg.innerText = "📚 Sebaiknya baca ringkasan materi lagi ya.";
    
    // Scroll ke bagian skor
    scoreArea.scrollIntoView({ behavior: 'smooth' });
}

// Helper untuk cek jawaban kuis (Client side logic sederhana)
function checkAnswer(radio, correct, explanation) {
    // Ambil huruf pertama dari pilihan (misal "A. Jawaban" -> "A")
    const userAns = radio.parentElement.innerText.trim().substring(0, 1); 
    const explDiv = radio.parentElement.parentElement.querySelector('.explanation');
    
    if(userAns === correct) {
        explDiv.style.color = "green";
        explDiv.innerText = "✅ Benar! " + explanation;
    } else {
        explDiv.style.color = "red";
        explDiv.innerText = "❌ Salah. " + explanation;
    }
    explDiv.style.display = "block";
}

// Tab Switching UI
function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
    document.getElementById(tabId).style.display = 'block';
}