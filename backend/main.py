from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import re
from matplotlib import category

# ---------------------------
# FastAPI App
# ---------------------------
app = FastAPI()

class IngredientRequest(BaseModel):
    text: str

class NutritionRequest(BaseModel):
    text: str


class ManualNutritionRequest(BaseModel):
    calories: float = 0
    protein: float = 0
    carbohydrates: float = 0
    sugar: float = 0
    added_sugar: float = 0
    total_fat: float = 0
    saturated_fat: float = 0
    trans_fat: float = 0
    sodium: float = 0
    serving_size: float = 100
    is_per_100g: bool = True

# ---------------------------
# CORS
# ---------------------------
app.add_middleware(
    CORSMiddleware,
    # allow_origins=["*"],
    allow_origin_regex=r"https://.*\.vercel\.app",

    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------
# Safe Limits (per serving)
# ---------------------------
SAFE_LIMITS = {
    "calories": 400,
    "sugar": 25,
    "added_sugar": 25,
    "sodium": 500,
    "saturated_fat": 5,
    "trans_fat": 0,
    "total_fat": 20,
    "carbohydrates": 75,
    "protein": 0,   # No upper limit; lower is mildly flagged
    "fiber": 0,     # No upper limit; lower is mildly flagged
}

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
        "Soft Drinks": ["CARBONATED", "SODA", "SOFT DRINK", "COLA"],
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
        "Protein/Nut Snacks": {"penalty": 0, "message": "Nut and legume snacks can provide protein and satiety."},
    }
    if category in adjustments:
        penalty = adjustments[category]["penalty"]
        score += penalty
        score_breakdown.append({"factor": category, "change": penalty})
        advisories.append({
            "title": category,
            "severity": "Educational Insight",
            "detail": adjustments[category]["message"],
            "linked": category,
        })
    return score


def analyze_ingredients(text):
    score = 10
    score_breakdown = [{"factor": "Base Score", "change": +10}]
    harmful, additives, safe, processed_natural, advisories = [], [], [], [], []
    text = text.upper()

    harmful_map = {
        "PALMOLEIN": {"name": "Refined Palmolein", "penalty": 2, "note": "Refined oil high in saturated fat.", "advisory": {"title": "High Saturated Fat Intake", "severity": "Moderate Risk", "detail": "Frequent intake of refined oils may negatively affect cardiovascular health."}},
        "PALM OIL": {"name": "Palm Oil", "penalty": 2, "note": "Highly processed oil."},
        "MALTODEXTRIN": {"name": "Maltodextrin", "penalty": 1, "note": "Highly processed carbohydrate."},
        "SUGAR": {"name": "Added Sugar", "penalty": 1, "note": "Frequent intake may affect metabolic health.", "advisory": {"title": "Excess Sugar Intake", "severity": "Moderate Risk", "detail": "Frequent consumption of added sugars may contribute to poor metabolic health."}},
        "MAIDA": {"name": "Refined Wheat Flour (Maida)", "penalty": 1, "note": "Low fibre refined flour."},
        "HYDROGENATED": {"name": "Hydrogenated Fat", "penalty": 2, "note": "Possible source of trans fats."},
        "HYDROLYZED VEGETABLE PROTEIN": {"name": "Hydrolyzed Vegetable Protein", "penalty": 0.5, "note": "Highly processed flavouring ingredient."},
        "NATURE IDENTICAL": {"name": "Nature Identical Flavours", "penalty": 0.5, "note": "Synthetic flavour compounds."},
    }

    for keyword, item in harmful_map.items():
        if keyword in text:
            score -= item["penalty"]
            score_breakdown.append({"factor": item["name"], "change": -item["penalty"]})
            harmful.append({"name": item["name"], "note": item["note"]})
            if "advisory" in item:
                advisories.append({**item["advisory"], "linked": item["name"]})

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
        "960": ("Stevia", "INS 960", "Natural sweetener."),
    }
    additive_penalty = {
        "319": 0.5, "320": 1, "321": 1,
        "621": 0.5, "627": 0.5, "631": 0.5, "635": 0.5,
        "102": 1, "110": 1, "122": 1, "124": 1, "129": 1, "133": 1,
        "950": 0.5, "951": 0.5, "955": 0.5,
    }

    for code, (name, ins_code, note) in additive_map.items():
        if code in text:
            additives.append({"name": name, "code": ins_code, "note": note})
            penalty = additive_penalty.get(code, 0)
            score -= penalty
            if penalty > 0:
                score_breakdown.append({"factor": f"{name} ({ins_code})", "change": -penalty})

    processed_natural_map = {
        "GARLIC POWDER": "Dehydrated garlic seasoning.",
        "RED CHILLI POWDER": "Dehydrated red chilli seasoning.",
        "ONION POWDER": "Dehydrated onion seasoning.",
        "TOMATO POWDER": "Processed tomato ingredient.",
        "MILK SOLIDS": "Processed dairy ingredient.",
        "POTATO STARCH": "Refined starch ingredient.",
        "PEANUT OIL": "Processed peanut ingredient.",
    }
    for ingredient, note in processed_natural_map.items():
        if ingredient in text:
            processed_natural.append({"name": ingredient.title(), "note": note})

    safe_map = {
        "POTATO": "Whole vegetable ingredient.", "ONION": "Natural spice.", "GARLIC": "Natural spice.",
        "TOMATO": "Natural ingredient.", "PEANUT": "Protein-rich ingredient.",
        "CHICKPEA": "Good source of fibre and protein.", "CUMIN": "Natural spice.",
        "CORIANDER": "Natural spice.", "TURMERIC": "Traditional spice.",
        "MAKHANA": "Roasted lotus seeds; naturally nutritious.", "OLIVE OIL": "Healthier fat source.",
        "CHILLI": "Natural spice.", "OATS": "Rich in soluble fibre.", "MILLETS": "Traditional whole grains.",
        "RAGI": "Calcium-rich millet.", "JOWAR": "Whole grain.", "BAJRA": "Fibre-rich millet.",
        "ALMOND": "Healthy fats and protein.", "CASHEW": "Nutritious nut source.",
        "WALNUT": "Omega-3 source.", "HONEY": "Natural sweetener.", "JAGGERY": "Traditional sweetener.",
    }
    for ingredient, note in safe_map.items():
        skip = any(ingredient.upper() in p["name"].upper() for p in processed_natural)
        if not skip and ingredient in text:
            safe.append({"name": ingredient.title(), "note": note})

    score = max(round(score, 1), 0)
    return score, harmful, additives, safe, processed_natural, advisories, score_breakdown


