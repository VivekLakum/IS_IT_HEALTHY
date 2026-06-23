import React, { useState, useEffect, useRef, useCallback } from "react";
import Tesseract from "tesseract.js";
import {
  UploadCloud, X, Loader2, Moon, Sun, IndianRupee, UtensilsCrossed,
  AlertTriangle, Skull, CheckCircle2, Stethoscope, Sparkles, Info,
  Salad, Layers, Camera, RefreshCw, FileText, BarChart2, ClipboardList,
  ShieldAlert, TrendingDown, Zap, Crop, Copy, RotateCcw, History,
  GitCompare, Trophy, ChevronRight, Plus, Trash2, Star,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════════════
   GLOBAL STYLES
══════════════════════════════════════════════════════════════════════════════ */
function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap');

      .theme-light{
        --bg:#F6F4EE; --surface:#FFFFFF; --surface-2:#EFEBE1; --ink:#171F1B; --ink-soft:#5C6760;
        --border:rgba(23,31,27,0.10); --shadow:rgba(23,31,27,0.12);
        --emerald:#0E9F6A; --amber:#C97A05; --crimson:#D6273A; --toxic:#8B30D6;
      }
      .theme-dark{
        --bg:#0E1512; --surface:#151E1A; --surface-2:#1C2822; --ink:#EDF4EF; --ink-soft:#92A69B;
        --border:rgba(255,255,255,0.08); --shadow:rgba(0,0,0,0.5);
        --emerald:#22C485; --amber:#F4A93C; --crimson:#FF5D67; --toxic:#B07CFE;
      }
      .app-root{ font-family:'Inter',sans-serif; }
      .font-display{ font-family:'Sora',sans-serif; }
      .font-num{ font-family:'Space Grotesk',monospace; }
      .scrollbar-thin::-webkit-scrollbar{ height:6px; }
      .scrollbar-thin::-webkit-scrollbar-thumb{ background:var(--border); border-radius:10px; }
      input[type="number"]::-webkit-inner-spin-button{ opacity:0.5; }
      input[type="range"]{ -webkit-appearance:none; appearance:none; background:transparent; }
      input[type="range"]::-webkit-slider-thumb{ -webkit-appearance:none; width:18px; height:18px; border-radius:50%; background:var(--ink); border:2px solid var(--surface); cursor:pointer; }

      @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      .animate-fade-in { animation: fadeIn 0.35s ease forwards; }

      .bar-fill { transition: width 1s cubic-bezier(0.34,1.56,0.64,1); }
      
      video { width:100%; border-radius:12px; background:#000; }

      /* Crop overlay styles */
      .crop-container { position:relative; overflow:hidden; user-select:none; touch-action:none; }
      .crop-selection { position:absolute; border:2px solid rgba(255,255,255,0.9); box-shadow:0 0 0 9999px rgba(0,0,0,0.5); cursor:move; }
      .crop-handle { position:absolute; width:12px; height:12px; background:#fff; border:2px solid rgba(0,0,0,0.5); border-radius:2px; }
      .crop-handle.tl { top:-6px; left:-6px; cursor:nwse-resize; }
      .crop-handle.tr { top:-6px; right:-6px; cursor:nesw-resize; }
      .crop-handle.bl { bottom:-6px; left:-6px; cursor:nesw-resize; }
      .crop-handle.br { bottom:-6px; right:-6px; cursor:nwse-resize; }
      .crop-grid-line { position:absolute; background:rgba(255,255,255,0.3); }

      /* OCR editable textarea */
      .ocr-textarea {
        width:100%; min-height:120px; resize:vertical;
        background:var(--surface-2); color:var(--ink);
        border:1px solid var(--border); border-radius:12px;
        padding:12px; font-size:13px; line-height:1.6;
        font-family:'Inter',sans-serif; outline:none;
        transition:box-shadow 0.15s;
      }
      .ocr-textarea:focus { box-shadow: 0 0 0 2px color-mix(in srgb, var(--emerald) 45%, transparent); }

      /* Compare page */
      .compare-table { width:100%; border-collapse:collapse; }
      .compare-table th, .compare-table td { padding:10px 14px; border-bottom:1px solid var(--border); text-align:left; font-size:13px; }
      .compare-table th { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; color:var(--ink-soft); }
      .compare-table tr:last-child td { border-bottom:none; }

      /* Mobile nav */
      @media (max-width:640px) {
        .nav-link { font-size:12px; padding:6px 10px; }
      }
    `}</style>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   EXPANDED INGREDIENT INTELLIGENCE ENGINE
══════════════════════════════════════════════════════════════════════════════ */
const INGREDIENT_RULES = [
  // Existing rules
  {
    match: (t) => t.includes("palm oil") || t.includes("palmolein") || t.includes("hydrogenated"),
    type: "harmful",
    item: { name: "Palm Oil / Palmolein Oil", note: "Highly processed saturated fat, linked to cardiovascular inflammation and arterial plaque buildup." },
    deduction: 2.0, factor: "Contains Industrial Palm Fats"
  },
  {
    match: (t) => t.includes("msg") || t.includes("glutamate") || t.includes("621") || t.includes("e621") || t.includes("yeast extract"),
    type: "additive",
    item: { name: "Monosodium Glutamate", code: "INS 621", note: "Flavor enhancer that overstimulates neurotransmitters, potentially causing headaches and cravings and Thristy." },
    deduction: 1.5, factor: "Excitotoxic Flavor Enhancer"
  },
  {
    match: (t) => t.includes("fructose") || t.includes("hfcs") || t.includes("corn syrup") || t.includes("invert sugar") || t.includes("high fructose"),
    type: "harmful",
    item: { name: "High Fructose Corn Syrup / Invert Sugar", note: "Forces metabolic load onto the liver, triggering rapid fat storage and insulin resistance spikes." },
    deduction: 2.0, factor: "High-Load Simple Sugars"
  },
  {
    match: (t) => (t.includes("sugar") || t.includes("sucrose") || t.includes("dextrose")) && !t.includes("fructose") && !t.includes("corn syrup"),
    type: "processed",
    item: { name: "Refined Sugar", note: "Pure empty calories that destabilize glucose levels and stimulate cellular systemic inflammation." },
    deduction: 1.0, factor: "Refined Carbs & Sugars"
  },
  {
    match: (t) => t.includes("benzoate") || t.includes("sorbate") || t.includes("211") || t.includes("202") || t.includes("metabisulphite") || t.includes("tartrazine") || t.includes("sunset yellow"),
    type: "additive",
    item: { name: "Synthetic Preservatives / Colors", code: "INS 211/202", note: "Lengthens shelf-life artificially but can cause gut biome sensitivity over prolonged exposure." },
    deduction: 1.5, factor: "Chemical Preservatives/Colors"
  },
  // NEW: TBHQ
  {
    match: (t) => t.includes("tbhq") || t.includes("tert-butylhydroquinone") || t.includes("319"),
    type: "harmful",
    item: { name: "TBHQ (Tert-Butylhydroquinone)", code: "INS 319", note: "Petroleum-derived antioxidant preservative. Linked to vision disturbances and potential carcinogenicity at high doses.", riskLevel: "High", scoreDeduction: 2.0 },
    deduction: 2.0, factor: "Petroleum Preservative TBHQ"
  },
  // NEW: BHA
  {
    match: (t) => t.includes("bha") || t.includes("butylated hydroxyanisole") || t.includes("320"),
    type: "harmful",
    item: { name: "BHA (Butylated Hydroxyanisole)", code: "INS 320", note: "Synthetic antioxidant preservative. Classified as possible human carcinogen by IARC.", riskLevel: "High", scoreDeduction: 1.8 },
    deduction: 1.8, factor: "Synthetic Antioxidant BHA"
  },
  // NEW: BHT
  {
    match: (t) => t.includes("bht") || t.includes("butylated hydroxytoluene") || t.includes("321"),
    type: "harmful",
    item: { name: "BHT (Butylated Hydroxytoluene)", code: "INS 321", note: "Synthetic preservative linked to hormonal disruption and endocrine system interference.", riskLevel: "Moderate", scoreDeduction: 1.5 },
    deduction: 1.5, factor: "Synthetic Preservative BHT"
  },
  // NEW: Maltodextrin
  {
    match: (t) => t.includes("maltodextrin"),
    type: "processed",
    item: { name: "Maltodextrin", note: "Highly processed starch derivative with extremely high glycemic index (GI 110+). Spikes blood sugar faster than table sugar.", riskLevel: "Moderate", scoreDeduction: 1.0 },
    deduction: 1.0, factor: "High-GI Maltodextrin Filler"
  },
  // NEW: Sucralose
  {
    match: (t) => t.includes("sucralose") || t.includes("ins 955") || t.includes("955"),
    type: "additive",
    item: { name: "Sucralose", code: "INS 955", note: "Chlorinated artificial sweetener. May alter gut microbiome composition and impair glucose metabolism with regular use.", riskLevel: "Moderate", scoreDeduction: 1.2 },
    deduction: 1.2, factor: "Chlorinated Artificial Sweetener"
  },
  // NEW: Aspartame
  {
    match: (t) => t.includes("aspartame") || t.includes("ins 951") || t.includes("951") || t.includes("e951"),
    type: "additive",
    item: { name: "Aspartame", code: "INS 951", note: "Amino acid-based artificial sweetener. Classified as 'possibly carcinogenic' (Group 2B) by WHO IARC 2023. Avoid if PKU.", riskLevel: "High", scoreDeduction: 1.5 },
    deduction: 1.5, factor: "Aspartame Artificial Sweetener"
  },
  // NEW: Acesulfame K
  {
    match: (t) => t.includes("acesulfame") || t.includes("ace k") || t.includes("ins 950") || t.includes("950") || t.includes("e950"),
    type: "additive",
    item: { name: "Acesulfame Potassium (Ace-K)", code: "INS 950", note: "Artificial sweetener often combined with aspartame. Animal studies suggest potential disruption of insulin regulation.", riskLevel: "Moderate", scoreDeduction: 1.0 },
    deduction: 1.0, factor: "Artificial Sweetener Ace-K"
  },
  // NEW: Carrageenan
  {
    match: (t) => t.includes("carrageenan") || t.includes("407"),
    type: "additive",
    item: { name: "Carrageenan", code: "INS 407", note: "Seaweed-derived thickener linked to gut inflammation, digestive discomfort, and potential intestinal damage at high doses.", riskLevel: "Moderate", scoreDeduction: 1.2 },
    deduction: 1.2, factor: "Inflammatory Carrageenan Thickener"
  },
  // NEW: Artificial Flavours
  {
    match: (t) => t.includes("artificial flavour") || t.includes("artificial flavor") || t.includes("nature identical"),
    type: "additive",
    item: { name: "Artificial Flavours", note: "Synthetic chemical compounds designed to mimic natural tastes. May contain undisclosed allergens and compounds not fully assessed for long-term safety.", riskLevel: "Low-Moderate", scoreDeduction: 0.8 },
    deduction: 0.8, factor: "Synthetic Artificial Flavourings"
  },
  // NEW: Artificial Colours
  {
    match: (t) => t.includes("artificial colour") || t.includes("artificial color") || t.includes("ins 102") || t.includes("ins 110") || t.includes("ins 124") || t.includes("ins 129") || t.includes("102") || t.includes("tartrazine") || t.includes("allura red") || t.includes("sunset yellow"),
    type: "additive",
    item: { name: "Artificial Food Colours", code: "INS 102/110/124/129", note: "Petroleum-derived synthetic dyes linked to hyperactivity in children. Several banned in European markets.", riskLevel: "High", scoreDeduction: 1.5 },
    deduction: 1.5, factor: "Petroleum-Derived Artificial Dyes"
  },
  // Fillers (safe/processed)
  {
    match: (t) => t.includes("wheat") || t.includes("flour") || t.includes("rice") || t.includes("corn") || t.includes("potato"),
    type: "processed",
    item: { name: "Starch Base / Cereal Flour", note: "Standard texturing component; fast-digesting carbohydrates but non-toxic." },
    deduction: 0, factor: null
  },
  {
    match: (t) => t.includes("salt") || t.includes("sodium chloride"),
    type: "processed",
    item: { name: "Iodized Salt", note: "Used heavily for palatability and flavor stabilization." },
    deduction: 0, factor: null
  },
];

function analyzeIngredientsLocal(text) {
  const lower = text.toLowerCase();
  const harmful = [], additives = [], processed = [], safe = [];
  let score = 10;
  const score_breakdown = [];
  const seenTypes = new Set();

  for (const rule of INGREDIENT_RULES) {
    if (rule.match(lower)) {
      const key = rule.item.name;
      if (seenTypes.has(key)) continue;
      seenTypes.add(key);
      if (rule.type === "harmful") harmful.push(rule.item);
      else if (rule.type === "additive") additives.push(rule.item);
      else if (rule.type === "processed") processed.push(rule.item);
      if (rule.deduction > 0) {
        score -= rule.deduction;
        score_breakdown.push({ factor: rule.factor, change: -rule.deduction });
      }
    }
  }

  if (harmful.length === 0 && additives.length === 0 && processed.length === 0) {
    safe.push({ name: "Natural Whole Grains / Herbs", note: "Rich in raw micronutrients, free from hazardous synthetic modifiers." });
    safe.push({ name: "Clean Organic Component Base", note: "Zero industrial refining metrics observed." });
    score_breakdown.push({ factor: "Pristine Unprocessed Matrix", change: 0 });
  } else {
    safe.push({ name: "Spices & Condiments", note: "Natural botanical additions that yield trace antioxidant protective markers." });
  }

  const finalScore = Math.max(1, Math.min(10, score));

  // EXPANDED category detection
  let food_category = "Packaged Snack";
  let processing_level = "Processed";
  if (lower.includes("noodle") || lower.includes("maggi") || lower.includes("ramen") || lower.includes("instant")) {
    food_category = "Instant Noodles"; processing_level = "Ultra Processed";
  } else if (lower.includes("chip") || lower.includes("kurkure") || lower.includes("lays") || lower.includes("bingo")) {
    food_category = "Chips"; processing_level = "Ultra Processed";
  } else if (lower.includes("biscuit") || lower.includes("cookie") || lower.includes("bourbon") || lower.includes("oreo") || lower.includes("cream cracker")) {
    food_category = lower.includes("cookie") ? "Cookies" : "Biscuits"; processing_level = "Ultra Processed";
  } else if (lower.includes("chocolate") || lower.includes("cocoa") || lower.includes("choco")) {
    food_category = "Chocolate"; processing_level = "Processed";
  } else if (lower.includes("energy drink") || lower.includes("redbull") || lower.includes("monster")) {
    food_category = "Energy Drinks"; processing_level = "Ultra Processed";
  } else if (lower.includes("juice") || lower.includes("fruit drink")) {
    food_category = "Fruit Juice"; processing_level = "Processed";
  } else if (lower.includes("coke") || lower.includes("soda") || lower.includes("soft drink") || lower.includes("pepsi") || lower.includes("cola")) {
    food_category = "Soft Drinks"; processing_level = "Ultra Processed";
  } else if (lower.includes("cereal") || lower.includes("cornflakes") || lower.includes("muesli")) {
    food_category = "Breakfast Cereal"; processing_level = "Processed";
  } else if (lower.includes("protein bar") || lower.includes("energy bar") || lower.includes("granola bar")) {
    food_category = "Protein Bar"; processing_level = "Processed";
  } else if (lower.includes("candy") || lower.includes("toffee") || lower.includes("gummy") || lower.includes("lollipop")) {
    food_category = "Candy"; processing_level = "Ultra Processed";
  } else if (lower.includes("ice cream") || lower.includes("frozen dessert") || lower.includes("gelato")) {
    food_category = "Ice Cream"; processing_level = "Ultra Processed";
  } else if (lower.includes("potato")) {
    food_category = "Chips"; processing_level = "Ultra Processed";
  }

  const advisories = [];
  if (finalScore < 5) {
    advisories.push({ title: "Cardiovascular Stress Risk", severity: "Chronic Risk", detail: "Regular exposure to ultra-processed industrial fats causes arterial endothelial hardening and raises LDL particle sizes.", linked: harmful.map(h => h.name).join(", ") || "Refined Lipids" });
    advisories.push({ title: "Metabolic Strain Pathway", severity: "Moderate Risk", detail: "Causes acute high glycemic index loads, straining standard physiological insulin cycles.", linked: "Refined Simple Sugars" });
  } else if (finalScore < 7) {
    advisories.push({ title: "Gut Microbiome Interference", severity: "Moderate Risk", detail: "Chemical binding emulsifiers and anti-caking properties can erode natural protective stomach mucosal walls.", linked: additives.map(a => a.name).join(", ") || "Food Additives" });
  } else {
    advisories.push({ title: "Safe Metabolic Envelope", severity: "Low Risk", detail: "Clean chemical landscape. Product is perfectly fine for routine supplementary baseline dietary additions.", linked: "Whole Organic Components" });
  }

  return { health_score: finalScore, food_category, processing_level, ingredients_breakdown: { harmful, additives, processed, safe }, score_breakdown, advisories };
}

function analyzeNutritionLocal(values) {
  const limits = { calories: 250, protein: 4, carbohydrates: 35, sugar: 8, added_sugar: 4, total_fat: 9, saturated_fat: 3, trans_fat: 0, sodium: 350 };
  const units = { calories: "kcal", protein: "g", carbohydrates: "g", sugar: "g", added_sugar: "g", total_fat: "g", saturated_fat: "g", trans_fat: "g", sodium: "mg" };
  const labels = { calories: "Calories", protein: "Protein", carbohydrates: "Carbohydrates", sugar: "Sugar", added_sugar: "Added Sugar", total_fat: "Total Fat", saturated_fat: "Saturated Fat", trans_fat: "Trans Fat", sodium: "Sodium" };
  const concerns = [];
  let scoreDeductions = 0;
  const score_breakdown = [];

  Object.keys(limits).forEach(key => {
    const val = parseFloat(values[key]) || 0;
    const limitVal = limits[key];
    let risk = "Safe", excess_percent = 0;
    if (limitVal > 0 && val > limitVal) {
      excess_percent = Math.round(((val - limitVal) / limitVal) * 100);
      if (excess_percent > 80) { risk = "High Risk"; scoreDeductions += 2.0; score_breakdown.push({ factor: `Excessive ${labels[key]}`, change: -2.0 }); }
      else { risk = "Moderate"; scoreDeductions += 1.0; score_breakdown.push({ factor: `Elevated ${labels[key]}`, change: -1.0 }); }
    } else if (key === "protein" && val >= limitVal) {
      scoreDeductions -= 0.5; score_breakdown.push({ factor: "Optimal Protein Composition", change: 0.5 });
    }
    concerns.push({ nutrient: labels[key], detected: val, unit: units[key], safe_limit: limitVal, excess_percent, risk });
  });

  const nutrition_score = Math.max(1, Math.min(10, 10 - scoreDeductions));
  return { nutrition: values, nutrition_score, concerns, score_breakdown };
}

function generateCombinedReportLocal(iScore, nScore, category, harmful, additives) {
  const final_score = parseFloat(((iScore + nScore) / 2).toFixed(1));
  let risk_level = "Low", consumption_label = "✅ SAFE TO CONSUME INTERMITTENTLY", verdict_text = "This item presents clean chemical metrics and falls into safe baseline daily nutritional allocations.", recommendation = "Good formulation choice. Can be comfortably added to standard hostel pantry rations.";
  if (final_score < 4.5) { risk_level = "High"; consumption_label = "🛑 AVOID OR REDUCE DRASTICALLY"; verdict_text = `Classified as an ultra-processed option under '${category}', this product contains heavy industrial compounds that burden natural digestive efficiency.`; recommendation = "Swap this immediately for non-fried snacks to clean up physical lethargy metrics."; }
  else if (final_score < 7) { risk_level = "Moderate"; consumption_label = "⚠️ REGULATED MODERATION ADVISEMENT"; verdict_text = `An acceptable intermediate bridge item, but contains high structural preservation markers that compromise long term holistic nutrition targets.`; recommendation = "Keep caps restricted to once or twice a week max. Supplement with fresh water intake."; }
  const major_concerns = [];
  if (harmful.length > 0) major_concerns.push(...harmful.map(h => h.name));
  if (additives.length > 0) major_concerns.push(...additives.map(a => a.code || a.name));
  if (major_concerns.length === 0) major_concerns.push("Industrial Micro-processing footprint");
  const alternatives = [
    { emoji: "🥜", name: "Roasted Makhana", why: "Zero trans fat, high pure vegetable protein" },
    { emoji: "🌰", name: "Spiced Roasted Chana", why: "Rich in active dietary soluble fiber fibers" },
    { emoji: "🍿", name: "Air Popped Corn", why: "Minimal processing steps, cleaner profile" },
    { emoji: "🍬", name: "Peanut Jaggery Chikki", why: "Clean energy synthesis without corn syrup additives" }
  ];
  return { ingredient_score: iScore, nutrition_score: nScore, final_score, major_concerns: major_concerns.slice(0, 4), consumption_label, verdict: { risk_level, verdict: verdict_text, recommendation }, alternatives };
}

/* ═══════════════════════════════════════════════════════════════════════════
   IMAGE PREPROCESSING FOR OCR
══════════════════════════════════════════════════════════════════════════════ */
async function preprocessImageForOcr(file) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      // Scale up for better OCR
      const scale = Math.max(1, Math.min(3, 1800 / Math.max(img.width, img.height)));
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Convert to grayscale
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        // Increase contrast: apply S-curve
        const enhanced = Math.min(255, Math.max(0, (gray - 128) * 1.6 + 128));
        // Sharpen via unsharp mask approximation
        data[i] = data[i + 1] = data[i + 2] = enhanced;
      }
      ctx.putImageData(imageData, 0, 0);

      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url);
        resolve(new File([blob], "preprocessed.png", { type: "image/png" }));
      }, "image/png");
    };
    img.src = url;
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   SCAN HISTORY — localStorage
══════════════════════════════════════════════════════════════════════════════ */
const HISTORY_KEY = "iih_scan_history_v1";
function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); } catch { return []; }
}
function saveHistory(items) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, 30))); } catch {}
}
function addToHistory(entry) {
  const h = loadHistory();
  h.unshift({ ...entry, id: Date.now(), scanDate: new Date().toLocaleDateString("en-IN") });
  saveHistory(h);
}

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS & PRIMITIVES
══════════════════════════════════════════════════════════════════════════════ */
function polarToCartesian(cx, cy, r, angleDeg) {
  const a = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy - r * Math.sin(a) };
}
function describeArc(cx, cy, r, startAngle, endAngle) {
  const s = polarToCartesian(cx, cy, r, startAngle);
  const e = polarToCartesian(cx, cy, r, endAngle);
  return `M ${s.x} ${s.y} A ${r} ${r} 0 0 1 ${e.x} ${e.y}`;
}
function riskFromScore(score) {
  if (score == null) return null;
  if (score >= 7) return { label: "Low Risk", color: "var(--emerald)" };
  if (score >= 4) return { label: "Moderate Risk", color: "var(--amber)" };
  return { label: "High Risk", color: "var(--crimson)" };
}
function riskColor(risk) {
  if (risk === "Safe") return "var(--emerald)";
  if (risk === "Moderate") return "var(--amber)";
  return "var(--crimson)";
}
function getSnackMood(score) {
  if (score >= 7) return { image: "/memes/healthy.gif", caption: "Your future self approves this snack." };
  if (score >= 4) return { image: "/memes/moderate.gif", caption: "Control your emotions." };
  return { image: "/memes/highrisk.jpg", caption: "Switch to a healthier option." };
}

function ScoreGauge({ score, label = "Health Score" }) {
  const cx = 110, cy = 115, r = 92;
  const angleFor = (s) => 180 - (Math.max(0, Math.min(10, s)) / 10) * 180;
  const risk = riskFromScore(score);
  const tip = score != null ? polarToCartesian(cx, cy, 72, angleFor(score)) : null;
  return (
    <div className="flex flex-col items-center">
      <p className="text-xs font-semibold text-[var(--ink-soft)] uppercase tracking-wide mb-1">{label}</p>
      <div className="relative w-full max-w-[200px] aspect-[220/130]">
        <svg viewBox="0 0 220 130" className="w-full h-full">
          <path d={describeArc(cx, cy, r, 180, 108)} fill="none" stroke="var(--crimson)" strokeWidth="16" strokeLinecap="round" opacity="0.9" />
          <path d={describeArc(cx, cy, r, 108, 54)} fill="none" stroke="var(--amber)" strokeWidth="16" strokeLinecap="round" opacity="0.9" />
          <path d={describeArc(cx, cy, r, 54, 0)} fill="none" stroke="var(--emerald)" strokeWidth="16" strokeLinecap="round" opacity="0.9" />
          {tip && (<><line x1={cx} y1={cy} x2={tip.x} y2={tip.y} stroke="var(--ink)" strokeWidth="3.5" strokeLinecap="round" /><circle cx={cx} cy={cy} r="7" fill="var(--ink)" /></>)}
        </svg>
        <div className="absolute left-1/2 top-[84%] -translate-x-1/2 -translate-y-1/2 flex items-baseline">
          <span className="font-num font-bold text-3xl" style={{ color: risk ? risk.color : "var(--ink-soft)" }}>{score != null ? score.toFixed(1) : "--"}</span>
          <span className="text-sm text-[var(--ink-soft)] ml-0.5">/10</span>
        </div>
      </div>
      {risk ? (
        <div className="mt-2 text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: `color-mix(in srgb, ${risk.color} 16%, transparent)`, color: risk.color, border: `1px solid color-mix(in srgb, ${risk.color} 35%, transparent)` }}>{risk.label}</div>
      ) : (
        <div className="mt-2 text-xs text-[var(--ink-soft)]">Scan to reveal score</div>
      )}
    </div>
  );
}

function Card({ children, className = "" }) {
  return <div className={`rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_10px_30px_-14px_var(--shadow)] ${className}`}>{children}</div>;
}
function EmptyState({ Icon, text }) {
  return (
    <div className="flex flex-col items-center justify-center text-center gap-2 py-14 text-[var(--ink-soft)]">
      <Icon size={28} className="opacity-60" />
      <p className="text-sm max-w-xs">{text}</p>
    </div>
  );
}
function SectionLabel({ children }) {
  return <p className="text-xs font-semibold text-[var(--ink-soft)] uppercase tracking-wide mb-1">{children}</p>;
}

/* ═══════════════════════════════════════════════════════════════════════════
   OCR CONFIDENCE BADGE
══════════════════════════════════════════════════════════════════════════════ */
function OcrConfidenceBadge({ confidence }) {
  if (confidence == null) return null;
  let color, label;
  if (confidence >= 90) { color = "var(--emerald)"; label = "Excellent OCR Quality"; }
  else if (confidence >= 70) { color = "var(--amber)"; label = "Moderate OCR Quality"; }
  else { color = "var(--crimson)"; label = "Low OCR Quality"; }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold px-2.5 py-1 rounded-full"
          style={{ backgroundColor: `color-mix(in srgb, ${color} 16%, transparent)`, color, border: `1px solid color-mix(in srgb, ${color} 35%, transparent)` }}>
          {Math.round(confidence)}% — {label}
        </span>
      </div>
      {confidence < 70 && (
        <div className="flex items-start gap-2 rounded-xl p-3 text-xs"
          style={{ backgroundColor: `color-mix(in srgb, var(--amber) 10%, var(--surface-2))`, border: "1px solid color-mix(in srgb, var(--amber) 30%, transparent)" }}>
          <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" style={{ color: "var(--amber)" }} />
          <span style={{ color: "var(--amber)" }}>⚠ OCR quality is low. Consider cropping more tightly or retaking the image.</span>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   IMAGE CROP MODAL
══════════════════════════════════════════════════════════════════════════════ */
function CropModal({ imageUrl, onCrop, onCancel }) {
  const containerRef = useRef(null);
  const imgRef = useRef(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [crop, setCrop] = useState({ x: 50, y: 50, w: 200, h: 200 });
  const [dragging, setDragging] = useState(null); // null | 'move' | 'tl' | 'tr' | 'bl' | 'br'
  const startRef = useRef(null);

  function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }

  const MIN_SIZE = 30;

  function onImgLoad() {
    setImgLoaded(true);
    const img = imgRef.current;
    if (!img) return;
    const w = img.clientWidth, h = img.clientHeight;
    const cw = Math.round(w * 0.7), ch = Math.round(h * 0.7);
    setCrop({ x: Math.round((w - cw) / 2), y: Math.round((h - ch) / 2), w: cw, h: ch });
  }

  function startDrag(e, mode) {
    e.preventDefault();
    const pt = e.touches ? e.touches[0] : e;
    startRef.current = { mx: pt.clientX, my: pt.clientY, crop: { ...crop } };
    setDragging(mode);
  }

  useEffect(() => {
    function onMove(e) {
      if (!dragging || !startRef.current) return;
      const pt = e.touches ? e.touches[0] : e;
      const dx = pt.clientX - startRef.current.mx;
      const dy = pt.clientY - startRef.current.my;
      const img = imgRef.current;
      if (!img) return;
      const iw = img.clientWidth, ih = img.clientHeight;
      const sc = startRef.current.crop;

      let { x, y, w, h } = sc;
      if (dragging === "move") {
        x = clamp(sc.x + dx, 0, iw - w);
        y = clamp(sc.y + dy, 0, ih - h);
      } else if (dragging === "tl") {
        const nx = clamp(sc.x + dx, 0, sc.x + sc.w - MIN_SIZE);
        const ny = clamp(sc.y + dy, 0, sc.y + sc.h - MIN_SIZE);
        w = sc.w - (nx - sc.x); h = sc.h - (ny - sc.y); x = nx; y = ny;
      } else if (dragging === "tr") {
        const ny = clamp(sc.y + dy, 0, sc.y + sc.h - MIN_SIZE);
        h = sc.h - (ny - sc.y); y = ny;
        w = clamp(sc.w + dx, MIN_SIZE, iw - sc.x);
      } else if (dragging === "bl") {
        const nx = clamp(sc.x + dx, 0, sc.x + sc.w - MIN_SIZE);
        w = sc.w - (nx - sc.x); x = nx;
        h = clamp(sc.h + dy, MIN_SIZE, ih - sc.y);
      } else if (dragging === "br") {
        w = clamp(sc.w + dx, MIN_SIZE, iw - sc.x);
        h = clamp(sc.h + dy, MIN_SIZE, ih - sc.y);
      }
      setCrop({ x, y, w, h });
    }
    function onUp() { setDragging(null); }
    if (dragging) {
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
      window.addEventListener("touchmove", onMove, { passive: false });
      window.addEventListener("touchend", onUp);
    }
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [dragging]);

  function resetCrop() {
    const img = imgRef.current;
    if (!img) return;
    const w = img.clientWidth, h = img.clientHeight;
    const cw = Math.round(w * 0.7), ch = Math.round(h * 0.7);
    setCrop({ x: Math.round((w - cw) / 2), y: Math.round((h - ch) / 2), w: cw, h: ch });
  }

  function applyCrop() {
    const img = imgRef.current;
    if (!img) return;
    const scaleX = img.naturalWidth / img.clientWidth;
    const scaleY = img.naturalHeight / img.clientHeight;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(crop.w * scaleX);
    canvas.height = Math.round(crop.h * scaleY);
    const ctx = canvas.getContext("2d");
    const srcImg = new Image();
    srcImg.onload = () => {
      ctx.drawImage(srcImg, crop.x * scaleX, crop.y * scaleY, crop.w * scaleX, crop.h * scaleY, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        const file = new File([blob], "cropped.jpg", { type: "image/jpeg" });
        onCrop(file);
      }, "image/jpeg", 0.92);
    };
    srcImg.src = imageUrl;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3">
      <div className="w-full max-w-2xl rounded-2xl overflow-hidden bg-[var(--surface)] shadow-2xl flex flex-col max-h-[95vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <h3 className="font-display font-bold text-base flex items-center gap-2"><Crop size={18} /> Crop Image</h3>
          <p className="text-xs text-[var(--ink-soft)] hidden sm:block">Drag corners to adjust · Move box to reposition</p>
          <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-[var(--surface-2)]"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-[#0a0a0a]">
          <div ref={containerRef} className="crop-container relative inline-block select-none"
            style={{ maxWidth: "100%", maxHeight: "60vh" }}>
            <img ref={imgRef} src={imageUrl} alt="Crop" onLoad={onImgLoad}
              style={{ display: "block", maxWidth: "100%", maxHeight: "60vh", objectFit: "contain", pointerEvents: "none", userSelect: "none" }} />
            {imgLoaded && (
              <div className="crop-selection"
                style={{ left: crop.x, top: crop.y, width: crop.w, height: crop.h }}
                onMouseDown={(e) => startDrag(e, "move")}
                onTouchStart={(e) => startDrag(e, "move")}>
                {/* Grid lines */}
                <div className="crop-grid-line" style={{ left: "33.33%", top: 0, width: 1, height: "100%" }} />
                <div className="crop-grid-line" style={{ left: "66.66%", top: 0, width: 1, height: "100%" }} />
                <div className="crop-grid-line" style={{ left: 0, top: "33.33%", width: "100%", height: 1 }} />
                <div className="crop-grid-line" style={{ left: 0, top: "66.66%", width: "100%", height: 1 }} />
                {/* Handles */}
                <div className="crop-handle tl" onMouseDown={(e) => { e.stopPropagation(); startDrag(e, "tl"); }} onTouchStart={(e) => { e.stopPropagation(); startDrag(e, "tl"); }} />
                <div className="crop-handle tr" onMouseDown={(e) => { e.stopPropagation(); startDrag(e, "tr"); }} onTouchStart={(e) => { e.stopPropagation(); startDrag(e, "tr"); }} />
                <div className="crop-handle bl" onMouseDown={(e) => { e.stopPropagation(); startDrag(e, "bl"); }} onTouchStart={(e) => { e.stopPropagation(); startDrag(e, "bl"); }} />
                <div className="crop-handle br" onMouseDown={(e) => { e.stopPropagation(); startDrag(e, "br"); }} onTouchStart={(e) => { e.stopPropagation(); startDrag(e, "br"); }} />
              </div>
            )}
          </div>
        </div>

        <div className="px-4 pb-4 pt-3 flex gap-2 flex-wrap border-t border-[var(--border)]">
          <button onClick={resetCrop} className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold border border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--border)] transition-colors">
            <RotateCcw size={14} /> Reset Crop
          </button>
          <button onClick={onCancel} className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold border border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--border)] transition-colors">
            <X size={14} /> Cancel
          </button>
          <button onClick={applyCrop} className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-[0.98]"
            style={{ backgroundColor: "var(--emerald)", color: "#06251a" }}>
            <Crop size={14} /> Crop & Continue
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   EDITABLE OCR TEXT PANEL
══════════════════════════════════════════════════════════════════════════════ */
function EditableOcrPanel({ rawText, onAnalyze, onClose, confidence }) {
  const [editedText, setEditedText] = useState(rawText);
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(editedText).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  }

  return (
    <div className="flex flex-col gap-3 animate-fade-in">
      <div className="flex items-center justify-between">
        <h4 className="font-display font-bold text-sm flex items-center gap-2"><FileText size={14} /> Extracted OCR Text</h4>
        {confidence != null && <OcrConfidenceBadge confidence={confidence} />}
      </div>
      <p className="text-xs text-[var(--ink-soft)]">Review and correct any OCR errors before analysis. Your edits will be used.</p>
      <textarea
        className="ocr-textarea"
        value={editedText}
        onChange={(e) => setEditedText(e.target.value)}
        rows={6}
      />
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setEditedText(rawText)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--border)] transition-colors">
          <RotateCcw size={12} /> Reset to OCR
        </button>
        <button onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--border)] transition-colors">
          <Copy size={12} /> {copied ? "Copied!" : "Copy Text"}
        </button>
        <button onClick={() => onAnalyze(editedText)} disabled={!editedText.trim()}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-[0.98] disabled:opacity-40"
          style={{ backgroundColor: "var(--emerald)", color: "#06251a" }}>
          <Sparkles size={12} /> Analyze
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   CAMERA CAPTURE MODAL
══════════════════════════════════════════════════════════════════════════════ */
function CameraModal({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [captured, setCaptured] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } } });
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (e) { setError("Camera access denied. Please allow camera permissions and try again."); }
    }
    startCamera();
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()); };
  }, []);

  function capture() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    canvas.toBlob(blob => {
      const file = new File([blob], "camera-capture.jpg", { type: "image/jpeg" });
      setCaptured(URL.createObjectURL(blob));
      streamRef.current?.getTracks().forEach(t => t.stop());
      onCapture(file, URL.createObjectURL(blob));
    }, "image/jpeg", 0.92);
  }

  function retake() {
    setCaptured(null);
    async function restart() {
      try { const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } } }); streamRef.current = stream; if (videoRef.current) videoRef.current.srcObject = stream; }
      catch (e) { setError("Could not restart camera."); }
    }
    restart();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl overflow-hidden bg-[var(--surface)] shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <h3 className="font-display font-bold text-base flex items-center gap-2"><Camera size={18} /> Take Photo</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--surface-2)]"><X size={16} /></button>
        </div>
        <div className="p-4">
          {error ? (<div className="rounded-xl p-4 text-sm text-[var(--ink-soft)] bg-[var(--surface-2)] text-center">{error}</div>)
            : captured ? (<img src={captured} alt="Captured" className="w-full rounded-xl object-cover" />)
            : (<video ref={videoRef} autoPlay playsInline muted className="rounded-xl" />)}
        </div>
        <div className="px-4 pb-4 flex gap-3">
          {captured ? (
            <button onClick={retake} className="flex-1 rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2 border border-[var(--border)] bg-[var(--surface-2)]">
              <RefreshCw size={15} /> Retake
            </button>
          ) : (
            <button onClick={capture} disabled={!!error} className="flex-1 rounded-xl py-3 text-sm font-bold flex items-center justify-center gap-2" style={{ backgroundColor: "var(--emerald)", color: "#06251a" }}>
              <Camera size={15} /> Capture
            </button>
          )}
          <button onClick={onClose} className="px-4 rounded-xl py-3 text-sm font-semibold border border-[var(--border)] bg-[var(--surface-2)]">Done</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   IMAGE INPUT WITH CROP FLOW
══════════════════════════════════════════════════════════════════════════════ */
function ImageInput({ file, setFile, label, accept = "image/*", onCropComplete }) {
  const [dragActive, setDragActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cropImageUrl, setCropImageUrl] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!file) { setPreviewUrl(null); return; }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function handleFileSelected(f) {
    const url = URL.createObjectURL(f);
    setCropImageUrl(url);
    // Store original for crop reference
    setFile(null); // temporarily clear
    window._pendingOriginalFile = f;
  }

  function handleDrop(e) {
    e.preventDefault(); setDragActive(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFileSelected(f);
  }

  function handleCropDone(croppedFile) {
    setCropImageUrl(null);
    setFile(croppedFile);
    if (onCropComplete) onCropComplete(croppedFile);
  }

  function handleCropCancel() {
    setCropImageUrl(null);
    window._pendingOriginalFile = null;
  }

  return (
    <>
      {cropImageUrl && <CropModal imageUrl={cropImageUrl} onCrop={handleCropDone} onCancel={handleCropCancel} />}
      {showCamera && (
        <CameraModal
          onCapture={(f, url) => { setShowCamera(false); setCropImageUrl(url); window._pendingOriginalFile = f; }}
          onClose={() => setShowCamera(false)} />
      )}
      <div>
        <SectionLabel>{label}</SectionLabel>
        <div className="flex gap-2 mb-2">
          <button onClick={() => inputRef.current?.click()} className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--border)] transition-colors">
            <UploadCloud size={14} /> Upload
          </button>
          <button onClick={() => setShowCamera(true)} className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--border)] transition-colors">
            <Camera size={14} /> Take Photo
          </button>
        </div>
        <div
          onClick={() => !file && inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          className="rounded-xl border-2 border-dashed p-3 text-center cursor-pointer transition-colors"
          style={{ borderColor: dragActive ? "var(--emerald)" : "var(--border)", backgroundColor: dragActive ? "color-mix(in srgb, var(--emerald) 8%, transparent)" : "var(--surface-2)" }}>
          <input ref={inputRef} type="file" accept={accept} className="hidden"
            onChange={(e) => { if (e.target.files?.[0]) handleFileSelected(e.target.files[0]); }} />
          {!file ? (
            <div className="flex flex-col items-center gap-1.5 py-3 text-[var(--ink-soft)]">
              <UploadCloud size={20} />
              <p className="text-xs">Drag & drop or click</p>
              <p className="text-[10px] opacity-60">Image will go through crop → OCR flow</p>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-left">
              {previewUrl && <img src={previewUrl} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{file.name}</p>
                <p className="text-[10px] text-[var(--ink-soft)] mt-0.5 flex items-center gap-1"><Crop size={10} /> Cropped & ready</p>
              </div>
              <button aria-label="Remove" onClick={(e) => { e.stopPropagation(); setFile(null); }}
                className="p-1 rounded-md hover:bg-[var(--border)] flex-shrink-0"><X size={14} /></button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function ScanModeTabs({ mode, setMode }) {
  const modes = [
    { id: "ingredient", label: "📋 Ingredient", desc: "Back label" },
    { id: "nutrition", label: "📊 Nutrition", desc: "Nutrition facts" },
    { id: "combined", label: "📈 Combined", desc: "Full report" },
  ];
  return (
    <div className="flex gap-2 flex-wrap">
      {modes.map(m => (
        <button key={m.id} onClick={() => setMode(m.id)}
          className="flex-1 min-w-[90px] flex flex-col items-center gap-0.5 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all"
          style={mode === m.id
            ? { backgroundColor: "var(--emerald)", color: "#06251a" }
            : { backgroundColor: "var(--surface-2)", color: "var(--ink-soft)", border: "1px solid var(--border)" }}>
          <span>{m.label}</span>
          <span className="text-[10px] font-normal opacity-70">{m.desc}</span>
        </button>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SIDEBAR
══════════════════════════════════════════════════════════════════════════════ */
const MANUAL_FIELDS = [
  { key: "calories", label: "Calories", unit: "kcal" },
  { key: "protein", label: "Protein", unit: "g" },
  { key: "carbohydrates", label: "Carbohydrates", unit: "g" },
  { key: "sugar", label: "Sugar", unit: "g" },
  { key: "added_sugar", label: "Added Sugar", unit: "g" },
  { key: "total_fat", label: "Total Fat", unit: "g" },
  { key: "saturated_fat", label: "Saturated Fat", unit: "g" },
  { key: "trans_fat", label: "Trans Fat", unit: "g" },
  { key: "sodium", label: "Sodium", unit: "mg" },
];

function Sidebar({ scanMode, setScanMode, ingredientFile, setIngredientFile, productName, setProductName, packets, setPackets, costPerPacket, setCostPerPacket, loading, onAnalyze, banner, nutritionValues, setNutritionValues }) {
  const canAnalyze = !loading && (
    (scanMode === "ingredient" && (ingredientFile || productName.trim().length > 0)) ||
    scanMode === "nutrition" ||
    (scanMode === "combined" && (ingredientFile || productName.trim().length > 0))
  );
  const packetSeverity = packets <= 7 ? "var(--emerald)" : packets <= 14 ? "var(--amber)" : "var(--crimson)";

  return (
    <Card className="flex flex-col gap-5">
      <div>
        <h2 className="font-display font-bold text-base">What are you scanning?</h2>
        <p className="text-xs text-[var(--ink-soft)] mt-0.5">Choose scan mode, then upload or photograph the label.</p>
      </div>

      <ScanModeTabs mode={scanMode} setMode={setScanMode} />

      {(scanMode === "ingredient" || scanMode === "combined") && (
        <ImageInput file={ingredientFile} setFile={setIngredientFile} label="📋 Ingredient Label (Back)" />
      )}

      {scanMode === "nutrition" && (
        <div className="rounded-xl p-3 text-xs leading-relaxed" style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--border)" }}>
          🚀 <span className="font-semibold">Local Nutrition Engine Ready</span>
          <br /><br />
          Enter nutrition facts below and click Analyze to generate a report.
        </div>
      )}

      {(scanMode === "nutrition" || scanMode === "combined") && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 flex flex-col gap-4">
          <h3 className="font-display font-bold text-xs uppercase tracking-wider">Nutrition Information (Per 100g or 100ml)</h3>
          <p className="text-[11px] text-[var(--ink-soft)]">Enter the nutrition values exactly as shown on the packet.</p>
          <div className="grid grid-cols-2 gap-3">
            {MANUAL_FIELDS.map(({ key, label, unit }) => (
              <div key={key}>
                <label className="block text-[10px] font-semibold mb-1">{label}</label>
                <div className="flex items-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1">
                  <input type="number" value={nutritionValues[key]}
                    onChange={(e) => setNutritionValues(prev => ({ ...prev, [key]: e.target.value }))}
                    className="w-full bg-transparent outline-none text-xs" placeholder="0" />
                  <span className="text-[10px] text-[var(--ink-soft)] ml-1">{unit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 text-[10px] font-semibold text-[var(--ink-soft)] uppercase tracking-widest">
        <div className="flex-1 h-px bg-[var(--border)]" /> OR <div className="flex-1 h-px bg-[var(--border)]" />
      </div>

      <div>
        <SectionLabel>Enter Product Name Manually</SectionLabel>
        <input type="text" value={productName} onChange={(e) => setProductName(e.target.value)}
          placeholder="e.g. Kurkure Masala Munch"
          className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none"
          onFocus={(e) => (e.target.style.boxShadow = "0 0 0 2px color-mix(in srgb, var(--emerald) 45%, transparent)")}
          onBlur={(e) => (e.target.style.boxShadow = "none")} />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <SectionLabel>Packets per week</SectionLabel>
          <span className="font-num text-sm font-bold px-2 py-0.5 rounded-full" style={{ color: packetSeverity, backgroundColor: `color-mix(in srgb, ${packetSeverity} 15%, transparent)` }}>{packets}</span>
        </div>
        <div className="relative h-2 rounded-full" style={{ background: "linear-gradient(to right, var(--emerald), var(--amber), var(--crimson))" }}>
          <input type="range" min={0} max={21} value={packets} onChange={(e) => setPackets(Number(e.target.value))} className="absolute inset-0 w-full h-2 opacity-0 cursor-pointer" />
          <div className="absolute top-1/2 w-4 h-4 rounded-full bg-white pointer-events-none -translate-y-1/2" style={{ left: `calc(${(packets / 21) * 100}% - 8px)`, border: "2px solid var(--ink)", boxShadow: "0 1px 4px rgba(0,0,0,0.3)" }} />
        </div>
        <div className="flex justify-between text-[10px] text-[var(--ink-soft)] mt-1"><span>0</span><span>21</span></div>
      </div>

      <div>
        <SectionLabel>Average cost per packet (₹)</SectionLabel>
        <div className="mt-1 flex items-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5">
          <IndianRupee size={14} className="text-[var(--ink-soft)] mr-1.5" />
          <input type="number" min={0} value={costPerPacket} onChange={(e) => setCostPerPacket(Number(e.target.value) || 0)} className="w-full bg-transparent text-sm outline-none font-num" />
        </div>
      </div>

      <button disabled={!canAnalyze} onClick={onAnalyze}
        className="w-full rounded-xl py-3 font-display font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ backgroundColor: "var(--emerald)", color: "#06251a" }}>
        {loading ? (<><Loader2 size={16} className="animate-spin" /> Analyzing…</>) : (<>Analyze {scanMode === "ingredient" ? "Ingredients" : scanMode === "nutrition" ? "Nutrition" : "Combined"} 🚀</>)}
      </button>

      {banner && (
        <div className="flex items-start gap-2 text-xs rounded-lg p-2.5 bg-[var(--surface-2)] text-[var(--ink-soft)]">
          <Info size={14} className="mt-0.5 flex-shrink-0" /><span>{banner}</span>
        </div>
      )}
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   HERO CARDS
══════════════════════════════════════════════════════════════════════════════ */
function HeroCards({ ingredientResult, nutritionResult, combinedResult, packets, costPerPacket }) {
  const monthlyBudgetBleed = packets * costPerPacket * 4;
  const mealsLost = (monthlyBudgetBleed / 50).toFixed(1);
  const displayScore = combinedResult?.final_score ?? ingredientResult?.health_score ?? nutritionResult?.nutrition_score ?? null;
  const scoreLabel = combinedResult ? "Final Combined Score" : ingredientResult ? "Ingredient Score" : "Nutrition Score";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Card className="flex flex-col items-center">
        <ScoreGauge score={displayScore} label={scoreLabel} />
        {ingredientResult?.food_category && (
          <div className="mt-2 flex flex-col items-center gap-1">
            <div className="px-3 py-1 rounded-full text-[11px] font-semibold" style={{ backgroundColor: "color-mix(in srgb, var(--emerald) 12%, transparent)", color: "var(--emerald)" }}>
              {ingredientResult.food_category}
            </div>
            {ingredientResult.processing_level && (
              <div className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold"
                style={{
                  backgroundColor: ingredientResult.processing_level === "Ultra Processed" ? "color-mix(in srgb, var(--crimson) 12%, transparent)" : ingredientResult.processing_level === "Processed" ? "color-mix(in srgb, var(--amber) 12%, transparent)" : "color-mix(in srgb, var(--emerald) 12%, transparent)",
                  color: ingredientResult.processing_level === "Ultra Processed" ? "var(--crimson)" : ingredientResult.processing_level === "Processed" ? "var(--amber)" : "var(--emerald)"
                }}>
                {ingredientResult.processing_level}
              </div>
            )}
          </div>
        )}
        {combinedResult && (
          <div className="mt-3 grid grid-cols-2 gap-2 w-full">
            <div className="rounded-lg p-2 text-center" style={{ backgroundColor: "var(--surface-2)" }}>
              <p className="text-[10px] text-[var(--ink-soft)]">Ingredient</p>
              <p className="font-num font-bold text-lg" style={{ color: "var(--emerald)" }}>{combinedResult.ingredient_score}/10</p>
            </div>
            <div className="rounded-lg p-2 text-center" style={{ backgroundColor: "var(--surface-2)" }}>
              <p className="text-[10px] text-[var(--ink-soft)]">Nutrition</p>
              <p className="font-num font-bold text-lg" style={{ color: "var(--amber)" }}>{combinedResult.nutrition_score}/10</p>
            </div>
          </div>
        )}
      </Card>

      <Card>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--ink-soft)] uppercase tracking-wide mb-3">
          <IndianRupee size={13} /> Monthly Budget Bleed
        </div>
        <div className="font-num font-bold text-4xl" style={{ color: "var(--crimson)" }}>₹{monthlyBudgetBleed.toLocaleString("en-IN")}</div>
        <p className="text-xs text-[var(--ink-soft)] mt-2">{packets} packets × ₹{costPerPacket} × 4 weeks</p>
        <div className="mt-4 flex items-center gap-2 p-2 rounded-lg" style={{ backgroundColor: "color-mix(in srgb, var(--amber) 10%, var(--surface-2))" }}>
          <UtensilsCrossed size={14} style={{ color: "var(--amber)" }} />
          <p className="text-xs"><span className="font-num font-bold" style={{ color: "var(--amber)" }}>{mealsLost}</span> canteen meals lost/month</p>
        </div>
      </Card>

      <Card>
        <div className="text-sm font-semibold mb-3">😅 Snack Mood</div>
        {displayScore != null ? (
          (() => {
            const mood = getSnackMood(displayScore);
            return (<><img src={mood.image} alt="Snack mood" className="w-full h-56 mx-auto object-contain rounded-xl" /><p className="text-center text-xs mt-2 text-[var(--ink-soft)]">{mood.caption}</p></>);
          })()
        ) : (<div className="h-56 flex items-center justify-center text-[var(--ink-soft)] text-xs">Scan to see your verdict</div>)}
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   INGREDIENT AUDIT TAB
══════════════════════════════════════════════════════════════════════════════ */
function AuditGroup({ title, Icon, color, items }) {
  if (!items?.length) return null;
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `color-mix(in srgb, ${color} 18%, transparent)`, color }}><Icon size={15} /></span>
        <h3 className="font-display font-bold text-sm">{title}</h3>
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `color-mix(in srgb, ${color} 18%, transparent)`, color }}>{items.length}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {items.map((item, i) => (
          <div key={i} className="rounded-xl p-3" style={{ backgroundColor: `color-mix(in srgb, ${color} 7%, var(--surface))`, border: `1px solid color-mix(in srgb, ${color} 25%, transparent)` }}>
            <p className="text-sm font-semibold flex items-center gap-1.5 flex-wrap">
              {item.name}
              {item.code && <span className="text-[10px] font-num font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: color, color: "#fff" }}>{item.code}</span>}
              {item.riskLevel && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `color-mix(in srgb, ${color} 18%, transparent)`, color }}>{item.riskLevel}</span>}
            </p>
            <p className="text-xs text-[var(--ink-soft)] mt-1">{item.note}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function AuditTab({ result, ocrConfidence, rawOcrText }) {
  if (!result) return <EmptyState Icon={Sparkles} text="Upload an ingredient label or provide text input above." />;
  if (!result.ingredients_breakdown) return <EmptyState Icon={AlertTriangle} text={result.message || "No valid matrix elements parsed."} />;
  const { harmful, additives, safe, processed } = result.ingredients_breakdown;
  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {ocrConfidence != null && (
        <div className="rounded-xl p-3" style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--border)" }}>
          <OcrConfidenceBadge confidence={ocrConfidence} />
        </div>
      )}
      <AuditGroup title="Harmful Ingredients" Icon={AlertTriangle} color="var(--crimson)" items={harmful} />
      <AuditGroup title="Food Additives (INS Codes)" Icon={Skull} color="var(--toxic)" items={additives} />
      {processed?.length > 0 && <AuditGroup title="Processed Components" Icon={Info} color="var(--amber)" items={processed} />}
      <AuditGroup title="Safe / Natural Components" Icon={CheckCircle2} color="var(--emerald)" items={safe} />
      {result?.score_breakdown?.length > 0 && (
        <div>
          <h3 className="font-display font-bold mb-3 flex items-center gap-2"><BarChart2 size={16} /> Score Breakdown</h3>
          <div className="rounded-xl overflow-hidden border border-[var(--border)]">
            {result.score_breakdown.map((item, i) => (
              <div key={i} className="flex justify-between items-center px-4 py-2.5 text-sm border-b border-[var(--border)] last:border-b-0" style={{ backgroundColor: i % 2 === 0 ? "var(--surface)" : "var(--surface-2)" }}>
                <span className="text-[var(--ink-soft)]">{item.factor}</span>
                <span className="font-num font-bold" style={{ color: item.change >= 0 ? "var(--emerald)" : "var(--crimson)" }}>{item.change > 0 ? "+" : ""}{item.change}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   NUTRITION TAB
══════════════════════════════════════════════════════════════════════════════ */
function NutritionBar({ concern }) {
  const { nutrient, detected, unit, safe_limit, excess_percent, risk } = concern;
  const color = riskColor(risk);
  const barPct = risk === "Safe" ? Math.round((detected / (safe_limit || 1)) * 100) : Math.min(100 + excess_percent, 280);
  const displayPct = Math.min(barPct, 100);
  return (
    <div className="mb-4">
      <div className="flex justify-between items-end mb-1">
        <span className="text-sm font-semibold">{nutrient}</span>
        <div className="text-right">
          <span className="font-num text-sm font-bold" style={{ color }}>{detected}{unit}</span>
          {safe_limit > 0 && <span className="text-xs text-[var(--ink-soft)] ml-1">/ {safe_limit}{unit} limit</span>}
        </div>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--surface-2)" }}>
        <div className="h-full rounded-full bar-fill" style={{ width: `${displayPct}%`, backgroundColor: color }} />
      </div>
      {excess_percent > 0 && <p className="text-[11px] font-semibold mt-1" style={{ color }}>⚠ {excess_percent}% above safe limit</p>}
    </div>
  );
}

function NutritionTab({ result }) {
  if (!result) return <EmptyState Icon={BarChart2} text="Enter nutrition values in the sidebar form and hit Analyze." />;
  if (result.error) return <EmptyState Icon={AlertTriangle} text={result.message || "Could not parse nutrition facts."} />;
  const { nutrition, nutrition_score, concerns, score_breakdown } = result;
  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div><h3 className="font-display font-bold text-base">Nutrition Risk Dashboard</h3><p className="text-xs text-[var(--ink-soft)] mt-0.5">Benchmarked against health boundary guidelines</p></div>
        <ScoreGauge score={nutrition_score} label="Nutrition Score" />
      </div>
      {nutrition && Object.keys(nutrition).length > 0 && (
        <div>
          <h4 className="font-display font-bold text-sm mb-2">Detected Values</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(nutrition).map(([key, val]) => (
              <div key={key} className="rounded-xl p-3 text-center" style={{ backgroundColor: "var(--surface-2)" }}>
                <p className="text-[10px] text-[var(--ink-soft)] capitalize">{key.replace(/_/g, " ")}</p>
                <p className="font-num font-bold text-lg">{val}<span className="text-xs font-normal ml-0.5">{key === "sodium" ? "mg" : key === "calories" ? "kcal" : "g"}</span></p>
              </div>
            ))}
          </div>
        </div>
      )}
      {concerns?.length > 0 && (<div><h4 className="font-display font-bold text-sm mb-3">Nutrient vs. Safe Limit</h4>{concerns.map((c, i) => <NutritionBar key={i} concern={c} />)}</div>)}
      {score_breakdown?.length > 0 && (
        <div>
          <h4 className="font-display font-bold text-sm mb-2">Score Calculation</h4>
          <div className="rounded-xl overflow-hidden border border-[var(--border)]">
            {score_breakdown.map((item, i) => (
              <div key={i} className="flex justify-between items-center px-4 py-2.5 text-sm border-b border-[var(--border)] last:border-b-0" style={{ backgroundColor: i % 2 === 0 ? "var(--surface)" : "var(--surface-2)" }}>
                <span className="text-[var(--ink-soft)]">{item.factor}</span>
                <span className="font-num font-bold" style={{ color: item.change >= 0 ? "var(--emerald)" : "var(--crimson)" }}>{item.change > 0 ? "+" : ""}{item.change}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   ADVISORY TAB
══════════════════════════════════════════════════════════════════════════════ */
function AdvisoryTab({ ingredientResult, nutritionResult }) {
  const advisories = ingredientResult?.advisories || [];
  const concerns = (nutritionResult?.concerns || []).filter(c => c.risk !== "Safe");
  if (!advisories.length && !concerns.length) return <EmptyState Icon={Stethoscope} text="Long-term physical indicators populate here following analysis checks." />;
  return (
    <div className="flex flex-col gap-3 animate-fade-in">
      {advisories.map((adv, i) => {
        const color = adv.severity === "Chronic Risk" ? "var(--crimson)" : "var(--amber)";
        return (
          <div key={i} className="rounded-xl p-4 flex gap-3 border-l-4" style={{ borderColor: color, backgroundColor: "var(--surface-2)" }}>
            <Stethoscope size={20} className="flex-shrink-0 mt-0.5" style={{ color }} />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-display font-bold text-sm">{adv.title}</h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide" style={{ backgroundColor: `color-mix(in srgb, ${color} 18%, transparent)`, color }}>{adv.severity}</span>
              </div>
              <p className="text-sm text-[var(--ink-soft)] mt-1.5">{adv.detail}</p>
              <p className="text-xs mt-2 text-[var(--ink-soft)]">Linked component: <span className="font-medium text-[var(--ink)]">{adv.linked}</span></p>
            </div>
          </div>
        );
      })}
      {concerns.length > 0 && (
        <div className="mt-2">
          <h4 className="font-display font-bold text-sm mb-2 flex items-center gap-2"><ShieldAlert size={15} /> Nutrition Bio-Risk Indices</h4>
          {concerns.map((c, i) => (
            <div key={i} className="rounded-xl p-3.5 mb-2 border-l-4" style={{ borderColor: riskColor(c.risk), backgroundColor: "var(--surface-2)" }}>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm">{c.nutrient}</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `color-mix(in srgb, ${riskColor(c.risk)} 18%, transparent)`, color: riskColor(c.risk) }}>{c.risk}</span>
              </div>
              <p className="text-xs text-[var(--ink-soft)] mt-1">Detected: <b>{c.detected}{c.unit}</b> · Limit: <b>{c.safe_limit}{c.unit}</b>{c.excess_percent > 0 && <span style={{ color: riskColor(c.risk) }}> · {c.excess_percent}% over</span>}</p>
            </div>
          ))}
        </div>
      )}
      <p className="text-[11px] text-[var(--ink-soft)] mt-1">Educational layout awareness index—non diagnostic clinical material.</p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMBINED REPORT TAB
══════════════════════════════════════════════════════════════════════════════ */
function CombinedReportTab({ combinedResult, ingredientResult, nutritionResult }) {
  if (!combinedResult) {
    if (ingredientResult || nutritionResult) return (<div className="flex flex-col items-center justify-center gap-3 py-14 text-center text-[var(--ink-soft)]"><Layers size={28} className="opacity-60" /><p className="text-sm max-w-xs">Run a <b>Combined</b> scan and finish both segments to read a compiled report card here.</p></div>);
    return <EmptyState Icon={ClipboardList} text="Execute combined scanning parameters to compile product health summaries." />;
  }
  const { ingredient_score, nutrition_score, final_score, major_concerns, consumption_label, verdict, alternatives } = combinedResult;
  const risk = riskFromScore(final_score);
  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <ScoreGauge score={final_score} label="Final Combined Score" />
        <div className="flex-1 flex flex-col gap-3 w-full">
          <div className="rounded-xl p-4" style={{ backgroundColor: "var(--surface-2)" }}>
            <div className="flex justify-between items-center mb-2"><span className="text-sm text-[var(--ink-soft)]">📋 Ingredient Score</span><span className="font-num font-bold" style={{ color: "var(--emerald)" }}>{ingredient_score}/10</span></div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--border)" }}><div className="h-full rounded-full bar-fill" style={{ width: `${ingredient_score * 10}%`, backgroundColor: "var(--emerald)" }} /></div>
          </div>
          <div className="rounded-xl p-4" style={{ backgroundColor: "var(--surface-2)" }}>
            <div className="flex justify-between items-center mb-2"><span className="text-sm text-[var(--ink-soft)]">📊 Nutrition Score</span><span className="font-num font-bold" style={{ color: "var(--amber)" }}>{nutrition_score}/10</span></div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--border)" }}><div className="h-full rounded-full bar-fill" style={{ width: `${nutrition_score * 10}%`, backgroundColor: "var(--amber)" }} /></div>
          </div>
        </div>
      </div>
      {verdict && (
        <div className="rounded-2xl p-5 border-l-4" style={{ borderColor: risk?.color, backgroundColor: "var(--surface-2)" }}>
          <div className="flex items-center gap-2 mb-3"><Zap size={16} style={{ color: risk?.color }} /><h3 className="font-display font-bold">Analysis Verdict</h3><span className="text-xs font-bold px-2 py-0.5 rounded-full ml-auto" style={{ backgroundColor: `color-mix(in srgb, ${risk?.color} 18%, transparent)`, color: risk?.color }}>{verdict.risk_level} Hazard Scale</span></div>
          <p className="text-sm text-[var(--ink-soft)] leading-relaxed">{verdict.verdict}</p>
          <div className="mt-4 rounded-xl px-4 py-3 text-sm font-semibold" style={{ backgroundColor: `color-mix(in srgb, ${risk?.color} 12%, transparent)`, color: risk?.color }}>{consumption_label}</div>
          <p className="text-xs text-[var(--ink-soft)] mt-2">{verdict.recommendation}</p>
        </div>
      )}
      {major_concerns?.length > 0 && (
        <div>
          <h4 className="font-display font-bold text-sm mb-2 flex items-center gap-2"><AlertTriangle size={14} style={{ color: "var(--crimson)" }} /> Identified Concerns</h4>
          <div className="flex flex-wrap gap-2">
            {major_concerns.map((c, i) => (<span key={i} className="text-xs font-semibold px-3 py-1.5 rounded-full" style={{ backgroundColor: "color-mix(in srgb, var(--crimson) 12%, transparent)", color: "var(--crimson)", border: "1px solid color-mix(in srgb, var(--crimson) 30%, transparent)" }}>{c}</span>))}
          </div>
        </div>
      )}
      {alternatives?.length > 0 && (
        <div>
          <h4 className="font-display font-bold text-sm mb-3 flex items-center gap-2"><TrendingDown size={14} style={{ color: "var(--emerald)" }} /> Healthier Substitution Swaps</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {alternatives.map((alt, i) => (<div key={i} className="rounded-xl p-3 text-center" style={{ backgroundColor: "color-mix(in srgb, var(--emerald) 7%, var(--surface))", border: "1px solid color-mix(in srgb, var(--emerald) 20%, transparent)" }}><div className="text-2xl mb-1">{alt.emoji}</div><p className="font-semibold text-xs">{alt.name}</p><p className="text-[10px] text-[var(--ink-soft)] mt-0.5">{alt.why}</p></div>))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   BUDGET & SWAPS TAB
══════════════════════════════════════════════════════════════════════════════ */
const SWAPS = [
  { name: "Roasted Makhana", emoji: "🥜", price: 15, serving: "30g pack", benefit: "Clean plant protein, unrefined oil metrics" },
  { name: "Peanut Chikki", emoji: "🍬", price: 10, serving: "1 piece", benefit: "Natural iron jaggery, no added corn modifiers" },
  { name: "Roasted Chana", emoji: "🌰", price: 8, serving: "100g pack", benefit: "High amino acid structural complex fiber" },
  { name: "Murmura Chivda", emoji: "🍿", price: 12, serving: "Homemade standard", benefit: "Light complex carbs, zero preservation load" },
];

function SwapsTab({ ingredientResult, packets, costPerPacket }) {
  if (!ingredientResult) return <EmptyState Icon={IndianRupee} text="Initiate an evaluation scan to generate wallet savings indicators." />;
  const monthlyBudgetBleed = packets * costPerPacket * 4;
  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <div className="rounded-xl p-4" style={{ backgroundColor: "color-mix(in srgb, var(--emerald) 10%, var(--surface))", border: "1px solid color-mix(in srgb, var(--emerald) 30%, transparent)" }}>
        <p className="text-sm">By trading out these packaged options for local whole items, you stand to conserve around{" "}<span className="font-num font-bold" style={{ color: "var(--emerald)" }}>₹{Math.max(0, monthlyBudgetBleed - SWAPS[0].price * packets * 4).toLocaleString("en-IN")}/month</span>{" "}— reclaiming essential capital balance.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {SWAPS.map((s, i) => {
          const savings = Math.max(0, monthlyBudgetBleed - s.price * packets * 4);
          return (
            <div key={i} className="rounded-xl p-4 flex flex-col gap-2 border border-[var(--border)] bg-[var(--surface-2)]">
              <div className="text-2xl">{s.emoji}</div>
              <p className="font-display font-bold text-sm leading-tight">{s.name}</p>
              <p className="text-xs text-[var(--ink-soft)]">₹{s.price} · {s.serving}</p>
              <span className="text-[10px] font-semibold px-2 py-1 rounded-full self-start" style={{ backgroundColor: "color-mix(in srgb, var(--emerald) 16%, transparent)", color: "var(--emerald)" }}>{s.benefit}</span>
              <p className="text-sm font-num font-bold mt-1" style={{ color: "var(--emerald)" }}>Save ₹{savings.toLocaleString("en-IN")}/mo</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SCAN HISTORY PAGE
══════════════════════════════════════════════════════════════════════════════ */
function HistoryPage({ onNavigate }) {
  const [history, setHistory] = useState(() => loadHistory());

  function clearHistory() {
    if (window.confirm("Clear all scan history?")) { saveHistory([]); setHistory([]); }
  }

  function removeItem(id) {
    const updated = history.filter(h => h.id !== id);
    saveHistory(updated); setHistory(updated);
  }

  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-xl flex items-center gap-2"><History size={20} /> Scan History</h2>
          <p className="text-xs text-[var(--ink-soft)] mt-0.5">{history.length} saved scan{history.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => onNavigate("compare")} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--border)] transition-colors">
            <GitCompare size={13} /> Compare
          </button>
          {history.length > 0 && (
            <button onClick={clearHistory} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--border)] transition-colors" style={{ color: "var(--crimson)" }}>
              <Trash2 size={13} /> Clear All
            </button>
          )}
        </div>
      </div>

      {history.length === 0 ? (
        <EmptyState Icon={History} text="No scans yet. Analyze a product to populate history." />
      ) : (
        <div className="flex flex-col gap-3">
          {history.map((item) => {
            const risk = riskFromScore(item.finalScore);
            return (
              <div key={item.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 font-num font-bold text-lg"
                  style={{ backgroundColor: `color-mix(in srgb, ${risk?.color || "var(--ink-soft)"} 14%, transparent)`, color: risk?.color || "var(--ink-soft)" }}>
                  {item.finalScore?.toFixed(1) || "--"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{item.productName || "Unknown Product"}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {item.category && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: "color-mix(in srgb, var(--emerald) 12%, transparent)", color: "var(--emerald)" }}>{item.category}</span>}
                    <span className="text-[10px] text-[var(--ink-soft)]">{item.scanDate}</span>
                    {item.ingredientScore != null && <span className="text-[10px] text-[var(--ink-soft)]">Ing: {item.ingredientScore}/10</span>}
                    {item.nutritionScore != null && <span className="text-[10px] text-[var(--ink-soft)]">Nut: {item.nutritionScore}/10</span>}
                  </div>
                </div>
                <button onClick={() => removeItem(item.id)} className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--ink-soft)] flex-shrink-0"><X size={14} /></button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPARE PAGE
══════════════════════════════════════════════════════════════════════════════ */
function ComparePage() {
  const [history] = useState(() => loadHistory());
  const [selected, setSelected] = useState([]);

  function toggleSelect(item) {
    if (selected.find(s => s.id === item.id)) {
      setSelected(selected.filter(s => s.id !== item.id));
    } else if (selected.length < 4) {
      setSelected([...selected, item]);
    }
  }

  const sortedSelected = [...selected].sort((a, b) => (b.finalScore || 0) - (a.finalScore || 0));
  const best = sortedSelected[0];
  const worst = sortedSelected[sortedSelected.length - 1];
  const highestAdditives = selected.length > 0 ? [...selected].sort((a, b) => {
    const aScore = a.ingredientScore || 0; const bScore = b.ingredientScore || 0; return aScore - bScore;
  })[0] : null;

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div>
        <h2 className="font-display font-bold text-xl flex items-center gap-2"><GitCompare size={20} /> Compare Products</h2>
        <p className="text-xs text-[var(--ink-soft)] mt-0.5">Select 2–4 products from your scan history to compare.</p>
      </div>

      {history.length === 0 ? (
        <EmptyState Icon={History} text="No scan history yet. Analyze some products first." />
      ) : (
        <>
          <div>
            <h3 className="font-display font-bold text-sm mb-3">Select Products ({selected.length}/4)</h3>
            <div className="flex flex-col gap-2 max-h-64 overflow-y-auto scrollbar-thin pr-1">
              {history.map((item) => {
                const isSelected = !!selected.find(s => s.id === item.id);
                const risk = riskFromScore(item.finalScore);
                return (
                  <button key={item.id} onClick={() => toggleSelect(item)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all border"
                    style={{
                      borderColor: isSelected ? "var(--emerald)" : "var(--border)",
                      backgroundColor: isSelected ? "color-mix(in srgb, var(--emerald) 8%, var(--surface))" : "var(--surface-2)",
                    }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 font-num font-bold text-sm"
                      style={{ backgroundColor: `color-mix(in srgb, ${risk?.color || "var(--ink-soft)"} 16%, transparent)`, color: risk?.color || "var(--ink-soft)" }}>
                      {item.finalScore?.toFixed(0) || "--"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{item.productName || "Unknown"}</p>
                      <p className="text-[10px] text-[var(--ink-soft)]">{item.category} · {item.scanDate}</p>
                    </div>
                    {isSelected && <CheckCircle2 size={16} style={{ color: "var(--emerald)" }} />}
                  </button>
                );
              })}
            </div>
          </div>

          {selected.length >= 2 && (
            <div className="flex flex-col gap-4 animate-fade-in">
              {/* Summary badges */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl p-4" style={{ backgroundColor: "color-mix(in srgb, var(--emerald) 10%, var(--surface))", border: "1px solid color-mix(in srgb, var(--emerald) 30%, transparent)" }}>
                  <p className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: "var(--emerald)" }}>🏆 Best Overall</p>
                  <p className="font-display font-bold text-sm">{best?.productName || "—"}</p>
                  <p className="text-xs text-[var(--ink-soft)] mt-0.5">Score: {best?.finalScore?.toFixed(1)}/10</p>
                </div>
                <div className="rounded-xl p-4" style={{ backgroundColor: "color-mix(in srgb, var(--toxic) 10%, var(--surface))", border: "1px solid color-mix(in srgb, var(--toxic) 30%, transparent)" }}>
                  <p className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: "var(--toxic)" }}>⚠ Highest Additives</p>
                  <p className="font-display font-bold text-sm">{highestAdditives?.productName || "—"}</p>
                  <p className="text-xs text-[var(--ink-soft)] mt-0.5">Ing: {highestAdditives?.ingredientScore?.toFixed(1)}/10</p>
                </div>
                <div className="rounded-xl p-4" style={{ backgroundColor: "color-mix(in srgb, var(--crimson) 10%, var(--surface))", border: "1px solid color-mix(in srgb, var(--crimson) 30%, transparent)" }}>
                  <p className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: "var(--crimson)" }}>⚠ Highest Risk</p>
                  <p className="font-display font-bold text-sm">{worst?.productName || "—"}</p>
                  <p className="text-xs text-[var(--ink-soft)] mt-0.5">Score: {worst?.finalScore?.toFixed(1)}/10</p>
                </div>
              </div>

              {/* Comparison table */}
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-x-auto">
                <table className="compare-table">
                  <thead>
                    <tr style={{ backgroundColor: "var(--surface-2)" }}>
                      <th>Metric</th>
                      {sortedSelected.map((p, i) => (
                        <th key={p.id} className="relative">
                          {p.productName || "Product"}
                          {i === 0 && <span className="ml-1 text-[var(--emerald)]">🏆</span>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { key: "finalScore", label: "Final Score", fmt: v => `${v?.toFixed(1) || "--"}/10` },
                      { key: "ingredientScore", label: "Ingredient Score", fmt: v => `${v?.toFixed(1) || "--"}/10` },
                      { key: "nutritionScore", label: "Nutrition Score", fmt: v => `${v?.toFixed(1) || "--"}/10` },
                      { key: "category", label: "Category", fmt: v => v || "—" },
                      { key: "finalScore", label: "Risk Level", fmt: v => v >= 7 ? "🟢 Low Risk" : v >= 4 ? "🟡 Moderate" : v != null ? "🔴 High Risk" : "—" },
                      { key: "scanDate", label: "Scanned", fmt: v => v || "—" },
                    ].map(({ key, label, fmt }) => (
                      <tr key={label}>
                        <td className="font-semibold text-[var(--ink-soft)]">{label}</td>
                        {sortedSelected.map((p) => {
                          const val = p[key];
                          const isNumeric = key === "finalScore" || key === "ingredientScore" || key === "nutritionScore";
                          let color = "inherit";
                          if (isNumeric && val != null) {
                            const best = Math.max(...sortedSelected.map(s => s[key] || 0));
                            if (val === best) color = "var(--emerald)";
                          }
                          return <td key={p.id} className="font-num font-semibold" style={{ color }}>{fmt(val)}</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Ranking */}
              <div>
                <h4 className="font-display font-bold text-sm mb-3 flex items-center gap-2"><Star size={14} /> Health Ranking</h4>
                <div className="flex flex-col gap-2">
                  {sortedSelected.map((p, i) => {
                    const risk = riskFromScore(p.finalScore);
                    return (
                      <div key={p.id} className="flex items-center gap-3 rounded-xl p-3" style={{ backgroundColor: "var(--surface-2)" }}>
                        <span className="font-num font-bold text-lg w-7 text-center" style={{ color: i === 0 ? "var(--emerald)" : i === sortedSelected.length - 1 ? "var(--crimson)" : "var(--ink-soft)" }}>#{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{p.productName || "Unknown"}</p>
                          <p className="text-[10px] text-[var(--ink-soft)]">{p.category}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-num font-bold text-sm" style={{ color: risk?.color }}>{p.finalScore?.toFixed(1)}/10</p>
                          <p className="text-[10px] text-[var(--ink-soft)]">{risk?.label}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {selected.length < 2 && selected.length > 0 && (
            <div className="rounded-xl p-4 text-sm text-center text-[var(--ink-soft)]" style={{ backgroundColor: "var(--surface-2)" }}>
              Select at least one more product to compare.
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN APP
══════════════════════════════════════════════════════════════════════════════ */
const API_BASE = "https://is-it-healthy-backend.onrender.com/";

export default function App() {
  const [theme, setTheme] = useState("dark");
  const [page, setPage] = useState("home"); // home | history | compare
  const [activeTab, setActiveTab] = useState("audit");
  const [scanMode, setScanMode] = useState("ingredient");

  const [ingredientFile, setIngredientFile] = useState(null);
  const [productName, setProductName] = useState("");
  const [packets, setPackets] = useState(5);
  const [costPerPacket, setCostPerPacket] = useState(20);
  const [nutritionValues, setNutritionValues] = useState({
    calories: "", protein: "", carbohydrates: "", sugar: "",
    added_sugar: "", total_fat: "", saturated_fat: "", trans_fat: "", sodium: "",
  });

  const [ingredientResult, setIngredientResult] = useState(null);
  const [nutritionResult, setNutritionResult] = useState(null);
  const [combinedResult, setCombinedResult] = useState(null);

  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState(null);

  // OCR state
  const [ocrConfidence, setOcrConfidence] = useState(null);
  const [rawOcrText, setRawOcrText] = useState(null);
  const [showOcrEditor, setShowOcrEditor] = useState(false);
  const [pendingOcrAnalysis, setPendingOcrAnalysis] = useState(null); // function to call after text edit

  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 6000);
    return () => clearTimeout(t);
  }, [banner]);

  useEffect(() => {
    setIngredientResult(null);
    setNutritionResult(null);
    setCombinedResult(null);
    setRawOcrText(null);
    setOcrConfidence(null);
    setShowOcrEditor(false);
  }, [scanMode]);

  async function runOcrWithConfidence(file) {
    const preprocessed = await preprocessImageForOcr(file);
    const { data } = await Tesseract.recognize(preprocessed, "eng");
    const conf = data.confidence ?? null;
    setOcrConfidence(conf);
    return { text: data.text, confidence: conf };
  }

  // Analyze with already-OCR'd text (after user edits)
  function runIngredientAnalysis(text) {
  setShowOcrEditor(false);

  fetch(`${API_BASE}/api/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ text })
  })
    .then(r => r.json())
    .then(data => {
      setIngredientResult(data);

      addToHistory({
        productName: productName || "Ingredient Scan",
        category: data.food_category || "Snack",
        finalScore: data.health_score || 0,
        ingredientScore: data.health_score || 0,
        nutritionScore: null
      });

      setActiveTab("audit");
      setLoading(false);
    })
    .catch(() => {
      const local = analyzeIngredientsLocal(text);

      setIngredientResult(local);

      addToHistory({
        productName: productName || "Ingredient Scan",
        category: local.food_category || "Snack",
        finalScore: local.health_score || 0,
        ingredientScore: local.health_score || 0,
        nutritionScore: null
      });

      setActiveTab("audit");
      setLoading(false);
    });
}

  async function handleAnalyze() {
    setLoading(true);
    setBanner(null);
    setShowOcrEditor(false);

    try {
      if (scanMode === "ingredient") {
        if (!ingredientFile && !productName.trim()) { setBanner("Please supply a valid image label capture or write the product identifier manually."); setLoading(false); return; }

        let textSource = productName;
        if (ingredientFile) {
          const { text, confidence } = await runOcrWithConfidence(ingredientFile);
          textSource = text;
          setRawOcrText(text);
          // Show OCR editor before analysis
          setPendingOcrAnalysis(() => (editedText) => runIngredientAnalysis(editedText));
          setShowOcrEditor(true);
          setLoading(false);
          return;
        }

        const local = analyzeIngredientsLocal(textSource);
        setIngredientResult(local);
        // Save to history
        addToHistory({
  productName: productName || "Unnamed Product",
  category: local.food_category || "Snack",
  finalScore: local.health_score || 0,
  ingredientScore: local.health_score || 0,
  nutritionScore: null
});

        setActiveTab("audit");
      }

      else if (scanMode === "nutrition") {
        const payload = { calories: Number(nutritionValues.calories) || 0, protein: Number(nutritionValues.protein) || 0, carbohydrates: Number(nutritionValues.carbohydrates) || 0, sugar: Number(nutritionValues.sugar) || 0, added_sugar: Number(nutritionValues.added_sugar) || 0, total_fat: Number(nutritionValues.total_fat) || 0, saturated_fat: Number(nutritionValues.saturated_fat) || 0, trans_fat: Number(nutritionValues.trans_fat) || 0, sodium: Number(nutritionValues.sodium) || 0 };
        try {
          const res = await fetch(`${API_BASE}/api/manual-nutrition`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
          const data = await res.json();
          setNutritionResult(data);
          addToHistory({ productName: productName || "Nutrition Scan", nutritionScore: data.nutrition_score, ingredientScore: null, finalScore: data.nutrition_score, category: "Nutrition Scan" });
        } catch {
          const local = analyzeNutritionLocal(payload);
          setNutritionResult(local);
          addToHistory({ productName: productName || "Nutrition Scan", nutritionScore: local.nutrition_score, ingredientScore: null, finalScore: local.nutrition_score, category: "Nutrition Scan" });
        }
        setActiveTab("nutrition");
      }

      else if (scanMode === "combined") {
        if (!ingredientFile && !productName.trim()) { setBanner("Please upload an ingredient label or enter a product name."); setLoading(false); return; }

        const nutritionPayload = { calories: Number(nutritionValues.calories) || 0, protein: Number(nutritionValues.protein) || 0, carbohydrates: Number(nutritionValues.carbohydrates) || 0, sugar: Number(nutritionValues.sugar) || 0, added_sugar: Number(nutritionValues.added_sugar) || 0, total_fat: Number(nutritionValues.total_fat) || 0, saturated_fat: Number(nutritionValues.saturated_fat) || 0, trans_fat: Number(nutritionValues.trans_fat) || 0, sodium: Number(nutritionValues.sodium) || 0 };

        let textSource = productName;
        if (ingredientFile) {
          const { text } = await runOcrWithConfidence(ingredientFile);
          textSource = text;
          setRawOcrText(text);
          // For combined mode, show OCR editor then continue with nutrition
          setPendingOcrAnalysis(() => async (editedText) => {
            setShowOcrEditor(false);
            setLoading(true);
            try {
              let iData, nData;
              try {
                const iRes = await fetch(`${API_BASE}/api/analyze`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: editedText }) });
                iData = await iRes.json();
              } catch { iData = analyzeIngredientsLocal(editedText); }
              setIngredientResult(iData);
              try {
                const nRes = await fetch(`${API_BASE}/api/manual-nutrition`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(nutritionPayload) });
                nData = await nRes.json();
              } catch { nData = analyzeNutritionLocal(nutritionPayload); }
              setNutritionResult(nData);
              const combined = generateCombinedReportLocal(iData.health_score || 0, nData.nutrition_score || 0, iData.food_category || "Unknown", iData.ingredients_breakdown?.harmful || [], iData.ingredients_breakdown?.additives || []);
              setCombinedResult(combined);
              addToHistory({
  productName: productName || "Combined Scan",
  category: iData.food_category || "Snack",
  finalScore: combined.final_score || 0,
  ingredientScore: iData.health_score || 0,
  nutritionScore: nData.nutrition_score || 0
});
              setActiveTab("combined");
            } catch (err) { setBanner("Analysis failed."); }
            finally { setLoading(false); }
          });
          setShowOcrEditor(true);
          setLoading(false);
          return;
        }

        // No image — use text
        let iData;
        try {
          const iRes = await fetch(`${API_BASE}/api/analyze`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: textSource }) });
          iData = await iRes.json();
        } catch { iData = analyzeIngredientsLocal(textSource); }
        setIngredientResult(iData);
        let nData;
        try {
          const nRes = await fetch(`${API_BASE}/api/manual-nutrition`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(nutritionPayload) });
          nData = await nRes.json();
        } catch { nData = analyzeNutritionLocal(nutritionPayload); }
        setNutritionResult(nData);
        const combined = generateCombinedReportLocal(iData.health_score || 0, nData.nutrition_score || 0, iData.food_category || "Unknown", iData.ingredients_breakdown?.harmful || [], iData.ingredients_breakdown?.additives || []);
        setCombinedResult(combined);
        addToHistory({ productName: productName || "Combined Scan", ingredientScore: iData.health_score || 0, nutritionScore: nData.nutrition_score || 0, finalScore: combined.final_score || 0, category: iData.food_category || "Snack" });
        setActiveTab("combined");
      }
    } catch (err) {
      console.error(err);
      setBanner("Local execution pipeline encountered a structural parsing fault.");
    } finally {
      if (!showOcrEditor) setLoading(false);
    }
  }

  const allTabs = [
    { id: "audit", label: "📋 Ingredient Audit", show: scanMode !== "nutrition" },
    { id: "nutrition", label: "📊 Nutrition Panel", show: scanMode !== "ingredient" },
    { id: "combined", label: "📈 Combined Report", show: scanMode === "combined" },
    { id: "advisory", label: "🩺 Advisory", show: true },
    { id: "swaps", label: "💰 Budget Saves", show: true },
  ].filter(t => t.show);

  return (
    <div className={`theme-${theme} app-root min-h-screen bg-[var(--bg)] text-[var(--ink)] transition-colors duration-300`}
      style={{ backgroundImage: "radial-gradient(circle at 12% -10%, color-mix(in srgb, var(--emerald) 10%, transparent), transparent 55%)" }}>
      <GlobalStyle />

      {/* Header */}
      <header className="sticky top-0 z-20 backdrop-blur border-b border-[var(--border)] bg-[var(--bg)]/85">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3.5 flex items-center justify-between gap-2">
          <button onClick={() => setPage("home")} className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: "color-mix(in srgb, var(--emerald) 18%, transparent)", color: "var(--emerald)" }}><Salad size={18} /></span>
            <div className="text-left">
              <h1 className="font-display font-extrabold text-lg leading-none">Is It Healthy?</h1>
              <p className="text-[11px] text-[var(--ink-soft)] hidden sm:block">Scan. Analyze. Choose Better.</p>
            </div>
          </button>

          <nav className="flex items-center gap-1">
            {[
              { id: "home", label: "🔍 Scan" },
              { id: "history", label: "📜 History" },
              { id: "compare", label: "⚖️ Compare" },
            ].map(n => (
              <button key={n.id} onClick={() => setPage(n.id)} className="nav-link px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors"
                style={page === n.id ? { backgroundColor: "var(--surface)", color: "var(--ink)" } : { color: "var(--ink-soft)" }}>
                {n.label}
              </button>
            ))}
            <button aria-label="Toggle theme" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="w-9 h-9 rounded-xl flex items-center justify-center border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)] transition-colors ml-1">
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </nav>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">

        {/* OCR Editor overlay (shown after OCR before analysis) */}
        {showOcrEditor && rawOcrText != null && (
          <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-lg rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-5 shadow-2xl">
              <EditableOcrPanel
                rawText={rawOcrText}
                confidence={ocrConfidence}
                onAnalyze={(text) => { if (pendingOcrAnalysis) pendingOcrAnalysis(text); }}
                onClose={() => setShowOcrEditor(false)}
              />
            </div>
          </div>
        )}

        {/* HOME PAGE */}
        {page === "home" && (
          <div className="flex flex-col lg:flex-row gap-6">
            <aside className="w-full lg:w-[330px] flex-shrink-0">
              <Sidebar
                scanMode={scanMode} setScanMode={setScanMode}
                ingredientFile={ingredientFile} setIngredientFile={setIngredientFile}
                productName={productName} setProductName={setProductName}
                packets={packets} setPackets={setPackets}
                costPerPacket={costPerPacket} setCostPerPacket={setCostPerPacket}
                loading={loading} onAnalyze={handleAnalyze} banner={banner}
                nutritionValues={nutritionValues} setNutritionValues={setNutritionValues}
              />
            </aside>

            <main className="flex-1 flex flex-col gap-6 min-w-0">
              <HeroCards ingredientResult={ingredientResult} nutritionResult={nutritionResult} combinedResult={combinedResult} packets={packets} costPerPacket={costPerPacket} />

              <div>
                <div className="flex gap-1.5 overflow-x-auto scrollbar-thin pb-1">
                  {allTabs.map((t) => (
                    <button key={t.id} onClick={() => setActiveTab(t.id)}
                      className="px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors flex-shrink-0"
                      style={activeTab === t.id
                        ? { backgroundColor: "var(--surface)", color: "var(--ink)", boxShadow: "0 4px 14px -6px var(--shadow)" }
                        : { color: "var(--ink-soft)" }}>
                      {t.label}
                    </button>
                  ))}
                </div>

                <Card className="mt-2">
                  {activeTab === "audit" && <AuditTab result={ingredientResult} ocrConfidence={ocrConfidence} rawOcrText={rawOcrText} />}
                  {activeTab === "nutrition" && <NutritionTab result={nutritionResult} />}
                  {activeTab === "combined" && <CombinedReportTab combinedResult={combinedResult} ingredientResult={ingredientResult} nutritionResult={nutritionResult} />}
                  {activeTab === "advisory" && <AdvisoryTab ingredientResult={ingredientResult} nutritionResult={nutritionResult} />}
                  {activeTab === "swaps" && <SwapsTab ingredientResult={ingredientResult} packets={packets} costPerPacket={costPerPacket} />}
                </Card>
              </div>
            </main>
          </div>
        )}

        {/* HISTORY PAGE */}
        {page === "history" && (
          <HistoryPage onNavigate={setPage} />
        )}

        {/* COMPARE PAGE */}
        {page === "compare" && (
          <ComparePage />
        )}
      </div>

      <footer className="max-w-7xl mx-auto px-4 md:px-6 pb-8 text-center text-[11px] text-[var(--ink-soft)]">
        Built for hostel budgets, optimized for client standalone runtimes.
      </footer>
    </div>
  );
}
