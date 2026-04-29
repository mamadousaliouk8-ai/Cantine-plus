import streamlit as st
import pandas as pd
import datetime
from utils.auth import get_current_user, sign_out
from utils.db import get_ecole_by_user, set_ecole_profile, get_reservations_for_ecole, get_menus_for_parent, add_invendu, supabase

st.set_page_config(page_title="Espace École | Cantine+", page_icon="🏫", layout="wide", initial_sidebar_state="collapsed")

user = get_current_user()
if not user or user.get("user_metadata", {}).get("role") != "Ecole":
    st.switch_page("app.py")
    st.stop()

ecole_user_id = user["id"]
ecole_profile = get_ecole_by_user(ecole_user_id)

st.markdown("""
<style>
    :root { --primary-green: #328A4A; --accent-orange: #F47B20; }
    .stApp { background-color: var(--primary-green) !important; }
    h1, h2, h3, p, span, label, div { color: #FFFFFF !important; }
    .stButton > button, div[data-testid="stFormSubmitButton"] > button { background-color: var(--accent-orange) !important; color: #FFFFFF !important; border: none !important; border-radius: 8px !important; font-weight:bold !important; width: 100% !important; }
    .stButton > button:hover, div[data-testid="stFormSubmitButton"] > button:hover { background-color: #1E6B35 !important; color: #FFFFFF !important; }
    
    .stSelectbox div[data-baseweb="select"] > div { background-color: var(--accent-orange) !important; color: #FFFFFF !important; border: none !important; border-radius: 6px !important; }
    ul[data-baseweb="menu"], div[data-baseweb="popover"] { background-color: var(--accent-orange) !important; }
    li[data-baseweb="menu-item"] { color: #FFFFFF !important; font-weight: 500 !important; }
    li[data-baseweb="menu-item"]:hover, li[data-baseweb="menu-item"][aria-selected="true"] { background-color: #1E6B35 !important; color: #FFFFFF !important; }
    
    .stTextInput input, .stDateInput input, .stNumberInput input { background-color: #FFFFFF !important; color: #1A1A1A !important; border: 1px solid #FFFFFF !important; border-radius: 6px !important; caret-color: #000000 !important; }
    .stTextInput input:focus, .stDateInput input:focus, .stNumberInput input:focus { border: 2px solid var(--accent-orange) !important; box-shadow: 0 0 0 1px var(--accent-orange) !important; }
    
    [data-testid="stForm"] { background-color: rgba(255, 255, 255, 0.1) !important; border: 1px solid rgba(255, 255, 255, 0.3) !important; border-radius: 12px !important; padding: 2rem !important; }
    [data-baseweb="tab"] { background-color: transparent !important; border: none !important; color: rgba(255, 255, 255, 0.7) !important; margin-right: 4px; }
    [aria-selected="true"] { background-color: transparent !important; color: #FFFFFF !important; border: none !important; border-bottom: 3px solid var(--accent-orange) !important; }
    [data-testid="stSidebar"] { display: none; }
</style>
""", unsafe_allow_html=True)

if not ecole_profile:
    st.info("👋 Bienvenue ! Configurez votre profil École pour commencer.")
    # Charger les prestataires disponibles pour lier l'école
    prestataires = []
    if supabase:
        res = supabase.table("prestataires").select("id, nom").execute()
        prestataires = res.data
    
    with st.form("setup_ecole_form"):
        nom_ecole = st.text_input("Nom de votre établissement")
        if prestataires:
            presta_options = {p["nom"]: p["id"] for p in prestataires}
            presta_choisi = st.selectbox("Votre prestataire de repas", list(presta_options.keys()))
            presta_id_choisi = presta_options[presta_choisi]
        else:
            st.warning("Aucun prestataire disponible. Demandez-lui de s'inscrire d'abord.")
            presta_id_choisi = None
        
        if st.form_submit_button("✅ Créer mon profil"):
            if nom_ecole and presta_id_choisi:
                set_ecole_profile(ecole_user_id, nom_ecole, presta_id_choisi)
                st.success("Profil créé ! Rechargement en cours...")
                st.rerun()
            else:
                st.error("Veuillez remplir tous les champs.")
    st.stop()

