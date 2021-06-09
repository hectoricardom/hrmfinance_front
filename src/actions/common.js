import * as _Util from '../store/Util'
// import * as WebSocket from "ws"

let aI = [];





var socketR = {}



//const io = window.io;

let socket = null;


export function getSocket() {
  return socket;
}










export function loadLanes2() {
  let query = {   
    params:{id:""},
    auth:{authCode:"850217"},
    query:"subcribeMovements"
  };

  const serializedParams = JSON.stringify({query});
  const sub = "subscribe";
  socket && socket.emit("initObs",serializedParams)

  socket && socket.emit("hrm", serializedParams)

  socket && socket.on('unsubscribe', channelName => {
      if (channelName === sub) {
        //dispatch({type: CLEAR_LANES});
      }
    });
   // return dispatch => {};
}



let _getState = null;
let _Distpatch;



var uploadConatiner = {}


export function getDispatch(){  
  return _Distpatch;
}


export function getUploadConatiner(){  
  return uploadConatiner;
}


export function clearUploadConatiner(h){  
  uploadConatiner = h;
  _Distpatch({
    type: 'UPD_KEY_VALUE',
      kv:{key:'UploadObsoreve',value:_Util.gen12CodeId()}
  })    
}


export function UpdateRdx(dispatch, state){    
  if(!_Distpatch){
    _Distpatch = dispatch;
    _Util.updDistpatch(dispatch)
  }
  if(!_getState){
    _getState = state;
  }
  _Distpatch({
    type: 'UPD_KEY_VALUE',
    kv:{key:'rdxOK',value:true}
  })  
}



//window.addEventListener("resize",()=>resizeWd())

setInterval(()=>resizeWd(),125);

const resizeWd = (e) => {
 
  if(_Distpatch){
    let wdW = window.outerWidth;
    // let _state = _Util.getStore();
  
    let state = _Util.getStore();    
    if(state["outerWidth"]!==wdW){
      _Util.updStore('outerWidth',wdW);
      _Util.updPlayerStore('outerWidth',wdW);
      _Distpatch({
        type: 'UPD_KEY_VALUE',
        kv:{key:'observeChanges',value:_Util.gen12CodeId()}
      })
      _Distpatch({
        type: 'UPD_KEY_VALUE',
        kv:{key:'observePlayer',value:_Util.gen12CodeId()}
      })
    }
  }
}



let componentStore = {};
export const updComponentStore =  (k,v) => {
  componentStore[k] = v;
}

export const getComponentStore =  () => {
  return componentStore;
}





const loadStockProductInv = async ( dispatch) => {  
  let _userId = _Util.getProfileId();

  let fields = [
    "id","name","salePrice","isPublic","unit","imageUrl","ignoreStock","categoryID",{N:"stock",f:["amount", "stock", "stockIn", "stockOut"]}
  ];

  let Qry2Inv = {
    query:"getStockProductQvaMarket",
    params:{
      showInventory:true,
      providerId:_userId,
    },
    arraySerialization: _Util.isArraySerialization(),
    fields:fields
  };

 

  if(_Util.IsAdmin()){            
    Qry2Inv = {
      query:"getStockProductQvaMarket",
      params:{
        showInventory:true
      },
      arraySerialization: _Util.isArraySerialization(),
      fields:fields
    };
  }

  const res = _Util.fetchStream_movie_data(_Util.get_GRAPHQLURL(),Qry2Inv)
  const td = await res;
  if(td){
    let dZs =  _Util.isArraySerialization()?_Util.deZerialize2Array(td,fields,1):td;
    _Util.updStore('stockProduct',dZs);
    getDispatch()({
      type: 'UPD_KEY_VALUE',
      kv:{key:'observeChanges',value:_Util.gen12CodeId()}
    })
  }
}








export async function  initWebSocketClient() { 
  const res = _Util.fetchPostUrl(_Util.get_GRAPHQLURL()+'listenApiV2',{});
  const td = await res;
  if(td && td.data && td.data.k){
    handleDataSocket(td.data);
  }
  initWebSocketClient();
}





export function handleDataSocket(eD) {
  let data = {}
  let sKey = _Util.getsectionKey();
  var parsedBase64Key = _Util.Base64.encode(sKey);
  let decrypkey = _Util.decryptV4(eD.k,parsedBase64Key);    
  let rslt = _Util.decryptV4(eD.d,decrypkey); 
  if(_Util.isJson(rslt)){
    data = JSON.parse(rslt);
  }
  if(data.type === "InventoryUpdated"){
      //console.log("InventoryUpdated", data)  
      if(!socketR[data.id]){
        socketR[data.id] = 1;
        let inView = _Util.getViewActive();
        if(inView===3){
          loadStockProductInv();
        }
        else if(inView===1){
          let fields = [
            "id","name","salePrice","isPublic","unit","imageUrl","ignoreStock","categoryID",{N:"stock",f:["amount", "stock", "stockIn", "stockOut"]}
          ];
      
          let Qry2Inv = {
            query:"getStockProductQvaMarket",
            params:{
              isPublic:true
            },
            arraySerialization: _Util.isArraySerialization(),
            fields:fields
          };
          loadStockProduct(Qry2Inv,getDispatch());
        }
        else if(inView===2){
          const searchHash = window.location.hash.split('?')[1]?window.location.hash.split('?')[1]:null;
          const router = _Util.parseQuery(searchHash);
          let Qry2 = {
            params:{
              id:router.prodId
            },
            query:"getQueryProductsID",
          };
          fetchProductsID(Qry2,getDispatch());
        }
      }
    }

    else if(data.type === "isPublicUpd"){     
      if(!socketR[data.id]){
        socketR[data.id] = 1;
        let inView = _Util.getViewActive();
        if(inView===1){
          fetchMrkProd();
        }
      }
    } 
    else if(data.type === "updateMovements"){ 
      if(!socketR[data.id]){
        socketR[data.id] = 1;
        let inView = _Util.getViewActive();
        if(inView===8){
          loadMovs();
        }
        else if(inView===9){
          fetchMovId();
        }
      }
    }
    else if(data.type === "addMovements"){
      if(!socketR[data.id]){
        socketR[data.id] = 1;
        let inView = _Util.getViewActive();
        if(inView===8){
          loadMovs();
        }
      }
    }
}




const fetchMrkProd = async () => {
  let fields = [
    "id","name","salePrice","isPublic","unit","imageUrl","ignoreStock","categoryID",{N:"stock",f:["amount", "stock", "stockIn", "stockOut"]}
  ];

  let bdy = {
    query:"getStockProductQvaMarket",
    params:{
      isPublic:true
    },
    arraySerialization: _Util.isArraySerialization(),
    fields:fields
  };
  const res = _Util.fetchStream_movie_data(_Util.get_GRAPHQLURL(),bdy)
  const td = await res;
  if(td){
    let dZs =  _Util.isArraySerialization()?_Util.deZerialize2Array(td,fields,1):td;

    _Util.updStore('stockProduct',dZs);
    _Distpatch({
      type: 'UPD_KEY_VALUE',
      kv:{key:'observeChanges',value:_Util.gen12CodeId()}
    })
  }

}






/*
  besil
  1111654.79 + 358105.00-775880.00-273932.11-88404.50
*/





/*
  Luis
  232446.00  -232446.00 = 0
*/



/*
  Ronal
  230953.50  - 159708.50 -8250.00 -22125.00
*/



