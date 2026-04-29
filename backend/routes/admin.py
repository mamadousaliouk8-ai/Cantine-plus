from fastapi import APIRouter, HTTPException
from db import supabase

router = APIRouter()

@router.get("/stats")
def get_global_stats():
    try:
        # 1. Total Kilos jetés
        gaspillage_res = supabase.table("gaspillage_ecoles").select("kg_jetes").execute()
        total_kg_jetes = sum(float(item["kg_jetes"]) for item in gaspillage_res.data) if gaspillage_res.data else 0

        # 2. Total Invendus Sauvés
        reservations_invendus_res = supabase.table("reservations_invendus").select("id").execute()
        total_invendus_sauves = len(reservations_invendus_res.data) if reservations_invendus_res.data else 0

        # 3. Total Points IA
        enfants_res = supabase.table("enfants").select("points").execute()
        total_points_ia = sum(int(item.get("points") or 0) for item in enfants_res.data) if enfants_res.data else 0

        # 4. Total CO2 sauvé (estimation: 2.5 kg CO2 par repas sauvé)
        total_co2_sauve = total_invendus_sauves * 2.5

        # 5. Utilisateurs actifs
        parents_res = supabase.table("user_roles").select("id", count="exact").eq("role", "Parent").execute()
        ecoles_res = supabase.table("user_roles").select("id", count="exact").eq("role", "Ecole").execute()
        presta_res = supabase.table("user_roles").select("id", count="exact").eq("role", "Prestataire").execute()

        total_parents = parents_res.count if hasattr(parents_res, 'count') and parents_res.count is not None else 0
        total_ecoles = ecoles_res.count if hasattr(ecoles_res, 'count') and ecoles_res.count is not None else 0
        total_prestas = presta_res.count if hasattr(presta_res, 'count') and presta_res.count is not None else 0

        # Fallback if count is not returned directly
        if total_parents == 0 and parents_res.data: total_parents = len(parents_res.data)
        if total_ecoles == 0 and ecoles_res.data: total_ecoles = len(ecoles_res.data)
        if total_prestas == 0 and presta_res.data: total_prestas = len(presta_res.data)

        return {
            "total_kg_jetes": round(total_kg_jetes, 2),
            "total_invendus_sauves": total_invendus_sauves,
            "total_points_ia": total_points_ia,
            "total_co2_sauve": round(total_co2_sauve, 2),
            "users": {
                "parents": total_parents,
                "ecoles": total_ecoles,
                "prestataires": total_prestas
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
