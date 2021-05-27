

import React, { useEffect, useState, useRef } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import loadable from '@loadable/component'



import { withRouter, NavLink} from 'react-router-dom';

import {  OpenWatchDialog, fetchCities, fetchRemesa, loadReceivers,  loadStockProduct, OpenModal, OpenToast } from '../../actions/common'



import * as _Util from '../../store/Util'

import '../_styles.css'



//import '../PaypalCheckOut'




const BTNH = _Util.BTNH_Cmpt();
const Icon2 = _Util.Icon_Cmpt();


const InputText =  _Util.InputText_Cmpt();

const LoadingColorSpinner=  _Util.LoadingColorSpinner_Cmpt();
const DRPDW = loadable(() => import('../btns_dropbx'))
const MsgAlert = loadable(() => import('../MsgAlert'))









const StarRating = loadable(() => import('../stars_rating'))

const PaypalCheckOut = loadable(() => import('../PaypalCheckOut'))

const AmazonpayCheckOut = loadable(() => import('../AmazonpayCheckOut'))

const GooglePayCheckOut = loadable(() => import('../GooglePayCheckOut'))






const ReceiversMdl = loadable(() => import('./usersAgents/receiverModal'))

const ReceiversAlertDelete = loadable(() => import('../deleteAlert'))





