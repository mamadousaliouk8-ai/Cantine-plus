import os
import google.genai as genai
from dotenv import load_dotenv

load_dotenv()
VISION_API_KEY = os.environ.get("VISION_API_KEY")

# Initialisation du client google.genai
client_genai = None
if VISION_API_KEY and "your_" not in VISION_API_KEY:
    client_genai = genai.Client(api_key=VISION_API_KEY)

def analyze_waste_image(image_bytes):
    if not client_genai:
        return "Analyse simulée : J'observe une grande quantité de pain et d'épinards jetés aujourd'hui. Suggestion : Réduire légèrement les portions de pain demain et proposer les épinards sous forme de gratin pour une meilleure acceptation par les enfants."

    try:
        prompt = """Tu es un expert en réduction du gaspillage alimentaire en milieu scolaire. 
Analyse cette photo de poubelle/déchets de cantine. 
1. Identifie la nature des déchets majoritaires.
2. Propose 2 actions correctives concrètes et bienveillantes pour le chef cuisinier pour le menu de demain (ex: changer la présentation, gratiner, réduire la portion initiale avec possibilité de se resservir).
Reste court, professionnel et très encourageant (3-4 phrases maximum)."""
        response = client_genai.models.generate_content(
            model='gemini-2.0-flash',
            contents=[
                {'mime_type': 'image/jpeg', 'data': image_bytes},
                prompt
            ]
        )
        return response.text
    except Exception as e:
        return f"Erreur d'analyse IA : {str(e)}"

def analyze_menu_optimization(entree, plat, dessert):
    if not client_genai:
        if "choux" in plat.lower() or "brocoli" in plat.lower():
            return f"💡 Conseil IA : Les légumes comme le {plat} présentent un risque de gaspillage de 30% chez les enfants. Pensez à les proposer sous forme de gratin ou avec une sauce douce pour une meilleure acceptation !"
        return f"💡 Conseil IA : Menu équilibré ({entree}, {plat}, {dessert}). Pensez à adapter les portions des plus petits pour éviter le gaspillage !"

    try:
        prompt = f"""Tu es un expert en restauration collective scolaire. 
Voici un menu prévu : Entrée: {entree}, Plat: {plat}, Dessert: {dessert}.
Donne un seul conseil très court (2 phrases max) au chef cuisinier pour optimiser ce plat afin d'éviter le gaspillage ou de le rendre plus attractif pour des enfants (sans dénaturer la recette de base). Commence par '💡 Conseil IA : '."""
        response = client_genai.models.generate_content(
            model='gemini-2.0-flash',
            contents=prompt
        )
        return response.text
    except Exception as e:
        return f"Erreur d'analyse IA : {str(e)}"

def analyze_qualitative_waste(date, kg, satisfaction, menu_standard, menu_vege):
    if not client_genai:
        return f"💡 Conseil IA (Simulé) : Avec {kg}kg de restes et une satisfaction '{satisfaction}', il semble que certains éléments du menu n'aient pas convaincu. Essayez de retravailler la présentation la prochaine fois !"

    try:
        prompt = f"""Tu es un expert en lutte contre le gaspillage alimentaire scolaire et en psychologie de l'enfant.
Analyse ces données de cantine pour la date du {date} :
- Poids des déchets : {kg} kg
- Satisfaction moyenne des enfants : {satisfaction}
- Menu Standard servi : {menu_standard}
- Menu Végétarien servi : {menu_vege}

Donne un conseil stratégique et bienveillant (3 phrases maximum) pour le chef cuisinier. 
Si le gaspillage est élevé, propose une variante ludique ou une astuce de présentation pour les ingrédients boudés. 
Si la satisfaction est basse malgré peu de déchets, analyse pourquoi.
Commence ton message par '💡 Analyse Qualitative IA : '."""

        response = client_genai.models.generate_content(
            model='gemini-2.0-flash',
            contents=prompt
        )
        return response.text
    except Exception as e:
        return f"Erreur d'analyse IA : {str(e)}"