# ---------------------------
# Nutrition OCR Parser
# ---------------------------
def parse_nutrition_text(text: str) -> dict:
    """
    Parses OCR text from a nutrition facts panel into a structured dict.
    Handles common OCR noise and varied label formats.
    """
    text = text.upper()

    def extract_value(patterns: list) -> float | None:
        for pat in patterns:
            m = re.search(pat, text)
            if m:
                try:
                    return float(m.group(1).replace(",", "."))
                except Exception:
                    continue
        return None

    nutrition = {
        "calories":       extract_value([r"CALORIES?\s*[:\-]?\s*(\d+(?:\.\d+)?)", r"ENERGY\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*KCAL"]),
        "total_fat":      extract_value([r"TOTAL\s*FAT\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*G"]),
        "saturated_fat":  extract_value([r"SATURATED\s*FAT\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*G", r"SAT\.?\s*FAT\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*G"]),
        "trans_fat":      extract_value([r"TRANS\s*FAT\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*G"]),
        "carbohydrates":  extract_value([r"TOTAL\s*CARBOHYDRATE\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*G", r"CARBOHYDRATES?\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*G"]),
        "sugar":          extract_value([r"(?:TOTAL\s*)?SUGARS?\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*G"]),
        "added_sugar":    extract_value([r"ADDED\s*SUGARS?\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*G"]),
        "protein":        extract_value([r"PROTEIN\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*G"]),
        "fiber":          extract_value([r"DIETARY\s*FIBE?R\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*G", r"FIBRE?\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*G"]),
        "sodium":         extract_value([r"SODIUM\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*MG"]),
    }
    return {k: v for k, v in nutrition.items() if v is not None}


def compute_nutrition_analysis(
    nutrition: dict,
    category: str = "Unknown"
) -> dict:
    """Compare parsed nutrition values against safe limits, compute excess and risk score."""
    concerns = []
    score = 10.0
    # Low protein
    if nutrition.get("protein", 0) < 5:
        score -= 1

# Low fibre
    if nutrition.get("fiber", 0) < 3:
        score -= 1

# Very high calorie density
    if nutrition.get("calories", 0) > 500:
        score -= 2

