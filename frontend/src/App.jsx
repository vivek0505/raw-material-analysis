import { useState, useMemo, useEffect, useCallback } from "react";

// ── All API calls use relative paths — works on any host (local dev or Catalyst)
const API = "";   // empty = same origin; in dev the Vite proxy forwards /api → :5050

const UNIT_TO_G = { lb: 453.592, g: 1, oz: 28.34952, gal: 3785.41 };
const toG   = (v, u) => parseFloat(v || 0) * (UNIT_TO_G[u] || 1);
const pf    = (v)    => parseFloat(v) || 0;
const fmt   = (v, d=2) => (v==null||isNaN(v)) ? "—" : v.toLocaleString("en-US",{minimumFractionDigits:d,maximumFractionDigits:d});
const fmtC  = (v)    => (v==null||isNaN(v)) ? "—" : "$"+v.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
const fmtC4 = (v)    => (v==null||isNaN(v)) ? "—" : "$"+v.toLocaleString("en-US",{minimumFractionDigits:4,maximumFractionDigits:4});
const fmtP  = (v)    => (v==null||isNaN(v)) ? "—" : (v*100).toFixed(1)+"%";
const pctDisp  = (dec) => { const n=pf(dec); return n===0?"":parseFloat((n*100).toFixed(6)).toString(); };
const pctParse = (s)   => { const n=parseFloat(s); return isNaN(n)?0:n/100; };

const piGrams = (pi, piUnit, moqUnit) => {
  if (!pi || pf(pi)===0) return 0;
  const u = (!piUnit||piUnit===moqUnit)?moqUnit:piUnit;
  return toG(pf(pi), u);
};
const gramsToBuy = (needed, moqG, piG) => {
  if (piG===0) return Math.max(needed, moqG);
  const n = moqG>=needed ? 0 : Math.ceil((needed-moqG)/piG);
  return moqG + n*piG;
};
const calcNPIs = (needed, moqG, piG) => {
  if (piG===0||moqG>=needed) return 0;
  return Math.ceil((needed-moqG)/piG);
};

