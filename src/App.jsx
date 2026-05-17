import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Plus, ChevronLeft, ChevronRight, Copy, Moon, Sun, DollarSign, Target, ShieldAlert, BarChart3, Check, X, CreditCard, Wallet, Landmark, Edit3, LogOut } from "lucide-react";
import { signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, provider, db } from "./firebase";

// ─────────────────────────────────────────────────────────────────────────────
// ALL constants and components are at MODULE level — never inside App().
// This is the single most important rule: if a component is defined inside
// App(), React sees a brand-new function on every render and unmounts/remounts
// the DOM node, which steals focus from whatever the user is typing in.
// ─────────────────────────────────────────────────────────────────────────────

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const RULE = { needs: 41, wants: 20, invest: 39 };
const BENCHMARK = { threeMonth: { needs: 38, wants: 23, invest: 39 }, sixMonth: { needs: 44, wants: 19, invest: 37 } };
const DC = { debt: "#6366f1", expenses: "#f59e0b", investments: "#10b981" };
const EMPTY = () => ({ salary: 0, items: { debt: [], expenses: [], investments: [] } });
const uid = () => Math.random().toString(36).slice(2, 9);
const fmtINR = n => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

// ── StableInput ──────────────────────────────────────────────────────────────
const StableInput = ({ value, onChange, placeholder, isNumber, style }) => {
  const [local, setLocal] = useState(String(value ?? ""));
  const last = useRef(value);

  useEffect(() => {
    if (value !== last.current) {
      setLocal(String(value ?? ""));
      last.current = value;
    }
  }, [value]);

  const handle = e => {
    const raw = e.target.value;
    setLocal(raw);
    const out = isNumber ? (raw === "" ? 0 : parseFloat(raw) || 0) : raw;
    last.current = out;
    onChange(out);
  };

  return (
    <input
      type={isNumber ? "number" : "text"}
      inputMode={isNumber ? "decimal" : "text"}
      value={local}
      onChange={handle}
      placeholder={placeholder}
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize={isNumber ? "off" : "sentences"}
      spellCheck="false"
      enterKeyHint="done"
      style={style}
    />
  );
};

// ── ProgressBar ──────────────────────────────────────────────────────────────
const ProgressBar = ({ pct, rule, color, alertOn, dark }) => (
  <div style={{ position: "relative", height: 10, background: dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)", borderRadius: 99, overflow: "hidden" }}>
    <div style={{ height: "100%", width: `${Math.min(pct, 100)}%`, background: alertOn ? "#ef4444" : color, borderRadius: 99, transition: "width 0.5s ease" }} />
    <div style={{ position: "absolute", top: 0, left: `${rule}%`, width: 2, height: "100%", background: "rgba(255,255,255,0.4)" }} />
  </div>
);

// ── Card ─────────────────────────────────────────────────────────────────────
const Card = ({ children, style: s = {}, surface, border, dark }) => (
  <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 24, padding: 20, boxShadow: dark ? "0 4px 24px rgba(0,0,0,0.4)" : "0 4px 24px rgba(99,102,241,0.08)", ...s }}>
    {children}
  </div>
);