# Fried snack category
    if category == "Chips & Fried Snacks":
        score -= 1.5
    score_breakdown = [{"factor": "Base Score", "change": 10}]

    penalty_map = {
        "calories":      {"weight": 1.5, "label": "Calories"},
        "sugar":         {"weight": 2.5, "label": "Sugar"},
        "added_sugar":   {"weight": 2.5, "label": "Added Sugar"},
        "sodium":        {"weight": 2.0, "label": "Sodium"},
        "saturated_fat": {"weight": 1.5, "label": "Saturated Fat"},
        "trans_fat":     {"weight": 3.0, "label": "Trans Fat"},
        "total_fat":     {"weight": 1.0, "label": "Total Fat"},
    }

    for key, meta in penalty_map.items():
        detected = nutrition.get(key)
        safe_limit = SAFE_LIMITS.get(key)
        if detected is None or safe_limit is None:
            continue

        weight = meta.get("weight", 1.0)

        if safe_limit == 0:
            # Trans fat — any amount is penalised
            if detected > 0:
                excess_pct = 100
                penalty = weight * min(detected, 3)
                score -= penalty
                score_breakdown.append({"factor": meta["label"], "change": -round(penalty, 1)})
                concerns.append({
                    "nutrient": meta["label"],
                    "detected": detected,
                    "unit": "g",
                    "safe_limit": 0,
                    "excess_percent": 100,
                    "risk": "High",
                })
        elif detected > safe_limit:
            excess_pct = round(((detected - safe_limit) / safe_limit) * 100, 1)
            # penalty = weight * (excess_pct / 100)
            if excess_pct <= 20:
                penalty = weight * 0.5
            elif excess_pct <= 50:
                penalty = weight * 1.5  
            elif excess_pct <= 100:
                penalty = weight * 3
            else:
                penalty = weight * 5
            score -= penalty
            score_breakdown.append({"factor": meta["label"], "change": -round(penalty, 1)})
            unit = "mg" if key == "sodium" else "g"
            concerns.append({
                "nutrient": meta["label"],
                "detected": detected,
                "unit": unit,
                "safe_limit": safe_limit,
                "excess_percent": excess_pct,
                "risk": "High" if excess_pct > 75 else "Moderate",
            })
        else:
            unit = "mg" if key == "sodium" else ("kcal" if key == "calories" else "g")
            concerns.append({
                "nutrient": meta["label"],
                "detected": detected,
                "unit": unit,
                "safe_limit": safe_limit,
                "excess_percent": 0,
                "risk": "Safe",
            })

    # Protein / fiber bonuses (good things)
    if nutrition.get("protein", 0) >= 10:
        score = min(score + 0.5, 10)
        score_breakdown.append({"factor": "Good Protein Content", "change": 0.5})
    if nutrition.get("fiber", 0) >= 5:
        score = min(score + 0.5, 10)
        score_breakdown.append({"factor": "Good Fibre Content", "change": 0.5})

    score = round(max(min(score, 10), 0), 1)
    return {"score": score, "score_breakdown": score_breakdown, "concerns": concerns}


def generate_ai_verdict(nutrition_concerns: list, ingredient_score: float, nutrition_score: float, final_score: float) -> dict:
    high_risk = [c for c in nutrition_concerns if c.get("risk") in ("High", "Moderate") and c.get("excess_percent", 0) > 0]
    concern_names = [c["nutrient"] for c in high_risk]

    if final_score >= 7:
        risk_level = "Low"
        recommendation = "Suitable for regular consumption in appropriate portions."
    elif final_score >= 4:
        risk_level = "Medium"
        recommendation = "Best consumed occasionally — not as a daily staple."
    else:
        risk_level = "High"
        recommendation = "Avoid regular consumption. Choose a healthier alternative."

    lines = []
    if concern_names:
        lines.append(f"This product contains elevated levels of {', '.join(concern_names[:3])}.")
    for c in high_risk[:3]:
        if c["excess_percent"] > 0:
            lines.append(f"{c['nutrient']} is {c['excess_percent']}% above recommended limits.")

    verdict_text = " ".join(lines) if lines else "Nutrient levels appear within acceptable ranges."

    return {
        "verdict": verdict_text,
        "risk_level": risk_level,
        "recommendation": recommendation,
        "major_concerns": concern_names,
    }


