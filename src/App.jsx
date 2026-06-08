import { useState, useEffect, useCallback } from "react";

// ── STORAGE ─────────────────────────────────────────────────────
const inMem = {};
const store = {
  async get(k) { try { if(window.storage){const r=await window.storage.get(k);return r?.value?JSON.parse(r.value):null;} } catch {} return inMem[k]??null; },
  async set(k,v) { try { if(window.storage)await window.storage.set(k,JSON.stringify(v)); } catch {} inMem[k]=v; },
};
const KEY = "cz-suivi-v1";

// ── SYNC SUPABASE ────────────────────────────────────────────────
const syncToSupabase = async (table, data, agent) => {
  try {
    await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table, action: 'insert', data, agent }),
    });
  } catch (e) {
    console.warn('Sync Supabase échouée:', e.message);
  }
};

// ── STYLES ──────────────────────────────────────────────────────
const injectStyles = () => {
  if (document.getElementById("czs-s")) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Outfit:wght@300;400;500;600;700&display=swap";
  document.head.appendChild(link);
  const s = document.createElement("style");
  s.id = "czs-s";
  s.textContent = `
    .czs *{box-sizing:border-box;}
    .czs{font-family:'Outfit',sans-serif;background:#FAF8F5;min-height:100vh;color:#2D1B4E;}
    .czs-serif{font-family:'DM Serif Display',serif;}
    .czs-card{background:#fff;border-radius:18px;border:1px solid rgba(45,10,62,.08);box-shadow:0 1px 4px rgba(45,10,62,.06),0 6px 20px rgba(45,10,62,.04);}
    .czs-inp{width:100%;padding:11px 15px;border:1.5px solid rgba(45,10,62,.15);border-radius:10px;background:#fff;color:#2D1B4E;font-family:'Outfit',sans-serif;font-size:14px;outline:none;transition:all .2s;}
    .czs-inp:focus{border-color:#F5A623;box-shadow:0 0 0 3px rgba(245,166,35,.12);}
    .czs-sel{appearance:none;width:100%;padding:11px 15px;border:1.5px solid rgba(45,10,62,.15);border-radius:10px;background:#fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23F5A623' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E") no-repeat right 14px center;color:#2D1B4E;font-family:'Outfit',sans-serif;font-size:14px;outline:none;cursor:pointer;}
    .czs-btn{background:#F5A623;color:#2D0A3E;border:none;border-radius:13px;padding:13px 26px;font-family:'Outfit',sans-serif;font-size:14px;font-weight:700;cursor:pointer;transition:all .2s;}
    .czs-btn:hover:not(:disabled){background:#E09A1A;box-shadow:0 4px 18px rgba(245,166,35,.32);transform:translateY(-1px);}
    .czs-btn:disabled{opacity:.38;cursor:not-allowed;}
    .czs-btn-sm{background:transparent;color:#7C6A8E;border:1px solid rgba(45,10,62,.15);border-radius:8px;padding:5px 12px;font-family:'Outfit',sans-serif;font-size:11px;font-weight:500;cursor:pointer;transition:all .15s;}
    .czs-btn-sm:hover{border-color:#F5A623;color:#F5A623;}
    .czs-btn-rose{background:#2D0A3E;color:#F5A623;border:none;border-radius:10px;padding:8px 16px;font-family:'Outfit',sans-serif;font-size:12px;font-weight:700;cursor:pointer;transition:all .2s;}
    .czs-btn-rose:hover{background:#1A0652;box-shadow:0 3px 12px rgba(45,10,62,.25);}
    .czs-tab{padding:8px 18px;border-radius:100px;font-family:'Outfit',sans-serif;font-size:13px;font-weight:500;cursor:pointer;border:1.5px solid transparent;transition:all .2s;background:transparent;color:#7C6A8E;}
    .czs-tab:hover{color:#F5A623;background:rgba(245,166,35,.07);}
    .czs-tab.sel{background:#F5A623;color:#2D0A3E;font-weight:700;}
    .czs-client-card{background:#fff;border-radius:16px;border:1.5px solid rgba(45,10,62,.1);cursor:pointer;transition:all .2s;padding:18px;}
    .czs-client-card:hover{border-color:#F5A623;box-shadow:0 4px 16px rgba(245,166,35,.14);transform:translateY(-2px);}
    @keyframes czsUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
    @keyframes czsSpin{to{transform:rotate(360deg)}}
    .czs-up{animation:czsUp .4s ease forwards;}
    .czs-up1{animation:czsUp .4s .08s ease both;}
    .czs-up2{animation:czsUp .4s .18s ease both;}
  `;
  document.head.appendChild(s);
};

