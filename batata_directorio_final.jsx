import { useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine
} from "recharts";

// ─── TOKENS ──────────────────────────────────────────────────────
const C = {
  bg: "#0c0a08", card: "#141210", card2: "#1c1916", border: "#2a2520",
  text: "#f5f0e8", textMuted: "#7a6e62", textDim: "#3a3028",
  accent: "#d4845a", accentDim: "#d4845a18",
  green: "#5a9e6a", greenDim: "#5a9e6a18",
  red: "#c05040", redDim: "#c0504018",
  yellow: "#c4900a", yellowDim: "#c4900a18",
  blue: "#4878a8", blueDim: "#4878a818",
  purple: "#8858a8", purpleDim: "#8858a818",
  gold: "#b8922a",
};

// ─── DATOS FINALES VERIFICADOS ────────────────────────────────────

// Gastos fijos COMPLETOS (base de conocimiento + correcciones)
const GASTOS_FIJOS = [
  { concepto: "Sueldos empleados (blanco)", monto: 1734672, cat: "Personal" },
  { concepto: "Sueldos empleados (negro)", monto: 1056128, cat: "Personal" },
  { concepto: "Cargas sociales", monto: 1246698, cat: "Personal" },
  { concepto: "Aguinaldo (ahorro mensual)", monto: 350000, cat: "Personal" },
  { concepto: "Sindicatos", monto: 142240, cat: "Personal" },
  { concepto: "Autónomos", monto: 62743, cat: "Personal" },
  { concepto: "Alquiler", monto: 500000, cat: "Estructura" },
  { concepto: "Muni uso vía pública", monto: 242264, cat: "Estructura" },
  { concepto: "Municipal / DDJJ", monto: 90355, cat: "Estructura" },
  { concepto: "Expensas", monto: 36172, cat: "Estructura" },
  { concepto: "Seguro", monto: 61171, cat: "Estructura" },
  { concepto: "Luz", monto: 417668, cat: "Servicios" },
  { concepto: "Internet", monto: 53264, cat: "Servicios" },
  { concepto: "Desinfección", monto: 45000, cat: "Servicios" },
  { concepto: "Seguridad e higiene", monto: 142000, cat: "Servicios" },
  { concepto: "Contador", monto: 220000, cat: "Admin" },
  { concepto: "Software / Fudo", monto: 73150, cat: "Admin" },
  { concepto: "Tarjeta / Payway", monto: 299181, cat: "Admin" },
  { concepto: "Cuota financiación cargas", monto: 284693, cat: "Admin" },
  { concepto: "IVA gastos fijos (estimado)", monto: 370000, cat: "Impuestos" },
];
const TOTAL_GF = GASTOS_FIJOS.reduce((s, g) => s + g.monto, 0); // ~$6.627.399 + $370k IVA

// Proveedores principales
const PROV_MES = 4500000;

// Sueldo socios: lo que sobra (variable)
const SUELDO_SOCIOS_EST = 800000; // conservador — lo que sobra en mes normal

// Mayo 2026 — datos reales Fudo
const MAYO = {
  facturado: 5773200,       // lo que va del mes (10 días)
  dias_operados: 10,
  dias_mes: 26,
  txns: 359,
  ticket: 16081,
  ticket_obj: 13000,
};
const PROM_DIA = MAYO.facturado / MAYO.dias_operados; // 577.320
const PROYECCION = PROM_DIA * MAYO.dias_mes;           // ~15.010.320
const RESULTADO_BRUTO = PROYECCION - PROV_MES - TOTAL_GF;
const RESULTADO_NETO = RESULTADO_BRUTO - SUELDO_SOCIOS_EST;

// Ventas diarias reales
const VENTAS = [
  { f: "14/04", d: "Mar", v: 522400, t: 35 },
  { f: "15/04", d: "Mié", v: 579800, t: 41 },
  { f: "16/04", d: "Jue", v: 471000, t: 38 },
  { f: "17/04", d: "Vie", v: 603300, t: 42 },
  { f: "18/04", d: "Sáb", v: 876500, t: 46 },
  { f: "19/04", d: "Dom", v: 391600, t: 22 },
  { f: "21/04", d: "Mar", v: 609600, t: 45 },
  { f: "22/04", d: "Mié", v: 736300, t: 45 },
  { f: "23/04", d: "Jue", v: 774300, t: 59 },
  { f: "24/04", d: "Vie", v: 596100, t: 42 },
  { f: "25/04", d: "Sáb", v: 883000, t: 47 },
  { f: "26/04", d: "Dom", v: 486600, t: 27 },
  { f: "28/04", d: "Mar", v: 516600, t: 39 },
  { f: "29/04", d: "Mié", v: 630800, t: 48 },
  { f: "30/04", d: "Jue", v: 624700, t: 37 },
  { f: "02/05", d: "Sáb", v: 751400, t: 44 },
  { f: "03/05", d: "Dom", v: 338500, t: 19 },
  { f: "05/05", d: "Mar", v: 504500, t: 35 },
  { f: "06/05", d: "Mié", v: 457100, t: 32 },
  { f: "07/05", d: "Jue", v: 494900, t: 25 },
  { f: "08/05", d: "Vie", v: 649500, t: 45 },
  { f: "09/05", d: "Sáb", v: 967500, t: 54 },
  { f: "10/05", d: "Dom", v: 355000, t: 22 },
  { f: "12/05", d: "Mar", v: 644600, t: 43 },
  { f: "13/05", d: "Mié", v: 610200, t: 40 },
];

const VENTAS_HORA = [
  { h: "8h", v: 339500 }, { h: "9h", v: 486000 }, { h: "10h", v: 1401100 },
  { h: "11h", v: 1281300 }, { h: "12h", v: 861700 }, { h: "13h", v: 931000 },
  { h: "14h", v: 353600 }, { h: "15h", v: 532000 }, { h: "16h", v: 2326800 },
  { h: "17h", v: 3721800 }, { h: "18h", v: 2575700 }, { h: "19h", v: 265300 },
];

// Deudas
const DEUDAS = [
  { concepto: "Sueldos socios no cobrados", monto: 24136000, prioridad: "baja", nota: "Acreedores propios — no urgente" },
  { concepto: "Proveedores pendientes", monto: 1010000, prioridad: "alta", nota: "Regularizar primero — riesgo de corte" },
  { concepto: "Seguridad e higiene", monto: 360000, prioridad: "media", nota: "Regularizar en 2-3 cuotas" },
];