const fetchMovId = async () => {
  _Util.updStore('movementsDetails',{});
  let _userId = _Util.getProfileId();
  const searchHash = window.location.hash.split('?')[1]?window.location.hash.split('?')[1]:null;
  const router = _Util.parseQuery(searchHash);
  let fieldsMvId = [ 
    "id",
    "agentId",
    "userID",
    "cartProd",
    "orderId",
    "discount",
    "description",
    "amount","tasa","type",
    "date", "deliveryDate",
    "isPaid","IsDelivery",
    "agentDestination",
    {
      N:"agentDestinationDetails",
      Q:"",
      f:["id", "name","email"]
    },
    "receiverId",
    {
      N:"receiver",
      Q:"",
      f:["id","name","phoneNumber", "address", "city", "state","lat","lon"]
    },
    {
      N:"sender",
      Q:"",
      f:["id", "name","phoneNumber","dispatcherId"]
    },
    {
      N:"prdDtls",
      Q:"",
      f:["products", "sale_total","total"]
    }
  ];


  let Qry2Inv = {
    query:"getQueryMovementsbyId",
    arraySerialization: _Util.isArraySerialization(),
    fields:fieldsMvId,
    params:{
      userId: _userId,
      //userId:_Util.getUserAgent(),
      id: router.movId
    }
  };
  
  const res = _Util.fetchStream_movie_data(_Util.get_GRAPHQLURL(),Qry2Inv);
  const td = await res;
  
  let dZs = _Util.isArraySerialization()?_Util.deSerializeItm(td,fieldsMvId):td;
  if(dZs && dZs.id){
    _Util.updStore('movementsDetails',dZs);
    getThumbnailImg("google_map-min.png",getDispatch())
    getDispatch()({
      type: 'UPD_KEY_VALUE',
      kv:{key:'observeChanges',value:_Util.gen12CodeId()}
    })
  }
  else{
    _Util.getStore()["route_history"].push({pathname:"/dashboard"})
  }
}





export const calcMovStore = async (mm) => {
  
  _Util.updStore('movements',mm);
  let done = {};
  let pending = {};
  let total = 0;
  const _form = _Util.getFormStore("store_list_search") || {};
  let qry = _form["search"];
  let dateQ = _form["date"];
  let pnOrStMk = {};

  _Util.ObjectKeys(mm).map((mv,ii)=>{

    let isValid = false;
    let type = mm[mv]["type"];
    if(qry || dateQ){
      let _qr = qry && qry.toString().toLowerCase()?qry.toString().toLowerCase():"";
      let _typ = mm[mv]["type"].toString().toLowerCase();
      let _ord = mm[mv]["orderId"] && mm[mv]["orderId"].toString().toLowerCase();
      let _rcv = mm[mv]["receiver"] && mm[mv]["receiver"]["name"] && mm[mv]["receiver"]["name"].toString().toLowerCase();
      let _hasPrdNm = false;
      let _dte = mm[mv]["date"];
      let _dtQ = dateQ || 0;
      let _hasDt = _dte>_dtQ;
      let _hasTyp = _typ && _typ.indexOf(_qr)>=0 && _hasDt;
      let _hasRcv = _rcv && _rcv.indexOf(_qr)>=0 && _hasDt;
      let _has_ord = _ord && _ord.indexOf(_qr)>=0 && _hasDt;


      
      if(mm[mv] && mm[mv]["prdDtls"] &&  mm[mv]["prdDtls"]["products"]){
        _Util.ObjectKeys(mm[mv]["prdDtls"]["products"]).map(prId=>{
          let _prNm = mm[mv]["prdDtls"]["products"][prId] && mm[mv]["prdDtls"]["products"][prId]["name"] && mm[mv]["prdDtls"]["products"][prId]["name"].toLowerCase();
          let _idLwC = mm[mv]["prdDtls"]["products"][prId] && mm[mv]["prdDtls"]["products"][prId]["productID"] && mm[mv]["prdDtls"]["products"][prId]["productID"].toLowerCase();
          let _hasPRN = _prNm && _prNm.indexOf(_qr)>=0 && _hasDt;
          let _hasPRId = _idLwC && _idLwC.indexOf(_qr)>=0 && _hasDt;
          if(_hasPRN || _hasPRId){
            _hasPrdNm = true;
          }

          if(!mm[mv]["IsDelivery"] && mm[mv]["prdDtls"]["products"][prId]["store"] && mm[mv]["prdDtls"]["products"][prId]["store"]["id"]){
            let StrId = mm[mv]["prdDtls"]["products"][prId]["store"]["id"];
            if(!pnOrStMk[StrId]){
              pnOrStMk[StrId] ={};
            }
            pnOrStMk[StrId][prId]=mm[mv]["prdDtls"]["products"][prId]; 
          } 
        })
      }
      if(_hasTyp || _hasRcv || _hasPrdNm || _has_ord){
        isValid = true;
      }
    }else{
      isValid = true;
     
      if(mm[mv] && mm[mv]["prdDtls"] &&  mm[mv]["prdDtls"]["products"]){
        _Util.ObjectKeys(mm[mv]["prdDtls"]["products"]).map(prId=>{
          if(!mm[mv]["IsDelivery"] && mm[mv]["prdDtls"]["products"][prId]["store"] && mm[mv]["prdDtls"]["products"][prId]["store"]["id"]){
            let StrId = mm[mv]["prdDtls"]["products"][prId]["store"]["id"];
            if(!pnOrStMk[StrId]){
              pnOrStMk[StrId] ={};
            }
            pnOrStMk[StrId][prId]=mm[mv]["prdDtls"]["products"][prId];
          }
        })
      }
    }

    let validUsr =  _Util.IsAdmin() ||  _Util.getProfileId() === mm[mv]["agentId"];
   
   
    if(isValid && validUsr){
      if(mm[mv]["IsDelivery"] && (type==="COMBO" || (type==="INVESTMENT_FOOD" || type==="INVESTMENT_INGREDIENTS") || type==="TRANSFER" || type==="DELIVERY_EXPS")){
       
        done[mv] = mm[mv];
        let prdDtls =mm[mv] && mm[mv]["prdDtls"] ;
        //let prodsL =prdDtls && prdDtls["products"];
        //let prodNm = prodsL && _Util.ObjectKeys(prodsL).length;
        let am = mm[mv]["amount"] * mm[mv]["tasa"]
        if(prdDtls && prdDtls["total"]>0){
          am = prdDtls["total"];
        }
        if(!isNaN(am)){
          total += am *-1;
        }
      }
      else if(type==="COMBO"){
        let isPaid = _Util.IsAdmin() || mm[mv]["isPaid"];
        if(isPaid){
            pending[mv] = mm[mv];
        }
      }
    }
  })



/// quite 25 paquetes de spagueti dia 15-3-21 


  let doneS = _Util.sortObjectsByKey(done,"date",false);
  let pendingS = _Util.sortObjectsByKey(pending,"date",false);
  _Util.updStore('movementsDoneStore',doneS);
  _Util.updStore('movementsPendingStore',pendingS);
  _Util.updStore('balanceMStore',total);
  _Util.updStore('pnOrStMkStore',pnOrStMk);
  done = null;
  pending = null;
  mm = null;

  _Distpatch({
    type: 'UPD_KEY_VALUE',
    kv:{key:'observeChanges',value:_Util.gen12CodeId()}
  })
}


















const _formName = 'mov_list_search';





