// ── LOGO ────────────────────────────────────────────────────────
const Logo = ({ height=34, dark=false }) => (
  <svg viewBox="0 0 210 60" height={height} style={{display:"block"}} xmlns="http://www.w3.org/2000/svg" aria-label="CapZeniths">
    <circle cx="30" cy="30" r="28" fill="#2D0A3E"/>
    <rect x="14" y="37" width="9" height="9"  rx="1.5" fill="#F5A623"/>
    <rect x="26" y="28" width="9" height="18" rx="1.5" fill="#F5A623"/>
    <rect x="38" y="18" width="9" height="28" rx="1.5" fill="#F5A623"/>
    <polygon points="42.5,6.5 43.8,10.2 47.7,10.3 44.6,12.7 45.7,16.5 42.5,14.2 39.3,16.5 40.4,12.7 37.3,10.3 41.2,10.2" fill="#F5A623"/>
    <text x="66" y="41" fontFamily="'Outfit',sans-serif" fontSize="25" fontWeight="700" fill="#F5A623">Cap</text>
    <text x="109" y="41" fontFamily="'Outfit',sans-serif" fontSize="25" fontWeight="700" fill={dark?"#C4B8E8":"#9B8ED4"}>Zeniths</text>
  </svg>
);

// ── CONSTANTES ──────────────────────────────────────────────────
const PILLIERS = [{id:"cash",icon:"💰",label:"Cash"},{id:"strategie",icon:"🎯",label:"Stratégie"},{id:"clients",icon:"🤝",label:"Clients"},{id:"equipe",icon:"👥",label:"Équipe"},{id:"risques",icon:"⚠️",label:"Risques"},{id:"croissance",icon:"📈",label:"Croissance"},{id:"resilience",icon:"🛡️",label:"Résilience"}];
const SECTEURS = ["Commerce","Restauration","BTP","Services B2B","Conseil / Formation","Santé","Tech","Transport","Autre"];
const TYPES    = ["Diagnostic seul","Accompagnement 1 mois","Accompagnement 3 mois","Accompagnement 6 mois"];
const EMPTY_SCORES = () => Object.fromEntries(PILLIERS.map(p=>[p.id,5]));
const sColor = s => s<=3?"#EF4444":s<=6?"#F59E0B":"#10B981";
const sBg    = s => s<=3?"#FEE2E2":s<=6?"#FEF3C7":"#D1FAE5";
const sTxt   = s => s<=3?"#991B1B":s<=6?"#92400E":"#065F46";
const sLabel = s => s<=3?"CRITIQUE":s<=6?"VIGILANCE":"SOLIDE";
const gScore = scores => Math.round(Object.values(scores).reduce((a,b)=>a+b,0)/7*10)/10;
const trendIcon  = (c,p) => !p?null:c>p?"↑":c<p?"↓":"→";
const trendColor = (c,p) => !p?"#B8A898":c>p?"#10B981":c<p?"#EF4444":"#B8A898";

const SEANCE_SYS = `Tu es l'Agent Suivi de CapZeniths. Analyse la séance d'accompagnement. Style direct, bienveillant. RÉPONDS EN JSON VALIDE sans backticks.
{"bilan":"<2-3 phrases>","progres":"<vs séance précédente>","alertes":["<alerte si rouge>"],"actions":["<action 1>","<action 2>","<action 3>"],"motEncouragement":"<1 phrase>"}`;

const CHECKIN_SYS = `Tu es l'Agent Suivi de CapZeniths. Prépare l'ordre du jour de la prochaine séance. RÉPONDS EN JSON VALIDE sans backticks.
{"agenda":["<point 1>","<point 2>","<point 3>"],"pointsCritiques":["<urgent>"],"questions":["<question 1>","<question 2>","<question 3>"],"exercicePrep":"<exercice préparatoire>","dureeEstimee":"60 min"}`;

const callAPI = async (system, content) => {
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      system,
      messages: [{ role: "user", content }],
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`API ${res.status}: ${errText}`);
  }
  const data = await res.json();
  const raw = (data.content?.[0]?.text || "").replace(/```json|```/g, "").trim();
  const jsonMatch = raw.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  return JSON.parse(jsonMatch ? jsonMatch[0] : raw);
};

const ScoreBar = ({score,prev}) => (
  <div style={{display:"flex",alignItems:"center",gap:8,flex:1}}>
    <div style={{flex:1,height:5,background:"rgba(45,10,62,.08)",borderRadius:3,overflow:"hidden"}}>
      <div style={{width:`${score*10}%`,height:"100%",borderRadius:3,background:sColor(score),transition:"width .6s ease"}}/>
    </div>
    <span style={{fontSize:13,fontWeight:600,color:"#2D1B4E",minWidth:18}}>{score}</span>
    {prev!==undefined&&<span style={{fontSize:12,fontWeight:600,color:trendColor(score,prev),minWidth:14}}>{trendIcon(score,prev)||"—"}</span>}
  </div>
);

