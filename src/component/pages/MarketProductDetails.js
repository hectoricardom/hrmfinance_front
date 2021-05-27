

import React, { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import loadable from '@loadable/component'



import { NavLink, withRouter} from 'react-router-dom';

import {  OpenWatchDialog, fetchCities, fetchRemesa, fetchProductsID, getThumbnailImg, OpenToast, loadShoppingCart, getDispatch } from '../../actions/common'



import * as _Util from '../../store/Util'

import '../_styles.css'



/*

const MoreInfoButton = loadable(() => import('../MoreInfoButton'))
const TabsHRM = loadable(() => import('../tabsHRM'))
const InputAutocomplete = loadable(() => import('../InputAutocomplete'))

*/



const StarRating = loadable(() => import('../stars_rating'))

const PaymentSlideUp = loadable(() => import('../paymentSlideUp'))

const InputText = loadable(() => import('../InputText'))


const BTNH = loadable(() => import('../btns_confirm'))


const MsgAlert = loadable(() => import('../MsgAlert'))


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

  
  
  return { 
    observeChanges,
    _LoadCities,
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

  







const _formName = 'add_products_cart';






const SendersComponent = (props) => {
  const {
    _openMd,
    dispatch,
    _updRemesa
  } = useObserveChanges();

  const {
    _updFormObs
  } = useObserveForms();
  


  let _state = _Util.getStore();
  let keys = _Util.getGlobalsKeys()
  _state["keys"] = keys;

  const _form = _Util.getFormStore(_formName) || {};




  const [initialize, setInitialize] = useState(false);

  const [widthScreen, setWidthScreen] = useState(null);

  const [choosePayView, setChoosePayView] = useState(0);
  const [validForm, setIsValidForm] = useState(false);
  const [formView, setformView] = useState(1);
  const [view, setView] = useState(false);

 

  const [catLoaded, setcatLoaded] = useState(false);
  
  
  let fld2Prs = ['id','name',"categoryID","unit","description","imageUrl","salePrice"];    

  let outerWidth = _state["outerWidth"];

  const searchHash = window.location.hash.split('?')[1]?window.location.hash.split('?')[1]:null;
  const router = _Util.parseQuery(searchHash);

  let _userId = _Util.getProfileId();

  

  useEffect(() => {  
    if(widthScreen!==outerWidth){
      setWidthScreen(outerWidth);
    } 
    if(!initialize){
      setInitialize(true);
      _Util.updViewActive(2);
      /*
      let QryStockProduct = {
        query:"getStockProduct"
      };
      fetchRemesa(QryStockProduct,dispatch);

      
      let Qry2Inv = {
        query:"getStockProductQvaMarket",
      };      


      loadStockProduct(Qry2Inv,dispatch);
      */

      let Qry2 = {
        params:{
          id:router.prodId
        },
        query:"getQueryProductsID",
      };

      _Util.updFormStore(_formName,{qty:1});
      fetchProductsID(Qry2,dispatch);

     
      let QrySC = {
        params:{userId:_userId},
        auth:{
          authCode:"850217"
        },
        query:"getShoppingCartbyUserId"
      };
      
      loadShoppingCart(QrySC,dispatch);


      setTimeout(()=>{
        window.scrollTo(0,0);
        
      },350);
      setTimeout(()=>setView(true),50);
      window.localStorage.setItem("lng","es");
    }
  });
  






  

  const handleInput = (v,f) => {
    let frm =  _form;
    frm[f] = v
    _Util.updFormStore(_formName,frm)
    validateFields()
  }





  const vldFlds = {
    name:{reqired:true, minLength:3},
    unit:{reqired:true, minLength:2},
    categoryID:{reqired:true}
  }


  

  const validateFields = (v,f) => {  
    let frm =  _Util.getFormStore(_formName);       
    let _2Fs = frm || {};     
    let _2s = {};
    _2Fs && fld2Prs.map(fld=>{
      _2s[fld] = _2Fs[fld];
    })    
    let vld = vldFlds;
    var _Valid = _Util.validations(vld,_2s); 
    if(_Valid.valid){
      setIsValidForm(true)
    }else{
      setIsValidForm(false)
    }
    _updFormObs();
  }



  var _productsDetail = _state["productsDetail"];


  
  
  var itm = router.prodId && _productsDetail && _productsDetail[router.prodId];


  let userA = _Util.getBrowser();
    
  let isMobile = userA.os === "Android" || userA.os === "iPhone" || _state["outerWidth"]<550 ;



  let ignoreStock = itm && itm["ignoreStock"];
  var _stockDtl = itm && itm["stock"];
  var _stock =ignoreStock ? 20: _stockDtl && _stockDtl["stock"];

  let cost_price = _stockDtl &&  (_stockDtl["amount"] / _stockDtl["stockIn"]);

  let _InStock = _stock && _stock>1;
/*

  let imgI = itm && itm["imageUrl"];
  var _thumbnailJson = imgI && _state['thumbnailJsonBlob'] && _state['thumbnailJsonBlob'][imgI];
  let _blobrequested =  _thumbnailJson && _thumbnailJson['requested'];
  
  if(!_blobrequested){
    getThumbnailImg(imgI, getDispatch());
  }
  
  let _blob = _blobrequested? _thumbnailJson['blob'] : null;
*/



  let sz = "360";

  let imgI = itm && itm["imageUrl"]+"?sz="+sz;
  
  let _blob = imgI && _Util.imageRxUrl()+ imgI;
  
  
  


  const add_combo_prod = async (v,f) => {
    if(_state["userProfile"] && _state["userProfile"]["email"]){
      let _2s =  _Util.getFormStore(_formName);
      _2s["productId"] = itm["id"];
      _2s["cost_price"] = cost_price;
      _2s["sale_price"] = itm["salePrice"];
      _2s["userId"] = _userId;
      _updFormObs();
      let Qry = {
        form:_2s,
        auth:{
          authCode:"850217"
        },
        fields:[
          "id","name",
        ],
        query:"upgradeShoppingCart"
      };
      const res = _Util.fetchStream_movie_data(_Util.get_GRAPHQLURL(),Qry);
      const td = await res;
      if(td){
        _Util.getLng()

        let toast = {
          text:`${_2s["qty"]} (${itm["unit"]}) ${_Util.translatetext(101)} ${itm["name"]} ${_Util.translatetext(_2s["qty"]>1?103:102)}`
        }
        let QrySC = {
          params:{userId:_userId},
          query:"getShoppingCartbyUserId"
        };
        loadShoppingCart(QrySC);
        OpenToast(dispatch,toast)
        dispatch({
          type: 'UPD_KEY_VALUE',
          kv:{key:'observeChanges',value:_Util.gen12CodeId()}
        })
        props.history.push({pathname:"/marketplace"})
      }  
    }else{
      var h = document.getElementById("g_signin2_bx");
      h.hidden = false;
      _Util.updStore('singinView',true);
      dispatch({
        type: 'UPD_KEY_VALUE',
        kv:{key:'observeChanges',value:_Util.gen12CodeId()}
      })
    }
  }

  // const shopCart = _state["shopping_cart"] || {}; 
  const prod_shopping_cart = _state["prod_shopping_cart"] || {}; 
  let isPublic = itm && itm["isPublic"];




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
        {isPublic?
        <div className={`palette  formContainer ${isMobile?"is_mobile":""}`} style={{opacity:itm && view?1:0}} >
            <div className={`formContainer centerListCardProd `} style={{opacity:1}}>  
              <div className={`_dsplFlx _flxWrp HRKRR`}>
              
              {isMobile?null:
                  <div className={`B6hqVd`}>
                    <div class="sh-div__viewport img_dtl">
                      <div class="TiQ3Vc main-image">
                        {_blob?<img class="sh-div__image sh-div__current" alt="" src={_blob} data-atf="0"/>:null}
                      </div>
                    </div>
                  </div>
                }


                <div className={`formContainer info_prod`}>
                  <div className={`mainTitle`}>
                    {`${itm && itm["name"]}`}
                  </div>
                  {itm && itm["desc"]?
                    <div className={`descTitle`}>
                        {`${itm["desc"]}`}
                    </div>
                  :null}

                  <div className={`_dsplFlx spaceAround`}>
                    <span className="iu5UVe DX0ugf ApBhXe m5Ca5b">
                      <StarRating rate={4.65}/>
                      <div className="L9k4yd">1</div>
                    </span>
                    {!_InStock ?<MsgAlert text={_Util.translatetext(29)} theme={'red'}/>:<MsgAlert text={_Util.translatetext(21)} theme={'green'}/>}
                  </div>


                  {isMobile?
                  <div className={`B6hqVd`}>
                    <div class="sh-div__viewport img_dtl">
                      <div class="TiQ3Vc main-image">
                        {_blob?<img class="sh-div__image sh-div__current" alt="" src={_blob} data-atf="0"/>:null}
                      </div>
                    </div>
                  </div>
                  :null}
                  



                  <div className={`_dsplFlx  `}>
                    {isMobile?<div className={`flexSpace`}/>:null}
                    <div className={`mainTitle`}>
                      {itm && itm["salePrice"]?`$${itm && itm["salePrice"]}`:""}                      
                    </div>
                    <div className={`unitlbl`}>
                      {itm && itm["unit"]?`(${itm && itm["unit"]})`:""}                      
                    </div>
                  </div>
                  {itm && prod_shopping_cart[itm["id"]]?
                  <div className={'  _dsplFlx spaceAround'} style={{marginTop:'25px'}}>
                    <NavLink  to={{pathname:"/shopping_cart"}}>
                        <div className={'  _dsplFlx _currentprice box_alert green_alert rtCambio'}>
                        <span>{`  `} </span>
                        <span className={' _cpBtcn'}>{_Util.translatetext(40)}</span>
                      </div>
                    </NavLink>
                  </div>:null
                  }
                  {itm && _InStock && !prod_shopping_cart[itm["id"]]?
                  <div className={`_dsplFlx spaceAround _mrgtp25`}>
                    <div className={`paddField`}>
                      <InputText 
                        icon={`more_vert`} 
                        form={_formName} 
                        field={`qty`}  
                        keyCode={39} 
                        background={`#f9f9f9`}
                        color={`var(--base-color)`}
                        placeholder={_Util.translatetext(15)} 
                        OnChange={(e)=>handleInput(e,`qty`)}
                        validations={{reqired: true, number: true, minValue:1}}
                        initvalue={_form["qty"]}
                      />
                    </div>
                    {_form["qty"] && _form["qty"]>0?
                    <>
                    {_stock >= _form["qty"]?
                      <div className={`paddField`}>
                        <div className={`fieldPadding _MrgV`} style={{ marginTop: "10px"}}>
                          <span onClick={()=>add_combo_prod()}>
                            <BTNH theme={`light_blue`} title={_Util.translatetext(12)}/>
                          </span>
                        </div>
                      </div>
                      :
                      <div className={'  _dsplFlx spaceAround'} style={{marginTop:'25px'}}>
                        <div className={'  _dsplFlx _currentprice box_alert red_alert rtCambio'}>
                          <span>{`  `} </span>
                          <span className={' _cpBtcn'}>{_Util.translatetext(30)}</span>
                        </div>  
                      </div>
                    }
                    </>
                    :null}
                  </div>:null
                  }
                </div>
                
              </div>
              {itm && itm["description"]?
              <div className={`descDtlWrp`}>
                  <div className={`descDtlLbl`}>
                    <span className={' _cpBtcn'}>  {_Util.translatetext(37)}</span>
                  </div>
                  <div className={`descDtlProd`}>
                    {itm["description"]}
                  </div>
              </div>
              :null}
              {itm && itm["specificationAllowed"]?
              <div className={`descDtlWrp`}>
                  <div className={`descDtlProd`}>                    
                    <span className={' _cpBtcn'}> {`${_Util.translatetext(38)} (${_Util.translatetext(11)}) `}</span>
                    <div>{_Util.translatetext(39)}</div>
                  </div>
                  <div className={``}>
                    <div className={`paddField`}>
                      <InputText 
                        icon={`more_vert`} 
                        form={_formName} 
                        field={`specifications`}
                        keyCode={91} 
                        background={`#f9f9f9`}
                        color={`var(--base-color)`}
                        placeholder={_Util.translatetext(38)} 
                        OnChange={(e)=>handleInput(e,`specifications`)}
                        initvalue={_form["specifications"]}
                      />
                    </div>
                  </div>
              </div>
              :null}

            </div>
        </div>
        :null}
      </>
    );
  
}  



/*
  <div class="sh-div__zoomed" data-ih="1000" data-iw="1000" style="background-image:url(https://encrypted-tbn1.gstatic.com/shopping?q=tbn:ANd9GcRCtzg2hxRcRsKWk0rMztnz3SJswdtiDeLLZ-cg0ttYiHtv0JpFFM0iumy7s9_D7ID0Op5ri9BeAE4tn3eqR2xUf61OjQ66&amp;usqp=CAY)"></div>
  <div class="sh-div__zoomed" data-ih="1000" data-iw="1000" style="background-image:url(https://encrypted-tbn2.gstatic.com/shopping?q=tbn:ANd9GcSSn4ILkx166Dku-6stH5dAQJR7m5ChOVJRXEqImcX45_Gwn2kygUmDO3F0JxQmadgheSPSe1jU0MYurPSIfP9JZMj97jKRsQ&amp;usqp=CAY)"></div>
  <div class="sh-div__zoomed" data-ih="1000" data-iw="1000" style="background-image:url(https://encrypted-tbn2.gstatic.com/shopping?q=tbn:ANd9GcR9tUvXrkgHJRDg_2C_bHEuFY-W4PIDMjb8FeoNvpGSDrWTaAXzDFEZKPrJvQ-EunLKWc39Lm4WsTlZ-ffE0v6ah7J_smDIRw&amp;usqp=CAY)"></div>
  <div class="sh-div__zoomed" data-ih="1000" data-iw="1000" style="background-image:url(https://encrypted-tbn1.gstatic.com/shopping?q=tbn:ANd9GcTMlGTd9PnGge9QuK1-E7eLYPydiP0nisv-PAMSjHLUrm2eaEylfn20aOWxEFzRztjDEDIQCkQSyPMLFSgH2rHzAGKkToqjOA&amp;usqp=CAY)"></div>

*/



export default withRouter(SendersComponent)





/*
<div className=" rBmla2 pqv9ne rla7 ">
                      {_InStock?
                      <div className="OFmygf jK2Lef" style={{backgroundColor:"rgba(230,244,234,1)", color:"rgba(24,128,56,1)"}}>Entrega gratis en 48h</div>
                      :<div class="OFmygf jK2Lef" style={{backgroundColor:"#fce8e6", color:"#ea4335"}}>No disponible</div>}
                    </div> 


*/