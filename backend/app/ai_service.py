import os
import httpx
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

async def ask_grok(message: str):
    url = "https://api.groq.com/openai/v1/chat/completions"

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": "llama-3.3-70b-versatile", 
        "messages": [
            {"role": "user", "content": message}
        ]
    }

    async with httpx.AsyncClient() as client:
        res = await client.post(url, json=payload, headers=headers)
        data = res.json()

        # 💥 Catch error responses
        if "error" in data:
            print("GROQ ERROR:", data)
            return "AI Error: " + data["error"]["message"]

        # 💚 Correct model output
        return data["choices"][0]["message"]["content"]