ecole_id = ecole_profile["id"]
nom_affichage = ecole_profile["nom"]

import base64
import os

icone_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "icone.png")
texte_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "texte.png")
icone_b64 = ""
texte_b64 = ""
if os.path.exists(icone_path):
    with open(icone_path, "rb") as img_file:
        icone_b64 = base64.b64encode(img_file.read()).decode()
if os.path.exists(texte_path):
    with open(texte_path, "rb") as img_file:
        texte_b64 = base64.b64encode(img_file.read()).decode()
        
icone_tag = f'<img src="data:image/svg+xml;base64,{icone_b64}" width="180" style="display:block; margin: 0 auto; margin-bottom: -10px;" />' if icone_b64 else ''
texte_tag = f'<img src="data:image/svg+xml;base64,{texte_b64}" width="450" style="display:block; margin: 0 auto; margin-bottom: 1rem;" />' if texte_b64 else ''

col1, col2 = st.columns([4, 1])
with col1:
    st.markdown(f"""
        <div style="margin-bottom: 2rem; text-align: left;">
            <div style="display: inline-block;">
                {icone_tag}
                {texte_tag}
            </div>
            <h2 style="font-size: 1.5rem; color: rgba(255,255,255,0.9); margin-top: 5px;">🏫 Espace École - {nom_affichage}</h2>
        </div>
    """, unsafe_allow_html=True)
with col2:
    if st.button("🚪 Déconnexion", key="logout_ecole"):
        sign_out()
        st.switch_page("app.py")

if not ecole_profile:
    st.warning("Votre profil n'est pas encore complètement configuré. Pour le prototype, nous utilisons un compte fictif par défaut.")
    # On assigne arbitrairement un ID pour le mock si non trouvé
    ecole_id = "mock_ecole_id"
else:
    ecole_id = ecole_profile["id"]

tab1, tab2, tab3 = st.tabs(["📋 Réservations de l'école", "🍽️ Menus", "♻️ Redistribution (Invendus)"])

with tab1:
    st.header("Suivi des Réservations")
    st.write("Vue d'ensemble des repas réservés par les parents **pour votre établissement**.")
    
    reservations = get_reservations_for_ecole(ecole_id)
    if reservations:
        # Aplatir la structure pour le dataframe
        data_res = []
        for r in reservations:
            data_res.append({
                "Date": r["date"],
                "Type": r["type"],
                "Enfant": f"{r['enfants'].get('prenom', '')} {r['enfants'].get('nom', '')}",
                "Classe": r['enfants'].get('classe', '')
            })
            
        df_res = pd.DataFrame(data_res)
        st.dataframe(df_res, use_container_width=True, hide_index=True)
        
        st.subheader("Synthèse à préparer (Prestataire)")
        summary = df_res.groupby(['Date', 'Type']).size().reset_index(name='Quantité Totale')
        st.dataframe(summary, hide_index=True)
    else:
        st.info("Aucune réservation enregistrée pour votre école.")

with tab2:
    st.header("Menus prévus")
    # Pour l'instant, on affiche tous les menus
    menus = get_menus_for_parent()
    if menus:
        df_menus = pd.DataFrame(menus)
        st.dataframe(df_menus, use_container_width=True, hide_index=True)
    else:
        st.write("Aucun menu n'a encore été saisi.")

with tab3:
    st.header("Déclarer les invendus du jour")
    st.write("Saisissez le nombre de repas non consommés de votre école. Ils seront immédiatement visibles par les parents de votre établissement pour récupération.")
    
    with st.form("invendu_form"):
        col_i1, col_i2 = st.columns(2)
        with col_i1:
            date_invendu = st.date_input("Date", value=datetime.date.today())
            type_invendu = st.selectbox("Type de repas non consommé", ["Viande", "Sans viande", "Mixte"])
        with col_i2:
            quantite = st.number_input("Nombre de portions", min_value=1, value=1, step=1)
            
        if st.form_submit_button("Ajouter aux invendus"):
            add_invendu(ecole_id, date_invendu, type_invendu, quantite)
            st.success(f"{quantite} portion(s) ajoutée(s) aux invendus pour le {date_invendu}.")
