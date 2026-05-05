import os
from db import supabase

def cleanup():
    print("🧹 Début du nettoyage complet de Cantine+...")
    
    tables = [
        "reservations_invendus", 
        "reservations", 
        "enfants", 
        "messages_ecoles", 
        "gaspillage_ecoles", 
        "ecoles", 
        "prestataires", 
        "menus"
    ]
    
    # 1. Nettoyage des tables (ordre respectant les FK)
    for table in tables:
        try:
            print(f"   - Vidage de la table {table}...")
            supabase.table(table).delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
        except Exception as e:
            print(f"     ⚠️ Erreur sur {table}: {e}")

    # 2. Nettoyage de tous les utilisateurs Supabase Auth
    try:
        print("👤 Suppression de tous les comptes utilisateurs...")
        users = supabase.auth.admin.list_users()
        for user in users:
            print(f"   - Suppression de {user.email}...")
            supabase.auth.admin.delete_user(user.id)
    except Exception as e:
        print(f"⚠️ Erreur lors de la suppression des utilisateurs: {e}")

    print("\n✨ Nettoyage terminé ! Votre base est comme neuve.")

if __name__ == "__main__":
    confirm = input("⚠️ VOULEZ-VOUS VRAIMENT TOUT EFFACER ? (oui/non) : ")
    if confirm.lower() == "oui":
        cleanup()
    else:
        print("Annulé.")
