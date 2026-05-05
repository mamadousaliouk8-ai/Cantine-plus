from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from db import supabase
from typing import Optional

router = APIRouter()

class SignInData(BaseModel):
    email: str
    password: str

class SignUpData(BaseModel):
    email: str
    password: str
    role: str
    name: str

@router.post("/signin")
def sign_in(data: SignInData):
    print(f"DEBUG: Tentative de connexion pour {data.email}")
    try:
        res = supabase.auth.sign_in_with_password({"email": data.email, "password": data.password})
        user = res.user
        session = res.session
        print(f"DEBUG: Succès! Role: {user.user_metadata.get('role')}")
        return {
            "access_token": session.access_token,
            "user": {
                "id": user.id,
                "email": user.email,
                "role": user.user_metadata.get("role"),
                "name": user.user_metadata.get("name"),
            }
        }
    except Exception as e:
        print(f"DEBUG: Erreur de connexion: {str(e)}")
        raise HTTPException(status_code=401, detail=str(e))

@router.post("/signup")
def sign_up(data: SignUpData):
    print(f"DEBUG: Création de compte: {data.email} avec role {data.role}")
    try:
        res = supabase.auth.sign_up({
            "email": data.email,
            "password": data.password,
            "options": {"data": {"role": data.role, "name": data.name}}
        })
        if res.user:
            print(f"DEBUG: Compte créé avec succès pour {data.email}")
            return {"message": "Compte créé avec succès !"}
        print("DEBUG: Echec creation compte (res.user est None)")
        raise HTTPException(status_code=400, detail="Erreur lors de la création du compte.")
    except Exception as e:
        print(f"DEBUG: Erreur Signup Exception: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/signout")
def sign_out():
    try:
        supabase.auth.sign_out()
        return {"message": "Déconnexion réussie."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Token manquant")
    
    try:
        token = authorization.replace("Bearer ", "")
        res = supabase.auth.get_user(token)
        if not res.user:
            raise HTTPException(status_code=401, detail="Session invalide ou expirée")
        
        return {
            "id": res.user.id,
            "email": res.user.email,
            "role": res.user.user_metadata.get("role"),
            "linked_ecole_id": res.user.user_metadata.get("linked_ecole_id")
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Erreur d'authentification: {str(e)}")
