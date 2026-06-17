from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import shutil
import os
import google.generativeai as genai
from PIL import Image
# ---------------------------
# Configure Gemini API
# ---------------------------
api_key = os.environ.get("GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)
else:
    print("WARNING: GEMINI_API_KEY is not set!")

# ---------------------------
# FastAPI App
# ---------------------------
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------
# Ingredient Analysis Engine
# ---------------------------
def detect_food_category(text):
    text = text.upper()
    categories = {
        "Chocolate & Confectionery": ["CHOCOLATE", "COCOA", "COCOA MASS", "COCOA BUTTER", "KITKAT", "WAFER"],
        "Chips & Fried Snacks": ["POTATO", "PALMOLEIN", "CHIPS", "NAMKEEN", "KURKURE", "BINGO"],
        "Instant Noodles": ["NOODLES", "TASTEMAKER", "MAGGI", "RAMEN"],
        "Makhana Snacks": ["MAKHANA", "FOX NUT"],
        "Protein/Nut Snacks": ["PEANUT", "ALMOND", "CASHEW", "CHICKPEA", "ROASTED CHANA"],
        "Biscuits & Cookies": ["BISCUIT", "COOKIE", "CREAM-FILLED", "WHEAT FLOUR"],
        "Soft Drinks": ["CARBONATED", "SODA", "SOFT DRINK", "COLA"]
    }
    for category, keywords in categories.items():
        for keyword in keywords:
            if keyword in text:
                return category
    return "Unknown"

def apply_category_adjustment(score, category, advisories, score_breakdown):
    adjustments = {
        "Chocolate & Confectionery": {"penalty": -2, "message": "Confectionery products are best enjoyed occasionally."},
        "Chips & Fried Snacks": {"penalty": -1.5, "message": "Fried snacks can be energy dense."},
        "Instant Noodles": {"penalty": -2, "message": "Instant noodles are often high in sodium and refined flour."},
        "Biscuits & Cookies": {"penalty": -1, "message": "Biscuits are often high in refined flour and sugar."},
        "Soft Drinks": {"penalty": -3, "message": "Soft drinks can contribute significant added sugar."},
        "Makhana Snacks": {"penalty": 0, "message": "Makhana-based snacks are generally better options."},
        "Protein/Nut Snacks": {"penalty": 0, "message": "Nut and legume snacks can provide protein and satiety."}
    }
    if category in adjustments:
        penalty = adjustments[category]["penalty"]
        score += penalty
        score_breakdown.append({"factor": category, "change": penalty})
        advisories.append({
            "title": category,
            "severity": "Educational Insight",
             "detail": adjustments[category]["message"],
            "linked": category
        })
    return score

def analyze_ingredients(text):
    score = 10
    score_breakdown = [{"factor": "Base Score", "change": +10}]

    harmful = []
    additives = []
    safe = []
    processed_natural = []
    advisories = []

    text = text.upper()

    # -----------------------
    # Harmful Ingredients
    # -----------------------
    harmful_map = {
        "PALMOLEIN": {
            "name": "Refined Palmolein", "penalty": 2, "note": "Refined oil high in saturated fat.",
            "advisory": {"title": "High Saturated Fat Intake", "severity": "Moderate Risk", "detail": "Frequent intake of refined oils may negatively affect cardiovascular health."}
        },
        "PALM OIL": {"name": "Palm Oil", "penalty": 2, "note": "Highly processed oil."},
        "MALTODEXTRIN": {"name": "Maltodextrin", "penalty": 1, "note": "Highly processed carbohydrate."},
        "SUGAR": {
            "name": "Added Sugar", "penalty": 1, "note": "Frequent intake may affect metabolic health.",
            "advisory": {"title": "Excess Sugar Intake", "severity": "Moderate Risk", "detail": "Frequent consumption of added sugars may contribute to poor metabolic health."}
        },
        "MAIDA": {"name": "Refined Wheat Flour (Maida)", "penalty": 1, "note": "Low fibre refined flour."},
        "HYDROGENATED": {"name": "Hydrogenated Fat", "penalty": 2, "note": "Possible source of trans fats."},
        "HYDROLYZED VEGETABLE PROTEIN": {"name": "Hydrolyzed Vegetable Protein", "penalty": 0.5, "note": "Highly processed flavouring ingredient."},
        "NATURE IDENTICAL": {"name": "Nature Identical Flavours", "penalty": 0.5, "note": "Synthetic flavour compounds."}
    }

    for keyword, item in harmful_map.items():
        if keyword in text:
            score -= item["penalty"]
            score_breakdown.append({"factor": item["name"], "change": -item["penalty"]})
            harmful.append({"name": item["name"], "note": item["note"]})
            if "advisory" in item:
                advisories.append({
                    "title": item["advisory"]["title"], "severity": item["advisory"]["severity"],
                    "detail": item["advisory"]["detail"], "linked": item["name"]
                })

    # -----------------------
    # INS Additives
    # -----------------------
    additive_map = {
        "102": ("Tartrazine", "INS 102", "Synthetic yellow colour."),
        "110": ("Sunset Yellow", "INS 110", "Synthetic orange colour."),
        "122": ("Carmoisine", "INS 122", "Synthetic red colour."),
        "124": ("Ponceau 4R", "INS 124", "Synthetic red colour."),
        "129": ("Allura Red", "INS 129", "Synthetic red colour."),
        "133": ("Brilliant Blue", "INS 133", "Synthetic blue colour."),
        "150": ("Caramel Colour", "INS 150", "Food colouring."),
        "200": ("Sorbic Acid", "INS 200", "Preservative."),
        "202": ("Potassium Sorbate", "INS 202", "Preservative."),
        "211": ("Sodium Benzoate", "INS 211", "Preservative."),
        "223": ("Sodium Metabisulphite", "INS 223", "Preservative."),
        "296": ("Malic Acid", "INS 296", "Acidity regulator."),
        "330": ("Citric Acid", "INS 330", "Acidity regulator."),
        "331": ("Sodium Citrate", "INS 331", "Acidity regulator."),
        "334": ("Tartaric Acid", "INS 334", "Acidity regulator."),
        "319": ("TBHQ", "INS 319", "Synthetic antioxidant."),
        "320": ("BHA", "INS 320", "Synthetic antioxidant."),
        "321": ("BHT", "INS 321", "Synthetic antioxidant."),
        "322": ("Lecithin", "INS 322", "Emulsifier."),
        "471": ("Mono and Diglycerides", "INS 471", "Emulsifier."),
        "476": ("PGPR", "INS 476", "Emulsifier."),
        "500": ("Sodium Carbonate", "INS 500", "Raising agent."),
        "503": ("Ammonium Carbonate", "INS 503", "Raising agent."),
        "508": ("Potassium Chloride", "INS 508", "Flavour enhancer."),
        "551": ("Silicon Dioxide", "INS 551", "Anti-caking agent."),
        "621": ("MSG", "INS 621", "Flavour enhancer."),
        "627": ("Disodium Guanylate", "INS 627", "Flavour enhancer."),
        "631": ("Disodium Inosinate", "INS 631", "Flavour enhancer."),
        "635": ("Disodium 5-ribonucleotides", "INS 635", "Flavour enhancer."),
        "950": ("Acesulfame K", "INS 950", "Artificial sweetener."),
        "951": ("Aspartame", "INS 951", "Artificial sweetener."),
        "955": ("Sucralose", "INS 955", "Artificial sweetener."),
        "960": ("Stevia", "INS 960", "Natural sweetener.")
    }
      
    additive_penalty = {
        "319": 0.5, "320": 1, "321": 1, "621": 0.5, "627": 0.5, "631": 0.5, "635": 0.5,
        "102": 1, "110": 1, "122": 1, "124": 1, "129": 1, "133": 1,
        "950": 0.5, "951": 0.5, "955": 0.5
    }

    for code, (name, ins_code, note) in additive_map.items():
        if code in text:
            additives.append({"name": name, "code": ins_code, "note": note})
            penalty = additive_penalty.get(code, 0)
            score -= penalty
            if penalty > 0:
                score_breakdown.append({"factor": f"{name} ({ins_code})", "change": -penalty})

    # -----------------------
    # Safe Ingredients
    # -----------------------
    processed_natural_map = {
        "GARLIC POWDER": "Dehydrated garlic seasoning.",
        "RED CHILLI POWDER": "Dehydrated red chilli seasoning.",
        "ONION POWDER": "Dehydrated onion seasoning.",
        "TOMATO POWDER": "Processed tomato ingredient.",
        "MILK SOLIDS": "Processed dairy ingredient.",
        "POTATO STARCH": "Refined starch ingredient.",
        "PEANUT OIL": "Processed peanut ingredient."
    }

    for ingredient, note in processed_natural_map.items():
        if ingredient in text:
            processed_natural.append({"name": ingredient.title(), "note": note})

    safe_map = {
        "POTATO": "Whole vegetable ingredient.", "ONION": "Natural spice.",
        "GARLIC": "Natural spice.", "TOMATO": "Natural ingredient.",
        "PEANUT": "Protein-rich ingredient.", "CHICKPEA": "Good source of fibre and protein.",
        "CUMIN": "Natural spice.", "CORIANDER": "Natural spice.",
        "TURMERIC": "Traditional spice.", "MAKHANA": "Roasted lotus seeds; naturally nutritious.",
        "FOX SEEDS": "Nutritious seeds.", "OLIVE OIL": "Healthier fat source.",
        "PARSLEY": "Natural herb.", "CHILLI": "Natural spice.",
        "OATS": "Rich in soluble fibre.", "MILLETS": "Traditional whole grains.",
        "RAGI": "Calcium-rich millet.", "JOWAR": "Whole grain.",
        "BAJRA": "Fibre-rich millet.", "ALMOND": "Healthy fats and protein.",
        "CASHEW": "Nutritious nut source.", "WALNUT": "Omega-3 source.",
        "HONEY": "Natural sweetener.", "JAGGERY": "Traditional sweetener."
    }

    for ingredient, note in safe_map.items():
        skip = False
        for processed in processed_natural:
            if ingredient.upper() in processed["name"].upper():
                skip = True
                break
        if not skip and ingredient in text:
            safe.append({"name": ingredient.title(), "note": note})

    score = max(round(score, 1), 0)
    return score, harmful, additives, safe, processed_natural, advisories, score_breakdown

# ---------------------------
# Home Route
# ---------------------------
@app.get("/")
def home():
    return {"message": "Backend is running"}

# ---------------------------
# Analyze Endpoint
# ---------------------------
@app.post("/api/analyze")
async def analyze(label_image: UploadFile = File(...)):
    if not api_key:
        return {"error": "API key not configured on server."}

    os.makedirs("uploads", exist_ok=True)
    filepath = os.path.join("uploads", label_image.filename)

    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(label_image.file, buffer)

    # Gemini OCR Logic
    try:
        img = Image.open(filepath)
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content([
            "Extract all the ingredient text from this label. Only return the text.",
            img
        ])
        extracted_text = response.text.strip().upper()
    except Exception as e:
        return {"error": "Failed to process image.", "details": str(e)}

    print("\n OCR OUTPUT ")
    print(extracted_text)

    food_keywords = [
        "INGREDIENT", "INGREDIENTS", "SUGAR", "SALT", "FLOUR", "OIL", 
        "MILK", "INS", "EMULSIFIER", "FLAVOUR", "MALTODEXTRIN", "ACIDITY REGULATOR"
    ]

    matches = sum(keyword in extracted_text for keyword in food_keywords)

    if matches < 2:
        return {
            "error": "No valid ingredient label detected.",
            "message": "Please upload a clear photo of a food ingredient list."
        }

    # Ingredient Analysis
    category = detect_food_category(extracted_text)
    score, harmful, additives, safe, processed_natural, advisories, score_breakdown = analyze_ingredients(extracted_text)
    score = apply_category_adjustment(score, category, advisories, score_breakdown)
    score = round(min(max(score, 0), 10), 1)

    return {
        "ocr_text": extracted_text,
        "product_name": label_image.filename,
        "food_category": category,
        "health_score": score,
        "score_breakdown": score_breakdown,
        "ingredients_breakdown": {
            "harmful": harmful,
            "additives": additives,
            "safe": safe,
            "processed": processed_natural,
        },
        "advisories": advisories
    }
