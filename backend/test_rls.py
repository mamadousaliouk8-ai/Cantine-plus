from backend.db import supabase
import uuid

def test_insert():
    print("🧪 Test d'insertion d'une école avec la clé actuelle...")
    test_id = str(uuid.uuid4())
    data = {
        "user_id": test_id, # ID fictif pour le test
        "nom": "École Test Diagnostic",
        "prestataire_id": None
    }
    
    try:
        res = supabase.table("ecoles").insert(data).execute()
        print("✅ Succès ! L'insertion a fonctionné. La clé utilisée est puissante.")
        print(f"Données insérées : {res.data}")
    except Exception as e:
        print(f"❌ Échec de l'insertion : {e}")

if __name__ == "__main__":
    test_insert()
