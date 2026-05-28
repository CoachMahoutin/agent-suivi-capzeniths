import { useState, useEffect, useCallback } from "react";

// ─── STORAGE ────────────────────────────────────────────────────
const inMem = {};
const store = {
  async get(k) {
    try {
      if (typeof window !== "undefined" && window.storage) {
        const r = await window.storage.get(k);
        return r?.value ? JSON.parse(r.value) : null;
      }
    } catch {}
    return inMem[k] ?? null;
  },
  async set(k, v) {
    try {
      if (typeof window !== "undefined" && window.storage) {
        await window.storage.set(k, JSON.stringify(v));
      }
    } catch {}
    inMem[k] = v;
  },
};
const STORAGE_KEY = "cz-suivi-v1";

// ─── CONSTANTS ──────────────────────────────────────────────────
const V = "#5B2C91", R = "#E91E8C", G = "#1D9E75";
const PILLIERS = [
  { id:"cash",       label:"Cash",        icon:"💰" },
  { id:"strategie",  label:"Stratégie",   icon:"🎯" },
  { id:"clients",    label:"Clients",     icon:"🤝" },
  { id:"equipe",     label:"Équipe",      icon:"👥" },
  { id:"risques",    label:"Risques",     icon:"⚠️" },
  { id:"croissance", label:"Croissance",  icon:"📈" },
  { id:"resilience", label:"Résilience",  icon:"🛡️" },
];
const SECTEURS = ["Commerce","Restauration","BTP","Services B2B","Conseil / Formation","Santé","Tech","Transport","Autre"];
const TYPES_ACCO = ["Diagnostic seul","Accompagnement 1 mois","Accompagnement 3 mois","Accompagnement 6 mois"];
const EMPTY_SCORES = () => Object.fromEntries(PILLIERS.map(p => [p.id, 5]));

const scoreColor = s => s <= 3 ? "#EF4444" : s <= 6 ? "#F59E0B" : "#10B981";
const scoreBg    = s => s <= 3 ? "#FEE2E2" : s <= 6 ? "#FEF3C7" : "#D1FAE5";
const scoreTxt   = s => s <= 3 ? "#991B1B" : s <= 6 ? "#92400E" : "#065F46";
const scoreLabel = s => s <= 3 ? "CRITIQUE" : s <= 6 ? "VIGILANCE" : "SOLIDE";

const globalScore = scores => Math.round(Object.values(scores).reduce((a,b)=>a+b,0) / 7 * 10) / 10;

const trend = (curr, prev) => {
  if (!prev) return null;
  const d = curr - prev;
  return d > 0 ? "↑" : d < 0 ? "↓" : "→";
};
const trendColor = (curr, prev) => {
  if (!prev) return "var(--color-text-tertiary)";
  const d = curr - prev;
  return d > 0 ? G : d < 0 ? "#EF4444" : "var(--color-text-tertiary)";
};

// ─── API ────────────────────────────────────────────────────────
const callAPI = async (system, content) => {
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system,
      messages: [{ role: "user", content }],
    }),
  });
  const data = await res.json();
  const raw = data.content?.[0]?.text || "";
  return JSON.parse(raw.replace(/```json|```/g, "").trim());
};

const SEANCE_SYS = `Tu es l'Agent Suivi de CapZéniths, spécialiste prévention défaillance business. Tu analyses une séance d'accompagnement client. Style direct, bienveillant, factuel. RÉPONDS EN JSON VALIDE sans backticks.
{"bilan":"<2-3 phrases sur l'état global du client>","progres":"<comparaison vs séance précédente si dispo, sinon état initial>","alertes":["<pilier en zone rouge + raison précise>"],"actions":["<action concrète 1>","<action 2>","<action 3>"],"motEncouragement":"<1 phrase de motivation personnalisée pour ce dirigeant>"}`;

const CHECKIN_SYS = `Tu es l'Agent Suivi de CapZéniths. Tu prépares l'ordre du jour d'une séance d'accompagnement à partir de l'historique client. RÉPONDS EN JSON VALIDE sans backticks.
{"agenda":["<point 1 à traiter>","<point 2>","<point 3>"],"pointsCritiques":["<sujet urgent à aborder en priorité>"],"questions":["<question ouverte 1>","<question 2>","<question 3>"],"exercicePrep":"<travail ou réflexion à proposer au client avant la séance>","dureeEstimee":"60 min"}`;

// ─── SHARED UI ──────────────────────────────────────────────────
const Label = ({ ch, opt }) => (
  <div style={{ fontSize:10, fontWeight:500, letterSpacing:"0.08em", color:"var(--color-text-secondary)", marginBottom:7, display:"flex", gap:6 }}>
    {ch}{opt && <span style={{ opacity:.6, fontWeight:400 }}>(optionnel)</span>}
  </div>
);

