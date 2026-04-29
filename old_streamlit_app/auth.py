import streamlit as st
from utils.db import supabase

def sign_up(email, password, role, name):
    if not supabase:
        st.error("Supabase n'est pas connecté. Vérifiez vos clés.")
        return False
    try:
        # L'inscription via auth.sign_up
        # On peut stocker le rôle et le nom dans les métadonnées de l'utilisateur
        res = supabase.auth.sign_up({
            "email": email,
            "password": password,
            "options": {
                "data": {
                    "role": role,
                    "name": name
                }
            }
        })
        if res.user:
            return True
        return False
    except Exception as e:
        st.error(f"Erreur d'inscription: {e}")
        return False

def sign_in(email, password):
    if not supabase:
        # Mock pour tester sans Supabase
        if email == "parent@test.com":
            st.session_state["user"] = {"id": "mock_parent_id", "email": email, "user_metadata": {"role": "Parent", "name": "Test Parent"}}
            return True
        elif email == "ecole@test.com":
            st.session_state["user"] = {"id": "mock_ecole_id", "email": email, "user_metadata": {"role": "Ecole", "name": "Test Ecole"}}
            return True
        elif email == "prestataire@test.com":
            st.session_state["user"] = {"id": "mock_presta_id", "email": email, "user_metadata": {"role": "Prestataire", "name": "Test Presta"}}
            return True
        st.error("Supabase n'est pas connecté et email mock inconnu.")
        return False
        
    try:
        res = supabase.auth.sign_in_with_password({"email": email, "password": password})
        if res.user:
            st.session_state["user"] = {
                "id": res.user.id,
                "email": res.user.email,
                "user_metadata": res.user.user_metadata
            }
            return True
        return False
    except Exception as e:
        err = str(e)
        if "Email not confirmed" in err:
            st.error("⚠️ Votre email n'est pas encore confirmé. Allez dans **Authentication → Users** sur Supabase, et supprimez ce compte. Puis recréez-le après avoir désactivé 'Confirm email' dans **Authentication → Providers → Email**.")
        else:
            st.error(f"Erreur de connexion: {e}")
        return False

def sign_out():
    if supabase:
        supabase.auth.sign_out()
    if "user" in st.session_state:
        del st.session_state["user"]

def get_current_user():
    return st.session_state.get("user", None)
