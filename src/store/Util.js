import fetch from 'isomorphic-fetch';
import loadable from '@loadable/component'
import * as common from '../actions/common'


var CryptoJS = window.CryptoJS;

let utlBase=  "https://qvamarkets.com/"
utlBase = "https://hrmfinance.com/"

// utlBase = "http://localhost:8958/"

// netstat -ltnp | grep -w ':4060' 


// export const fsConfig = 'eyJhcGlLZXkiOiJBSXphU3lDeDBFcnFmbENVdXZpRlRqald4SEFITWpvQjBsd2xGX00iLCJhdXRoRG9tYWluIjoiaHJtLTExMjguZmlyZWJhc2VhcHAuY29tIiwiZGF0YWJhc2VVUkwiOiJodHRwczovL2hybS0xMTI4LmZpcmViYXNlaW8uY29tIiwicHJvamVjdElkIjoiaHJtLTExMjgiLCJzdG9yYWdlQnVja2V0IjoiaHJtLTExMjguYXBwc3BvdC5jb20iLCJtZXNzYWdpbmdTZW5kZXJJZCI6IjEwNDkyNTA1ODUyNDUiLCJhcHBJZCI6IjE6MTA0OTI1MDU4NTI0NTp3ZWI6OGI0ZTA3NGI5Yzg4MDA1ZiJ9';





export function getCommon(){
  return common;
}









export function LoadingColorSpinner_Cmpt(){
  let cmp = loadable(() => import('../component/LoadingColorSpinner'))
  return cmp;
}


export function PaymentSlideUp_Cmpt(){
  const PaymentSlideUp = loadable(() => import('../component/paymentSlideUp'))
  return PaymentSlideUp;
}


export function BTNH_Cmpt(){
  const BTNH = loadable(() => import('../component/btns_confirm'))
  return BTNH;
}

export function Icon_Cmpt(){
  const Icon2 = loadable(() => import('../component/Icons'))
  return Icon2;
}


export function DeleteAlertMov_Cmpt(){
  const DeleteAlertMov = loadable(() => import('../component/deleteAlertMov'))
  return DeleteAlertMov;
}

export function SearchInput_Cmpt(){
  const SearchInput = loadable(() => import('../component/SearchInput'));
  return SearchInput;
}

export function InputAutocomplete_Cmpt(){
  const InputAutocomplete = loadable(() => import('../component/InputAutocomplete'));
  return InputAutocomplete;
}

export function ModalDate_Cmpt(){
  const ModalDate = loadable(() => import('../component/ModalDate'));
  return ModalDate;
}

export function CheckBoxSlide_Cmpt(){
  const CheckBoxSlide = loadable(() => import('../component/CheckBoxSlide'));
  return CheckBoxSlide;
}

export function ScrollDc_Cmpt(){
  const ScrollDc = loadable(() => import('../component/scroll-decorator'));
  return ScrollDc;
}


export function InputText_Cmpt(){
  const InputText = loadable(() => import('../component/InputText'));
  return InputText;
}

export function MsgAlert_Cmpt(){
  const MsgAlert = loadable(() => import('../component/MsgAlert'));
  return MsgAlert;
}


export function deleteAlertIngredient_Cmpt(){
  let lC = loadable(() => import('../component/deleteAlertIngredients'));
  return lC;
}

export function StarRating_Cmpt(){
  let lC = loadable(() => import('../component/stars_rating'));
  return lC;
}


export function RecyclerView_Cmpt(){
  let lC = loadable(() => import('../component/ReciclerView'));
  return lC;
}

//import '../component/pages/Movements/MovementItem';



export function MovementItem_Cmpt(){
  let lC = loadable(() => import('../component/pages/Movements/MovementItem'));
  return lC;
}


export function BtnIconTab_Cmpt(){
  let cmp = loadable(() => import('../component/BtnIconTab'))
  return cmp;
}

export function OpacityContainer_Cmpt(){
  let cmp = loadable(() => import('../component/OpacityContainer'))
  return cmp;
}





let arraySerialization = 1;

export function isArraySerialization() {
  return arraySerialization;
}

export function updArraySerialization(v) {
  arraySerialization = v;
}





export function isBoolean(val) {
  return val === false || val === true || val === "false" || val === "true";
}


export function isValidKey(val) {
  return isBoolean(val) || (Array.isArray(val) && val.length>0) || val;
}



export function serialize2Array(obj,fields,isArr){
  let ar = []
  if(isArr){
    obj && Object.keys(obj).map(itmId =>{
      let itm = obj[itmId];
      ar.push(serializeObj(itm,fields));  
    })
  }
  else{
    ar.push(serializeObj(obj,fields));
  }
  return ar;
}



function serializeObj(itm,fields){
  let tmA = [] 
  Array.isArray(fields) && fields.length>0 && fields.map(fld=>{
    if(typeof fld === "object"){
      let tmP = []
      let obdD = itm[fld["N"]];
      if(obdD){
        fld["f"].map(fld2 =>{
          let _v = isValidKey(obdD[fld2]);
          tmP.push(_v?obdD[fld2]:[]);   
        })
      }
      tmA.push(tmP);
    }
    else{
      let _v = isValidKey(itm[fld]);
      tmA.push(_v?itm[fld]:[]);     
    }
  })
  return tmA;
}






export function deZerialize2Array(arr,fields,isL){
  let obj = {}
  arr && Array.isArray(arr) && arr.length>0 && arr.map(itm => {
      let id1 = itm[0];
      if(id1){
        if(!obj[id1]){
          obj[id1] = deSerializeItm(itm,fields);
        }
      }
  })
  return obj;
}



export function deSerializeItm(itm,fields){
  let obj = {};
  fields.map((fld,ii)=>{
    if(typeof fld === "object"){
      let obdD = itm[ii];
      if(obdD && Array.isArray(obdD) && obdD.length>0){
        if(!obj[fld["N"]]){
          obj[fld["N"]] = {}
        }
        fld["f"].map((fld2,ii2) =>{
          if(obdD[ii2] || (obdD[ii2] && Array.isArray(obdD[ii2]) && obdD[ii2].length>0)){
            obj[fld["N"]][fld2] =  obdD[ii2];  
          }
        })
      }
    }
    else{
      if(itm[ii] && Array.isArray(itm[ii])){
        if( itm[ii].length>0){
          obj[fld] = itm[ii];
        }
      }else if(itm[ii]){
        obj[fld] = itm[ii];
      }
    }
  })
  return obj;
}




  /*

if(typeof obdD[fld2] === "object"){

 let tmP3 = []
 let obdD3 = obdD[fld2["N"]];
 console.log("obdD3",obdD3)
 if(obdD3){
   fld2["f"].map(fld3 =>{
     tmP3.push(obdD3[fld3]);
   })
 }

}
else{
 tmP.push(obdD[fld2]);       
}
 */




var fingerprintID = null;



export function initCryptoJS(){
  CryptoJS = window.CryptoJS;
}


export function initFingerprint2(){
  var Fingerprint2 = window.Fingerprint2;
  var options = {};
  Fingerprint2 && Fingerprint2.get(options, function (components) {
    var values = components.map(function (component) { return component.value });
    fingerprintID = Fingerprint2.x64hash128(values.join(''), 31);
    window.localStorage.setItem('fpXb',fingerprintID);
  })
}

export function getfingerprintID(){
  return fingerprintID;
}

export function geturlBase(){
  return utlBase;
}

export function isCustomerVersion(){
  return 1;
}
  

export function imageRxUrl(){
  return utlBase+"getImagesRzx/";
}



let views = {0:"market",8:"dashboard",7:"orders",3:"inventory"}

let viewActive = 0;

export function updViewActive(v){
  viewActive = v;
}


export function getViewActive(){
  return viewActive;
}

let isAd = false;

export function updIsAdmin(v){
  isAd = v;
}


export function IsAdmin(){
  return isAd;
}


export function getUserAgent(){
  return "100423251445483156428";
}


export function getUAd(){
  return "113699695841584167881";
}

export function getProfileId(){
  let _state = getStore();
  return _state["userProfile"] && _state["userProfile"]["id"];
}



var labels = {}



export function routerList(){
  const rtl = [
    //{name:'resume',icon:'graph_sprite',path:'/resume',query:'?tb=2019'},
    {name:'finance',icon:'money',path:'/finance',lbl:214}, 
    {name:'group_list',icon:'receipt',path:'/group_list',lbl:32},
    {name:'carrito',icon:'cart_outline',path:'/shopping_cart',lbl:3,isAdmin:true,isR:true},
    {name:'dashboard',icon:'dashboard',path:'/dashboard',onlyAgent:true,isR:true,lbl:4},
    {name:'inventario',icon:'dolly',path:'/inventory',inventory:true,isR:true,lbl:5},
    {name:'agentes',icon:'supervisor',path:'/agents',isAdmin:true,isR:true,lbl:6},
    {name:'stores',icon:'market',path:'/stores',onlyStore:true,isR:true,lbl:7},
    {name:'users',icon:'supervisor',path:'/users',isAdmin:true,isR:true,lbl:8},
    {name:'receivers',icon:'user_receivers',path:'/receivers',isAdmin:true,isR:true,lbl:9},
    {name:'deliveries',icon:'moped',path:'/deliveries',onlyDrivers:true,isR:true,lbl:104},
    {name:'cerrar sesión',icon:'logout',path:'/logout',lbl:10}
  ]
  return rtl
}



/*


52.0 Tomate Frito (350ml)







const fMP44444 =  x =>  new Promise((resolve, reject) => {


    var xmlhttp = new XMLHttpRequest();
    var bdy = JSON.parse(x);
    let _url = "http://localhost:7070/stream_addVideo?bdy="+bdy;
  

    xmlhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            var myArr = JSON.parse(this.responseText);
            console.log(myArr)
            // myFunction(myArr);
        }
    };
    xmlhttp.open("GET", _url, true);
    xmlhttp.send();

 })

*/


 



 



/*
 function init() {
	let d=[];
  let jsOn = {};
	Object.keys(jsOn).map((_ntId,inD)=>{	
		let _vId = _ntId;
    let _2s = _vId && jsOn[_vId];
    if(1 && _vId && _2s && inD>=15100 && inD<51000){
      _2s["id"] = _vId;
        let Qry = {
          form:_2s,
          fields:[
            "id", 
        ],
        query:"upgradeVideo",
        collection:"Episodes"
      };
		  d.push(Qry);
    }
  })
 
	fetchQueue(d,fMP44444);
}

11762.36 - 10711


21436 - 1051.36

20410
*/
//  init();




 export function initializeClassName(){
  let maskClassName = {};
  let classes = [
    'N3Hzgf','rFrNMe','jjwyfe',
    'u3bW4e','CDELXb','Wic03c',
    'aCsJod','oJeWuf','Xb9hP',
    'aXBtI','whsOnd','zHQkBf',
    'AxOyFc','AxOyFc','snByac',
    'i9lrp','cXrdqd','Y2Zypf',
    'OabDMe', 'mIZh1c',"btn_base",
    "hover_base","blue_white",
    "light_blue","INVALID","fire_brick",
    "focus_active", "ripple_in", "ripple_out"   
  ]

  classes.map(cl=>{
    maskClassName[cl] = `_${gen12CodeId()}_`;
  }) 
  return maskClassName
  
} 

var _isSupportWebp_ = false;

export function isSupportWebp(){
  return _isSupportWebp_;
}




