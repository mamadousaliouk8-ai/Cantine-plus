from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from db import supabase
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), "../../utils"))
from ai_waste import analyze_waste_image

router = APIRouter()

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
    try:
        res = supabase.table("ecoles").select("*").eq("user_id", user_id).execute()
        return res.data[0] if res.data else None
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/profile")
def create_ecole_profile(data: EcoleProfileData):
    try:
        supabase.table("ecoles").insert(data.dict()).execute()
        return {"message": "Profil école créé !"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