const Inp = ({ value, onChange, placeholder, type="text", style={} }) => (
  <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
    style={{ fontSize:13, padding:"9px 12px", borderRadius:"var(--border-radius-md)", border:"0.5px solid var(--color-border-secondary)", width:"100%", boxSizing:"border-box", background:"var(--color-background-primary)", color:"var(--color-text-primary)", ...style }} />
);

const Spinner = ({ msg }) => (
  <div style={{ display:"flex", alignItems:"center", gap:10, padding:"16px 0" }}>
    <div style={{ width:16, height:16, border:`2px solid ${V}`, borderTopColor:"transparent", borderRadius:"50%", animation:"spin .8s linear infinite" }} />
    <span style={{ fontSize:13, color:"var(--color-text-secondary)" }}>{msg}</span>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>
);

const ScoreBar = ({ score, prev }) => (
  <div style={{ display:"flex", alignItems:"center", gap:8, flex:1 }}>
    <div style={{ flex:1, height:6, background:"var(--color-border-tertiary)", borderRadius:3, overflow:"hidden" }}>
      <div style={{ width:`${score*10}%`, height:"100%", borderRadius:3, background:scoreColor(score), transition:"width .6s ease" }} />
    </div>
    <span style={{ fontSize:14, fontWeight:500, color:"var(--color-text-primary)", minWidth:20, textAlign:"right" }}>{score}</span>
    {prev !== undefined && (
      <span style={{ fontSize:13, fontWeight:500, color:trendColor(score, prev), minWidth:16 }}>
        {trend(score, prev) || "—"}
      </span>
    )}
  </div>
);

// ─── COMPONENTS ─────────────────────────────────────────────────

function ClientCard({ client, onSelect }) {
  const last = client.sessions[client.sessions.length - 1];
  const gs = last ? globalScore(last.scores) : null;
  const daysSince = last ? Math.floor((Date.now() - new Date(last.date)) / 86400000) : null;

  return (
    <div onClick={onSelect} style={{ padding:"16px", borderRadius:"var(--border-radius-lg)", border:"0.5px solid var(--color-border-secondary)", background:"var(--color-background-primary)", cursor:"pointer", transition:"border-color .15s, box-shadow .15s" }}
      onMouseOver={e => { e.currentTarget.style.borderColor=V; e.currentTarget.style.boxShadow=`0 2px 8px rgba(91,44,145,.1)`; }}
      onMouseOut={e => { e.currentTarget.style.borderColor="var(--color-border-secondary)"; e.currentTarget.style.boxShadow="none"; }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
        <div>
          <div style={{ fontSize:14, fontWeight:500, color:"var(--color-text-primary)", marginBottom:2 }}>{client.nom}</div>
          <div style={{ fontSize:12, color:"var(--color-text-secondary)" }}>{client.entreprise}</div>
          <div style={{ fontSize:11, color:"var(--color-text-tertiary)", marginTop:2 }}>{client.secteur} · {client.typeAccompagnement}</div>
        </div>
        {gs !== null && (
          <div style={{ textAlign:"right", flexShrink:0, marginLeft:12 }}>
            <div style={{ fontSize:22, fontWeight:300, color:"var(--color-text-primary)", lineHeight:1 }}>{gs}<span style={{ fontSize:11, color:"var(--color-text-tertiary)" }}>/10</span></div>
            <div style={{ fontSize:10, marginTop:3, padding:"2px 7px", borderRadius:20, background:scoreBg(gs), color:scoreTxt(gs), fontWeight:500 }}>{scoreLabel(gs)}</div>
          </div>
        )}
      </div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ fontSize:11, color:"var(--color-text-tertiary)" }}>
          {client.sessions.length === 0 ? "Aucune séance" : `${client.sessions.length} séance${client.sessions.length > 1 ? "s" : ""}`}
          {daysSince !== null && ` · il y a ${daysSince}j`}
        </div>
        <div style={{ fontSize:11, color:V }}>Voir →</div>
      </div>
      {last && (
        <div style={{ display:"flex", gap:4, marginTop:8, flexWrap:"wrap" }}>
          {PILLIERS.map(p => (
            <div key={p.id} style={{ width:8, height:8, borderRadius:"50%", background:scoreColor(last.scores[p.id]) }} title={`${p.label}: ${last.scores[p.id]}`} />
          ))}
        </div>
      )}
    </div>
  );
}

