import { useState, useMemo, useCallback } from "react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer
} from "recharts";
import {
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  Plus, Trash2, ChevronLeft, ChevronRight, Copy, Moon, Sun,
  DollarSign, Target, ShieldAlert, BarChart3, Check, X,
  CreditCard, Wallet, Landmark, Edit3
} from "lucide-react";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const RULE = { needs: 41, wants: 20, invest: 39 };

function uid() { return Math.random().toString(36).slice(2, 9); }

const DEMO_DATA = {
  "2026-5": {
    salary: 85000,
    items: {
      debt: [
        { id: uid(), name: "Home Loan EMI", amount: 22000, settled: true },
        { id: uid(), name: "Car Loan EMI", amount: 8500, settled: true },
        { id: uid(), name: "Credit Card Bill", amount: 4200, settled: false },
      ],
      expenses: [
        { id: uid(), name: "Groceries & Food", amount: 6000, settled: true },
        { id: uid(), name: "Utilities & Bills", amount: 3500, settled: true },
        { id: uid(), name: "Entertainment", amount: 2800, settled: false },
        { id: uid(), name: "Fuel & Transport", amount: 4500, settled: true },
      ],
      investments: [
        { id: uid(), name: "SIP - Equity Fund", amount: 15000, settled: true },
        { id: uid(), name: "PPF Contribution", amount: 5000, settled: false },
        { id: uid(), name: "NPS Contribution", amount: 3000, settled: true },
        { id: uid(), name: "FD Deposit", amount: 10000, settled: false },
      ],
    }
  }
};

const BENCHMARK = {
  threeMonth: { needs: 38, wants: 23, invest: 39 },
  sixMonth: { needs: 44, wants: 19, invest: 37 },
};

const DONUT_COLORS = { debt: "#6366f1", expenses: "#f59e0b", investments: "#10b981" };