const useObserveChanges = () => {
  const observeChanges =  useSelector(state => state.observeChanges);
  const dispatch = useDispatch(); 


  const _openMd = (_id, item) => {
    let data = {};
    data['zIndex']=450;
    data['Id']=_id;
    data['observeResize']=true;    
    data['props']={item:item, minHeight: '1vh'};
    // data['content']=<PaymentSlideUp />;
    OpenWatchDialog(dispatch,data);
  }


  const _openNewReceiver = (_id, item) => {
    let data = {};
    data['zIndex']=450;
    data['Id']=_id;
    data['observeResize']=true;    
    data['props']={item:item, minHeight: '1vh'};
    data['content']=<ReceiversMdl />;
    OpenModal(dispatch,data);
  }


  

  const _LoadCities= (q) => {
    fetchCities(q,dispatch);
  }

  const _updRemesa= (q,fNm) => {
    fetchRemesa(q,dispatch,fNm);
  }

  
  
  return { 
    observeChanges,
    _LoadCities,
    _openNewReceiver,
    dispatch,
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

  







const _formName = 'add_products';






const ShopingCartCmp = (props) => {
  const {
    _openMd,
    dispatch,
    _openNewReceiver
  } = useObserveChanges();

  const {
    _updFormObs
  } = useObserveForms();
  


  let _state = _Util.getStore();
  let keys = _Util.getGlobalsKeys()
  _state["keys"] = keys;

  const _form = _Util.getFormStore(_formName) || {};


 
  const [paypalLoaded, setPaypalLoaded] = useState(false);
  const [paidFor, setPaidFor] = useState(false);
  const [error, setError] = useState(null);
  const paypalRef = useRef();

  


  const [initialize, setInitialize] = useState(false);

  const [widthScreen, setWidthScreen] = useState(null);


  const [obs, setObs] = useState(0);
  
  const [tabIndex, setTabsIndex] = useState(0);

  const [pickReceiver, setPickReceiver] = useState(0);

  const [receiverId, setReceiverId] = useState(null);
  const [userID2, setUserID2] = useState(null);

  const [paymentType, setPaymentType] = useState(false);


  const [searchQ, setSearch] = useState("");
  
  let outerWidth = _state["outerWidth"];


  const [loadingCart, setloadingCart] = useState(true);
  

  const loadShoppingCart = async (bdy) => {
  
    const res = _Util.fetchStream_movie_data(_Util.get_GRAPHQLURL(),bdy)
    const td = await res;
    if(td){

      let dZs =  bdy.arraySerialization?_Util.deZerialize2Array(td,bdy.fields,1):td;
      setloadingCart(0)
      _Util.updStore('shopping_cart',dZs);
      let prodCart = {};
      _Util.ObjectKeys(dZs).map(scit=>{
        prodCart[dZs[scit]["productId"]] = td[scit]; 
        prodCart[dZs[scit]["productId"]]["id"] = scit;
      })
      //fetchQueue(aI,fMP44444);
      _Util.updStore('prod_shopping_cart',prodCart);
      dispatch({
        type: 'UPD_KEY_VALUE',
        kv:{key:'observeChanges',value:_Util.gen12CodeId()}
      })
    }
  }
  




  let _userId = _Util.getProfileId();
  useEffect(() => {
      if(widthScreen!==outerWidth){
        setWidthScreen(outerWidth);
      } 

      if(userID2!==_userId){
        setUserID2(_userId);
        //loadReceivers(_userId,_userId,dispatch);
      } 
    
      if(!initialize){
      setInitialize(true);
      
      let fields = [
        "id","name","isPublic","unit","imageUrl","categoryID",{N:"stock",f:["amount", "stock", "stockIn", "stockOut"]}
      ];
    
      let Qry2Inv = {
        query:"getStockProductQvaMarket",
        params:{
          isPublic:true
        }, 
        arraySerialization: _Util.isArraySerialization(),
        fields:fields
      };
    

      loadStockProduct(Qry2Inv,dispatch);


    
    
      loadReceivers(_userId,_userId,dispatch);

   /// calle 9 #18A E 2 y 6, Rpto Pueblo Nuevo
   //Angel Leyva Nicot
   //   


    let ldCmp = <ReceiversMdl />
    ldCmp = <StarRating />
    ldCmp = <LoadingColorSpinner />
    ldCmp = null;

      setTimeout(()=>{
        window.scrollTo(0,0);
        setTabsIndex(1);
      },50);
      setTimeout(()=>{ 
        let fields = [
          "id","name","isPublic","unit","imageUrl","categoryID",{N:"stock",f:["amount", "stock", "stockIn", "stockOut"]}
        ];
        let QrySC = {
          params:{userId:_userId},
          query:"getShoppingCartbyUserId", 
          //arraySerialization: _Util.isArraySerialization(),
          //fields:fields
        };
        loadShoppingCart(QrySC)}

      ,850);
      window.localStorage.setItem("lng","es");
      let frm =  _Util.getFormStore(_formName);
      if(!frm || !frm["id"]){
        _Util.updFormStore(_formName,{})
        _updFormObs();
      }
    }
  });
  


    

  let userA = _Util.getBrowser();
    
  let isMobile = userA.os === "Android" || userA.os === "iPhone" || _state["outerWidth"]<600 ;


  const shopping_cart = _state["shopping_cart"] || {};

  let receiversList = _state["receiversList"] || {};
  let receiversListArr = _Util.ObjectKeys(_state["receiversList"]) || [];
  


  const receiverIndex = receiverId || receiversListArr[0];


  const currentReceiver = receiverIndex && receiversList[receiverIndex];



  var prod2Show = shopping_cart;
  let total_cart = calc_total_cart(shopping_cart);





const updReceiver = (i) => {
  setReceiverId(i);
  setPickReceiver(0);
  window.scrollTo(0,0)
}


const newReceiver = (i) => {
  _openNewReceiver();
}

const removeReceiver = (i) => {
  let data = {};
  data['zIndex']=450;
  data['observeResize']=true;    
  data['props']={item:i, minHeight: '190px'};
  data['content']=<ReceiversAlertDelete />;
  OpenModal(dispatch,data);
}


let countItems = shopping_cart && _Util.ObjectKeys(shopping_cart).length;
let hasReceiver = receiversListArr && currentReceiver && receiversListArr.length>0?true:false;
let hasItems = countItems>0?true:false;



const confirmOrder = async (i) => {
  if(hasReceiver && receiverIndex){
    let Qry2Inv = {
      query:"getStockProductQvaMarket",
      params:{
        isPublic:true
      }
    };
    const res = _Util.fetchStream_movie_data(_Util.get_GRAPHQLURL(),Qry2Inv);
    const td = await res;
    if(td){
      _Util.updStore('stockProduct',td);
      let isvalid = true;
      let orderByProv = {};
      prod2Show && _Util.ObjectKeys(prod2Show).map(fV=>{        
        let prodID = prod2Show[fV] &&  prod2Show[fV]["productId"];
        let stck = td[prodID];
        let qty = prod2Show[fV]["qty"];
        let prodItm = prod2Show[fV] &&  prod2Show[fV]["product"];
        if((prodID && stck && stck["stock"] && stck["stock"]["stock"] && stck["stock"]["stock"]>qty) || prodItm["ignoreStock"]){          
          let provId = prodItm["providerId"] || _Util.getUAd();
          if(!orderByProv[provId]){
            orderByProv[provId] = {}
            orderByProv[provId]["cartProd"] = [];
            orderByProv[provId]["total_cart"] = 0;
          }
          orderByProv[provId]["cartProd"].push(fV);
          orderByProv[provId]["total_cart"] += (prod2Show[fV].qty * prod2Show[fV].sale_price);
        }
        else{
          isvalid = false;
          let toast = {
            text:`El producto ${prodItm && prodItm["name"]} tiene cantidad limitada`
          }
          OpenToast(dispatch,toast)
          setObs(_Util.gen12CodeId())
        }
      })
      if(isvalid){
        orderByProv && _Util.ObjectKeys(orderByProv).map(obC =>{
          let nO = {
            "amount":orderByProv[obC].total_cart,
            "agentId":obC,
            "receiverId":receiverIndex,
            "description":"",
            "tasa":25,
            "type":"COMBO",
            "delivery":false,
            "date":(new Date()).getTime(),
            //"orderId":_Util.gen12CodeId(),
            "cartProd":orderByProv[obC].cartProd
          }

          let QryShp = {
            query:"AddCombofromQvamarket",
            form:nO,
            params:{
              userId:_userId
            }
          };
          //console.log(QryShp)
          sendingOrders(QryShp)

        })
        
      }
    }
  }
  dispatch({
    type: 'UPD_KEY_VALUE',
    kv:{key:'observeChanges',value:_Util.gen12CodeId()}
  })
}


const sendingOrders = async (QryShp) => {
  const ttt = _Util.fetchStream_movie_data(_Util.get_GRAPHQLURL(),QryShp);
  const spR = await ttt;
  if(spR){
    let QrySC = {
      params:{userId:_userId},
      query:"getShoppingCartbyUserId"
    };
    loadShoppingCart(QrySC);
  }
}



if(_Util.IsAdmin()){
  if(searchQ && searchQ.length>1){
    receiversList = searchb(_state["receiversList"],searchQ);
    receiversListArr = _Util.ObjectKeys(receiversList) || [];
  }else{
    receiversListArr = [];
  }
}


var _thumbnailJson = _state['thumbnailJsonBlob'] && _state['thumbnailJsonBlob']["qvaMarket_logo2.png"];
let _blobrequested =  _thumbnailJson && _thumbnailJson['requested'];
let _blob = _blobrequested? _thumbnailJson['blob'] : null;




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
        <div className={` palette formContainer shopping_cart market_qva ${isMobile?"is_mobile":""}`} style={{opacity:tabIndex === 1?1:0}} >
                <div className={`formContainer `} style={{opacity:tabIndex === 1?1:0}}>
                    {tabIndex === 1?
                      <div className={`centerListCardProd  `}> 
                      {hasItems?
                      <>
                      <div  className={`  headerTtl  `}>
                          <div className={`mainTitle`}>
                            {_Util.translatetext(90)}
                          </div>
                          <div className={``}>
                            <div className={`pym81b sendBx `}>
                                <div className={`subtotal_cart ${hasItems?"":"_emptycart"}`}>
                                    {hasItems?`${_Util.translatetext(83)} (${countItems} ${_Util.translatetext(84)}${countItems>1?"s":""}):`:_Util.translatetext(24)}
                                </div>
                                <div className={`total_cart `}>
                                  {`US$ ${total_cart?total_cart.toFixed(2):0}`}
                                  <div className={`sendBtn`}>
                                      {receiverIndex && hasItems?
                                      <div className={`fieldPadding _MrgV`} style={{ marginTop: "10px"}}>
                                        {!paymentType?
                                        <span onClick={()=>setPaymentType(!paymentType)}>
                                          <BTNH theme={`light_blue`} title={"CheckOut"}/>
                                        </span>
                                        :
                                        <span onClick={()=>setPaymentType(!paymentType)}>
                                          <Icon2 name={"Xclose"} color={"rgba(95,99,104,1)"}/>
                                        </span>
                                        
                                        }
                                      </div>
                                      :null}
                                      {paymentType?
                                          <>
                                          <div className={`separatorM`} /> 
                                          <div >
                                            <span onClick={()=>confirmOrder()}>
                                              <BTNH theme={`light_blue`} title={_Util.translatetext(85)}/>
                                            </span>
                                          </div>
                                          </>
                                        :null}
                                      {_Util.IsAdmin() && paymentType?
                                          <>
                                          <div className={`separatorM`} /> 
                                          <PaypalCheckOut prod2Show={prod2Show} />
                                          </>
                                        :null}          
                                      {_Util.IsAdmin() && paymentType?
                                        <>
                                        <div className={`separatorM`} /> 
                                        <GooglePayCheckOut />
                                        </>
                                      :null}

                                      {_Util.IsAdmin() && paymentType?                                        
                                        <>
                                        <div className={`separatorM`} /> 
                                        <AmazonpayCheckOut />
                                        </>
                                      :null} 
                                  </div>
                                </div>
                            </div>
                          </div>
                        </div>
                        {_state["userProfile"] && _state["userProfile"]["email"]?
                        <div className={`receiversBox`}>
                            {hasReceiver && pickReceiver?
                            <div className={`pym81b sendBx receivers `}>
                            <div className={`_dsplFlx _flxWrp `}>
                              <div className={`subtotal_cart `}>
                                  {`${_Util.translatetext(87)}:`}
                              </div>
                              <div className={`flexSpace`}/>
                              <div className={`sendBtn`}>
                                  <div className={`fieldPadding _MrgV`}>
                                    <span onClick={()=>newReceiver()}>
                                      <BTNH theme={`light_blue`} title={_Util.translatetext(86)}/>
                                    </span>
                                  </div>
                              </div>
                            </div>
                            {_Util.IsAdmin()?
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
                                initvalue={_form["search"]}
                              />
                            </div>
                            :null}
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
                                        <span onClick={()=>removeReceiver(rcvL)}>
                                          <BTNH theme={`fire_brick`} title={_Util.translatetext(68)}/>
                                        </span>
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
                          :<div className={`pym81b sendBx receivers ${hasReceiver?"":"_emptyrcv"}`}>
                          <div className={`subtotal_cart `}>
                              {hasReceiver?`${_Util.translatetext(62)}:`:_Util.translatetext(88)}
                          </div>
                          <div className={`total_cart `}>
                              <div>
                                {currentReceiver && currentReceiver["name"]}
                              </div>
                          </div>
                          <div className={`subtotal_cart `}>
                              <div>
                                {currentReceiver && currentReceiver["address"]}
                              </div>
                          </div>
                          <div className={`sendBtn`}>
                            <div className={`fieldPadding _MrgV`} style={{ marginTop: "10px"}}>
                              <span onClick={()=>hasReceiver?setPickReceiver(1):newReceiver()}>
                                <BTNH theme={`light_blue`} title={hasReceiver?_Util.translatetext(89):_Util.translatetext(86)}/>
                              </span>
                            </div>
                          </div>
                        </div>
                        }
                        </div>
                        :null}
                        <div className={` sendBx scroll3Wrp `} >
                          <div className={`_dsplFlx space2Around _flxWrp op4oU`}>
                          {
                            prod2Show && _Util.ObjectKeys(prod2Show).map(fV=>{
                                return (
                                  <>
                                    <ItemProdComponent key={"shopping_cart_"+fV} stckId={fV} dispatch={dispatch} isMobile={isMobile}/>
                                  </>
                                )
                            })
                          }
                          </div>
                        </div>
                        </>
                      :
                      <div>
                        <div className={`formContainer `} style={{opacity:1}}>
                          <div className={`marginCard`}>
                            <div className={`empty_cart_card `}>
                              <div className={`elevation_QvaAvatarCard `}>
                                <NavLink  to={{pathname:"/marketplace"}}>
                                  <div className={`_imagCnt `}>
                                    {_blob?<img src={_blob} alt="qvaMarket"/>:null}
                                  </div>
                                </NavLink>  
                              </div>
                              <div className={`gxLayout_column `}>
                                <h3  className={`title_empty_cart `} >
                                  {loadingCart?_Util.translatetext(25):_Util.translatetext(24)}
                                </h3>
                              </div>
                              {loadingCart?<LoadingColorSpinner stroke={'#1a73e8'} height={120} width={120}/>:
                              <div className={`empty_cartContentWrapper`}>
                                <p>{_Util.translatetext(100)}</p>
                                <span onClick={()=>{}}>
                                  <NavLink  to={{pathname:"/marketplace"}}>
                                    <BTNH theme={`blue_white`} title={_Util.translatetext(1)}/>
                                  </NavLink>  
                                </span>
                              </div>
                              }
                            </div>
                          </div>
                        </div>
                      </div>}
                  </div>
                  :null}
                </div>
          </div>

          <div  className={`footSpace`}/>
      </>
    );
  
}  





export default withRouter(ShopingCartCmp)





const ItemProdComponent = (props) => {

  const {
    stckId, isMobile,  dispatch
  } = props;
 
 
  let _state = _Util.getStore();

  const shopping_cart = _state["shopping_cart"] || {};
  
  let stck = shopping_cart[stckId];


  let item =stck && stck["product"];





  const [updLoading, setupdLoading] = useState(0);
  


  
  const removeProd = async (qty) => {
    let Qry = {
      params:{id:stck["id"]},
      query:"deleteShoppingCart"
    };
    const res = _Util.fetchStream_movie_data(_Util.get_GRAPHQLURL(),Qry);
    const td = await res;
    if(td){
      let _Id = stck["id"];
      delete shopping_cart[_Id];
      _Util.updStore('prod_shopping_cart',shopping_cart);
      // setTimeout(()=>{},450);
      dispatch({
        type: 'UPD_KEY_VALUE',
        kv:{key:'observeChanges',value:_Util.gen12CodeId()}
      })
      setupdLoading(0)
    }
  }


  let hasPrice = item && item["salePrice"]?true:false;


    
/*
  let imgI = item && item["imageUrl"];
  var _thumbnailJson = imgI && _state['thumbnailJsonBlob'] && _state['thumbnailJsonBlob'][imgI];
  let _blobrequested =  _thumbnailJson && _thumbnailJson['requested'];
  let _blob = _blobrequested? _thumbnailJson['blob'] : null;
*/

  let sz = "170";



  let _id = item && item["id"];


  let pId = "pId_shp_" +_id
  
  
  
  const [hid, setHidd] = useState(null);
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

  })

  const stockPrdAll = _state["stockProduct"] || {}; 
  let prod_id = item && item["id"];


  const stockProduct = stockPrdAll && stockPrdAll[prod_id]  && stockPrdAll[prod_id]["stock"];


  let ignoreStock = item && item["ignoreStock"];
  
  
  var _stock = ignoreStock ? 20: stockProduct && stockProduct["stock"];



  let _InStock = _stock && _stock>=stck["qty"];

  var _cost_prc = stockProduct && (stockProduct["amount"] / stockProduct["stockIn"]);

  var _sale_prc = item && item["salePrice"];


  let qtyA = [1,2,3,4,5,6,7,8,9,10]
  if(_stock && _stock>0 && _stock<10){
    qtyA = Array.from(Array(Math.floor(_stock)).keys());
  }



  const updQty = async (qty) => {
    setupdLoading(1);
    let Qry = {
      form:{id:stck["id"],qty:qty,cost_price:_cost_prc,sale_price:_sale_prc },
      query:"upgradeShoppingCart"
    };
    const res = _Util.fetchStream_movie_data(_Util.get_GRAPHQLURL(),Qry);
    const td = await res;
    if(td){
      let _Id = _Util.ObjectKeys(td)[0];
      const shopping_cart = _state["shopping_cart"] || {};
      shopping_cart[_Id] = td[_Id];
      _Util.updStore('prod_shopping_cart',shopping_cart);
      setTimeout(()=>{
        dispatch({
          type: 'UPD_KEY_VALUE',
          kv:{key:'observeChanges',value:_Util.gen12CodeId()}
        })
        setupdLoading(0)
      },450);
    } 

  }



  return (
      <div jsname="JNwhwd" className="xwW5Ce u3mD2d " >
        <div className="m18Ex  u3mD2d xwW5Ce">
            <a className=" u3mD2d xwW5Ce brdBt_ShopCart">
              <article className="u3mD2d xwW5Ce u3mRow spaceAround">
                <div className="_dsplFlx  itm_ShopCart">
                  <div className="exewIc pqv9ne">
                    {false?
                    <div class="OFmygf jK2Lef" style={{backgroundColor:"#fce8e6", color:"#ea4335"}}>No disponible</div>
                    :null}
                    <div className="EbzW3 xwW5Ce qSGFRd YzcgQb UKsopf u3mD2d">
                      <div className="ap5GNb YxFYtf yhS73e" style={{paddingTop: "100%"}}>
                      {_blob===2?<img src={_imgI} className="Ws3Esf" alt="" />:null}
                      </div>
                    </div>
                  </div>
                  <div className="egZxgf pqv9ne b7mrgL">
                    <NavLink  to={{pathname:"/product_details",search:"?prodId="+ _id}} className=" u3mD2d xwW5Ce">
                      <div className="MPhl6c pqv9ne azTb0d YAEPj SGmlof" title={item && `${item["name"]}` }>{item && `${item["name"]}` }</div>
                    </NavLink>   
                    <span className="iu5UVe DX0ugf ApBhXe m5Ca5b">
                      <StarRating rate={3.25}/>
                      <div className="L9k4yd">3</div>
                    </span>
                    <div className=" rBtmla75 pqv9ne rla7 ">
                    
                    {!_InStock ?<MsgAlert text={_Util.translatetext(29)} theme={'red'}/>:<MsgAlert text={_Util.translatetext(21)} theme={'green'}/>}
                    </div>
                    {isMobile?
                    <div className="egZxgf pqv9ne priceinDesktop">
                      <div className="egZxgf pqv9ne">
                        <div className="DX0ugf ApBhXe _dsplFlx">
                          <span className="PTXMyf">{hasPrice?`${item["salePrice"]} US$`:""}</span>
                          <span className="unitlbl mrkPl">{item && `(${item["unit"]})`}</span>
                          <div className={`flexSpace`}/>
                        </div>
                      </div>
                    </div>
                    :null
                    }
                    {!isMobile?                    
                    <>
                     { _InStock?   
                    <div className="egZxgf pqv9ne">
                      {updLoading?
                        <div className="loading_updQty">
                            <LoadingColorSpinner stroke={'#1a73e8'} height={50} width={50}/>
                        </div>
                        :
                        <div className="DX0ugf ApBhXe _dsplFlx" >
                          <DRPDW value={stck["qty"]} list={qtyA}  updchange={(v)=>updQty(v)}/>
                        </div>
                      }
                    </div>
                    :null}
                    <div className={`fieldPadding _MrgV`} style={{ marginTop: "10px"}}>
                      <span onClick={()=>removeProd()}>
                        <BTNH theme={`fire_brick`} title={_Util.translatetext(68)}/>
                      </span>
                    </div>
                    </>:null}
                  </div>
                </div>
                {isMobile?null:
                <div className="egZxgf pqv9ne priceinDesktop">
                  <div className="egZxgf pqv9ne">
                    <div className="DX0ugf ApBhXe _dsplFlx">
                      <span className="PTXMyf">{hasPrice?`${item["salePrice"]} US$`:""}</span>
                      <span className="unitlbl mrkPl">{item && `(${item["unit"]})`}</span>
                      <div className={`flexSpace`}/>
                    </div>
                  </div>
                </div>
                }
              </article>
              {isMobile?
                <div className="_dsplFlx">
                {_InStock?
                <div className="egZxgf pqv9ne">
                  {updLoading?
                    <div className="loading_updQty">
                        <LoadingColorSpinner stroke={'#1a73e8'} height={50} width={50}/>
                    </div>
                    :
                    <div className="DX0ugf ApBhXe _dsplFlx" >
                      <DRPDW value={stck["qty"]} list={qtyA}  updchange={(v)=>updQty(v)}/>
                    </div>
                  }
                </div>
                :null}
                <div className={`fieldPadding _MrgV`} style={{ marginTop: "10px"}}>
                  <span onClick={()=>removeProd()}>
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





function calc_total_cart(o){
  let tt = 0
  _Util.ObjectKeys(o).map(k=>{
    tt += o[k]["qty"] * o[k]["sale_price"];
  })
  return tt;
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

Arroz 2.2$ Lb  
frijol Negro 1.8$ Lb  
Spaguetti (500g) 6$ paquete  
Jugo Mango (500ml)  4.5$ caja
Jugo Manzana (200ml)  2.5$ caja
Jugo Naranja (1l)  7$ caja
Tomate Frito (350ml) 4$ caja
Pasta Tomate Taoro (1G) 21$ lata
*/




/*
  leche en polvo 6$ paquete
  Pollo 2.5$ Lb
  Lomo Ahumado 4.5$
  Beico 4.5$
  chorizo 4$
*/