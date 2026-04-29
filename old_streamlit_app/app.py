import streamlit as st
import os
import base64
from utils.auth import get_current_user, sign_in, sign_up, sign_out
from utils.db import set_ecole_profile, set_prestataire_profile

st.set_page_config(
    page_title="Cantine+ | Connexion",
    page_icon="🥗",
    layout="centered",
    initial_sidebar_state="collapsed"
)

# Design Global
st.markdown("""
<style>
    :root { 
        --primary-green: #328A4A; 
        --accent-orange: #F47B20; 
    }
    .stApp { background-color: var(--primary-green) !important; }
    
    /* Textes de base en blanc car le fond est vert foncé */
    h1, h2, h3, p, span, label, div { color: #FFFFFF !important; }
    
    /* Tous les boutons : fond orange, texte blanc */
    .stButton > button, div[data-testid="stFormSubmitButton"] > button, button[kind="primary"], button[kind="secondary"] {
        background-color: var(--accent-orange) !important; 
        color: #FFFFFF !important; 
        border: none !important;
        border-radius: 8px !important; 
        padding: 0.5rem 1rem !important;
        font-weight: bold !important; 
        transition: all 0.2s !important;
        width: 100% !important;
    }
    .stButton > button:hover, div[data-testid="stFormSubmitButton"] > button:hover, button[kind="primary"]:hover, button[kind="secondary"]:hover { 
        background-color: #1E6B35 !important; 
        color: #FFFFFF !important;
    }
    
    /* Menus déroulants (Selectboxes) : fond orange, texte blanc */
    .stSelectbox div[data-baseweb="select"] > div {
        background-color: var(--accent-orange) !important;
        color: #FFFFFF !important;
        border: none !important;
        border-radius: 6px !important;
    }
    /* Les textes dans les options du menu déroulant (popover) */
    ul[data-baseweb="menu"], div[data-baseweb="popover"] { background-color: var(--accent-orange) !important; }
    li[data-baseweb="menu-item"] { color: #FFFFFF !important; font-weight: 500 !important; }
    li[data-baseweb="menu-item"]:hover, li[data-baseweb="menu-item"][aria-selected="true"] { 
        background-color: #1E6B35 !important; 
        color: #FFFFFF !important; 
    }
    
    /* Autres champs de saisie (texte, date, nombre) : fond blanc, texte noir */
    .stTextInput input, .stDateInput input, .stNumberInput input {
        background-color: #FFFFFF !important;
        color: #1A1A1A !important;
        border: 1px solid #FFFFFF !important;
        border-radius: 6px !important;
        caret-color: #000000 !important;
    }
    .stTextInput input:focus, .stDateInput input:focus, .stNumberInput input:focus {
        border: 2px solid var(--accent-orange) !important;
        box-shadow: 0 0 0 1px var(--accent-orange) !important;
    }
    
    /* Formulaires (fond légèrement transparent) */
    [data-testid="stForm"] {
        background-color: rgba(255, 255, 255, 0.1) !important;
        border: 1px solid rgba(255, 255, 255, 0.3) !important;
        border-radius: 12px !important;
        padding: 2rem !important;
    }
    
    /* Onglets (Tabs) */
    [data-baseweb="tab"] {
        background-color: transparent !important;
        border: none !important;
        color: rgba(255, 255, 255, 0.7) !important;
        margin-right: 4px;
    }
    [aria-selected="true"] {
        background-color: transparent !important;
        color: #FFFFFF !important;
        border: none !important;
        border-bottom: 3px solid var(--accent-orange) !important;
    }
    [data-testid="stSidebar"] { display: none; }
</style>
""", unsafe_allow_html=True)

user = get_current_user()

