import { useState, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";


// === CONTRATO DE APIs ===
// Fudo — Ventas por rango (usado en Análisis Semanal)
//   GET /api/v1/sales?from=YYYY-MM-DD&to=YYYY-MM-DD
//   Headers: { Authorization: "Bearer {FUDO_TOKEN}" }
//   Response: { sales: { id, date, total, persons, items }[] }
//   NOTA: Fudo no filtra por fecha en el endpoint — se filtra client-side
//         El tablero pagina la respuesta y descarta lo que está fuera del rango
//
// Fudo — Resumen de ventas (personas + ticket)
//   GET /api/v1/sales/summary?from=YYYY-MM-DD&to=YYYY-MM-DD
//   Response: { total: number, persons: number, avg_per_sale: number, avg_per_person: number }
//
// Fudo — Ventas por hora (para Horarios)
//   GET /api/v1/sales?from=YYYY-MM-DDTHH:00&to=YYYY-MM-DDTHH:59
//   Response: { sales: { date, hour, total, persons }[] }
//
// Fudo — Ranking de productos
//   GET /api/v1/products/ranking?from=YYYY-MM-DD&to=YYYY-MM-DD
//   Response: { nombre: string, unidades: number, total: number }[]
//
// Google Sheets — Gastos fijos
//   GET /sheets/{id}/values/GastosFijos
//   Response: { concepto: string, monto: number, cat: string }[]
//
// Google Sheets — Stock
//   GET /sheets/{id}/values/Stock
//   Response: { item: string, stock: number, min: number, max: number }[]
//
// CREDENCIALES (completar el 1/6):
//   FUDO_BASE_URL = "https://{cuenta}.fudo.com.ar"
//   FUDO_TOKEN    = "Bearer xxxx"   ← generado en Admin→Usuarios→API Secret
// ========================

// === ARQUITECTURA BOT DE FACTURAS (WhatsApp → Drive → Tablero) ===
//
// FLUJO:
//   1. Quillen o Lautaro envían foto de factura al grupo de WhatsApp
//   2. Bot (n8n/Make) recibe el mensaje via WhatsApp Business API
//   3. Claude API procesa la imagen y extrae: proveedor, productos,
//      precios unitarios, total, fecha, condición de pago
//   4. Bot ejecuta 4 acciones en paralelo:
//      a) Sube factura (PDF/imagen) a Google Drive /facturas/{proveedor}/{mes}/
//      b) Actualiza precios en hoja "Precios MP" de Google Sheets maestro
//      c) Añade compromiso de pago al calendario de caja con fecha vencimiento
//      d) Registra movimiento de proveedores para P&L y punto de equilibrio
//
// ENDPOINTS QUE EL TABLERO DEBE EXPONER (futuro):
//   POST /api/factura-procesada
//   Body: {
//     proveedor: string,
//     fecha: string,           // YYYY-MM-DD
//     vencimiento: string,     // YYYY-MM-DD
//     total: number,
//     items: { producto: string, precio_unitario: number, cantidad: number }[],
//     drive_url: string,
//     factura_id: string
//   }
//
// RESPUESTA ESPERADA DEL TABLERO:
//   { ok: true, actualizaciones: string[] }
//   Donde actualizaciones lista qué cambió: ["precio_cafe", "caja_junio", ...]
//
// ESTADO ACTUAL: pendiente — estructura preparada, sin implementar
// ================================================================

const DATA_SOURCE = "live"; // "mock" | "live"

// ESTIMADO — reemplazar con dato real de Fudo cuando esté conectado
const VENTAS_ABRIL = {
  total: 19053900,        // abril 2026 real (de planilla)
  ticketPromedio: 11800,  // ESTIMADO
  promedioDiario: 572000, // ESTIMADO
  diasOp: 22,             // ESTIMADO
};


// ESTIMADO — reemplazar con API Fudo cuando esté conectado
const HISTORICO = {
  // Mayo 2026 (mes actual — se actualiza con datos reales)
  mayo2026: {
    sem1: { ventas: 1090090, dias: [751533, 338557], txn: 145 },
    sem2: { ventas: 3461806, dias: [504607,457196,494976,649637,967666,355069], txn: 445 },
    sem3: { ventas: 3011632, dias: [644729,625126,427490,586474,796436,557893], txn: 399 },
    sem4: { ventas: 1285455, dias: [504015,620345,161140], txn: 170 }, // parcial
  },
  // Abril 2026 — ESTIMADO
  abril2026: {
    total: 19053900,
    sem1: { ventas: 3900000, txn: 420 },
    sem2: { ventas: 5200000, txn: 580 },
    sem3: { ventas: 4800000, txn: 530 },
    sem4: { ventas: 5153900, txn: 575 },
    ticketPromedio: 11800,
  },
  // Mayo 2025 — ESTIMADO (inflación acumulada ~90%)
  mayo2025: {
    total: 8200000,
    sem1: { ventas: 1680000, txn: 210 },
    sem2: { ventas: 2230000, txn: 278 },
    sem3: { ventas: 2060000, txn: 257 },
    sem4: { ventas: 2230000, txn: 278 },
    ticketPromedio: 6800,
  },
};

// ── Helpers de semana operativa Batata ────────────────────────────
// Sem 1: días 1-7 | Sem 2: días 8-14 | Sem 3: días 15-21 | Sem 4: días 22-fin
function getSemanaDelMes(dia) {
  if (dia <= 7) return 1;
  if (dia <= 14) return 2;
  if (dia <= 21) return 3;
  return 4;
}
const HOY = new Date();
const DIA_ACTUAL = HOY.getDate();
const SEM_ACTUAL = getSemanaDelMes(DIA_ACTUAL);
const SEM_KEY = `sem${SEM_ACTUAL}`;


// ── DATOS ANÁLISIS SEMANAL ────────────────────────────────────────
// Fuente: planilla Comparativa cargada a mano desde marzo 2025.
// Cuando conecte Fudo API (1/6), getSemanaData() reemplaza estos mocks.
// Métrica: PERSONAS (no transacciones). 1 pedido puede ser 1–4 personas.
// Clima: datos reales mayo 2026 Buenos Aires (weatherandclimate.eu)

const FUDO_BASE_URL = ""; // completar el 1/6: "https://{cuenta}.fudo.com.ar"
const FUDO_TOKEN    = ""; // completar el 1/6: token desde Admin→Usuarios→API Secret

// ── Función de acceso a datos — mock hoy, live el 1/6 ────────────
async function getSemanaData(anio, mes, semana) {
  if (DATA_SOURCE === "live" && FUDO_BASE_URL && FUDO_TOKEN) {
    // Calcular rango de fechas para la semana operativa solicitada
    const rangos = { 1:[1,7], 2:[8,14], 3:[15,21], 4:[22,31] };
    const [d1, d2] = rangos[semana];
    const pad = n => String(n).padStart(2,"0");
    const from = `${anio}-${pad(mes)}-${pad(d1)}`;
    const to   = `${anio}-${pad(mes)}-${pad(Math.min(d2, new Date(anio,mes,0).getDate()))}`;
    try {
      const res = await fetch(
        `${FUDO_BASE_URL}/api/v1/sales/summary?from=${from}&to=${to}`,
        { headers: { Authorization: `Bearer ${FUDO_TOKEN}` } }
      );
      const json = await res.json();
      // Fudo response: { total, persons, avg_per_sale, avg_per_person }
      return {
        facturacion: json.total,
        personas:    json.persons,
        ticketPorPersona: json.avg_per_person,
      };
    } catch(e) {
      console.warn("Fudo API error, usando mock:", e);
    }
  }
  // Mock — datos reales de planillas
  return SEMANA_MOCK[`${anio}-${mes}-${semana}`] || null;
}

async function getHorarioData(anio, mes) {
  if (DATA_SOURCE === "live" && FUDO_BASE_URL && FUDO_TOKEN) {
    const pad = n => String(n).padStart(2,"0");
    const from = `${anio}-${pad(mes)}-01`;
    const to   = `${anio}-${pad(mes)}-31`;
    try {
      const res = await fetch(
        `${FUDO_BASE_URL}/api/v1/sales?from=${from}&to=${to}`,
        { headers: { Authorization: `Bearer ${FUDO_TOKEN}` } }
      );
      const json = await res.json();
      // Agrupar por día de semana y hora client-side
      // json.sales: [{ date, hour, total, persons }]
      return json.sales;
    } catch(e) {
      console.warn("Fudo API error horario, usando mock:", e);
    }
  }
  return HORARIO_MOCK[`${anio}-${mes}`] || [];
}

// ── MOCK — ventas semanales reales (personas de planilla Comparativa) ──
// Estructura: "anio-mes-semana" → { facturacion, personas, ticketPorPersona, dias, clima }
const SEMANA_MOCK = {
  // ── MAYO 2026 (datos reales Fudo mayo 2026) ──────────────────
  "2026-5-1": { facturacion:2546400, personas:155, ticketPorPersona:16428, dias:5,
    clima:{ max:18, min:13, icono:"sol",    desc:"Soleado · seco" }},
  "2026-5-2": { facturacion:3669000, personas:234, ticketPorPersona:15679, dias:6,
    clima:{ max:17, min:12, icono:"nube",   desc:"Variable · lluvia 14/5" }},
  "2026-5-3": { facturacion:3660250, personas:242, ticketPorPersona:15125, dias:6,
    clima:{ max:17, min:12, icono:"lluvia", desc:"Lluvia 18/5 (5,3mm)" }},
  "2026-5-4": { facturacion:3978800, personas:267, ticketPorPersona:14902, dias:7,
    clima:{ max:16, min:11, icono:"nublado",desc:"Más frío · nublado" }},
  // ── ABRIL 2026 (personas de planilla Comparativa) ────────────
  "2026-4-1": { facturacion:3381570, personas:295, ticketPorPersona:11463, dias:7,
    clima:{ max:22, min:15, icono:"sol",    desc:"Otoño templado" }},
  "2026-4-2": { facturacion:4119780, personas:356, ticketPorPersona:11573, dias:7,
    clima:{ max:20, min:14, icono:"nube",   desc:"Variable" }},
  "2026-4-3": { facturacion:3527980, personas:299, ticketPorPersona:11799, dias:7,
    clima:{ max:20, min:14, icono:"sol",    desc:"Soleado" }},
  "2026-4-4": { facturacion:5242400, personas:444, ticketPorPersona:11807, dias:9,
    clima:{ max:19, min:13, icono:"nube",   desc:"Algo nublado" }},
  // ── MAYO 2025 (personas de planilla Comparativa) ─────────────
  "2025-5-1": { facturacion:3346740, personas:361, ticketPorPersona:9270,  dias:7,
    clima:{ max:20, min:13, icono:"sol",    desc:"Soleado" }},
  "2025-5-2": { facturacion:3381400, personas:386, ticketPorPersona:8761,  dias:7,
    clima:{ max:19, min:12, icono:"nube",   desc:"Variable" }},
  "2025-5-3": { facturacion:3093400, personas:346, ticketPorPersona:8939,  dias:7,
    clima:{ max:18, min:11, icono:"lluvia", desc:"Lluvia" }},
  "2025-5-4": { facturacion:3927800, personas:444, ticketPorPersona:8846,  dias:9,
    clima:{ max:17, min:10, icono:"nublado",desc:"Frío y nublado" }},
};

// ── MOCK — distribución horaria mayo 2026 (datos reales Fudo export) ──
// Fuente: Reporte-Ventas_1_.xlsx procesado — promedios por día de semana y hora
const HORARIO_MOCK = {
  "2026-5": [
    // [dow(1=Mar..6=Dom), hora, ventasProm, personasProm]
    // Martes
    {dow:1,nom:"Martes", hora:8,  v:23075,p:1.0},{dow:1,nom:"Martes", hora:9,  v:34750,p:3.0},
    {dow:1,nom:"Martes", hora:10, v:78650,p:6.0},{dow:1,nom:"Martes", hora:11, v:52825,p:5.0},
    {dow:1,nom:"Martes", hora:12, v:12075,p:1.0},{dow:1,nom:"Martes", hora:13, v:7325, p:1.0},
    {dow:1,nom:"Martes", hora:14, v:26000,p:1.8},{dow:1,nom:"Martes", hora:15, v:27525,p:2.8},
    {dow:1,nom:"Martes", hora:16, v:57850,p:3.0},{dow:1,nom:"Martes", hora:17, v:153825,p:10.8},
    {dow:1,nom:"Martes", hora:18, v:63100,p:4.0},{dow:1,nom:"Martes", hora:19, v:4100, p:0.5},
    // Miércoles
    {dow:2,nom:"Miércoles",hora:8, v:9575, p:1.0},{dow:2,nom:"Miércoles",hora:9, v:36075,p:3.0},
    {dow:2,nom:"Miércoles",hora:10,v:34450,p:2.5},{dow:2,nom:"Miércoles",hora:11,v:38925,p:2.5},
    {dow:2,nom:"Miércoles",hora:12,v:24675,p:2.0},{dow:2,nom:"Miércoles",hora:13,v:38950,p:2.5},
    {dow:2,nom:"Miércoles",hora:14,v:11450,p:1.0},{dow:2,nom:"Miércoles",hora:15,v:43450,p:3.5},
    {dow:2,nom:"Miércoles",hora:16,v:93600,p:5.2},{dow:2,nom:"Miércoles",hora:17,v:130850,p:10.2},
    {dow:2,nom:"Miércoles",hora:18,v:73875,p:4.8},{dow:2,nom:"Miércoles",hora:19,v:4700,p:0.2},
    // Jueves
    {dow:3,nom:"Jueves",hora:8, v:7900, p:0.8},{dow:3,nom:"Jueves",hora:9, v:20450,p:1.8},
    {dow:3,nom:"Jueves",hora:10,v:63075,p:3.8},{dow:3,nom:"Jueves",hora:11,v:42275,p:2.2},
    {dow:3,nom:"Jueves",hora:12,v:30125,p:2.2},{dow:3,nom:"Jueves",hora:13,v:8500, p:0.5},
    {dow:3,nom:"Jueves",hora:14,v:28250,p:2.5},{dow:3,nom:"Jueves",hora:15,v:25700,p:2.2},
    {dow:3,nom:"Jueves",hora:16,v:39325,p:3.0},{dow:3,nom:"Jueves",hora:17,v:115675,p:7.5},
    {dow:3,nom:"Jueves",hora:18,v:108550,p:5.8},{dow:3,nom:"Jueves",hora:19,v:4550,p:0.5},
    // Viernes
    {dow:4,nom:"Viernes",hora:8, v:6400, p:0.8},{dow:4,nom:"Viernes",hora:9, v:44900,p:2.8},
    {dow:4,nom:"Viernes",hora:10,v:40950,p:2.5},{dow:4,nom:"Viernes",hora:11,v:73750,p:4.2},
    {dow:4,nom:"Viernes",hora:12,v:28550,p:2.0},{dow:4,nom:"Viernes",hora:13,v:45900,p:3.5},
    {dow:4,nom:"Viernes",hora:14,v:27550,p:1.8},{dow:4,nom:"Viernes",hora:15,v:37775,p:2.5},
    {dow:4,nom:"Viernes",hora:16,v:82325,p:6.0},{dow:4,nom:"Viernes",hora:17,v:134800,p:8.2},
    {dow:4,nom:"Viernes",hora:18,v:117888,p:7.5},{dow:4,nom:"Viernes",hora:19,v:3800,p:0.5},
    // Sábado
    {dow:5,nom:"Sábado",hora:9, v:1250, p:0.2},{dow:5,nom:"Sábado",hora:10,v:118925,p:7.0},
    {dow:5,nom:"Sábado",hora:11,v:95175,p:5.8},{dow:5,nom:"Sábado",hora:12,v:64475,p:3.2},
    {dow:5,nom:"Sábado",hora:13,v:82525,p:5.0},
    {dow:5,nom:"Sábado",hora:16,v:153100,p:8.8},{dow:5,nom:"Sábado",hora:17,v:165600,p:9.5},
    {dow:5,nom:"Sábado",hora:18,v:103750,p:5.5},{dow:5,nom:"Sábado",hora:19,v:11700,p:1.0},
    // Domingo
    {dow:6,nom:"Domingo",hora:16,v:139375,p:7.5},{dow:6,nom:"Domingo",hora:17,v:187800,p:10.8},
    {dow:6,nom:"Domingo",hora:18,v:98450,p:6.0},{dow:6,nom:"Domingo",hora:19,v:20850,p:1.0},
  ],
};

// ── Helper clima icono ─────────────────────────────────────────────
function climaIcono(icono, size=14){
  const map={sol:"☀",nube:"⛅",lluvia:"🌧",nublado:"☁"};
  return map[icono]||"🌡";
}

// ── Calcular % variación con reglas de negocio ────────────────────
function varPct(actual, ref){
  if(!ref||ref===0) return null;
  const p=((actual-ref)/ref*100);
  const abs=Math.abs(p);
  if(abs<0.5) return {txt:"≈ igual",col:"#7a6e62",dir:0};
  return { txt:`${p>0?"↑":"↓"}${abs.toFixed(1)}%`, col:p>0?"#5a9e6a":"#c05040", dir:p>0?1:-1 };
}


// ================================================================
// SUPABASE — conexión a base de datos
// Proyecto: kpoazrmnybdunbshlqwu.supabase.co
// ================================================================
const SUPABASE_URL = "https://kpoazrmnybdunbshlqwu.supabase.co";
const SUPABASE_KEY = "sb_publishable_EO9539rZKzX1PYfQ5znxOA_Tw6VV8mH";

// Cliente Supabase liviano — sin SDK, fetch directo
// Cuando DATA_SOURCE="live" usa Supabase; en "mock" usa datos locales
const sb = {
  from: (tabla) => ({
    _tabla: tabla,
    _filtros: [],
    _orden: null,
    _limit: null,

    select: function(cols="*") {
      this._cols = cols; return this;
    },
    eq: function(col, val) {
      this._filtros.push(`${col}=eq.${val}`); return this;
    },
    order: function(col, {ascending=true}={}) {
      this._orden = `${col}.${ascending?"asc":"desc"}`; return this;
    },
    limit: function(n) {
      this._limit = n; return this;
    },

    // GET
    then: async function(resolve, reject) {
      try {
        let url = `${SUPABASE_URL}/rest/v1/${this._tabla}?select=${this._cols||"*"}`;
        if (this._filtros.length) url += "&" + this._filtros.join("&");
        if (this._orden)         url += `&order=${this._orden}`;
        if (this._limit)         url += `&limit=${this._limit}`;
        const res = await fetch(url, {
          headers: {
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${SUPABASE_KEY}`,
          }
        });
        const data = await res.json();
        resolve({ data, error: res.ok ? null : data });
      } catch(e) { reject({ data: null, error: e.message }); }
    },

    // INSERT
    insert: async function(rows) {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${this._tabla}`, {
        method: "POST",
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
          "Prefer": "return=representation",
        },
        body: JSON.stringify(Array.isArray(rows) ? rows : [rows]),
      });
      const data = await res.json();
      return { data, error: res.ok ? null : data };
    },

    // UPDATE
    update: async function(vals) {
      let url = `${SUPABASE_URL}/rest/v1/${this._tabla}`;
      if (this._filtros.length) url += "?" + this._filtros.join("&");
      const res = await fetch(url, {
        method: "PATCH",
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
          "Prefer": "return=representation",
        },
        body: JSON.stringify(vals),
      });
      const data = await res.json();
      return { data, error: res.ok ? null : data };
    },

    // DELETE
    delete: async function() {
      let url = `${SUPABASE_URL}/rest/v1/${this._tabla}`;
      if (this._filtros.length) url += "?" + this._filtros.join("&");
      const res = await fetch(url, {
        method: "DELETE",
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
        },
      });
      return { error: res.ok ? null : await res.json() };
    },
  }),
};

// ── Funciones de acceso a datos con fallback a mock ──────────────

async function dbGetGastosFijos() {
  if (DATA_SOURCE !== "live") return GF_INIT;
  const { data, error } = await sb.from("gastos_fijos")
    .select("id,concepto,monto,categoria,icono")
    .eq("activo", true);
  if (error) { console.warn("Supabase GF error:", error); return GF_INIT; }
  return data.map(r => ({ ...r, cat: r.categoria }));
}

async function dbGetSaldos() {
  if (DATA_SOURCE !== "live") return { mp:1107900, bbva:115229, ef:600000 };
  const { data, error } = await sb.from("saldos_caja").select("*");
  if (error) { console.warn("Supabase saldos error:", error); return { mp:1107900, bbva:115229, ef:600000 }; }
  const s = {};
  data.forEach(r => {
    if (r.cuenta === "mercadopago") s.mp  = r.monto;
    if (r.cuenta === "bbva")        s.bbva = r.monto;
    if (r.cuenta === "efectivo")    s.ef  = r.monto;
  });
  return s;
}

async function dbUpdateSaldo(cuenta, monto, quien) {
  if (DATA_SOURCE !== "live") return;
  // Busca el registro existente y lo actualiza
  await sb.from("saldos_caja").eq("cuenta", cuenta).update({ monto, updated_by: quien, updated_at: new Date().toISOString() });
}

async function dbGetCompromisos() {
  if (DATA_SOURCE !== "live") return COMPROMISOS_INIT;
  const { data, error } = await sb.from("compromisos")
    .select("*")
    .order("fecha", { ascending: true });
  if (error) { console.warn("Supabase compromisos error:", error); return COMPROMISOS_INIT; }
  return data.map(r => ({
    concepto: r.concepto,
    fecha:    r.fecha?.slice(5).split("-").reverse().join("/"), // DD/MM
    monto:    r.monto,
    tipo:     r.tipo,
    origen:   r.origen,
    urgente:  r.urgente,
    pagado:   r.pagado,
    _id:      r.id,
  }));
}

async function dbConfirmarPago(id, quien) {
  if (DATA_SOURCE !== "live") return;
  await sb.from("compromisos").eq("id", id).update({
    pagado: true,
    pagado_at: new Date().toISOString(),
    pagado_by: quien,
  });
}

async function dbGetStock() {
  if (DATA_SOURCE !== "live") return STOCK_INIT;
  const { data, error } = await sb.from("stock")
    .select("*")
    .order("categoria");
  if (error) { console.warn("Supabase stock error:", error); return STOCK_INIT; }
  return data.map(r => ({
    item:  r.item, u: r.unidad, stock: r.stock_actual,
    min:   r.stock_min, max: r.stock_max, cd: r.consumo_dia,
    icon:  r.icono, cat: r.categoria, prov: r.proveedor,
  }));
}

async function dbUpdateStock(item, nuevoStock, quien) {
  if (DATA_SOURCE !== "live") return;
  await sb.from("stock").eq("item", item).update({
    stock_actual: nuevoStock,
    updated_by: quien,
    updated_at: new Date().toISOString(),
  });
}

async function dbRegistrarFactura(factura) {
  // Llamado por el bot cuando procesa una foto de WhatsApp
  // factura: { proveedor, fecha, vencimiento, total, items, drive_url }
  if (DATA_SOURCE !== "live") return null;
  const { data, error } = await sb.from("facturas").insert(factura);
  if (error) { console.error("Error registrando factura:", error); return null; }
  return data?.[0];
}

async function dbActualizarPrecioMP(ingrediente, nuevoPrecio, facturaId, proveedor) {
  if (DATA_SOURCE !== "live") return;
  // Guarda precio anterior y actualiza
  const { data: actual } = await sb.from("precios_mp").eq("ingrediente", ingrediente);
  const precioAnterior = actual?.[0]?.precio_actual;
  await sb.from("precios_mp").eq("ingrediente", ingrediente).update({
    precio_anterior: precioAnterior,
    precio_actual: nuevoPrecio,
    factura_id: facturaId,
    proveedor,
    vigente_desde: new Date().toISOString().slice(0,10),
    updated_at: new Date().toISOString(),
  });
}

// ================================================================
const PASS = "Julia2420";
const C = {
  bg:"#0c0a08",card:"#141210",card2:"#1c1916",border:"#2a2520",
  text:"#f5f0e8",muted:"#7a6e62",dim:"#3a3028",
  accent:"#d4845a",accentDim:"#d4845a18",
  green:"#5a9e6a",greenDim:"#5a9e6a18",
  red:"#c05040",redDim:"#c0504018",
  yellow:"#c4900a",yellowDim:"#c4900a18",
  blue:"#4878a8",blueDim:"#4878a818",
  purple:"#8866cc",
};
const fmt = n=>`$${Math.round(Math.abs(n)).toLocaleString("es-AR")}`;
const fmtK = n=>Math.abs(n)>=1000000?`$${(Math.abs(n)/1000000).toFixed(2)}M`:`$${Math.round(Math.abs(n)/1000)}k`;
const GF_BASE = 7272537;
const FACT_BASE = 16271730;

// ── VENTAS MAYO — días y colores correctos ───────────────────────
const VENTAS_MAP = {2:751533,3:338557,5:504607,6:457196,7:494976,8:649637,9:967666,10:355069,12:644729,13:625126,14:427490,15:586474,16:796436,17:557893,19:504015,20:620345,21:161140};
const DIAS_MAYO = Array.from({length:31},(_,i)=>i+1).map(d=>({
  dia:d, v:VENTAS_MAP[d]||0, activo:!!VENTAS_MAP[d],
  fs:[0,6].includes(new Date(2026,4,d).getDay())
}));

// ── RANKING — 50 productos ordenados por unidades ────────────────
const RANKING = [
  {n:"Latte",             u:249,cat:"Café",      rent:32.9,pv:5600, mp:888, accion:"potenciar"},
  {n:"Flat White",        u:232,cat:"Café",      rent:27.9,pv:5800, mp:1214,accion:"subir",pvSug:6500},
  {n:"Chipa",             u:187,cat:"Pastelería",rent:27.8,pv:4000, mp:839, accion:"potenciar"},
  {n:"Cookie Frambuesa",  u:138,cat:"Pastelería",rent:33.5,pv:4100, mp:628, accion:"potenciar"},
  {n:"Medialuna",         u:133,cat:"Pastelería",rent:14.2,pv:3800, mp:900, accion:"revisar"},
  {n:"Cappu Doble",       u:106,cat:"Café",      rent:27.5,pv:6000, mp:1279,accion:"potenciar"},
  {n:"Cappuccino",        u:69, cat:"Café",      rent:33.1,pv:5000, mp:785, accion:"potenciar"},
  {n:"Cookie Chocolate",  u:89, cat:"Pastelería",rent:12.9,pv:5100, mp:1285,accion:"subir",pvSug:5600},
  {n:"Espresso doble",    u:89, cat:"Café",      rent:28.8,pv:5000, mp:1002,accion:"potenciar"},
  {n:"Cookie Pistacho",   u:78, cat:"Pastelería",rent:23.8,pv:4100, mp:1026,accion:"subir",pvSug:4600},
  {n:"Chipa prensado",    u:92, cat:"Cocina",    rent:19.5,pv:8000, mp:1621,accion:"ok"},
  {n:"Jugo de Naranja",   u:70, cat:"Café",      rent:30.0,pv:4300, mp:600, accion:"potenciar"},
  {n:"Alfanuí",           u:54, cat:"Pastelería",rent:25.6,pv:5000, mp:1158,accion:"ok"},
  {n:"Medialuna rellena", u:54, cat:"Cocina",    rent:19.8,pv:9500, mp:2530,accion:"ok"},
  {n:"Americano",         u:60, cat:"Café",      rent:27.5,pv:5000, mp:1002,accion:"potenciar"},
  {n:"Suaave",            u:53, cat:"Café",      rent:33.2,pv:6700, mp:1045,accion:"potenciar"},
  {n:"Tostón de Palta",   u:50, cat:"Cocina",    rent:13.5,pv:10000,mp:2464,accion:"subir",pvSug:11500},
  {n:"Tostado JyQ",       u:46, cat:"Cocina",    rent:13.4,pv:8500, mp:2094,accion:"subir",pvSug:10000},
  {n:"Budín Limón",       u:44, cat:"Pastelería",rent:18.3,pv:4200, mp:833, accion:"ok"},
  {n:"Cortado",           u:41, cat:"Café",      rent:33.0,pv:4600, mp:727, accion:"potenciar"},
  {n:"Pomelada",          u:41, cat:"Café",      rent:30.0,pv:5000, mp:938, accion:"potenciar"},
  {n:"Cappusotto",        u:35, cat:"Café",      rent:29.1,pv:6200, mp:1220,accion:"potenciar"},
  {n:"Budín Banana",      u:36, cat:"Pastelería",rent:29.8,pv:4200, mp:797, accion:"ok"},
  {n:"Alfajor Almendras", u:29, cat:"Pastelería",rent:35.7,pv:3800, mp:498, accion:"potenciar"},
  {n:"Sandwich Mortadela",u:26, cat:"Cocina",    rent:22.9,pv:12500,mp:3042,accion:"potenciar"},
  {n:"Choco Caliente",    u:32, cat:"Café",      rent:40.6,pv:6000, mp:489, accion:"potenciar"},
  {n:"Alfajor Nevado",    u:25, cat:"Pastelería",rent:21.9,pv:5200, mp:1397,accion:"ok"},
  {n:"Dame Números",      u:27, cat:"Café",      rent:27.2,pv:7000, mp:1514,accion:"ok"},
  {n:"Tostado Capresse",  u:25, cat:"Cocina",    rent:17.4,pv:8500, mp:1759,accion:"subir",pvSug:10000},
  {n:"Cheesecake",        u:33, cat:"Pastelería",rent:20.9,pv:8500, mp:2367,accion:"ok"},
  {n:"Sniker",            u:22, cat:"Pastelería",rent:19.0,pv:5600, mp:1670,accion:"ok"},
  {n:"Alfajor Tita",      u:22, cat:"Pastelería",rent:32.4,pv:3800, mp:623, accion:"potenciar"},
  {n:"Brownie Noelito",   u:20, cat:"Pastelería",rent:22.0,pv:5600, mp:1670,accion:"ok"},
  {n:"Mandarinada",       u:18, cat:"Café",      rent:30.8,pv:4700, mp:847, accion:"potenciar"},
  {n:"Té Woolong",        u:18, cat:"Café",      rent:14.7,pv:4900, mp:1669,accion:"revisar"},
  {n:"Cappu Marplatense", u:14, cat:"Café",      rent:29.1,pv:6200, mp:1220,accion:"potenciar"},
  {n:"Trenzas",           u:16, cat:"Pastelería",rent:22.0,pv:5000, mp:1200,accion:"ok"},
  {n:"Vasca de DDL",      u:10, cat:"Pastelería",rent:18.9,pv:8000, mp:2388,accion:"ok"},
  {n:"Key Lime",          u:8,  cat:"Pastelería",rent:14.0,pv:7900, mp:2747,accion:"revisar"},
  {n:"Tostón de Perso",   u:8,  cat:"Cocina",    rent:13.0,pv:9200, mp:1828,accion:"subir",pvSug:10500},
  {n:"Espresso largo",    u:9,  cat:"Café",      rent:33.5,pv:3800, mp:582, accion:"potenciar"},
  {n:"Pancakes",          u:7,  cat:"Cocina",    rent:18.0,pv:11000,mp:1800,accion:"ok"},
  {n:"Americano Especiado",u:7, cat:"Café",      rent:27.5,pv:5000, mp:1002,accion:"ok"},
  {n:"Espresso",          u:8,  cat:"Café",      rent:33.5,pv:3800, mp:582, accion:"potenciar"},
  {n:"Filtrados",         u:6,  cat:"Café",      rent:24.6,pv:7500, mp:1816,accion:"ok"},
  {n:"Tostadas",          u:6,  cat:"Cocina",    rent:16.0,pv:7500, mp:1080,accion:"subir",pvSug:8500},
  {n:"Yogurt",            u:4,  cat:"Cocina",    rent:15.3,pv:9200, mp:2094,accion:"ok"},
  {n:"Cookie Vegana",     u:3,  cat:"Pastelería",rent:22.0,pv:4100, mp:800, accion:"ok"},
  {n:"Tostada saludable", u:3,  cat:"Cocina",    rent:12.0,pv:7500, mp:1200,accion:"revisar"},
  {n:"Sandwich Bondio",   u:5,  cat:"Cocina",    rent:25.0,pv:19000,mp:8500,accion:"revisar"},
];

// ── RECETAS — precios reales de planillas de costos ─────────────
// Formato: {ing, gr (cantidad), pu (precio por gr/ml/u), u (unidad)}
// Café: dosis base 9gr + 19.5% merma. Leche: precio de Serenísima con 10% merma.
// Vaso take away: $162.61 por unidad (verificado contra planilla CAFÉ.)
const RECETAS = {
  // ── CAFÉ ──────────────────────────────────────────────────────
  "Espresso": [
    {ing:"Café (dosis 9gr)",     gr:9,    pu:39.0,    u:"gr",  subtotal:351},
    {ing:"Merma café (19.5%)",   gr:1.755,pu:39.0,    u:"gr",  subtotal:68.45},
    {ing:"Vaso take away",       gr:1,    pu:162.61,  u:"u",   subtotal:162.61},
  ],
  "Espresso largo": [
    {ing:"Café (dosis 9gr)",     gr:9,    pu:39.0,    u:"gr",  subtotal:351},
    {ing:"Merma café (19.5%)",   gr:1.755,pu:39.0,    u:"gr",  subtotal:68.45},
    {ing:"Vaso take away",       gr:1,    pu:162.61,  u:"u",   subtotal:162.61},
  ],
  "Espresso doble": [
    {ing:"Café (dosis 18gr)",    gr:18,   pu:39.0,    u:"gr",  subtotal:702},
    {ing:"Merma café (19.5%)",   gr:3.51, pu:39.0,    u:"gr",  subtotal:136.89},
    {ing:"Vaso take away",       gr:1,    pu:162.61,  u:"u",   subtotal:162.61},
  ],
  "Cortado": [
    {ing:"Café (dosis 9gr)",     gr:9,    pu:39.0,    u:"gr",  subtotal:351},
    {ing:"Merma café (19.5%)",   gr:1.755,pu:39.0,    u:"gr",  subtotal:68.45},
    {ing:"Leche entera (100ml)", gr:100,  pu:1.31629, u:"ml",  subtotal:131.63},
    {ing:"Merma leche (10%)",    gr:10,   pu:1.31629, u:"ml",  subtotal:13.16},
    {ing:"Vaso take away",       gr:1,    pu:162.61,  u:"u",   subtotal:162.61},
  ],
  "Cappuccino": [
    {ing:"Café (dosis 9gr)",     gr:9,    pu:39.0,    u:"gr",  subtotal:351},
    {ing:"Merma café (19.5%)",   gr:1.755,pu:39.0,    u:"gr",  subtotal:68.45},
    {ing:"Leche entera (140ml)", gr:140,  pu:1.31629, u:"ml",  subtotal:184.28},
    {ing:"Merma leche (10%)",    gr:14,   pu:1.31629, u:"ml",  subtotal:18.43},
    {ing:"Vaso take away",       gr:1,    pu:162.61,  u:"u",   subtotal:162.61},
  ],
  "Flat White": [
    {ing:"Café (dosis 18gr)",    gr:18,   pu:39.0,    u:"gr",  subtotal:702},
    {ing:"Merma café (19.5%)",   gr:3.51, pu:39.0,    u:"gr",  subtotal:136.89},
    {ing:"Leche entera (150ml)", gr:150,  pu:1.31629, u:"ml",  subtotal:197.44},
    {ing:"Merma leche (7.5%)",   gr:11.25,pu:1.31629, u:"ml",  subtotal:14.81},
    {ing:"Vaso take away",       gr:1,    pu:162.61,  u:"u",   subtotal:162.61},
  ],
  "Cappu Doble": [
    {ing:"Café (dosis 18gr)",    gr:18,   pu:39.0,    u:"gr",  subtotal:702},
    {ing:"Merma café (19.5%)",   gr:3.51, pu:39.0,    u:"gr",  subtotal:136.89},
    {ing:"Leche entera (180ml)", gr:180,  pu:1.31629, u:"ml",  subtotal:237.03},
    {ing:"Merma leche (7.5%)",   gr:13.5, pu:1.31629, u:"ml",  subtotal:17.77},
    {ing:"Vaso take away",       gr:1,    pu:162.61,  u:"u",   subtotal:162.61},
  ],
  "Latte": [
    {ing:"Café (dosis 9gr)",     gr:9,    pu:39.0,    u:"gr",  subtotal:351},
    {ing:"Merma café (19.5%)",   gr:1.755,pu:39.0,    u:"gr",  subtotal:68.45},
    {ing:"Leche entera (200ml)", gr:200,  pu:1.31629, u:"ml",  subtotal:263.26},
    {ing:"Merma leche (7.5%)",   gr:15,   pu:1.31629, u:"ml",  subtotal:19.74},
    {ing:"Vaso take away",       gr:1,    pu:162.61,  u:"u",   subtotal:162.61},
  ],
  "Americano": [
    {ing:"Café (dosis 18gr)",    gr:18,   pu:39.0,    u:"gr",  subtotal:702},
    {ing:"Merma café (19.5%)",   gr:3.51, pu:39.0,    u:"gr",  subtotal:136.89},
    {ing:"Vaso take away",       gr:1,    pu:162.61,  u:"u",   subtotal:162.61},
  ],
  "Americano Especiado": [
    {ing:"Café (dosis 18gr)",    gr:18,   pu:39.0,    u:"gr",  subtotal:702},
    {ing:"Merma café (19.5%)",   gr:3.51, pu:39.0,    u:"gr",  subtotal:136.89},
    {ing:"Pimienta rosa",        gr:1,    pu:36.0,    u:"gr",  subtotal:36},
    {ing:"Vaso take away",       gr:1,    pu:162.61,  u:"u",   subtotal:162.61},
  ],
  "Choco Caliente": [
    {ing:"Chocolate amargo",     gr:30,   pu:26.265,  u:"gr",  subtotal:787.95},
    {ing:"Batata horneada",      gr:20,   pu:2.1,     u:"gr",  subtotal:42},
    {ing:"Leche entera (140ml)", gr:140,  pu:1.31629, u:"ml",  subtotal:184.28},
    {ing:"Merma leche (10%)",    gr:14,   pu:1.31629, u:"ml",  subtotal:18.43},
    {ing:"Cardamomo",            gr:0.5,  pu:36.0,    u:"gr",  subtotal:18},
    {ing:"Vaso take away",       gr:1,    pu:162.61,  u:"u",   subtotal:162.61},
  ],
  "Dame Números": [
    {ing:"Café (dosis 18gr)",    gr:18,   pu:39.0,    u:"gr",  subtotal:702},
    {ing:"Merma café (19.5%)",   gr:3.51, pu:39.0,    u:"gr",  subtotal:136.89},
    {ing:"Leche entera (180ml)", gr:180,  pu:1.31629, u:"ml",  subtotal:237.03},
    {ing:"Merma leche (7.5%)",   gr:13.5, pu:1.31629, u:"ml",  subtotal:17.77},
    {ing:"Batata horneada (25gr)",gr:25,  pu:2.1,     u:"gr",  subtotal:52.5},
    {ing:"Chocolate amargo",     gr:6,    pu:26.265,  u:"gr",  subtotal:157.59},
    {ing:"Cardamomo",            gr:0.5,  pu:36.0,    u:"gr",  subtotal:18},
    {ing:"Azúcar común",         gr:16,   pu:1.9584,  u:"gr",  subtotal:31.33},
    {ing:"Vaso take away",       gr:1,    pu:162.61,  u:"u",   subtotal:162.61},
  ],
  "Cappusotto": [
    {ing:"Café (dosis 18gr)",    gr:18,   pu:39.0,    u:"gr",  subtotal:702},
    {ing:"Merma café (19.5%)",   gr:3.51, pu:39.0,    u:"gr",  subtotal:136.89},
    {ing:"Leche entera (180ml)", gr:180,  pu:1.31629, u:"ml",  subtotal:237.03},
    {ing:"Merma leche (7.5%)",   gr:13.5, pu:1.31629, u:"ml",  subtotal:17.77},
    {ing:"Pasta de maní",        gr:20,   pu:8.0,     u:"gr",  subtotal:160},
    {ing:"Chocolate blanco",     gr:10,   pu:26.487,  u:"gr",  subtotal:264.87},
    {ing:"Ralladura naranja",    gr:3,    pu:2.0,     u:"gr",  subtotal:6},
    {ing:"Vaso take away",       gr:1,    pu:162.61,  u:"u",   subtotal:162.61},
  ],
  "Cappu Marplatense": [
    {ing:"Café (dosis 18gr)",    gr:18,   pu:39.0,    u:"gr",  subtotal:702},
    {ing:"Merma café (19.5%)",   gr:3.51, pu:39.0,    u:"gr",  subtotal:136.89},
    {ing:"Leche entera (180ml)", gr:180,  pu:1.31629, u:"ml",  subtotal:237.03},
    {ing:"Merma leche (7.5%)",   gr:13.5, pu:1.31629, u:"ml",  subtotal:17.77},
    {ing:"DDL Vacalin",          gr:25,   pu:4.00752, u:"gr",  subtotal:100.19},
    {ing:"Pasta de maní",        gr:15,   pu:8.0,     u:"gr",  subtotal:120},
    {ing:"Sal marina",           gr:0.3,  pu:3.7321,  u:"gr",  subtotal:1.12},
    {ing:"Vaso take away",       gr:1,    pu:162.61,  u:"u",   subtotal:162.61},
  ],
  "Suaave": [
    {ing:"Café (dosis 9gr)",     gr:9,    pu:39.0,    u:"gr",  subtotal:351},
    {ing:"Merma café (19.5%)",   gr:1.755,pu:39.0,    u:"gr",  subtotal:68.45},
    {ing:"Leche entera (200ml)", gr:200,  pu:1.31629, u:"ml",  subtotal:263.26},
    {ing:"Merma leche (7.5%)",   gr:15,   pu:1.31629, u:"ml",  subtotal:19.74},
    {ing:"Almíbar lavanda",      gr:30,   pu:4.0,     u:"gr",  subtotal:120},
    {ing:"Vaso take away",       gr:1,    pu:162.61,  u:"u",   subtotal:162.61},
  ],
  "Pomelada": [
    {ing:"Pomelo (jugo)",        gr:150,  pu:3.0,     u:"gr",  subtotal:450},
    {ing:"Miel",                 gr:10,   pu:16.0,    u:"gr",  subtotal:160},
    {ing:"Jengibre",             gr:3,    pu:36.0,    u:"gr",  subtotal:108},
    {ing:"Pimienta rosa",        gr:0.5,  pu:36.0,    u:"gr",  subtotal:18},
    {ing:"Almíbar manzanilla",   gr:7,    pu:4.0,     u:"gr",  subtotal:28},
    {ing:"Vaso take away",       gr:1,    pu:162.61,  u:"u",   subtotal:162.61},
  ],
  "Mandarinada": [
    {ing:"Mandarina (jugo)",     gr:120,  pu:2.5,     u:"gr",  subtotal:300},
    {ing:"Limón (jugo)",         gr:30,   pu:3.5,     u:"gr",  subtotal:105},
    {ing:"Cardamomo",            gr:0.5,  pu:36.0,    u:"gr",  subtotal:18},
    {ing:"Almíbar banana",       gr:20,   pu:4.0,     u:"gr",  subtotal:80},
    {ing:"Vaso take away",       gr:1,    pu:162.61,  u:"u",   subtotal:162.61},
  ],
  "Jugo de Naranja": [
    {ing:"Naranja (jugo ~550gr)",gr:550,  pu:2.0,     u:"gr",  subtotal:1100},
    {ing:"Vaso take away",       gr:1,    pu:162.61,  u:"u",   subtotal:162.61},
  ],
  "Filtrados": [
    {ing:"Café (dosis 27gr)",    gr:27,   pu:39.0,    u:"gr",  subtotal:1053},
    {ing:"Merma café (19.5%)",   gr:5.265,pu:39.0,    u:"gr",  subtotal:205.34},
    {ing:"Vaso take away",       gr:1,    pu:162.61,  u:"u",   subtotal:162.61},
  ],
  "Té Woolong": [
    {ing:"Té Woolong",           gr:5,    pu:336.0,   u:"gr",  subtotal:1680},
    {ing:"Vaso take away",       gr:1,    pu:162.61,  u:"u",   subtotal:162.61},
  ],

  // ── PASTELERÍA — costos POR UNIDAD (receta dividida por porciones) ──
  // Cookie Chocolate: receta 48829 / 38 unidades = 1284.98 c/u
  "Cookie Chocolate": [
    {ing:"Chocolate amargo (920gr÷38)",gr:24.2,pu:26.265,u:"gr",subtotal:636.02},
    {ing:"Manteca (440gr÷38)",         gr:11.6,pu:13.285,u:"gr",subtotal:153.97},
    {ing:"Cacao amargo (200gr÷38)",    gr:5.3, pu:73.735,u:"gr",subtotal:390.58},
    {ing:"Azúcar común (600gr÷38)",    gr:15.8,pu:1.9584,u:"gr",subtotal:30.92},
    {ing:"Huevos (8u÷38)",             gr:0.21,pu:250.0, u:"u", subtotal:52.63},
    {ing:"Esencia vainilla (8gr÷38)",  gr:0.21,pu:16.698,u:"gr",subtotal:3.52},
    {ing:"Polvo hornear (20gr÷38)",    gr:0.53,pu:6.9143,u:"gr",subtotal:3.64},
    {ing:"Harina 0000 (400gr÷38)",     gr:10.5,pu:1.4907,u:"gr",subtotal:15.66},
    {ing:"Sal (8gr÷38)",               gr:0.21,pu:3.7321,u:"gr",subtotal:0.78},
  ],
  // Cookie Frambuesa: receta 18840 / 30 unidades = 628.02 c/u
  "Cookie Frambuesa": [
    {ing:"Harina 0000 (1000gr÷30)",    gr:33.3,pu:1.4907,u:"gr",subtotal:49.64},
    {ing:"Manteca (400gr÷30)",         gr:13.3,pu:13.285,u:"gr",subtotal:176.69},
    {ing:"Azúcar común (350gr÷30)",    gr:11.7,pu:1.9584,u:"gr",subtotal:22.91},
    {ing:"Azúcar rubia (350gr÷30)",    gr:11.7,pu:2.1191,u:"gr",subtotal:24.79},
    {ing:"Huevos (4u÷30)",             gr:0.13,pu:250.0, u:"u", subtotal:33.33},
    {ing:"Esencia vainilla (10gr÷30)", gr:0.33,pu:16.698,u:"gr",subtotal:5.58},
    {ing:"Polvo hornear (20gr÷30)",    gr:0.67,pu:6.9143,u:"gr",subtotal:4.60},
    {ing:"Bicarbonato (12gr÷30)",      gr:0.4, pu:6.7911,u:"gr",subtotal:2.72},
    {ing:"Sal (20gr÷30)",              gr:0.67,pu:3.7321,u:"gr",subtotal:2.49},
    {ing:"Frambuesas (175gr÷30)",      gr:5.8, pu:22.0,  u:"gr",subtotal:128.33},
    {ing:"Chocolate blanco (200gr÷30)",gr:6.7, pu:26.487,u:"gr",subtotal:176.46},
  ],
  // Cookie Pistacho: receta 30776 / 30 = 1025.87 c/u
  "Cookie Pistacho": [
    {ing:"Harina 0000 (920gr÷30)",     gr:30.7,pu:1.4907,u:"gr",subtotal:45.71},
    {ing:"Manteca (400gr÷30)",         gr:13.3,pu:13.285,u:"gr",subtotal:176.69},
    {ing:"Azúcar común (370gr÷30)",    gr:12.3,pu:1.9584,u:"gr",subtotal:24.19},
    {ing:"Azúcar rubia (370gr÷30)",    gr:12.3,pu:2.1191,u:"gr",subtotal:26.14},
    {ing:"Huevos (4u÷30)",             gr:0.13,pu:250.0, u:"u", subtotal:33.33},
    {ing:"Esencia vainilla (10gr÷30)", gr:0.33,pu:16.698,u:"gr",subtotal:5.58},
    {ing:"Polvo hornear (20gr÷30)",    gr:0.67,pu:6.9143,u:"gr",subtotal:4.60},
    {ing:"Bicarbonato (12gr÷30)",      gr:0.4, pu:6.7911,u:"gr",subtotal:2.72},
    {ing:"Sal (20gr÷30)",              gr:0.67,pu:3.7321,u:"gr",subtotal:2.49},
    {ing:"Pistachos (275gr÷30)",       gr:9.2, pu:74.983,u:"gr",subtotal:688.44},
    {ing:"Naranja ralladura (250gr÷30)",gr:8.3,pu:2.0,   u:"gr",subtotal:16.67},
  ],
  // Alfajor Almendras: masa 9116/27=337.6 + DDL 160.3 = 497.93
  "Alfajor Almendras": [
    {ing:"Manteca (300gr÷27)",         gr:11.1,pu:13.285,u:"gr",subtotal:147.60},
    {ing:"Azúcar impalpable (250gr÷27)",gr:9.3,pu:4.0225,u:"gr",subtotal:37.27},
    {ing:"Huevos (4u÷27)",             gr:0.15,pu:250.0, u:"u", subtotal:37.04},
    {ing:"Harina 0000 (500gr÷27)",     gr:18.5,pu:1.4907,u:"gr",subtotal:27.68},
    {ing:"Almendras (120gr÷27)",       gr:4.4, pu:19.2,  u:"gr",subtotal:85.33},
    {ing:"Esencia vainilla (2gr÷27)",  gr:0.07,pu:16.698,u:"gr",subtotal:1.24},
    {ing:"Polvo hornear (5gr÷27)",     gr:0.19,pu:6.9143,u:"gr",subtotal:1.29},
    {ing:"Sal (2gr÷27)",               gr:0.07,pu:3.7321,u:"gr",subtotal:0.28},
    {ing:"DDL Vacalin (40gr relleno)", gr:40.0,pu:4.00752,u:"gr",subtotal:160.30},
  ],
  // Alfanuí: similar structure con DDL
  "Alfanuí": [
    {ing:"Manteca (320gr÷27)",         gr:11.9,pu:13.285,u:"gr",subtotal:158.05},
    {ing:"Azúcar impalpable (200gr÷27)",gr:7.4,pu:4.0225,u:"gr",subtotal:29.77},
    {ing:"Huevos (2u÷27)",             gr:0.07,pu:250.0, u:"u", subtotal:18.52},
    {ing:"Harina 0000 (500gr÷27)",     gr:18.5,pu:1.4907,u:"gr",subtotal:27.68},
    {ing:"Sal (2gr÷27)",               gr:0.07,pu:3.7321,u:"gr",subtotal:0.28},
    {ing:"Cacao amargo (60gr÷27)",     gr:2.2, pu:73.735,u:"gr",subtotal:162.22},
    {ing:"Almendras (40gr÷27)",        gr:1.5, pu:19.2,  u:"gr",subtotal:28.44},
    {ing:"Esencia vainilla (2gr÷27)",  gr:0.07,pu:16.698,u:"gr",subtotal:1.24},
    {ing:"DDL Vacalin (200gr relleno)",gr:200.0,pu:4.00752,u:"gr",subtotal:801.50},
  ],
  "Alfajor Nevado": [
    {ing:"Manteca (300gr÷27)",         gr:11.1,pu:13.285,u:"gr",subtotal:147.60},
    {ing:"Azúcar impalpable (200gr÷27)",gr:7.4,pu:4.0225,u:"gr",subtotal:29.77},
    {ing:"Huevos (2u÷27)",             gr:0.07,pu:250.0, u:"u", subtotal:18.52},
    {ing:"Harina 0000 (500gr÷27)",     gr:18.5,pu:1.4907,u:"gr",subtotal:27.68},
    {ing:"Almendras (40gr÷27)",        gr:1.5, pu:19.2,  u:"gr",subtotal:28.44},
    {ing:"Esencia vainilla (2gr÷27)",  gr:0.07,pu:16.698,u:"gr",subtotal:1.24},
    {ing:"DDL Vacalin (6gr÷27)",       gr:0.22,pu:4.00752,u:"gr",subtotal:0.89},
    {ing:"Baño choco amargo (90gr÷27)",gr:3.3, pu:26.265,u:"gr",subtotal:87.27},
  ],
  "Alfajor Tita": [
    {ing:"Manteca (300gr÷27)",         gr:11.1,pu:13.285,u:"gr",subtotal:147.60},
    {ing:"Azúcar impalpable (200gr÷27)",gr:7.4,pu:4.0225,u:"gr",subtotal:29.77},
    {ing:"Huevos (2u÷27)",             gr:0.07,pu:250.0, u:"u", subtotal:18.52},
    {ing:"Harina 0000 (500gr÷27)",     gr:18.5,pu:1.4907,u:"gr",subtotal:27.68},
    {ing:"Sal (2gr÷27)",               gr:0.07,pu:3.7321,u:"gr",subtotal:0.28},
    {ing:"Baño choco amargo (90gr÷27)",gr:3.3, pu:26.265,u:"gr",subtotal:87.27},
    {ing:"Esencia vainilla (2gr÷27)",  gr:0.07,pu:16.698,u:"gr",subtotal:1.24},
  ],
  // Budin Limon: receta 8620.72 / 8 porciones = 1077.59
  "Budín Limón": [
    {ing:"Manteca (300gr÷8)",          gr:37.5,pu:13.285,u:"gr",subtotal:498.19},
    {ing:"Azúcar común (300gr÷8)",     gr:37.5,pu:1.9584,u:"gr",subtotal:73.44},
    {ing:"Huevos (6u÷8)",              gr:0.75,pu:250.0, u:"u", subtotal:187.50},
    {ing:"Harina 0000 (360gr÷8)",      gr:45.0,pu:1.4907,u:"gr",subtotal:67.08},
    {ing:"Sal (4gr÷8)",                gr:0.5, pu:3.7321,u:"gr",subtotal:1.87},
    {ing:"Polvo hornear (16gr÷8)",     gr:2.0, pu:6.9143,u:"gr",subtotal:13.83},
    {ing:"Limón (300gr÷8)",            gr:37.5,pu:3.5,   u:"gr",subtotal:131.25},
    {ing:"Semillas amapola (8gr÷8)",   gr:1.0, pu:3.8587,u:"gr",subtotal:3.86},
    {ing:"Azúcar impalpable (200gr÷8)",gr:25.0,pu:4.0225,u:"gr",subtotal:100.56},
  ],
  // Budin Banana: receta 8195.23 / 8 porciones = 1024.40
  "Budín Banana": [
    {ing:"Manteca (200gr÷8)",          gr:25.0,pu:13.285,u:"gr",subtotal:332.13},
    {ing:"Azúcar común (340gr÷8)",     gr:42.5,pu:1.9584,u:"gr",subtotal:83.23},
    {ing:"Huevos (3u÷8)",              gr:0.38,pu:250.0, u:"u", subtotal:93.75},
    {ing:"Harina 0000 (360gr÷8)",      gr:45.0,pu:1.4907,u:"gr",subtotal:67.08},
    {ing:"Sal (3gr÷8)",                gr:0.38,pu:3.7321,u:"gr",subtotal:1.40},
    {ing:"Bicarbonato (5gr÷8)",        gr:0.63,pu:6.7911,u:"gr",subtotal:4.24},
    {ing:"Esencia vainilla (5gr÷8)",   gr:0.63,pu:16.698,u:"gr",subtotal:10.44},
    {ing:"Nueces (130gr÷8)",           gr:16.3,pu:14.9,  u:"gr",subtotal:241.75},
    {ing:"Banana (380gr÷8)",           gr:47.5,pu:4.0,   u:"gr",subtotal:190.00},
  ],
  // Chipa: receta 25180.99 / 30 porciones = 839.37
  "Chipa": [
    {ing:"Fécula mandioca (1020gr÷30)",gr:34.0,pu:2.2050,u:"gr",subtotal:74.97},
    {ing:"Sal (400gr÷30)",             gr:13.3,pu:3.7321,u:"gr",subtotal:49.69},
    {ing:"Polvo hornear (36gr÷30)",    gr:1.2, pu:6.9143,u:"gr",subtotal:8.30},
    {ing:"Leche entera (360ml÷30)",    gr:12.0,pu:1.31629,u:"ml",subtotal:15.80},
    {ing:"Huevos (6u÷30)",             gr:0.2, pu:250.0, u:"u", subtotal:50.00},
    {ing:"Manteca (120gr÷30)",         gr:4.0, pu:13.285,u:"gr",subtotal:53.14},
    {ing:"Queso Gouda (510gr÷30)",     gr:17.0,pu:19.643,u:"gr",subtotal:333.93},
    {ing:"Queso Reggianito (260gr÷30)",gr:8.7, pu:14.665,u:"gr",subtotal:127.58},
    {ing:"Queso Provolone (250gr÷30)", gr:8.3, pu:15.413,u:"gr",subtotal:128.23},
  ],

  // ── COCINA ────────────────────────────────────────────────────
  "Tostón de Palta": [
    {ing:"Pan masa madre",       gr:1,    pu:3400.0,  u:"u",  subtotal:3400},
    {ing:"Queso crema",          gr:40,   pu:7.5148,  u:"gr", subtotal:300.59},
    {ing:"Palta",                gr:80,   pu:8.0,     u:"gr", subtotal:640},
    {ing:"Tomate cherry",        gr:30,   pu:8.0,     u:"gr", subtotal:240},
    {ing:"Aceite de oliva",      gr:10,   pu:18.5,    u:"gr", subtotal:185},
    {ing:"Sal y sésamo",         gr:3,    pu:3.7321,  u:"gr", subtotal:11.20},
  ],
  "Tostón de Perso": [
    {ing:"Pan masa madre",       gr:1,    pu:3400.0,  u:"u",  subtotal:3400},
    {ing:"Queso crema",          gr:40,   pu:7.5148,  u:"gr", subtotal:300.59},
    {ing:"Tomate cherry",        gr:40,   pu:8.0,     u:"gr", subtotal:320},
    {ing:"Granola",              gr:20,   pu:24.595,  u:"gr", subtotal:491.90},
    {ing:"Aceite de oliva",      gr:8,    pu:18.5,    u:"gr", subtotal:148},
  ],
  "Tostado JyQ": [
    {ing:"Pan molde (2 fetas)",  gr:2,    pu:3400.0,  u:"u",  subtotal:6800},
    {ing:"Lomito ahumado",       gr:60,   pu:18.2,    u:"gr", subtotal:1092},
    {ing:"Queso Gouda",          gr:40,   pu:19.643,  u:"gr", subtotal:785.73},
  ],
  "Tostado Capresse": [
    {ing:"Pan molde (2 fetas)",  gr:2,    pu:3400.0,  u:"u",  subtotal:6800},
    {ing:"Tomate perita",        gr:60,   pu:4.0,     u:"gr", subtotal:240},
    {ing:"Queso Reggianito",     gr:40,   pu:14.665,  u:"gr", subtotal:586.61},
    {ing:"Albahaca",             gr:0.15, pu:1500.0,  u:"u",  subtotal:225},
    {ing:"Aceite de oliva",      gr:8,    pu:18.5,    u:"gr", subtotal:148},
  ],
  "Tostadas": [
    {ing:"Pan molde (2 fetas)",  gr:2,    pu:3400.0,  u:"u",  subtotal:6800},
    {ing:"Queso Gouda",          gr:30,   pu:19.643,  u:"gr", subtotal:589.30},
    {ing:"Mermelada casera",     gr:20,   pu:5.0,     u:"gr", subtotal:100},
  ],
  "Sandwich Mortadela": [
    {ing:"Pan masa madre",       gr:1,    pu:3400.0,  u:"u",  subtotal:3400},
    {ing:"Mortadela pistachos",  gr:80,   pu:18.2,    u:"gr", subtotal:1456},
    {ing:"Queso Gouda",          gr:40,   pu:19.643,  u:"gr", subtotal:785.73},
    {ing:"Tomate perita",        gr:40,   pu:4.0,     u:"gr", subtotal:160},
    {ing:"Pesto Divina Oliva",   gr:20,   pu:10.1,    u:"gr", subtotal:202},
  ],
  "Chipa prensado": [
    {ing:"Chipa (base cocida)",  gr:120,  pu:6.99,    u:"gr", subtotal:839},
    {ing:"Lomito ahumado",       gr:40,   pu:18.2,    u:"gr", subtotal:728},
    {ing:"Queso Gouda",          gr:30,   pu:19.643,  u:"gr", subtotal:589.30},
  ],
  "Medialuna rellena": [
    {ing:"Medialuna",            gr:1,    pu:1900.0,  u:"u",  subtotal:1900},
    {ing:"Lomito ahumado",       gr:40,   pu:18.2,    u:"gr", subtotal:728},
    {ing:"Queso Gouda",          gr:30,   pu:19.643,  u:"gr", subtotal:589.30},
  ],
  "Yogurt": [
    {ing:"Yogurt griego",        gr:180,  pu:10.833,  u:"gr", subtotal:1950},
    {ing:"Granola casera",       gr:30,   pu:24.595,  u:"gr", subtotal:737.85},
    {ing:"Miel",                 gr:15,   pu:16.0,    u:"gr", subtotal:240},
    {ing:"Fruta de estación",    gr:60,   pu:6.0,     u:"gr", subtotal:360},
  ],
};

// ── GASTOS FIJOS// ── GASTOS FIJOS ─────────────────────────────────────────────────
const GF_INIT = [
  {id:1, concepto:"Sueldos emp. blanco",  monto:1718776,cat:"Personal",  icon:"👥"},
  {id:2, concepto:"Sueldos emp. negro",   monto:1088000,cat:"Personal",  icon:"👥"},
  {id:3, concepto:"Cargas sociales",       monto:1246698,cat:"Personal",  icon:"📋"},
  {id:4, concepto:"Aguinaldo (ahorro)",    monto:350000, cat:"Personal",  icon:"💰"},
  {id:5, concepto:"Sindicatos",            monto:279692, cat:"Personal",  icon:"🤝"},
  {id:6, concepto:"Autónomos",             monto:62743,  cat:"Personal",  icon:"📄"},
  {id:7, concepto:"Alquiler",              monto:500000, cat:"Estructura",icon:"🏠"},
  {id:8, concepto:"Muni vía pública",      monto:242264, cat:"Estructura",icon:"🏛️"},
  {id:9, concepto:"Habilitación Deck",     monto:242000, cat:"Estructura",icon:"🏗️"},
  {id:10,concepto:"Municipal / DDJJ",      monto:90355,  cat:"Estructura",icon:"📑"},
  {id:11,concepto:"Expensas",              monto:36172,  cat:"Estructura",icon:"🏢"},
  {id:12,concepto:"Seguro",                monto:61171,  cat:"Estructura",icon:"🛡️"},
  {id:13,concepto:"Luz",                   monto:417668, cat:"Servicios", icon:"💡"},
  {id:14,concepto:"Internet + software",   monto:126414, cat:"Servicios", icon:"🌐"},
  {id:15,concepto:"Desinfección",          monto:45000,  cat:"Servicios", icon:"🧹"},
  {id:16,concepto:"TSG / Seg. e Higiene",  monto:142000, cat:"Servicios", icon:"⚠️"},
  {id:17,concepto:"Fotos Sofi",            monto:70000,  cat:"Servicios", icon:"📸"},
  {id:18,concepto:"Contador",              monto:220000, cat:"Admin",     icon:"📊"},
  {id:19,concepto:"Fudo (sistema)",        monto:73150,  cat:"Admin",     icon:"💻"},
  {id:20,concepto:"Tarjeta / Payway",      monto:433155, cat:"Admin",     icon:"💳"},
  {id:21,concepto:"Cuota financiación",    monto:284693, cat:"Admin",     icon:"📅"},
  {id:22,concepto:"IIBB",                  monto:170000, cat:"Impuestos", icon:"🧾"},
  {id:23,concepto:"IVA (promedio mensual)",monto:370000, cat:"Impuestos", icon:"📝"},
];

// ── STOCK ────────────────────────────────────────────────────────
const STOCK_INIT = [
  {item:"Café tolva",         u:"kg", stock:8,   min:3,  max:15,  cd:1.19,icon:"☕",cat:"Café",       prov:"Ponte"},
  {item:"Café 1/4 kg",        u:"u",  stock:3,   min:3,  max:10,  cd:0.2, icon:"☕",cat:"Café",       prov:"Ponte"},
  {item:"Leche entera",       u:"u",  stock:8,   min:10, max:34,  cd:6.87,icon:"🥛",cat:"Lácteos",    prov:"Serenísima",warn:"Pedir 17L/entrega — dura 2.5d"},
  {item:"Leche descremada",   u:"u",  stock:2,   min:1,  max:6,   cd:0.2, icon:"🥛",cat:"Lácteos",    prov:"Serenísima"},
  {item:"Leche deslactosada", u:"u",  stock:1,   min:1,  max:4,   cd:0.1, icon:"🥛",cat:"Lácteos",    prov:"Serenísima"},
  {item:"Yogurt griego",      u:"u",  stock:4,   min:2,  max:8,   cd:0.18,icon:"🥛",cat:"Lácteos",    prov:"Serenísima"},
  {item:"Azúcar común",       u:"kg", stock:2,   min:5,  max:20,  cd:0.38,icon:"🍬",cat:"Alyser",     prov:"Alyser"},
  {item:"Azúcar rubia",       u:"kg", stock:10,  min:3,  max:15,  cd:0.15,icon:"🍬",cat:"Alyser",     prov:"Alyser"},
  {item:"Azúcar impalpable",  u:"kg", stock:2,   min:3,  max:10,  cd:0.15,icon:"🍬",cat:"Alyser",     prov:"Alyser"},
  {item:"Cacao amargo",       u:"kg", stock:0.5, min:1,  max:3,   cd:0.04,icon:"🍫",cat:"Alyser",     prov:"Alyser"},
  {item:"Chocolate amargo",   u:"kg", stock:5,   min:5,  max:10,  cd:0.15,icon:"🍫",cat:"Alyser",     prov:"Alyser"},
  {item:"Harina 0000",        u:"kg", stock:5,   min:10, max:25,  cd:0.45,icon:"🌾",cat:"Alyser",     prov:"Alyser"},
  {item:"Bicarbonato",        u:"gr", stock:2000,min:500,max:3000,cd:10,  icon:"🧂",cat:"Alyser",     prov:"Alyser"},
  {item:"Fécula de maíz",     u:"kg", stock:2,   min:1,  max:4,   cd:0.05,icon:"🌿",cat:"Alyser",     prov:"Alyser"},
  {item:"Polvo hornear",      u:"kg", stock:1,   min:1,  max:3,   cd:0.05,icon:"🧂",cat:"Alyser",     prov:"Alyser"},
  {item:"Crema Milkaut",      u:"u",  stock:2,   min:3,  max:8,   cd:0.2, icon:"🥛",cat:"Alyser",     prov:"Alyser"},
  {item:"Cremato",            u:"kg", stock:0,   min:3,  max:7,   cd:0.08,icon:"🥛",cat:"Alyser",     prov:"Alyser"},
  {item:"Semillas amapola",   u:"gr", stock:700, min:800,max:2000,cd:5,   icon:"🌱",cat:"Alyser",     prov:"Alyser"},
  {item:"Esencia vainilla",   u:"kg", stock:2,   min:3,  max:5,   cd:0.02,icon:"🫙",cat:"Alyser",     prov:"Alyser"},
  {item:"Aceite girasol",     u:"L",  stock:1,   min:1,  max:5,   cd:0.08,icon:"🫙",cat:"Alyser",     prov:"Alyser"},
  {item:"Sal",                u:"gr", stock:500, min:500,max:2000,cd:10,  icon:"🧂",cat:"Alyser",     prov:"Alyser"},
  {item:"Manteca",            u:"kg", stock:4,   min:4,  max:25,  cd:0.32,icon:"🧈",cat:"Alyser",     prov:"Alyser"},
  {item:"Avena",              u:"kg", stock:0,   min:1.5,max:4,   cd:0.05,icon:"🌾",cat:"Alyser",     prov:"Alyser"},
  {item:"Chocolate blanco",   u:"kg", stock:0.5, min:7,  max:10,  cd:0.09,icon:"🍫",cat:"Alyser",     prov:"Alyser"},
  {item:"Fécula mandioca",    u:"kg", stock:5,   min:5,  max:25,  cd:0.61,icon:"🌿",cat:"Alyser",     prov:"Alyser"},
  {item:"Pasas de uva",       u:"kg", stock:0.5, min:1.5,max:3,   cd:0.02,icon:"🍇",cat:"Alyser",     prov:"Alyser"},
  {item:"Harina 000",         u:"kg", stock:5,   min:5,  max:15,  cd:0.1, icon:"🌾",cat:"Alyser",     prov:"Alyser"},
  {item:"Levadura seca",      u:"gr", stock:100, min:100,max:500, cd:5,   icon:"🧫",cat:"Alyser",     prov:"Alyser"},
  {item:"Maní",               u:"kg", stock:10,  min:1,  max:10,  cd:0.05,icon:"🥜",cat:"Alyser",     prov:"Alyser"},
  {item:"Leche condensada",   u:"u",  stock:0,   min:2,  max:8,   cd:0.2, icon:"🥛",cat:"Alyser",     prov:"Alyser"},
  {item:"Galletas Lincoln",   u:"u",  stock:0,   min:6,  max:20,  cd:0.1, icon:"🍪",cat:"Alyser",     prov:"Alyser"},
  {item:"Azúcar mascabo",     u:"kg", stock:1,   min:1,  max:3,   cd:0.02,icon:"🍬",cat:"Alyser",     prov:"Alyser"},
  {item:"Lino",               u:"kg", stock:1,   min:1,  max:3,   cd:0.01,icon:"🌱",cat:"Alyser",     prov:"Alyser"},
  {item:"Queso crema",        u:"kg", stock:1,   min:1,  max:4,   cd:0.10,icon:"🧀",cat:"Alyser",     prov:"Alyser"},
  {item:"Aceto",              u:"ml", stock:500, min:250,max:1000,cd:5,   icon:"🫙",cat:"Alyser",     prov:"Alyser"},
  {item:"Avellanas",          u:"kg", stock:1,   min:1,  max:3,   cd:0.02,icon:"🌰",cat:"Alyser",     prov:"Alyser"},
  {item:"Mascarpone",         u:"gr", stock:250, min:250,max:1000,cd:5,   icon:"🧀",cat:"Alyser",     prov:"Alyser"},
  {item:"Queso Atuel",        u:"kg", stock:1,   min:1,  max:3,   cd:0.08,icon:"🧀",cat:"Alyser",     prov:"Alyser"},
  {item:"Choco baño",         u:"kg", stock:5,   min:2,  max:8,   cd:0.05,icon:"🍫",cat:"Alyser",     prov:"Alyser"},
  {item:"Harina sin TACC",    u:"kg", stock:1,   min:2,  max:5,   cd:0.03,icon:"🌾",cat:"Alyser",     prov:"Alyser"},
  {item:"Almendras",          u:"kg", stock:4,   min:2,  max:10,  cd:0.08,icon:"🌰",cat:"Quintal",    prov:"Quintal"},
  {item:"Pistachos",          u:"kg", stock:2,   min:1,  max:6,   cd:0.03,icon:"🌰",cat:"Quintal",    prov:"Quintal"},
  {item:"Dátiles",            u:"kg", stock:1,   min:1,  max:5,   cd:0.02,icon:"🌴",cat:"Quintal",    prov:"Quintal"},
  {item:"Pasta de maní",      u:"kg", stock:2,   min:1,  max:3,   cd:0.05,icon:"🥜",cat:"Quintal",    prov:"Quintal"},
  {item:"Nueces",             u:"kg", stock:1,   min:0.5,max:2,   cd:0.02,icon:"🌰",cat:"Quintal",    prov:"Quintal"},
  {item:"Huevos",             u:"u",  stock:30,  min:30, max:60,  cd:3.4, icon:"🥚",cat:"Verdulería", prov:"Huevero"},
  {item:"Naranja",            u:"kg", stock:4,   min:4,  max:8,   cd:0.5, icon:"🍊",cat:"Verdulería", prov:"Verdulería"},
  {item:"Pomelo",             u:"kg", stock:2,   min:2,  max:5,   cd:0.2, icon:"🍋",cat:"Verdulería", prov:"Verdulería"},
  {item:"Mandarina",          u:"kg", stock:2,   min:2,  max:5,   cd:0.2, icon:"🍊",cat:"Verdulería", prov:"Verdulería"},
  {item:"Limón",              u:"kg", stock:2,   min:2,  max:5,   cd:0.2, icon:"🍋",cat:"Verdulería", prov:"Verdulería"},
  {item:"Tomate perita",      u:"kg", stock:1,   min:3,  max:6,   cd:0.2, icon:"🍅",cat:"Verdulería", prov:"Verdulería"},
  {item:"Tomate cherry",      u:"kg", stock:0.5, min:0.5,max:2,   cd:0.08,icon:"🍅",cat:"Verdulería", prov:"Verdulería"},
  {item:"Banana",             u:"kg", stock:1,   min:1,  max:3,   cd:0.15,icon:"🍌",cat:"Verdulería", prov:"Verdulería"},
  {item:"Palta",              u:"kg", stock:1.5, min:1,  max:3,   cd:0.18,icon:"🥑",cat:"Verdulería", prov:"Verdulería"},
  {item:"Albahaca",           u:"u",  stock:2,   min:2,  max:5,   cd:0.2, icon:"🌿",cat:"Verdulería", prov:"Verdulería"},
  {item:"Frutilla",           u:"kg", stock:0,   min:0.5,max:2,   cd:0.05,icon:"🍓",cat:"Verdulería", prov:"Verdulería"},
  {item:"Jengibre",           u:"gr", stock:200, min:200,max:500, cd:5,   icon:"🌿",cat:"Verdulería", prov:"Verdulería"},
  {item:"Batata",             u:"kg", stock:1,   min:1,  max:3,   cd:0.02,icon:"🍠",cat:"Verdulería", prov:"Verdulería"},
  {item:"Zanahoria",          u:"kg", stock:1,   min:1,  max:3,   cd:0.05,icon:"🥕",cat:"Verdulería", prov:"Verdulería"},
  {item:"Pera",               u:"u",  stock:1,   min:1,  max:5,   cd:0.05,icon:"🍐",cat:"Verdulería", prov:"Verdulería"},
  {item:"Berenjena",          u:"u",  stock:2,   min:2,  max:5,   cd:0.1, icon:"🍆",cat:"Verdulería", prov:"Verdulería"},
  {item:"Zucchini",           u:"u",  stock:2,   min:2,  max:5,   cd:0.05,icon:"🥒",cat:"Verdulería", prov:"Verdulería"},
  {item:"Puerros",            u:"kg", stock:1,   min:1,  max:3,   cd:0.03,icon:"🌱",cat:"Verdulería", prov:"Verdulería"},
  {item:"Cebolla morada",     u:"kg", stock:0.5, min:0.5,max:2,   cd:0.03,icon:"🧅",cat:"Verdulería", prov:"Verdulería"},
  {item:"Cebolla de verdeo",  u:"kg", stock:0.5, min:0.5,max:2,   cd:0.03,icon:"🌱",cat:"Verdulería", prov:"Verdulería"},
  {item:"Ajo",                u:"u",  stock:1,   min:1,  max:3,   cd:0.05,icon:"🧄",cat:"Verdulería", prov:"Verdulería"},
  {item:"Morrón",             u:"u",  stock:1,   min:1,  max:3,   cd:0.03,icon:"🫑",cat:"Verdulería", prov:"Verdulería"},
  {item:"Rúcula",             u:"u",  stock:1,   min:1,  max:3,   cd:0.05,icon:"🌿",cat:"Verdulería", prov:"Verdulería"},
  {item:"Miel",               u:"gr", stock:250, min:250,max:1000,cd:12,  icon:"🍯",cat:"Verdulería", prov:"Miel"},
  {item:"Frambuesas",         u:"kg", stock:1.5, min:1,  max:3,   cd:0.03,icon:"🫐",cat:"Il Mirtilo", prov:"Il Mirtilo"},
  {item:"Frutos rojos",       u:"kg", stock:1,   min:2,  max:4,   cd:0.05,icon:"🫐",cat:"Il Mirtilo", prov:"Il Mirtilo"},
  {item:"Maracuyá",           u:"kg", stock:0.25,min:0.25,max:1,  cd:0.02,icon:"🍈",cat:"Il Mirtilo", prov:"Il Mirtilo"},
  {item:"Lomito ahumado",     u:"kg", stock:1,   min:0.5,max:2,   cd:0.10,icon:"🥩",cat:"Francesco",  prov:"Francesco"},
  {item:"Queso Gouda",        u:"kg", stock:2,   min:1,  max:4,   cd:0.12,icon:"🧀",cat:"Francesco",  prov:"Francesco"},
  {item:"Queso Dambo",        u:"kg", stock:1.5, min:1,  max:3,   cd:0.10,icon:"🧀",cat:"Francesco",  prov:"Francesco"},
  {item:"Queso Reggianito",   u:"kg", stock:1,   min:0.5,max:2,   cd:0.05,icon:"🧀",cat:"Francesco",  prov:"Francesco"},
  {item:"Queso Provolone",    u:"kg", stock:1,   min:0.5,max:2,   cd:0.03,icon:"🧀",cat:"Francesco",  prov:"Francesco"},
  {item:"DDL Vacalin",        u:"kg", stock:6,   min:1,  max:10,  cd:0.14,icon:"🍯",cat:"Francesco",  prov:"Francesco"},
  {item:"Mortadela pistachos",u:"kg", stock:0.5, min:0.5,max:2,   cd:0.08,icon:"🥩",cat:"Francesco",  prov:"Francesco"},
  {item:"Jamón crudo",        u:"kg", stock:0.5, min:0.5,max:2,   cd:0.03,icon:"🥩",cat:"Francesco",  prov:"Francesco"},
  {item:"Bondiola",           u:"kg", stock:0.5, min:0.5,max:2,   cd:0.03,icon:"🥩",cat:"Francesco",  prov:"Francesco"},
  {item:"Aceite de oliva",    u:"ml", stock:500, min:500,max:2000,cd:10,  icon:"🫙",cat:"Divina Oliva",prov:"Divina Oliva"},
  {item:"Pesto",              u:"gr", stock:400, min:200,max:634, cd:4,   icon:"🫙",cat:"Divina Oliva",prov:"Divina Oliva"},
  {item:"Pan masa madre",     u:"u",  stock:3,   min:3,  max:8,   cd:0.95,icon:"🍞",cat:"Panificados",prov:"Maza"},
  {item:"Medialuna",          u:"u",  stock:90,  min:20, max:180, cd:22,  icon:"🥐",cat:"Panificados",prov:"Punto"},
  {item:"Vasos 8oz",          u:"u",  stock:278, min:50, max:400, cd:20,  icon:"🥤",cat:"Descartables",prov:"Manapel"},
  {item:"Vasos 12oz",         u:"u",  stock:85,  min:70, max:300, cd:10,  icon:"🥤",cat:"Descartables",prov:"Manapel"},
  {item:"Vasos fríos",        u:"u",  stock:35,  min:30, max:100, cd:5,   icon:"🥤",cat:"Descartables",prov:"Manapel"},
  {item:"Cajas delivery ch.", u:"u",  stock:40,  min:10, max:80,  cd:2,   icon:"📦",cat:"Descartables",prov:"Manapel"},
  {item:"Servilletas",        u:"u",  stock:0,   min:500,max:1000,cd:30,  icon:"🧻",cat:"Descartables",prov:"Manapel"},
  {item:"Bolsas Kraft",       u:"pk", stock:3,   min:1,  max:4,   cd:0.1, icon:"🛍️",cat:"Descartables",prov:"Manapel"},
  {item:"Film PVC",           u:"u",  stock:1,   min:0.5,max:2,   cd:0.05,icon:"📦",cat:"Descartables",prov:"Manapel"},
  {item:"Rollo aluminio",     u:"u",  stock:1,   min:0.5,max:2,   cd:0.05,icon:"📦",cat:"Descartables",prov:"Manapel"},
  {item:"Earl Grey",          u:"gr", stock:60,  min:30, max:200, cd:2,   icon:"🍵",cat:"Té",          prov:"Té"},
  {item:"Té verde",           u:"gr", stock:30,  min:30, max:200, cd:0.5, icon:"🍵",cat:"Té",          prov:"Té"},
];

const COMPROMISOS_INIT = [
  {concepto:"Cargas sociales",           fecha:"22/05",monto:1246698,urgente:true, pagado:false,tipo:"fijo",origen:"fijo"},
  {concepto:"Aguinaldo ahorro",          fecha:"22/05",monto:350000, urgente:true, pagado:false,tipo:"fijo",origen:"fijo"},
  {concepto:"Alyser — facturas 07+13/05",fecha:"28/05",monto:81544,  urgente:false,pagado:false,tipo:"proveedor",origen:"factura"},
  {concepto:"Alquiler + servicios",      fecha:"01/06",monto:723757,  urgente:false,pagado:false,tipo:"fijo",origen:"fijo"},
  {concepto:"Alyser — factura 18/05",   fecha:"08/06",monto:389404,  urgente:false,pagado:false,tipo:"proveedor",origen:"factura"},
  {concepto:"Sueldos empleados",         fecha:"10/06",monto:2806800, urgente:false,pagado:false,tipo:"fijo",origen:"fijo"},
  {concepto:"Cargas sociales junio",     fecha:"15/06",monto:1246698, urgente:false,pagado:false,tipo:"fijo",origen:"fijo"},
];

const MAYO_CAL={
  22:[{tipo:"out",label:"Cargas soc.",monto:1246698},{tipo:"out",label:"Aguinaldo",monto:350000}],
  23:[{tipo:"in",label:"PedidosYa",monto:23100}],
  24:[{tipo:"in",label:"BigBox+PYA",monto:85420}],
  25:[{tipo:"in",label:"PedidosYa",monto:99120}],
  28:[{tipo:"out",label:"Alyser",monto:81544},{tipo:"proy",label:"Vtas prom.",monto:86450}],
  29:[{tipo:"proy",label:"Vtas prom.",monto:31010}],
  30:[{tipo:"proy",label:"Vtas prom.",monto:37100}],
  31:[{tipo:"proy",label:"BigBox+PYA",monto:181970}],
};
const JUNIO_CAL={
  1: [{tipo:"out",label:"Alquiler",monto:500000},{tipo:"out",label:"Servicios",monto:223757},{tipo:"out",label:"Sueldo socios",monto:1000000},{tipo:"proy",label:"BigBox",monto:70300}],
  3: [{tipo:"proy",label:"BigBox+PYA",monto:45000}],
  5: [{tipo:"out",label:"Contador",monto:220000}],
  8: [{tipo:"out",label:"Luz",monto:417668},{tipo:"out",label:"Alyser",monto:389404}],
  10:[{tipo:"out",label:"Sueldos",monto:2806800},{tipo:"out",label:"Muni",monto:242264}],
  15:[{tipo:"out",label:"Cargas soc.",monto:1246698}],
  20:[{tipo:"out",label:"Sindicatos",monto:279692},{tipo:"out",label:"Payway",monto:433155}],
};

const COMBOS = [
  {nombre:"Latte + Cookie",        tipo:"Desayuno",pv:8000, pvSug:8500, ct:6679,rent:16.5,u:45,accion:"subir",  nota:"Subir a $8.500 — rent. pasa a 21.2%."},
  {nombre:"Latte + Tostadas",      tipo:"Desayuno",pv:9900, pvSug:11500,ct:9237,rent:6.7, u:12,accion:"revisar",nota:"Crítico (6.7%). Subir a $11.500 urgente."},
  {nombre:"Latte + Tostado",       tipo:"Desayuno",pv:12300,pvSug:13500,ct:10870,rent:11.6,u:18,accion:"subir", nota:"Subir a $13.500 — rent. pasa a 19.5%."},
  {nombre:"Latte + Chipa",         tipo:"Desayuno",pv:8000, pvSug:8500, ct:6829,rent:14.6,u:55,accion:"subir",  nota:"El más vendido. Subir $500 sin riesgo."},
  {nombre:"Latte + Alfajor Alm.",  tipo:"Desayuno",pv:8000, pvSug:8000, ct:6363,rent:20.5,u:22,accion:"ok",    nota:"Mejor margen del desayuno. Mantener."},
  {nombre:"S. Mortadela + Bebida", tipo:"Almuerzo",pv:16500,pvSug:16500,ct:12714,rent:22.9,u:15,accion:"ok",   nota:"Buen margen. Potenciar cuando salga el Bondio."},
  {nombre:"S. Bondio + Bebida",    tipo:"Almuerzo",pv:19000,pvSug:null, ct:13129,rent:30.9,u:8, accion:"revisar",nota:"Bondio sale pronto. No invertir."},
  {nombre:"S. Veggie + Bebida",    tipo:"Almuerzo",pv:16500,pvSug:null, ct:12429,rent:24.7,u:6, accion:"revisar",nota:"Veggie sale pronto. Planificar reemplazo."},
];


// ── PLANILLA MAESTRA DE COSTOS ───────────────────────────────────
// MP extraídos de planillas originales: costos_batata_CAFE_1.xlsx,
// Costos_comida_1.xlsx, COSTOS_BATATA_Cocina_1.xlsx
const PLANILLA_COSTOS = {
  cafe: [
    {n:"Espresso",          mp:582,  pv:3800, u:22,  cat:"Café"},
    {n:"Espresso doble",    mp:1002, pv:5000, u:89,  cat:"Café"},
    {n:"Cortado",           mp:727,  pv:4600, u:74,  cat:"Café"},
    {n:"Cappuccino",        mp:785,  pv:5000, u:56,  cat:"Café"},
    {n:"Flat White",        mp:1214, pv:5800, u:248, cat:"Café"},
    {n:"Cappu Doble",       mp:1279, pv:6000, u:106, cat:"Café"},
    {n:"Latte",             mp:888,  pv:5600, u:236, cat:"Café"},
    {n:"Chocolate Caliente",mp:489,  pv:6000, u:16,  cat:"Café"},
    {n:"Dame Números",      mp:1514, pv:7000, u:27,  cat:"Café"},
    {n:"Cappusotto",        mp:1220, pv:6200, u:35,  cat:"Café"},
    {n:"Suaave",            mp:1045, pv:6700, u:53,  cat:"Café"},
    {n:"Cappu Marplatense", mp:1220, pv:6200, u:14,  cat:"Café"},
    {n:"Pomelada",          mp:938,  pv:5000, u:49,  cat:"Café"},
    {n:"Mandarinada",       mp:847,  pv:4700, u:31,  cat:"Café"},
    {n:"Jugo de Naranja",   mp:1106, pv:4300, u:70,  cat:"Café"},
    {n:"Limo durazno",      mp:1079, pv:4900, u:46,  cat:"Café"},
    {n:"Té Woolong",        mp:1669, pv:4900, u:18,  cat:"Café"},
    {n:"Filtrados",         mp:1816, pv:7500, u:6,   cat:"Café"},
    {n:"Espresso largo",    mp:582,  pv:5000, u:9,   cat:"Café"},
    {n:"Americano",         mp:1002, pv:5000, u:60,  cat:"Café"},
  ],
  pasteleria: [
    {n:"Cookie Frambuesa",  mp:628,  pv:4100, u:156, cat:"Pastelería"},
    {n:"Cookie Pistacho",   mp:1026, pv:4100, u:104, cat:"Pastelería"},
    {n:"Cookie Chocolate",  mp:1285, pv:5100, u:88,  cat:"Pastelería"},
    {n:"Alfanuí",           mp:1158, pv:5000, u:56,  cat:"Pastelería"},
    {n:"Alfajor Nevado",    mp:1397, pv:5200, u:14,  cat:"Pastelería"},
    {n:"Alfajor Almendras", mp:498,  pv:3800, u:29,  cat:"Pastelería"},
    {n:"Alfajor Tita",      mp:623,  pv:3800, u:25,  cat:"Pastelería"},
    {n:"Budín Limón",       mp:833,  pv:4200, u:44,  cat:"Pastelería"},
    {n:"Budín Banana",      mp:797,  pv:4200, u:27,  cat:"Pastelería"},
    {n:"Chipa",             mp:839,  pv:4000, u:208, cat:"Pastelería"},
    {n:"Cheesecake",        mp:2367, pv:8500, u:33,  cat:"Pastelería esp."},
    {n:"Vasca de DDL",      mp:2388, pv:8000, u:27,  cat:"Pastelería esp."},
    {n:"Key Lime",          mp:2747, pv:7900, u:16,  cat:"Pastelería esp."},
    {n:"Sniker",            mp:1670, pv:5600, u:22,  cat:"Pastelería esp."},
    {n:"Rol de Canela",     mp:275,  pv:3500, u:12,  cat:"Pastelería esp."},
    {n:"Cookie Vegana",     mp:800,  pv:4100, u:3,   cat:"Pastelería"},
    {n:"Medialuna",         mp:900,  pv:3800, u:133, cat:"Pastelería"},
  ],
  cocina: [
    {n:"Tostón de Palta",       mp:2464, pv:10000, u:50, cat:"Cocina"},
    {n:"Tostón de Perso",       mp:1828, pv:9000,  u:8,  cat:"Cocina"},
    {n:"Tostado JyQ",           mp:2094, pv:8500,  u:46, cat:"Cocina"},
    {n:"Tostado Capresse",      mp:1759, pv:8500,  u:25, cat:"Cocina"},
    {n:"Tostadas",              mp:1080, pv:7500,  u:6,  cat:"Cocina"},
    {n:"Sandwich Mortadela",    mp:3042, pv:12500, u:21, cat:"Cocina"},
    {n:"Chipa prensado LyQ",    mp:1621, pv:8000,  u:47, cat:"Cocina"},
    {n:"Chipa prensado Cap.",   mp:1643, pv:8000,  u:47, cat:"Cocina"},
    {n:"Medialuna Capresse",    mp:2518, pv:9500,  u:13, cat:"Cocina"},
    {n:"Medialuna rellena LyQ", mp:2543, pv:9500,  u:27, cat:"Cocina"},
    {n:"Yogurt Casero",         mp:2094, pv:9200,  u:4,  cat:"Cocina"},
    {n:"Pancakes",              mp:1800, pv:11000, u:7,  cat:"Cocina"},
  ],
};

// ── HELPERS ───────────────────────────────────────────────────────
const Pill=({label,color})=>(<span style={{fontSize:10,padding:"2px 8px",borderRadius:20,background:`${color}22`,color,border:`1px solid ${color}44`,fontWeight:600}}>{label}</span>);
const SL=({children})=>(<div style={{fontSize:10,fontWeight:600,color:C.muted,letterSpacing:".05em",textTransform:"uppercase",margin:"1.25rem 0 .6rem"}}>{children}</div>);
const KPI=({label,value,sub,color,borde,prev,rawValue,comparaciones})=>{
  let varPct=null, varDir=null;
  if(prev!=null && rawValue!=null && prev>0){
    varPct=((rawValue-prev)/prev*100);
    varDir=varPct>=0?"↑":"↓";
  }
  const fmtComp=(val,ref)=>{
    if(ref==null||ref===0) return {txt:"— sin dato",col:C.muted};
    const pct=((val-ref)/ref*100);
    if(Math.abs(pct)<0.5) return {txt:"≈ igual",col:C.muted};
    const dir=pct>=0?"↑":"↓";
    return {txt:`${dir}${Math.abs(pct).toFixed(1)}%`,col:pct>=0?C.green:C.red};
  };
  return(
    <div style={{background:C.card,borderRadius:10,padding:"14px 16px",border:`1px solid ${borde?borde+"44":C.border}`}}>
      <div style={{fontSize:10,color:C.muted,marginBottom:4}}>{label}</div>
      <div style={{fontSize:18,fontWeight:700,color:color||C.text}}>{value}</div>
      {varPct!=null&&!comparaciones&&(
        <div style={{fontSize:10,marginTop:3,color:varDir==="↑"?C.green:C.red,fontWeight:600}}>
          {varDir} {Math.abs(varPct).toFixed(1)}% vs abril
        </div>
      )}
      {sub&&!varPct&&!comparaciones&&<div style={{fontSize:10,color:C.muted,marginTop:3}}>{sub}</div>}
      {comparaciones&&comparaciones.length>0&&(
        <div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:5}}>
          {comparaciones.map((c,i)=>{
            const {txt,col}=rawValue!=null?fmtComp(rawValue,c.ref):{txt:c.valor||"— sin dato",col:c.color||C.muted};
            return(
              <span key={i} style={{fontSize:10,color:col,whiteSpace:"nowrap"}}>
                {i>0&&<span style={{color:C.dim,marginRight:3}}>·</span>}
                <span style={{color:C.muted}}>{c.label}: </span>{txt}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
};
const AC={potenciar:C.green,subir:C.yellow,revisar:C.red,ok:C.blue};
const AL={potenciar:"⭐ Potenciar",subir:"↑ Subir precio",revisar:"⚠️ Revisar",ok:"✓ OK"};

// ── FICHA DE COSTO ────────────────────────────────────────────────
function FichaCosto({prod,totalGF,onClose}){
  const recetaLocal=RECETAS[prod.n]||[];
  const [editando,setEditando]=useState(false);
  const [ingrs,setIngrs]=useState(recetaLocal.map(r=>({...r})));
  const [cargandoReceta,setCargandoReceta]=useState(false);
  // Cargar receta desde Supabase si está en modo live
  useEffect(()=>{
    if(DATA_SOURCE==="live"){
      setCargandoReceta(true);
      fetch(`${SUPABASE_URL}/rest/v1/recetas?producto=eq.${encodeURIComponent(prod.n)}&select=ingredientes`,
        {headers:{"apikey":SUPABASE_KEY,"Authorization":`Bearer ${SUPABASE_KEY}`}})
        .then(r=>r.json())
        .then(data=>{
          if(Array.isArray(data)&&data.length>0&&data[0].ingredientes){
            setIngrs(data[0].ingredientes.map(r=>({...r})));
          }
          setCargandoReceta(false);
        }).catch(e=>{console.warn("Error cargando receta:",e);setCargandoReceta(false);});
    }
  },[prod.n]);
  const mpReceta=ingrs.reduce((s,r)=>s+(r.subtotal||r.gr*r.pu),0);
  const mpOficial=prod.mp||mpReceta; // MP verificado de planilla > suma de receta
  const gfu=prod.pv*totalGF/FACT_BASE;
  const iibb=prod.pv*0.015;
  const tc=prod.pv*0.0501;
  const ct=mpOficial+gfu+iibb+tc;
  const rent=(prod.pv-ct)/prod.pv*100;
  const rentC=rent>30?C.green:rent>20?C.yellow:C.red;
  const mpDiff=Math.abs(mpReceta-mpOficial)>50;
  return(
    <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,.85)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16}}>
      <div style={{background:C.card,borderRadius:14,padding:"24px",width:500,maxWidth:"100%",maxHeight:"90vh",overflowY:"auto",border:`1px solid ${C.border}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div>
            <div style={{fontSize:16,fontWeight:700}}>{prod.n}</div>
            <div style={{fontSize:11,color:C.muted,marginTop:2}}>{prod.cat}</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:22}}>×</button>
        </div>

        {/* Desglose */}
        <div style={{background:C.card2,borderRadius:10,padding:"14px 16px",marginBottom:16}}>
          <div style={{fontSize:10,fontWeight:600,color:C.muted,marginBottom:10,textTransform:"uppercase",letterSpacing:".05em"}}>Desglose del costo</div>
          {[
            {l:"Materia Prima (verificado)",v:mpOficial,c:C.text},
            {l:`GFU — PV (${fmt(prod.pv)}) × GF (${fmtK(totalGF)}) / Fact. (${fmtK(FACT_BASE)})`,v:gfu,c:C.muted},
            {l:"IIBB (1.5%)",v:iibb,c:C.muted},
            {l:"Tarjeta (5.01%)",v:tc,c:C.muted},
          ].map((r,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:`1px solid ${C.border}22`}}>
              <span style={{fontSize:11,color:r.c}}>{r.l}</span>
              <span style={{fontSize:11,fontWeight:600,color:r.c}}>{fmt(r.v)}</span>
            </div>
          ))}
          <div style={{display:"flex",justifyContent:"space-between",padding:"8px 0 4px",borderTop:`1px solid ${C.border}`,marginTop:4}}>
            <span style={{fontSize:13,fontWeight:700}}>Costo total</span>
            <span style={{fontSize:13,fontWeight:700}}>{fmt(ct)}</span>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",padding:"3px 0"}}>
            <span style={{fontSize:12,color:C.muted}}>Precio de venta</span>
            <span style={{fontSize:12,color:C.muted}}>{fmt(prod.pv)}</span>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",padding:"3px 0"}}>
            <span style={{fontSize:13,fontWeight:700,color:rentC}}>Rentabilidad</span>
            <span style={{fontSize:16,fontWeight:700,color:rentC}}>{rent.toFixed(1)}%</span>
          </div>
        </div>

        {/* Receta */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div style={{fontSize:10,fontWeight:600,color:C.muted,textTransform:"uppercase",letterSpacing:".05em"}}>
            Receta {ingrs.length===0&&<span style={{color:C.red,fontSize:10}}>— pendiente</span>}
          </div>
          {ingrs.length>0&&(
            <button onClick={()=>{
                if(editando && DATA_SOURCE==="live"){
                  // Guardar receta en Supabase
                  const ingredientes=ingrs.map(r=>({ing:r.ing,gr:r.gr,pu:r.pu,u:r.u,subtotal:r.subtotal||r.gr*r.pu}));
                  fetch(`${SUPABASE_URL}/rest/v1/recetas?producto=eq.${encodeURIComponent(prod.n)}`,{
                    method:"PATCH",
                    headers:{"apikey":SUPABASE_KEY,"Authorization":`Bearer ${SUPABASE_KEY}`,"Content-Type":"application/json","Prefer":"return=minimal"},
                    body:JSON.stringify({ingredientes,updated_by:"Lautaro",updated_at:new Date().toISOString()})
                  }).catch(e=>console.warn("Error guardando receta:",e));
                }
                setEditando(!editando);
              }}
              style={{fontSize:11,padding:"4px 10px",borderRadius:6,border:`1px solid ${editando?C.accent:C.border}`,background:editando?C.accentDim:C.card,color:editando?C.accent:C.muted,cursor:"pointer"}}>
              {editando?"✓ Guardar receta":"✏️ Editar receta"}
            </button>
          )}
        </div>
        {ingrs.length>0?(
          <div style={{background:C.card2,borderRadius:10,overflow:"hidden"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead>
                <tr>
                  {["Ingrediente","Gr/ml/u","Precio/kg","Costo"].map(h=>(
                    <th key={h} style={{textAlign:"left",padding:"7px 10px",color:C.muted,fontSize:10,fontWeight:600,borderBottom:`1px solid ${C.border}`}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ingrs.map((r,i)=>(
                  <tr key={i} style={{borderBottom:i<ingrs.length-1?`1px solid ${C.border}22`:"none"}}>
                    <td style={{padding:"7px 10px"}}>{r.ing}</td>
                    <td style={{padding:"7px 10px",textAlign:"center"}}>
                      {editando
                        ? <input type="number" step="0.5" value={r.gr} onChange={e=>{const ng=Number(e.target.value);setIngrs(ingrs.map((x,j)=>j===i?{...x,gr:ng,subtotal:ng*x.pu}:x));}}
                            style={{width:60,padding:"3px 6px",fontSize:12,background:C.bg,border:`1px solid ${C.accent}`,borderRadius:5,color:C.text,textAlign:"center"}}/>
                        : r.gr
                      }
                    </td>
                    <td style={{padding:"7px 10px",textAlign:"right",color:C.muted,fontSize:11}}>{fmt(r.pu)}/kg</td>
                    <td style={{padding:"7px 10px",textAlign:"right",fontWeight:600}}>{fmt(r.subtotal||r.gr*r.pu/1000)}</td>
                  </tr>
                ))}
                <tr style={{borderTop:`1px solid ${C.border}`,background:"rgba(255,255,255,.02)"}}>
                  <td colSpan={3} style={{padding:"7px 10px",fontWeight:700}}>Total MP</td>
                  <td style={{padding:"7px 10px",textAlign:"right",fontWeight:700,color:mpDiff?C.yellow:C.accent}}>
                    {fmt(mpReceta)}
                    {mpDiff&&<div style={{fontSize:9,color:C.yellow,fontWeight:500,marginTop:2}}>⚠ Difiere del MP verificado ({fmt(mpOficial)})</div>}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ):(
          <div style={{padding:16,background:C.card2,borderRadius:10,fontSize:12,color:C.muted,textAlign:"center"}}>Receta pendiente de cargar.</div>
        )}
      </div>
    </div>
  );
}


// === CAPA DE DATOS — reemplazar cada función con fetch real cuando esté disponible ===
async function getVentas()      { return VENTAS_MAP; }
async function getRanking()     { return RANKING; }
async function getStock() {
  if (DATA_SOURCE === "live") {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/stock?select=*&order=categoria`,
        { headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` } }
      );
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data.map(r => ({
          item: r.item, u: r.unidad, stock: r.stock_actual,
          min: r.stock_min, max: r.stock_max, cd: r.consumo_dia,
          icon: r.icono, cat: r.categoria, prov: r.proveedor,
        }));
      }
    } catch(e) { console.warn("Supabase stock error:", e); }
  }
  return STOCK_INIT;
}
async function getGastosFijos() {
  if (DATA_SOURCE === "live") {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/gastos_fijos?select=id,concepto,monto,categoria,icono&activo=eq.true`,
        { headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` } }
      );
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data.map(r => ({ ...r, cat: r.categoria }));
      }
    } catch(e) { console.warn("Supabase GF error:", e); }
  }
  return GF_INIT;
}
async function getCompromisos() {
  if (DATA_SOURCE === "live") {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/compromisos?select=*&order=fecha.asc`,
        { headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` } }
      );
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data.map(r => ({
          concepto: r.concepto,
          fecha: r.fecha?.slice(5).split("-").reverse().join("/"),
          monto: r.monto, tipo: r.tipo, origen: r.origen,
          urgente: r.urgente, pagado: r.pagado, _id: r.id,
        }));
      }
    } catch(e) { console.warn("Supabase compromisos error:", e); }
  }
  return COMPROMISOS_INIT;
}
async function getRecetas()     { return RECETAS; }
async function getCombos()      { return COMBOS; }
// ==================================================================================
// En modo "live": gastos fijos, saldos, compromisos y stock vienen de Supabase.
// Ventas y productos vienen de Fudo API (el 1/6).
// Recetas y combos permanecen en código hasta que tengamos editor de recetas.
// ==================================================================================

// ── PROVEEDOR ALERTA ──────────────────────────────────────────────
function ProvAlerta({prov,items,col,pedidoTexto,notif,onNotif}){
  const [open,setOpen]=useState(false);
  const [copied,setCopied]=useState(false);
  const tieneRojo=items.some(s=>s.nivel==="rojo");
  const copy=()=>{
    navigator.clipboard.writeText(pedidoTexto).then(()=>{
      setCopied(true);
      setTimeout(()=>setCopied(false),2000);
    });
  };
  return(
    <div style={{background:tieneRojo?C.redDim:C.yellowDim,borderRadius:10,padding:"10px 14px",border:`1px solid ${col}44`,marginBottom:8}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}} onClick={()=>setOpen(!open)}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:16}}>{tieneRojo?"🔴":"🟡"}</span>
          <div>
            <div style={{fontWeight:700,color:col,fontSize:12}}>{prov}</div>
            <div style={{fontSize:10,color:C.muted,marginTop:1}}>{items.length} producto{items.length>1?"s":""} para reponer</div>
          </div>
        </div>
        <span style={{color:col,fontSize:14}}>{open?"▲":"▼"}</span>
      </div>
      {open&&(
        <div style={{marginTop:12}}>
          {items.map((s,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0",borderBottom:i<items.length-1?`1px solid ${col}22`:"none"}}>
              <span style={{fontSize:12}}>{s.icon} {s.item} — stock: <span style={{color:col,fontWeight:700}}>{s.stock}{s.u}</span> · pedir: <span style={{fontWeight:600}}>{s.max}{s.u}</span></span>
              {notif[s.item]
                ? <span style={{fontSize:10,color:C.green,marginLeft:8}}>✓ {notif[s.item].quien}</span>
                : <button onClick={e=>{e.stopPropagation();onNotif(s.item);}} style={{fontSize:10,padding:"2px 7px",borderRadius:6,border:`1px solid ${col}44`,background:`${col}18`,color:col,cursor:"pointer",marginLeft:8,flexShrink:0}}>Notificado</button>
              }
            </div>
          ))}
          <div style={{marginTop:12}}>
            <div style={{fontSize:10,color:C.muted,marginBottom:6,fontWeight:600,textTransform:"uppercase",letterSpacing:".04em"}}>Texto para enviar al proveedor</div>
            <div style={{background:C.bg,borderRadius:8,padding:"10px 12px",fontSize:11,color:C.text,lineHeight:1.7,fontFamily:"monospace",whiteSpace:"pre-line",border:`1px solid ${C.border}`,marginBottom:8}}>
              {pedidoTexto}
            </div>
            <button onClick={copy} style={{fontSize:11,padding:"6px 14px",borderRadius:6,border:`1px solid ${col}44`,background:copied?C.greenDim:col+"18",color:copied?C.green:col,cursor:"pointer",fontWeight:600}}>
              {copied?"✓ Copiado!":"📋 Copiar mensaje"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── CALENDARIO CON TOOLTIP ────────────────────────────────────────
function Calendario({compromisos,onConfirmar}){
  const [modal,setModal]=useState(null);
  const [tooltip,setTooltip]=useState(null);
  const meses=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

  function DayCell({d,month,year,events}){
    const isHoy=new Date().getDate()===d&&new Date().getMonth()===month;
    const totalIn=events.filter(e=>e.tipo!=="out").reduce((s,e)=>s+e.monto,0);
    const totalOut=events.filter(e=>e.tipo==="out").reduce((s,e)=>s+e.monto,0);
    const has=events.length>0;
    return(
      <div
        onMouseEnter={()=>has&&setTooltip({d,month,totalIn,totalOut})}
        onMouseLeave={()=>setTooltip(null)}
        onClick={()=>has&&setModal({d,month,year,events})}
        style={{border:`1px solid ${isHoy?C.accent:has?"#3a3028":C.border}`,borderRadius:6,padding:"4px 5px",minHeight:70,background:has?C.card2:C.card,cursor:has?"pointer":"default"}}>
        <div style={{fontSize:10,fontWeight:600,color:isHoy?C.accent:C.muted,marginBottom:3}}>{d}</div>
        {events.slice(0,2).map((e,i)=>(
          <div key={i} style={{fontSize:9,borderRadius:3,padding:"1px 4px",marginBottom:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",
            background:e.tipo==="out"?C.redDim:e.tipo==="proy"?C.yellowDim:C.greenDim,
            color:e.tipo==="out"?C.red:e.tipo==="proy"?C.yellow:C.green}}>
            {e.label}
          </div>
        ))}
        {events.length>2&&<div style={{fontSize:9,color:C.muted}}>+{events.length-2}</div>}
        {totalIn>0&&<div style={{fontSize:9,color:C.green,fontWeight:600}}>{Math.round(totalIn/1000)}k</div>}
        {totalOut>0&&<div style={{fontSize:9,color:C.red,fontWeight:600}}>-{Math.round(totalOut/1000)}k</div>}
      </div>
    );
  }

  function buildCal(year,month,evs){
    const first=new Date(year,month,1).getDay();
    const days=new Date(year,month+1,0).getDate();
    const cells=[];
    for(let i=0;i<first;i++) cells.push(<div key={"e"+i} style={{minHeight:70}}/>);
    for(let d=1;d<=days;d++) cells.push(<DayCell key={d} d={d} month={month} year={year} events={evs[d]||[]}/>);
    return cells;
  }

  const dias=["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
  return(
    <div>
      {/* Tooltip flotante */}
      {tooltip&&(
        <div style={{position:"fixed",bottom:20,right:20,background:C.card2,border:`1px solid ${C.border}`,borderRadius:10,padding:"12px 16px",zIndex:500,minWidth:180,boxShadow:"0 8px 24px rgba(0,0,0,.4)"}}>
          <div style={{fontSize:12,fontWeight:700,color:C.accent,marginBottom:8}}>{tooltip.d}/{tooltip.month+1} — resumen</div>
          {tooltip.totalIn>0&&<div style={{fontSize:12,color:C.green,marginBottom:4}}>↑ Entra: {fmt(tooltip.totalIn)}</div>}
          {tooltip.totalOut>0&&<div style={{fontSize:12,color:C.red,marginBottom:4}}>↓ Sale: {fmt(tooltip.totalOut)}</div>}
          <div style={{fontSize:10,color:C.muted,marginTop:4}}>Click para detalle completo</div>
        </div>
      )}

      <div style={{display:"flex",gap:14,marginBottom:10,flexWrap:"wrap"}}>
        {[{c:C.green,l:"Entrada"},{c:C.red,l:"Egreso"},{c:C.yellow,l:"Proyectado"}].map((x,i)=>(
          <span key={i} style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:C.muted}}>
            <span style={{width:10,height:10,borderRadius:2,background:`${x.c}33`,border:`1px solid ${x.c}66`,display:"inline-block"}}/>{x.l}
          </span>
        ))}
        <span style={{fontSize:11,color:C.dim,marginLeft:"auto"}}>Hover = resumen · Click = detalle</span>
      </div>

      {[{label:"Mayo 2026",year:2026,month:4,evs:MAYO_CAL},{label:"Junio 2026",year:2026,month:5,evs:JUNIO_CAL}].map(cal=>(
        <div key={cal.label} style={{marginBottom:16}}>
          <div style={{fontSize:11,fontWeight:600,color:C.muted,marginBottom:5}}>{cal.label}</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:3}}>
            {dias.map(d=><div key={d} style={{fontSize:10,color:C.dim,textAlign:"center",padding:"2px 0"}}>{d}</div>)}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>
            {buildCal(cal.year,cal.month,cal.evs)}
          </div>
        </div>
      ))}

      {modal&&(
        <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,.75)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}}>
          <div style={{background:C.card,borderRadius:14,padding:"24px 28px",width:380,maxWidth:"90vw",border:`1px solid ${C.border}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <div style={{fontSize:15,fontWeight:700}}>{modal.d} de {meses[modal.month]} {modal.year}</div>
              <button onClick={()=>setModal(null)} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:20}}>×</button>
            </div>
            {modal.events.map((e,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:i<modal.events.length-1?`1px solid ${C.border}`:"none"}}>
                <div>
                  <div style={{fontSize:12,fontWeight:600}}>{e.label}</div>
                  <div style={{fontSize:10,color:C.muted,marginTop:2}}>{e.tipo==="out"?"Egreso comprometido":e.tipo==="proy"?"Entrada proyectada":"Entrada confirmada"}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:13,fontWeight:700,color:e.tipo==="out"?C.red:e.tipo==="proy"?C.yellow:C.green,marginBottom:4}}>
                    {e.tipo==="out"?"-":"+"}{fmt(e.monto)}
                  </div>
                  {e.tipo==="out"&&(
                    <button onClick={()=>{onConfirmar&&onConfirmar(e.label);setModal(null);}}
                      style={{fontSize:10,padding:"3px 8px",borderRadius:6,border:`1px solid ${C.green}44`,background:C.greenDim,color:C.green,cursor:"pointer"}}>
                      ✓ Pagado
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


// ── HOOK DE DATOS ─────────────────────────────────────────────────
function useAppData(){
  const [data,setData]=useState(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(null);
  useEffect(()=>{
    Promise.all([
      getVentas(),getRanking(),getStock(),
      getGastosFijos(),getCompromisos(),getRecetas(),getCombos()
    ])
    .then(([ventas,ranking,stock,gf,compromisos,recetas,combos])=>{
      setData({ventas,ranking,stock,gf,compromisos,recetas,combos});
      setLoading(false);
    })
    .catch(err=>{
      setError(err.message);
      setLoading(false);
    });
  },[]);
  return {data,loading,error};
}

// ── LOGIN ─────────────────────────────────────────────────────────
function Login({onLogin}){
  const [pass,setPass]=useState("");
  const [who,setWho]=useState("macro");
  const [error,setError]=useState(false);
  const handle=()=>{ if(pass===PASS) onLogin(who); else{setError(true);setTimeout(()=>setError(false),2000);} };
  return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Georgia,serif"}}>
      <div style={{width:340}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{fontSize:44,fontWeight:700,color:C.accent,letterSpacing:"-2px",lineHeight:1}}>batata</div>
          <div style={{fontSize:11,color:C.muted,marginTop:6,letterSpacing:"4px",textTransform:"uppercase"}}>panel de socios</div>
        </div>
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"28px 24px"}}>
          <div style={{fontSize:12,color:C.muted,marginBottom:14}}>¿Quién sos?</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:18}}>
            {[{id:"macro",label:"Lautaro",sub:"Vista Macro"},{id:"diario",label:"Quillen",sub:"Vista Diaria"}].map(w=>(
              <button key={w.id} onClick={()=>setWho(w.id)}
                style={{padding:"12px 8px",borderRadius:8,border:`1px solid ${who===w.id?C.accent:C.border}`,background:who===w.id?C.accentDim:C.bg,cursor:"pointer",textAlign:"center"}}>
                <div style={{fontSize:13,fontWeight:700,color:who===w.id?C.accent:C.text}}>{w.label}</div>
                <div style={{fontSize:10,color:C.muted,marginTop:2}}>{w.sub}</div>
              </button>
            ))}
          </div>
          <input type="password" placeholder="Contraseña" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handle()}
            style={{width:"100%",padding:"11px 14px",background:C.bg,border:`1px solid ${error?"#c05040":C.border}`,borderRadius:8,color:C.text,fontSize:14,marginBottom:error?6:14}}/>
          {error&&<div style={{fontSize:11,color:C.red,marginBottom:10}}>Contraseña incorrecta</div>}
          <button onClick={handle} style={{width:"100%",padding:11,background:C.accent,border:"none",borderRadius:8,color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer"}}>Ingresar</button>
        </div>
      </div>
    </div>
  );
}

// ── VISTA DIARIA ──────────────────────────────────────────────────
function VistaDiaria({onSwitch}){
  const [compromisos,setCompromisos]=useState(COMPROMISOS_INIT);
  useEffect(()=>{
    if(DATA_SOURCE==="live"){
      fetch(`${SUPABASE_URL}/rest/v1/compromisos?select=*&order=fecha.asc`,
        {headers:{"apikey":SUPABASE_KEY,"Authorization":`Bearer ${SUPABASE_KEY}`}})
        .then(r=>r.json())
        .then(data=>{
          if(!Array.isArray(data)||!data.length) return;
          setCompromisos(data.map(r=>({
            concepto:r.concepto,
            fecha:r.fecha?.slice(5).split("-").reverse().join("/"),
            monto:r.monto, tipo:r.tipo, origen:r.origen,
            urgente:r.urgente, pagado:r.pagado, _id:r.id,
          })));
        }).catch(e=>console.warn("Supabase compromisos diaria error:",e));
    }
  },[]);
  const [stock]=useState(STOCK_INIT);
  const [notif,setNotif]=useState({});
  const [modalNotif,setModalNotif]=useState(null);
  const stockRojo=stock.filter(s=>s.stock<s.min);
  const stockAmarillo=stock.filter(s=>s.stock>=s.min&&s.stock<s.min*1.5);
  const hoy=new Date();
  const diasNombre=["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
  const mesesNombre=["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
  const ENTREGAS=[
    {prov:"Serenísima",   dias:"Mar y Jue",     prox:"Jue 29/05",icon:"🥛"},
    {prov:"Verdulería",   dias:"Martes",        prox:"Mar 03/06",icon:"🥬"},
    {prov:"Maza",         dias:"Miércoles",     prox:"Mié 28/05",icon:"🍞"},
    {prov:"Alyser",       dias:"Mar a Vie",     prox:"Mar 27/05",icon:"📦"},
    {prov:"Francesco",    dias:"Lun a Sáb",     prox:"Lun 02/06",icon:"🧀"},
    {prov:"Punto",        dias:"Vie c/2sem",    prox:"Vie 06/06",icon:"🥐"},
    {prov:"Il Mirtilo",   dias:"Jue o Vie c/mes",prox:"Vie 30/05",icon:"🫐"},
  ];
  return(
    <div style={{minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"Georgia,serif",padding:"0 0 60px"}}>
      {modalNotif&&(
        <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,.75)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}}>
          <div style={{background:C.card,borderRadius:12,padding:24,width:300,border:`1px solid ${C.border}`}}>
            <div style={{fontSize:14,fontWeight:700,marginBottom:6}}>¿Quién notificó?</div>
            <div style={{fontSize:12,color:C.muted,marginBottom:16}}>{modalNotif}</div>
            {["Lautaro","Quillen"].map(q=>(
              <button key={q} onClick={()=>{setNotif(p=>({...p,[modalNotif]:{quien:q}}));setModalNotif(null);}}
                style={{width:"100%",padding:10,marginBottom:8,borderRadius:8,border:`1px solid ${C.border}`,background:C.card2,color:C.text,fontSize:13,cursor:"pointer",fontWeight:600}}>{q}</button>
            ))}
            <button onClick={()=>setModalNotif(null)} style={{width:"100%",padding:8,borderRadius:8,border:"none",background:"transparent",color:C.muted,fontSize:12,cursor:"pointer"}}>Cancelar</button>
          </div>
        </div>
      )}
      <div style={{background:C.card,borderBottom:`1px solid ${C.border}`,padding:"16px 20px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:22,fontWeight:700,color:C.accent,letterSpacing:"-1px"}}>batata <span style={{fontSize:12,color:C.muted,fontWeight:400}}>diario</span></div>
            <div style={{fontSize:11,color:C.muted,marginTop:2}}>{diasNombre[hoy.getDay()]}, {hoy.getDate()} de {mesesNombre[hoy.getMonth()]}</div>
          </div>
          <button onClick={onSwitch} style={{fontSize:11,padding:"5px 12px",borderRadius:6,border:`1px solid ${C.border}`,background:C.card2,color:C.muted,cursor:"pointer"}}>Ver Macro ↗</button>
        </div>
      </div>
      <div style={{maxWidth:520,margin:"0 auto",padding:"20px 16px"}}>
        {stockRojo.length>0&&(
          <div style={{background:C.redDim,borderRadius:10,padding:"12px 16px",border:`1px solid ${C.red}44`,marginBottom:10}}>
            <div style={{fontWeight:700,color:C.red,fontSize:12,marginBottom:8}}>🔴 Reponer ya</div>
            {stockRojo.map((s,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0",borderBottom:i<stockRojo.length-1?`1px solid ${C.red}22`:"none"}}>
                <span style={{fontSize:12}}>{s.icon} {s.item} — <span style={{color:C.red,fontWeight:700}}>{s.stock}{s.u}</span></span>
                {notif[s.item]
                  ? <span style={{fontSize:10,color:C.green,marginLeft:8}}>✓ {notif[s.item].quien}</span>
                  : <button onClick={()=>setModalNotif(s.item)} style={{fontSize:10,padding:"3px 8px",borderRadius:6,border:`1px solid ${C.yellow}44`,background:C.yellowDim,color:C.yellow,cursor:"pointer",marginLeft:8}}>Notificado</button>
                }
              </div>
            ))}
          </div>
        )}
        {stockAmarillo.length>0&&(
          <div style={{background:C.yellowDim,borderRadius:10,padding:"12px 16px",border:`1px solid ${C.yellow}44`,marginBottom:12}}>
            <div style={{fontWeight:700,color:C.yellow,fontSize:12,marginBottom:8}}>🟡 Programar compra</div>
            {stockAmarillo.slice(0,6).map((s,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0",borderBottom:i<Math.min(stockAmarillo.length,6)-1?`1px solid ${C.yellow}22`:"none"}}>
                <span style={{fontSize:12}}>{s.icon} {s.item} — <span style={{color:C.yellow,fontWeight:700}}>{s.stock}{s.u}</span></span>
                {notif[s.item]
                  ? <span style={{fontSize:10,color:C.green,marginLeft:8}}>✓ {notif[s.item].quien}</span>
                  : <button onClick={()=>setModalNotif(s.item)} style={{fontSize:10,padding:"3px 8px",borderRadius:6,border:`1px solid ${C.yellow}44`,background:C.yellowDim,color:C.yellow,cursor:"pointer",marginLeft:8}}>Notificado</button>
                }
              </div>
            ))}
            {stockAmarillo.length>6&&<div style={{fontSize:10,color:C.muted,marginTop:4}}>+{stockAmarillo.length-6} más</div>}
          </div>
        )}
        {stockRojo.length===0&&stockAmarillo.length===0&&(
          <div style={{background:C.greenDim,borderRadius:10,padding:"12px 16px",border:`1px solid ${C.green}44`,marginBottom:12}}>
            <div style={{fontWeight:700,color:C.green,fontSize:12}}>✅ Stock OK — todo dentro del rango</div>
          </div>
        )}
        <SL>Confirmar pagos {compromisos.filter(c=>!c.pagado).length>0&&<span style={{background:C.red,color:"#fff",borderRadius:10,padding:"1px 7px",fontSize:10,marginLeft:6}}>{compromisos.filter(c=>!c.pagado).length}</span>}</SL>
        <div style={{background:C.card,borderRadius:10,border:`1px solid ${C.border}`,overflow:"hidden",marginBottom:16}}>
          {compromisos.map((c,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderBottom:i<compromisos.length-1?`1px solid ${C.border}`:"none",opacity:c.pagado?.5:1}}>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600,color:c.pagado?C.muted:C.text}}>{c.concepto}</div>
                <div style={{fontSize:11,color:C.muted,marginTop:2,display:"flex",gap:6,alignItems:"center"}}>
                  {c.fecha}
                  {c.urgente&&!c.pagado&&<span style={{background:C.redDim,color:C.red,fontSize:10,padding:"1px 6px",borderRadius:10}}>Urgente</span>}
                </div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:13,fontWeight:700,color:c.pagado?C.muted:C.red,marginBottom:4}}>{fmt(c.monto)}</div>
                {c.pagado ? <span style={{fontSize:11,color:C.green}}>✓ Pagado</span>
                  : <button onClick={()=>{
                    setCompromisos(compromisos.map((x,j)=>j===i?{...x,pagado:true}:x));
                    if(DATA_SOURCE==="live" && c._id){
                      fetch(`${SUPABASE_URL}/rest/v1/compromisos?id=eq.${c._id}`,{
                        method:"PATCH",
                        headers:{"apikey":SUPABASE_KEY,"Authorization":`Bearer ${SUPABASE_KEY}`,"Content-Type":"application/json","Prefer":"return=minimal"},
                        body:JSON.stringify({pagado:true,pagado_at:new Date().toISOString(),pagado_by:"Lautaro"})
                      }).catch(e=>console.warn("Error confirmando pago:",e));
                    }
                  }}
                      style={{fontSize:11,padding:"4px 10px",borderRadius:6,border:`1px solid ${C.green}44`,background:C.greenDim,color:C.green,cursor:"pointer",fontWeight:600}}>✓ Confirmar</button>
                }
              </div>
            </div>
          ))}
        </div>
        <SL>Próximas entregas</SL>
        <div style={{background:C.card,borderRadius:10,border:`1px solid ${C.border}`,overflow:"hidden"}}>
          {ENTREGAS.map((e,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderBottom:i<ENTREGAS.length-1?`1px solid ${C.border}`:"none"}}>
              <span style={{fontSize:20}}>{e.icon}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600}}>{e.prov}</div>
                <div style={{fontSize:11,color:C.muted}}>{e.dias}</div>
              </div>
              <div style={{fontSize:11,color:C.yellow,fontWeight:600}}>{e.prox}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── VISTA MACRO ───────────────────────────────────────────────────
function VistaMacro({onSwitch}){
  const [tab,setTab]=useState("inicio");
  const [stock,setStock]=useState(STOCK_INIT);
  const [gf,setGf]=useState(GF_INIT);
  const [editGF,setEditGF]=useState(false);
  const [editStock,setEditStock]=useState(false);
  const [saldos,setSaldos]=useState({mp:1107900,bbva:115229,ef:600000});
  // Carga saldos desde Supabase al montar (en modo live)
  useEffect(()=>{
    if(DATA_SOURCE==="live"){
      fetch(`${SUPABASE_URL}/rest/v1/saldos_caja?select=cuenta,monto`,
        {headers:{"apikey":SUPABASE_KEY,"Authorization":`Bearer ${SUPABASE_KEY}`}})
        .then(r=>r.json())
        .then(data=>{
          if(!Array.isArray(data)) return;
          const s={};
          data.forEach(r=>{
            if(r.cuenta==="mercadopago") s.mp=r.monto;
            if(r.cuenta==="bbva")        s.bbva=r.monto;
            if(r.cuenta==="efectivo")    s.ef=r.monto;
          });
          if(Object.keys(s).length) setSaldos(s);
        }).catch(e=>console.warn("Supabase saldos error:",e));
    }
  },[]);
  const [editSaldos,setEditSaldos]=useState(false);
  const [compromisos,setCompromisos]=useState(COMPROMISOS_INIT);
  // Carga compromisos desde Supabase al montar
  useEffect(()=>{
    if(DATA_SOURCE==="live"){
      fetch(`${SUPABASE_URL}/rest/v1/compromisos?select=*&order=fecha.asc`,
        {headers:{"apikey":SUPABASE_KEY,"Authorization":`Bearer ${SUPABASE_KEY}`}})
        .then(r=>r.json())
        .then(data=>{
          if(!Array.isArray(data)||!data.length) return;
          setCompromisos(data.map(r=>({
            concepto:r.concepto,
            fecha:r.fecha?.slice(5).split("-").reverse().join("/"),
            monto:r.monto, tipo:r.tipo, origen:r.origen,
            urgente:r.urgente, pagado:r.pagado, _id:r.id,
          })));
        }).catch(e=>console.warn("Supabase compromisos error:",e));
    }
  },[]);
  // Carga gastos fijos desde Supabase al montar
  useEffect(()=>{
    if(DATA_SOURCE==="live"){
      fetch(`${SUPABASE_URL}/rest/v1/gastos_fijos?select=id,concepto,monto,categoria,icono&activo=eq.true`,
        {headers:{"apikey":SUPABASE_KEY,"Authorization":`Bearer ${SUPABASE_KEY}`}})
        .then(r=>r.json())
        .then(data=>{
          if(!Array.isArray(data)||!data.length) return;
          setGf(data.map(r=>({...r,cat:r.categoria})));
        }).catch(e=>console.warn("Supabase GF error:",e));
    }
  },[]);
  // Carga stock desde Supabase al montar
  useEffect(()=>{
    if(DATA_SOURCE==="live"){
      fetch(`${SUPABASE_URL}/rest/v1/stock?select=*&order=categoria`,
        {headers:{"apikey":SUPABASE_KEY,"Authorization":`Bearer ${SUPABASE_KEY}`}})
        .then(r=>r.json())
        .then(data=>{
          if(!Array.isArray(data)||!data.length) return;
          setStock(data.map(r=>({
            _id:r.id, item:r.item, u:r.unidad, stock:r.stock_actual,
            min:r.stock_min, max:r.stock_max, cd:r.consumo_dia,
            icon:r.icono, cat:r.categoria, prov:r.proveedor,
          })));
        }).catch(e=>console.warn("Supabase stock error:",e));
    }
  },[]);
  const [notif,setNotif]=useState({});
  const [modalNotif,setModalNotif]=useState(null);
  const [fichaprod,setFichaprod]=useState(null);
  const [provPct,setProvPct]=useState(0.27);

  const totalGF=gf.reduce((s,g)=>s+g.monto,0);
  const ventas=DIAS_MAYO.reduce((s,d)=>s+d.v,0);
  const diasOp=17;
  const txnTotal=602; // ESTIMADO — reemplazar con dato real de Fudo
  const promDia=Math.round(ventas/diasOp);
  const proyMes=promDia*24;
  const provMes=Math.round(proyMes*provPct);
  const sueldosSocios=1000000;
  const breakeven=totalGF+provMes+sueldosSocios;
  const breakevenDiario=Math.round(breakeven/24);
  const resultado=proyMes-totalGF-provMes;
  const resultadoNeto=resultado-sueldosSocios;
  const totalCaja=saldos.mp+saldos.bbva+saldos.ef;
  const stockRojo=stock.filter(s=>s.stock<s.min);
  const stockAmarillo=stock.filter(s=>s.stock>=s.min&&s.stock<s.min*1.5);

  const TABS=[
    {id:"inicio",   label:"Inicio",   icon:"◈"},
    {id:"ventas",   label:"Ventas",   icon:"↗"},
    {id:"semana",   label:"Semana",   icon:"◷"},
    {id:"caja",     label:"Caja",     icon:"💰"},
    {id:"stock",    label:"Stock",    icon:"▦"},
    {id:"menu",     label:"Menú",     icon:"◉"},
    {id:"costos",   label:"Costos",   icon:"∑"},
    {id:"planilla", label:"Planilla", icon:"📋"},
    {id:"resultado",label:"Resultado",icon:"≡"},
    {id:"config",   label:"Config",   icon:"⚙"},
  ];
  const ts=id=>({padding:"7px 11px",cursor:"pointer",fontSize:11,fontWeight:tab===id?700:500,color:tab===id?C.accent:C.muted,background:tab===id?C.accentDim:"transparent",border:"none",borderRadius:6,transition:"all .15s",whiteSpace:"nowrap"});
  const ordenAC={potenciar:0,subir:1,revisar:2,ok:3};
  const prodsSorted=[...RANKING].sort((a,b)=>ordenAC[a.accion]-ordenAC[b.accion]);

  return(
    <div style={{minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"Georgia,serif",padding:"0 0 40px"}}>
      {fichaprod&&<FichaCosto prod={fichaprod} totalGF={totalGF} onClose={()=>setFichaprod(null)}/>}
      {/* Botón flotante Planilla — acceso desde cualquier solapa */}
      {tab!=="planilla"&&(
        <div title="Ver planilla de costos"
          onClick={()=>setTab("planilla")}
          style={{position:"fixed",bottom:28,right:24,width:48,height:48,borderRadius:"50%",background:C.accent,color:"#fff",fontSize:20,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",boxShadow:"0 4px 16px rgba(0,0,0,.5)",zIndex:200,border:`2px solid ${C.accent}88`}}>
          📋
        </div>
      )}
      {modalNotif&&(
        <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,.75)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}}>
          <div style={{background:C.card,borderRadius:12,padding:24,width:300,border:`1px solid ${C.border}`}}>
            <div style={{fontSize:14,fontWeight:700,marginBottom:6}}>¿Quién notificó?</div>
            <div style={{fontSize:12,color:C.muted,marginBottom:16}}>{modalNotif}</div>
            {["Lautaro","Quillen"].map(q=>(
              <button key={q} onClick={()=>{setNotif(p=>({...p,[modalNotif]:{quien:q}}));setModalNotif(null);}}
                style={{width:"100%",padding:10,marginBottom:8,borderRadius:8,border:`1px solid ${C.border}`,background:C.card2,color:C.text,fontSize:13,cursor:"pointer",fontWeight:600}}>{q}</button>
            ))}
            <button onClick={()=>setModalNotif(null)} style={{width:"100%",padding:8,borderRadius:8,border:"none",background:"transparent",color:C.muted,fontSize:12,cursor:"pointer"}}>Cancelar</button>
          </div>
        </div>
      )}

      <div style={{background:C.card,borderBottom:`1px solid ${C.border}`,padding:"0 20px",position:"sticky",top:0,zIndex:100}}>
        <div style={{maxWidth:980,margin:"0 auto"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 0 8px"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{fontSize:22,fontWeight:700,color:C.accent,letterSpacing:"-1px"}}>batata <span style={{fontSize:12,color:C.muted,fontWeight:400}}>macro</span></div>
            <span style={{fontSize:10,padding:"2px 7px",borderRadius:10,background:DATA_SOURCE==="live"?C.greenDim:C.card2,color:DATA_SOURCE==="live"?C.green:C.muted,border:`1px solid ${DATA_SOURCE==="live"?C.green:C.border}`,fontWeight:600}}>
              ● {DATA_SOURCE==="live"?"Live":"Mock"}
            </span>
          </div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              {stockRojo.length>0&&<span style={{fontSize:10,padding:"3px 8px",background:C.redDim,color:C.red,borderRadius:20,border:`1px solid ${C.red}44`}}>🔴 {stockRojo.length} sin stock</span>}
              {stockAmarillo.length>0&&<span style={{fontSize:10,padding:"3px 8px",background:C.yellowDim,color:C.yellow,borderRadius:20,border:`1px solid ${C.yellow}44`}}>🟡 {stockAmarillo.length} bajo</span>}
              <button onClick={onSwitch} style={{fontSize:11,padding:"5px 12px",borderRadius:6,border:`1px solid ${C.border}`,background:C.card2,color:C.muted,cursor:"pointer"}}>Ver Diario ↗</button>
            </div>
          </div>
          <div style={{display:"flex",gap:3,overflowX:"auto",paddingBottom:8}}>
            {TABS.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={ts(t.id)}>{t.icon} {t.label}</button>)}
          </div>
        </div>
      </div>

      <div style={{maxWidth:980,margin:"0 auto",padding:"24px 20px"}}>

        {/* ═══ INICIO ═══ */}
        {tab==="inicio"&&(
          <div>
            <div style={{marginBottom:20}}>
              <div style={{fontSize:13,color:C.muted}}>Mayo 2026 · {diasOp} días operados</div>
              <div style={{fontSize:24,fontWeight:700,marginTop:2}}>Estado del negocio</div>
            </div>
            {(()=>{
              const ventasSem=HISTORICO.mayo2026[SEM_KEY]?.ventas||0;
              const semAbril=HISTORICO.abril2026[SEM_KEY]?.ventas||null;
              const semMayo25=HISTORICO.mayo2025[SEM_KEY]?.ventas||null;
              const txnSem=HISTORICO.mayo2026[SEM_KEY]?.txn||1;
              return(
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10,marginBottom:20}}>
                <KPI label="Ventas acumuladas"  value={fmtK(ventas)} color={C.green} rawValue={ventas}
                  comparaciones={[
                    {label:"vs sem equiv. abr",ref:HISTORICO.abril2026[SEM_KEY]?.ventas},
                    {label:"vs sem equiv. may25",ref:HISTORICO.mayo2025[SEM_KEY]?.ventas},
                  ]}/>
                <KPI label={`Semana ${SEM_ACTUAL} de mayo`} value={fmtK(ventasSem)} color={C.accent} rawValue={ventasSem}
                  comparaciones={[
                    {label:"vs sem abr",ref:semAbril},
                    {label:"vs sem may25",ref:semMayo25},
                  ]}/>
                <KPI label="Proyección mayo" value={fmtK(proyMes)} color={C.text} rawValue={proyMes}
                  comparaciones={[
                    {label:"vs total abr",ref:HISTORICO.abril2026.total},
                    {label:"vs total may25",ref:HISTORICO.mayo2025.total},
                  ]}/>
                <KPI label="Ticket promedio" value={fmt(Math.round(ventas/txnTotal))} color={C.accent} sub="obj: $13.000"
                  rawValue={Math.round(ventas/txnTotal)}
                  comparaciones={[
                    {label:"vs abr",ref:HISTORICO.abril2026.ticketPromedio},
                    {label:"vs may25",ref:HISTORICO.mayo2025.ticketPromedio},
                  ]}/>
                <KPI label="Resultado neto est." value={fmtK(resultadoNeto)} sub="después de sueldos" color={resultadoNeto>0?C.green:C.red} borde={resultadoNeto>0?C.green:C.red}/>
                <KPI label="Punto de equilibrio" value={fmtK(breakeven)} sub="necesitás facturar esto" color={C.blue}/>
              </div>
              );
            })()}
            <div style={{background:C.card,borderRadius:12,padding:"18px 16px",border:`1px solid ${C.border}`,marginBottom:16}}>
              <div style={{fontSize:12,fontWeight:600,marginBottom:6}}>Ventas diarias — Mayo 2026</div>
              <div style={{display:"flex",gap:12,marginBottom:10}}>
                <span style={{fontSize:10,color:C.muted,display:"flex",alignItems:"center",gap:4}}><span style={{width:8,height:8,borderRadius:2,background:C.accent+"88",display:"inline-block"}}/> Fin de semana (Sáb/Dom)</span>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={DIAS_MAYO.map(d=>({f:`${d.dia}`,v:d.v}))} margin={{top:0,right:0,bottom:0,left:0}}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={C.accent} stopOpacity={0.25}/>
                      <stop offset="95%" stopColor={C.accent} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false}/>
                  <XAxis dataKey="f" tick={{fontSize:8,fill:C.muted}} tickLine={false} axisLine={false} interval={2}/>
                  <YAxis tick={{fontSize:9,fill:C.muted}} tickLine={false} axisLine={false} tickFormatter={v=>v>0?`$${Math.round(v/1000)}k`:""}/>
                  <Tooltip
                    formatter={v=>[v>0?fmt(v):"Sin operación","Ventas"]}
                    labelFormatter={l=>{const d=parseInt(l);const dn=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][new Date(2026,4,d).getDay()];const sn=getSemanaDelMes(d);return <span>{`Día ${dn}`}<br/><span style={{color:C.muted,fontSize:10}}>{`Sem. ${sn} del mes`}</span></span>;}}
                    contentStyle={{background:C.card2,border:`1px solid ${C.border}`,borderRadius:8,fontSize:11}}/>
                  <Area type="monotone" dataKey="v" stroke={C.accent} fill="url(#g1)" strokeWidth={2} dot={false}/>
                  <ReferenceLine y={breakevenDiario} stroke={C.blue} strokeDasharray="4 4" strokeWidth={1.5}
                    label={{value:`Meta ${Math.round(breakevenDiario/1000)}k`,position:"insideTopRight",fontSize:9,fill:C.blue}}/>
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div style={{background:C.card,borderRadius:12,padding:"18px 16px",border:`1px solid ${C.border}`}}>
              <div style={{fontSize:12,fontWeight:600,marginBottom:12}}>Top 5 más vendidos</div>
              {RANKING.slice(0,5).map((p,i)=>{
                const catC=p.cat==="Café"?C.blue:p.cat.includes("Past")?C.accent:C.green;
                return(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"8px 0",borderBottom:i<4?`1px solid ${C.border}22`:"none"}}>
                    <span style={{fontSize:16,fontWeight:800,color:C.dim,width:20}}>{i+1}</span>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:600,fontSize:12}}>{p.n}</div>
                      <div style={{fontSize:10,color:catC,marginTop:1}}>{p.cat} · {p.u} uds</div>
                    </div>
                    <Pill label={`${p.rent}%`} color={p.rent>30?C.green:p.rent>20?C.yellow:C.red}/>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══ VENTAS ═══ */}
        {tab==="ventas"&&(
          <div>
            <div style={{fontSize:16,fontWeight:700,marginBottom:4}}>Ventas y productos</div>
            <div style={{fontSize:11,color:C.muted,marginBottom:20}}>Mayo 2026 · Fudo real · {diasOp} días operados</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10,marginBottom:20}}>
              <KPI label="Total acumulado"  value={fmtK(ventas)}  color={C.green}/>
              <KPI label="Promedio diario"  value={fmt(promDia)}/>
              <KPI label="Proyección mayo"  value={fmtK(proyMes)} color={C.accent}/>
              <KPI label="Ticket promedio"  value={fmt(Math.round(ventas/602))}/>
            </div>
            <div style={{background:C.card,borderRadius:12,padding:"18px 16px",border:`1px solid ${C.border}`,marginBottom:16}}>
              <div style={{fontSize:12,fontWeight:600,marginBottom:6}}>Todos los días de mayo — hover para ver monto y día</div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={DIAS_MAYO.map(d=>({f:`${d.dia}`,v:d.v}))} margin={{top:0,right:0,bottom:0,left:0}}>
                  <defs>
                    <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={C.accent} stopOpacity={0.25}/>
                      <stop offset="95%" stopColor={C.accent} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false}/>
                  <XAxis dataKey="f" tick={{fontSize:9,fill:C.muted}} tickLine={false} axisLine={false}/>
                  <YAxis tick={{fontSize:9,fill:C.muted}} tickLine={false} axisLine={false} tickFormatter={v=>v>0?`$${Math.round(v/1000)}k`:""}/>
                  <Tooltip formatter={v=>[v>0?fmt(v):"Sin operación","Ventas"]} labelFormatter={l=>`Día ${l} — ${['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][new Date(2026,4,parseInt(l)).getDay()]}`} contentStyle={{background:C.card2,border:`1px solid ${C.border}`,borderRadius:8,fontSize:11}}/>
                  <Area type="monotone" dataKey="v" stroke={C.accent} fill="url(#g2)" strokeWidth={2} dot={false}/>
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div style={{background:C.card,borderRadius:12,padding:"16px",border:`1px solid ${C.border}`}}>
              <div style={{fontSize:12,fontWeight:600,marginBottom:14}}>Ranking completo — ordenado por unidades vendidas en mayo</div>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                <thead>
                  <tr style={{borderBottom:`1px solid ${C.border}`}}>
                    {["#","Producto","Categoría","Unidades","Rentabilidad"].map(h=>(
                      <th key={h} style={{textAlign:"left",padding:"6px 8px",fontSize:10,color:C.muted,fontWeight:600}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {RANKING.map((p,i)=>{
                    const catC=p.cat==="Café"?C.blue:p.cat.includes("Past")?C.accent:C.green;
                    return(
                      <tr key={i} style={{borderBottom:`1px solid ${C.border}22`,background:i%2===0?"transparent":C.card2}}>
                        <td style={{padding:"6px 8px",color:C.dim,fontSize:11,fontWeight:600}}>{i+1}</td>
                        <td style={{padding:"6px 8px",fontWeight:600}}>{p.n}</td>
                        <td style={{padding:"6px 8px"}}><span style={{fontSize:10,color:catC,fontWeight:600}}>{p.cat}</span></td>
                        <td style={{padding:"6px 8px",fontWeight:700}}>{p.u}</td>
                        <td style={{padding:"6px 8px"}}><span style={{fontWeight:700,color:p.rent>30?C.green:p.rent>20?C.yellow:C.red}}>{p.rent}%</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ═══ CAJA ═══ */}
        {tab==="caja"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <div>
                <div style={{fontSize:16,fontWeight:700}}>Caja real</div>
                <div style={{fontSize:11,color:C.muted,marginTop:2}}>Saldos · compromisos · flujo proyectado</div>
              </div>
              <button onClick={()=>{
                  if(editSaldos && DATA_SOURCE==="live"){
                    // Guardar saldos en Supabase
                    const cuentas=[
                      {cuenta:"mercadopago", monto:saldos.mp},
                      {cuenta:"bbva",        monto:saldos.bbva},
                      {cuenta:"efectivo",    monto:saldos.ef},
                    ];
                    cuentas.forEach(({cuenta,monto})=>{
                      fetch(`${SUPABASE_URL}/rest/v1/saldos_caja?cuenta=eq.${cuenta}`,{
                        method:"PATCH",
                        headers:{"apikey":SUPABASE_KEY,"Authorization":`Bearer ${SUPABASE_KEY}`,"Content-Type":"application/json","Prefer":"return=minimal"},
                        body:JSON.stringify({monto,updated_by:"Lautaro",updated_at:new Date().toISOString()})
                      }).catch(e=>console.warn("Error guardando saldo:",e));
                    });
                  }
                  setEditSaldos(!editSaldos);
                }} style={{padding:"6px 14px",fontSize:11,borderRadius:6,border:`1px solid ${editSaldos?C.accent:C.border}`,background:editSaldos?C.accentDim:C.card,color:editSaldos?C.accent:C.muted,cursor:"pointer"}}>
                {editSaldos?"✓ Guardar":"✏️ Actualizar saldos"}
              </button>
            </div>
            {editSaldos&&(
              <div style={{background:C.card,border:`1px solid ${C.yellow}44`,borderRadius:10,padding:"14px 16px",marginBottom:16}}>
                <div style={{fontSize:10,color:C.yellow,marginBottom:12,fontWeight:600,textTransform:"uppercase"}}>Actualizar saldos</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
                  {[{k:"mp",l:"Mercado Pago"},{k:"bbva",l:"BBVA"},{k:"ef",l:"Efectivo"}].map(f=>(
                    <div key={f.k}>
                      <div style={{fontSize:10,color:C.muted,marginBottom:4}}>{f.l}</div>
                      <input type="number" value={saldos[f.k]} onChange={e=>setSaldos({...saldos,[f.k]:Number(e.target.value)})}
                        style={{width:"100%",padding:"8px 10px",fontSize:13,background:C.bg,border:`1px solid ${C.border}`,borderRadius:6,color:C.text}}/>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:10,marginBottom:16}}>
              <KPI label="Mercado Pago"   value={fmt(saldos.mp)}         sub="disponible ya"/>
              <KPI label="BBVA"           value={fmt(saldos.bbva)}       sub="disponible ya"/>
              <KPI label="Efectivo"       value={fmt(saldos.ef)}         sub="en caja"/>
              <KPI label="TOTAL EN MANO"  value={fmt(totalCaja)}         color={C.green} borde={C.green}/>
              <KPI label="Comprometido"   value={fmt(1596698)}           sub="esta semana" color={C.red} borde={C.red}/>
              <KPI label="PLATA LIBRE"    value={fmt(totalCaja-1596698)} color={totalCaja-1596698>0?C.green:C.red} borde={totalCaja-1596698>0?C.green:C.red}/>
            </div>
            <div style={{background:C.redDim,borderRadius:10,padding:"12px 16px",border:`1px solid ${C.red}44`,marginBottom:10}}>
              <div style={{fontWeight:700,color:C.red,fontSize:12,marginBottom:4}}>⚡ Esta semana</div>
              <div style={{fontSize:11,color:C.text}}>Cargas sociales $1.246.698 + Aguinaldo $350.000 = <strong>$1.596.698</strong> vencen el 22/05</div>
            </div>
            <div style={{background:C.yellowDim,borderRadius:10,padding:"12px 16px",border:`1px solid ${C.yellow}44`,marginBottom:16}}>
              <div style={{fontWeight:700,color:C.yellow,fontSize:12,marginBottom:4}}>📅 Próximas semanas</div>
              <div style={{fontSize:11}}>Alyser $81.544 → 28/05 · Alyser $389.404 → 08/06 · Sueldos $2.8M → 10/06</div>
            </div>
            <SL>Calendario de flujo de caja</SL>
            <div style={{background:C.card,borderRadius:12,padding:"18px 16px",border:`1px solid ${C.border}`,marginBottom:16}}>
              <Calendario compromisos={compromisos} onConfirmar={label=>setCompromisos(compromisos.map(c=>c.concepto.toLowerCase().includes(label.toLowerCase().split(" ")[0])?{...c,pagado:true}:c))}/>
            </div>
            <SL>Compromisos pendientes</SL>
            <div style={{background:C.card,borderRadius:12,border:`1px solid ${C.border}`,overflow:"hidden"}}>
              {compromisos.map((c,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderBottom:i<compromisos.length-1?`1px solid ${C.border}`:"none",opacity:c.pagado?.5:1}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12,fontWeight:600,color:c.pagado?C.muted:C.text}}>{c.concepto}</div>
                    <div style={{fontSize:11,color:C.muted,marginTop:2,display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                      {c.fecha} · {c.tipo}
                      {c.urgente&&!c.pagado&&<span style={{background:C.redDim,color:C.red,fontSize:10,padding:"1px 6px",borderRadius:10}}>Urgente</span>}
                      {c.origen==="factura"&&<span style={{background:"#d4845a22",color:"#d4845a",fontSize:10,padding:"1px 6px",borderRadius:10,border:"1px solid #d4845a44"}}>📄 Factura</span>}
                      {c.origen==="fijo"&&<span style={{background:C.card2,color:C.muted,fontSize:10,padding:"1px 6px",borderRadius:10,border:`1px solid ${C.border}`}}>🔁 Fijo</span>}
                    </div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:13,fontWeight:700,color:c.pagado?C.muted:C.red,marginBottom:4}}>{fmt(c.monto)}</div>
                    {c.pagado ? <span style={{fontSize:11,color:C.green}}>✓ Pagado</span>
                      : <button onClick={()=>{
                    setCompromisos(compromisos.map((x,j)=>j===i?{...x,pagado:true}:x));
                    if(DATA_SOURCE==="live" && c._id){
                      fetch(`${SUPABASE_URL}/rest/v1/compromisos?id=eq.${c._id}`,{
                        method:"PATCH",
                        headers:{"apikey":SUPABASE_KEY,"Authorization":`Bearer ${SUPABASE_KEY}`,"Content-Type":"application/json","Prefer":"return=minimal"},
                        body:JSON.stringify({pagado:true,pagado_at:new Date().toISOString(),pagado_by:"Lautaro"})
                      }).catch(e=>console.warn("Error confirmando pago macro:",e));
                    }
                  }}
                          style={{fontSize:11,padding:"4px 10px",borderRadius:6,border:`1px solid ${C.green}44`,background:C.greenDim,color:C.green,cursor:"pointer"}}>✓ Confirmar</button>
                    }
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ STOCK ═══ */}
        {tab==="stock"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div>
                <div style={{fontSize:16,fontWeight:700}}>Control de stock</div>
                <div style={{fontSize:11,color:C.muted,marginTop:2}}>{STOCK_INIT.length} insumos · consumo calculado con ventas reales</div>
              </div>
              <button onClick={()=>{
                  if(editStock && DATA_SOURCE==="live"){
                    stock.forEach(s=>{
                      fetch(`${SUPABASE_URL}/rest/v1/stock?item=eq.${encodeURIComponent(s.item)}`,{
                        method:"PATCH",
                        headers:{"apikey":SUPABASE_KEY,"Authorization":`Bearer ${SUPABASE_KEY}`,"Content-Type":"application/json","Prefer":"return=minimal"},
                        body:JSON.stringify({stock_actual:Number(s.stock),updated_by:"Lautaro",updated_at:new Date().toISOString()})
                      }).catch(e=>console.warn("Error guardando stock:",e));
                    });
                  }
                  setEditStock(!editStock);
                }} style={{padding:"6px 14px",fontSize:11,borderRadius:6,border:`1px solid ${editStock?C.accent:C.border}`,background:editStock?C.accentDim:C.card,color:editStock?C.accent:C.muted,cursor:"pointer"}}>
                {editStock?"✓ Listo":"✏️ Actualizar"}
              </button>
            </div>
            {(stockRojo.length>0||stockAmarillo.length>0)&&(()=>{
              const alertas=[...stockRojo.map(s=>({...s,nivel:"rojo"})),...stockAmarillo.map(s=>({...s,nivel:"amarillo"}))];
              const provs=[...new Set(alertas.map(s=>s.prov))];
              return(
                <div style={{marginBottom:16}}>
                  {provs.map(prov=>{
                    const items=alertas.filter(s=>s.prov===prov);
                    const tieneRojo=items.some(s=>s.nivel==="rojo");
                    const col=tieneRojo?C.red:C.yellow;
                    const pedidoTexto=`Hola! Necesito pedir:\n${items.map(s=>`- ${s.item}: ${s.max}${s.u}`).join("\n")}`;
                    return(
                      <ProvAlerta key={prov} prov={prov} items={items} col={col} pedidoTexto={pedidoTexto}
                        notif={notif} onNotif={setModalNotif}/>
                    );
                  })}
                </div>
              );
            })()}
            {["Café","Lácteos","Alyser","Quintal","Verdulería","Il Mirtilo","Francesco","Divina Oliva","Panificados","Descartables","Té"].map(cat=>{
              const items=stock.filter(s=>s.cat===cat);
              if(!items.length) return null;
              return(
                <div key={cat} style={{marginBottom:20}}>
                  <SL>{cat}</SL>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:10}}>
                    {items.map((s,idx)=>{
                      const pct=Math.min(100,(s.stock/s.max)*100);
                      const dias=s.cd>0?Math.round(s.stock/s.cd):99;
                      const col=s.stock<s.min?C.red:s.stock<s.min*1.5?C.yellow:C.green;
                      const si=stock.findIndex(x=>x.item===s.item);
                      return(
                        <div key={idx} style={{background:C.card,borderRadius:10,padding:14,border:`1px solid ${s.stock<s.min?C.red+"66":C.border}`}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                            <div>
                              <div style={{fontWeight:700,fontSize:12}}>{s.icon} {s.item}</div>
                              <div style={{fontSize:10,color:C.muted,marginTop:1}}>~{dias}d · mín {s.min}{s.u}</div>
                            </div>
                            {editStock
                              ? <input type="number" step="0.5" value={s.stock} onChange={e=>setStock(stock.map((x,j)=>j===si?{...x,stock:Number(e.target.value)}:x))}
                                  style={{width:60,padding:"3px 6px",fontSize:14,fontWeight:700,background:C.bg,border:`1px solid ${C.accent}`,borderRadius:6,color:col,textAlign:"center"}}/>
                              : <span style={{fontSize:20,fontWeight:800,color:col}}>{s.stock}</span>
                            }
                          </div>
                          <div style={{height:5,background:C.card2,borderRadius:3,overflow:"hidden"}}>
                            <div style={{height:"100%",width:`${pct}%`,background:col,borderRadius:3}}/>
                          </div>
                          <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.muted,marginTop:4}}>
                            <span>0</span><span style={{color:col}}>{s.stock}{s.u}</span><span>{s.max}</span>
                          </div>
                          {s.warn&&<div style={{fontSize:10,color:C.yellow,marginTop:6,padding:"3px 8px",background:C.yellowDim,borderRadius:5}}>⚠️ {s.warn}</div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ═══ MENÚ ═══ */}
        {tab==="menu"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:20}}>
              <div>
                <div style={{fontSize:16,fontWeight:700}}>Ingeniería de menú</div>
                <div style={{fontSize:11,color:C.muted,marginTop:2}}>Todos los productos activos</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:10,color:C.muted}}>Productos activos</div>
                <div style={{fontSize:24,fontWeight:700,color:C.accent}}>{RANKING.length}</div>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:10,marginBottom:20}}>
              {["potenciar","subir","revisar"].map(accion=>{
                const items=RANKING.filter(p=>p.accion===accion);
                const col=AC[accion];
                const titulos={potenciar:"⭐ Potenciar",subir:"↑ Subir precio",revisar:"⚠️ Revisar"};
                const descs={potenciar:"Alta rent. — comunicar más, ofrecer primero",subir:"Volumen ok pero margen ajustado",revisar:"Margen bajo — dañan la rentabilidad"};
                return(
                  <div key={accion} style={{background:`${col}10`,borderRadius:10,padding:"14px 16px",border:`1px solid ${col}33`}}>
                    <div style={{fontWeight:700,color:col,marginBottom:4,fontSize:12}}>{titulos[accion]}</div>
                    <div style={{fontSize:10,color:C.muted,marginBottom:10}}>{descs[accion]}</div>
                    {items.slice(0,6).map((p,i)=>(
                      <div key={i} style={{fontSize:11,padding:"4px 0",borderBottom:i<Math.min(items.length,6)-1?`1px solid ${col}22`:"none",display:"flex",justifyContent:"space-between"}}>
                        <span>{p.n}</span>
                        <span style={{color:col,fontWeight:600}}>{p.rent}%{p.pvSug&&p.pvSug!==p.pv?` → ${fmt(p.pvSug)}`:""}</span>
                      </div>
                    ))}
                    {items.length>6&&<div style={{fontSize:10,color:C.muted,marginTop:4}}>+{items.length-6} más</div>}
                  </div>
                );
              })}
            </div>
            <div style={{background:C.card,borderRadius:12,padding:"16px",border:`1px solid ${C.border}`,marginBottom:20}}>
              <div style={{fontSize:12,fontWeight:600,marginBottom:14}}>Todos los productos — Potenciar · Subir · Revisar · OK</div>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                  <thead>
                    <tr style={{borderBottom:`1px solid ${C.border}`}}>
                      {["#","Producto","Cat.","Precio","Costo","Rent.","Ventas","Acción"].map(h=>(
                        <th key={h} style={{textAlign:"left",padding:"6px 8px",fontSize:10,color:C.muted,fontWeight:600,whiteSpace:"nowrap"}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {prodsSorted.map((p,i)=>{
                      const catC=p.cat==="Café"?C.blue:p.cat.includes("Past")?C.accent:C.green;
                      const ac=AC[p.accion];
                      const isFirst=i===0||prodsSorted[i-1].accion!==p.accion;
                      const ct=p.mp+p.pv*totalGF/FACT_BASE+p.pv*0.015+p.pv*0.0501;
                      return(
                        <>
                          {isFirst&&<tr key={"sep"+i}><td colSpan={8} style={{padding:"8px 8px 4px",fontSize:10,fontWeight:700,color:ac,borderTop:i>0?`1px solid ${C.border}`:"none"}}>{AL[p.accion]}</td></tr>}
                          <tr key={i} style={{background:i%2===0?"transparent":C.card2}}>
                            <td style={{padding:"6px 8px",color:C.dim,fontSize:11}}>{i+1}</td>
                            <td style={{padding:"6px 8px",fontWeight:600}}>{p.n}</td>
                            <td style={{padding:"6px 8px"}}><span style={{fontSize:10,color:catC,fontWeight:600}}>{p.cat}</span></td>
                            <td style={{padding:"6px 8px"}}>{fmt(p.pv)}{p.pvSug&&p.pvSug!==p.pv&&<span style={{fontSize:10,color:C.yellow,marginLeft:4}}>→{fmt(p.pvSug)}</span>}</td>
                            <td style={{padding:"6px 8px",color:C.muted}}>{fmt(ct)}</td>
                            <td style={{padding:"6px 8px"}}><span style={{fontWeight:700,color:p.rent>30?C.green:p.rent>20?C.yellow:C.red}}>{p.rent}%</span></td>
                            <td style={{padding:"6px 8px",color:C.muted}}>{p.u}</td>
                            <td style={{padding:"6px 8px"}}><span style={{fontSize:10,padding:"2px 7px",borderRadius:10,background:`${ac}22`,color:ac,border:`1px solid ${ac}44`,fontWeight:600}}>{AL[p.accion]}</span></td>
                          </tr>
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <SL>Combos Batateros</SL>
            <div style={{fontSize:11,color:C.muted,marginBottom:12}}>Mar a Vie · 8:30 a 13:30hs</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:10}}>
              {["Desayuno","Almuerzo"].map(tipo=>(
                <div key={tipo}>
                  <div style={{fontSize:11,fontWeight:600,color:C.muted,marginBottom:8,textTransform:"uppercase",letterSpacing:".05em"}}>{tipo}</div>
                  {COMBOS.filter(c=>c.tipo===tipo).map((c,i)=>{
                    const ac=AC[c.accion];
                    return(
                      <div key={i} style={{background:C.card,borderRadius:10,padding:"12px 14px",border:`1px solid ${C.border}`,marginBottom:8}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                          <div style={{fontWeight:600,fontSize:12,flex:1,marginRight:8}}>{c.nombre}</div>
                          <span style={{fontSize:10,padding:"2px 7px",borderRadius:10,background:`${ac}22`,color:ac,border:`1px solid ${ac}44`,fontWeight:600,flexShrink:0}}>{AL[c.accion]}</span>
                        </div>
                        <div style={{display:"flex",gap:12,marginBottom:6,flexWrap:"wrap"}}>
                          <span style={{fontSize:11,color:C.muted}}>PV: <span style={{color:C.text,fontWeight:600}}>{fmt(c.pv)}</span></span>
                          {c.pvSug&&c.pvSug!==c.pv&&<span style={{fontSize:11,color:C.muted}}>→ sug: <span style={{color:C.yellow,fontWeight:600}}>{fmt(c.pvSug)}</span></span>}
                          <span style={{fontSize:11,color:C.muted}}>Rent: <span style={{color:c.rent>20?C.green:c.rent>12?C.yellow:C.red,fontWeight:600}}>{c.rent}%</span></span>
                          <span style={{fontSize:11,color:C.muted}}>{c.u} uds</span>
                        </div>
                        <div style={{fontSize:11,color:C.muted,padding:"6px 8px",background:C.card2,borderRadius:6,lineHeight:1.5}}>{c.nota}</div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ COSTOS ═══ */}
        {tab==="costos"&&(
          <div>
            <div style={{fontSize:16,fontWeight:700,marginBottom:4}}>Planillas de costos</div>
            <div style={{fontSize:11,color:C.muted,marginBottom:20}}>Click en "Ver receta" para ver desglose completo de costos y receta editable</div>
            {["Café","Pastelería","Cocina"].map(cat=>{
              const items=RANKING.filter(p=>p.cat===cat||p.cat===cat+" esp.").sort((a,b)=>b.rent-a.rent);
              const catC=cat==="Café"?C.blue:cat==="Pastelería"?C.accent:C.green;
              const promRent=(items.reduce((s,p)=>{
                const gfu=p.pv*totalGF/FACT_BASE;
                const ct=p.mp+gfu+p.pv*0.015+p.pv*0.0501;
                return s+(p.pv-ct)/p.pv*100;
              },0)/items.length).toFixed(1);
              return(
                <div key={cat} style={{marginBottom:24}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                    <div style={{fontSize:13,fontWeight:700,color:catC}}>{cat}</div>
                    <div style={{fontSize:11,color:C.muted}}>{items.length} productos · rent. prom. {promRent}%</div>
                  </div>
                  <div style={{background:C.card,borderRadius:12,border:`1px solid ${C.border}`,overflow:"hidden"}}>
                    <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                      <thead>
                        <tr style={{background:C.card2}}>
                          {["Producto","MP","GFU","IIBB","Tarjeta","Costo total","PV","Rent.",""].map(h=>(
                            <th key={h} style={{textAlign:"left",padding:"8px 10px",fontSize:10,color:C.muted,fontWeight:600,borderBottom:`1px solid ${C.border}`,whiteSpace:"nowrap"}}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((p,i)=>{
                          const gfu=p.pv*totalGF/FACT_BASE;
                          const iibb=p.pv*0.015;
                          const tc=p.pv*0.0501;
                          const ct=p.mp+gfu+iibb+tc;
                          const rent=(p.pv-ct)/p.pv*100;
                          const rentC=rent>30?C.green:rent>20?C.yellow:C.red;
                          return(
                            <tr key={i} style={{borderBottom:i<items.length-1?`1px solid ${C.border}22`:"none",background:i%2===0?"transparent":C.card2}}>
                              <td style={{padding:"8px 10px",fontWeight:600}}>{p.n}</td>
                              <td style={{padding:"8px 10px",color:C.muted,fontSize:11}}>{fmt(p.mp)}</td>
                              <td style={{padding:"8px 10px",color:C.muted,fontSize:11}}>{fmt(gfu)}</td>
                              <td style={{padding:"8px 10px",color:C.muted,fontSize:11}}>{fmt(iibb)}</td>
                              <td style={{padding:"8px 10px",color:C.muted,fontSize:11}}>{fmt(tc)}</td>
                              <td style={{padding:"8px 10px",fontWeight:600}}>{fmt(ct)}</td>
                              <td style={{padding:"8px 10px"}}>{fmt(p.pv)}</td>
                              <td style={{padding:"8px 10px"}}><span style={{fontWeight:700,color:rentC}}>{rent.toFixed(1)}%</span></td>
                              <td style={{padding:"8px 10px"}}>
                                <button onClick={()=>setFichaprod(p)}
                                  style={{fontSize:10,padding:"3px 8px",borderRadius:6,border:`1px solid ${C.border}`,background:C.card2,color:C.muted,cursor:"pointer",whiteSpace:"nowrap"}}>
                                  Ver receta
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                        <tr style={{borderTop:`1px solid ${C.border}`,background:C.card2}}>
                          <td style={{padding:"8px 10px",fontWeight:700}}>Promedio {cat}</td>
                          <td colSpan={6}/>
                          <td style={{padding:"8px 10px",fontWeight:700,color:catC}}>{promRent}%</td>
                          <td/>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
            <div style={{marginTop:20,textAlign:"center"}}>
              <button onClick={()=>setTab("planilla")}
                style={{padding:"10px 22px",fontSize:12,borderRadius:8,border:`1px solid ${C.accent}44`,background:C.accentDim,color:C.accent,cursor:"pointer",fontWeight:600}}>
                📋 Ver planilla completa
              </button>
            </div>
          </div>
        )}

        {/* ═══ PLANILLA ═══ */}
        {tab==="planilla"&&(()=>{
          const allProds=[...PLANILLA_COSTOS.cafe,...PLANILLA_COSTOS.pasteleria,...PLANILLA_COSTOS.cocina];
          const grupos=["Café","Pastelería","Pastelería esp.","Cocina"];
          return(
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
                <div>
                  <div style={{fontSize:16,fontWeight:700}}>Planilla maestra de costos</div>
                  <div style={{fontSize:11,color:C.muted,marginTop:2}}>Todos los productos · MP de planillas originales · cálculos en tiempo real</div>
                </div>
              </div>
              {grupos.map(cat=>{
                const items=allProds.filter(p=>p.cat===cat);
                if(!items.length) return null;
                const catC=cat==="Café"?C.blue:cat.includes("Past")?C.accent:C.green;
                const promRent=(items.reduce((s,p)=>{
                  const gfu=p.pv*totalGF/FACT_BASE;
                  const iibb=p.pv*0.015;
                  const tc=p.pv*0.0501;
                  const ct=p.mp+gfu+iibb+tc;
                  return s+(p.pv-ct)/p.pv*100;
                },0)/items.length).toFixed(1);
                return(
                  <div key={cat} style={{marginBottom:24}}>
                    <div style={{background:C.card2,borderRadius:8,padding:"8px 14px",marginBottom:8,border:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <span style={{fontSize:12,fontWeight:700,color:catC}}>{cat}</span>
                      <span style={{fontSize:11,color:C.muted}}>{items.length} productos · rent. prom. {promRent}%</span>
                    </div>
                    <div style={{background:C.card,borderRadius:12,border:`1px solid ${C.border}`,overflow:"auto"}}>
                      <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,minWidth:750}}>
                        <thead>
                          <tr style={{background:C.card2}}>
                            {["Producto","Mat. Prima","GFU","IIBB (1.5%)","Tarjeta (5%)","Costo Total","PV","Rent. %","Uds/mes",""].map(h=>(
                              <th key={h} style={{textAlign:"left",padding:"7px 9px",fontSize:10,color:C.muted,fontWeight:600,borderBottom:`1px solid ${C.border}`,whiteSpace:"nowrap"}}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((p,i)=>{
                            const gfu=p.pv*totalGF/FACT_BASE;
                            const iibb=p.pv*0.015;
                            const tc=p.pv*0.0501;
                            const ct=p.mp+gfu+iibb+tc;
                            const rent=(p.pv-ct)/p.pv*100;
                            const rentC=rent>30?C.green:rent>20?C.yellow:C.red;
                            return(
                              <tr key={i} style={{borderBottom:`1px solid ${C.border}22`,background:i%2===0?"transparent":C.card2}}>
                                <td style={{padding:"7px 9px",fontWeight:600}}>{p.n}</td>
                                <td style={{padding:"7px 9px",color:C.muted}}>{fmt(p.mp)}</td>
                                <td style={{padding:"7px 9px",color:C.muted}}>{fmt(gfu)}</td>
                                <td style={{padding:"7px 9px",color:C.muted}}>{fmt(iibb)}</td>
                                <td style={{padding:"7px 9px",color:C.muted}}>{fmt(tc)}</td>
                                <td style={{padding:"7px 9px",fontWeight:600}}>{fmt(ct)}</td>
                                <td style={{padding:"7px 9px"}}>{fmt(p.pv)}</td>
                                <td style={{padding:"7px 9px"}}>
                                  <span style={{fontWeight:700,color:rentC}}>{rent.toFixed(1)}%</span>
                                </td>
                                <td style={{padding:"7px 9px",color:C.muted}}>{p.u}</td>
                                <td style={{padding:"7px 9px"}}>
                                  <button onClick={()=>setFichaprod({n:p.n,pv:p.pv,cat:p.cat,mp:p.mp})}
                                    style={{fontSize:10,padding:"3px 7px",borderRadius:6,border:`1px solid ${C.border}`,background:C.card2,color:C.muted,cursor:"pointer",whiteSpace:"nowrap"}}>
                                    Ver receta
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                          <tr style={{borderTop:`1px solid ${C.border}`,background:C.card2}}>
                            <td style={{padding:"7px 9px",fontWeight:700,color:catC}}>Total {cat}</td>
                            <td style={{padding:"7px 9px",color:C.muted,fontSize:10}}>{fmt(items.reduce((s,p)=>s+p.mp,0)/items.length)} prom.</td>
                            <td colSpan={5}/>
                            <td style={{padding:"7px 9px",fontWeight:700,color:catC}}>{promRent}%</td>
                            <td style={{padding:"7px 9px",color:C.muted}}>{items.reduce((s,p)=>s+p.u,0)} uds</td>
                            <td/>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}


        {/* ═══ SEMANA ═══ */}
        {tab==="semana"&&(()=>{
          const MES_ACT=5; const ANIO_ACT=2026;
          const MESES_NOM=["","Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
          const MES_NOM=["","Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

          // Semanas del mes actual con sus datos
          const semanas=[1,2,3,4].map(s=>({
            sem:s,
            actual: SEMANA_MOCK[`${ANIO_ACT}-${MES_ACT}-${s}`]||null,
            mesAnt: SEMANA_MOCK[`${ANIO_ACT}-${MES_ACT-1}-${s}`]||null,
            anioAnt:SEMANA_MOCK[`${ANIO_ACT-1}-${MES_ACT}-${s}`]||null,
          }));

          const labelSem=s=>s===1?"1–7":s===2?"8–14":s===3?"15–21":"22–fin";
          const esActual=s=>s===SEM_ACTUAL;

          // Horario: agrupar HORARIO_MOCK por día
          const horRows=HORARIO_MOCK["2026-5"]||[];
          const dias=[...new Set(horRows.map(r=>r.dow))].sort();
          const FRANJAS=[
            {id:"man",label:"Mañana",rango:"8–11hs", horas:[8,9,10,11],  col:"#4878a8"},
            {id:"med",label:"Mediodía",rango:"12–15hs",horas:[12,13,14,15],col:"#7a6e62"},
            {id:"tar",label:"Tarde",  rango:"16–19hs",horas:[16,17,18,19],col:"#d4845a"},
          ];
          function franjaVentas(dow,horas){
            return horRows.filter(r=>r.dow===dow&&horas.includes(r.hora)).reduce((s,r)=>s+r.v,0);
          }
          function totalDia(dow){
            return horRows.filter(r=>r.dow===dow).reduce((s,r)=>s+r.v,0);
          }
          function picoHora(dow){
            const rows=horRows.filter(r=>r.dow===dow);
            if(!rows.length) return null;
            return rows.reduce((mx,r)=>r.v>mx.v?r:mx,rows[0]);
          }
          function nomDow(dow){return["","Lun","Mar","Mié","Jue","Vie","Sáb","Dom"][dow];}

          return(
            <div>
              {/* Header */}
              <div style={{marginBottom:20}}>
                <div style={{fontSize:13,color:C.muted}}>
                  {MES_NOM[MES_ACT]} {ANIO_ACT} · datos reales Fudo
                  {DATA_SOURCE==="mock"&&<span style={{marginLeft:8,fontSize:10,padding:"1px 7px",borderRadius:10,background:C.card2,color:C.muted,border:`1px solid ${C.border}`}}>mock — conectar API el 1/6</span>}
                </div>
                <div style={{fontSize:24,fontWeight:700,marginTop:2}}>Análisis semanal</div>
              </div>

              {/* ── SECCIÓN 1: SEMANAS ── */}
              <div style={{fontSize:10,fontWeight:600,color:C.muted,letterSpacing:".06em",textTransform:"uppercase",marginBottom:10,paddingBottom:6,borderBottom:`1px solid ${C.border}`}}>
                Facturación · Personas · Clima — por semana operativa
              </div>

              <div style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:10,marginBottom:28}}>
                {semanas.map(({sem,actual,mesAnt,anioAnt})=>{
                  if(!actual) return null;
                  const vFact=varPct(actual.facturacion, mesAnt?.facturacion);
                  const vFactA=varPct(actual.facturacion, anioAnt?.facturacion);
                  const vPers=varPct(actual.personas, mesAnt?.personas);
                  const vPersA=varPct(actual.personas, anioAnt?.personas);
                  const isAct=esActual(sem);
                  return(
                    <div key={sem} style={{background:C.card,borderRadius:10,padding:"13px 13px 11px",border:`1px solid ${isAct?C.accent:C.border}`,position:"relative"}}>
                      {isAct&&<div style={{position:"absolute",top:9,right:9,fontSize:10,padding:"2px 7px",borderRadius:10,background:C.accentDim,color:C.accent,fontWeight:600}}>actual</div>}

                      {/* Etiqueta semana */}
                      <div style={{fontSize:11,color:C.muted,fontWeight:600,marginBottom:2}}>Semana {sem} · {labelSem(sem)}</div>
                      <div style={{fontSize:10,color:C.dim,marginBottom:10}}>{actual.dias} días operados</div>

                      {/* Clima */}
                      <div style={{display:"flex",alignItems:"center",gap:6,background:C.card2,borderRadius:6,padding:"5px 8px",marginBottom:10}}>
                        <span style={{fontSize:15}}>{climaIcono(actual.clima.icono)}</span>
                        <div>
                          <div style={{fontSize:12,fontWeight:600,color:C.text}}>{actual.clima.max}° / {actual.clima.min}°C</div>
                          <div style={{fontSize:10,color:C.muted}}>{actual.clima.desc}</div>
                        </div>
                      </div>

                      {/* Facturación */}
                      <div style={{marginBottom:9,paddingBottom:9,borderBottom:`1px solid ${C.border}22`}}>
                        <div style={{fontSize:10,color:C.muted,fontWeight:600,textTransform:"uppercase",letterSpacing:".04em",marginBottom:3}}>Facturación</div>
                        <div style={{fontSize:19,fontWeight:700,color:C.text,lineHeight:1,marginBottom:5}}>{fmtK(actual.facturacion)}</div>
                        {/* vs mes anterior */}
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"2px 0"}}>
                          <span style={{fontSize:10,color:C.dim}}>vs sem {sem} {MESES_NOM[MES_ACT-1]}</span>
                          {vFact
                            ? <span style={{fontSize:10,fontWeight:600,color:vFact.col}}>{vFact.txt}</span>
                            : <span style={{fontSize:10,color:C.dim}}>— sin dato</span>
                          }
                        </div>
                        {/* vs año anterior */}
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"2px 0"}}>
                          <span style={{fontSize:10,color:C.dim}}>vs sem {sem} may '25</span>
                          {vFactA
                            ? <span style={{fontSize:10,fontWeight:600,color:vFactA.col}}>{vFactA.txt}</span>
                            : <span style={{fontSize:10,color:C.dim}}>— sin dato</span>
                          }
                        </div>
                      </div>

                      {/* Personas */}
                      <div style={{marginBottom:8}}>
                        <div style={{fontSize:10,color:C.muted,fontWeight:600,textTransform:"uppercase",letterSpacing:".04em",marginBottom:3}}>Personas</div>
                        <div style={{fontSize:19,fontWeight:700,color:C.blue,lineHeight:1,marginBottom:5}}>{actual.personas}</div>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"2px 0"}}>
                          <span style={{fontSize:10,color:C.dim}}>vs sem {sem} {MESES_NOM[MES_ACT-1]}</span>
                          {vPers
                            ? <span style={{fontSize:10,fontWeight:600,color:vPers.col}}>{vPers.txt}</span>
                            : <span style={{fontSize:10,color:C.dim}}>— sin dato</span>
                          }
                        </div>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"2px 0"}}>
                          <span style={{fontSize:10,color:C.dim}}>vs sem {sem} may '25</span>
                          {vPersA
                            ? <span style={{fontSize:10,fontWeight:600,color:vPersA.col}}>{vPersA.txt}</span>
                            : <span style={{fontSize:10,color:C.dim}}>— sin dato</span>
                          }
                        </div>
                      </div>

                      {/* Ticket por persona */}
                      <div style={{display:"inline-block",background:C.card2,borderRadius:6,padding:"3px 8px",fontSize:10,color:C.muted,marginTop:2}}>
                        <span style={{color:C.text,fontWeight:600}}>{fmt(actual.ticketPorPersona)}</span> / persona
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Insight rápido */}
              <div style={{background:C.card2,borderRadius:10,padding:"12px 16px",border:`1px solid ${C.border}`,marginBottom:28}}>
                <div style={{fontSize:11,fontWeight:700,color:C.accent,marginBottom:6}}>Lectura del mes</div>
                <div style={{fontSize:11,color:C.text,lineHeight:1.7}}>
                  Facturación sube vs mayo 2025 en sem 2, 3 y 4 — el ticket por persona creció de ~$8.900 a ~$14.900–16.400 (inflación + carta).
                  Las <strong style={{color:C.red}}>personas caen en las 4 semanas</strong> vs ambos períodos: entre 19% y 57% menos que el año pasado.
                  Sem 1 cae por calendario (feriado + 5 días vs 7), no por performance — el promedio diario fue $509k, alineado con el resto del mes.
                  <strong style={{color:C.yellow}}> El foco comercial es recuperar volumen de personas.</strong>
                </div>
              </div>

              {/* ── SECCIÓN 2: HORARIOS ── */}
              <div style={{fontSize:10,fontWeight:600,color:C.muted,letterSpacing:".06em",textTransform:"uppercase",marginBottom:10,paddingBottom:6,borderBottom:`1px solid ${C.border}`}}>
                Distribución horaria · promedio por día de semana · {MES_NOM[MES_ACT]} {ANIO_ACT}
              </div>
              <div style={{fontSize:11,color:C.muted,marginBottom:14,lineHeight:1.6}}>
                Ventas promedio por hora en cada día. Tarde (16–19hs) domina todos los días. Domingo solo opera tarde. Datos reales de Fudo.
              </div>

              <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:8,marginBottom:16}}>
                {dias.map(dow=>{
                  const total=totalDia(dow);
                  const pico=picoHora(dow);
                  return(
                    <div key={dow} style={{background:C.card,borderRadius:10,padding:"12px 13px",border:`1px solid ${C.border}`}}>
                      <div style={{fontSize:12,fontWeight:700,marginBottom:10,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <span>{nomDow(dow)}</span>
                        <span style={{fontSize:10,color:C.muted,fontWeight:400}}>4 días</span>
                      </div>
                      {FRANJAS.map(fr=>{
                        // sábado no tiene mediodía (14-15), domingo no tiene mañana ni mediodía
                        const fv=franjaVentas(dow,fr.horas);
                        if(fv===0) return null;
                        const pct=total>0?(fv/total*100):0;
                        return(
                          <div key={fr.id} style={{display:"flex",alignItems:"center",gap:7,marginBottom:6}}>
                            <span style={{fontSize:10,color:C.muted,width:76,flexShrink:0}}>{fr.label} {fr.rango}</span>
                            <div style={{flex:1,background:C.card2,borderRadius:3,height:5,overflow:"hidden"}}>
                              <div style={{height:"100%",width:`${Math.min(100,pct)}%`,background:fr.col,borderRadius:3}}/>
                            </div>
                            <span style={{fontSize:10,fontWeight:600,color:C.text,width:28,textAlign:"right",flexShrink:0}}>{Math.round(pct)}%</span>
                          </div>
                        );
                      })}
                      {pico&&(
                        <div style={{fontSize:10,color:C.muted,borderTop:`1px solid ${C.border}22`,paddingTop:6,marginTop:4}}>
                          Pico <span style={{color:C.accent,fontWeight:600}}>{pico.hora}hs</span> · {fmtK(pico.v)} prom · <span style={{color:C.blue}}>{pico.p.toFixed(1)} pers/hora</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Alertas de turno */}
              <div style={{background:C.card,borderRadius:10,border:`1px solid ${C.border}`,overflow:"hidden"}}>
                <div style={{padding:"10px 14px",borderBottom:`1px solid ${C.border}`,fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:".05em"}}>
                  Alertas de turno
                </div>
                {[
                  {col:C.yellow,icon:"⚡",txt:"17hs es el pico universal en todos los días sin excepción. Si falta personal a esa hora, se pierde la hora más valiosa del día."},
                  {col:C.red,   icon:"⚠",txt:"Mediodía (12–15hs) genera solo 13–22% de la caja según el día. Martes es el peor (13%). Evaluar staffing reducido en esa franja."},
                  {col:C.blue,  icon:"◷",txt:"Tarde (16–19hs) genera el 51–56% en días de semana y 100% los domingos. El turno tarde es el que mueve el negocio."},
                  {col:C.green, icon:"✓",txt:"Sábado sin registro 14–15hs. No hay ventas ni personas en esa ventana — cierre o sin movimiento confirmado por los datos."},
                ].map((a,i,arr)=>(
                  <div key={i} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"11px 14px",borderBottom:i<arr.length-1?`1px solid ${C.border}22`:"none"}}>
                    <span style={{color:a.col,fontSize:15,flexShrink:0,marginTop:1}}>{a.icon}</span>
                    <div style={{fontSize:11,color:C.text,lineHeight:1.5}}>{a.txt}</div>
                  </div>
                ))}
              </div>

            </div>
          );
        })()}

        {/* ═══ RESULTADO ═══ */}
        {tab==="resultado"&&(()=>{
          // Rentabilidad por canal
          const canales=[
            {nombre:"Local (mostrador)",pct:0.70,comision:0.0,    tarjeta:0.0501},
            {nombre:"PedidosYa",         pct:0.15,comision:0.18,   tarjeta:0},
            {nombre:"Big Box",           pct:0.15,comision:0.25,   tarjeta:0},
          ];
          return(
          <div>
            <div style={{fontSize:16,fontWeight:700,marginBottom:4}}>Resultado del mes</div>
            <div style={{fontSize:11,color:C.muted,marginBottom:20}}>P&L proyectado · Mayo 2026</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10,marginBottom:20}}>
              <KPI label="Facturación proy."   value={fmtK(proyMes)}       color={C.green}
                prev={VENTAS_ABRIL.total} rawValue={proyMes}/>
              <KPI label="Gastos fijos"         value={fmtK(totalGF)}       color={C.red}/>
              <KPI label="Proveedores"          value={fmtK(provMes)}       color={C.yellow} sub={`${(provPct*100).toFixed(0)}% ventas`}/>
              <KPI label="Resultado operativo"  value={fmtK(resultado)}     color={resultado>0?C.green:C.red} borde={resultado>0?C.green:C.red}/>
              <KPI label="Resultado neto"       value={fmtK(resultadoNeto)} color={resultadoNeto>0?C.green:C.red} borde={resultadoNeto>0?C.green:C.red} sub="después de sueldos"/>
            </div>
            <div style={{background:C.card,borderRadius:12,padding:20,border:`1px solid ${C.border}`,marginBottom:16}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <tbody>
                  {[
                    {l:"Facturación proyectada",    v:proyMes,       c:C.green,  signo:"+"},
                    {l:"− Proveedores ("+( provPct*100).toFixed(0)+"%)", v:provMes, c:C.red, signo:"-",pct:(provMes/proyMes*100).toFixed(1)},
                    {l:"− Gastos fijos",             v:totalGF,       c:C.red,    signo:"-",pct:(totalGF/proyMes*100).toFixed(1)},
                  ].map((r,i)=>(
                    <tr key={i} style={{borderBottom:`1px solid ${C.border}22`}}>
                      <td style={{padding:"9px 0"}}>{r.l}</td>
                      <td style={{padding:"9px 0",textAlign:"right",fontWeight:700,color:r.c}}>{r.signo}{fmt(r.v)}</td>
                      <td style={{padding:"9px 0",textAlign:"right",fontSize:10,color:C.muted}}>{r.pct&&r.pct+"%"}</td>
                    </tr>
                  ))}
                  <tr style={{borderTop:`1px solid ${C.border}`}}>
                    <td style={{padding:"10px 0",fontWeight:700,fontSize:14}}>Resultado operativo</td>
                    <td style={{padding:"10px 0",textAlign:"right",fontWeight:700,fontSize:16,color:resultado>0?C.green:C.red}}>{resultado>0?"+":""}{fmt(resultado)}</td>
                    <td style={{padding:"10px 0",textAlign:"right",fontSize:11,color:resultado>0?C.green:C.red}}>{(resultado/proyMes*100).toFixed(1)}%</td>
                  </tr>
                  <tr style={{borderBottom:`1px solid ${C.border}22`}}>
                    <td style={{padding:"8px 0",fontWeight:600}}>− Sueldo socios ($500k c/u)</td>
                    <td style={{padding:"8px 0",textAlign:"right",fontWeight:600,color:C.red}}>-{fmt(sueldosSocios)}</td>
                    <td style={{padding:"8px 0",textAlign:"right",fontSize:10,color:C.muted}}>{(sueldosSocios/proyMes*100).toFixed(1)}%</td>
                  </tr>
                  <tr style={{borderTop:`1px solid ${C.border}`}}>
                    <td style={{padding:"10px 0",fontWeight:700,fontSize:14}}>Resultado neto</td>
                    <td style={{padding:"10px 0",textAlign:"right",fontWeight:700,fontSize:16,color:resultadoNeto>0?C.green:C.red}}>{resultadoNeto>0?"+":""}{fmt(resultadoNeto)}</td>
                    <td style={{padding:"10px 0",textAlign:"right",fontSize:11,color:resultadoNeto>0?C.green:C.red}}>{(resultadoNeto/proyMes*100).toFixed(1)}%</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Rentabilidad por canal */}
            <div style={{fontSize:13,fontWeight:700,marginBottom:10,marginTop:4}}>Resultado por canal</div>
            <div style={{fontSize:11,color:C.muted,marginBottom:12}}>
              Un producto con margen ajustado en mostrador puede ser directamente negativo en delivery. PedidosYa cobra 18% y BigBox 25% — revisá qué vendés por cada canal.
            </div>
            <div style={{background:C.card,borderRadius:12,border:`1px solid ${C.border}`,overflow:"hidden",marginBottom:16}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                <thead>
                  <tr style={{background:C.card2}}>
                    {["Canal","Facturación","Comisión","Margen neto","Rent. efectiva"].map(h=>(
                      <th key={h} style={{textAlign:"left",padding:"8px 12px",fontSize:10,color:C.muted,fontWeight:600,borderBottom:`1px solid ${C.border}`}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {canales.map((ch,i)=>{
                    const facCh=Math.round(proyMes*ch.pct);
                    const comision=Math.round(facCh*ch.comision);
                    const tarjeta=Math.round(facCh*ch.tarjeta);
                    const margen=facCh-comision-tarjeta;
                    const rent=(margen/facCh*100);
                    const rentC=rent>20?C.green:rent>10?C.yellow:C.red;
                    return(
                      <tr key={i} style={{borderBottom:i<canales.length-1?`1px solid ${C.border}22`:"none",background:i%2===0?"transparent":C.card2}}>
                        <td style={{padding:"9px 12px",fontWeight:600}}>{ch.nombre}</td>
                        <td style={{padding:"9px 12px"}}>{fmt(facCh)} <span style={{fontSize:10,color:C.muted}}>({(ch.pct*100).toFixed(0)}%)</span></td>
                        <td style={{padding:"9px 12px",color:C.red}}>-{fmt(comision+tarjeta)}</td>
                        <td style={{padding:"9px 12px",fontWeight:600}}>{fmt(margen)}</td>
                        <td style={{padding:"9px 12px"}}>
                          <span style={{fontSize:11,padding:"2px 8px",borderRadius:10,background:`${rentC}22`,color:rentC,border:`1px solid ${rentC}44`,fontWeight:700}}>
                            {rent.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{background:C.accentDim,borderRadius:10,padding:"14px 16px",border:`1px solid ${C.accent}44`}}>
              <div style={{fontWeight:700,color:C.accent,marginBottom:6,fontSize:12}}>Plan sueldo socios</div>
              <div style={{fontSize:11,color:C.text,lineHeight:1.7}}>
                Fijo: <strong>$500.000 c/u el 1ro de cada mes</strong> · Sostenible en todos los meses históricos<br/>
                Bono: 50% del margen sobrante a fin de mes<br/>
                Junio es el mes más flojo — el fijo está asegurado, el bono va a ser mínimo.
              </div>
            </div>
          </div>
          );
        })()}

        {/* ═══ CONFIG ═══ */}
        {tab==="config"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <div>
                <div style={{fontSize:16,fontWeight:700}}>Configuración</div>
                <div style={{fontSize:11,color:C.muted,marginTop:2}}>Gastos fijos · actualizar mes a mes</div>
              </div>
              <button onClick={()=>{
                  if(editGF && DATA_SOURCE==="live"){
                    // Guardar gastos fijos en Supabase
                    gf.forEach(g=>{
                      fetch(`${SUPABASE_URL}/rest/v1/gastos_fijos?id=eq.${g.id}`,{
                        method:"PATCH",
                        headers:{"apikey":SUPABASE_KEY,"Authorization":`Bearer ${SUPABASE_KEY}`,"Content-Type":"application/json","Prefer":"return=minimal"},
                        body:JSON.stringify({monto:g.monto,updated_by:"Lautaro",updated_at:new Date().toISOString()})
                      }).catch(e=>console.warn("Error guardando GF:",e));
                    });
                  }
                  setEditGF(!editGF);
                }} style={{padding:"7px 16px",fontSize:11,borderRadius:6,border:`1px solid ${editGF?C.accent:C.border}`,background:editGF?C.accentDim:C.card,color:editGF?C.accent:C.muted,cursor:"pointer",fontWeight:600}}>
                {editGF?"✓ Guardar":"✏️ Editar"}
              </button>
            </div>

            {/* Slider % costo mercadería */}
            <div style={{background:C.card,borderRadius:10,padding:"14px 16px",border:`1px solid ${C.border}`,marginBottom:16}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div>
                  <div style={{fontSize:12,fontWeight:600}}>% Costo de mercadería</div>
                  <div style={{fontSize:11,color:C.muted,marginTop:2}}>Proveedores como porcentaje de la facturación proyectada</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:20,fontWeight:700,color:C.yellow}}>{(provPct*100).toFixed(0)}%</div>
                  <div style={{fontSize:11,color:C.muted}}>{fmt(provMes)} / mes</div>
                </div>
              </div>
              <input type="range" min="0.25" max="0.29" step="0.01" value={provPct}
                onChange={e=>setProvPct(Number(e.target.value))}
                style={{width:"100%",accentColor:C.yellow}}/>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.dim,marginTop:4}}>
                <span>25%</span><span>27%</span><span>29%</span>
              </div>
            </div>
            {editGF&&<div style={{background:C.yellowDim,border:`1px solid ${C.yellow}44`,borderRadius:8,padding:"10px 14px",marginBottom:16,fontSize:11,color:C.yellow}}>💡 Tocá el monto para actualizarlo. Afecta el resultado en tiempo real.</div>}
            <div style={{background:C.card,borderRadius:10,padding:"14px 16px",border:`1px solid ${C.border}`,marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontSize:10,color:C.muted,marginBottom:2}}>TOTAL GASTOS FIJOS</div>
                <div style={{fontSize:22,fontWeight:700,color:C.red}}>{fmt(totalGF)}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:10,color:C.muted,marginBottom:2}}>% de facturación proyectada</div>
                <div style={{fontSize:16,fontWeight:700,color:(totalGF/proyMes)>0.55?C.red:C.yellow}}>{(totalGF/proyMes*100).toFixed(1)}%</div>
              </div>
            </div>
            {["Personal","Estructura","Servicios","Admin","Impuestos"].map(cat=>{
              const items=gf.filter(g=>g.cat===cat);
              const total=items.reduce((s,g)=>s+g.monto,0);
              const pctDeGF=total/totalGF*100;
              const cols={Personal:C.blue,Estructura:C.accent,Servicios:C.green,Admin:C.yellow,Impuestos:C.red};
              const col=cols[cat];
              const esPersonal=cat==="Personal";
              const semaforoCol=esPersonal?(pctDeGF<50?C.green:pctDeGF<60?C.yellow:C.red):null;
              const semaforoLabel=esPersonal?(pctDeGF<50?"OK":pctDeGF<60?"Atención":"Crítico"):null;
              return(
                <div key={cat} style={{marginBottom:16}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:esPersonal?4:8}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontWeight:700,color:col,fontSize:12}}>{cat}</span>
                      {esPersonal&&(
                        <span style={{fontSize:10,padding:"2px 8px",borderRadius:10,background:`${semaforoCol}22`,color:semaforoCol,border:`1px solid ${semaforoCol}44`,fontWeight:700}}>
                          {semaforoLabel}
                        </span>
                      )}
                    </div>
                    <span style={{fontSize:11,color:C.muted}}>{fmt(total)}</span>
                  </div>
                  {esPersonal&&<div style={{fontSize:10,color:semaforoCol,marginBottom:8,fontWeight:600}}>{pctDeGF.toFixed(0)}% del total de gastos fijos</div>}
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:8}}>
                    {items.map((g,i)=>(
                      <div key={i} style={{background:C.card,borderRadius:10,padding:"12px 14px",border:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:12}}>
                        <span style={{fontSize:20,flexShrink:0}}>{g.icon}</span>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:11,color:C.muted,marginBottom:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{g.concepto}</div>
                          {editGF
                            ? <input type="number" value={g.monto} onChange={e=>setGf(gf.map(x=>x.id===g.id?{...x,monto:Number(e.target.value)}:x))}
                                style={{width:"100%",padding:"6px 8px",fontSize:14,fontWeight:700,background:C.bg,border:`1px solid ${C.accent}`,borderRadius:6,color:col}}/>
                            : <div style={{fontSize:15,fontWeight:700,color:col}}>{fmt(g.monto)}</div>
                          }
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

export default function App(){
  const {data,loading,error}=useAppData();
  const [vista,setVista]=useState(null);

  if(loading) return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Georgia,serif"}}>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:32,fontWeight:700,color:C.accent,letterSpacing:"-1px",marginBottom:16}}>batata</div>
        <div style={{display:"flex",flexDirection:"column",gap:10,width:280,margin:"0 auto"}}>
          {[100,75,90,60].map((w,i)=>(
            <div key={i} style={{height:12,borderRadius:6,background:C.card2,width:`${w}%`,
              animation:"pulse 1.5s ease-in-out infinite",animationDelay:`${i*0.15}s`}}/>
          ))}
        </div>
        <style>{`@keyframes pulse{0%,100%{opacity:.3}50%{opacity:.8}}`}</style>
      </div>
    </div>
  );

  if(error) return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",color:C.red,fontFamily:"Georgia,serif"}}>
      Error cargando datos: {error}
    </div>
  );

  if(!vista) return <Login onLogin={v=>setVista(v)}/>;
  if(vista==="diario") return <VistaDiaria onSwitch={()=>setVista("macro")}/>;
  return <VistaMacro onSwitch={()=>setVista("diario")}/>;
}