// Stock
const STOCK = [
  { item: "Café (granos)", u: "kg", stock: 8, min: 5, max: 15 },
  { item: "Leche entera", u: "lts", stock: 40, min: 30, max: 80 },
  { item: "Leche almendras", u: "lts", stock: 6, min: 8, max: 20 },
  { item: "Chocolate blanco", u: "kg", stock: 3, min: 2, max: 6 },
  { item: "Chocolate negro", u: "kg", stock: 2, min: 2, max: 5 },
  { item: "Manteca", u: "kg", stock: 4, min: 3, max: 8 },
  { item: "Pistacho", u: "kg", stock: 1.5, min: 2, max: 4 },
  { item: "Aceite oliva", u: "lts", stock: 3, min: 2, max: 5 },
  { item: "Medialunas", u: "doc", stock: 8, min: 10, max: 20 },
  { item: "Frutos rojos", u: "kg", stock: 3, min: 2, max: 6 },
];

// Semana del mes
const DIA_HOY = 14;
const SEMANA_ACTUAL = DIA_HOY <= 7 ? 1 : DIA_HOY <= 14 ? 2 : DIA_HOY <= 21 ? 3 : 4;
const ES_SEM3 = SEMANA_ACTUAL === 3;

// ─── HELPERS ─────────────────────────────────────────────────────
const fmt = n => `$${Math.round(Math.abs(n)).toLocaleString("es-AR")}`;
const fmtM = n => `$${(Math.abs(n) / 1000000).toFixed(2)}M`;
const fmtK = n => Math.abs(n) >= 1000000 ? fmtM(n) : `$${Math.round(Math.abs(n)).toLocaleString("es-AR")}`;
const pctOf = (a, b) => ((a / b) * 100).toFixed(1) + "%";

const semColor = (s) => s === 1 ? C.green : s === 2 ? C.blue : s === 3 ? C.yellow : C.accent;

// ─── SUB-COMPONENTS ───────────────────────────────────────────────
const KPI = ({ label, value, sub, color, size = "md" }) => (
  <div style={{
    background: C.card, borderRadius: 10, padding: size === "lg" ? "20px 22px" : "14px 16px",
    border: `1px solid ${C.border}`, display: "flex", flexDirection: "column", gap: 4,
  }}>
    <div style={{ fontSize: 9, color: C.textMuted, textTransform: "uppercase", letterSpacing: 2, fontWeight: 700 }}>{label}</div>
    <div style={{ fontSize: size === "lg" ? 28 : 18, fontWeight: 800, color: color || C.text, letterSpacing: -1, lineHeight: 1 }}>{value}</div>
    {sub && <div style={{ fontSize: 10, color: C.textMuted, marginTop: 2 }}>{sub}</div>}
  </div>
);

const Pill = ({ label, color }) => (
  <span style={{
    fontSize: 9, fontWeight: 800, padding: "2px 8px", borderRadius: 20,
    background: `${color}20`, color, border: `1px solid ${color}44`,
    letterSpacing: 1, textTransform: "uppercase", whiteSpace: "nowrap",
  }}>{label}</span>
);

const Semaforo = ({ tipo, msg }) => {
  const col = tipo === "ok" ? C.green : tipo === "warn" ? C.yellow : C.red;
  return (
    <div style={{
      display: "flex", gap: 10, alignItems: "center", padding: "9px 14px",
      background: `${col}10`, borderRadius: 7, border: `1px solid ${col}30`,
    }}>
      <div style={{ width: 7, height: 7, borderRadius: "50%", background: col, flexShrink: 0, boxShadow: `0 0 6px ${col}` }} />
      <span style={{ fontSize: 12, color: C.text, lineHeight: 1.4 }}>{msg}</span>
    </div>
  );
};

const TT = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: C.card2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", fontSize: 11 }}>
      <div style={{ fontWeight: 700, color: C.accent, marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || C.text }}>{p.name}: {p.value > 1000 ? fmt(p.value) : p.value}</div>
      ))}
    </div>
  );
};

const SectionHead = ({ title, sub }) => (
  <div style={{ marginBottom: 20, paddingBottom: 12, borderBottom: `1px solid ${C.border}` }}>
    <h2 style={{ fontSize: 17, fontWeight: 800, margin: 0, letterSpacing: -0.3 }}>{title}</h2>
    {sub && <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>{sub}</div>}
  </div>
);

