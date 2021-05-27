

import React, { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import loadable from '@loadable/component'



import { withRouter} from 'react-router-dom';


import { 
  loadReceivers,
  loadStockProduct
} 
from '../../../actions/common'



import * as _Util from '../../../store/Util'

import '../../_styles.css'



const Icon2 = _Util.Icon_Cmpt();


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
      _Util.updStore('orderHDetails',td);
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

  const item = _state["orderHDetails"] || {}; 





  let _userId = _Util.getProfileId();
  useEffect(() => {  
    if(widthScreen!==outerWidth){
      setWidthScreen(outerWidth);
    } 
    if(!initialize){
      setInitialize(true);
      _Util.updViewActive(7);
      if(!(router && router["orderId"])){
        _state["route_history"].push({pathname:"/orders"});
      }else{
        loadMovDt(dispatch,_userId,router["orderId"]);
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



let hasReceiver =item && item["receiver"];
let hasProducts =item && item["prdDtls"] && item["prdDtls"]["products"];

let hasAgentDestination =item && item["agentDestinationDetails"] && item["agentDestinationDetails"]["name"];



let hasDate = item && _Util.date2pretyfy(item["date"]) ;


const calcTotal = () => {
  let total = 0;
  hasProducts && _Util.ObjectKeys(hasProducts).map((prId,indX)=>{
    let itmPr = hasProducts[prId];
    total += (itmPr["sale_price"] * itmPr["qty"]);

  })
  return total<0?total*-1:total;
}

let tt =calcTotal();

let hasDiscount =item && item["discount"]?item["discount"]:0;

let _total = tt;
if(hasDiscount){
  _total = tt - hasDiscount;
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
                        {item && item["orderId"]}
                        </div>
                        <div className={`total_cart total_mov ${_total>0?"pos":"neg"}`}>
                          {`$ ${_total?_total.toFixed(2):0}`}
                          <div className={`sendBtn`}>
                          </div>
                        </div>
                        {hasDiscount ?
                          <div className={`cost_detail`}>
                            <div className={`amount`}>
                              {`Total:  `}
                              <span>
                                {`$${tt?(tt*1).toFixed(2):0}`}
                              </span>
                            </div>
                            <div className={`amount`}>
                              {`Descuento:  `}
                              <span>
                                {`$${hasDiscount?(hasDiscount*1).toFixed(2):0}`}
                              </span>
                            </div>
                          </div>
                        :null}
                        <div className="date_mov">{hasDate}</div>
                    </div>
                  </div>
                  
                  {hasReceiver?
                  <div className={`infoDesc`}>
                    <div className={`_key`}>
                    {_Util.translatetext(14)}
                    </div>
                    <div className={`_value`}>
                      {hasReceiver && hasReceiver["name"]}
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
                  <div className={`infoDesc`}>
                    <div className={`_key`}>
                      {_Util.translatetext(60)}
                    </div>
                    <div className={`_value`}>
                    {hasReceiver && hasReceiver["address"]}
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
                          <div className={`_key`}>
                          {_Util.translatetext(63)}
                          </div>
                          <div className={`flexSpace`}/>
                        </div>
                        <div className={` `}>
                          {hasProducts && _Util.ObjectKeys(hasProducts).map((prId,indX)=>{
                            // let prodItm = hasProducts[prId];
                            return (
                              <ItemProdComponent stckId={prId} isMobile={isMobile}  dispatch={dispatch} inDx={indX}/>
                            )
                            
                            
                          })}
                        </div>
                      </div>
                  :null}

                  <div className={`pym81b sendBx mov_type _dsplFlx complete ${item["IsDelivery"]?"already_completed":"activeBlue"}`} >
                    <div className={`icon_mov`}>
                      <Icon2 name={!item["IsDelivery"]?`timer_outline`:`success`} />
                    </div>
                    <div className={`mov_type_title `}>
                      {!item["IsDelivery"]?_Util.translatetext(52): _Util.translatetext(53)}
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

  const mvD = _state["orderHDetails"] || {};

  let prodsL =mvD && mvD["prdDtls"] && mvD["prdDtls"]["products"];


 

  let item = prodsL && prodsL[stckId];


  const [view_edit, setView_edit] = useState(false);
  


let hasPrice = item && item["sale_price"]?true:false;




/*
let imgI = item && item["imageUrl"];
var _thumbnailJson = imgI && _state['thumbnailJsonBlob'] && _state['thumbnailJsonBlob'][imgI];
let _blobrequested =  _thumbnailJson && _thumbnailJson['requested'];
let _blob = _blobrequested? _thumbnailJson['blob'] : null;

*/

let sz = "170";


let pId = "pId_ord_hy" +item["productID"]



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
                          <span className="PTXMyf">{hasPrice?`${item["sale_price"].toFixed(2)} US$`:""}</span>
                          <span className="unitlbl mrkPl">{item && `(${item["unit"]})`}</span>
                          <div className={`flexSpace`}/>
                        </div>
                      </div>
                    </div>
                    :null
                    }
                  </div>
                </div>
                {isMobile?null:
                <div className="egZxgf pqv9ne priceinDesktop">
                  <div className="egZxgf pqv9ne">
                    <div className="DX0ugf ApBhXe _dsplFlx">
                      <span className="PTXMyf">{hasPrice?`${item["sale_price"].toFixed(2)} US$`:""}</span>
                      <span className="unitlbl mrkPl">{item && `(${item["unit"]})`}</span>
                      <div className={`flexSpace`}/>
                    </div>
                  </div>
                </div>
                }
              </article>
            </a>   
          </div>
        </div>

    )

}

