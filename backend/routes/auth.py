from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from db import supabase

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
    try:
        res = supabase.auth.sign_in_with_password({"email": data.email, "password": data.password})
        user = res.user
        session = res.session
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
        raise HTTPException(status_code=401, detail=str(e))

@router.post("/signup")
def sign_up(data: SignUpData):
    try:
        res = supabase.auth.sign_up({
            "email": data.email,
            "password": data.password,
            "options": {"data": {"role": data.role, "name": data.name}}
        })
        if res.user:
            return {"message": "Compte créé avec succès !"}
        raise HTTPException(status_code=400, detail="Erreur lors de la création du compte.")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/signout")
def sign_out():
    try:
        supabase.auth.sign_out()
        return {"message": "Déconnexion réussie."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
