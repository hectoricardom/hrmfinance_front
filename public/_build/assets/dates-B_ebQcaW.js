function n(t){if(t==null||t==="")return"";const e=Number(t);return Number.isFinite(e)&&e>1e9?new Date(e>1e12?e:e*1e3).toISOString().slice(0,10):String(t).slice(0,10)}export{n as f};
