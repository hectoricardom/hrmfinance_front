

import React, { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import loadable from '@loadable/component'



import { withRouter, NavLink} from 'react-router-dom';

import {  OpenWatchDialog, fetchCities, fetchRemesa, OpenModal, calcMov, OpenToast } from '../../../actions/common'



import * as _Util from '../../../store/Util'

import * as PdfRpt from '../../../store/printDoc'

import '../../_styles.css'




const PaymentSlideUp = loadable(() => import('../../paymentSlideUp'))


const BTNH = _Util.BTNH_Cmpt();

const Icon2 = _Util.Icon_Cmpt();

const DeleteAlertMov = _Util.DeleteAlertMov_Cmpt();

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
  else if(item["type"]==="INVESTMENT_FOOD"){
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



const removeM = () => {
  let data = {};
  data['zIndex']=450;
  data['observeResize']=true;    
  data['props']={item:_id, minHeight: '190px'};
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


const Confirm = async () => {
  //loadMovs(dispatch);
}


let classTyp =  "";
let iconTyp =  "";

if(item){
  classTyp =  item["type"]==="Entrega"?"_Rem":item["type"]==="BTC"?"_btc":item["type"]==="COMBO"?"_cmb":item["type"]==="INVESTMENT_FOOD"?"_investFood":item["type"]==="DEBT"?"_debt":item["type"]==="TRANSFER"?"_trnsfr":"";
  iconTyp =  item["type"]==="Entrega"?"money_outline":item["type"]==="BTC"?"btc_circle":item["type"]==="COMBO"?"food_variant":item["type"]==="INVESTMENT_FOOD"?"shopping_outline":item["type"]==="DEBT"?"bank_outline":item["type"]==="TRANSFER"?"bank_transfer":"";

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