// ── SmallCard ────────────────────────────────────────────────────────────────
const SmallCard = ({ icon: Icon, label, value, sub, color, accentLight, border, text, muted }) => (
  <div style={{ background: accentLight, border: `1px solid ${border}`, borderRadius: 20, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ background: color + "22", borderRadius: 10, padding: 6, display: "flex" }}><Icon size={16} color={color} /></div>
      <span style={{ fontSize: 11, color: muted, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</span>
    </div>
    <div style={{ fontSize: 22, fontWeight: 700, color: text, fontVariantNumeric: "tabular-nums" }}>{value}</div>
    {sub && <div style={{ fontSize: 12, color: muted }}>{sub}</div>}
  </div>
);

// ── BmRow ────────────────────────────────────────────────────────────────────
const BmRow = ({ label, cur, comp, field, border, muted, text, accent, dark }) => {
  const diff = Math.round(cur - comp);
  const good = field === "invest" ? cur >= comp : cur <= comp;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: `1px solid ${border}` }}>
      <span style={{ fontSize: 11, color: muted, width: 40 }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 700, color: text, width: 30 }}>{cur}%</span>
      <div style={{ flex: 1, height: 5, background: dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${Math.min(comp, 100)}%`, background: accent + "55", borderRadius: 99 }} />
      </div>
      <span style={{ fontSize: 10, color: muted, width: 26 }}>{comp}%</span>
      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 99, background: good ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)", color: good ? "#10b981" : "#ef4444" }}>
        {diff > 0 ? "+" : ""}{diff}%
      </span>
    </div>
  );
};

// ── LedgerRow ────────────────────────────────────────────────────────────────
const LedgerRow = ({ item, cat, color, dark, border, text, muted, inputBg, onToggle, onUpdate, onDelete }) => (
  <div style={{
    display: "flex", alignItems: "center", gap: 8,
    background: item.settled ? (dark ? "rgba(16,185,129,0.08)" : "rgba(16,185,129,0.06)") : inputBg,
    border: `1px solid ${item.settled ? "rgba(16,185,129,0.25)" : border}`,
    borderRadius: 14, padding: "10px 12px",
  }}>
    <button
      onClick={() => onToggle(cat, item.id)}
      style={{ width: 34, height: 34, borderRadius: 9, border: `2px solid ${item.settled ? "#10b981" : border}`, background: item.settled ? "#10b981" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
    >
      {item.settled && <Check size={15} color="#fff" strokeWidth={3} />}
    </button>
    <StableInput
      value={item.name}
      onChange={v => onUpdate(cat, item.id, "name", v)}
      placeholder="Item name…"
      isNumber={false}
      style={{ flex: 1, minWidth: 0, background: "transparent", border: "none", outline: "none", color: item.settled ? "#10b981" : text, fontSize: 16, fontWeight: 500, textDecoration: item.settled ? "line-through" : "none", padding: "3px 0", fontFamily: "inherit" }}
    />
    <StableInput
      value={item.amount}
      onChange={v => onUpdate(cat, item.id, "amount", v)}
      placeholder="0"
      isNumber={true}
      style={{ width: 90, flexShrink: 0, background: "transparent", border: "none", outline: "none", color: item.settled ? "#10b981" : color, fontSize: 16, fontWeight: 700, textAlign: "right", fontVariantNumeric: "tabular-nums", padding: "3px 0", fontFamily: "inherit" }}
    />
    <button onClick={() => onDelete(cat, item.id)} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 6, display: "flex", flexShrink: 0 }}>
      <X size={16} color={muted} />
    </button>
  </div>
);

// ── LedgerSection ────────────────────────────────────────────────────────────
const LedgerSection = ({ title, cat, icon: Icon, color, total, items, dark, border, text, muted, inputBg, onToggle, onUpdate, onDelete, onAdd }) => (
  <div style={{ marginBottom: 24 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
      <div style={{ background: color + "22", borderRadius: 10, padding: 7, display: "flex" }}><Icon size={16} color={color} /></div>
      <span style={{ fontWeight: 700, color: text, fontSize: 14 }}>{title}</span>
      <span style={{ marginLeft: "auto", fontSize: 13, fontWeight: 700, color }}>{fmtINR(total)}</span>
    </div>
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map(item => (
        <LedgerRow key={item.id} item={item} cat={cat} color={color} dark={dark} border={border} text={text} muted={muted} inputBg={inputBg} onToggle={onToggle} onUpdate={onUpdate} onDelete={onDelete} />
      ))}
    </div>
    <button onClick={() => onAdd(cat)} style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: color + "12", border: `1.5px dashed ${color}55`, borderRadius: 12, padding: "11px 14px", cursor: "pointer", color, fontSize: 13, fontWeight: 600, width: "100%" }}>
      <Plus size={14} /> Add {title.split("/")[0].trim()} Item
    </button>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// ── App ──────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser]             = useState(null);
  const [loading, setLoading]       = useState(true);
  const [dark, setDark]             = useState(true);
  const [year, setYear]             = useState(2026);
  const [month, setMonth]           = useState(new Date().getMonth() + 1);
  const [allData, setAllData]       = useState({});
  const [editSalary, setEditSalary] = useState(false);
  const [salaryLocal, setSalaryLocal] = useState("");
  const [saving, setSaving]         = useState(false);
  const [loginError, setLoginError] = useState("");
  const saveTimer = useRef(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => { setUser(u); setLoading(false); });
    return unsub;
  }, []);

  useEffect(() => {
    getRedirectResult(auth)
      .then(r => { if (r?.user) setUser(r.user); })
      .catch(() => setLoginError("Login failed. Please try again."));
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) setAllData(snap.data().allData || {});
      } catch (e) { console.error(e); }
    })();
  }, [user]);

  useEffect(() => {
    const fn = () => document.documentElement.style.setProperty("--vh", `${window.innerHeight * 0.01}px`);
    fn(); window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);

  const scheduleSave = useCallback((data) => {
    if (!user) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      try { await setDoc(doc(db, "users", user.uid), { allData: data }); }
      catch (e) { console.error(e); }
      setSaving(false);
    }, 1500);
  }, [user]);

  const monthKey  = `${year}-${month}`;
  const monthData = useMemo(() => allData[monthKey] || EMPTY(), [allData, monthKey]);

  const setMonthData = useCallback((updater) => {
    setAllData(prev => {
      const cur     = prev[monthKey] || EMPTY();
      const next    = typeof updater === "function" ? updater(cur) : updater;
      const updated = { ...prev, [monthKey]: next };
      scheduleSave(updated);
      return updated;
    });
  }, [monthKey, scheduleSave]);

  const navMonth = (dir) => {
    let m = month + dir, y = year;
    if (m > 12) { m = 1; y++; }
    if (m < 1)  { m = 12; y--; }
    setMonth(m); setYear(y);
  };

  const cloneForNext = () => {
    let nm = month + 1, ny = year;
    if (nm > 12) { nm = 1; ny++; }
    setAllData(prev => {
      const updated = { ...prev, [`${ny}-${nm}`]: { salary: 0, items: {
        debt:        monthData.items.debt.map(i        => ({ ...i, id: uid(), amount: 0, settled: false })),
        expenses:    monthData.items.expenses.map(i    => ({ ...i, id: uid(), amount: 0, settled: false })),
        investments: monthData.items.investments.map(i => ({ ...i, id: uid(), amount: 0, settled: false })),
      }}};
      scheduleSave(updated);
      return updated;
    });
    setMonth(nm); setYear(ny);
  };

  const updateItem = useCallback((cat, id, field, value) => {
    setMonthData(prev => ({ ...prev, items: { ...prev.items,
      [cat]: prev.items[cat].map(i => i.id === id ? { ...i, [field]: value } : i)
    }}));
  }, [setMonthData]);

  const toggleSettled = useCallback((cat, id) => {
    setMonthData(prev => ({ ...prev, items: { ...prev.items,
      [cat]: prev.items[cat].map(i => i.id === id ? { ...i, settled: !i.settled } : i)
    }}));
  }, [setMonthData]);

  const addItem = useCallback((cat) => {
    setMonthData(prev => ({ ...prev, items: { ...prev.items,
      [cat]: [...prev.items[cat], { id: uid(), name: "", amount: 0, settled: false }]
    }}));
  }, [setMonthData]);

  const deleteItem = useCallback((cat, id) => {
    setMonthData(prev => ({ ...prev, items: { ...prev.items,
      [cat]: prev.items[cat].filter(i => i.id !== id)
    }}));
  }, [setMonthData]);

  const openSalaryEdit = () => { setSalaryLocal(monthData.salary ? String(monthData.salary) : ""); setEditSalary(true); };
  const commitSalary   = () => { setMonthData(prev => ({ ...prev, salary: parseFloat(salaryLocal) || 0 })); setEditSalary(false); };

  const { salary, items } = monthData;
  const allItems   = [...items.debt, ...items.expenses, ...items.investments];
  const totalDebt  = items.debt.reduce((s, i)        => s + (Number(i.amount) || 0), 0);
  const totalExp   = items.expenses.reduce((s, i)    => s + (Number(i.amount) || 0), 0);
  const totalInv   = items.investments.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const totalAll   = totalDebt + totalExp + totalInv;
  const surplus    = salary - totalAll;
  const settledCount = allItems.filter(i => i.settled).length;
  const settledPct   = allItems.length ? Math.round((settledCount / allItems.length) * 100) : 0;
  const pctOf      = v => salary > 0 ? Math.round((v / salary) * 100) : 0;
  const needsPct   = pctOf(totalDebt);
  const wantsPct   = pctOf(totalExp);
  const investPct  = pctOf(totalInv);
  const needsAlert  = needsPct > RULE.needs;
  const investAlert = investPct < RULE.invest && salary > 0;
  const donutData   = [
    { name: "Debt/Needs",     value: totalDebt },
    { name: "Expenses/Wants", value: totalExp  },
    { name: "Investments",    value: totalInv  },
  ].filter(d => d.value > 0);

  const bg          = dark ? "#0f0f1a" : "#f4f4f8";
  const surface     = dark ? "#1a1a2e" : "#ffffff";
  const surface2    = dark ? "#16213e" : "#f0f0f8";
  const border      = dark ? "rgba(99,102,241,0.2)" : "rgba(99,102,241,0.15)";
  const text        = dark ? "#e2e8f0" : "#1e1b4b";
  const muted       = dark ? "#94a3b8" : "#64748b";
  const accent      = "#6366f1";
  const accentLight = dark ? "rgba(99,102,241,0.15)" : "rgba(99,102,241,0.08)";
  const inputBg     = dark ? "#0d0d18" : "#f8f8ff";
  const th = { dark, border, text, muted, accent, accentLight, surface, surface2, inputBg };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#0f0f1a", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#6366f1", fontSize: 16, fontFamily: "sans-serif" }}>Loading…</div>
    </div>
  );

  if (!user) return (
    <div style={{ minHeight: "100vh", background: "#0f0f1a", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans',sans-serif", padding: 16 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap');`}</style>
      <div style={{ background: "#1a1a2e", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 28, padding: "48px 32px", textAlign: "center", maxWidth: 380, width: "100%" }}>
        <div style={{ fontSize: 12, color: "#6366f1", fontWeight: 700, letterSpacing: "0.12em", marginBottom: 12 }}>◆ FINVAULT</div>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "#e2e8f0", marginBottom: 8 }}>Financial Intelligence</h1>
        <p style={{ fontSize: 14, color: "#94a3b8", marginBottom: 32, lineHeight: 1.6 }}>Sign in to access your personal finance tracker. Your data is private and saved securely.</p>
        {loginError && <p style={{ fontSize: 12, color: "#ef4444", marginBottom: 16 }}>{loginError}</p>}
        <button onClick={() => { setLoginError(""); signInWithRedirect(auth, provider); }} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, background: "#fff", color: "#1e1b4b", border: "none", borderRadius: 14, padding: "15px 20px", cursor: "pointer", fontSize: 15, fontWeight: 700 }}>
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
            <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
            <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
            <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
          </svg>
          Continue with Google
        </button>
        <p style={{ fontSize: 11, color: "#475569", marginTop: 20 }}>Free forever · No credit card · Your data stays private</p>
      </div>
    </div>
  );

  return (
    <div style={{ background: bg, fontFamily: "'DM Sans','Segoe UI',sans-serif", color: text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { height: -webkit-fill-available; }
        body { min-height: 100vh; min-height: -webkit-fill-available; overscroll-behavior: none; }
        input { font-size: 16px !important; font-family: inherit; background: transparent; }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
        input[type=number] { -moz-appearance: textfield; }
        input::placeholder { opacity: 0.35; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.55} }
        .pulse { animation: pulse 2s infinite; }
      `}</style>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 16px 80px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 0 16px" }}>
          <div>
            <div style={{ fontSize: 11, color: accent, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>◆ Finvault</div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: text }}>Financial Intelligence</h1>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {saving && <span style={{ fontSize: 11, color: muted }}>Saving…</span>}
            {user.photoURL && <img src={user.photoURL} alt="" style={{ width: 32, height: 32, borderRadius: "50%", border: `2px solid ${accent}` }} />}
            <button onClick={() => setDark(d => !d)} style={{ background: accentLight, border: `1px solid ${border}`, borderRadius: 12, padding: "9px 12px", cursor: "pointer", display: "flex", color: text }}>
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button onClick={() => signOut(auth)} style={{ background: accentLight, border: `1px solid ${border}`, borderRadius: 12, padding: "9px 12px", cursor: "pointer", display: "flex", color: text }}>
              <LogOut size={16} />
            </button>
          </div>
        </div>

        {/* Month Nav */}
        <Card {...th} style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <button onClick={() => navMonth(-1)} style={{ background: accentLight, border: `1px solid ${border}`, borderRadius: 10, padding: "10px 14px", cursor: "pointer", display: "flex" }}>
              <ChevronLeft size={18} color={accent} />
            </button>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: text }}>{MONTHS[month - 1]} {year}</div>
              <div style={{ fontSize: 11, color: muted, marginTop: 2 }}>Active Budget Period</div>
            </div>
            <button onClick={() => navMonth(1)} style={{ background: accentLight, border: `1px solid ${border}`, borderRadius: 10, padding: "10px 14px", cursor: "pointer", display: "flex" }}>
              <ChevronRight size={18} color={accent} />
            </button>
          </div>
          <button onClick={cloneForNext} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, background: accent, color: "#fff", border: "none", borderRadius: 12, padding: "12px 16px", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
            <Copy size={14} /> Clone for {MONTHS[month % 12]} {month === 12 ? year + 1 : year}
          </button>
        </Card>

        {/* Alerts */}
        {(needsAlert || investAlert) && (
          <div style={{ marginBottom: 16 }}>
            {needsAlert && (
              <div className="pulse" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 16, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <ShieldAlert size={18} color="#ef4444" />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#ef4444" }}>Needs/Debt Overload</div>
                  <div style={{ fontSize: 11, color: muted }}>At {needsPct}% — exceeds the 41% ceiling.</div>
                </div>
              </div>
            )}
            {investAlert && (
              <div className="pulse" style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.3)", borderRadius: 16, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                <AlertTriangle size={18} color="#fbbf24" />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#fbbf24" }}>Investment Deficit</div>
                  <div style={{ fontSize: 11, color: muted }}>At {investPct}% — below the 39% target.</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Summary Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <div style={{ background: accentLight, border: `1px solid ${border}`, borderRadius: 20, padding: "16px 18px", gridColumn: "1 / -1" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div style={{ background: accent + "22", borderRadius: 10, padding: 6, display: "flex" }}><DollarSign size={16} color={accent} /></div>
              <span style={{ fontSize: 11, color: muted, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>Opening Balance</span>
              <button onClick={openSalaryEdit} style={{ marginLeft: "auto", background: "transparent", border: "none", cursor: "pointer", padding: 8 }}>
                <Edit3 size={15} color={muted} />
              </button>
            </div>
            {editSalary ? (
              <div style={{ display: "flex", gap: 8 }}>
                <input type="number" inputMode="decimal" value={salaryLocal} onChange={e => setSalaryLocal(e.target.value)} onKeyDown={e => e.key === "Enter" && commitSalary()} enterKeyHint="done" autoFocus placeholder="Enter amount…" style={{ flex: 1, background: inputBg, border: `1px solid ${accent}`, borderRadius: 10, padding: "12px 14px", color: text, fontSize: 16, fontWeight: 700, outline: "none", fontFamily: "inherit" }} />
                <button onClick={commitSalary} style={{ background: accent, border: "none", borderRadius: 10, padding: "12px 18px", cursor: "pointer", color: "#fff", fontSize: 14, fontWeight: 600, flexShrink: 0 }}>Save</button>
              </div>
            ) : (
              <div style={{ fontSize: 28, fontWeight: 700, color: accent, fontVariantNumeric: "tabular-nums" }}>{fmtINR(salary)}</div>
            )}
            <div style={{ fontSize: 11, color: muted, marginTop: 4 }}>Take-home salary — tap ✎ to edit</div>
          </div>
          <SmallCard icon={surplus >= 0 ? TrendingUp : TrendingDown} label="Surplus / Deficit" value={fmtINR(surplus)} sub={surplus >= 0 ? "Positive cashflow" : "Budget exceeded"} color={surplus >= 0 ? "#10b981" : "#ef4444"} {...th} />
          <SmallCard icon={CheckCircle2} label="Settlement" value={`${settledPct}%`} sub={`${settledCount}/${allItems.length} items paid`} color={accent} {...th} />
        </div>

        {/* Financial Matrix */}
        <Card {...th} style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <Target size={17} color={accent} />
            <h2 style={{ fontSize: 15, fontWeight: 700, color: text }}>Financial Matrix — 41:20:39 Rule</h2>
          </div>
          {[
            { label: "Needs / Debt",     pct: needsPct,  rule: RULE.needs,  color: DC.debt,        amt: totalDebt, alert: needsAlert },
            { label: "Wants / Expenses", pct: wantsPct,  rule: RULE.wants,  color: DC.expenses,    amt: totalExp,  alert: false },
            { label: "Investments",      pct: investPct, rule: RULE.invest, color: DC.investments, amt: totalInv,  alert: investAlert },
          ].map(row => (
            <div key={row.label} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: row.color }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: text }}>{row.label}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 11, color: muted }}>Target: {row.rule}%</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: row.alert ? "#ef4444" : row.color }}>{row.pct}%</span>
                </div>
              </div>
              <ProgressBar pct={row.pct} rule={row.rule} color={row.color} alertOn={row.alert} dark={dark} />
              <div style={{ fontSize: 11, color: muted, marginTop: 4, textAlign: "right" }}>{fmtINR(row.amt)}</div>
            </div>
          ))}
        </Card>

        {/* Donut Chart */}
        <Card {...th} style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <BarChart3 size={17} color={accent} />
            <h2 style={{ fontSize: 15, fontWeight: 700, color: text }}>Allocation Breakdown</h2>
          </div>
          {donutData.length > 0 ? (
            <>
              <div style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={donutData} cx="50%" cy="50%" innerRadius={65} outerRadius={95} paddingAngle={3} dataKey="value" strokeWidth={0}>
                      {donutData.map((_, i) => <Cell key={i} fill={[DC.debt, DC.expenses, DC.investments][i]} />)}
                    </Pie>
                    <Tooltip formatter={v => fmtINR(v)} contentStyle={{ background: surface2, border: `1px solid ${border}`, borderRadius: 12, fontSize: 12, color: text }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: "flex", justifyContent: "center", gap: 20, flexWrap: "wrap", marginTop: 8 }}>
                {[{ label: "Debt", color: DC.debt, val: totalDebt }, { label: "Expenses", color: DC.expenses, val: totalExp }, { label: "Investments", color: DC.investments, val: totalInv }].map(l => (
                  <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: l.color }} />
                    <span style={{ fontSize: 12, color: muted }}>{l.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: l.color }}>{fmtINR(l.val)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center", color: muted, fontSize: 13 }}>Add entries to see chart</div>
          )}
        </Card>

        {/* Benchmarking */}
        <Card {...th} style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <TrendingUp size={17} color={accent} />
            <h2 style={{ fontSize: 15, fontWeight: 700, color: text }}>Benchmarking</h2>
            <span style={{ marginLeft: "auto", fontSize: 11, color: muted }}>Current vs. avg</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {["3-Month Avg", "6-Month Avg"].map((label, idx) => {
              const comp = idx === 0 ? BENCHMARK.threeMonth : BENCHMARK.sixMonth;
              return (
                <div key={label} style={{ background: surface2, borderRadius: 16, padding: "12px 14px", border: `1px solid ${border}` }}>
                  <div style={{ fontSize: 11, color: accent, fontWeight: 700, marginBottom: 10 }}>{label}</div>
                  <BmRow label="Needs"  cur={needsPct}  comp={comp.needs}  field="needs"  {...th} />
                  <BmRow label="Wants"  cur={wantsPct}  comp={comp.wants}  field="wants"  {...th} />
                  <BmRow label="Invest" cur={investPct} comp={comp.invest} field="invest" {...th} />
                </div>
              );
            })}
          </div>
        </Card>

        {/* Strategic Ledger */}
        <Card {...th}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
            <Wallet size={17} color={accent} />
            <h2 style={{ fontSize: 15, fontWeight: 700, color: text }}>Strategic Ledger</h2>
            <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: text }}>{fmtINR(totalAll)}</span>
          </div>
          <LedgerSection title="Credit Card / Debt"     cat="debt"        icon={CreditCard} color={DC.debt}        total={totalDebt} items={items.debt}        onToggle={toggleSettled} onUpdate={updateItem} onDelete={deleteItem} onAdd={addItem} {...th} />
          <LedgerSection title="Other Expenses / Wants" cat="expenses"    icon={Wallet}     color={DC.expenses}    total={totalExp}  items={items.expenses}    onToggle={toggleSettled} onUpdate={updateItem} onDelete={deleteItem} onAdd={addItem} {...th} />
          <LedgerSection title="Mandatory Investments"  cat="investments" icon={Landmark}   color={DC.investments} total={totalInv}  items={items.investments} onToggle={toggleSettled} onUpdate={updateItem} onDelete={deleteItem} onAdd={addItem} {...th} />
          <div style={{ borderTop: `1px solid ${border}`, paddingTop: 16, marginTop: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: muted }}>Settlement Progress</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#10b981" }}>{settledPct}%</span>
            </div>
            <div style={{ height: 8, background: dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)", borderRadius: 99, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${settledPct}%`, background: "linear-gradient(90deg,#10b981,#6366f1)", borderRadius: 99, transition: "width 0.5s ease" }} />
            </div>
          </div>
        </Card>

      </div>
    </div>
  );
}