export function initializeKeys(){
  let Kr = {}
  let ks = Array.from(Array(500).keys());
  ks.map(_k=>{
    Kr[_k] = `_${gen12CodeId()}_`;
  })
  return Kr;
}



 var _genres= {
};


var globalsKeys = initializeKeys();

export const getGlobalsKeys =  () => {
  return globalsKeys;
}


let ImgStore = {};
export const updImageStore =  (k,v) => {
  ImgStore[k] = v;
}
export const getImageStore =  () => {
  return ImgStore;
}





const initStore = {};

export const rmvStore =  (k) => {
  delete initStore[k];
}
export const updStore =  (k,v) => {
  initStore[k] = v;
}
export const getStore =  () => {
  return initStore;
}



let eventStore = {};
export const updEventStore =  (k,v) => {
  eventStore[k] = v;
}
export const getEventStore =  () => {
  return eventStore;
}



const formStore = {};

export const updFormStore =  (k,v) => {
  formStore[k] = v;
}

export const getFormStore =  (k) => {
  return formStore[k];
}



const PaymentMethod = {
  // "Card":{"url":"https://firebasestorage.googleapis.com/v0/b/hrm-1128.appspot.com/o/images%2Fcreditcard2.png?alt=media&token=b0789ba5-2924-49c3-b9da-0d0d8af54fc9"},
  "Zelle":{"url":"https://firebasestorage.googleapis.com/v0/b/hrm-1128.appspot.com/o/images%2Fzelle.png?alt=media&token=cad36ac4-2b6e-457f-a8ee-7ca8291bd7d5"},
  "CashApp":{"url":"https://www.lmaic.com/wp-content/uploads/2020/04/cash-app-png-1.png"},
  "GooglePay":{"url":"https://firebasestorage.googleapis.com/v0/b/hrm-1128.appspot.com/o/images%2Fgpay.png?alt=media&token=ebc809ed-25ac-4ce7-826f-a1f177489be2"},
  //"BitCoin":{"url":"https://firebasestorage.googleapis.com/v0/b/hrm-1128.appspot.com/o/images%2Fbitcoin.png?alt=media&token=d1400f5f-aed3-478b-969d-1b658be70e4f"}
}



export const getPaymentMethod =  () => {
  return PaymentMethod;
}




let playerStore = {};
export const updPlayerStore =  (k,v) => {
  playerStore[k] = v;
}

export const getPlayerStore =  () => {
  return playerStore;
}

export const initializeStore =  () => {
  initStore["maskClassName"] = initializeClassName();
  /*
  if(videoList){
    initStore["videoList"] = videoList;
  }
   */
  
}


initializeStore();



export function offset(el) {
  var rect = el.getBoundingClientRect(),
  scrollLeft = window.pageXOffset || document.documentElement.scrollLeft,
  scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  return { top: rect.top + scrollTop, left: rect.left + scrollLeft,width:rect.width,height:rect.height }
}


var _Distpatch;

export function updDistpatch(dispatch) {
  _Distpatch = dispatch;
}



export const  initConfig = async () => {
  let getStaticUrl = utlBase+"getStatic/"; 
  //"https://hrmfinance.com/getStatic/";
  fetchSVGSymbols(getStaticUrl);
  fetchStringSymbols(getStaticUrl);
  return true;
}

//initConfig();


var languageL_L={
}






export function gTm() {
  return (new Date()).getTime();
};


var maskClassName = {}
var maskClassFunction = {}

var _svgSymbols = null;


export function getSvgSymbols() {
  return _svgSymbols;
};



export function getTabs(outerWidth) {
  let tabs = 6;
  if(outerWidth>=1700){
    tabs = 6;
  }
  else if(outerWidth>=1400){
     tabs = 5;
  }
  else if(outerWidth>=900){
     tabs = 4;
  }
  else if(outerWidth>=650){
     tabs = 3;
  }else{
     tabs = 2;
  }
  return tabs;
};



export function getTabs2(outerWidth) {
  let tabs = 6;
  if(outerWidth>=1400){
     tabs = 6;
  }
  else if(outerWidth>=1100){
     tabs = 5;
  }
  else if(outerWidth>=800){
     tabs = 4;
  }
  else if(outerWidth>=500){
     tabs = 3;
  }else{
     tabs = 2;
  }
  return tabs;
};


export function groupByTabs(obj,tabs) {
  let hh = {}
  tabs && obj && ObjectKeys(obj).map((mID,inM)=>{
      let nIn = Math.floor(inM/tabs);
      if(!hh[nIn]){
        hh[nIn]={}
      }
      hh[nIn][mID]=obj[mID]
      
  })
  return hh;
}

export function groupByTabsNm(obj,tabs) {
  let hh = {}
  tabs && obj && ObjectKeys(obj).map((mID,inM)=>{
      let nIn = Math.floor(inM/tabs);     
      if(!hh[nIn]){
        hh[nIn]={}
      }
      hh[nIn][mID]=obj[mID]
      
  })
  return hh;
}






export function getStaticFetch(getStaticUrl,param) {
  const hlsUrl = `${getStaticUrl}${param}`;  
  var xhr = new XMLHttpRequest();    
  xhr.open( "GET",hlsUrl , true );
  xhr.responseType = "json";        
  xhr.onreadystatechange = function() {
    if (xhr.readyState === 4 && xhr.status === 200) { }
  };
  xhr.onload = function( e ) {          
    if (xhr.status === 200) {
      if(this.response){
      }
    }
  };
xhr.send();
};




function fetchSVGSymbols(getStaticUrl) {
  let SymbolsUrl =  `${getStaticUrl}${'svgs.json'}`;
  var xhr = new XMLHttpRequest();    
  xhr.open( "GET",SymbolsUrl , true );
  xhr.responseType = "json";        
  xhr.onreadystatechange = function() {
    if (xhr.readyState === 4 && xhr.status === 200) { }
  };
  xhr.onload = function( e ) {          
    if (xhr.status === 200) { 
      if(this.response){
        _svgSymbols = this.response;        
        
      }
    }
  };
xhr.send();   
};




export function updLang() {
  fetchStringSymbols(utlBase+"getStatic/")
}


function fetchStringSymbols(getStaticUrl) {

  let lng = getLanguageProfile();
  let SymbolsUrl =  `${getStaticUrl}${`StringSymbols_${lng}.json`}`;
  var xhr = new XMLHttpRequest();    
  xhr.open( "GET",SymbolsUrl , true );
  xhr.responseType = "json";        
  xhr.onreadystatechange = function() {
    if (xhr.readyState === 4 && xhr.status === 200) { }
  };
  xhr.onload = function( e ) {          
    if (xhr.status === 200) { 
      if(this.response){
        languageL_L = this.response; 
        labels = this.response; 
        _Distpatch({
          type: 'UPD_KEY_VALUE',
          kv:{key:'observeChanges',value: gen12CodeId()}
        }) 
      }
    }
  };
xhr.send();   
};











export function isJson(s) {
  var r =false;try{JSON.parse(s);r=true; }catch(e){r =false;}return r
}

export function ObjectKeys(p) {    
  var r =[];
   if(p){
      try{
      r= Object.keys(p);       
    }
    catch(e){
        for (var k in p) {
          r.push(k);
        }
    }
  }
  return r
}


export const Base64 = {
  
  
  _keyStr: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",


  encode: function(input) {
      var output = "";
      var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
      var i = 0;

      input = Base64._utf8_encode(input);

      while (i < input.length) {

          chr1 = input.charCodeAt(i++);
          chr2 = input.charCodeAt(i++);
          chr3 = input.charCodeAt(i++);

          enc1 = chr1 >> 2;
          enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
          enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
          enc4 = chr3 & 63;

          if (isNaN(chr2)) {
              enc3 = enc4 = 64;
          } else if (isNaN(chr3)) {
              enc4 = 64;
          }

          output = output + this._keyStr.charAt(enc1) + this._keyStr.charAt(enc2) + this._keyStr.charAt(enc3) + this._keyStr.charAt(enc4);

      }

      return output;
  },


  decode: function(input) {
      var output = "";
      var chr1, chr2, chr3;
      var enc1, enc2, enc3, enc4;
      var i = 0;

      input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");

      while (i < input.length) {

          enc1 = this._keyStr.indexOf(input.charAt(i++));
          enc2 = this._keyStr.indexOf(input.charAt(i++));
          enc3 = this._keyStr.indexOf(input.charAt(i++));
          enc4 = this._keyStr.indexOf(input.charAt(i++));

          chr1 = (enc1 << 2) | (enc2 >> 4);
          chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
          chr3 = ((enc3 & 3) << 6) | enc4;

          output = output + String.fromCharCode(chr1);

          if (enc3 != 64) {
              output = output + String.fromCharCode(chr2);
          }
          if (enc4 != 64) {
              output = output + String.fromCharCode(chr3);
          }

      }

      output = Base64._utf8_decode(output);

      return output;

  },

  _utf8_encode: function(string) {        
      string = string.replace(/\r\n/g, "\n");
      var utftext = "";

      for (var n = 0; n < string.length; n++) {

          var c = string.charCodeAt(n);

          if (c < 128) {
              utftext += String.fromCharCode(c);
          }
          else if ((c > 127) && (c < 2048)) {
              utftext += String.fromCharCode((c >> 6) | 192);
              utftext += String.fromCharCode((c & 63) | 128);
          }
          else {
              utftext += String.fromCharCode((c >> 12) | 224);
              utftext += String.fromCharCode(((c >> 6) & 63) | 128);
              utftext += String.fromCharCode((c & 63) | 128);
          }

      }

      return utftext;
  },

  _utf8_decode: function(utftext) {
      var string = "";
      var i = 0,c1,c2,c3;
      var c = c1 = c2 = 0;

      while (i < utftext.length) {

          c = utftext.charCodeAt(i);

          if (c < 128) {
              string += String.fromCharCode(c);
              i++;
          }
          else if ((c > 191) && (c < 224)) {
              c2 = utftext.charCodeAt(i + 1);
              string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
              i += 2;
          }
          else {
              c2 = utftext.charCodeAt(i + 1);
              c3 = utftext.charCodeAt(i + 2);
              string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
              i += 3;
          }

      }

      return string;
  }

}





export const generateUUID = () => {
  let d = new Date().getTime();
  const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c)=> {
      let r = (d + Math.random()*16)%16 | 0;
      d = Math.floor(d/16);
      return (c=='x' ? r : (r&0x3|0x8)).toString(16);
  });
  return uuid;
};


export function genHex16Id() {
  var ALPHABET = '123456789abcdefghijklmnopqrstuvwxyz';
  var ID_LENGTH = 16;
  var rtn = '';
  for (var i = 0; i < ID_LENGTH; i++) {
      rtn += ALPHABET.charAt(Math.floor(Math.random() * ALPHABET.length));
  }
  return rtn;
}




export function genId() {
  var ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_-';
  var ID_LENGTH = 32;
  var rtn = '';
  for (var i = 0; i < ID_LENGTH; i++) {
      rtn += ALPHABET.charAt(Math.floor(Math.random() * ALPHABET.length));
  }
  return rtn;
}

export function gen6CodeId() {
  var ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  var ID_LENGTH = 6;
  var rtn = '';
  for (var i = 0; i < ID_LENGTH; i++) {
      rtn += ALPHABET.charAt(Math.floor(Math.random() * ALPHABET.length));
  }
  return rtn;
}



