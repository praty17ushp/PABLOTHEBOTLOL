from flask import Flask, render_template, request, jsonify
from datetime import datetime, timedelta
import random
import os

app = Flask(__name__, static_folder="static", template_folder="templates")

# ---------- Data (server brain) ----------
QA = {
    "hey give me game recommendations":
        "Red Dead Redemption 2, Ghost of Tsushima, Grand Theft Auto V, Hitman World of Assassination, Forza Horizon, Assassin's Creed, Ace Combat 7.",
    "list the greatest football players of all time":
        "The greatest football players include Cristiano Ronaldo, Lionel Messi, Sergio Ramos, and Neymar.",
    "what is the powerhouse of the cell": "The powerhouse of the cell is the mitochondria.",
    "list the best movies of all time":
        "Some of the best movies include Transformers, John Wick, Terminator, Fast and Furious, Fight Club, Red Notice, and The Avengers.",
    "list the most famous comic book characters":
        "Batman, Superman, Spider-Man, Iron Man, Deadpool, Black Widow, and Hulk."
}

JOKES = [
    "Do you want to hear a pizza joke? Nahhh, it's too cheesy!",
    "What did the buffalo say when his son left? Bison!",
    "What do you call a cold dog? A chili dog.",
    "Where do you learn to make banana splits? At sundae school.",
    "What did one ocean say to the other? Nothing, they just waved."
]

FACTS = [
    "Honey never spoils; archaeologists found edible honey in ancient tombs.",
    "Octopuses have three hearts.",
    "Bananas are berries but strawberries are not.",
    "A group of flamingos is called a flamboyance."
]

# ---------- helpers ----------
def now_time(): return datetime.now().strftime("%I:%M:%S %p")
def now_date(): return datetime.now().strftime("%d %B %Y")
def now_day(): return datetime.now().strftime("%A")

def find_qa(msg: str):
    q = msg.lower()
    for k, v in QA.items():
        if k in q: return v
    return None

# --- Date intelligence
def date_ai(text):
    text = text.lower()
    today = datetime.now()

    if "today" in text and "tomorrow" not in text:
        return f"Today's date is {today.strftime('%d %B %Y')} ({today.strftime('%A')})."
    if "tomorrow" in text:
        tmr = today + timedelta(days=1)
        return f"Tomorrow is {tmr.strftime('%d %B %Y')} ({tmr.strftime('%A')})."
    if "day after" in text or "day after tomorrow" in text:
        dat = today + timedelta(days=2)
        return f"The day after tomorrow is {dat.strftime('%d %B %Y')} ({dat.strftime('%A')})."
    if "yesterday" in text:
        ys = today - timedelta(days=1)
        return f"Yesterday was {ys.strftime('%d %B %Y')} ({ys.strftime('%A')})."
    return None

# --- World/general knowledge
def world_ai(text):
    text = text.lower()
    if any(w in text for w in ("world","earth","universe","tell me about the world")):
        return (
            "Quick world summary:\n"
            "- The Earth is ~4.5 billion years old.\n"
            "- Humans appeared around 300,000 years ago.\n"
            "- There are 195 countries and countless cultures.\n"
            "- The universe is expanding; much remains unknown."
        )
    if "india" in text:
        return (
            "India: one of the world's oldest civilizations 🇮🇳\n"
            "- Birthplace of Yoga and Ayurveda.\n"
            "- World's largest democracy with over 1.4 billion people.\n"
            "- Notable space achievements, cultural diversity and cuisine."
        )
    if "sun" in text:
        return "The Sun is a ~4.6 billion-year-old star. It powers life on Earth via nuclear fusion."
    if "moon" in text:
        return "The Moon likely formed from a giant impact early in Earth's history and affects tides and calendars."
    return None

# --- Lightweight AI fallback
def ai_fallback(text):
    t = text.lower()
    if any(g in t for g in ("hi","hello","hey")):
        return "Hello! I'm PabloBot. How can I help you today?"
    if "how are you" in t:
        return "I'm running smoothly — ready to help! 😊"
    if "joke" in t:
        return random.choice(JOKES)
    if "fact" in t:
        return random.choice(FACTS)
    if "game" in t:
        return QA.get("hey give me game recommendations")
    if "movie" in t:
        return QA.get("list the best movies of all time")
    # fallback safe answer
    return "I don't know that exactly — but I can help with games, movies, jokes, time, date, and basic facts."

def generate_reply(message: str):
    t = (message or "").lower().strip()
    if not t:
        return "Say something and I'll reply!"

    # Handle explicit client-side name statements gracefully (server returns a friendly ack)
    if "my name is " in t:
        name = message.split("my name is",1)[1].strip()
        if name:
            # server acknowledges; actual memory is saved client-side
            return f"Nice to meet you, {name}. I will remember your name in this browser."

    # check predefined Q&A
    qa = find_qa(t)
    if qa:
        return qa

    # date intelligence
    d = date_ai(t)
    if d: return d

    # world / general knowledge
    w = world_ai(t)
    if w: return w

    # time/day queries
    if "time" in t and "all time" not in t:
        return f"The current time is {now_time()}."
    if "day" in t and "day after" not in t:
        return f"Today is {now_day()}."

    # games shortcut
    if "give me game" in t or ("game" in t and "recommend" in t):
        return QA.get("hey give me game recommendations")

    # jokes/facts
    if "joke" in t: return random.choice(JOKES)
    if "fun fact" in t or "fact" in t: return random.choice(FACTS)

    # lightweight AI fallback
    return ai_fallback(message)

# ---------- routes ----------
@app.route("/")
def index():
    return render_template("index.html")

@app.route("/chat", methods=["POST"])
def chat():
    payload = request.get_json() or {}
    msg = payload.get("message", "")
    reply = generate_reply(msg)
    return jsonify({"reply": reply})

# health endpoint (helpful for Render uptime checks)
@app.route("/health")
def health():
    return jsonify({"status":"ok","time": now_time()})

if __name__ == "__main__":
    # bind to 0.0.0.0 for cloud hosting
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
