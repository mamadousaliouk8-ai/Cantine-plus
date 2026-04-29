import os
from dotenv import load_dotenv
from supabase import create_client, Client
import datetime

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

supabase: Client = None
if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception as e:
        print(f"Erreur d'initialisation de Supabase : {e}")

# --- MOCKS (utilisés si Supabase n'est pas configuré) ---
MOCK_ECOLES = [
    {"id": 1, "nom": "École Maternelle Les Petits Princes", "prestataire_id": "mock_presta_id"},
    {"id": 2, "nom": "École Maternelle Le Petit Poucet", "prestataire_id": "mock_presta_id"}
]
MOCK_ENFANTS = []
MOCK_MENUS = [
    {"id": 1, "prestataire_id": "mock_presta_id", "date": str(datetime.date.today() + datetime.timedelta(days=1)), "type": "Viande", "plat": "Poulet rôti, Haricots", "bio": False},
]
MOCK_RESERVATIONS = []
MOCK_INVENDUS = []

# --- FONCTIONS PARENT ---
def get_ecoles():
    if supabase:
        res = supabase.table("ecoles").select("*").execute()
        return res.data
    return MOCK_ECOLES

def get_enfants(parent_id):
    if supabase:
        res = supabase.table("enfants").select("*, ecoles(nom)").eq("parent_id", parent_id).execute()
        return res.data
    # Mock
    enfants = [e for e in MOCK_ENFANTS if e["parent_id"] == parent_id]
    for e in enfants:
        ecole = next((ec for ec in MOCK_ECOLES if ec["id"] == e["ecole_id"]), None)
        e["ecoles"] = {"nom": ecole["nom"]} if ecole else {"nom": "Inconnue"}
    return enfants

def add_enfant(parent_id, ecole_id, nom, prenom, classe):
    if supabase:
        data = {"parent_id": parent_id, "ecole_id": ecole_id, "nom": nom, "prenom": prenom, "classe": classe}
        supabase.table("enfants").insert(data).execute()
        return True
    MOCK_ENFANTS.append({"id": len(MOCK_ENFANTS)+1, "parent_id": parent_id, "ecole_id": ecole_id, "nom": nom, "prenom": prenom, "classe": classe})
    return True

def get_menus_for_parent():
    if supabase:
        res = supabase.table("menus").select("*").execute()
        return res.data
    return MOCK_MENUS

def add_reservation(enfant_id, ecole_id, date, type_repas):
    if supabase:
        data = {"enfant_id": enfant_id, "ecole_id": ecole_id, "date": str(date), "type": type_repas, "status": "Confirmée"}
        supabase.table("reservations").insert(data).execute()
        return True
    MOCK_RESERVATIONS.append({"id": len(MOCK_RESERVATIONS)+1, "enfant_id": enfant_id, "ecole_id": ecole_id, "date": str(date), "type": type_repas, "status": "Confirmée"})
    return True

def get_invendus_for_parent():
    if supabase:
        res = supabase.table("invendus").select("*, ecoles(nom)").execute()
        return res.data
    # Mock
    invendus = list(MOCK_INVENDUS)
    for i in invendus:
        ecole = next((ec for ec in MOCK_ECOLES if ec["id"] == i["ecole_id"]), None)
        i["ecoles"] = {"nom": ecole["nom"]} if ecole else {"nom": "Inconnue"}
    return invendus

# --- FONCTIONS ECOLE ---
def get_ecole_by_user(user_id):
    if supabase:
        res = supabase.table("ecoles").select("*").eq("user_id", user_id).execute()
        if res.data:
            return res.data[0]
        return None
    # Mock
    if user_id == "mock_ecole_id":
        return MOCK_ECOLES[0]
    return None

def set_ecole_profile(user_id, nom, prestataire_id):
    if supabase:
        data = {"user_id": user_id, "nom": nom, "prestataire_id": prestataire_id}
        supabase.table("ecoles").insert(data).execute()
        return True
    return True

def get_reservations_for_ecole(ecole_id):
    if supabase:
        res = supabase.table("reservations").select("*, enfants(nom, prenom, classe)").eq("ecole_id", ecole_id).execute()
        return res.data
    # Mock
    res = [r for r in MOCK_RESERVATIONS if r["ecole_id"] == ecole_id]
    for r in res:
        enfant = next((e for e in MOCK_ENFANTS if e["id"] == r["enfant_id"]), None)
        r["enfants"] = {"nom": enfant["nom"], "prenom": enfant["prenom"], "classe": enfant["classe"]} if enfant else {}
    return res

def add_invendu(ecole_id, date, type_repas, quantite):
    if supabase:
        data = {"ecole_id": ecole_id, "date": str(date), "type": type_repas, "quantite": quantite}
        supabase.table("invendus").insert(data).execute()
        return True
    MOCK_INVENDUS.append({"id": len(MOCK_INVENDUS)+1, "ecole_id": ecole_id, "date": str(date), "type": type_repas, "quantite": quantite})
    return True

# --- FONCTIONS PRESTATAIRE ---
def get_prestataire_by_user(user_id):
    if supabase:
        res = supabase.table("prestataires").select("*").eq("user_id", user_id).execute()
        if res.data:
            return res.data[0]
        return None
    # Mock
    if user_id == "mock_presta_id":
        return {"id": "mock_presta_id", "nom": "Cuisine Centrale Bio"}
    return None

def set_prestataire_profile(user_id, nom):
    if supabase:
        data = {"user_id": user_id, "nom": nom}
        supabase.table("prestataires").insert(data).execute()
        return True
    return True

def add_menu(prestataire_id, date, type_repas, plat, bio):
    if supabase:
        data = {"prestataire_id": prestataire_id, "date": str(date), "type": type_repas, "plat": plat, "bio": bio}
        supabase.table("menus").insert(data).execute()
        return True
    MOCK_MENUS.append({"id": len(MOCK_MENUS)+1, "prestataire_id": prestataire_id, "date": str(date), "type": type_repas, "plat": plat, "bio": bio})
    return True

def get_menus_by_prestataire(prestataire_id):
    if supabase:
        res = supabase.table("menus").select("*").eq("prestataire_id", prestataire_id).execute()
        return res.data
    return [m for m in MOCK_MENUS if m["prestataire_id"] == prestataire_id]

def get_reservations_for_prestataire(prestataire_id):
    if supabase:
        # Trouve les ecoles du presta, puis les résas de ces écoles
        ecoles = supabase.table("ecoles").select("id, nom").eq("prestataire_id", prestataire_id).execute()
        ecole_ids = [e["id"] for e in ecoles.data]
        if not ecole_ids:
            return []
        res = supabase.table("reservations").select("*, ecoles(nom)").in_("ecole_id", ecole_ids).execute()
        return res.data
    
    # Mock
    ecoles = [e for e in MOCK_ECOLES if e["prestataire_id"] == prestataire_id]
    ecole_ids = [e["id"] for e in ecoles]
    res = [r for r in MOCK_RESERVATIONS if r["ecole_id"] in ecole_ids]
    for r in res:
        ecole = next((ec for ec in ecoles if ec["id"] == r["ecole_id"]), None)
        r["ecoles"] = {"nom": ecole["nom"]} if ecole else {"nom": "Inconnue"}
    return res