export function gen12CodeId() {
  var ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwyxz';
  var ID_LENGTH = 12;
  var rtn = '';
  for (var i = 0; i < ID_LENGTH; i++) {
      rtn += ALPHABET.charAt(Math.floor(Math.random() * ALPHABET.length));
  }
  return rtn;
}

export function gen16CodeId() {
  var ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwyxz';
  var ID_LENGTH = 16;
  var rtn = '';
  for (var i = 0; i < ID_LENGTH; i++) {
      rtn += ALPHABET.charAt(Math.floor(Math.random() * ALPHABET.length));
  }
  return rtn;
}


export function getMaskClassName(){
  return maskClassName ;
} 






export function getClassMask(cmp){
  return maskClassFunction[cmp];
} 





export function convertArray2Obj(arr1,key) {
  key=key?key:'id';
  var obj ={};
  if(arr1.length>0){
      arr1.map(s=>{
          obj[s[key]]=s;
      })
  }else{
      obj = null
  }
 return obj;
}

export function convertArray2ObjGroupby(arr1,key) {
  key=key?key:'id';
   var obj ={};
  if(arr1.length>0){
      arr1.map(s=>{
          if(!obj[s[key]]){
              obj[s[key]]=[];
          }
          obj[s[key]].push(s);
      })
  }else{
      obj = null
  }
 return obj;
}

export function convertObj2Array(obj) {
  var arr = [];
  obj && ObjectKeys(obj).map(o=>{
      arr.push(obj[o]);
  })    
 return arr;
}





export const getClientError = errors => {
  if (!errors) {
    return;
  }
  const error = errors[0].message;
  if (!error || error.indexOf('{"_error"') === -1) {
    return {_error: 'Server query error'};
  }
  return JSON.parse(error);
};



export const prepareGraphQLParams = graphParams => {    
  graphParams.query = graphParams.query.replace(/\s/g, '');
  return JSON.stringify(graphParams);
  
};



export const prepareBodyParams = q => {
  return JSON.stringify(q);
};




let tempTk = `VTJGc2RHVmtYMTg1Q3RUWW56UmtvNkFBbFlMZ1h4WHFFQ25CWExmVlFFUXd6VURpR2wxRUpIUXJWS1RpajlhZA@@`;

function parseCokies(){
  Object.fromEntries(document.cookie.split('; ').map(c => {
    const [ key, ...v ] = c.split('=');
    return [ key, v.join('=') ];
  }));
}


export function check_cookie_name(name){
  var match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  if (match) {
    return match[2];
  }
  else{
    return null;
  }
}


function getAuth(){
  var h = new RegExp('@','g')   
  let k = "hxmTkn"
  var _tkn = window.localStorage.getItem(k)?window.localStorage.getItem(k):tempTk;
  var authToken = _tkn.replace(h,'=');   
  var useCokies = false;
  if(useCokies){
    var _parseCokies = parseCokies();
    if(_parseCokies && _parseCokies[k]){
        authToken =_parseCokies[k].replace(h,'=');
    }
  }
  return authToken
}

  
export const  fetchGraphQL = async (url,graphParams) => {
  const serializedParams = prepareGraphQLParams(graphParams);  
  
  var fp = genFP16bytes();

  var tempK = genId();

  // console.log(graphParams) 
  
  

  var encRypt = generateAESKEY(serializedParams,tempK);  
  var encRyptK = generateAESKEY(tempK, fp)



  var bsParams = JSON.stringify({q:Base64.encode(encRypt),k:Base64.encode(encRyptK)});
 

   var authToken = getAuth();
  //var authToken = window.localStorage.getItem('hrm_auth_token_media');
  var fbtkClnt = window.localStorage.getItem('fbtkClnt');
  const graphQLUrl = `${url}/streamdata`;
  const res = await fetch(graphQLUrl, {
    method: 'post',
    headers: {
      //'Content-Type': 'text/plain',
      'Content-Type': 'application/json',
      'Authorization': `${authToken}:${fp}`,
      'x-fb-tk': `${fbtkClnt}`,        
    },
    body: bsParams
  });  
  const resJSON = await res.json();    
  var _Data = resJSON;     
  if(_Data.status===200){            
    var kb = decryptAESKEY(_Data.k, fp);
    var decdData = decryptAESKEY(_Data.r, kb);
    if(isJson(decdData)){
      _Data = JSON.parse(decdData);
    }
  }  
  const {data, errors} = _Data;
  return {data, error: getClientError(errors)};
};

export const monthsList_Short34 =[`Jan`,`Feb`,`Mar`,`Apr`,`May`,`Jun`,`Jul`,`Aug`,`Sep`,`Oct`,`Nov`,`Dec`];



export const monthsList_Short =[``,`Jan`,`Feb`,`Mar`,`Apr`,`May`,`Jun`,`Jul`,`Aug`,`Sep`,`Oct`,`Nov`,`Dec`];


export const _dayShortNames = {"en":['S','M','T','W','T','F','S'],"es":['D','L','M','M','J','V','S']}
export const _monthNames = {"en":['','January','February','March','April','May','June','July','August','September','October','November','December'],"es":['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']}
export const _dayLargeNames = {"en":["Sunday","Monday","Tuesday","Wednesday","Thrusday","Friday", "Saturday"],"es":["Domingo","Lunes","Martes","Miercoles","Jueves","Viernes", "Sabado"]} ;






var hrs2Add = 0;
  
  
export function date2pretyfy(dt) {
  var date = dt?!isNaN(dt)?new Date(parseInt(dt.toString())):new Date():new Date();   
  return `${monthsList_Short[date.getMonth()+1]} ${date.getDate()}, ${date.getFullYear()}`;  
}

  
export function time2pretyfy(dt,ss) {
    var date = dt?!isNaN(dt)?new Date(parseInt(dt.toString())):new Date():new Date();
    date.setHours(date.getHours()+hrs2Add);
    var MM = date.getMinutes();
    var sec = date.getSeconds();
    var SS = ss?`:${sec>9?sec:`0${sec}`}`:'';
    return `${date.getHours()}:${MM>9?MM:`0${MM}`}${SS}`;
 }






 export  function isURL(str) {
  var urlRegex = '^(?!mailto:)(?:(?:http|https|ftp)://)(?:\\S+(?::\\S*)?@)?(?:(?:(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}(?:\\.(?:[0-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))|(?:(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)(?:\\.(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)*(?:\\.(?:[a-z\\u00a1-\\uffff]{2,})))|localhost)(?::\\d{2,5})?(?:(/|\\?|#)[^\\s]*)?$';
  var url = new RegExp(urlRegex, 'i');
  return str.length < 2083 && url.test(str);
}







export function getLanguageProfile(){
  var userLang = navigator.language || navigator.userLanguage; 
  var lngLcSt = (window && window.localStorage.getItem('language_profile')) || userLang || 'en';
  var lng = lngLcSt.indexOf("es")>=0?"es":"en";
  return lng
}  





export function getUserLanguage(){
  var userLang = navigator.language || navigator.userLanguage; 
  var lngLcSt = (window && window.localStorage.getItem('lng')) || userLang || 'en';
  var lng = lngLcSt.indexOf("es")>=0?"es":"en";
  return lng
}  

export function translatetext(s){   
  let r = s;    
  // let lng = getUserLanguage();
  if(labels[s]){
    r = labels[s];
  }  
  return r;
}




const languageL_TXT={
}


export function translateTxt(s){   
  var r = s;    
  let lng = getUserLanguage();
  if(languageL_TXT[s]){
    r = languageL_TXT[s][lng];
  }  
  return r;
}





export const DecryptAES = (text,key) => {    
    var bytes = CryptoJS.AES.decrypt(text, key);
    var basD = bytes.toString(CryptoJS.enc.Utf8);    
    return basD;
};



var visaRegEx = /^(?:9[0-9]{12}(?:[0-9]{3})?)$/;
var mastercardRegEx = /^(?:5[1-5][0-9]{14})$/;
var amexpRegEx = /^(?:3[47][0-9]{13})$/;
var discovRegEx = /^(?:6(?:011|5[0-9][0-9])[0-9]{12})$/; 


  
  
export  var validations = function(validate,data){
  var rs = {valid:true,msg:''};
  if(!data){
      rs =  {valid:false,msg:'missing data'};
  }
  ObjectKeys(validate).map(fld=>{
      if(fld && data){          
          if(data[fld]===undefined){ rs = {fld:fld, valid:false, msg:`not field data`}; }
          else if(data[fld]===null){ rs = {fld:fld, valid:false, msg:`not field data`}; }
          else{
              var _value =data[fld].toString();
              ObjectKeys(validate[fld]).map(vld=>{
                  if(vld==='minLength'){
                      if(_value.toString().length<validate[fld][vld]){
                          rs={fld:fld, valid:false,msg:`Minimum ${validate[fld][vld]} characters required`};
                      }        
                  }
                  if(vld==='maxLength'){
                      if(_value.toString().length>validate[fld][vld]){
                          rs = {fld:fld, valid:false,msg:`Maximum characters are ${validate[fld][vld]}`};
                      }        
                  }
                  if(vld==='number' && validate[fld][vld]){
                      let _v = !isNaN(_value)?true:false;
                      if(!_v){
                          rs = {fld:fld, valid:_v,msg:'number invalid'};      
                      }
                  }
                  if(vld==='minValue'){
                      if(_value<validate[fld][vld]){
                          rs = {fld:fld, valid:false,msg:'value is less than the required'};
                      }        
                  }
                  if(vld==='maxValue'){
                      if(_value>validate[fld][vld]){
                          rs = {fld:fld, valid:false,msg:'value is grather than the required'};
                      }        
                  }
                  if(vld==='date' && validate[fld][vld]){
                      let _v = !isNaN(_value)?(new Date(parseInt(_value.toString()))).getTime()?true:false:false; 
                      if(!_v){
                          rs = {fld:fld, valid:_v,msg:'date invalid'};       
                      }  
                  }
                  if(vld==='phone' && validate[fld][vld]){
                      let _v = /^[\dX]{3}-?[\dX]{3}-?[\dX]{4}$/.test(_value);  
                      if(!_v){
                          rs = {fld:fld, valid:_v,msg:'phone invalid'};       
                      }   
                  } 
                  if(vld==='cubaphone' && validate[fld][vld]){
                    let _v = /^(?:535[0-9]{7})$/.test(_value);  
                    if(!_v){
                        rs = {fld:fld, valid:_v,msg:'phone invalid'};       
                    }   
                  } 
                  if(vld==='ssn' && validate[fld][vld]){
                      let _v = /^[\dX]{3}-?[\dX]{2}-?[\dX]{4}$/.test(_value); 
                      if(!_v){
                          rs = {fld:fld, valid:_v,msg:'ssn invalid'};        
                      }  
                  }
                  if(vld==='ip' && validate[fld][vld]){
                    let _v = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(_value); 
                    if(!_v){
                        rs = {fld:fld, valid:_v,msg:'invalid IP address'};        
                    }  
                }
                  if(vld==='email' && validate[fld][vld]){
                      let _v = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(_value);
                      if(!_v){
                          rs = {fld:fld, valid:_v,msg:'email invalid'};   
                      }    
                  } 
                  if(vld==='card' && validate[fld][vld]){
                    let _v =visaRegEx.test(_value);
                    if(!_v){
                        rs = {fld:fld, valid:_v,msg:'card invalid'};   
                    }    
                  }

                  if(vld==='required' && !_value){            
                      rs = {fld:fld, valid:false,msg:`value required ${fld}`};     
                  } 
              })             
          }
      }
  })
  return rs;
}