export default function App() {
  const [dark, setDark] = useState(true);
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(5);
  const [allData, setAllData] = useState(DEMO_DATA);
  const [editSalary, setEditSalary] = useState(false);
  const [salaryInput, setSalaryInput] = useState("");

  const monthKey = `${year}-${month}`;

  const monthData = useMemo(() => {
    if (allData[monthKey]) return allData[monthKey];
    return { salary: 0, items: { debt: [], expenses: [], investments: [] } };
  }, [allData, monthKey]);

  const setMonthData = useCallback((updater) => {
    setAllData(prev => {
      const current = prev[monthKey] || { salary: 0, items: { debt: [], expenses: [], investments: [] } };
      const next = typeof updater === "function" ? updater(current) : updater;
      return { ...prev, [monthKey]: next };
    });
  }, [monthKey]);

  const navMonth = (dir) => {
    let m = month + dir, y = year;
    if (m > 12) { m = 1; y++; }
    if (m < 1) { m = 12; y--; }
    setMonth(m); setYear(y);
  };

  const cloneForNext = () => {
    let nm = month + 1, ny = year;
    if (nm > 12) { nm = 1; ny++; }
    const nk = `${ny}-${nm}`;
    setAllData(prev => ({
      ...prev,
      [nk]: {
        salary: 0,
        items: {
          debt: monthData.items.debt.map(i => ({ ...i, id: uid(), amount: 0, settled: false })),
          expenses: monthData.items.expenses.map(i => ({ ...i, id: uid(), amount: 0, settled: false })),
          investments: monthData.items.investments.map(i => ({ ...i, id: uid(), amount: 0, settled: false })),
        }
      }
    }));
    setMonth(nm); setYear(ny);
  };

  const { salary, items } = monthData;
  const allItems = [...items.debt, ...items.expenses, ...items.investments];
  const totalDebt = items.debt.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const totalExpenses = items.expenses.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const totalInvestments = items.investments.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const totalCommitments = totalDebt + totalExpenses + totalInvestments;
  const surplus = salary - totalCommitments;
  const settledCount = allItems.filter(i => i.settled).length;
  const settledPct = allItems.length ? Math.round((settledCount / allItems.length) * 100) : 0;

  const pctOf = (v) => salary > 0 ? Math.round((v / salary) * 100) : 0;
  const needsPct = pctOf(totalDebt);
  const wantsPct = pctOf(totalExpenses);
  const investPct = pctOf(totalInvestments);

  const needsAlert = needsPct > RULE.needs;
  const investAlert = investPct < RULE.invest && salary > 0;

  const donutData = [
    { name: "Debt/Needs", value: totalDebt || 0 },
    { name: "Expenses/Wants", value: totalExpenses || 0 },
    { name: "Investments", value: totalInvestments || 0 },
  ].filter(d => d.value > 0);

  const updateItem = (cat, id, field, value) => {
    setMonthData(prev => ({
      ...prev,
      items: {
        ...prev.items,
        [cat]: prev.items[cat].map(i => i.id === id ? { ...i, [field]: value } : i)
      }
    }));
  };

  const addItem = (cat) => {
    setMonthData(prev => ({
      ...prev,
      items: {
        ...prev.items,
        [cat]: [...prev.items[cat], { id: uid(), name: "", amount: 0, settled: false }]
      }
    }));
  };

  const deleteItem = (cat, id) => {
    setMonthData(prev => ({
      ...prev,
      items: {
        ...prev.items,
        [cat]: prev.items[cat].filter(i => i.id !== id)
      }
    }));
  };

  const saveSalary = () => {
    const val = parseFloat(salaryInput.replace(/,/g, "")) || 0;
    setMonthData(prev => ({ ...prev, salary: val }));
    setEditSalary(false);
  };

  const bg = dark ? "#0f0f1a" : "#f4f4f8";
  const surface = dark ? "#1a1a2e" : "#ffffff";
  const surface2 = dark ? "#16213e" : "#f0f0f8";
  const border = dark ? "rgba(99,102,241,0.2)" : "rgba(99,102,241,0.15)";
  const text = dark ? "#e2e8f0" : "#1e1b4b";
  const muted = dark ? "#94a3b8" : "#64748b";
  const accent = "#6366f1";
  const accentLight = dark ? "rgba(99,102,241,0.15)" : "rgba(99,102,241,0.08)";
  const inputBg = dark ? "#0f0f1a" : "#f8f8ff";

  const fmtINR = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

  const ProgressBar = ({ pct, rule, color, alertOn }) => (
    <div style={{ position: "relative", height: 10, background: dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)", borderRadius: 99, overflow: "hidden" }}>
      <div style={{
        height: "100%", width: `${Math.min(pct, 100)}%`,
        background: alertOn ? "#ef4444" : color,
        borderRadius: 99,
        transition: "width 0.6s cubic-bezier(.4,0,.2,1)"
      }} />
      <div style={{
        position: "absolute", top: 0, left: `${rule}%`,
        width: 2, height: "100%",
        background: alertOn ? "#fca5a5" : "rgba(255,255,255,0.5)",
      }} />
    </div>
  );

  const Card = ({ children, style = {} }) => (
    <div style={{
      background: surface, border: `1px solid ${border}`,
      borderRadius: 24, padding: "20px 20px",
      boxShadow: dark ? "0 4px 24px rgba(0,0,0,0.4)" : "0 4px 24px rgba(99,102,241,0.08)",
      ...style
    }}>{children}</div>
  );

  const MetricCard = ({ icon: Icon, label, value, sub, color = accent, alert }) => (
    <div style={{
      background: accentLight, border: `1px solid ${border}`,
      borderRadius: 20, padding: "16px 18px",
      display: "flex", flexDirection: "column", gap: 8
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ background: color + "22", borderRadius: 10, padding: 6, display: "flex" }}>
          <Icon size={16} color={color} />
        </div>
        <span style={{ fontSize: 12, color: muted, fontWeight: 500, letterSpacing: "0.05em", textTransform: "uppercase" }}>{label}</span>
        {alert && <AlertTriangle size={14} color="#ef4444" style={{ marginLeft: "auto" }} />}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: text, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: muted }}>{sub}</div>}
    </div>
  );

  const LedgerSection = ({ title, cat, icon: Icon, color, total }) => (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{ background: color + "22", borderRadius: 10, padding: 7, display: "flex" }}>
          <Icon size={16} color={color} />
        </div>
        <span style={{ fontWeight: 700, color: text, fontSize: 14 }}>{title}</span>
        <span style={{ marginLeft: "auto", fontSize: 13, fontWeight: 600, color }}>
          {fmtINR(total)}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {monthData.items[cat].map(item => (
          <div key={item.id} style={{
            display: "flex", alignItems: "center", gap: 8,
            background: item.settled ? (dark ? "rgba(16,185,129,0.07)" : "rgba(16,185,129,0.05)") : inputBg,
            border: `1px solid ${item.settled ? "rgba(16,185,129,0.2)" : border}`,
            borderRadius: 14, padding: "10px 12px",
            transition: "all 0.2s"
          }}>
            <button
              onClick={() => updateItem(cat, item.id, "settled", !item.settled)}
              style={{
                width: 28, height: 28, borderRadius: 8, border: `1.5px solid ${item.settled ? "#10b981" : border}`,
                background: item.settled ? "#10b981" : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", flexShrink: 0, transition: "all 0.2s"
              }}
            >
              {item.settled && <Check size={14} color="#fff" />}
            </button>
            <input
              value={item.name}
              onChange={e => updateItem(cat, item.id, "name", e.target.value)}
              placeholder="Item name..."
              style={{
                flex: 1, background: "transparent", border: "none", outline: "none",
                color: item.settled ? "#10b981" : text, fontSize: 13, fontWeight: 500,
                textDecoration: item.settled ? "line-through" : "none",
                minWidth: 0
              }}
            />
            <input
              type="number"
              value={item.amount || ""}
              onChange={e => updateItem(cat, item.id, "amount", parseFloat(e.target.value) || 0)}
              placeholder="0"
              style={{
                width: 90, background: "transparent", border: "none", outline: "none",
                color: item.settled ? "#10b981" : color, fontSize: 13, fontWeight: 700,
                textAlign: "right", fontVariantNumeric: "tabular-nums"
              }}
            />
            <button
              onClick={() => deleteItem(cat, item.id)}
              style={{ background: "transparent", border: "none", cursor: "pointer", padding: 4, display: "flex", flexShrink: 0 }}
            >
              <X size={14} color={muted} />
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={() => addItem(cat)}
        style={{
          marginTop: 10, display: "flex", alignItems: "center", gap: 6,
          background: color + "11", border: `1px dashed ${color}44`,
          borderRadius: 12, padding: "8px 14px", cursor: "pointer",
          color, fontSize: 12, fontWeight: 600, width: "100%",
          justifyContent: "center"
        }}
      >
        <Plus size={14} /> Add {title.split("/")[0]} Item
      </button>
    </div>
  );

  const BenchmarkRow = ({ label, cur, comp, field }) => {
    const diff = Math.round(cur - comp);
    const isGood = field === "invest" ? cur >= comp : cur <= comp;
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${border}` }}>
        <span style={{ fontSize: 12, color: muted, width: 90, flexShrink: 0 }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: text, width: 36 }}>{cur}%</span>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ flex: 1, height: 6, background: dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)", borderRadius: 99, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${Math.min(comp, 100)}%`, background: accent + "66", borderRadius: 99 }} />
          </div>
          <span style={{ fontSize: 11, color: muted, width: 30 }}>{comp}%</span>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 99,
          background: isGood ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
          color: isGood ? "#10b981" : "#ef4444"
        }}>
          {diff > 0 ? "+" : ""}{diff}%
        </span>
      </div>
    );
  };

  return (
    <div style={{
      minHeight: "100vh", background: bg, fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      color: text, transition: "all 0.3s"
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
        input::placeholder { opacity: 0.4; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${accent}44; border-radius: 99px; }
        @keyframes fadeSlide { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .section-anim { animation: fadeSlide 0.4s ease; }
        @keyframes pulse-alert { 0%,100% { opacity: 1; } 50% { opacity: 0.6; } }
        .alert-pulse { animation: pulse-alert 2s infinite; }
      `}</style>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 16px 40px" }}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 0 16px" }}>
          <div>
            <div style={{ fontSize: 11, color: accent, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>◆ Finvault</div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: text, lineHeight: 1.2 }}>Financial Intelligence</h1>
          </div>
          <button onClick={() => setDark(d => !d)} style={{ background: accentLight, border: `1px solid ${border}`, borderRadius: 12, padding: "9px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: text }}>
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>

        <Card style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <button onClick={() => navMonth(-1)} style={{ background: accentLight, border: `1px solid ${border}`, borderRadius: 10, padding: "8px 10px", cursor: "pointer", display: "flex" }}>
              <ChevronLeft size={16} color={accent} />
            </button>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: text }}>{MONTHS[month - 1]} {year}</div>
              <div style={{ fontSize: 11, color: muted, marginTop: 2 }}>Active Budget Period</div>
            </div>
            <button onClick={() => navMonth(1)} style={{ background: accentLight, border: `1px solid ${border}`, borderRadius: 10, padding: "8px 10px", cursor: "pointer", display: "flex" }}>
              <ChevronRight size={16} color={accent} />
            </button>
          </div>
          <button onClick={cloneForNext} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, background: accent, color: "#fff", border: "none", borderRadius: 12, padding: "10px 16px", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
            <Copy size={14} /> Clone for {MONTHS[month % 12]} {month === 12 ? year + 1 : year}
          </button>
        </Card>

        {(needsAlert || investAlert) && (
          <div style={{ marginBottom: 16 }} className="section-anim">
            {needsAlert && (
              <div className="alert-pulse" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 16, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <ShieldAlert size={18} color="#ef4444" />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#ef4444" }}>Needs/Debt Overload</div>
                  <div style={{ fontSize: 11, color: muted }}>At {needsPct}% — exceeds the 41% ceiling. Review debt obligations.</div>
                </div>
              </div>
            )}
            {investAlert && (
              <div className="alert-pulse" style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.3)", borderRadius: 16, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                <AlertTriangle size={18} color="#fbbf24" />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#fbbf24" }}>Investment Deficit</div>
                  <div style={{ fontSize: 11, color: muted }}>At {investPct}% — below the 39% target. Increase SIP allocation.</div>
                </div>
              </div>
            )}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <div style={{ background: accentLight, border: `1px solid ${border}`, borderRadius: 20, padding: "16px 18px", gridColumn: "1 / -1" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div style={{ background: accent + "22", borderRadius: 10, padding: 6, display: "flex" }}>
                <DollarSign size={16} color={accent} />
              </div>
              <span style={{ fontSize: 12, color: muted, fontWeight: 500, letterSpacing: "0.05em", textTransform: "uppercase" }}>Opening Balance</span>
              <button onClick={() => { setEditSalary(true); setSalaryInput(salary.toString()); }} style={{ marginLeft: "auto", background: "transparent", border: "none", cursor: "pointer", display: "flex" }}>
                <Edit3 size={13} color={muted} />
              </button>
            </div>
            {editSalary ? (
              <div style={{ display: "flex", gap: 8 }}>
                <input autoFocus type="number" value={salaryInput} onChange={e => setSalaryInput(e.target.value)} onKeyDown={e => e.key === "Enter" && saveSalary()} style={{ flex: 1, background: inputBg, border: `1px solid ${accent}`, borderRadius: 10, padding: "8px 12px", color: text, fontSize: 16, fontWeight: 700, outline: "none" }} />
                <button onClick={saveSalary} style={{ background: accent, border: "none", borderRadius: 10, padding: "8px 14px", cursor: "pointer", color: "#fff", fontSize: 13, fontWeight: 600 }}>Save</button>
              </div>
            ) : (
              <div style={{ fontSize: 28, fontWeight: 700, color: accent, fontVariantNumeric: "tabular-nums" }}>{fmtINR(salary)}</div>
            )}
            <div style={{ fontSize: 11, color: muted, marginTop: 4 }}>Take-home salary — tap ✎ to edit</div>
          </div>
          <MetricCard icon={surplus >= 0 ? TrendingUp : TrendingDown} label="Surplus / Deficit" value={fmtINR(surplus)} sub={surplus >= 0 ? "Positive cashflow" : "Budget exceeded"} color={surplus >= 0 ? "#10b981" : "#ef4444"} />
          <MetricCard icon={CheckCircle2} label="Settlement" value={`${settledPct}%`} sub={`${settledCount}/${allItems.length} items paid`} color="#6366f1" />
        </div>

        <Card style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <Target size={17} color={accent} />
            <h2 style={{ fontSize: 15, fontWeight: 700, color: text }}>Financial Matrix — 41:20:39 Rule</h2>
          </div>
          {[
            { label: "Needs / Debt", pct: needsPct, rule: RULE.needs, color: DONUT_COLORS.debt, amt: totalDebt, alert: needsAlert },
            { label: "Wants / Expenses", pct: wantsPct, rule: RULE.wants, color: DONUT_COLORS.expenses, amt: totalExpenses, alert: false },
            { label: "Investments", pct: investPct, rule: RULE.invest, color: DONUT_COLORS.investments, amt: totalInvestments, alert: investAlert },
          ].map(row => (
            <div key={row.label} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: row.color }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: text }}>{row.label}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 11, color: muted }}>Target: {row.rule}%</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: row.alert ? "#ef4444" : row.color, fontVariantNumeric: "tabular-nums" }}>{row.pct}%</span>
                </div>
              </div>
              <ProgressBar pct={row.pct} rule={row.rule} color={row.color} alertOn={row.alert} />
              <div style={{ fontSize: 11, color: muted, marginTop: 4, textAlign: "right" }}>{fmtINR(row.amt)}</div>
            </div>
          ))}
        </Card>

        <Card style={{ marginBottom: 16 }}>
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
                      {donutData.map((entry, i) => (
                        <Cell key={i} fill={[DONUT_COLORS.debt, DONUT_COLORS.expenses, DONUT_COLORS.investments][i]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => fmtINR(v)} contentStyle={{ background: surface2, border: `1px solid ${border}`, borderRadius: 12, fontSize: 12, color: text }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: "flex", justifyContent: "center", gap: 20, flexWrap: "wrap" }}>
                {[
                  { label: "Debt", color: DONUT_COLORS.debt, val: totalDebt },
                  { label: "Expenses", color: DONUT_COLORS.expenses, val: totalExpenses },
                  { label: "Investments", color: DONUT_COLORS.investments, val: totalInvestments },
                ].map(l => (
                  <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: l.color }} />
                    <span style={{ fontSize: 12, color: muted }}>{l.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: l.color }}>{fmtINR(l.val)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center", color: muted, fontSize: 13 }}>
              Add entries to see your allocation chart
            </div>
          )}
        </Card>

        <Card style={{ marginBottom: 16 }}>
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
                  <div style={{ fontSize: 11, color: accent, fontWeight: 700, marginBottom: 10, letterSpacing: "0.05em" }}>{label}</div>
                  <BenchmarkRow label="Needs" cur={needsPct} comp={comp.needs} field="needs" />
                  <BenchmarkRow label="Wants" cur={wantsPct} comp={comp.wants} field="wants" />
                  <BenchmarkRow label="Invest" cur={investPct} comp={comp.invest} field="invest" />
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 10, fontSize: 11, color: muted, textAlign: "center" }}>3-month and 6-month averages are simulated benchmarks</div>
        </Card>

        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
            <Wallet size={17} color={accent} />
            <h2 style={{ fontSize: 15, fontWeight: 700, color: text }}>Strategic Ledger</h2>
            <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: text }}>{fmtINR(totalCommitments)}</span>
          </div>
          <LedgerSection title="Credit Card / Debt" cat="debt" icon={CreditCard} color={DONUT_COLORS.debt} total={totalDebt} />
          <LedgerSection title="Other Expenses / Wants" cat="expenses" icon={Wallet} color={DONUT_COLORS.expenses} total={totalExpenses} />
          <LedgerSection title="Mandatory Investments" cat="investments" icon={Landmark} color={DONUT_COLORS.investments} total={totalInvestments} />
          <div style={{ borderTop: `1px solid ${border}`, paddingTop: 16, marginTop: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: muted }}>Settlement Progress</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#10b981" }}>{settledPct}%</span>
            </div>
            <div style={{ height: 8, background: dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)", borderRadius: 99, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${settledPct}%`, background: "linear-gradient(90deg, #10b981, #6366f1)", borderRadius: 99, transition: "width 0.6s cubic-bezier(.4,0,.2,1)" }} />
            </div>
          </div>
        </Card>

      </div>
    </div>
  );
}