function NewClientForm({ onSave, onCancel }) {
  const [f, setF] = useState({ nom:"", entreprise:"", secteur:"", typeAccompagnement:TYPES_ACCO[1], dateDebut:new Date().toLocaleDateString("fr-FR") });
  const sf = (k, v) => setF(x => ({ ...x, [k]: v }));
  const save = () => {
    if (!f.nom.trim()) return;
    onSave({ ...f, id: Date.now().toString(), sessions: [] });
  };
  return (
    <div>
      <div style={{ fontSize:10, fontWeight:500, letterSpacing:"0.09em", color:"var(--color-text-secondary)", marginBottom:4 }}>NOUVEAU CLIENT</div>
      <div style={{ fontSize:17, fontWeight:500, marginBottom:20 }}>Ajouter un client</div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
        <div><Label ch="NOM DU DIRIGEANT" /><Inp value={f.nom} onChange={v=>sf("nom",v)} placeholder="Prénom Nom"/></div>
        <div><Label ch="ENTREPRISE" /><Inp value={f.entreprise} onChange={v=>sf("entreprise",v)} placeholder="Nom de l'entreprise"/></div>
        <div>
          <Label ch="SECTEUR" />
          <select value={f.secteur} onChange={e=>sf("secteur",e.target.value)} style={{ fontSize:13, padding:"9px 12px", borderRadius:"var(--border-radius-md)", border:"0.5px solid var(--color-border-secondary)", width:"100%", background:"var(--color-background-primary)", color:"var(--color-text-primary)" }}>
            <option value="">Sélectionner…</option>
            {SECTEURS.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <Label ch="TYPE D'ACCOMPAGNEMENT" />
          <select value={f.typeAccompagnement} onChange={e=>sf("typeAccompagnement",e.target.value)} style={{ fontSize:13, padding:"9px 12px", borderRadius:"var(--border-radius-md)", border:"0.5px solid var(--color-border-secondary)", width:"100%", background:"var(--color-background-primary)", color:"var(--color-text-primary)" }}>
            {TYPES_ACCO.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div><Label ch="DATE DE DÉBUT" /><Inp value={f.dateDebut} onChange={v=>sf("dateDebut",v)} placeholder="jj/mm/aaaa"/></div>
      </div>
      <div style={{ display:"flex", gap:10 }}>
        <button onClick={save} style={{ fontSize:13, fontWeight:500, padding:"10px 20px", cursor:"pointer", background:V, color:"#fff", border:"none", borderRadius:"var(--border-radius-md)" }}>→ Créer le client</button>
        <button onClick={onCancel} style={{ fontSize:13, padding:"10px 16px", cursor:"pointer", border:"0.5px solid var(--color-border-secondary)", background:"transparent", color:"var(--color-text-secondary)", borderRadius:"var(--border-radius-md)" }}>Annuler</button>
      </div>
    </div>
  );
}

function NewSessionForm({ client, onSave, onCancel }) {
  const prev = client.sessions[client.sessions.length - 1];
  const [scores, setScores] = useState(prev ? { ...prev.scores } : EMPTY_SCORES());
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(new Date().toLocaleDateString("fr-FR"));
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [err, setErr] = useState("");

  const setScore = (id, v) => setScores(s => ({ ...s, [id]: Number(v) }));

  const analyze = async () => {
    setErr(""); setLoading(true);
    try {
      const scoreStr = PILLIERS.map(p => `${p.label}: ${scores[p.id]}/10`).join(", ");
      const prevStr = prev ? PILLIERS.map(p => `${p.label}: ${prev.scores[p.id]}/10`).join(", ") : "Première séance";
      const r = await callAPI(SEANCE_SYS,
        `Client : ${client.nom} — ${client.entreprise} (${client.secteur})
Séance du : ${date}
Scores actuels : ${scoreStr}
Scores précédents : ${prevStr}
Notes de séance : ${notes || "Aucune note"}`);
      setAnalysis(r);
    } catch(e) { setErr("Erreur d'analyse. Réessaie."); }
    finally { setLoading(false); }
  };

  const save = () => {
    onSave({ id: Date.now().toString(), date, notes, scores, analysis });
  };

  return (
    <div>
      <div style={{ fontSize:10, fontWeight:500, letterSpacing:"0.09em", color:"var(--color-text-secondary)", marginBottom:4 }}>NOUVELLE SÉANCE</div>
      <div style={{ fontSize:17, fontWeight:500, marginBottom:4 }}>{client.nom}</div>
      <div style={{ fontSize:12, color:"var(--color-text-secondary)", marginBottom:20 }}>{client.entreprise} · {client.secteur}</div>

      <div style={{ marginBottom:16 }}>
        <Label ch="DATE DE LA SÉANCE" />
        <Inp value={date} onChange={setDate} placeholder="jj/mm/aaaa" style={{ maxWidth:180 }} />
      </div>

      <div style={{ marginBottom:16 }}>
        <Label ch="SCORES 7 PILIERS" />
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {PILLIERS.map(p => (
            <div key={p.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 12px", borderRadius:"var(--border-radius-md)", border:"0.5px solid var(--color-border-tertiary)", background:"var(--color-background-secondary)" }}>
              <div style={{ fontSize:15, flexShrink:0 }}>{p.icon}</div>
              <div style={{ width:80, fontSize:13, fontWeight:500, flexShrink:0 }}>{p.label}</div>
              <input type="range" min="1" max="10" value={scores[p.id]} onChange={e => setScore(p.id, e.target.value)}
                style={{ flex:1, accentColor:V, cursor:"pointer" }} />
              <div style={{ width:32, textAlign:"center", fontSize:14, fontWeight:500, color:scoreColor(scores[p.id]) }}>{scores[p.id]}</div>
              {prev && <div style={{ width:24, fontSize:12, color:trendColor(scores[p.id], prev.scores[p.id]), textAlign:"center" }}>{trend(scores[p.id], prev.scores[p.id]) || "—"}</div>}
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginBottom:16 }}>
        <Label ch="NOTES DE SÉANCE" opt />
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4}
          placeholder="Points discutés, observations, décisions prises…"
          style={{ width:"100%", fontSize:13, padding:"9px 12px", resize:"vertical", boxSizing:"border-box", lineHeight:1.6, borderRadius:"var(--border-radius-md)", border:"0.5px solid var(--color-border-secondary)", background:"var(--color-background-primary)", color:"var(--color-text-primary)" }} />
      </div>

      {err && <div style={{ fontSize:13, color:"#991B1B", marginBottom:12, padding:"9px 12px", background:"#FEE2E2", borderRadius:"var(--border-radius-md)" }}>⚠️ {err}</div>}

      {!analysis ? (
        loading ? <Spinner msg="Analyse de la séance en cours…" /> :
        <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
          <button onClick={analyze} style={{ fontSize:13, fontWeight:500, padding:"10px 18px", cursor:"pointer", background:V, color:"#fff", border:"none", borderRadius:"var(--border-radius-md)" }}>✦ Analyser avec l'IA</button>
          <button onClick={save} style={{ fontSize:13, padding:"10px 14px", cursor:"pointer", border:"0.5px solid var(--color-border-secondary)", background:"transparent", color:"var(--color-text-secondary)", borderRadius:"var(--border-radius-md)" }}>Enregistrer sans analyse</button>
          <button onClick={onCancel} style={{ fontSize:13, padding:"10px 14px", cursor:"pointer", border:"0.5px solid var(--color-border-secondary)", background:"transparent", color:"var(--color-text-secondary)", borderRadius:"var(--border-radius-md)" }}>Annuler</button>
        </div>
      ) : (
        <div>
          <div style={{ padding:"14px 16px", borderRadius:"var(--border-radius-lg)", border:"0.5px solid #C4A3D4", background:"#F5EFF9", marginBottom:12 }}>
            <div style={{ fontSize:10, fontWeight:500, letterSpacing:"0.08em", color:V, marginBottom:8 }}>BILAN IA</div>
            <p style={{ margin:"0 0 8px", fontSize:13, color:"#3C1E5A", lineHeight:1.7 }}>{analysis.bilan}</p>
            {analysis.progres && <p style={{ margin:0, fontSize:12, color:"#5B2C91", fontStyle:"italic" }}>{analysis.progres}</p>}
          </div>
          {(analysis.alertes || []).length > 0 && (
            <div style={{ marginBottom:10 }}>
              {analysis.alertes.map((a, i) => (
                <div key={i} style={{ fontSize:12, color:"#991B1B", padding:"7px 12px", borderRadius:"var(--border-radius-md)", border:"0.5px solid #FCA5A5", background:"#FFF5F5", marginBottom:5, display:"flex", gap:8 }}>
                  <span>⚠️</span><span>{a}</span>
                </div>
              ))}
            </div>
          )}
          {(analysis.actions || []).length > 0 && (
            <div style={{ marginBottom:12, padding:"12px 14px", borderRadius:"var(--border-radius-md)", border:"0.5px solid var(--color-border-secondary)", background:"var(--color-background-secondary)" }}>
              <div style={{ fontSize:10, fontWeight:500, letterSpacing:"0.08em", color:"var(--color-text-secondary)", marginBottom:7 }}>ACTIONS PRIORITAIRES</div>
              {analysis.actions.map((a, i) => (
                <div key={i} style={{ fontSize:13, marginBottom:5, display:"flex", gap:8 }}><span style={{ color:V }}>→</span><span>{a}</span></div>
              ))}
            </div>
          )}
          {analysis.motEncouragement && (
            <div style={{ fontSize:13, color:G, fontStyle:"italic", marginBottom:14, padding:"8px 12px", borderRadius:"var(--border-radius-md)", border:`0.5px solid #6EE7B7`, background:"#D1FAE5" }}>
              💬 {analysis.motEncouragement}
            </div>
          )}
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={save} style={{ fontSize:13, fontWeight:500, padding:"10px 18px", cursor:"pointer", background:V, color:"#fff", border:"none", borderRadius:"var(--border-radius-md)" }}>✓ Enregistrer la séance</button>
            <button onClick={onCancel} style={{ fontSize:13, padding:"10px 14px", cursor:"pointer", border:"0.5px solid var(--color-border-secondary)", background:"transparent", color:"var(--color-text-secondary)", borderRadius:"var(--border-radius-md)" }}>Annuler</button>
          </div>
        </div>
      )}
    </div>
  );
}

function PrepareCheckin({ client }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState("");

  const prepare = async () => {
    setErr(""); setLoading(true);
    try {
      const history = client.sessions.slice(-3).map((s, i) => (
        `Séance ${i+1} (${s.date}) : ${PILLIERS.map(p => `${p.label}=${s.scores[p.id]}`).join(", ")}. Notes: ${s.notes || "aucune"}.`
      )).join("\n");
      const r = await callAPI(CHECKIN_SYS,
        `Client : ${client.nom} — ${client.entreprise} (${client.secteur})
Type : ${client.typeAccompagnement}
Nombre de séances : ${client.sessions.length}
Historique récent :
${history || "Pas encore de séance"}`);
      setResult(r);
    } catch(e) { setErr("Erreur. Réessaie."); }
    finally { setLoading(false); }
  };

  if (loading) return <Spinner msg="Préparation du prochain rendez-vous…" />;

  if (result) return (
    <div>
      <div style={{ fontSize:14, fontWeight:500, marginBottom:16 }}>Ordre du jour — prochaine séance · {result.dureeEstimee}</div>
      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize:10, fontWeight:500, letterSpacing:"0.08em", color:"var(--color-text-secondary)", marginBottom:8 }}>AGENDA</div>
        {(result.agenda || []).map((a, i) => (
          <div key={i} style={{ fontSize:13, padding:"8px 12px", borderRadius:"var(--border-radius-md)", border:"0.5px solid var(--color-border-secondary)", marginBottom:5, display:"flex", gap:10 }}>
            <span style={{ color:V, fontWeight:500, flexShrink:0 }}>{i+1}.</span><span>{a}</span>
          </div>
        ))}
      </div>
      {(result.pointsCritiques || []).length > 0 && (
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:10, fontWeight:500, letterSpacing:"0.08em", color:"var(--color-text-secondary)", marginBottom:8 }}>POINTS CRITIQUES</div>
          {result.pointsCritiques.map((p, i) => (
            <div key={i} style={{ fontSize:13, padding:"7px 12px", borderRadius:"var(--border-radius-md)", border:"0.5px solid #FCA5A5", background:"#FFF5F5", marginBottom:5, display:"flex", gap:8 }}>
              <span>⚠️</span><span>{p}</span>
            </div>
          ))}
        </div>
      )}
      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize:10, fontWeight:500, letterSpacing:"0.08em", color:"var(--color-text-secondary)", marginBottom:8 }}>QUESTIONS À POSER</div>
        {(result.questions || []).map((q, i) => (
          <div key={i} style={{ fontSize:13, padding:"7px 12px", borderRadius:"var(--border-radius-md)", background:"var(--color-background-secondary)", border:"0.5px solid var(--color-border-secondary)", marginBottom:5, display:"flex", gap:10 }}>
            <span style={{ color:V, flexShrink:0 }}>?</span><span>{q}</span>
          </div>
        ))}
      </div>
      {result.exercicePrep && (
        <div style={{ padding:"12px 14px", borderRadius:"var(--border-radius-md)", border:"0.5px solid #6EE7B7", background:"#D1FAE5" }}>
          <div style={{ fontSize:10, fontWeight:500, letterSpacing:"0.08em", color:"#065F46", marginBottom:5 }}>EXERCICE PRÉPARATOIRE</div>
          <div style={{ fontSize:13, color:"#065F46" }}>{result.exercicePrep}</div>
        </div>
      )}
      <button onClick={() => setResult(null)} style={{ marginTop:14, fontSize:13, padding:"8px 14px", cursor:"pointer", border:"0.5px solid var(--color-border-secondary)", background:"transparent", color:"var(--color-text-secondary)", borderRadius:"var(--border-radius-md)" }}>← Regénérer</button>
    </div>
  );

  return (
    <div style={{ textAlign:"center", padding:"24px 0" }}>
      <div style={{ fontSize:28, marginBottom:12 }}>📅</div>
      <div style={{ fontSize:14, fontWeight:500, marginBottom:6 }}>Préparer le prochain rendez-vous</div>
      <div style={{ fontSize:13, color:"var(--color-text-secondary)", marginBottom:20, maxWidth:360, margin:"0 auto 20px" }}>
        L'agent analyse l'historique de {client.nom} et génère automatiquement l'ordre du jour, les questions à poser et un exercice préparatoire.
      </div>
      {err && <div style={{ fontSize:13, color:"#991B1B", marginBottom:12, padding:"9px 12px", background:"#FEE2E2", borderRadius:"var(--border-radius-md)" }}>⚠️ {err}</div>}
      <button onClick={prepare} style={{ fontSize:13, fontWeight:500, padding:"11px 22px", cursor:"pointer", background:V, color:"#fff", border:"none", borderRadius:"var(--border-radius-md)" }}>→ Préparer la séance</button>
    </div>
  );
}