export function ValidateIPaddress(ipaddress) {
  if (/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ipaddress))
    {
      return (true)
    }
  // alert("You have entered an invalid IP address!")
  return (false)
}

  
export const parseQuery =(url) =>{
  var urlParams = new URLSearchParams(url);
  var  obj = {};
  var entries = urlParams.entries();
  for(var pair of entries) { 
      obj[pair[0]]= pair[1]; 
  }    
  return obj
} 






var maskClassName = {}
var maskClassFunction = {}











  








export const fetchPostUrl = async v => {
    var authToken = getSectionId();
    var fp = window.localStorage.getItem('fpXb'); 
    const res = await fetch(v, {
      method: 'post',
      headers: {
        //'Content-Type': 'text/plain',
        'Content-Type': 'application/json',
        'Authorization': `${authToken}:${fp}`,
      },
      body:``     
    });
    const resJSON = await res.json();    
    return resJSON;
};
  



export function genNumber() {
    var ALPHABET = '0123456789';
    var ID_LENGTH = 2;
    var rtn = '';
    for (var i = 0; i < ID_LENGTH; i++) {
        rtn += ALPHABET.charAt(Math.floor(Math.random() * ALPHABET.length));
    }
    return rtn;
  }


  var FPHEX = {}



  export function genFP16bytes(tr) {    
    var fp = window.localStorage.getItem('fpXb');
    // console
    if(!fp){
      let fid = genHex16Id();
      window.localStorage.setItem('fpXb',fid);
    }
    if(tr){
      return fp;
    }
    else if(FPHEX[fp]){
      return FPHEX[fp];
    }else{
      let id = genHex16Id();
      FPHEX[fp] = id
      return id;
    }  
  }

  


export const get_GRAPHQLURL = () =>{
  return utlBase;
} 






export const  fetchFtp = async (url,graphParams) => {
 
  const serializedParams = JSON.stringify(graphParams); 
  
  
  var fp = genFP16bytes();

  var tempK = genId();

  // console.log(graphParams)

  var encRypt = generateAESKEY(serializedParams,tempK);  
  var encRyptK = generateAESKEY(tempK, fp)


  var bsParams = JSON.stringify({q:Base64.encode(encRypt),k:Base64.encode(encRyptK)});
 

  var authToken = getAuth();
  //var authToken = window.localStorage.getItem('hrm_auth_token_media');
  //var fbtkClnt = window.localStorage.getItem('fbtkClnt');
  const graphQLUrl = `${url}/streamftp`;
  const res = await fetch(graphQLUrl, {
    method: 'post',
    headers: {
      //'Content-Type': 'text/plain',
      'Content-Type': 'application/json',
      'Authorization': `${authToken}:${fp}`,            
    },
    body: bsParams
  });
    let resJSON = await res.json();    
    var _Data = resJSON;     
    if(_Data.status===200){            
      var kb = decryptAESKEY(_Data.k, fp);
      var decdData = decryptAESKEY(_Data.r, kb);
      if(isJson(decdData)){
        _Data = JSON.parse(decdData);
      }
    }   
    return _Data;
};







export function Base64Decode(str) {
  if (!(/^[a-z0-9+/]+={0,2}$/i.test(str)) || str.length%4 != 0) throw Error('Not base64 string');

  var b64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  var o1, o2, o3, h1, h2, h3, h4, bits, d=[];

  for (var c=0; c<str.length; c+=4) {  // unpack four hexets into three octets
      h1 = b64.indexOf(str.charAt(c));
      h2 = b64.indexOf(str.charAt(c+1));
      h3 = b64.indexOf(str.charAt(c+2));
      h4 = b64.indexOf(str.charAt(c+3));

      bits = h1<<18 | h2<<12 | h3<<6 | h4;

      o1 = bits>>>16 & 0xff;
      o2 = bits>>>8 & 0xff;
      o3 = bits & 0xff;

      d[c/4] = String.fromCharCode(o1, o2, o3);
      // check for padding
      if (h4 == 0x40) d[c/4] = String.fromCharCode(o1, o2);
      if (h3 == 0x40) d[c/4] = String.fromCharCode(o1);
  }
  str = d.join('');  // use Array.join() for better performance than repeated string appends

  return str;
}








export function Base64Encode(str) {
  if (/([^\u0000-\u00ff])/.test(str)) throw Error('String must be ASCII');

  var b64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  var o1, o2, o3, bits, h1, h2, h3, h4, e=[], pad = '', c;

  c = str.length % 3;  // pad string to length of multiple of 3
  if (c > 0) { while (c++ < 3) { pad += '='; str += '\0'; } }
  // note: doing padding here saves us doing special-case packing for trailing 1 or 2 chars

  for (c=0; c<str.length; c+=3) {  // pack three octets into four hexets
      o1 = str.charCodeAt(c);
      o2 = str.charCodeAt(c+1);
      o3 = str.charCodeAt(c+2);

      bits = o1<<16 | o2<<8 | o3;

      h1 = bits>>18 & 0x3f;
      h2 = bits>>12 & 0x3f;
      h3 = bits>>6 & 0x3f;
      h4 = bits & 0x3f;

      // use hextets to index into code string
      e[c/3] = b64.charAt(h1) + b64.charAt(h2) + b64.charAt(h3) + b64.charAt(h4);
  }
  str = e.join('');  // use Array.join() for better performance than repeated string appends

  // replace 'A's from padded nulls with '='s
  str = str.slice(0, str.length-pad.length) + pad;

  return str;
}




export async function supportsWebp() {
  if (!window.createImageBitmap) return false;  
  const webpData = 'data:image/webp;base64,UklGRh4AAABXRUJQVlA4TBEAAAAvAAAAAAfQ//73v/+BiOh/AAA=';
  const blob = await fetch(webpData).then(r => r.blob());
  return createImageBitmap(blob).then(() => true, () => false);
}

export async function SupportWebp(){
  if(await supportsWebp()) {
    _isSupportWebp_ = true;
    updStore("isWebp",true)
    return _isSupportWebp_;
  }
  else {
      _isSupportWebp_ = false;
      updStore("isWebp",false)
      return _isSupportWebp_;
  }
};

SupportWebp();


/*

export async function supportsSVG() {
  if (!window.createImageBitmap) return false;
  
  const webpData = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgd2lkdGg9IjI0Ij48cGF0aCBkPSJNMCAwaDI0djI0SDBWMHoiIGZpbGw9Im5vbmUiLz4NCg0KDQoNCg0KDQoNCjxwYXRoIGQ9Ik0xMiAyQzYuNDggMiAyIDYuNDggMiAxMnM0LjQ4IDEwIDEwIDEwIDEwLTQuNDggMTAtMTBTMTcuNTIgMiAxMiAyek03LjA3IDE4LjI4Yy40My0uOSAzLjA1LTEuNzggNC45My0xLjc4czQuNTEuODggNC45MyAxLjc4QzE1LjU3IDE5LjM2IDEzLjg2IDIwIDEyIDIwcy0zLjU3LS42NC00LjkzLTEuNzJ6bTExLjI5LTEuNDVjLTEuNDMtMS43NC00LjktMi4zMy02LjM2LTIuMzNzLTQuOTMuNTktNi4zNiAyLjMzQzQuNjIgMTUuNDkgNCAxMy44MiA0IDEyYzAtNC40MSAzLjU5LTggOC04czggMy41OSA4IDhjMCAxLjgyLS42MiAzLjQ5LTEuNjQgNC44M3pNMTIgNmMtMS45NCAwLTMuNSAxLjU2LTMuNSAzLjVTMTAuMDYgMTMgMTIgMTNzMy41LTEuNTYgMy41LTMuNVMxMy45NCA2IDEyIDZ6bTAgNWMtLjgzIDAtMS41LS42Ny0xLjUtMS41UzExLjE3IDggMTIgOHMxLjUuNjcgMS41IDEuNVMxMi44MyAxMSAxMiAxMXoiLz4NCg0KDQoNCg0KDQo8L3N2Zz4=';
  const blob = await fetch(webpData).then(r => r.blob());  
  return createImageBitmap(blob).then(() => true, () => false);
}

export async function isSVGSupported(){
  if(await supportsSVG()) {
    return true
  }
  else {
      return false
  }
};

*/
















export function getBrowser(usera) {
  var useragent = usera || navigator.userAgent;
  var os = false;
  var browser = false;
  var icon = '';
  var name = '';
  var verTag = '';
  var nameTrans = '';
  var current = false;
  var brand = false;
  var details = {};

  if (Object(useragent).details !== undefined) {
      return useragent.details;
  }
  useragent = (' ' + useragent).toLowerCase();

  
  if (useragent.indexOf('windows phone') > 0) {
      icon = 'wp.png';
      os = 'Windows Phone';
  }
  else if (useragent.indexOf('android') > 0) {
      os = 'Android';
  }
  else if (useragent.indexOf('windows') > 0) {
      os = 'Windows';
  }
  else if (useragent.indexOf('iphone') > 0) {
      os = 'iPhone';
  }
  else if (useragent.indexOf('imega') > 0) {
      os = 'iPhone';
  }
  else if (useragent.indexOf('ipad') > 0) {
      os = 'iPad';
  }
  else if (useragent.indexOf('mac') > 0
      || useragent.indexOf('darwin') > 0) {
      os = 'Apple';
  }
  else if (useragent.indexOf('linux') > 0) {
      os = 'Linux';
  }
  else if (useragent.indexOf('blackberry') > 0) {
      os = 'Blackberry';
  }

  if (useragent.indexOf(' edge/') > 0) {
      browser = 'Edge';
  }
  else if (useragent.indexOf('iemobile/') > 0) {
      icon = 'ie.png';
      brand = 'IEMobile';
      browser = 'Internet Explorer';
  }
  else if (useragent.indexOf('opera') > 0 || useragent.indexOf(' opr/') > 0) {
      browser = 'Opera';
  }
  else if (useragent.indexOf(' dragon/') > 0) {
      icon = 'dragon.png';
      browser = 'Comodo Dragon';
  }
  else if (useragent.indexOf('vivaldi') > 0) {
      browser = 'Vivaldi';
  }
  else if (useragent.indexOf('maxthon') > 0) {
      browser = 'Maxthon';
  }
  else if (useragent.indexOf('electron') > 0) {
      browser = 'Electron';
  }
  else if (useragent.indexOf('palemoon') > 0) {
      browser = 'Palemoon';
  }
  else if (useragent.indexOf('cyberfox') > 0) {
      browser = 'Cyberfox';
  }
  else if (useragent.indexOf('waterfox') > 0) {
      browser = 'Waterfox';
  }
  else if (useragent.indexOf('iceweasel') > 0) {
      browser = 'Iceweasel';
  }
  else if (useragent.indexOf('seamonkey') > 0) {
      browser = 'SeaMonkey';
  }
  else if (useragent.indexOf('lunascape') > 0) {
      browser = 'Lunascape';
  }
  else if (useragent.indexOf(' iron/') > 0) {
      browser = 'Iron';
  }
  else if (useragent.indexOf('avant browser') > 0) {
      browser = 'Avant';
  }
  else if (useragent.indexOf('polarity') > 0) {
      browser = 'Polarity';
  }
  else if (useragent.indexOf('k-meleon') > 0) {
      browser = 'K-Meleon';
  }
  else if (useragent.indexOf(' crios') > 0) {
      browser = 'Chrome';
      details.brand = verTag = 'CriOS';
  }
  else if (useragent.indexOf('chrome') > 0) {
      browser = 'Chrome';
  }
  else if (useragent.indexOf('safari') > 0) {
      verTag = 'Version';
      browser = 'Safari';
  }
  else if (useragent.indexOf('firefox') > 0) {
      browser = 'Firefox';
  }
  else if (useragent.indexOf(' otter/') > 0) {
      browser = 'Otter';
  }
  else if (useragent.indexOf('thunderbird') > 0) {
      browser = 'Thunderbird';
  }
  else if (useragent.indexOf('es plugin ') === 1) {
      icon = 'esplugin.png';
      browser = 'ES File Explorer';
  }
  else if (useragent.indexOf('megasync') > 0) {
      browser = 'MEGAsync';
  }
  else if (useragent.indexOf('msie') > 0
      || useragent.indexOf('trident') > 0) {
      browser = 'Internet Explorer';
  }

  // Translate "%1 on %2" to "Chrome on Windows"
  if ((os) && (browser)) {
      name = (brand || browser) + ' on ' + os;
      //nameTrans = String(l && l[7684]).replace('%1', brand || browser).replace('%2', os);
  }
  else if (os) {
      name = os;
      icon = icon || (os.toLowerCase() + '.png');
  }
  else if (browser) {
      name = browser;
  }
  else {
      name = 'Unknown';
      icon = 'unknown.png';
  }
  if (!icon && browser) {
      if (browser === 'Internet Explorer' || browser === 'Edge') {
          icon = 'ie.png';
      }
      else {
          icon = browser.toLowerCase() + '.png';
      }
  }

  details.name = name;
  details.nameTrans = nameTrans || name;
  details.icon = icon;
  details.os = os || '';
  details.browser = browser;
  details.version =
      (useragent.match(RegExp("\\s+" + (verTag || brand || browser) + "/([\\d.]+)", 'i')) || [])[1] || 0;

  // Determine if the OS is 64bit
  details.is64bit = /\b(WOW64|x86_64|Win64|intel mac os x 10.(9|\d{2,}))/i.test(useragent);

  // Determine if using a browser extension
  details.isExtension = (current  || useragent.indexOf('megext') > -1);

  if (useragent.indexOf(' MEGAext/') !== -1) {
      var ver = useragent.match(/ MEGAext\/([\d.]+)/);

      details.isExtension = ver && ver[1] || true;
  }

  if (brand) {
      details.brand = brand;
  }

  // Determine core engine.
  if (useragent.indexOf('webkit') > 0) {
      details.engine = 'Webkit';
  }
  else if (useragent.indexOf('trident') > 0) {
      details.engine = 'Trident';
  }
  else if (useragent.indexOf('gecko') > 0) {
      details.engine = 'Gecko';
  }
  else {
      details.engine = 'Unknown';
  }

  // Product info to quickly access relevant info.
  details.prod = details.name + ' [' + details.engine + ']'
      + (details.brand ? '[' + details.brand + ']' : '')
      + '[' + details.version + ']'
      + (details.isExtension ? '[E:' + details.isExtension + ']' : '')
      + '[' + (details.is64bit ? 'x64' : 'x32') + ']';
      
  return details;
}









