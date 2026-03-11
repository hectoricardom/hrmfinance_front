import{d as We,c as S,g as rt,h as Fe,o as it,l as lt,b0 as ae,b1 as st,e as j,t as f,i as t,a as i,S as y,w as oe,F as R,b as z,j as W,B as V,v as G,k as nt,b2 as at,L as ot}from"./index-Dqwppiiq.js";We(["click","input","keydown","mousedown"]);var dt=f("<div><div>⏳</div><div>Cargando ofertas..."),ct=f("<div><p>Configuración actual: <strong></strong></p><p>Código: <!> •<!> •"),pt=f("<div><div><h2>💰 Administrador de Ofertas</h2></div><div>"),_e=f("<div>"),gt=f("<span>✓ ACTIVA EN SISTEMA"),yt=f("<div>💡 La configuración activa se usa automáticamente en las facturas"),ut=f("<div><div><label>🔄 Cambiar Configuración:</label></div><select>"),mt=f("<div><div><label>Método de Envío:</label><select><option value=maritime>🚢 Marítimo</option><option value=air>✈️ Aéreo</option></select></div><div><label>Categoría:</label><select><option value=miscellaneous>📦 Misceláneas</option><option value=durable>🔧 Duraderos</option><option value=box_flat_rate>📐 Tarifa Plana (Cajas)"),ft=f("<th>Libras Gratis"),ht=f("<th>Peso a Cobrar"),bt=f("<th>Arancel/lb"),vt=f("<th>Acciones"),Pt=f("<div><div><h3>Rangos de Peso y Precios</h3></div><div><table><thead><tr><th>Peso Min (lbs)</th><th>Peso Max (lbs)</th><th>Precio/lb</th><th>Descripción</th></tr></thead><tbody>"),$t=f("<div><h3>Opciones de Cajas (Tarifa Plana)</h3><div>"),_t=f('<div><div>ℹ️ Información</div><ul><li>Las ofertas se aplican automáticamente al calcular precios en facturas</li><li>Los rangos de peso determinan el precio por libra según el peso total</li><li>Las "Libras Gratis" reducen el peso efectivo a cobrar</li><li>Los cambios se reflejarán inmediatamente en nuevas facturas</li><li>Los aranceles aplican solo a categoría "Duraderos"'),Oe=f("<div class=category-section><h3 class=category-title>📦 Misceláneos</h3><table class=offers-table><thead><tr><th>Peso (lbs)</th><th>Precio/lb</th><th>Lbs Gratis</th><th>Peso a Pagar</th><th>Precio Efectivo</th></tr></thead><tbody>"),Ne=f("<div class=category-section><h3 class=category-title>🔧 Duraderos</h3><table class=offers-table><thead><tr><th>Peso (lbs)</th><th>Precio/lb</th><th>Arancel/lb</th><th>Total/lb</th></tr></thead><tbody>"),xt=f("<div class=category-section><h3 class=category-title>📐 Cajas Tarifa Plana</h3><table class=offers-table><thead><tr><th>Tamaño</th><th>Peso Máximo</th><th>Precio</th></tr></thead><tbody>"),Ct=f(`<div class=print-only><div class=print-container><div class=print-header><h1>YABA Express - Tarifas de Envío</h1><div class=print-info><div class=info-row><span class=label>Configuración:</span><span class=value></span></div><div class=info-row><span class=label>Código:</span><span class=value></span></div><div class=info-row><span class=label>Fecha:</span><span class=value></span></div></div></div><div class=print-section><div class="method-header maritime-header"><h2>🚢 ENVÍO MARÍTIMO</h2><span class=delivery-time>Entrega: 6-8 semanas</span></div></div><div class=print-section><div class="method-header air-header"><h2>✈️ ENVÍO AÉREO</h2><span class=delivery-time>Entrega: 7-10 días</span></div></div><div class=print-footer><p class=footer-text>Todos los precios en USD • Promociones aplicadas automáticamente • Tiempos de entrega estimados • Precios sujetos a cambio</p><p class=footer-company><strong>YABA Express</strong></p></div></div><style>
            @media print {
              body * {
                visibility: hidden;
              }

              .print-only,
              .print-only * {
                visibility: visible !important;
              }

              .print-only {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
              }

              @page {
                margin: 20mm;
                size: A4;
              }
            }

            .print-container {
              font-family: Arial, sans-serif;
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
              background: white;
              color: #000;
            }

            .print-header {
              text-align: center;
              border-bottom: 3px solid #1a73e8;
              padding-bottom: 15px;
              margin-bottom: 25px;
            }

            .print-header h1 {
              color: #1a73e8;
              font-size: 28px;
              margin: 0 0 15px 0;
              font-weight: bold;
            }

            .print-info {
              display: flex;
              justify-content: center;
              gap: 30px;
              flex-wrap: wrap;
            }

            .info-row {
              font-size: 13px;
            }

            .info-row .label {
              font-weight: bold;
              color: #555;
            }

            .info-row .value {
              color: #000;
              margin-left: 5px;
            }

            .print-section {
              margin-bottom: 30px;
              page-break-inside: avoid;
            }

            .method-header {
              padding: 12px 15px;
              margin-bottom: 15px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-radius: 5px;
            }

            .maritime-header {
              background: #1e3a8a;
              color: white;
            }

            .air-header {
              background: #7c3aed;
              color: white;
            }

            .method-header h2 {
              margin: 0;
              font-size: 20px;
              font-weight: bold;
            }

            .delivery-time {
              font-size: 12px;
              opacity: 0.9;
            }

            .category-section {
              margin-bottom: 20px;
            }

            .category-title {
              color: #1a73e8;
              font-size: 16px;
              margin: 0 0 10px 0;
              padding-left: 8px;
              border-left: 3px solid #1a73e8;
              font-weight: bold;
            }

            .offers-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 15px;
              font-size: 13px;
            }

            .offers-table thead {
              background: #f5f5f5;
            }

            .offers-table th {
              padding: 10px 8px;
              text-align: left;
              font-weight: bold;
              color: #333;
              border: 1px solid #ddd;
            }

            .offers-table td {
              padding: 8px;
              border: 1px solid #ddd;
            }

            .offers-table tbody tr:nth-child(even) {
              background: #fafafa;
            }

            .price-col {
              color: #1a73e8;
              font-weight: bold;
            }

            .tariff-col {
              color: #ea4335;
            }

            .highlight-col {
              background: #e8f5e9;
              color: #2e7d32;
              font-weight: bold;
            }

            .center {
              text-align: center;
            }

            .box-size-col {
              font-weight: bold;
            }

            .print-footer {
              margin-top: 30px;
              padding-top: 15px;
              border-top: 2px solid #ddd;
              text-align: center;
            }

            .footer-text {
              font-size: 11px;
              color: #666;
              margin: 5px 0;
            }

            .footer-company {
              font-size: 14px;
              color: #1a73e8;
              margin: 10px 0 0 0;
            }
          `),wt=f("<div><label>🏢 Business ID: <span>(Solo Admin)</span></label><select>"),St=f('<div><div><label>Nombre de Configuración:</label><input type=text placeholder="Ej: Ofertas 2024"></div><div><label><input type=checkbox><span>✓ Activa</span></label></div><div><label><input type=checkbox><span>👁️ Visible'),Re=f("<option> (<!>)"),xe=f("<td>"),kt=f("<td><button>🗑️"),zt=f("<tr><td></td><td></td><td></td><td>"),At=f("<input type=text disabled>"),Lt=f("<input type=number step=0.01>"),Et=f("<input type=number step=1>"),Bt=f("<div><div><div><label>Tamaño</label></div><div><label>Precio</label></div><div><label>Peso Máximo (lbs)</label></div><div><label>Descripción</label><div>"),It=f("<strong>"),Tt=f("<strong>$"),Mt=f("<strong> lbs"),De=f("<tr><td> - </td><td class=price-col>$</td><td class=center></td><td class=center></td><td class=highlight-col>"),je=f("<tr><td> - </td><td class=price-col>$</td><td class=tariff-col>$</td><td class=highlight-col>$"),Ft=f("<tr><td class=box-size-col></td><td class=center> lbs</td><td class=highlight-col>$");const Ot=Ce=>{const[H,Ve]=S("maritime"),[F,Ye]=S("miscellaneous"),[L,de]=S(!1),[D,M]=S(null),[we,Se]=S(!0),[ce,ke]=S(!1),[pe,ze]=S([]),[J,ge]=S(null),[ie,ye]=S("Default"),[Ae,Le]=S(""),[ue,me]=S(!0),[fe,he]=S(!0),[U,be]=S("YB100423253156428"),[Ge,le]=S("YB100423253156428"),[se,Ee]=S(null),[Je,Be]=S(!1),[Ie,Ue]=S([]),ve=rt(()=>Fe.isAdmin()),[q,K]=S([]),[Q,X]=S([]),[Z,ee]=S([]),[te,re]=S([]),[ne,Te]=S([]),He=()=>{const c=H(),a=F();return c==="maritime"&&a==="miscellaneous"?q():c==="maritime"&&a==="durable"?Q():c==="air"&&a==="miscellaneous"?Z():c==="air"&&a==="durable"?te():[]},Y=(c,a,e)=>{const r=H(),s=F(),o=l=>l.map(u=>u.id===c?{...u,[a]:e}:u);r==="maritime"&&s==="miscellaneous"?K(o):r==="maritime"&&s==="durable"?X(o):r==="air"&&s==="miscellaneous"?ee(o):r==="air"&&s==="durable"&&re(o)},qe=()=>{const c={id:Date.now().toString(),min:0,max:0,pricePerLb:0,description:"Nueva oferta"},a=H(),e=F();a==="maritime"&&e==="miscellaneous"?K([...q(),c]):a==="maritime"&&e==="durable"?X([...Q(),c]):a==="air"&&e==="miscellaneous"?ee([...Z(),c]):a==="air"&&e==="durable"&&re([...te(),c])},Ke=c=>{if(!confirm("¿Eliminar esta oferta?"))return;const a=H(),e=F(),r=s=>s.filter(o=>o.id!==c);a==="maritime"&&e==="miscellaneous"?K(r):a==="maritime"&&e==="durable"?X(r):a==="air"&&e==="miscellaneous"?ee(r):a==="air"&&e==="durable"&&re(r)},Me=c=>{try{const a=JSON.parse(c.data),e=JSON.parse(a.offers);e&&Array.isArray(e)&&e.forEach(s=>{const o=s.method,l=s.category,u=s?.ranges?.map?.((b,p)=>({...b,id:b.id||`${a.id}-${p}`}));if(o==="maritime"&&l==="miscellaneous"?K(u||[]):o==="maritime"&&l==="durable"?X(u||[]):o==="air"&&l==="miscellaneous"?ee(u||[]):o==="air"&&l==="durable"&&re(u||[]),o==="maritime"&&l==="box_flat_rate"&&s.boxOptions){const b=s.boxOptions.map((p,v)=>({...p,id:p.id||`box-${v}`}));Te(b)}}),ge(c.id),ye(a.offerName||"Default"),Le(a.offerCode||""),me(a.isActive??!0),he(a.isVisible??!0);const r=a.businessId||"YB100423253156428";be(r),le(r),j("✅ Configuración cargada:",a.offerName)}catch(a){throw j("Error al cargar configuración:",a),a}};it(async()=>{try{if(Se(!0),ve()){const e=await lt.getBusinessByStatus(!0);Ue(e.filter(r=>r.isActive!==!1).map(r=>({id:r.id,name:r.name})))}const c=await ae.getAll();ze(c);const a=st();Ee(a?.id||null),c.length>0&&Me(c[0]),j("✅ Configuraciones disponibles:",c.length),j("📌 Configuración activa del sistema:",a?.name)}catch(c){j("Error al cargar ofertas:",c),M("⚠️ No se pudieron cargar las ofertas guardadas. Usando valores predeterminados."),setTimeout(()=>M(null),5e3)}finally{Se(!1)}});const Qe=c=>{const a=pe().find(e=>e.id===c);a&&Me(a)},Xe=async c=>{try{await at(c),Ee(c),M("✅ Configuración establecida como activa para facturas"),setTimeout(()=>M(null),3e3)}catch{M("❌ Error al establecer configuración activa"),setTimeout(()=>M(null),3e3)}},Ze=async()=>{try{ke(!0),M("💾 Guardando ofertas...");const c=[{method:"maritime",category:"miscellaneous",ranges:q().map(e=>{const{id:r,...s}=e;return s})},{method:"maritime",category:"durable",ranges:Q().map(e=>{const{id:r,...s}=e;return s})},{method:"air",category:"miscellaneous",ranges:Z().map(e=>{const{id:r,...s}=e;return s})},{method:"air",category:"durable",ranges:te().map(e=>{const{id:r,...s}=e;return s})},{method:"maritime",category:"box_flat_rate",boxOptions:ne().map(e=>{const{id:r,...s}=e;return s})}],a={name:ie(),isActive:ue(),isVisible:fe(),businessId:U(),originalBusinessId:Ge()};if(J())await ae.update(J(),c,a),j("✅ Configuración actualizada"),le(U());else{const e=await ae.create(c,a);ge(e.id),le(U());const r=await ae.getAll();ze(r),j("✅ Nueva configuración creada")}M("✅ Ofertas guardadas exitosamente"),de(!1),setTimeout(()=>M(null),3e3)}catch(c){j("Error al guardar ofertas:",c),M("❌ Error al guardar ofertas. Intenta nuevamente."),setTimeout(()=>M(null),5e3)}finally{ke(!1)}},et=async()=>{const c=prompt("Nombre para la nueva configuración:");if(!c)return;const a=prompt("Código para la configuración (opcional):")||`${c.toUpperCase().replace(/\s+/g,"_")}`,e=Fe.getBusinessId();ge(null),ye(c),Le(a),me(!0),he(!0),be(e),le(e),K([]),X([]),ee([]),re([]),Te([]),M("ℹ️ Nueva configuración creada. Agrega rangos y guarda."),setTimeout(()=>M(null),3e3)},tt=()=>{Be(!0),setTimeout(()=>{window.print(),Be(!1)},500)},B={padding:"0.5rem",border:"1px solid var(--border-color)","border-radius":"var(--border-radius-sm)","font-size":"0.875rem",width:"100%"};return(()=>{var c=_e();return c.style.setProperty("padding","2rem"),t(c,i(nt,{get children(){var a=_e();return a.style.setProperty("padding","1.5rem"),t(a,i(y,{get when(){return we()},get children(){var e=dt(),r=e.firstChild;return e.style.setProperty("padding","2rem"),e.style.setProperty("text-align","center"),e.style.setProperty("color","var(--text-muted)"),r.style.setProperty("font-size","2rem"),r.style.setProperty("margin-bottom","1rem"),e}}),null),t(a,i(y,{get when(){return!we()},get children(){return[(()=>{var e=pt(),r=e.firstChild,s=r.firstChild,o=r.nextSibling;return e.style.setProperty("display","flex"),e.style.setProperty("justify-content","space-between"),e.style.setProperty("align-items","flex-start"),e.style.setProperty("margin-bottom","1.5rem"),r.style.setProperty("flex","1"),s.style.setProperty("font-size","1.5rem"),s.style.setProperty("font-weight","600"),s.style.setProperty("margin-bottom","0.75rem"),t(r,i(y,{get when(){return!L()},get fallback(){return(()=>{var l=St(),u=l.firstChild,b=u.firstChild,p=b.nextSibling,v=u.nextSibling,x=v.firstChild,A=x.firstChild,O=A.nextSibling,n=v.nextSibling,_=n.firstChild,I=_.firstChild,d=I.nextSibling;return l.style.setProperty("display","grid"),l.style.setProperty("grid-template-columns","repeat(2, 1fr)"),l.style.setProperty("gap","1rem"),l.style.setProperty("max-width","800px"),b.style.setProperty("display","block"),b.style.setProperty("font-weight","600"),b.style.setProperty("margin-bottom","0.25rem"),b.style.setProperty("font-size","0.75rem"),b.style.setProperty("color","var(--text-muted)"),p.$$input=h=>ye(h.currentTarget.value),t(l,i(y,{get when(){return ve()},get children(){var h=wt(),C=h.firstChild,m=C.firstChild,$=m.nextSibling,g=C.nextSibling;return C.style.setProperty("display","block"),C.style.setProperty("font-weight","600"),C.style.setProperty("margin-bottom","0.25rem"),C.style.setProperty("font-size","0.75rem"),C.style.setProperty("color","var(--text-muted)"),$.style.setProperty("color","var(--danger-color)"),$.style.setProperty("font-size","0.65rem"),g.addEventListener("change",w=>be(w.currentTarget.value)),t(g,i(R,{get each(){return Ie()},children:w=>(()=>{var P=Re(),T=P.firstChild,k=T.nextSibling;return k.nextSibling,t(P,()=>w.name,T),t(P,()=>w.id,k),z(()=>P.value=w.id),P})()})),z(w=>W(g,B,w)),z(()=>g.value=U()),h}}),v),x.style.setProperty("display","flex"),x.style.setProperty("align-items","center"),x.style.setProperty("gap","0.5rem"),x.style.setProperty("cursor","pointer"),A.addEventListener("change",h=>me(h.currentTarget.checked)),O.style.setProperty("font-size","0.875rem"),_.style.setProperty("display","flex"),_.style.setProperty("align-items","center"),_.style.setProperty("gap","0.5rem"),_.style.setProperty("cursor","pointer"),I.addEventListener("change",h=>he(h.currentTarget.checked)),d.style.setProperty("font-size","0.875rem"),z(h=>W(p,B,h)),z(()=>p.value=ie()),z(()=>A.checked=ue()),z(()=>I.checked=fe()),l})()},get children(){var l=ct(),u=l.firstChild,b=u.firstChild,p=b.nextSibling,v=u.nextSibling,x=v.firstChild,A=x.nextSibling,O=A.nextSibling,n=O.nextSibling;return n.nextSibling,u.style.setProperty("color","var(--text-muted)"),u.style.setProperty("font-size","0.875rem"),u.style.setProperty("margin-bottom","0.25rem"),t(p,ie),v.style.setProperty("color","var(--text-muted)"),v.style.setProperty("font-size","0.75rem"),t(v,Ae,A),t(v,()=>ue()?" ✓ Activa":" ✗ Inactiva",n),t(v,()=>fe()?" 👁️ Visible":" 👁️‍🗨️ Oculta",null),t(v,i(y,{get when(){return ve()},get children(){return[" • 🏢 Business: ",oe(()=>Ie().find(_=>_.id===U())?.name||U())]}}),null),l}}),null),o.style.setProperty("display","flex"),o.style.setProperty("gap","0.5rem"),o.style.setProperty("flex-wrap","wrap"),t(o,i(y,{get when(){return L()},get children(){return[i(V,{variant:"primary",onClick:Ze,get disabled(){return ce()},get children(){return ce()?"💾 Guardando...":"💾 Guardar Cambios"}}),i(V,{variant:"outline",onClick:()=>de(!1),get disabled(){return ce()},children:"✕ Cancelar"})]}}),null),t(o,i(y,{get when(){return!L()},get children(){return[i(V,{variant:"primary",onClick:()=>de(!0),children:"✏️ Editar Ofertas"}),i(V,{variant:"outline",onClick:et,children:"➕ Nueva Configuración"}),i(V,{variant:"outline",onClick:tt,children:"🖨️ Imprimir"})]}}),null),t(o,i(y,{get when(){return Ce.onClose},get children(){return i(V,{variant:"outline",get onClick(){return Ce.onClose},children:"Cerrar"})}}),null),e})(),i(y,{get when(){return D()},get children(){var e=_e();return e.style.setProperty("padding","1rem"),e.style.setProperty("border-radius","var(--border-radius-sm)"),e.style.setProperty("margin-bottom","1rem"),t(e,D),z(r=>{var s=D()?.includes("❌")?"var(--danger-light)":D()?.includes("⚠️")?"var(--warning-light)":"var(--success-light)",o=D()?.includes("❌")?"var(--danger-color)":D()?.includes("⚠️")?"var(--warning-color)":"var(--success-color)",l=`1px solid ${D()?.includes("❌")?"var(--danger-color)":D()?.includes("⚠️")?"var(--warning-color)":"var(--success-color)"}`;return s!==r.e&&((r.e=s)!=null?e.style.setProperty("background",s):e.style.removeProperty("background")),o!==r.t&&((r.t=o)!=null?e.style.setProperty("color",o):e.style.removeProperty("color")),l!==r.a&&((r.a=l)!=null?e.style.setProperty("border",l):e.style.removeProperty("border")),r},{e:void 0,t:void 0,a:void 0}),e}}),i(y,{get when(){return oe(()=>pe().length>1)()&&!L()},get children(){var e=ut(),r=e.firstChild,s=r.firstChild,o=r.nextSibling;return e.style.setProperty("margin-bottom","1.5rem"),e.style.setProperty("padding","1rem"),e.style.setProperty("background","var(--gray-50)"),e.style.setProperty("border-radius","var(--border-radius-sm)"),r.style.setProperty("display","flex"),r.style.setProperty("justify-content","space-between"),r.style.setProperty("align-items","center"),r.style.setProperty("margin-bottom","0.5rem"),s.style.setProperty("font-weight","600"),s.style.setProperty("font-size","0.875rem"),t(r,i(y,{get when(){return J()!==se()},get children(){return i(V,{size:"sm",variant:"primary",onClick:()=>Xe(J()),children:"⭐ Hacer Activa"})}}),null),t(r,i(y,{get when(){return J()===se()},get children(){var l=gt();return l.style.setProperty("padding","0.25rem 0.75rem"),l.style.setProperty("background","var(--success-color)"),l.style.setProperty("color","white"),l.style.setProperty("border-radius","4px"),l.style.setProperty("font-size","0.75rem"),l.style.setProperty("font-weight","600"),l}}),null),o.addEventListener("change",l=>Qe(l.currentTarget.value)),t(o,i(R,{get each(){return pe()},children:l=>{const u=JSON.parse(l.data),b=l.id===se();return(()=>{var p=Re(),v=p.firstChild,x=v.nextSibling;return x.nextSibling,t(p,b?"⭐ ":"",v),t(p,()=>u.offerName||l.id,v),t(p,()=>u.offerCode,x),z(()=>p.value=l.id),p})()}})),t(e,i(y,{get when(){return se()},get children(){var l=yt();return l.style.setProperty("margin-top","0.5rem"),l.style.setProperty("font-size","0.75rem"),l.style.setProperty("color","var(--text-muted)"),l}}),null),z(l=>W(o,B,l)),z(()=>o.value=J()||""),e}}),(()=>{var e=mt(),r=e.firstChild,s=r.firstChild,o=s.nextSibling,l=r.nextSibling,u=l.firstChild,b=u.nextSibling;return e.style.setProperty("display","grid"),e.style.setProperty("grid-template-columns","1fr 1fr"),e.style.setProperty("gap","1rem"),e.style.setProperty("margin-bottom","1.5rem"),s.style.setProperty("display","block"),s.style.setProperty("font-weight","600"),s.style.setProperty("margin-bottom","0.5rem"),s.style.setProperty("font-size","0.875rem"),o.addEventListener("change",p=>Ve(p.currentTarget.value)),u.style.setProperty("display","block"),u.style.setProperty("font-weight","600"),u.style.setProperty("margin-bottom","0.5rem"),u.style.setProperty("font-size","0.875rem"),b.addEventListener("change",p=>Ye(p.currentTarget.value)),z(p=>{var v=B,x=B;return p.e=W(o,v,p.e),p.t=W(b,x,p.t),p},{e:void 0,t:void 0}),z(()=>o.value=H()),z(()=>b.value=F()),e})(),i(y,{get when(){return F()!=="box_flat_rate"},get children(){var e=Pt(),r=e.firstChild,s=r.firstChild,o=r.nextSibling,l=o.firstChild,u=l.firstChild,b=u.firstChild,p=b.firstChild,v=p.nextSibling,x=v.nextSibling,A=x.nextSibling,O=u.nextSibling;return e.style.setProperty("background","var(--gray-50)"),e.style.setProperty("border-radius","var(--border-radius-sm)"),e.style.setProperty("padding","1.5rem"),r.style.setProperty("display","flex"),r.style.setProperty("justify-content","space-between"),r.style.setProperty("align-items","center"),r.style.setProperty("margin-bottom","1rem"),s.style.setProperty("font-weight","600"),t(r,i(y,{get when(){return L()},get children(){return i(V,{size:"sm",variant:"primary",onClick:qe,children:"➕ Agregar Rango"})}}),null),o.style.setProperty("overflow-x","auto"),l.style.setProperty("width","100%"),l.style.setProperty("border-collapse","collapse"),l.style.setProperty("background","white"),b.style.setProperty("background-color","var(--gray-100)"),p.style.setProperty("padding","0.75rem"),p.style.setProperty("text-align","left"),p.style.setProperty("font-size","0.875rem"),v.style.setProperty("padding","0.75rem"),v.style.setProperty("text-align","left"),v.style.setProperty("font-size","0.875rem"),x.style.setProperty("padding","0.75rem"),x.style.setProperty("text-align","left"),x.style.setProperty("font-size","0.875rem"),t(b,i(y,{get when(){return F()==="miscellaneous"},get children(){return[(()=>{var n=ft();return n.style.setProperty("padding","0.75rem"),n.style.setProperty("text-align","left"),n.style.setProperty("font-size","0.875rem"),n})(),(()=>{var n=ht();return n.style.setProperty("padding","0.75rem"),n.style.setProperty("text-align","left"),n.style.setProperty("font-size","0.875rem"),n})()]}}),A),t(b,i(y,{get when(){return F()==="durable"},get children(){var n=bt();return n.style.setProperty("padding","0.75rem"),n.style.setProperty("text-align","left"),n.style.setProperty("font-size","0.875rem"),n}}),A),A.style.setProperty("padding","0.75rem"),A.style.setProperty("text-align","left"),A.style.setProperty("font-size","0.875rem"),t(b,i(y,{get when(){return L()},get children(){var n=vt();return n.style.setProperty("padding","0.75rem"),n.style.setProperty("text-align","center"),n.style.setProperty("font-size","0.875rem"),n}}),null),t(O,i(R,{get each(){return He()},children:n=>(()=>{var _=zt(),I=_.firstChild,d=I.nextSibling,h=d.nextSibling,C=h.nextSibling;return _.style.setProperty("border-bottom","1px solid var(--border-color)"),I.style.setProperty("padding","0.75rem"),t(I,i(y,{get when(){return L()},get fallback(){return n.min},get children(){return i(G,{type:"number",get value(){return n.min},onChange:m=>Y(n.id,"min",parseFloat(m)),get style(){return{...B,width:"80px"}},step:"0.1"})}})),d.style.setProperty("padding","0.75rem"),t(d,i(y,{get when(){return L()},get fallback(){return n.max},get children(){return i(G,{type:"number",get value(){return n.max},onChange:m=>Y(n.id,"max",parseFloat(m)),get style(){return{...B,width:"80px"}},step:"0.1"})}})),h.style.setProperty("padding","0.75rem"),t(h,i(y,{get when(){return L()},get fallback(){return`$${n.pricePerLb.toFixed(2)}`},get children(){return i(G,{type:"number",get value(){return n.pricePerLb},onChange:m=>Y(n.id,"pricePerLb",parseFloat(m)),get style(){return{...B,width:"90px"}},step:"0.01"})}})),t(_,i(y,{get when(){return F()==="miscellaneous"},get children(){return[(()=>{var m=xe();return m.style.setProperty("padding","0.75rem"),t(m,i(y,{get when(){return L()},get fallback(){return n.freeWeight||"-"},get children(){return i(G,{type:"number",get value(){return n.freeWeight||0},onChange:$=>Y(n.id,"freeWeight",parseFloat($)||void 0),get style(){return{...B,width:"70px"}},step:"0.1"})}})),m})(),(()=>{var m=xe();return m.style.setProperty("padding","0.75rem"),t(m,i(y,{get when(){return L()},get fallback(){return n.needBePay||"-"},get children(){return i(G,{type:"number",get value(){return n.needBePay||0},onChange:$=>Y(n.id,"needBePay",parseFloat($)||void 0),get style(){return{...B,width:"70px"}},step:"0.1"})}})),m})()]}}),C),t(_,i(y,{get when(){return F()==="durable"},get children(){var m=xe();return m.style.setProperty("padding","0.75rem"),t(m,i(y,{get when(){return L()},get fallback(){return`$${(n.tariffPerLb||0).toFixed(2)}`},get children(){return i(G,{type:"number",get value(){return n.tariffPerLb||0},onChange:$=>Y(n.id,"tariffPerLb",parseFloat($)||0),get style(){return{...B,width:"80px"}},step:"0.01"})}})),m}}),C),C.style.setProperty("padding","0.75rem"),t(C,i(y,{get when(){return L()},get fallback(){return n.description},get children(){return i(G,{type:"text",get value(){return n.description||""},onChange:m=>Y(n.id,"description",m),get style(){return{...B,width:"200px"}}})}})),t(_,i(y,{get when(){return L()},get children(){var m=kt(),$=m.firstChild;return m.style.setProperty("padding","0.75rem"),m.style.setProperty("text-align","center"),$.$$click=()=>Ke(n.id),$.style.setProperty("padding","0.25rem 0.5rem"),$.style.setProperty("background","var(--danger-color)"),$.style.setProperty("color","white"),$.style.setProperty("border","none"),$.style.setProperty("border-radius","var(--border-radius-sm)"),$.style.setProperty("cursor","pointer"),$.style.setProperty("font-size","0.75rem"),m}}),null),_})()})),e}}),i(y,{get when(){return F()==="box_flat_rate"},get children(){var e=$t(),r=e.firstChild,s=r.nextSibling;return e.style.setProperty("background","var(--gray-50)"),e.style.setProperty("border-radius","var(--border-radius-sm)"),e.style.setProperty("padding","1.5rem"),r.style.setProperty("font-weight","600"),r.style.setProperty("margin-bottom","1rem"),s.style.setProperty("display","grid"),s.style.setProperty("gap","1rem"),t(s,i(R,{get each(){return ne()},children:o=>(()=>{var l=Bt(),u=l.firstChild,b=u.firstChild,p=b.firstChild,v=b.nextSibling,x=v.firstChild,A=v.nextSibling,O=A.firstChild,n=A.nextSibling,_=n.firstChild,I=_.nextSibling;return l.style.setProperty("padding","1rem"),l.style.setProperty("background","white"),l.style.setProperty("border-radius","var(--border-radius-sm)"),l.style.setProperty("border","1px solid var(--border-color)"),u.style.setProperty("display","grid"),u.style.setProperty("grid-template-columns","repeat(4, 1fr)"),u.style.setProperty("gap","1rem"),u.style.setProperty("align-items","center"),p.style.setProperty("display","block"),p.style.setProperty("font-size","0.75rem"),p.style.setProperty("margin-bottom","0.25rem"),t(b,i(y,{get when(){return L()},get fallback(){return(()=>{var d=It();return t(d,()=>o.size),d})()},get children(){var d=At();return z(h=>W(d,B,h)),z(()=>d.value=o.size),d}}),null),x.style.setProperty("display","block"),x.style.setProperty("font-size","0.75rem"),x.style.setProperty("margin-bottom","0.25rem"),t(v,i(y,{get when(){return L()},get fallback(){return(()=>{var d=Tt();return d.firstChild,t(d,()=>o.price.toFixed(2),null),d})()},get children(){var d=Lt();return z(h=>W(d,B,h)),z(()=>d.value=o.price),d}}),null),O.style.setProperty("display","block"),O.style.setProperty("font-size","0.75rem"),O.style.setProperty("margin-bottom","0.25rem"),t(A,i(y,{get when(){return L()},get fallback(){return(()=>{var d=Mt(),h=d.firstChild;return t(d,()=>o.maxWeight,h),d})()},get children(){var d=Et();return z(h=>W(d,B,h)),z(()=>d.value=o.maxWeight),d}}),null),_.style.setProperty("display","block"),_.style.setProperty("font-size","0.75rem"),_.style.setProperty("margin-bottom","0.25rem"),I.style.setProperty("font-size","0.875rem"),t(I,()=>o.description),l})()})),e}}),(()=>{var e=_t(),r=e.firstChild,s=r.nextSibling;return e.style.setProperty("margin-top","1.5rem"),e.style.setProperty("padding","1rem"),e.style.setProperty("background","var(--info-light)"),e.style.setProperty("border-radius","var(--border-radius-sm)"),e.style.setProperty("border","1px solid var(--info-color)"),r.style.setProperty("font-weight","600"),r.style.setProperty("margin-bottom","0.5rem"),s.style.setProperty("margin","0"),s.style.setProperty("padding-left","1.5rem"),s.style.setProperty("font-size","0.875rem"),e})()]}}),null),a}}),null),t(c,i(y,{get when(){return Je()},get children(){var a=Ct(),e=a.firstChild,r=e.firstChild,s=r.firstChild,o=s.nextSibling,l=o.firstChild,u=l.firstChild,b=u.nextSibling,p=l.nextSibling,v=p.firstChild,x=v.nextSibling,A=p.nextSibling,O=A.firstChild,n=O.nextSibling,_=r.nextSibling;_.firstChild;var I=_.nextSibling;return I.firstChild,t(b,ie),t(x,Ae),t(n,()=>new Date().toLocaleDateString("es-ES",{year:"numeric",month:"long",day:"numeric"})),t(_,i(y,{get when(){return q().length>0},get children(){var d=Oe(),h=d.firstChild,C=h.nextSibling,m=C.firstChild,$=m.nextSibling;return t($,i(R,{get each(){return q()},children:g=>(()=>{var w=De(),P=w.firstChild,T=P.firstChild,k=P.nextSibling;k.firstChild;var E=k.nextSibling,N=E.nextSibling,Pe=N.nextSibling;return t(P,()=>g.min,T),t(P,()=>g.max,null),t(k,()=>g.pricePerLb.toFixed(2),null),t(E,()=>g.freeWeight||"—"),t(N,()=>g.needBePay||"—"),t(Pe,(()=>{var $e=oe(()=>!!g.effectivePricePerLb);return()=>$e()?`$${g.effectivePricePerLb.toFixed(2)}`:"—"})()),w})()})),d}}),null),t(_,i(y,{get when(){return Q().length>0},get children(){var d=Ne(),h=d.firstChild,C=h.nextSibling,m=C.firstChild,$=m.nextSibling;return t($,i(R,{get each(){return Q()},children:g=>(()=>{var w=je(),P=w.firstChild,T=P.firstChild,k=P.nextSibling;k.firstChild;var E=k.nextSibling;E.firstChild;var N=E.nextSibling;return N.firstChild,t(P,()=>g.min,T),t(P,()=>g.max,null),t(k,()=>g.pricePerLb.toFixed(2),null),t(E,()=>(g.tariffPerLb||0).toFixed(2),null),t(N,()=>(g.pricePerLb+(g.tariffPerLb||0)).toFixed(2),null),w})()})),d}}),null),t(_,i(y,{get when(){return ne().length>0},get children(){var d=xt(),h=d.firstChild,C=h.nextSibling,m=C.firstChild,$=m.nextSibling;return t($,i(R,{get each(){return ne()},children:g=>(()=>{var w=Ft(),P=w.firstChild,T=P.nextSibling,k=T.firstChild,E=T.nextSibling;return E.firstChild,t(P,()=>g.size),t(T,()=>g.maxWeight,k),t(E,()=>g.price.toFixed(2),null),w})()})),d}}),null),t(I,i(y,{get when(){return Z().length>0},get children(){var d=Oe(),h=d.firstChild,C=h.nextSibling,m=C.firstChild,$=m.nextSibling;return t($,i(R,{get each(){return Z()},children:g=>(()=>{var w=De(),P=w.firstChild,T=P.firstChild,k=P.nextSibling;k.firstChild;var E=k.nextSibling,N=E.nextSibling,Pe=N.nextSibling;return t(P,()=>g.min,T),t(P,()=>g.max,null),t(k,()=>g.pricePerLb.toFixed(2),null),t(E,()=>g.freeWeight||"—"),t(N,()=>g.needBePay||"—"),t(Pe,(()=>{var $e=oe(()=>!!g.effectivePricePerLb);return()=>$e()?`$${g.effectivePricePerLb.toFixed(2)}`:"—"})()),w})()})),d}}),null),t(I,i(y,{get when(){return te().length>0},get children(){var d=Ne(),h=d.firstChild,C=h.nextSibling,m=C.firstChild,$=m.nextSibling;return t($,i(R,{get each(){return te()},children:g=>(()=>{var w=je(),P=w.firstChild,T=P.firstChild,k=P.nextSibling;k.firstChild;var E=k.nextSibling;E.firstChild;var N=E.nextSibling;return N.firstChild,t(P,()=>g.min,T),t(P,()=>g.max,null),t(k,()=>g.pricePerLb.toFixed(2),null),t(E,()=>(g.tariffPerLb||0).toFixed(2),null),t(N,()=>(g.pricePerLb+(g.tariffPerLb||0)).toFixed(2),null),w})()})),d}}),null),a}}),null),c})()};We(["input","click"]);const Rt=()=>i(ot,{title:"Ofertas YABA",get children(){return i(Ot,{})}});export{Rt as default};
