import os
import google.genai as genai
from google.genai import types
import io
import base64
import json
import re
import edge_tts
from dotenv import load_dotenv
from elevenlabs.client import ElevenLabs

load_dotenv()

VISION_API_KEY = os.environ.get("VISION_API_KEY")
ELEVENLABS_API_KEY = os.environ.get("ELEVENLABS_API_KEY")

# Initialisation du client google.genai
client_genai = None
if VISION_API_KEY and "your_" not in VISION_API_KEY:
    client_genai = genai.Client(api_key=VISION_API_KEY)

# Initialisation ElevenLabs si clé présente
client_eleven = None
if ELEVENLABS_API_KEY and "your_" not in ELEVENLABS_API_KEY:
    client_eleven = ElevenLabs(api_key=ELEVENLABS_API_KEY)


def analyze_meal_image(image_bytes, character_name="un Superhéros", age=None):
    """
    Analyse une image de plateau repas avec l'IA Gemini.
    """
    if not client_genai:
        return (
            f"Wow ! Ce plateau est super génial ! En tant que {character_name}, je te dis que "
            "ces légumes te donneront une force incroyable pour sauver le monde ! "
            "En mangeant tout, tu deviens un vrai champion de la planète. Vas-y !"
        )

    age_instruction = (
        f"\nL'enfant qui écoute ce message a {age} ans. Ton vocabulaire, la complexité de tes phrases, "
        f"ton ton et tes références doivent être STRICTEMENT adaptés au niveau de compréhension d'un enfant de cet âge."
        if age else ""
    )

    try:
        prompt = f"""Tu es {character_name} (un personnage célèbre apprécié des enfants). Analyse cette photo de plateau repas de cantine.{age_instruction}
Produis un discours totalement UNIQUE, TRÈS VARIÉ et CRÉATIF à chaque fois. Ne réutilise JAMAIS la même structure de phrase d'une fois sur l'autre. Invente de nouvelles expressions, des interjections différentes, et des angles originaux pour présenter le repas.

Tu dois formuler une phrase courte résumant le plateau avec des mots différents à chaque génération.

Bénéfices:
2 à 4 bénéfices simples, mais expliqués de façon imagée, drôle ou surprenante (varie les synonymes pour \"énergie\", \"grandir\", \"force\").

Style vocal:
Description brève du style vocal recommandé.

Script TTS:
Texte final à lire de 35 à 90 mots. TRES IMPORTANT: Ce script doit être EXTRÊMEMENT différent à chaque exécution. Change le vocabulaire, la façon de dire bonjour, la façon de motiver l'enfant. Sois imprévisible, vivant et parfaitement dans le personnage.

Notes de sécurité:
Inclure des garde-fous utiles.

Confiance:
Nombre entre 0 et 1.

Politique de sécurité et de qualité:
Évite les formulations culpabilisantes, médicales ou fausses. Reste positif et bienveillant.

Si la photo est mauvaise:
Reste général et invente une situation amusante pour expliquer que tu ne vois pas bien ("Mes super-lunettes sont embuées !").

Exemples de formulations à utiliser (MÉLANGE-LES ET INVENTES-EN DE NOUVELLES):
"wow", "incroyable", "mission secrète", "carburant magique", "potion de croissance", "explosion de saveurs", "waouh", "super-pouvoirs".
ÉVITE à tout prix de répéter "fais le plein d'énergie", "ton repas est prêt", ou "pour la mission" à chaque fois. Sois créatif !

Cas particuliers:
Adapte tes réactions (ex: surprise, enthousiasme débordant, mystère) en fonction des aliments pour ne jamais paraître robotique.

La priorité absolue n'est pas la précision nutritionnelle parfaite, mais la motivation positive, la compréhension immédiate et la fluidité audio.

Sortie attendue:
Tu ne renvoies que le JSON final. Aucune explication supplémentaire. Aucun commentaire technique. Aucun markdown. Aucun texte hors JSON.

Exemple de sortie attendue:
{{
  "detected_foods": ["poulet", "riz", "carottes"],
  "food_summary": "Plateau de cantine avec une protéine, un accompagnement et des légumes.",
  "benefits": ["donne de l'énergie pour jouer", "aide à grandir"],
  "voice_style": "voix de héros bienveillant",
  "tts_script": "Capitaine, ton repas est prêt pour la mission. Avec le poulet, le riz et les carottes, tu fais le plein d'énergie...",
  "safety_notes": ["éviter toute culpabilisation"],
  "confidence": 0.88
}}
"""
        contents = types.Content(
            role="user",
            parts=[
                types.Part.from_text(text=prompt),
                types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg")
            ]
        )
        
        response = client_genai.models.generate_content(
            model='gemini-flash-latest',
            contents=contents
        )
        text_response = response.text
        if not text_response:
            return "Continue ta mission, champion ! Ton repas va t'aider à grandir et à avoir plein de force !"
            
        # Tenter de parser le JSON
        match = re.search(r'\{.*\}', text_response, re.DOTALL)
        if match:
            text_response = match.group(0)

        try:
            data = json.loads(text_response)
            return data.get("tts_script", "Continue ta mission, champion ! Ton repas va t'aider à grandir et à avoir plein de force !")
        except json.JSONDecodeError:
            return text_response

    except Exception as e:
        return f"Problème technique de {character_name} : {str(e)}"


