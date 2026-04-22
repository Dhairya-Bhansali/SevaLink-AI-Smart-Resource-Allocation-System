import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

genai.configure(api_key=api_key)
model = genai.GenerativeModel('gemini-1.5-flash', generation_config={"response_mime_type": "application/json"})

try:
    response = model.generate_content("Give me a JSON array with one object inside it.")
    print("Response:", response.text)
except Exception as e:
    import traceback
    print("Error:", type(e).__name__, e)
    traceback.print_exc()
