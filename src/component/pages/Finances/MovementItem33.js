

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


var viewTypeMov = _state["ViewTypeMov"];

var _movements = viewTypeMov===2?_state["Incomes"]:_state["Expenses"];


let item =_movements && _movements[mvId];

let _id =item && item["id"];

const [viewOpen, setViewOpen] = useState(0);






let tt =item && item["import"]?item["import"]:0



let name = item && item["group"] && item["group"]["name"];


let dest = item && item["title"];

let _image = item && item["image"];

let _userId = _Util.getProfileId();



const _openDtls = (sc) => {
  let itm = item;
  itm["group"] = item["group"]["id"]
  delete itm["user"]
  delete itm["year"]
  delete itm["month"]
  const _formN = "243876nt5fdgomwy"
  _Util.updFormStore(_formN,itm);
  dispatch({
    type: 'UPD_KEY_VALUE',
    kv:{key:'observeChanges',value:_Util.gen12CodeId()}
  })
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



const Confirm = async (modalID) => {
  let Qry = {
    params:{id:item["id"]},
    query:  viewTypeMov===2?"removeIncome":"removeGastos",
    user: _userId
  }; 

  const res = _Util.fetchStream_movie_data(_Util.get_GRAPHQLURL(),Qry);
  const td = await res;
  if(td){
    loadMovs(dispatch);
    CloseModal(dispatch,{id:modalID});
    let op = _state["ViewTypeMov"]===2?"Incomes":"Expenses";
    let ss = _state[op];
    delete ss[item["id"]];
    _Util.updStore(op,ss);
    _Util.updStore("lastReload",_Util.gen12CodeId());
    

    dispatch({
      type: 'UPD_KEY_VALUE',
      kv:{key:'observeChanges',value:_Util.gen12CodeId()}
    })
  }
  
}




let classTyp =  "";
let iconTyp =  "";


if(item){
  classTyp =  item["type"]==="Entrega"?"_Rem":item["type"]==="BTC"?"_btc":item["type"]==="COMBO"?"_cmb":(item["type"]==="INVESTMENT_FOOD" || item["type"]==="INVESTMENT_INGREDIENTS")?"_investFood":  item["type"]==="DEBT"?"_debt":item["type"]==="TRANSFER"?"_trnsfr":item["type"]==="DELIVERY_EXPS"?"_dlvExp":"";
  iconTyp =  item["type"]==="Entrega"?"money_outline":item["type"]==="BTC"?"btc_circle":item["type"]==="COMBO"?"food_variant":(item["type"]==="INVESTMENT_FOOD" || item["type"]==="INVESTMENT_INGREDIENTS")?"shopping_outline":item["type"]==="DEBT"?"bank_outline":item["type"]==="TRANSFER"?"bank_transfer":item["type"]==="DELIVERY_EXPS"?"moped":"";
}





return (
  <>
    <div>
      <div className={`movementItem_mobile ${viewOpen?"open":""}`}>
        <div className={` mov_type _dsplFlx SmlB mov_actions ${classTyp}`} >
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
        </div>
        <div  className={`separator`}></div>

        <div className={`sendBtn _dsplFlx mov_actions`}>
          <div className={`flexSpace`}/>
          <div className={`sendBtn _dsplFlx spaceAround`}>
            <div className={`fieldPadding _MrgV _actBtnMg`} >
              <span onClick={()=>removeM()}>
                <BTNH theme={`fire_brick`} title={ _Util.translatetext(68)}/>
              </span>
            </div>
            {_image?
            <div className={`fieldPadding _MrgV _actBtnMg`}>
              <span onClick={()=>{}}>
                <BTNH theme={`light_green`} title={_Util.translatetext(204)}/>
              </span>
            </div>
            :null}

            <div className={`fieldPadding _MrgV _actBtnMg`}>
              <span>
              <NavLink  to={{pathname:"/edit_operation",search:"?movId="+ _id}} className=" u3mD2d xwW5Ce" onClick={_openDtls}>
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