def analyze_meal_debrief(menu_description, character_name="un Superhéros", child_name="", age=None):
    """
    Génère un message d'IA pour débriefer le repas de midi sans photo, basé sur le menu.
    """
    if not client_genai:
        return (
            f"Salut {child_name} ! En tant que {character_name}, j'ai vu que tu as eu un super menu "
            f"aujourd'hui : {menu_description}. J'espère que tu as tout mangé pour être en pleine forme comme moi !"
        )

    try:
        age_instruction = f"L'enfant a {age} ans." if age else ""
        prompt = f"""Tu es {character_name}. Parle directement à {child_name} ({age_instruction}).
Il/Elle a mangé ce menu à la cantine aujourd'hui : {menu_description}.
Félicite-le/la pour ses choix, explique-lui pourquoi c'est bon pour sa croissance d'avoir mangé ces aliments spécifiques.
Pose-lui une question encourageante à la fin.
Sois TRÈS court (40-60 mots maximum), énergique et reste parfaitement dans ton personnage.
"""
        response = client_genai.models.generate_content(
            model='gemini-2.0-flash',
            contents=prompt
        )
        return response.text
    except Exception as e:
        return f"Erreur de communication avec {character_name} : {str(e)}"


def generate_culinary_quiz(menu_description, character_name="un Superhéros", child_name="", age=None):
    """
    Génère un texte de présentation héroïque ET un quiz de 3 questions basés sur le menu.
    """
    if not client_genai:
        return {
            "presentation": f"Salut {child_name} ! Ici {character_name}. Demain, un super menu t'attend : {menu_description}. J'ai hâte que tu découvres ces saveurs pour devenir un vrai champion !",
            "quiz": [
                {
                    "question": "Quel est l'élément le plus important du repas ?",
                    "options": ["S'amuser et bien manger", "Manger des bonbons", "Ne rien manger"],
                    "answer": 0,
                    "explanation": "Exactement ! Bien manger te donne toute la force nécessaire !"
                }
            ]
        }

    try:
        prompt = f"""Tu es {character_name}. Prépare une mission culinaire pour {child_name} ({age if age else 'enfant'}).
Le menu futur est : {menu_description}.

1. Écris un discours d'introduction IMMERSIF (100 mots max) où tu incarnes TOTALEMENT {character_name}. 
   - INTERDICTION STRICTE : Ne commence jamais par "Demain, un super menu t'attend" ou toute phrase générique similaire. 
   - COMMENCE DIRECTEMENT dans l'action ou l'univers du personnage.
   - Ne te contente pas de lister les aliments, raconte une mini-aventure liée au menu : {menu_description}. 
   - Pour chaque aliment, invente un bénéfice héroïque ou magique (ex: "Le saumon te donne une mémoire d'éléphant pour tes devoirs !", "Les brocolis sont des petits arbres de force brute !"). 
   - Utilise ton langage de personnage (ex: "Nom d'un petit bonhomme !" pour un héros, "C'est givré !" pour Elsa). 
   - Ce texte sera lu en audio et DOIT contenir les indices nécessaires pour répondre au quiz.

2. Génère un QUIZ de 3 questions simples et amusantes basées sur ton histoire.

Format de sortie attendu (JSON uniquement) :
{{
  "presentation": "Salut [Prénom] ! Ici [Ton Nom] ! Prêt pour une mission givrée ? Demain, on va manger [Menu] car ça va nous donner [Bénéfices]...",
  "quiz": [
    {{
      "question": "D'après moi, pourquoi est-ce super de manger le plat de demain ?",
      "options": ["Pour courir plus vite", "Pour avoir des oreilles de lapin", "Pour devenir invisible"],
      "answer": 0,
      "explanation": "Exactement ! C'est le secret de ma super-vitesse !"
    }}
  ]
}}
"""
        response = client_genai.models.generate_content(
            model='gemini-flash-latest',
            contents=prompt
        )
        text = response.text
        if not text:
            raise ValueError("L'IA a renvoyé une réponse vide.")
            
        # Nettoyage plus robuste du JSON
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
            json_str = match.group(0)
            try:
                return json.loads(json_str)
            except json.JSONDecodeError:
                # Si le premier match échoue, on tente de nettoyer les balises markdown
                json_str = json_str.replace("```json", "").replace("```", "").strip()
                return json.loads(json_str)
        
        return json.loads(text)
    except Exception as e:
        print(f"Erreur Quiz IA (Gemini): {e}")
        # Fallback dynamique et moins robotique
        return {
            "presentation": f"Salut {child_name} ! Ici {character_name}. Demain, prépare-toi pour une mission gourmande avec ce menu : {menu_description}. J'ai déjà hâte d'y être, pas toi ?",
            "quiz": [
                {
                    "question": f"D'après {character_name}, pourquoi est-ce génial de manger à la cantine ?",
                    "options": ["Pour devenir super fort", "Pour dormir", "Pour s'ennuyer"],
                    "answer": 0,
                    "explanation": "C'est ça ! Chaque repas est une étape de plus pour ta croissance !"
                }
            ]
        }


async def generate_superhero_voice(text, voice_id=None):
    """
    Génère un fichier audio en base64 via edge-tts (voix neuronales gratuites).
    """
    voice = voice_id if voice_id and voice_id != "default" else "fr-FR-RemyMultilingualNeural"
    try:
        communicate = edge_tts.Communicate(text, voice)
        audio_data = b""
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_data += chunk["data"]

        audio_b64 = base64.b64encode(audio_data).decode()
        return audio_b64
    except Exception as e:
        err_msg = f"DEBUG: Erreur Audio (edge-tts) pour text='{text[:20]}...' voice='{voice}': {e}"
        print(err_msg)
        with open("coach_error.log", "a") as f:
            f.write(err_msg + "\n")
        return None