// ── COMPOSANTS ──────────────────────────────────────────────────
function ClientCard({client,onSelect}) {
  const last=client.sessions[client.sessions.length-1];
  const gs=last?gScore(last.scores):null;
  const days=last?Math.floor((Date.now()-new Date(last.date))/86400000):null;
  return (
    <div className="czs-client-card" onClick={onSelect}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
        <div>
          <div style={{fontSize:15,fontWeight:600,color:"#2D0A3E",marginBottom:2}}>{client.nom}</div>
          <div style={{fontSize:12,color:"#7C6A8E"}}>{client.entreprise}</div>
          <div style={{fontSize:11,color:"#B8A898",marginTop:2}}>{client.secteur} · {client.typeAccompagnement}</div>
        </div>
        {gs!==null&&(
          <div style={{textAlign:"right",flexShrink:0,marginLeft:12}}>
            <div style={{fontFamily:"'DM Serif Display',serif",fontSize:24,color:"#2D0A3E",lineHeight:1}}>{gs}<span style={{fontSize:12,color:"#B8A898"}}>/10</span></div>
            <div style={{marginTop:4,fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,background:sBg(gs),color:sTxt(gs)}}>{sLabel(gs)}</div>
          </div>
        )}
      </div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontSize:11,color:"#B8A898"}}>{client.sessions.length===0?"Aucune séance":`${client.sessions.length} séance${client.sessions.length>1?"s":""}${days!==null?` · il y a ${days}j`:""}`}</div>
        {last&&<div style={{display:"flex",gap:4}}>{PILLIERS.map(p=><div key={p.id} style={{width:7,height:7,borderRadius:"50%",background:sColor(last.scores[p.id])}} title={`${p.label}: ${last.scores[p.id]}`}/>)}</div>}
      </div>
    </div>
  );
}

