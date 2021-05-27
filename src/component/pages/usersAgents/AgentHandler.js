

import React, { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'



import { withRouter} from 'react-router-dom';


import { 
  loadReceivers,
  OpenModal
} 
from '../../../actions/common'



import * as _Util from '../../../store/Util'

import '../../_styles.css'


const BTNH = _Util.BTNH_Cmpt();

const Icon2 = _Util.Icon_Cmpt();
const ScrollDc =  _Util.ScrollDc_Cmpt();
const InputText =  _Util.InputText_Cmpt();






const InputAutocomplete = _Util.InputAutocomplete_Cmpt(); 





const ModalDate =  _Util.ModalDate_Cmpt();









const _formName = "243876nt5fdgomwy"

const vldFlds2 = {
  amount:{reqired: true, number: true,minValue:10, maxValue:250000},
  agentId:{reqired:true},
  date:{reqired:true},
  tasa:{reqired: true, number: true, minValue:0.01, maxValue:1000},
}



const useObserveChanges = () => {
  const observeChanges =  useSelector(state => state.observeChanges);
  const dispatch = useDispatch(); 

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
    LoadUA,
    dispatch,
  }
}





const SendersComponent = (props) => {
  const {
    dispatch,LoadUA
  } = useObserveChanges();


  let _state = _Util.getStore();
  let keys = _Util.getGlobalsKeys()
  _state["keys"] = keys;

  

  const [initialize, setInitialize] = useState(false);

  const [widthScreen, setWidthScreen] = useState(null);

  const [view, setView] = useState(false);



  let outerWidth = _state["outerWidth"];

  const searchHash = window.location.hash.split('?')[1]?window.location.hash.split('?')[1]:null;
 

  let _userId = _Util.getProfileId();

  useEffect(() => {  
    if(widthScreen!==outerWidth){
      setWidthScreen(outerWidth);
    } 
    if(!initialize){
      setInitialize(true);
      
      if(!_Util.IsAdmin()){
        _state["route_history"].push({pathname:"/marketplace"})
      }else{
        LoadUA();
        loadReceivers(_userId,_userId,dispatch);
        setTimeout(()=>{
          window.scrollTo(0,0);
        },350);
        setTimeout(()=>setView(true),50);
        window.localStorage.setItem("lng","es");
      }
    }
  });
  

let userA = _Util.getBrowser();
  
let isMobile = userA.os === "Android" || userA.os === "iPhone" || _state["outerWidth"]<550 ;


const [searchQ, setSearch] = useState("");
const [searchA, setSearchA] = useState("");
const [searchD, setSearchD] = useState("");


const [viewRcv, setViewRcv] = useState(false);
const [viewAgents, setViewAgents] = useState(false);
const [viewADest, setViewADest] = useState(false);


const [receiverId, setReceiverId] = useState(false);
const [amount, setAmount] = useState(false);
const [rate, setRate] = useState(false);
const [agentId, setAgentId] = useState(_Util.getUserAgent());
const [agentDestination, setAgentDestination] = useState(null);



const confirmReceiverId = (v) => {
  setReceiverId(v.id);
  setViewRcv(0);
}


const confirmAgentId = (v) => {
  if(v && v.id){
    setAgentId(v.id);
    setSearch(null);
    setViewAgents(0)
  }
}

const confirmAgentDestinationId = (v) => {
  if(v && v.id){
    setAgentDestination(v.id);
    setViewADest(0)
  }
}


const addRemesa = async () => {
  let _2s = {};
  if(!_2s["date"]){
    _2s["date"] = (new Date()).getTime();
  }
  _2s["currency"] = "CUP";
  _2s["type"] = "Entrega";
  _2s["receiverId"] = receiverId;
  _2s["delivery"] = false;
  _2s["agentId"] = agentId?agentId:_Util.getUserAgent();
  _2s["amount"] = amount *-1;
  _2s["tasa"] = rate;
  let Qry = {
    form:_2s,
    fields:[
      "id","senderId","receiverId","agentId","amount","date","type"
    ],
    query:"upgradeMovements"
  };
  
  if(amount>0 && rate>0){
   const res = _Util.fetchStream_movie_data(_Util.get_GRAPHQLURL(),Qry);
    const td = await res;
    if(td){
      _state["route_history"].push({pathname:"/dashboard"})
    }
  }
}


  const addBTC = async () => {
    let _2s = {};
    if(!_2s["date"]){
      _2s["date"] = (new Date()).getTime();
    }
    _2s["type"] = "BTC";
    _2s["delivery"] = true;
    _2s["agentId"] = agentId?agentId:_Util.getUserAgent();
    _2s["amount"] = amount;
    _2s["tasa"] = rate;
    let Qry = {
      form:_2s,
      fields:[
        "id","senderId","receiverId","agentId","amount","date","type"
      ],
      query:"upgradeMovements"
    };
    
    if(amount>0 && rate>0){
      const res = _Util.fetchStream_movie_data(_Util.get_GRAPHQLURL(),Qry);
      const td = await res;
      if(td){
        _state["route_history"].push({pathname:"/dashboard"})
      }
    }
}

const addExpense = async () => {
  let _2s = {};
  if(!_2s["date"]){
    _2s["date"] = (new Date()).getTime();
  }
  _2s["type"] = "DELIVERY_EXPS";
  _2s["delivery"] = true;
  _2s["agentId"] = agentId?agentId:_Util.getUserAgent();
  _2s["amount"] = amount *-1;
  _2s["tasa"] = rate;
  let Qry = {
    form:_2s,
    fields:[
      "id","senderId","receiverId","agentId","amount","date","type"
    ],
    query:"upgradeMovements"
  };
  
  if(amount>0 && rate>0){
    const res = _Util.fetchStream_movie_data(_Util.get_GRAPHQLURL(),Qry);
    const td = await res;
    if(td){
      _state["route_history"].push({pathname:"/dashboard"})
    }
  }
}



const addTRANSFER = async () => {
  let _2s = {};
  if(!_2s["date"]){
    _2s["date"] = (new Date()).getTime();
  }
  _2s["type"] = "TRANSFER";
  _2s["delivery"] = true;
  _2s["agentId"] = agentId?agentId:_Util.getUserAgent();  
  _2s["agentDestination"] = agentDestination;
  _2s["amount"] = amount;
  _2s["tasa"] = rate;
  let Qry = {
    form:_2s,
    params:{"confirmTransfer":true},
    fields:[
      "id","senderId","receiverId","agentId","amount","date","type"
    ],
    query:"addMovementsTransfer"
  };
  if(agentDestination && amount>0 && rate>0){
    const res = _Util.fetchStream_movie_data(_Util.get_GRAPHQLURL(),Qry);
    const td = await res;
    if(td){
      _state["route_history"].push({pathname:"/dashboard"})
    }
  }
}

const _form = _Util.getFormStore(_formName) || {};







let agentsList = _state["agentsList"] || {}
let agentsListArr = [];
if(_Util.IsAdmin() && searchA && searchA.length>0){
  agentsList = searchAgents(_state["agentsList"],searchA);
  agentsListArr = _Util.ObjectKeys(agentsList) || [];
}else{
  agentsList = searchAgents(_state["agentsList"],"");
  agentsListArr = _Util.ObjectKeys(agentsList) || [];
}





let agentsDList = _state["agentsList"] || {}
let agentsListDArr = [];
if(_Util.IsAdmin() && searchD && searchD.length>0){
  agentsDList = searchAgents(_state["agentsList"],searchD);
  agentsListDArr = _Util.ObjectKeys(agentsDList) || [];
}



let agentRcv = agentsList && agentsList[agentId]

let agentDRcv = agentsList && agentsList[agentDestination]




  
let receiversList = _state["receiversList"] || {}
let receiversListArr = [];
if(_Util.IsAdmin() && searchQ && searchQ.length>0){
  receiversList = searchb(_state["receiversList"],searchQ);
  receiversListArr = _Util.ObjectKeys(receiversList) || [];
}

let currRcv = receiversList && receiversList[receiverId]





const callBackDate= (f,v) => {
  let dD = new Date(v);  
  let _formD = _Util.getFormStore(_formName) || {};
  let frm =  _formD;
  frm[f] = dD.getTime();
  _Util.updFormStore(_formName,frm)
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



        <div className={`palette  formContainer shopping_cart InfoM ${isMobile?"is_mobile":""}`} style={{opacity:view?1:0}} >
          <div className={`centerListCardProd `}> 
            <div className={`formContainer centerListCardProd `} style={{opacity:1}}>  
              <div className={` _flxWrp HRKRR`}>
                <div className={`paddField address`}>
                  <InputAutocomplete 
                    icon={`more_vert`} 
                    form={_formName} 
                    field={`agentId`}  
                    keyCode={49} 
                    background={`#f9f9f9`}
                    color={`var(--base-color)`}
                    placeholder={_Util.translatetext(13)}
                    //  validations={vldFlds2[`categoryID`]}
                    initvalue={_form["agentId"]}
                    OnSelect={(e)=>confirmAgentId(e)}
                    data={agentsList}
                    OnChange={(e)=>setSearchA(e)}
                  />
                </div>

                
                <div className={`paddField address`}>
                    <InputAutocomplete 
                      icon={`more_vert`} 
                      form={_formName} 
                      field={`receiver`}  
                      keyCode={29} 
                      background={`#f9f9f9`}
                      color={`var(--base-color)`}
                      placeholder={_Util.translatetext(14)}
                      //  validations={vldFlds2[`categoryID`]}
                      initvalue={_form["receiver"]}
                      OnSelect={(e)=>confirmReceiverId(e)}
                      data={receiversList}
                      OnChange={(e)=>setSearch(e)}
                    />
                  </div>


                  {agentId?
                  <div className={`paddField address`}>
                    <InputAutocomplete 
                      icon={`more_vert`} 
                      form={_formName} 
                      field={`agentIdDe`}  
                      keyCode={21} 
                      background={`#f9f9f9`}
                      color={`var(--base-color)`}
                      placeholder={_Util.translatetext(18)}
                      //  validations={vldFlds2[`categoryID`]}
                      initvalue={_form["agentIdDe"]}
                      OnSelect={(e)=>confirmAgentDestinationId(e)}
                      data={agentsDList}
                      OnChange={(e)=>setSearchD(e)}
                    />
                  </div>
                  :null}

                <div className={` _dsplFlx _flxWrp spaceAround`}>               
                  <div className={`paddField smallTxtIn`}>
                        <InputText 
                          icon={`more_vert`} 
                          form={_formName} 
                          field={`amount`}  
                          keyCode={26} 
                          background={`#f9f9f9`}
                          color={`var(--base-color)`}
                          placeholder={_Util.translatetext(15)} 
                          OnChange={(e)=>setAmount(e)}
                          validations={vldFlds2[`amount`]}
                          initvalue={_form["amount"]}
                        />
                      </div>
                      <div className={`paddField smallTxtIn`}>
                        <InputText 
                          icon={`more_vert`} 
                          form={_formName} 
                          field={`tasa`}  
                          keyCode={36} 
                          background={`#f9f9f9`}
                          color={`var(--base-color)`}
                          placeholder={_Util.translatetext(17)} 
                          OnChange={(e)=>setRate(e)}
                          validations={vldFlds2[`tasa`]}
                          initvalue={_form["tasa"]}
                        />
                      </div>
                      <div className={`paddField smallTxtIn`}>
                        <div className={`fieldPadding _MrgV`}>
                          <span onClick={()=>OpenModalDate( `date` )}>
                            <BTNH theme={`light_blue`} title={_form && _form["date"]?_Util.parseDate(_form["date"]):_Util.parseDate(_Util.gTm())}/>
                          </span>
                        </div>
                      </div>
                  </div>

                  <div className={`pym81b sendBx mov_type _dsplFlx btc_color `} onClick={()=>addBTC()}>
                    <div className={`icon_mov`}>
                      <Icon2 name={`btc`} />
                    </div>
                    <div className={`mov_type_title `}>
                      {`BTC`}
                    </div>
                    <div className={`flexSpace`}/>                    
                  </div>
                  



                  <div className={`pym81b sendBx mov_type _dsplFlx activeBlue `} onClick={()=>addRemesa()}>
                    <div className={`icon_mov`}>
                      <Icon2 name={`money_outline`} />
                    </div>
                    <div className={`mov_type_title `}>
                      {_Util.translatetext(27)}
                    </div>
                    <div className={`flexSpace`}/>                    
                  </div>  

                
                  <div className={`pym81b sendBx mov_type _dsplFlx _trnsfr `} onClick={()=>addTRANSFER()}>
                    <div className={`icon_mov`}>
                      <Icon2 name={`bank_transfer`} />
                    </div>
                    <div className={`mov_type_title `}>
                      {_Util.translatetext(28)}
                    </div>
                    <div className={`flexSpace`}/>                    
                  </div>


                  <div className={`pym81b sendBx mov_type _dsplFlx _dlvExp `} onClick={()=>addExpense()}>
                    <div className={`icon_mov`}>
                      <Icon2 name={`moped`} />
                    </div>
                    <div className={`mov_type_title `}>
                      {_Util.translatetext(104)}
                    </div>
                    <div className={`flexSpace`}/>                    
                  </div>
                </div>



                
              </div>
          </div>
        </div>
      </>
    );
  
}  



