import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Chemins possibles pour le .env (racine ou dossier parent)
env_paths = [
    os.path.join(os.path.dirname(__file__), ".env"),
    os.path.join(os.path.dirname(__file__), "../.env"),
    os.path.join(os.getcwd(), ".env")
]

for path in env_paths:
    if os.path.exists(path):
        load_dotenv(dotenv_path=path)
        break

SUPABASE_URL = os.environ.get("SUPABASE_URL")
# PRIORITÉ ABSOLUE à la SERVICE_ROLE_KEY pour bypasser RLS
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
ANON_KEY = os.environ.get("SUPABASE_KEY")

# On utilise la clé de service si elle existe, sinon la clé anon
SUPABASE_KEY = SERVICE_KEY if SERVICE_KEY else ANON_KEY

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ ERROR: Supabase credentials missing (URL or KEY)!")

if SERVICE_KEY:
    print(f"✅ RLS BYPASS: Using SERVICE_ROLE KEY (Prefix: {SERVICE_KEY[:10]}...)")
else:
    print("⚠️ WARNING: Using ANON KEY - RLS will likely block database operations")

# Initialisation du client unique
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
