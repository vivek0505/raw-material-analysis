import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import pfgLogo from "./assets/brands/PFG Pro Foods Group Logo_favicon.png";
import bakellLogo from "./assets/brands/__Bakell_Logo_Full Color.png";
import jdiLogo from "./assets/brands/JDI_Distribution_Logo.png";
import brewGlitterLogo from "./assets/brands/__Brew Glitter Logo with Tagline 1600x600.png";
import bannerVegan from "./assets/banners/vegan.png";
import bannerBiodegradable from "./assets/banners/biodegradable.png";
import bannerPackagedUSA from "./assets/banners/packaged-in-usa.png";
import bannerMadeUSA from "./assets/banners/made-in-usa.png";
import bannerEUApproved from "./assets/banners/eu-approved.png";
import bannerGMPCertified from "./assets/banners/gmp-certified.png";
import bannerHalal from "./assets/banners/halal.png";
import bannerHACCP from "./assets/banners/haccp.png";
import bannerKosher from "./assets/banners/kosher.png";
import bannerFDA from "./assets/banners/fda.png";

/* ─────────────────────────────────────────────────────────────────
   CORE CONFIG & NUMERIC HELPERS
───────────────────────────────────────────────────────────────── */
const API = "";
const UNIT_TO_G = { lb: 453.592, g: 1, oz: 28.34952, gal: 3785.41, kg: 1000 };
const toG      = (v, u) => parseFloat(v || 0) * (UNIT_TO_G[u] || 1);
const pf       = (v)    => parseFloat(v) || 0;
const fmt      = (v, d=2) => (v==null||isNaN(v)) ? "—" : v.toLocaleString("en-US",{minimumFractionDigits:d,maximumFractionDigits:d});
const fmtC     = (v)    => (v==null||isNaN(v)) ? "—" : "$"+v.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
const fmtC4    = (v)    => (v==null||isNaN(v)) ? "—" : "$"+v.toLocaleString("en-US",{minimumFractionDigits:4,maximumFractionDigits:4});
const fmtP     = (v)    => (v==null||isNaN(v)) ? "—" : (v*100).toFixed(1)+"%";
const pctDisp  = (dec)  => { const n=pf(dec); return n===0?"":parseFloat((n*100).toFixed(6)).toString(); };
const pctParse = (s)    => { const n=parseFloat(s); return isNaN(n)?0:n/100; };
const ALL_UNITS = ["lb","kg","g","oz","gal"];

const palletDisplay = (g, palletG) => {
  if (!palletG || palletG <= 0) return "—";
  const pallets = g / palletG;
  return `${fmt(pallets, pallets >= 10 ? 2 : 3)} pallets`;
};

const piGrams    = (pi,piUnit,moqUnit) => { if(!pi||pf(pi)===0)return 0; const u=(!piUnit||piUnit===moqUnit)?moqUnit:piUnit; return toG(pf(pi),u); };
const gramsToBuy = (needed,moqG,piG)  => { if(piG===0)return Math.max(needed,moqG); const n=moqG>=needed?0:Math.ceil((needed-moqG)/piG); return moqG+n*piG; };
const calcNPIs   = (needed,moqG,piG)  => { if(piG===0||moqG>=needed)return 0; return Math.ceil((needed-moqG)/piG); };

/* ─────────────────────────────────────────────────────────────────
   DEFAULT INGREDIENTS
───────────────────────────────────────────────────────────────── */
const DEFAULT_INGS = [
  {name:"Sugar Con AA",                 moq:2500,unit:"lb",pi:25,piUnit:"",costPerLb:1.86, costUnit:"lb",pct:0.6922,anchorOvr:null,totalOvr:"Y"},
  {name:"Sanding Sugar",                moq:2500,unit:"lb",pi:25,piUnit:"",costPerLb:1.86, costUnit:"lb",pct:0.2307,anchorOvr:null,totalOvr:"Y"},
  {name:"Blueberry Juice Powder",       moq:100, unit:"g", pi:10,piUnit:"",costPerLb:27,   costUnit:"lb",pct:0.0249,anchorOvr:null,totalOvr:"Y"},
  {name:"Raspberry Juice Powder",       moq:100, unit:"g", pi:10,piUnit:"",costPerLb:27,   costUnit:"lb",pct:0.012, anchorOvr:null,totalOvr:"Y"},
  {name:"Beet Juice Powder",            moq:100, unit:"g", pi:10,piUnit:"",costPerLb:20.3, costUnit:"lb",pct:0.0055,anchorOvr:null,totalOvr:"Y"},
  {name:"Citric Acid",                  moq:50,  unit:"lb",pi:5, piUnit:"",costPerLb:0.9,  costUnit:"lb",pct:0.0185,anchorOvr:null,totalOvr:"Y"},
  {name:"Confectioner's glaze",         moq:5,   unit:"gal",pi:1,piUnit:"",costPerLb:35,   costUnit:"lb",pct:0.0055,anchorOvr:null,totalOvr:"Y"},
  {name:"Blueberry Natural Flavor Oil", moq:1,   unit:"oz",pi:1, piUnit:"",costPerLb:31.04,costUnit:"lb",pct:0.0028,anchorOvr:null,totalOvr:"Y"},
  {name:"Raspberry Natural Flavor Oil", moq:1,   unit:"oz",pi:1, piUnit:"",costPerLb:26.93,costUnit:"lb",pct:0.0028,anchorOvr:null,totalOvr:"Y"},
  {name:"Strawberry Natural Flavor Oil",moq:1,   unit:"oz",pi:1, piUnit:"",costPerLb:31.04,costUnit:"lb",pct:0.0028,anchorOvr:null,totalOvr:"Y"},
  {name:"Salt",                         moq:50,  unit:"lb",pi:2, piUnit:"",costPerLb:0.86, costUnit:"lb",pct:0.0023,anchorOvr:null,totalOvr:"Y"},
];
const blankIng = () => ({name:"",moq:"",unit:"lb",pi:"",piUnit:"",costPerLb:"",costUnit:"lb",pct:"",anchorOvr:null,totalOvr:"Y"});

const timeAgo = (ts) => {
  if(!ts) return "";
  const d=new Date(ts), now=new Date(), s=Math.floor((now-d)/1000);
  if(s<60) return "just now";
  if(s<3600) return `${Math.floor(s/60)}m ago`;
  if(s<86400) return `${Math.floor(s/3600)}h ago`;
  return d.toLocaleDateString("en-US",{month:"short",day:"numeric"});
};

/* ── BRAND PRESETS ── */
/* ─────────────────────────────────────────────────────────────────
   BRAND, BANNER & NUTRITION CONFIG
───────────────────────────────────────────────────────────────── */
const BRANDS = {
  pfg: {
    name:"PFG", tagline:"Pro Foods Group",
    website:"www.profoodsgroup.com", address:"Redlands, CA 92354",
    phone:"(877) 355-0695", email:"sales@profoodsgroup.com",
    color:"#4CAF50", accentColor:"#2E7D32", headerBg:"#EEF9F0",
    logo:pfgLogo, logoHeight:58,
  },
  bakell: {
    name:"Bakell", tagline:"Live well. bake well.",
    website:"www.bakell.com", address:"Redlands, CA 92354",
    phone:"(800) 292-2137", email:"sales@bakell.com",
    color:"#B8860B", accentColor:"#8B6914", headerBg:"#f5f0e0",
    logo:bakellLogo, logoHeight:58,
  },
  jdi: {
    name:"JDI Distribution", tagline:"Consumer products. Global brands.",
    website:"www.jdidistribution.com", address:"Redlands, CA 92354",
    phone:"(877) 355-0695", email:"sales@jdidistribution.com",
    color:"#FF5A3D", accentColor:"#D9482E", headerBg:"#FFF2EE",
    logo:jdiLogo, logoHeight:52,
  },
  brewglitter: {
    name:"Brew Glitter", tagline:"Every Drink Will Shimmer",
    website:"www.brewglitter.com", address:"Redlands, CA 92354",
    phone:"(877) 316-5913", email:"sales@brewglitter.com",
    color:"#B8860B", accentColor:"#8B6914", headerBg:"#f5f0e0",
    logo:brewGlitterLogo, logoHeight:60,
  },
  custom: {
    name:"Custom Brand", tagline:"",
    website:"", address:"",
    phone:"", email:"",
    color:"#1E3A7B", accentColor:"#0F2C5E", headerBg:"#EFF6FF",
    logo:null, logoHeight:56,
  },
};

const HEADER_BANNERS = [
  { id:"vegan", label:"Vegan", purpose:"Only for vegan products", img:bannerVegan },
  { id:"biodegradable", label:"Biodegradable", purpose:"Only for biodegradable products", img:bannerBiodegradable },
  { id:"packaged_usa", label:"Packaged in the USA", purpose:"For all products that we manufacture & distribute", img:bannerPackagedUSA },
  { id:"made_usa", label:"Made in the USA", purpose:"For all products that we manufacture & distribute", img:bannerMadeUSA },
  { id:"eu_approved", label:"EU Approved", purpose:"Only for EU compliant products", img:bannerEUApproved },
  { id:"gmp", label:"GMP Certified", purpose:"For all products that we manufacture & distribute", img:bannerGMPCertified },
  { id:"halal", label:"Halal", purpose:"Only for products that we have halal certified", img:bannerHalal },
  { id:"haccp", label:"HACCP", purpose:"Only for products that we manufacture in house", img:bannerHACCP },
  { id:"kosher", label:"Kosher", purpose:"Only for products on our kosher certificate", img:bannerKosher },
  { id:"fda", label:"FDA Registered Facility", purpose:"For all products that we manufacture & distribute", img:bannerFDA },
];

const NF_DV = {
  fat: 78, satFat: 20, chol: 300, sodium: 2300,
  carbs: 275, fiber: 28, addSugar: 50,
  vitD: 20, calcium: 1300, iron: 18, potassium: 4700
};

const NUTRIENT_PROFILE_FIELDS = [
  { key:"cal", label:"Cal", unit:"" },
  { key:"fat", label:"Fat", unit:"g" },
  { key:"satFat", label:"Sat Fat", unit:"g" },
  { key:"transFat", label:"Trans Fat", unit:"g" },
  { key:"chol", label:"Chol", unit:"mg" },
  { key:"sodium", label:"Sodium", unit:"mg" },
  { key:"carbs", label:"Carbs", unit:"g" },
  { key:"fiber", label:"Fiber", unit:"g" },
  { key:"tSugar", label:"T. Sugar", unit:"g" },
  { key:"addSugar", label:"Add. Sugar", unit:"g" },
  { key:"protein", label:"Protein", unit:"g" },
  { key:"vitD", label:"Vit D", unit:"mcg" },
  { key:"calcium", label:"Calcium", unit:"mg" },
  { key:"iron", label:"Iron", unit:"mg" },
  { key:"potassium", label:"Potassium", unit:"mg" },
];

const blankNutrientProfile = (name="") => ({
  name,
  cal:"", fat:"", satFat:"", transFat:"", chol:"", sodium:"",
  carbs:"", fiber:"", tSugar:"", addSugar:"", protein:"",
  vitD:"", calcium:"", iron:"", potassium:""
});

const nfNum = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

const parseServingSizeGrams = (value) => {
  const s = String(value || "").trim();
  const paren = s.match(/\(([0-9]*\.?[0-9]+)\s*g\)/i);
  if (paren) return nfNum(paren[1]);
  const grams = s.match(/([0-9]*\.?[0-9]+)\s*g\b/i);
  if (grams) return nfNum(grams[1]);
  const first = s.match(/([0-9]*\.?[0-9]+)/);
  return first ? nfNum(first[1]) : 0;
};

const formatNfValue = (value, unit="", digits=1) => {
  const n = nfNum(value);
  if (unit === "%") return `${Math.round(n)}%`;
  if (unit === "") return `${Math.round(n)}`;
  if (unit === "g" || unit === "mcg") {
    const out = digits === 0 ? `${Math.round(n)}` : `${Math.round(n * (10 ** digits)) / (10 ** digits)}`;
    return `${parseFloat(out)}${unit}`;
  }
  return `${Math.round(n)}${unit}`;
};

const dvText = (value, dv) => `${Math.max(0, Math.round((nfNum(value) / dv) * 100))}%`;

const calcNutritionFromProfiles = (ings, nutrientProfiles, servingSizeText) => {
  const servingG = parseServingSizeGrams(servingSizeText);
  const rows = (ings || []).filter(i => i.name?.trim() && nfNum(i.pct) > 0);
  const totalPct = rows.reduce((sum, row) => sum + nfNum(row.pct), 0);
  if (!rows.length || totalPct <= 0 || servingG <= 0) return null;

  const profileMap = new Map(
    (nutrientProfiles || [])
      .filter(p => p?.name?.trim())
      .map(p => [p.name.trim().toLowerCase(), p])
  );

  const sumPer100 = (key) => rows.reduce((sum, row) => {
    const share = nfNum(row.pct) / totalPct;
    const profile = profileMap.get(row.name.trim().toLowerCase()) || {};
    return sum + share * nfNum(profile[key]);
  }, 0);

  const per100 = {
    cal: sumPer100("cal"),
    fat: sumPer100("fat"),
    satFat: sumPer100("satFat"),
    transFat: sumPer100("transFat"),
    chol: sumPer100("chol"),
    sodium: sumPer100("sodium"),
    carbs: sumPer100("carbs"),
    fiber: sumPer100("fiber"),
    tSugar: sumPer100("tSugar"),
    addSugar: sumPer100("addSugar"),
    protein: sumPer100("protein"),
    vitD: sumPer100("vitD"),
    calcium: sumPer100("calcium"),
    iron: sumPer100("iron"),
    potassium: sumPer100("potassium"),
  };

  const factor = servingG / 100;
  const raw = Object.fromEntries(Object.entries(per100).map(([k,v]) => [k, v * factor]));

  return {
    servingG,
    raw,
    fields: {
      nf_calories: `${Math.round(raw.cal)}`,
      nf_totalFat: formatNfValue(raw.fat, "g"),
      nf_totalFatDV: dvText(raw.fat, NF_DV.fat),
      nf_satFat: formatNfValue(raw.satFat, "g"),
      nf_satFatDV: dvText(raw.satFat, NF_DV.satFat),
      nf_transFat: formatNfValue(raw.transFat, "g"),
      nf_cholesterol: formatNfValue(raw.chol, "mg", 0),
      nf_cholesterolDV: dvText(raw.chol, NF_DV.chol),
      nf_sodium: formatNfValue(raw.sodium, "mg", 0),
      nf_sodiumDV: dvText(raw.sodium, NF_DV.sodium),
      nf_totalCarb: formatNfValue(raw.carbs, "g"),
      nf_totalCarbDV: dvText(raw.carbs, NF_DV.carbs),
      nf_fiber: formatNfValue(raw.fiber, "g"),
      nf_fiberDV: dvText(raw.fiber, NF_DV.fiber),
      nf_sugars: formatNfValue(raw.tSugar, "g"),
      nf_addedSugars: formatNfValue(raw.addSugar, "g"),
      nf_addedSugarsDV: dvText(raw.addSugar, NF_DV.addSugar),
      nf_protein: formatNfValue(raw.protein, "g"),
      nf_vitD: formatNfValue(raw.vitD, "mcg"),
      nf_vitDDV: dvText(raw.vitD, NF_DV.vitD),
      nf_calcium: formatNfValue(raw.calcium, "mg", 0),
      nf_calciumDV: dvText(raw.calcium, NF_DV.calcium),
      nf_iron: formatNfValue(raw.iron, "mg"),
      nf_ironDV: dvText(raw.iron, NF_DV.iron),
      nf_potassium: formatNfValue(raw.potassium, "mg", 0),
      nf_potassiumDV: dvText(raw.potassium, NF_DV.potassium),
    }
  };
};




const buildDirectNutritionFields = (sp) => {
  const raw = {
    cal: nfNum(sp.nf_directCalories),
    fat: nfNum(sp.nf_directTotalFat),
    satFat: nfNum(sp.nf_directSatFat),
    transFat: nfNum(sp.nf_directTransFat),
    chol: nfNum(sp.nf_directCholesterol),
    sodium: nfNum(sp.nf_directSodium),
    carbs: nfNum(sp.nf_directTotalCarb),
    fiber: nfNum(sp.nf_directFiber),
    tSugar: nfNum(sp.nf_directSugars),
    addSugar: nfNum(sp.nf_directAddedSugars),
    protein: nfNum(sp.nf_directProtein),
    vitD: nfNum(sp.nf_directVitD),
    calcium: nfNum(sp.nf_directCalcium),
    iron: nfNum(sp.nf_directIron),
    potassium: nfNum(sp.nf_directPotassium),
  };
  return {
    raw,
    fields: {
      nf_calories: `${Math.round(raw.cal)}`,
      nf_totalFat: formatNfValue(raw.fat, "g"),
      nf_totalFatDV: dvText(raw.fat, NF_DV.fat),
      nf_satFat: formatNfValue(raw.satFat, "g"),
      nf_satFatDV: dvText(raw.satFat, NF_DV.satFat),
      nf_transFat: formatNfValue(raw.transFat, "g"),
      nf_cholesterol: formatNfValue(raw.chol, "mg", 0),
      nf_cholesterolDV: dvText(raw.chol, NF_DV.chol),
      nf_sodium: formatNfValue(raw.sodium, "mg", 0),
      nf_sodiumDV: dvText(raw.sodium, NF_DV.sodium),
      nf_totalCarb: formatNfValue(raw.carbs, "g"),
      nf_totalCarbDV: dvText(raw.carbs, NF_DV.carbs),
      nf_fiber: formatNfValue(raw.fiber, "g"),
      nf_fiberDV: dvText(raw.fiber, NF_DV.fiber),
      nf_sugars: formatNfValue(raw.tSugar, "g"),
      nf_addedSugars: formatNfValue(raw.addSugar, "g"),
      nf_addedSugarsDV: dvText(raw.addSugar, NF_DV.addSugar),
      nf_protein: formatNfValue(raw.protein, "g"),
      nf_vitD: formatNfValue(raw.vitD, "mcg"),
      nf_vitDDV: dvText(raw.vitD, NF_DV.vitD),
      nf_calcium: formatNfValue(raw.calcium, "mg", 0),
      nf_calciumDV: dvText(raw.calcium, NF_DV.calcium),
      nf_iron: formatNfValue(raw.iron, "mg"),
      nf_ironDV: dvText(raw.iron, NF_DV.iron),
      nf_potassium: formatNfValue(raw.potassium, "mg", 0),
      nf_potassiumDV: dvText(raw.potassium, NF_DV.potassium),
    }
  };
};