var AesUtil = function(keySize, iterationCount) {
  this.keySize = keySize / 32;
  //this.keySize = keySize ;
  this.iterationCount = iterationCount;
};

AesUtil.prototype.generateKey = function(salt, passPhrase) {
  var key = CryptoJS.PBKDF2(
      passPhrase, 
      CryptoJS.enc.Hex.parse(salt),
      { keySize: this.keySize, iterations: this.iterationCount });
  return key;
}

AesUtil.prototype.encrypt = function(salt, iv, passPhrase, plainText) {
  var key = this.generateKey(salt, passPhrase);
  var encrypted = CryptoJS.AES.encrypt(
      plainText,
      key,
      { iv: CryptoJS.enc.Hex.parse(iv) });
  return encrypted.ciphertext.toString(CryptoJS.enc.Base64);
}

AesUtil.prototype.decrypt = function(salt, iv, passPhrase, cipherText) {
  var key = this.generateKey(salt, passPhrase); 
  var cipherParams = CryptoJS.lib.CipherParams.create({
    ciphertext: CryptoJS.enc.Base64.parse(cipherText)
  });
  var decrypted = CryptoJS.AES.decrypt(
      cipherParams,
      key,
      { iv: CryptoJS.enc.Hex.parse(iv) });
   
  return decrypted.toString(CryptoJS.enc.Utf8);
}



const sizeKey = 128;



export const  generateAESKEY = (d,k) => {

  var iv = CryptoJS.lib.WordArray.random(sizeKey/8).toString(CryptoJS.enc.Hex);
  var salt = CryptoJS.lib.WordArray.random(sizeKey/8).toString(CryptoJS.enc.Hex);
  var aesUtil = new AesUtil(sizeKey, 1000);
  var ciphertext = aesUtil.encrypt(salt, iv,k,d);
  var aesText = (iv + "::" + salt + "::" + ciphertext);  
  var aesB64 = btoa(aesText);

  return aesB64;
}



export const  decryptAESKEY = (d,k) => {
  let decryptedPassword =  atob(d);
  //console.log({decryptedPassword})
  var aesUtil = new AesUtil(sizeKey, 1000);
  //salt, iv, passPhrase, cipherText
  let  result =  aesUtil.decrypt(decryptedPassword.split("::")[1], decryptedPassword.split("::")[0], k, decryptedPassword.split("::")[2]); 
  return result;
}


/*
let decrr =  decryptAESKEY("YTk4ODdjOTQ0Mjg4ZmU0NGZjYjYyMDFmYWI0YjdkZDA6OjcxODIyNTI5MWRjNWVkZGFiZmIzNzVmYjYxODJlOWIzOjpQeWhVWWhzblFTRTlsY3lQZDhIdG42b3o4YTJzNnZlVFI1K3V3M3pJVmZrQVBGQ0ZNbklwQnlCWCs4U0dtc2dINzd0THM5TTNwQTMrCnpRMzBlOG50NHVBR2xNbXRPY1lhN3UreDNCRlFHQUxNR3VGckpKdm1PUVBYV2d0Z3NyajZyMm1SeEdLQTg0VHdlN1h5ZUFUQytMbk8KMGE4aE5wSjFRcTFzdnNxNVpTN282Skg4MU4weFc2bWRxU1VYa24yNnE3MmxZSTMrLzFQbVZZdUtnbTlFQXc9PQo=","Yu5LbzNpTOtPUT8e");
console.log({decrr})

*/


export const getGenres =  () => {
  return _genres;
}



export const fileData = (Data) => {
  let data = Data;
  let store = getStore();
  let _ftpPath = store["ftpPath"] || "";
  let fld = _ftpPath.split('@@');   
  data && fld.map(_fl=>{
    if(_fl && data[_fl]){
      data = data[_fl]
    }
  })  
  return data;
}




const  decryptAESKEY333 = (f) => {
  var aesUtil = new AesUtil(256, 1000);
   //salt, iv, passPhrase, cipherText
  let  result =  aesUtil.decrypt(f.keyid, f.iv, f.signature, f.ciphertext); 
  return result;
}





