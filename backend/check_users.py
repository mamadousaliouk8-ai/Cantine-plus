import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")
supabase = create_client(url, key)

# On ne peut pas lister les users auth facilement sans clé service_role, 
# mais on peut essayer de se connecter avec un compte test pour voir son profil.
print("Vérification des rôles enregistrés...")
# On va juste essayer de voir si on peut récupérer les métadonnées d'un compte existant
# (ce script est juste pour le debug interne)