function NewClientForm({onSave,onCancel}) {
  const [f,setF]=useState({nom:"",entreprise:"",secteur:"",typeAccompagnement:TYPES[1],dateDebut:new Date().toLocaleDateString("fr-FR")});
  const sf=(k,v)=>setF(x=>({...x,[k]:v}));
  return (
    <div>
      <div className="czs-serif" style={{fontSize:26,color:"#2D0A3E",marginBottom:20,fontStyle:"italic"}}>Nouveau client</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
        <div><div style={{fontSize:10,fontWeight:700,letterSpacing:".12em",color:"#B8A898",marginBottom:7,textTransform:"uppercase"}}>Dirigeant</div><input className="czs-inp" value={f.nom} onChange={e=>sf("nom",e.target.value)} placeholder="Prénom Nom"/></div>
        <div><div style={{fontSize:10,fontWeight:700,letterSpacing:".12em",color:"#B8A898",marginBottom:7,textTransform:"uppercase"}}>Entreprise</div><input className="czs-inp" value={f.entreprise} onChange={e=>sf("entreprise",e.target.value)} placeholder="Nom"/></div>
        <div><div style={{fontSize:10,fontWeight:700,letterSpacing:".12em",color:"#B8A898",marginBottom:7,textTransform:"uppercase"}}>Secteur</div><select className="czs-sel" value={f.secteur} onChange={e=>sf("secteur",e.target.value)}><option value="">Sélectionner…</option>{SECTEURS.map(s=><option key={s}>{s}</option>)}</select></div>
        <div><div style={{fontSize:10,fontWeight:700,letterSpacing:".12em",color:"#B8A898",marginBottom:7,textTransform:"uppercase"}}>Accompagnement</div><select className="czs-sel" value={f.typeAccompagnement} onChange={e=>sf("typeAccompagnement",e.target.value)}>{TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
        <div><div style={{fontSize:10,fontWeight:700,letterSpacing:".12em",color:"#B8A898",marginBottom:7,textTransform:"uppercase"}}>Date de début</div><input className="czs-inp" value={f.dateDebut} onChange={e=>sf("dateDebut",e.target.value)} placeholder="jj/mm/aaaa"/></div>
      </div>
      <div style={{display:"flex",gap:10}}>
        <button className="czs-btn" onClick={()=>{if(f.nom.trim())onSave({...f,id:Date.now().toString(),sessions:[]});}}>→ Créer le client</button>
        <button className="czs-btn-sm" onClick={onCancel}>Annuler</button>
      </div>
    </div>
  );
}

function NewSessionForm({client,onSave,onCancel}) {
  const prev=client.sessions[client.sessions.length-1];
  const [scores,setScores]=useState(prev?{...prev.scores}:EMPTY_SCORES());
  const [notes,setNotes]=useState("");
  const [date,setDate]=useState(new Date().toLocaleDateString("fr-FR"));
  const [loading,setLoading]=useState(false);
  const [analysis,setAnalysis]=useState(null);
  const [err,setErr]=useState("");
  const setScore=(id,v)=>setScores(s=>({...s,[id]:Number(v)}));
  const analyze=async()=>{
    setErr(""); setLoading(true);
    try {
      const scoreStr=PILLIERS.map(p=>`${p.label}: ${scores[p.id]}/10`).join(", ");
      const prevStr=prev?PILLIERS.map(p=>`${p.label}: ${prev.scores[p.id]}/10`).join(", "):"Première séance";
      const r=await callAPI(SEANCE_SYS,`Client : ${client.nom} — ${client.entreprise} (${client.secteur})\nSéance du : ${date}\nScores : ${scoreStr}\nPrécédents : ${prevStr}\nNotes : ${notes||"Aucune"}`);
      setAnalysis(r);
    } catch(e){setErr("Erreur. Réessaie.");}
    finally{setLoading(false);}
  };

  const saveWithSync = async (sessionData) => {
    // Sync vers Supabase
    await syncToSupabase('seances', {
      client_nom: `${client.nom}${client.entreprise ? ` — ${client.entreprise}` : ''}`,
      numero_seance: client.sessions.length + 1,
      date_seance: new Date().toISOString().slice(0, 10),
      score_cash:        scores.cash        || 0,
      score_strategie:   scores.strategie   || 0,
      score_clients:     scores.clients     || 0,
      score_equipe:      scores.equipe      || 0,
      score_risques:     scores.risques     || 0,
      score_croissance:  scores.croissance  || 0,
      score_resilience:  scores.resilience  || 0,
      points_forts:      sessionData.analysis?.motEncouragement || '',
      points_vigilance:  (sessionData.analysis?.alertes || []).join(', '),
      actions_prioritaires: (sessionData.analysis?.actions || []).join(' | '),
      notes: notes || '',
    }, 'suivi');
    onSave(sessionData);
  };

  return (
    <div>
      <div className="czs-serif" style={{fontSize:24,color:"#2D0A3E",marginBottom:4,fontStyle:"italic"}}>Nouvelle séance</div>
      <div style={{fontSize:13,color:"#7C6A8E",marginBottom:20}}>{client.nom} · {client.entreprise}</div>
      <div style={{marginBottom:16}}>
        <div style={{fontSize:10,fontWeight:700,letterSpacing:".12em",color:"#B8A898",marginBottom:7,textTransform:"uppercase"}}>Date</div>
        <input className="czs-inp" value={date} onChange={e=>setDate(e.target.value)} style={{maxWidth:180}}/>
      </div>
      <div style={{marginBottom:16}}>
        <div style={{fontSize:10,fontWeight:700,letterSpacing:".12em",color:"#B8A898",marginBottom:10,textTransform:"uppercase"}}>Scores 7 piliers</div>
        {PILLIERS.map(p=>(
          <div key={p.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",borderRadius:12,border:"1px solid rgba(45,10,62,.08)",background:"#FAFAF8",marginBottom:6}}>
            <span style={{fontSize:15,flexShrink:0}}>{p.icon}</span>
            <span style={{width:82,fontSize:13,fontWeight:600,flexShrink:0}}>{p.label}</span>
            <input type="range" min="1" max="10" value={scores[p.id]} onChange={e=>setScore(p.id,e.target.value)} style={{flex:1,accentColor:"#F5A623",cursor:"pointer"}}/>
            <span style={{width:28,textAlign:"center",fontSize:14,fontWeight:700,color:sColor(scores[p.id])}}>{scores[p.id]}</span>
            {prev&&<span style={{width:20,fontSize:12,fontWeight:600,color:trendColor(scores[p.id],prev.scores[p.id]),textAlign:"center"}}>{trendIcon(scores[p.id],prev.scores[p.id])||"—"}</span>}
          </div>
        ))}
      </div>
      <div style={{marginBottom:18}}>
        <div style={{fontSize:10,fontWeight:700,letterSpacing:".12em",color:"#B8A898",marginBottom:7,textTransform:"uppercase"}}>Notes <span style={{fontWeight:400,opacity:.6}}>(optionnel)</span></div>
        <textarea className="czs-inp" value={notes} onChange={e=>setNotes(e.target.value)} rows={3} placeholder="Points discutés, décisions prises…" style={{resize:"vertical",lineHeight:1.6}}/>
      </div>
      {err&&<div style={{fontSize:13,color:"#991B1B",marginBottom:12,padding:"9px 13px",background:"#FEE2E2",borderRadius:10}}>⚠️ {err}</div>}
      {!analysis?(
        loading?<div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 0"}}><div style={{width:14,height:14,border:"2px solid #F5A623",borderTopColor:"transparent",borderRadius:"50%",animation:"czsSpin .8s linear infinite"}}/><span style={{fontSize:13,color:"#7C6A8E"}}>Analyse IA en cours…</span></div>:
        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
          <button className="czs-btn" onClick={analyze}>✦ Analyser avec l'IA</button>
          <button className="czs-btn-sm" onClick={()=>saveWithSync({id:Date.now().toString(),date,notes,scores,analysis:null})}>Enregistrer sans analyse</button>
          <button className="czs-btn-sm" onClick={onCancel}>Annuler</button>
        </div>
      ):(
        <div>
          <div style={{padding:"16px 18px",borderRadius:14,border:"1.5px solid rgba(245,166,35,.3)",background:"#FFFBF0",marginBottom:10}}>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:".12em",color:"#F5A623",marginBottom:6,textTransform:"uppercase"}}>Bilan IA</div>
            <p style={{margin:"0 0 6px",fontSize:13,color:"#2D1B4E",lineHeight:1.7}}>{analysis.bilan}</p>
            {analysis.progres&&<p style={{margin:0,fontSize:12,color:"#7C6A8E",fontStyle:"italic"}}>{analysis.progres}</p>}
          </div>
          {(analysis.alertes||[]).map((a,i)=><div key={i} style={{fontSize:12,color:"#991B1B",padding:"7px 12px",borderRadius:10,border:"1px solid #FCA5A5",background:"#FFF5F5",marginBottom:6,display:"flex",gap:8}}><span>⚠️</span><span>{a}</span></div>)}
          {(analysis.actions||[]).length>0&&<div style={{padding:"12px 14px",borderRadius:12,border:"1px solid rgba(45,10,62,.08)",background:"#FAFAF8",marginBottom:10}}>{analysis.actions.map((a,i)=><div key={i} style={{fontSize:13,marginBottom:5,display:"flex",gap:8}}><span style={{color:"#F5A623",fontWeight:700}}>→</span><span>{a}</span></div>)}</div>}
          {analysis.motEncouragement&&<div style={{fontSize:13,color:"#065F46",padding:"8px 12px",borderRadius:10,border:"1px solid #6EE7B7",background:"#ECFDF5",marginBottom:14}}>💬 {analysis.motEncouragement}</div>}
          <div style={{display:"flex",gap:10}}>
            <button className="czs-btn" onClick={()=>saveWithSync({id:Date.now().toString(),date,notes,scores,analysis})}>✓ Enregistrer la séance</button>
            <button className="czs-btn-sm" onClick={onCancel}>Annuler</button>
          </div>
        </div>
      )}
    </div>
  );
}