/*

let yyg =  {
  "ciphertext":"x+U25hYqBBhxiqebLGVV1VPRKyN55RXbDLLD4KUVmvnOOlAAgKBXlOfZEw5o1JLHkw9ZINYF8Db+1AQMnfFxeJWef9BIXTvRrsllhKxDNALZxhhkAm220GwGlDpn03elab0nYirQEySk/iMklUxXoqV6S4p3BvulMaRUTsz6aRz514n8flN1ggQyaK6EaS1cBmSvC9PmVKA0xPWYPbuWU7hvdCQ5vPxxYWQ1Tg/ll3ky4xkbelNnaol4DXtkgiyx/ftgS7uglwkuDhLT1inowSF9af3i0FY0q1q03YEKJN/YqdT2FWm3TZLzJQCuN8v9ToHD8OZx4TFwE/81R++j8D7W7INnwAPxOeHU/9vw96Ij6Xl7qFwxRAkSv27YDfhdvJ7yVnAk8qH0n2iDhQAy2nFtAQWTL3SCbmwR+4K/Aj8Fjsu78hvk0sU7Esh1PbDEYX/v1AlNwgsNUGeR5YtBQiPXaML2YotL+T5TddREFLBdP81FugvZWjg393rgYr1dJoqf6qXX3DorrIamHhda9ZQNlkZUToFtKIAtlrlQYzGOSpu4ZQrxVRRUkGMGtqUS34xru6GAsdBG8HCFmVpNtkZwc9eXBLVWkVO1QYmadaGqrOElGmuRvSEPJHhys3V97qWN4rSww8sCDsfy7E2E4CHD78a4/zyLjBxnn8HIuTBDcE9Vm68gIWlOjuJEUzjwTlNg0MavEb7cObjPT3MKshEvJxv6kN2MnqN+dOQS5fyDd/Vmgml09y484F8aGrIRaH/z3NUPO6Hq76+W4RaAbhTb5EXuyEzw1vqWva5I3XdtO4kwqYbBrkluwdH4xTBSCt3tjXYJf7gPv+4fkLnxBS8BxnX6ZIKTRO9xCD7b7qq7pxLqtoKAA+xEkir50Lmcgx/ZlJOiOgzmMfjVg4TEOXq60doVa/cRIJzAMAhydMw0zCamSyFzGcau91xdCjxzv4Ba6WdAYozwhDAPuWd5SEOfl1Pe1BdriuSWphhmPA0xYuNDRxeD4t8vpIK97kAJczVcqUHr5I+azcJXbEI4YsuBiEvH9YiHc+7+wP2a1gnRwfp4WOkFPkpSntR5643D/PpwWxBFxst95hFumaNNXU+ObYAs2lvzvcovLydVkRSRWU7TifbgtpaOjrZBZQ7g9l5jQy3dxmXnmrA2Dtfg8/OR0VByhhLVtb72XgM+8DY3e6f5omGyfWK42Rg6S/cbHALE43k6oHlSNKK2d33Sv2GTTxycoNKZpsatiAjvqMvmbQHjQx+MlwU9Ruc2G9uhJBSAoDKr/WQZERs02ki+vg==",
  "sha256":"AA==",
  "keyid":"NFCDCH-02-F2EXU8392JWU1LK7EJQTHYMK873HUX_183",
  "iv":"Ofj0A9h5SEi2fyc96nKEHA=="
}

let yyg3 = {
  "ciphertext":"HLhj2RBa1H99LQXJ3kcYMtB7xVQdeGyMmq6csu6LmqBq5iebzE2QCaf/X0GKemIzWRu970oIrHvNYZlHxa+cQY8X8jA8c9FS7AgimE0nbd5CO7gntUpm4w/YTogyS2PQ0WoXGvHev1NW0ElTX+LT2QOWngFqnTE/NbSzcVo2O8Z0wki2QU3x+CeJfRQWDLr07dmZAiksZjWj6b4POQxlIYmLFIHWSdtMuGkmvTJbdrgy8cbP69RnI+DEZ34OX9VQZhTtpcH9Zpd4mOr0vIcQmsAbqpswiNVtnnnq/pFzYgI=",
  "sha256":"AA==",
  "keyid":"NFCDCH-02-F2EXU8392JWU1LK7EJQTHYMK873HUX_183",
  "iv":"1BpwnWP3itmBZv3Zhl8g8Q==",
  "signature":"/TLnxl4cJ7ALbhLO+U0wauwU0UvT9pYSJFdZoDvl84s="
}




decryptAESKEY333(yyg3);

let ffff  = {
  "headerdata":"eyJjaXBoZXJ0ZXh0IjoieCtVMjVoWXFCQmh4aXFlYkxHVlYxVlBSS3lONTVSWGJETExENEtVVm12bk9PbEFBZ0tCWGxPZlpFdzVvMUpMSGt3OVpJTllGOERiKzFBUU1uZkZ4ZUpXZWY5QklYVHZScnNsbGhLeEROQUxaeGhoa0FtMjIwR3dHbERwbjAzZWxhYjBuWWlyUUV5U2svaU1rbFV4WG9xVjZTNHAzQnZ1bE1hUlVUc3o2YVJ6NTE0bjhmbE4xZ2dReWFLNkVhUzFjQm1TdkM5UG1WS0EweFBXWVBidVdVN2h2ZENRNXZQeHhZV1ExVGcvbGwza3k0eGtiZWxObmFvbDREWHRrZ2l5eC9mdGdTN3VnbHdrdURoTFQxaW5vd1NGOWFmM2kwRlkwcTFxMDNZRUtKTi9ZcWRUMkZXbTNUWkx6SlFDdU44djlUb0hEOE9aeDRURndFLzgxUisrajhEN1c3SU5ud0FQeE9lSFUvOXZ3OTZJajZYbDdxRnd4UkFrU3YyN1lEZmhkdko3eVZuQWs4cUgwbjJpRGhRQXkybkZ0QVFXVEwzU0NibXdSKzRLL0FqOEZqc3U3OGh2azBzVTdFc2gxUGJERVlYL3YxQWxOd2dzTlVHZVI1WXRCUWlQWGFNTDJZb3RMK1Q1VGRkUkVGTEJkUDgxRnVndlpXamczOTNyZ1lyMWRKb3FmNnFYWDNEb3JySWFtSGhkYTlaUU5sa1pVVG9GdEtJQXRscmxRWXpHT1NwdTRaUXJ4VlJSVWtHTUd0cVVTMzR4cnU2R0FzZEJHOEhDRm1WcE50a1p3YzllWEJMVldrVk8xUVltYWRhR3FyT0VsR211UnZTRVBKSGh5czNWOTdxV040clN3dzhzQ0RzZnk3RTJFNENIRDc4YTQvenlMakJ4bm44SEl1VEJEY0U5Vm02OGdJV2xPanVKRVV6andUbE5nME1hdkViN2NPYmpQVDNNS3NoRXZKeHY2a04yTW5xTitkT1FTNWZ5RGQvVm1nbWwwOXk0ODRGOGFHcklSYUgvejNOVVBPNkhxNzYrVzRSYUFiaFRiNUVYdXlFencxdnFXdmE1STNYZHRPNGt3cVliQnJrbHV3ZEg0eFRCU0N0M3RqWFlKZjdnUHYrNGZrTG54QlM4QnhuWDZaSUtUUk85eENEN2I3cXE3cHhMcXRvS0FBK3hFa2lyNTBMbWNneC9abEpPaU9nem1NZmpWZzRURU9YcTYwZG9WYS9jUklKekFNQWh5ZE13MHpDYW1TeUZ6R2NhdTkxeGRDanh6djRCYTZXZEFZb3p3aERBUHVXZDVTRU9mbDFQZTFCZHJpdVNXcGhobVBBMHhZdU5EUnhlRDR0OHZwSUs5N2tBSmN6VmNxVUhyNUkrYXpjSlhiRUk0WXN1QmlFdkg5WWlIYys3K3dQMmExZ25Sd2ZwNFdPa0ZQa3BTbnRSNTY0M0QvUHB3V3hCRnhzdDk1aEZ1bWFOTlhVK09iWUFzMmx2enZjb3ZMeWRWa1JTUldVN1RpZmJndHBhT2pyWkJaUTdnOWw1alF5M2R4bVhubXJBMkR0Zmc4L09SMFZCeWhoTFZ0YjcyWGdNKzhEWTNlNmY1b21HeWZXSzQyUmc2Uy9jYkhBTEU0M2s2b0hsU05LSzJkMzNTdjJHVFR4eWNvTktacHNhdGlBanZxTXZtYlFIalF4K01sd1U5UnVjMkc5dWhKQlNBb0RLci9XUVpFUnMwMmtpK3ZnPT0iLCJzaGEyNTYiOiJBQT09Iiwia2V5aWQiOiJORkNEQ0gtMDItRjJFWFU4MzkySldVMUxLN0VKUVRIWU1LODczSFVYXzE4MyIsIml2IjoiT2ZqMEE5aDVTRWkyZnljOTZuS0VIQT09In0=",
  "signature":"kYGSmxByR8zGnasxBj9Ev7kpsKP52F1E2wse5KtY634=",
  "mastertoken": {
      "tokendata":"eyJzZXNzaW9uZGF0YSI6IkJRQ0FBQUVCRUN2WXd1dG9EZjJ5NzlJQU9OTWk3eVdCUUZaTjlPNXdEcUt5VlhsOE53aXdkOG1BSWlFUTZHNTlDT2d6M2szQ1pnYThDbzdDa09ZbVpLb2xtS1JLelhHTFAzZ3I1SjFyNHA5U0V4Q3BoZ2VUdDBZcHRkNnoxdEtVYmdFaWt4TzczWjZjRXFySm4zR0pEWE83TVZCVGR3bjZKZ2lrSlcvdFRzS2pPMWV1VVN2NFpPejRaSVdXUUVhL0N1WU1pVk5iRkltRWZDbktiZHRKN3dkY3V2MllrVm5iZjlVbk9zYkNiLy9jcXpsVkZyWERZYWJKSDdrMUhNRTFvUHFWeTVHenNsTlpYN2dOT2J5MjJXZ0VGVWtoWTZ2QlhFSEVsT05YeWRYTWFnSm9DRDUvcnNWd2NLdE1Dd3BJUEJkZEpjcG83S1BSY3VQeXd6YXBkZVFiMlpCeWwvOWwyTlErNW9RckNOWVZpRzlienVZMlhIL1RRVi9yelhmM0ZrTjBRTThNTi8vbFRnYXFvVzNQMG5nZFJnTEozREd1clRVclV4RlJ5d01nSmdTdThFWTRycCtLREpSaWhCREk4RkZYTmJWS3ZDUVgiLCJyZW5ld2Fsd2luZG93IjoxNTk2MTUwMDQ5LCJzZXJpYWxudW1iZXIiOjQyMTgyMjk4NjkxNTU3NzksImV4cGlyYXRpb24iOjE1OTcyNzMyNDksInNlcXVlbmNlbnVtYmVyIjoxODN9",
      "signature":"AQEAgQABASAi39xsFfU8TQG7IAxf8t1M7F9drcUKmbn8a48Wz7nodJUjsFA="}
  }
  {
      "payload":"eyJjaXBoZXJ0ZXh0IjoiSExoajJSQmExSDk5TFFYSjNrY1lNdEI3eFZRZGVHeU1tcTZjc3U2TG1xQnE1aWViekUyUUNhZi9YMEdLZW1JeldSdTk3MG9Jckh2TllabEh4YStjUVk4WDhqQThjOUZTN0FnaW1FMG5iZDVDTzdnbnRVcG00dy9ZVG9neVMyUFEwV29YR3ZIZXYxTlcwRWxUWCtMVDJRT1duZ0ZxblRFL05iU3pjVm8yTzhaMHdraTJRVTN4K0NlSmZSUVdETHIwN2RtWkFpa3NaaldqNmI0UE9ReGxJWW1MRklIV1NkdE11R2ttdlRKYmRyZ3k4Y2JQNjlSbkkrREVaMzRPWDlWUVpoVHRwY0g5WnBkNG1PcjB2SWNRbXNBYnFwc3dpTlZ0bm5ucS9wRnpZZ0k9Iiwic2hhMjU2IjoiQUE9PSIsImtleWlkIjoiTkZDRENILTAyLUYyRVhVODM5MkpXVTFMSzdFSlFUSFlNSzg3M0hVWF8xODMiLCJpdiI6IjFCcHduV1AzaXRtQlp2M1pobDhnOFE9PSJ9",
      "signature":"/TLnxl4cJ7ALbhLO+U0wauwU0UvT9pYSJFdZoDvl84s="
}

*/


function getWindowScrollTop() {
   var sc = window.pageYOffset || document.documentElement.scrollTop;
   updEventStore("scrollPosition",sc);
}

const INTERVAL = 50;

document.addEventListener("scroll", getWindowScrollTop);

const EventListenerMode = {capture: true};

function mouseup22Listener (e) {
  //restoreGlobalMouseEvents ();
  document.removeEventListener ('mouseup',   mouseupListener,   EventListenerMode);
  document.removeEventListener ('mousemove', mousemoveListener, EventListenerMode);
  e.stopPropagation ();
}

function updEventStoreAction (e) {
  if(e){
    //let _ev = getEventStore();
    //console.log(_g)
    //console.log(_ev)
    //let _g =  _ev[e.type] || [];
    let ff = {
      event:e.type,
      x:e.x,
      y:e.y,
      target:e.target
    }
    //_g.push(ff)  
    //console.log(_g)
    updEventStore(e.type,ff);
  }
}

function mouseupListener (e) {
  updEventStoreAction(e);
}

function mousemoveListener (e) {
  updEventStoreAction(e);
}

function mouseClicListener (e) {
  updEventStoreAction(e);
}


function captureMouseEvents (e) {
  //preventGlobalMouseEvents ();
  document.addEventListener ('mouseup',   mouseupListener,   EventListenerMode);
  document.addEventListener ('mousemove', mousemoveListener, EventListenerMode);
  document.addEventListener ('click', mouseClicListener, EventListenerMode);
  //e.preventDefault ();
  //e.stopPropagation ();
}


captureMouseEvents() 



export function sortObjectsByKey(obj,_key,order) {
  let _list = ObjectKeys(obj);
  let arrSrt = _list.sort(function(a, b) {
    let objA = obj[a];
    let objB = obj[b];
    if(objA[_key] && objB[_key]){
      if(order){
        if(objA[_key] < objB[_key]) { return -1; }
        if(objA[_key] > objB[_key]) { return 1; }
      }
      else{
        if(objA[_key] > objB[_key]) { return -1; }
        if(objA[_key] < objB[_key]) { return 1; }
      }
      return 0;
    }
  });
  return arrSrt;
}



export const getLng =  () => {
  var userLang = navigator.language || navigator.userLanguage;
  var lng = window.localStorage.getItem('lng') || userLang.split("-")[0] || "en";
  return lng;
}





export function febMaxDays(year){
  if ( (year%100!==0)){
      if((year%4===0) || (year%400===0)){
          return 29;
      }else{
          return 28;
      }
  }else{
    return 28;
  }
}


var month= 6,
_dayPerMonth = [0,31,febMaxDays((new Date()).getFullYear()),31,30,31,30,31,31,30,31,30,31],
_counter = 1;




export function MaxDayperMotnh(yyyy,mm){
  if(!yyyy || !mm){
      return null
  }
  var y = parseInt(yyyy.toString()),m= parseInt(mm.toString())
  let _dayPM = [0,31,febMaxDays(y),31,30,31,30,31,31,30,31,30,31]
  return _dayPM[m];
}




export function isInteger(f) {
  return typeof(f)==="number" && f%1===0;
}

export function isFloat(f) {
  return typeof(f)==="number" && f%1!==0;
}

