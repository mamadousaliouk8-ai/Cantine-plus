import streamlit as st
import datetime
import pandas as pd
from utils.auth import get_current_user, sign_out
from utils.db import get_enfants, add_enfant, get_ecoles, get_menus_for_parent, add_reservation, get_invendus_for_parent
from utils.ai_coach import analyze_meal_image, generate_superhero_voice

st.set_page_config(page_title="Espace Parent | Cantine+", page_icon="👨‍👩‍👧", layout="wide", initial_sidebar_state="collapsed")

# Sécurité : Vérifier que l'utilisateur est connecté et qu'il est Parent
user = get_current_user()
if not user or user.get("user_metadata", {}).get("role") != "Parent":
    st.switch_page("app.py")
    st.stop()

parent_id = user["id"]
parent_name = user.get("user_metadata", {}).get("name", "Parent")

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
            <h2 style="font-size: 1.5rem; color: rgba(255,255,255,0.9); margin-top: 5px;">👨‍👩‍👧 Espace Parent - {parent_name}</h2>
        </div>
    """, unsafe_allow_html=True)
with col2:
    if st.button("🚪 Déconnexion", key="logout_parent"):
        sign_out()
        st.switch_page("app.py")

# Les 5 onglets (ajout de l'onglet Mes Enfants)
tab0, tab1, tab2, tab3, tab4 = st.tabs(["👦 Mes Enfants", "📅 Réservation", "🍽️ Menu", "🦸‍♂️ IA Coach", "♻️ Invendus"])

with tab0:
    st.header("Gérer mes enfants inscrits")
    st.write("Ajoutez vos enfants pour pouvoir réserver leurs repas. S'ils sont dans des écoles différentes, vous pouvez le spécifier ici.")
    
    ecoles = get_ecoles()
    enfants = get_enfants(parent_id)
    
    if enfants:
        st.subheader("Vos enfants")
        for e in enfants:
            st.markdown(f"**{e['prenom']} {e['nom']}** - Classe: {e['classe']} - École: *{e['ecoles']['nom']}*")
    else:
        st.info("Aucun enfant inscrit pour le moment.")
        
    st.divider()
    st.subheader("Inscrire un nouvel enfant")
    with st.form("ajout_enfant"):
        col_e1, col_e2 = st.columns(2)
        with col_e1:
            n_nom = st.text_input("Nom de famille")
            n_prenom = st.text_input("Prénom")
        with col_e2:
            n_classe = st.text_input("Classe (ex: Moyenne Section)")
            # Création du selectbox pour l'école
            ecole_options = {ec["nom"]: ec["id"] for ec in ecoles} if ecoles else {"Aucune école disponible": None}
            n_ecole_nom = st.selectbox("Établissement", list(ecole_options.keys()))
            
        submit_enf = st.form_submit_button("Ajouter l'enfant")
        if submit_enf:
            if n_nom and n_prenom and n_classe and ecole_options[n_ecole_nom] is not None:
                add_enfant(parent_id, ecole_options[n_ecole_nom], n_nom, n_prenom, n_classe)
                st.success(f"{n_prenom} a été ajouté avec succès !")
                st.rerun()
            else:
                st.error("Veuillez remplir tous les champs et sélectionner une école.")

with tab1:
    st.header("Réserver un repas")
    st.info("🌱 Pensez à réserver le plus tôt possible ! Cela évitera le surplus pour des coûts moins élevés qui pourront être redistribués dans d'autres domaines favorisant la scolarité des enfants, et pensez à l'environnement.")
    
    if not enfants:
        st.warning("Vous devez d'abord ajouter un enfant dans l'onglet 'Mes Enfants'.")
    else:
        with st.form("resa_form"):
            col1, col2 = st.columns(2)
            with col1:
                enfant_options = {f"{e['prenom']} {e['nom']} ({e['ecoles']['nom']})": e for e in enfants}
                choix_enfant = st.selectbox("Pour quel enfant ?", list(enfant_options.keys()))
                
                min_date = datetime.date.today() + datetime.timedelta(days=30)
                date_resa = st.date_input("Date du repas (1 mois à l'avance requis)", min_value=min_date)
            
            with col2:
                type_repas = st.selectbox("Régime alimentaire", ["Viande", "Sans viande (Végétarien)"])
                st.caption("Si le prestataire de l'école propose du Bio, il sera automatiquement inclus.")
                
            submit_resa = st.form_submit_button("Confirmer la réservation")
            if submit_resa:
                enf = enfant_options[choix_enfant]
                add_reservation(enf["id"], enf["ecole_id"], date_resa, type_repas)
                st.success(f"Réservation confirmée pour {enf['prenom']} le {date_resa} ({type_repas}) !")

with tab2:
    st.header("Menus prévus")
    menus = get_menus_for_parent()
    if menus:
        df_menus = pd.DataFrame(menus)
        st.dataframe(df_menus, use_container_width=True, hide_index=True)
    else:
        st.write("Aucun menu n'a encore été publié.")

with tab3:
    st.header("🦸‍♂️ IA Coach Alimentaire")
    st.write("Prenez en photo le plateau de votre enfant pour qu'un Superhéros l'encourage à manger !")
    
    uploaded_file = st.file_uploader("Ajouter une photo du plateau", type=["jpg", "jpeg", "png"])
    if uploaded_file is not None:
        st.image(uploaded_file, caption="Le beau plateau !", width=400)
        
        if st.button("Demander l'analyse du Superhéros"):
            with st.spinner("Le Superhéros analyse le plateau..."):
                texte_encouragement = analyze_meal_image(uploaded_file)
                st.success("Analyse terminée !")
                st.write(f"**Le Superhéros dit :** \n\n*\"{texte_encouragement}\"*")
                
                audio_file = generate_superhero_voice(texte_encouragement)
                if audio_file:
                    st.audio(audio_file, format="audio/mp3")
                else:
                    st.warning("Génération audio non configurée (API manquante).")

with tab4:
    st.header("♻️ Repas Invendus")
    st.write("Retrouvez ici les repas non consommés du jour mis à disposition par les écoles.")
    
    invendus = get_invendus_for_parent()
    if invendus:
        for inv in invendus:
            st.markdown(f"""
            <div style='background-color: white; padding: 1rem; border-radius: 8px; margin-bottom: 0.5rem; border-left: 5px solid #F47B20;'>
                <strong>École:</strong> {inv['ecoles']['nom']} <br>
                <strong>Date:</strong> {inv['date']} <br>
                <strong>Type:</strong> {inv['type']} <br>
                <strong>Quantité disponible:</strong> {inv['quantite']} portion(s)
            </div>
            """, unsafe_allow_html=True)
    else:
        st.info("Aucun invendu n'a été déclaré pour le moment.")
