import streamlit as st
import pandas as pd
import datetime
from utils.auth import get_current_user, sign_out
from utils.db import get_prestataire_by_user, set_prestataire_profile, add_menu, get_menus_by_prestataire, get_reservations_for_prestataire, supabase

st.set_page_config(page_title="Espace Prestataire | Cantine+", page_icon="👨‍🍳", layout="wide", initial_sidebar_state="collapsed")

user = get_current_user()
if not user or user.get("user_metadata", {}).get("role") != "Prestataire":
    st.switch_page("app.py")
    st.stop()

presta_user_id = user["id"]
presta_profile = get_prestataire_by_user(presta_user_id)

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

if not presta_profile:
    st.info("👋 Bienvenue ! Configurez votre profil Prestataire pour commencer.")
    with st.form("setup_presta_form"):
        nom_presta = st.text_input("Nom de votre structure / société")
        if st.form_submit_button("✅ Créer mon profil"):
            if nom_presta:
                set_prestataire_profile(presta_user_id, nom_presta)
                st.success("Profil créé ! Rechargement en cours...")
                st.rerun()
            else:
                st.error("Veuillez indiquer le nom de votre structure.")
    st.stop()

presta_id = presta_profile["id"]
nom_affichage = presta_profile["nom"]

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
            <h2 style="font-size: 1.5rem; color: rgba(255,255,255,0.9); margin-top: 5px;">👨‍🍳 Espace Prestataire - {nom_affichage}</h2>
        </div>
    """, unsafe_allow_html=True)
with col2:
    if st.button("🚪 Déconnexion", key="logout_presta"):
        sign_out()
        st.switch_page("app.py")

if not presta_profile:
    st.warning("Profil non configuré. Mode mock activé.")
    presta_id = "mock_presta_id"
else:
    presta_id = presta_profile["id"]

tab1, tab2 = st.tabs(["🍽️ Mes Menus", "📦 Commandes des Écoles"])

with tab1:
    st.header("📥 Importer les menus via Excel")
    st.write("Téléchargez le modèle, remplissez-le avec vos menus, puis importez-le.")

    # --- Génération du modèle Excel à télécharger ---
    import io
    template_data = {
        "Date (JJ/MM/AAAA)": ["26/04/2026", "27/04/2026"],
        "Type": ["Viande", "Sans viande"],
        "Entrée": ["Salade de carottes", "Soupe de légumes"],
        "Plat principal": ["Poulet rôti, haricots verts", "Gratin de courgettes"],
        "Dessert": ["Yaourt nature", "Compote pomme"],
        "Bio (Oui/Non)": ["Non", "Oui"]
    }
    df_template = pd.DataFrame(template_data)
    excel_buffer = io.BytesIO()
    df_template.to_excel(excel_buffer, index=False, engine="openpyxl")
    excel_buffer.seek(0)
    
    st.download_button(
        label="📄 Télécharger le modèle Excel",
        data=excel_buffer,
        file_name="modele_menus_cantine.xlsx",
        mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )

    st.divider()
    
    # --- Import du fichier Excel ---
    uploaded_file = st.file_uploader("📂 Importer votre fichier Excel complété", type=["xlsx", "xls", "csv"])
    
    if uploaded_file:
        try:
            if uploaded_file.name.endswith(".csv"):
                df_import = pd.read_csv(uploaded_file)
            else:
                df_import = pd.read_excel(uploaded_file, engine="openpyxl")
            
            st.write("**Aperçu de votre fichier :**")
            st.dataframe(df_import, use_container_width=True, hide_index=True)
            
            if st.button("✅ Confirmer l'import de ces menus"):
                erreurs = 0
                succes = 0
                for _, row in df_import.iterrows():
                    try:
                        # Conversion de la date
                        date_str = str(row.get("Date (JJ/MM/AAAA)", "")).strip()
                        try:
                            date_obj = pd.to_datetime(date_str, dayfirst=True).date()
                        except:
                            date_obj = pd.to_datetime(date_str).date()
                        
                        type_repas = str(row.get("Type", "Viande")).strip()
                        entree    = str(row.get("Entrée", "")).strip()
                        plat      = str(row.get("Plat principal", "")).strip()
                        dessert   = str(row.get("Dessert", "")).strip()
                        bio_val   = str(row.get("Bio (Oui/Non)", "Non")).strip().lower() in ["oui", "yes", "true", "1"]
                        
                        if plat:
                            data = {
                                "prestataire_id": presta_id,
                                "date": str(date_obj),
                                "type": type_repas,
                                "entree": entree,
                                "plat": plat,
                                "dessert": dessert,
                                "bio": bio_val
                            }
                            supabase.table("menus").insert(data).execute()
                            succes += 1
                    except Exception as e:
                        erreurs += 1
                
                if succes > 0:
                    st.success(f"✅ {succes} menu(s) importé(s) avec succès !")
                if erreurs > 0:
                    st.warning(f"⚠️ {erreurs} ligne(s) ignorée(s) (format invalide).")
                st.rerun()
        except Exception as e:
            st.error(f"Erreur lors de la lecture du fichier : {e}")
    
    st.divider()
    st.subheader("📋 Vos menus publiés")
    menus = get_menus_by_prestataire(presta_id)
    if menus:
        df_menus = pd.DataFrame(menus)
        # Afficher uniquement les colonnes pertinentes si elles existent
        cols_display = [c for c in ["date", "type", "entree", "plat", "dessert", "bio"] if c in df_menus.columns]
        st.dataframe(df_menus[cols_display], use_container_width=True, hide_index=True)
    else:
        st.info("Aucun menu actuellement. Importez votre premier fichier Excel !")


with tab2:
    st.header("Commandes et Réservations (Prévisionnel)")
    st.write("Retrouvez ici le nombre de plateaux à préparer en fonction des réservations des écoles qui vous sont rattachées.")
    
    reservations = get_reservations_for_prestataire(presta_id)
    if reservations:
        # Formatage
        data_res = []
        for r in reservations:
            data_res.append({
                "Date": r["date"],
                "École": r["ecoles"]["nom"],
                "Type": r["type"]
            })
            
        df_res = pd.DataFrame(data_res)
        summary = df_res.groupby(['Date', 'École', 'Type']).size().reset_index(name='Plateaux à préparer')
        st.dataframe(summary, hide_index=True, use_container_width=True)
    else:
        st.info("Aucune commande ou réservation pour vos écoles pour le moment.")