export function isDate(yyyy,mm,dd){
  var rs = false;
  if(isInteger(yyyy) && isInteger(mm) && isInteger(dd)){
      if(mm<10){ mm='0'+mm}
      if(dd<10){ dd='0'+dd}
      //var dtDDMM = `${dd}/${mm}/${yyyy}`; const validDateDDMMYYYY = /^(((0[1-9]|[12]\d|3[01])\/(0[13578]|1[02])\/((19|[2-9]\d)\d{2}))|((0[1-9]|[12]\d|30)\/(0[13456789]|1[012])\/((19|[2-9]\d)\d{2}))|((0[1-9]|1\d|2[0-8])\/02\/((19|[2-9]\d)\d{2}))|(29\/02\/((1[6-9]|[2-9]\d)(0[48]|[2468][048]|[13579][26])|((16|[2468][048]|[3579][26])00))))$/g
      var dtMMDD = `${mm}/${dd}/${yyyy}`;  
      const validDateMMDDYYYY = /^((0|1)\d{1})\/((0|1|2|3)\d{1})\/((19|20)\d{2})/g;        
      if (validDateMMDDYYYY.test(dtMMDD)) {  
          rs = true
      }
      else{
          rs = false
      }
  }    
  return rs;
}

export function parseDate(d) {
    let lng = getLng();
    d = Number(d);     
    var tp =  new Date(d);
    return `${_monthNames[lng][tp.getMonth()+1]} ${tp.getDate()}, ${tp.getFullYear()}`;
}

export function parseFullDate(d) {
    let lng = getLng();
    d = Number(d);     
    var tp =  new Date(d);
    return `${tp.getDate()} ${lng==="es"?"de":""} ${_monthNames[lng][tp.getMonth()+1]} ${lng==="es"?"del":""} ${tp.getFullYear()}`;
}

export function parseDateShort(d) {
    d = Number(d);     
    var tp =  new Date(d);
    return `${monthsList_Short[tp.getMonth()+1]} ${tp.getDate()}`;
}

export function parseDay(d) {
    d = Number(d);     
    var tp =  new Date(d);
    return `${tp.getDate()}`;
}

export function parseMonthShort(d) {
    d = Number(d);     
    var tp =  new Date(d);
    return `${monthsList_Short[tp.getMonth()+1]}`;
}








export function groupbyTab(obj,range,tb) {
  let h = []
  let count = 0;
  obj && obj.map((d)=>{
    if(d){
      if(count<=range){
        let ind = Math.floor(count/(tb||12));
        if(!h[ind]){
          h[ind] = [];
        }
        h[ind].push(d);
        count += 1;
      }
    } 
  })
  return h;
}









export function parseInventory(o,ct,v){
  let res = {}
  let qL = v && v.split(' ');

  o && ObjectKeys(o).map(k=>{
    if(qL && qL.length>0){
      let isValidOb = {};
      for(let i in qL){
        let vq = qL[i];
        if(vq){
          let q = vq.toLowerCase();
          let fk = o[k] && o[k]["name"] && o[k]["name"].toLowerCase();
          let slP = o[k] && o[k]["salePrice"];
          let Cid =  o[k] && o[k]["categoryID"];
          let ck = ct && ct[Cid] && ct[Cid]["name"] && ct[Cid]["name"].toLowerCase();
          let isNm = q && fk && fk.indexOf(q)>=0;
          let isCtg = q && ck && ck.indexOf(q)>=0;
          let isSlp = q && slP && slP.toString().indexOf(q)>=0;
          isValidOb[i] = isNm || isCtg || isSlp ? 2 : 1;
        }
        else{
          isValidOb[i] = 2;
        }
      }
      let tt = 0;
      ObjectKeys(isValidOb).map(k=>{
        tt += isValidOb[k];
      })
      if(qL.length*2 === tt){
        res[k] = o[k];
      }
    }else{
      res[k] = o[k];
    }
  })

  let pendingS = sortObjectsByKey(res,"name",true);   
  return pendingS;
} 





var _unitMeasurement = {
  10001: {name:"Lbs",rate:460,toUnit:"gramos"},
  10002: {name:"Uno",rate:1,toUnit:"Uno"},
  10003:  {name:"Kilogramo",rate:1000,toUnit:"gramos"},
  10004: {name:"Gramo",rate:1,toUnit:"gramos"},
  10005:  {name:"Litro",rate:1000,toUnit:"Mililitro"},
  10006: {name:"Mililitro",rate:1,toUnit:"Mililitro"},
}






var _categoriesProducts= {
  3063: {name:"Carnicos"},
  1492: {name:"Lacteos"},
  31574:  {name:"Granos"},
  6548: {name:"Ahumados"},
  11559:  {name:"Pescados"},
  7627: {name:"Mariscos"},
  34627: {name:"Aceites y Mantecas"},
  4370: {name:"Bebidas no Alcoholicas"},
  108663: {name:"Bebidas Alcoholicas"},
  2243108:  {name:"Sasones"},
  293134: {name:"Pastas"},
  874315: {name:"Cereales"},
  954303: {name:"Confituras"},
  360215: {name:"Refrescos"},
  360278: {name:"Jugos"},
  62612: {name:"Dulces"},
  851759:{name:"Combos"},
  920029:{name:"Cócteles"},
  930039:{name:"Entrantes"},
  970079:{name:"Cerdo"},
  980089:{name:"Res"},
  960069:{name:"Pollo"},
  8100018:{name:"Edulcorantes"},
  8200028:{name:"Harinas y Levaduras"},
  7200027:{name:"Vegetales"},
  760067:{name:"Viandas"},
  710017:{name:"Hortalizas"},
  730037:{name:"Frutas"},
  780087:{name:"Ensaladas"},
}




export function init_categoriesProducts() {
  updStore("categoriesProducts",_categoriesProducts);
  updStore("unitMeasurement",_unitMeasurement);
}


init_categoriesProducts(); 





export const getSectionId3 =  (k,v) => {
  return window.localStorage.getItem("hrm_auth_token_media");
}



let sectionKey = "";
export const getsectionKey =  () => {
  return sectionKey;
}

export const setsectionKey =  (v) => {
  sectionKey = v;
}



let sectionId = "";
export const getSectionId =  () => {
  return sectionId;
}

export const setSectionId =  (v) => {
  sectionId = v;
}





export const  fetch_auth_validation = async (url,graphParams) => {
 
  const serializedParams = JSON.stringify(graphParams); 
  var resp = {};
  
  var fp = genFP16bytes();
  // var fprntId = genFP16bytes(true);
  let sKey = fp;
  var IdCrypt = genId();
  var IdCryptBase64Key = Base64.encode(sKey);
  var encKey = Base64.encode(IdCrypt);
  let encryptKey = encryptV4(encKey,IdCryptBase64Key);      
  let encryptData = encryptV4(serializedParams,encKey);
  const rs = {};
  rs["d"] = encryptData;
  rs["k"] = encryptKey;
  rs["dI"] = fp; 
  var bsParams = JSON.stringify(rs);

  // var authToken = getAuth();
  // var authToken = window.localStorage.getItem('hrm_auth_token_media');
  // var fbtkClnt = window.localStorage.getItem('fbtkClnt');
  if(encryptData){
      
    const graphQLUrl = `${url}stream_auth`;
    const res = await fetch(graphQLUrl, {
      method: 'post',
      headers: {
        //'Content-Type': 'text/plain',
        "Accept-Encoding": "gzip, deflate, br",
        'Content-Type': 'application/json',
        //'Authorization': `${authToken}:${fp}:${fprntId}`,            
      },
      body: bsParams
    });
      let resJSON = await res.json();    
      var _Data = resJSON; 
      const {data} =  _Data; 
      if(data && data.d){
        var parsedBase64Key = Base64.encode(sKey);
        let decrypkey = decryptV4(data.k,parsedBase64Key);    
        let rslt = decryptV4(data.d,decrypkey); 
        if(isJson(rslt)){
          resp = JSON.parse(rslt);
        }
      }   
      return resp;
  }
};







// fetchStream_market_data


export const fetchStream_movie_data  = async (url,graphParams) => {
  
  const serializedParams = JSON.stringify(graphParams); 
  
  var resp = {};
  
  var fp = genFP16bytes();
  var fprntId = genFP16bytes(true);

  let sKey = getsectionKey();
  var IdCrypt = genId();
  var IdCryptBase64Key = Base64.encode(sKey);
  var encKey = Base64.encode(IdCrypt);
  let encryptKey = encryptV4(encKey,IdCryptBase64Key);      
  let encryptData = encryptV4(serializedParams,encKey);
  const rs = {};
  rs["d"] = encryptData;
  rs["k"] = encryptKey;
  rs["s"] = getSectionId();
  var bsParams = JSON.stringify(rs);




  var authToken = getAuth();
  //var authToken = window.localStorage.getItem('hrm_auth_token_media');
  //var fbtkClnt = window.localStorage.getItem('fbtkClnt');
  const graphQLUrl = `${url}stream_e_data`;
  if(encryptData){
    const res = await fetch(graphQLUrl, {
      method: 'post',
      headers: {
        //'Content-Type': 'text/plain',
        "Accept-Encoding": "gzip, deflate, br",
        'Content-Type': 'application/json',
        'Authorization': `${authToken}:${fp}:${fprntId}`,            
      },
      body: bsParams
    });
      let resJSON = await res.json();    
      var _Data = resJSON;
      const {data} =  _Data; 
      if(data && data.d){
        var parsedBase64Key = Base64.encode(sKey);
        let decrypkey = decryptV4(data.k,parsedBase64Key);    
        let rslt = decryptV4(data.d,decrypkey); 
        if(isJson(rslt)){
          resp = JSON.parse(rslt);
        }
      }   
      return resp;
  }
};




export const fetch_getAnonymusTknWe  = async (url,graphParams) => {
  
  const serializedParams = JSON.stringify(graphParams); 
  
  var resp = {};
  
  var fp = genFP16bytes();
  var fprntId = genFP16bytes(true);
  // var fprntId = genFP16bytes(true);
  let sKey = fprntId;
  var IdCrypt = genId();
  var IdCryptBase64Key = Base64.encode(sKey);
  var encKey = Base64.encode(IdCrypt);


  let encryptKey = encryptV4(encKey,IdCryptBase64Key);      
  let encryptData = encryptV4(serializedParams,encKey);
 
  const rs = {}; 
  rs["d"] = encryptData;
  rs["k"] = encryptKey;
  rs["dI"] = sKey;


  var bsParams = JSON.stringify(rs);

  var authToken = getAuth();
  //var authToken = window.localStorage.getItem('hrm_auth_token_media');
  //var fbtkClnt = window.localStorage.getItem('fbtkClnt');
  const graphQLUrl = `${url}stream_e_data`;
  if(encryptData){
    const res = await fetch(graphQLUrl, {
      method: 'post',
      headers: {
        //'Content-Type': 'text/plain',
        "Accept-Encoding": "gzip, deflate, br",
        'Content-Type': 'application/json',
        'Authorization': `${authToken}:${fp}:${fprntId}`,            
      },
      body: bsParams
    });
      let resJSON = await res.json();    
      var _Data = resJSON;
      const {data} =  _Data; 
      if(data && data.d){
        var parsedBase64Key = Base64.encode(sKey);
        let decrypkey = decryptV4(data.k,parsedBase64Key);    
        let rslt = decryptV4(data.d,decrypkey); 
        if(isJson(rslt)){
          resp = JSON.parse(rslt);
        }
      }   
      return resp;
    }
};









