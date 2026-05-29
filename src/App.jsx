import { useState } from "react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const PASS = "Julia2420";

const C = {
  bg:"#0c0a08",card:"#141210",card2:"#1c1916",border:"#2a2520",
  text:"#f5f0e8",muted:"#7a6e62",dim:"#3a3028",
  accent:"#d4845a",accentDim:"#d4845a18",
  green:"#5a9e6a",greenDim:"#5a9e6a18",
  red:"#c05040",redDim:"#c0504018",
  yellow:"#c4900a",yellowDim:"#c4900a18",
  blue:"#4878a8",blueDim:"#4878a818",
};

const fmt  = n => `$${Math.round(Math.abs(n)).toLocaleString("es-AR")}`;
const fmtK = n => Math.abs(n)>=1000000 ? `$${(Math.abs(n)/1000000).toFixed(2)}M` : `$${Math.round(Math.abs(n)/1000)}k`;
const fmtd = d => `${d.getDate()}/${d.getMonth()+1}`;

// ── DATA ──────────────────────────────────────────────────────────
const GF_INIT = [
  {id:1, concepto:"Sueldos empleados (blanco)", monto:1718776, cat:"Personal",   icon:"👥"},
  {id:2, concepto:"Sueldos empleados (negro)",  monto:1088000, cat:"Personal",   icon:"👥"},
  {id:3, concepto:"Cargas sociales",             monto:1246698, cat:"Personal",   icon:"📋"},
  {id:4, concepto:"Aguinaldo (ahorro mensual)",  monto:350000,  cat:"Personal",   icon:"💰"},
  {id:5, concepto:"Sindicatos",                  monto:279692,  cat:"Personal",   icon:"🤝"},
  {id:6, concepto:"Autónomos",                   monto:62743,   cat:"Personal",   icon:"📄"},
  {id:7, concepto:"Alquiler",                    monto:500000,  cat:"Estructura", icon:"🏠"},
  {id:8, concepto:"Muni vía pública",            monto:242264,  cat:"Estructura", icon:"🏛️"},
  {id:9, concepto:"Habilitación Deck",           monto:242000,  cat:"Estructura", icon:"🏗️"},
  {id:10,concepto:"Municipal / DDJJ",            monto:90355,   cat:"Estructura", icon:"📑"},
  {id:11,concepto:"Expensas",                    monto:36172,   cat:"Estructura", icon:"🏢"},
  {id:12,concepto:"Seguro",                      monto:61171,   cat:"Estructura", icon:"🛡️"},
  {id:13,concepto:"Luz",                         monto:417668,  cat:"Servicios",  icon:"💡"},
  {id:14,concepto:"Internet + software",         monto:126414,  cat:"Servicios",  icon:"🌐"},
  {id:15,concepto:"Desinfección",                monto:45000,   cat:"Servicios",  icon:"🧹"},
  {id:16,concepto:"TSG / Seg. e Higiene",        monto:142000,  cat:"Servicios",  icon:"⚠️"},
  {id:17,concepto:"Fotos Sofi",                  monto:70000,   cat:"Servicios",  icon:"📸"},
  {id:18,concepto:"Contador",                    monto:220000,  cat:"Admin",      icon:"📊"},
  {id:19,concepto:"Fudo (sistema)",              monto:73150,   cat:"Admin",      icon:"💻"},
  {id:20,concepto:"Tarjeta / Payway empresa",    monto:433155,  cat:"Admin",      icon:"💳"},
  {id:21,concepto:"Cuota financiación cargas",   monto:284693,  cat:"Admin",      icon:"📅"},
  {id:22,concepto:"IIBB",                        monto:170000,  cat:"Impuestos",  icon:"🧾"},
  {id:23,concepto:"IVA (promedio mensual)",      monto:370000,  cat:"Impuestos",  icon:"📝"},
];

const STOCK_INIT = [
  {item:"Café (granos)",     u:"kg",  stock:8,   min:5,  max:15,  cd:1.19, icon:"☕", cat:"Café"},
  {item:"Leche entera",      u:"L",   stock:17,  min:20, max:60,  cd:6.87, icon:"🥛", cat:"Lácteos", warn:"Pedir 22L por entrega — dura 2.5 días"},
  {item:"Crema Milkaut",     u:"u",   stock:4,   min:2,  max:8,   cd:0.2,  icon:"🥛", cat:"Lácteos"},
  {item:"Leche condensada",  u:"u",   stock:8,   min:4,  max:16,  cd:0.4,  icon:"🥛", cat:"Lácteos"},
  {item:"Queso crema",       u:"kg",  stock:3,   min:1,  max:4,   cd:0.10, icon:"🧀", cat:"Lácteos"},
  {item:"Yogurisimo",        u:"u",   stock:4,   min:2,  max:8,   cd:0.18, icon:"🥛", cat:"Lácteos"},
  {item:"Manteca 25kg",      u:"kg",  stock:20,  min:5,  max:25,  cd:0.32, icon:"🧈", cat:"Insumos"},
  {item:"Harina 0000",       u:"kg",  stock:18,  min:5,  max:25,  cd:0.45, icon:"🌾", cat:"Insumos"},
  {item:"Harina 000",        u:"kg",  stock:5,   min:2,  max:10,  cd:0.10, icon:"🌾", cat:"Insumos"},
  {item:"Azúcar común",      u:"kg",  stock:12,  min:5,  max:20,  cd:0.38, icon:"🍬", cat:"Insumos"},
  {item:"Azúcar impalpable", u:"kg",  stock:5,   min:2,  max:10,  cd:0.15, icon:"🍬", cat:"Insumos"},
  {item:"Fécula mandioca",   u:"kg",  stock:15,  min:5,  max:25,  cd:0.61, icon:"🌿", cat:"Insumos"},
  {item:"Cacao amargo",      u:"kg",  stock:0.8, min:0.5,max:2,   cd:0.04, icon:"🍫", cat:"Insumos"},
  {item:"Chocolate amargo",  u:"kg",  stock:3,   min:2,  max:6,   cd:0.15, icon:"🍫", cat:"Insumos"},
  {item:"Chocolate blanco",  u:"kg",  stock:2,   min:1,  max:4,   cd:0.09, icon:"🍫", cat:"Insumos"},
  {item:"Polvo hornear",     u:"kg",  stock:2,   min:1,  max:3,   cd:0.05, icon:"🧂", cat:"Insumos"},
  {item:"Bicarbonato",       u:"gr",  stock:400, min:200,max:800, cd:10,   icon:"🧂", cat:"Insumos"},
  {item:"Aceite girasol",    u:"L",   stock:3,   min:1,  max:5,   cd:0.08, icon:"🫙", cat:"Insumos"},
  {item:"Sal",               u:"kg",  stock:1,   min:0.5,max:2,   cd:0.02, icon:"🧂", cat:"Insumos"},
  {item:"Esencia vainilla",  u:"ml",  stock:500, min:200,max:1000,cd:8,    icon:"🫙", cat:"Insumos"},
  {item:"Levadura seca",     u:"gr",  stock:200, min:100,max:500, cd:5,    icon:"🧫", cat:"Insumos"},
  {item:"DDL Vacalin",       u:"kg",  stock:6,   min:3,  max:10,  cd:0.14, icon:"🍯", cat:"Insumos"},
  {item:"Pasta de maní",     u:"kg",  stock:2,   min:1,  max:3,   cd:0.05, icon:"🥜", cat:"Insumos"},
  {item:"Huevos",            u:"u",   stock:30,  min:20, max:60,  cd:3.4,  icon:"🥚", cat:"Insumos"},
  {item:"Almendras",         u:"kg",  stock:4,   min:2,  max:10,  cd:0.08, icon:"🌰", cat:"Insumos"},
  {item:"Pistachos",         u:"kg",  stock:2,   min:1,  max:6,   cd:0.03, icon:"🌰", cat:"Insumos"},
  {item:"Nueces",            u:"kg",  stock:1,   min:0.5,max:2,   cd:0.02, icon:"🌰", cat:"Insumos"},
  {item:"Frambuesas",        u:"kg",  stock:1.5, min:1,  max:3,   cd:0.03, icon:"🫐", cat:"Insumos"},
  {item:"Arándanos",         u:"kg",  stock:1,   min:0.5,max:2,   cd:0.02, icon:"🫐", cat:"Insumos"},
  {item:"Medialunas",        u:"u",   stock:90,  min:50, max:180, cd:22,   icon:"🥐", cat:"Panificados"},
  {item:"Pan masa madre",    u:"u",   stock:4,   min:3,  max:8,   cd:0.95, icon:"🍞", cat:"Panificados"},
  {item:"Pan molde",         u:"u",   stock:2,   min:2,  max:4,   cd:0.55, icon:"🍞", cat:"Panificados"},
  {item:"Naranja",           u:"kg",  stock:5,   min:3,  max:8,   cd:0.50, icon:"🍊", cat:"Verdulería"},
  {item:"Limón",             u:"kg",  stock:2,   min:1,  max:4,   cd:0.20, icon:"🍋", cat:"Verdulería"},
  {item:"Pomelo",            u:"kg",  stock:2,   min:1,  max:4,   cd:0.20, icon:"🍋", cat:"Verdulería"},
  {item:"Mandarina",         u:"kg",  stock:3,   min:1,  max:5,   cd:0.20, icon:"🍊", cat:"Verdulería"},
  {item:"Banana",            u:"kg",  stock:1,   min:0.5,max:2,   cd:0.15, icon:"🍌", cat:"Verdulería"},
  {item:"Cherry",            u:"kg",  stock:0.5, min:0.3,max:1,   cd:0.08, icon:"🍒", cat:"Verdulería"},
  {item:"Palta",             u:"kg",  stock:1.5, min:1,  max:3,   cd:0.18, icon:"🥑", cat:"Verdulería"},
  {item:"Tomate cherry",     u:"kg",  stock:0.5, min:0.3,max:1,   cd:0.08, icon:"🍅", cat:"Verdulería"},
  {item:"Miel",              u:"gr",  stock:400, min:200,max:800, cd:12,   icon:"🍯", cat:"Verdulería"},
  {item:"Albahaca",          u:"ramo",stock:2,   min:1,  max:4,   cd:0.20, icon:"🌿", cat:"Verdulería"},
  {item:"Pesto Divina Oliva",u:"gr",  stock:400, min:200,max:634, cd:4,    icon:"🫙", cat:"Varios"},
  {item:"Aceite de oliva",   u:"ml",  stock:500, min:200,max:1000,cd:10,   icon:"🫙", cat:"Varios"},
  {item:"Queso Gouda",       u:"kg",  stock:2,   min:1,  max:4,   cd:0.12, icon:"🧀", cat:"Fiambres"},
  {item:"Queso Dambo",       u:"kg",  stock:1.5, min:1,  max:3,   cd:0.10, icon:"🧀", cat:"Fiambres"},
  {item:"Queso Reggianito",  u:"kg",  stock:1,   min:0.5,max:2,   cd:0.05, icon:"🧀", cat:"Fiambres"},
  {item:"Lomito ahumado",    u:"kg",  stock:1,   min:0.5,max:2,   cd:0.10, icon:"🥩", cat:"Fiambres"},
  {item:"Mortadela pistac.", u:"kg",  stock:0.5, min:0.3,max:1,   cd:0.08, icon:"🥩", cat:"Fiambres"},
  {item:"Vasos take away",   u:"u",   stock:120, min:50, max:200, cd:25,   icon:"🥤", cat:"Descartables"},
  {item:"Cajas delivery ch.",u:"u",   stock:30,  min:10, max:50,  cd:2,    icon:"📦", cat:"Descartables"},
  {item:"Bolsas consorcio",  u:"u",   stock:20,  min:10, max:30,  cd:1,    icon:"🛍️", cat:"Descartables"},
  {item:"Rollo aluminio",    u:"u",   stock:1,   min:1,  max:2,   cd:0.05, icon:"📦", cat:"Descartables"},
];

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

