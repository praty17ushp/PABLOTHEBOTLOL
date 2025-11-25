from datetime import datetime
from qa_pairs import qa_pairs

def get_time():
    return datetime.now().strftime("%I:%M %p")

def get_date():
    return datetime.now().strftime("%d-%m-%Y")

def get_day():
    return datetime.now().strftime("%A")

def get_response(user_input):
    text = user_input.lower().strip()

    # --- Greetings ---
    greetings = ["hello", "hi", "hey", "good morning", "good afternoon", "good evening"]
    if any(text.startswith(g) for g in greetings):
        return "Hello. How may I assist you?"

    # --- Check specific Q&A FIRST ---
    for question, answer in qa_pairs.items():
        if question in text:
            return answer

    # --- Time (after Q&A so 'all time' doesn't trigger it) ---
    if "what is the time" in text or text == "time":
        return f"The current time is {get_time()}."

    # --- Date ---
    if "date" in text and "update" not in text:
        return f"Today's date is {get_date()}."

    # --- Day ---
    if "day" in text and "birthday" not in text:
        return f"Today is {get_day()}."

    # --- Fallback ---
    return "I am sorry, I do not have an answer for that yet."

# === Main Chat Loop ===
print("PabloBot: Hello. How may I assist you?")

while True:
    user_input = input("You: ")
    if user_input.lower().strip() == "exit":
        print("PabloBot: Goodbye.")
        break

    reply = get_response(user_input)
    print("PabloBot:", reply)
