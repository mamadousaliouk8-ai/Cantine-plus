import os
import google.genai as genai
from dotenv import load_dotenv

load_dotenv()
api_key = os.environ.get("VISION_API_KEY")

if not api_key or "your_" in api_key:
    print("❌ Clé API non configurée ou invalide.")
else:
    client = genai.Client(api_key=api_key)
    print("🔍 Liste des modèles disponibles pour votre clé :")
    try:
        for m in client.models.list():
            print(f" - {m.name}")
    except Exception as e:
        print(f"❌ Erreur lors de la récupération des modèles : {e}")
