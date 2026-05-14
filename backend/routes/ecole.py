import os
from fastapi import APIRouter, HTTPException, UploadFile, File, Depends
from pydantic import BaseModel
from supabase import create_client
from typing import Optional
from db import supabase  # type: ignore[import]
from routes.auth import get_current_user  # type: ignore[import]
from utils.ai_waste import analyze_waste_image, analyze_qualitative_waste  # type: ignore[import]

router = APIRouter()

_supabase_url = os.environ.get("SUPABASE_URL") or ""
_supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or ""
admin_client = create_client(_supabase_url, _supabase_key)


class QualitativeWasteData(BaseModel):
    date: str
    kg: float
    satisfaction: str
    menu_standard: str
    menu_vege: str


class InvenduData(BaseModel):
    ecole_id: str
    date: str
    type: str
    quantite: int
    prix: float


class GaspillageData(BaseModel):
    ecole_id: str
    date: str
    kg_jetes: float


class MessageData(BaseModel):
    ecole_id: str
    titre: str
    contenu: str


class EcoleProfileData(BaseModel):
    user_id: str
    nom: str
    prestataire_id: Optional[str] = None


@router.post("/analyze-qualitative")
async def analyze_qualitative(data: QualitativeWasteData):
    try:
        analysis = analyze_qualitative_waste(
            data.date,
            data.kg,
            data.satisfaction,
            data.menu_standard,
            data.menu_vege
        )
        return {"analysis": analysis}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/create-admin")
def create_school_admin(data: dict, user: dict = Depends(get_current_user)):
    if user.get("role") != "Ecole":
        raise HTTPException(status_code=403, detail="Seules les écoles peuvent créer des admins liés.")

    email = data.get("email")
    password = data.get("password")
    name = data.get("name")
    ecole_id = data.get("ecole_id")

    if not email or not password or not name:
        raise HTTPException(status_code=400, detail="Données manquantes.")

    try:
        new_user = admin_client.auth.admin.create_user({
            "email": email,
            "password": password,
            "user_metadata": {
                "role": "Admin",
                "name": name,
                "linked_ecole_id": ecole_id
            },
            "email_confirm": True
        })
        return {"message": "✅ Compte Administrateur (Super Admin lié) créé !", "user": new_user.user}
    except Exception as e:
        print(f"CRITICAL Admin Creation Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze-waste")
async def analyze_waste(file: UploadFile = File(...)):
    try:
        content = await file.read()
        analysis = analyze_waste_image(content)
        return {"analysis": analysis}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/messages/{ecole_id}")
def get_messages(ecole_id: str):
    try:
        res = supabase.table("messages_ecoles").select("*").eq("ecole_id", ecole_id).order("created_at", desc=True).execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/messages")
def add_message(data: MessageData):
    try:
        supabase.table("messages_ecoles").insert(data.model_dump()).execute()
        return {"message": "Message publié !"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/reservations/{ecole_id}")
def get_reservations(ecole_id: str):
    try:
        res = supabase.table("reservations").select("*, enfants(nom, prenom, classe, allergies)").eq("ecole_id", ecole_id).execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/reservations/{reservation_id}/absent")
def mark_absent(reservation_id: str):
    try:
        supabase.table("reservations").update({"status": "Absent"}).eq("id", reservation_id).execute()
        return {"message": "Statut mis à jour en Absent."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/menus")
def get_menus():
    try:
        res = supabase.table("menus").select("*").order("date").execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/invendus")
def add_invendu(data: InvenduData):
    try:
        supabase.table("invendus").insert(data.model_dump()).execute()
        return {"message": "Invendus déclarés avec succès !"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/gaspillage")
def add_gaspillage(data: GaspillageData):
    try:
        supabase.table("gaspillage_ecoles").insert(data.model_dump()).execute()
        return {"message": "Relevé enregistré !"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/prestataires")
def get_prestataires():
    try:
        res = admin_client.table("prestataires").select("id, nom").execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/profile/{user_id}")
def get_ecole_profile(user_id: str):
    print(f"DEBUG: Récupération du profil pour user_id={user_id}")
    try:
        res = admin_client.table("ecoles").select("*").eq("user_id", user_id).execute()
        print(f"DEBUG: Résultat profil: {res.data}")
        return res.data[0] if res.data else None
    except Exception as e:
        print(f"DEBUG: Erreur lors de la récupération du profil: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/profile")
def create_ecole_profile(data: EcoleProfileData):
    print(f"DEBUG: Tentative de création de profil pour l'école {data.nom}")
    try:
        res = admin_client.table("ecoles").insert({
            "user_id": data.user_id,
            "nom": data.nom,
            "prestataire_id": data.prestataire_id
        }).execute()
        return {"message": "Profil école créé !", "data": res.data}
    except Exception as e:
        print(f"DEBUG: Erreur création profil ecole: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
