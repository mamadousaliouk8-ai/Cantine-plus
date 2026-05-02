import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../.env"))

SUPABASE_URL = os.environ.get("SUPABASE_URL")
# FORCE usage of service_role key to bypass RLS
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
# If service key is provided, we MUST use it and ignore the anon key
SUPABASE_KEY = SERVICE_KEY if SERVICE_KEY else os.environ.get("SUPABASE_KEY")

if SERVICE_KEY:
    prefix = SERVICE_KEY[:10]
    print(f"!!! CRITICAL !!! Using SERVICE_ROLE KEY (Prefix: {prefix}...) - RLS BYPASS ENABLED")
else:
    print("!!! WARNING !!! Using ANON KEY - RLS WILL BLOCK INSERTS")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERROR: Supabase credentials missing!")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
