import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")

if not url or not key:
    print("❌ Erreur : SUPABASE_URL ou SUPABASE_KEY est manquant dans le fichier .env")
    exit(1)

# L'analyseur de code sait maintenant que url et key sont des strings
supabase = create_client(url, key)

print("Vérification des rôles enregistrés...")
# Ce script est pour le debug interne
