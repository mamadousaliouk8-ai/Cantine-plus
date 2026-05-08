import os
import requests
from dotenv import load_dotenv
from supabase import create_client

# On charge les variables d'environnement de la racine
load_dotenv("/Users/manelcheraiti/saliou/cantine-plus/.env")

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

supabase = create_client(url, key)

headers = {
    "apikey": key,
    "Authorization": f"Bearer {key}"
}

print("🧹 1. Nettoyage des tables publiques...")
tables = ["reservations", "invendus", "menus", "enfants", "parents", "ecoles", "prestataires"]
for table in tables:
    try:
        supabase.table(table).delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
        print(f"✅ Table '{table}' vidée avec succès.")
    except Exception as e:
        print(f"⚠️  Info sur table '{table}': {e}")

print("\n🧹 2. Nettoyage des comptes utilisateurs (auth.users)...")
res = requests.get(f"{url}/auth/v1/admin/users", headers=headers)
if res.status_code == 200:
    users = res.json().get("users", [])
    if not users:
        print("✅ Aucun compte trouvé.")
    for u in users:
        uid = u["id"]
        email = u.get("email", "sans_email")
        d_res = requests.delete(f"{url}/auth/v1/admin/users/{uid}", headers=headers)
        if d_res.status_code == 200:
            print(f"✅ Compte {email} supprimé.")
        else:
            print(f"❌ Erreur suppression {email}: {d_res.text}")
else:
    print("❌ Erreur récupération users:", res.text)

print("\n✨ Nettoyage terminé ! La base de données est vierge et prête pour les nouveaux utilisateurs.")
