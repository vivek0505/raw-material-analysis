import { useState, useMemo, useEffect, useCallback, useRef } from "react";

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

const piGrams    = (pi,piUnit,moqUnit) => { if(!pi||pf(pi)===0)return 0; const u=(!piUnit||piUnit===moqUnit)?moqUnit:piUnit; return toG(pf(pi),u); };
const gramsToBuy = (needed,moqG,piG)  => { if(piG===0)return Math.max(needed,moqG); const n=moqG>=needed?0:Math.ceil((needed-moqG)/piG); return moqG+n*piG; };
const calcNPIs   = (needed,moqG,piG)  => { if(piG===0||moqG>=needed)return 0; return Math.ceil((needed-moqG)/piG); };

const DEFAULT_INGS = [
  {name:"Sugar Con AA",                 moq:2500,unit:"lb",pi:25,piUnit:"",costPerLb:1.86, costUnit:"lb",pct:0.6922,anchorOvr:null},
  {name:"Sanding Sugar",                moq:2500,unit:"lb",pi:25,piUnit:"",costPerLb:1.86, costUnit:"lb",pct:0.2307,anchorOvr:null},
  {name:"Blueberry Juice Powder",       moq:100, unit:"g", pi:10,piUnit:"",costPerLb:27,   costUnit:"lb",pct:0.0249,anchorOvr:null},
  {name:"Raspberry Juice Powder",       moq:100, unit:"g", pi:10,piUnit:"",costPerLb:27,   costUnit:"lb",pct:0.012, anchorOvr:null},
  {name:"Beet Juice Powder",            moq:100, unit:"g", pi:10,piUnit:"",costPerLb:20.3, costUnit:"lb",pct:0.0055,anchorOvr:null},
  {name:"Citric Acid",                  moq:50,  unit:"lb",pi:5, piUnit:"",costPerLb:0.9,  costUnit:"lb",pct:0.0185,anchorOvr:null},
  {name:"Confectioner's glaze",         moq:5,   unit:"gal",pi:1,piUnit:"",costPerLb:35,   costUnit:"lb",pct:0.0055,anchorOvr:null},
  {name:"Blueberry Natural Flavor Oil", moq:1,   unit:"oz",pi:1, piUnit:"",costPerLb:31.04,costUnit:"lb",pct:0.0028,anchorOvr:null},
  {name:"Raspberry Natural Flavor Oil", moq:1,   unit:"oz",pi:1, piUnit:"",costPerLb:26.93,costUnit:"lb",pct:0.0028,anchorOvr:null},
  {name:"Strawberry Natural Flavor Oil",moq:1,   unit:"oz",pi:1, piUnit:"",costPerLb:31.04,costUnit:"lb",pct:0.0028,anchorOvr:null},
  {name:"Salt",                         moq:50,  unit:"lb",pi:2, piUnit:"",costPerLb:0.86, costUnit:"lb",pct:0.0023,anchorOvr:null},
];
const blankIng = () => ({name:"",moq:"",unit:"lb",pi:"",piUnit:"",costPerLb:"",costUnit:"lb",pct:"",anchorOvr:null});

const timeAgo = (ts) => {
  if(!ts) return "";
  const d=new Date(ts), now=new Date(), s=Math.floor((now-d)/1000);
  if(s<60) return "just now";
  if(s<3600) return `${Math.floor(s/60)}m ago`;
  if(s<86400) return `${Math.floor(s/3600)}h ago`;
  return d.toLocaleDateString("en-US",{month:"short",day:"numeric"});
};

/* ── BRAND PRESETS ── */
const BRANDS = {
  brewglitter: {
    name:"Brew Glitter", tagline:"Every Drink Will Shimmer",
    website:"www.brewglitter.com", address:"Loma Linda, CA 92354",
    phone:"(877) 316-5913", email:"sales@brewglitter.com",
    color:"#B8860B", accentColor:"#8B6914", headerBg:"#f5f0e0",
  },
  bakell: {
    name:"Bakell", tagline:"Premium Edible Products",
    website:"www.bakell.com", address:"Loma Linda, CA 92354",
    phone:"(877) 316-5913", email:"sales@bakell.com",
    color:"#C8385A", accentColor:"#9e2a46", headerBg:"#fdf0f3",
  },
  custom: {
    name:"Your Brand", tagline:"Your Tagline Here",
    website:"www.yourbrand.com", address:"City, State ZIP",
    phone:"(000) 000-0000", email:"info@yourbrand.com",
    color:"#1E3A7B", accentColor:"#0F2C5E", headerBg:"#EFF6FF",
  },
};