/* ─────────────────────────────────────────────────────────────────
   SPEC SHEET PRINT CSS
───────────────────────────────────────────────────────────────── */
const SPEC_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Inter',sans-serif;font-size:11px;color:#1a1a1a;background:#fff}
.page{width:8.5in;min-height:11in;padding:.42in .46in .34in;background:#fff;position:relative}
.hdr{display:grid;grid-template-columns:1fr 220px;gap:20px;align-items:start;margin-bottom:14px;padding-bottom:12px;border-bottom:3px solid __COLOR__}
.hdr-left{display:flex;flex-direction:column;gap:6px}
.hdr-right{display:flex;justify-content:flex-end;align-items:flex-start}
.brand-logo{max-width:220px;max-height:74px;width:auto;height:auto;object-fit:contain;display:block}
.brand-logo-box{display:flex;align-items:flex-start;justify-content:flex-end;min-height:60px}
.brand-name-fallback{font-size:22px;font-weight:800;color:__COLOR__;letter-spacing:-.4px}
.brand-contact{font-size:9.4px;color:#444;line-height:1.62}
.brand-contact a{color:__COLOR__;text-decoration:none}
.doc-title{font-size:18px;font-weight:800;text-transform:uppercase;letter-spacing:.45px;line-height:1.18}
.doc-sub{font-size:11px;font-weight:600;color:#666;text-transform:uppercase;letter-spacing:1px;margin-top:4px}
.banner-band{margin:0 0 14px;border:1px solid #e6e6e6;border-radius:10px;padding:8px 10px;background:#fff}
.banner-row{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:center}
.banner-item{display:flex;align-items:center;justify-content:center;padding:2px 4px}
.banner-item img{max-height:50px;max-width:94px;object-fit:contain;display:block}
.claims-block{margin-top:12px}
.claims-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#333;margin-bottom:4px}
.claims-table{width:100%;border-collapse:collapse}
.claims-table tr{border-bottom:1px solid #eee}
.claims-table td{padding:6px 10px;font-size:10.5px}
.claims-table td:first-child{font-weight:600;color:#444;width:170px;background:#fafafa;white-space:nowrap}
.mgrid{display:grid;grid-template-columns:minmax(0,1fr) 210px;gap:16px;margin-bottom:14px}
.itable{width:100%;border-collapse:collapse}
.itable tr{border-bottom:1px solid #e8e8e8}
.itable td{padding:7px 10px;vertical-align:top;line-height:1.5}
.itable td:first-child{font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#333;width:136px;background:__HBGC__;white-space:nowrap}
.itable td:last-child{font-size:11px;color:#222}
.prod-img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px;border:1px solid #e0e0e0}
.img-ph{width:100%;aspect-ratio:1;background:#f5f5f5;border:2px dashed #ccc;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#aaa;font-size:10px;text-align:center;flex-direction:column;gap:4px}
.sec-hdr{background:__COLOR__;color:#fff;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;padding:6px 12px;margin:12px 0 0}
.stable{width:100%;border-collapse:collapse}
.stable tr{border-bottom:1px solid #eee}
.stable tr:nth-child(even) td{background:#fafafa}
.stable td{padding:6px 10px;font-size:10.5px}
.stable td:first-child{font-weight:600;color:#444;width:160px}
.batch-block{margin-top:12px}
.batch-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#333;margin-bottom:5px}
.batch-sub{font-size:9px;color:#666;margin-bottom:6px}
.batch-table{width:100%;border-collapse:collapse}
.batch-table th,.batch-table td{border:1px solid #d9d9d9;padding:5px 8px;font-size:10px;text-align:left}
.batch-table th{background:#eef2f7;font-weight:700;color:#374151}
.batch-table .section-row td{background:#f6f7fb;font-weight:800;color:#111827;text-transform:none}
.page2-header{display:grid;grid-template-columns:1fr 180px;gap:18px;align-items:start;margin-bottom:14px;padding-bottom:10px;border-bottom:2px solid __COLOR__}
.page-break{page-break-before:always;break-before:page;height:0}
.nf-sec{display:flex;gap:14px;align-items:flex-start;margin-top:4px;page-break-inside:avoid;break-inside:avoid-page}
.nf-stack{display:flex;flex-direction:column;gap:12px;flex:0 0 300px;width:300px}
.nf-wrap{border:2.5px solid #111;padding:6px 8px 7px;width:300px;flex-shrink:0;background:#fff}
.nf-title{font-size:27px;font-weight:900;line-height:1;border-bottom:1px solid #111;padding-bottom:2px;margin-bottom:3px;letter-spacing:-0.6px}
.nf-srv{font-size:10px;line-height:1.15;border-bottom:8px solid #111;padding-bottom:4px;margin-bottom:4px}
.nf-srv b{display:block;font-size:17px;line-height:1.05}
.nf-cal{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:4px solid #111;padding-bottom:2px;margin-bottom:3px}
.nf-cal-lbl{font-size:10px;font-weight:700;line-height:1.05}
.nf-cal-lbl b{display:block;font-size:22px;line-height:1}
.nf-cal-val{font-size:30px;font-weight:900;line-height:.95}
.nf-dvh{font-size:9px;text-align:right;border-bottom:1px solid #999;padding-bottom:2px;margin-bottom:1px;font-weight:700}
.nr{display:flex;justify-content:space-between;align-items:flex-end;font-size:10px;line-height:1.15;padding:2px 0;border-bottom:1px solid #999}
.nr.thick{border-bottom:4px solid #111}
.nr.ind{padding-left:16px}
.nr.ind2{padding-left:28px}
.nr span:first-child b{font-weight:800}
.nf-vits{display:grid;grid-template-columns:1fr 1fr;border-top:8px solid #111;margin-top:3px;padding-top:2px;column-gap:8px}
.nf-vit{font-size:9px;padding:1px 0;border-bottom:1px solid #999}
.nf-foot{font-size:7.5px;border-top:1px solid #111;margin-top:3px;padding-top:4px;line-height:1.25}
.nf-linear-wrap{border:2px solid #111;padding:6px 10px;width:300px;max-width:300px;background:#fff;overflow:hidden}
.nf-linear-line{font-size:7px;line-height:1.22;word-break:break-word}
.nf-linear-facts{font-size:11px;font-weight:900;margin-right:6px;white-space:nowrap}
.nf-linear-line b{font-weight:900}
.nf-ings{flex:1;min-width:0}
.ing-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px}
.ing-text{font-size:10.5px;line-height:1.6;color:#222}
.compliance{font-size:9px;color:#555;line-height:1.7;margin-top:12px;padding-top:8px;border-top:1px solid #ddd}
.compliance b{color:#222}
.pg-foot{font-size:8px;color:#9aa0a6;text-align:center;margin-top:16px;padding-top:8px;border-top:1px solid #eee;font-style:italic}
@media print{
  @page{margin:0;size:letter}
  html,body{background:#fff}
  .page{padding:.38in .42in .28in}
}
`;



/* ─────────────────────────────────────────────────────────────────
   SPEC SHEET HTML HELPERS
───────────────────────────────────────────────────────────────── */
function getBannerText(spec, banner) {
  const fallback = banner.purpose || "";
  const map = {
    vegan: (spec.vegan && spec.vegan.trim()) ? spec.vegan : "Vegan",
    halal: (spec.halal && spec.halal.trim()) ? spec.halal : "Halal certified available on request",
    kosher: (spec.kosher && spec.kosher.trim()) ? spec.kosher : "Kosher certified available on request",
    biodegradable: (spec.bio && spec.bio.trim()) ? spec.bio : "Biodegradable",
    packaged_usa: (spec.packagedUSA && spec.packagedUSA.trim()) ? spec.packagedUSA : "Packaged in the USA",
    made_usa: (spec.madeUSA && spec.madeUSA.trim()) ? spec.madeUSA : "Made in the USA",
    eu_approved: (spec.euApproved && spec.euApproved.trim()) ? spec.euApproved : "EU compliant ingredients available on request",
    gmp: (spec.gmp && spec.gmp.trim()) ? spec.gmp : "GMP documentation available on request",
    haccp: (spec.haccp && spec.haccp.trim()) ? spec.haccp : "HACCP documentation available on request",
    fda: (spec.fda && spec.fda.trim()) ? spec.fda : "Manufactured in an FDA registered facility",
  };
  return map[banner.id] || fallback;
}

function getBannerClaimLabel(banner) {
  const map = {
    vegan: "Vegan Status",
    halal: "Halal Status",
    kosher: "Kosher Status",
    biodegradable: "Biodegradable Status",
    packaged_usa: "Packaged in USA",
    made_usa: "Made in USA",
    eu_approved: "EU Approved",
    gmp: "GMP Certified",
    haccp: "HACCP",
    fda: "FDA Registered Facility",
  };
  return map[banner.id] || banner.label;
}


function buildNutritionPreviewHTML(spec) {
  const showVertical = spec.nf_showVertical !== false;
  const showLinear = !!spec.nf_showLinear;
  const ingText = spec.ingredientsPreviewText || spec.ingredientsOverride || "—";
  const ingPreviews = [];
  if (spec.nf_showIngredientFDA) ingPreviews.push(`<div style="border:1px solid #ddd;border-radius:8px;padding:10px 12px;background:#fff"><div class="ing-title">FDA Ingredient List Preview</div><div class="ing-text"><b>INGREDIENTS:</b> ${ingText}</div></div>`);
  if (spec.nf_showIngredientCanada) ingPreviews.push(`<div style="border:1px solid #ddd;border-radius:8px;padding:10px 12px;background:#fff"><div class="ing-title">Canada Ingredient List Preview</div><div class="ing-text"><b>Ingredients / Ingrédients:</b> ${ingText}</div></div>`);
  if (spec.nf_showIngredientFrench) ingPreviews.push(`<div style="border:1px solid #ddd;border-radius:8px;padding:10px 12px;background:#fff"><div class="ing-title">French Ingredient List Preview</div><div class="ing-text"><b>INGRÉDIENTS :</b> ${ingText}</div></div>`);
  const vertical = `<div class="nf-wrap">
    <div class="nf-title">Nutrition Facts</div>
    <div class="nf-srv">${spec.nf_verticalServings || spec.nf_servings || "—"} servings per container<br/><b>Serving size</b> ${spec.nf_verticalServingSize || spec.nf_servingSize || "—"}</div>
    <div class="nf-cal"><span class="nf-cal-lbl">Amount per serving<br/><b>Calories</b></span><span class="nf-cal-val">${spec.nf_calories||"0"}</span></div>
    <div class="nf-dvh">% Daily Value*</div>
    <div class="nr"><span><b>Total Fat</b> ${spec.nf_totalFat||"0g"}</span><span><b>${spec.nf_totalFatDV||"0%"}</b></span></div>
    <div class="nr ind"><span>Saturated Fat ${spec.nf_satFat||"0g"}</span><span><b>${spec.nf_satFatDV||"0%"}</b></span></div>
    <div class="nr ind"><span><i>Trans</i> Fat ${spec.nf_transFat||"0g"}</span><span></span></div>
    <div class="nr"><span><b>Cholesterol</b> ${spec.nf_cholesterol||"0mg"}</span><span><b>${spec.nf_cholesterolDV||"0%"}</b></span></div>
    <div class="nr"><span><b>Sodium</b> ${spec.nf_sodium||"0mg"}</span><span><b>${spec.nf_sodiumDV||"0%"}</b></span></div>
    <div class="nr"><span><b>Total Carbohydrate</b> ${spec.nf_totalCarb||"0g"}</span><span><b>${spec.nf_totalCarbDV||"0%"}</b></span></div>
    <div class="nr ind"><span>Dietary Fiber ${spec.nf_fiber||"0g"}</span><span><b>${spec.nf_fiberDV||"0%"}</b></span></div>
    <div class="nr ind"><span>Total Sugars ${spec.nf_sugars||"0g"}</span><span></span></div>
    <div class="nr ind2"><span>Includes ${spec.nf_addedSugars||"0g"} Added Sugars</span><span><b>${spec.nf_addedSugarsDV||"0%"}</b></span></div>
    <div class="nr thick"><span><b>Protein</b> ${spec.nf_protein||"0g"}</span><span></span></div>
    <div class="nf-vits">
      <div class="nf-vit">Vitamin D ${spec.nf_vitD||"0mcg"} <span style="float:right;font-weight:800">${spec.nf_vitDDV||"0%"}</span></div>
      <div class="nf-vit">Calcium ${spec.nf_calcium||"0mg"} <span style="float:right;font-weight:800">${spec.nf_calciumDV||"0%"}</span></div>
      <div class="nf-vit">Iron ${spec.nf_iron||"0mg"} <span style="float:right;font-weight:800">${spec.nf_ironDV||"0%"}</span></div>
      <div class="nf-vit">Potassium ${spec.nf_potassium||"0mg"} <span style="float:right;font-weight:800">${spec.nf_potassiumDV||"0%"}</span></div>
    </div>
    <div class="nf-foot">* The % Daily Value (DV) tells you how much a nutrient in a serving of food contributes to a daily diet.</div>
  </div>`;
  const linear = `<div class="nf-linear-wrap">
    <div class="nf-linear-line">
      <span class="nf-linear-facts">Nutrition Facts</span>
      <span>Servings: ${spec.nf_linearServings || spec.nf_servings || "—"}, </span>
      <span><b>Serv. size:</b> ${spec.nf_linearServingSize || spec.nf_servingSize || "—"}, </span>
      <span>Amount per serving: </span>
      <span><b>Calories ${spec.nf_linearCalories || spec.nf_calories || "0"}</b>, </span>
      <span><b>Total Fat</b> ${spec.nf_linearTotalFat || spec.nf_totalFat || "0g"} (${spec.nf_linearTotalFatDV || spec.nf_totalFatDV || "0%"} DV), </span>
      <span>Sat. Fat ${spec.nf_linearSatFat || spec.nf_satFat || "0g"} (${spec.nf_linearSatFatDV || spec.nf_satFatDV || "0%"} DV), </span>
      <span><i>Trans</i> Fat ${spec.nf_linearTransFat || spec.nf_transFat || "0g"}, </span>
      <span><b>Cholest.</b> ${spec.nf_linearCholesterol || spec.nf_cholesterol || "0mg"} (${spec.nf_linearCholesterolDV || spec.nf_cholesterolDV || "0%"} DV), </span>
      <span><b>Sodium</b> ${spec.nf_linearSodium || spec.nf_sodium || "0mg"} (${spec.nf_linearSodiumDV || spec.nf_sodiumDV || "0%"} DV), </span>
      <span><b>Total Carb.</b> ${spec.nf_linearTotalCarb || spec.nf_totalCarb || "0g"} (${spec.nf_linearTotalCarbDV || spec.nf_totalCarbDV || "0%"} DV), </span>
      <span>Fiber ${spec.nf_linearFiber || spec.nf_fiber || "0g"} (${spec.nf_linearFiberDV || spec.nf_fiberDV || "0%"} DV), </span>
      <span>Total Sugars ${spec.nf_linearSugars || spec.nf_sugars || "0g"}, </span>
      <span>Incl. ${spec.nf_linearAddedSugars || spec.nf_addedSugars || "0g"} Added Sugars, ${spec.nf_linearAddedSugarsDV || spec.nf_addedSugarsDV || "0%"} DV, </span>
      <span><b>Protein</b> ${spec.nf_linearProtein || spec.nf_protein || "0g"}, </span>
      <span>Vit. D (${spec.nf_linearVitDDV || spec.nf_vitDDV || "0%"} DV), </span>
      <span>Calcium (${spec.nf_linearCalciumDV || spec.nf_calciumDV || "0%"} DV), </span>
      <span>Iron (${spec.nf_linearIronDV || spec.nf_ironDV || "0%"} DV), </span>
      <span>Potas. (${spec.nf_linearPotassiumDV || spec.nf_potassiumDV || "0%"} DV).</span>
    </div>
  </div>`;
  const parts = [];
  if (showVertical) parts.push(vertical);
  if (showLinear) parts.push(linear);
  return `<!DOCTYPE html><html><head><style>${SPEC_CSS.replaceAll("__COLOR__","#B8860B").replaceAll("__HBGC__","#f5f0e0").replaceAll("__ACCENT__","#8B6914")}</style></head><body><div class="page" style="width:auto;min-height:auto;padding:16px;background:#fff"><div class="nf-sec" style="margin-top:0;page-break-before:auto;break-before:auto"><div class="nf-stack">${parts.join("") || '<div style="font:600 13px Inter,sans-serif;color:#6b7280">No nutrition labels selected.</div>'}</div><div class="nf-ings" style="display:grid;gap:10px">${ingPreviews.join("")}</div></div></div></body></html>`;
}


function buildSpecHTML(brandKey, spec, ings, customBrand, selectedBanners = [], specFormat = "sales") {
  const preset = BRANDS[brandKey];
  const B = brandKey === "custom"
    ? {
        ...preset,
        name: customBrand?.name?.trim() || "Custom Brand",
        tagline: customBrand?.tagline?.trim() || "",
        website: customBrand?.website?.trim() || "",
        address: customBrand?.address?.trim() || "",
        phone: customBrand?.phone?.trim() || "",
        email: customBrand?.email?.trim() || "",
        logo: customBrand?.logo || null,
      }
    : preset;

  const ingNames = ings.filter(i=>i.name?.trim()).map(i=>i.name.trim().toUpperCase()).join(", ");
  const ingDisplay = spec.ingredientsOverride?.trim() || ingNames || "—";
  const css = SPEC_CSS
    .replaceAll("__COLOR__", B.color)
    .replaceAll("__HBGC__", B.headerBg)
    .replaceAll("__ACCENT__", B.accentColor);

  const brandLogoHTML = B.logo
    ? `<div class="brand-logo-box"><img class="brand-logo" src="${B.logo}" alt="${B.name} logo" style="max-height:${B.logoHeight || 56}px"/></div>`
    : `<div class="brand-name-fallback">${B.name}</div>`;

  const brandContactHTML = [B.website, B.address, B.phone, B.email ? `<a href="mailto:${B.email}">${B.email}</a>` : ""]
    .filter(Boolean)
    .join("<br/>");

  const selectedBannerObjects = HEADER_BANNERS.filter(b => selectedBanners.includes(b.id));
  const bannerModes = spec.bannerDisplayModes || {};
  const bannerHTML = selectedBannerObjects.length
    ? `<div class="banner-band"><div class="banner-row">
        ${selectedBannerObjects
          .filter(b => {
            const mode = bannerModes[b.id] || "logo";
            return mode === "logo" || mode === "both";
          })
          .map(b => `<div class="banner-item"><img src="${b.img}" alt="${b.label}" title="${b.label}" /></div>`)
          .join("")}
      </div></div>`
    : "";

  const claimRowsHTML = selectedBannerObjects
    .filter(b => {
      const mode = bannerModes[b.id] || "logo";
      return mode === "request" || mode === "both";
    })
    .map(b => {
      const requestMap = {
        vegan: "Vegan available on request",
        halal: "Halal certified available on request",
        kosher: "Kosher certified available on request",
        biodegradable: "Biodegradable documentation available on request",
        packaged_usa: "Packaged in the USA confirmation available on request",
        made_usa: "Made in the USA confirmation available on request",
        eu_approved: "EU compliant ingredients available on request",
        gmp: "GMP documentation available on request",
        haccp: "HACCP documentation available on request",
        fda: "FDA registered facility confirmation available on request",
      };
      const lineText =
        (bannerModes[b.id] || "logo") === "request"
          ? (requestMap[b.id] || `${b.label} available on request`)
          : (getBannerText(spec, b) || "—");
      return `<tr><td>${getBannerClaimLabel(b)}</td><td>${lineText}</td></tr>`;
    })
    .join("");

  const imgTag = spec.imageDataUrl
    ? `<img class="prod-img" src="${spec.imageDataUrl}" alt="Product"/>`
    : `<div class="img-ph"><span style="font-size:24px">📷</span><span>No image<br/>uploaded</span></div>`;

  const headerLeftHTML = `
      <div class="hdr-left">
        <div>
          <div class="doc-title">${specFormat === "pre-sales" ? "Pre-Sales" : "Sales"} Spec Sheet<br/>${spec.productCategory||"Product"}</div>
          <div class="doc-sub">Product Specification Sheet</div>
        </div>
        <div class="brand-contact">${brandContactHTML || "—"}</div>
      </div>`;

  const headerRightHTML = `<div class="hdr-right">${brandLogoHTML}</div>`;

  const page2Header = `
    <div class="page2-header">
      ${headerLeftHTML.replace('hdr-left', 'hdr-left')}
      ${headerRightHTML.replace('hdr-right', 'hdr-right')}
    </div>`;

  const nfVerticalHTML = `<div class="nf-wrap">
    <div class="nf-title">Nutrition Facts</div>
    <div class="nf-srv">${spec.nf_verticalServings || spec.nf_servings || "—"} servings per container<br/><b>Serving size</b> ${spec.nf_verticalServingSize || spec.nf_servingSize || "—"}</div>
    <div class="nf-cal"><span class="nf-cal-lbl">Amount per serving<br/><b>Calories</b></span><span class="nf-cal-val">${spec.nf_calories||"0"}</span></div>
    <div class="nf-dvh">% Daily Value*</div>
    <div class="nr"><span><b>Total Fat</b> ${spec.nf_totalFat||"0g"}</span><span><b>${spec.nf_totalFatDV||"0%"}</b></span></div>
    <div class="nr ind"><span>Saturated Fat ${spec.nf_satFat||"0g"}</span><span><b>${spec.nf_satFatDV||"0%"}</b></span></div>
    <div class="nr ind"><span><i>Trans</i> Fat ${spec.nf_transFat||"0g"}</span><span></span></div>
    <div class="nr"><span><b>Cholesterol</b> ${spec.nf_cholesterol||"0mg"}</span><span><b>${spec.nf_cholesterolDV||"0%"}</b></span></div>
    <div class="nr"><span><b>Sodium</b> ${spec.nf_sodium||"0mg"}</span><span><b>${spec.nf_sodiumDV||"0%"}</b></span></div>
    <div class="nr"><span><b>Total Carbohydrate</b> ${spec.nf_totalCarb||"0g"}</span><span><b>${spec.nf_totalCarbDV||"0%"}</b></span></div>
    <div class="nr ind"><span>Dietary Fiber ${spec.nf_fiber||"0g"}</span><span><b>${spec.nf_fiberDV||"0%"}</b></span></div>
    <div class="nr ind"><span>Total Sugars ${spec.nf_sugars||"0g"}</span><span></span></div>
    <div class="nr ind2"><span>Includes ${spec.nf_addedSugars||"0g"} Added Sugars</span><span><b>${spec.nf_addedSugarsDV||"0%"}</b></span></div>
    <div class="nr thick"><span><b>Protein</b> ${spec.nf_protein||"0g"}</span><span></span></div>
    <div class="nf-vits">
      <div class="nf-vit">Vitamin D ${spec.nf_vitD||"0mcg"} <span style="float:right;font-weight:800">${spec.nf_vitDDV||"0%"}</span></div>
      <div class="nf-vit">Calcium ${spec.nf_calcium||"0mg"} <span style="float:right;font-weight:800">${spec.nf_calciumDV||"0%"}</span></div>
      <div class="nf-vit">Iron ${spec.nf_iron||"0mg"} <span style="float:right;font-weight:800">${spec.nf_ironDV||"0%"}</span></div>
      <div class="nf-vit">Potassium ${spec.nf_potassium||"0mg"} <span style="float:right;font-weight:800">${spec.nf_potassiumDV||"0%"}</span></div>
    </div>
    <div class="nf-foot">* The % Daily Value (DV) tells you how much a nutrient in a serving of food contributes to a daily diet. 2,000 calories a day is used for general nutrition advice.</div>
  </div>`;

  const nfLinearHTML = `<div class="nf-linear-wrap">
    <div class="nf-linear-line">
      <span class="nf-linear-facts">Nutrition Facts</span>
      <span>Servings: ${spec.nf_linearServings || spec.nf_servings || "—"}, </span>
      <span><b>Serv. size:</b> ${spec.nf_linearServingSize || spec.nf_servingSize || "—"}, </span>
      <span>Amount per serving: </span>
      <span><b>Calories ${spec.nf_linearCalories || spec.nf_calories || "0"}</b>, </span>
      <span><b>Total Fat</b> ${spec.nf_linearTotalFat || spec.nf_totalFat || "0g"} (${spec.nf_linearTotalFatDV || spec.nf_totalFatDV || "0%"} DV), </span>
      <span>Sat. Fat ${spec.nf_linearSatFat || spec.nf_satFat || "0g"} (${spec.nf_linearSatFatDV || spec.nf_satFatDV || "0%"} DV), </span>
      <span><i>Trans</i> Fat ${spec.nf_linearTransFat || spec.nf_transFat || "0g"}, </span>
      <span><b>Cholest.</b> ${spec.nf_linearCholesterol || spec.nf_cholesterol || "0mg"} (${spec.nf_linearCholesterolDV || spec.nf_cholesterolDV || "0%"} DV), </span>
      <span><b>Sodium</b> ${spec.nf_linearSodium || spec.nf_sodium || "0mg"} (${spec.nf_linearSodiumDV || spec.nf_sodiumDV || "0%"} DV), </span>
      <span><b>Total Carb.</b> ${spec.nf_linearTotalCarb || spec.nf_totalCarb || "0g"} (${spec.nf_linearTotalCarbDV || spec.nf_totalCarbDV || "0%"} DV), </span>
      <span>Fiber ${spec.nf_linearFiber || spec.nf_fiber || "0g"} (${spec.nf_linearFiberDV || spec.nf_fiberDV || "0%"} DV), </span>
      <span>Total Sugars ${spec.nf_linearSugars || spec.nf_sugars || "0g"}, </span>
      <span>Incl. ${spec.nf_linearAddedSugars || spec.nf_addedSugars || "0g"} Added Sugars, ${spec.nf_linearAddedSugarsDV || spec.nf_addedSugarsDV || "0%"} DV, </span>
      <span><b>Protein</b> ${spec.nf_linearProtein || spec.nf_protein || "0g"}, </span>
      <span>Vit. D (${spec.nf_linearVitDDV || spec.nf_vitDDV || "0%"} DV), </span>
      <span>Calcium (${spec.nf_linearCalciumDV || spec.nf_calciumDV || "0%"} DV), </span>
      <span>Iron (${spec.nf_linearIronDV || spec.nf_ironDV || "0%"} DV), </span>
      <span>Potas. (${spec.nf_linearPotassiumDV || spec.nf_potassiumDV || "0%"} DV).</span>
    </div>
  </div>`;

  const showVertical = spec.nf_showVertical !== false;
  const showLinear = !!spec.nf_showLinear;
  const nfParts = [];
  if (showVertical) nfParts.push(nfVerticalHTML);
  if (showLinear) nfParts.push(nfLinearHTML);
  const nfHTML = nfParts.length ? `<div class="nf-stack">${nfParts.join("")}</div>` : "";

  const compliance = spec.complianceText?.trim() ||
    "The ingredients used in this product are food-grade and are permitted for use in food products sold in both the United States and Canada. They are considered Generally Recognized as Safe (GRAS) in the United States, or approved for use under the Canadian Food and Drug Regulations and the Safe Food for Canadians Regulations, when used in accordance with good manufacturing practices. This statement confirms that the ingredients are legally accepted and safe for use in food products distributed in the United States and Canada.";

  const batchRows = Array.isArray(spec.batchRows) ? spec.batchRows : [];
  const batchHTML = spec.showBatchResults && batchRows.length
    ? `<div class="batch-block">
        <div class="sec-hdr">${spec.batchResultsTitle || "Product Batch Test Results"}</div>
        <div class="batch-sub">${spec.batchResultsSub || ""}</div>
        <table class="batch-table">
          <thead><tr><th>Test</th><th>Method</th><th>Upper Limit</th><th>Results</th></tr></thead>
          <tbody>
            ${batchRows.map(r => r.isSection
              ? `<tr class="section-row"><td colspan="4">${r.category || ""}</td></tr>`
              : `<tr><td>${r.test || ""}</td><td>${r.method || ""}</td><td>${r.upperLimit || ""}</td><td>${r.results || ""}</td></tr>`
            ).join("")}
          </tbody>
        </table>
      </div>`
    : "";

  const customProductInfoRowsHTML = Array.isArray(spec.customProductInfoRows)
    ? spec.customProductInfoRows
        .filter(row => (row?.title || "").trim() || (row?.text || "").trim())
        .map(row => `<tr><td>${row.title || "—"}</td><td>${row.text || "—"}</td></tr>`)
        .join("")
    : "";

  const footerText = `The information contained here is the Private & Intellectual Property of ${B.name}.`;

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
  <title>${spec.productName||"Spec Sheet"}</title>
  <style>${css}</style></head><body>
  <div class="page">
    <div class="hdr">
      ${headerLeftHTML}
      ${headerRightHTML}
    </div>
    ${bannerHTML}
    <div class="mgrid">
      <table class="itable">
        <tr><td>Product Name</td><td>${spec.productName||"—"}</td></tr>
        <tr><td>Product ID</td><td>${spec.productId||"—"}</td></tr>
        <tr><td>Appearance</td><td>${spec.appearance||"—"}</td></tr>
        <tr><td>Ingredients</td><td>${ingDisplay}</td></tr>
        <tr><td>Storage</td><td>${spec.storage||"Store in a tightly sealed container, away from direct sunlight, moisture, heat, and freezing temperatures."}</td></tr>
        <tr><td>Shelf-Life / Best-By</td><td>${spec.shelfLife||"A minimum of 12–18 months from manufacture date, under proper storage conditions."}</td></tr>
      </table>
      ${imgTag}
    </div>
    <div class="sec-hdr">Product Information</div>
    <table class="stable">
      <tr><td>Kosher Status</td><td>${spec.kosher||"—"}</td></tr>
      <tr><td>Halal Status</td><td>${spec.halal||"—"}</td></tr>
      <tr><td>Vegan Status</td><td>${spec.vegan||"—"}</td></tr>
      <tr><td>Allergen Status</td><td>${spec.allergen||"This product does not contain any Major Food Allergens"}</td></tr>
      ${customProductInfoRowsHTML}
      <tr><td>Gluten Status</td><td>${spec.gluten||"—"}</td></tr>
      <tr><td>GMO Status</td><td>${spec.gmo||"—"}</td></tr>
      <tr><td>Taste</td><td>${spec.taste||"—"}</td></tr>
      <tr><td>Odor</td><td>${spec.odor||"—"}</td></tr>
      <tr><td>Bio Product</td><td>${spec.bio||"No"}</td></tr>
      <tr><td>Dangerous Goods</td><td>${spec.dangerous||"No"}</td></tr>
    </table>
    ${claimRowsHTML ? `<div class="claims-block"><div class="claims-title">Selected Header Claims</div><table class="claims-table">${claimRowsHTML}</table></div>` : ""}
    ${batchHTML}
    <div class="pg-foot">${footerText}</div>
    <div class="page-break"></div>
    <div class="nf-sec">
      ${nfHTML}
      <div class="nf-ings">
        <div class="ing-title">Ingredients</div>
        <div class="ing-text">${ingDisplay}</div>
        <div class="compliance"><b>Statement of Compliance – U.S. &amp; Canada</b><br/>${compliance}</div>
      </div>
    </div>
    <div class="pg-foot">${footerText}</div>
  </div>
  </body></html>`;
}

/* ─────────────────────────────────────────────────────────────────
   SPEC SHEET MODAL
───────────────────────────────────────────────────────────────── */
function SpecSheetModal({ ings, onClose, initialState, onStateChange }) {
  const DEFAULT_BATCH_ROWS = [
    { isSection:true, category:"Microbiological" },
    {  test:"Total Plate Count", method:"USP61", upperLimit:"< 1,000 cfu/g", results:"Conforms" },
    {  test:"Yeast / Mold", method:"USP61", upperLimit:"< 100 cfu/g", results:"Conforms" },
    {  test:"Coliforms", method:"USP62", upperLimit:"< 10 cfu/g", results:"Conforms" },
    { test:"E. Coli", method:"USP62", upperLimit:"< 10 cfu/g", results:"Conforms" },
    { test:"Staphylococcus aureus", method:"USP62", upperLimit:"Absent", results:"Conforms" },
    { test:"Salmonella", method:"USP62", upperLimit:"Absent", results:"Conforms" },
    { isSection:true, category:"Heavy Metals" },
    {  test:"Arsenic (As)", method:"AOAC 2015.01", upperLimit:"3 ppm", results:"Conforms" },
    { test:"Lead (Pb)", method:"AOAC 2015.01", upperLimit:"4 ppm", results:"Conforms" },
    { test:"Cadmium (Cd)", method:"AOAC 2015.01", upperLimit:"2 ppm", results:"Conforms" },
    { test:"Mercury (Hg)", method:"AOAC 2015.01", upperLimit:"1 ppm", results:"Conforms" },
  ];

  const [brand, setBrand] = useState(initialState?.brand || "brewglitter");
  const [customBrand, setCustomBrand] = useState(initialState?.customBrand || {
    name: "", tagline: "", website: "", address: "", phone: "", email: "", logo: null,
  });
  const [img, setImg] = useState(initialState?.img || null);
  const [selectedBanners, setSelectedBanners] = useState(initialState?.selectedBanners || []);
  const [specFormat, setSpecFormat] = useState(initialState?.specFormat || "sales");
  const [tab, setTab] = useState(initialState?.tab || "header-product");
  const [sp, setSp] = useState(initialState?.sp || {
    productName:"", productId:"", productCategory:"Rimming Sugar",
    appearance:"", ingredientsOverride:"", storage:"", shelfLife:"",
    kosher:"Can be added to Kosher Certificate upon request",
    halal:"Halal", vegan:"This product is not suitable for Vegan & Vegetarian diets.",
    allergen:"This product does not contain any Major Food Allergens (as defined in the Food Allergen Labeling and Consumer Protection Act)",
    gluten:"Gluten Free", gmo:"Non-GMO", taste:"Sweet", odor:"Sweet",
    bio:"No", dangerous:"No", complianceText:"",
    customProductInfoRows:[],
    bannerDisplayModes:{},
    showBatchResults:false, batchResultsTitle:"Product Batch Test Results", batchResultsSub:"",
    batchRows: DEFAULT_BATCH_ROWS,
    nf_inputMode:"profile",
    nf_showIngredientFDA:false, nf_showIngredientCanada:false, nf_showIngredientFrench:false,
    nf_directCalories:"", nf_directTotalFat:"", nf_directSatFat:"", nf_directTransFat:"",
    nf_directCholesterol:"", nf_directSodium:"", nf_directTotalCarb:"", nf_directFiber:"",
    nf_directSugars:"", nf_directAddedSugars:"", nf_directProtein:"", nf_directVitD:"",
    nf_directCalcium:"", nf_directIron:"", nf_directPotassium:"",
    nf_servingSize:"100 grams (100g)", nf_servings:"~113",
    nf_verticalServingSize:"100 grams (100g)", nf_verticalServings:"~113",
    nf_linearServingSize:"100 grams (100g)", nf_linearServings:"~113",
    nf_showVertical:true, nf_showLinear:false,
  });

  const [nutrientProfiles, setNutrientProfiles] = useState(
    initialState?.nutrientProfiles || (ings || []).map(i => blankNutrientProfile(i.name || ""))
  );

  useEffect(() => {
    setNutrientProfiles(prev => {
      const byName = new Map((prev || []).map(p => [String(p.name || "").trim().toLowerCase(), p]));
      return (ings || []).filter(i => i.name?.trim()).map(i => {
        const key = i.name.trim().toLowerCase();
        const existing = byName.get(key);
        return existing ? { ...existing, name: i.name } : blankNutrientProfile(i.name);
      });
    });
  }, [ings]);

  useEffect(() => {
    onStateChange?.({ brand, customBrand, img, selectedBanners, specFormat, tab, sp, nutrientProfiles });
  }, [brand, customBrand, img, selectedBanners, specFormat, tab, sp, nutrientProfiles, onStateChange]);

  const calcNutrition = useMemo(
    () => sp.nf_inputMode === "direct"
      ? buildDirectNutritionFields(sp)
      : calcNutritionFromProfiles(ings, nutrientProfiles, sp.nf_verticalServingSize || sp.nf_servingSize),
    [ings, nutrientProfiles, sp]
  );
  const calcNutritionLinear = useMemo(
    () => sp.nf_inputMode === "direct"
      ? buildDirectNutritionFields(sp)
      : calcNutritionFromProfiles(ings, nutrientProfiles, sp.nf_linearServingSize || sp.nf_servingSize),
    [ings, nutrientProfiles, sp]
  );

  const set = (k,v) => setSp(p=>({...p,[k]:v}));
  const setCustom = (k,v) => setCustomBrand(prev => ({ ...prev, [k]: v }));
  const toggleBanner = (id) => setSelectedBanners(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const setBannerMode = (id, mode) => setSp(prev => ({
    ...prev,
    bannerDisplayModes: { ...(prev.bannerDisplayModes || {}), [id]: mode }
  }));

  const handleImg = (e) => {
    const f = e.target.files?.[0]; if(!f) return;
    const r = new FileReader(); r.onload = ev => setImg(ev.target.result); r.readAsDataURL(f);
  };
  const handleCustomLogo = (e) => {
    const f = e.target.files?.[0]; if(!f) return;
    const r = new FileReader(); r.onload = ev => setCustom("logo", ev.target.result); r.readAsDataURL(f);
  };

  const updBatchRow = (idx, key, value) => {
    setSp(prev => ({
      ...prev,
      batchRows: (prev.batchRows || DEFAULT_BATCH_ROWS).map((row, i) => i === idx ? { ...row, [key]: value } : row)
    }));
  };

  const addCustomProductInfoRow = () => {
    setSp(prev => ({
      ...prev,
      customProductInfoRows: [...(prev.customProductInfoRows || []), { title:"", text:"" }]
    }));
  };

  const updCustomProductInfoRow = (idx, key, value) => {
    setSp(prev => ({
      ...prev,
      customProductInfoRows: (prev.customProductInfoRows || []).map((row, i) =>
        i === idx ? { ...row, [key]: value } : row
      )
    }));
  };

  const delCustomProductInfoRow = (idx) => {
    setSp(prev => ({
      ...prev,
      customProductInfoRows: (prev.customProductInfoRows || []).filter((_, i) => i !== idx)
    }));
  };

  const doGenerate = () => {
    const nutritionFields = calcNutrition?.fields || {};
    const linearNutritionFields = calcNutritionLinear?.fields || {};
    const html = buildSpecHTML(
      brand,
      {
        ...sp,
        ...nutritionFields,
        nf_verticalServingSize: sp.nf_verticalServingSize || sp.nf_servingSize,
        nf_verticalServings: sp.nf_verticalServings || sp.nf_servings,
        nf_linearServingSize: sp.nf_linearServingSize || sp.nf_servingSize,
        nf_linearServings: sp.nf_linearServings || sp.nf_servings,
        nf_linearCalories: linearNutritionFields.nf_calories || "0",
        nf_linearTotalFat: linearNutritionFields.nf_totalFat || "0g",
        nf_linearTotalFatDV: linearNutritionFields.nf_totalFatDV || "0%",
        nf_linearSatFat: linearNutritionFields.nf_satFat || "0g",
        nf_linearSatFatDV: linearNutritionFields.nf_satFatDV || "0%",
        nf_linearTransFat: linearNutritionFields.nf_transFat || "0g",
        nf_linearCholesterol: linearNutritionFields.nf_cholesterol || "0mg",
        nf_linearCholesterolDV: linearNutritionFields.nf_cholesterolDV || "0%",
        nf_linearSodium: linearNutritionFields.nf_sodium || "0mg",
        nf_linearSodiumDV: linearNutritionFields.nf_sodiumDV || "0%",
        nf_linearTotalCarb: linearNutritionFields.nf_totalCarb || "0g",
        nf_linearTotalCarbDV: linearNutritionFields.nf_totalCarbDV || "0%",
        nf_linearFiber: linearNutritionFields.nf_fiber || "0g",
        nf_linearFiberDV: linearNutritionFields.nf_fiberDV || "0%",
        nf_linearSugars: linearNutritionFields.nf_sugars || "0g",
        nf_linearAddedSugars: linearNutritionFields.nf_addedSugars || "0g",
        nf_linearAddedSugarsDV: linearNutritionFields.nf_addedSugarsDV || "0%",
        nf_linearProtein: linearNutritionFields.nf_protein || "0g",
        nf_linearVitDDV: linearNutritionFields.nf_vitDDV || "0%",
        nf_linearCalciumDV: linearNutritionFields.nf_calciumDV || "0%",
        nf_linearIronDV: linearNutritionFields.nf_ironDV || "0%",
        nf_linearPotassiumDV: linearNutritionFields.nf_potassiumDV || "0%",
        imageDataUrl: img,
      },
      ings,
      customBrand,
      selectedBanners,
      specFormat
    );
    const w = window.open("", "_blank", `popup=yes,scrollbars=yes,resizable=yes,width=${Math.floor(window.screen.availWidth * 0.96)},height=${Math.floor(window.screen.availHeight * 0.94)},left=10,top=10`);
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
  };

  const TABS = [
    {k:"header-product",l:"Header & Product Info"},
    {k:"nutrition",l:"Nutrition Facts"},
    {k:"compliance",l:"Compliance"}
  ];

  const B = BRANDS[brand];
  const Field = ({label, k, rows, placeholder}) => (
    <div style={{display:"flex",flexDirection:"column",gap:3}}>
      <label style={{fontSize:10,fontWeight:700,color:"var(--g600)",textTransform:"uppercase",letterSpacing:".6px"}}>{label}</label>
      {rows
        ? <textarea rows={rows} value={sp[k]||""} onChange={e=>set(k,e.target.value)} placeholder={placeholder||""} style={{background:"var(--yinput)",border:"1.5px solid var(--yborder)",borderRadius:4,color:"#1E293B",fontFamily:"inherit",fontSize:12,padding:"6px 8px",outline:"none",resize:"vertical"}}/>
        : <input type="text" value={sp[k]||""} onChange={e=>set(k,e.target.value)} placeholder={placeholder||""} style={{background:"var(--yinput)",border:"1.5px solid var(--yborder)",borderRadius:4,color:"#1E293B",fontFamily:"'JetBrains Mono',monospace",fontSize:12,padding:"6px 8px",outline:"none"}}/>
      }
    </div>
  );

  const DirectNField = ({label, k, unit=""}) => (
    <div style={{display:"flex",flexDirection:"column",gap:3}}>
      <label style={{fontSize:10,fontWeight:700,color:"var(--g600)",textTransform:"uppercase",letterSpacing:".6px"}}>{label}</label>
      <div style={{display:"flex",alignItems:"center",gap:6}}>
        <input type="number" step="0.01" min="0" value={sp[k]||""} onChange={e=>set(k,e.target.value)} style={{background:"var(--yinput)",border:"1.5px solid var(--yborder)",borderRadius:4,color:"#1E293B",fontFamily:"var(--mono)",fontSize:12,padding:"6px 8px",outline:"none",width:"100%"}}/>
        {unit ? <span style={{fontSize:11,color:"var(--g500)",fontFamily:"var(--mono)",minWidth:34}}>{unit}</span> : null}
      </div>
    </div>
  );

  const nutritionPreviewHTML = buildNutritionPreviewHTML({
    ...sp,
    ...(calcNutrition?.fields || {}),
    ingredientsPreviewText: sp.ingredientsOverride?.trim() || ings.filter(i=>i.name?.trim()).map(i=>i.name.trim().toUpperCase()).join(", "),
    nf_verticalServingSize: sp.nf_verticalServingSize || sp.nf_servingSize,
    nf_verticalServings: sp.nf_verticalServings || sp.nf_servings,
    nf_linearServingSize: sp.nf_linearServingSize || sp.nf_servingSize,
    nf_linearServings: sp.nf_linearServings || sp.nf_servings,
    nf_linearCalories: calcNutritionLinear?.fields?.nf_calories || "0",
    nf_linearTotalFat: calcNutritionLinear?.fields?.nf_totalFat || "0g",
    nf_linearTotalFatDV: calcNutritionLinear?.fields?.nf_totalFatDV || "0%",
    nf_linearSatFat: calcNutritionLinear?.fields?.nf_satFat || "0g",
    nf_linearSatFatDV: calcNutritionLinear?.fields?.nf_satFatDV || "0%",
    nf_linearTransFat: calcNutritionLinear?.fields?.nf_transFat || "0g",
    nf_linearCholesterol: calcNutritionLinear?.fields?.nf_cholesterol || "0mg",
    nf_linearCholesterolDV: calcNutritionLinear?.fields?.nf_cholesterolDV || "0%",
    nf_linearSodium: calcNutritionLinear?.fields?.nf_sodium || "0mg",
    nf_linearSodiumDV: calcNutritionLinear?.fields?.nf_sodiumDV || "0%",
    nf_linearTotalCarb: calcNutritionLinear?.fields?.nf_totalCarb || "0g",
    nf_linearTotalCarbDV: calcNutritionLinear?.fields?.nf_totalCarbDV || "0%",
    nf_linearFiber: calcNutritionLinear?.fields?.nf_fiber || "0g",
    nf_linearFiberDV: calcNutritionLinear?.fields?.nf_fiberDV || "0%",
    nf_linearSugars: calcNutritionLinear?.fields?.nf_sugars || "0g",
    nf_linearAddedSugars: calcNutritionLinear?.fields?.nf_addedSugars || "0g",
    nf_linearAddedSugarsDV: calcNutritionLinear?.fields?.nf_addedSugarsDV || "0%",
    nf_linearProtein: calcNutritionLinear?.fields?.nf_protein || "0g",
    nf_linearVitDDV: calcNutritionLinear?.fields?.nf_vitDDV || "0%",
    nf_linearCalciumDV: calcNutritionLinear?.fields?.nf_calciumDV || "0%",
    nf_linearIronDV: calcNutritionLinear?.fields?.nf_ironDV || "0%",
    nf_linearPotassiumDV: calcNutritionLinear?.fields?.nf_potassiumDV || "0%",
  });

  const wholeSheetPreviewHTML = buildSpecHTML(
    brand,
    {
      ...sp,
      ...(calcNutrition?.fields || {}),
      imageDataUrl: img,
      nf_verticalServingSize: sp.nf_verticalServingSize || sp.nf_servingSize,
      nf_verticalServings: sp.nf_verticalServings || sp.nf_servings,
      nf_linearServingSize: sp.nf_linearServingSize || sp.nf_servingSize,
      nf_linearServings: sp.nf_linearServings || sp.nf_servings,
      nf_linearCalories: calcNutritionLinear?.fields?.nf_calories || "0",
      nf_linearTotalFat: calcNutritionLinear?.fields?.nf_totalFat || "0g",
      nf_linearTotalFatDV: calcNutritionLinear?.fields?.nf_totalFatDV || "0%",
      nf_linearSatFat: calcNutritionLinear?.fields?.nf_satFat || "0g",
      nf_linearSatFatDV: calcNutritionLinear?.fields?.nf_satFatDV || "0%",
      nf_linearTransFat: calcNutritionLinear?.fields?.nf_transFat || "0g",
      nf_linearCholesterol: calcNutritionLinear?.fields?.nf_cholesterol || "0mg",
      nf_linearCholesterolDV: calcNutritionLinear?.fields?.nf_cholesterolDV || "0%",
      nf_linearSodium: calcNutritionLinear?.fields?.nf_sodium || "0mg",
      nf_linearSodiumDV: calcNutritionLinear?.fields?.nf_sodiumDV || "0%",
      nf_linearTotalCarb: calcNutritionLinear?.fields?.nf_totalCarb || "0g",
      nf_linearTotalCarbDV: calcNutritionLinear?.fields?.nf_totalCarbDV || "0%",
      nf_linearFiber: calcNutritionLinear?.fields?.nf_fiber || "0g",
      nf_linearFiberDV: calcNutritionLinear?.fields?.nf_fiberDV || "0%",
      nf_linearSugars: calcNutritionLinear?.fields?.nf_sugars || "0g",
      nf_linearAddedSugars: calcNutritionLinear?.fields?.nf_addedSugars || "0g",
      nf_linearAddedSugarsDV: calcNutritionLinear?.fields?.nf_addedSugarsDV || "0%",
      nf_linearProtein: calcNutritionLinear?.fields?.nf_protein || "0g",
      nf_linearVitDDV: calcNutritionLinear?.fields?.nf_vitDDV || "0%",
      nf_linearCalciumDV: calcNutritionLinear?.fields?.nf_calciumDV || "0%",
      nf_linearIronDV: calcNutritionLinear?.fields?.nf_ironDV || "0%",
      nf_linearPotassiumDV: calcNutritionLinear?.fields?.nf_potassiumDV || "0%",
      showBatchResults: sp.showBatchResults,
    },
    ings,
    customBrand,
    selectedBanners,
    specFormat
  );

  const currentTabIndex = TABS.findIndex(t => t.k === tab);
  const prevTab = currentTabIndex > 0 ? TABS[currentTabIndex - 1] : null;
  const nextTab = currentTabIndex < TABS.length - 1 ? TABS[currentTabIndex + 1] : null;

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>

      <div style={{background:"var(--white)",border:"1px solid var(--g300)",borderRadius:10,width:"min(1680px,98vw)",height:"min(94vh,1200px)",display:"flex",flexDirection:"column",overflow:"hidden",boxShadow:"0 24px 60px rgba(0,0,0,.6)"}}>
        <div style={{background:"var(--g800)",padding:"14px 20px",display:"flex",alignItems:"center",gap:12,borderBottom:"1px solid var(--g200)",flexShrink:0}}>
          <span style={{fontSize:18}}>📋</span>
          <div>
            <div style={{fontSize:14,fontWeight:700,color:"#fff"}}>Create Spec Sheet</div>
            <div style={{fontSize:11,color:"var(--blue-d)"}}>Ingredients auto-filled from recipe matrix · generates print-ready PDF</div>
          </div>
          <div style={{marginLeft:"auto",display:"flex",gap:8,alignItems:"center"}}>
            <button onClick={doGenerate} style={{background:"var(--blue-600)",color:"#fff",border:"none",borderRadius:5,padding:"8px 16px",fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:5}}>🖨 Generate &amp; Print PDF</button>
            <button onClick={onClose} style={{background:"rgba(255,255,255,.08)",color:"var(--text)",border:"1px solid var(--g200)",borderRadius:5,padding:"8px 12px",fontSize:12,cursor:"pointer"}}>✕</button>
          </div>
        </div>
        <div style={{background:"var(--g100)",padding:"8px 20px",borderBottom:"1px solid var(--g200)",display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
          <span style={{fontSize:11,fontWeight:700,color:"var(--g600)",textTransform:"uppercase",letterSpacing:".7px",whiteSpace:"nowrap"}}>Format:</span>
          <select value={specFormat} onChange={e=>setSpecFormat(e.target.value)} style={{background:"#fff",border:"1px solid var(--g300)",borderRadius:5,color:"#111827",fontSize:12,fontWeight:600,padding:"6px 10px",outline:"none"}}>
            <option value="sales">Sales Spec Sheet</option>
            <option value="pre-sales">Pre-Sales Spec Sheet</option>
          </select>
          <span style={{fontSize:11,fontWeight:700,color:"var(--g600)",textTransform:"uppercase",letterSpacing:".7px",whiteSpace:"nowrap"}}>Brand:</span>
          {["pfg","bakell","jdi","brewglitter","custom"].map((k)=> {
            const b = BRANDS[k];
            return (
            <button key={k} onClick={()=>setBrand(k)} style={{
              padding:"5px 14px",borderRadius:5,fontSize:12,fontWeight:600,cursor:"pointer",
              border:`2px solid ${brand===k?b.color:"transparent"}`,
              background:brand===k?b.color+"22":"rgba(255,255,255,.05)",
              color:brand===k?b.color:"var(--g600)",transition:"all .15s"
            }}>{b.name}</button>
          )})}
          <div style={{marginLeft:"auto",width:10,height:10,borderRadius:"50%",background:B.color,boxShadow:`0 0 10px ${B.color}99`}}/>
          <span style={{fontSize:11,color:B.color,fontWeight:700}}>{B.name}</span>
        </div>
        <div style={{background:"var(--g50)",padding:"0 20px",borderBottom:"1px solid var(--g200)",display:"flex",gap:0,flexShrink:0}}>
          {TABS.map(({k,l})=>(
            <button key={k} onClick={()=>setTab(k)} style={{
              padding:"10px 16px",fontSize:12,fontWeight:600,cursor:"pointer",
              border:"none",borderBottom:`2px solid ${tab===k?"var(--blue-500)":"transparent"}`,
              background:"transparent",color:tab===k?"#93C5FD":"var(--g500)",transition:"all .15s"
            }}>{l}</button>
          ))}
        </div>
        <div style={{position:"relative",flex:1,minHeight:0,overflow:"hidden"}}>
          {prevTab && <button onClick={()=>setTab(prevTab.k)} title={prevTab.l} style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",zIndex:5,opacity:.08,transition:"opacity .15s",background:"var(--g800)",color:"#fff",border:"1px solid var(--g300)",borderRadius:999,padding:"10px 12px",cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.opacity=.92} onMouseLeave={e=>e.currentTarget.style.opacity=.08}>◀</button>}
          {nextTab && <button onClick={()=>setTab(nextTab.k)} title={nextTab.l} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",zIndex:5,opacity:.08,transition:"opacity .15s",background:"var(--g800)",color:"#fff",border:"1px solid var(--g300)",borderRadius:999,padding:"10px 12px",cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.opacity=.92} onMouseLeave={e=>e.currentTarget.style.opacity=.08}>▶</button>}
        <div style={{flex:1,minHeight:0,overflowY:"auto",overflowX:"hidden",padding:20,height:"100%",paddingBottom:36}}>
          <div style={{display:"grid",gap:12}}>
            {tab==="header-product" && <>
              {brand === "custom" && (
                <div style={{background:"var(--g100)",border:"1px solid var(--g200)",borderRadius:6,padding:14}}>
                  <div style={{fontSize:11,fontWeight:700,color:"var(--g600)",textTransform:"uppercase",letterSpacing:".7px",marginBottom:10}}>Custom Brand Setup</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
                    <div style={{display:"flex",flexDirection:"column",gap:3}}><label style={{fontSize:10,fontWeight:700,color:"var(--g600)",textTransform:"uppercase",letterSpacing:".6px"}}>Brand Name</label><input type="text" value={customBrand.name} onChange={(e)=>setCustom("name", e.target.value)} style={{background:"var(--yinput)",border:"1.5px solid var(--yborder)",borderRadius:4,color:"#1E293B",fontFamily:"inherit",fontSize:12,padding:"6px 8px",outline:"none"}}/></div>
                    <div style={{display:"flex",flexDirection:"column",gap:3}}><label style={{fontSize:10,fontWeight:700,color:"var(--g600)",textTransform:"uppercase",letterSpacing:".6px"}}>Website</label><input type="text" value={customBrand.website} onChange={(e)=>setCustom("website", e.target.value)} style={{background:"var(--yinput)",border:"1.5px solid var(--yborder)",borderRadius:4,color:"#1E293B",fontFamily:"inherit",fontSize:12,padding:"6px 8px",outline:"none"}}/></div>
                    <div style={{display:"flex",flexDirection:"column",gap:3}}><label style={{fontSize:10,fontWeight:700,color:"var(--g600)",textTransform:"uppercase",letterSpacing:".6px"}}>Address</label><textarea rows={2} value={customBrand.address} onChange={(e)=>setCustom("address", e.target.value)} style={{background:"var(--yinput)",border:"1.5px solid var(--yborder)",borderRadius:4,color:"#1E293B",fontFamily:"inherit",fontSize:12,padding:"6px 8px",outline:"none",resize:"vertical"}}/></div>
                    <div style={{display:"flex",flexDirection:"column",gap:3}}><label style={{fontSize:10,fontWeight:700,color:"var(--g600)",textTransform:"uppercase",letterSpacing:".6px"}}>Email</label><input type="text" value={customBrand.email} onChange={(e)=>setCustom("email", e.target.value)} style={{background:"var(--yinput)",border:"1.5px solid var(--yborder)",borderRadius:4,color:"#1E293B",fontFamily:"inherit",fontSize:12,padding:"6px 8px",outline:"none"}}/></div>
                  </div>
                  <div style={{marginTop:12,display:"flex",alignItems:"center",gap:12}}>
                    {customBrand.logo ? <img src={customBrand.logo} alt="Custom logo" style={{width:120,height:60,objectFit:"contain",background:"#fff",borderRadius:6,border:"1px solid var(--g300)",padding:6}}/> : <div style={{width:120,height:60,display:"flex",alignItems:"center",justifyContent:"center",border:"2px dashed var(--g300)",borderRadius:6,color:"var(--g500)",fontSize:11}}>No logo</div>}
                    <div>
                      <label style={{background:"var(--blue-600)",color:"#fff",padding:"6px 12px",borderRadius:5,fontSize:12,fontWeight:600,cursor:"pointer",display:"inline-block"}}>{customBrand.logo ? "Change Logo" : "Upload Logo"}<input type="file" accept="image/*" onChange={handleCustomLogo} style={{display:"none"}}/></label>
                    </div>
                  </div>
                </div>
              )}

              <div style={{display:"grid",gridTemplateColumns:"1.15fr .85fr",gap:12}}>
                <div style={{background:"var(--g100)",border:"1px solid var(--g200)",borderRadius:6,padding:14,display:"grid",gap:10}}>
                  <div style={{fontSize:11,fontWeight:700,color:"var(--g600)",textTransform:"uppercase",letterSpacing:".7px"}}>Header & Banner Settings</div>
                  <div style={{fontSize:10,color:"var(--g500)",lineHeight:1.5}}>Header is always printed. Choose how each selected banner appears on page 1.</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                    {HEADER_BANNERS.map((b) => {
                      const active = selectedBanners.includes(b.id);
                      const mode = (sp.bannerDisplayModes || {})[b.id] || "logo";
                      return (
                        <div key={b.id} style={{display:"grid",gridTemplateColumns:"auto 1fr 130px",alignItems:"start",gap:8,padding:"9px 10px",border:"1px solid var(--g200)",borderRadius:6,background:"#fff"}}>
                          <input type="checkbox" checked={active} onChange={() => toggleBanner(b.id)} style={{marginTop:2}}/>
                          <div style={{display:"grid",gap:3}}>
                            <div style={{fontSize:12,fontWeight:700,color:"var(--g800)"}}>{b.label}</div>
                            <div style={{fontSize:10,color:"var(--g500)",lineHeight:1.35}}>
                              Spec sheet line: {((sp.bannerDisplayModes || {})[b.id] === "request")
                                ? ({
                                    vegan: "Vegan available on request",
                                    halal: "Halal certified available on request",
                                    kosher: "Kosher certified available on request",
                                    biodegradable: "Biodegradable documentation available on request",
                                    packaged_usa: "Packaged in the USA confirmation available on request",
                                    made_usa: "Made in the USA confirmation available on request",
                                    eu_approved: "EU compliant ingredients available on request",
                                    gmp: "GMP documentation available on request",
                                    haccp: "HACCP documentation available on request",
                                    fda: "FDA registered facility confirmation available on request",
                                  }[b.id] || `${b.label} available on request`)
                                : getBannerText(sp, b)}
                            </div>
                          </div>
                          <select disabled={!active} value={mode} onChange={e=>setBannerMode(b.id, e.target.value)} style={{background:active ? "#fff" : "var(--g100)",border:"1px solid var(--g300)",borderRadius:5,color:"#111827",fontSize:11,fontWeight:600,padding:"6px 8px",outline:"none"}}>
                            <option value="logo">Logo only</option>
                            <option value="both">Logo + line</option>
                            <option value="request">Available on request</option>
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div style={{background:"var(--g100)",border:"1px solid var(--g200)",borderRadius:6,padding:14}}>
                  <div style={{fontSize:11,fontWeight:700,color:"var(--g600)",textTransform:"uppercase",letterSpacing:".7px",marginBottom:8}}>Product Image</div>
                  <div style={{display:"flex",alignItems:"center",gap:12}}>
                    {img ? <img src={img} alt="preview" style={{width:88,height:88,objectFit:"cover",borderRadius:6,border:"1px solid var(--g300)"}}/> : <div style={{width:88,height:88,background:"var(--g800)",borderRadius:6,border:"2px dashed var(--g300)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>📷</div>}
                    <div>
                      <label style={{background:"var(--blue-600)",color:"#fff",padding:"6px 12px",borderRadius:5,fontSize:12,fontWeight:600,cursor:"pointer",display:"inline-block"}}>{img?"Change Image":"Upload Image"}<input type="file" accept="image/*" onChange={handleImg} style={{display:"none"}}/></label>
                      {img && <button onClick={()=>setImg(null)} style={{marginLeft:8,background:"rgba(239,68,68,.15)",color:"#FCA5A5",border:"1px solid rgba(239,68,68,.25)",borderRadius:5,padding:"6px 10px",fontSize:12,cursor:"pointer"}}>Remove</button>}
                      <div style={{fontSize:10,color:"var(--g500)",marginTop:5}}>Appears top-right on page 1 only.</div>
                    </div>
                  </div>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                <Field label="Product Name" k="productName" placeholder="e.g. Chocolate Rimming Sugar"/>
                <Field label="Product ID" k="productId" placeholder="e.g. CRS208"/>
                <Field label="Product Category" k="productCategory" placeholder="e.g. Rimming Sugar"/>
              </div>
              <Field label="Appearance / Description" k="appearance" rows={3} placeholder="Describe flavor profile, appearance, and intended use…"/>
              <Field label="Ingredients Override (blank = auto-fill from recipe matrix)" k="ingredientsOverride" rows={2} placeholder={`Auto: ${ings.filter(i=>i.name?.trim()).map(i=>i.name.trim().toUpperCase()).join(", ")}`}/>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <Field label="Storage Instructions" k="storage" rows={2}/>
                <Field label="Shelf Life / Best-By Date" k="shelfLife" placeholder="e.g. 12–18 months from manufacture date"/>
              </div>

              <div style={{fontSize:11,color:"var(--g500)",marginBottom:2}}>These populate the Product Information section on the spec sheet.</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <Field label="Kosher Status" k="kosher"/><Field label="Halal Status" k="halal"/>
                <Field label="Vegan Status" k="vegan"/><Field label="Gluten Status" k="gluten"/>
                <Field label="GMO Status" k="gmo"/><Field label="Taste" k="taste"/>
                <Field label="Odor" k="odor"/><Field label="Bio Product" k="bio"/>
                <Field label="Dangerous Goods" k="dangerous"/>
              </div>
              <Field label="Allergen Status" k="allergen" rows={2}/>

              <div style={{background:"var(--g100)",border:"1px solid var(--g200)",borderRadius:6,padding:14,display:"grid",gap:10}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                  <div style={{fontSize:11,fontWeight:700,color:"var(--g600)",textTransform:"uppercase",letterSpacing:".7px"}}>
                    Additional Product Information Rows
                  </div>
                  <button
                    type="button"
                    onClick={addCustomProductInfoRow}
                    style={{
                      background:"var(--blue-600)",
                      color:"#fff",
                      border:"none",
                      borderRadius:5,
                      padding:"6px 12px",
                      fontSize:12,
                      fontWeight:600,
                      cursor:"pointer"
                    }}
                  >
                    + Add Row
                  </button>
                </div>

                <div style={{fontSize:10,color:"var(--g500)",lineHeight:1.5}}>
                  These rows will print in Product Information after Allergen Status.
                </div>

                {(sp.customProductInfoRows || []).length === 0 ? (
                  <div style={{fontSize:11,color:"var(--g500)"}}>No extra rows added.</div>
                ) : (
                  <div style={{display:"grid",gap:8}}>
                    {(sp.customProductInfoRows || []).map((row, idx) => (
                      <div key={idx} style={{display:"grid",gridTemplateColumns:"220px 1fr auto",gap:8,alignItems:"start"}}>
                        <div style={{display:"flex",flexDirection:"column",gap:3}}>
                          <label style={{fontSize:10,fontWeight:700,color:"var(--g600)",textTransform:"uppercase",letterSpacing:".6px"}}>
                            Title
                          </label>
                          <input
                            type="text"
                            value={row.title || ""}
                            onChange={e=>updCustomProductInfoRow(idx,"title",e.target.value)}
                            placeholder="e.g. Country of Origin"
                            style={{
                              background:"var(--yinput)",
                              border:"1.5px solid var(--yborder)",
                              borderRadius:4,
                              color:"#1E293B",
                              fontFamily:"inherit",
                              fontSize:12,
                              padding:"6px 8px",
                              outline:"none"
                            }}
                          />
                        </div>

                        <div style={{display:"flex",flexDirection:"column",gap:3}}>
                          <label style={{fontSize:10,fontWeight:700,color:"var(--g600)",textTransform:"uppercase",letterSpacing:".6px"}}>
                            Text
                          </label>
                          <textarea
                            rows={2}
                            value={row.text || ""}
                            onChange={e=>updCustomProductInfoRow(idx,"text",e.target.value)}
                            placeholder="Enter the value or description"
                            style={{
                              background:"var(--yinput)",
                              border:"1.5px solid var(--yborder)",
                              borderRadius:4,
                              color:"#1E293B",
                              fontFamily:"inherit",
                              fontSize:12,
                              padding:"6px 8px",
                              outline:"none",
                              resize:"vertical"
                            }}
                          />
                        </div>

                        <div style={{paddingTop:21}}>
                          <button
                            type="button"
                            onClick={()=>delCustomProductInfoRow(idx)}
                            style={{
                              background:"rgba(239,68,68,.15)",
                              color:"#FCA5A5",
                              border:"1px solid rgba(239,68,68,.25)",
                              borderRadius:5,
                              padding:"6px 10px",
                              fontSize:12,
                              cursor:"pointer"
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{background:"var(--g100)",border:"1px solid var(--g200)",borderRadius:6,padding:14,display:"grid",gap:10}}>
                <label style={{display:"flex",alignItems:"center",gap:8,fontSize:12,color:"var(--g800)",fontWeight:600,cursor:"pointer"}}>
                  <input type="checkbox" checked={!!sp.showBatchResults} onChange={e=>set("showBatchResults", e.target.checked)} />
                  Add Product Batch Test Results table after Product Information
                </label>
                {sp.showBatchResults && <>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                    <Field label="Batch Results Section Title" k="batchResultsTitle" placeholder="Product Batch Test Results"/>
                    <Field label="Batch Results Subtitle" k="batchResultsSub" placeholder="Optional note"/>
                  </div>
                  <div style={{overflow:"auto",border:"1px solid var(--g200)",borderRadius:6,background:"#fff"}}>
                    <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                      <thead><tr style={{background:"var(--g800)",color:"#E5E7EB"}}><th style={{padding:"8px 10px",textAlign:"left"}}>Test</th><th style={{padding:"8px 10px",textAlign:"left"}}>Method</th><th style={{padding:"8px 10px",textAlign:"left"}}>Upper Limit</th><th style={{padding:"8px 10px",textAlign:"left"}}>Results</th></tr></thead>
                      <tbody>
                        {(sp.batchRows || DEFAULT_BATCH_ROWS).map((row, idx) => row.isSection ? (
                          <tr key={idx} style={{background:"var(--g100)"}}>
                            <td colSpan={4} style={{padding:"6px",borderTop:"1px solid var(--g200)"}}>
                              <input value={row.category || ""} onChange={e=>updBatchRow(idx, "category", e.target.value)} placeholder="Section title" style={{width:"100%",background:"var(--yinput)",border:"1.5px solid var(--yborder)",borderRadius:4,color:"#111827",fontFamily:"inherit",fontSize:11,padding:"6px 8px",outline:"none",fontWeight:700}} />
                            </td>
                          </tr>
                        ) : (
                          <tr key={idx}>
                            {["test","method","upperLimit","results"].map(k => (
                            
                              <td key={k} style={{padding:"4px 6px",borderTop:"1px solid var(--g200)"}}>
                                <input value={row[k] || ""} onChange={e=>updBatchRow(idx, k, e.target.value)} style={{width:"100%",background:"var(--yinput)",border:"1.5px solid var(--yborder)",borderRadius:4,color:"#111827",fontFamily:"inherit",fontSize:11,padding:"5px 6px",outline:"none"}} />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>}
              </div>
            </>}

            {tab==="nutrition" && <>
              <div style={{fontSize:11,color:"var(--g500)",marginBottom:2}}>Ingredient names are pulled from the recipe matrix. Enter per-100g nutrient values for each ingredient below to auto-calculate the nutrition label.</div>
              <div style={{background:"var(--g100)",border:"1px solid var(--g200)",borderRadius:6,padding:12,display:"grid",gap:10,marginBottom:10}}>
                <div style={{fontSize:10,fontWeight:700,color:"var(--blue-d)",textTransform:"uppercase",letterSpacing:".7px"}}>Nutrition Label Generator</div>
                <div style={{display:"grid",gap:12}}>
                  <div style={{display:"flex",flexDirection:"column",gap:6,maxWidth:420}}>
                    <div style={{fontSize:10,fontWeight:700,color:"var(--g600)",textTransform:"uppercase",letterSpacing:".6px"}}>
                      Input Entry
                    </div>
                    <div style={{display:"inline-flex",alignItems:"center",padding:3,background:"#fff",border:"1px solid var(--g300)",borderRadius:999,gap:3,width:"100%"}}>
                      <button
                        type="button"
                        onClick={()=>set("nf_inputMode","profile")}
                        style={{
                          flex:1,
                          border:"none",
                          borderRadius:999,
                          padding:"7px 12px",
                          cursor:"pointer",
                          fontSize:12,
                          fontWeight:600,
                          textAlign:"center",
                          background:sp.nf_inputMode==="profile" ? "var(--blue-600)" : "transparent",
                          color:sp.nf_inputMode==="profile" ? "#fff" : "var(--g800)",
                          transition:"all .15s"
                        }}
                      >
                        Profile Table
                      </button>
                      <button
                        type="button"
                        onClick={()=>set("nf_inputMode","direct")}
                        style={{
                          flex:1,
                          border:"none",
                          borderRadius:999,
                          padding:"7px 12px",
                          cursor:"pointer",
                          fontSize:12,
                          fontWeight:600,
                          textAlign:"center",
                          background:sp.nf_inputMode==="direct" ? "var(--blue-600)" : "transparent",
                          color:sp.nf_inputMode==="direct" ? "#fff" : "var(--g800)",
                          transition:"all .15s"
                        }}
                      >
                        Direct Entry
                      </button>
                    </div>
                  </div>

                  <div style={{display:"grid",gridTemplateColumns:"repeat(3, minmax(220px, 1fr))",gap:10}}>
                    <label style={{display:"flex",alignItems:"center",gap:8,fontSize:12,color:"var(--g800)",fontWeight:600,cursor:"pointer"}}>
                      <input type="checkbox" checked={!!sp.nf_showVertical} onChange={e=>set("nf_showVertical", e.target.checked)}/>
                      Standard vertical label
                    </label>
                    <label style={{display:"flex",alignItems:"center",gap:8,fontSize:12,color:"var(--g800)",fontWeight:600,cursor:"pointer"}}>
                      <input type="checkbox" checked={!!sp.nf_showLinear} onChange={e=>set("nf_showLinear", e.target.checked)}/>
                      Linear display
                    </label>
                    <label style={{display:"flex",alignItems:"center",gap:8,fontSize:12,color:"var(--g800)",fontWeight:600,cursor:"pointer"}}>
                      <input type="checkbox" checked={!!sp.nf_showIngredientFDA} onChange={e=>set("nf_showIngredientFDA", e.target.checked)}/>
                      FDA
                    </label>
                    <label style={{display:"flex",alignItems:"center",gap:8,fontSize:12,color:"var(--g800)",fontWeight:600,cursor:"pointer"}}>
                      <input type="checkbox" checked={!!sp.nf_showIngredientCanada} onChange={e=>set("nf_showIngredientCanada", e.target.checked)}/>
                      Canada
                    </label>
                    <label style={{display:"flex",alignItems:"center",gap:8,fontSize:12,color:"var(--g800)",fontWeight:600,cursor:"pointer"}}>
                      <input type="checkbox" checked={!!sp.nf_showIngredientFrench} onChange={e=>set("nf_showIngredientFrench", e.target.checked)}/>
                      French
                    </label>
                  </div>
                </div>
              </div>

              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
                <Field label="Standard Label Serving Size" k="nf_verticalServingSize" placeholder="e.g. 15g or 1 mint (2g)"/>
                <Field label="Standard Label Servings Per Container" k="nf_verticalServings" placeholder="e.g. 7.6"/>
                <Field label="Linear Label Serving Size" k="nf_linearServingSize" placeholder="e.g. 15g or 1 mint (2g)"/>
                <Field label="Linear Label Servings Per Container" k="nf_linearServings" placeholder="e.g. 7.6"/>
              </div>

              {sp.nf_inputMode === "profile" ? (
              <div style={{background:"var(--g100)",border:"1px solid var(--g200)",borderRadius:6,padding:12,display:"grid",gap:8}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                  <div style={{fontSize:10,fontWeight:700,color:"var(--blue-d)",textTransform:"uppercase",letterSpacing:".7px"}}>Per-100g Ingredient Nutrient Profile Table</div>
                  <div style={{fontSize:10,color:"var(--g500)"}}>Formula % comes from the recipe matrix · edit nutrient values only</div>
                </div>
                <div style={{overflow:"auto",border:"1px solid var(--g200)",borderRadius:6,background:"#fff",maxWidth:"100%",maxHeight:"52vh",boxShadow:"inset 0 0 0 1px rgba(0,0,0,.02)",scrollbarWidth:"auto"}}>
                  <table style={{width:"max-content",minWidth:"100%",borderCollapse:"separate",borderSpacing:0,fontSize:11}}>
                    <thead>
                      <tr style={{background:"var(--g800)",color:"#E5E7EB"}}>
                        <th style={{padding:"8px 10px",textAlign:"left",position:"sticky",left:0,top:0,zIndex:4,background:"var(--g800)",minWidth:220,boxShadow:"2px 0 0 rgba(255,255,255,.06)"}}>Ingredient</th>
                        <th style={{padding:"8px 10px",textAlign:"right",position:"sticky",left:220,top:0,zIndex:4,background:"var(--g800)",minWidth:96,boxShadow:"2px 0 0 rgba(255,255,255,.06)"}}>Formula %</th>
                        {NUTRIENT_PROFILE_FIELDS.map(f => (
                          <th key={f.key} style={{padding:"8px 10px",textAlign:"right",whiteSpace:"nowrap"}}>{f.label}{f.unit ? ` (${f.unit})` : ""}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(ings || []).filter(i => i.name?.trim()).map((ing, idx) => {
                        const profile = nutrientProfiles[idx] || blankNutrientProfile(ing.name);
                        return (
                          <tr key={`${ing.name}-${idx}`} style={{borderTop:"1px solid var(--g200)"}}>
                            <td style={{padding:"6px 10px",fontWeight:600,position:"sticky",left:0,zIndex:2,background:"#fff",minWidth:220,boxShadow:"2px 0 0 var(--g200)"}}>{ing.name}</td>
                            <td style={{padding:"6px 10px",textAlign:"right",fontFamily:"var(--mono)",position:"sticky",left:220,zIndex:2,background:"#fff",minWidth:96,boxShadow:"2px 0 0 var(--g200)"}}>{parseFloat(((pf(ing.pct) || 0) * 100).toFixed(4)).toString()}%</td>
                            {NUTRIENT_PROFILE_FIELDS.map(f => (
                              <td key={f.key} style={{padding:"4px 6px"}}>
                                <input type="number" step="0.01" min="0" value={profile[f.key] ?? ""} onChange={e => setNutrientProfiles(prev => prev.map((row, rowIdx) => rowIdx === idx ? { ...row, name: ing.name, [f.key]: e.target.value } : row))} style={{width:88,background:"var(--yinput)",border:"1.5px solid var(--yborder)",borderRadius:4,color:"#111827",fontFamily:"var(--mono)",fontSize:11,padding:"5px 6px",outline:"none",textAlign:"right"}} />
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap",fontSize:10,color:"var(--g500)"}}>
                  <span>Scroll horizontally to move across nutrient columns.</span>
                  <span style={{fontFamily:"var(--mono)",color:"var(--g600)"}}>Sticky columns: Ingredient · Formula %</span>
                </div>
              </div>
              ) : (
              <div style={{background:"var(--g100)",border:"1px solid var(--g200)",borderRadius:6,padding:12,display:"grid",gap:10}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                  <div style={{fontSize:10,fontWeight:700,color:"var(--blue-d)",textTransform:"uppercase",letterSpacing:".7px"}}>Direct Nutrition Entries</div>
                  <div style={{fontSize:10,color:"var(--g500)"}}>Preview updates from direct nutrient values instead of the ingredient profile table.</div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(4, minmax(0, 1fr))",gap:10}}>
                  <DirectNField label="Calories" k="nf_directCalories" />
                  <DirectNField label="Total Fat" k="nf_directTotalFat" unit="g" />
                  <DirectNField label="Sat Fat" k="nf_directSatFat" unit="g" />
                  <DirectNField label="Trans Fat" k="nf_directTransFat" unit="g" />
                  <DirectNField label="Cholesterol" k="nf_directCholesterol" unit="mg" />
                  <DirectNField label="Sodium" k="nf_directSodium" unit="mg" />
                  <DirectNField label="Total Carb" k="nf_directTotalCarb" unit="g" />
                  <DirectNField label="Fiber" k="nf_directFiber" unit="g" />
                  <DirectNField label="Total Sugars" k="nf_directSugars" unit="g" />
                  <DirectNField label="Added Sugars" k="nf_directAddedSugars" unit="g" />
                  <DirectNField label="Protein" k="nf_directProtein" unit="g" />
                  <DirectNField label="Vitamin D" k="nf_directVitD" unit="mcg" />
                  <DirectNField label="Calcium" k="nf_directCalcium" unit="mg" />
                  <DirectNField label="Iron" k="nf_directIron" unit="mg" />
                  <DirectNField label="Potassium" k="nf_directPotassium" unit="mg" />
                </div>
              </div>
              )}

              <div style={{background:"var(--g100)",border:"1px solid var(--g200)",borderRadius:6,padding:12,marginTop:12}}>
                <div style={{fontSize:10,fontWeight:700,color:"var(--g500)",textTransform:"uppercase",letterSpacing:".7px",marginBottom:8}}>Nutrition Labels Preview</div>
                <div style={{border:"1px solid var(--g200)",borderRadius:8,overflow:"hidden",background:"#fff",height:560}}>
                  <iframe title="nutrition-label-preview" style={{width:"100%",height:"100%",border:"none"}} srcDoc={nutritionPreviewHTML} />
                </div>
              </div>
            </>}

            {tab==="compliance" && <>
              <div style={{fontSize:11,color:"var(--g500)",marginBottom:2}}>Leave blank to use the standard US &amp; Canada GRAS compliance statement.</div>
              <Field label="Custom Compliance Statement" k="complianceText" rows={8} placeholder="Leave blank for default US & Canada GRAS statement…"/>
              <div style={{background:"var(--g100)",border:"1px solid var(--g200)",borderRadius:6,padding:12,marginTop:12}}>
                <div style={{fontSize:10,fontWeight:700,color:"var(--g500)",textTransform:"uppercase",letterSpacing:".7px",marginBottom:8}}>Whole Sheet Preview</div>
                <div style={{border:"1px solid var(--g200)",borderRadius:8,overflow:"hidden",background:"#fff",height:560}}>
                  <iframe title="whole-sheet-preview" style={{width:"100%",height:"100%",border:"none"}} srcDoc={wholeSheetPreviewHTML} />
                </div>
              </div>
            </>}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}


/* ── Trash / Bin SVG icon ── */
/* ─────────────────────────────────────────────────────────────────
   SHARED ICONS
───────────────────────────────────────────────────────────────── */
const TrashIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2 4h12M5 4V2.5A.5.5 0 015.5 2h5a.5.5 0 01.5.5V4M6.5 7v5M9.5 7v5M3 4l.9 9.1A1 1 0 004.9 14h6.2a1 1 0 001-.9L13 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

/* ── Pencil / Edit SVG icon ── */
const PencilIcon = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M11.5 2.5a1.5 1.5 0 012.12 2.12L5 13.24l-3 .76.76-3L11.5 2.5z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

/* ── Save (floppy disk) SVG ── */
const SaveIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M13 14H3a1 1 0 01-1-1V3a1 1 0 011-1h8l2 2v9a1 1 0 01-1 1z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M5 2v3h5V2M5 14v-5h6v5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

/* ─────────────────────────────────────────────────────────────────
   INLINE RENAME TITLE
───────────────────────────────────────────────────────────────── */
function InlineTitle({ value, onChange, placeholder }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(value);
  const inputRef              = useRef(null);

  useEffect(() => { setDraft(value); }, [value]);

  const commit = () => {
    setEditing(false);
    onChange(draft.trim() || "");
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        autoFocus
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setDraft(value); setEditing(false); } }}
        placeholder={placeholder}
        style={{
          background: "rgba(255,255,255,.1)",
          border: "1.5px solid #FCD34D",
          borderRadius: 5,
          color: "#fff",
          fontFamily: "'IBM Plex Sans', sans-serif",
          fontSize: 14,
          fontWeight: 600,
          padding: "4px 10px",
          outline: "none",
          width: 280,
          letterSpacing: ".1px",
        }}
      />
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      title="Click to rename"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        background: "transparent",
        border: "1.5px solid transparent",
        borderRadius: 5,
        cursor: "pointer",
        padding: "4px 8px",
        color: value ? "#fff" : "#6B7280",
        fontFamily: "'IBM Plex Sans', sans-serif",
        fontSize: 14,
        fontWeight: 600,
        letterSpacing: ".1px",
        transition: "all .15s",
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(252,211,77,.4)"; e.currentTarget.style.background = "rgba(252,211,77,.06)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.background = "transparent"; }}
    >
      <span style={{ maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {value || placeholder}
      </span>
      <PencilIcon size={12} />
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────────
   SIDEBAR ROW with 3-dot context menu
───────────────────────────────────────────────────────────────── */

function SbRow({ a, isActive, onOpen, onDelete, onRename, folders = [], onMoveToFolder }) {
  const [menuOpen,   setMenuOpen]   = useState(false);
  const [menuPos,    setMenuPos]    = useState({ x: 0, y: 0 });
  const [renaming,   setRenaming]   = useState(false);
  const [draftName,  setDraftName]  = useState(a.name || "");
  const dotsRef  = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { setDraftName(a.name || ""); }, [a.name]);
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (dotsRef.current && !dotsRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);
  useEffect(() => { if (renaming && inputRef.current) { inputRef.current.focus(); inputRef.current.select(); } }, [renaming]);

  const openMenu = (e) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPos({ x: rect.right + 4, y: rect.top });
    setMenuOpen(v => !v);
  };
  const commitRename = () => {
    const trimmed = draftName.trim();
    if (trimmed && trimmed !== a.name) onRename(a.id, trimmed);
    else setDraftName(a.name || "");
    setRenaming(false);
  };

  if (renaming) {
    return (
      <div className="sb-row active" onClick={e => e.stopPropagation()}>
        {a.isDraft && <span className="sb-row-draft-dot"/>}
        <input
          ref={inputRef}
          value={draftName}
          onChange={e => setDraftName(e.target.value)}
          onBlur={commitRename}
          onKeyDown={e => {
            if (e.key === "Enter") commitRename();
            if (e.key === "Escape") { setDraftName(a.name || ""); setRenaming(false); }
            e.stopPropagation();
          }}
          style={{flex:1,minWidth:0,background:"rgba(255,255,255,.1)",border:"1.5px solid #FCD34D",borderRadius:4,color:"#fff",fontFamily:"'IBM Plex Sans',sans-serif",fontSize:12,fontWeight:600,padding:"3px 7px",outline:"none"}}
        />
      </div>
    );
  }

  return (
    <div className={`sb-row${isActive ? " active" : ""}`} onClick={() => onOpen(a.id)}>
      {a.isDraft && <span className="sb-row-draft-dot" title="Draft"/>}
      <span className="sb-row-name" title={a.name}>{a.name || "Untitled"}</span>
      <button ref={dotsRef} className={`sb-dots${menuOpen ? " open" : ""}`} onClick={openMenu} title="Options">⋯</button>
      {menuOpen && (
        <div className="sb-menu" style={{ left: menuPos.x, top: menuPos.y }} onClick={e => e.stopPropagation()}>
          <button className="sb-menu-item" onClick={() => { onOpen(a.id); setMenuOpen(false); }}>Open</button>
          <button className="sb-menu-item" onClick={() => { setMenuOpen(false); setRenaming(true); }}>Rename</button>
          {typeof onMoveToFolder === "function" && <>
            <div style={{height:1,background:"rgba(255,255,255,.08)",margin:"4px 4px"}}/>
            <div style={{padding:"6px 10px 4px",fontSize:10,fontWeight:700,color:"#9CA3AF",textTransform:"uppercase",letterSpacing:".6px"}}>Folder</div>
            <button className="sb-menu-item" onClick={() => { onMoveToFolder(a.id, null); setMenuOpen(false); }}>Unfiled</button>
            {folders.map(f => (
              <button key={f.id} className="sb-menu-item" onClick={() => { onMoveToFolder(a.id, f.id); setMenuOpen(false); }}>{f.name}</button>
            ))}
          </>}
          <div style={{height:1,background:"rgba(255,255,255,.08)",margin:"4px 4px"}}/>
          <button className="sb-menu-item danger" onClick={() => { onDelete(a.id); setMenuOpen(false); }}>Delete</button>
        </div>
      )}
    </div>
  );
}


/* ─────────────────────────────────────────────────────────────────
   MAIN CSS
───────────────────────────────────────────────────────────────── */
/* ─────────────────────────────────────────────────────────────────
   MAIN APP CSS
───────────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body,#root{height:100%;overflow:hidden}
body{font-family:'IBM Plex Sans',sans-serif;background:#EAEDF0;color:#111827;font-size:15px}
:root{
  --white:#fff;
  --g50:#F8F9FA;--g100:#F1F3F5;--g200:#E9ECEF;--g300:#DEE2E6;--g400:#CED4DA;
  --g500:#6B7280;--g600:#4B5563;--g700:#374151;--g800:#1F2937;--g900:#111827;
  --blue:#2563EB;--blue-l:#EFF6FF;--blue-d:#1D4ED8;
  --blue-600:#2563EB;--blue-500:#3B82F6;
  --green:#15803D;--green-l:#F0FDF4;
  --red:#DC2626;--red-l:#FEF2F2;
  --orange:#C2410C;--orange-l:#FFF7ED;
  --yellow:#92400E;--yinput:#FFFBEB;--yborder:#FCD34D;
  --amber:#D97706;--amber-l:#FFFBEB;
  --panel:var(--white);--panel-2:var(--g50);
  --border:var(--g200);--border-2:var(--g300);
  --text:var(--g900);--text-2:var(--g600);--text-3:var(--g500);
  --navy-2:var(--g800);--navy-4:var(--g100);
  --mono:'IBM Plex Mono',monospace;
  --r:8px;--rs:5px;
  --sh:0 1px 3px rgba(0,0,0,.08),0 1px 2px rgba(0,0,0,.06);
  --sh-card:0 1px 3px rgba(0,0,0,.06),0 2px 8px rgba(0,0,0,.04);

  --grp-vendor-accent:#F59E0B;
  --grp-recipe-accent:#4ADE80;
  --grp-cost-accent:#5EEAD4;
  --grp-moq-accent:#FB923C;
  --grp-anchor-accent:#C4B5FD;
  --grp-elig-accent:#FCA5A5;
  --grp-pp-pur-accent:#93C5FD;
  --grp-pp-gram-accent:#67E8F9;
  --grp-pp-dol-accent:#86EFAC;
}

/* LAYOUT */
.layout{display:flex;height:100vh;width:100vw;overflow:hidden;background:#EAEDF0;position:relative}

/* ─── SIDEBAR ─────────────────────────────────────────────── */
.sidebar{
  flex-shrink:0;
  background:var(--g800);
  border-right:1px solid rgba(255,255,255,.08);
  display:flex;flex-direction:column;height:100vh;
  overflow:hidden;
  position:relative;
  min-width:0;
  transition:width .22s cubic-bezier(.4,0,.2,1);
}
.sidebar.open{ width:var(--sb-w,260px); }
.sidebar.collapsed{ width:48px; }

/* Resize handle — sits on right edge of sidebar */
.sb-resize-handle{
  position:absolute;right:0;top:0;bottom:0;width:5px;
  cursor:col-resize;z-index:10;
  background:transparent;
  transition:background .15s;
}
.sb-resize-handle:hover,
.sb-resize-handle.dragging{ background:rgba(252,211,77,.5); }

/* Rail icons when collapsed */
.sb-rail{
  display:flex;flex-direction:column;align-items:center;
  padding:8px 0;gap:4px;
  overflow:hidden;
}
.sb-rail-btn{
  width:36px;height:36px;border-radius:6px;
  background:transparent;border:none;
  color:#9CA3AF;font-size:15px;
  cursor:pointer;display:flex;align-items:center;justify-content:center;
  transition:background .15s,color .15s;
  flex-shrink:0;
}
.sb-rail-btn:hover{background:rgba(255,255,255,.1);color:#FCD34D}
.sb-rail-btn.active{color:#FCD34D;background:rgba(252,211,77,.1)}

/* Sidebar full content */
.sb-full{
  display:flex;flex-direction:column;
  height:100%;overflow:hidden;
  opacity:1;transition:opacity .15s;
}
.sidebar.collapsed .sb-full{ opacity:0;pointer-events:none; }
.sidebar.open .sb-rail{ display:none; }

.sb-top{
  background:var(--g800);padding:0 12px;height:52px;
  display:flex;align-items:center;gap:8px;flex-shrink:0;
  border-bottom:1px solid rgba(255,255,255,.08);
}
.sb-brand-text{font-size:15px;font-weight:800;color:#F9FAFB;letter-spacing:.2px;white-space:nowrap;line-height:1;flex:1;min-width:0;overflow:hidden}



.sb-search{padding:7px 10px;border-bottom:1px solid rgba(255,255,255,.06);flex-shrink:0}
.sb-search input{width:100%;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);border-radius:5px;color:#F9FAFB;font-family:var(--mono);font-size:12px;padding:5px 9px;outline:none}
.sb-search input::placeholder{color:#6B7280}
.sb-search input:focus{border-color:#FCD34D}

.sb-section-lbl{font-size:9px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:1.2px;padding:8px 10px 3px;flex-shrink:0}
.sb-meta{padding:4px 10px 2px;font-size:10px;color:#6B7280;font-family:var(--mono);flex-shrink:0}

.sb-list{flex:1;overflow-y:auto;padding:3px 6px 16px}
.sb-list::-webkit-scrollbar{width:3px}
.sb-list::-webkit-scrollbar-thumb{background:rgba(255,255,255,.15);border-radius:2px}

.sb-row{
  display:flex;align-items:center;gap:0;
  padding:0 4px 0 8px;height:34px;
  border-radius:6px;border:1px solid transparent;
  cursor:pointer;transition:background .1s;margin-bottom:1px;
  position:relative;
}
.sb-row:hover{background:rgba(255,255,255,.07);border-color:rgba(255,255,255,.08)}
.sb-row.active{background:rgba(253,211,77,.1);border-color:rgba(253,211,77,.28)}
.sb-row-name{
  font-size:12.5px;font-weight:500;color:#E5E7EB;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
  flex:1;min-width:0;line-height:1;
}
.sb-row.active .sb-row-name{color:#FCD34D;font-weight:600}
/* draft indicator — small left dot */
.sb-row-draft-dot{
  width:5px;height:5px;border-radius:50%;
  background:#FCD34D;flex-shrink:0;margin-right:6px;
}
/* three-dot menu button */
.sb-dots{
  width:24px;height:24px;border-radius:4px;flex-shrink:0;
  background:transparent;border:none;color:#6B7280;
  font-size:15px;cursor:pointer;
  display:flex;align-items:center;justify-content:center;
  opacity:0;transition:opacity .1s,background .1s;
  line-height:1;letter-spacing:1px;
}
.sb-row:hover .sb-dots{opacity:1}
.sb-dots:hover{background:rgba(255,255,255,.12);color:#E5E7EB}
.sb-dots.open{opacity:1;background:rgba(255,255,255,.1);color:#E5E7EB}
/* context menu popup */
.sb-menu{
  position:fixed;z-index:500;
  background:#1F2937;border:1px solid rgba(255,255,255,.12);
  border-radius:7px;padding:4px;
  box-shadow:0 8px 24px rgba(0,0,0,.5);
  min-width:120px;
  animation:menuIn .12s ease;
}
@keyframes menuIn{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}
.sb-menu-item{
  display:flex;align-items:center;gap:8px;
  padding:7px 10px;border-radius:5px;
  font-size:12px;font-weight:600;cursor:pointer;
  background:transparent;border:none;width:100%;text-align:left;
  font-family:'IBM Plex Sans',sans-serif;
  transition:background .1s;color:#E5E7EB;
}
.sb-menu-item:hover{background:rgba(255,255,255,.08)}
.sb-menu-item.danger{color:#FCA5A5}
.sb-menu-item.danger:hover{background:rgba(220,38,38,.2)}

.sb-empty{padding:24px 12px;text-align:center;color:#4B5563;font-size:12px;line-height:1.7;white-space:pre-line}

/* MAIN */
.main{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0}

/* Topbar */
.topbar{
  height:50px;background:var(--g800);
  display:flex;align-items:center;padding:0 14px 0 10px;gap:8px;
  flex-shrink:0;border-bottom:2px solid #111;
}

.tb-spacer{flex:1}






/* Content area */
.content{flex:1;overflow-y:auto;padding:16px 20px 80px;background:#EAEDF0}
.content::-webkit-scrollbar{width:5px}
.content::-webkit-scrollbar-thumb{background:var(--g300);border-radius:3px}
.app-inner{max-width:1700px;margin:0 auto}

/* Cards */
.card{background:var(--white);border:1px solid var(--g200);border-radius:var(--r);overflow:hidden;box-shadow:var(--sh);margin-bottom:14px}
.ch{padding:10px 16px;background:var(--g50);border-bottom:1px solid var(--g200);display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.ch-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--g600)}
.ch-accent{color:var(--blue-d)}
.cbody{padding:16px}
.igrid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.igroup{display:flex;flex-direction:column;gap:4px}
.ilabel{font-size:11px;font-weight:600;color:#111827;text-transform:uppercase;letter-spacing:.7px}
.ifield{background:var(--yinput);border:1.5px solid var(--yborder);border-radius:var(--rs);color:#111827;font-family:var(--mono);font-size:14px;padding:8px 10px;width:100%;outline:none;transition:border-color .15s}
.ifield:focus{border-color:#D97706;box-shadow:0 0 0 3px rgba(217,119,6,.15)}
.ifield::placeholder{color:#D9CBB4}

.wi-summary{display:grid;grid-template-columns:1fr 1fr;border:1px solid var(--g200);border-radius:var(--rs);overflow:hidden}
.wi-group{border-right:1px solid var(--g200);background:var(--white)}
.wi-group:last-child{border-right:none}
.wi-group-hdr{background:var(--g800);color:#D1D5DB;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;padding:7px 14px;text-align:center;border-bottom:1px solid var(--g200)}
.wi-rows{padding:10px 14px;display:flex;flex-direction:column;gap:7px}
.wi-row{display:flex;justify-content:space-between;align-items:center;gap:8px}
.wi-lbl{font-size:12px;color:#111827;font-weight:500}
.wi-val{font-family:var(--mono);font-size:13px;font-weight:700;color:#111827}
.wi-val.green{color:var(--green)}.wi-val.red{color:var(--red)}.wi-val.blue{color:var(--blue-d)}.wi-val.orange{color:var(--orange)}

.cost-metric-card{display:flex;flex-direction:column;gap:4px;background:var(--g50);border:1px solid var(--g200);border-radius:var(--rs);padding:12px 14px;flex:1;min-width:180px}
.cost-metric-label{font-size:10px;font-weight:700;color:#111827;text-transform:uppercase;letter-spacing:.7px}
.cost-metric-body{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}
.cost-metric-main{font-family:var(--mono);font-size:13px;color:var(--blue-d);font-weight:700}
.cost-metric-ideal{font-family:var(--mono);font-size:11px;color:var(--green)}
.cost-metric-delta-pos{font-family:var(--mono);font-size:11px;font-weight:700;color:var(--red)}
.cost-metric-delta-neg{font-family:var(--mono);font-size:11px;font-weight:700;color:var(--green)}
.cost-metric-sub{font-size:10px;color:var(--g500);margin-top:2px;font-family:var(--mono)}

.sgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(148px,1fr));gap:10px}
.scard{background:var(--g50);border:1px solid var(--g200);border-radius:var(--rs);padding:12px 14px}
.slabel{font-size:10px;font-weight:700;color:#111827;text-transform:uppercase;letter-spacing:.7px;margin-bottom:5px}
.sval{font-family:var(--mono);font-size:17px;font-weight:700;color:#111827;line-height:1.2}
.ssub{font-size:10px;color:var(--g500);margin-top:3px;font-family:var(--mono)}
.c-blue{color:var(--blue-d)}.c-green{color:var(--green)}.c-red{color:var(--red)}.c-orange{color:var(--orange)}.c-yellow{color:var(--yellow)}

.inner-divider{display:flex;align-items:center;gap:10px;padding:0 16px}
.inner-divider-line{flex:1;height:1px;background:var(--g200)}
.inner-divider-label{font-size:10px;font-weight:700;color:var(--g500);text-transform:uppercase;letter-spacing:1.2px;white-space:nowrap;padding:10px 0}
.divider{display:flex;align-items:center;gap:10px;margin:18px 0 12px}
.dline{flex:1;height:1px;background:var(--g200)}
.dlabel{font-size:10px;font-weight:700;color:var(--g500);text-transform:uppercase;letter-spacing:1.5px;white-space:nowrap}

/* Tables */
.twrap{overflow-x:auto;width:100%}
table{border-collapse:collapse;font-size:12px;width:max-content;min-width:100%}

th.grp{font-size:9px;font-weight:800;letter-spacing:1.2px;padding:5px 10px;text-align:center;text-transform:uppercase;background:#141C27;color:#E5E7EB;border:none}
th.grp.tl{text-align:left}
th.grp-vendor{color:#FDE68A} th.grp-recipe{color:#86EFAC} th.grp-cost{color:#5EEAD4}
th.grp-moq{color:#FED7AA} th.grp-anchor{color:#DDD6FE} th.grp-elig{color:#FCA5A5}
th.grp-pp-pur{color:#BAE6FD} th.grp-pp-gram{color:#A5F3FC} th.grp-pp-dol{color:#BBF7D0}
th.grp-dark{color:#9CA3AF}

th{background:#1A2333;color:#CBD5E1;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;padding:7px 10px;border:none;white-space:nowrap;text-align:center}
th.tl{text-align:left}
th.sh-vendor{color:#FDE68A} th.sh-recipe{color:#86EFAC} th.sh-cost{color:#5EEAD4}
th.sh-moq{color:#FED7AA} th.sh-anchor{color:#DDD6FE} th.sh-elig{color:#FCA5A5}
th.sh-pp-pur{color:#BAE6FD} th.sh-pp-gram{color:#A5F3FC} th.sh-pp-dol{color:#BBF7D0}

.tip-th{
  position:relative;
  cursor:pointer;
  overflow:visible;
  text-decoration:underline dotted rgba(255,255,255,.35);
  text-underline-offset:3px;
}
.tip-th::after{
  content:attr(data-tip);
  position:absolute;
  left:50%;
  top:calc(100% + 8px);
  transform:translateX(-50%);
  background:#0F172A;
  color:#F8FAFC;
  border:1px solid rgba(148,163,184,.35);
  border-radius:8px;
  padding:8px 10px;
  font-size:11px;
  font-weight:500;
  text-transform:none;
  letter-spacing:0;
  line-height:1.45;
  white-space:normal;
  width:max-content;
  min-width:180px;
  max-width:240px;
  box-shadow:0 10px 28px rgba(0,0,0,.35);
  opacity:0;
  visibility:hidden;
  pointer-events:none;
  z-index:50;
}
.tip-th::before{
  content:"";
  position:absolute;
  left:50%;
  top:100%;
  transform:translateX(-50%);
  border:6px solid transparent;
  border-bottom-color:#0F172A;
  opacity:0;
  visibility:hidden;
  pointer-events:none;
  z-index:51;
}
.tip-th.tip-right::after{
  left:auto;
  right:0;
  transform:none;
  max-width:min(240px, calc(100vw - 24px));
}
.tip-th.tip-right::before{
  left:auto;
  right:12px;
  transform:none;
}
.tip-th:hover::after,.tip-th:hover::before{
  opacity:1;
  visibility:visible;
}

td{padding:7px 10px;border-bottom:1px solid var(--g100);border-right:1px solid var(--g100);vertical-align:middle;font-family:var(--mono);font-size:12px;color:#111827;white-space:nowrap;background:var(--white)}
td.nc{font-family:'IBM Plex Sans',sans-serif;font-size:13px;font-weight:500;color:#111827;position:sticky;left:0;z-index:2;background:var(--white);box-shadow:3px 0 6px rgba(0,0,0,.08);padding-right:14px}
tr:nth-child(even) td{background:#FAFAFA}
tr:nth-child(even) td.nc{background:#FAFAFA}
tr:hover td{background:#F5F5F5!important}
tfoot td{background:var(--g100)!important;color:#111827;font-weight:700;border-top:2px solid var(--g300);font-family:var(--mono);font-size:12px}
tfoot td.nc{background:var(--g100)!important;font-family:'IBM Plex Sans',sans-serif;color:#111827}
.tdi{background:var(--yinput)!important;padding:0!important;border-right:1px solid #FDE68A!important}
.tdi input,.tdi select{background:transparent;border:none;outline:none;color:#111827;font-family:var(--mono);font-size:12px;width:100%;height:100%;padding:6px 8px}
.tdi input.ni{font-family:'IBM Plex Sans',sans-serif!important;font-size:13px!important;font-weight:500!important;color:#111827!important}
.tdi select{cursor:pointer;appearance:none}
.combo{display:flex;align-items:stretch;width:100%}
.combo input[type=number]{width:62px;min-width:0;flex-shrink:0;padding:6px 3px 6px 7px;background:transparent;border:none;outline:none;color:#111827;font-family:var(--mono);font-size:12px}
.combo .usel{width:36px;flex-shrink:0;padding:6px 2px;text-align:center;background:transparent;border:none;border-left:1px solid #FDE68A;outline:none;color:#92400E;font-family:var(--mono);font-size:10px;font-weight:700;cursor:pointer;appearance:none}
.tr{text-align:right}.tc{text-align:center}

/* Delete row button in table */
.btn-del-row{
  width:28px;height:28px;border-radius:5px;
  display:flex;align-items:center;justify-content:center;
  background:rgba(220,38,38,.1);color:#EF4444;
  border:1px solid rgba(220,38,38,.2);
  cursor:pointer;transition:all .12s;
  font-family:'IBM Plex Sans',sans-serif;
}
.btn-del-row:hover{background:rgba(220,38,38,.25);color:#fff;border-color:rgba(220,38,38,.5)}

.ty{background:var(--green-l);color:var(--green);border:1px solid #86EFAC;width:34px;border-radius:4px;padding:3px 0;text-align:center;font-size:12px;font-weight:800;cursor:pointer;font-family:'IBM Plex Sans',sans-serif}
.tn{background:var(--red-l);color:var(--red);border:1px solid #FECACA;width:34px;border-radius:4px;padding:3px 0;text-align:center;font-size:12px;font-weight:800;cursor:pointer;font-family:'IBM Plex Sans',sans-serif}
.rb{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;font-size:11px;font-weight:800;font-family:var(--mono)}
.r1{background:#FCD34D;color:#78350F}.r2{background:#D1D5DB;color:#374151}.r3{background:#FED7AA;color:#7C2D12}.rn{background:var(--g100);color:#374151}
.util-pct{font-family:var(--mono);font-size:12px;font-weight:700}
.util-green{color:var(--green)}.util-red{color:var(--red)}
.addbar{padding:10px 16px;border-top:1px solid var(--g100);background:var(--g50);display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.addhint{font-size:11px;color:var(--g600);line-height:1.5}

.buy-qty-val{font-family:var(--mono);font-size:12px;font-weight:700;color:var(--blue-d)}
.buy-qty-unit{font-size:10px;font-weight:700;color:var(--blue-d);font-family:var(--mono);margin-left:3px}

/* Approval pill */
.appr-pill{display:flex;align-items:center;gap:8px;padding:4px 10px;border-radius:6px;border:1.5px solid var(--g200);background:var(--white);font-size:11px;font-weight:600}
.appr-pill.approved{border-color:#86EFAC;background:#F0FDF4}
.appr-pill-lbl{color:var(--g600);white-space:nowrap}
.appr-toggle{display:flex;gap:2px}
.appr-toggle button{padding:3px 9px;border-radius:4px;font-size:11px;font-weight:700;cursor:pointer;border:1.5px solid transparent;font-family:'IBM Plex Sans',sans-serif;transition:all .12s}
.appr-yes{background:var(--green-l);color:var(--green);border-color:#86EFAC!important}
.appr-no{background:var(--g100);color:var(--g500)}
.appr-yes-active{background:var(--green)!important;color:#fff!important;border-color:var(--green)!important}
.appr-no-active{background:var(--g700)!important;color:#F9FAFB!important;border-color:var(--g700)!important}
.appr-date{background:var(--yinput);border:1.5px solid var(--yborder);border-radius:4px;color:#111827;font-family:var(--mono);font-size:11px;padding:3px 7px;outline:none;cursor:pointer}

/* Generic btn */
.btn{display:inline-flex;align-items:center;gap:5px;padding:6px 12px;border-radius:var(--rs);border:none;font-family:'IBM Plex Sans',sans-serif;font-size:12px;font-weight:600;cursor:pointer;transition:all .15s;white-space:nowrap}
.b-blue{background:var(--blue);color:#fff}.b-blue:hover{background:var(--blue-d)}
.b-ghost{background:rgba(0,0,0,.03);color:var(--g600);border:1.5px solid var(--g200)}.b-ghost:hover{background:var(--g100)}
.b-yellow{background:var(--yinput);color:var(--yellow);border:1.5px solid var(--yborder)}.b-yellow:hover{background:#FEF9C3}

.toast{position:fixed;bottom:20px;right:20px;background:var(--g800);color:#F9FAFB;padding:8px 16px;border-radius:6px;font-size:12px;font-family:var(--mono);box-shadow:0 4px 16px rgba(0,0,0,.2);z-index:200;animation:slideUp .2s ease;pointer-events:none;border:1px solid rgba(255,255,255,.1)}
@keyframes slideUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
.loader{display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;gap:10px;background:var(--g100)}
.pulse{animation:pulse 1.5s ease-in-out infinite;font-size:32px}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
::-webkit-scrollbar{width:5px;height:5px}
::-webkit-scrollbar-track{background:var(--g100)}
::-webkit-scrollbar-thumb{background:var(--g300);border-radius:3px}

/* Yellow badge legend */
.yl-badge{display:flex;align-items:center;gap:5px;padding:3px 8px;border-radius:4px;background:var(--yinput);border:1px solid var(--yborder);font-size:11px;color:var(--yellow);font-weight:600;white-space:nowrap}
`;

/* ─────────────────────────────────────────────────────────────────
   SMALL PRESENTATIONAL HELPERS
───────────────────────────────────────────────────────────────── */
const S = () => <style dangerouslySetInnerHTML={{__html:CSS}}/>;
const Div = ({label}) => (
  <div className="divider"><div className="dline"/><span className="dlabel">{label}</span><div className="dline"/></div>
);
const SC = ({label,value,sub,color=""}) => (
  <div className="scard"><div className="slabel">{label}</div><div className={`sval ${color}`}>{value}</div>{sub&&<div className="ssub">{sub}</div>}</div>
);
const UtilPct = ({value}) => (
  <span className={`util-pct ${value>=0.75?"util-green":"util-red"}`}>{(value*100).toFixed(1)}%</span>
);
const RankBadge = ({rank}) => {
  if(!rank) return <span style={{fontFamily:"var(--mono)",fontSize:11,color:"#94A3B8"}}>—</span>;
  return <span className={`rb ${rank===1?"r1":rank===2?"r2":rank===3?"r3":"rn"}`}>{rank}</span>;
};
const WIRow = ({label,value,cls=""}) => (
  <div className="wi-row"><span className="wi-lbl">{label}</span><span className={`wi-val ${cls}`}>{value}</span></div>
);
const CostMetricCard = ({label,wiValue,idealValue,delta,sub}) => {
  const pos=delta>0;
  return (
    <div className="cost-metric-card">
      <div className="cost-metric-label">{label}</div>
      <div className="cost-metric-body">
        <span className="cost-metric-main">What-If: {wiValue}</span>
        <span className="cost-metric-ideal">Ideal: {idealValue}</span>
        <span className={pos?"cost-metric-delta-pos":"cost-metric-delta-neg"}>Δ {pos?"+":""}{delta}</span>
      </div>
      {sub&&<div className="cost-metric-sub">{sub}</div>}
    </div>
  );
};
const Combo = ({num,onNum,unit,onUnit,units,placeholder,step="any"}) => (
  <td className="tdi">
    <div className="combo">
      <input type="number" step={step} value={num} onChange={e=>onNum(e.target.value)} placeholder={placeholder||""}/>
      <select className="usel" value={unit} onChange={e=>onUnit(e.target.value)}>
        {units.map(u=><option key={u} value={u}>{u}</option>)}
      </select>
    </div>
  </td>
);

/* ─────────────────────────────────────────────────────────────────
   RESIZABLE SIDEBAR HOOK
───────────────────────────────────────────────────────────────── */
/* ─────────────────────────────────────────────────────────────────
   SIDEBAR RESIZING
───────────────────────────────────────────────────────────────── */
const MIN_WIDTH = 200;
const MAX_WIDTH = 420;
const DEFAULT_WIDTH = 260;

function useResizableSidebar(open) {
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const dragging = useRef(false);
  const startX   = useRef(0);
  const startW   = useRef(0);
  const handleRef = useRef(null);

  useEffect(() => {
    const onMove = (e) => {
      if (!dragging.current) return;
      const dx = (e.clientX || e.touches?.[0]?.clientX || 0) - startX.current;
      const newW = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startW.current + dx));
      setWidth(newW);
    };
    const onUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      if (handleRef.current) handleRef.current.classList.remove("dragging");
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove);
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, []);

  const onDragStart = useCallback((e) => {
    dragging.current = true;
    startX.current = e.clientX || e.touches?.[0]?.clientX || 0;
    startW.current = width;
    if (handleRef.current) handleRef.current.classList.add("dragging");
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    e.preventDefault();
  }, [width]);

  return { width, handleRef, onDragStart };
}


/* ─────────────────────────────────────────────────────────────────
   HOME SCREEN
───────────────────────────────────────────────────────────────── */
/* ─────────────────────────────────────────────────────────────────
   HOME SCREEN
───────────────────────────────────────────────────────────────── */
function HomeScreen({ onOpenBlank, onOpenSpec, onOpenRaw }) {
  const tileStyle = {
    background: "var(--white)",
    border: "1px solid var(--g200)",
    borderRadius: 10,
    boxShadow: "var(--sh)",
    padding: "24px 22px",
    minHeight: 190,
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    textAlign: "left",
    transition: "transform .15s ease, box-shadow .15s ease, border-color .15s ease",
  };

  const titleStyle = {
    fontSize: 18,
    fontWeight: 800,
    color: "#111827",
    margin: 0,
    lineHeight: 1.2,
  };

  const bodyStyle = {
    fontSize: 13,
    color: "var(--g600)",
    lineHeight: 1.65,
    margin: 0,
  };

  return (
    <div className="layout">
      <div className="main">
        <div className="topbar">
          <div style={{fontSize:13,fontWeight:800,color:"#F9FAFB",letterSpacing:".2px"}}>Material Tools</div>
          <div className="tb-spacer"/>
          <div style={{fontSize:11,color:"#9CA3AF",fontFamily:"var(--mono)"}}>Select a module</div>
        </div>

        <div className="content">
          <div className="app-inner">
            <div className="card" style={{overflow:"visible"}}>
              <div className="ch" style={{justifyContent:"space-between"}}>
                <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                  <span className="ch-label ch-accent">Launchpad</span>
                  <span style={{fontSize:11,color:"var(--g500)",fontFamily:"var(--mono)"}}>
                    Choose a tool to open
                  </span>
                </div>
              </div>

              <div className="cbody" style={{padding:"28px"}}>
                <div style={{marginBottom:24}}>
                  <div style={{fontSize:30,fontWeight:800,color:"#111827",lineHeight:1.1,marginBottom:10}}>
                    Material Tools Home
                  </div>
                  <div style={{fontSize:14,color:"var(--g600)",maxWidth:760,lineHeight:1.7}}>
                    Blank is a placeholder. Spec Sheet opens the existing spec sheet modal. Raw Material Analysis opens the current application.
                  </div>
                </div>

                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(260px, 1fr))",gap:18}}>
                  <button
                    onClick={onOpenBlank}
                    className="btn"
                    style={{...tileStyle, cursor:"default"}}
                  >
                    <div>
                      <div style={{fontSize:26, marginBottom:12}}>⬜</div>
                      <div style={titleStyle}>Blank</div>
                      <p style={bodyStyle}>Reserved for the future blank tool. No action for now.</p>
                    </div>
                    <span className="yl-badge">Coming later</span>
                  </button>

                  <button
                    onClick={onOpenSpec}
                    className="btn"
                    style={{...tileStyle, cursor:"pointer"}}
                  >
                    <div>
                      <div style={{fontSize:26, marginBottom:12}}>📋</div>
                      <div style={titleStyle}>Spec Sheet</div>
                      <p style={bodyStyle}>Open the current spec sheet flow directly from the home page.</p>
                    </div>
                    <span className="btn b-blue" style={{padding:"6px 12px",fontSize:11}}>Open Spec Sheet</span>
                  </button>

                  <button
                    onClick={onOpenRaw}
                    className="btn"
                    style={{...tileStyle, cursor:"pointer"}}
                  >
                    <div>
                      <div style={{fontSize:26, marginBottom:12}}>🧪</div>
                      <div style={titleStyle}>Raw Material Analysis</div>
                      <p style={bodyStyle}>Open the full raw material analysis workspace.</p>
                    </div>
                    <span className="btn b-blue" style={{padding:"6px 12px",fontSize:11}}>Open Analysis</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{
          height: 34,
          background: "var(--g800)",
          borderTop: "1px solid rgba(255,255,255,.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#9CA3AF",
          fontSize: 10,
          letterSpacing: ".6px",
          textTransform: "uppercase"
        }}>
          Material Tools
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   APP
───────────────────────────────────────────────────────────────── */
/* ─────────────────────────────────────────────────────────────────
   ROOT APP
───────────────────────────────────────────────────────────────── */
export default function App() {
  const [sbOpen,       setSB]     = useState(true);
  const [currentId,    setCID]    = useState(null);
  const [isDraft,      setIsDraft]= useState(false);
  const [analysisName, setName]   = useState("");
  const [sachetQty,    setSachetQty] = useState(113.4);
  const [sachetUnit,   setSachetUnit] = useState("g");
  const [anchorUtil,   setAU]     = useState(95);
  const [whatIfUnits,  setWI]     = useState(7200);
  const [palletQty,    setPalletQty] = useState(500);
  const [palletUnit,   setPalletUnit] = useState("lb");
  const [productName,  setProductName] = useState("");
  const [productId,    setProductId] = useState("");
  const [productCategory, setProductCategory] = useState("");
  const [ings,         setIngs]   = useState(DEFAULT_INGS);
  const [saved,        setSaved]  = useState([]);
  const [folders,      setFolders]= useState([]);
  const [activeFolderId, setActiveFolderId] = useState("__all__");
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [currentVersion, setCurrentVersion] = useState(null);
  const [specSheetState, setSpecSheetState] = useState(null);
  const [dirty,        setDirty]  = useState(false);
  const [saving,       setSaving] = useState(false);
  const [loading,      setLoad]   = useState(true);
  const [search,       setSearch] = useState("");
  const [toast,        setToast]  = useState(null);
  const [showSpec,     setShowSpec]= useState(false);
  const [activePage, setActivePage] = useState("home");
  const [recipeApproved, setRecipeApproved] = useState(false);
  const [approvedDate,   setApprovedDate]   = useState("");
  const [recipeStatus,   setRecipeStatus]   = useState("Testing");

  const { width: sbWidth, handleRef: sbHandleRef, onDragStart } = useResizableSidebar(sbOpen);

  const toastRef = useRef(null);
  const autoRef  = useRef(null);
  const dirtyRef = useRef(false);
  const stateRef = useRef({});

  useEffect(()=>{
    stateRef.current={analysisName,sachetQty,sachetUnit,anchorUtil,whatIfUnits,palletQty,palletUnit,productName,productId,productCategory,ings,currentId,currentFolderId,currentVersion,isDraft,specSheetState,recipeApproved,approvedDate,recipeStatus};
  },[analysisName,sachetQty,sachetUnit,anchorUtil,whatIfUnits,palletQty,palletUnit,productName,productId,productCategory,ings,currentId,currentFolderId,currentVersion,isDraft,specSheetState,recipeApproved,approvedDate,recipeStatus]);

  const showToast = useCallback((msg)=>{
    setToast(msg);
    if(toastRef.current) clearTimeout(toastRef.current);
    toastRef.current=setTimeout(()=>setToast(null),2500);
  },[]);

  useEffect(()=>{
    (async()=>{
      try{
        const [ra, rf] = await Promise.all([fetch(`${API}/api/analyses`), fetch(`${API}/api/folders`)]);
        if(ra.ok) setSaved(await ra.json());
        if(rf.ok) setFolders(await rf.json());
      }catch(_){}
      setLoad(false);
    })();
  },[]);

  useEffect(()=>{ if(!loading){ setDirty(true); dirtyRef.current=true; } },[sachetQty,sachetUnit,anchorUtil,whatIfUnits,ings,specSheetState,recipeApproved,approvedDate,recipeStatus]);

  useEffect(()=>{
    autoRef.current=setInterval(async()=>{
      if(!dirtyRef.current) return;
      const s=stateRef.current;
      if (s.currentId && !s.isDraft) return;
      const name=s.analysisName.trim()||"Untitled Draft";
      const id=s.currentId||`draft_${Date.now()}`;
      const data={sachetQty:s.sachetQty,sachetUnit:s.sachetUnit,sachetGrams:toG(s.sachetQty,s.sachetUnit),anchorUtil:s.anchorUtil,whatIfUnits:s.whatIfUnits,palletQty:s.palletQty,palletUnit:s.palletUnit,productName:s.productName,productId:s.productId,productCategory:s.productCategory,ings:s.ings,specSheetState:s.specSheetState,recipeApproved:s.recipeApproved,approvedDate:s.approvedDate,recipeStatus:s.recipeStatus};
      try{
        const r=await fetch(`${API}/api/analyses`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,name,data,isDraft:true,folderId:s.currentFolderId,expectedVersion:s.currentVersion})});
        if(r.ok){
          const meta=await r.json();
          setSaved(prev=>{ const ex=prev.find(a=>a.id===id); return ex?prev.map(a=>a.id===id?meta:a):[...prev,meta]; });
          if(!s.currentId) setCID(id);
          setCurrentVersion(meta.version ?? null);
          setCurrentFolderId(meta.folderId ?? s.currentFolderId ?? null);
          setIsDraft(true); dirtyRef.current=false; setDirty(false);
          showToast("✦ Draft auto-saved");
        }
      }catch(_){}
    },30000);
    return ()=>clearInterval(autoRef.current);
  },[showToast]);

  const doSave = useCallback(async()=>{
    if(!analysisName.trim()) {
      showToast("⚠ Add a name first — click the title to rename");
      return;
    }
    const rawInitials = window.prompt("Enter initials for saved file name", "");
    if (rawInitials === null) return;
    const initials = rawInitials.trim().toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4);
    if (!initials) {
      showToast("⚠ Initials are required");
      return;
    }
    setSaving(true);
    const id=currentId||`a_${Date.now()}`;
    const data={sachetQty,sachetUnit,sachetGrams:toG(sachetQty,sachetUnit),anchorUtil,whatIfUnits,palletQty,palletUnit,productName,productId,productCategory,ings,specSheetState,recipeApproved,approvedDate,recipeStatus,initials};
    try{
      const r=await fetch(`${API}/api/analyses`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,name:analysisName.trim(),initials,data,isDraft:false,folderId:currentFolderId,expectedVersion:currentVersion})});
      if(!r.ok) throw new Error("Server error "+r.status);
      const meta=await r.json();
      setSaved(prev=>{ const ex=prev.find(a=>a.id===id); return ex?prev.map(a=>a.id===id?meta:a):[...prev,meta]; });
      setCID(id); setCurrentVersion(meta.version ?? null); setCurrentFolderId(meta.folderId ?? currentFolderId ?? null); setName(meta.name || `${analysisName.trim()} - ${initials}`); setDirty(false); dirtyRef.current=false; setIsDraft(false);
      showToast("✓ Saved successfully");
    }catch(e){ alert("Save failed: "+e.message); }
    setSaving(false);
  },[analysisName,currentId,currentFolderId,currentVersion,sachetQty,sachetUnit,anchorUtil,whatIfUnits,palletQty,palletUnit,productName,productId,productCategory,ings,specSheetState,recipeApproved,approvedDate,recipeStatus,showToast]);

  const doLoad = useCallback(async(id)=>{
    try{
      const r=await fetch(`${API}/api/analyses/${id}`); if(!r.ok) throw new Error("Not found");
      const body=await r.json();
      const {data:d,name,isDraft:dr,folderId,version}=body;
      setSachetQty(d.sachetQty ?? d.sachetGrams);
      setSachetUnit(d.sachetUnit || "g");
      setAU(d.anchorUtil!=null?d.anchorUtil:d.dollarWt!=null?d.dollarWt*100:95);
      setWI(d.whatIfUnits??d.whatIfMOQ??"");
      setPalletQty(d.palletQty ?? 500);
      setPalletUnit(d.palletUnit || "lb");
      setProductName(d.productName || "");
      setProductId(d.productId || "");
      setProductCategory(d.productCategory || "");
      setIngs((d.ings || []).map(ing=>({costUnit:"lb",...ing})));
      setSpecSheetState(d.specSheetState || null);
      setRecipeApproved(d.recipeApproved||false);
      setApprovedDate(d.approvedDate||"");
      setRecipeStatus(d.recipeStatus||"Testing");
      setCID(id); setName(name||""); setCurrentFolderId(folderId ?? null); setCurrentVersion(version ?? null); setDirty(false); dirtyRef.current=false; setIsDraft(!!dr);
    }catch(e){ alert("Load failed: "+e.message); }
  },[]);

  const doClone = useCallback(async(id)=>{
    try{
      const r=await fetch(`${API}/api/analyses/${id}`); if(!r.ok) throw new Error("Not found");
      const {data:d,name}=await r.json();
      setSachetQty(d.sachetQty ?? d.sachetGrams); setSachetUnit(d.sachetUnit || "g"); setAU(d.anchorUtil!=null?d.anchorUtil:95); setWI(d.whatIfUnits??""); setPalletQty(d.palletQty ?? 500); setPalletUnit(d.palletUnit || "lb"); setProductName(d.productName || ""); setProductId(d.productId || ""); setProductCategory(d.productCategory || "");
      setIngs((d.ings || []).map(ing=>({costUnit:"lb",...ing})));
      setSpecSheetState(d.specSheetState || null);
      setRecipeApproved(d.recipeApproved||false);
      setApprovedDate(d.approvedDate||"");
      setRecipeStatus(d.recipeStatus||"Testing");
      setCID(null); setCurrentFolderId(null); setCurrentVersion(null); setName(`Copy of ${name||"Untitled"}`);
      setDirty(true); dirtyRef.current=true; setIsDraft(false);
      showToast("Cloned — rename and save");
    }catch(e){ alert("Clone failed: "+e.message); }
  },[showToast]);

  const doDel = useCallback(async(id)=>{
    if(!confirm("Delete this analysis?")) return;
    try{
      const r=await fetch(`${API}/api/analyses/${id}`,{method:"DELETE"}); if(!r.ok) throw new Error();
      setSaved(prev=>prev.filter(a=>a.id!==id));
      if(currentId===id){ setCID(null); setName(""); setDirty(false); setIsDraft(false); }
    }catch(e){ alert("Delete failed: "+e.message); }
  },[currentId]);

  const doRename = useCallback(async(id, newName)=>{
    try{
      const r=await fetch(`${API}/api/analyses/${id}`); if(!r.ok) throw new Error("Not found");
      const body=await r.json();
      const r2=await fetch(`${API}/api/analyses`,{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({id, name:newName, data:body.data, isDraft:body.isDraft||false, folderId: body.folderId, expectedVersion: body.version})});
      if(!r2.ok) throw new Error("Save failed");
      const meta=await r2.json();
      setSaved(prev=>prev.map(a=>a.id===id?{...a,name:meta.name || newName,savedAt:meta.savedAt,folderId:meta.folderId,version:meta.version}:a));
      if(currentId===id) setName(meta.name || newName);
      showToast("✓ Renamed");
    }catch(e){ alert("Rename failed: "+e.message); }
  },[currentId, showToast]);

  const doNew = ()=>{
    if(dirty&&!confirm("Unsaved changes — continue?")) return;
    setSachetQty(""); setSachetUnit("g"); setAU(95); setWI(""); setPalletQty(500); setPalletUnit("lb"); setProductName(""); setProductId(""); setProductCategory(""); setIngs([blankIng()]);
    setCID(null); setName(""); setCurrentVersion(null); setCurrentFolderId(null); setSpecSheetState(null); setDirty(false); dirtyRef.current=false; setIsDraft(false);
    setRecipeApproved(false); setApprovedDate(""); setRecipeStatus("Testing");
  };

  const doDownload = useCallback(async()=>{
    try{
      const res=await fetch(`${API}/export`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({analysisName,sachetQty,sachetUnit,sachetGrams:toG(sachetQty,sachetUnit),anchorUtil,whatIfUnits,palletQty,palletUnit,productName,productId,productCategory,ings})});
      if(!res.ok) throw new Error("Server returned "+res.status);
      const blob=await res.blob(), url=URL.createObjectURL(blob), a=document.createElement("a");
      a.href=url; a.download=`${(analysisName||"Analysis").replace(/[^a-zA-Z0-9_\- ]/g,"_")}.xlsx`; a.click(); URL.revokeObjectURL(url);
    }catch(e){ alert("Download failed: "+e.message); }
  },[analysisName,sachetQty,sachetUnit,anchorUtil,whatIfUnits,palletQty,palletUnit,productName,productId,productCategory,ings]);

  const doCreateFolder = useCallback(async()=>{
    const name = window.prompt("Folder name");
    if(!name || !name.trim()) return;
    try{
      const r = await fetch(`${API}/api/folders`, {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({name:name.trim()})});
      if(!r.ok) throw new Error("Server error "+r.status);
      const folder = await r.json();
      setFolders(prev => [...prev.filter(f=>f.id!==folder.id), folder]);
      setActiveFolderId(folder.id);
      showToast("✓ Folder created");
    }catch(e){ alert("Folder create failed: "+e.message); }
  },[showToast]);

  const doMoveToFolder = useCallback(async(id, folderId)=>{
    try{
      const r = await fetch(`${API}/api/analyses/${id}/folder`, {method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({folderId})});
      if(!r.ok) throw new Error("Server error "+r.status);
      const meta = await r.json();
      setSaved(prev => prev.map(a => a.id===id ? {...a, folderId: meta.folderId, savedAt: meta.savedAt} : a));
      if(currentId===id) setCurrentFolderId(meta.folderId ?? null);
      showToast(folderId ? "✓ Moved to folder" : "✓ Removed from folder");
    }catch(e){ alert("Move failed: "+e.message); }
  },[currentId, showToast]);

  const upd     = (i,f,v)=>{ const c=[...ings]; c[i]={...c[i],[f]:v}; setIngs(c); };
  const addRow  = ()=>setIngs([...ings,blankIng()]);
  const delRow  = (i)=>setIngs(ings.filter((_,j)=>j!==i));
  const togAnch = (i,auto)=>{
    const c=[...ings], cur=c[i].anchorOvr!==null?c[i].anchorOvr:auto;
    c[i]={...c[i],anchorOvr:cur==="Y"?"N":"Y"}; setIngs(c);
  };
  const togTotal = (i)=>{
    const c=[...ings];
    const cur=c[i].totalOvr==="N"?"N":"Y";
    c[i]={...c[i],totalOvr:cur==="Y"?"N":"Y"};
    setIngs(c);
  };

  const C = useMemo(()=>{
    const sg=toG(pf(sachetQty), sachetUnit),wi=pf(whatIfUnits)||0,auDec=pf(anchorUtil)/100;
    const rows=ings.map(ing=>{
      const costU=ing.costUnit||"lb", lcg=pf(ing.costPerLb)/(UNIT_TO_G[costU]||453.592);
      const gpU=pf(ing.pct)*sg, cpU=gpU*lcg;
      const moqG=toG(pf(ing.moq),ing.unit), piG=piGrams(ing.pi,ing.piUnit,ing.unit);
      const moqCost=moqG*lcg, anchorScore=moqCost*auDec, uth=gpU>0?(moqG*auDec)/gpU:0;
      const autoEl=lcg>0?"Y":"N", anchorEl=ing.anchorOvr!==null?ing.anchorOvr:autoEl;
      const totalEl=ing.totalOvr==="N"?"N":"Y";
      return{...ing,lcg,gpU,cpU,moqG,piG,moqCost,anchorScore,uth,autoEl,anchorEl,totalEl};
    });

    const eligComp=rows.filter(r=>r.totalEl==="Y"&&r.anchorEl==="Y"&&r.uth>0&&r.cpU>0).map(r=>r.uth*r.cpU);
    const ranked=rows.map(r=>({...r,rank:r.totalEl==="Y"&&r.anchorEl==="Y"&&r.uth>0&&r.cpU>0
      ?1+eligComp.filter(s=>s>r.uth*r.cpU).length
      :null}));

    const eligRows=ranked.filter(r=>r.totalEl==="Y"&&r.anchorEl==="Y"&&r.uth>0&&r.cpU>0);
    const moqPool=eligRows.length>=3?eligRows.filter(r=>r.rank<=3):eligRows;
    const spON=moqPool.reduce((s,r)=>s+(r.uth*r.uth*r.cpU),0);
    const spN =moqPool.reduce((s,r)=>s+(r.uth*r.cpU),0);
    const recMOQ=spN>0?Math.ceil(spON/spN):0;

    const countedRows=ranked.filter(r=>r.totalEl==="Y");
    const totCpU=countedRows.reduce((s,r)=>s+r.cpU,0), cpg=sg>0?totCpU/sg:0;
    const pctSum=ranked.reduce((s,r)=>s+pf(r.pct),0), totMoqCost=countedRows.reduce((s,r)=>s+r.moqCost,0);
    const planU=wi||recMOQ;
    const ppRows=ranked.map(r=>{
      const reqG=r.gpU*planU, purG=gramsToBuy(reqG,r.moqG,r.piG), npiW=calcNPIs(reqG,r.moqG,r.piG);
      const lefG=purG-reqG, purD=purG*r.lcg, usedD=reqG*r.lcg, lefD=purD-usedD;
      const buyUnit=r.unit||"g";
      const buyQty=purG/(UNIT_TO_G[buyUnit]||1);
      return{...r,reqG,purG,npiW,lefG,purD,usedD,lefD,gutil:purG>0?reqG/purG:0,dutil:purD>0?usedD/purD:0,buyQty,buyUnit};
    });
    const countedPurchaseRows=ppRows.filter(r=>r.totalEl==="Y");
    const totPurG=countedPurchaseRows.reduce((s,r)=>s+r.purG,0), totReqG=countedPurchaseRows.reduce((s,r)=>s+r.reqG,0);
    const totLefG=countedPurchaseRows.reduce((s,r)=>s+r.lefG,0), totPurD=countedPurchaseRows.reduce((s,r)=>s+r.purD,0);
    const totUsedD=countedPurchaseRows.reduce((s,r)=>s+r.usedD,0), totLefD=countedPurchaseRows.reduce((s,r)=>s+r.lefD,0);
    const ppGU=totPurG>0?totReqG/totPurG:0, ppDU=totPurD>0?totUsedD/totPurD:0;
    const ppGRisk=totPurG>0?totLefG/totPurG:0, ppDRisk=totPurD>0?totLefD/totPurD:0;
    const palletG = toG(pf(palletQty), palletUnit);
    const palletsPurchased = palletG>0 ? totPurG / palletG : 0;
    const palletsGoingOut = palletG>0 ? totReqG / palletG : 0;
    const palletsLeftWithUs = palletG>0 ? totLefG / palletG : 0;
    return{ranked,ppRows,recMOQ,eligRows:eligRows.length,totCpU,cpg,pctSum,totMoqCost,totPurG,totReqG,totLefG,totPurD,totUsedD,totLefD,
      ppGU,ppDU,ppGRisk,ppDRisk,ppCpG:planU*sg>0?totPurD/(planU*sg):0,ppCpU:planU>0?totPurD/planU:0,planU,
      palletG,palletsPurchased,palletsGoingOut,palletsLeftWithUs};
  },[ings,sachetQty,sachetUnit,anchorUtil,whatIfUnits,palletQty,palletUnit]);

  const pctOk = Math.abs(C.pctSum-1)<0.0001;
  const filtered = saved.filter(a=>{
    const matchesSearch = a.name?.toLowerCase().includes(search.toLowerCase());
    const matchesFolder = activeFolderId === "__all__" ? true : activeFolderId === "__unfiled__" ? !a.folderId : a.folderId === activeFolderId;
    return matchesSearch && matchesFolder;
  });
  const savedItems = filtered.filter(a=>!a.isDraft);
  const draftItems = filtered.filter(a=>a.isDraft);

  if(loading) return <><S/><div className="loader"><div className="pulse">📦</div><div style={{color:"#334155",fontSize:14}}>Loading…</div></div></>;

  if (activePage === "home") {
    return (
      <>
        <S />
        <HomeScreen
          onOpenBlank={() => {}}
          onOpenSpec={() => {
            setActivePage("analysis");
            setShowSpec(true);
          }}
          onOpenRaw={() => {
            setActivePage("analysis");
            setShowSpec(false);
          }}
        />
      </>
    );
  }

  return (
    <>
      <S/>
      <div className="layout">

        {/* ── SIDEBAR ─────────────────────────────────────── */}
        <div
          className={`sidebar ${sbOpen ? "open" : "collapsed"}`}
          style={sbOpen ? { width: sbWidth } : {}}
        >
          {/* Resize handle — only visible when open */}
          {sbOpen && (
            <div
              ref={sbHandleRef}
              className="sb-resize-handle"
              onMouseDown={onDragStart}
              onTouchStart={onDragStart}
              title="Drag to resize"
            />
          )}

          {/* Collapsed rail */}
          {!sbOpen && (
            <div className="sb-rail" style={{paddingTop:10}}>
              <button className="sb-rail-btn" title="Open sidebar" onClick={()=>setSB(true)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M8 7h8M8 11h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
              </button>
              <button className="sb-rail-btn" title="New analysis" onClick={doNew}>＋</button>
              {saved.slice(0,6).map(a=>(
                <button
                  key={a.id}
                  className={`sb-rail-btn${a.id===currentId?" active":""}`}
                  title={a.name}
                  onClick={()=>doLoad(a.id)}
                  style={{fontSize:11,fontWeight:700,letterSpacing:0}}
                >
                  {(a.name||"?").slice(0,2).toUpperCase()}
                </button>
              ))}
            </div>
          )}

          {/* Full sidebar content */}
          <div className="sb-full">
            <div className="sb-top">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{flexShrink:0}} xmlns="http://www.w3.org/2000/svg">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="#FCD34D" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" stroke="#FCD34D" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8 7h8M8 11h6" stroke="#FCD34D" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              <div className="sb-brand-text">
                Recipe Book
              </div>
              <button
                onClick={()=>setSB(false)}
                title="Collapse sidebar"
                style={{
                  width:26,height:26,border:"none",borderRadius:5,flexShrink:0,
                  background:"rgba(255,255,255,.07)",color:"#9CA3AF",
                  cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",
                  transition:"all .15s",
                }}
                onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,.15)";e.currentTarget.style.color="#fff"}}
                onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,.07)";e.currentTarget.style.color="#9CA3AF"}}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8 2L4 6l4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>



            <div className="sb-search">
              <input type="text" placeholder="Search analyses…" value={search} onChange={e=>setSearch(e.target.value)}/>
            </div>

            <div className="sb-meta">{filtered.length} / {saved.length} analyses</div>

                 <div className="sb-list">
              {filtered.length===0 && (
                <div className="sb-empty">{saved.length===0?"No analyses yet.\nClick + New to start.":"No results."}</div>
              )}
              {savedItems.length>0 && <>
                <div className="sb-section-lbl">Saved</div>
                {savedItems.map(a=>(
                  <SbRow key={a.id} a={a} isActive={a.id===currentId} onOpen={doLoad} onDelete={doDel} onRename={doRename}/>
                ))}
              </>}
              {draftItems.length>0 && <>
                <div className="sb-section-lbl" style={{marginTop:savedItems.length>0?8:0}}>Drafts</div>
                {draftItems.map(a=>(
                  <SbRow key={a.id} a={a} isActive={a.id===currentId} onOpen={doLoad} onDelete={doDel} onRename={doRename}/>
                ))}
              </>}
            </div>
          </div>
        </div>

        {/* ── MAIN ──────────────────────────────────────── */}
        <div className="main">

          {/* Topbar */}
          <div className="topbar">
            {/* Inline rename */}
            <InlineTitle
              value={analysisName}
              onChange={setName}
              placeholder="Untitled"
            />
            {/* Save — always blue */}
            <button
              className="btn b-blue"
              onClick={doSave}
              disabled={saving}
              style={{marginLeft:8, fontSize:12, padding:"5px 14px", flexShrink:0}}
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <div className="tb-spacer"/>
            {/* Action buttons */}
            <div style={{display:"flex",gap:6,alignItems:"center"}}>
              <button
                className="btn b-blue"
                style={{fontSize:11,padding:"5px 10px"}}
                onClick={() => {
                  setShowSpec(false);
                  setActivePage("home");
                }}
                title="Back to home"
              >
                ⌂ Home
              </button>
              <button className="btn b-blue" style={{fontSize:11,padding:"5px 10px"}} disabled={!currentId} onClick={()=>currentId&&doClone(currentId)} title="Clone active analysis">⧉ Clone</button>
              <button className="btn b-blue" style={{fontSize:11,padding:"5px 10px"}} onClick={doDownload}>⬇ Excel</button>
              <button className="btn b-blue" style={{fontSize:11,padding:"5px 10px"}} onClick={doNew}>＋ New</button>
            </div>
          </div>



          {/* Content */}
          <div className="content">
            <div className="app-inner">

              {/* ── STATUS BANNER ── */}
              {(()=>{
                const cfg = recipeStatus==="Approved"
                  ? {bg:"#F0FDF4",border:"#86EFAC",text:"#14532D",accent:"#15803D",label:"✓ Approved"}
                  : recipeStatus==="Testing"
                  ? {bg:"#FFFBEB",border:"#FCD34D",text:"#78350F",accent:"#D97706",label:"⏳ Testing"}
                  : {bg:"#FEF2F2",border:"#FECACA",text:"#7F1D1D",accent:"#DC2626",label:"✕ Rejected"};
                return (
                  <div style={{
                    background:cfg.bg,
                    border:`1.5px solid ${cfg.border}`,
                    borderRadius:10,
                    padding:"10px 18px",
                    marginBottom:16,
                    display:"flex",
                    alignItems:"center",
                    gap:12,
                    flexWrap:"wrap",
                    boxShadow:`0 4px 20px ${cfg.border}88`,
                    transition:"all .35s",
                    position:"sticky",
                    top:0,
                    zIndex:10,
                  }}>
                    {/* Status label */}
                    <span style={{fontSize:11,fontWeight:700,color:cfg.text,textTransform:"uppercase",letterSpacing:".8px",whiteSpace:"nowrap"}}>Status</span>
                    <select
                      value={recipeStatus}
                      onChange={e=>{
                        setRecipeStatus(e.target.value);
                        if(e.target.value==="Approved" && !approvedDate)
                          setApprovedDate(new Date().toISOString().split("T")[0]);
                      }}
                      style={{
                        appearance:"none",WebkitAppearance:"none",
                        padding:"5px 28px 5px 12px",
                        borderRadius:6,fontSize:13,fontWeight:800,
                        fontFamily:"'IBM Plex Sans',sans-serif",
                        cursor:"pointer",outline:"none",
                        border:`2px solid ${cfg.accent}`,
                        background:cfg.accent,color:"#fff",
                        backgroundImage:"url(%22data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2710%27 height=%2710%27 viewBox=%270 0 10 10%27%3E%3Cpath fill=%27%23ffffff%27 d=%27M5 7L0 2h10z%27/%3E%3C/svg%3E%22)",
                        backgroundRepeat:"no-repeat",
                        backgroundPosition:"right 9px center",
                      }}
                    >
                      <option value="Approved">✓ Approved</option>
                      <option value="Testing">⏳ Testing</option>
                      <option value="Rejected">✕ Rejected</option>
                    </select>

                    {(recipeStatus==="Approved" || recipeStatus==="Testing") && <>
                      <div style={{width:1,height:20,background:cfg.border,flexShrink:0}}/>
                      <span style={{fontSize:12,color:cfg.text,fontWeight:600,whiteSpace:"nowrap"}}>
                        {recipeStatus==="Approved" ? "Approved Date:" : "Target Date:"}
                      </span>
                      <input
                        type="date"
                        value={approvedDate}
                        onChange={e=>setApprovedDate(e.target.value)}
                        style={{
                          background:"rgba(255,255,255,.7)",
                          border:`1.5px solid ${cfg.border}`,
                          borderRadius:5,color:cfg.text,
                          fontFamily:"'IBM Plex Mono',monospace",
                          fontSize:12,padding:"4px 8px",outline:"none",cursor:"pointer",
                        }}
                      />
                      <div style={{width:1,height:20,background:cfg.border,flexShrink:0}}/>
<button
                        onClick={()=>setShowSpec(true)}
                        style={{
                          display:"flex",alignItems:"center",gap:6,
                          background:cfg.accent,color:"#fff",
                          border:"none",borderRadius:6,
                          padding:"6px 14px",fontSize:12,fontWeight:700,
                          cursor:"pointer",fontFamily:"'IBM Plex Sans',sans-serif",
                          boxShadow:`0 2px 8px ${cfg.accent}55`,
                        }}
                      >📋 Spec Sheet</button>
                    </>}

                    <div style={{marginLeft:"auto"}}>
                      <div className="yl-badge">■ Yellow = User Input</div>
                    </div>
                  </div>
                );
              })()}

              <Div label="Section 1 — Scenario Parameters"/>
              <div className="card">
                <div className="ch"><span className="ch-label">Scenario <span className="ch-accent">Inputs</span></span></div>
                <div className="cbody">
                  <div className="igrid" style={{gridTemplateColumns:"1fr 1fr 1fr",marginBottom:12}}>
                    <div className="igroup">
                      <label className="ilabel">SKU / Product ID</label>
                      <input type="text" className="ifield" value={productId} onChange={e=>setProductId(e.target.value)} placeholder="e.g. CRS208"/>
                    </div>
                    <div className="igroup">
                      <label className="ilabel">Product Name</label>
                      <input type="text" className="ifield" value={productName} onChange={e=>setProductName(e.target.value)} placeholder="e.g. Chocolate Rimming Sugar"/>
                    </div>
                    <div className="igroup">
                      <label className="ilabel">Product Category</label>
                      <input type="text" className="ifield" value={productCategory} onChange={e=>setProductCategory(e.target.value)} placeholder="e.g. Rimming Sugar"/>
                    </div>
                  </div>
                  <div className="igrid" style={{gridTemplateColumns:"1fr 1fr 1fr"}}>
                    <div className="igroup">
                      <label className="ilabel">Per Unit Weight</label>
                      <div style={{display:"flex",alignItems:"stretch",background:"var(--yinput)",border:"1.5px solid var(--yborder)",borderRadius:"var(--rs)",overflow:"hidden"}}>
                        <input type="number" step="any" className="ifield" value={sachetQty} onChange={e=>setSachetQty(e.target.value)} placeholder="e.g. 113.4" style={{border:"none",borderRadius:0,flex:1,background:"transparent",boxShadow:"none"}}/>
                        <select value={sachetUnit} onChange={e=>setSachetUnit(e.target.value)} style={{width:64,border:"none",borderLeft:"1px solid var(--yborder)",background:"transparent",color:"#111827",fontFamily:"var(--mono)",fontSize:12,fontWeight:700,padding:"0 8px",outline:"none",cursor:"pointer"}}>
                          {ALL_UNITS.map(u=><option key={u} value={u}>{u}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="igroup">
                      <label className="ilabel">Anchor Utilization (%)</label>
                      <input type="number" step="any" min="0" max="100" className="ifield" value={anchorUtil} onChange={e=>setAU(e.target.value)} placeholder="e.g. 95"/>
                    </div>
                    <div className="igroup">
                      <label className="ilabel">Per Pallet</label>
                      <div style={{display:"flex",alignItems:"stretch",background:"var(--yinput)",border:"1.5px solid var(--yborder)",borderRadius:"var(--rs)",overflow:"hidden"}}>
                        <input type="number" step="any" className="ifield" value={palletQty} onChange={e=>setPalletQty(e.target.value)} placeholder="e.g. 500" style={{border:"none",borderRadius:0,flex:1,background:"transparent",boxShadow:"none"}}/>
                        <select value={palletUnit} onChange={e=>setPalletUnit(e.target.value)} style={{width:64,border:"none",borderLeft:"1px solid var(--yborder)",background:"transparent",color:"#111827",fontFamily:"var(--mono)",fontSize:12,fontWeight:700,padding:"0 8px",outline:"none",cursor:"pointer"}}>
                          {ALL_UNITS.map(u=><option key={u} value={u}>{u}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <Div label="Section 2 — Recipe & Vendor Input"/>
              <div className="card">
                <div className="ch">
                  <span className="ch-label">Recipe &amp; Vendor <span className="ch-accent">Input</span></span>
                  <span style={{marginLeft:8,fontSize:11,color:"var(--g400)",fontStyle:"italic"}}>ingredient matrix · scenario-independent</span>
                  <div style={{marginLeft:"auto",padding:"3px 9px",borderRadius:4,background:pctOk?"var(--green-l)":"var(--red-l)",border:`1px solid ${pctOk?"#86EFAC":"#FECACA"}`,fontSize:11,fontFamily:"var(--mono)",color:pctOk?"var(--green)":"var(--red)"}}>
                    Σ = {(C.pctSum*100).toFixed(2)}% {pctOk?"✓":"⚠ must = 100%"}
                  </div>
                </div>
                <div className="cbody" style={{paddingBottom:12}}>
                  <div className="sgrid">
                    <SC label="Recommended MOQ"    value={fmt(C.recMOQ,0)+" units"} sub={C.eligRows>=3?"top 3 anchor weighted":"full-pool weighted (fallback)"} color="c-yellow"/>
                    <SC label="Recipe Cost / Unit" value={fmtC4(C.totCpU)}          sub="at 100% efficiency"  color="c-green"/>
                    <SC label="Recipe Cost / Gram" value={"$"+fmt(C.cpg,4)}         sub="at 100% efficiency"  color="c-green"/>
                    <SC label="Min. MOQ Cost"      value={fmtC(C.totMoqCost)}       sub="sum of all 1× MOQ"   color="c-blue"/>
                  </div>
                </div>
                <div className="inner-divider"><div className="inner-divider-line"/><span className="inner-divider-label">Ingredient Matrix</span><div className="inner-divider-line"/></div>
                <div className="twrap">
                  <table>
                    <thead>
                      <tr>
                        <th className="grp grp-dark tl" rowSpan={2} style={{position:"sticky",left:0,zIndex:5}}>Ingredient</th>
                        <th className="grp grp-vendor tip-th" colSpan={3} data-tip="User-entered purchasing inputs for each ingredient.">Vendor Inputs</th>
                        <th className="grp grp-recipe tip-th" colSpan={2} data-tip="Ingredient usage in the finished formula and resulting grams per finished unit.">Recipe</th>
                        <th className="grp grp-cost tip-th" colSpan={2} data-tip="Cost calculated from supplier pricing and recipe usage.">Cost</th>
                        <th className="grp grp-moq tip-th" colSpan={3} data-tip="MOQ and PI converted to grams and cost for comparison.">MOQ Reference</th>
                        <th className="grp grp-anchor tip-th" colSpan={3} data-tip="Metrics used to estimate recommended anchor MOQ.">Anchor Analysis</th>
                        <th className="grp grp-elig tip-th" rowSpan={2} data-tip="This column is tied to anchorEl via togAnch. Y includes the ingredient in anchor MOQ ranking and recommended MOQ calculations; N excludes it from that anchor analysis.">Totals</th>
                        <th className="grp grp-elig tip-th tip-right" rowSpan={2} data-tip="This column is tied to totalEl via togTotal. Y includes the ingredient in totals, MOQ, pallet, and what-if rollups; N keeps it in the recipe but excludes it from those rollup totals.">Elig.</th>
                        <th className="grp grp-dark" rowSpan={2} style={{width:38}}></th>
                      </tr>
                      <tr>
                        <th className="sh-vendor tip-th" style={{width:106}} data-tip="Minimum order quantity from the vendor, entered in the selected unit.">MOQ</th>
                        <th className="sh-vendor tip-th" style={{width:106}} data-tip="Purchase increment or reorder increment added after MOQ, in the selected unit.">PI</th>
                        <th className="sh-vendor tip-th" style={{width:106}} data-tip="Vendor price per selected purchase unit.">Cost / Unit</th>
                        <th className="sh-recipe tip-th" style={{width:98}} data-tip="Percentage of the total recipe assigned to this ingredient.">Formula %</th>
                        <th className="sh-recipe tip-th" data-tip="Grams of this ingredient used in one unit.">g / Unit</th>
                        <th className="sh-cost tip-th" data-tip="Converted cost per gram for this ingredient.">Cost / g</th>
                        <th className="sh-cost tip-th" data-tip="Ingredient cost contribution to one finished unit.">Cost / Unit</th>
                        <th className="sh-moq tip-th" data-tip="Vendor MOQ converted into grams.">MOQ (g)</th>
                        <th className="sh-moq tip-th" data-tip="Vendor purchase increment converted into grams.">PI (g)</th>
                        <th className="sh-moq tip-th" data-tip="Total cost of buying one MOQ of this ingredient.">MOQ Cost ($)</th>
                        <th className="sh-anchor tip-th" data-tip="MOQ cost adjusted by anchor utilization percent.">Anchor Score</th>
                        <th className="sh-anchor tip-th" data-tip="Approx no. of finished units needed before MOQ becomes justified under anchor assumptions.">Units to Hit</th>
                        <th className="sh-anchor tip-th" data-tip="Relative priority rank among eligible ingredients based on anchor analysis.">Rank</th>
                      </tr>
                    </thead>
                    <tbody>
                      {C.ranked.map((r,i)=>(
                        <tr key={i}>
                          <td className="nc tdi" style={{background:"var(--yinput)",position:"sticky",left:0,zIndex:3}}>
                            <input type="text" className="ni" value={ings[i].name} onChange={e=>upd(i,"name",e.target.value)} placeholder="Ingredient name" style={{minWidth:168}}/>
                          </td>
                          <Combo num={ings[i].moq} onNum={v=>upd(i,"moq",v)} unit={ings[i].unit} onUnit={v=>upd(i,"unit",v)} units={ALL_UNITS} step="1"/>
                          <Combo num={ings[i].pi} onNum={v=>upd(i,"pi",v)} unit={ings[i].piUnit||ings[i].unit} onUnit={v=>upd(i,"piUnit",v)} units={[...new Set([ings[i].unit,...ALL_UNITS])]} placeholder="PI"/>
                          <Combo num={ings[i].costPerLb} onNum={v=>upd(i,"costPerLb",v)} unit={ings[i].costUnit||"lb"} onUnit={v=>upd(i,"costUnit",v)} units={ALL_UNITS} step="any"/>
                          <td className="tdi" style={{width:98}}>
                            <input type="number" step="any" value={pctDisp(ings[i].pct)} onChange={e=>upd(i,"pct",pctParse(e.target.value))} placeholder="e.g. 69.22" style={{width:98}}/>
                          </td>
                          <td className="tr">{fmt(r.gpU,3)} g</td>
                          <td className="tr">{fmt(r.lcg,5)}</td>
                          <td className="tr">{fmtC4(r.cpU)}</td>
                          <td className="tr">{fmt(r.moqG,1)} g</td>
                          <td className="tr">{r.piG>0?fmt(r.piG,2)+" g":"—"}</td>
                          <td className="tr">{fmtC(r.moqCost)}</td>
                          <td className="tr" style={{opacity:r.anchorEl==="Y"&&r.totalEl==="Y"?1:0.3}}>{r.anchorScore>0?fmtC(r.anchorScore):"—"}</td>
                          <td className="tr" style={{opacity:r.anchorEl==="Y"&&r.totalEl==="Y"?1:0.3}}>{r.uth>0?fmt(r.uth,1):"—"}</td>
                          <td className="tc"><RankBadge rank={r.rank}/></td>
                          <td className="tc"><button className={r.anchorEl==="Y"?"ty":"tn"} onClick={()=>togAnch(i,r.autoEl)}>{r.anchorEl}</button></td>
                          <td className="tc"><button className={r.totalEl==="Y"?"ty":"tn"} onClick={()=>togTotal(i)}>{r.totalEl}</button></td>
                          <td className="tc">
                            <button className="btn-del-row" onClick={()=>delRow(i)} title="Remove ingredient">
                              <TrashIcon size={13}/>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td className="nc">TOTALS</td><td colSpan={3}/>
                        <td className="tr" style={{color:pctOk?"var(--green)":"var(--red)"}}>{(C.pctSum*100).toFixed(2)}%</td>
                        <td className="tr">{fmt(toG(pf(sachetQty), sachetUnit),2)} g</td>
                        <td/><td className="tr">{fmtC4(C.totCpU)}</td>
                        <td/><td/><td className="tr">{fmtC(C.totMoqCost)}</td>
                        <td colSpan={6}/>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <div className="addbar">
                  <button className="btn b-yellow" onClick={addRow}>+ Add Ingredient</button>
                  <span className="addhint">Formula % as percentage (e.g. 69.22) · <strong style={{color:"var(--green)"}}>Totals Y</strong> = include in Rec MOQ · <strong style={{color:"var(--green)"}}>Elig. Y</strong> = include in MOQ / pallet / what-if rollups</span>
                </div>
                {!pctOk&&(
                  <div style={{padding:"10px 16px",background:"#FEF2F2",borderTop:"2px solid var(--red)",display:"flex",alignItems:"center",gap:8}}>
                    <span>⚠️</span>
                    <span style={{fontWeight:700,color:"var(--red)",fontSize:12}}>
                      Recipe does not sum to 100% — {(C.pctSum*100).toFixed(4)}%
                      {C.pctSum<1?` (${((1-C.pctSum)*100).toFixed(4)}% short)`:`(${((C.pctSum-1)*100).toFixed(4)}% over)`}
                    </span>
                  </div>
                )}
              </div>

              <Div label="Section 3 — What-If Scenario Analysis"/>
              <div className="card">
                <div className="ch">
                  <span className="ch-label">What-If <span className="ch-accent">Scenario</span></span>
                  <span style={{marginLeft:"auto",fontFamily:"var(--mono)",fontSize:11,color:"var(--g400)"}}>@ {fmt(C.planU,0)} units</span>
                </div>
                <div className="cbody" style={{paddingBottom:12}}>
                  <div style={{marginBottom:12}}>
                    <div className="igroup" style={{maxWidth:260}}>
                      <label className="ilabel">What-If Units</label>
                      <input type="number" className="ifield" value={whatIfUnits} onChange={e=>setWI(e.target.value)} placeholder={`Auto: ${fmt(C.recMOQ,0)} (Rec. MOQ)`}/>
                    </div>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
                    <CostMetricCard label="Cost / Gram" wiValue={`$${fmt(C.ppCpG,4)}`} idealValue={`$${fmt(C.cpg,4)}`} delta={C.ppCpG-C.cpg} sub={`at ${fmt(C.planU,0)} units`}/>
                    <CostMetricCard label="Cost / Unit" wiValue={fmtC4(C.ppCpU)} idealValue={fmtC4(C.totCpU)} delta={C.ppCpU-C.totCpU} sub={`at ${fmt(C.planU,0)} units`}/>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(3, minmax(0, 1fr))",gap:10,marginBottom:12}}>
                    <SC label="Pallets Purchased" value={C.palletG>0 ? palletDisplay(C.totPurG, C.palletG) : "—"} sub={C.palletG>0 ? `${fmt(C.totPurG,0)} g total purchased` : "Enter Per Pallet in Scenario Inputs"} color="c-blue"/>
                    <SC label="Pallets Going Out" value={C.palletG>0 ? palletDisplay(C.totReqG, C.palletG) : "—"} sub={C.palletG>0 ? `${fmt(C.totReqG,0)} g used in scenario` : "Based on scenario demand"} color="c-green"/>
                    <SC label="Pallets Left With Us" value={C.palletG>0 ? palletDisplay(C.totLefG, C.palletG) : "—"} sub={C.palletG>0 ? `${fmt(C.totLefG,0)} g leftover after demand` : "Based on purchased minus used"} color="c-orange"/>
                  </div>
                  <div className="wi-summary">
                    <div className="wi-group">
                      <div className="wi-group-hdr">Grams Analysis</div>
                      <div className="wi-rows">
                        <WIRow label="Total Purchased" value={fmt(C.totPurG,0)+" g"} cls="blue"/>
                        <WIRow label="Total Used"       value={fmt(C.totReqG,0)+" g"} cls="green"/>
                        <WIRow label="Total Leftover"   value={fmt(C.totLefG,0)+" g"} cls="orange"/>
                        <div style={{borderTop:"1px solid var(--g100)",margin:"3px 0"}}/>
                        <WIRow label="Gram Util %"    value={<UtilPct value={C.ppGU}/>}/>
                        <WIRow label="Gram At Risk %"  value={<span className="util-pct util-red">{fmtP(C.ppGRisk)}</span>}/>
                      </div>
                    </div>
                    <div className="wi-group">
                      <div className="wi-group-hdr">$ Analysis</div>
                      <div className="wi-rows">
                        <WIRow label="Total Purchased" value={fmtC(C.totPurD)}  cls="blue"/>
                        <WIRow label="Total Used"       value={fmtC(C.totUsedD)} cls="green"/>
                        <WIRow label="Total Leftover"   value={fmtC(C.totLefD)}  cls="red"/>
                        <div style={{borderTop:"1px solid var(--g100)",margin:"3px 0"}}/>
                        <WIRow label="$ Util %"         value={<UtilPct value={C.ppDU}/>}/>
                        <WIRow label="$ At Risk %"      value={<span className="util-pct util-red">{fmtP(C.ppDRisk)}</span>}/>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="inner-divider"><div className="inner-divider-line"/><span className="inner-divider-label">Purchase Breakdown</span><div className="inner-divider-line"/></div>
                <div className="twrap">
                  <table>
                    <thead>
                      <tr>
                        <th className="grp grp-dark tl" rowSpan={2} style={{position:"sticky",left:0,zIndex:5}}>Ingredient</th>
                        <th className="grp grp-dark" rowSpan={2}>g Needed</th>
                        <th className="grp grp-pp-pur" colSpan={5}>Purchase Analysis</th>
                        <th className="grp grp-pp-gram" colSpan={3}>Grams Utilization</th>
                        <th className="grp grp-pp-dol" colSpan={3}>$ Utilization</th>
                      </tr>
                      <tr>
                        <th className="sh-pp-pur"># MOQ</th>
                        <th className="sh-pp-pur"># PI</th>
                        <th className="sh-pp-pur">Buy Qty</th>
                        <th className="sh-pp-pur">Buy Qty (g)</th>
                        <th className="sh-pp-pur">Purchased $</th>
                        <th className="sh-pp-gram">Used grams</th>
                        <th className="sh-pp-gram">Leftover grams</th>
                        <th className="sh-pp-gram">Grams Util %</th>
                        <th className="sh-pp-dol">Used $</th>
                        <th className="sh-pp-dol">Leftover $</th>
                        <th className="sh-pp-dol">$ Util %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {C.ppRows.map((r,i)=>(
                        <tr key={i}>
                          <td className="nc">{r.name||<em style={{color:"#94A3B8"}}>unnamed</em>}</td>
                          <td className="tr">{fmt(r.reqG,2)} g</td>
                          <td className="tc">1</td><td className="tc">{r.npiW}</td>
                          <td className="tr">
                            <span className="buy-qty-val">{fmt(r.buyQty, r.buyQty<10?3:r.buyQty<100?2:1)}</span>
                            <span className="buy-qty-unit">{r.buyUnit}</span>
                          </td>
                          <td className="tr">{fmt(r.purG,2)} g</td>
                          <td className="tr">{fmtC(r.purD)}</td>
                          <td className="tr">{fmt(r.reqG,2)} g</td>
                          <td className="tr">{fmt(r.lefG,2)} g</td>
                          <td className="tc"><UtilPct value={r.gutil}/></td>
                          <td className="tr">{fmtC(r.usedD)}</td>
                          <td className="tr">{fmtC(r.lefD)}</td>
                          <td className="tc"><UtilPct value={r.dutil}/></td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td className="nc">TOTALS</td>
                        <td className="tr">{fmt(C.totReqG,2)} g</td>
                        <td/><td/>
                        <td/>
                        <td className="tr">{fmt(C.totPurG,2)} g</td>
                        <td className="tr">{fmtC(C.totPurD)}</td>
                        <td className="tr">{fmt(C.totReqG,2)} g</td>
                        <td className="tr">{fmt(C.totLefG,2)} g</td>
                        <td className="tc"><UtilPct value={C.ppGU}/></td>
                        <td className="tr">{fmtC(C.totUsedD)}</td>
                        <td className="tr">{fmtC(C.totLefD)}</td>
                        <td className="tc"><UtilPct value={C.ppDU}/></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <div style={{height:12}}/>
              </div>

              <div style={{textAlign:"center",padding:"4px 0 8px",color:"var(--g300)",fontSize:10,fontFamily:"var(--mono)"}}>
                Raw Material &amp; Purchasing Analysis Tool · {new Date().getFullYear()}
              </div>
            </div>
          </div>
        </div>


      </div>

      {toast&&<div className="toast">{toast}</div>}
      {showSpec&&<SpecSheetModal
        ings={ings}
        onClose={()=>setShowSpec(false)}
        initialState={{
          ...(specSheetState || {}),
          sp: {
            productName,
            productId,
            productCategory,
            ...(specSheetState?.sp || {}),
          }
        }}
        onStateChange={setSpecSheetState}
      />}
    </>
  );
}
