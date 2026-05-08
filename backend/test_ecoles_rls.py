import os
from supabase import create_client
from dotenv import load_dotenv
import uuid

load_dotenv()

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

print(f"URL: {url}")
print(f"KEY Prefix: {key[:10] if key else 'None'}")

if not url or not key:
    print("❌ Error: Missing credentials")
    exit(1)

supabase = create_client(url, key)

test_id = str(uuid.uuid4())
print(f"Testing insert with user_id: {test_id}")

try:
    res = supabase.table("ecoles").insert({
        "user_id": test_id,
        "nom": "TEST_DIAGNOSTIC_RLS"
    }).execute()
    print("✅ Success! Service Role bypassed RLS.")
    print(res.data)
    
    # Cleanup
    supabase.table("ecoles").delete().eq("user_id", test_id).execute()
    print("✅ Cleanup done.")
except Exception as e:
    print(f"❌ Failed: {str(e)}")
