from dotenv import load_dotenv
import os
from supabase import create_client

load_dotenv() # Charge le .env local
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("❌ Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing!")
    exit(1)

print(f"Testing with URL: {url}")
print(f"Key prefix: {key[:10]}...")

supabase = create_client(url, key)

try:
    res = supabase.auth.admin.create_user({
        "email": "test_script@test.fr",
        "password": "password123",
        "user_metadata": {"role": "Test"},
        "email_confirm": True
    })
    print("✅ Success!")
    print(res)
except Exception as e:
    print(f"❌ Failed: {e}")
