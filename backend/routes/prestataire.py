from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from db import supabase
import pandas as pd
import io
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), "../../utils"))
from ai_waste import analyze_menu_optimization

router = APIRouter()

from supabase import create_client
import os
_url = os.environ.get("SUPABASE_URL")
_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
admin_client = create_client(_url, _key)


class MenuConseilRequest(BaseModel):
    entree: str
    plat: str
    dessert: str

@router.post("/menus/{menu_id}/conseil")
def get_menu_conseil(menu_id: str, data: MenuConseilRequest):
    try:
        conseil = analyze_menu_optimization(data.entree, data.plat, data.dessert)
        return {"conseil": conseil}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class ProfileData(BaseModel):
    user_id: str
    nom: str

@router.get("/profile/{user_id}")
def get_profile(user_id: str):
    try:
        res = admin_client.table("prestataires").select("*").eq("user_id", user_id).execute()
        return res.data[0] if res.data else None
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/profile")
def create_profile(data: ProfileData):
    try:
        admin_client.table("prestataires").insert(data.dict()).execute()
        return {"message": "Profil créé !"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/menus/{prestataire_id}")
def get_menus(prestataire_id: str):
    try:
        res = admin_client.table("menus").select("*").eq("prestataire_id", prestataire_id).order("date").execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/menus/import/{prestataire_id}")
async def import_menus(prestataire_id: str, file: UploadFile = File(...)):
    try:
        content = await file.read()
        if file.filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(content))
        else:
            df = pd.read_excel(io.BytesIO(content), engine="openpyxl")

        succes = 0
        erreurs = 0
        for _, row in df.iterrows():
            try:
                date_obj = pd.to_datetime(str(row.get("Date (JJ/MM/AAAA)", "")), dayfirst=True).date()
                data = {
                    "prestataire_id": prestataire_id,
                    "date": str(date_obj),
                    "type": str(row.get("Type", "Viande")).strip(),
                    "entree": str(row.get("Entrée", "")).strip(),
                    "plat": str(row.get("Plat principal", "")).strip(),
                    "dessert": str(row.get("Dessert", "")).strip(),
                    "bio": str(row.get("Bio (Oui/Non)", "Non")).strip().lower() in ["oui", "yes", "true", "1"],
                }
                if data["plat"]:
                    admin_client.table("menus").insert(data).execute()
                    succes += 1
            except:
                erreurs += 1

        return {"succes": succes, "erreurs": erreurs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/commandes/{prestataire_id}")
def get_commandes(prestataire_id: str):
    try:
        ecoles = admin_client.table("ecoles").select("id, nom").eq("prestataire_id", prestataire_id).execute()
        ecole_ids = [e["id"] for e in ecoles.data]
        if not ecole_ids:
            return []
        res = admin_client.table("reservations").select("*, ecoles(nom), enfants(nom, prenom, allergies)").in_("ecole_id", ecole_ids).execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
