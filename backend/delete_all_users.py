from backend.db import supabase
import sys

def cleanup():
    print("🧹 Début du nettoyage de la base de données...")
    
    # 1. Supprimer les données des tables (dans l'ordre pour respecter les clés étrangères)
    tables = ["reservations", "invendus", "gaspillage_ecoles", "messages_ecoles", "enfants", "ecoles", "prestataires"]
    
    for table in tables:
        try:
            print(f"  - Nettoyage de la table {table}...")
            # On adapte le filtre selon le type probable d'ID
            if table in ["reservations", "invendus", "gaspillage_ecoles", "messages_ecoles"]:
                supabase.table(table).delete().gt("id", 0).execute()
            else:
                supabase.table(table).delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
        except Exception as e:
            print(f"    ⚠️ Erreur sur {table}: {e}")

    # 2. Supprimer les utilisateurs Auth
    print("  - Suppression des comptes utilisateurs (Auth)...")
    try:
        # Liste tous les utilisateurs
        users = supabase.auth.admin.list_users()
        for user in users:
            print(f"    🗑️ Suppression de {user.email}...")
            supabase.auth.admin.delete_user(user.id)
    except Exception as e:
        print(f"    ⚠️ Erreur lors de la suppression des utilisateurs: {e}")

    print("✨ Nettoyage terminé ! La base est comme neuve.")

if __name__ == "__main__":
    cleanup()