function CheckIn({client}) {
  const [loading,setLoading]=useState(false);
  const [result,setResult]=useState(null);
  const [err,setErr]=useState("");
  const prepare=async()=>{
    setErr(""); setLoading(true);
    try {
      const history=client.sessions.slice(-3).map((s,i)=>`Séance ${i+1} (${s.date}) : ${PILLIERS.map(p=>`${p.label}=${s.scores[p.id]}`).join(", ")}. Notes: ${s.notes||"aucune"}.`).join("\n");
      const r=await callAPI(CHECKIN_SYS,`Client : ${client.nom} — ${client.entreprise}\nType : ${client.typeAccompagnement}\nSéances : ${client.sessions.length}\nHistorique :\n${history||"Pas encore de séance"}`);
      setResult(r);
      // SYNC SUPABASE — log événement check-in
      await syncToSupabase('evenements', {
        agent: 'suivi',
        type_event: 'generation',
        description: `Check-in préparé pour ${client.nom}`,
        reference_type: 'clients',
        metadata: { client: client.nom, secteur: client.secteur, nb_seances: client.sessions.length },
      }, 'suivi');
    } catch(e){setErr("Erreur. Réessaie.");}
    finally{setLoading(false);}
  };
  if(loading) return <div style={{display:"flex",alignItems:"center",gap:10,padding:"20px 0"}}><div style={{width:16,height:16,border:"2px solid #F5A623",borderTopColor:"transparent",borderRadius:"50%",animation:"czsSpin .8s linear infinite"}}/><span style={{fontSize:13,color:"#7C6A8E"}}>Préparation du rendez-vous…</span></div>;
  if(result) return (
    <div>
      <div style={{fontSize:14,fontWeight:600,color:"#2D0A3E",marginBottom:16}}>Ordre du jour · {result.dureeEstimee}</div>
      <div style={{marginBottom:14}}><div style={{fontSize:10,fontWeight:700,letterSpacing:".12em",color:"#B8A898",marginBottom:8,textTransform:"uppercase"}}>Agenda</div>{(result.agenda||[]).map((a,i)=><div key={i} style={{fontSize:13,padding:"9px 13px",borderRadius:10,border:"1px solid rgba(45,10,62,.08)",marginBottom:5,display:"flex",gap:10}}><span style={{color:"#F5A623",fontWeight:700,flexShrink:0}}>{i+1}.</span><span>{a}</span></div>)}</div>
      {(result.pointsCritiques||[]).length>0&&<div style={{marginBottom:14}}><div style={{fontSize:10,fontWeight:700,letterSpacing:".12em",color:"#B8A898",marginBottom:8,textTransform:"uppercase"}}>Points critiques</div>{result.pointsCritiques.map((p,i)=><div key={i} style={{fontSize:13,padding:"7px 12px",borderRadius:10,border:"1px solid #FCA5A5",background:"#FFF5F5",marginBottom:5,display:"flex",gap:8}}><span>⚠️</span><span>{p}</span></div>)}</div>}
      <div style={{marginBottom:14}}><div style={{fontSize:10,fontWeight:700,letterSpacing:".12em",color:"#B8A898",marginBottom:8,textTransform:"uppercase"}}>Questions à poser</div>{(result.questions||[]).map((q,i)=><div key={i} style={{fontSize:13,padding:"7px 12px",borderRadius:10,background:"#FAFAF8",border:"1px solid rgba(45,10,62,.08)",marginBottom:5,display:"flex",gap:10}}><span style={{color:"#F5A623",fontWeight:700}}>?</span><span>{q}</span></div>)}</div>
      {result.exercicePrep&&<div style={{padding:"12px 15px",borderRadius:12,border:"1px solid #6EE7B7",background:"#ECFDF5"}}><div style={{fontSize:10,fontWeight:700,letterSpacing:".12em",color:"#065F46",marginBottom:5,textTransform:"uppercase"}}>Exercice préparatoire</div><div style={{fontSize:13,color:"#065F46"}}>{result.exercicePrep}</div></div>}
      <button className="czs-btn-sm" onClick={()=>setResult(null)} style={{marginTop:14}}>← Regénérer</button>
    </div>
  );
  return (
    <div style={{textAlign:"center",padding:"32px 0"}}>
      <div style={{fontSize:36,marginBottom:12}}>📅</div>
      <div className="czs-serif" style={{fontSize:22,color:"#2D0A3E",marginBottom:8,fontStyle:"italic"}}>Préparer le prochain RDV</div>
      <div style={{fontSize:13,color:"#7C6A8E",marginBottom:22,maxWidth:340,margin:"0 auto 22px"}}>L'agent analyse l'historique de {client.nom} et génère l'ordre du jour automatiquement.</div>
      {err&&<div style={{fontSize:13,color:"#991B1B",marginBottom:12,padding:"9px 13px",background:"#FEE2E2",borderRadius:10}}>⚠️ {err}</div>}
      <button className="czs-btn" onClick={prepare}>→ Préparer la séance</button>
    </div>
  );
}

