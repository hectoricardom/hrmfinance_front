

import React, { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import loadable from '@loadable/component'



import { withRouter} from 'react-router-dom';



import * as _Util from '../../store/Util'

import '../_styles.css'

import { 
  loadReceivers,
  OpenWatchDialog,
  loadStockProduct
} from '../../actions/common'


/*

const MoreInfoButton = loadable(() => import('../MoreInfoButton'))
const TabsHRM = loadable(() => import('../tabsHRM'))
const InputAutocomplete = loadable(() => import('../InputAutocomplete'))
const UpdCombo = loadable(() => import('../updCombo'));

*/



const Icon2 = loadable(() => import('../Icons'));

const InputText = loadable(() => import('../InputText'));
const BTNH = loadable(() => import('../btns_confirm'));

const AddProdCombo = loadable(() => import('../addProdCombo'));
const LoadingColorSpinner = loadable(() => import('../LoadingColorSpinner'))


const useObserveChanges = () => {
  const observeChanges =  useSelector(state => state.observeChanges);
  const dispatch = useDispatch(); 

  
  return { 
    observeChanges,
    dispatch,
  }
}


const loadMovDt = async (dispatch,userId,id) => {
  let Qry2Inv = {
    query:"getQueryMovementsbyId",
    params:{
      userId:userId,
      //userId:_Util.getUserAgent(),
      id:id
    }
  };
  const res = _Util.fetchStream_movie_data(_Util.get_GRAPHQLURL(),Qry2Inv);
  const td = await res;
  if(td){
      _Util.updStore('movementsDetails',td);
      dispatch({
        type: 'UPD_KEY_VALUE',
        kv:{key:'observeChanges',value:_Util.gen12CodeId()}
      })
  }
}





const SendersComponent = (props) => {
  const {
    dispatch
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
      if(!(item && item["id"])){
        _state["route_history"].push({pathname:"/dashboard"})
      }else{
        loadMovDt(dispatch,_userId,item["id"])
        loadReceivers(_userId,_userId,dispatch);
        let Qry2Inv = {
          query:"getStockProductQvaMarket",
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
let hasReceiver =item && item["receiver"];
let hasProducts =item && item["prdDtls"] && item["prdDtls"]["products"];

let hasUserId =item && item["userID"];
console.log(item)
let hasAgentDestination =item && item["agentDestinationDetails"] && item["agentDestinationDetails"]["name"];



let hasDate = item && _Util.date2pretyfy(item["date"]) ;

let name = item && `${item["type"]}`

if(item){
  if(item["type"]==="COMBO"){
    name = item && `${item["type"]} `
  }
  else if(isEntrega(item["type"])){
    name =  `REMESA`
  }
  else if(item["type"]==="BTC"){
    name =  `BTC - ${item && item["amount"]}`
  }
}


const confirm = async () => {
  //confirmOrder
  if(!item["delivery"]){
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

const [viewAgents, setViewAgents] = useState(false);


const openUpdRcb = async (v) => {
  _Util.IsAdmin() &&  setViewRcv(!viewRcv);
}

const openUpdUser = async (v) => {
  _Util.IsAdmin() &&  setViewuser(!viewuser);
}


const openViewUpdProd = async (v) => {
  _Util.IsAdmin() &&  setViewUpdProd(!viewUpdProd);
}

  
let receiversList = _state["receiversList"] || {}
let receiversListArr = [];
if(_Util.IsAdmin() && searchQ && searchQ.length>2){
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
  let data = {};
  data['zIndex']=450;
  data['observeResize']=true;    
  data['props']={item:itB, id:ipr, minHeight: '40px'};
  data['content']=<AddProdCombo confirm={_confirmAdd}/>;
  OpenWatchDialog(dispatch,data);
}


let prdDtls =item && item["prdDtls"] ;
let prodsL =prdDtls && prdDtls["products"];
let prodNm = prodsL && _Util.ObjectKeys(prodsL).length;


let agentsList = _state["agentsList"] || {};
let agentsListArr = [];
let agentRcv = {}
let _usAg = item["userID"]
console.log()
if(_Util.IsAdmin()){
  if(_Util.IsAdmin() && searchA && searchA.length>1){
    agentsList = searchb(_state["agentsList"],searchA);
    agentsListArr = _Util.ObjectKeys(agentsList) || [];
  }
  agentRcv = agentsList && agentsList[_usAg];
}



let agentCrr = _state["agentsList"] && _state["agentsList"][_usAg];


if(prodNm){
  tt =prdDtls["total"]
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
                        <div className={`type_mov `}>
                        {name}
                        </div>
                        <div className={`total_cart total_mov ${tt>0?"pos":"neg"}`}>
                          {`$ ${tt?tt.toFixed(2):0}`}
                          <div className={`sendBtn`}>
                          </div>
                        </div>
                        <div className="date_mov">{hasDate}</div>
                    </div>
                  </div>

                  {_Util.IsAdmin() && hasUserId?
                  <div className={`infoDesc`}>
                    <div className={`_key`}>
                      {`Usuario`}
                      
                    </div>
                    <div className={`_value`} onClick={()=>openUpdUser()}>
                      {agentCrr && agentCrr["name"]}
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
                        placeholder={`Buscar..`} 
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


                  
                  {hasReceiver?
                  <div className={`infoDesc`}>
                    <div className={`_key`}>
                      {`Recibe`}
                      
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
                        placeholder={`Buscar..`} 
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
                                    <BTNH theme={`light_blue`} title={`Entregar a ${nmF}`}/>
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
                      {`Telefono`}
                    </div>
                    <div className={`_value`}>
                    {hasReceiver && hasReceiver["phoneNumber"]}
                    </div>
                  </div>
                  :null}
                  {hasReceiver && hasReceiver["address"]?
                  <div className={`infoDesc`}>
                    <div className={`_key`}>
                      {`Dirección`}
                    </div>
                    <div className={`_value`}>
                    {hasReceiver && hasReceiver["address"]}
                    </div>
                  </div>
                  :null}
                  {item && item["id"]?
                  <div className={`infoDesc`}>
                    <div className={`_key`}>
                      {`Transacción ID`}
                    </div>
                    <div className={`_value`}>
                    {item && item["id"]}
                    </div>
                  </div>
                  :null}

                  {hasAgentDestination?
                  <div className={`infoDesc`}>
                    <div className={`_key`}>
                      {`Transferencia ${tt>0?"desde":"hacia"}:`}
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
                            {`Productos`}
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
                              <ItemProdComponent stckId={prId} isMobile={isMobile}  dispatch={dispatch} view_edit={viewUpdProd} inDx={indX}/>
                            )
                            
                            
                          })}
                        </div>
                      </div>
                  :null}

                  <div className={`pym81b sendBx mov_type _dsplFlx complete ${item["delivery"]?"already_completed":""}`} onClick={()=>confirm()}>
                    <div className={`icon_mov`}>
                      <Icon2 name={`success`} />
                    </div>
                    <div className={`mov_type_title `}>
                      {!item["delivery"]?`Completar Orden`:`Orden Completada`}
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

let hasPrice = item && item["price"]?true:false;





let imgI = item && item["imageUrl"];
var _thumbnailJson = imgI && _state['thumbnailJsonBlob'] && _state['thumbnailJsonBlob'][imgI];
let _blobrequested =  _thumbnailJson && _thumbnailJson['requested'];
let _blob = _blobrequested? _thumbnailJson['blob'] : null;


let _id = item && item["id"];


const stockProductD = _state["stockProduct"] || {}; 


const stockProduct = stockProductD && stockProductD[_id];


var _stock = stockProduct && stockProduct["stock"];

let _InStock = _stock && _stock>=item["qty"];




let qtyA = [1,2,3,4,5,6,7,8,9,10]
  if(_stock<10){
    qtyA = Array.from(Array(Math.floor(_stock)).keys());
  }


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
                        {_blob?<img src={_blob} className="Ws3Esf" alt="" data-iml="11510.614999991958"/>:null}
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
                          <span className="PTXMyf">{hasPrice?`${item["price"].toFixed(2)} US$`:""}</span>
                          <span className="unitlbl mrkPl">{item && `(${item["unit"]})`}</span>
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
                              placeholder={`Cantidad`} 
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
                      <span className="PTXMyf">{hasPrice?`${item["price"].toFixed(2)} US$`:""}</span>
                      <span className="unitlbl mrkPl">{item && `(${item["unit"]})`}</span>
                      <div className={`flexSpace`}/>
                    </div>
                  </div>
                </div>
                }
              </article>
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
                              placeholder={`Cantidad`} 
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
                  <div className={`flexSpace`}/>
                  <div className={`fieldPadding _MrgV  rmv_Pr`} >
                    <span onClick={()=>_removeUpd()}>
                      <BTNH theme={`fire_brick`} title={`Eliminar`}/>
                    </span>
                  </div>
                </div>:null
              }
            </a>   
          </div>
        </div>

    )

}