def suggest_healthier_alternatives(score: float, category: str) -> list:
    ALTERNATIVES_MAP = {
        "Chips & Fried Snacks": [
            {"name": "Roasted Makhana", "emoji": "🥜", "why": "Air-popped, low fat, high protein"},
            {"name": "Roasted Chana", "emoji": "🌰", "why": "Fibre + protein, zero additives"},
            {"name": "Murmura Chivda", "emoji": "🍿", "why": "Light, baked, homemade-friendly"},
            {"name": "Peanut Chikki", "emoji": "🍬", "why": "Jaggery-sweetened, no preservatives"},
        ],
        "Instant Noodles": [
            {"name": "Oats Upma", "emoji": "🥣", "why": "Whole grain, high fibre"},
            {"name": "Millet Noodles", "emoji": "🍜", "why": "Lower GI than refined wheat"},
            {"name": "Poha", "emoji": "🍚", "why": "Light, easy, minimal processing"},
        ],
        "Chocolate & Confectionery": [
            {"name": "Dark Chocolate 70%+", "emoji": "🍫", "why": "Less sugar, more antioxidants"},
            {"name": "Date & Nut Balls", "emoji": "🌰", "why": "Natural sweetness, whole food"},
            {"name": "Banana with Peanut Butter", "emoji": "🍌", "why": "Potassium + protein combo"},
        ],
        "Biscuits & Cookies": [
            {"name": "Rice Cakes", "emoji": "🍘", "why": "Lower calorie, minimal ingredients"},
            {"name": "Digestive Biscuits (plain)", "emoji": "🫓", "why": "Slightly higher fibre"},
            {"name": "Nut Butter on Roti", "emoji": "🫓", "why": "Whole grain + healthy fat"},
        ],
        "Soft Drinks": [
            {"name": "Nimbu Pani", "emoji": "🍋", "why": "Natural vitamin C, zero additives"},
            {"name": "Chaas (Buttermilk)", "emoji": "🥛", "why": "Probiotic, cooling, low calorie"},
            {"name": "Coconut Water", "emoji": "🥥", "why": "Natural electrolytes"},
        ],
    }
    default = [
        {"name": "Roasted Makhana", "emoji": "🥜", "why": "Protein-rich, air-popped"},
        {"name": "Roasted Chana", "emoji": "🌰", "why": "Fibre + protein powerhouse"},
        {"name": "Peanut Chikki", "emoji": "🍬", "why": "Jaggery + peanut, no preservatives"},
        {"name": "Dry Fruits Mix", "emoji": "🍇", "why": "Natural energy, healthy fats"},
    ]
    if score < 5:
        return ALTERNATIVES_MAP.get(category, default)
    return []


# ---------------------------
# Home Route
# ---------------------------
@app.get("/")
def home():
    return {"message": "Is It Healthy? backend is running"}


# ---------------------------
# Ingredient Analysis Endpoint
# ---------------------------
@app.post("/api/analyze")
async def analyze(data: IngredientRequest):
    extracted_text = data.text.strip().upper()
    print("\n========== INGREDIENT OCR ==========")
    print(extracted_text)
    print("=====================================\n")

    food_keywords = [
        "INGREDIENT", "INGREDIENTS", "SUGAR", "SALT", "FLOUR", "OIL", "MILK",
        "INS", "EMULSIFIER", "FLAVOUR", "MALTODEXTRIN", "ACIDITY REGULATOR"
    ]
    matches = sum(keyword in extracted_text for keyword in food_keywords)
    if matches < 2:
        return {
            "error": "No valid ingredient label detected.",
            "message": "Please upload a clear photo of a food ingredient list."
        }

    category = detect_food_category(extracted_text)
    score, harmful, additives, safe, processed_natural, advisories, score_breakdown = analyze_ingredients(extracted_text)
    score = apply_category_adjustment(score, category, advisories, score_breakdown)
    score = round(min(max(score, 0), 10), 1)
    alternatives = suggest_healthier_alternatives(score, category)

    return {
        "ocr_text": extracted_text,
        "food_category": category,
        "health_score": score,
        "score_breakdown": score_breakdown,
        "ingredients_breakdown": {
            "harmful": harmful,
            "additives": additives,
            "safe": safe,
            "processed": processed_natural,
        },
        "advisories": advisories,
        "alternatives": alternatives,
    }