function Dashboard({client,onBack,onNewSession}) {
  const [tab,setTab]=useState("dashboard");
  const last=client.sessions[client.sessions.length-1];
  const prev=client.sessions[client.sessions.length-2];
  const TABS=[{id:"dashboard",label:"Tableau de bord"},{id:"seances",label:`Séances (${client.sessions.length})`},{id:"checkin",label:"Préparer le RDV"}];
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24,paddingBottom:18,borderBottom:"1px solid rgba(45,10,62,.08)"}}>
        <div>
          <button onClick={onBack} className="czs-btn-sm" style={{marginBottom:10}}>← Tous les clients</button>
          <div className="czs-serif" style={{fontSize:26,color:"#2D0A3E",marginBottom:3,fontStyle:"italic"}}>{client.nom}</div>
          <div style={{fontSize:13,color:"#7C6A8E"}}>{client.entreprise} · {client.secteur}</div>
          <div style={{fontSize:11,color:"#B8A898",marginTop:2}}>{client.typeAccompagnement} · depuis {client.dateDebut}</div>
        </div>
        <div style={{textAlign:"right",flexShrink:0,marginLeft:16}}>
          {last?(
            <>
              <div style={{fontFamily:"'DM Serif Display',serif",fontSize:36,color:"#2D0A3E",lineHeight:1}}>{gScore(last.scores)}<span style={{fontSize:14,color:"#B8A898"}}>/10</span></div>
              <div style={{marginTop:6,display:"inline-block",padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:700,background:sBg(gScore(last.scores)),color:sTxt(gScore(last.scores))}}>{sLabel(gScore(last.scores))}</div>
            </>
          ):<div style={{fontSize:12,color:"#B8A898"}}>Pas encore de séance</div>}
          <div style={{marginTop:10}}><button className="czs-btn-rose" onClick={onNewSession}>+ Nouvelle séance</button></div>
        </div>
      </div>
      <div style={{display:"flex",gap:6,marginBottom:22}}>
        {TABS.map(t=><button key={t.id} onClick={()=>setTab(t.id)} className={`czs-tab${tab===t.id?" sel":""}`}>{t.label}</button>)}
      </div>
      {tab==="dashboard"&&(
        <div>
          {!last?<div style={{textAlign:"center",padding:"32px 0"}}><div style={{fontSize:36,marginBottom:8}}>📊</div><div className="czs-serif" style={{fontSize:20,color:"#2D0A3E",fontStyle:"italic",marginBottom:14}}>Pas encore de séance</div><button className="czs-btn" onClick={onNewSession}>+ Ajouter la première séance</button></div>:(
            <>
              <div style={{fontSize:10,fontWeight:700,letterSpacing:".12em",color:"#B8A898",marginBottom:12,textTransform:"uppercase"}}>7 Piliers · Séance du {last.date}</div>
              <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:18}}>
                {PILLIERS.map(p=>(
                  <div key={p.id} className="czs-card" style={{display:"flex",alignItems:"center",gap:12,padding:"11px 16px"}}>
                    <div style={{width:10,height:10,borderRadius:"50%",background:sColor(last.scores[p.id]),flexShrink:0}}/>
                    <span style={{fontSize:16,flexShrink:0}}>{p.icon}</span>
                    <span style={{width:86,fontSize:13,fontWeight:600,flexShrink:0}}>{p.label}</span>
                    <ScoreBar score={last.scores[p.id]} prev={prev?.scores[p.id]}/>
                    <div style={{flexShrink:0,padding:"2px 9px",borderRadius:20,fontSize:10,fontWeight:700,background:sBg(last.scores[p.id]),color:sTxt(last.scores[p.id])}}>{sLabel(last.scores[p.id])}</div>
                  </div>
                ))}
              </div>
              {last.analysis?.alertes?.length>0&&<div style={{marginBottom:14}}>{last.analysis.alertes.map((a,i)=><div key={i} style={{fontSize:13,padding:"8px 13px",borderRadius:10,border:"1px solid #FCA5A5",background:"#FFF5F5",marginBottom:5,display:"flex",gap:8}}><span>⚠️</span><span>{a}</span></div>)}</div>}
              {last.analysis?.actions?.length>0&&<div style={{padding:"14px 16px",borderRadius:14,border:"1px solid rgba(45,10,62,.08)",background:"#FAFAF8"}}><div style={{fontSize:10,fontWeight:700,letterSpacing:".12em",color:"#B8A898",marginBottom:8,textTransform:"uppercase"}}>Actions en cours</div>{last.analysis.actions.map((a,i)=><div key={i} style={{fontSize:13,marginBottom:5,display:"flex",gap:8}}><span style={{color:"#F5A623",fontWeight:700}}>→</span><span>{a}</span></div>)}</div>}
            </>
          )}
        </div>
      )}
      {tab==="seances"&&(
        <div>
          {client.sessions.length===0?<div style={{textAlign:"center",padding:"32px 0",color:"#7C6A8E",fontSize:14}}>Aucune séance.</div>:
          [...client.sessions].reverse().map((s,i)=>(
            <div key={s.id} className="czs-card" style={{padding:"16px 20px",marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <span style={{fontSize:14,fontWeight:600,color:"#2D0A3E"}}>Séance du {s.date}</span>
                <div style={{display:"flex",gap:4}}>{PILLIERS.map(p=><div key={p.id} style={{width:7,height:7,borderRadius:"50%",background:sColor(s.scores[p.id])}} title={`${p.label}: ${s.scores[p.id]}`}/>)}</div>
              </div>
              {s.notes&&<p style={{margin:"0 0 6px",fontSize:12,color:"#7C6A8E",fontStyle:"italic",lineHeight:1.6}}>{s.notes}</p>}
              {s.analysis?.bilan&&<p style={{margin:0,fontSize:13,color:"#2D1B4E",lineHeight:1.65}}>{s.analysis.bilan}</p>}
            </div>
          ))}
        </div>
      )}
      {tab==="checkin"&&<CheckIn client={client}/>}
    </div>
  );
}