export function encryptV4(plaintText,encryptedBase64Key ) {
  try{
    var parsedBase64Key = CryptoJS.enc.Base64.parse(encryptedBase64Key);
    var encryptedData = null;  
    encryptedData = CryptoJS.AES.encrypt(plaintText, parsedBase64Key, {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7
    });
    return encryptedData.ciphertext.toString(CryptoJS.enc.Base64);
  }
  catch(e){
    // console.log(e)
    return null;
  }
}


export function decryptV4(encryptedCipherText, encryptedBase64Key ) {
  var parsedBase64Key = CryptoJS.enc.Base64.parse(encryptedBase64Key);
  var decryptedData = CryptoJS.AES.decrypt( encryptedCipherText, parsedBase64Key, {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7
  });
  var decryptedText = decryptedData.toString( CryptoJS.enc.Utf8 );
  return decryptedText
}







export const fetch_get_url  = async (url) => {
    const res = await fetch(url, {
    method: 'get',
      headers: {
        //'Content-Type': 'text/plain',
          "Accept-Encoding": "gzip, deflate, br",
          'Content-Type': 'application/json'
                   
      }
    });
    let resJSON = await res.json();
    return resJSON;
};









const isEntrega = (type) => {
  return type === "Entrega" || type === "REM_CARD_CUP" || type === "REM_CARD_MLC" || type === "REM_CASH_USD" || type === "REM_CASH_CUP" || type === "COMBO";
}

export const balanceFactor = (type,am) => {
  if (isEntrega(type)) {
    if(am>0){
      return -1;
    }else{
      return 1;
    }
  } 
  else if (type ==="INVESTMENT_FOOD") {
    return -1;
  }
  else if (type ==="BTC" || type ==="TRANSFER" || type ==="ADJUSTMENTS"  || type ==="DEBT"  || type ==="COMISION_AGENT" ||  type==="DELIVERY_EXPS") {
    return 1;
  }
  else if (type ==="COMBO") {
    return 0;
  }
  else{
    return 0
  }
}








export function removeElement(id) {
  var elem = document.getElementById(id);
  return elem.parentNode.removeChild(elem);
}





/*








export const  fetchStream_movie_data222 = async (url,graphParams) => {
 
  const serializedParams = JSON.stringify(graphParams); 
  
  
  var fp = genFP16bytes();
  var fprntId = genFP16bytes(true);

  var tempK = genId();

  // console.log(graphParams)

  var encRypt = generateAESKEY(serializedParams,tempK);  
  var encRyptK = generateAESKEY(tempK, fp)


  var bsParams = JSON.stringify({q:Base64.encode(encRypt),k:Base64.encode(encRyptK)});
 

  var authToken = getAuth();
  //var authToken = window.localStorage.getItem('hrm_auth_token_media');
  //var fbtkClnt = window.localStorage.getItem('fbtkClnt');
  const graphQLUrl = `${url}streamdata`;
  const res = await fetch(graphQLUrl, {
    method: 'post',
    headers: {
      //'Content-Type': 'text/plain',
      'Content-Type': 'application/json',
      'Authorization': `${authToken}:${fp}:${fprntId}`,            
    },
    body: bsParams
  });
    let resJSON = await res.json();    
    var _Data = resJSON;     
    if(_Data.status===200){            
      var kb = decryptAESKEY(_Data.k, fp);
      var decdData = decryptAESKEY(_Data.r, kb);
      if(isJson(decdData)){
        _Data = JSON.parse(decdData);
      }
    }   
    return _Data;
};















const fingerprint_GLOBAL = 'Fingerprint2'




export function getFingerPrint(getStaticUrl) {
  const fingerprint2Url = `${getStaticUrl}${'fingerprint2.min.js'}`
    return new Promise((resolve, reject) => {        
        getSDK(fingerprint2Url, fingerprint_GLOBAL).then(fp => {
            fp().get(function(result, components) { 
                resolve(result);
            })    
        }) 
    })      
};






export const  Auth = async (url,graphParams) => {
 
  const serializedParams = JSON.stringify(graphParams); 
  
  
  var fp = genFP16bytes();

  var tempK = genId();


  var encRypt = generateAESKEY(serializedParams,tempK);  
  var encRyptK = generateAESKEY(tempK, fp)


  var bsParams = JSON.stringify({q:Base64.encode(encRypt),k:Base64.encode(encRyptK)});
 

  var authToken = getAuth();
  //var authToken = window.localStorage.getItem('hrm_auth_token_media');
  //var fbtkClnt = window.localStorage.getItem('fbtkClnt');
  const graphQLUrl = `${url}/auth`;
  const res = await fetch(graphQLUrl, {
    method: 'post',
    headers: {
      //'Content-Type': 'text/plain',
      'Content-Type': 'application/json',
      'Authorization': `${authToken}:${fp}`,            
    },
    body: bsParams
  });
    let resJSON = await res.json();    
    var _Data = resJSON;     
    if(_Data.status===200){            
      var kb = decryptAESKEY(_Data.k, fp);
      var decdData = decryptAESKEY(_Data.r, kb);
      if(isJson(decdData)){
        _Data = JSON.parse(decdData);
      }
    }   
    return _Data;
};







export function buildTimeString_(displayTime, showHour) {
    var h = Math.floor(displayTime / 3600);
    var m = Math.floor((displayTime / 60) % 60);
    var s = Math.floor(displayTime % 60);
    if (s < 10) s = '0' + s;
    var text = m + ':' + s;
    if (showHour) {
      if (m < 10) text = '0' + text;
      text = h + ':' + text;
    }
    return text;
  };


  const AUDIO_EXTENSIONS = /\.(m4a|mp4a|mpga|mp2|mp2a|mp3|m2a|m3a|wav|weba|aac|oga|spx)($|\?)/i
  const VIDEO_EXTENSIONS = /\.(mp4|og[gv]|webm|mov|m4v)($|\?)/i
  const HLS_EXTENSIONS = /\.(m3u8|ts)($|\?)/i
  const HLM_EXTENSIONS = /\.(hlm|ts)($|\?)/i
  
  
  const DASH_EXTENSIONS = /\.(mpd)($|\?)/i
  const MP4_EXTENSIONS = /\.(mp4)($|\?)/i
  
  




  export const shouldUseHLS = (url) => {
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
    return (HLS_EXTENSIONS.test(url) && !iOS) //|| this.props.config.file.forceHLS
  }
  
  export const shouldUseAudio = (url) => {
    return AUDIO_EXTENSIONS.test(url) //|| props.config.file.forceAudio
  }
  
  export const shouldUseHLM = (url) => {
    return (HLM_EXTENSIONS.test(url));
  }
  
  export const shouldUseDASH = (url) => {
    return DASH_EXTENSIONS.test(url)
  }
  
  export const shouldUseMP4 = (url) => {
    return MP4_EXTENSIONS.test(url)
  }
  



export function fullscreenElement(){
  var doc = document;
  return doc.fullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement || document.webkitFullscreenElement;
}


export function fullscreenEnabled(){
  var doc = document;
  return doc.fullscreenEnabled || doc.mozFullScreenEnabled || doc.msFullscreenEnabled || document.webkitFullscreenEnabled;  
}




  
export function Y(){
  if (window.document) {
            var a = Element.prototype;
            a.requestFullscreen = a.requestFullscreen || a.mozRequestFullScreen || a.msRequestFullscreen || a.webkitRequestFullscreen;
            a = Document.prototype;
            a.exitFullscreen = a.exitFullscreen || a.mozCancelFullScreen || a.msExitFullscreen || a.webkitExitFullscreen;
              document.fullscreenElement = (
              Object.defineProperty(document, "fullscreenElement", {
                get: function() {
                var doc = document;
                        return doc.mozFullScreenEnabled || doc.msFullscreenEnabled || document.webkitFullscreenEnabled
                    }
              }),
               Object.defineProperty(document, "fullscreenEnabled", {
                    get: function() {
                      var doc = document;
                        return doc.mozFullScreenEnabled || doc.msFullscreenEnabled || document.webkitFullscreenEnabled
                    }
                })
              );
            document.addEventListener("webkitfullscreenchange", Tg);
            document.addEventListener("webkitfullscreenerror", Tg);
            document.addEventListener("mozfullscreenchange", Tg);
            document.addEventListener("mozfullscreenerror", Tg);
            document.addEventListener("MSFullscreenChange", Tg);
            document.addEventListener("MSFullscreenError", Tg)
        }
    };


function Tg(a) {
  var b = a.type.replace(/^(webkit|moz|MS)/, "").toLowerCase();
  if ("function" === typeof Event) var c = new Event(b, a);
  else c = document.createEvent("Event"); c.initEvent(b, a.bubbles, a.cancelable);
  a.target.dispatchEvent(c)
}




export  function IsFullScreen(elm) {
  //window.innerWidth == elm.clientWidth && window.innerHeight == elm.clientHeight
  var rs = false;
  if((window.innerWidth === elm.clientWidth)) {
      rs = true;
  }
  return rs;
}




export  function srtBySecond(s,arr) {
  var txt = null; 
  if(s && arr){
      var start = 0,end = arr.length,factor=10, range=end-start,step=range/factor;               
      for(var i=0;i<factor;i++){
         
          var Ind = Math.floor((i*step)+start);
          var ArrStep = arr[Ind];
  
          var Cst = Cst && ArrStep.start
          var Cend = Cst && ArrStep.end
          if(Cst>s){
              end=Ind;
              range=end-start;
              step=range/factor; 
          }
          else if(Cst<s){
              start=Ind;
              range=end-start;
              step=range/factor; 
          }
          if(range<100){ 
              break
          }             
      }        
      for(var i = start;i<=end;i++){        
          var CSt = arr[i];
          if(CSt){
              var Cst = CSt.start
              var Cend = CSt.end            
              if(Cst<=s && Cend>=s){
                  txt = CSt.text;    
              }
          }
      }
  }
  return txt
}



*/





/*


Cuenta Banco Metropolitano (Formato: 05XX 7XXX XXXX XXXX)

Cuenta Banco Popular (Formato: 12XX XXXX XXXX XXXX)

Cuenta Bandec (Formato: 06XX XXXX XXXX XXXX)



Tarjeta Banco Metropolitano (Formato: 92XX 9598 7XXX XXXX)


Tarjeta Banco Popular (Formato: 92XX 1299 7XXX XXXX)

Tarjeta Banco Bandec (Formato: 92XX 0699 9XXX XXXX)


360673.75-277770.90


$ 176679.04 COMBO
$ 277770.90 INV

$ 360673.75 BTC


183994.71

82902


839401.29

361983.75 - 282770.90


79212.85 + 98914.27
178127.12
6851
*/






export function checkIfcookie(id) {


  if (navigator.cookieEnabled) return true;

  // set and read cookie
  document.cookie = "cookietest=1";
  var ret = document.cookie.indexOf("cookietest=") != -1;

  // delete cookie
  document.cookie = "cookietest=1; expires=Thu, 01-Jan-1970 00:00:01 GMT";

  return ret;
}



export function parseAutoFilterObj(o,ky,v){
  let res = {}
  o && ObjectKeys(o).map(k=>{
    let q = v && v.toLowerCase();
    let fk = o[k] && o[k][ky] && o[k][ky].toLowerCase();
    if(q && fk && fk.indexOf(q)>=0){
      res[k] = {name:o[k][ky], id:k}
    }
  })
  return res;
} 