export const calcMov = async (mm) => {
    _Util.updStore('movements',mm);
    let done = {};
    let pending = {};
    let total = 0;
    const _form = _Util.getFormStore('mov_list_search') || {};
    let qry = _form["search"];
    let dateQ = _form["date"];

    let pnOrStMk = {};

    _Util.ObjectKeys(mm).map((mv,ii)=>{

      let isValid = false;
      let type = mm[mv]["type"];
      let _ord = mm[mv]["orderId"] && mm[mv]["orderId"].toString().toLowerCase();
        
      if(qry || dateQ){
        let _qr = qry && qry.toLowerCase()?qry.toString().toLowerCase():"";
        let _typ = mm[mv]["type"].toString().toLowerCase();
        let _rcv = mm[mv]["receiver"] && mm[mv]["receiver"]["name"] && mm[mv]["receiver"]["name"].toString().toLowerCase();
        let _hasPrdNm = false;
        let _dte = mm[mv]["date"];
        let _dtQ = dateQ || 0;
        let _hasDt = _dte>_dtQ;
        let _hasTyp = _typ && _typ.indexOf(_qr)>=0 && _hasDt;
        let _hasRcv = _rcv && _rcv.indexOf(_qr)>=0 && _hasDt;
        let _has_ord = _ord && _ord.indexOf(_qr)>=0 && _hasDt;

        
        if(mm[mv] && mm[mv]["prdDtls"] &&  mm[mv]["prdDtls"]["products"]){
          _Util.ObjectKeys(mm[mv]["prdDtls"]["products"]).map(prId=>{
            let _prNm = mm[mv]["prdDtls"]["products"][prId] && mm[mv]["prdDtls"]["products"][prId]["name"] && mm[mv]["prdDtls"]["products"][prId]["name"].toLowerCase();
            let _idLwC = mm[mv]["prdDtls"]["products"][prId] && mm[mv]["prdDtls"]["products"][prId]["productID"] && mm[mv]["prdDtls"]["products"][prId]["productID"].toLowerCase();
            let _hasPRN = _prNm && _prNm.indexOf(_qr)>=0 && _hasDt;
            let _hasPRId = _idLwC && _idLwC.indexOf(_qr)>=0 && _hasDt;
            if(_hasPRN || _hasPRId){
              _hasPrdNm = true;
            }

            if(!mm[mv]["IsDelivery"] && mm[mv]["prdDtls"]["products"][prId]["store"] && mm[mv]["prdDtls"]["products"][prId]["store"]["id"]){
              let StrId = mm[mv]["prdDtls"]["products"][prId]["store"]["id"];
              if(!pnOrStMk[StrId]){
                pnOrStMk[StrId] ={};
              }
              pnOrStMk[StrId][prId]=mm[mv]["prdDtls"]["products"][prId]; 
            } 
          })
        }
        if(_hasTyp || _hasRcv || _hasPrdNm || _has_ord){
          isValid = true;
        }
      }else{
        isValid = true;
       
        if(mm[mv] && mm[mv]["prdDtls"] &&  mm[mv]["prdDtls"]["products"]){
          _Util.ObjectKeys(mm[mv]["prdDtls"]["products"]).map(prId=>{
            if(!mm[mv]["IsDelivery"] && mm[mv]["prdDtls"]["products"][prId]["store"] && mm[mv]["prdDtls"]["products"][prId]["store"]["id"]){
              let StrId = mm[mv]["prdDtls"]["products"][prId]["store"]["id"];
              if(!pnOrStMk[StrId]){
                pnOrStMk[StrId] ={};
              }
              pnOrStMk[StrId][prId]=mm[mv]["prdDtls"]["products"][prId];
            }
          })
        }
      }

      let validUsr =  _Util.IsAdmin() ||  _Util.getProfileId() === mm[mv]["agentId"];
     
     
      if(isValid && validUsr){
       
        if(mm[mv]["IsDelivery"]){
          done[mv] = mm[mv];
          if(type==="COMBO" || type==="INVESTMENT_FOOD"){
            let prdDtls =mm[mv] && mm[mv]["prdDtls"] ;
            //let prodsL =prdDtls && prdDtls["products"];
            //let prodNm = prodsL && _Util.ObjectKeys(prodsL).length;
            let am = mm[mv]["amount"] * mm[mv]["tasa"]
           
            if(prdDtls && prdDtls["total"]){
              am = prdDtls["total"];
            }
           
            if(am && type==="COMBO"){
              if(qry || dateQ){
                if(!isNaN(am)){
                  total += am;
                }
              }
            }
            else{
              if(!isNaN(am)){
                total += am *-1;
              }
            }
          }
          else{
            let am = mm[mv]["amount"] * mm[mv]["tasa"]
            let bF = _Util.balanceFactor(type,am);             
            total += bF * am;
          }
        }
        else{
          let isPaid = _Util.IsAdmin() || mm[mv]["isPaid"];
          if(isPaid){
            pending[mv] = mm[mv];
          }
        }
      }
    })


    let doneS = _Util.sortObjectsByKey(done,"date",false);
    let pendingS = _Util.sortObjectsByKey(pending,"date",false);
    _Util.updStore('movementsDone',doneS);
    _Util.updStore('movementsPending',pendingS);
    _Util.updStore('balanceM',total);
    _Util.updStore('pnOrStMk',pnOrStMk);
    done = null;
    pending = null;
    mm = null;
  
    _Distpatch({
      type: 'UPD_KEY_VALUE',
      kv:{key:'observeChanges',value:_Util.gen12CodeId()}
    })
}





export const loadMovs = async (usI) => {
  let _userId = usI || _Util.getProfileId();
  let stt = (new Date()).getTime();
  let fields = [ 
    "id",
    "agentId",
    "userID",
    "cartProd",
    "orderId",
    "amount","tasa","type",
    "deliveryDate","date",
    "isPaid","IsDelivery",
    "agentDestination",
    {
      N:"agentDestinationDetails",
      Q:"",
      f:["id", "name","email"]
    },
    "receiverId",
    {
      N:"receiver",
      Q:"",
      f:["name"]
    },
    {
      N:"sender",
      Q:"",
      f:["id", "name","phoneNumber","dispatcherId"]
    },
    {
      N:"prdDtls",
      Q:"",
      f:["products", "sale_total","total"]
    }
  ];

  


let arraySerialization = _Util.isArraySerialization();

  let Qry2Inv = {
    query:"getQueryMovementsbyAgent",
    fields:fields,
    arraySerialization: arraySerialization,
    params:{
      userId:_userId,
      // updDelivery:true
      //userId:_Util.getUserAgent(),
    }
  };

  const res = _Util.fetchStream_movie_data(_Util.get_GRAPHQLURL(),Qry2Inv);
  const td = await res;
  if(td){
    let dZs = arraySerialization?_Util.deZerialize2Array(td,fields,1):td;
    calcMov(dZs);
    calcMovStore(dZs);
  }
}










export const loadGroups = async (usI) => {

  let _state = _Util.getStore();
  let _userId = _state["agentId2"] || _Util.getProfileId();

  let fields = [ 
    "id",
    "name",
    "type",
  ];
let arraySerialization = _Util.isArraySerialization();

  let Qry2Inv = {
    query:"getQueryGroupsDetails",
    fields:fields,
    arraySerialization: arraySerialization,
    params:{
      userId:_userId,
    }
  };

  const res = _Util.fetchStream_movie_data(_Util.get_GRAPHQLURL(),Qry2Inv);
  const td = await res;
  if(td){
    let dZs = arraySerialization?_Util.deZerialize2Array(td,fields,1):td;
    _Util.updStore('Groups',dZs);
    _Distpatch({
      type: 'UPD_KEY_VALUE',
      kv:{key:'observeChanges',value:_Util.gen12CodeId()}
    })

  }
}















export const getQueryResumeYear = async (usI) => {

  let _state = _Util.getStore();
  let _userId = _state["agentId2"] || _Util.getProfileId();


  let Qry2Inv = {
    query:"getQueryResumeYear",
    params:{
      userId:_userId,
    }
  };


  console.log(Qry2Inv)
  const res = _Util.fetchStream_movie_data(_Util.get_GRAPHQLURL(),Qry2Inv);
  const td = await res;

  console.log(td)
  if(td){
    _Util.updStore('YearResume',td);
    _Distpatch({
      type: 'UPD_KEY_VALUE',
      kv:{key:'observeChanges',value:_Util.gen12CodeId()}
    })

  }
}










export const OpenSlideMenu = (dispatch, data) => {
  if(!_Distpatch){
    _Distpatch = dispatch;
  }  
  let list = getComponentStore()["listViewSlideOption"] || {};
  let Id = _Util.gen12CodeId();
  if(data['Id']){
    Id = data['Id']
  }
  if(!list[Id]){
    list[Id]={};
  }
  list[Id]['visible']=true;
  let _dataProps = {}
  if(!data['props']){
    _dataProps['modalID'] = Id
  }else{
    _dataProps = data['props'];
    _dataProps['modalID'] = Id;
  }
  if(data['zIndex']){
    list[Id]['zIndex']=data['zIndex']
  }
  if(data['width']){
    list[Id]['width']=data['width']
  }
  if(data['direction']){
    list[Id]['direction']=data['direction']
  }
  if(data['overlay']){
    list[Id]['overlay']=data['overlay']
  }
  if(data['content']){
    list[Id]['content']=data['content']
  }
  list[Id]['data']=_dataProps; 
  updComponentStore('listViewSlideOption',list);
  dispatch({
    type: 'UPD_KEY_VALUE',
    kv:{key:'observeComponent',value:_Util.gen12CodeId()}
  })
  setTimeout(()=>{     
    list[Id]['display']=true;
    updComponentStore('listViewSlideOption',list);
    dispatch({
      type: 'UPD_KEY_VALUE',
      kv:{key:'observeComponent',value:_Util.gen12CodeId()}
    })
  },25)

}