function ClientDashboard({ client, onBack, onNewSession, onDelete }) {
  const [tab, setTab] = useState("dashboard");
  const last = client.sessions[client.sessions.length - 1];
  const prev = client.sessions[client.sessions.length - 2];

  const TABS = [
    { id:"dashboard", label:"Tableau de bord" },
    { id:"seances",   label:`Séances (${client.sessions.length})` },
    { id:"checkin",   label:"Préparer le RDV" },
  ];

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20, paddingBottom:16, borderBottom:"0.5px solid var(--color-border-tertiary)" }}>
        <div>
          <button onClick={onBack} style={{ fontSize:12, padding:"4px 10px", cursor:"pointer", border:"0.5px solid var(--color-border-secondary)", background:"transparent", color:"var(--color-text-secondary)", borderRadius:"var(--border-radius-sm)", marginBottom:10 }}>← Tous les clients</button>
          <div style={{ fontSize:18, fontWeight:500, color:"var(--color-text-primary)", marginBottom:3 }}>{client.nom}</div>
          <div style={{ fontSize:13, color:"var(--color-text-secondary)" }}>{client.entreprise} · {client.secteur}</div>
          <div style={{ fontSize:11, color:"var(--color-text-tertiary)", marginTop:2 }}>{client.typeAccompagnement} · depuis {client.dateDebut}</div>
        </div>
        <div style={{ textAlign:"right", flexShrink:0, marginLeft:16 }}>
          {last ? (
            <>
              <div style={{ fontSize:32, fontWeight:300, lineHeight:1 }}>{globalScore(last.scores)}<span style={{ fontSize:14, color:"var(--color-text-tertiary)" }}>/10</span></div>
              <div style={{ marginTop:5, display:"inline-block", padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:500, background:scoreBg(globalScore(last.scores)), color:scoreTxt(globalScore(last.scores)) }}>
                {scoreLabel(globalScore(last.scores))}
              </div>
            </>
          ) : <div style={{ fontSize:12, color:"var(--color-text-tertiary)" }}>Pas encore de séance</div>}
          <div style={{ marginTop:8 }}>
            <button onClick={onNewSession} style={{ fontSize:12, padding:"6px 12px", cursor:"pointer", background:R, color:"#fff", border:"none", borderRadius:"var(--border-radius-md)", fontWeight:500 }}>+ Nouvelle séance</button>
          </div>
        </div>
      </div>

      <div style={{ display:"flex", gap:6, marginBottom:20, borderBottom:"0.5px solid var(--color-border-tertiary)", paddingBottom:12 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ fontSize:13, padding:"6px 14px", cursor:"pointer", borderRadius:"var(--border-radius-md)", border:tab===t.id?`1px solid ${V}`:"0.5px solid transparent", background:tab===t.id?"#F5EFF9":"transparent", color:tab===t.id?V:"var(--color-text-secondary)", fontWeight:tab===t.id?500:400, transition:"all .15s" }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "dashboard" && (
        <div>
          {!last ? (
            <div style={{ textAlign:"center", padding:"32px 0", color:"var(--color-text-secondary)" }}>
              <div style={{ fontSize:28, marginBottom:8 }}>📊</div>
              <div style={{ fontSize:14 }}>Pas encore de séance enregistrée.</div>
              <button onClick={onNewSession} style={{ marginTop:14, fontSize:13, padding:"9px 18px", cursor:"pointer", background:V, color:"#fff", border:"none", borderRadius:"var(--border-radius-md)" }}>+ Ajouter la première séance</button>
            </div>
          ) : (
            <>
              <div style={{ fontSize:10, fontWeight:500, letterSpacing:"0.08em", color:"var(--color-text-secondary)", marginBottom:10 }}>7 PILIERS · Séance du {last.date}</div>
              <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:20 }}>
                {PILLIERS.map(p => (
                  <div key={p.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:"var(--border-radius-md)", border:"0.5px solid var(--color-border-tertiary)", background:"var(--color-background-primary)" }}>
                    <div style={{ width:10, height:10, borderRadius:"50%", background:scoreColor(last.scores[p.id]), flexShrink:0 }} />
                    <div style={{ fontSize:16, flexShrink:0 }}>{p.icon}</div>
                    <div style={{ width:84, fontSize:13, fontWeight:500, flexShrink:0 }}>{p.label}</div>
                    <ScoreBar score={last.scores[p.id]} prev={prev?.scores[p.id]} />
                    <div style={{ flexShrink:0, padding:"2px 8px", borderRadius:20, fontSize:10, fontWeight:500, background:scoreBg(last.scores[p.id]), color:scoreTxt(last.scores[p.id]) }}>
                      {scoreLabel(last.scores[p.id])}
                    </div>
                  </div>
                ))}
              </div>

              {last.analysis?.alertes?.length > 0 && (
                <div style={{ marginBottom:16 }}>
                  <div style={{ fontSize:10, fontWeight:500, letterSpacing:"0.08em", color:"var(--color-text-secondary)", marginBottom:8 }}>ALERTES ACTIVES</div>
                  {last.analysis.alertes.map((a, i) => (
                    <div key={i} style={{ fontSize:13, padding:"8px 12px", borderRadius:"var(--border-radius-md)", border:"0.5px solid #FCA5A5", background:"#FFF5F5", marginBottom:5, display:"flex", gap:8 }}>
                      <span>⚠️</span><span>{a}</span>
                    </div>
                  ))}
                </div>
              )}

              {last.analysis?.actions?.length > 0 && (
                <div style={{ padding:"12px 14px", borderRadius:"var(--border-radius-md)", border:"0.5px solid var(--color-border-secondary)", background:"var(--color-background-secondary)" }}>
                  <div style={{ fontSize:10, fontWeight:500, letterSpacing:"0.08em", color:"var(--color-text-secondary)", marginBottom:8 }}>ACTIONS EN COURS</div>
                  {last.analysis.actions.map((a, i) => (
                    <div key={i} style={{ fontSize:13, marginBottom:5, display:"flex", gap:8 }}><span style={{ color:V }}>→</span><span>{a}</span></div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {tab === "seances" && (
        <div>
          {client.sessions.length === 0 ? (
            <div style={{ textAlign:"center", padding:"32px 0", color:"var(--color-text-secondary)", fontSize:14 }}>Aucune séance enregistrée.</div>
          ) : (
            [...client.sessions].reverse().map((s, i) => (
              <div key={s.id} style={{ padding:"14px 16px", borderRadius:"var(--border-radius-lg)", border:"0.5px solid var(--color-border-secondary)", background:"var(--color-background-primary)", marginBottom:10 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                  <div>
                    <span style={{ fontSize:13, fontWeight:500, color:"var(--color-text-primary)" }}>Séance du {s.date}</span>
                    <span style={{ fontSize:12, color:"var(--color-text-tertiary)", marginLeft:10 }}>Score global : {globalScore(s.scores)}/10</span>
                  </div>
                  <div style={{ display:"flex", gap:4 }}>
                    {PILLIERS.map(p => (
                      <div key={p.id} style={{ width:8, height:8, borderRadius:"50%", background:scoreColor(s.scores[p.id]) }} title={`${p.label}: ${s.scores[p.id]}`} />
                    ))}
                  </div>
                </div>
                {s.notes && <p style={{ margin:"0 0 8px", fontSize:12, color:"var(--color-text-secondary)", lineHeight:1.6, fontStyle:"italic" }}>{s.notes}</p>}
                {s.analysis?.bilan && <p style={{ margin:0, fontSize:13, color:"var(--color-text-primary)", lineHeight:1.65 }}>{s.analysis.bilan}</p>}
              </div>
            ))
          )}
        </div>
      )}

      {tab === "checkin" && <PrepareCheckin client={client} />}
    </div>
  );
}

// ─── MAIN APP ────────────────────────────────────────────────────
export default function AgentSuivi() {
  const [clients, setClients] = useState([]);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState("list"); // list | new-client | dashboard | new-session
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    store.get(STORAGE_KEY).then(data => {
      if (data && Array.isArray(data)) setClients(data);
      setReady(true);
    });
  }, []);

  const persist = useCallback(async (newClients) => {
    setClients(newClients);
    await store.set(STORAGE_KEY, newClients);
  }, []);

  const addClient = async (client) => {
    await persist([...clients, client]);
    setSelected(client);
    setView("dashboard");
  };

  const addSession = async (session) => {
    const updated = clients.map(c => c.id === selected.id ? { ...c, sessions: [...c.sessions, session] } : c);
    const updatedClient = updated.find(c => c.id === selected.id);
    await persist(updated);
    setSelected(updatedClient);
    setView("dashboard");
  };

  const deleteClient = async (id) => {
    if (!window.confirm("Supprimer ce client et toutes ses séances ?")) return;
    await persist(clients.filter(c => c.id !== id));
    setView("list");
    setSelected(null);
  };

  if (!ready) return (
    <div style={{ padding:"2rem", textAlign:"center" }}>
      <div style={{ width:20, height:20, border:`2px solid ${V}`, borderTopColor:"transparent", borderRadius:"50%", animation:"spin .8s linear infinite", display:"inline-block" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ fontFamily:"var(--font-sans)", minHeight:"100vh", background:"var(--color-background-secondary)" }}>
      <nav style={{ background:"var(--color-background-primary)", borderBottom:"0.5px solid var(--color-border-tertiary)", position:"sticky", top:0, zIndex:100 }}>
        <div style={{ maxWidth:720, margin:"0 auto", padding:"0 16px", height:52, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:30, height:30, borderRadius:8, background:V, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15 }}>👥</div>
            <div>
              <div style={{ fontFamily:"Poppins,sans-serif", fontSize:13, fontWeight:600, color:V, lineHeight:1.1 }}>CapZéniths</div>
              <div style={{ fontSize:9, color:"var(--color-text-tertiary)", letterSpacing:"0.06em" }}>AGENT SUIVI CLIENT</div>
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:12, color:"var(--color-text-tertiary)" }}>{clients.length} client{clients.length > 1 ? "s" : ""}</span>
            {view !== "new-client" && (
              <button onClick={() => setView("new-client")} style={{ fontSize:12, padding:"6px 12px", cursor:"pointer", background:R, color:"#fff", border:"none", borderRadius:"var(--border-radius-md)", fontWeight:500 }}>+ Nouveau client</button>
            )}
          </div>
        </div>
      </nav>

      <div style={{ maxWidth:720, margin:"0 auto", padding:"24px 16px" }}>
        <div style={{ background:"var(--color-background-primary)", borderRadius:"var(--border-radius-xl)", border:"0.5px solid var(--color-border-tertiary)", boxShadow:"0 4px 12px rgba(91,44,145,.07)", padding:"24px 24px 28px" }}>

          {view === "list" && (
            <div>
              <div style={{ marginBottom:20 }}>
                <div style={{ fontSize:10, fontWeight:500, letterSpacing:"0.09em", color:"var(--color-text-secondary)", marginBottom:4 }}>AGENT SUIVI CLIENT</div>
                <div style={{ fontSize:18, fontWeight:500, color:"var(--color-text-primary)" }}>Mes clients</div>
              </div>
              {clients.length === 0 ? (
                <div style={{ textAlign:"center", padding:"40px 0" }}>
                  <div style={{ fontSize:36, marginBottom:12 }}>👥</div>
                  <div style={{ fontSize:15, fontWeight:500, marginBottom:6 }}>Aucun client pour l'instant</div>
                  <div style={{ fontSize:13, color:"var(--color-text-secondary)", marginBottom:20 }}>Ajoute ton premier client pour commencer le suivi.</div>
                  <button onClick={() => setView("new-client")} style={{ fontSize:13, fontWeight:500, padding:"10px 20px", cursor:"pointer", background:V, color:"#fff", border:"none", borderRadius:"var(--border-radius-md)" }}>+ Ajouter un client</button>
                </div>
              ) : (
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))", gap:12 }}>
                  {clients.map(c => (
                    <ClientCard key={c.id} client={c} onSelect={() => { setSelected(c); setView("dashboard"); }} />
                  ))}
                </div>
              )}
            </div>
          )}

          {view === "new-client" && (
            <NewClientForm onSave={addClient} onCancel={() => setView("list")} />
          )}

          {view === "dashboard" && selected && (
            <ClientDashboard
              client={clients.find(c => c.id === selected.id) || selected}
              onBack={() => setView("list")}
              onNewSession={() => setView("new-session")}
              onDelete={() => deleteClient(selected.id)}
            />
          )}

          {view === "new-session" && selected && (
            <NewSessionForm
              client={clients.find(c => c.id === selected.id) || selected}
              onSave={addSession}
              onCancel={() => setView("dashboard")}
            />
          )}

        </div>
      </div>
    </div>
  );
}