// ── APP PRINCIPALE ───────────────────────────────────────────────
export default function AgentSuivi() {
  const [clients,setClients]=useState([]);
  const [ready,setReady]=useState(false);
  const [view,setView]=useState("list");
  const [selected,setSelected]=useState(null);

  useEffect(()=>{ injectStyles(); store.get(KEY).then(d=>{if(d&&Array.isArray(d))setClients(d);setReady(true);}); },[]);

  const persist=useCallback(async newClients=>{setClients(newClients);await store.set(KEY,newClients);},[]);
  const addClient=async c=>{const nc=[...clients,c];await persist(nc);setSelected(c);setView("dashboard");};
  const addSession=async s=>{const nc=clients.map(c=>c.id===selected.id?{...c,sessions:[...c.sessions,s]}:c);await persist(nc);setSelected(nc.find(c=>c.id===selected.id));setView("dashboard");};

  if(!ready) return <div className="czs" style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh"}}><div style={{width:20,height:20,border:"2px solid #F5A623",borderTopColor:"transparent",borderRadius:"50%",animation:"czsSpin .8s linear infinite"}}/></div>;

  const Nav = () => (
    <div style={{background:"#FFF8E8",borderBottom:"2px solid #F5A623",padding:"0 24px",position:"sticky",top:0,zIndex:100}}>
      <div style={{maxWidth:720,margin:"0 auto",height:58,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <Logo height={32}/>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:11,fontWeight:700,letterSpacing:".1em",color:"rgba(245,166,35,.6)",textTransform:"uppercase"}}>Suivi Client</span>
          <span style={{width:1,height:14,background:"rgba(45,10,62,.12)"}}/>
          <span style={{fontSize:11,color:"#B8A898"}}>{clients.length} client{clients.length>1?"s":""}</span>
          {view!=="new-client"&&<button className="czs-btn-rose" onClick={()=>setView("new-client")}>+ Nouveau client</button>}
        </div>
      </div>
    </div>
  );

  return (
    <div className="czs">
      <Nav/>
      {view==="list"&&clients.length===0&&(
        <div style={{background:"linear-gradient(135deg,#2D0A3E 0%,#1A0652 100%)",padding:"52px 24px 60px"}}>
          <div style={{maxWidth:720,margin:"0 auto"}}>
            <div className="czs-up" style={{fontSize:11,fontWeight:700,letterSpacing:".16em",color:"rgba(245,166,35,.55)",textTransform:"uppercase",marginBottom:12}}>Agent Suivi Client</div>
            <div style={{fontFamily:"'DM Serif Display',serif",fontSize:38,color:"#F0E8FC",lineHeight:1.15,marginBottom:12}}>Suivre vos clients<br/><span style={{fontStyle:"italic",color:"rgba(245,166,35,.75)"}}>sur les 7 piliers</span></div>
            <div style={{fontSize:14,color:"rgba(240,232,252,.5)",maxWidth:420,lineHeight:1.75}}>Enregistrez chaque séance, suivez l'évolution des scores et préparez vos rendez-vous automatiquement.</div>
          </div>
        </div>
      )}
      <div style={{maxWidth:720,margin:view==="list"&&clients.length===0?"-26px auto 0":"0 auto",padding:"0 20px 56px",position:"relative",zIndex:1}}>
        <div className="czs-card" style={{padding:"28px 28px 32px",marginTop:view==="list"&&clients.length===0?0:24}}>
          {view==="list"&&(
            <div>
              {clients.length>0&&<div className="czs-serif" style={{fontSize:24,color:"#2D0A3E",marginBottom:20,fontStyle:"italic"}}>Mes clients</div>}
              {clients.length===0?(
                <div style={{textAlign:"center",padding:"20px 0"}}>
                  <div style={{fontSize:13,color:"#7C6A8E",marginBottom:18}}>Ajoute ton premier client pour commencer le suivi.</div>
                  <button className="czs-btn" onClick={()=>setView("new-client")}>+ Ajouter un client</button>
                </div>
              ):(
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:12}}>
                  {clients.map(c=><ClientCard key={c.id} client={c} onSelect={()=>{setSelected(c);setView("dashboard");}}/>)}
                </div>
              )}
            </div>
          )}
          {view==="new-client"&&<NewClientForm onSave={addClient} onCancel={()=>setView("list")}/>}
          {view==="dashboard"&&selected&&<Dashboard client={clients.find(c=>c.id===selected.id)||selected} onBack={()=>setView("list")} onNewSession={()=>setView("new-session")}/>}
          {view==="new-session"&&selected&&<NewSessionForm client={clients.find(c=>c.id===selected.id)||selected} onSave={addSession} onCancel={()=>setView("dashboard")}/>}
        </div>
      </div>
    </div>
  );
}
