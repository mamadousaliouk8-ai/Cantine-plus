from fastapi import APIRouter, HTTPException, UploadFile, File, Depends
from pydantic import BaseModel
from db import supabase
from routes.auth import get_current_user
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), "../../utils"))
from ai_waste import analyze_waste_image

router = APIRouter()

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
        from supabase import create_client
        admin_client = create_client(os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_SERVICE_ROLE_KEY"))
        
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

from typing import Optional

class EcoleProfileData(BaseModel):
    user_id: str
    nom: str
    prestataire_id: Optional[str] = None

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
        supabase.table("messages_ecoles").insert(data.dict()).execute()
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
        supabase.table("invendus").insert(data.dict()).execute()
        return {"message": "Invendus déclarés avec succès !"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/gaspillage")
def add_gaspillage(data: GaspillageData):
    try:
        supabase.table("gaspillage_ecoles").insert(data.dict()).execute()
        return {"message": "Relevé enregistré !"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/prestataires")
def get_prestataires():
    try:
        res = supabase.table("prestataires").select("id, nom").execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/profile/{user_id}")
def get_ecole_profile(user_id: str):
    print(f"DEBUG: Récupération du profil pour user_id={user_id}")
    try:
        from supabase import create_client
        import os
        url = os.environ.get("SUPABASE_URL")
        key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        admin_client = create_client(url, key)

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
        from supabase import create_client
        url = os.environ.get("SUPABASE_URL")
        key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        print(f"DEBUG: URL={url}, KEY_PREFIX={key[:10] if key else 'None'}")
        
        admin_client = create_client(url, key)
        
        res = admin_client.table("ecoles").insert({
            "user_id": data.user_id,
            "nom": data.nom,
            "prestataire_id": data.prestataire_id
        }).execute()
        return {"message": "Profil école créé !", "data": res.data}
    except Exception as e:
        print(f"DEBUG: Erreur création profil ecole: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
