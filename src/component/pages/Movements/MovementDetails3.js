

import React, { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import loadable from '@loadable/component'



import { withRouter} from 'react-router-dom';



import * as _Util from '../../../store/Util'

import '../../_styles.css'

import { 
  loadReceivers,
  OpenWatchDialog,
  OpenModal,
  getThumbnailImg,
  loadStockProduct
} from '../../../actions/common'






const BTNH = _Util.BTNH_Cmpt();

const Icon2 = _Util.Icon_Cmpt();





const ModalDate =  _Util.ModalDate_Cmpt();


const InputAutocomplete = _Util.InputAutocomplete_Cmpt(); 

const InputText =  _Util.InputText_Cmpt();

const LoadingColorSpinner=  _Util.LoadingColorSpinner_Cmpt();




const AddProdCombo = loadable(() => import('./addProdCombo'));

/*

const ScrollDc =  _Util.ScrollDc_Cmpt();

const CheckBoxSlide =  _Util.CheckBoxSlide_Cmpt();

const DeleteAlertMov = _Util.DeleteAlertMov_Cmpt();

const SearchInput =  _Util.SearchInput_Cmpt();

*/



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





const loadMovDt = async (dispatch,userId,id) => {

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
      userId:userId,
      //userId:_Util.getUserAgent(),
      id:id
    }
  };
  const res = _Util.fetchStream_movie_data(_Util.get_GRAPHQLURL(),Qry2Inv);
  const td = await res;
  let isV = _Util.isArraySerialization()?td && Array.isArray(td) && td.length>0:td && td.id;
  if(isV){
      let dZs = _Util.isArraySerialization()?_Util.deSerializeItm(td,fieldsMvId):td;
     
      _Util.updStore('movementsDetails',dZs);
      getThumbnailImg("google_map-min.png",dispatch)

      dispatch({
        type: 'UPD_KEY_VALUE',
        kv:{key:'observeChanges',value:_Util.gen12CodeId()}
      })
  }
  else{
    _Util.getStore()["route_history"].push({pathname:"/dashboard"})
  }
}





