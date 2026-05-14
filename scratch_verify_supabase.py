import os
from dotenv import load_dotenv
from supabase import create_client, Client
from postgrest import CountMethod

# Use the same logic as db.py
load_dotenv(dotenv_path=".env")

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SERVICE_KEY:
    print("❌ Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing!")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SERVICE_KEY)

print(f"Testing connection to {SUPABASE_URL} with Service Role Key...")

try:
    # Test reading from a table that might have RLS
    res = supabase.table("ecoles").select("*", count=CountMethod.exact).execute()
    print(f"✅ Success! Found {res.count} schools.")
    
    # Test reading from auth.users (requires service role / admin privileges)
    users = supabase.auth.admin.list_users()
    print(f"✅ Success! Found {len(users)} users in Auth.")
    
    print("\n!!! RLS BYPASS CONFIRMED !!!")
except Exception as e:
    print(f"❌ Error: {e}")