const TOP_PRODS = [
  {nombre:"Latte",              u:282,cat:"Café",      rent:37.3, pv:5600, ct:3512, accion:"potenciar"},
  {nombre:"Flat White",         u:203,cat:"Café",      rent:34.1, pv:5800, ct:3824, accion:"subir"},
  {nombre:"Chipa",              u:143,cat:"Pastelería",rent:28.4, pv:4000, ct:3317, accion:"potenciar"},
  {nombre:"Cookie Frambuesa",   u:125,cat:"Pastelería",rent:22.8, pv:4100, ct:3167, accion:"ok"},
  {nombre:"Medialunas",         u:117,cat:"Pastelería",rent:18.2, pv:3800, ct:3108, accion:"revisar"},
  {nombre:"Cappuccino",         u:104,cat:"Café",      rent:32.5, pv:5000, ct:3376, accion:"potenciar"},
  {nombre:"Chipa prensado",     u:93, cat:"Cocina",    rent:17.8, pv:8000, ct:6575, accion:"revisar"},
  {nombre:"Cappu Doble",        u:83, cat:"Café",      rent:33.8, pv:6000, ct:3976, accion:"potenciar"},
  {nombre:"Cookie Chocolate",   u:83, cat:"Pastelería",rent:12.9, pv:5100, ct:4444, accion:"revisar"},
  {nombre:"Cookie Pistacho",    u:70, cat:"Pastelería",rent:13.1, pv:4100, ct:3565, accion:"subir"},
  {nombre:"Alfanuí",            u:52, cat:"Pastelería",rent:14.8, pv:5000, ct:4255, accion:"ok"},
  {nombre:"Americano",          u:52, cat:"Café",      rent:38.2, pv:5000, ct:3090, accion:"potenciar"},
  {nombre:"Tostón de Palta",    u:48, cat:"Cocina",    rent:13.5, pv:10000,ct:8657, accion:"subir"},
  {nombre:"Tostado JyQ",        u:42, cat:"Cocina",    rent:13.4, pv:8500, ct:7358, accion:"subir"},
  {nombre:"Cortado",            u:38, cat:"Café",      rent:35.8, pv:4600, ct:2955, accion:"potenciar"},
  {nombre:"Suaave",             u:37, cat:"Café",      rent:42.4, pv:5600, ct:3226, accion:"potenciar"},
  {nombre:"Jugo de Naranja",    u:35, cat:"Café",      rent:44.9, pv:4300, ct:2371, accion:"potenciar"},
  {nombre:"Budín Limón",        u:32, cat:"Pastelería",rent:18.3, pv:4200, ct:3434, accion:"ok"},
  {nombre:"Choco Caliente",     u:30, cat:"Café",      rent:53.9, pv:6000, ct:2763, accion:"potenciar"},
  {nombre:"Budín Banana",       u:31, cat:"Pastelería",rent:19.1, pv:4200, ct:3398, accion:"ok"},
  {nombre:"Alfajor Almendras",  u:25, cat:"Pastelería",rent:25.0, pv:3800, ct:2851, accion:"ok"},
  {nombre:"Sandwich Mortadela", u:21, cat:"Cocina",    rent:35.3, pv:12500,ct:8085, accion:"potenciar"},
  {nombre:"Alfajor Nevado",     u:24, cat:"Pastelería",rent:11.2, pv:5200, ct:4617, accion:"revisar"},
  {nombre:"Pomelada",           u:21, cat:"Café",      rent:49.3, pv:5000, ct:2533, accion:"potenciar"},
  {nombre:"Alfajor Tita",       u:21, cat:"Pastelería",rent:21.7, pv:3800, ct:2977, accion:"ok"},
  {nombre:"Tostado Capresse",   u:20, cat:"Cocina",    rent:17.4, pv:8500, ct:7024, accion:"subir"},
  {nombre:"Mandarinada",        u:15, cat:"Café",      rent:49.8, pv:4700, ct:2358, accion:"potenciar"},
  {nombre:"Dame Números",       u:24, cat:"Café",      rent:35.3, pv:7000, ct:4526, accion:"ok"},
  {nombre:"Medialuna rellena",  u:53, cat:"Cocina",    rent:11.6, pv:9500, ct:8402, accion:"revisar"},
  {nombre:"Yogurt",             u:9,  cat:"Cocina",    rent:15.3, pv:9200, ct:7792, accion:"ok"},
];