export const CloseSlideMenu = (dispatch, data) => {  
  if(!_Distpatch){
    _Distpatch = dispatch;
  }    
  
  let list = getComponentStore()["listViewSlideOption"] || {};
  let Id = data['id']; 
  if(list && list[Id]){
    list[Id]['display']=false;  
    updComponentStore('listViewSlideOption',list);
    dispatch({
      type: 'UPD_KEY_VALUE',
      kv:{key:'observeComponent',value:_Util.gen12CodeId()}
    })
    setTimeout(()=>{
      delete list[Id];      
      updComponentStore('listViewSlideOption',list);
      dispatch({
        type: 'UPD_KEY_VALUE',
        kv:{key:'observeComponent',value:_Util.gen12CodeId()}
      })
    },705)
  }
}












export const LoadData = async (body,dispatch) => {     
    let bdy = body;
    // let _state = _Util.getStore();
    const res = _Util.fetchStream_movie_data(_Util.get_GRAPHQLURL(),bdy)
    const td = await res;
    _Util.updIsAdmin(false);
    if(td && td.data){
      let _id = Object.keys(td.data)[0];
      if(td.data[_id].isAdmin){
        _Util.updStore('userProfile',td.data[_id]);
        //_Util.updStore('isAdmin',true);
        _Util.updIsAdmin(true);
        _Util.updStore('authenticate',true);
        LoadUsersActive(dispatch);
      }
      else{
        _Util.updStore('ActiveUser',_id);
        _Util.updStore('authenticate',true)
        //SubscribeDetailsbyId(_id);
      }
      _Util.updStore('appLoaded',true)
    }else{
      _Util.updStore('appLoaded',true)
      _Util.updStore('authenticate',false)
    }
    dispatch({
      type: 'UPD_KEY_VALUE',
      kv:{key:'observeChanges',value:_Util.gen12CodeId()}
    })
}


 const LoadUsersActive = async (dispatch) => { 
  let bdy = {
    auth:{
      authCode:"850217"
    },
    fields:[
      "id","email"
    ],
    query:"usersList"
  };
  const res = _Util.fetchStream_movie_data(_Util.get_GRAPHQLURL(),bdy)
  const td = await res;
  if(td && td.data){
    _Util.updStore('userList',td.data)
    //SubscribeDetails(td.data); 
    dispatch({
      type: 'UPD_KEY_VALUE',
      kv:{key:'observeChanges',value:_Util.gen12CodeId()}
    })
  }
}





export const fetchRemesa = async (bdy,dispatch,fNM) => {
  const res = _Util.fetchStream_movie_data(_Util.get_GRAPHQLURL(),bdy)
  const td = await res;
  if(td){
    fNM && _Util.updFormStore(fNM,{});
    dispatch({
      type: 'UPD_KEY_VALUE',
      kv:{key:'observeForms',value:_Util.gen12CodeId()}
    })
  }
}





export const fetchCities = async (bdy,dispatch) => {
  const res = _Util.fetchStream_movie_data(_Util.get_GRAPHQLURL(),bdy)
  const td = await res;
  if(td){
    _Util.updStore('cities',td)
    dispatch({
      type: 'UPD_KEY_VALUE',
      kv:{key:'observeChanges',value:_Util.gen12CodeId()}
    })
  }
}


export const fetchSenders = async (bdy2,dispatch) => {

  let bdy = {
    auth:{
      authCode:"850217"
    },
    query:"getQuerySenderDetails",
    params:{userId:"113699695841584167881"},
    Collection:"Senders"
  };
  const res = _Util.fetchStream_movie_data(_Util.get_GRAPHQLURL(),bdy)
  const td = await res;
  if(td){
    _Util.updStore('sendersList',td)
    dispatch({
      type: 'UPD_KEY_VALUE',
      kv:{key:'observeChanges',value:_Util.gen12CodeId()}
    })
  }
}


export const fetchMovementsAll = async (bdy,dispatch) => {
  const res = _Util.fetchStream_movie_data(_Util.get_GRAPHQLURL(),bdy)
  const td = await res;
  if(td){
    _Util.updStore('movementsList',td)
    dispatch({
      type: 'UPD_KEY_VALUE',
      kv:{key:'observeChanges',value:_Util.gen12CodeId()}
    })
  }
}



export const fetchRateCurrency = async (bdy,dispatch) => {
  const res = _Util.fetchStream_movie_data(_Util.get_GRAPHQLURL(),bdy)
  const td = await res;
  if(td){
    _Util.updStore('rateCurrency',td)
    dispatch({
      type: 'UPD_KEY_VALUE',
      kv:{key:'observeChanges',value:_Util.gen12CodeId()}
    })
  }
}



export const updSender = async (bdy,dispatch) => {
  const res = _Util.fetchStream_movie_data(_Util.get_GRAPHQLURL(),bdy)
  const td = await res;
  if(td && td){
    _Util.updStore('rateCurrency',td)
    dispatch({
      type: 'UPD_KEY_VALUE',
      kv:{key:'observeChanges',value:_Util.gen12CodeId()}
    })
  }
}







export const fetchSearchSenders = async (bdy,dispatch) => {
  const res = _Util.fetchStream_movie_data(_Util.get_GRAPHQLURL(),bdy)
  const td = await res;
  if(td){
    _Util.updStore('sendersList',td)
    dispatch({
      type: 'UPD_KEY_VALUE',
      kv:{key:'observeChanges',value:_Util.gen12CodeId()}
    })
  }
}



export const fetchUsers = async (b,dispatch) => {
  let bdy = {
    query:"getQueryUsersDetails",
    auth:{
        authCode:"850217"
    },
    params:{userId:"113699695841584167881"},
    Collection:"Users"
  };
  const res = _Util.fetchStream_movie_data(_Util.get_GRAPHQLURL(),bdy)
  const td = await res;
  if(td){
    _Util.updStore('usersList',td)
    dispatch({
      type: 'UPD_KEY_VALUE',
      kv:{key:'observeChanges',value:_Util.gen12CodeId()}
    })
  }
}














export const deleteMovements = (_id) => {  
    let _state = _Util.getStore();
    var _movList = _state["movementsList"] || {};
    delete _movList[_id];
    _Util.updStore('movementsList',_movList)
    _Distpatch({
      type: 'UPD_KEY_VALUE',
      kv:{key:'observeChanges',value:_Util.gen12CodeId()}
    })
}










export const deleteByMovements = async (bdy) => {
  let _id = bdy && bdy["params"]  && bdy["params"]["id"];
  const res = _Util.fetchStream_movie_data(_Util.get_GRAPHQLURL(),bdy)
  const td = await res;
  if(td){
    deleteMovements(_id);
  }
}





export const fetchMovementByID = async (bdy) => {
  let _id = bdy && bdy["params"]  && bdy["params"]["id"];
  const res = _Util.fetchStream_movie_data(_Util.get_GRAPHQLURL(),bdy)
  const td = _id &&  await res;
  if(td){
    var itm = td.data[_id]
    let _state = _Util.getStore();
    var _movList = _state["movementsList"] || {};
    _movList[_id] = itm;
    _Util.updStore('movementsList',_movList)
    _Distpatch({
      type: 'UPD_KEY_VALUE',
      kv:{key:'observeChanges',value:_Util.gen12CodeId()}
    })
  }
}



