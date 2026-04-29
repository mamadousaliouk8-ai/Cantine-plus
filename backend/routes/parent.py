from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from db import supabase
from typing import Optional
import sys
import os

# Ajouter le chemin vers utils pour importer ai_coach
sys.path.append(os.path.join(os.path.dirname(__file__), "../utils"))
from ai_coach import analyze_meal_image, generate_superhero_voice

router = APIRouter()

@router.post("/analyze")
async def analyze_tray(
    file: UploadFile = File(...), 
    voice_id: Optional[str] = None, 
    character_name: Optional[str] = "un Superhéros",
    age: Optional[int] = None
):
    try:
        content = await file.read()
        # 1. Analyse Image (avec le nom du personnage et l'âge pour le prompt)
        result_text = analyze_meal_image(content, character_name, age)
        # 2. Génération Voix (avec l'ID de voix ElevenLabs)
        audio_b64 = generate_superhero_voice(result_text, voice_id)
        
        return {
            "message": result_text,
            "audio": audio_b64
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class EnfantData(BaseModel):
    parent_id: str
    ecole_id: str
    nom: str
    prenom: str
    classe: str
    age: Optional[int] = None
    allergies: Optional[str] = ""
    pai: Optional[str] = ""

class ReservationData(BaseModel):
    enfant_id: str
    ecole_id: str
    date: str
    type: str

class ReservationInvenduData(BaseModel):
    parent_id: str

class PointsData(BaseModel):
    points: int

@router.get("/ecoles")
def get_ecoles():
    try:
        res = supabase.table("ecoles").select("*").execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/enfants/{parent_id}")
def get_enfants(parent_id: str):
    try:
        res = supabase.table("enfants").select("*, ecoles(nom)").eq("parent_id", parent_id).execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/enfants")
def add_enfant(data: EnfantData):
    try:
        supabase.table("enfants").insert(data.dict()).execute()
        return {"message": "Enfant ajouté avec succès !"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/enfants/{enfant_id}")
def delete_enfant(enfant_id: str):
    try:
        supabase.table("enfants").delete().eq("id", enfant_id).execute()
        return {"message": "Enfant supprimé avec succès !"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/enfants/{enfant_id}/points")
def add_points(enfant_id: str, data: PointsData):
    try:
        # Fetch current points
        res = supabase.table("enfants").select("points").eq("id", enfant_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Enfant introuvable")
        
        current_points = res.data[0].get("points") or 0
        new_points = current_points + data.points
        
        # Update points
        supabase.table("enfants").update({"points": new_points}).eq("id", enfant_id).execute()
        return {"message": "Points ajoutés !", "new_points": new_points}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/menus")
def get_menus():
    try:
        res = supabase.table("menus").select("*").order("date").execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/reservations/{parent_id}")
def get_parent_reservations(parent_id: str):
    try:
        enfants_res = supabase.table("enfants").select("id").eq("parent_id", parent_id).execute()
        enfant_ids = [e["id"] for e in enfants_res.data]
        if not enfant_ids:
            return []
        res = supabase.table("reservations").select("*").in_("enfant_id", enfant_ids).execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/reservations")
def add_reservation(data: ReservationData):
    try:
        supabase.table("reservations").insert({**data.dict(), "status": "Confirmée"}).execute()
        return {"message": "Réservation confirmée !"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/invendus")
def get_invendus():
    try:
        res = supabase.table("invendus").select("*, ecoles(nom)").gt("quantite", 0).execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/invendus/{invendu_id}/reserver")
def reserve_invendu(invendu_id: int, data: ReservationInvenduData):
    try:
        # Check quantity
        res = supabase.table("invendus").select("quantite").eq("id", invendu_id).execute()
        if not res.data or res.data[0]["quantite"] <= 0:
            raise HTTPException(status_code=400, detail="Ce panier n'est plus disponible")
        
        # Decrement quantity
        new_quantite = res.data[0]["quantite"] - 1
        supabase.table("invendus").update({"quantite": new_quantite}).eq("id", invendu_id).execute()
        
        # Save reservation
        supabase.table("reservations_invendus").insert({
            "parent_id": data.parent_id,
            "invendu_id": invendu_id
        }).execute()
        
        return {"message": "Panier réservé avec succès !"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/reservations/{reservation_id}/cancel")
def cancel_reservation(reservation_id: str):
    try:
        supabase.table("reservations").update({"status": "Annulée"}).eq("id", reservation_id).execute()
        return {"message": "Réservation annulée. Ce repas part dans la bourse d'échange."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/bourse/{ecole_id}")
def get_bourse(ecole_id: str):
    try:
        from datetime import datetime
        today = datetime.now().strftime("%Y-%m-%d")
        res = supabase.table("reservations").select("*, enfants(nom, prenom, classe)").eq("ecole_id", ecole_id).eq("status", "Annulée").gte("date", today).execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class ClaimData(BaseModel):
    enfant_id: str

@router.put("/bourse/claim/{reservation_id}")
def claim_bourse(reservation_id: str, data: ClaimData):
    try:
        supabase.table("reservations").update({
            "status": "Validée",
            "enfant_id": data.enfant_id
        }).eq("id", reservation_id).execute()
        return {"message": "Repas récupéré avec succès !"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
