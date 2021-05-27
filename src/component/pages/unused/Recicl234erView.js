

import React, { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import loadable from '@loadable/component'



import { withRouter, NavLink} from 'react-router-dom';

import {  OpenWatchDialog, fetchCities, fetchRemesa, OpenModal, loadStockProduct, OpenToast, CloseModal } from '../../actions/common'



import * as _Util from '../../store/Util'

import * as PdfRpt from '../../store/printDoc'

import '../_styles.css'


// import '../deleteAlertMov'


/*
const InputText = loadable(() => import('../InputText'))

const InputAutocomplete = loadable(() => import('../InputAutocomplete'))

const MoreInfoButton = loadable(() => import('../MoreInfoButton'))

const TabsHRM = loadable(() => import('../tabsHRM'))
*/



const PaymentSlideUp = loadable(() => import('../paymentSlideUp'))


const BTNH = _Util.BTNH_Cmpt();

const Icon2 = _Util.Icon_Cmpt();

const DeleteAlertMov = _Util.deleteAlertIngredient_Cmpt();

const SearchInput =  _Util.SearchInput_Cmpt();

const ModalDate =  _Util.ModalDate_Cmpt();

const ScrollDc =  _Util.ScrollDc_Cmpt();

const CheckBoxSlide =  _Util.CheckBoxSlide_Cmpt();

const InputAutocomplete = _Util.InputAutocomplete_Cmpt(); 




const useObserveChanges = () => {
  const observeChanges =  useSelector(state => state.observeChanges);
  const dispatch = useDispatch(); 


  const _openMd = (_id, item) => {
    let data = {};
    data['zIndex']=450;
    data['Id']=_id;
    data['observeResize']=true;    
    data['props']={item:item, minHeight: '1vh'};
    data['content']=<PaymentSlideUp />;
    OpenWatchDialog(dispatch,data);
  }

  const _LoadCities= (q) => {
    fetchCities(q,dispatch);
  }

  const _updRemesa= (q,fNm) => {
    fetchRemesa(q,dispatch,fNm);
  }

  const LoadUA = async (dis) => {
    let flds = ["id","name","email","isqvmAgent", "isAdmin"]
    let QryUser = {
      query:"getQueryUsersDetails",
      params:{userId:_Util.getUAd()},
      Collection:"Users",
      arraySerialization: _Util.isArraySerialization(),
      fields:flds,
    };
    const res = _Util.fetchStream_movie_data(_Util.get_GRAPHQLURL(),QryUser);
    const td = await res;
    if(td){
      let dZs = _Util.isArraySerialization()?_Util.deZerialize2Array(td,flds,1):td;
      _Util.updStore('agentsList',dZs);
      dispatch({
        type: 'UPD_KEY_VALUE',
        kv:{key:'observeChanges',value:_Util.gen12CodeId()}
      })
    }
  }
  
  
  return { 
    observeChanges,
    _LoadCities,
    dispatch,
    LoadUA,
    _updRemesa,
    _openMd
  }
}





const useObserveForms = () => {
  const observeForms =  useSelector(state => state.observeForms);
  const dispatch = useDispatch(); 


  const _updFormObs = (q,operation) => {
    dispatch({
      type: 'UPD_KEY_VALUE',
      kv:{key:'observeForms',value:_Util.gen12CodeId()}
    })
  }
  

 
  return { 
    _updFormObs,
    observeForms
  }
}

  

/*

Inversion:
407891.90

COMBO:
253176.84
Inventario Actual: 
144731.68


407891.90 - 253176.84 - 144731.68

diferencia entre lo que hemos comprado lo que hemos entregado y lo que queda de mercancias : 9,983.38

*/







const _formName = 'mov_list_search';


const calcMov = async (dispatch,mm) => {
    _Util.updStore('movements',mm);
    let done = {};
    let pending = {};
    let total = 0;
    const _form = _Util.getFormStore(_formName) || {};
    let qry = _form["search"];
    let dateQ = _form["date"];

    let pnOrStMk = {};

    _Util.ObjectKeys(mm).map((mv,ii)=>{

      let isValid = false;
      let type = mm[mv]["type"];
      if(qry || dateQ){
        let _qr = qry && qry.toLowerCase()?qry.toLowerCase():"";
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
        if(mm[mv]["IsDelivery"]){
          done[mv] = mm[mv];
          if(type==="COMBO" || type==="INVESTMENT_FOOD"){
            let prdDtls =mm[mv] && mm[mv]["prdDtls"] ;
            //let prodsL =prdDtls && prdDtls["products"];
            //let prodNm = prodsL && _Util.ObjectKeys(prodsL).length;
            let am = mm[mv]["amount"] * mm[mv]["tasa"]
            if(prdDtls && prdDtls["total"]>0){
              am = prdDtls["total"];
            }    
            
            if(type==="COMBO"){
              if(qry || dateQ){
                if(am>1){
                 // am = am *-1;
                }
                console.log(am)
                total += !isNaN(am *-1) && (am *-1);
              }
            }
            else{
              total += !isNaN(am *-1) && (am *-1);
            }
          }
          else{
            let am = mm[mv]["amount"] * mm[mv]["tasa"]
            let bF = balanceFactor(type,am);             
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


    console.log(total,"total")

    let doneS = _Util.sortObjectsByKey(done,"date",false);
    let pendingS = _Util.sortObjectsByKey(pending,"date",false);
    _Util.updStore('movementsDone',doneS);
    _Util.updStore('movementsPending',pendingS);
    _Util.updStore('balanceM',total);
    _Util.updStore('pnOrStMk',pnOrStMk);
    doneS = null;
    pendingS = null;
    done = null;
    pending = null;
    mm = null;
  
    dispatch({
      type: 'UPD_KEY_VALUE',
      kv:{key:'observeChanges',value:_Util.gen12CodeId()}
    })
}


const loadMovs = async (dispatch,userId) => {
  let stt = (new Date()).getTime();
  let fields = [ 
    "id",
    "agentId",
    "userID",
    "cartProd",
    "orderId",
    "amount","tasa","type",
    "date","isPaid","IsDelivery",
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

  


  // agentDestinationDetails: {id: "100423251445483156428", name: "Jorge Besil", email: "jbesil92@gmail.com"}
 

let arraySerialization = _Util.isArraySerialization();

  let Qry2Inv = {
    query:"getQueryMovementsbyAgent",
    fields:fields,
    arraySerialization: arraySerialization,
    params:{
      userId:userId,
      // updDelivery:true
      //userId:_Util.getUserAgent(),
    }
  };
  const res = _Util.fetchStream_movie_data(_Util.get_GRAPHQLURL(),Qry2Inv);
    const td = await res;
    
    if(td){
      let dZs = arraySerialization?_Util.deZerialize2Array(td,fields,1):td;

      calcMov(dispatch,dZs);
    }
}


























const SendersComponent = (props) => {
  const {
    dispatch,
    LoadUA
  } = useObserveChanges();

  const {
    _updFormObs
  } = useObserveForms();
  


  let _state = _Util.getStore();
  let keys = _Util.getGlobalsKeys()
  _state["keys"] = keys;

  const _form = _Util.getFormStore(_formName) || {};

  let _userId = _Util.getProfileId();
  let pnOrStMk = _state["pnOrStMk"];

  

  const [initialize, setInitialize] = useState(false);

  const [widthScreen, setWidthScreen] = useState(null);

  const [view, setView] = useState(false);

  const [viewTypeMov, setViewTypeMov] = useState(1);

  
  const [range, setRange] = useState(24);

  const [searchQ, setSearch] = useState("");

  const [searchA, setSearchA] = useState("");

  const [viewAgents, setViewAgents] = useState(false);


  const [obs, setObs] = useState(0);


 



  let outerWidth = _state["outerWidth"];
  
  let agentId = _state["agentId2"];


  let _usAg = agentId || _userId;


  /// _usAg = _Util.getUserAgent();
  




  useEffect(() => {  
    if(widthScreen!==outerWidth){
      setWidthScreen(outerWidth);
    } 
    if(!initialize){
      setInitialize(true);
      _Util.updViewActive(8);

      if(_Util.IsAdmin()){
        LoadUA();
      }
      
      let Qry2Inv = {
        query:"getStockProductQvaMarket"
      };
      loadStockProduct(Qry2Inv,dispatch);

      
      loadMovs(dispatch,_usAg);


      setTimeout(()=>window.scrollTo(0,0),350);
      setTimeout(()=>setView(true),50);
      window.localStorage.setItem("lng","es");
    }
  });
  



  
 
let userA = _Util.getBrowser();
  
let isMobile = userA.os === "Android" || userA.os === "iPhone" || _state["outerWidth"]<550 ;


var _movementsL = _state["movementsDone"];

let _movements2Show = _Util.groupbyTab(_movementsL,range);


var _movementsP = _state["movementsPending"];
var balance = _state["balanceM"];



let _movementsPShow = _Util.groupbyTab(_movementsP,range);


const changeView = (i) => {
  if(i===viewTypeMov){
    setViewTypeMov(null)
  }else{
    setViewTypeMov(i)
  }
  window.scrollTo(0,0);
}


const Printorders = () => {
  PdfRpt.PrintPendingOrders(pnOrStMk)
}


const PrintResume = () => {
  let td = _state["movements"];
  PdfRpt.PrintResume(td)
}


const searchMov = (i) => {
    let td = _state["movements"];
    let frm =  _form;
    frm["search"] = i;
    _Util.updFormStore(_formName,frm);
    //setObs(_Util.gen16CodeId());
    calcMov(dispatch,td);
}


let agentsList = _state["agentsList"] || {};
let agentsListArr = [];
let agentRcv = {}
if(_Util.IsAdmin()){
  if(_Util.IsAdmin() && searchA && searchA.length>0){
    agentsList = searchb(_state["agentsList"],searchA);
    agentsListArr = _Util.ObjectKeys(agentsList) || [];
  }
  agentRcv = agentsList && agentsList[_usAg];
}

const clearFilters = () => {
  _Util.updFormStore(_formName,{});
  let td = _state["movements"];
  calcMov(dispatch,td);
  //setObs(_Util.gen16CodeId());
}

const confirmAgentId = (v) => {
  _Util.updStore('agentId2',v);
  setSearch(null);
  setViewAgents(0)
  loadMovs(dispatch,v);
}

const callBackDate= (f,v) => {
  let dD = new Date(v);  
  let _formD = _Util.getFormStore(_formName) || {};
  let frm =  _formD;
  frm[f] = dD.getTime();
  _Util.updFormStore(_formName,frm)
  setObs(_Util.gen16CodeId());
  // let i = _form && _form["search"];
  let td = _state["movements"];
  calcMov(dispatch,td);
}


const OpenModalDate = (i) => {
    let data = {};   
    let _formD = _Util.getFormStore(_formName) || {};
    let  _date = _formD && _formD[i];
    data['zIndex']=190;
    data['observeResize']=true;
    data['props']={title:"", item:i};
    data['content'] = <ModalDate valueUpdate={(e)=>callBackDate(i,e)} initValue={_date}/>; 
    OpenModal(dispatch,data);
  }


let keyCodes =   _Util.getGlobalsKeys();


let agentsQva = {};
if(_Util.IsAdmin() && searchA && searchA.length>0){
  agentsQva = searchAgents(_state["agentsList"],searchA);
}else{
  agentsQva = searchAgents(_state["agentsList"],"");
}



const updArraySerialization = (i) => {
  _Util.updArraySerialization(i);
  setObs(_Util.gen12CodeId())
}


/*

  <div  className={`in_stock_switch_btn`}>
    <CheckBoxSlide initvalue={_Util.isArraySerialization()} keyCode={73} updChange={(e)=>updArraySerialization(e)}/>
  </div>

*/



    return (
      <>
        <style>
        {`
        .palette{
          --base-color: rgb(21, 100, 191,1);
          --base-color-gradient: 21, 100, 191;
        }

        `}
        </style>
        <div className={` palette formContainer shopping_cart  _movements ${isMobile?"is_mobile":""}`} style={{opacity:view?1:0}} >
                
            <div className={`formContainer `} style={{opacity:1}}>
                {view?
                <div className={`centerListCardProd `}> 
                    {_Util.IsAdmin() ?
                      <div className={`paddField address`}>
                        <InputAutocomplete 
                          icon={`more_vert`} 
                          form={"kjsahfashflkashjaf"} 
                          field={`agentId`}  
                          keyCode={49} 
                          background={`#f9f9f9`}
                          color={`var(--base-color)`}
                          placeholder={_Util.translatetext(13)}
                          OnSelect={(e)=>confirmAgentId(e.id)}
                          data={agentsQva}
                          OnChange={(e)=>setSearchA(e)}
                        />
                      </div>
                    :null}



                   

                  <div className={`  headerTtl`}>
                        <div className={`pym81b sendBx `}>
                            <div className={`subtotal_cart `}>
                                {_Util.translatetext(50)}
                            </div>
                            <div className={`total_cart ${balance>0?"pos":"neg"}`}>
                              {`$ ${balance?balance.toFixed(2):0}`}
                              <div className={`sendBtn`}>
                              </div>
                            </div>
                        </div>
                      </div>
                      {pnOrStMk && _Util.ObjectKeys(pnOrStMk).length>0?                      
                      <div className={`pym81b sendBx mov_type _dsplFlx activeBlue`} onClick={()=>Printorders()}>
                        <div className={`icon_mov`}>
                          <Icon2 name={`printer`} />
                        </div>
                        <div className={`mov_type_title `}>
                          {_Util.translatetext(51)}
                        </div>
                      </div>
                      :null}


                      <div className={` _filter_mv`}>
                        <div className={` _search_MrgV  `} >
                          <SearchInput updChanges={searchMov} placeholderCode={20}/>
                        </div>
                        <div className={`_dsplFlx spaceAround _flxWrp icon_clear`}>
                          <div className={`fieldPadding _MrgV`}>
                            <span onClick={()=>OpenModalDate( `date` )}>
                              <BTNH theme={`light_blue`} title={_form && _form["date"]?_Util.parseDate(_form["date"]):_Util.parseDate(_Util.gTm())}/>
                            </span>
                          </div>
                          <div  onClick={()=>clearFilters( )}>
                            <Icon2 name={`outline_delete`} />
                          </div>
                          <div  onClick={()=>PrintResume( )}>
                            <Icon2 name={`printer`} />
                          </div>
                        </div>
                      </div>
                      
                      <div className={` sendBx scroll3Wrp `} >
                        <div className={`pym81b sendBx mov_type _dsplFlx pending`} onClick={()=>changeView(1)}>
                          <div className={`icon_mov`}>
                            <Icon2 name={`timer_outline`} />
                          </div>
                          <div className={`mov_type_title`}>
                            {_Util.translatetext(52)}
                          </div>
                          <div className={`flexSpace`}/>
                          <div>
                            <Icon2 name={viewTypeMov === 1?`arrow_drop_down`:`arrow_drop_up`} />
                          </div>
                        </div>
                        <div className={`formContainer `} style={{opacity:viewTypeMov === 1?1:0}}>
                        {viewTypeMov === 1?
                        <div className={`_dsplFlx space2Around _flxWrp op4oU`}>
                        {
                          _movementsPShow &&_movementsPShow.map((fV,i)=>{
                            return(
                              <RecyclerView data={fV} ind={i} key={`${keyCodes[i]}_${i}_pend_Mov`} range={range} updRange={(v)=>setRange(v)}/>
                            )
                        })}
                        </div>
                        :null}
                      </div>

                      <div className={`pym81b sendBx mov_type _dsplFlx complete`} onClick={()=>changeView(2)}>
                          <div className={`icon_mov`}>
                            <Icon2 name={`success`} />
                          </div>
                          <div className={`mov_type_title `}>
                            {_Util.translatetext(53)}
                          </div>
                          <div className={`flexSpace`}/>
                          <div>
                            <Icon2 name={viewTypeMov ===2?`arrow_drop_down`:`arrow_drop_up`} />
                          </div>
                        </div>
                        <div className={`formContainer `} style={{opacity:viewTypeMov ===2?1:0}}>
                        {viewTypeMov === 2?
                        <div className={`_dsplFlx space2Around _flxWrp op4oU`}>
                        {
                          _movements2Show &&_movements2Show.map((fV,i)=>{
                            //let stck = _movements2Show[fV];
                            return(
                              <RecyclerView data={fV} ind={i} range={range} key={`${keyCodes[i]}_${i}_cmpl_Mov`} updRange={(v)=>setRange(v)}/>
                            )
                        })}
                        </div>
                        :null}
                        </div>
                      </div>
                    </div>:null}
                  </div>
                  <div  className={`footSpace`}/>
          </div>
      </>
    );
  
}  





export default withRouter(SendersComponent)




function searchAgents(o,q){
  let rrs = {}
  _Util.ObjectKeys(o).map(k=>{
    if(o[k]["isqvmAgent"] || o[k]["isAdmin"]){
      if(q){
        let qLw = q && q.toLowerCase();
        let nLw = o[k]["name"] && o[k]["name"].toLowerCase();
        if(qLw && nLw && nLw.indexOf(qLw)>=0){
          rrs[k] = o[k]
        }
      }else{
        rrs[k] = o[k]
      }
    }
  })
  return rrs;
} 







const RecyclerView = (props) => {

  const {
    data, ind, range, dataObj
  } = props;

  const [initialize, setInitialize] = useState(false);

  const _scrollhandler = (sc) => {
    if(!initialize){
      let cmp =document.getElementById(ind+"_gpr_"+ind);
      if(cmp){
        let dm =_Util.offset(cmp);
        var _top = dm.top;
        let delay = 1600;
        if(_top>=sc-100 && _top<=(sc+window.innerHeight)+(sc>500?delay:0)){
          setInitialize(true);
          props.updRange(range + 12);
        }
      }
    }
  }


  return (    
    <div id={ind+"_gpr_"+ind} style={{minHeight:"100px"}}>
    {initialize?
      <div className={``}>
        {data.map((_grTGid,_grTGid_ind)=>{
          return (
            <ItemComponent mvId={_grTGid}  key={_grTGid_ind+"k_mV"}/>
          )
        })}
      </div> 
      : 
      <ScrollDc   scrollhandler={_scrollhandler} /> 
    }  
    </div>                                   
  )

}







const ItemComponent = (props) => {

  const {
    dispatch
  } = useObserveChanges();


  const {
    mvId
  } = props;

let _state = _Util.getStore();

var _movements = _state["movements"];


let item =_movements && _movements[mvId];


let _id =item && item["id"];

let prdDtls =item && item["prdDtls"] ;
let prodsL =prdDtls && prdDtls["products"];
let prodNm = prodsL && _Util.ObjectKeys(prodsL).length;



let tt =item && item["amount"] * item["tasa"]?item["amount"] * item["tasa"]:0

if(prodNm){
  tt =prdDtls["total"];
}


let hasDate = item && _Util.date2pretyfy(item["date"]) ;

let name = item && `${item["type"]}`

let dest = item && item["receiver"] && item["receiver"]["name"];


if(item){
  if(item["type"]==="COMBO"){
    name = `${item["type"]} `
    tt = 0;
  }
  else if(isEntrega(item["type"])){
    name =  `REMESA`
  }
  else if(item["type"]==="INVESTMENT_FOOD" || item["type"]==="INVESTMENT_INGREDIENTS"){
    name =  `INVERSION`
  }
  else if(item["type"]==="BTC"){
    name =  `BTC - ${item["amount"]}`
  }
  else if(item["type"]==="TRANSFER"){
    dest =  item["agentDestinationDetails"] && item["agentDestinationDetails"]["name"];
  }
}

const _openDtls = (sc) => {
  _Util.updStore('movementsDetails',item);
}

let isPaid = item && item["isPaid"];



const Confirm = async (modalID) => {
  let Qry2Inv = {
    query: "deleteByMovements",
    params:{id:_id},
  };
  const res = _Util.fetchStream_movie_data(_Util.get_GRAPHQLURL(),Qry2Inv);
  const td = await res;
  if(td){
    loadMovs(dispatch);
    CloseModal(dispatch,{id:modalID});
  }
}



const removeM = () => {
  let data = {};
  data['zIndex']=450;
  data['observeResize']=true;    
  data['props']={item:_id, minHeight: '190px',title:"Desea Eliminar este Ingrediente"};
  data['content']=<DeleteAlertMov confirm={Confirm} />;
  OpenModal(dispatch,data);
}


const upd_isPaid = async (r) => {
  let QryR = {
    params:{
      id: item["id"],
      agentId: item["agentId"],
      isPaid: !isPaid
    },
    query:"updateIsPaidMovement"
  };
  const res = _Util.fetchStream_movie_data(_Util.get_GRAPHQLURL(),QryR);
  const isP = await res;
  let td = _movements;
  td[item["id"]] = item;
  td[item["id"]]["isPaid"] = isP;
  calcMov(dispatch,td);
}




let classTyp =  "";
let iconTyp =  "";

if(item){
  classTyp =  item["type"]==="Entrega"?"_Rem":item["type"]==="BTC"?"_btc":item["type"]==="COMBO"?"_cmb":item["type"]==="INVESTMENT_FOOD"?"_investFood":item["type"]==="INVESTMENT_INGREDIENTS"?"_investFood":item["type"]==="DEBT"?"_debt":item["type"]==="TRANSFER"?"_trnsfr":"";
  iconTyp =  item["type"]==="Entrega"?"money_outline":item["type"]==="BTC"?"btc_circle":item["type"]==="COMBO"?"food_variant":item["type"]==="INVESTMENT_FOOD"?"shopping_outline":item["type"]==="INVESTMENT_INGREDIENTS"?"shopping_outline":item["type"]==="DEBT"?"bank_outline":item["type"]==="TRANSFER"?"bank_transfer":"";

}



const sendNotification = async () => {
  let QryR = {
    params:{
      id: item["id"],
      agentId: item["agentId"]
    },
    query:"sendNotificationByAgent"
  };
  const res = _Util.fetchStream_movie_data(_Util.get_GRAPHQLURL(),QryR);
  const isP = await res;
  if(isP){
    let agentsList = _state["agentsList"] && _state["agentsList"][item["agentId"]] && _state["agentsList"][item["agentId"]]["name"];
    let toast = {
      text:`Order ${item["id"]} sent to ${agentsList}`
    }
    OpenToast(dispatch,toast)
  }
}




let _nM =  (item && item.orderId) ||  (item && item.id);

return (
  <div className="xwW5Ce u3mD2d " >
    <div className="m18Ex  u3mD2d xwW5Ce">
        <div className=" u3mD2d xwW5Ce brdBt_ShopCart  movementsList">
          <article className="u3mD2d xwW5Ce u3mRow spaceAround">
            <div className="_dsplFlx  itm_ShopCart">
              <div className="egZxgf pqv9ne b7mrgL">
                <div className={` mov_type _dsplFlx SmlB ${classTyp}`} >
                    <div className={`icon_mov`}>
                      <Icon2 name={iconTyp} />
                    </div>
                    <div className={`mov_type_title `}>
                      {name}
                    </div>
                    <div className={`flexSpace`}/>   
                    <div className={`orderId_mv_itm `}>
                      {_nM}
                    </div>                 
                </div>
                <div className="_dsplFlx mov_det">
                  <div className="date">{hasDate}</div>
                  <div className={`flexSpace`}/>
                  <div className="egZxgf pqv9ne priceinDesktop">
                    <div className="egZxgf pqv9ne">
                      <div className="DX0ugf ApBhXe _dsplFlx">
                        <span className="unitlbl mrkPl">{tt && tt.toFixed(2)}</span>
                        <div className={`flexSpace`}/>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="recvr">{dest}</div>
                <div className={`sendBtn _dsplFlx mov_actions`}>
                  <div className={`flexSpace`}/>
                  <div className={`sendBtn _dsplFlx spaceAround`}>
                    {_Util.IsAdmin()?
                    <div className={`fieldPadding _MrgV _actBtnMg`} >
                      <span onClick={()=>removeM()}>
                        <BTNH theme={`fire_brick`} title={ _Util.translatetext(68)}/>
                      </span>
                    </div>
                    :null}
                    {_Util.IsAdmin() && !_state["IsDelivery"]?
                    <div className={`fieldPadding _MrgV _actBtnMg`}>
                      <span onClick={()=>upd_isPaid()}>
                        <BTNH theme={isPaid?`light_green`:``} title={isPaid?_Util.translatetext(69):_Util.translatetext(70)}/>
                      </span>
                    </div>
                    :null}

                    <div className={`fieldPadding _MrgV _actBtnMg`}>
                      <span>
                      <NavLink  to={{pathname:"/mov_details",search:"?movId="+ _id}} className=" u3mD2d xwW5Ce" onClick={_openDtls}>
                          <BTNH theme={`light_blue`} title={ _Util.translatetext(71)}/>
                      </NavLink>
                      </span>
                    </div>
                    {_Util.IsAdmin() && !_state["IsDelivery"]?
                    <div className={`fieldPadding _MrgV _actBtnMg`}>
                      <span onClick={()=>sendNotification()}>
                        <div className={`icon_mov _icon_telegram_notf`}>
                          <Icon2 name={"telegram"} />
                        </div>
                      </span>
                    </div>
                    :null}
                  </div>
                </div>
              </div>
            </div>
          </article>
        </div>   
      </div>
    </div>

  )

}




/*


export function sortObjectsByKey(obj,_key,order) {
  let _list = ObjectKeys(obj);
  let arrSrt = _list.sort(function(a, b) {
    let objA = obj[a];
    let objB = obj[b]          
    if(order==="desc"){
      if(objA[_key] < objB[_key]) { return -1; }
      if(objA[_key] > objB[_key]) { return 1; }
    }else{
      if(objA[_key] > objB[_key]) { return -1; }
      if(objA[_key] < objB[_key]) { return 1; }
    }
    return 0;
  })
  return arrSrt;
}

*/

const isEntrega = (type) => {
  return type === "Entrega" || type === "REM_CARD_CUP" || type === "REM_CARD_MLC" || type === "REM_CASH_USD" || type === "REM_CASH_CUP" || type === "COMBO";
}

const balanceFactor = (type,am) => {
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
  else if (type ==="BTC" || type ==="TRANSFER" || type ==="ADJUSTMENTS"  || type ==="DEBT"  || type ==="COMISION_AGENT") {
    return 1;
  }
  else if (type ==="COMBO") {
    return 0;
  }
  else{
    return 0
  }
}



function searchb(o,q){
  let rrs = {}
  _Util.ObjectKeys(o).map(k=>{
    let qLw = q && q.toLowerCase();
    let nLw = o[k]["name"] && o[k]["name"].toLowerCase();
    if(qLw && nLw && nLw.indexOf(qLw)>=0){
      rrs[k] = o[k]
    }
  })
  return rrs;
} 






/*



                  {_Util.IsAdmin()?
                  <>
                  {!viewAgents?
                  <div className={`shopping_cart receivers`} >
                    <div className={`pym81b sendBx receiversItm `}>
                        <div className={`total_cart `}>
                            <div>
                            {agentRcv && agentRcv["name"]}
                            </div>
                        </div>
                        <div className={`subtotal_cart `}>
                            <div>
                            {agentRcv && agentRcv["email"]}
                            </div>
                        </div>
                        <div className={`sendBtn _dsplFlx spaceAround`}>
                          <div className={`fieldPadding _MrgV`} style={{ marginTop: "10px"}}>
                          </div>
                          <div className={`fieldPadding _MrgV`} style={{ marginTop: "10px"}}>
                            <span onClick={()=>setViewAgents(1)}>
                              <BTNH theme={`light_blue`} title={`Escoger Agente`}/>
                            </span>
                          </div>
                        </div>
                    </div>
                  </div>
                  :
                  <div className={`shopping_cart receivers`} >
                    <div className={`paddField address`}>
                      <InputText 
                        icon={`more_vert`} 
                        form={_formName} 
                        field={`agentId`}  
                        keyCode={15} 
                        placeholder={`Agent`} 
                        background={`#f9f9f9`}
                        color={`var(--base-color)`}
                        OnChange={(e)=>setSearchA(e)}
                        initvalue={searchA}
                      />
                    </div>
                    <div className={`_dsplFlx spaceAround _flxWrp `}>
                      {agentsListArr && agentsListArr.map(rcvL=>{
                        let Itm = agentsList[rcvL];
                        let nmF = Itm && Itm["name"].split(' ')[0];
                        return(
                          <div className={`pym81b sendBx receiversItm `}>
                              <div className={`total_cart `}>
                                  <div>
                                  {Itm && Itm["name"]}
                                  </div>
                              </div>
                              <div className={`subtotal_cart `}>
                                  <div>
                                  {Itm && Itm["email"]}
                                  </div>
                              </div>
                              <div className={`sendBtn _dsplFlx spaceAround`}>
                                <div className={`fieldPadding _MrgV`} style={{ marginTop: "10px"}}>
                                </div>
                                <div className={`fieldPadding _MrgV`} style={{ marginTop: "10px"}}>
                                  <span onClick={()=>confirmAgentId(rcvL)}>
                                    <BTNH theme={`light_blue`} title={`Asignar a ${nmF}`}/>
                                  </span>
                                </div>
                              </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  }
                  </>
                  :null}


*/