export const fetchProductsAll = async (bdy,dispatch) => {
  const res = _Util.fetchStream_movie_data(_Util.get_GRAPHQLURL(),bdy)
  const td = await res;
  if(td){
    _Util.updStore('productsList',td)
    _Util.ObjectKeys(td).map(pI=>{
      if(td[pI] && td[pI].imageUrl){
        //aI.push(td[pI].imageUrl);
        //getThumbnailImg(td[pI].imageUrl,dispatch)
      }
    });
    //fetchQueue(aI,fMP44444);
    dispatch({
      type: 'UPD_KEY_VALUE',
      kv:{key:'observeChanges',value:_Util.gen12CodeId()}
    })
  }
}





export const fetchProductsID = async (bdy,dispatch) => {
  let _id = bdy && bdy["params"]  && bdy["params"]["id"];
  const res = _Util.fetchStream_movie_data(_Util.get_GRAPHQLURL(),bdy)
  const td = _id && await res;
  if(td){
    _Util.updStore('productsDetail',td)
    if(td && td[_id] && td[_id].imageUrl){
      //getThumbnailImg(td[_id].imageUrl,dispatch)
      //aI.push(td[_id].imageUrl);
    }
    //fetchQueue(aI,fMP44444);
    dispatch({
      type: 'UPD_KEY_VALUE',
      kv:{key:'observeChanges',value:_Util.gen12CodeId()}
    })
  }
}







export const inStockProduct = () => {  
  let _state = _Util.getStore();
  var _movList = _state["InventoryList"] || {};
  var _productsList = _state["productsList"] || {};
  let hh = {}
  _Util.ObjectKeys(_movList).map(s=>{
    let _idProd = _movList[s] && _movList[s]["productID"];
    let _agentId = _movList[s] && _movList[s]["agentId"];
    if(!hh[_agentId]){
      hh[_agentId] = {};
    }
    if(!hh[_agentId][_idProd]){
      hh[_agentId][_idProd] = {};
      hh[_agentId][_idProd]["qty"] = 0;
      hh[_agentId][_idProd]["prices"] = [];
      hh[_agentId][_idProd]["priceTotal"] = 0;
      hh[_agentId][_idProd]["name"] = _productsList[_idProd] && _productsList[_idProd]["name"]?_productsList[_idProd]["name"]:"";
    }

    hh[_agentId][_idProd]["qty"] += _movList[s]["qty"]* 1;
    hh[_agentId][_idProd]["priceTotal"] += _movList[s]["price"] * 1;
    hh[_agentId][_idProd]["prices"].push(_movList[s]["price"]* 1);
    hh[_agentId][_idProd]["ave"] =  hh[_agentId][_idProd]["priceTotal"] / hh[_agentId][_idProd]["prices"].length;
  })
  _Util.updStore('stockProduct',hh)
  _Distpatch({
    type: 'UPD_KEY_VALUE',
    kv:{key:'observeChanges',value:_Util.gen12CodeId()}
  })

}






export const fetchInventoryAll = async (bdy,dispatch) => {
  const res = _Util.fetchStream_movie_data(_Util.get_GRAPHQLURL(),bdy)
  const td = await res;
  if(td){
    _Util.updStore('InventoryList',td)
    //inStockProduct(td);
    dispatch({
      type: 'UPD_KEY_VALUE',
      kv:{key:'observeChanges',value:_Util.gen12CodeId()}
    })
  }
}

export const LoadStoreMarkets = async () => {
  let QryUser = {
    query:"getStoreMarket"
  };
  const res = _Util.fetchStream_movie_data(_Util.get_GRAPHQLURL(),QryUser);
  const td = await res;
  if(td){
    _Util.updStore('storesMarketList',td);
    _Distpatch({
      type: 'UPD_KEY_VALUE',
      kv:{key:'observeChanges',value:_Util.gen12CodeId()}
    })
  }
}





export const deleteInventory = (_id) => {  
  let _state = _Util.getStore();
  var _movList = _state["InventoryList"] || {};
  delete _movList[_id];
  _Util.updStore('InventoryList',_movList)
  _Distpatch({
    type: 'UPD_KEY_VALUE',
    kv:{key:'observeChanges',value:_Util.gen12CodeId()}
  })
}


export const deleteByInventory = async (bdy) => {
  let _id = bdy && bdy["params"]  && bdy["params"]["id"];
  const res = _Util.fetchStream_movie_data(_Util.get_GRAPHQLURL(),bdy)
  const td = await res;
  if(td && td){
    deleteInventory(_id);
  }
}







export const getSectionByGtoken = async (bdy) => {
  const res = _Util.fetch_auth_validation(_Util.get_GRAPHQLURL(),bdy);
  const td = await res;
  if(td && td.token){
    _Util.setSectionId(td.token);
    _Util.setsectionKey(td.sectionKey);
    _Util.updStore('userProfile',td.user);
    _Util.updIsAdmin(td.isAdmin);
    _Util.updStore('isqvmAgent',td.user && td.user.isqvmAgent);
    //console.log(bdy.params.id_token);
    //window.localStorage.setItem("g_tk_id",bdy.params.id_token);
    socket && socket.emit("hrm", td.token);
    let _now = (new Date()).getTime();
    var _expire = (new Date(_now + 60000*60*24*365));
    document.cookie = `g_tk_id=${td.token}; expires=${_expire}; path=/;g_state = {"i_l":1,"i_p":${_now}}`;  

    _Util.updStore('allowInventory',td.user && td.user.allowInventory);
    _Util.updStore('isDelivery',td.user && td.user.isDelivery);
    _Util.updStore('isStore',td.user && td.user.isStore);
    _Util.updStore('singinView',null);
    _Distpatch({
      type: 'UPD_KEY_VALUE',
      kv:{key:'observeChanges',value:_Util.gen12CodeId()}
    })
  }
}

export const getAnonymusTknWe = async (bdy) => {
  const res = _Util.fetch_getAnonymusTknWe(_Util.get_GRAPHQLURL(),bdy);
  const td = await res;
  if(td && td.token){
    _Util.setSectionId(td.token);
    _Util.setsectionKey(td.sectionKey);
    _Util.updStore('userProfile',td.user);
    _Util.updStore('isAdmin',td.isAdmin);
    _Util.updStore('isqvmAgent',td.user && td.user.isqvmAgent);
    _Util.updStore('allowInventory',td.user && td.user.allowInventory);
    getThumbnailImg("gg_lg_96-min.png",_Distpatch);
    _Distpatch({
      type: 'UPD_KEY_VALUE',
      kv:{key:'observeChanges',value:_Util.gen12CodeId()}
    })
  }
}






export const loadShoppingCart = async (bdy, dispatch) => {
  const res = _Util.fetchStream_movie_data(_Util.get_GRAPHQLURL(),bdy)
  const td = await res;
  if(td){
    _Util.updStore('shopping_cart',td);
    let prodCart = {};
    _Util.ObjectKeys(td).map(scit=>{
      prodCart[td[scit]["productId"]] = td[scit]; 
      prodCart[td[scit]["productId"]]["id"] = scit;
    })
    _Util.updStore('prod_shopping_cart',prodCart);
    _Distpatch({
      type: 'UPD_KEY_VALUE',
      kv:{key:'observeChanges',value:_Util.gen12CodeId()}
    })
  }
}




export const loadStockProduct = async (bdy, dispatch) => {
  const res = _Util.fetchStream_movie_data(_Util.get_GRAPHQLURL(),bdy)
  const td = await res;
  if(td){
    let dZs =  _Util.isArraySerialization()?_Util.deZerialize2Array(td,bdy.fields,1):td;
    _Util.updStore('stockProduct',dZs);
    _Distpatch({
      type: 'UPD_KEY_VALUE',
      kv:{key:'observeChanges',value:_Util.gen12CodeId()}
    })
  }
}





export const loadReceivers = async (id,_userid,dispatch) => {
  let fields = [ "id", "name","phoneNumber", "address", "city", "state"]
  let bdy = {
    query:"getReceiverBySenderID",
    params:{senderId:id,userId:_userid},
    arraySerialization: _Util.isArraySerialization(),
    fields:fields
  };
  const res = _Util.fetchStream_movie_data(_Util.get_GRAPHQLURL(),bdy)
  const td = await res;
  if(td){
    let dZs =  _Util.isArraySerialization()?_Util.deZerialize2Array(td,fields,1):td;
    _Util.updStore('receiversList',dZs);
    dispatch({
      type: 'UPD_KEY_VALUE',
      kv:{key:'observeChanges',value:_Util.gen12CodeId()}
    })
  }
}