const COMPROMISOS_INIT = [
  {concepto:"Cargas sociales",            fecha:"22/05",monto:1246698,urgente:true, pagado:false,tipo:"fijo"},
  {concepto:"Aguinaldo ahorro",           fecha:"22/05",monto:350000, urgente:true, pagado:false,tipo:"fijo"},
  {concepto:"Alyser — facturas 07+13/05",fecha:"28/05",monto:81544,  urgente:false,pagado:false,tipo:"proveedor"},
  {concepto:"Alquiler + servicios junio",fecha:"01/06",monto:723757,  urgente:false,pagado:false,tipo:"fijo"},
  {concepto:"Alyser — factura 18/05",    fecha:"08/06",monto:389404,  urgente:false,pagado:false,tipo:"proveedor"},
  {concepto:"Sueldos empleados junio",   fecha:"10/06",monto:2806800, urgente:false,pagado:false,tipo:"fijo"},
  {concepto:"Cargas sociales junio",     fecha:"15/06",monto:1246698, urgente:false,pagado:false,tipo:"fijo"},
];

const MAYO_CAL = {
  22:[{tipo:"out",label:"Cargas soc.",monto:1246698},{tipo:"out",label:"Aguinaldo",monto:350000}],
  23:[{tipo:"in",label:"PedidosYa",monto:23100}],
  24:[{tipo:"in",label:"BigBox+PYA",monto:85420}],
  25:[{tipo:"in",label:"PedidosYa",monto:99120}],
  28:[{tipo:"out",label:"Alyser",monto:81544},{tipo:"proy",label:"Vtas prom.",monto:86450}],
  29:[{tipo:"proy",label:"Vtas prom.",monto:31010}],
  30:[{tipo:"proy",label:"Vtas prom.",monto:37100}],
  31:[{tipo:"proy",label:"BigBox+PYA",monto:181970}],
};

const JUNIO_CAL = {
  1: [{tipo:"out",label:"Alquiler",monto:500000},{tipo:"out",label:"Servicios",monto:223757},{tipo:"out",label:"Sueldos socios",monto:1000000},{tipo:"proy",label:"BigBox",monto:70300}],
  3: [{tipo:"proy",label:"BigBox+PYA",monto:45000}],
  4: [{tipo:"proy",label:"PedidosYa",monto:76460}],
  5: [{tipo:"out",label:"Contador",monto:220000}],
  8: [{tipo:"out",label:"Luz",monto:417668},{tipo:"out",label:"Alyser",monto:389404}],
  10:[{tipo:"out",label:"Sueldos",monto:2806800},{tipo:"out",label:"Muni",monto:242264}],
  15:[{tipo:"out",label:"Cargas soc.",monto:1246698}],
  20:[{tipo:"out",label:"Sindicatos",monto:279692},{tipo:"out",label:"Payway",monto:433155}],
};

// ── HELPERS ────────────────────────────────────────────────────────
const KPI = ({label,value,sub,color,borde})=>(
  <div style={{background:C.card,borderRadius:10,padding:"14px 16px",border:`1px solid ${borde?borde+"44":C.border}`}}>
    <div style={{fontSize:10,color:C.muted,marginBottom:4}}>{label}</div>
    <div style={{fontSize:18,fontWeight:700,color:color||C.text}}>{value}</div>
    {sub&&<div style={{fontSize:10,color:C.muted,marginTop:3}}>{sub}</div>}
  </div>
);

const Pill=({label,color})=>(
  <span style={{fontSize:10,padding:"2px 8px",borderRadius:20,background:`${color}22`,color,border:`1px solid ${color}44`,fontWeight:600}}>{label}</span>
);

const SL=({children})=>(
  <div style={{fontSize:10,fontWeight:600,color:C.muted,letterSpacing:".05em",textTransform:"uppercase",margin:"1.25rem 0 .6rem"}}>{children}</div>
);

// ── CALENDARIO ────────────────────────────────────────────────────
function Calendario(){
  const [detail,setDetail]=useState(null);
  const [detailDay,setDetDay]=useState(null);

  function buildCal(year,month,events){
    const first=new Date(year,month,1).getDay();
    const days=new Date(year,month+1,0).getDate();
    const hoy=new Date();
    const cells=[];
    for(let i=0;i<first;i++) cells.push(<div key={"e"+i} style={{minHeight:72}}/>);
    for(let d=1;d<=days;d++){
      const evs=events[d]||[];
      const isHoy=hoy.getDate()===d&&hoy.getMonth()===month&&hoy.getFullYear()===year;
      const totalIn=evs.filter(e=>e.tipo==="in"||e.tipo==="proy").reduce((s,e)=>s+e.monto,0);
      const totalOut=evs.filter(e=>e.tipo==="out").reduce((s,e)=>s+e.monto,0);
      const dd=d;
      cells.push(
        <div key={d} onClick={()=>{setDetail(evs);setDetDay(`${d}/${month+1}/${year}`);}}
          style={{border:`1px solid ${isHoy?"#d4845a":evs.length?"#3a3028":"#2a2520"}`,borderRadius:6,padding:"4px 5px",minHeight:72,background:evs.length?C.card2:C.card,cursor:"pointer"}}>
          <div style={{fontSize:10,fontWeight:600,color:isHoy?C.accent:C.muted,marginBottom:3}}>{d}</div>
          {evs.slice(0,2).map((e,i)=>(
            <div key={i} style={{fontSize:9,borderRadius:3,padding:"1px 4px",marginBottom:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",
              background:e.tipo==="out"?C.redDim:e.tipo==="proy"?C.yellowDim:C.greenDim,
              color:e.tipo==="out"?C.red:e.tipo==="proy"?C.yellow:C.green}}>
              {e.label}
            </div>
          ))}
          {evs.length>2&&<div style={{fontSize:9,color:C.muted}}>+{evs.length-2} más</div>}
          {totalIn>0&&<div style={{fontSize:9,color:C.green,marginTop:2,fontWeight:600}}>{fmtK(totalIn)}</div>}
          {totalOut>0&&<div style={{fontSize:9,color:C.red,fontWeight:600}}>-{fmtK(totalOut)}</div>}
        </div>
      );
    }
    return cells;
  }

  const dias=["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
  return (
    <div>
      <div style={{display:"flex",gap:16,flexWrap:"wrap",marginBottom:10}}>
        {[{c:C.green,l:"Entrada confirmada"},{c:C.red,l:"Egreso comprometido"},{c:C.yellow,l:"Entrada proyectada"}].map((x,i)=>(
          <span key={i} style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:C.muted}}>
            <span style={{width:10,height:10,borderRadius:2,background:`${x.c}33`,border:`1px solid ${x.c}66`,display:"inline-block"}}/>
            {x.l}
          </span>
        ))}
      </div>

      <div style={{fontSize:11,fontWeight:600,color:C.muted,marginBottom:6}}>Mayo 2026</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:3}}>
        {dias.map(d=><div key={d} style={{fontSize:10,color:C.dim,textAlign:"center",padding:"3px 0"}}>{d}</div>)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:16}}>
        {buildCal(2026,4,MAYO_CAL)}
      </div>

      <div style={{fontSize:11,fontWeight:600,color:C.muted,marginBottom:6}}>Junio 2026</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:3}}>
        {dias.map(d=><div key={d} style={{fontSize:10,color:C.dim,textAlign:"center",padding:"3px 0"}}>{d}</div>)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:12}}>
        {buildCal(2026,5,JUNIO_CAL)}
      </div>

      {detail&&detailDay&&(
        <div style={{background:C.card2,borderRadius:10,padding:"14px 16px",border:`1px solid ${C.border}`}}>
          <div style={{fontSize:12,fontWeight:700,marginBottom:10,display:"flex",justifyContent:"space-between"}}>
            <span>{detailDay}</span>
            <button onClick={()=>setDetail(null)} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:16}}>×</button>
          </div>
          {detail.length===0
            ? <div style={{fontSize:12,color:C.muted}}>Sin movimientos para este día.</div>
            : detail.map((e,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:i<detail.length-1?`1px solid ${C.border}`:"none"}}>
                <span style={{fontSize:12}}>{e.label}</span>
                <span style={{fontSize:12,fontWeight:700,color:e.tipo==="out"?C.red:e.tipo==="proy"?C.yellow:C.green}}>
                  {e.tipo==="out"?"-":"+"}{fmt(e.monto)}
                </span>
              </div>
            ))
          }
        </div>
      )}
    </div>
  );
}