# ---------------------------
# Nutrition Analysis Endpoint
# ---------------------------
# @app.post("/api/analyze-nutrition")
async def analyze_nutrition(data: NutritionRequest):
    extracted_text = data.text.strip()
    print("\n========== NUTRITION OCR ==========")
    print(extracted_text)
    print("====================================\n")

    # Validate it looks like a nutrition label
    nutrition_keywords = [
        "CALORIE", "ENERGY", "FAT", "SODIUM", "SUGAR", "PROTEIN",
        "CARBOHYDRATE", "FIBER", "SERVING"
    ]
    upper_text = extracted_text.upper()
    matches = sum(kw in upper_text for kw in nutrition_keywords)
    if matches < 2:
        return {
            "error": "No valid nutrition facts panel detected.",
            "message": "Please upload a clear photo of the Nutrition Facts table."
        }

    nutrition = parse_nutrition_text(extracted_text)
    if not nutrition:
        return {
            "error": "Nutrition values not detected",
            "allow_manual_input": True,
            "nutrition": {},
            "nutrition_score": 0,
            "score_breakdown": [],
            "concerns": [],
        }

    analysis = compute_nutrition_analysis(nutrition)

    return {
        "ocr_text": extracted_text,
        "nutrition": nutrition,
        "nutrition_score": analysis["score"],
        "score_breakdown": analysis["score_breakdown"],
        "concerns": analysis["concerns"],
    }


# ---------------------------
# Manual Nutrition Entry Endpoint
# ---------------------------
@app.post("/api/manual-nutrition")
async def manual_nutrition(data: ManualNutritionRequest):
    def safe_float(value) -> float:
        """Convert None or invalid values to 0.0 safely."""
        if value is None:
            return 0.0
        try:
            return float(value)
        except (TypeError, ValueError):
            return 0.0

    nutrition = {
        "calories":      safe_float(data.calories),
        "protein":       safe_float(data.protein),
        "carbohydrates": safe_float(data.carbohydrates),
        "sugar":         safe_float(data.sugar),
        "added_sugar":   safe_float(data.added_sugar),
        "total_fat":     safe_float(data.total_fat),
        "saturated_fat": safe_float(data.saturated_fat),
        "trans_fat":     safe_float(data.trans_fat),
        "sodium":        safe_float(data.sodium),
    }
    if data.is_per_100g and data.serving_size > 0:
        factor = data.serving_size / 100
    else:
        factor = 1

    for key in nutrition:
        nutrition[key] *= factor

    # Strip keys with zero values so compute_nutrition_analysis
    # skips them (same behaviour as OCR-parsed results with missing fields)
    nutrition_filtered = {k: v for k, v in nutrition.items() if v > 0}

    analysis = compute_nutrition_analysis(nutrition_filtered)

    return {
        "nutrition": nutrition_filtered,
        "nutrition_score": analysis["score"],
        "score_breakdown": analysis["score_breakdown"],
        "concerns": analysis["concerns"],
    }


# ---------------------------
# Combined Report Endpoint
# ---------------------------
@app.post("/api/combined-report")
async def combined_report(data: dict):
    ingredient_score = data.get("ingredient_score", 0)
    nutrition_score = data.get("nutrition_score", 0)
    category = data.get("food_category", "Unknown")
    nutrition_concerns = data.get("concerns", [])
    ingredient_harmful = data.get("harmful", [])
    ingredient_additives = data.get("additives", [])

    final_score = round((ingredient_score * 0.5) + (nutrition_score * 0.5), 1)

    major_concerns = (
        [h["name"] for h in ingredient_harmful[:2]] +
        [a["name"] for a in ingredient_additives[:2]] +
        [c["nutrient"] for c in nutrition_concerns if c.get("excess_percent", 0) > 50][:2]
    )

    verdict = generate_ai_verdict(nutrition_concerns, ingredient_score, nutrition_score, final_score)
    alternatives = suggest_healthier_alternatives(final_score, category)

    if final_score >= 7:
        consumption_label = "✅ Suitable for Regular Consumption"
    elif final_score >= 4:
        consumption_label = "⚠️ Consume Occasionally"
    else:
        consumption_label = "🚫 Avoid Regular Consumption"

    return {
        "ingredient_score": ingredient_score,
        "nutrition_score": nutrition_score,
        "final_score": final_score,
        "major_concerns": major_concerns,
        "consumption_label": consumption_label,
        "verdict": verdict,
        "alternatives": alternatives,
    }