/*

updQueryStore("getShoppingCartbyUserId", getShoppingCartbyUserId);  
updQueryStore("upgradeShoppingCart", upgradeShoppingCart);

*/








export const OpenToast = (dispatch, data) => {
  if(!_Distpatch){
    _Distpatch = dispatch;
  }
  
  let list = getComponentStore()["listToat"] || {};
  let Id = _Util.gen12CodeId();
  if(data['Id']){
    Id = data['Id']
  }
  if(!list[Id]){
    list[Id]={};
  }
  list[Id]['visible']=true;
  let _dataProps = {}
  if(!data['props']){
    _dataProps['modalID'] = Id
  }else{
    _dataProps = data['props'];
    _dataProps['modalID'] = Id;
  }
  _dataProps['text'] = data.text
  list[Id]['data']=_dataProps; 
  list[Id]['display']=true;    
  updComponentStore('listToat',list);
  dispatch({
    type: 'UPD_KEY_VALUE',
    kv:{key:'observeComponent',value:_Util.gen12CodeId()}
  })

  setTimeout(()=>{    
    CloseToast(dispatch, {id:Id})
  },3000)

}



export const CloseToast = (dispatch, data) => {  
  if(!_Distpatch){
    _Distpatch = dispatch;
  }    
  
  let list = getComponentStore()["listToat"] || {};
  let Id = data['id']; 
  if(list && list[Id]){
    list[Id]['display']=false;  
    updComponentStore('listToat',list);
    dispatch({
      type: 'UPD_KEY_VALUE',
      kv:{key:'observeComponent',value:_Util.gen12CodeId()}
    })
    setTimeout(()=>{
      delete list[Id];      
      updComponentStore('listToat',list);
      dispatch({
        type: 'UPD_KEY_VALUE',
        kv:{key:'observeComponent',value:_Util.gen12CodeId()}
      })
    },275)
  }
}















export const OpenModal = (dispatch, data) => {

  
  if(!_Distpatch){
    _Distpatch = dispatch;
  }
  let list = getComponentStore()["listDialog"] || {};
  let Id = _Util.gen12CodeId();
  if(!list[Id]){
    list[Id]={};
  }
  list[Id]['visible']=true;
  let _dataProps = {}
  if(!data['props']){
    _dataProps['modalID'] = Id
  }else{
    _dataProps = data['props'];
    _dataProps['modalID'] = Id;
  }  

  list[Id]['isView'] = data['isView'];
  list[Id]['observeResize'] = data['observeResize'];
  if(list[Id]['observeResize']){
    list[Id]['observeInterval'] = setInterval(()=>{     
      let cmp = document.querySelector(`[dialog-key-id='${Id}']`);
      let dmz = cmp && cmp.getBoundingClientRect(); 
      if(dmz){      
        if(dmz.width!== list[Id]['width'] || dmz.height!== list[Id]['height']){
          list[Id]['height']=dmz.height + 10;   
          list[Id]['width']=dmz.width;          
          updComponentStore('listDialog',list);
          dispatch({
            type: 'UPD_KEY_VALUE',
            kv:{key:'observeComponent',value:_Util.gen12CodeId()}
          })
        }
      }
    },200)
  }
  setTimeout(()=>{     
    list[Id]['display']=true;
    if(data['zIndex']){
      list[Id]['zIndex']=data['zIndex']
    }
    if(data['height']){
      list[Id]['height']=data['height']
    }
    if(data['width']){
      list[Id]['width']=data['width']
    }  
    if(data['content']){
      list[Id]['content']=data['content']
    }
    list[Id]['data']=_dataProps;
    updComponentStore('listDialog',list);
    dispatch({
      type: 'UPD_KEY_VALUE',
      kv:{key:'observeComponent',value:_Util.gen12CodeId()}
    })
  },125)
  updComponentStore('listDialog',list);
  dispatch({
    type: 'UPD_KEY_VALUE',
    kv:{key:'observeComponent',value:_Util.gen12CodeId()}
  })
}



export const CloseModal = (dispatch, data) => {
    
  if(!_Distpatch){
    _Distpatch = dispatch;
  }
  let list = getComponentStore()["listDialog"] || {};
  let Id = data['id'];
  if(list[Id]){
    
    if(list[Id]['observeResize']){
      if(list[Id]['observeInterval']){
        clearInterval(list[Id]['observeInterval'])
      }
    }  
    list[Id]['display']=false;
    updComponentStore('listDialog',list);
    dispatch({
      type: 'UPD_KEY_VALUE',
      kv:{key:'observeComponent',value:_Util.gen12CodeId()}
    })
    setTimeout(()=>{
      delete list[Id];
      updComponentStore('listDialog',list);
      dispatch({
        type: 'UPD_KEY_VALUE',
        kv:{key:'observeComponent',value:_Util.gen12CodeId()}
      })
    },750)
  }
}








/******************************************/
















export const OpenWatchDialog = (dispatch, data) => {
  if(!_Distpatch){
    _Distpatch = dispatch;
  }
  let keys = _Util.getGlobalsKeys()
  let list = getComponentStore()["listWathDialog"] || {}; 
  list =  {};
  let Id = _Util.gen12CodeId();
  if(data['Id']){
    Id = data['Id']
  }
  if(!list[Id]){
    list[Id]={};
  }
  list[Id]['visible']=true;
  list[Id]['action']="showing";
  let _dataProps = {}
  if(!data['props']){
    _dataProps['modalID'] = Id
  }else{
    _dataProps = data['props'];
    _dataProps['modalID'] = Id;
  }
  _dataProps['text'] = data.text
  list[Id]['data']=_dataProps; 

  if(data['content']){
    list[Id]['content']=data['content']
  }
  
  //list[Id]['isTitleDetail']=true;
  updComponentStore('listWathDialog',list);
  dispatch({
    type: 'UPD_KEY_VALUE',
    kv:{key:'observeComponent',value:_Util.gen12CodeId()}
  })

  setTimeout(()=>{ 
    if(list && list[Id]){
      list[Id]['display']=true;
      
    }   
    updComponentStore('listWathDialog',list);
    dispatch({
      type: 'UPD_KEY_VALUE',
      kv:{key:'observeComponent',value:_Util.gen12CodeId()}
    })
    setTimeout(()=>{           
      if(list && list[Id]){
        list[Id]['loaded']=true;
      }
      updComponentStore('listWathDialog',list);
      dispatch({
        type: 'UPD_KEY_VALUE',
        kv:{key:'observeComponent',value:_Util.gen12CodeId()}
      })
    },60)
   },20)
  
   


}



export const CloseWatchDialog = (dispatch, data) => {  
  if(!_Distpatch){
    _Distpatch = dispatch;
  }    
  
  let list = getComponentStore()["listWathDialog"] || {};
  let Id = data['id']; 
  if(list && list[Id]){
    list[Id]['display']=false;  
    
    updComponentStore('listWathDialog',list);
    dispatch({
      type: 'UPD_KEY_VALUE',
      kv:{key:'observeComponent',value:_Util.gen12CodeId()}
    })    
    setTimeout(()=>{ 
      if(list && list[Id]){
        list[Id]['loaded']=false;  
        list[Id]['action']="closing";
        list[Id]['display']=false; 
        list[Id]['isTitleDetailInit']=false;
        list[Id]['isTitleDetail']=false;
        
        updComponentStore('listWathDialog',list);
        dispatch({
          type: 'UPD_KEY_VALUE',
          kv:{key:'observeComponent',value:_Util.gen12CodeId()}
        })
      }
      setTimeout(()=>{ 
        if(list && list[Id]){
          //delete list[Id];  
          list[Id]['visible']=false;   
          updComponentStore('listWathDialog',list);
          dispatch({
            type: 'UPD_KEY_VALUE',
            kv:{key:'observeComponent',value:_Util.gen12CodeId()}
          })
        }
       },30)
     },20)
  }
}





