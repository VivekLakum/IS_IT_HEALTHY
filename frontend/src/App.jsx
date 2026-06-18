import React, { useState, useEffect, useRef } from "react";
import Tesseract from "tesseract.js";
import {
  UploadCloud,
  X,
  Loader2,
  Moon,
  Sun,
  IndianRupee,
  UtensilsCrossed,
  AlertTriangle,
  Skull,
  CheckCircle2,
  Stethoscope,
  Sparkles,
  Info,
  Salad,
  Layers,
} from "lucide-react";

/* ---------------------------------------------------------------------- */
/*  THEME / GLOBAL STYLES                                                  */
/*  CSS variables drive every color so the light/dark toggle is a single   */
/*  class swap on the root element instead of duplicated Tailwind trees.   */
/* ---------------------------------------------------------------------- */

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
    `}</style>
  );
}

/* ---------------------------------------------------------------------- */
/*  GAUGE MATH — semicircular "speedometer" dial for the health score      */
/* ---------------------------------------------------------------------- */

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

function getSnackMood(score) {
  if (score >= 7) {
    return {
      image: "/memes/healthy.gif",
      caption: "Your future self approves this snack."
    };
  }

  if (score >= 4) {
    return {
      image: "/memes/moderate.gif",
      caption: "Control your emotions."
    };
  }

  return {
    image: "/memes/highrisk.jpg",
    caption: "Switch to a healthier option."
  };
}

function ScoreGauge({ score }) {
  const cx = 110, cy = 115, r = 92;
  const angleFor = (s) => 180 - (Math.max(0, Math.min(10, s)) / 10) * 180;
  const risk = riskFromScore(score);
  const tip = score != null ? polarToCartesian(cx, cy, 72, angleFor(score)) : null;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-full max-w-[210px] aspect-[220/130]">
        <svg viewBox="0 0 220 130" className="w-full h-full">
          <path d={describeArc(cx, cy, r, 180, 108)} fill="none" stroke="var(--crimson)" strokeWidth="16" strokeLinecap="round" opacity="0.9" />
          <path d={describeArc(cx, cy, r, 108, 54)} fill="none" stroke="var(--amber)" strokeWidth="16" strokeLinecap="round" opacity="0.9" />
          <path d={describeArc(cx, cy, r, 54, 0)} fill="none" stroke="var(--emerald)" strokeWidth="16" strokeLinecap="round" opacity="0.9" />
          {tip && (
            <>
              <line x1={cx} y1={cy} x2={tip.x} y2={tip.y} stroke="var(--ink)" strokeWidth="3.5" strokeLinecap="round" />
              <circle cx={cx} cy={cy} r="7" fill="var(--ink)" />
            </>
          )}
        </svg>
        <div className="absolute left-1/2 top-[84%] -translate-x-1/2 -translate-y-1/2 flex items-baseline">
          <span className="font-num font-bold text-3xl" style={{ color: risk ? risk.color : "var(--ink-soft)" }}>
            {score != null ? score.toFixed(1) : "--"}
          </span>
          <span className="text-sm text-[var(--ink-soft)] ml-0.5">/10</span>
        </div>
      </div>
      {risk ? (
        <div
          className="mt-2 text-xs font-semibold px-2.5 py-1 rounded-full"
          style={{
            backgroundColor: `color-mix(in srgb, ${risk.color} 16%, transparent)`,
            color: risk.color,
            border: `1px solid color-mix(in srgb, ${risk.color} 35%, transparent)`,
          }}
        >
          {risk.label}
        </div>
      ) : (
        <div className="mt-2 text-xs text-[var(--ink-soft)]">Run an analysis to see your score</div>
      )}
    </div>
  );
}
/* ---------------------------------------------------------------------- */
/*  MOCK ANALYSIS DATA — used when the local FastAPI server isn't running  */
/*  so the dashboard stays fully interactive for demos.                    */
/* ---------------------------------------------------------------------- */

const PRESETS = [
  {
    product_name: "Kurkure Masala Munch",
    health_score: 3.2,
    ingredients_breakdown: {
      harmful: [
        { name: "Refined Palm Oil", note: "High in saturated fat, repeatedly fried at high heat." },
        { name: "Excess Sodium", note: "One pack covers ~35-40% of a safe daily salt limit." },
        { name: "Refined Corn & Rice Starch", note: "Low fibre, spikes blood sugar quickly." },
      ],
      additives: [
        { name: "Monosodium Glutamate", code: "INS 621", note: "Flavour enhancer linked to headaches in sensitive people." },
        { name: "Disodium Guanylate", code: "INS 627", note: "Often paired with MSG, derived from yeast or animal sources." },
        { name: "Disodium Inosinate", code: "INS 631", note: "Synthetic flavour booster, not always vegetarian-friendly." },
        { name: "Caramel Colour", code: "INS 150d", note: "Processed colourant flagged for high-heat byproducts." },
      ],
      safe: [
        { name: "Corn Meal", note: "Base grain, naturally gluten-free." },
        { name: "Rice Meal", note: "Mild, easily digestible carbohydrate." },
        { name: "Cumin & Coriander", note: "Whole spices, no concerns." },
      ],
    },
    advisories: [
      { title: "Hypertension Risk", severity: "Chronic Risk", detail: "Regular high-sodium snacking pushes daily salt intake past recommended limits, straining the heart and kidneys over years.", linked: "Excess Sodium" },
      { title: "Recurring Headaches", severity: "Moderate Risk", detail: "MSG and related flavour-enhancer additives can trigger headaches or mild sensitivity reactions in some people.", linked: "INS 621, INS 627" },
      { title: "Blood Sugar Crashes", severity: "Moderate Risk", detail: "Refined starches digest fast, causing energy dips that make you reach for the next packet sooner.", linked: "Refined Starch" },
    ],
  },
  {
    product_name: "Lay's Classic Salted",
    health_score: 4.4,
    ingredients_breakdown: {
      harmful: [
        { name: "Refined Palm Oil", note: "Deep-fried in bulk, high in saturated fat." },
        { name: "High Sodium Coating", note: "Salt is added for taste, not nutrition." },
      ],
      additives: [
        { name: "Citric Acid", code: "INS 330", note: "Acidity regulator, low risk in small amounts." },
        { name: "Malic Acid", code: "INS 296", note: "Sourness agent, mild concern only in excess." },
      ],
      safe: [
        { name: "Potatoes", note: "Whole vegetable base." },
        { name: "Edible Vegetable Oil", note: "Standard frying medium." },
      ],
    },
    advisories: [
      { title: "Salt-Linked Bloating", severity: "Moderate Risk", detail: "Frequent salty snacking causes water retention and nudges long-term blood pressure upward.", linked: "High Sodium" },
      { title: "Empty Calorie Overload", severity: "Moderate Risk", detail: "Fried potato snacks deliver calories with almost no fibre or protein, leaving you hungry again within the hour.", linked: "Refined Palm Oil" },
    ],
  },
  {
    product_name: "Maggi 2-Minute Masala Noodles",
    health_score: 4.0,
    ingredients_breakdown: {
      harmful: [
        { name: "Refined Wheat Flour (Maida)", note: "Stripped of fibre and bran, digests almost like sugar." },
        { name: "Palm Oil", note: "Used in both the noodle cake and the tastemaker." },
        { name: "High Sodium Tastemaker", note: "One masala sachet alone holds a large share of daily salt." },
      ],
      additives: [
        { name: "Monosodium Glutamate", code: "INS 621", note: "Common in instant noodle masala for an umami boost." },
        { name: "Sodium Benzoate", code: "INS 211", note: "Preservative, fine occasionally but adds to additive load." },
      ],
      safe: [
        { name: "Onion & Garlic Powder", note: "Natural aromatics." },
        { name: "Turmeric", note: "Whole spice, antioxidant properties." },
      ],
    },
    advisories: [
      { title: "Liver & Kidney Load", severity: "Moderate Risk", detail: "A diet heavy in refined flour and preservatives gives your liver and kidneys extra processing work, night after night.", linked: "Maida, INS 211" },
      { title: "Nutrient Gaps", severity: "Moderate Risk", detail: "Relying on instant noodles as a meal replacement skips the protein, fibre and micronutrients your body needs daily.", linked: "Refined Wheat Flour" },
    ],
  },
  {
    product_name: "Choco Pie (Cream-Filled Biscuit)",
    health_score: 2.8,
    ingredients_breakdown: {
      harmful: [
        { name: "Refined Sugar", note: "Stacked across the biscuit, cream and coating." },
        { name: "Hydrogenated Vegetable Fat", note: 'A source of trans fats even when labelled "0 trans fat" in fine print.' },
        { name: "Refined Wheat Flour", note: "Low-fibre base, easy to overeat." },
      ],
      additives: [
        { name: "Mono- and Diglycerides", code: "INS 471", note: "Emulsifier keeping the cream stable; a marker of heavy processing." },
        { name: "Ammonium Bicarbonate", code: "INS 503", note: "Raising agent, harmless in small doses but heavily processed." },
      ],
      safe: [
        { name: "Cocoa Powder", note: "Adds genuine chocolate flavour." },
        { name: "Milk Solids", note: "Some real dairy content." },
      ],
    },
    advisories: [
      { title: "Blood Sugar Rollercoaster", severity: "Chronic Risk", detail: "Sugar-on-sugar formulation spikes glucose fast and drops it hard, fuelling cravings within the hour.", linked: "Refined Sugar" },
      { title: "Cardiovascular Strain", severity: "Chronic Risk", detail: "Hydrogenated fats raise bad cholesterol over time, even in small, frequent doses.", linked: "Hydrogenated Vegetable Fat" },
    ],
  },
];

const SWAPS = [
  { name: "Roasted Makhana", emoji: "🥜", price: 15, serving: "30g pack", benefit: "High protein, roasted not fried" },
  { name: "Peanut Chikki", emoji: "🍬", price: 10, serving: "1 piece", benefit: "Jaggery + protein, no preservatives" },
  { name: "Roasted Chana", emoji: "🌰", price: 8, serving: "100g pack", benefit: "Fibre + protein powerhouse" },
  { name: "Murmura Chivda", emoji: "🍿", price: 12, serving: "homemade pack", benefit: "Light, baked, spice it yourself" },
];

function pickPreset(input) {
  const q = (input || "").toLowerCase();
  if (q.includes("maggi") || q.includes("noodle")) return PRESETS[2];
  if (q.includes("lay") || q.includes("chip") || q.includes("potato")) return PRESETS[1];
  if (q.includes("choco") || q.includes("pie") || q.includes("biscuit")) return PRESETS[3];
  if (q.includes("kurkure")) return PRESETS[0];
  return PRESETS[Math.floor(Math.random() * PRESETS.length)];
}

/* ---------------------------------------------------------------------- */
/*  SMALL SHARED PIECES                                                    */
/* ---------------------------------------------------------------------- */

function Card({ children, className = "" }) {
  return (
    <div
      className={`rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_10px_30px_-14px_var(--shadow)] transition-transform duration-300 hover:-translate-y-0.5 ${className}`}
    >
      {children}
    </div>
  );
}

function EmptyState({ Icon, text }) {
  return (
    <div className="flex flex-col items-center justify-center text-center gap-2 py-14 text-[var(--ink-soft)]">
      <Icon size={28} className="opacity-60" />
      <p className="text-sm max-w-xs">{text}</p>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  SIDEBAR — uploader, manual entry, sliders, analyze button              */
/* ---------------------------------------------------------------------- */

function Sidebar({
  file, setFile,
  productName, setProductName,
  packets, setPackets,
  costPerPacket, setCostPerPacket,
  loading, onAnalyze,
  banner,
}) {
  const [dragActive, setDragActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!file) { setPreviewUrl(null); return; }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function handleDrop(e) {
    e.preventDefault();
    setDragActive(false);
    const f = e.dataTransfer.files?.[0];
    if (f) setFile(f);
  }

  const packetSeverity = packets <= 7 ? "var(--emerald)" : packets <= 14 ? "var(--amber)" : "var(--crimson)";
  const canAnalyze = !loading && (file || productName.trim().length > 0);

  return (
    <Card className="flex flex-col gap-5">
      <div>
        <h2 className="font-display font-bold text-base">Tell us what you're snacking on</h2>
        <p className="text-xs text-[var(--ink-soft)] mt-0.5">A photo of the label works best — or just type the name.</p>
      </div>

      {/* Drag and drop uploader */}
      <div>
        <label className="text-xs font-semibold text-[var(--ink-soft)] uppercase tracking-wide">📸 Upload Ingredient Label Image</label>
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          className="mt-2 rounded-xl border-2 border-dashed p-4 text-center cursor-pointer transition-colors"
          style={{
            borderColor: dragActive ? "var(--emerald)" : "var(--border)",
            backgroundColor: dragActive ? "color-mix(in srgb, var(--emerald) 8%, transparent)" : "var(--surface-2)",
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            aria-label="Upload ingredient label image"
            className="hidden"
            onChange={(e) => { if (e.target.files?.[0]) setFile(e.target.files[0]); }}
          />
          {!file ? (
            <div className="flex flex-col items-center gap-1.5 py-3 text-[var(--ink-soft)]">
              <UploadCloud size={22} />
              <p className="text-xs">Drag & drop, or click to browse</p>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-left">
              {previewUrl && <img src={previewUrl} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />}
              <p className="text-xs font-medium truncate flex-1">{file.name}</p>
              <button
                aria-label="Remove uploaded file"
                onClick={(e) => { e.stopPropagation(); setFile(null); }}
                className="p-1 rounded-md hover:bg-[var(--border)] flex-shrink-0"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 text-[10px] font-semibold text-[var(--ink-soft)] uppercase tracking-widest">
        <div className="flex-1 h-px bg-[var(--border)]" /> OR <div className="flex-1 h-px bg-[var(--border)]" />
      </div>

      {/* Manual entry */}
      <div>
        <label className="text-xs font-semibold text-[var(--ink-soft)] uppercase tracking-wide">Or Enter Product Name Manually</label>
        <input
          type="text"
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
          placeholder="e.g. Kurkure Masala Munch"
          className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none focus:ring-2 ring-offset-0"
          style={{ caretColor: "var(--emerald)", boxShadow: "none" }}
          onFocus={(e) => (e.target.style.boxShadow = "0 0 0 2px color-mix(in srgb, var(--emerald) 45%, transparent)")}
          onBlur={(e) => (e.target.style.boxShadow = "none")}
        />
      </div>

      {/* Slider */}
      <div>
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-[var(--ink-soft)] uppercase tracking-wide">Packets of junk food eaten / week?</label>
          <span className="font-num text-sm font-bold px-2 py-0.5 rounded-full" style={{ color: packetSeverity, backgroundColor: `color-mix(in srgb, ${packetSeverity} 15%, transparent)` }}>
            {packets}
          </span>
        </div>
        <div className="relative h-2 rounded-full mt-3" style={{ background: "linear-gradient(to right, var(--emerald), var(--amber), var(--crimson))" }}>
          <input
            type="range"
            min={0}
            max={21}
            value={packets}
            onChange={(e) => setPackets(Number(e.target.value))}
            aria-label="Packets of junk food eaten per week"
            className="absolute inset-0 w-full h-2 opacity-0 cursor-pointer"
          />
          <div
            className="absolute top-1/2 w-4 h-4 rounded-full bg-white pointer-events-none -translate-y-1/2"
            style={{ left: `calc(${(packets / 21) * 100}% - 8px)`, border: "2px solid var(--ink)", boxShadow: "0 1px 4px rgba(0,0,0,0.3)" }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-[var(--ink-soft)] mt-1"><span>0</span><span>21</span></div>
      </div>

      {/* Cost per packet */}
      <div>
        <label className="text-xs font-semibold text-[var(--ink-soft)] uppercase tracking-wide">Average cost per packet (₹)</label>
        <div className="mt-2 flex items-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5">
          <IndianRupee size={14} className="text-[var(--ink-soft)] mr-1.5" />
          <input
            type="number"
            min={0}
            value={costPerPacket}
            onChange={(e) => setCostPerPacket(Number(e.target.value) || 0)}
            className="w-full bg-transparent text-sm outline-none font-num"
          />
        </div>
      </div>

      {/* Analyze button */}
      <button
        disabled={!canAnalyze}
        onClick={onAnalyze}
        className="w-full rounded-xl py-3 font-display font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ backgroundColor: "var(--emerald)", color: "#06251a" }}
      >
        {loading ? (<><Loader2 size={16} className="animate-spin" /> Analyzing...</>) : (<>Analyze Product 🚀</>)}
      </button>

      {banner && (
        <div className="flex items-start gap-2 text-xs rounded-lg p-2.5" style={{ backgroundColor: "var(--surface-2)", color: "var(--ink-soft)" }}>
          <Info size={14} className="mt-0.5 flex-shrink-0" />
          <span>{banner}</span>
        </div>
      )}
    </Card>
  );
}

/* ---------------------------------------------------------------------- */
/*  HERO SUMMARY CARDS                                                     */
/* ---------------------------------------------------------------------- */

function HeroCards({ result, packets, costPerPacket }) {
  const monthlyBudgetBleed = packets * costPerPacket * 4;
  const mealsLost = monthlyBudgetBleed / 50;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Card className="flex flex-col items-center">
        <div className="self-start flex items-center gap-1.5 text-xs font-semibold text-[var(--ink-soft)] uppercase tracking-wide mb-1">
          <Sparkles size={13} /> Product Health Score
        </div>
        <ScoreGauge score={result ? result.health_score : null} />
        {result && (
          <>
            <p className="text-xs text-[var(--ink-soft)] mt-1 text-center truncate max-w-full">
              {result.product_name}
            </p>

            {result.food_category && (
              <div
                className="mt-2 px-3 py-1 rounded-full text-[11px] font-semibold"
                style={{
                  backgroundColor: "color-mix(in srgb, var(--emerald) 12%, transparent)",
                  color: "var(--emerald)",
                }}
              >
                {result.food_category}
              </div>
            )}
          </>
        )}
      </Card>

      <Card>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--ink-soft)] uppercase tracking-wide mb-3">
          <IndianRupee size={13} /> Monthly Budget Bleed
        </div>
        <div className="font-num font-bold text-4xl" style={{ color: "var(--crimson)" }}>
          ₹{monthlyBudgetBleed.toLocaleString("en-IN")}
        </div>
        <p className="text-xs text-[var(--ink-soft)] mt-2">{packets} packets × ₹{costPerPacket} × 4 weeks</p>
      </Card>
      <Card>
  <div className="text-sm font-semibold mb-3">
    😅 Snack Mood
  </div>

  {result?.health_score != null && (
    <>
      {(() => {
        const mood = getSnackMood(result.health_score);

        return (
          <>
            <img
              src={mood.image}
              alt="Snack mood"
              className="w-48 h-48 mx-auto object-contain"
            />

            <p className="text-center text-sm mt-3 text-[var(--ink-soft)]">
              {mood.caption}
            </p>
          </>
        );
      })()}
    </>
  )}
</Card>

     
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  TAB 1 — INGREDIENT AUDIT                                               */
/* ---------------------------------------------------------------------- */

function AuditGroup({ title, Icon, color, items }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <span
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `color-mix(in srgb, ${color} 18%, transparent)`, color }}
        >
          <Icon size={15} />
        </span>
        <h3 className="font-display font-bold text-sm">{title}</h3>
        <span
          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
          style={{ backgroundColor: `color-mix(in srgb, ${color} 18%, transparent)`, color }}
        >
          {items.length}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-3">
        {items.map((item, i) => (
          <div
            key={i}
            className="rounded-xl p-3"
            style={{ backgroundColor: `color-mix(in srgb, ${color} 7%, var(--surface))`, border: `1px solid color-mix(in srgb, ${color} 25%, transparent)` }}
          >
            <p className="text-sm font-semibold flex items-center gap-1.5 flex-wrap">
              {item.name}
              {item.code && (
                <span className="text-[10px] font-num font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: color, color: "#fff" }}>
                  {item.code}
                </span>
              )}
            </p>
            <p className="text-xs text-[var(--ink-soft)] mt-1">{item.note}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function AuditTab({ result }) {

  if (!result) {
    return (
      <EmptyState
        Icon={Sparkles}
        text="Upload a label or type a product name, then hit Analyze."
      />
    );
  }

  if (!result.ingredients_breakdown) {
    return (
      <EmptyState
        Icon={AlertTriangle}
        text={
          result.message ||
          "No valid ingredient label detected. Please upload a clear photo of the ingredients section."
        }
      />
    );
  }

  const {
    harmful,
    additives,
    safe,
    processed
  } = result.ingredients_breakdown;

  return (
    <div className="flex flex-col gap-6">

      <AuditGroup
        title="Harmful Ingredients"
        Icon={AlertTriangle}
        color="var(--crimson)"
        items={harmful}
      />

      <AuditGroup
        title="Food Additives (INS Codes)"
        Icon={Skull}
        color="var(--toxic)"
        items={additives}
      />

      {processed?.length > 0 && (
        <AuditGroup
          title="Processed Natural Ingredients"
          Icon={Info}
          color="var(--amber)"
          items={processed}
        />
      )}

      <AuditGroup
        title="Safe / Natural Components"
        Icon={CheckCircle2}
        color="var(--emerald)"
        items={safe}
      />

      {/* Score Breakdown */}
      {result?.score_breakdown?.length > 0 && (
        <div className="card mt-4 p-4">
          <h3 className="font-display font-bold mb-3">
            📊 How We Calculated Your Score
          </h3>

          {result.score_breakdown.map((item, i) => (
            <div
              key={i}
              className="flex justify-between py-2 border-b border-[var(--border)]"
            >
              <span>{item.factor}</span>

              <span
                className={`font-bold ${
                  item.change >= 0
                    ? "text-green-400"
                    : "text-red-400"
                }`}
              >
                {item.change > 0 ? "+" : ""}
                {item.change}
              </span>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  TAB 2 — LONG-TERM HEALTH ADVISORY                                      */
/* ---------------------------------------------------------------------- */

function AdvisoryTab({ result }) {
  if (!result) return <EmptyState Icon={Stethoscope} text="Long-term health risks tied to the detected ingredients will show up here after an analysis." />;
  return (
    <div className="flex flex-col gap-3">
      {result.advisories.map((adv, i) => {
        const color = adv.severity === "Chronic Risk" ? "var(--crimson)" : "var(--amber)";
        return (
          <div key={i} className="rounded-xl p-4 flex gap-3 border-l-4" style={{ borderColor: color, backgroundColor: "var(--surface-2)" }}>
            <Stethoscope size={20} className="flex-shrink-0 mt-0.5" style={{ color }} />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-display font-bold text-sm">{adv.title}</h4>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
                  style={{ backgroundColor: `color-mix(in srgb, ${color} 18%, transparent)`, color }}
                >
                  {adv.severity}
                </span>
              </div>
              <p className="text-sm text-[var(--ink-soft)] mt-1.5">{adv.detail}</p>
              <p className="text-xs mt-2 text-[var(--ink-soft)]">
                Linked to: <span className="font-medium" style={{ color: "var(--ink)" }}>{adv.linked}</span>
              </p>
            </div>
          </div>
        );
      })}
      <p className="text-[11px] text-[var(--ink-soft)] mt-1">This is general awareness info, not a medical diagnosis. See a doctor for real symptoms.</p>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  TAB 3 — BUDGET & SMART SWAPS                                           */
/* ---------------------------------------------------------------------- */

function SwapsTab({ result, packets, costPerPacket }) {
  if (!result) return <EmptyState Icon={IndianRupee} text="Smart, wallet-friendly Indian snack swaps will appear here once you analyze a product." />;

  const monthlyBudgetBleed = packets * costPerPacket * 4;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl p-4" style={{ backgroundColor: "color-mix(in srgb, var(--emerald) 10%, var(--surface))", border: "1px solid color-mix(in srgb, var(--emerald) 30%, transparent)" }}>
        <p className="text-sm">
          At your current pace, swapping every packet for a cheaper local snack could save you up to{" "}
          <span className="font-num font-bold" style={{ color: "var(--emerald)" }}>
            ₹{Math.max(0, monthlyBudgetBleed - SWAPS[0].price * packets * 4).toLocaleString("en-IN")}/month
          </span>{" "}
          — that's real mess meals back on your plate.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {SWAPS.map((s, i) => {
          const altMonthlyCost = s.price * packets * 4;
          const savings = Math.max(0, monthlyBudgetBleed - altMonthlyCost);
          return (
            <div key={i} className="rounded-xl p-4 flex flex-col gap-2 border border-[var(--border)] bg-[var(--surface-2)]">
              <div className="text-2xl">{s.emoji}</div>
              <p className="font-display font-bold text-sm leading-tight">{s.name}</p>
              <p className="text-xs text-[var(--ink-soft)]">₹{s.price} · {s.serving}</p>
              <span
                className="text-[10px] font-semibold px-2 py-1 rounded-full self-start"
                style={{ backgroundColor: "color-mix(in srgb, var(--emerald) 16%, transparent)", color: "var(--emerald)" }}
              >
                {s.benefit}
              </span>
              <p className="text-sm font-num font-bold mt-1" style={{ color: "var(--emerald)" }}>
                Save ₹{savings.toLocaleString("en-IN")}/mo
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  MAIN APP                                                                */
/* ---------------------------------------------------------------------- */

export default function App() {
  const [theme, setTheme] = useState("dark");
  const [activeTab, setActiveTab] = useState("audit");

  // Sidebar inputs
  const [file, setFile] = useState(null);
  const [productName, setProductName] = useState("");
  const [packets, setPackets] = useState(5);
  const [costPerPacket, setCostPerPacket] = useState(20);

  // Backend / analysis state
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [banner, setBanner] = useState(null);

  // Auto-dismiss the demo-mode banner
  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 7000);
    return () => clearTimeout(t);
  }, [banner]);

  /**
   * BACKEND HANDSHAKE
   * Posts the form (label image + manual fields) to a local FastAPI server.
   * If that server isn't reachable (e.g. during a front-end-only preview),
   * it gracefully falls back to a realistic demo analysis so the UI still
   * feels alive. See the chat reply for the axios version of this call.
   */
  async function handleAnalyze() {

if (!file) {
setBanner("Please upload an ingredient label image.");
return;
}

setLoading(true);

try {
const ocrResult = await Tesseract.recognize(
  file,
  "eng"
);

const extractedText = ocrResult.data.text;

console.log("OCR TEXT:", extractedText);

const apiUrl =
  "https://is-it-healthy-backend.onrender.com/api/analyze";

const res = await fetch(apiUrl, {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    text: extractedText
  })
});

if (!res.ok) {
  throw new Error("Server responded with an error");
}

const data = await res.json();

if (data.error) {
  setError(data.message);
  setResult(data);
  return;
}

setError(null);
setResult(data);
setActiveTab("audit");


} catch (err) {


console.error(err);

setResult({
  message: "Failed to analyze image."
});

} finally {
setLoading(false);
}
}


  const tabs = [
    { id: "audit", label: "📋 Ingredient Audit" },
    { id: "advisory", label: "🩺 Long-Term Health Advisory" },
    { id: "swaps", label: "💰 Budget & Smart Swaps" },
  ];

  return (
    <div
      className={`theme-${theme} app-root min-h-screen bg-[var(--bg)] text-[var(--ink)] transition-colors duration-300`}
      style={{ backgroundImage: "radial-gradient(circle at 12% -10%, color-mix(in srgb, var(--emerald) 10%, transparent), transparent 55%)" }}
    >
      <GlobalStyle />

      <header className="sticky top-0 z-20 backdrop-blur border-b border-[var(--border)] bg-[var(--bg)]/85">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: "color-mix(in srgb, var(--emerald) 18%, transparent)", color: "var(--emerald)" }}>
              <Salad size={18} />
            </span>
            <div>
              <h1 className="font-display font-extrabold text-lg leading-none">Is It Healthy?</h1>
              <p className="text-[11px] text-[var(--ink-soft)] hidden sm:block">Snack-Health-meter </p>
            </div>
          </div>
          <button
            aria-label="Toggle theme"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="w-9 h-9 rounded-xl flex items-center justify-center border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)] transition-colors"
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 flex flex-col lg:flex-row gap-6">
        <aside className="w-full lg:w-[320px] flex-shrink-0">
          <Sidebar
            file={file} setFile={setFile}
            productName={productName} setProductName={setProductName}
            packets={packets} setPackets={setPackets}
            costPerPacket={costPerPacket} setCostPerPacket={setCostPerPacket}
            loading={loading} onAnalyze={handleAnalyze}
            banner={banner}
          />
        </aside>

        <main className="flex-1 flex flex-col gap-6 min-w-0">
          <HeroCards result={result} packets={packets} costPerPacket={costPerPacket} />

          <div>
            <div className="flex gap-1.5 overflow-x-auto scrollbar-thin pb-1">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors flex-shrink-0"
                  style={
                    activeTab === t.id
                      ? { backgroundColor: "var(--surface)", color: "var(--ink)", boxShadow: "0 4px 14px -6px var(--shadow)" }
                      : { color: "var(--ink-soft)" }
                  }
                >
                  {t.label}
                </button>
              ))}
            </div>

            <Card className="mt-2">
              {activeTab === "audit" && <AuditTab result={result} />}
              {activeTab === "advisory" && <AdvisoryTab result={result} />}
              {activeTab === "swaps" && <SwapsTab result={result} packets={packets} costPerPacket={costPerPacket} />}
            </Card>
          </div>
        </main>
      </div>

      <footer className="max-w-7xl mx-auto px-4 md:px-6 pb-8 text-center text-[11px] text-[var(--ink-soft)]">
        Built for hostel budgets, not medical advice. Always check labels yourself.
      </footer>
    </div>
  );
}
