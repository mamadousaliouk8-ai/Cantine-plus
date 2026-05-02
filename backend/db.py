import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../.env"))

SUPABASE_URL = os.environ.get("SUPABASE_URL")
# Use service_role key for backend to bypass RLS
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
SUPABASE_KEY = SERVICE_KEY or os.environ.get("SUPABASE_KEY")

if SERVICE_KEY:
    print("DEBUG: Using SUPABASE_SERVICE_ROLE_KEY (RLS Bypass)")
else:
    print("DEBUG: Using standard SUPABASE_KEY (RLS Active)")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("WARNING: Supabase credentials missing!")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