// ── LOGIN ──────────────────────────────────────────────────────────
function Login({onLogin}){
  const [pass,setPass]=useState("");
  const [who,setWho]=useState("macro");
  const [error,setError]=useState(false);
  const handle=()=>{
    if(pass===PASS) onLogin(who);
    else{setError(true);setTimeout(()=>setError(false),2000);}
  };
  return (
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
          <input type="password" placeholder="Contraseña" value={pass}
            onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handle()}
            style={{width:"100%",padding:"11px 14px",background:C.bg,border:`1px solid ${error?"#c05040":C.border}`,borderRadius:8,color:C.text,fontSize:14,marginBottom:error?6:14}}
          />
          {error&&<div style={{fontSize:11,color:C.red,marginBottom:10}}>Contraseña incorrecta</div>}
          <button onClick={handle}
            style={{width:"100%",padding:11,background:C.accent,border:"none",borderRadius:8,color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer"}}>
            Ingresar
          </button>
        </div>
        <div style={{textAlign:"center",marginTop:14,fontSize:10,color:C.dim}}>Batata © 2026 · Uso interno</div>
      </div>
    </div>
  );
}

// ── VISTA DIARIA (QUILLEN) ─────────────────────────────────────────
function VistaDiaria({onSwitch}){
  const [compromisos,setCompromisos]=useState(COMPROMISOS_INIT);
  const [stock]=useState(STOCK_INIT);
  const stockRojo=stock.filter(s=>s.stock<s.min);
  const stockAmarillo=stock.filter(s=>s.stock>=s.min && s.stock<s.min*1.5);
  const pendientes=compromisos.filter(c=>!c.pagado);
  const confirmar=(i)=>setCompromisos(compromisos.map((c,j)=>j===i?{...c,pagado:true}:c));

  const hoy=new Date();
  const diasSemana=["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
  const meses=["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];

  const ENTREGAS=[
    {prov:"Serenísima",dias:"Mar y Jue",prox:"Jue 29/05",icon:"🥛"},
    {prov:"Verdulería",dias:"Martes",   prox:"Mar 03/06",icon:"🥬"},
    {prov:"Maza Panadería",dias:"Jueves",prox:"Jue 29/05",icon:"🍞"},
    {prov:"Alyser",dias:"Lun a Vie",    prox:"Lun 02/06",icon:"📦"},
    {prov:"Francesco",dias:"Lun a Sáb", prox:"Lun 02/06",icon:"🧀"},
    {prov:"Punto",dias:"Vie c/2 sem",   prox:"Vie 06/06",icon:"🥐"},
  ];

  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"Georgia,serif",padding:"0 0 60px"}}>
      {/* Header */}
      <div style={{background:C.card,borderBottom:`1px solid ${C.border}`,padding:"16px 20px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:22,fontWeight:700,color:C.accent,letterSpacing:"-1px"}}>batata</div>
            <div style={{fontSize:11,color:C.muted,marginTop:2}}>{diasSemana[hoy.getDay()]}, {hoy.getDate()} de {meses[hoy.getMonth()]}</div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <button onClick={onSwitch} style={{fontSize:11,padding:"5px 12px",borderRadius:6,border:`1px solid ${C.border}`,background:C.card2,color:C.muted,cursor:"pointer"}}>
              Ver Macro ↗
            </button>
          </div>
        </div>
      </div>

      <div style={{maxWidth:520,margin:"0 auto",padding:"20px 16px"}}>

        {/* Alertas stock */}
        {stockRojo.length>0&&(
          <div style={{background:C.redDim,borderRadius:10,padding:"12px 16px",border:`1px solid ${C.red}44`,marginBottom:10}}>
            <div style={{fontWeight:700,color:C.red,fontSize:12,marginBottom:6}}>🔴 Reponer ya</div>
            {stockRojo.map((s,i)=>(
              <div key={i} style={{fontSize:12,color:C.text,padding:"3px 0",display:"flex",justifyContent:"space-between"}}>
                <span>{s.icon} {s.item}</span>
                <span style={{color:C.red,fontWeight:700}}>{s.stock}{s.u} / mín {s.min}{s.u}</span>
              </div>
            ))}
          </div>
        )}
        {stockAmarillo.length>0&&(
          <div style={{background:C.yellowDim,borderRadius:10,padding:"12px 16px",border:`1px solid ${C.yellow}44`,marginBottom:16}}>
            <div style={{fontWeight:700,color:C.yellow,fontSize:12,marginBottom:6}}>🟡 Stock bajo — programar compra</div>
            {stockAmarillo.slice(0,4).map((s,i)=>(
              <div key={i} style={{fontSize:12,color:C.text,padding:"3px 0",display:"flex",justifyContent:"space-between"}}>
                <span>{s.icon} {s.item}</span>
                <span style={{color:C.yellow,fontWeight:600}}>{s.stock}{s.u}</span>
              </div>
            ))}
            {stockAmarillo.length>4&&<div style={{fontSize:11,color:C.muted,marginTop:4}}>+{stockAmarillo.length-4} más</div>}
          </div>
        )}
        {stockRojo.length===0&&stockAmarillo.length===0&&(
          <div style={{background:C.greenDim,borderRadius:10,padding:"12px 16px",border:`1px solid ${C.green}44`,marginBottom:16}}>
            <div style={{fontWeight:700,color:C.green,fontSize:12}}>✅ Stock OK — todo dentro del rango</div>
          </div>
        )}

        {/* Pagos pendientes */}
        <SL>Confirmar pagos {pendientes.length>0&&<span style={{background:C.red,color:"#fff",borderRadius:10,padding:"1px 7px",fontSize:10,marginLeft:6}}>{pendientes.length}</span>}</SL>
        <div style={{background:C.card,borderRadius:10,border:`1px solid ${C.border}`,overflow:"hidden",marginBottom:16}}>
          {compromisos.map((c,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderBottom:i<compromisos.length-1?`1px solid ${C.border}`:"none",opacity:c.pagado?.5:1}}>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600,color:c.pagado?C.muted:C.text}}>{c.concepto}</div>
                <div style={{fontSize:11,color:C.muted,marginTop:2,display:"flex",gap:6,alignItems:"center"}}>
                  Vence {c.fecha}
                  {c.urgente&&!c.pagado&&<span style={{background:C.redDim,color:C.red,fontSize:10,padding:"1px 6px",borderRadius:10,border:`1px solid ${C.red}44`}}>Urgente</span>}
                </div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:13,fontWeight:700,color:c.pagado?C.muted:C.red,marginBottom:4}}>{fmt(c.monto)}</div>
                {c.pagado
                  ? <span style={{fontSize:11,color:C.green}}>✓ Pagado</span>
                  : <button onClick={()=>confirmar(i)}
                      style={{fontSize:11,padding:"4px 10px",borderRadius:6,border:`1px solid ${C.green}44`,background:C.greenDim,color:C.green,cursor:"pointer",fontWeight:600}}>
                      ✓ Confirmar
                    </button>
                }
              </div>
            </div>
          ))}
        </div>

        {/* Próximas entregas */}
        <SL>Entregas esta semana</SL>
        <div style={{background:C.card,borderRadius:10,border:`1px solid ${C.border}`,overflow:"hidden",marginBottom:16}}>
          {ENTREGAS.map((e,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderBottom:i<ENTREGAS.length-1?`1px solid ${C.border}`:"none"}}>
              <span style={{fontSize:20}}>{e.icon}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600}}>{e.prov}</div>
                <div style={{fontSize:11,color:C.muted,marginTop:1}}>{e.dias}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:11,color:C.yellow,fontWeight:600}}>{e.prox}</div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

