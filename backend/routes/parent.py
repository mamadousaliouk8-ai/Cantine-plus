from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from db import supabase  # type: ignore[import]
from typing import Optional, Any, Dict, cast
from utils.ai_coach import analyze_meal_image, generate_superhero_voice, analyze_meal_debrief, generate_culinary_quiz  # type: ignore[import]

router = APIRouter()

class QuizRequest(BaseModel):
    menu_description: str
    character_name: str
    child_name: str
    age: Optional[int] = None
    voice_id: Optional[str] = None

@router.post("/tts")
async def get_tts(data: dict):
    text = data.get("text")
    voice_id = data.get("voice_id", "fr-FR-DeniseNeural")
    if not text:
        return {"error": "No text"}
    
    audio_base64 = await generate_superhero_voice(text, voice_id)
    return {"audio": audio_base64}

@router.post("/quiz")
async def get_quiz(data: QuizRequest):
    try:
        # 1. Générer Quiz + Texte présentation
        quiz_data = generate_culinary_quiz(
            data.menu_description, 
            data.character_name, 
            data.child_name, 
            data.age
        )
        if not quiz_data:
            raise HTTPException(status_code=500, detail="Erreur génération quiz")
        
        # 2. Générer Audio pour la présentation
        audio_b64 = await generate_superhero_voice(quiz_data["presentation"], data.voice_id)
        
        return {
            "presentation": quiz_data["presentation"],
            "quiz": quiz_data["quiz"],
            "audio": audio_b64
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class DebriefData(BaseModel):
    menu_description: str
    character_name: str
    child_name: str
    age: Optional[int] = None
    voice_id: Optional[str] = None

@router.post("/debrief")
async def debrief_meal(data: DebriefData):
    try:
        # 1. Génération du texte
        result_text = analyze_meal_debrief(
            data.menu_description, 
            data.character_name, 
            data.child_name, 
            data.age
        )
        # 2. Génération de la voix
        audio_b64 = await generate_superhero_voice(result_text, data.voice_id)
        
        return {
            "message": result_text,
            "audio": audio_b64
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from supabase import create_client
import os
_url = os.environ.get("SUPABASE_URL") or ""
_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or ""
admin_client = create_client(_url, _key)


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
        # 2. Génération Voix (avec l'ID de voix edge-tts)
        audio_b64 = await generate_superhero_voice(result_text, voice_id)
        
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
        res = admin_client.table("ecoles").select("*").execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/enfants/{parent_id}")
def get_enfants(parent_id: str):
    try:
        res = admin_client.table("enfants").select("*, ecoles(nom)").eq("parent_id", parent_id).execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/enfants")
def add_enfant(data: EnfantData):
    try:
        admin_client.table("enfants").insert(data.model_dump()).execute()
        return {"message": "Enfant ajouté avec succès !"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/enfants/{enfant_id}")
def delete_enfant(enfant_id: str):
    try:
        admin_client.table("enfants").delete().eq("id", enfant_id).execute()
        return {"message": "Enfant supprimé avec succès !"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/enfants/{enfant_id}/points")
def add_points(enfant_id: str, data: PointsData):
    try:
        # Fetch current points
        res = admin_client.table("enfants").select("points").eq("id", enfant_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Enfant introuvable")
        
        row: Dict[str, Any] = cast(Dict[str, Any], res.data[0])
        current_points = row.get("points") or 0
        new_points = current_points + data.points
        
        # Update points
        admin_client.table("enfants").update({"points": new_points}).eq("id", enfant_id).execute()
        return {"message": "Points ajoutés !", "new_points": new_points}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/menus")
def get_menus():
    try:
        res = admin_client.table("menus").select("*").order("date").execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/reservations/{parent_id}")
def get_parent_reservations(parent_id: str):
    try:
        enfants_res = admin_client.table("enfants").select("id").eq("parent_id", parent_id).execute()
        enfant_ids = [cast(Dict[str, Any], e)["id"] for e in enfants_res.data]
        if not enfant_ids:
            return []
        res = admin_client.table("reservations").select("*").in_("enfant_id", enfant_ids).execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/reservations")
def add_reservation(data: ReservationData):
    try:
        admin_client.table("reservations").insert({**data.model_dump(), "status": "Confirmée"}).execute()
        return {"message": "Réservation confirmée !"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/invendus")
def get_invendus():
    try:
        res = admin_client.table("invendus").select("*, ecoles(nom)").gt("quantite", 0).execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/invendus/{invendu_id}/reserver")
def reserve_invendu(invendu_id: int, data: ReservationInvenduData):
    try:
        # Check quantity
        res = admin_client.table("invendus").select("quantite").eq("id", invendu_id).execute()
        row0: Dict[str, Any] = cast(Dict[str, Any], res.data[0])
        if not res.data or int(row0["quantite"]) <= 0:
            raise HTTPException(status_code=400, detail="Ce panier n'est plus disponible")
        
        # Decrement quantity
        new_quantite = int(row0["quantite"]) - 1
        admin_client.table("invendus").update({"quantite": new_quantite}).eq("id", invendu_id).execute()
        
        # Save reservation
        admin_client.table("reservations_invendus").insert({
            "parent_id": data.parent_id,
            "invendu_id": invendu_id
        }).execute()
        
        return {"message": "Panier réservé avec succès !"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/reservations/{reservation_id}/cancel")
def cancel_reservation(reservation_id: str):
    try:
        admin_client.table("reservations").update({"status": "Annulée"}).eq("id", reservation_id).execute()
        return {"message": "Réservation annulée. Ce repas part dans la bourse d'échange."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/bourse/{ecole_id}")
def get_bourse(ecole_id: str):
    try:
        from datetime import datetime
        today = datetime.now().strftime("%Y-%m-%d")
        res = admin_client.table("reservations").select("*, enfants(nom, prenom, classe)").eq("ecole_id", ecole_id).eq("status", "Annulée").gte("date", today).execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class ClaimData(BaseModel):
    enfant_id: str

@router.put("/bourse/claim/{reservation_id}")
def claim_bourse(reservation_id: str, data: ClaimData):
    try:
        admin_client.table("reservations").update({
            "status": "Validée",
            "enfant_id": data.enfant_id
        }).eq("id", reservation_id).execute()
        return {"message": "Repas récupéré avec succès !"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
