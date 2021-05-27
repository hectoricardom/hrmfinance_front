

import React, { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'


import { withRouter, NavLink} from 'react-router-dom';

import {  OpenWatchDialog, fetchCities, fetchRemesa, OpenModal, loadStockProduct, OpenToast, calcMov } from '../../../actions/common'



import * as _Util from '../../../store/Util'

import * as PdfRpt from '../../../store/printDoc'

import '../../_styles.css'



const RecyclerView = _Util.RecyclerView_Cmpt(); 

const MovementItem = _Util.MovementItem_Cmpt(); 


const BTNH = _Util.BTNH_Cmpt();

const Icon2 = _Util.Icon_Cmpt();

const SearchInput =  _Util.SearchInput_Cmpt();

const ModalDate =  _Util.ModalDate_Cmpt();
/*

const DeleteAlertMov = _Util.DeleteAlertMov_Cmpt();



const ScrollDc =  _Util.ScrollDc_Cmpt();

const CheckBoxSlide =  _Util.CheckBoxSlide_Cmpt();

const InputAutocomplete = _Util.InputAutocomplete_Cmpt(); 
*/



const useObserveChanges = () => {
  const observeChanges =  useSelector(state => state.observeChanges);
  const dispatch = useDispatch(); 


  const _openMd = (_id, item) => {
    let data = {};
    data['zIndex']=450;
    data['Id']=_id;
    data['observeResize']=true;    
    data['props']={item:item, minHeight: '1vh'};
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







const _formName = 'mov_list_search';



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


                      <div className={`_dsplFlx space2Around _flxWrp op4oU`}>
                        {
                          _movementsPShow &&_movementsPShow.map((fV,i)=>{
                            return(
                              <RecyclerView 
                                data={fV} 
                                ind={i} 
                                key={`${keyCodes[i]}_${i}_pend_Mov`} 
                                range={range} 
                                updRange={(v)=>setRange(v)}
                                ItemComponent={MovementItem}
                                tag={"_mpnd_"}
                              />
                            )
                        })}
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




