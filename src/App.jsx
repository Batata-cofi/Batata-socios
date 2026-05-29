import { useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from "recharts";

// ─── AUTH ─────────────────────────────────────────────────────────
const PASS = "Julia2420";

// ─── TOKENS ──────────────────────────────────────────────────────
const C = {
  bg: "#0c0a08", card: "#141210", card2: "#1c1916", border: "#2a2520",
  text: "#f5f0e8", textMuted: "#7a6e62", textDim: "#3a3028",
  accent: "#d4845a", accentDim: "#d4845a18",
  green: "#5a9e6a", greenDim: "#5a9e6a18",
  red: "#c05040", redDim: "#c0504018",
  yellow: "#c4900a", yellowDim: "#c4900a18",
  blue: "#4878a8", blueDim: "#4878a818",
  cream: "#f0e8d8",
};

// ─── GASTOS FIJOS INICIALES ───────────────────────────────────────
const GF_INIT = [
  { id:1,  concepto:"Sueldos empleados (blanco)", monto:1718776, cat:"Personal",   icon:"👥" },
  { id:2,  concepto:"Sueldos empleados (negro)",  monto:1088000, cat:"Personal",   icon:"👥" },
  { id:3,  concepto:"Cargas sociales",             monto:1246698, cat:"Personal",   icon:"📋" },
  { id:4,  concepto:"Aguinaldo (ahorro mensual)",  monto:350000,  cat:"Personal",   icon:"💰" },
  { id:5,  concepto:"Sindicatos",                  monto:279692,  cat:"Personal",   icon:"🤝" },
  { id:6,  concepto:"Autónomos",                   monto:62743,   cat:"Personal",   icon:"📄" },
  { id:7,  concepto:"Alquiler",                    monto:500000,  cat:"Estructura", icon:"🏠" },
  { id:8,  concepto:"Muni vía pública",            monto:242264,  cat:"Estructura", icon:"🏛️" },
  { id:9,  concepto:"Municipal / DDJJ",            monto:90355,   cat:"Estructura", icon:"📑" },
  { id:10, concepto:"Expensas",                    monto:36172,   cat:"Estructura", icon:"🏢" },
  { id:11, concepto:"Seguro",                      monto:61171,   cat:"Estructura", icon:"🛡️" },
  { id:12, concepto:"Luz",                         monto:417668,  cat:"Servicios",  icon:"💡" },
  { id:13, concepto:"Internet + software",         monto:126414,  cat:"Servicios",  icon:"🌐" },
  { id:14, concepto:"Desinfección",                monto:45000,   cat:"Servicios",  icon:"🧹" },
  { id:15, concepto:"TSG / Seg. e Higiene",        monto:142000,  cat:"Servicios",  icon:"⚠️" },
  { id:16, concepto:"Contador",                    monto:220000,  cat:"Admin",      icon:"📊" },
  { id:17, concepto:"Fudo (sistema)",              monto:73150,   cat:"Admin",      icon:"💻" },
  { id:18, concepto:"Tarjeta / Payway empresa",    monto:433155,  cat:"Admin",      icon:"💳" },
  { id:19, concepto:"Cuota financiación cargas",   monto:284693,  cat:"Admin",      icon:"📅" },
  { id:20, concepto:"IIBB",                        monto:170000,  cat:"Impuestos",  icon:"🧾" },
];

// ─── STOCK INICIAL ────────────────────────────────────────────────
const STOCK_INIT = [
  { item:"Café (granos)",    u:"kg",  stock:8,   min:5,  max:15,  consumo_dia:1.19, icon:"☕" },
  { item:"Leche entera",     u:"L",   stock:17,  min:20, max:60,  consumo_dia:6.87, icon:"🥛", alerta:true },
  { item:"Manteca 25kg",     u:"kg",  stock:20,  min:5,  max:25,  consumo_dia:0.32, icon:"🧈" },
  { item:"Harina 0000",      u:"kg",  stock:18,  min:5,  max:25,  consumo_dia:0.45, icon:"🌾" },
  { item:"Azúcar",           u:"kg",  stock:12,  min:5,  max:20,  consumo_dia:0.38, icon:"🍬" },
  { item:"Fécula mandioca",  u:"kg",  stock:15,  min:5,  max:25,  consumo_dia:0.61, icon:"🌿" },
  { item:"Medialunas",       u:"u",   stock:90,  min:50, max:180, consumo_dia:22,   icon:"🥐" },
  { item:"DDL Vacalin",      u:"kg",  stock:6,   min:3,  max:10,  consumo_dia:0.14, icon:"🍯" },
  { item:"Huevos",           u:"u",   stock:30,  min:20, max:60,  consumo_dia:3.4,  icon:"🥚" },
  { item:"Frambuesas",       u:"kg",  stock:1.5, min:1,  max:3,   consumo_dia:0.03, icon:"🫐" },
  { item:"Chocolate amargo", u:"kg",  stock:3,   min:2,  max:6,   consumo_dia:0.15, icon:"🍫" },
  { item:"Queso crema",      u:"kg",  stock:3,   min:1,  max:4,   consumo_dia:0.10, icon:"🧀" },
];

// ─── VENTAS MAYO 2026 ─────────────────────────────────────────────
const VENTAS = [
  {f:"01/05",d:"Jue",v:751400,t:44},{f:"02/05",d:"Vie",v:338500,t:19},
  {f:"05/05",d:"Lun",v:504500,t:35},{f:"06/05",d:"Mar",v:457100,t:32},
  {f:"07/05",d:"Mié",v:494900,t:25},{f:"08/05",d:"Jue",v:649500,t:45},
  {f:"09/05",d:"Vie",v:967500,t:54},{f:"10/05",d:"Sáb",v:355000,t:22},
  {f:"12/05",d:"Lun",v:644600,t:43},{f:"13/05",d:"Mar",v:625000,t:41},
  {f:"14/05",d:"Mié",v:427400,t:29},{f:"15/05",d:"Jue",v:586350,t:40},
  {f:"16/05",d:"Vie",v:796300,t:44},{f:"17/05",d:"Sáb",v:557800,t:31},
  {f:"19/05",d:"Lun",v:503900,t:38},{f:"20/05",d:"Mar",v:620200,t:47},
  {f:"21/05",d:"Mié",v:161100,t:13},
];

// ─── TOP PRODUCTOS ────────────────────────────────────────────────
const TOP_PRODS = [
  {nombre:"Latte",            u:282, cat:"Café",       rent:37.3},
  {nombre:"Flat White",       u:203, cat:"Café",       rent:34.1},
  {nombre:"Chipa",            u:143, cat:"Pastelería", rent:28.4},
  {nombre:"Cookie Frambuesa", u:125, cat:"Pastelería", rent:22.8},
  {nombre:"Medialunas",       u:117, cat:"Pastelería", rent:18.2},
  {nombre:"Cappuccino",       u:104, cat:"Café",       rent:32.5},
  {nombre:"Chipa prensado",   u:93,  cat:"Cocina",     rent:17.8},
  {nombre:"Cappu Doble",      u:83,  cat:"Café",       rent:33.8},
  {nombre:"Cookie Chocolate", u:83,  cat:"Pastelería", rent:12.9},
  {nombre:"Cookie Pistacho",  u:70,  cat:"Pastelería", rent:13.1},
  {nombre:"Alfanuí",          u:52,  cat:"Pastelería", rent:14.8},
  {nombre:"Americano",        u:52,  cat:"Café",       rent:38.2},
];

// ─── HELPERS ──────────────────────────────────────────────────────
const fmt  = n => `$${Math.round(Math.abs(n)).toLocaleString("es-AR")}`;
const fmtK = n => Math.abs(n) >= 1000000
  ? `$${(Math.abs(n)/1000000).toFixed(2)}M`
  : `$${Math.round(Math.abs(n)).toLocaleString("es-AR")}`;

// ─── COMPONENTES BASE ─────────────────────────────────────────────
const KPI = ({ label, value, sub, color, size="md" }) => (
  <div style={{ background:C.card, borderRadius:10, padding:"14px 16px", border:`1px solid ${C.border}` }}>
    <div style={{ fontSize:10, color:C.textMuted, marginBottom:4, letterSpacing:".04em" }}>{label}</div>
    <div style={{ fontSize: size==="lg"?22:size==="sm"?14:18, fontWeight:700, color:color||C.text }}>{value}</div>
    {sub && <div style={{ fontSize:10, color:C.textMuted, marginTop:3 }}>{sub}</div>}
  </div>
);

const Pill = ({ label, color }) => (
  <span style={{ fontSize:10, padding:"2px 8px", borderRadius:20, background:`${color}22`, color, border:`1px solid ${color}44`, fontWeight:600 }}>
    {label}
  </span>
);

const SectionHead = ({ title, sub }) => (
  <div style={{ marginBottom:20 }}>
    <div style={{ fontSize:16, fontWeight:700, color:C.text }}>{title}</div>
    {sub && <div style={{ fontSize:11, color:C.textMuted, marginTop:3 }}>{sub}</div>}
  </div>
);

// ─── LOGIN ────────────────────────────────────────────────────────
function Login({ onLogin }) {
  const [pass, setPass] = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  const handle = () => {
    if (pass === PASS) { onLogin(); }
    else {
      setError(true); setShake(true);
      setTimeout(()=>setShake(false), 400);
      setTimeout(()=>setError(false), 2000);
    }
  };

  return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"Georgia, serif" }}>
      <style>{`
        @keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-8px)} 75%{transform:translateX(8px)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        .login-card { animation: fadeUp .5s ease forwards; }
        .login-in:focus { border-color: ${C.accent} !important; outline:none; }
        .login-btn:hover { background: #e09468 !important; }
      `}</style>
      <div className="login-card" style={{ width:320, animation: shake?"shake .4s ease":undefined }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ fontSize:42, fontWeight:700, color:C.accent, letterSpacing:"-2px", lineHeight:1 }}>batata</div>
          <div style={{ fontSize:11, color:C.textMuted, marginTop:6, letterSpacing:"4px", textTransform:"uppercase" }}>panel de socios</div>
        </div>
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:"28px 24px" }}>
          <div style={{ fontSize:12, color:C.textMuted, marginBottom:16 }}>Acceso privado — solo socios</div>
          <input className="login-in" type="password" placeholder="Contraseña"
            value={pass} onChange={e=>setPass(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&handle()}
            style={{ width:"100%", padding:"11px 14px", background:C.bg, border:`1px solid ${error?"#c05040":C.border}`, borderRadius:8, color:C.text, fontSize:14, transition:"border-color .2s", marginBottom: error?6:14 }}
          />
          {error && <div style={{ fontSize:11, color:C.red, marginBottom:10 }}>Contraseña incorrecta</div>}
          <button className="login-btn" onClick={handle}
            style={{ width:"100%", padding:11, background:C.accent, border:"none", borderRadius:8, color:"#fff", fontSize:14, fontWeight:600, cursor:"pointer", transition:"background .2s" }}>
            Ingresar
          </button>
        </div>
        <div style={{ textAlign:"center", marginTop:14, fontSize:10, color:C.textDim }}>Batata © 2026 · Uso interno</div>
      </div>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────
function Dashboard({ onLogout }) {
  const [tab, setTab] = useState("inicio");
  const [stock, setStock] = useState(STOCK_INIT);
  const [editandoStock, setEditandoStock] = useState(false);
  const [gf, setGf] = useState(GF_INIT);
  const [editandoGF, setEditandoGF] = useState(false);
  const [saldos, setSaldos] = useState({ mp:1107900, bbva:115229, ef:600000 });
  const [editandoSaldos, setEditandoSaldos] = useState(false);

  const totalGF   = gf.reduce((s,g)=>s+g.monto, 0);
  const provMes   = 4500000;
  const ventas    = VENTAS.reduce((s,d)=>s+d.v, 0);
  const diasOp    = 16;
  const promDia   = Math.round(ventas / diasOp);
  const proyMes   = promDia * 24;
  const resultado = proyMes - totalGF - provMes;
  const stockBajo = stock.filter(s => s.stock < s.min);
  const totalCaja = saldos.mp + saldos.bbva + saldos.ef;

  const TABS = [
    { id:"inicio",    label:"Inicio",    icon:"◈" },
    { id:"ventas",    label:"Ventas",    icon:"↗" },
    { id:"caja",      label:"Caja",      icon:"💰" },
    { id:"stock",     label:"Stock",     icon:"▦" },
    { id:"menu",      label:"Menú",      icon:"◉" },
    { id:"resultado", label:"Resultado", icon:"∑" },
    { id:"config",    label:"Config",    icon:"⚙" },
  ];

  const tabStyle = (id) => ({
    padding:"7px 13px", cursor:"pointer", fontSize:11, fontWeight: tab===id?700:500,
    color: tab===id ? C.accent : C.textMuted,
    background: tab===id ? C.accentDim : "transparent",
    border:"none", borderRadius:6, transition:"all .15s",
  });

  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.text, fontFamily:"Georgia, serif", padding:"0 0 40px" }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        .section { animation: fadeUp .25s ease forwards; }
        input[type=number]:focus { outline:none; border-color:${C.accent} !important; }
        input[type=number] { -moz-appearance:textfield; }
        input[type=number]::-webkit-outer-spin-button,
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance:none; margin:0; }
        ::-webkit-scrollbar { width:4px; height:4px; }
        ::-webkit-scrollbar-track { background:${C.bg}; }
        ::-webkit-scrollbar-thumb { background:${C.border}; border-radius:2px; }
      `}</style>

      {/* HEADER */}
      <div style={{ background:C.card, borderBottom:`1px solid ${C.border}`, padding:"0 20px", position:"sticky", top:0, zIndex:100 }}>
        <div style={{ maxWidth:960, margin:"0 auto" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 0 8px" }}>
            <div style={{ fontSize:22, fontWeight:700, color:C.accent, letterSpacing:"-1px" }}>batata</div>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              {stockBajo.length > 0 && (
                <span style={{ fontSize:10, padding:"3px 8px", background:C.redDim, color:C.red, borderRadius:20, border:`1px solid ${C.red}44` }}>
                  ⚠️ {stockBajo.length} stock bajo
                </span>
              )}
              <button onClick={onLogout} style={{ fontSize:10, color:C.textMuted, background:"none", border:"none", cursor:"pointer", padding:"4px 8px" }}>
                salir
              </button>
            </div>
          </div>
          <div style={{ display:"flex", gap:4, overflowX:"auto", paddingBottom:8 }}>
            {TABS.map(t => (
              <button key={t.id} onClick={()=>setTab(t.id)} style={tabStyle(t.id)}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div style={{ maxWidth:960, margin:"0 auto", padding:"24px 20px" }}>

        {/* ══════════════════════════ INICIO ══════════════════════════ */}
        {tab === "inicio" && (
          <div className="section">
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:13, color:C.textMuted }}>Mayo 2026 · {diasOp} días operados</div>
              <div style={{ fontSize:24, fontWeight:700, marginTop:2 }}>¿Cómo vamos hoy?</div>
            </div>

            {/* KPIs principales */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:10, marginBottom:16 }}>
              <KPI label="Ventas acumuladas"  value={fmtK(ventas)}    sub={`${diasOp} días`}             color={C.green}  />
              <KPI label="Proyección del mes" value={fmtK(proyMes)}   sub="a promedio actual"            color={C.text}   />
              <KPI label="Ticket promedio"    value={fmt(Math.round(ventas/VENTAS.reduce((s,d)=>s+d.t,0)))} sub="obj: $13.000" color={C.accent} />
              <KPI label="Resultado est."     value={fmtK(resultado)} sub="ventas − GF − prov"           color={resultado>0?C.green:C.red} />
            </div>

            {/* Alerta leche */}
            <div style={{ background:`${C.yellow}15`, border:`1px solid ${C.yellow}44`, borderRadius:10, padding:"12px 16px", marginBottom:16, display:"flex", alignItems:"center", gap:10 }}>
              <span style={{ fontSize:18 }}>🥛</span>
              <div>
                <div style={{ fontWeight:700, color:C.yellow, fontSize:12 }}>Leche: cada entrega dura 2.5 días</div>
                <div style={{ fontSize:11, color:C.textMuted, marginTop:2 }}>Serenísima entrega 17L · consumo real 6.87L/día · recomendado pedir 22L por entrega</div>
              </div>
            </div>

            {/* Gráfico ventas */}
            <div style={{ background:C.card, borderRadius:12, padding:"18px 16px", border:`1px solid ${C.border}`, marginBottom:16 }}>
              <div style={{ fontSize:12, fontWeight:600, marginBottom:14, color:C.text }}>Ventas diarias — Mayo 2026</div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={VENTAS} margin={{top:0,right:0,bottom:0,left:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                  <XAxis dataKey="f" tick={{fontSize:9, fill:C.textMuted}} tickLine={false} axisLine={false} />
                  <YAxis tick={{fontSize:9, fill:C.textMuted}} tickLine={false} axisLine={false} tickFormatter={v=>`$${Math.round(v/1000)}k`} />
                  <Tooltip formatter={(v)=>[fmt(v),"Ventas"]} labelStyle={{color:C.text}} contentStyle={{background:C.card2,border:`1px solid ${C.border}`,borderRadius:8,fontSize:11}} />
                  <Bar dataKey="v" radius={[4,4,0,0]}>
                    {VENTAS.map((d,i)=>(
                      <Cell key={i} fill={d.d==="Sáb"||d.d==="Dom"?C.accent:C.blue} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div style={{ display:"flex", gap:16, marginTop:8 }}>
                <span style={{ fontSize:10, color:C.textMuted, display:"flex", alignItems:"center", gap:4 }}><span style={{ width:10, height:10, borderRadius:2, background:C.blue, display:"inline-block" }}/> Semana</span>
                <span style={{ fontSize:10, color:C.textMuted, display:"flex", alignItems:"center", gap:4 }}><span style={{ width:10, height:10, borderRadius:2, background:C.accent, display:"inline-block" }}/> Fin de semana</span>
              </div>
            </div>

            {/* Top 5 productos */}
            <div style={{ background:C.card, borderRadius:12, padding:"18px 16px", border:`1px solid ${C.border}` }}>
              <div style={{ fontSize:12, fontWeight:600, marginBottom:12 }}>Top 5 más vendidos esta semana</div>
              {TOP_PRODS.slice(0,5).map((p,i) => {
                const catC = p.cat==="Café"?C.blue:p.cat==="Pastelería"?C.accent:C.green;
                const rentC = p.rent>30?C.green:p.rent>20?C.yellow:C.red;
                return (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"8px 0", borderBottom: i<4?`1px solid ${C.border}22`:undefined }}>
                    <span style={{ fontSize:16, fontWeight:800, color:C.textDim, width:20 }}>{i+1}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:600, fontSize:12 }}>{p.nombre}</div>
                      <div style={{ fontSize:10, color:catC, marginTop:1 }}>{p.cat} · {p.u} unidades</div>
                    </div>
                    <Pill label={`${p.rent}%`} color={rentC} />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══════════════════════════ VENTAS ══════════════════════════ */}
        {tab === "ventas" && (
          <div className="section">
            <SectionHead title="Ventas y productos" sub="Mayo 2026 · datos reales Fudo · 22 días" />

            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:10, marginBottom:20 }}>
              <KPI label="Total acumulado"   value={fmtK(ventas)}                                          color={C.green} />
              <KPI label="Promedio diario"   value={fmt(promDia)}                                           color={C.text} />
              <KPI label="Proyección mayo"   value={fmtK(proyMes)}                                          color={C.accent} />
              <KPI label="Ticket promedio"   value={fmt(Math.round(ventas/VENTAS.reduce((s,d)=>s+d.t,0)))} color={C.text} />
              <KPI label="Transacciones"     value={VENTAS.reduce((s,d)=>s+d.t,0)}                         color={C.text} />
            </div>

            <div style={{ background:C.card, borderRadius:12, padding:"18px 16px", border:`1px solid ${C.border}`, marginBottom:16 }}>
              <div style={{ fontSize:12, fontWeight:600, marginBottom:14 }}>Evolución de ventas</div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={VENTAS} margin={{top:0,right:0,bottom:0,left:0}}>
                  <defs>
                    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={C.accent} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={C.accent} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                  <XAxis dataKey="f" tick={{fontSize:9,fill:C.textMuted}} tickLine={false} axisLine={false} />
                  <YAxis tick={{fontSize:9,fill:C.textMuted}} tickLine={false} axisLine={false} tickFormatter={v=>`$${Math.round(v/1000)}k`} />
                  <Tooltip formatter={v=>[fmt(v),"Ventas"]} contentStyle={{background:C.card2,border:`1px solid ${C.border}`,borderRadius:8,fontSize:11}} />
                  <Area type="monotone" dataKey="v" stroke={C.accent} fill="url(#grad)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div style={{ background:C.card, borderRadius:12, padding:"18px 16px", border:`1px solid ${C.border}` }}>
              <div style={{ fontSize:12, fontWeight:600, marginBottom:14 }}>Ranking de productos — Mayo 2026</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:8 }}>
                {TOP_PRODS.map((p,i) => {
                  const catC = p.cat==="Café"?C.blue:p.cat==="Pastelería"?C.accent:C.green;
                  const rentC = p.rent>30?C.green:p.rent>20?C.yellow:C.red;
                  return (
                    <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", background:C.card2, borderRadius:8, border:`1px solid ${C.border}` }}>
                      <span style={{ fontSize:14, fontWeight:800, color:C.textDim, width:22, textAlign:"center" }}>{i+1}</span>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:600, fontSize:12 }}>{p.nombre}</div>
                        <div style={{ fontSize:10, color:catC, marginTop:1 }}>{p.u} uds · {p.cat}</div>
                      </div>
                      <Pill label={`${p.rent}%`} color={rentC} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════ CAJA ══════════════════════════ */}
        {tab === "caja" && (
          <div className="section">
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <SectionHead title="Caja real" sub="Saldos + compromisos + proyección" />
              <button onClick={()=>setEditandoSaldos(!editandoSaldos)} style={{ padding:"6px 14px", fontSize:11, borderRadius:6, border:`1px solid ${editandoSaldos?C.accent:C.border}`, background:editandoSaldos?C.accentDim:C.card, color:editandoSaldos?C.accent:C.textMuted, cursor:"pointer" }}>
                {editandoSaldos?"✓ Guardar":"✏️ Actualizar saldos"}
              </button>
            </div>

            {editandoSaldos && (
              <div style={{ background:C.card, border:`1px solid ${C.yellow}44`, borderRadius:10, padding:"14px 16px", marginBottom:16 }}>
                <div style={{ fontSize:10, color:C.yellow, marginBottom:12, fontWeight:600, letterSpacing:".05em", textTransform:"uppercase" }}>Actualizar saldos</div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
                  {[{k:"mp",l:"Mercado Pago"},{k:"bbva",l:"BBVA"},{k:"ef",l:"Efectivo"}].map(f=>(
                    <div key={f.k}>
                      <div style={{ fontSize:10, color:C.textMuted, marginBottom:4 }}>{f.l}</div>
                      <input type="number" value={saldos[f.k]}
                        onChange={e=>setSaldos({...saldos,[f.k]:Number(e.target.value)})}
                        style={{ width:"100%", padding:"8px 10px", fontSize:13, background:C.bg, border:`1px solid ${C.border}`, borderRadius:6, color:C.text }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:10, marginBottom:16 }}>
              <KPI label="Mercado Pago"    value={fmt(saldos.mp)}    sub="disponible ya"        color={C.text}  />
              <KPI label="BBVA"            value={fmt(saldos.bbva)}  sub="disponible ya"        color={C.text}  />
              <KPI label="Efectivo"        value={fmt(saldos.ef)}    sub="en caja"              color={C.text}  />
              <KPI label="TOTAL EN MANO"   value={fmt(totalCaja)}    sub="suma de las tres"     color={C.green} />
              <KPI label="Comprometido"    value={fmt(1596698)}      sub="cargas + aguinaldo"   color={C.red}   />
              <KPI label="PLATA LIBRE"     value={fmt(totalCaja-1596698)} sub="en mano − comprometido" color={totalCaja-1596698>0?C.green:C.red} />
            </div>

            <div style={{ background:C.redDim, borderRadius:10, padding:"12px 16px", border:`1px solid ${C.red}44`, marginBottom:12 }}>
              <div style={{ fontWeight:700, color:C.red, fontSize:12, marginBottom:4 }}>⚡ Urgente esta semana</div>
              <div style={{ fontSize:11, color:C.text }}>Cargas sociales $1.246.698 + Aguinaldo ahorro $350.000 = <strong>$1.596.698</strong> vencen el 22/05</div>
            </div>

            <div style={{ background:C.yellowDim, borderRadius:10, padding:"12px 16px", border:`1px solid ${C.yellow}44`, marginBottom:16 }}>
              <div style={{ fontWeight:700, color:C.yellow, fontSize:12, marginBottom:4 }}>📅 Próximo mes</div>
              <div style={{ fontSize:11, color:C.text }}>Alyser $81.544 vence 28/05 · Alyser $389.404 vence 08/06 · Sueldos empleados ~$2.8M el 10/06</div>
            </div>

            <div style={{ background:C.card, borderRadius:12, padding:"18px 16px", border:`1px solid ${C.border}` }}>
              <div style={{ fontSize:12, fontWeight:600, marginBottom:12 }}>Origen del dinero</div>
              {[
                {l:"Efectivo + Transferencias", v:saldos.ef,    note:"disponible ahora",    c:C.green},
                {l:"Mercado Pago",              v:saldos.mp,    note:"acredita en 24-48hs", c:C.blue},
                {l:"PedidosYa + Big Box",       v:378000,       note:"acredita a 15 días",  c:C.yellow},
              ].map((item,i)=>(
                <div key={i} style={{ marginBottom: i<2?14:0 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                    <span style={{ fontSize:12 }}>{item.l}</span>
                    <span style={{ fontWeight:700, color:item.c }}>{fmt(item.v)}</span>
                  </div>
                  <div style={{ height:5, background:C.card2, borderRadius:3, overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${Math.min(item.v/totalCaja*100,100)}%`, background:item.c, borderRadius:3, transition:"width .5s" }}/>
                  </div>
                  <div style={{ fontSize:10, color:C.textMuted, marginTop:3 }}>{item.note}</div>
                </div>
              ))}
            </div>

            <div style={{ marginTop:12, padding:"10px 14px", background:C.blueDim, borderRadius:8, fontSize:11, color:C.textMuted, border:`1px solid ${C.blue}22` }}>
              🔌 API Mercado Pago · API Fudo (1/6) · BBVA — cuando estén conectadas el tablero se actualiza solo.
            </div>
          </div>
        )}

        {/* ══════════════════════════ STOCK ══════════════════════════ */}
        {tab === "stock" && (
          <div className="section">
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <SectionHead title="Control de stock" sub="Insumos clave · consumo calculado con ventas reales" />
              <button onClick={()=>setEditandoStock(!editandoStock)} style={{ padding:"6px 14px", fontSize:11, borderRadius:6, border:`1px solid ${editandoStock?C.accent:C.border}`, background:editandoStock?C.accentDim:C.card, color:editandoStock?C.accent:C.textMuted, cursor:"pointer" }}>
                {editandoStock?"✓ Listo":"✏️ Actualizar stock"}
              </button>
            </div>

            {stockBajo.length > 0 && (
              <div style={{ background:C.redDim, borderRadius:10, padding:"12px 16px", border:`1px solid ${C.red}44`, marginBottom:16 }}>
                <div style={{ fontWeight:700, color:C.red, marginBottom:6 }}>⚠️ Stock bajo mínimo</div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                  {stockBajo.map((s,i) => <Pill key={i} label={`${s.icon} ${s.item}: ${s.stock}${s.u}`} color={C.red} />)}
                </div>
              </div>
            )}

            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))", gap:12 }}>
              {stock.map((s,i) => {
                const pct = Math.min(100,(s.stock/s.max)*100);
                const dias = s.consumo_dia>0 ? Math.round(s.stock/s.consumo_dia) : 99;
                const col = s.stock<s.min ? C.red : s.stock<s.min*1.5 ? C.yellow : C.green;
                return (
                  <div key={i} style={{ background:C.card, borderRadius:10, padding:16, border:`1px solid ${s.stock<s.min?C.red+"66":C.border}` }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                      <div>
                        <div style={{ fontWeight:700, fontSize:13 }}>{s.icon} {s.item}</div>
                        <div style={{ fontSize:10, color:C.textMuted, marginTop:2 }}>Dura ~{dias}d · mín {s.min}{s.u}</div>
                      </div>
                      {editandoStock ? (
                        <input type="number" step="0.5" value={s.stock}
                          onChange={e=>setStock(stock.map((x,j)=>j===i?{...x,stock:Number(e.target.value)}:x))}
                          style={{ width:70, padding:"4px 8px", fontSize:15, fontWeight:700, background:C.bg, border:`1px solid ${C.accent}`, borderRadius:6, color:col, textAlign:"center" }}
                        />
                      ) : (
                        <span style={{ fontSize:22, fontWeight:800, color:col }}>{s.stock}</span>
                      )}
                    </div>
                    <div style={{ height:6, background:C.card2, borderRadius:3, overflow:"hidden" }}>
                      <div style={{ height:"100%", width:`${pct}%`, background:col, borderRadius:3, transition:"width .3s" }}/>
                    </div>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:C.textMuted, marginTop:5 }}>
                      <span>0</span>
                      <span style={{ color:col }}>{s.stock} {s.u}</span>
                      <span>{s.max}</span>
                    </div>
                    {s.alerta && (
                      <div style={{ fontSize:10, color:C.yellow, marginTop:8, padding:"4px 8px", background:C.yellowDim, borderRadius:6 }}>
                        ⚠️ Recomendado pedir 22L por entrega (dura 2.5 días)
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══════════════════════════ MENÚ ══════════════════════════ */}
        {tab === "menu" && (
          <div className="section">
            <SectionHead title="Ingeniería de menú" sub="Decisiones de carta basadas en rentabilidad y volumen real" />

            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:12, marginBottom:20 }}>
              {[
                { title:"⭐ Potenciar", color:C.green, items:["Suaave — 51.4% rent","Jugo Naranja — 44.9% rent","Pomelada — 49.3% rent","Americano — 38.2% rent","Cappuccino — 32.5% · 104 uds"] },
                { title:"↑ Subir precio", color:C.yellow, items:["Flat White $5.800 → $6.500","Chipa $4.000 → $4.500","Tostón Palta $10.000 → $11.500","Cookie Pistacho → $4.600","Tostado JyQ → $10.000"] },
                { title:"✕ Fuera de carta", color:C.red, items:["Tostón Berenjena ✓ descont.","Tropitonic ✓ descont.","Tostada saludable → pronto","Sandwich Bondio → pronto","Sandwich Veggie → pronto"] },
              ].map((col,i) => (
                <div key={i} style={{ background:`${col.color}10`, borderRadius:10, padding:16, border:`1px solid ${col.color}33` }}>
                  <div style={{ fontWeight:700, color:col.color, marginBottom:10 }}>{col.title}</div>
                  {col.items.map((item,j) => (
                    <div key={j} style={{ fontSize:11, color:C.text, padding:"5px 0", borderBottom: j<col.items.length-1?`1px solid ${C.border}22`:undefined }}>
                      · {item}
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div style={{ background:C.card, borderRadius:12, padding:"18px 16px", border:`1px solid ${C.border}` }}>
              <div style={{ fontSize:12, fontWeight:600, marginBottom:14 }}>Todos los productos — rentabilidad real</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:8 }}>
                {TOP_PRODS.map((p,i) => {
                  const catC = p.cat==="Café"?C.blue:p.cat==="Pastelería"?C.accent:C.green;
                  const rentC = p.rent>30?C.green:p.rent>20?C.yellow:C.red;
                  return (
                    <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", background:C.card2, borderRadius:8 }}>
                      <span style={{ fontSize:14, fontWeight:800, color:C.textDim, width:22, textAlign:"center" }}>{i+1}</span>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:600, fontSize:12 }}>{p.nombre}</div>
                        <div style={{ fontSize:10, color:catC, marginTop:1 }}>{p.u} uds · {p.cat}</div>
                      </div>
                      <Pill label={`${p.rent}%`} color={rentC} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════ RESULTADO ══════════════════════════ */}
        {tab === "resultado" && (
          <div className="section">
            <SectionHead title="Resultado del mes" sub="P&L proyectado · Mayo 2026" />

            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:10, marginBottom:20 }}>
              <KPI label="Facturación proy."    value={fmtK(proyMes)}   color={C.green}  />
              <KPI label="Gastos fijos"          value={fmtK(totalGF)}   color={C.red}    />
              <KPI label="Proveedores est."      value={fmtK(provMes)}   color={C.yellow} />
              <KPI label="Resultado operativo"   value={fmtK(resultado)} color={resultado>0?C.green:C.red} size="lg" />
            </div>

            <div style={{ background:C.card, borderRadius:12, padding:"18px 16px", border:`1px solid ${C.border}`, marginBottom:16 }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                <tbody>
                  <tr>
                    <td style={{ padding:"8px 0", color:C.text }}>Facturación proyectada</td>
                    <td style={{ padding:"8px 0", textAlign:"right", fontWeight:700, color:C.green }}>{fmt(proyMes)}</td>
                    <td style={{ padding:"8px 0", textAlign:"right", color:C.textMuted, fontSize:10 }}>100%</td>
                  </tr>
                  <tr>
                    <td style={{ padding:"8px 0", color:C.text }}>− Materia prima / Proveedores</td>
                    <td style={{ padding:"8px 0", textAlign:"right", color:C.red }}>−{fmt(provMes)}</td>
                    <td style={{ padding:"8px 0", textAlign:"right", color:C.textMuted, fontSize:10 }}>{(provMes/proyMes*100).toFixed(1)}%</td>
                  </tr>
                  <tr>
                    <td style={{ padding:"8px 0", color:C.text }}>− Gastos fijos</td>
                    <td style={{ padding:"8px 0", textAlign:"right", color:C.red }}>−{fmt(totalGF)}</td>
                    <td style={{ padding:"8px 0", textAlign:"right", color:C.textMuted, fontSize:10 }}>{(totalGF/proyMes*100).toFixed(1)}%</td>
                  </tr>
                  <tr style={{ borderTop:`1px solid ${C.border}` }}>
                    <td style={{ padding:"10px 0", fontWeight:700, color:C.text }}>Resultado operativo</td>
                    <td style={{ padding:"10px 0", textAlign:"right", fontWeight:700, fontSize:15, color:resultado>0?C.green:C.red }}>{resultado>0?"+":"-"}{fmt(resultado)}</td>
                    <td style={{ padding:"10px 0", textAlign:"right", color:resultado>0?C.green:C.red, fontSize:11 }}>{(resultado/proyMes*100).toFixed(1)}%</td>
                  </tr>
                  <tr>
                    <td style={{ padding:"8px 0", color:C.textMuted, fontSize:11 }}>− Sueldo socios (plan)</td>
                    <td style={{ padding:"8px 0", textAlign:"right", color:C.textMuted }}>−{fmt(1000000)}</td>
                    <td style={{ padding:"8px 0", textAlign:"right", color:C.textMuted, fontSize:10 }}></td>
                  </tr>
                  <tr style={{ borderTop:`1px solid ${C.border}` }}>
                    <td style={{ padding:"10px 0", fontWeight:700 }}>Resultado neto</td>
                    <td style={{ padding:"10px 0", textAlign:"right", fontWeight:700, color:(resultado-1000000)>0?C.green:C.red }}>{fmt(resultado-1000000)}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{ background:C.accentDim, borderRadius:10, padding:"14px 16px", border:`1px solid ${C.accent}44` }}>
              <div style={{ fontWeight:700, color:C.accent, marginBottom:6, fontSize:12 }}>Plan sueldo socios</div>
              <div style={{ fontSize:11, color:C.text, lineHeight:1.7 }}>
                Fijo: <strong>$500.000 c/u el 1ro de cada mes</strong> · Sostenible en todos los meses históricos<br/>
                Bono: 50% del margen sobrante a fin de mes · En meses buenos puede llegar a $1.4M c/u<br/>
                Junio es el mes más flojo del año — el fijo está asegurado pero el bono va a ser mínimo.
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════ CONFIG ══════════════════════════ */}
        {tab === "config" && (
          <div className="section">
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <SectionHead title="⚙️ Configuración" sub="Gastos fijos · se actualizan mes a mes" />
              <button onClick={()=>setEditandoGF(!editandoGF)} style={{ padding:"7px 16px", fontSize:11, borderRadius:6, border:`1px solid ${editandoGF?C.accent:C.border}`, background:editandoGF?C.accentDim:C.card, color:editandoGF?C.accent:C.textMuted, cursor:"pointer", fontWeight:600 }}>
                {editandoGF?"✓ Guardar cambios":"✏️ Editar gastos fijos"}
              </button>
            </div>

            {editandoGF && (
              <div style={{ background:C.yellowDim, border:`1px solid ${C.yellow}44`, borderRadius:8, padding:"10px 14px", marginBottom:16, fontSize:11, color:C.yellow }}>
                💡 Tocá el monto de cualquier ítem para actualizarlo. Los cambios se reflejan en tiempo real en todo el tablero.
              </div>
            )}

            {/* Total */}
            <div style={{ background:C.card, borderRadius:10, padding:"14px 16px", border:`1px solid ${C.border}`, marginBottom:16, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ fontSize:10, color:C.textMuted, marginBottom:2 }}>TOTAL GASTOS FIJOS MENSUALES</div>
                <div style={{ fontSize:22, fontWeight:700, color:C.red }}>{fmt(totalGF)}</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:10, color:C.textMuted, marginBottom:2 }}>% de facturación (proyectado)</div>
                <div style={{ fontSize:16, fontWeight:700, color:(totalGF/proyMes)>0.52?C.red:C.yellow }}>{(totalGF/proyMes*100).toFixed(1)}%</div>
              </div>
            </div>

            {/* Gastos agrupados por categoría */}
            {["Personal","Estructura","Servicios","Admin","Impuestos"].map(cat => {
              const items = gf.filter(g=>g.cat===cat);
              const totalCat = items.reduce((s,g)=>s+g.monto,0);
              const catColors = { Personal:C.blue, Estructura:C.accent, Servicios:C.green, Admin:C.yellow, Impuestos:C.red };
              const col = catColors[cat] || C.text;
              return (
                <div key={cat} style={{ marginBottom:16 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                    <span style={{ fontWeight:700, color:col, fontSize:12 }}>{cat}</span>
                    <span style={{ fontSize:11, color:C.textMuted }}>{fmt(totalCat)}</span>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:8 }}>
                    {items.map((g,i) => (
                      <div key={i} style={{ background:C.card, borderRadius:10, padding:"12px 14px", border:`1px solid ${C.border}`, display:"flex", alignItems:"center", gap:12 }}>
                        <span style={{ fontSize:20, flexShrink:0 }}>{g.icon}</span>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:11, color:C.textMuted, marginBottom:4, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{g.concepto}</div>
                          {editandoGF ? (
                            <input type="number" value={g.monto}
                              onChange={e=>setGf(gf.map(x=>x.id===g.id?{...x,monto:Number(e.target.value)}:x))}
                              style={{ width:"100%", padding:"6px 8px", fontSize:14, fontWeight:700, background:C.bg, border:`1px solid ${C.accent}`, borderRadius:6, color:col }}
                            />
                          ) : (
                            <div style={{ fontSize:15, fontWeight:700, color:col }}>{fmt(g.monto)}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────
export default function App() {
  const [logged, setLogged] = useState(false);
  return logged
    ? <Dashboard onLogout={()=>setLogged(false)} />
    : <Login onLogin={()=>setLogged(true)} />;
}
