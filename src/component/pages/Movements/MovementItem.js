

import React, { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'


import { NavLink} from 'react-router-dom';

import {   fetchCities, fetchRemesa, OpenModal, OpenToast, calcMov, loadMovs, CloseModal } from '../../../actions/common'



import * as _Util from '../../../store/Util'


import '../../_styles.css'



const BTNH = _Util.BTNH_Cmpt();

const Icon2 = _Util.Icon_Cmpt();

const DeleteAlertMov = _Util.DeleteAlertMov_Cmpt();



const useObserveChanges = () => {
  const observeChanges =  useSelector(state => state.observeChanges);
  const dispatch = useDispatch(); 


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
    _updRemesa
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

const [viewOpen, setViewOpen] = useState(1);


const [obs, setObs] = useState(0);





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
    name =  `INVERSION `
  }
  else if(item["type"]==="INVESTMENT_INGREDIENTS"){
    name =  `INVERSION`
  }
  else if(item["type"]==="BTC"){
    name =  `BTC $(${item["amount"]})`
  }
  else if(item["type"]==="TRANSFER"){
    name =  `TRANSFER`
    dest =  item["agentDestinationDetails"] && item["agentDestinationDetails"]["name"];
  }

  else if(item["type"]==="DELIVERY_EXPS"){
    name =  `DELIVERY`
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


const Confirm = async (modalID) => {
  let Qry = {
    params:{id:item["id"]},
    query:"deleteByMovements"
  }; 

  const res = _Util.fetchStream_movie_data(_Util.get_GRAPHQLURL(),Qry);
  const td = await res;
  if(td){
    loadMovs(dispatch);
    CloseModal(dispatch,{id:modalID});
  }

  
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




let classTyp =  "";
let iconTyp =  "";


if(item){
  classTyp =  item["type"]==="Entrega"?"_Rem":item["type"]==="BTC"?"_btc":item["type"]==="COMBO"?"_cmb":(item["type"]==="INVESTMENT_FOOD" || item["type"]==="INVESTMENT_INGREDIENTS")?"_investFood":  item["type"]==="DEBT"?"_debt":item["type"]==="TRANSFER"?"_trnsfr":item["type"]==="DELIVERY_EXPS"?"_dlvExp":"";
  iconTyp =  item["type"]==="Entrega"?"money_outline":item["type"]==="BTC"?"btc_circle":item["type"]==="COMBO"?"food_variant":(item["type"]==="INVESTMENT_FOOD" || item["type"]==="INVESTMENT_INGREDIENTS")?"shopping_outline":item["type"]==="DEBT"?"bank_outline":item["type"]==="TRANSFER"?"bank_transfer":item["type"]==="DELIVERY_EXPS"?"moped":"";
}

let isNotf = (item["type"]==="Entrega" || item["type"]==="COMBO") && !item["IsDelivery"];



 
let userA = _Util.getBrowser();
  
let isMobile = userA.os === "Android" || userA.os === "iPhone" || _state["outerWidth"]<550 ;


let _nM =  (item && item.orderId) ||  (item && item.id);

let hasProducts =item && item["prdDtls"] && item["prdDtls"]["products"];



return (
  <>
    <div>
      <div className={`movementItem_mobile ${viewOpen?hasProducts?"openCmb":"open":""}`}>
        <div className={` mov_type _dsplFlx SmlB mov_actions ${classTyp}`} >
          <div className={`iconBubble`}>
            <Icon2 name={iconTyp} />
          </div>
          <div className={`details_op `}>
            <div className={`title_head3r _dsplFlx `}>
              <h5>
                {name}
              </h5> 
              <div className={`flexSpace`}/>  
              <h3>
                ${tt && tt.toFixed(2)}
              </h3> 
            </div>
            <div className={`desc_mov _dsplFlx`}>
              <h3>
                {item && item.orderId?`${item.orderId}`:"" }
              </h3>
              <div className={`flexSpace`}/>
            </div>
          </div>
          <div className={`flexSpace`}/>   
          <div className={`actions`}>
            <div className={`icon_open ${viewOpen?"up":"down"}`}  onClick={()=>setViewOpen(!viewOpen)}>
              <Icon2 name={"arrow_down"} />
            </div>
          </div>
        </div>
        {viewOpen?
        <>
        <div  className={`separator`}></div>
        <div className={`sendBtn _dsplFlx mov_actions destination`}>
          <div className="recvr">
            <h5>
              {dest}
            </h5>
          </div>
          <div className={`flexSpace`}/>   
          {_Util.IsAdmin() && isNotf?
            <div className={`fieldPadding _MrgV _actBtnMg`}>
              <span onClick={()=>sendNotification()}>
                <div className={`icon_mov _icon_telegram_notf`}>
                  <Icon2 name={"telegram"} />
                </div>
              </span>
            </div>
            :null}
        </div>


        {hasProducts?                    
            <div className={`infoDesc prodLst`}>              
              <div className={`_dsplFlx `}>
                {hasProducts && _Util.ObjectKeys(hasProducts).map((prId,indX)=>{
                  // let prodItm = hasProducts[prId];
                  return (
                    <ItemProdComponent stckId={prId} inDx={indX} key={prId+"_mdt_prod"} movID={_id}/>
                  )
                })}
              </div>
            </div>
        :null}

        <div  className={`separator`}></div>

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
            {_Util.IsAdmin() && !item["IsDelivery"]?
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
          </div>
        </div>
        </>
        :null}
      </div>
    </div>
    
      </>
  )

}




export default ItemComponent;


const isEntrega = (type) => {
  return type === "Entrega" || type === "REM_CARD_CUP" || type === "REM_CARD_MLC" || type === "REM_CASH_USD" || type === "REM_CASH_CUP" || type === "COMBO";
}





const ItemProdComponent = (props) => {

  const {
    stckId,  movID
  } = props;
 

 
  let _state = _Util.getStore();
  
  const mvD = _state["movements"] && _state["movements"][movID ]?_state["movements"][movID ] : {};



  let prodsL =mvD && mvD["prdDtls"] && mvD["prdDtls"]["products"];

 
  let item = prodsL && prodsL[stckId];


  const [qty, setQty] = useState(null);


  


let sz = "170";

let pId = "pId_mk_vv" +item["productID"]



const [hid, setHidd] = useState(null);
const [initialize, setInitialize] = useState(false);
const [obs, setObs] = useState(null);


let imgI = item && item["imageUrl"] && item["imageUrl"]+"?sz="+sz;
let _imgI = imgI && _Util.imageRxUrl()+ imgI;
let _blob = _Util.getImageStore()[_imgI];





useEffect(() => {

  if(!_blob && !hid){
    setTimeout(()=>{
      _Util.updImageStore(_imgI,1);
      let logo = document.createElement('img');
      logo.id = pId;
      logo.style.display="none";
      // assign and onload event handler
      logo.addEventListener('load', (event) => {
          setHidd(true);
          _Util.removeElement(pId);
          _Util.updImageStore(_imgI,2);
          setObs(_Util.gen6CodeId());
      });
      // add logo to the document
      document.body.appendChild(logo);
      logo.src = _imgI;
    },75)
  }

  if(!initialize){
    setInitialize(true);
  }
})







  let iniV = qty || item["qty"];




  let qty2Show  = item && item["qty"]<0?item["qty"]*-1:item["qty"]*1;
  

  return (
    <div className="mov_item_prodDt" >
      <div className="_dsplFlx" >
        <div className="_prodDt_img" >
          {_blob===2?<img src={_imgI} className="Ws3Esf" alt="" />:null}
        </div>
        <div className="_prodDt_desc" >
          <div className="_qty" >
            {qty2Show}
          </div>
        </div>
      </div>
    </div>
  )



}





/*
{
    isMobile?
    null
:
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
                        {_Util.IsAdmin() && !item["IsDelivery"]?
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
                        {_Util.IsAdmin() && isNotf?
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
      }


*/