// ── VISTA MACRO (LAUTARO) ─────────────────────────────────────────
function VistaMacro({onSwitch}){
  const [tab,setTab]=useState("inicio");
  const [stock,setStock]=useState(STOCK_INIT);
  const [gf,setGf]=useState(GF_INIT);
  const [editGF,setEditGF]=useState(false);
  const [editStock,setEditStock]=useState(false);
  const [saldos,setSaldos]=useState({mp:1107900,bbva:115229,ef:600000});
  const [editSaldos,setEditSaldos]=useState(false);
  const [compromisos,setCompromisos]=useState(COMPROMISOS_INIT);
  const [menuFiltro,setMenuFiltro]=useState("todos");

  const totalGF=gf.reduce((s,g)=>s+g.monto,0);
  const provMes=4500000;
  const ventas=VENTAS.reduce((s,d)=>s+d.v,0);
  const txn=VENTAS.reduce((s,d)=>s+d.t,0);
  const diasOp=16;
  const promDia=Math.round(ventas/diasOp);
  const proyMes=promDia*24;
  const resultado=proyMes-totalGF-provMes;
  const totalCaja=saldos.mp+saldos.bbva+saldos.ef;
  const stockRojo=stock.filter(s=>s.stock<s.min);
  const stockAmarillo=stock.filter(s=>s.stock>=s.min&&s.stock<s.min*1.5);

  const TABS=[
    {id:"inicio",label:"Inicio",icon:"◈"},
    {id:"ventas",label:"Ventas",icon:"↗"},
    {id:"caja",label:"Caja",icon:"💰"},
    {id:"stock",label:"Stock",icon:"▦"},
    {id:"menu",label:"Menú",icon:"◉"},
    {id:"resultado",label:"Resultado",icon:"∑"},
    {id:"config",label:"Config",icon:"⚙"},
  ];

  const ts=(id)=>({
    padding:"7px 12px",cursor:"pointer",fontSize:11,fontWeight:tab===id?700:500,
    color:tab===id?C.accent:C.muted,background:tab===id?C.accentDim:"transparent",
    border:"none",borderRadius:6,transition:"all .15s",whiteSpace:"nowrap",
  });

  const prodsFiltrados = menuFiltro==="todos" ? TOP_PRODS : TOP_PRODS.filter(p=>p.accion===menuFiltro);

  const accionColor={potenciar:C.green,subir:C.yellow,revisar:C.red,ok:C.blue};
  const accionLabel={potenciar:"⭐ Potenciar",subir:"↑ Subir precio",revisar:"⚠️ Revisar",ok:"✓ OK"};

  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"Georgia,serif",padding:"0 0 40px"}}>
      {/* Header */}
      <div style={{background:C.card,borderBottom:`1px solid ${C.border}`,padding:"0 20px",position:"sticky",top:0,zIndex:100}}>
        <div style={{maxWidth:960,margin:"0 auto"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 0 8px"}}>
            <div style={{fontSize:22,fontWeight:700,color:C.accent,letterSpacing:"-1px"}}>batata <span style={{fontSize:12,color:C.muted,fontWeight:400,letterSpacing:0}}>macro</span></div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              {stockRojo.length>0&&(
                <span style={{fontSize:10,padding:"3px 8px",background:C.redDim,color:C.red,borderRadius:20,border:`1px solid ${C.red}44`}}>
                  🔴 {stockRojo.length} sin stock
                </span>
              )}
              {stockAmarillo.length>0&&(
                <span style={{fontSize:10,padding:"3px 8px",background:C.yellowDim,color:C.yellow,borderRadius:20,border:`1px solid ${C.yellow}44`}}>
                  🟡 {stockAmarillo.length} bajo
                </span>
              )}
              <button onClick={onSwitch} style={{fontSize:11,padding:"5px 12px",borderRadius:6,border:`1px solid ${C.border}`,background:C.card2,color:C.muted,cursor:"pointer"}}>
                Ver Diario ↗
              </button>
            </div>
          </div>
          <div style={{display:"flex",gap:4,overflowX:"auto",paddingBottom:8}}>
            {TABS.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={ts(t.id)}>{t.icon} {t.label}</button>)}
          </div>
        </div>
      </div>

      <div style={{maxWidth:960,margin:"0 auto",padding:"24px 20px"}}>

        {/* INICIO */}
        {tab==="inicio"&&(
          <div>
            <div style={{marginBottom:20}}>
              <div style={{fontSize:13,color:C.muted}}>Mayo 2026 · {diasOp} días operados</div>
              <div style={{fontSize:24,fontWeight:700,marginTop:2}}>Estado del negocio</div>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10,marginBottom:16}}>
              <KPI label="Ventas acumuladas"  value={fmtK(ventas)}    sub={`${diasOp} días`}   color={C.green}  />
              <KPI label="Proyección mayo"    value={fmtK(proyMes)}   sub="a promedio actual"  color={C.text}   />
              <KPI label="Ticket promedio"    value={fmt(Math.round(ventas/txn))} sub="obj: $13.000" color={C.accent} />
              <KPI label="Resultado est."     value={fmtK(resultado)} sub="ventas − GF − prov"  color={resultado>0?C.green:C.red} borde={resultado>0?C.green:C.red} />
            </div>

            {stockRojo.length>0&&(
              <div style={{background:C.redDim,borderRadius:10,padding:"12px 16px",border:`1px solid ${C.red}44`,marginBottom:10}}>
                <div style={{fontWeight:700,color:C.red,marginBottom:6,fontSize:12}}>🔴 Stock bajo mínimo — reponer ya</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                  {stockRojo.map((s,i)=><Pill key={i} label={`${s.icon} ${s.item}: ${s.stock}${s.u}`} color={C.red}/>)}
                </div>
              </div>
            )}

            <div style={{background:C.yellowDim,borderRadius:10,padding:"12px 16px",border:`1px solid ${C.yellow}44`,marginBottom:16}}>
              <div style={{fontWeight:700,color:C.yellow,fontSize:12,marginBottom:4}}>🥛 Alerta leche</div>
              <div style={{fontSize:11,color:C.text}}>Cada entrega de Serenísima (17L) dura 2.5 días. Pedir 22L por entrega para no quedar cortos entre martes y jueves.</div>
            </div>

            <div style={{background:C.card,borderRadius:12,padding:"18px 16px",border:`1px solid ${C.border}`,marginBottom:16}}>
              <div style={{fontSize:12,fontWeight:600,marginBottom:14}}>Ventas diarias — Mayo 2026</div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={VENTAS} margin={{top:0,right:0,bottom:0,left:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false}/>
                  <XAxis dataKey="f" tick={{fontSize:9,fill:C.muted}} tickLine={false} axisLine={false}/>
                  <YAxis tick={{fontSize:9,fill:C.muted}} tickLine={false} axisLine={false} tickFormatter={v=>`$${Math.round(v/1000)}k`}/>
                  <Tooltip formatter={v=>[fmt(v),"Ventas"]} contentStyle={{background:C.card2,border:`1px solid ${C.border}`,borderRadius:8,fontSize:11}}/>
                  <Bar dataKey="v" radius={[4,4,0,0]}>
                    {VENTAS.map((d,i)=><Cell key={i} fill={d.d==="Sáb"||d.d==="Dom"?C.accent:C.blue}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{background:C.card,borderRadius:12,padding:"18px 16px",border:`1px solid ${C.border}`}}>
              <div style={{fontSize:12,fontWeight:600,marginBottom:12}}>Top 5 más vendidos</div>
              {TOP_PRODS.slice(0,5).map((p,i)=>{
                const catC=p.cat==="Café"?C.blue:p.cat==="Pastelería"?C.accent:C.green;
                const rentC=p.rent>30?C.green:p.rent>20?C.yellow:C.red;
                return(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"8px 0",borderBottom:i<4?`1px solid ${C.border}22`:undefined}}>
                    <span style={{fontSize:16,fontWeight:800,color:C.dim,width:20}}>{i+1}</span>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:600,fontSize:12}}>{p.nombre}</div>
                      <div style={{fontSize:10,color:catC,marginTop:1}}>{p.cat} · {p.u} uds</div>
                    </div>
                    <Pill label={`${p.rent}%`} color={rentC}/>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VENTAS */}
        {tab==="ventas"&&(
          <div>
            <div style={{fontSize:16,fontWeight:700,marginBottom:4}}>Ventas y productos</div>
            <div style={{fontSize:11,color:C.muted,marginBottom:20}}>Mayo 2026 · datos reales Fudo · {diasOp} días completos</div>

            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10,marginBottom:20}}>
              <KPI label="Total acumulado"   value={fmtK(ventas)}   color={C.green}/>
              <KPI label="Promedio diario"   value={fmt(promDia)}    color={C.text}/>
              <KPI label="Proyección mayo"   value={fmtK(proyMes)}  color={C.accent}/>
              <KPI label="Ticket promedio"   value={fmt(Math.round(ventas/txn))} color={C.text}/>
              <KPI label="Transacciones"     value={txn}            color={C.text}/>
            </div>

            <div style={{background:C.card,borderRadius:12,padding:"18px 16px",border:`1px solid ${C.border}`,marginBottom:16}}>
              <div style={{fontSize:12,fontWeight:600,marginBottom:14}}>Evolución de ventas</div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={VENTAS} margin={{top:0,right:0,bottom:0,left:0}}>
                  <defs>
                    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={C.accent} stopOpacity={0.25}/>
                      <stop offset="95%" stopColor={C.accent} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false}/>
                  <XAxis dataKey="f" tick={{fontSize:9,fill:C.muted}} tickLine={false} axisLine={false}/>
                  <YAxis tick={{fontSize:9,fill:C.muted}} tickLine={false} axisLine={false} tickFormatter={v=>`$${Math.round(v/1000)}k`}/>
                  <Tooltip formatter={v=>[fmt(v),"Ventas"]} contentStyle={{background:C.card2,border:`1px solid ${C.border}`,borderRadius:8,fontSize:11}}/>
                  <Area type="monotone" dataKey="v" stroke={C.accent} fill="url(#grad)" strokeWidth={2} dot={false}/>
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div style={{background:C.card,borderRadius:12,padding:"18px 16px",border:`1px solid ${C.border}`}}>
              <div style={{fontSize:12,fontWeight:600,marginBottom:14}}>Todos los productos — unidades vendidas</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:8}}>
                {TOP_PRODS.map((p,i)=>{
                  const catC=p.cat==="Café"?C.blue:p.cat==="Pastelería"?C.accent:C.green;
                  const rentC=p.rent>30?C.green:p.rent>20?C.yellow:C.red;
                  return(
                    <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:C.card2,borderRadius:8}}>
                      <span style={{fontSize:14,fontWeight:800,color:C.dim,width:22,textAlign:"center"}}>{i+1}</span>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:600,fontSize:12}}>{p.nombre}</div>
                        <div style={{fontSize:10,color:catC,marginTop:1}}>{p.u} uds · {p.cat}</div>
                      </div>
                      <Pill label={`${p.rent}%`} color={rentC}/>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* CAJA */}
        {tab==="caja"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <div>
                <div style={{fontSize:16,fontWeight:700}}>Caja real</div>
                <div style={{fontSize:11,color:C.muted,marginTop:2}}>Saldos + compromisos + flujo proyectado</div>
              </div>
              <button onClick={()=>setEditSaldos(!editSaldos)} style={{padding:"6px 14px",fontSize:11,borderRadius:6,border:`1px solid ${editSaldos?C.accent:C.border}`,background:editSaldos?C.accentDim:C.card,color:editSaldos?C.accent:C.muted,cursor:"pointer"}}>
                {editSaldos?"✓ Guardar":"✏️ Actualizar saldos"}
              </button>
            </div>

            {editSaldos&&(
              <div style={{background:C.card,border:`1px solid ${C.yellow}44`,borderRadius:10,padding:"14px 16px",marginBottom:16}}>
                <div style={{fontSize:10,color:C.yellow,marginBottom:12,fontWeight:600,textTransform:"uppercase",letterSpacing:".05em"}}>Actualizar saldos</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
                  {[{k:"mp",l:"Mercado Pago"},{k:"bbva",l:"BBVA"},{k:"ef",l:"Efectivo"}].map(f=>(
                    <div key={f.k}>
                      <div style={{fontSize:10,color:C.muted,marginBottom:4}}>{f.l}</div>
                      <input type="number" value={saldos[f.k]}
                        onChange={e=>setSaldos({...saldos,[f.k]:Number(e.target.value)})}
                        style={{width:"100%",padding:"8px 10px",fontSize:13,background:C.bg,border:`1px solid ${C.border}`,borderRadius:6,color:C.text}}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:10,marginBottom:16}}>
              <KPI label="Mercado Pago"    value={fmt(saldos.mp)}       sub="disponible ya"     color={C.text}/>
              <KPI label="BBVA"            value={fmt(saldos.bbva)}     sub="disponible ya"     color={C.text}/>
              <KPI label="Efectivo"        value={fmt(saldos.ef)}       sub="en caja"           color={C.text}/>
              <KPI label="TOTAL EN MANO"   value={fmt(totalCaja)}       sub="suma de las tres"  color={C.green} borde={C.green}/>
              <KPI label="Comprometido"    value={fmt(1596698)}         sub="esta semana"       color={C.red}   borde={C.red}/>
              <KPI label="PLATA LIBRE"     value={fmt(totalCaja-1596698)} sub="en mano − pagos" color={totalCaja-1596698>0?C.green:C.red} borde={totalCaja-1596698>0?C.green:C.red}/>
            </div>

            <div style={{background:C.redDim,borderRadius:10,padding:"12px 16px",border:`1px solid ${C.red}44`,marginBottom:10}}>
              <div style={{fontWeight:700,color:C.red,fontSize:12,marginBottom:4}}>⚡ Esta semana</div>
              <div style={{fontSize:11,color:C.text}}>Cargas sociales $1.246.698 + Aguinaldo $350.000 = <strong>$1.596.698</strong> — vencen el 22/05</div>
            </div>
            <div style={{background:C.yellowDim,borderRadius:10,padding:"12px 16px",border:`1px solid ${C.yellow}44`,marginBottom:16}}>
              <div style={{fontWeight:700,color:C.yellow,fontSize:12,marginBottom:4}}>📅 Próximas semanas</div>
              <div style={{fontSize:11,color:C.text}}>Alyser $81.544 → 28/05 · Alyser $389.404 → 08/06 · Sueldos $2.8M → 10/06</div>
            </div>

            <SL>Calendario de flujo de caja</SL>
            <div style={{background:C.card,borderRadius:12,padding:"18px 16px",border:`1px solid ${C.border}`,marginBottom:16}}>
              <Calendario/>
            </div>

            <SL>Compromisos pendientes</SL>
            <div style={{background:C.card,borderRadius:12,border:`1px solid ${C.border}`,overflow:"hidden"}}>
              {compromisos.map((c,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderBottom:i<compromisos.length-1?`1px solid ${C.border}`:"none",opacity:c.pagado?.5:1}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12,fontWeight:600,color:c.pagado?C.muted:C.text}}>{c.concepto}</div>
                    <div style={{fontSize:11,color:C.muted,marginTop:2,display:"flex",gap:6,alignItems:"center"}}>
                      Vence {c.fecha} · {c.tipo}
                      {c.urgente&&!c.pagado&&<span style={{background:C.redDim,color:C.red,fontSize:10,padding:"1px 6px",borderRadius:10}}>Urgente</span>}
                    </div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:13,fontWeight:700,color:c.pagado?C.muted:C.red,marginBottom:4}}>{fmt(c.monto)}</div>
                    {c.pagado
                      ? <span style={{fontSize:11,color:C.green}}>✓ Pagado</span>
                      : <button onClick={()=>setCompromisos(compromisos.map((x,j)=>j===i?{...x,pagado:true}:x))}
                          style={{fontSize:11,padding:"4px 10px",borderRadius:6,border:`1px solid ${C.green}44`,background:C.greenDim,color:C.green,cursor:"pointer"}}>
                          ✓ Confirmar pago
                        </button>
                    }
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STOCK */}
        {tab==="stock"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div>
                <div style={{fontSize:16,fontWeight:700}}>Control de stock</div>
                <div style={{fontSize:11,color:C.muted,marginTop:2}}>71 insumos · consumo calculado con ventas reales</div>
              </div>
              <button onClick={()=>setEditStock(!editStock)} style={{padding:"6px 14px",fontSize:11,borderRadius:6,border:`1px solid ${editStock?C.accent:C.border}`,background:editStock?C.accentDim:C.card,color:editStock?C.accent:C.muted,cursor:"pointer"}}>
                {editStock?"✓ Listo":"✏️ Actualizar stock"}
              </button>
            </div>

            {stockRojo.length>0&&(
              <div style={{background:C.redDim,borderRadius:10,padding:"12px 16px",border:`1px solid ${C.red}44`,marginBottom:10}}>
                <div style={{fontWeight:700,color:C.red,marginBottom:6,fontSize:12}}>🔴 Reponer ya — bajo mínimo</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                  {stockRojo.map((s,i)=><Pill key={i} label={`${s.icon} ${s.item}: ${s.stock}${s.u}`} color={C.red}/>)}
                </div>
              </div>
            )}
            {stockAmarillo.length>0&&(
              <div style={{background:C.yellowDim,borderRadius:10,padding:"12px 16px",border:`1px solid ${C.yellow}44`,marginBottom:16}}>
                <div style={{fontWeight:700,color:C.yellow,marginBottom:6,fontSize:12}}>🟡 Programar compra — stock bajo</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                  {stockAmarillo.map((s,i)=><Pill key={i} label={`${s.icon} ${s.item}: ${s.stock}${s.u}`} color={C.yellow}/>)}
                </div>
              </div>
            )}

            {["Café","Lácteos","Insumos","Panificados","Verdulería","Fiambres","Descartables","Varios"].map(cat=>{
              const items=stock.filter(s=>s.cat===cat);
              if(!items.length) return null;
              return(
                <div key={cat} style={{marginBottom:20}}>
                  <SL>{cat}</SL>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:10}}>
                    {items.map((s,i)=>{
                      const pct=Math.min(100,(s.stock/s.max)*100);
                      const dias=s.cd>0?Math.round(s.stock/s.cd):99;
                      const col=s.stock<s.min?C.red:s.stock<s.min*1.5?C.yellow:C.green;
                      return(
                        <div key={i} style={{background:C.card,borderRadius:10,padding:14,border:`1px solid ${s.stock<s.min?C.red+"66":C.border}`}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                            <div>
                              <div style={{fontWeight:700,fontSize:12}}>{s.icon} {s.item}</div>
                              <div style={{fontSize:10,color:C.muted,marginTop:1}}>Dura ~{dias}d · mín {s.min}{s.u}</div>
                            </div>
                            {editStock
                              ? <input type="number" step="0.5" value={s.stock}
                                  onChange={e=>setStock(stock.map((x,j)=>stock.indexOf(s)===j?{...x,stock:Number(e.target.value)}:x))}
                                  style={{width:64,padding:"3px 6px",fontSize:14,fontWeight:700,background:C.bg,border:`1px solid ${C.accent}`,borderRadius:6,color:col,textAlign:"center"}}
                                />
                              : <span style={{fontSize:20,fontWeight:800,color:col}}>{s.stock}</span>
                            }
                          </div>
                          <div style={{height:5,background:C.card2,borderRadius:3,overflow:"hidden"}}>
                            <div style={{height:"100%",width:`${pct}%`,background:col,borderRadius:3,transition:"width .3s"}}/>
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

        {/* MENÚ */}
        {tab==="menu"&&(
          <div>
            <div style={{fontSize:16,fontWeight:700,marginBottom:4}}>Ingeniería de menú</div>
            <div style={{fontSize:11,color:C.muted,marginBottom:20}}>Rentabilidad real + volumen de ventas · {TOP_PRODS.length} productos</div>

            {/* Insights automáticos */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:10,marginBottom:20}}>
              <div style={{background:C.greenDim,borderRadius:10,padding:"14px 16px",border:`1px solid ${C.green}44`}}>
                <div style={{fontWeight:700,color:C.green,marginBottom:8,fontSize:12}}>⭐ Potenciar</div>
                <div style={{fontSize:11,color:C.muted,marginBottom:8}}>Alta rent. y/o alto volumen — comunicar más, ofrecer primero</div>
                {TOP_PRODS.filter(p=>p.accion==="potenciar").map((p,i)=>(
                  <div key={i} style={{fontSize:11,padding:"4px 0",borderBottom:i<TOP_PRODS.filter(x=>x.accion==="potenciar").length-1?`1px solid ${C.green}22`:"none",display:"flex",justifyContent:"space-between"}}>
                    <span>{p.nombre}</span>
                    <span style={{color:C.green,fontWeight:600}}>{p.rent}%</span>
                  </div>
                ))}
              </div>
              <div style={{background:C.yellowDim,borderRadius:10,padding:"14px 16px",border:`1px solid ${C.yellow}44`}}>
                <div style={{fontWeight:700,color:C.yellow,marginBottom:8,fontSize:12}}>↑ Subir precio</div>
                <div style={{fontSize:11,color:C.muted,marginBottom:8}}>Buen volumen pero margen ajustado — el cliente ya lo acepta</div>
                {TOP_PRODS.filter(p=>p.accion==="subir").map((p,i)=>(
                  <div key={i} style={{fontSize:11,padding:"4px 0",borderBottom:i<TOP_PRODS.filter(x=>x.accion==="subir").length-1?`1px solid ${C.yellow}22`:"none",display:"flex",justifyContent:"space-between"}}>
                    <span>{p.nombre}</span>
                    <span style={{color:C.yellow,fontWeight:600}}>{fmt(p.pv)} → {fmt(Math.round(p.pv*1.1))}</span>
                  </div>
                ))}
              </div>
              <div style={{background:C.redDim,borderRadius:10,padding:"14px 16px",border:`1px solid ${C.red}44`}}>
                <div style={{fontWeight:700,color:C.red,marginBottom:8,fontSize:12}}>⚠️ Revisar</div>
                <div style={{fontSize:11,color:C.muted,marginBottom:8}}>Margen bajo — están dañando la rentabilidad promedio</div>
                {TOP_PRODS.filter(p=>p.accion==="revisar").map((p,i)=>(
                  <div key={i} style={{fontSize:11,padding:"4px 0",borderBottom:i<TOP_PRODS.filter(x=>x.accion==="revisar").length-1?`1px solid ${C.red}22`:"none",display:"flex",justifyContent:"space-between"}}>
                    <span>{p.nombre}</span>
                    <span style={{color:C.red,fontWeight:600}}>{p.rent}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tabla completa */}
            <div style={{background:C.card,borderRadius:12,padding:"16px",border:`1px solid ${C.border}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                <div style={{fontSize:12,fontWeight:600}}>Todos los productos</div>
                <div style={{display:"flex",gap:6}}>
                  {["todos","potenciar","subir","revisar","ok"].map(f=>(
                    <button key={f} onClick={()=>setMenuFiltro(f)}
                      style={{fontSize:10,padding:"3px 10px",borderRadius:12,border:`1px solid ${menuFiltro===f?C.accent:C.border}`,background:menuFiltro===f?C.accentDim:"transparent",color:menuFiltro===f?C.accent:C.muted,cursor:"pointer"}}>
                      {f==="todos"?"Todos":accionLabel[f]}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                  <thead>
                    <tr style={{borderBottom:`1px solid ${C.border}`}}>
                      {["Producto","Cat.","Precio","Costo","Rent.","Ventas","Acción"].map(h=>(
                        <th key={h} style={{textAlign:"left",padding:"6px 8px",fontSize:10,color:C.muted,fontWeight:600,whiteSpace:"nowrap"}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {prodsFiltrados.map((p,i)=>{
                      const catC=p.cat==="Café"?C.blue:p.cat==="Pastelería"?C.accent:C.green;
                      const rentC=p.rent>30?C.green:p.rent>20?C.yellow:C.red;
                      const ac=accionColor[p.accion]||C.muted;
                      return(
                        <tr key={i} style={{borderBottom:`1px solid ${C.border}22`,background:i%2===0?"transparent":C.card2}}>
                          <td style={{padding:"7px 8px",fontWeight:600}}>{p.nombre}</td>
                          <td style={{padding:"7px 8px"}}><span style={{fontSize:10,color:catC,fontWeight:600}}>{p.cat}</span></td>
                          <td style={{padding:"7px 8px"}}>{fmt(p.pv)}</td>
                          <td style={{padding:"7px 8px",color:C.muted}}>{fmt(p.ct)}</td>
                          <td style={{padding:"7px 8px"}}><span style={{fontWeight:700,color:rentC}}>{p.rent}%</span></td>
                          <td style={{padding:"7px 8px",color:C.muted}}>{p.u} uds</td>
                          <td style={{padding:"7px 8px"}}><span style={{fontSize:10,padding:"2px 7px",borderRadius:10,background:`${ac}22`,color:ac,border:`1px solid ${ac}44`,fontWeight:600}}>{accionLabel[p.accion]}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* RESULTADO */}
        {tab==="resultado"&&(
          <div>
            <div style={{fontSize:16,fontWeight:700,marginBottom:4}}>Resultado del mes</div>
            <div style={{fontSize:11,color:C.muted,marginBottom:20}}>P&L proyectado · Mayo 2026</div>

            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10,marginBottom:20}}>
              <KPI label="Facturación proy."    value={fmtK(proyMes)}    color={C.green}/>
              <KPI label="Gastos fijos"          value={fmtK(totalGF)}    color={C.red}/>
              <KPI label="Proveedores est."      value={fmtK(provMes)}    color={C.yellow}/>
              <KPI label="Resultado operativo"   value={fmtK(resultado)}  color={resultado>0?C.green:C.red} borde={resultado>0?C.green:C.red}/>
            </div>

            <div style={{background:C.card,borderRadius:12,padding:"18px 20px",border:`1px solid ${C.border}`,marginBottom:16}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <tbody>
                  {[
                    {l:"Facturación proyectada",v:proyMes,c:C.green,signo:"+"},
                    {l:"− Materia prima / Proveedores",v:provMes,c:C.red,signo:"-",pct:(provMes/proyMes*100).toFixed(1)},
                    {l:"− Gastos fijos",v:totalGF,c:C.red,signo:"-",pct:(totalGF/proyMes*100).toFixed(1)},
                  ].map((r,i)=>(
                    <tr key={i} style={{borderBottom:`1px solid ${C.border}22`}}>
                      <td style={{padding:"9px 0",color:C.text}}>{r.l}</td>
                      <td style={{padding:"9px 0",textAlign:"right",fontWeight:700,color:r.c}}>{r.signo}{fmt(r.v)}</td>
                      <td style={{padding:"9px 0",textAlign:"right",fontSize:10,color:C.muted}}>{r.pct&&r.pct+"%"}</td>
                    </tr>
                  ))}
                  <tr style={{borderTop:`1px solid ${C.border}`}}>
                    <td style={{padding:"10px 0",fontWeight:700,fontSize:14}}>Resultado operativo</td>
                    <td style={{padding:"10px 0",textAlign:"right",fontWeight:700,fontSize:16,color:resultado>0?C.green:C.red}}>{resultado>0?"+":"-"}{fmt(resultado)}</td>
                    <td style={{padding:"10px 0",textAlign:"right",fontSize:11,color:resultado>0?C.green:C.red}}>{(resultado/proyMes*100).toFixed(1)}%</td>
                  </tr>
                  <tr>
                    <td style={{padding:"8px 0",color:C.muted,fontSize:11}}>− Sueldo socios ($500k c/u)</td>
                    <td style={{padding:"8px 0",textAlign:"right",color:C.muted}}>-{fmt(1000000)}</td>
                    <td/>
                  </tr>
                  <tr style={{borderTop:`1px solid ${C.border}`}}>
                    <td style={{padding:"10px 0",fontWeight:700}}>Resultado neto</td>
                    <td style={{padding:"10px 0",textAlign:"right",fontWeight:700,color:(resultado-1000000)>0?C.green:C.red}}>{fmt(resultado-1000000)}</td>
                    <td/>
                  </tr>
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
        )}

        {/* CONFIG */}
        {tab==="config"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <div>
                <div style={{fontSize:16,fontWeight:700}}>Configuración</div>
                <div style={{fontSize:11,color:C.muted,marginTop:2}}>Gastos fijos · actualizar mes a mes</div>
              </div>
              <button onClick={()=>setEditGF(!editGF)} style={{padding:"7px 16px",fontSize:11,borderRadius:6,border:`1px solid ${editGF?C.accent:C.border}`,background:editGF?C.accentDim:C.card,color:editGF?C.accent:C.muted,cursor:"pointer",fontWeight:600}}>
                {editGF?"✓ Guardar cambios":"✏️ Editar gastos fijos"}
              </button>
            </div>

            {editGF&&(
              <div style={{background:C.yellowDim,border:`1px solid ${C.yellow}44`,borderRadius:8,padding:"10px 14px",marginBottom:16,fontSize:11,color:C.yellow}}>
                💡 Tocá el monto de cualquier ítem para actualizarlo. Los cambios afectan el resultado en tiempo real.
              </div>
            )}

            <div style={{background:C.card,borderRadius:10,padding:"14px 16px",border:`1px solid ${C.border}`,marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontSize:10,color:C.muted,marginBottom:2}}>TOTAL GASTOS FIJOS MENSUALES</div>
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
              const cols={Personal:C.blue,Estructura:C.accent,Servicios:C.green,Admin:C.yellow,Impuestos:C.red};
              const col=cols[cat]||C.text;
              return(
                <div key={cat} style={{marginBottom:16}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                    <span style={{fontWeight:700,color:col,fontSize:12}}>{cat}</span>
                    <span style={{fontSize:11,color:C.muted}}>{fmt(total)}</span>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:8}}>
                    {items.map((g,i)=>(
                      <div key={i} style={{background:C.card,borderRadius:10,padding:"12px 14px",border:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:12}}>
                        <span style={{fontSize:20,flexShrink:0}}>{g.icon}</span>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:11,color:C.muted,marginBottom:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{g.concepto}</div>
                          {editGF
                            ? <input type="number" value={g.monto}
                                onChange={e=>setGf(gf.map(x=>x.id===g.id?{...x,monto:Number(e.target.value)}:x))}
                                style={{width:"100%",padding:"6px 8px",fontSize:14,fontWeight:700,background:C.bg,border:`1px solid ${C.accent}`,borderRadius:6,color:col}}
                              />
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

// ── ROOT ──────────────────────────────────────────────────────────
export default function App(){
  const [vista,setVista]=useState(null);

  if(!vista) return <Login onLogin={v=>setVista(v)}/>;
  if(vista==="diario") return <VistaDiaria onSwitch={()=>setVista("macro")}/>;
  return <VistaMacro onSwitch={()=>setVista("diario")}/>;
}