export function getThumbnail(url,dispatch,pth){
  let state = _Util.getStore()
  if(!_Distpatch){
    _Distpatch = dispatch;
  }
  let res = ''
  if(url){
    var _thumbnailJson = state && state['thumbnailJsonBlob']?state['thumbnailJsonBlob']:{};   
    if(_thumbnailJson && _thumbnailJson[url]){
      if(_thumbnailJson[url]['blob']){       
        res = _thumbnailJson[url]['blob'];
      }
    }
    else{
      dispatch && getThumbnail64(url,state,dispatch,pth)
    }
  }
  return res;
}



//  /getImagefromFld/';

function getThumbnail64(url,state,dispatch,pth) {
  let route = '/getImages/';
  if(pth){
    route = pth;
  }
  var _url = _Util.get_GRAPHQLURL() && _Util.get_GRAPHQLURL().concat(route).concat(url);
  
    var _thumbnailJson = state && state['thumbnailJsonBlob'];
    if(!_thumbnailJson){
      _thumbnailJson = {}
    }
    if(!_thumbnailJson[url]){
      _thumbnailJson[url] = {}
    }
    _thumbnailJson[url]['requested'] = true;    
    _Util.updStore('thumbnailJsonBlob',_thumbnailJson)
    var xhr = new XMLHttpRequest();    
      xhr.open( "GET",_url , true );
      xhr.responseType = "json";
      xhr.onreadystatechange = function() {
        if (xhr.readyState === 4 && xhr.status === 200) {           
          //document.getElementById("demo").innerHTML = this.responseText;
        }
      };
      xhr.onload = function( e ) {          
        if (xhr.status === 200) {
          if(this.response && this.response.b64){
            _thumbnailJson[url]['blob']=getBlob(this.response.b64,this.response.type);
            _thumbnailJson[url]['done']=true;
            var i = new Image();             
            i.onload = function(){
              _thumbnailJson[url]['width']=i.width;
              _thumbnailJson[url]['height']=i.height;              
              _Util.updStore('thumbnailJsonBlob',_thumbnailJson)
              dispatch({
                type: 'UPD_KEY_VALUE',
                kv:{key:'observeImage',value:_Util.gen12CodeId()}
              })
            };
            i.src = "data:"+this.response.type+";base64,"+  this.response.b64;                
            _Util.updStore('thumbnailJsonBlob',_thumbnailJson)     
            dispatch({
              type: 'UPD_KEY_VALUE',
              kv:{key:'observeImage',value:_Util.gen12CodeId()}
            })
          }
        }
      };
    _url &&  xhr.send(); 
};






function get4ThumbnailImg3333(url,dispatch) {
  var _url = url;
    var state = _Util.getStore();
    var _thumbnailJson = state && state['thumbnailJsonBlob'];
    if(!_thumbnailJson){
      _thumbnailJson = {}
    }
    if(!_thumbnailJson[url]){
      _thumbnailJson[url] = {}
    }
    _thumbnailJson[url]['requested'] = true;    
    _Util.updStore('thumbnailJsonBlob',_thumbnailJson)
    var xhr = new XMLHttpRequest();    
      xhr.open( "GET",_url , true );
      xhr.responseType = "blob";
      xhr.onreadystatechange = function() {
        if (xhr.readyState === 4 && xhr.status === 200) {           
          //document.getElementById("demo").innerHTML = this.responseText;
        }
      };
      xhr.onload = function( e ) {
        if (xhr.status === 200) {
          console.log(this.response)
        }
      };
    _url &&  xhr.send(); 
};







export const getThumbnailImg3 = async (id,dispatch) => {
  let bdy = {
    query:"getImages",
    auth:{
        authCode:"850217"
    },
    params:{iDImg:id,ext:"png"}
  };
 
  var state = _Util.getStore();


  var _thumbnailJson = state && state['thumbnailJsonBlob'];
  if(!_thumbnailJson){
    _thumbnailJson = {}
  }
  if(!_thumbnailJson[id]){
    _thumbnailJson[id] = {}
  }
  if(!_thumbnailJson[id]['requested']){
    _thumbnailJson[id]['requested'] = true;
    _Util.updStore('thumbnailJsonBlob',_thumbnailJson)
    
   
    const res = _Util.fetchStream_movie_data(_Util.get_GRAPHQLURL(),bdy)
    const td = await res;
    if(td){
      
      if(td && td.b64){
        _thumbnailJson[id]['blob']=getBlob(td.b64,td.type);
        _thumbnailJson[id]['done']=true;
        _thumbnailJson[id]['b64']=td.b64;
        _thumbnailJson[id]['type']=td.type;
        /*
        var i = new Image();             
        i.onload = function(){
          _thumbnailJson[id]['width']=i.width;
          _thumbnailJson[id]['height']=i.height;              
          _Util.updStore('thumbnailJsonBlob',_thumbnailJson)
          dispatch({
            type: 'UPD_KEY_VALUE',
            kv:{key:'observeImage',value:_Util.gen12CodeId()}
          })
          dispatch({
            type: 'UPD_KEY_VALUE',
            kv:{key:'observeChanges',value:_Util.gen12CodeId()}
          })
        };
        i.src = "data:"+td.type+";base64,"+  td.b64;       
        */         
        _Util.updStore('thumbnailJsonBlob',_thumbnailJson)  
        dispatch({
          type: 'UPD_KEY_VALUE',
          kv:{key:'observeImage',value:_Util.gen12CodeId()}
        })
      }

      dispatch({
        type: 'UPD_KEY_VALUE',
        kv:{key:'observeChanges',value:_Util.gen12CodeId()}
      })
    }
  }
}




export const getThumbnailImg = async (id,dispatch) => {

  var state = _Util.getStore();


  var _thumbnailJson = state && state['thumbnailJsonBlob'];
  if(!_thumbnailJson){
    _thumbnailJson = {}
  }
  if(!_thumbnailJson[id]){
    _thumbnailJson[id] = {}
  }
  if(!_thumbnailJson[id]['requested']){
    _thumbnailJson[id]['requested'] = true;
    _Util.updStore('thumbnailJsonBlob',_thumbnailJson)
    
   
    const res = _Util.fetch_get_url(_Util.get_GRAPHQLURL()+'getImage64/'+id)
    const td = await res;
    if(td){
      
      if(td && td.b64){
        _thumbnailJson[id]['blob']=getBlob(td.b64,td.type);
        _thumbnailJson[id]['done']=true;
        _thumbnailJson[id]['b64']=td.b64;
        _thumbnailJson[id]['type']=td.type;
        /*
        var i = new Image();             
        i.onload = function(){
          _thumbnailJson[id]['width']=i.width;
          _thumbnailJson[id]['height']=i.height;              
          _Util.updStore('thumbnailJsonBlob',_thumbnailJson)
          dispatch({
            type: 'UPD_KEY_VALUE',
            kv:{key:'observeImage',value:_Util.gen12CodeId()}
          })
          dispatch({
            type: 'UPD_KEY_VALUE',
            kv:{key:'observeChanges',value:_Util.gen12CodeId()}
          })
        };
        i.src = "data:"+td.type+";base64,"+  td.b64;       
        */         
        _Util.updStore('thumbnailJsonBlob',_thumbnailJson)  
        dispatch({
          type: 'UPD_KEY_VALUE',
          kv:{key:'observeImage',value:_Util.gen12CodeId()}
        })
      }

      dispatch({
        type: 'UPD_KEY_VALUE',
        kv:{key:'observeChanges',value:_Util.gen12CodeId()}
      })
    }
  }
}