const SPEC_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Inter',sans-serif;font-size:11px;color:#1a1a1a;background:#fff}
.page{width:8.5in;min-height:11in;padding:0.5in;background:#fff}
.hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;padding-bottom:12px;border-bottom:3px solid __COLOR__}
.brand-name{font-size:22px;font-weight:800;color:__COLOR__;letter-spacing:-0.5px}
.brand-tag{font-size:9px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:1.5px}
.brand-contact{font-size:9.5px;color:#555;line-height:1.7;margin-top:6px}
.brand-contact a{color:__COLOR__;text-decoration:none}
.doc-title{font-size:18px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;line-height:1.2;text-align:center}
.doc-sub{font-size:11px;font-weight:600;color:#666;text-transform:uppercase;letter-spacing:1px;text-align:center;margin-top:4px}
.mgrid{display:grid;grid-template-columns:1fr 210px;gap:16px;margin-bottom:14px}
.itable{width:100%;border-collapse:collapse}
.itable tr{border-bottom:1px solid #e8e8e8}
.itable td{padding:7px 10px;vertical-align:top;line-height:1.5}
.itable td:first-child{font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#333;width:130px;background:__HBGC__;white-space:nowrap}
.itable td:last-child{font-size:11px;color:#222}
.prod-img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px;border:1px solid #e0e0e0}
.img-ph{width:100%;aspect-ratio:1;background:#f5f5f5;border:2px dashed #ccc;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#aaa;font-size:10px;text-align:center;flex-direction:column;gap:4px}
.sec-hdr{background:__COLOR__;color:#fff;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;padding:6px 12px;margin:12px 0 0}
.stable{width:100%;border-collapse:collapse}
.stable tr{border-bottom:1px solid #eee}
.stable tr:nth-child(even) td{background:#fafafa}
.stable td{padding:6px 10px;font-size:10.5px}
.stable td:first-child{font-weight:600;color:#444;width:160px}
.nf-wrap{border:2px solid #1a1a1a;padding:8px;width:230px;flex-shrink:0}
.nf-title{font-size:22px;font-weight:900;border-bottom:8px solid #1a1a1a;padding-bottom:4px;margin-bottom:4px}
.nf-srv{font-size:10px;border-bottom:1px solid #1a1a1a;padding-bottom:4px;margin-bottom:4px}
.nf-cal{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:4px solid #1a1a1a;padding-bottom:3px;margin-bottom:3px}
.nf-cal-lbl{font-size:11px;font-weight:600}
.nf-cal-val{font-size:28px;font-weight:900}
.nf-dvh{font-size:8.5px;text-align:right;border-bottom:1px solid #ccc;padding-bottom:2px;margin-bottom:2px}
.nr{display:flex;justify-content:space-between;font-size:9.5px;padding:1.5px 0;border-bottom:1px solid #ccc}
.nr.thick{border-bottom:4px solid #1a1a1a}
.nr.ind{padding-left:12px}
.nr.ind2{padding-left:20px}
.nf-vits{display:grid;grid-template-columns:1fr 1fr;border-top:8px solid #1a1a1a;margin-top:4px}
.nf-vit{font-size:8.5px;padding:1px 0}
.nf-foot{font-size:7.5px;border-top:1px solid #1a1a1a;margin-top:3px;padding-top:3px;line-height:1.4}
.nf-sec{display:flex;gap:14px;margin-top:12px}
.nf-ings{flex:1}
.ing-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px}
.ing-text{font-size:10.5px;line-height:1.6;color:#222}
.compliance{font-size:9px;color:#555;line-height:1.7;margin-top:12px;padding-top:8px;border-top:1px solid #ddd}
.compliance b{color:#222}
.pg-foot{font-size:8px;color:#888;text-align:center;margin-top:14px;padding-top:8px;border-top:1px solid #eee;font-style:italic}
@media print{@page{margin:0;size:letter}html,body{background:#fff}.page{padding:.4in}}
`;

function buildSpecHTML(brandKey, spec, ings) {
  const B = BRANDS[brandKey];
  const ingNames = ings.filter(i=>i.name?.trim()).map(i=>i.name.trim().toUpperCase()).join(", ");
  const ingDisplay = spec.ingredientsOverride?.trim() || ingNames || "—";
  const css = SPEC_CSS
    .replaceAll("__COLOR__", B.color)
    .replaceAll("__HBGC__", B.headerBg)
    .replaceAll("__ACCENT__", B.accentColor);

  const imgTag = spec.imageDataUrl
    ? `<img class="prod-img" src="${spec.imageDataUrl}" alt="Product"/>`
    : `<div class="img-ph"><span style="font-size:24px">📷</span><span>No image<br/>uploaded</span></div>`;

  const nfHTML = `<div class="nf-wrap">
    <div class="nf-title">Nutrition Facts</div>
    <div class="nf-srv"><b>Serving size</b> ${spec.nf_servingSize||"—"}<br/>Servings per container: ${spec.nf_servings||"—"}</div>
    <div class="nf-cal"><span class="nf-cal-lbl">Amount per serving<br/><b>Calories</b></span><span class="nf-cal-val">${spec.nf_calories||"0"}</span></div>
    <div class="nf-dvh">% Daily Value*</div>
    <div class="nr thick"><span><b>Total Fat</b> ${spec.nf_totalFat||"0g"}</span><span><b>${spec.nf_totalFatDV||"0%"}</b></span></div>
    <div class="nr ind"><span>Saturated Fat ${spec.nf_satFat||"0g"}</span><span><b>${spec.nf_satFatDV||"0%"}</b></span></div>
    <div class="nr ind"><span><i>Trans</i> Fat ${spec.nf_transFat||"0g"}</span><span></span></div>
    <div class="nr thick"><span><b>Cholesterol</b> ${spec.nf_cholesterol||"0mg"}</span><span><b>${spec.nf_cholesterolDV||"0%"}</b></span></div>
    <div class="nr thick"><span><b>Sodium</b> ${spec.nf_sodium||"0mg"}</span><span><b>${spec.nf_sodiumDV||"0%"}</b></span></div>
    <div class="nr"><span><b>Total Carbohydrate</b> ${spec.nf_totalCarb||"0g"}</span><span><b>${spec.nf_totalCarbDV||"0%"}</b></span></div>
    <div class="nr ind"><span>Dietary Fiber ${spec.nf_fiber||"0g"}</span><span><b>${spec.nf_fiberDV||"0%"}</b></span></div>
    <div class="nr ind"><span>Total Sugars ${spec.nf_sugars||"0g"}</span><span></span></div>
    <div class="nr ind2"><span>Includes ${spec.nf_addedSugars||"0g"} Added Sugars</span><span><b>${spec.nf_addedSugarsDV||"0%"}</b></span></div>
    <div class="nr thick"><span><b>Protein</b> ${spec.nf_protein||"0g"}</span><span></span></div>
    <div class="nf-vits">
      <div class="nf-vit">Vitamin D ${spec.nf_vitD||"0mcg"} ${spec.nf_vitDDV||"0%"}</div>
      <div class="nf-vit">Calcium ${spec.nf_calcium||"0mg"} ${spec.nf_calciumDV||"0%"}</div>
      <div class="nf-vit">Iron ${spec.nf_iron||"0mg"} ${spec.nf_ironDV||"0%"}</div>
      <div class="nf-vit">Potassium ${spec.nf_potassium||"0mg"} ${spec.nf_potassiumDV||"0%"}</div>
    </div>
    <div class="nf-foot">*The % Daily Value tells you how much a nutrient in a serving contributes to a daily diet. 2,000 calories a day is used for general nutrition advice.</div>
  </div>`;

  const compliance = spec.complianceText?.trim() ||
    "The ingredients used in this product are food-grade and are permitted for use in food products sold in both the United States and Canada. They are considered Generally Recognized as Safe (GRAS) in the United States, or approved for use under the Canadian Food and Drug Regulations and the Safe Food for Canadians Regulations, when used in accordance with good manufacturing practices. This statement confirms that the ingredients are legally accepted and safe for use in food products distributed in the United States and Canada.";

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
  <title>${spec.productName||"Spec Sheet"}</title>
  <style>${css}</style></head><body>
  <div class="page">
    <div class="hdr">
      <div>
        <div class="brand-name">${B.name}</div>
        <div class="brand-tag">${B.tagline}</div>
        <div class="brand-contact">
          ${B.website}<br/>${B.address}<br/>${B.phone}<br/>
          <a href="mailto:${B.email}">${B.email}</a>
        </div>
      </div>
      <div>
        <div class="doc-title">Food Grade<br/>${spec.productCategory||"Product"}</div>
        <div class="doc-sub">Product Specification Sheet</div>
      </div>
    </div>
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
      <tr><td>Gluten Status</td><td>${spec.gluten||"—"}</td></tr>
      <tr><td>GMO Status</td><td>${spec.gmo||"—"}</td></tr>
      <tr><td>Taste</td><td>${spec.taste||"—"}</td></tr>
      <tr><td>Odor</td><td>${spec.odor||"—"}</td></tr>
      <tr><td>Bio Product</td><td>${spec.bio||"No"}</td></tr>
      <tr><td>Dangerous Goods</td><td>${spec.dangerous||"No"}</td></tr>
    </table>
    <div class="nf-sec">
      ${nfHTML}
      <div class="nf-ings">
        <div class="ing-title">Ingredients</div>
        <div class="ing-text">${ingDisplay}</div>
        <div class="compliance"><b>Statement of Compliance – U.S. &amp; Canada</b><br/>${compliance}</div>
      </div>
    </div>
    <div class="pg-foot">The information contained here is the Private &amp; Intellectual Property of ${B.name}.</div>
  </div>
  </body></html>`;
}

function SpecSheetModal({ ings, onClose }) {
  const [brand, setBrand] = useState("brewglitter");
  const [img, setImg]     = useState(null);
  const [tab, setTab]     = useState("basic");
  const [sp, setSp]       = useState({
    productName:"", productId:"", productCategory:"Rimming Sugar",
    appearance:"", ingredientsOverride:"", storage:"", shelfLife:"",
    kosher:"Can be added to Kosher Certificate upon request",
    halal:"Halal", vegan:"This product is not suitable for Vegan & Vegetarian diets.",
    allergen:"This product does not contain any Major Food Allergens (as defined in the Food Allergen Labeling and Consumer Protection Act)",
    gluten:"Gluten Free", gmo:"Non-GMO", taste:"Sweet", odor:"Sweet",
    bio:"No", dangerous:"No", complianceText:"",
    nf_servingSize:"100 grams (100g)", nf_servings:"~113",
    nf_calories:"380",
    nf_totalFat:"1g", nf_totalFatDV:"1%",
    nf_satFat:"0g", nf_satFatDV:"0%",
    nf_transFat:"0g",
    nf_cholesterol:"0mg", nf_cholesterolDV:"0%",
    nf_sodium:"180mg", nf_sodiumDV:"8%",
    nf_totalCarb:"96g", nf_totalCarbDV:"35%",
    nf_fiber:"2g", nf_fiberDV:"7%",
    nf_sugars:"93g",
    nf_addedSugars:"93g", nf_addedSugarsDV:"186%",
    nf_protein:"2g",
    nf_vitD:"0mcg", nf_vitDDV:"0%",
    nf_calcium:"0mg", nf_calciumDV:"0%",
    nf_iron:"0.9mg", nf_ironDV:"4%",
    nf_potassium:"70mg", nf_potassiumDV:"2%",
  });

  const set = (k,v) => setSp(p=>({...p,[k]:v}));
  const handleImg = (e) => {
    const f = e.target.files[0]; if(!f) return;
    const r = new FileReader();
    r.onload = (ev) => setImg(ev.target.result);
    r.readAsDataURL(f);
  };

  const doGenerate = () => {
    const html = buildSpecHTML(brand, {...sp, imageDataUrl: img}, ings);
    const w = window.open("", "_blank", "width=920,height=780");
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 700);
  };

  const B = BRANDS[brand];
  const TABS = [{k:"basic",l:"Basic Info"},{k:"product-info",l:"Product Info"},{k:"nutrition",l:"Nutrition Facts"},{k:"compliance",l:"Compliance"}];

  const Field = ({label, k, rows, placeholder}) => (
    <div style={{display:"flex",flexDirection:"column",gap:3}}>
      <label style={{fontSize:10,fontWeight:700,color:"var(--g600)",textTransform:"uppercase",letterSpacing:".6px"}}>{label}</label>
      {rows
        ? <textarea rows={rows} value={sp[k]||""} onChange={e=>set(k,e.target.value)} placeholder={placeholder||""} style={{background:"var(--yinput)",border:"1.5px solid var(--yborder)",borderRadius:4,color:"#1E293B",fontFamily:"inherit",fontSize:12,padding:"6px 8px",outline:"none",resize:"vertical"}}/>
        : <input type="text" value={sp[k]||""} onChange={e=>set(k,e.target.value)} placeholder={placeholder||""} style={{background:"var(--yinput)",border:"1.5px solid var(--yborder)",borderRadius:4,color:"#1E293B",fontFamily:"'JetBrains Mono',monospace",fontSize:12,padding:"6px 8px",outline:"none"}}/>
      }
    </div>
  );

  const NF = ({label, kVal, kDV, indent}) => (
    <div style={{display:"grid",gridTemplateColumns:`1fr${kDV?" 80px":""}`,gap:6,paddingLeft:indent?16:0}}>
      <Field label={label} k={kVal}/>
      {kDV && <Field label="% DV" k={kDV}/>}
    </div>
  );

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:"var(--white)",border:"1px solid var(--g300)",borderRadius:10,width:"min(880px,100%)",maxHeight:"90vh",display:"flex",flexDirection:"column",overflow:"hidden",boxShadow:"0 24px 60px rgba(0,0,0,.6)"}}>
        <div style={{background:"var(--g800)",padding:"14px 20px",display:"flex",alignItems:"center",gap:12,borderBottom:"1px solid var(--g200)",flexShrink:0}}>
          <span style={{fontSize:18}}>📋</span>
          <div>
            <div style={{fontSize:14,fontWeight:700,color:"#fff"}}>Create Spec Sheet</div>
            <div style={{fontSize:11,color:"var(--blue-d)"}}>Ingredients auto-filled from recipe matrix · generates print-ready PDF</div>
          </div>
          <div style={{marginLeft:"auto",display:"flex",gap:8,alignItems:"center"}}>
            <button onClick={doGenerate} style={{background:"var(--blue-600)",color:"#fff",border:"none",borderRadius:5,padding:"8px 16px",fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:5}}>
              🖨 Generate &amp; Print PDF
            </button>
            <button onClick={onClose} style={{background:"rgba(255,255,255,.08)",color:"var(--text)",border:"1px solid var(--g200)",borderRadius:5,padding:"8px 12px",fontSize:12,cursor:"pointer"}}>✕</button>
          </div>
        </div>
        <div style={{background:"var(--g100)",padding:"8px 20px",borderBottom:"1px solid var(--g200)",display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
          <span style={{fontSize:11,fontWeight:700,color:"var(--g600)",textTransform:"uppercase",letterSpacing:".7px",whiteSpace:"nowrap"}}>Brand:</span>
          {Object.entries(BRANDS).map(([k,b])=>(
            <button key={k} onClick={()=>setBrand(k)} style={{
              padding:"5px 14px",borderRadius:5,fontSize:12,fontWeight:600,cursor:"pointer",
              border:`2px solid ${brand===k?b.color:"transparent"}`,
              background:brand===k?b.color+"22":"rgba(255,255,255,.05)",
              color:brand===k?b.color:"var(--g600)",transition:"all .15s"
            }}>{b.name}</button>
          ))}
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
        <div style={{flex:1,overflowY:"auto",padding:20}}>
          <div style={{display:"grid",gap:12}}>
            {tab==="basic" && <>
              <div style={{background:"var(--g100)",border:"1px solid var(--g200)",borderRadius:6,padding:14}}>
                <div style={{fontSize:11,fontWeight:700,color:"var(--g600)",textTransform:"uppercase",letterSpacing:".7px",marginBottom:8}}>Product Image</div>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  {img
                    ? <img src={img} alt="preview" style={{width:72,height:72,objectFit:"cover",borderRadius:6,border:"1px solid var(--g300)"}}/>
                    : <div style={{width:72,height:72,background:"var(--g800)",borderRadius:6,border:"2px dashed var(--g300)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>📷</div>
                  }
                  <div>
                    <label style={{background:"var(--blue-600)",color:"#fff",padding:"6px 12px",borderRadius:5,fontSize:12,fontWeight:600,cursor:"pointer",display:"inline-block"}}>
                      {img?"Change Image":"Upload Image"}
                      <input type="file" accept="image/*" onChange={handleImg} style={{display:"none"}}/>
                    </label>
                    {img && <button onClick={()=>setImg(null)} style={{marginLeft:8,background:"rgba(239,68,68,.15)",color:"#FCA5A5",border:"1px solid rgba(239,68,68,.25)",borderRadius:5,padding:"6px 10px",fontSize:12,cursor:"pointer"}}>Remove</button>}
                    <div style={{fontSize:10,color:"var(--g500)",marginTop:5}}>PNG, JPG or WEBP · appears top-right corner of spec sheet</div>
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
            </>}
            {tab==="product-info" && <>
              <div style={{fontSize:11,color:"var(--g500)",marginBottom:2}}>These populate the Product Information compliance table on the spec sheet.</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <Field label="Kosher Status" k="kosher"/>
                <Field label="Halal Status" k="halal"/>
                <Field label="Vegan Status" k="vegan"/>
                <Field label="Gluten Status" k="gluten"/>
                <Field label="GMO Status" k="gmo"/>
                <Field label="Taste" k="taste"/>
                <Field label="Odor" k="odor"/>
                <Field label="Bio Product" k="bio"/>
                <Field label="Dangerous Goods" k="dangerous"/>
              </div>
              <Field label="Allergen Status" k="allergen" rows={2}/>
            </>}
            {tab==="nutrition" && <>
              <div style={{fontSize:11,color:"var(--g500)",marginBottom:2}}>Include units in values — e.g. "180mg", "1g", "8%". Calories is a number only.</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                <Field label="Serving Size" k="nf_servingSize" placeholder="100 grams (100g)"/>
                <Field label="Servings Per Container" k="nf_servings" placeholder="~113"/>
                <Field label="Calories" k="nf_calories" placeholder="380"/>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <div style={{background:"var(--g100)",border:"1px solid var(--g200)",borderRadius:6,padding:12,display:"grid",gap:8}}>
                  <div style={{fontSize:10,fontWeight:700,color:"var(--blue-d)",textTransform:"uppercase",letterSpacing:".7px"}}>Fats, Sodium, Carbs</div>
                  <NF label="Total Fat" kVal="nf_totalFat" kDV="nf_totalFatDV"/>
                  <NF label="↳ Saturated Fat" kVal="nf_satFat" kDV="nf_satFatDV" indent/>
                  <NF label="↳ Trans Fat" kVal="nf_transFat" indent/>
                  <NF label="Cholesterol" kVal="nf_cholesterol" kDV="nf_cholesterolDV"/>
                  <NF label="Sodium" kVal="nf_sodium" kDV="nf_sodiumDV"/>
                  <NF label="Total Carbohydrate" kVal="nf_totalCarb" kDV="nf_totalCarbDV"/>
                  <NF label="↳ Dietary Fiber" kVal="nf_fiber" kDV="nf_fiberDV" indent/>
                  <NF label="↳ Total Sugars" kVal="nf_sugars" indent/>
                  <NF label="↳↳ Added Sugars" kVal="nf_addedSugars" kDV="nf_addedSugarsDV" indent/>
                  <NF label="Protein" kVal="nf_protein"/>
                </div>
                <div style={{background:"var(--g100)",border:"1px solid var(--g200)",borderRadius:6,padding:12,display:"grid",gap:8,alignContent:"start"}}>
                  <div style={{fontSize:10,fontWeight:700,color:"var(--blue-d)",textTransform:"uppercase",letterSpacing:".7px"}}>Vitamins &amp; Minerals</div>
                  <NF label="Vitamin D" kVal="nf_vitD" kDV="nf_vitDDV"/>
                  <NF label="Calcium" kVal="nf_calcium" kDV="nf_calciumDV"/>
                  <NF label="Iron" kVal="nf_iron" kDV="nf_ironDV"/>
                  <NF label="Potassium" kVal="nf_potassium" kDV="nf_potassiumDV"/>
                </div>
              </div>
            </>}
            {tab==="compliance" && <>
              <div style={{fontSize:11,color:"var(--g500)",marginBottom:2}}>Leave blank to use the standard US &amp; Canada GRAS compliance statement.</div>
              <Field label="Custom Compliance Statement" k="complianceText" rows={8} placeholder="Leave blank for default US & Canada GRAS statement…"/>
            </>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Trash / Bin SVG icon ── */
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
function SbRow({ a, isActive, onOpen, onDelete, onRename }) {
  const [menuOpen,   setMenuOpen]   = useState(false);
  const [menuPos,    setMenuPos]    = useState({ x: 0, y: 0 });
  const [renaming,   setRenaming]   = useState(false);
  const [draftName,  setDraftName]  = useState(a.name || "");
  const dotsRef  = useRef(null);
  const inputRef = useRef(null);

  // Sync name if prop changes
  useEffect(() => { setDraftName(a.name || ""); }, [a.name]);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (dotsRef.current && !dotsRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  // Focus input when rename mode opens
  useEffect(() => {
    if (renaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [renaming]);

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

  // Rename mode — replace row with inline input
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
          style={{
            flex:1, minWidth:0, background:"rgba(255,255,255,.1)",
            border:"1.5px solid #FCD34D", borderRadius:4,
            color:"#fff", fontFamily:"'IBM Plex Sans',sans-serif",
            fontSize:12, fontWeight:600, padding:"3px 7px", outline:"none",
          }}
        />
        <button
          onClick={commitRename}
          style={{flexShrink:0,background:"#15803D",border:"none",borderRadius:3,
            color:"#fff",fontSize:10,fontWeight:700,padding:"2px 7px",cursor:"pointer",marginLeft:4}}
        >✓</button>
      </div>
    );
  }

  return (
    <div
      className={`sb-row${isActive ? " active" : ""}`}
      onClick={() => onOpen(a.id)}
    >
      {a.isDraft && <span className="sb-row-draft-dot" title="Draft"/>}
      <span className="sb-row-name" title={a.name}>{a.name || "Untitled"}</span>
      <button
        ref={dotsRef}
        className={`sb-dots${menuOpen ? " open" : ""}`}
        onClick={openMenu}
        title="Options"
      >
        <svg width="15" height="15" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M10 5C8.5 3.5 6 3 3 3.5V15.5C6 15 8.5 15.5 10 17C11.5 15.5 14 15 17 15.5V3.5C14 3 11.5 3.5 10 5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
          <path d="M10 5V17" stroke="currentColor" strokeWidth="1.3"/>
          <text x="13.2" y="10.8" fontSize="5.5" fontWeight="800" fill="currentColor" fontFamily="monospace">$</text>
        </svg>
      </button>

      {menuOpen && (
        <div
          className="sb-menu"
          style={{ left: menuPos.x, top: menuPos.y }}
          onClick={e => e.stopPropagation()}
        >
          <button className="sb-menu-item" onClick={() => { onOpen(a.id); setMenuOpen(false); }}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M2 8s2.5-5 6-5 6 5 6 5-2.5 5-6 5-6-5-6-5z" stroke="currentColor" strokeWidth="1.4"/><circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.4"/></svg>
            Open
          </button>
          <button className="sb-menu-item" onClick={() => { setMenuOpen(false); setRenaming(true); }}>
            <PencilIcon size={13}/>
            Rename
          </button>
          <div style={{height:1,background:"rgba(255,255,255,.08)",margin:"3px 4px"}}/>
          <button className="sb-menu-item danger" onClick={() => { onDelete(a.id); setMenuOpen(false); }}>
            <TrashIcon size={13}/>
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   MAIN CSS
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
   APP
───────────────────────────────────────────────────────────────── */
export default function App() {
  const [sbOpen,       setSB]     = useState(true);
  const [currentId,    setCID]    = useState(null);
  const [isDraft,      setIsDraft]= useState(false);
  const [analysisName, setName]   = useState("");
  const [sachetGrams,  setSG]     = useState(113.4);
  const [anchorUtil,   setAU]     = useState(95);
  const [whatIfUnits,  setWI]     = useState(7200);
  const [ings,         setIngs]   = useState(DEFAULT_INGS);
  const [saved,        setSaved]  = useState([]);
  const [dirty,        setDirty]  = useState(false);
  const [saving,       setSaving] = useState(false);
  const [loading,      setLoad]   = useState(true);
  const [search,       setSearch] = useState("");
  const [toast,        setToast]  = useState(null);
  const [showSpec,     setShowSpec]= useState(false);
  const [recipeApproved, setRecipeApproved] = useState(false);
  const [approvedDate,   setApprovedDate]   = useState("");
  const [recipeStatus,   setRecipeStatus]   = useState("Testing");

  const { width: sbWidth, handleRef: sbHandleRef, onDragStart } = useResizableSidebar(sbOpen);

  const toastRef = useRef(null);
  const autoRef  = useRef(null);
  const dirtyRef = useRef(false);
  const stateRef = useRef({});

  useEffect(()=>{
    stateRef.current={analysisName,sachetGrams,anchorUtil,whatIfUnits,ings,currentId,recipeApproved,approvedDate,recipeStatus};
  },[analysisName,sachetGrams,anchorUtil,whatIfUnits,ings,currentId,recipeApproved,approvedDate,recipeStatus]);

  const showToast = useCallback((msg)=>{
    setToast(msg);
    if(toastRef.current) clearTimeout(toastRef.current);
    toastRef.current=setTimeout(()=>setToast(null),2500);
  },[]);

  useEffect(()=>{
    (async()=>{
      try{ const r=await fetch(`${API}/api/analyses`); if(r.ok) setSaved(await r.json()); }catch(_){}
      setLoad(false);
    })();
  },[]);

  useEffect(()=>{ if(!loading){ setDirty(true); dirtyRef.current=true; } },[sachetGrams,anchorUtil,whatIfUnits,ings,recipeApproved,approvedDate,recipeStatus]);

  useEffect(()=>{
    autoRef.current=setInterval(async()=>{
      if(!dirtyRef.current) return;
      const s=stateRef.current;
      const name=s.analysisName.trim()||"Untitled Draft";
      const id=s.currentId||`draft_${Date.now()}`;
      const data={sachetGrams:s.sachetGrams,anchorUtil:s.anchorUtil,whatIfUnits:s.whatIfUnits,ings:s.ings,recipeApproved:s.recipeApproved,approvedDate:s.approvedDate,recipeStatus:s.recipeStatus};
      try{
        const r=await fetch(`${API}/api/analyses`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,name,data,isDraft:true})});
        if(r.ok){
          const meta=await r.json();
          setSaved(prev=>{ const ex=prev.find(a=>a.id===id); return ex?prev.map(a=>a.id===id?meta:a):[...prev,meta]; });
          if(!s.currentId) setCID(id);
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
    setSaving(true);
    const id=currentId||`a_${Date.now()}`;
    const data={sachetGrams,anchorUtil,whatIfUnits,ings,recipeApproved,approvedDate,recipeStatus};
    try{
      const r=await fetch(`${API}/api/analyses`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,name:analysisName.trim(),data,isDraft:false})});
      if(!r.ok) throw new Error("Server error "+r.status);
      const meta=await r.json();
      setSaved(prev=>{ const ex=prev.find(a=>a.id===id); return ex?prev.map(a=>a.id===id?meta:a):[...prev,meta]; });
      setCID(id); setDirty(false); dirtyRef.current=false; setIsDraft(false);
      showToast("✓ Saved successfully");
    }catch(e){ alert("Save failed: "+e.message); }
    setSaving(false);
  },[analysisName,currentId,sachetGrams,anchorUtil,whatIfUnits,ings,recipeApproved,approvedDate,recipeStatus,showToast]);

  const doLoad = useCallback(async(id)=>{
    try{
      const r=await fetch(`${API}/api/analyses/${id}`); if(!r.ok) throw new Error("Not found");
      const {data:d,name,isDraft:dr}=await r.json();
      setSG(d.sachetGrams);
      setAU(d.anchorUtil!=null?d.anchorUtil:d.dollarWt!=null?d.dollarWt*100:95);
      setWI(d.whatIfUnits??d.whatIfMOQ??"");
      setIngs(d.ings.map(ing=>({costUnit:"lb",...ing})));
      setRecipeApproved(d.recipeApproved||false);
      setApprovedDate(d.approvedDate||"");
      setRecipeStatus(d.recipeStatus||"Testing");
      setCID(id); setName(name||""); setDirty(false); dirtyRef.current=false; setIsDraft(!!dr);
    }catch(e){ alert("Load failed: "+e.message); }
  },[]);

  const doClone = useCallback(async(id)=>{
    try{
      const r=await fetch(`${API}/api/analyses/${id}`); if(!r.ok) throw new Error("Not found");
      const {data:d,name}=await r.json();
      setSG(d.sachetGrams); setAU(d.anchorUtil!=null?d.anchorUtil:95); setWI(d.whatIfUnits??"");
      setIngs(d.ings.map(ing=>({costUnit:"lb",...ing})));
      setRecipeApproved(d.recipeApproved||false);
      setApprovedDate(d.approvedDate||"");
      setRecipeStatus(d.recipeStatus||"Testing");
      setCID(null); setName(`Copy of ${name||"Untitled"}`);
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
        body:JSON.stringify({id, name:newName, data:body.data, isDraft:body.isDraft||false})});
      if(!r2.ok) throw new Error("Save failed");
      const meta=await r2.json();
      setSaved(prev=>prev.map(a=>a.id===id?{...a,name:newName,savedAt:meta.savedAt}:a));
      if(currentId===id) setName(newName);
      showToast("✓ Renamed");
    }catch(e){ alert("Rename failed: "+e.message); }
  },[currentId, showToast]);

  const doNew = ()=>{
    if(dirty&&!confirm("Unsaved changes — continue?")) return;
    setSG(""); setAU(95); setWI(""); setIngs([blankIng()]);
    setCID(null); setName(""); setDirty(false); dirtyRef.current=false; setIsDraft(false);
    setRecipeApproved(false); setApprovedDate(""); setRecipeStatus("Testing");
  };

  const doDownload = useCallback(async()=>{
    try{
      const res=await fetch(`${API}/export`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({analysisName,sachetGrams,anchorUtil,whatIfUnits,ings})});
      if(!res.ok) throw new Error("Server returned "+res.status);
      const blob=await res.blob(), url=URL.createObjectURL(blob), a=document.createElement("a");
      a.href=url; a.download=`${(analysisName||"Analysis").replace(/[^a-zA-Z0-9_\- ]/g,"_")}.xlsx`; a.click(); URL.revokeObjectURL(url);
    }catch(e){ alert("Download failed: "+e.message); }
  },[analysisName,sachetGrams,anchorUtil,whatIfUnits,ings]);

  const upd     = (i,f,v)=>{ const c=[...ings]; c[i]={...c[i],[f]:v}; setIngs(c); };
  const addRow  = ()=>setIngs([...ings,blankIng()]);
  const delRow  = (i)=>setIngs(ings.filter((_,j)=>j!==i));
  const togAnch = (i,auto)=>{
    const c=[...ings], cur=c[i].anchorOvr!==null?c[i].anchorOvr:auto;
    c[i]={...c[i],anchorOvr:cur==="Y"?"N":"Y"}; setIngs(c);
  };

  const C = useMemo(()=>{
    const sg=pf(sachetGrams),wi=pf(whatIfUnits)||0,auDec=pf(anchorUtil)/100;
    const rows=ings.map(ing=>{
      const costU=ing.costUnit||"lb", lcg=pf(ing.costPerLb)/(UNIT_TO_G[costU]||453.592);
      const gpU=pf(ing.pct)*sg, cpU=gpU*lcg;
      const moqG=toG(pf(ing.moq),ing.unit), piG=piGrams(ing.pi,ing.piUnit,ing.unit);
      const moqCost=moqG*lcg, anchorScore=moqCost*auDec, uth=gpU>0?(moqG*auDec)/gpU:0;
      const autoEl=lcg>0?"Y":"N", anchorEl=ing.anchorOvr!==null?ing.anchorOvr:autoEl;
      return{...ing,lcg,gpU,cpU,moqG,piG,moqCost,anchorScore,uth,autoEl,anchorEl};
    });

    const eligComp=rows.filter(r=>r.anchorEl==="Y"&&r.uth>0&&r.cpU>0).map(r=>r.uth*r.cpU);
    const ranked=rows.map(r=>({...r,rank:r.anchorEl==="Y"&&r.uth>0&&r.cpU>0
      ?1+eligComp.filter(s=>s>r.uth*r.cpU).length
      :null}));

    const eligRows=ranked.filter(r=>r.anchorEl==="Y"&&r.uth>0&&r.cpU>0);
    const moqPool=eligRows.length>=3?eligRows.filter(r=>r.rank<=3):eligRows;
    const spON=moqPool.reduce((s,r)=>s+(r.uth*r.uth*r.cpU),0);
    const spN =moqPool.reduce((s,r)=>s+(r.uth*r.cpU),0);
    const recMOQ=spN>0?Math.ceil(spON/spN):0;

    const totCpU=ranked.reduce((s,r)=>s+r.cpU,0), cpg=sg>0?totCpU/sg:0;
    const pctSum=ranked.reduce((s,r)=>s+pf(r.pct),0), totMoqCost=ranked.reduce((s,r)=>s+r.moqCost,0);
    const planU=wi||recMOQ;
    const ppRows=ranked.map(r=>{
      const reqG=r.gpU*planU, purG=gramsToBuy(reqG,r.moqG,r.piG), npiW=calcNPIs(reqG,r.moqG,r.piG);
      const lefG=purG-reqG, purD=purG*r.lcg, usedD=reqG*r.lcg, lefD=purD-usedD;
      const buyUnit=r.unit||"g";
      const buyQty=purG/(UNIT_TO_G[buyUnit]||1);
      return{...r,reqG,purG,npiW,lefG,purD,usedD,lefD,gutil:purG>0?reqG/purG:0,dutil:purD>0?usedD/purD:0,buyQty,buyUnit};
    });
    const totPurG=ppRows.reduce((s,r)=>s+r.purG,0), totReqG=ppRows.reduce((s,r)=>s+r.reqG,0);
    const totLefG=ppRows.reduce((s,r)=>s+r.lefG,0), totPurD=ppRows.reduce((s,r)=>s+r.purD,0);
    const totUsedD=ppRows.reduce((s,r)=>s+r.usedD,0), totLefD=ppRows.reduce((s,r)=>s+r.lefD,0);
    const ppGU=totPurG>0?totReqG/totPurG:0, ppDU=totPurD>0?totUsedD/totPurD:0;
    const ppGRisk=totPurG>0?totLefG/totPurG:0, ppDRisk=totPurD>0?totLefD/totPurD:0;
    return{ranked,ppRows,recMOQ,eligRows:eligRows.length,totCpU,cpg,pctSum,totMoqCost,totPurG,totReqG,totLefG,totPurD,totUsedD,totLefD,
      ppGU,ppDU,ppGRisk,ppDRisk,ppCpG:planU*pf(sachetGrams)>0?totPurD/(planU*pf(sachetGrams)):0,ppCpU:planU>0?totPurD/planU:0,planU};
  },[ings,sachetGrams,anchorUtil,whatIfUnits]);

  const pctOk = Math.abs(C.pctSum-1)<0.0001;
  const filtered   = saved.filter(a=>a.name?.toLowerCase().includes(search.toLowerCase()));
  const savedItems = filtered.filter(a=>!a.isDraft);
  const draftItems = filtered.filter(a=>a.isDraft);

  if(loading) return <><S/><div className="loader"><div className="pulse">📦</div><div style={{color:"#334155",fontSize:14}}>Loading…</div></div></>;

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
                  <div className="igrid">
                    <div className="igroup">
                      <label className="ilabel">Sachet Grams (g)</label>
                      <input type="number" step="any" className="ifield" value={sachetGrams} onChange={e=>setSG(e.target.value)} placeholder="e.g. 113.4"/>
                    </div>
                    <div className="igroup">
                      <label className="ilabel">Anchor Utilization (%)</label>
                      <input type="number" step="any" min="0" max="100" className="ifield" value={anchorUtil} onChange={e=>setAU(e.target.value)} placeholder="e.g. 95"/>
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
                        <th className="grp grp-vendor" colSpan={3}>Vendor Inputs</th>
                        <th className="grp grp-recipe" colSpan={2}>Recipe</th>
                        <th className="grp grp-cost" colSpan={2}>Cost</th>
                        <th className="grp grp-moq" colSpan={3}>MOQ Reference</th>
                        <th className="grp grp-anchor" colSpan={3}>Anchor Analysis</th>
                        <th className="grp grp-elig" rowSpan={2}>Elig.</th>
                        <th className="grp grp-dark" rowSpan={2} style={{width:38}}></th>
                      </tr>
                      <tr>
                        <th className="sh-vendor" style={{width:106}}>MOQ</th>
                        <th className="sh-vendor" style={{width:106}}>PI</th>
                        <th className="sh-vendor" style={{width:106}}>Cost / Unit</th>
                        <th className="sh-recipe" style={{width:98}}>Formula %</th>
                        <th className="sh-recipe">g / Unit</th>
                        <th className="sh-cost">Cost / g</th>
                        <th className="sh-cost">Cost / Unit</th>
                        <th className="sh-moq">MOQ (g)</th>
                        <th className="sh-moq">PI (g)</th>
                        <th className="sh-moq">MOQ Cost ($)</th>
                        <th className="sh-anchor">Anchor Score</th>
                        <th className="sh-anchor">Units to Hit</th>
                        <th className="sh-anchor">Rank</th>
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
                          <td className="tr" style={{opacity:r.anchorEl==="Y"?1:0.3}}>{r.anchorScore>0?fmtC(r.anchorScore):"—"}</td>
                          <td className="tr" style={{opacity:r.anchorEl==="Y"?1:0.3}}>{r.uth>0?fmt(r.uth,1):"—"}</td>
                          <td className="tc"><RankBadge rank={r.rank}/></td>
                          <td className="tc"><button className={r.anchorEl==="Y"?"ty":"tn"} onClick={()=>togAnch(i,r.autoEl)}>{r.anchorEl}</button></td>
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
                        <td className="tr">{fmt(pf(sachetGrams),2)} g</td>
                        <td/><td className="tr">{fmtC4(C.totCpU)}</td>
                        <td/><td/><td className="tr">{fmtC(C.totMoqCost)}</td>
                        <td colSpan={5}/>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <div className="addbar">
                  <button className="btn b-yellow" onClick={addRow}>+ Add Ingredient</button>
                  <span className="addhint">Formula % as percentage (e.g. 69.22) · <strong style={{color:"var(--green)"}}>Y</strong> = include in Rec MOQ · <strong style={{color:"var(--red)"}}>N</strong> = exclude</span>
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
      {showSpec&&<SpecSheetModal ings={ings} onClose={()=>setShowSpec(false)}/>}
    </>
  );
}