/*

return(
                              <div className={`_dsplFlx`}>
                                <div className={`_value`}>
                                  {prodItm && prodItm["name"]}
                                </div>
                                <div className={`flexSpace`}/>
                                <div className={`_value`}>
                                  {prodItm && prodItm["qty"]}
                                </div>
                                <div className={`_value`}>
                                  {prodItm && prodItm["unit"]?`(${prodItm["unit"]})`:""}
                                </div>
                                {viewUpdProd?    
                                <div className={`icon_mov`}  onClick={()=>updProduct(prId,hasProducts[prId])}>
                                  <Icon2 name={`success`} />
                                </div>
                                :null
                                }
                              </div>
                            )



  <div class="sh-div__zoomed" data-ih="1000" data-iw="1000" style="background-image:url(https://encrypted-tbn1.gstatic.com/shopping?q=tbn:ANd9GcRCtzg2hxRcRsKWk0rMztnz3SJswdtiDeLLZ-cg0ttYiHtv0JpFFM0iumy7s9_D7ID0Op5ri9BeAE4tn3eqR2xUf61OjQ66&amp;usqp=CAY)"></div>
  <div class="sh-div__zoomed" data-ih="1000" data-iw="1000" style="background-image:url(https://encrypted-tbn2.gstatic.com/shopping?q=tbn:ANd9GcSSn4ILkx166Dku-6stH5dAQJR7m5ChOVJRXEqImcX45_Gwn2kygUmDO3F0JxQmadgheSPSe1jU0MYurPSIfP9JZMj97jKRsQ&amp;usqp=CAY)"></div>
  <div class="sh-div__zoomed" data-ih="1000" data-iw="1000" style="background-image:url(https://encrypted-tbn2.gstatic.com/shopping?q=tbn:ANd9GcR9tUvXrkgHJRDg_2C_bHEuFY-W4PIDMjb8FeoNvpGSDrWTaAXzDFEZKPrJvQ-EunLKWc39Lm4WsTlZ-ffE0v6ah7J_smDIRw&amp;usqp=CAY)"></div>
  <div class="sh-div__zoomed" data-ih="1000" data-iw="1000" style="background-image:url(https://encrypted-tbn1.gstatic.com/shopping?q=tbn:ANd9GcTMlGTd9PnGge9QuK1-E7eLYPydiP0nisv-PAMSjHLUrm2eaEylfn20aOWxEFzRztjDEDIQCkQSyPMLFSgH2rHzAGKkToqjOA&amp;usqp=CAY)"></div>
*/



export default withRouter(SendersComponent)




const isEntrega = (type) => {
  return type === "Entrega" || type === "REM_CARD_CUP" || type === "REM_CARD_MLC" || type === "REM_CASH_USD" || type === "REM_CASH_CUP" || type === "COMBO";
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


//allowInventory

function searchAgents(o,q){
  let rrs = {}
  _Util.ObjectKeys(o).map(k=>{
    if(o[k]["isqvmAgent"]){
      if(q){
        let qLw = q && q.toLowerCase();
        let nLw = o[k]["name"] && o[k]["name"].toLowerCase();
        if(qLw && nLw && nLw.indexOf(qLw)>=0){
          rrs[k] = o[k]
        }
      }
      else{
        rrs[k] = o[k]
      }
    }
    
  })
  return rrs;
} 