/* ---------- DOM Elements ---------- */
const messagesEl = document.getElementById('messages');
const inputEl = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const voiceToggle = document.getElementById('voiceToggle');
const voiceSelect = document.getElementById('voiceSelect');
const accentSelect = document.getElementById('accentSelect');
const clearNameBtn = document.getElementById('clearName');
const exportBtn = document.getElementById('exportChat');
const themeToggle = document.getElementById('themeToggle');
const statusEl = document.getElementById('status');

let recognition = null;
let voiceEnabled = false;
let userName = localStorage.getItem('pablo_name') || null;
let selectedVoice = null;
let voices = [];

/* ---------- UI helpers ---------- */
function appendBubble(text, who='bot', meta='') {
  const wrap = document.createElement('div');
  wrap.className = 'msg-wrap';
  const bubble = document.createElement('div');
  bubble.className = 'bubble ' + (who === 'user' ? 'user' : 'bot');
  bubble.textContent = text;
  wrap.appendChild(bubble);
  if (meta) {
    const m = document.createElement('div'); m.className = 'meta'; m.textContent = meta; wrap.appendChild(m);
  }
  messagesEl.appendChild(wrap);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function showTyping() {
  const tWrap = document.createElement('div');
  tWrap.className = 'msg-wrap';
  const t = document.createElement('div');
  t.className = 'typing';
  t.innerHTML = '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';
  tWrap.appendChild(t);
  messagesEl.appendChild(tWrap);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return tWrap;
}

/* ---------- TTS / Voice ---------- */
function populateVoices() {
  voices = window.speechSynthesis.getVoices();
  voiceSelect.innerHTML = '';
  voices.forEach((v, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = `${v.name} — ${v.lang}`;
    voiceSelect.appendChild(opt);
  });
  if (voices.length) {
    const idx = voices.findIndex(v => /en(-|_)?US/i.test(v.lang) || /en/i.test(v.lang));
    selectedVoice = voices[idx > -1 ? idx : 0];
    voiceSelect.value = voices.indexOf(selectedVoice);
  }
}
if (window.speechSynthesis) {
  populateVoices();
  window.speechSynthesis.onvoiceschanged = populateVoices;
}

accentSelect.addEventListener('change', () => {
  const val = accentSelect.value;
  if (val === 'deep') { statusEl.textContent = 'Deep voice enabled'; return; }
  const voice = voices.find(v => v.lang && v.lang.toLowerCase().startsWith(val.toLowerCase()));
  if (voice) { selectedVoice = voice; voiceSelect.value = voices.indexOf(voice); statusEl.textContent = `Accent set: ${val}`; }
  else statusEl.textContent = `Accent ${val} not found on your browser — choose any voice.`;
});

voiceSelect.addEventListener('change', () => {
  const idx = parseInt(voiceSelect.value, 10);
  selectedVoice = voices[idx];
});

function speak(text) {
  if (!voiceEnabled) return;
  if (!window.speechSynthesis) return;
  const utter = new SpeechSynthesisUtterance(text);
  if (selectedVoice) utter.voice = selectedVoice;
  if (accentSelect.value === 'deep') { utter.rate = 0.85; utter.pitch = 0.6; } 
  else { utter.rate = 1; utter.pitch = 1; }
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
}

/* ---------- SpeechRecognition (voice input) ---------- */
function initRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { statusEl.textContent = 'Voice input unsupported in this browser'; voiceToggle.disabled = true; return; }
  recognition = new SR();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = (e) => {
    const text = e.results[0][0].transcript;
    inputEl.value = text;
    setTimeout(() => sendMessage(), 120);
  };
  recognition.onend = () => { if (voiceEnabled) { try { recognition.start(); } catch(e){} } };
  recognition.onerror = (err) => { console.warn('Recognition error', err); statusEl.textContent = 'Voice recognition error'; };
}

/* ---------- Send / Receive ---------- */
async function sendMessage() {
  const text = inputEl.value.trim();
  if (!text) return;
  appendBubble(text, 'user', new Date().toLocaleTimeString());
  inputEl.value = '';

  // Client-side memory: capture "My name is X" without depending on server
  if (text.toLowerCase().startsWith('my name is ')) {
    const name = text.substring(11).trim();
    if (name) {
      localStorage.setItem('pablo_name', name);
      userName = name;
      appendBubble(`Nice to meet you, ${name}. I will remember your name in this browser.`, 'bot', new Date().toLocaleTimeString());
      speak(`Nice to meet you ${name}. I will remember your name.`);
      return;
    }
  }

  const t = showTyping();

  try {
    const res = await fetch('/chat', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({message: text})
    });
    const data = await res.json();
    t.remove();
    let reply = data.reply || "I didn't get that.";
    // personalize if memory exists
    if (reply.includes("remember your name") && userName) {
      reply = `Nice to meet you, ${userName}. I will remember your name in this browser.`;
    }
    appendBubble(reply, 'bot', new Date().toLocaleTimeString());
    speak(reply);
  } catch (err) {
    t.remove();
    appendBubble('Server error. Try again.', 'bot');
    console.error(err);
  }
}

/* ---------- Controls ---------- */
sendBtn.addEventListener('click', sendMessage);
inputEl.addEventListener('keypress', (e)=> { if (e.key === 'Enter') sendMessage(); });

voiceToggle.addEventListener('click', ()=>{
  voiceEnabled = !voiceEnabled;
  voiceToggle.textContent = voiceEnabled ? '🎤 Voice: On' : '🎤 Voice: Off';
  if (voiceEnabled && !recognition) initRecognition();
  if (voiceEnabled && recognition) {
    try { recognition.start(); } catch(e){}
  } else if (recognition) recognition.stop();
});

clearNameBtn.addEventListener('click', ()=>{
  localStorage.removeItem('pablo_name'); userName = null;
  appendBubble('Name cleared from memory.', 'bot');
});

exportBtn.addEventListener('click', ()=>{
  let txt = '';
  document.querySelectorAll('.bubble').forEach(b => txt += b.textContent + '\n');
  const blob = new Blob([txt], {type:'text/plain'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'pablobot_chat.txt'; a.click();
  URL.revokeObjectURL(url);
});

themeToggle.addEventListener('change', (e)=>{
  document.body.setAttribute('data-theme', e.target.checked ? 'light' : 'dark');
});

/* ---------- On load ---------- */
window.addEventListener('load', ()=>{
  appendBubble('Hello. I am PabloBot. Say "My name is ..." to teach me your name. Try "Give me game recommendations", "Tell a joke", "Tell the time".', 'bot');

  if (window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = () => {
      voices = window.speechSynthesis.getVoices();
      voiceSelect.innerHTML = '';
      voices.forEach((v,i)=> {
        const opt = document.createElement('option');
        opt.value = i; opt.textContent = `${v.name} — ${v.lang}`;
        voiceSelect.appendChild(opt);
      });
      if (voices.length) { selectedVoice = voices[0]; voiceSelect.value = 0; }
    };
    window.speechSynthesis.getVoices();
  }
  initRecognition();
});