if user:
    # L'utilisateur est connecté
    role = user.get("user_metadata", {}).get("role", "Parent")
    icone_path = os.path.join(os.path.dirname(__file__), "icone.png")
    texte_path = os.path.join(os.path.dirname(__file__), "texte.png")
    icone_b64 = ""
    texte_b64 = ""
    if os.path.exists(icone_path):
        with open(icone_path, "rb") as img_file:
            icone_b64 = base64.b64encode(img_file.read()).decode()
    if os.path.exists(texte_path):
        with open(texte_path, "rb") as img_file:
            texte_b64 = base64.b64encode(img_file.read()).decode()
            
    icone_tag = f'<img src="data:image/svg+xml;base64,{icone_b64}" width="200" style="display:block; margin: 0 auto; margin-bottom: -10px;" />' if icone_b64 else ''
    texte_tag = f'<img src="data:image/svg+xml;base64,{texte_b64}" width="500" style="display:block; margin: 0 auto; margin-bottom: 2rem;" />' if texte_b64 else ''

    st.markdown(f"<div style='text-align: center;'>{icone_tag}{texte_tag}</div>", unsafe_allow_html=True)
    st.write(f"Vous êtes connecté(e) en tant que : **{role}**")
    
    if st.button("Se déconnecter"):
        sign_out()
        st.rerun()

    st.divider()
    
    col1, col2, col3 = st.columns([1, 2, 1])
    with col2:
        if role == "Parent":
            st.page_link("pages/1_parent.py", label="➡️ Accéder à mon Espace Parent", use_container_width=True)
        elif role == "Ecole":
            st.page_link("pages/2_ecole.py", label="➡️ Accéder à mon Espace École", use_container_width=True)
        elif role == "Prestataire":
            st.page_link("pages/3_prestataire.py", label="➡️ Accéder à mon Espace Prestataire", use_container_width=True)

else:
    icone_path = os.path.join(os.path.dirname(__file__), "icone.png")
    texte_path = os.path.join(os.path.dirname(__file__), "texte.png")
    icone_b64 = ""
    texte_b64 = ""
    if os.path.exists(icone_path):
        with open(icone_path, "rb") as img_file:
            icone_b64 = base64.b64encode(img_file.read()).decode()
    if os.path.exists(texte_path):
        with open(texte_path, "rb") as img_file:
            texte_b64 = base64.b64encode(img_file.read()).decode()

    icone_tag = f'<img src="data:image/svg+xml;base64,{icone_b64}" width="250" style="display:block; margin: 0 auto; margin-bottom: -15px;" />' if icone_b64 else ''
    texte_tag = f'<img src="data:image/svg+xml;base64,{texte_b64}" width="600" style="display:block; margin: 0 auto;" />' if texte_b64 else ''

    st.markdown(f"""
    <div style="text-align: center; margin-bottom: 3rem; margin-top: 2rem;">
        {icone_tag}
        {texte_tag}
        <p style="color: rgba(255,255,255,0.8); font-size: 0.9rem; letter-spacing: 2px; margin-top: 15px;">
            MOINS DE GASPILLAGE, PLUS DE SENS.
        </p>
    </div>
    """, unsafe_allow_html=True)
    
    tab1, tab2 = st.tabs(["Connexion", "Créer un compte"])
    
    with tab1:
        with st.form("login_form"):
            email_in = st.text_input("Email")
            pass_in = st.text_input("Mot de passe", type="password")
            submit_in = st.form_submit_button("Se connecter")
            if submit_in:
                if sign_in(email_in, pass_in):
                    st.success("Connexion réussie !")
                    st.rerun()
                
    with tab2:
        with st.form("signup_form"):
            st.write("Créez votre espace personnalisé")
            role_up = st.selectbox("Je suis un(e) :", ["Parent", "Ecole", "Prestataire"])
            name_up = st.text_input("Nom / Prénom (ou Nom de la structure)")
            email_up = st.text_input("Email")
            pass_up = st.text_input("Mot de passe", type="password")
            
            submit_up = st.form_submit_button("S'inscrire")
            
            if submit_up:
                if sign_up(email_up, pass_up, role_up, name_up):
                    st.success("✅ Compte créé avec succès ! Veuillez vous connecter dans l'onglet Connexion.")
                else:
                    st.error("Erreur lors de la création du compte.")

    # Indication pour les tests
    st.divider()
    st.caption("Pour tester sans configurer Supabase, utilisez ces identifiants fictifs :")
    st.caption("- Parent : parent@test.com / n'importe quel mdp")
    st.caption("- Ecole : ecole@test.com / n'importe quel mdp")
    st.caption("- Prestataire : prestataire@test.com / n'importe quel mdp")
