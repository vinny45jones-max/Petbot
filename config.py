import os
from dotenv import load_dotenv

load_dotenv()

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
TELEGRAM_CHANNEL_ID = os.getenv("TELEGRAM_CHANNEL_ID", "").strip()
TELEGRAM_SPECIAL_CHANNEL_ID = os.getenv("TELEGRAM_SPECIAL_CHANNEL_ID", "").strip() or TELEGRAM_CHANNEL_ID
CONTACT_PHONE = os.getenv("CONTACT_PHONE", "")
CARD_NUMBER = os.getenv("CARD_NUMBER", "")

if not TELEGRAM_BOT_TOKEN:
    raise ValueError("TELEGRAM_BOT_TOKEN не задан в .env")
if not OPENAI_API_KEY:
    raise ValueError("OPENAI_API_KEY не задан в .env")
