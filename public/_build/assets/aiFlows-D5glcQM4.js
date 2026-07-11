import{g as d,A as u}from"./api-BMGtncy1.js";class s extends Error{constructor(){super("ai.errors.unavailable"),this.name="AiUnavailableError"}}async function i(e){let a;try{a=await d("askGemini",{form:{task:e.task,prompt:e.prompt,...e.json?{responseMimeType:"application/json"}:{},...e.file?{fileBuffer:e.file.base64,mimeType:e.file.mimeType,fileName:e.file.name}:{}}})}catch(n){throw n instanceof u&&n.status===404?new s:n instanceof Error&&/not found/i.test(n.message)?new s:n}const o=a?.text??a?.response??a?.result??"";if(a?.success===!1||!o)throw new Error(String(a?.error??"ai.errors.empty"));return o}function p(e){const a=e.replace(/```(?:json)?/gi,"").trim();try{return JSON.parse(a)}catch{const o=Math.min(...[a.indexOf("{"),a.indexOf("[")].filter(l=>l>=0)),n=Math.max(a.lastIndexOf("}"),a.lastIndexOf("]"));if(!Number.isFinite(o)||n<=o)throw new Error("ai.errors.badJson");return JSON.parse(a.slice(o,n+1))}}async function r(e){return p(await i({...e,json:!0}))}function m(e){return new Promise((a,o)=>{const n=new FileReader;n.onload=()=>a(String(n.result).split(",")[1]??""),n.onerror=()=>o(n.error),n.readAsDataURL(e)})}const t=e=>e.filter(a=>a.isActive).map(a=>`${a.accountNumber} ${a.name} (${a.type})`).join(`
`),c=`Reglas contables:
- Asset y Expense son de naturaleza deudora; Liability, Equity y Revenue de naturaleza acreedora.
- El asiento DEBE balancear: total débitos = total créditos.
- Usa SOLO números de cuenta del catálogo. Montos con 2 decimales.`;async function y(e,a){return r({task:"journal-entry-draft",prompt:`Eres un contador. Convierte la siguiente operación en un asiento contable balanceado.

${c}

Catálogo de cuentas:
${t(a)}

Operación: """${e}"""

Responde SOLO este JSON:
{"description": "...", "lines": [{"accountNumber": "...", "description": "...", "debit": 0, "credit": 0}]}`})}async function b(e){const a=await m(e);return r({task:"receipt-extract",prompt:`Extrae los datos de esta factura o recibo. Fechas en formato YYYY-MM-DD, montos numéricos con 2 decimales, qty numérica (1 si no aparece).

Responde SOLO este JSON:
{"vendorName": "...", "date": "YYYY-MM-DD", "reference": "num factura/recibo", "total": 0, "items": [{"name": "...", "qty": 1, "unitCost": 0}]}`,file:{base64:a,mimeType:e.type||"application/octet-stream",name:e.name}})}async function g(e,a){const o=e.moneyOut?"SALIDA de dinero (probablemente un gasto o pago)":"ENTRADA de dinero (probablemente un ingreso o cobro)";return r({task:"bank-categorize",prompt:`Eres un contador. Elige la cuenta contable que mejor clasifica este movimiento bancario (${o}).

Catálogo de cuentas:
${t(a)}

Movimiento: fecha ${e.date}, monto ${e.amount.toFixed(2)}, descripción: """${e.description}"""

Responde SOLO este JSON:
{"accountNumber": "...", "description": "descripción corta y limpia para el asiento"}`})}async function E(e,a,o){return r({task:"template-draft",prompt:`Eres un contador que diseña plantillas de asientos contables reutilizables.

Una plantilla tiene:
- fields: campos que el usuario llena al usarla. Tipos válidos: ${o.join(", ")}. Los tipos provider/customer/employee conectan una entidad real y exponen variables: {provider.name}, {provider.id}, {provider.relatedAccountId}, {provider.advanceAccountId}, {customer.*} igual, {employee.name}, {employee.id}, {employee.rate} (tarifa horaria efectiva).
- lineRules: líneas del asiento. Cada una lleva type debit|credit y amountExpression — aritmética con {campo}, p.ej. "{monto}" o "{horas} * {employee.rate}". La cuenta es accountNumber fijo del catálogo O accountExpression dinámica como "{provider.relatedAccountId}". referenceIdExpression opcional (p.ej. "{provider.id}") etiqueta la línea para el ledger de la entidad.
- El asiento generado DEBE balancear con cualquier valor de campos: la suma de expresiones débito debe igualar la de crédito.

${c}

Catálogo de cuentas:
${t(a)}

Plantilla pedida: """${e}"""

Responde SOLO este JSON:
{"name": "...", "description": "...", "category": "...",
 "fields": [{"name": "monto", "label": "Monto", "type": "currency", "required": true}],
 "lineRules": [{"accountNumber": "...", "accountExpression": null, "type": "debit", "amountExpression": "{monto}", "description": "...", "referenceIdExpression": null}],
 "settings": {"referenceFormat": "...", "defaultDescription": "..."}}`})}async function v(e){return i({task:"financial-analysis",prompt:`Eres el contador de confianza de una pequeña empresa. Con estas cifras, escribe un análisis breve en español (máximo 6 viñetas): estado general, señales de alerta y 2 acciones recomendadas. Sé directo y concreto, sin tecnicismos innecesarios.

${e}`})}export{v as a,y as b,E as c,b as e,g as s};
