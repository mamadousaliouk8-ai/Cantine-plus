import os
import google.generativeai as genai
from gtts import gTTS
import io
import base64
from dotenv import load_dotenv
from elevenlabs.client import ElevenLabs

load_dotenv()

VISION_API_KEY = os.environ.get("VISION_API_KEY")
ELEVENLABS_API_KEY = os.environ.get("ELEVENLABS_API_KEY")

if VISION_API_KEY and "your_" not in VISION_API_KEY:
    genai.configure(api_key=VISION_API_KEY)

# Initialisation ElevenLabs si clé présente
client_eleven = None
if ELEVENLABS_API_KEY and "your_" not in ELEVENLABS_API_KEY:
    client_eleven = ElevenLabs(api_key=ELEVENLABS_API_KEY)

import json
import re

def analyze_meal_image(image_bytes, character_name="un Superhéros", age=None):
    """
    Analyse une image de plateau repas avec l'IA Gemini.
    """
    if not VISION_API_KEY or "your_" in VISION_API_KEY:
        return (
            f"Wow ! Ce plateau est super génial ! En tant que {character_name}, je te dis que "
            "ces légumes te donneront une force incroyable pour sauver le monde ! "
            "En mangeant tout, tu deviens un vrai champion de la planète. Vas-y !"
        )
    
    age_instruction = f"\nL'enfant qui écoute ce message a {age} ans. Ton vocabulaire, la complexité de tes phrases, ton ton et tes références doivent être STRICTEMENT adaptés au niveau de compréhension d'un enfant de cet âge." if age else ""

    try:
        model = genai.GenerativeModel('gemini-2.5-flash')
        prompt = f"""Tu es {character_name} (un personnage célèbre apprécié des enfants). Analyse cette photo de plateau repas de cantine.{age_instruction}
Produis un discours totalement UNIQUE, TRÈS VARIÉ et CRÉATIF à chaque fois. Ne réutilise JAMAIS la même structure de phrase d'une fois sur l'autre. Invente de nouvelles expressions, des interjections différentes, et des angles originaux pour présenter le repas.

Tu dois formuler une phrase courte résumant le plateau avec des mots différents à chaque génération.

Bénéfices:
2 à 4 bénéfices simples, mais expliqués de façon imagée, drôle ou surprenante (varie les synonymes pour "énergie", "grandir", "force").

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
        
        contents = [
            prompt,
            {"mime_type": "image/jpeg", "data": image_bytes}
        ]
        
        response = model.generate_content(contents)
        text_response = response.text
        
        # Tenter de parser le JSON
        match = re.search(r'\{.*\}', text_response, re.DOTALL)
        if match:
            text_response = match.group(0)
            
        try:
            data = json.loads(text_response)
            return data.get("tts_script", "Continue ta mission, champion ! Ton repas va t'aider à grandir et à avoir plein de force !")
        except json.JSONDecodeError:
            # S'il y a un problème de parsing, on renvoie directement le texte (en espérant qu'il soit bien formaté quand même)
            return text_response

    except Exception as e:
        return f"Problème technique de {character_name} : {str(e)}"

def analyze_meal_debrief(menu_description, character_name="un Superhéros", child_name="", age=None):
    """
    Génère un message d'IA pour débriefer le repas de midi sans photo, basé sur le menu.
    """
    if not VISION_API_KEY or "your_" in VISION_API_KEY:
        return f"Salut {child_name} ! En tant que {character_name}, j'ai vu que tu as eu un super menu aujourd'hui : {menu_description}. J'espère que tu as tout mangé pour être en pleine forme comme moi !"

    try:
        age_instruction = f"L'enfant a {age} ans." if age else ""
        model = genai.GenerativeModel('gemini-flash-latest')
        prompt = f"""Tu es {character_name}. Parle directement à {child_name} ({age_instruction}). 
Il/Elle a mangé ce menu à la cantine aujourd'hui : {menu_description}.
Félicite-le/la pour ses choix, explique-lui pourquoi c'est bon pour sa croissance d'avoir mangé ces aliments spécifiques. 
Pose-lui une question encourageante à la fin.
Sois TRÈS court (40-60 mots maximum), énergique et reste parfaitement dans ton personnage.
"""
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        return f"Erreur de communication avec {character_name} : {str(e)}"

import edge_tts

def generate_culinary_quiz(menu_description, character_name="un Superhéros", child_name="", age=None):
    """
    Génère un texte de présentation héroïque ET un quiz de 3 questions basés sur le menu.
    """
    if not VISION_API_KEY or "your_" in VISION_API_KEY:
        # Version simulée si pas de clé
        return {
            "presentation": f"Salut {child_name} ! Ici {character_name}. Demain, tu vas manger : {menu_description}. Sais-tu que les légumes donnent des super-pouvoirs ?",
            "quiz": [
                {
                    "question": "Quel aliment du menu donne de la force ?",
                    "options": ["Le dessert sucré", "Les légumes verts", "Le pain"],
                    "answer": 1,
                    "explanation": "Les légumes verts sont pleins de fer et de vitamines !"
                }
            ]
        }

    try:
        model = genai.GenerativeModel('gemini-flash-latest')
        prompt = f"""Tu es {character_name}. Prépare une mission culinaire pour {child_name} ({age if age else 'enfant'}).
Le menu futur est : {menu_description}.

1. Écris un discours d'introduction (60 mots max) où tu présentes le menu avec enthousiasme et tu donnes des indices sur les bienfaits (vitamines, énergie, croissance). Ce texte sera lu en audio.
2. Génère un QUIZ de 3 questions simples à choix multiples (3 options par question) basé sur ce menu et les bienfaits mentionnés.

Format de sortie attendu (JSON uniquement) :
{{
  "presentation": "Texte du héros...",
  "quiz": [
    {{
      "question": "La question...",
      "options": ["Option A", "Option B", "Option C"],
      "answer": 0,
      "explanation": "Pourquoi c'est la bonne réponse..."
    }}
  ]
}}
"""
        response = model.generate_content(prompt)
        # Nettoyage du JSON
        text = response.text
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
            return json.loads(match.group(0))
        return json.loads(text)
    except Exception as e:
        print(f"Erreur Quiz IA: {e}")
        return None

async def generate_superhero_voice(text, voice_id=None):
    """
    Génère un fichier audio en base64 via edge-tts (voix neuronales gratuites).
    """
    try:
        # Fallback par défaut si aucune voix n'est sélectionnée
        voice = voice_id if voice_id and voice_id != "default" else "fr-FR-JeromeNeural"
        
        communicate = edge_tts.Communicate(text, voice)
        audio_data = b""
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_data += chunk["data"]
                
        audio_b64 = base64.b64encode(audio_data).decode()
        return audio_b64
    except Exception as e:
        print(f"Erreur Audio (edge-tts): {e}")
        return None