const SendersComponent = (props) => {
  const {
    dispatch, LoadUA
  } = useObserveChanges();


  let _state = _Util.getStore();
  let keys = _Util.getGlobalsKeys()
  _state["keys"] = keys;

  

  const [initialize, setInitialize] = useState(false);

  const [widthScreen, setWidthScreen] = useState(null);

  const [view, setView] = useState(false);



  let outerWidth = _state["outerWidth"];

  const searchHash = window.location.hash.split('?')[1]?window.location.hash.split('?')[1]:null;
  const router = _Util.parseQuery(searchHash);

  const item = _state["movementsDetails"] || {}; 




  let _userId = _Util.getProfileId();
  useEffect(() => {  
    if(widthScreen!==outerWidth){
      setWidthScreen(outerWidth);
    } 
    if(!initialize){
      setInitialize(true);
      _Util.updViewActive(9);
      if(!(_Util.IsAdmin() || _state["isqvmAgent"] || _state["isStore"])){
        if(_state["isqvmAgent"]){
          _state["route_history"].push({pathname:"/dashboard"})
        }
        else if(_state["isStore"]){
          _state["route_history"].push({pathname:"/stores"})
        }
      }else{

        if(_Util.IsAdmin()){
          LoadUA();
        }
        loadMovDt(dispatch,_userId,router.movId)
        loadReceivers(_userId,_userId,dispatch);
        let Qry2Inv = {
          query:"getStockProductQvaMarket",
          params:{
            showInventory:true
          }
        };
        loadStockProduct(Qry2Inv,dispatch);
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




let tt =item && item["amount"] * item["tasa"]?item["amount"] * item["tasa"]:0
let hasReceiver =item && item["receiver"]?item["receiver"]: null;


let hasProducts =item && item["prdDtls"] && item["prdDtls"]["products"];


let hasDiscount =item && item["discount"]?item["discount"]:0;

let hasGeoLocation =item && item["receiver"] &&  item["receiver"]["lat"];


const openGeoMap = async () => {
  let lon =item && item["receiver"] &&  item["receiver"]["lon"];
  let lat = item && item["receiver"] &&  item["receiver"]["lat"];
  if(lon && lat){
    // window.open(`https://www.google.com/maps/place/${lat},${lon}`)
    window.open(`http://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=17/${lat}/${lon}`)
    

  }
}


let hasUserId =null;
if(item){
  hasUserId = item["userID"] || item["userId"];
}
let hasAgentDestination =item && item["agentDestinationDetails"] && item["agentDestinationDetails"]["name"];


let hasDate = item && _Util.date2pretyfy(item["date"]) ;

let name = item && `${item["type"]}`

if(item){
  if(item["type"]==="COMBO"){
    name = `${item["type"]} `
  }
  else if(isEntrega(item["type"])){
    name =  `REMESA`
  }
  else if(item["type"]==="BTC"){
    name =  `BTC - ${item["amount"]}`
  }
  else if(item["type"]==="INVESTMENT_INGREDIENTS"){
    name =  `INVERSION`
  }
  else if(item["type"]==="INVESTMENT_FOOD"){
    name =  `INVERSION`
  }
}


const confirm = async () => {
  //confirmOrder
  if(_Util.IsAdmin() || !item["IsDelivery"]){
    let Qry2Inv = {
      query:"confirmOrder",
      params:{
        userId:_userId,
        //userId:_Util.getUserAgent(),
        id:item["id"]
      }
    };
    const res = _Util.fetchStream_movie_data(_Util.get_GRAPHQLURL(),Qry2Inv);
    const td = await res;
    if(td){
      _state["route_history"].push({pathname:"/dashboard"})
    }
  }
}


const [searchQ, setSearch] = useState("");

const [viewRcv, setViewRcv] = useState(false);

const [viewuser, setViewuser] = useState(false);

const [viewUpdProd, setViewUpdProd] = useState(false);
  

const [searchA, setSearchA] = useState("");

const [discountTxt, setDiscountTxt] = useState("");

const [discountView, setDiscountView] = useState(false);




const openUpdRcb = async (v) => {
  _Util.IsAdmin() &&  setViewRcv(!viewRcv);
}

const openUpdUser = async (v) => {
  _Util.IsAdmin() &&  setViewuser(!viewuser);
}


const openViewUpdProd = async (v) => {
  _Util.IsAdmin() && item["type"]==="COMBO" && setViewUpdProd(!viewUpdProd);
}

  
let receiversList = _state["receiversList"] || {}
let receiversListArr = [];
if(_Util.IsAdmin() && searchQ && searchQ.length>1){
    receiversList = searchb(_state["receiversList"],searchQ);
    receiversListArr = _Util.ObjectKeys(receiversList) || [];
}







const updReceiver = async (r) => {
  let QryR = {
    form:{
      id:item["id"],
      receiverId:r
    },
    query:"upgradeMovements"
  };
  const res = _Util.fetchStream_movie_data(_Util.get_GRAPHQLURL(),QryR);
  const td = await res;
  if(td){
    loadMovDt(dispatch,_userId,item["id"])
    setViewRcv(0)
  }
}



const updUserId = async (r) => {
  let QryR = {
    form:{
      id:item["id"],
      userID:r
    },
    query:"upgradeMovements"
  };
  const res = _Util.fetchStream_movie_data(_Util.get_GRAPHQLURL(),QryR);
  const td = await res;
  if(td){
    loadMovDt(dispatch,_userId,item["id"])
    setViewuser(0)
  }
}





const _confirmAdd = async (pd2,q2,pr2) => {
  let QryR = {
    params:{
      id:router["movId"],
      productID:pd2,
      qty:q2,
      cost_price:pr2
    },
    query:"UpdProductstoInventoryfromQvamarket"
  };
  const res = _Util.fetchStream_movie_data(_Util.get_GRAPHQLURL(),QryR);
  const td = await res;
  if(td){
    setViewUpdProd(0);
    loadMovDt(dispatch,_userId,router["movId"]);
  }
}



const addProduct = (ipr,itB) => {
  let fields = [
    "id","name","isPublic","unit","imageUrl","categoryID",{N:"stock",f:["amount", "stock", "stockIn", "stockOut"]}
  ];

  let Qry2Inv = {
    query:"getStockProductQvaMarket",
    params:{
      showInventory:true
    }, 
    arraySerialization: _Util.isArraySerialization(),
    fields:fields
  };



  loadStockProduct(Qry2Inv,dispatch);
  let data = {};
  data['zIndex']=450;
  data['observeResize']=true;    
  data['props']={item:item, id:item["id"], minHeight: '40px'};
  data['content']=<AddProdCombo confirm={_confirmAdd}/>;
  OpenWatchDialog(dispatch,data);
}


let prdDtls =item && item["prdDtls"] ;
let prodsL =prdDtls && prdDtls["products"];
let prodNm = prodsL && _Util.ObjectKeys(prodsL).length;


let agentsList = _state["agentsList"] || {};
let agentsListArr = [];
let _usAg = item["userID"]
if(_Util.IsAdmin()){
  if(_Util.IsAdmin() && searchA && searchA.length>1){
    agentsList = searchb(_state["agentsList"],searchA);
    agentsListArr = _Util.ObjectKeys(agentsList) || [];
  }
}



let agentCrr = _state["agentsList"] && _state["agentsList"][_usAg];


if(prodNm){
  tt =prdDtls["total"]
}

let _total = tt;
if(hasDiscount){
  _total = tt - hasDiscount;
}



const addDiscount = async () => {
  let QryR = {
    form:{
      id:item["id"],
      discount:discountTxt
      //userID:r
    },
    query:"upgradeMovements"
  };
  const res = _Util.fetchStream_movie_data(_Util.get_GRAPHQLURL(),QryR);
  const td = await res;
  if(td){
    loadMovDt(dispatch,_userId,item["id"])
    setDiscountView(0);
  }
}


const addDeliveryDate = async (f,v) => {
  let dD = new Date(v);
  dD.setHours(9);
  let QryR = {
    form:{
      id:item["id"],
      deliveryDate:dD.getTime()
      //userID:r
    },
    query:"upgradeMovements"
  };
  const res = _Util.fetchStream_movie_data(_Util.get_GRAPHQLURL(),QryR);
  const td = await res;
  if(td){
    loadMovDt(dispatch,_userId,item["id"]);
  }
}

const updDate = async (f,v) => {
  let dD = new Date(v);
  dD.setHours(9);
  let QryR = {
    form:{
      id:item["id"],
      date:dD.getTime()
      //userID:r
    },
    query:"upgradeMovements"
  };
  const res = _Util.fetchStream_movie_data(_Util.get_GRAPHQLURL(),QryR);
  const td = await res;
  if(td){
    loadMovDt(dispatch,_userId,item["id"]);
  }
}



const OpenModalDeliveryDate = (i) => {
    let data = {};
    data['zIndex']=190;
    data['observeResize']=true;
    data['props']={title:"", item:i};
    data['content'] = <ModalDate valueUpdate={(e)=>addDeliveryDate(i,e)} initValue={item && item["deliveryDate"]}/>; 
    OpenModal(dispatch,data);
  }





const UpdateAgent = async (v) => {
  let QryR = {
    params:{
      id:item["id"],
      newUserId: v.id,
      oldUserId: item["agentId"]
    },
    query:"updateAgentIdMovement"
  };
  const res = _Util.fetchStream_movie_data(_Util.get_GRAPHQLURL(),QryR);
  const td = await res;
  if(td){
    loadMovDt(dispatch,_userId,item["id"]);
  }
}


var _thumbnailJson =  _state['thumbnailJsonBlob'] && _state['thumbnailJsonBlob']["google_map-min.png"];
let _blobrequested =  _thumbnailJson && _thumbnailJson['requested'];
let _blob = _blobrequested? _thumbnailJson['blob'] : null;


let agentsQva = {};
if(_Util.IsAdmin() && searchA && searchA.length>0){
  agentsQva = searchAgents(_state["agentsList"],searchA);
}else{
  agentsQva = searchAgents(_state["agentsList"],"");
}


let _nM =  (item && item.orderId) ||  (item && item.id);
let _dDt = deliveryDate(item && item["deliveryDate"])

let ddLb = _dDt && (_dDt===2?_Util.translatetext(96):_dDt===1?_Util.translatetext(97):_dDt===9?_Util.translatetext(99):_Util.date2pretyfy(item["deliveryDate"]));







  const OpenModalDate = (i) => {
    let data = {};
    data['zIndex']=190;
    data['observeResize']=true;
    data['props']={title:"", item:i};
    data['content'] = <ModalDate valueUpdate={(e)=>updDate(i,e)} initValue={item && item["date"]}/>; 
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



        <div className={`palette  formContainer shopping_cart InfoM ${isMobile?"is_mobile":""}`} style={{opacity:item && view?1:0}} >
          <div className={`centerListCardProd `}> 
            <div className={`formContainer centerListCardProd `} style={{opacity:1}}>  
              <div className={` _flxWrp HRKRR`}>
                <div className={`  headerTtl`}>
                    <div className={`pym81b sendBx `}>
                        <div className={`total_cart total_mov ${tt>0?"pos":"neg"}`}>
                          {name}
                          <div className={`sendBtn`}>
                          </div>
                        </div>

                        <div className={`type_mov `}>
                        {_nM}
                        {_Util.IsAdmin() ?
                        <div>
                          <span onClick={()=>setDiscountView(1)}>
                            <Icon2 name={`brightness_percent`} />
                          </span>
                        </div>
                        :null}
                        </div>
                        {_Util.IsAdmin() && discountView?
                          <div>
                            <div className={`paddField address`}>
                              <InputText 
                                icon={`more_vert`} 
                                form={"discount_recv"} 
                                field={`discount`}  
                                keyCode={42} 
                                placeholder={_Util.translatetext(54)} 
                                background={`#f9f9f9`}
                                color={`var(--base-color)`}
                                OnChange={(e)=>setDiscountTxt(e)}
                                initvalue={discountTxt}
                              />
                            </div>
                            <div className={`fieldPadding _MrgV`} style={{ margin: "4px 0 12px"}}>
                              <span onClick={()=>addDiscount()}>
                                <BTNH theme={`light_blue`} title={`Agregar Descuento`}/>
                              </span>
                            </div>
                          </div>
                        :null}
                        <div className={`total_cart total_mov ${tt>0?"pos":"neg"}`}>
                          {`$ ${_total?_total.toFixed(2):0}`}
                          <div className={`sendBtn`}>
                          </div>
                        </div>
                        {_Util.IsAdmin() && hasDiscount ?
                          <div className={`cost_detail`}>
                            <div className={`amount`}>
                              {`${_Util.translatetext(56)}:  `}
                              <span>
                                {`$${tt?(tt*1).toFixed(2):0}`}
                              </span>
                            </div>
                            <div className={`amount`}>
                              {_Util.translatetext(54)}
                              <span>
                                {`$${hasDiscount?(hasDiscount*1).toFixed(2):0}`}
                              </span>
                            </div>
                          </div>
                        :null}
                        <div className="date_mov"
                          onClick={()=>OpenModalDate()}
                        >{hasDate}</div>
                    </div>
                  </div>
                  
                  
                  {!item["IsDelivery"]?
                  <div className={`pym81b sendBx mov_type deliveryDate  ${isMobile?"":"_dsplFlx"}  ${_dDt===2?"btc_color fillBack":_dDt===1?"activeBlue fillBack":_dDt===9?"activeRed fillBack":"complete fillBack"}`}>
                    <div className={`_dsplFlx`} >
                      <div className={`icon_mov`}>
                        <Icon2 name={`lightning_bolt_outline`} />
                      </div>
                      <div className={`mov_type_title hdrs`}>
                        {_Util.translatetext(98)}
                      </div>
                    </div>
                    {!isMobile?
                      <div className={`flexSpace`}/>
                    :null}
                    <div className={`mov_type_title lblDd `}>
                      {_Util.IsAdmin() && !item["IsDelivery"]?
                      <span onClick={()=>OpenModalDeliveryDate()}>
                        {ddLb}
                      </span>
                      :ddLb}
                    </div>         
                  </div>
                  :null}

                  

                  {_Util.IsAdmin() ?
                    <div className={`paddField address`}>
                      <InputAutocomplete 
                        icon={`more_vert`} 
                        form={"kjsahfashflkashjaf"} 
                        field={`agentId`}  
                        keyCode={49} 
                        background={`#f5f5f5`}
                        color={`var(--base-color)`}
                        placeholder={_Util.translatetext(13)}
                        //  validations={vldFlds2[`categoryID`]}
                        initvalue={item["agentId"]}
                        OnSelect={(e)=>UpdateAgent(e)}
                        data={agentsQva}
                        OnChange={(e)=>setSearchA(e)}
                      />
                    </div>
                    :null}



                  {_Util.IsAdmin() ?
                  <div className={`infoDesc`}>
                    <div className={`_key`}>
                      {_Util.translatetext(64)}
                    </div>
                    <div className={`_value`} onClick={()=>openUpdUser()}>
                      {hasUserId && agentCrr && agentCrr["name"]?agentCrr["name"]:"Agregar"}
                    </div>
                  </div>
                  :null}
                  {_Util.IsAdmin() && viewuser?
                  <div className={`shopping_cart receivers`} >
                    <div className={`paddField address`}>
                      <InputText 
                        icon={`more_vert`} 
                        form={"search_recv"} 
                        field={`search`}  
                        keyCode={42} 
                        placeholder={`${_Util.translatetext(20)}...`} 
                        background={`#f9f9f9`}
                        color={`var(--base-color)`}
                        OnChange={(e)=>setSearchA(e)}
                        initvalue={searchA}
                      />
                    </div>
                    <div className={`_dsplFlx spaceAround _flxWrp `}>
                      {agentsListArr && agentsListArr.map(rcvL=>{
                        let aItm = agentsList[rcvL];
                        let nmF = aItm && aItm["name"].split(' ')[0];
                        return(
                          <div className={`pym81b sendBx receiversItm `}>
                              <div className={`total_cart `}>
                                  <div>
                                  {aItm && aItm["name"]}
                                  </div>
                              </div>
                              <div className={`subtotal_cart `}>
                                  <div>
                                  {aItm && aItm["address"]}
                                  </div>
                              </div>
                              <div className={`sendBtn _dsplFlx spaceAround`}>
                                <div className={`fieldPadding _MrgV`} style={{ marginTop: "10px"}}>
                                </div>
                                <div className={`fieldPadding _MrgV`} style={{ marginTop: "10px"}}>
                                  <span onClick={()=>updUserId(rcvL)}>
                                    <BTNH theme={`light_blue`} title={`${nmF}`}/>
                                  </span>
                                </div>
                              </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  :null}

                  {_Util.IsAdmin() && item && item["id"]?
                  <div className={`infoDesc`}>
                    <div className={`_key`}>
                      {`Transacción ID`}
                    </div>
                    <div className={`_value`}>
                    {item && item["id"]}
                    </div>
                  </div>
                  :null}


                  
                  {hasReceiver?
                  <div className={`infoDesc`}>
                    <div className={`_key`}>
                      {_Util.translatetext(14)}
                    </div>
                    <div className={`_value`} onClick={()=>openUpdRcb()}>
                      {hasReceiver && hasReceiver["name"]}
                    </div>
                  </div>
                  :null}
                  {_Util.IsAdmin() && viewRcv?
                  <div className={`shopping_cart receivers`} >
                    <div className={`paddField address`}>
                      <InputText 
                        icon={`more_vert`} 
                        form={"search_recv"} 
                        field={`search`}  
                        keyCode={42} 
                        placeholder={`${_Util.translatetext(20)}...`} 
                        background={`#f9f9f9`}
                        color={`var(--base-color)`}
                        OnChange={(e)=>setSearch(e)}
                        initvalue={searchQ}
                      />
                    </div>
                    <div className={`_dsplFlx spaceAround _flxWrp `}>
                      {receiversListArr && receiversListArr.map(rcvL=>{
                        let receiverItm = receiversList[rcvL];
                        let nmF = receiverItm && receiverItm["name"].split(' ')[0];
                        return(
                          <div className={`pym81b sendBx receiversItm `}>
                              <div className={`total_cart `}>
                                  <div>
                                  {receiverItm && receiverItm["name"]}
                                  </div>
                              </div>
                              <div className={`subtotal_cart `}>
                                  <div>
                                  {receiverItm && receiverItm["address"]}
                                  </div>
                              </div>
                              <div className={`sendBtn _dsplFlx spaceAround`}>
                                <div className={`fieldPadding _MrgV`} style={{ marginTop: "10px"}}>
                                </div>
                                <div className={`fieldPadding _MrgV`} style={{ marginTop: "10px"}}>
                                  <span onClick={()=>updReceiver(rcvL)}>
                                    <BTNH theme={`light_blue`} title={`${_Util.translatetext(62)} ${nmF}`}/>
                                  </span>
                                </div>
                              </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  :null}
                  {hasReceiver && hasReceiver["phoneNumber"]?
                  <div className={`infoDesc`}>
                    <div className={`_key`}>
                    {_Util.translatetext(61)}
                    </div>
                    <div className={`_value`}>
                    {hasReceiver && hasReceiver["phoneNumber"]}
                    </div>
                  </div>
                  :null}
                  {hasReceiver && hasReceiver["address"]?
                  <div className={`infoDesc `}>
                    <div className={`_key`}>                      
                      {_Util.translatetext(60)}
                    </div>
                    <div className={`_value addressGmp _dsplFlx`}  onClick={()=>openGeoMap()}>
                      {hasGeoLocation && _blob?<img src={_blob} alt="gmap"/>:null}
                      <h5>{hasReceiver && hasReceiver["address"]}</h5>                      
                    </div>
                  </div>
                  :null}
  
 
                  {hasAgentDestination?
                  <div className={`infoDesc`}>
                    <div className={`_key`}>
                      {`${_Util.translatetext(57)} ${tt>0?_Util.translatetext(58):_Util.translatetext(59)}:`}
                    </div>
                    <div className={`_value`}>
                    {hasAgentDestination}
                    </div>
                  </div>
                  :null}
                 

                  {hasProducts?                    
                      <div className={`infoDesc`}>
                        <div className={`_dsplFlx`}>
                          <div className={`_key`} onClick={openViewUpdProd}>
                            {_Util.translatetext(63)}
                          </div>
                          <div className={`flexSpace`}/>
                          {viewUpdProd?    
                          <div className={`icon_mov`} onClick={addProduct}> 
                            <Icon2 name={`plus`} />
                          </div>
                          :null
                          }
                        </div>
                        <div className={` `}>
                          {hasProducts && _Util.ObjectKeys(hasProducts).map((prId,indX)=>{
                            // let prodItm = hasProducts[prId];
                            return (
                              <ItemProdComponent stckId={prId} isMobile={isMobile}  dispatch={dispatch} view_edit={viewUpdProd} inDx={indX} key={prId+"_mdt_prod"}/>
                            )
                            
                            
                          })}
                        </div>
                      </div>
                  :null}

                  <div className={`pym81b sendBx mov_type _dsplFlx complete ${item["IsDelivery"]?"already_completed":""}`} onClick={()=>confirm()}>
                    <div className={`icon_mov`}>
                      <Icon2 name={`success`} />
                    </div>
                    <div className={`mov_type_title `}>
                      {!item["IsDelivery"]?_Util.translatetext(65):_Util.translatetext(66)}
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

:_LOSESCOBIOSROMELIO:


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




/*

1618757926549-1618755459886

2466663

*/



export default withRouter(SendersComponent)




function deliveryDate(Dd){
  let rrs = 2;
  let _ddTm = (new Date(Dd));
  let _now = (new Date());
  let _1daymls = 86400000;
  let _1hrs = 3600000;
  let dd = _1daymls + (_1daymls- (_now.getHours()*_1hrs));
  if((Dd-_now.getTime())<dd){
    if((_ddTm.getDate()*24+ _ddTm.getHours()) < (_now.getDate()*24)){
      rrs = 9;
    }
    else if((_now.getDate()*24 + 23) >=(_ddTm.getDate()*24 + _ddTm.getHours())){
      rrs = 2;
    }
    else{
      rrs = 1;
    }
  }
  else{
    rrs = 3;
  }
  return rrs;
} 




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




const ItemProdComponent = (props) => {

  const {
    stckId, isMobile,  dispatch, inDx
  } = props;
 

  const searchHash = window.location.hash.split('?')[1]?window.location.hash.split('?')[1]:null;
  const router = _Util.parseQuery(searchHash);

 
  let _state = _Util.getStore();

  const mvD = _state["movementsDetails"] || {};

  let prodsL =mvD && mvD["prdDtls"] && mvD["prdDtls"]["products"];


 
  let _userId = _Util.getProfileId();
  let item = prodsL && prodsL[stckId];



  const [updLoading, setupdLoading] = useState(0);

  const [qty, setQty] = useState(null);

  const [view_edit, setView_edit] = useState(false);
  
  
 
  const _removeUpd = async (idM) => {
    let QryR = {
      params:{
        id:stckId
      },
      Collection:"ProductsInventory",
      query:"deleteByColl"
    };
    const res = _Util.fetchStream_movie_data(_Util.get_GRAPHQLURL(),QryR);
    const td = await res;
    if(td){
      loadMovDt(dispatch,_userId,router["movId"])
      setView_edit(0)
    }
  }

let hasPrice = false;
let prc = 0


if(mvD["type"]==="COMBO"){
  prc = item && item["cost_price"];
  hasPrice= item && item["cost_price"]?true:false;
}
else if(mvD["type"]==="INVESTMENT_FOOD" || mvD["type"]==="INVESTMENT_INGREDIENTS"){
  prc = item && item["price"];
  hasPrice = item && item["price"]?true:false;
}

/*
let imgI = item && item["imageUrl"];
var _thumbnailJson = imgI && _state['thumbnailJsonBlob'] && _state['thumbnailJsonBlob'][imgI];
let _blobrequested =  _thumbnailJson && _thumbnailJson['requested'];
let _blob = _blobrequested? _thumbnailJson['blob'] : null;



*/

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


  const _confirmUpd = async () => {
    let QryR = {
      form:{
        id:stckId,
        qty:iniV
      },
      query:"upgradeProductsInventory"
    };
    const res = _Util.fetchStream_movie_data(_Util.get_GRAPHQLURL(),QryR);
    const td = 1 && await res;
    if(td){
      loadMovDt(dispatch,_userId,router["movId"])
      setView_edit(0)
    }
  }

  let unitMeasurement = _state["unitMeasurement"]
    

  let _unit = item && `(${item["unit"]})`;



  if(mvD["type"] === "INVESTMENT_INGREDIENTS"){
    let _unitD = (item && item["unit"] && unitMeasurement[item["unit"]]) || {}    
    _unit = _unitD && `(${_unitD["name"]})`;
  }



  let qty2Show  = item && item["qty"]<0?item["qty"]*-1:item["qty"]*1;
  
  
  return (
      <div jsname="JNwhwd" className="xwW5Ce u3mD2d movements_details" >
        <div className="m18Ex  u3mD2d xwW5Ce">
            <a className=" u3mD2d xwW5Ce brdBt_ShopCart">
              <article className="u3mD2d xwW5Ce u3mRow spaceAround">
                <div className="_dsplFlx  itm_ShopCart">
                  <div className="exewIc pqv9ne">
                    
                    <div class={`qtYmyg5 qtYmyg_Lef ${qty2Show && qty2Show>9?"_2dec":""}`} onClick={()=>_Util.IsAdmin() && setView_edit(!view_edit)}>{qty2Show}</div>
                    
                    <div className="EbzW3 xwW5Ce qSGFRd YzcgQb UKsopf u3mD2d">
                      <div className="ap5GNb YxFYtf yhS73e" style={{paddingTop: "100%"}}>
                      {_blob===2?<img src={_imgI} className="Ws3Esf" alt="" />:null}
                      </div>
                    </div>
                  </div>
                  <div className="egZxgf pqv9ne b7mrgL">
                    <div className=" u3mD2d xwW5Ce">
                      <div className="MPhl6c pqv9ne azTb0d YAEPj SGmlof" title={item && `${item["name"]}` }>{item && `${item["name"]}` }</div>
                    </div>
                    {isMobile?
                    <div className="egZxgf pqv9ne priceinDesktop">
                      <div className="egZxgf pqv9ne">
                        <div className="DX0ugf ApBhXe _dsplFlx">
                          <span className="PTXMyf">{hasPrice?`${prc && prc.toFixed(2)} US$`:""}</span>
                          <span className="unitlbl mrkPl">{_unit}</span>
                          <div className={`flexSpace`}/>
                        </div>
                      </div>
                    </div>
                    :null
                    }


                


                    {_Util.IsAdmin() && view_edit && !isMobile ?                    
                    <>                   
                    <div className="egZxgf pqv9ne">
                      {updLoading?
                        <div className="loading_updQty">
                          <LoadingColorSpinner stroke={'#1a73e8'} height={50} width={50}/>
                        </div>
                        :
                        <div className="DX0ugf ApBhXe _dsplFlx" >
                          <div className=" qty" >
                            <InputText 
                              icon={`more_vert`} 
                              form={"fnM_"+stckId} 
                              field={`qty`}  
                              keyCode={2+inDx} 
                              background={`#f9f9f9`}
                              color={`var(--base-color)`}
                              placeholder={_Util.translatetext(15)} 
                              OnChange={(e)=>setQty(e)}
                              validations={{reqired: true, number: true}}
                              initvalue={iniV}
                            />
                          </div>
                        {iniV !== item["qty"]?
                          <div className={`fieldPadding _MrgV`}>
                            <span onClick={()=>_confirmUpd()}>
                              <BTNH theme={`light_blue`} title={`Actualizar`}/>
                            </span>
                          </div>
                          :null
                        }  
                        </div>
                      }
                    </div>
                    <div className={`fieldPadding _MrgV rmv_Pr`} >
                      <span onClick={()=>_removeUpd()}>
                        <BTNH theme={`fire_brick`} title={`Eliminar`}/>
                      </span>
                    </div>
                    </>:null}
                  </div>
                </div>
                {isMobile?null:
                <div className="egZxgf pqv9ne priceinDesktop">
                  <div className="egZxgf pqv9ne">
                    <div className="DX0ugf ApBhXe _dsplFlx">
                      <span className="PTXMyf">{hasPrice?`${prc && prc.toFixed(2)} US$`:""}</span>
                      <span className="unitlbl mrkPl">{_unit}</span>
                      <div className={`flexSpace`}/>
                    </div>
                  </div>
                </div>
                }

              </article>
              {item && item["specifications"]?
              <div className="OFmygf info_specif" style={{backgroundColor:"rgba(230,244,234,1)", color:"rgba(24,128,56,1)"}}>{item && item["specifications"]}</div>
              :null}

              {item && item["store"] && item["store"]["id"]?
              <div className={`infoDesc `}>
                <span className={`_value _dsplFlx`}>
                  <div  className={`icon_store`}>
                    <Icon2 name={"market"} size={32} color={"rgba(95,99,104,1)"}/>  
                  </div>          
                  <div  className={`name_store`}> 
                    {`: ${item["store"]["name"]}`}
                  </div>   
                </span>
              </div>
              :null}
              {_Util.IsAdmin() &&  view_edit && isMobile?
                <div className="_dsplFlx">
                  <div className="egZxgf pqv9ne ">
                      {updLoading?
                        <div className="loading_updQty">
                          <LoadingColorSpinner stroke={'#1a73e8'} height={50} width={50}/>
                        </div>
                        :
                        <div className="DX0ugf ApBhXe _dsplFlx" >
                          <div className=" qty" >
                            <InputText 
                              icon={`more_vert`} 
                              form={"fnM_"+stckId} 
                              field={`qty`}  
                              keyCode={10+inDx} 
                              background={`#f9f9f9`}
                              color={`var(--base-color)`}
                              placeholder={_Util.translatetext(15)} 
                              OnChange={(e)=>setQty(e)}
                              validations={{reqired: true, number: true}}
                              initvalue={iniV}
                            />
                          </div>
                          {iniV !== item["qty"]?
                          <div className={`fieldPadding _MrgV`}>
                            <span onClick={()=>_confirmUpd()}>
                              <BTNH theme={`light_blue`} title={ _Util.translatetext(67)}/>
                            </span>
                          </div>
                          :null
                        }
                        </div>
                      }
                  </div>
                  <div className={`flexSpace`}/>
                  <div className={`fieldPadding _MrgV  rmv_Pr`} >
                    <span onClick={()=>_removeUpd()}>
                      <BTNH theme={`fire_brick`} title={_Util.translatetext(68)}/>
                    </span>
                  </div>
                </div>:null
              }
            </a>   
          </div>
        </div>

    )

}