const DEFAULT_INGS = [
  { name:"Sugar Con AA",                 moq:2500, unit:"lb", pi:25, piUnit:"", costPerLb:1.86,  costUnit:"lb", pct:0.6922, anchorOvr:null },
  { name:"Sanding Sugar",                moq:2500, unit:"lb", pi:25, piUnit:"", costPerLb:1.86,  costUnit:"lb", pct:0.2307, anchorOvr:null },
  { name:"Blueberry Juice Powder",       moq:100,  unit:"g",  pi:10, piUnit:"", costPerLb:27,    costUnit:"lb", pct:0.0249, anchorOvr:null },
  { name:"Raspberry Juice Powder",       moq:100,  unit:"g",  pi:10, piUnit:"", costPerLb:27,    costUnit:"lb", pct:0.012,  anchorOvr:null },
  { name:"Beet Juice Powder",            moq:100,  unit:"g",  pi:10, piUnit:"", costPerLb:20.3,  costUnit:"lb", pct:0.0055, anchorOvr:null },
  { name:"Citric Acid",                  moq:50,   unit:"lb", pi:5,  piUnit:"", costPerLb:0.9,   costUnit:"lb", pct:0.0185, anchorOvr:null },
  { name:"Confectioner's glaze",         moq:5,    unit:"gal",pi:1,  piUnit:"", costPerLb:35,    costUnit:"lb", pct:0.0055, anchorOvr:null },
  { name:"Blueberry Natural Flavor Oil", moq:1,    unit:"oz", pi:1,  piUnit:"", costPerLb:31.04, costUnit:"lb", pct:0.0028, anchorOvr:null },
  { name:"Raspberry Natural Flavor Oil", moq:1,    unit:"oz", pi:1,  piUnit:"", costPerLb:26.93, costUnit:"lb", pct:0.0028, anchorOvr:null },
  { name:"Strawberry Natural Flavor Oil",moq:1,    unit:"oz", pi:1,  piUnit:"", costPerLb:31.04, costUnit:"lb", pct:0.0028, anchorOvr:null },
  { name:"Salt",                         moq:50,   unit:"lb", pi:2,  piUnit:"", costPerLb:0.86,  costUnit:"lb", pct:0.0023, anchorOvr:null },
];
const blankIng = () => ({name:"",moq:"",unit:"lb",pi:"",piUnit:"",costPerLb:"",costUnit:"lb",pct:"",anchorOvr:null});

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Inter',sans-serif;background:#F1F3F5;color:#111827;font-size:15px}
:root{
  --white:#fff;
  --g50:#F8F9FA;--g100:#F1F3F5;--g200:#E9ECEF;--g300:#DEE2E6;--g400:#CED4DA;
  --g500:#6B7280;--g600:#4B5563;--g700:#374151;--g800:#1F2937;--g900:#111827;
  --blue:#2563EB;--blue-l:#EFF6FF;--blue-d:#1D4ED8;
  --green:#15803D;--green-l:#F0FDF4;
  --red:#DC2626;--red-l:#FEF2F2;
  --orange:#C2410C;--orange-l:#FFF7ED;
  --yellow:#92400E;--yinput:#FFFBEB;--yborder:#FCD34D;
  --purple:#6D28D9;--purple-l:#F5F3FF;
  --mono:'JetBrains Mono',monospace;
  --r:8px;--rs:5px;
  --sh:0 1px 3px rgba(0,0,0,.08),0 1px 2px rgba(0,0,0,.06);
}
.app{max-width:1750px;margin:0 auto;padding:20px}
.hdr{background:var(--g800);color:#fff;border-radius:var(--r);padding:20px 26px;margin-bottom:16px;display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:10px}
.hdr-title{font-size:22px;font-weight:700;margin-bottom:2px}
.hdr-sub{font-size:12px;color:#94A3B8;letter-spacing:.6px;text-transform:uppercase}
.legend{display:flex;gap:7px;flex-wrap:wrap;margin-top:12px}
.lchip{display:flex;align-items:center;gap:5px;padding:5px 10px;border-radius:4px;font-size:12px;font-weight:600;border:1px solid}
.card{background:var(--white);border:1px solid var(--g200);border-radius:var(--r);overflow:hidden;box-shadow:var(--sh)}
.ch{padding:11px 18px;background:var(--g50);border-bottom:1px solid var(--g200);display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.ch-label{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--g600)}
.ch-accent{color:var(--blue-d)}
.cbody{padding:18px}
.saved{background:var(--white);border:1px solid var(--g200);border-radius:var(--r);padding:14px 20px;margin-bottom:13px;box-shadow:var(--sh)}
.saved-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
.saved-title{font-size:12px;font-weight:700;color:var(--g600);text-transform:uppercase;letter-spacing:.8px}
.chips{display:flex;gap:7px;flex-wrap:wrap}
.chip{display:flex;align-items:center;gap:8px;padding:7px 12px;border-radius:6px;border:1px solid var(--g200);background:var(--g50)}
.chip.active{border-color:var(--yborder);background:var(--yinput)}
.chip-name{font-size:14px;font-weight:600;color:var(--g900)}
.chip-meta{font-size:12px;color:var(--g600);font-family:var(--mono)}
.savebar{background:var(--white);border:1px solid var(--g200);border-radius:var(--r);padding:10px 18px;margin-bottom:18px;display:flex;align-items:center;gap:9px;flex-wrap:wrap;box-shadow:var(--sh)}
.savebar-label{font-size:12px;font-weight:600;color:var(--g600);text-transform:uppercase;letter-spacing:.7px;white-space:nowrap}
.igrid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:13px}
@media(max-width:700px){.igrid{grid-template-columns:1fr}}
.igroup{display:flex;flex-direction:column;gap:5px}
.ilabel{font-size:12px;font-weight:600;color:#111827;text-transform:uppercase;letter-spacing:.7px}
.ifield{background:var(--yinput);border:1.5px solid var(--yborder);border-radius:var(--rs);color:#111827;font-family:var(--mono);font-size:15px;padding:9px 11px;width:100%;outline:none;transition:border-color .15s}
.ifield:focus{border-color:#D97706;box-shadow:0 0 0 3px rgba(217,119,6,.15)}
.ifield::placeholder{color:#D9CBB4}
.wi-summary{display:grid;grid-template-columns:1fr 1fr;gap:0;border:1px solid var(--g200);border-radius:var(--rs);overflow:hidden}
.wi-group{border-right:2px solid var(--g200);background:var(--white)}
.wi-group:last-child{border-right:none}
.wi-group-hdr{background:var(--g800);color:#D1D5DB;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;padding:8px 14px;text-align:center}
.wi-rows{padding:12px 14px;display:flex;flex-direction:column;gap:8px}
.wi-row{display:flex;justify-content:space-between;align-items:center;gap:8px}
.wi-lbl{font-size:13px;color:#111827;font-weight:500}
.wi-val{font-family:var(--mono);font-size:14px;font-weight:700;color:#111827}
.wi-val.green{color:var(--green)}.wi-val.red{color:var(--red)}.wi-val.blue{color:var(--blue-d)}.wi-val.orange{color:var(--orange)}
.cost-metric-card{display:flex;flex-direction:column;gap:5px;background:var(--g50);border:1px solid var(--g200);border-radius:var(--rs);padding:13px 16px;flex:1;min-width:200px}
.cost-metric-label{font-size:11px;font-weight:600;color:#111827;text-transform:uppercase;letter-spacing:.7px;margin-bottom:2px}
.cost-metric-body{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}
.cost-metric-main{font-family:var(--mono);font-size:14px;color:var(--blue-d);font-weight:700;line-height:1.2}
.cost-metric-ideal{font-family:var(--mono);font-size:11px;color:var(--green)}
.cost-metric-delta-pos{font-family:var(--mono);font-size:11px;font-weight:700;color:var(--red)}
.cost-metric-delta-neg{font-family:var(--mono);font-size:11px;font-weight:700;color:var(--green)}
.cost-metric-sub{font-size:11px;color:var(--g500);margin-top:3px;font-family:var(--mono)}
.sgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(155px,1fr));gap:10px}
.scard{background:var(--g50);border:1px solid var(--g200);border-radius:var(--rs);padding:13px 16px}
.slabel{font-size:11px;font-weight:600;color:#111827;text-transform:uppercase;letter-spacing:.7px;margin-bottom:6px}
.sval{font-family:var(--mono);font-size:18px;font-weight:700;color:#111827;line-height:1.2}
.ssub{font-size:11px;color:var(--g500);margin-top:3px;font-family:var(--mono)}
.c-blue{color:var(--blue-d)}.c-green{color:var(--green)}.c-red{color:var(--red)}
.c-orange{color:var(--orange)}.c-yellow{color:var(--yellow)}.c-purple{color:var(--purple)}
.inner-divider{display:flex;align-items:center;gap:10px;padding:0 18px;margin:0}
.inner-divider-line{flex:1;height:1px;background:var(--g200)}
.inner-divider-label{font-size:11px;font-weight:700;color:var(--g500);text-transform:uppercase;letter-spacing:1.2px;white-space:nowrap;padding:10px 0}
.divider{display:flex;align-items:center;gap:10px;margin:20px 0 14px}
.dline{flex:1;height:1px;background:var(--g200)}
.dlabel{font-size:11px;font-weight:700;color:var(--g500);text-transform:uppercase;letter-spacing:1.5px;white-space:nowrap}
/* Tables */
.twrap{overflow-x:auto;width:100%}
table{border-collapse:collapse;font-size:13px;width:max-content;min-width:100%}
th{background:var(--g800);color:#D1D5DB;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;padding:9px 10px;border-bottom:2px solid var(--g700);border-right:1px solid var(--g700);white-space:nowrap;text-align:center}
th.tl{text-align:left}
th.grp{background:#1F2937;color:#9CA3AF;font-size:10px;letter-spacing:1px;padding:6px 10px}
th.g-yellow{color:#FCD34D}th.g-green{color:#86EFAC}th.g-orange{color:#FCA5A5}
th.g-purple{color:#C4B5FD}th.g-teal{color:#5EEAD4}th.g-red{color:#FCA5A5}
th.g-blue{color:#93C5FD}th.g-pink{color:#F9A8D4}th.g-indigo{color:#A5B4FC}th.g-lime{color:#BEF264}
td{padding:8px 10px;border-bottom:1px solid var(--g100);border-right:1px solid var(--g100);vertical-align:middle;font-family:var(--mono);font-size:13px;color:#111827;white-space:nowrap;background:var(--white)}
/* Sticky ingredient column */
td.nc{font-family:'Inter',sans-serif;font-size:14px;font-weight:500;color:#111827;
  position:sticky;left:0;z-index:2;background:var(--white);
  box-shadow:3px 0 6px rgba(0,0,0,.08);white-space:nowrap;padding-right:16px}
/* Zebra stripe only on non-input rows — just tint */
tr:nth-child(even) td{background:#FAFAFA}
tr:nth-child(even) td.nc{background:#FAFAFA}
tr:hover td{background:#F5F5F5!important}
tfoot td{background:var(--g100)!important;color:#111827;font-weight:700;border-top:2px solid var(--g300);font-family:var(--mono);font-size:13px}
tfoot td.nc{background:var(--g100)!important;font-family:'Inter',sans-serif;color:#111827}
/* Input cells — yellow only */
.tdi{background:var(--yinput)!important;padding:0!important;border-right:1px solid #FDE68A!important}
.tdi input,.tdi select{background:transparent;border:none;outline:none;color:#111827;font-family:var(--mono);font-size:13px;width:100%;height:100%;padding:7px 10px}
.tdi input.ni{font-family:'Inter',sans-serif!important;font-size:13px!important;font-weight:500!important}
.tdi select{cursor:pointer;appearance:none}
/* Inline combo */
.combo{display:flex;align-items:stretch;width:100%}
.combo input[type=number]{width:68px;min-width:0;flex-shrink:0;padding:7px 4px 7px 8px;background:transparent;border:none;outline:none;color:#111827;font-family:var(--mono);font-size:13px}
.combo .usel{width:34px;flex-shrink:0;padding:7px 3px;text-align:center;background:transparent;border:none;border-left:1px solid #FDE68A;outline:none;color:#92400E;font-family:var(--mono);font-size:11px;font-weight:700;cursor:pointer;appearance:none}
.tr{text-align:right}.tc{text-align:center}
.btn{display:inline-flex;align-items:center;gap:5px;padding:8px 16px;border-radius:var(--rs);border:none;font-family:'Inter',sans-serif;font-size:14px;font-weight:600;cursor:pointer;transition:all .15s;white-space:nowrap}
.b-dark{background:var(--g800);color:#fff}.b-dark:hover{background:var(--g700)}
.b-blue{background:var(--blue);color:#fff}.b-blue:hover{background:var(--blue-d)}
.b-yellow{background:var(--yinput);color:var(--yellow);border:1.5px solid var(--yborder)}.b-yellow:hover{background:#FEF9C3}
.b-green{background:var(--green-l);color:var(--green);border:1.5px solid #86EFAC}.b-green:hover{background:#DCFCE7}
.b-green:disabled{background:var(--g100);color:var(--g400);border-color:var(--g200);cursor:default}
.bsm{padding:5px 10px;border-radius:4px;border:none;font-size:12px;font-weight:700;cursor:pointer;font-family:'Inter',sans-serif;transition:all .15s}
.bs-blue{background:var(--blue-l);color:var(--blue-d)}.bs-blue:disabled{background:var(--g100);color:var(--g400);cursor:default}
.bs-red{background:var(--red-l);color:var(--red)}
.bxs{background:var(--red-l);color:var(--red);border:1px solid #FECACA;border-radius:4px;padding:3px 9px;font-size:12px;font-weight:700;cursor:pointer;font-family:'Inter',sans-serif}
.ty{background:var(--green-l);color:var(--green);border:1px solid #86EFAC;width:36px;border-radius:4px;padding:4px 0;text-align:center;font-size:13px;font-weight:800;cursor:pointer;font-family:'Inter',sans-serif}
.tn{background:var(--red-l);color:var(--red);border:1px solid #FECACA;width:36px;border-radius:4px;padding:4px 0;text-align:center;font-size:13px;font-weight:800;cursor:pointer;font-family:'Inter',sans-serif}
.rb{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;font-size:12px;font-weight:800;font-family:var(--mono)}
.r1{background:#FCD34D;color:#78350F}.r2{background:#D1D5DB;color:#374151}
.r3{background:#FED7AA;color:#7C2D12}.rn{background:#F3F4F6;color:#374151}
.util-pct{font-family:var(--mono);font-size:13px;font-weight:700}
.util-green{color:var(--green)}.util-red{color:var(--red)}
.addbar{padding:11px 18px;border-top:1px solid var(--g100);background:var(--g50);display:flex;align-items:center;gap:9px;flex-wrap:wrap}
.addhint{font-size:12px;color:var(--g600);line-height:1.5}
.loader{display:flex;align-items:center;justify-content:height:100vh;flex-direction:column;gap:10px;background:var(--g100)}
.pulse{animation:pulse 1.5s ease-in-out infinite;font-size:30px}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
::-webkit-scrollbar{width:5px;height:5px}
::-webkit-scrollbar-track{background:var(--g100)}
::-webkit-scrollbar-thumb{background:var(--g300);border-radius:3px}
`;

const S = () => <style dangerouslySetInnerHTML={{__html:CSS}}/>;
const Div = ({label}) => (
  <div className="divider"><div className="dline"/><span className="dlabel">{label}</span><div className="dline"/></div>
);
const SC = ({label,value,sub,color=""}) => (
  <div className="scard">
    <div className="slabel">{label}</div>
    <div className={`sval ${color}`}>{value}</div>
    {sub && <div className="ssub">{sub}</div>}
  </div>
);
const UtilPct = ({value}) => (
  <span className={`util-pct ${value>=0.75?"util-green":"util-red"}`}>{(value*100).toFixed(1)}%</span>
);
const RankBadge = ({rank}) => {
  if (!rank) return <span style={{fontFamily:"var(--mono)",fontSize:12,color:"#9CA3AF"}}>—</span>;
  const cls = rank===1?"r1":rank===2?"r2":rank===3?"r3":"rn";
  return <span className={`rb ${cls}`}>{rank}</span>;
};
const WIRow = ({label,value,cls=""}) => (
  <div className="wi-row">
    <span className="wi-lbl">{label}</span>
    <span className={`wi-val ${cls}`}>{value}</span>
  </div>
);
const CostMetricCard = ({label,wiValue,idealValue,delta,sub}) => {
  const pos = delta > 0;
  return (
    <div className="cost-metric-card">
      <div className="cost-metric-label">{label}</div>
      <div className="cost-metric-body">
        <span className="cost-metric-main">What-If: {wiValue}</span>
        <span className="cost-metric-ideal">Ideal: {idealValue}</span>
        <span className={pos?"cost-metric-delta-pos":"cost-metric-delta-neg"}>Δ {pos?"+":""}{delta}</span>
      </div>
      {sub && <div className="cost-metric-sub">{sub}</div>}
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

export default function App() {
  const [currentId,     setCID]    = useState(null);
  const [analysisName,  setName]   = useState("");
  const [sachetGrams,   setSG]     = useState(113.4);
  const [anchorUtil,    setAU]     = useState(95);
  const [whatIfUnits,   setWI]     = useState(7200);
  const [ings,          setIngs]   = useState(DEFAULT_INGS);
  const [saved,         setSaved]  = useState([]);
  const [dirty,         setDirty]  = useState(false);
  const [lastSaved,     setLS]     = useState(null);
  const [saving,        setSaving] = useState(false);
  const [loading,       setLoading]= useState(true);

  useEffect(()=>{
    (async()=>{
      try{
        const r=await fetch(`${API}/api/analyses`);
        if(r.ok) setSaved(await r.json());
      }catch(_){}
      setLoading(false);
    })();
  },[]);
  useEffect(()=>{if(!loading)setDirty(true);},[sachetGrams,anchorUtil,whatIfUnits,ings]);

  const doSave = useCallback(async()=>{
    if(!analysisName.trim())return;
    setSaving(true);
    const id=currentId||`a_${Date.now()}`;
    const data={sachetGrams,anchorUtil,whatIfUnits,ings};
    try{
      const r=await fetch(`${API}/api/analyses`,{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({id,name:analysisName.trim(),data}),
      });
      if(!r.ok)throw new Error("Server error "+r.status);
      const meta=await r.json();
      const ni=currentId?saved.map(a=>a.id===currentId?meta:a):[...saved,meta];
      setSaved(ni);setCID(id);setDirty(false);setLS(meta.savedAt);
    }catch(e){alert("Save failed: "+e.message);}
    setSaving(false);
  },[analysisName,currentId,sachetGrams,anchorUtil,whatIfUnits,ings,saved]);

  const doLoad = useCallback(async(id)=>{
    try{
      const r=await fetch(`${API}/api/analyses/${id}`);
      if(!r.ok)throw new Error("Not found");
      const {data:d,name,savedAt}=await r.json();
      setSG(d.sachetGrams);
      if(d.anchorUtil!=null)setAU(d.anchorUtil);
      else if(d.dollarWt!=null)setAU(d.dollarWt*100);
      else setAU(95);
      setWI(d.whatIfUnits??d.whatIfMOQ??"");
      setIngs(d.ings.map(ing=>({costUnit:"lb",...ing})));
      setCID(id);setName(name||"");setDirty(false);setLS(savedAt||null);
    }catch(e){alert("Load failed: "+e.message);}
  },[]);

  const doDel = useCallback(async(id)=>{
    if(!confirm("Delete this analysis?"))return;
    try{
      const r=await fetch(`${API}/api/analyses/${id}`,{method:"DELETE"});
      if(!r.ok)throw new Error("Server error "+r.status);
      setSaved(prev=>prev.filter(a=>a.id!==id));
      if(currentId===id){setCID(null);setName("");setDirty(false);setLS(null);}
    }catch(e){alert("Delete failed: "+e.message);}
  },[currentId]);

  const doNew = ()=>{
    if(dirty&&!confirm("Unsaved changes. Continue?"))return;
    setSG("");setAU(95);setWI("");
    setIngs([blankIng()]);setCID(null);setName("");setDirty(false);setLS(null);
  };

  const upd     = (i,f,v)=>{const c=[...ings];c[i]={...c[i],[f]:v};setIngs(c);};
  const addRow  = ()=>setIngs([...ings,blankIng()]);
  const delRow  = (i)=>setIngs(ings.filter((_,j)=>j!==i));
  const togAnch = (i,auto)=>{
    const c=[...ings];
    const cur=c[i].anchorOvr!==null?c[i].anchorOvr:auto;
    c[i]={...c[i],anchorOvr:cur==="Y"?"N":"Y"};
    setIngs(c);
  };

  const C = useMemo(()=>{
    const sg    = pf(sachetGrams);
    const wi    = pf(whatIfUnits)||0;
    const auDec = pf(anchorUtil)/100;
    const rows  = ings.map(ing=>{
      const costU       = ing.costUnit||"lb";
      const lcg         = pf(ing.costPerLb)/(UNIT_TO_G[costU]||453.592);
      const gpU         = pf(ing.pct)*sg;
      const cpU         = gpU*lcg;
      const moqG        = toG(pf(ing.moq), ing.unit);
      const piG         = piGrams(ing.pi, ing.piUnit, ing.unit);
      const moqCost     = moqG*lcg;
      const anchorScore = moqCost*auDec;
      const uth         = gpU>0?(moqG*auDec)/gpU:0;
      const autoEl      = lcg>0?"Y":"N";
      const anchorEl    = ing.anchorOvr!==null?ing.anchorOvr:autoEl;
      return{...ing,lcg,gpU,cpU,moqG,piG,moqCost,anchorScore,uth,autoEl,anchorEl};
    });
    const eligScores = rows.filter(r=>r.anchorEl==="Y"&&r.anchorScore>0).map(r=>r.anchorScore);
    const ranked = rows.map(r=>{
      if(r.anchorEl!=="Y"||r.anchorScore<=0) return{...r,rank:null};
      const rank = 1+eligScores.filter(s=>s>r.anchorScore).length;
      return{...r,rank};
    });
    const eligRows = ranked.filter(r=>r.anchorEl==="Y"&&r.uth>0&&r.anchorScore>0);
    const spON   = eligRows.reduce((s,r)=>s+(r.uth*r.anchorScore),0);
    const spN    = eligRows.reduce((s,r)=>s+r.anchorScore,0);
    const recMOQ = spN>0?Math.ceil(spON/spN):0;
    const totCpU     = ranked.reduce((s,r)=>s+r.cpU,0);
    const cpg        = sg>0?totCpU/sg:0;
    const pctSum     = ranked.reduce((s,r)=>s+pf(r.pct),0);
    const totMoqCost = ranked.reduce((s,r)=>s+r.moqCost,0);
    const planU = wi||recMOQ;
    const ppRows = ranked.map(r=>{
      const reqG  = r.gpU*planU;
      const purG  = gramsToBuy(reqG,r.moqG,r.piG);
      const npiW  = calcNPIs(reqG,r.moqG,r.piG);
      const lefG  = purG-reqG;
      const purD  = purG*r.lcg;
      const usedD = reqG*r.lcg;
      const lefD  = purD-usedD;
      const gutil = purG>0?reqG/purG:0;
      const dutil = purD>0?usedD/purD:0;
      return{...r,reqG,purG,npiW,lefG,purD,usedD,lefD,gutil,dutil};
    });
    const totPurG  = ppRows.reduce((s,r)=>s+r.purG,0);
    const totReqG  = ppRows.reduce((s,r)=>s+r.reqG,0);
    const totLefG  = ppRows.reduce((s,r)=>s+r.lefG,0);
    const totPurD  = ppRows.reduce((s,r)=>s+r.purD,0);
    const totUsedD = ppRows.reduce((s,r)=>s+r.usedD,0);
    const totLefD  = ppRows.reduce((s,r)=>s+r.lefD,0);
    const ppGU     = totPurG>0?totReqG/totPurG:0;
    const ppDU     = totPurD>0?totUsedD/totPurD:0;
    const ppGRisk  = totPurG>0?totLefG/totPurG:0;
    const ppDRisk  = totPurD>0?totLefD/totPurD:0;
    const ppCpG    = planU*sg>0?totPurD/(planU*sg):0;
    const ppCpU    = planU>0?totPurD/planU:0;
    return{ranked,ppRows,recMOQ,totCpU,cpg,pctSum,totMoqCost,
      totPurG,totReqG,totLefG,totPurD,totUsedD,totLefD,
      ppGU,ppDU,ppGRisk,ppDRisk,ppCpG,ppCpU,planU};
  },[ings,sachetGrams,anchorUtil,whatIfUnits]);

  const doDownload = useCallback(async()=>{
    try{
      const res=await fetch(`${API}/export`,{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({analysisName,sachetGrams,anchorUtil,whatIfUnits,ings})});
      if(!res.ok)throw new Error("Server returned "+res.status);
      const blob=await res.blob();
      const url=URL.createObjectURL(blob);
      const a=document.createElement("a");a.href=url;
      a.download=`${(analysisName||"Analysis").replace(/[^a-zA-Z0-9_\- ]/g,"_")}.xlsx`;
      a.click();URL.revokeObjectURL(url);
    }catch(e){alert("Download failed: "+e.message);}
  },[analysisName,sachetGrams,anchorUtil,whatIfUnits,ings]);

  const pctOk = Math.abs(C.pctSum-1)<0.0001;

  if(loading) return <><S/><div className="loader"><div className="pulse">⚗️</div><div style={{color:"#374151",fontSize:14}}>Loading…</div></div></>;

  return (
    <>
      <S/>
      <div className="app">

        {/* HEADER */}
        <div className="hdr">
          <div>
            <div className="hdr-title">Raw Materials Costing &amp; Purchasing</div>
            <div className="hdr-sub">Raw Material Analysis Tool</div>
            <div className="legend">
              <div className="lchip" style={{background:"#FFFBEB",borderColor:"#FCD34D",color:"#92400E"}}>User Input</div>
            </div>
          </div>
          <div style={{display:"flex",gap:7,alignItems:"center",fontSize:13}}>
            {dirty && <span style={{color:"#FCD34D"}}>● Unsaved</span>}
            {lastSaved && !dirty && <span style={{color:"#86EFAC"}}>✓ {lastSaved}</span>}
          </div>
        </div>

        {/* SAVED */}
        <div className="saved">
          <div className="saved-hdr">
            <span className="saved-title">📁 Saved Analyses</span>
            <button className="btn b-yellow" onClick={doNew}>+ New</button>
          </div>
          {saved.length===0
            ? <div style={{color:"#6B7280",fontSize:13,fontStyle:"italic"}}>No saved analyses yet.</div>
            : <div className="chips">
                {saved.map(a=>(
                  <div key={a.id} className={`chip${a.id===currentId?" active":""}`}>
                    <div>
                      <div className="chip-name">{a.name}</div>
                      <div className="chip-meta">{a.savedAt}</div>
                    </div>
                    <div style={{display:"flex",gap:4}}>
                      <button className="bsm bs-blue" disabled={a.id===currentId} onClick={()=>doLoad(a.id)}>{a.id===currentId?"Active":"Load"}</button>
                      <button className="bsm bs-red" onClick={()=>doDel(a.id)}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
          }
        </div>

        {/* SAVE BAR */}
        <div className="savebar">
          <span className="savebar-label">Name</span>
          <input type="text" value={analysisName} onChange={e=>setName(e.target.value)} placeholder="e.g. Blueberry Sachet Q1 2026"
            style={{background:"var(--yinput)",border:"1px solid var(--yborder)",borderRadius:"var(--rs)",color:"var(--g900)",fontFamily:"var(--mono)",fontSize:13,padding:"6px 10px",width:260,outline:"none"}}/>
          <button className="btn b-green" onClick={doSave} disabled={!analysisName.trim()}>{saving?"Saving…":"💾 Save"}</button>
          <button className="btn b-blue" onClick={doDownload}>⬇ Excel</button>
        </div>

        {/* ── SECTION 1 ── */}
        <Div label="Section 1 — Scenario Parameters"/>
        <div className="card" style={{marginBottom:14}}>
          <div className="ch"><span className="ch-label">Scenario <span className="ch-accent">Inputs</span></span></div>
          <div className="cbody">
            <div className="igrid" style={{gridTemplateColumns:"1fr 1fr"}}>
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

        {/* ── SECTION 2 ── */}
        <Div label="Section 2 — Recipe & Vendor Input"/>
        <div className="card" style={{marginBottom:14}}>
          <div className="ch">
            <span className="ch-label">Recipe &amp; Vendor <span className="ch-accent">Input</span></span>
            <span style={{marginLeft:8,fontSize:11,color:"var(--g500)",fontStyle:"italic"}}>policy summary &amp; ingredient matrix · scenario-independent</span>
            <div style={{marginLeft:"auto",padding:"3px 9px",borderRadius:4,background:pctOk?"var(--green-l)":"var(--red-l)",border:`1px solid ${pctOk?"#86EFAC":"#FECACA"}`,fontSize:12,fontFamily:"var(--mono)",color:pctOk?"var(--green)":"var(--red)"}}>
              Σ formula % = {(C.pctSum*100).toFixed(2)}% {pctOk?"✓":"⚠ must = 100%"}
            </div>
          </div>
          <div className="cbody" style={{paddingBottom:14}}>
            <div className="sgrid">
              <SC label="Recommended MOQ"    value={fmt(C.recMOQ,0)+" units"} sub="SUMPRODUCT(uth×anchorScore) ÷ SUMPRODUCT(anchorScore)" color="c-yellow"/>
              <SC label="Recipe Cost / Unit" value={fmtC4(C.totCpU)}          sub="at 100% efficiency (ideal)" color="c-green"/>
              <SC label="Recipe Cost / Gram" value={"$"+fmt(C.cpg,4)}         sub="at 100% efficiency (ideal)" color="c-green"/>
              <SC label="Minimum MOQ Cost"   value={fmtC(C.totMoqCost)}       sub="sum of all 1× MOQ costs"    color="c-blue"/>
            </div>
          </div>
          <div className="inner-divider">
            <div className="inner-divider-line"/>
            <span className="inner-divider-label">Ingredient Matrix</span>
            <div className="inner-divider-line"/>
          </div>
          <div className="twrap">
            <table>
              <thead>
                <tr>
                  <th className="grp tl" rowSpan={2} style={{position:"sticky",left:0,zIndex:5,background:"#1F2937"}}>Ingredient</th>
                  <th className="grp g-yellow" colSpan={3}>Vendor Inputs</th>
                  <th className="grp g-green" colSpan={2}>Recipe</th>
                  <th className="grp g-teal" colSpan={2}>Cost</th>
                  <th className="grp g-orange" colSpan={3}>MOQ Reference</th>
                  <th className="grp g-purple" colSpan={3}>Anchor Analysis</th>
                  <th className="grp g-red" rowSpan={2}>Elig.</th>
                  <th className="grp" rowSpan={2} style={{color:"#9CA3AF"}}>✕</th>
                </tr>
                <tr>
                  <th style={{width:102}}>MOQ</th><th style={{width:102}}>PI</th><th style={{width:102}}>Cost / unit</th>
                  <th style={{width:102}}>Formula %</th><th>g / Unit</th>
                  <th>Cost / g</th><th>Cost / Unit</th>
                  <th>MOQ (g)</th><th>PI (g)</th><th>MOQ Cost $</th>
                  <th>Anchor Score $</th><th>Units to Hit</th><th>Anchor Rank</th>
                </tr>
              </thead>
              <tbody>
                {C.ranked.map((r,i)=>(
                  <tr key={i}>
                    <td className="nc tdi" style={{background:"var(--yinput)",position:"sticky",left:0,zIndex:3}}>
                      <input type="text" className="ni" value={ings[i].name} onChange={e=>upd(i,"name",e.target.value)} placeholder="Ingredient name" style={{minWidth:180}}/>
                    </td>
                    <Combo num={ings[i].moq} onNum={v=>upd(i,"moq",v)}
                           unit={ings[i].unit} onUnit={v=>upd(i,"unit",v)}
                           units={["lb","g","oz","gal"]} step="1"/>
                    <Combo num={ings[i].pi} onNum={v=>upd(i,"pi",v)}
                           unit={ings[i].piUnit||ings[i].unit}
                           onUnit={v=>upd(i,"piUnit",v)}
                           units={[...new Set([ings[i].unit,"lb","g","oz","gal"])]}
                           placeholder="PI"/>
                    <Combo num={ings[i].costPerLb} onNum={v=>upd(i,"costPerLb",v)}
                           unit={ings[i].costUnit||"lb"} onUnit={v=>upd(i,"costUnit",v)}
                           units={["lb","g","oz","gal"]} step="any"/>
                    <td className="tdi" style={{width:102}}>
                      <input type="number" step="any" value={pctDisp(ings[i].pct)} onChange={e=>upd(i,"pct",pctParse(e.target.value))} placeholder="e.g. 69.22" style={{width:102}}/>
                    </td>
                    <td className="tr">{fmt(r.gpU,3)} g</td>
                    <td className="tr">{fmt(r.lcg,5)}</td>
                    <td className="tr">{fmtC4(r.cpU)}</td>
                    <td className="tr">{fmt(r.moqG,1)} g</td>
                    <td className="tr">{r.piG>0?fmt(r.piG,2)+" g":"—"}</td>
                    <td className="tr">{fmtC(r.moqCost)}</td>
                    <td className="tr" style={{opacity:r.anchorEl==="Y"?1:0.35}}>{r.anchorScore>0?fmtC(r.anchorScore):"—"}</td>
                    <td className="tr" style={{opacity:r.anchorEl==="Y"?1:0.35}}>{r.uth>0?fmt(r.uth,1):"—"}</td>
                    <td className="tc"><RankBadge rank={r.rank}/></td>
                    <td className="tc"><button className={r.anchorEl==="Y"?"ty":"tn"} onClick={()=>togAnch(i,r.autoEl)}>{r.anchorEl}</button></td>
                    <td className="tc"><button className="bxs" onClick={()=>delRow(i)}>✕</button></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td className="nc">TOTALS</td>
                  <td colSpan={3}/>
                  <td className="tr" style={{color:pctOk?"var(--green)":"var(--red)"}}>{(C.pctSum*100).toFixed(2)}%</td>
                  <td className="tr">{fmt(pf(sachetGrams),2)} g</td>
                  <td/>
                  <td className="tr">{fmtC4(C.totCpU)}</td>
                  <td/>
                  <td/>
                  <td className="tr">{fmtC(C.totMoqCost)}</td>
                  <td colSpan={5}/>
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="addbar">
            <button className="btn b-yellow" onClick={addRow}>+ Add Ingredient</button>
            <span className="addhint">
              Formula % as percentage (e.g. 69.22) · PI unit defaults to MOQ unit ·
              <strong style={{color:"var(--green)"}}> Y</strong> = include in Rec MOQ ·
              <strong style={{color:"var(--red)"}}> N</strong> = exclude
            </span>
          </div>
          {!pctOk && (
            <div style={{padding:"11px 18px",background:"#FEF2F2",borderTop:"2px solid #DC2626",display:"flex",alignItems:"center",gap:9}}>
              <span style={{fontSize:16}}>⚠️</span>
              <span style={{fontWeight:700,color:"#DC2626",fontSize:13}}>
                Recipe does not add up to 100% — currently {(C.pctSum*100).toFixed(4)}%
                {C.pctSum<1?` (${((1-C.pctSum)*100).toFixed(4)}% short)`:`(${((C.pctSum-1)*100).toFixed(4)}% over)`}.
              </span>
            </div>
          )}
        </div>

        {/* ── SECTION 3 ── */}
        <Div label="Section 3 — What-If Scenario Analysis"/>
        <div className="card" style={{marginBottom:14}}>
          <div className="ch">
            <span className="ch-label">What-If <span className="ch-accent">Scenario Analysis</span></span>
            <span style={{marginLeft:"auto",fontFamily:"var(--mono)",fontSize:11,color:"var(--g600)"}}>@ {fmt(C.planU,0)} units</span>
          </div>

          <div className="cbody" style={{paddingBottom:14}}>
            <div style={{display:"flex",alignItems:"flex-end",gap:13,flexWrap:"wrap",marginBottom:13}}>
              <div className="igroup" style={{minWidth:220,maxWidth:260}}>
                <label className="ilabel">What-If Units</label>
                <input type="number" className="ifield" value={whatIfUnits} onChange={e=>setWI(e.target.value)} placeholder={`Auto: ${fmt(C.recMOQ,0)} (Rec. MOQ)`}/>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
              <CostMetricCard label="Cost / Gram"
                wiValue={`$${fmt(C.ppCpG,4)}`} idealValue={`$${fmt(C.cpg,4)}`}
                delta={C.ppCpG-C.cpg} sub={`at ${fmt(C.planU,0)} units planned`}/>
              <CostMetricCard label="Cost / Unit"
                wiValue={fmtC4(C.ppCpU)} idealValue={fmtC4(C.totCpU)}
                delta={C.ppCpU-C.totCpU} sub={`at ${fmt(C.planU,0)} units planned`}/>
            </div>
            <div className="wi-summary">
              <div className="wi-group">
                <div className="wi-group-hdr">Grams Analysis</div>
                <div className="wi-rows">
                  <WIRow label="Total Purchased" value={fmt(C.totPurG,0)+" g"} cls="blue"/>
                  <WIRow label="Total Used"       value={fmt(C.totReqG,0)+" g"} cls="green"/>
                  <WIRow label="Total Leftover"   value={fmt(C.totLefG,0)+" g"} cls="orange"/>
                  <div style={{borderTop:"1px solid var(--g200)",margin:"4px 0"}}/>
                  <WIRow label="Grams Util %"    value={<UtilPct value={C.ppGU}/>}/>
                  <WIRow label="Grams At Risk %"  value={<span className="util-pct util-red">{fmtP(C.ppGRisk)}</span>}/>
                </div>
              </div>
              <div className="wi-group">
                <div className="wi-group-hdr">$ Analysis</div>
                <div className="wi-rows">
                  <WIRow label="Total Purchased" value={fmtC(C.totPurD)}  cls="blue"/>
                  <WIRow label="Total Used"       value={fmtC(C.totUsedD)} cls="green"/>
                  <WIRow label="Total Leftover"   value={fmtC(C.totLefD)}  cls="red"/>
                  <div style={{borderTop:"1px solid var(--g200)",margin:"4px 0"}}/>
                  <WIRow label="$ Util %"         value={<UtilPct value={C.ppDU}/>}/>
                  <WIRow label="$ At Risk %"      value={<span className="util-pct util-red">{fmtP(C.ppDRisk)}</span>}/>
                </div>
              </div>
            </div>
          </div>

          <div className="inner-divider">
            <div className="inner-divider-line"/>
            <span className="inner-divider-label">Purchase Breakdown &amp; Analysis</span>
            <div className="inner-divider-line"/>
          </div>
          <div className="twrap">
            <table>
              <thead>
                <tr>
                  <th className="grp tl" rowSpan={2} style={{position:"sticky",left:0,zIndex:5,background:"#1F2937"}}>Ingredient</th>
                  <th className="grp g-purple" rowSpan={2}>g Needed</th>
                  <th className="grp g-orange" colSpan={4}>Purchase Analysis</th>
                  <th className="grp g-blue" colSpan={3}>Grams Analysis</th>
                  <th className="grp g-green" colSpan={3}>$ Analysis</th>
                </tr>
                <tr>
                  <th># MOQ</th><th># PI</th><th>g to Buy</th><th>Purchased $</th>
                  <th>Used g</th><th>Leftover g</th><th>Gram Util %</th>
                  <th>Used $</th><th>Leftover $</th><th>$ Util %</th>
                </tr>
              </thead>
              <tbody>
                {C.ppRows.map((r,i)=>(
                  <tr key={i}>
                    <td className="nc">{r.name||<em style={{color:"#9CA3AF"}}>unnamed</em>}</td>
                    <td className="tr">{fmt(r.reqG,2)} g</td>
                    <td className="tc">1</td>
                    <td className="tc">{r.npiW}</td>
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
          <div style={{height:14}}/>
        </div>

        <div style={{textAlign:"center",padding:"12px 0 24px",color:"#9CA3AF",fontSize:11,fontFamily:"var(--mono)"}}>
          Raw Material Analysis Tool · {new Date().getFullYear()}
        </div>
      </div>
    </>
  );
}
