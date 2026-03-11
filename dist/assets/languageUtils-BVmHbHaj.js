const a=()=>{const e=localStorage.getItem("userLanguage");return e&&["en","es"].includes(e)?e:(navigator.language.toLowerCase().startsWith("es"),"es")};export{a as getUserLanguage};