const fMP44444 =  x =>  new Promise( async(resolve, reject) => {
    let id = x;
    let bdy = {
      query:"getImages",
      auth:{
          authCode:"850217"
      },
      params:{iDImg:id,ext:"png"}
    };

    var state = _Util.getStore();
  
    var _thumbnailJson = state && state['thumbnailJsonBlob'];
    if(!_thumbnailJson){
      _thumbnailJson = {}
    }
    if(!_thumbnailJson[id]){
      _thumbnailJson[id] = {}
    }
    if(!_thumbnailJson[id]['requested']){
      _thumbnailJson[id]['requested'] = true;
      _Util.updStore('thumbnailJsonBlob',_thumbnailJson)
      
      const res = _Util.fetchStream_movie_data(_Util.get_GRAPHQLURL(),bdy)
      const td = await res;
      if(td){
        if(td && td.b64){
          _thumbnailJson[id]['blob']=getBlob(td.b64,td.type);
          _thumbnailJson[id]['done']=true;
          _Util.updStore('thumbnailJsonBlob',_thumbnailJson)  
          _Distpatch({
            type: 'UPD_KEY_VALUE',
            kv:{key:'observeImage',value:_Util.gen12CodeId()}
          })
        }
        resolve(true);
        _Distpatch({
          type: 'UPD_KEY_VALUE',
          kv:{key:'observeChanges',value:_Util.gen12CodeId()}
        })
      }
    }
})
 
 
 
 
 
 async function fetchQueue(a,f) {
	for (let job of a.map(x => () => f(x)))
	await job()
 }




 function loadImagesBlob(a) {
	 fetchQueue(a,fMP44444);
 }
 











function getBlob(t,tp){    
  var arrayBufferView = base64ToArrayBuffer(t);
  //Util.DecodeWebp(arrayBufferView);       
  var blob = new Blob( [ arrayBufferView ], { type: tp || "image/jpeg" } );
  var urlCreator = window.URL || window.webkitURL;
  var imageUrl = urlCreator.createObjectURL(blob);     
  return imageUrl;
}





function base64ToArrayBuffer(base64) {
  var binary_string =  window.atob(base64);
  var len = binary_string.length;
  var bytes = new Uint8Array( len );
  for (var i = 0; i < len; i++)        {
      bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}















if(_Util.getBrowser().os === "iPhone" || _Util.getBrowser().os === "iPad"){
}
else if(_Util.getBrowser().browser === "Chrome"){
  const messaging = null;
  //firebase.messaging();

  if(messaging){
    messaging.usePublicVapidKey("BGGyY5gVI3fVacICzNXPUPPxmIBAF6dH9PTot1XsW1EyAA-syytsH98b58JZ4QZEOSJz5d-YIMOiXVhykL5UzWU");
    messaging.requestPermission().then(function() {    
        return messaging.getToken()
      
        // TODO(developer): Retrieve an Instance ID token for use with FCM.
        // ...
      })
      .then(function(token) {
        window.localStorage.setItem('fbtkClnt',token);
        // console.log(token)
      })
      .catch(function(err) {
        console.log('Unable to get permission to notify.', err);
      });
  
    messaging.onMessage(function(payload) {
      if(payload.notification && payload.notification.title === 'TokenActive'){
      
      }
      else if(payload.notification && payload.notification.title === 'TokenException'){
           
      }
    });
  }
  
  



  var swRegistration = null;
  var isSubscribed = null;      
  let deferredPrompt;

  var btnAdd = null
  if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js').then(function(swReg) {
      swRegistration = swReg;      
      AddToHomeScreenEvnt();
      //displayNotification();
      if (Notification.permission === "granted") {
        /* do our magic */
      } else if (Notification.permission === "blocked") {
       /* the user has previously denied push. Can't reprompt. */
      } else {
        Notification.requestPermission(function(status) {
          console.log('Notification permission status:', status);
        });
      }

  })
}




function AddToHomeScreenEvnt() { 
  window.addEventListener('beforeinstallprompt', function (e) {
    console.log('beforeinstallprompt',e)
    deferredPrompt = e; 
    addToHomeScreen(); 
  }); 
} 



function addToHomeScreen() { 
  var a2hsBtn = document.querySelector(".ad2hs-prompt");
   // hide our user interface that shows our A2HS button 
  if(a2hsBtn){
    a2hsBtn.style.display = 'none'; 
  } 
  // Show the prompt 
  deferredPrompt.prompt(); 
  // Wait for the user to respond to the prompt 
  deferredPrompt.userChoice.then(function(choiceResult){
    if (choiceResult.outcome === 'accepted') { 
      console.log('User accepted the A2HS prompt'); 
    } else { 
      console.log('User dismissed the A2HS prompt'); 
    } 
    deferredPrompt = null;
  }); 
} 



/*
    
  function initialiseUI() {
    window.addEventListener("beforeinstallprompt", function(e) { 
      // log the platforms provided as options in an install prompt 
      e.preventDefault();
      // Stash the event so it can be triggered later.
      deferredPrompt = e;
      deferredPrompt.prompt();


      console.log(deferredPrompt)
      document.querySelector('data-add-home-screen')

      btnAdd = document.querySelector('[data-add-home-screen=true]');        
      btnAdd && btnAdd.addEventListener('click', (e) => {
        // hide our user interface that shows our A2HS button
        //btnAdd.style.display = 'none';
        // Show the prompt
        
      });


      deferredPrompt.prompt();
        // Wait for the user to respond to the prompt
      deferredPrompt.userChoice
        .then((choiceResult) => {
          if (choiceResult.outcome === 'accepted') {
            console.log('User accepted the A2HS prompt');
          } else {
            console.log('User dismissed the A2HS prompt');
          }
          deferredPrompt = null;
        });


      e.userChoice.then(function(outcome) { 
        console.log(outcome); // either "accepted" or "dismissed"
      }, console.log(''));         
    });



  }


*/



}





/*



export function initSocket() {




  socket = io(_Util.geturlBase());
  socket.emit("initObs",{})







    socket.on("InventoryUpdated", data => {
      //console.log("InventoryUpdated", data)  
      if(!socketR[data.id]){
        socketR[data.id] = 1;
        let inView = _Util.getViewActive();
        if(inView===3){
          loadStockProductInv();
        }
        else if(inView===1){
          let Qry2Inv = {
            query:"getStockProductQvaMarket",
            params:{
              isPublic:true
            },
            fields:[
              "id","name","salePrice","isPublic","unit","imageUrl","ignoreStock"
            ]
          };
          loadStockProduct(Qry2Inv,getDispatch());
        }
        else if(inView===2){
          const searchHash = window.location.hash.split('?')[1]?window.location.hash.split('?')[1]:null;
          const router = _Util.parseQuery(searchHash);
          let Qry2 = {
            params:{
              id:router.prodId
            },
            query:"getQueryProductsID",
          };
          fetchProductsID(Qry2,getDispatch());
        }
      }
    })





    socket.on("isPublicUpd", data => {  
     
      if(!socketR[data.id]){
        socketR[data.id] = 1;
        let fields = [
          "id","name","salePrice","isPublic","unit","imageUrl","ignoreStock","categoryID",{N:"stock",f:["amount", "stock", "stockIn", "stockOut"]}
        ];
        let _userId = _Util.getProfileId();
        let Qry2Inv = {
          query:"getStockProductQvaMarket",
          params:{
            showInventory:true,
            providerId:_userId,
          },
          arraySerialization: _Util.isArraySerialization(),
          fields:fields
        };

        loadStockProduct(Qry2Inv,getDispatch());
      }
    })





    socket.on("updateMovements", data => {
      console.log(data.id)
      console.log(socketR)
      if(!socketR[data.id]){
        socketR[data.id] = 1;
        console.log(socketR[data.id])
        let inView = _Util.getViewActive();
        console.log(data, inView)
        if(inView===8){
          loadMovs();
        }
        else if(inView===9){
          fetchMovId();
        }
      }
    })


    socket.on("addMovements", data => {
      if(!socketR[data.id]){
        socketR[data.id] = 1;
        let inView = _Util.getViewActive();
        if(inView===8){
          loadMovs();
        }
      }
    })

}





export function initWebSocketClient() {  

    const client = new WebSocket('ws://localhost:8958/');



    //const client = new WebSocket('ws://qvamarket.com:4060/');


    client.on('open', ()=>{
      console.log("conected");
    });

    client.on('message', data => {
      console.log("message", data)
    });


    client.on('close', function clear() {
      console.log("close",)
    });

}








*/