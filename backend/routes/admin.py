from fastapi import APIRouter, HTTPException, Depends
from db import supabase
from routes.auth import get_current_user

router = APIRouter()

@router.get("/stats")
def get_global_stats(user: dict = Depends(get_current_user)):
    try:
        linked_id = user.get("linked_ecole_id")

        # 1. Total Kilos jetés (filtré par école si besoin)
        query_kg = supabase.table("gaspillage_ecoles").select("kg_jetes")
        if linked_id: query_kg = query_kg.eq("ecole_id", linked_id)
        gaspillage_res = query_kg.execute()
        total_kg_jetes = sum(float(item.get("kg_jetes", 0)) for item in gaspillage_res.data) if gaspillage_res.data else 0

        # 2. Total Invendus Sauvés (filtré par école si besoin)
        query_inv = supabase.table("reservations_invendus").select("id", count="exact")
        if linked_id: query_inv = query_inv.eq("ecole_id", linked_id)
        try:
            invendus_res = query_inv.execute()
            total_invendus_sauves = invendus_res.count if invendus_res.count is not None else 0
        except Exception:
            total_invendus_sauves = 0

        # 3. Total Points IA (filtré par école si besoin)
        query_pts = supabase.table("enfants").select("points")
        if linked_id: query_pts = query_pts.eq("ecole_id", linked_id)
        enfants_res = query_pts.execute()
        total_points_ia = sum(int(item.get("points") or 0) for item in enfants_res.data) if enfants_res.data else 0

        # 4. Total CO2 sauvé
        total_co2_sauve = total_invendus_sauves * 2.5

        # 5. Utilisateurs
        total_parents = 0
        total_ecoles = 0
        total_prestataires = 0

        # Si admin global, on compte tout. Si lié, on compte seulement les parents de CETTE école.
        if not linked_id:
            try:
                auth_res = supabase.auth.admin.list_users()
                # La liste des utilisateurs est dans l'attribut 'users' de la réponse
                for u in auth_res.users:
                    role = u.user_metadata.get("role")
                    if role == "Parent": total_parents += 1
                    elif role == "Ecole": total_ecoles += 1
                    elif role == "Prestataire": total_prestataires += 1
            except Exception:
                total_parents = len(supabase.table("enfants").select("parent_id").execute().data or [])
                total_ecoles = len(supabase.table("ecoles").select("id").execute().data or [])
                total_prestataires = len(supabase.table("prestataires").select("id").execute().data or [])
        else:
            # Pour un admin d'école, on ne montre que les parents de son école
            total_parents = len(supabase.table("enfants").select("parent_id").eq("ecole_id", linked_id).execute().data or [])
            total_ecoles = 1 # C'est lui-même
            total_prestataires = 0 # Optionnel: on pourrait chercher le prestataire lié à l'école

        return {
            "total_kg_jetes": round(total_kg_jetes, 2),
            "total_invendus_sauves": total_invendus_sauves,
            "total_points_ia": total_points_ia,
            "total_co2_sauve": round(total_co2_sauve, 2),
            "users": {
                "parents": total_parents,
                "ecoles": total_ecoles,
                "prestataires": total_prestataires
            },
            "is_restricted": bool(linked_id)
        }
    except Exception as e:
        print(f"CRITICAL Admin Stats Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
