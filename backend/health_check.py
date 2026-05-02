from db import supabase
import uuid

def health_check():
    print("🩺 SCAN DE SANTÉ SUPABASE...")
    
    test_id = str(uuid.uuid4())
    
    # Test Prestataire
    print("\n1. Test table 'prestataires'...")
    try:
        res = supabase.table("prestataires").insert({"user_id": test_id, "nom": "Test Santé"}).execute()
        print("✅ Prestataires : OK")
        presta_id = res.data[0]["id"]
        
        # Test Ecole
        print("2. Test table 'ecoles'...")
        try:
            res_ec = supabase.table("ecoles").insert({"user_id": str(uuid.uuid4()), "nom": "Ecole Santé", "prestataire_id": presta_id}).execute()
            print("✅ Ecoles : OK")
        except Exception as e:
            print(f"❌ Ecoles : ÉCHEC -> {e}")
            
    except Exception as e:
        print(f"❌ Prestataires : ÉCHEC -> {e}")

if __name__ == "__main__":
    health_check()