// ─── APP ─────────────────────────────────────────────────────────
export default function BatataDashboard() {
  const [tab, setTab] = useState("inicio");

  const tabs = [
    { id: "inicio", label: "Inicio", icon: "◈" },
    { id: "resultado", label: "Resultado", icon: "▣" },
    { id: "proyeccion", label: "Proyección", icon: "◆" },
    { id: "stock", label: "Stock", icon: "▤" },
    { id: "menu", label: "Menú", icon: "◉" },
    { id: "marketing", label: "Marketing", icon: "◎" },
    { id: "deudas", label: "Deudas", icon: "▽" },
    { id: "implementacion", label: "Implementación", icon: "◧" },
  ];

  const alertas = [
    {
      tipo: MAYO.ticket >= MAYO.ticket_obj ? "ok" : "warn",
      msg: `Ticket promedio mayo: ${fmt(MAYO.ticket)} ${MAYO.ticket >= MAYO.ticket_obj ? "✓ por encima del objetivo" : "— obj: " + fmt(MAYO.ticket_obj)}`
    },
    {
      tipo: ES_SEM3 ? "warn" : "ok",
      msg: `Semana ${SEMANA_ACTUAL} del mes ${ES_SEM3 ? "⚠ Semana floja histórica — activar plan anti-caída" : "— ritmo normal"}`
    },
    {
      tipo: (PROV_MES / PROYECCION) > 0.28 ? "warn" : "ok",
      msg: `Proveedores/Facturación estimado: ${pctOf(PROV_MES, PROYECCION)} — meta <28%`
    },
    {
      tipo: (TOTAL_GF / PROYECCION) > 0.52 ? "danger" : "warn",
      msg: `Gastos fijos/Facturación: ${pctOf(TOTAL_GF, PROYECCION)} — meta <52%`
    },
    {
      tipo: STOCK.filter(s => s.stock < s.min).length > 0 ? "danger" : "ok",
      msg: `Stock: ${STOCK.filter(s => s.stock < s.min).length} insumos bajo mínimo — ${STOCK.filter(s => s.stock < s.min).map(s => s.item).join(", ") || "todo OK"}`
    },
  ];

  return (
    <div style={{ background: C.bg, color: C.text, minHeight: "100vh", fontFamily: "'DM Sans', sans-serif", fontSize: 13 }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&family=DM+Mono:wght@500;600&display=swap" rel="stylesheet" />

      {/* ── HEADER ── */}
      <div style={{ background: C.card, borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 28px", display: "flex", alignItems: "center", height: 54, gap: 32 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: C.accent, letterSpacing: -0.5 }}>BATATA</span>
            <span style={{ fontSize: 10, color: C.textMuted, letterSpacing: 2, textTransform: "uppercase" }}>socios</span>
          </div>
          <div style={{ display: "flex", gap: 2, overflowX: "auto", flex: 1 }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                padding: "6px 14px", cursor: "pointer", fontSize: 11, fontWeight: tab === t.id ? 700 : 500,
                color: tab === t.id ? C.accent : C.textMuted,
                background: tab === t.id ? C.accentDim : "transparent",
                border: "none", borderRadius: 6, whiteSpace: "nowrap", transition: "all 0.15s",
                display: "flex", alignItems: "center", gap: 5,
              }}>
                <span style={{ fontSize: 10, opacity: 0.7 }}>{t.icon}</span> {t.label}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 10, color: C.textMuted, flexShrink: 0, fontFamily: "'DM Mono'" }}>
            {ES_SEM3 && <span style={{ color: C.yellow, fontWeight: 700, marginRight: 8 }}>SEM·3</span>}
            14·05·2026
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "28px 28px" }}>

        {/* ══════════════════════════════════════════════════════════
            INICIO
        ══════════════════════════════════════════════════════════ */}
        {tab === "inicio" && (
          <>
            <SectionHead title="Panel de control" sub="Datos reales de Fudo · Mayo 2026 · Actualizado al 13/05" />

            {/* KPIs principales */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
              <KPI size="lg" label="Facturado mayo" value={fmtM(MAYO.facturado)} sub={`${MAYO.dias_operados} días · ${MAYO.txns} tickets`} color={C.accent} />
              <KPI size="lg" label="Proyección del mes" value={fmtM(PROYECCION)} sub={`a ${MAYO.dias_mes} días hábiles`} color={C.blue} />
              <KPI size="lg" label="Ticket promedio" value={fmt(MAYO.ticket)} sub={`objetivo: ${fmt(MAYO.ticket_obj)}`} color={MAYO.ticket >= MAYO.ticket_obj ? C.green : C.yellow} />
              <KPI size="lg" label="Resultado proyectado" value={fmtM(RESULTADO_NETO)} sub="neto después de GF + socios" color={RESULTADO_NETO >= 0 ? C.green : C.red} />
            </div>

            {/* Alertas */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>Panel de alertas</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {alertas.map((a, i) => <Semaforo key={i} tipo={a.tipo} msg={a.msg} />)}
              </div>
            </div>

            {/* Gráficos */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
              <div style={{ background: C.card, borderRadius: 12, padding: 20, border: `1px solid ${C.border}` }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 16 }}>Ventas diarias — Abr/May 2026</div>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={VENTAS}>
                    <defs>
                      <linearGradient id="gv" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={C.accent} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={C.accent} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                    <XAxis dataKey="f" tick={{ fill: C.textMuted, fontSize: 8 }} />
                    <YAxis tick={{ fill: C.textMuted, fontSize: 8 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip content={<TT />} />
                    <ReferenceLine y={PROM_DIA} stroke={C.blue} strokeDasharray="4 4" />
                    <Area type="monotone" dataKey="v" name="Ventas" stroke={C.accent} fill="url(#gv)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
                <div style={{ fontSize: 10, color: C.textMuted, marginTop: 6 }}>Línea punteada = promedio diario {fmt(PROM_DIA)}</div>
              </div>

              <div style={{ background: C.card, borderRadius: 12, padding: 20, border: `1px solid ${C.border}` }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 16 }}>Ventas por hora</div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={VENTAS_HORA}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                    <XAxis dataKey="h" tick={{ fill: C.textMuted, fontSize: 8 }} />
                    <YAxis hide />
                    <Tooltip content={<TT />} formatter={v => fmt(v)} />
                    <Bar dataKey="v" name="Ventas" radius={[3, 3, 0, 0]}>
                      {VENTAS_HORA.map((h, i) => (
                        <Cell key={i} fill={h.v >= 2500000 ? C.accent : h.v >= 1200000 ? C.yellow : C.blue} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div style={{ fontSize: 10, color: C.textMuted, marginTop: 6 }}>Tarde 16-18hs = 57% facturación diaria</div>
              </div>
            </div>

            {/* Acciones del día */}
            <div style={{ background: C.card, borderRadius: 12, padding: 20, border: `1px solid ${C.border}`, marginTop: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>Acciones esta semana</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[
                  { a: "Subir precio Chipá → $4.500 y Flat White → $6.500", u: "esta semana", c: C.yellow },
                  { a: "Ofrecer leche de almendras en cada café con leche", u: "hoy", c: C.green },
                  { a: ES_SEM3 ? "Semana 3: Rol de Canela 2x1 en pizarra" : "Combo tardecita en pizarra desde las 16hs", u: ES_SEM3 ? "sem 3 activa" : "diario", c: ES_SEM3 ? C.red : C.accent },
                  { a: "Subir precio Tostón Palta → $11.500", u: "esta semana", c: C.yellow },
                  { a: "Eliminar de carta: Té Blanco, Alfajor Nevado, Medialu. Capresse", u: "urgente", c: C.red },
                  { a: "Responder DMs de Instagram en menos de 2 horas", u: "diario", c: C.purple },
                ].map((a, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "9px 14px", background: C.card2, borderRadius: 8, borderLeft: `3px solid ${a.c}`, gap: 12 }}>
                    <span style={{ fontSize: 12, lineHeight: 1.4 }}>{a.a}</span>
                    <Pill label={a.u} color={a.c} />
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ══════════════════════════════════════════════════════════
            RESULTADO
        ══════════════════════════════════════════════════════════ */}
        {tab === "resultado" && (
          <>
            <SectionHead title="Estado de resultado" sub="Proyección mayo 2026 basada en ritmo real de los primeros 10 días" />

            {/* Estado de resultado */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
              <div style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden" }}>
                <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}`, fontWeight: 700, fontSize: 13 }}>
                  Estado de resultado proyectado
                </div>
                <div style={{ padding: 20 }}>
                  {[
                    { c: "(+) Facturación proyectada", v: PROYECCION, col: C.green, bold: false },
                    { c: "(-) Materia prima / Proveedores", v: -PROV_MES, col: C.red, bold: false, sub: pctOf(PROV_MES, PROYECCION) + " de facturación · meta <28%" },
                    { c: "(-) Gastos fijos totales", v: -TOTAL_GF, col: C.red, bold: false, sub: pctOf(TOTAL_GF, PROYECCION) + " de facturación · meta <52%" },
                    { c: "(=) Resultado antes socios", v: RESULTADO_BRUTO, col: RESULTADO_BRUTO >= 0 ? C.green : C.red, bold: true },
                    { c: "(-) Sueldos socios (lo que sobra)", v: -SUELDO_SOCIOS_EST, col: C.textMuted, bold: false, sub: "variable — conservador" },
                    { c: "(=) RESULTADO NETO", v: RESULTADO_NETO, col: RESULTADO_NETO >= 0 ? C.green : C.red, bold: true },
                  ].map((r, i) => (
                    <div key={i} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                      padding: "11px 0", borderBottom: i < 5 ? `1px solid ${C.border}22` : undefined,
                    }}>
                      <div>
                        <div style={{ fontSize: r.bold ? 13 : 12, fontWeight: r.bold ? 700 : 400, color: r.bold ? C.text : C.textMuted }}>{r.c}</div>
                        {r.sub && <div style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>{r.sub}</div>}
                      </div>
                      <span style={{ fontFamily: "'DM Mono'", fontWeight: r.bold ? 800 : 600, fontSize: r.bold ? 16 : 13, color: r.col, flexShrink: 0, marginLeft: 12 }}>
                        {r.v >= 0 ? "+" : ""}{fmtM(r.v)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Gastos por categoría */}
              <div style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden" }}>
                <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}`, fontWeight: 700, fontSize: 13 }}>
                  Gastos fijos — {fmtM(TOTAL_GF)}/mes
                </div>
                <div style={{ padding: 20 }}>
                  {["Personal", "Estructura", "Servicios", "Admin", "Impuestos"].map(cat => {
                    const total = GASTOS_FIJOS.filter(g => g.cat === cat).reduce((s, g) => s + g.monto, 0);
                    const catCol = { Personal: C.red, Estructura: C.yellow, Servicios: C.blue, Admin: C.purple, Impuestos: C.accent }[cat];
                    return (
                      <div key={cat} style={{ marginBottom: 14 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: catCol }}>{cat}</span>
                          <span style={{ fontFamily: "'DM Mono'", fontSize: 11, fontWeight: 700 }}>{fmtK(total)}</span>
                        </div>
                        <div style={{ height: 5, background: C.border, borderRadius: 3 }}>
                          <div style={{ width: `${(total / TOTAL_GF) * 100}%`, height: "100%", background: catCol, borderRadius: 3 }} />
                        </div>
                        <div style={{ marginTop: 6 }}>
                          {GASTOS_FIJOS.filter(g => g.cat === cat).map((g, j) => (
                            <div key={j} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0",
                              fontSize: 10, color: C.textMuted, borderBottom: `1px solid ${C.border}11` }}>
                              <span>{g.concepto}</span>
                              <span style={{ fontFamily: "'DM Mono'" }}>{fmt(g.monto)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ══════════════════════════════════════════════════════════
            PROYECCIÓN
        ══════════════════════════════════════════════════════════ */}
        {tab === "proyeccion" && (
          <>
            <SectionHead title="Proyección y escenarios" sub="Basado en ritmo real de mayo 2026" />

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
              <KPI label="Promedio diario real" value={fmt(PROM_DIA)} sub="mayo 2026" color={C.accent} />
              <KPI label="Proyección del mes" value={fmtM(PROYECCION)} sub={`${MAYO.dias_mes} días`} color={C.blue} />
              <KPI label="Break-even mensual" value={fmtM(PROV_MES + TOTAL_GF)} sub="para no perder" color={C.yellow} />
              <KPI label="Gap al objetivo" value={fmtM(Math.abs(18000000 - PROYECCION))} sub="vs meta $18M" color={PROYECCION >= 18000000 ? C.green : C.red} />
            </div>

            {/* Semanas del mes */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
              {[1, 2, 3, 4].map(sem => {
                const dias = sem === 4 ? 9 : sem === 3 ? 5 : 6;
                const mult = sem === 3 ? 0.85 : 1;
                const fact = PROM_DIA * dias * mult;
                const esActual = sem === SEMANA_ACTUAL;
                const col = semColor(sem);
                return (
                  <div key={sem} style={{
                    background: esActual ? `${col}14` : C.card, borderRadius: 12, padding: 18,
                    border: `2px solid ${esActual ? col : C.border}`,
                  }}>
                    <div style={{ fontSize: 9, fontWeight: 800, color: col, letterSpacing: 2, marginBottom: 6 }}>
                      SEMANA {sem} {esActual ? "← ACTUAL" : ""} {sem === 3 ? "⚠ FLOJA" : ""}
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: sem === 3 ? C.yellow : C.text }}>{fmtM(fact)}</div>
                    <div style={{ fontSize: 10, color: C.textMuted, marginTop: 4 }}>{dias} días hábiles</div>
                    {sem === 3 && (
                      <div style={{ marginTop: 8, fontSize: 10, color: C.yellow, lineHeight: 1.5,
                        padding: "6px 8px", background: C.yellowDim, borderRadius: 6 }}>
                        Activar plan anti-caída semana 3
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Escenarios */}
            <div style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}`, fontWeight: 700, fontSize: 13 }}>
                Tabla de escenarios
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, fontFamily: "'DM Mono'" }}>
                <thead>
                  <tr style={{ background: C.card2 }}>
                    {["Escenario", "Facturación", "Proveedores", "Gastos fijos", "Res. antes socios", "Res. neto socios", "Estado"].map(h => (
                      <th key={h} style={{ padding: "10px 14px", textAlign: h === "Escenario" ? "left" : "right",
                        color: C.textMuted, fontWeight: 600, fontSize: 10 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: "Pesimista (−15%)", mult: 0.85 },
                    { label: "Ritmo actual (mayo)", mult: PROYECCION / 18000000 },
                    { label: "Objetivo $18M", mult: 1 },
                    { label: "Optimista (+10%)", mult: 1.1 },
                  ].map((sc, i) => {
                    const f = 18000000 * sc.mult;
                    const p = f * 0.276;
                    const rb = f - p - TOTAL_GF;
                    const rn = rb - SUELDO_SOCIOS_EST;
                    const isActual = i === 1;
                    return (
                      <tr key={i} style={{ borderBottom: `1px solid ${C.border}18`, background: isActual ? `${C.accent}08` : "transparent" }}>
                        <td style={{ padding: "10px 14px", fontWeight: isActual ? 700 : 400, color: isActual ? C.accent : C.text }}>{sc.label}</td>
                        <td style={{ padding: "10px 14px", textAlign: "right" }}>{fmtM(f)}</td>
                        <td style={{ padding: "10px 14px", textAlign: "right", color: C.textMuted }}>{fmtM(p)}</td>
                        <td style={{ padding: "10px 14px", textAlign: "right", color: C.textMuted }}>{fmtM(TOTAL_GF)}</td>
                        <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 600, color: rb >= 0 ? C.green : C.red }}>{fmtM(rb)}</td>
                        <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 700, color: rn >= 0 ? C.green : C.red }}>{fmtM(rn)}</td>
                        <td style={{ padding: "10px 14px", textAlign: "right" }}>
                          <Pill label={rn >= 0 ? "POSITIVO" : "NEGATIVO"} color={rn >= 0 ? C.green : C.red} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ══════════════════════════════════════════════════════════
            STOCK
        ══════════════════════════════════════════════════════════ */}
        {tab === "stock" && (
          <>
            <SectionHead title="Control de stock" sub="Insumos clave — actualizar semanalmente (5 minutos)" />

            {STOCK.filter(s => s.stock < s.min).length > 0 && (
              <div style={{ background: C.redDim, borderRadius: 10, padding: "12px 16px",
                border: `1px solid ${C.red}44`, marginBottom: 16, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontWeight: 700, color: C.red, fontSize: 13 }}>🚨 COMPRAR YA:</span>
                {STOCK.filter(s => s.stock < s.min).map((s, i) => (
                  <Pill key={i} label={`${s.item} · ${s.stock}${s.u} (mín ${s.min})`} color={C.red} />
                ))}
              </div>
            )}

            <div style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden", marginBottom: 16 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: C.card2 }}>
                    {["Insumo", "Unidad", "Stock actual", "Mínimo", "Máximo", "Nivel", "Estado"].map(h => (
                      <th key={h} style={{ padding: "11px 14px", textAlign: h === "Insumo" ? "left" : "center",
                        color: C.textMuted, fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.8 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {STOCK.map((s, i) => {
                    const pct = Math.min(100, (s.stock / s.max) * 100);
                    const bajo = s.stock < s.min;
                    const atencion = s.stock < s.min * 1.3;
                    const col = bajo ? C.red : atencion ? C.yellow : C.green;
                    return (
                      <tr key={i} style={{ borderBottom: `1px solid ${C.border}18`, background: bajo ? `${C.red}06` : "transparent" }}>
                        <td style={{ padding: "10px 14px", fontWeight: 600 }}>{s.item}</td>
                        <td style={{ padding: "10px 14px", textAlign: "center", color: C.textMuted, fontFamily: "'DM Mono'" }}>{s.u}</td>
                        <td style={{ padding: "10px 14px", textAlign: "center", fontFamily: "'DM Mono'", fontWeight: 700, color: col }}>{s.stock}</td>
                        <td style={{ padding: "10px 14px", textAlign: "center", fontFamily: "'DM Mono'", color: C.textMuted }}>{s.min}</td>
                        <td style={{ padding: "10px 14px", textAlign: "center", fontFamily: "'DM Mono'", color: C.textMuted }}>{s.max}</td>
                        <td style={{ padding: "10px 14px" }}>
                          <div style={{ width: "80%", margin: "0 auto", height: 6, background: C.border, borderRadius: 3 }}>
                            <div style={{ width: `${pct}%`, height: "100%", background: col, borderRadius: 3, transition: "width 0.3s" }} />
                          </div>
                        </td>
                        <td style={{ padding: "10px 14px", textAlign: "center" }}>
                          <Pill label={bajo ? "PEDIR" : atencion ? "ATENCIÓN" : "OK"} color={col} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ background: C.card, borderRadius: 12, padding: 20, border: `1px solid ${C.yellowDim}` }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: C.yellow, marginBottom: 12 }}>Rutina semanal de stock — 5 minutos</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                {[
                  { dia: "Lunes", items: ["Café, leche entera, manteca"] },
                  { dia: "Miércoles", items: ["Frutos rojos, pistacho, chocolate"] },
                  { dia: "Viernes", items: ["Todo — antes del fin de semana"] },
                ].map((r, i) => (
                  <div key={i} style={{ padding: "12px 14px", background: C.card2, borderRadius: 8, borderTop: `3px solid ${C.yellow}` }}>
                    <div style={{ fontWeight: 700, color: C.yellow, marginBottom: 6 }}>{r.dia}</div>
                    {r.items.map((item, j) => <div key={j} style={{ fontSize: 11, color: C.textMuted }}>→ {item}</div>)}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ══════════════════════════════════════════════════════════
            MENÚ
        ══════════════════════════════════════════════════════════ */}
        {tab === "menu" && (
          <>
            <SectionHead title="Ingeniería de menú" sub="Decisiones de carta basadas en rentabilidad y volumen real" />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
              <div style={{ background: C.greenDim, borderRadius: 10, padding: "14px 16px", border: `1px solid ${C.green}44` }}>
                <div style={{ fontWeight: 700, color: C.green, marginBottom: 8 }}>⭐ POTENCIAR</div>
                {["Rol de Canela (85.6% rent · 12 vtas)", "Cheesecake (65.6% rent)", "Suaave (51.4% rent)", "S. Mortadela (35.3% rent · mejor cocina)", "Jugo Naranja (44.9% · 70 vtas)", "Pomelada (49.3% rent)"].map((p, i) => (
                  <div key={i} style={{ fontSize: 11, color: C.text, padding: "4px 0", borderBottom: i < 5 ? `1px solid ${C.border}22` : undefined }}>· {p}</div>
                ))}
              </div>
              <div style={{ background: C.yellowDim, borderRadius: 10, padding: "14px 16px", border: `1px solid ${C.yellow}44` }}>
                <div style={{ fontWeight: 700, color: C.yellow, marginBottom: 8 }}>↑ SUBIR PRECIO — +$784K/mes</div>
                {[
                  "Flat White $5.800 → $6.500",
                  "Chipá $4.000 → $4.500",
                  "Tostón Palta $10.000 → $11.500",
                  "Cookie Pistacho $4.100 → $4.600",
                  "Cookie Choco $5.100 → $5.600",
                  "Tostado JyQ $8.500 → $10.000",
                  "Medialu. JyQ $9.500 → $11.000",
                  "Cappu Doble $6.000 → $6.800",
                ].map((p, i) => (
                  <div key={i} style={{ fontSize: 11, color: C.text, padding: "4px 0", borderBottom: i < 7 ? `1px solid ${C.border}22` : undefined }}>· {p}</div>
                ))}
              </div>
              <div style={{ background: C.redDim, borderRadius: 10, padding: "14px 16px", border: `1px solid ${C.red}44` }}>
                <div style={{ fontWeight: 700, color: C.red, marginBottom: 8 }}>✕ ELIMINAR DE CARTA</div>
                {["Té Blanco (1 venta/mes)", "Alfajor Nevado (11.2% rent · 14 vtas)", "Medialu. Capresse (9 vtas · 11.6%)"].map((p, i) => (
                  <div key={i} style={{ fontSize: 11, color: C.text, padding: "4px 0", borderBottom: i < 2 ? `1px solid ${C.border}22` : undefined }}>· {p}</div>
                ))}
                <div style={{ fontWeight: 700, color: C.purple, marginBottom: 8, marginTop: 16 }}>💬 VENTA SUGESTIVA</div>
                {["Almendras en todo café con leche (+$900)", "Cookie/alfajor con cada espresso", "Combo tardecita de tarde", "Tortas al cierre de mesa"].map((p, i) => (
                  <div key={i} style={{ fontSize: 11, color: C.text, padding: "4px 0", borderBottom: i < 3 ? `1px solid ${C.border}22` : undefined }}>· {p}</div>
                ))}
              </div>
            </div>

            {/* Guiones */}
            <div style={{ background: C.card, borderRadius: 12, padding: 20, border: `1px solid ${C.border}` }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>Guiones de venta sugestiva — equipo</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { trigger: "Pide Flat White o Latte", guion: "¿Con algo dulce? Tenemos cookies de frambuesa recién hechas.", impacto: "+$4.100", color: C.accent },
                  { trigger: "Pide café con leche", guion: "¿Lo querés con leche de almendras? Queda mucho mejor — son $900 más.", impacto: "+$900 +rent", color: C.yellow },
                  { trigger: "Mesa de tarde (16hs+)", guion: "¿Querían ver el combo tardecita? Dos cafés, un salado y dos pastelerías — $26.000 la mesa.", impacto: "+ticket mesa", color: C.purple },
                  { trigger: "Pide algo de cocina", guion: "¿Arrancan con algo dulce? El Rol de Canela está buenísimo — $3.500.", impacto: "+$3.500 / 85% rent", color: C.green },
                  { trigger: "Cierre de tarde", guion: "¿Cierran con algo? Tenemos cheesecake de frutos rojos y la vasca de DDL.", impacto: "+$8.000 / 65% rent", color: C.green },
                ].map((g, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "180px 1fr auto", gap: 16, alignItems: "center",
                    padding: "11px 16px", background: C.card2, borderRadius: 8, borderLeft: `3px solid ${g.color}` }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: g.color }}>{g.trigger}</div>
                    <div style={{ fontSize: 12, fontStyle: "italic" }}>"{g.guion}"</div>
                    <Pill label={g.impacto} color={C.green} />
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ══════════════════════════════════════════════════════════
            MARKETING
        ══════════════════════════════════════════════════════════ */}
        {tab === "marketing" && (
          <>
            <SectionHead title="Estrategia de marketing" sub="Instagram · batata.cofi · 5.860 seguidores · Mayo 2026" />

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
              <KPI label="Seguidores" value="5.860" sub="meta: +200/mes orgánico" color={C.accent} />
              <KPI label="Frecuencia" value="3 posts/sem" sub="+ 2 stories por día" color={C.purple} />
              <KPI label="Semana actual" value={`Sem ${SEMANA_ACTUAL}`} sub={ES_SEM3 ? "⚠ Activar plan" : "Ritmo normal"} color={semColor(SEMANA_ACTUAL)} />
              <KPI label="Próxima activación" value="Influencer" sub="1 por trimestre" color={C.blue} />
            </div>

            {ES_SEM3 && (
              <div style={{ background: C.yellowDim, borderRadius: 10, padding: "12px 16px", border: `1px solid ${C.yellow}44`, marginBottom: 16 }}>
                <div style={{ fontWeight: 700, color: C.yellow, marginBottom: 8 }}>⚠️ SEMANA 3 — Plan anti-caída</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {["Rol de Canela 2x1 en pizarra (mié y jue)", "Especiales al frente: Cappu MDQ, Dame Números, Chocolate Caliente",
                    "Historia de Instagram mié/jue con foto + precio", "Ofrecer combo tardecita activamente desde las 15hs"].map((a, i) => (
                    <div key={i} style={{ fontSize: 11, display: "flex", gap: 8 }}>
                      <span style={{ color: C.yellow }}>→</span><span>{a}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden" }}>
                <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}`, fontWeight: 700, fontSize: 13 }}>
                  Calendario semanal tipo
                </div>
                {[
                  { dia: "LUN", items: ["Story: horario de la semana + especial del día"] },
                  { dia: "MAR", items: ["POST: foto producto estrella", "Story: detrás de escena mañana"] },
                  { dia: "MIÉ", items: ["Story: combo tardecita / promo sem 3"] },
                  { dia: "JUE", items: ["POST: equipo / socios / UGC", "Story: dato de producto"] },
                  { dia: "VIE", items: ["POST: ambiente / interior del local", "Story: sábado te espera"] },
                  { dia: "SÁB", items: ["Story 10hs: mostrador del día", "Story 16hs: local en movimiento"] },
                  { dia: "DOM", items: ["POST: proceso artesanal / cultura café"] },
                ].map((d, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "48px 1fr", borderBottom: `1px solid ${C.border}18` }}>
                    <div style={{ padding: "10px 0 10px 16px", fontWeight: 800, fontSize: 10,
                      color: d.dia === "SÁB" ? C.accent : C.textMuted, display: "flex", alignItems: "center" }}>{d.dia}</div>
                    <div style={{ padding: "10px 16px 10px 0" }}>
                      {d.items.map((item, j) => (
                        <div key={j} style={{ fontSize: 11, color: C.text, padding: "2px 0" }}>· {item}</div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ background: C.card, borderRadius: 12, padding: 18, border: `1px solid ${C.border}` }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>Reglas del copy</div>
                  {[
                    "Precio siempre visible en posts de producto",
                    "Máximo 3 líneas en caption",
                    "Nunca: 'delicioso', 'imperdible', 'no te lo pierdas'",
                    "Responder comentarios en menos de 60 min",
                    "Repostear todo UGC bueno en stories",
                    "Foto de personas → 2-4x más engagement",
                  ].map((r, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, fontSize: 11, padding: "5px 0",
                      borderBottom: i < 5 ? `1px solid ${C.border}18` : undefined, color: C.textMuted }}>
                      <span style={{ color: C.accent }}>→</span>{r}
                    </div>
                  ))}
                </div>

                <div style={{ background: C.card, borderRadius: 12, padding: 18, border: `1px solid ${C.border}` }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>Concepto estratégico</div>
                  <div style={{ fontSize: 14, fontStyle: "italic", color: C.text, lineHeight: 1.7,
                    borderLeft: `3px solid ${C.accent}`, paddingLeft: 14, marginBottom: 12 }}>
                    "Batata no es el mejor café de Avellaneda. Es el lugar al que volvés."
                  </div>
                  <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.6 }}>
                    No se dice calidad — se muestra calidez. El cliente percibe la calidad solo cuando el producto aparece en pantalla.
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ══════════════════════════════════════════════════════════
            DEUDAS
        ══════════════════════════════════════════════════════════ */}
        {tab === "deudas" && (
          <>
            <SectionHead title="Gestión de deudas" sub="Prioridades claras para normalizar la situación financiera" />

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 20 }}>
              {DEUDAS.map((d, i) => {
                const col = d.prioridad === "alta" ? C.red : d.prioridad === "media" ? C.yellow : C.blue;
                return (
                  <div key={i} style={{ background: C.card, borderRadius: 12, padding: 20, border: `2px solid ${col}44` }}>
                    <div style={{ fontSize: 9, fontWeight: 800, color: col, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>
                      Prioridad {d.prioridad}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{d.concepto}</div>
                    <div style={{ fontFamily: "'DM Mono'", fontSize: 22, fontWeight: 800, color: col, marginBottom: 8 }}>{fmtM(d.monto)}</div>
                    <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.5 }}>{d.nota}</div>
                  </div>
                );
              })}
            </div>

            <div style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}`, fontWeight: 700, fontSize: 13 }}>
                Plan de recupero — en fases
              </div>
              <div style={{ padding: 20, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
                {[
                  { fase: "Fase 1 · Mayo–Jun", color: C.yellow, acciones: ["Estabilizar flujo operativo", "Pagar proveedores al día desde ya", "No generar nueva deuda", "Seg. e higiene: plan 3 cuotas de $120K"] },
                  { fase: "Fase 2 · Jul–Sep", color: C.blue, acciones: ["Flujo estable → iniciar recupero socios", "$800K/mes adicional a deuda socios", "Reducir deuda socios en ~$2.4M", "Mantener proveedores al día"] },
                  { fase: "Fase 3 · Oct+", color: C.green, acciones: ["Si facturación > $18M: escalar a $1.2M/mes", "Deuda socios saldada en ~18 meses", "Empezar a construir fondo de emergencia", "Objetivo: 1 mes de GF en caja siempre"] },
                ].map((f, i) => (
                  <div key={i} style={{ background: C.card2, borderRadius: 10, padding: 16, borderTop: `3px solid ${f.color}` }}>
                    <div style={{ fontWeight: 700, color: f.color, marginBottom: 10 }}>{f.fase}</div>
                    {f.acciones.map((a, j) => (
                      <div key={j} style={{ display: "flex", gap: 8, fontSize: 11, padding: "5px 0",
                        borderBottom: j < f.acciones.length - 1 ? `1px solid ${C.border}22` : undefined }}>
                        <span style={{ color: f.color, fontWeight: 700, flexShrink: 0 }}>→</span>
                        <span style={{ color: C.text }}>{a}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ══════════════════════════════════════════════════════════
            IMPLEMENTACIÓN — PRESENTACIÓN DIRECTORIO
        ══════════════════════════════════════════════════════════ */}
        {tab === "implementacion" && (
          <>
            <SectionHead title="Guía de implementación" sub="Procedimiento completo para los socios · Presentación directorio" />

            {/* Resumen ejecutivo */}
            <div style={{ background: `${C.accent}12`, borderRadius: 12, padding: 20, border: `1px solid ${C.accent}44`, marginBottom: 24 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.accent, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>Resumen ejecutivo</div>
              <div style={{ fontSize: 14, lineHeight: 1.8, color: C.text }}>
                Este sistema integra <strong style={{ color: C.accent }}>Fudo + Google Sheets + tablero web</strong> para que ambos socios tengan visibilidad total del negocio en tiempo real, desde cualquier dispositivo. La carga de datos es mínima — la mayor parte es automática desde Fudo. El objetivo es tomar decisiones basadas en datos, no en intuición.
              </div>
            </div>

            {/* Stack tecnológico */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 24 }}>
              {[
                { nombre: "Fudo Pro", rol: "Fuente de verdad", desc: "Registra todas las ventas y gastos. Es el origen de todos los datos. No reemplazar por ninguna razón.", color: C.accent, icon: "⬡" },
                { nombre: "Google Sheets", rol: "Backend / cerebro", desc: "Recibe los exports de Fudo. Centraliza gastos fijos, stock y datos que Fudo no captura automáticamente.", color: C.blue, icon: "▦" },
                { nombre: "Tablero Web (Vercel)", rol: "Interfaz de socios", desc: "URL privada que ambos socios abren desde el celular. Lee Google Sheets en tiempo real y muestra todo este panel.", color: C.green, icon: "◈" },
              ].map((t, i) => (
                <div key={i} style={{ background: C.card, borderRadius: 12, padding: 18, border: `1px solid ${C.border}`, borderTop: `3px solid ${t.color}` }}>
                  <div style={{ fontSize: 22, marginBottom: 8 }}>{t.icon}</div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: t.color, marginBottom: 4 }}>{t.nombre}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>{t.rol}</div>
                  <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.6 }}>{t.desc}</div>
                </div>
              ))}
            </div>

            {/* Pasos de implementación */}
            <div style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden", marginBottom: 20 }}>
              <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}`, fontWeight: 700, fontSize: 13 }}>
                Paso a paso de implementación — una sola vez
              </div>
              <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
                {[
                  {
                    n: "1", titulo: "Conectar Fudo con API", tiempo: "30 min", responsable: "Lautaro + soporte Fudo",
                    pasos: ["Contactar soporte Fudo: soporte@fudo.com.ar", "Pedir el API key del plan Pro", "El key llega por email — guardarlo en un lugar seguro", "Mandarlo para configurar la conexión automática"],
                    color: C.accent,
                  },
                  {
                    n: "2", titulo: "Crear Google Sheet de Batata", tiempo: "20 min", responsable: "Lautaro",
                    pasos: ["Crear hoja en Google Drive: 'BATATA — Control Financiero'", "Hoja 1: Ventas (pegar export de Fudo mensual)", "Hoja 2: Gastos fijos (ya estructurados — copiar del tablero)", "Hoja 3: Stock (los 10 insumos — actualizar semanalmente)", "Compartir con la socia (acceso de lectura)"],
                    color: C.blue,
                  },
                  {
                    n: "3", titulo: "Subir tablero a Vercel", tiempo: "15 min", responsable: "Lautaro (una sola vez)",
                    pasos: ["Crear cuenta en vercel.com (gratis)", "Subir el archivo JSX del tablero", "Vercel genera URL: batata-socios.vercel.app", "Guardar la URL en favoritos del celular de ambos socios"],
                    color: C.green,
                  },
                  {
                    n: "4", titulo: "Configurar categorías en Fudo", tiempo: "10 min", responsable: "Lautaro",
                    pasos: ["En Fudo → Gastos → Categorías", "Crear: Proveedores / Personal / Servicios / Admin / Impuestos", "Desde ahora, cada gasto que cargás tiene categoría", "El próximo export ya viene limpio y segmentado"],
                    color: C.purple,
                  },
                  {
                    n: "5", titulo: "Actualizar precios en Fudo y carta", tiempo: "20 min", responsable: "Ambos socios",
                    pasos: ["Chipá → $4.500", "Flat White → $6.500", "Cookie Pistacho → $4.600", "Cookie Choco → $5.600", "Tostón Palta → $11.500", "Eliminar de Fudo: Té Blanco, Alfajor Nevado, Medialu. Capresse"],
                    color: C.yellow,
                  },
                ].map((paso, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "44px 1fr auto", gap: 16, alignItems: "start" }}>
                    <div style={{ width: 44, height: 44, borderRadius: "50%", background: `${paso.color}20`,
                      border: `2px solid ${paso.color}`, display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: 800, fontSize: 16, color: paso.color, flexShrink: 0 }}>{paso.n}</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: paso.color, marginBottom: 2 }}>{paso.titulo}</div>
                      <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 8 }}>Responsable: {paso.responsable}</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {paso.pasos.map((p, j) => (
                          <div key={j} style={{ display: "flex", gap: 8, fontSize: 11, color: C.text }}>
                            <span style={{ color: paso.color, fontWeight: 700, flexShrink: 0 }}>→</span>{p}
                          </div>
                        ))}
                      </div>
                    </div>
                    <Pill label={paso.tiempo} color={paso.color} />
                  </div>
                ))}
              </div>
            </div>

            {/* Rutina operativa semanal */}
            <div style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden", marginBottom: 20 }}>
              <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}`, fontWeight: 700, fontSize: 13 }}>
                Rutina operativa — una vez implementado
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0 }}>
                {[
                  {
                    frec: "Diario · 2 min", color: C.green,
                    tareas: ["Abrir tablero y revisar Inicio", "Ver alertas — semáforo en verde?", "Revisar acciones del día", "Responder DMs Instagram"],
                  },
                  {
                    frec: "Semanal · Lunes · 20 min", color: C.blue,
                    tareas: ["Exportar ventas de Fudo y pegar en Sheet", "Actualizar stock en Sheet", "Revisar métricas de Instagram", "Planificar 3 posts de la semana", "Revisar qué compras hacer esta semana"],
                  },
                  {
                    frec: "Mensual · Día 1 · 45 min", color: C.accent,
                    tareas: ["Export completo de Fudo (ventas + gastos)", "Actualizar gastos fijos si cambiaron", "Revisar estado de resultado del mes anterior", "Revisar deudas — pagar proveedores", "Decidir sueldo socios del mes"],
                  },
                ].map((r, i) => (
                  <div key={i} style={{ padding: 20, borderRight: i < 2 ? `1px solid ${C.border}` : undefined }}>
                    <div style={{ fontWeight: 800, fontSize: 12, color: r.color, marginBottom: 12 }}>{r.frec}</div>
                    {r.tareas.map((t, j) => (
                      <div key={j} style={{ display: "flex", gap: 8, fontSize: 11, padding: "5px 0",
                        borderBottom: j < r.tareas.length - 1 ? `1px solid ${C.border}18` : undefined }}>
                        <span style={{ color: r.color, fontWeight: 700, flexShrink: 0 }}>□</span>
                        <span style={{ color: C.text }}>{t}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Lo que necesita de los socios */}
            <div style={{ background: C.card, borderRadius: 12, padding: 20, border: `1px solid ${C.green}44` }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: C.green, marginBottom: 14 }}>
                ✓ Lo que necesita de los socios — y nada más
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[
                  { req: "API key de Fudo", desc: "Una sola vez. Pedirlo a soporte Fudo esta semana.", urgencia: "urgente", color: C.red },
                  { req: "Crear Google Sheet", desc: "20 minutos. Estructura ya definida.", urgencia: "esta semana", color: C.yellow },
                  { req: "Actualizar precios en Fudo", desc: "20 minutos. Lista de cambios en solapa Menú.", urgencia: "esta semana", color: C.yellow },
                  { req: "Configurar categorías de gastos", desc: "10 minutos en Fudo. Hacerlo una vez.", urgencia: "esta semana", color: C.yellow },
                  { req: "Export semanal de Fudo", desc: "5 minutos cada lunes. Copy-paste al Sheet.", urgencia: "semanal", color: C.blue },
                  { req: "Actualizar stock", desc: "5 minutos cada semana. Tres veces: lun, mié, vie.", urgencia: "semanal", color: C.blue },
                  { req: "Revisar tablero", desc: "2 minutos por día. Abrir → leer alertas → actuar.", urgencia: "diario", color: C.green },
                  { req: "Subir tablero a Vercel", desc: "15 minutos una sola vez. Yo te guío paso a paso.", urgencia: "una vez", color: C.accent },
                ].map((r, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                    padding: "10px 14px", background: C.card2, borderRadius: 8, gap: 12 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 3 }}>{r.req}</div>
                      <div style={{ fontSize: 11, color: C.textMuted }}>{r.desc}</div>
                    </div>
                    <Pill label={r.urgencia} color={r.color} />
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
