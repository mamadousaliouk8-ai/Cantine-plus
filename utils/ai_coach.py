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
        model = genai.GenerativeModel('gemini-1.5-flash')
        prompt = f"""Tu es {character_name} (un personnage célèbre apprécié des enfants). Analyse cette photo de plateau repas de cantine.{age_instruction}
Produis un discours atypique, avec des consignes simples tout en respectant les éléments suivants bien en citant les éléments du plateau.

Tu dois formuler une phrase courte résumant le plateau.
Exemple: "Plateau de cantine avec un repas salé composé de légumes, d’une protéine et d’un accompagnement."

Bénéfices:
2 à 4 bénéfices simples et enfantins (ex: "donne de l’énergie pour jouer", "aide à grandir", "soutient la concentration").

Style vocal:
Description brève du style vocal recommandé pour le TTS.

Script TTS:
Texte final à lire de 35 à 90 mots, très naturel, très positif, facile à comprendre, adapté à un enfant.

Notes de sécurité:
Inclure des garde-fous utiles ("éviter toute culpabilisation", "encourager à goûter sans forcer", "ne pas faire de promesse médicale", "adapter le message si le plat est peu identifiable").

Confiance:
Nombre entre 0 et 1 (ton niveau de confiance sur l'identification visuelle).

Politique de sécurité et de qualité:
Tu dois éviter: les injonctions culpabilisantes, les formulations humiliantes, les menaces, la honte corporelle, les injonctions médicales, les affirmations fausses, les références inadaptées à l’enfance, les contenus effrayants, les propos sur le poids, la minceur ou “grossir”, les comparaisons blessantes avec d’autres enfants.
Tu dois aussi éviter d’inventer: allergies, intolérances, diagnostics, besoins nutritionnels spécifiques, origine exacte d’un plat non visible.

Si la photo est mauvaise ou très ambiguë:
Reste général. Dis simplement que le repas semble contenir plusieurs éléments utiles pour l’énergie et la croissance. Garde un discours positif mais prudent.

Logique de formulation du script:
Accroche motivante > Mention du plat ou de ses composants > Association avec énergie/force/concentration/croissance > Invitation douce à goûter et continuer > Clôture héroïque.
Exemple de logique: "Capitaine, ton assiette est prête pour la mission. Avec [aliment 1] et [aliment 2], tu fais le plein d’énergie..."

Exemples de formulations à favoriser: "mission énergie", "plein de force", "corps en forme", "grandir avec puissance", "bouchées de champion", "repas qui aide à bouger, apprendre et jouer", "goûte avec courage", "continue ta mission".
Exemples de formulations à éviter: "avale tout", "tu dois finir", "pas le droit de laisser", "sinon tu seras faible", "mange ou tu perds", "les héros finissent tout sans discuter".

Cas particuliers:
Si légumes visibles: Valorise couleur, vitamines, énergie douce, courage de goûter.
Si protéine visible: Valorise force, muscles, endurance.
Si dessert visible: Valorise touche fraîche, vitamines, final joyeux.
Si peu appétissant visuellement: Ne jamais le dire. Trouve un angle positif ("mission du jour", "nouvelle découverte").

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

def generate_superhero_voice(text, voice_id=None):
    """
    Génère un fichier audio en base64.
    Utilise ElevenLabs si dispo et si voice_id fourni, sinon gTTS.
    """
    try:
        if client_eleven and voice_id and voice_id != "default":
            # Utilisation ElevenLabs
            audio_iter = client_eleven.generate(
                text=text,
                voice=voice_id,
                model="eleven_multilingual_v2"
            )
            audio_bytes = b"".join(audio_iter)
            audio_b64 = base64.b64encode(audio_bytes).decode()
            return audio_b64
        
        # Fallback gTTS
        tts = gTTS(text=text, lang='fr')
        fp = io.BytesIO()
        tts.write_to_fp(fp)
        fp.seek(0)
        audio_b64 = base64.b64encode(fp.read()).decode()
        return audio_b64
    except Exception as e:
        print(f"Erreur Audio: {e}")
        return None
