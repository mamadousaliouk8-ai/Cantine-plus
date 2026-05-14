# pyrefly: ignore [missing-import]
from db import supabase
import datetime

PRESTA_ID = "f32c0143-a078-47f9-974a-1bed196302ac"

# On utilise maintenant les colonnes séparées : entree, plat, dessert
menus = [
    # Lundi 18 Mai
    {"date": "2026-05-18", "type": "Viande", "entree": "Salade de tomates 🥗", "plat": "Sauté de dinde à la crème 🥩", "dessert": "Pomme bio 🍎", "bio": True, "prestataire_id": PRESTA_ID},
    {"date": "2026-05-18", "type": "Végétarien", "entree": "Salade de tomates 🥗", "plat": "Lasagnes aux épinards et ricotta 🍝", "dessert": "Pomme bio 🍎", "bio": True, "prestataire_id": PRESTA_ID},
    
    # Mardi 19 Mai
    {"date": "2026-05-19", "type": "Viande", "entree": "Carottes râpées 🥕", "plat": "Filet de colin sauce citron 🐟", "dessert": "Yaourt nature 🥛", "bio": False, "prestataire_id": PRESTA_ID},
    {"date": "2026-05-19", "type": "Végétarien", "entree": "Carottes râpées 🥕", "plat": "Omelette bio aux fines herbes 🍳", "dessert": "Yaourt nature 🥛", "bio": True, "prestataire_id": PRESTA_ID},
    
    # Mercredi 20 Mai
    {"date": "2026-05-20", "type": "Viande", "entree": "Betteraves 🥗", "plat": "Poulet rôti et frites 🍗", "dessert": "Compote de poires 🍐", "bio": False, "prestataire_id": PRESTA_ID},
    {"date": "2026-05-20", "type": "Végétarien", "entree": "Betteraves 🥗", "plat": "Galette de sarrasin au fromage 🥞", "dessert": "Compote de poires 🍐", "bio": False, "prestataire_id": PRESTA_ID},
    
    # Jeudi 21 Mai
    {"date": "2026-05-21", "type": "Viande", "entree": "Concombres 🥒", "plat": "Bœuf bourguignon et purée 🥘", "dessert": "Fromage blanc 🥛", "bio": False, "prestataire_id": PRESTA_ID},
    {"date": "2026-05-21", "type": "Végétarien", "entree": "Concombres 🥒", "plat": "Couscous aux légumes et pois chiches 🍛", "dessert": "Fromage blanc 🥛", "bio": True, "prestataire_id": PRESTA_ID},
    
    # Vendredi 22 Mai
    {"date": "2026-05-22", "type": "Viande", "entree": "Taboulé 🥗", "plat": "Nuggets de poisson et riz 🐟", "dessert": "Flan au caramel 🍮", "bio": False, "prestataire_id": PRESTA_ID},
    {"date": "2026-05-22", "type": "Végétarien", "entree": "Taboulé 🥗", "plat": "Pâtes au pesto et pignons 🍝", "dessert": "Flan au caramel 🍮", "bio": False, "prestataire_id": PRESTA_ID},
]

print(f"🚀 Mise à jour des menus pour la semaine du 18/05 au 22/05...")

# 1. Nettoyage des anciens tests pour repartir sur une base propre
dates = list(set([m["date"] for m in menus]))
for d in dates:
    supabase.table("menus").delete().eq("date", d).eq("prestataire_id", PRESTA_ID).execute()

# 2. Insertion des nouveaux menus avec les colonnes séparées
for m in menus:
    try:
        supabase.table("menus").insert(m).execute()
        print(f"✅ Menu ajouté proprement : {m['date']} ({m['type']})")
    except Exception as e:
        print(f"❌ Erreur pour {m['date']} : {e}")

print("\n✨ Terminé ! Tes menus sont maintenant parfaitement structurés.")
