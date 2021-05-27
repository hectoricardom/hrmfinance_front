

import React, { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'

import { withRouter, NavLink} from 'react-router-dom';

import {  OpenWatchDialog, fetchCities, fetchRemesa, OpenModal, CloseModal } from '../../../actions/common'



import * as _Util from '../../../store/Util'


import '../../_styles.css'


const _formName = "_add_ing_menu"


const PaymentSlideUp = _Util.PaymentSlideUp_Cmpt();

const DeleteAlertIngredient = _Util.deleteAlertIngredient_Cmpt();

const BTNH = _Util.BTNH_Cmpt();

const Icon2 = _Util.Icon_Cmpt();


const InputAutocomplete = _Util.InputAutocomplete_Cmpt(); 
const InputText = _Util.InputText_Cmpt();

const MsgAlert = _Util.MsgAlert_Cmpt();


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
    let QryUser = {
      query:"getQueryUsersDetails",
      params:{userId:_Util.getUAd()},
      Collection:"Users"
    };
    const res = _Util.fetchStream_movie_data(_Util.get_GRAPHQLURL(),QryUser);
    const td = await res;
    if(td){
      _Util.updStore('agentsList',td);
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




const loadInvId = async (pI,dispatch) => {
  let Qry2Inv = {
    query: "getCostTabMenu_by_Product",
    params:{
      id:pI
    }
  };
  const res = _Util.fetchStream_movie_data(_Util.get_GRAPHQLURL(),Qry2Inv);
  const td = await res;
  if(td){
    _Util.updStore('costTabProdDetail',td);
    dispatch({
      type: 'UPD_KEY_VALUE',
      kv:{key:'observeChanges',value:_Util.gen12CodeId()}
    })
  }
}























const SendersComponent = (props) => {
  const {
    dispatch,
    LoadUA
  } = useObserveChanges();

  let _state = _Util.getStore();
  let keys = _Util.getGlobalsKeys()
  _state["keys"] = keys;

  const _form = _Util.getFormStore(_formName) || {};


  const [initialize, setInitialize] = useState(false);

  const [widthScreen, setWidthScreen] = useState(null);

  const [view, setView] = useState(false);




  let outerWidth = _state["outerWidth"];


  /// _usAg = _Util.getUserAgent();
  

  const searchHash = window.location.hash.split('?')[1]?window.location.hash.split('?')[1]:null;
  const router = _Util.parseQuery(searchHash);


  let _userId = _Util.getProfileId();


  const loadIngredients = async () => {



    let fields = [
      "id","name","unit","categoryID",{N:"stock",f:["amount", "stock", "stockIn", "stockOut"]}
    ];
  
    let Qry2Inv = {
      query:"getStockIngredientQvaMarket",
      params:{
        showInventory:true,
        providerId:_userId,
      }, 
      arraySerialization: _Util.isArraySerialization(),
      fields:fields
    };


    if(_Util.IsAdmin()){            
      Qry2Inv = {
        query:"getStockIngredientQvaMarket",
        params:{
          showInventory:true
        },
        arraySerialization: _Util.isArraySerialization(),
        fields:fields
      };
    }
    const res = _Util.fetchStream_movie_data(_Util.get_GRAPHQLURL(),Qry2Inv)
    const td = await res;
    if(td){
      let dZs =  _Util.isArraySerialization()?_Util.deZerialize2Array(td,fields,1):td;

      _Util.updStore('ingredientsList',dZs);
      dispatch({
        type: 'UPD_KEY_VALUE',
        kv:{key:'observeChanges',value:_Util.gen12CodeId()}
      })
    }
  }




    
  
  let userA = _Util.getBrowser();
    
  let isMobile = userA.os === "Android" || userA.os === "iPhone" || _state["outerWidth"]<550 ;



  let keyCodes =   _Util.getGlobalsKeys();

  /*





  */

  var itm = _state["costTabProdDetail"] && _state["costTabProdDetail"][router.prodId]?_state["costTabProdDetail"][router.prodId]:{};


  let sz = "360";


  const stockDetails = itm && itm["stock"] ;
  const _cost_pr = stockDetails && (stockDetails["amount"] / stockDetails["stockIn"])? (stockDetails["amount"] / stockDetails["stockIn"]):0;
  const _stock = stockDetails && stockDetails["stock"]?stockDetails["stock"]:0;


  const invHistory = itm && itm["ingredients"] ;



  let _id =itm && itm["id"];

  let pId = "pId_mk_inv" +_id

  const [hid, setHidd] = useState(null);
  const [obs, setObs] = useState(null);
  const [viewAddIng, setViewAddIng] = useState(0);
  const [list, setList] = useState({});
  const [searchQ, setSearch] = useState("");



  let imgI = itm && itm["imageUrl"] && itm["imageUrl"]+"?sz="+sz;
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


    if(widthScreen!==outerWidth){
      setWidthScreen(outerWidth);
    } 
    if(!initialize){
      setInitialize(true);
      _Util.updViewActive(3);

      if(_Util.IsAdmin()){
        LoadUA();
      }
      
      loadIngredients();
      
      loadInvId( router.prodId, dispatch);      

      setTimeout(()=>window.scrollTo(0,0),350);
      setTimeout(()=>setView(true),50);
      window.localStorage.setItem("lng","es");
    }
  });


  const handleInput = (v,f) => {
    let frm =  _form;
    frm[f] = v
    _Util.updFormStore(_formName,frm)
  }


  const handleInputAuto = (v,f) => {
    let frm =  _form;
    frm[f] = v.id
    _Util.updFormStore(_formName,frm)
    setObs(_Util.gen12CodeId())
  }

  const  _save = async (v,f) => {
    const vldFlds2 = {
      qty:{reqired: true, number: true,minValue:0.1, maxValue:25000},
      ingredientId:{reqired:true},
    }

    let _2Fs = _Util.getFormStore(_formName) || {};
    let _2s = {};
    _2Fs && ["ingredientId","qty"].map(fld=>{
      _2s[fld] = _2Fs[fld];
    })    
    let vld = vldFlds2;
    var _Valid = _Util.validations(vld,_2s);  
    if(_Valid.valid){
      _2s["prodId"] = _id;
      _2s["userId"] = _userId;
      _2s["action"] = "add";
      let Qry2Inv = {
        query: "upgradeCostTabMenu",
        params:_2s
      };
      const res = _Util.fetchStream_movie_data(_Util.get_GRAPHQLURL(),Qry2Inv);
      const td = await res;
      if(td){
        setViewAddIng(0);
        loadInvId(_id,dispatch)
        _Util.updFormStore(_formName,{})
      }
    }
  }

  


  let prList = {}
  if(searchQ && searchQ.length>0){
    prList = _Util.parseAutoFilterObj(_state["ingredientsList"],"name",searchQ);
  }else{
    prList = _Util.parseAutoFilterObj(_state["ingredientsList"],"name",null);
  }


  let unitMeasurement = _state["unitMeasurement"]
  let ingredientIdUnit = _form["ingredientId"] && _state["ingredientsList"] && _state["ingredientsList"][_form["ingredientId"]] && _state["ingredientsList"][_form["ingredientId"]]["unit"]
  
  let ingrUnit = (ingredientIdUnit && unitMeasurement && unitMeasurement[ingredientIdUnit]) || {}
  

  let _cPr = calcCostPrice(invHistory,unitMeasurement);

 

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
                <div className={`centerListCardInvM invMov`}>

                    <div className={`formContainer `} style={{opacity:1}}>  
                        <div className={`_dsplFlx _flxWrp HRKRR`}>
                        <div className={`formContainer info_prod`}>
                            <div className={`mainTitle`}>
                              {`${itm && itm["name"]}`}
                            </div>
                          </div>
                          {_blob===2?
                          <div className={`B6hqVd`}>
                            <div class="sh-div__viewport img_dtl"  style={{height: "300px"}} >
                              <div class="TiQ3Vc main-image">
                                <img src={_imgI} className="sh-div__image sh-div__current" alt="" />
                              </div>
                            </div>
                          </div>
                          :null}
                          <div className={`formContainer info_prod`}>
                            {itm && itm["desc"]?
                              <div className={`descTitle`}>
                                  {`${itm["desc"]}`}
                              </div>
                            :null}
                            <div className={`_dsplFlx _price_unit `}>
                              <div className={`flexSpace`}/>   
                              <div className={`mainTitle`}>
                                {itm && itm["salePrice"]?`$${itm && itm["salePrice"]}`:""}                      
                              </div>
                              <div className={`unitlbl`}>
                                {itm && itm["unit"]?`(${itm && itm["unit"]})`:""}                      
                              </div>
                            </div>
                            <div className={`  headerTtl`}>
                              <div className={`pym81b sendBx `}>
                                  <div className={`subtotal_cart `}>
                                      {"Precio de Costo"}
                                  </div>
                                  <div className={`total_cart `}>
                                    {` $ ${_cPr?_cPr.toFixed(2):0}`}
                                    <div className={`sendBtn`}>
                                    </div>
                                  </div>
                              </div>
                            </div>

                          </div>
                        </div>
                      </div>

                  



                      <div className={`paddField address`}>
                        <div className={`pym81b sendBx mov_type _dsplFlx activeBlue`}>
                          <NavLink  to={{pathname:"/ingredients_list"}}>
                            <div className={`_dsplFlx`}>
                              <div className={`icon_mov`}>
                                <Icon2 name={`food_variant`} />
                              </div>
                              <div className={`mov_type_title `}>
                                {`Ingredientes`}
                              </div>
                            </div>
                          </NavLink>
                          <div className={`flexSpace`}/> 
                          <div className={`icon_mov`} onClick={()=>setViewAddIng(!viewAddIng)}>
                            <Icon2 name={`plus`} />
                          </div>                   
                        </div>
                      </div>


                      {viewAddIng?
                      <div className={`paddField address`}>
                        <div className={`pym81b sendBx mov_type`}>
                          <div className={`_unit_alert`}>
                            <MsgAlert text={`Los Ingredientes deben agregarse en Unidades, Gramos o Mililitros`} theme={'green'}/>
                          </div>
                          <div className={`paddField address`}>
                            <InputAutocomplete 
                              icon={`more_vert`} 
                              form={_formName} 
                              field={`ingredientId`}  
                              keyCode={29} 
                              background={`#f9f9f9`}
                              color={`var(--base-color)`}
                              placeholder={_Util.translatetext(63)}
                            //  validations={vldFlds2[`categoryID`]}
                              initvalue={_form["ingredientId"]}
                              OnSelect={(e)=>handleInputAuto(e,`ingredientId`)} 
                              data={prList}
                              OnChange={(e)=>setSearch(e)}
                            />
                        </div>
                          <div className={`${isMobile?"":"_dsplFlx"}  btn_action`}>
                            <div className={`paddField inp_w180`}>
                              <InputText 
                                icon={`more_vert`} 
                                form={_formName} 
                                field={`qty`}  
                                keyCode={27} 
                                placeholder={`${_Util.translatetext(15)} ${ingredientIdUnit?"en "+ingrUnit.toUnit:""}`} 
                                background={`#f9f9f9`}
                                color={`var(--base-color)`}
                                OnChange={(e)=>handleInput(e,`qty`)}
                                initvalue={_form["qty"]}
                              />
                            </div>
                            <div className={` _mrg_rght `}/>
                            <div className={` _mrg_rght `}/>
                            <span className={` paddField `} onClick={()=>_save()}>
                              <BTNH theme={`light_blue`} title={ _form["id"]?_Util.translatetext(67):_Util.translatetext(12)}/>
                            </span>
                          </div>
                        </div>
                      </div>
                      :null}
                      
                      <div className={` sendBx scroll3Wrp `} >
                        <div className={`formContainer `} style={{opacity:1}}>
                        
                        <div className={`_dsplFlx space2Around _flxWrp op4oU`}>
                        {
                          invHistory && Object.keys(invHistory).map((fV,i)=>{
                            return(
                              <ItemComponent mvId={fV} data={invHistory} ind={i} key={`${keyCodes[i]}_${i}_pend_Mov`} isMobile={isMobile}/>
                            )
                        })}
                        </div>
                      </div>
                      
                      </div>
                    </div>:null}
                  </div>
                  <div  className={`footSpace`}/>
          </div>
      </>
    );
  
}  





export default withRouter(SendersComponent)





const ItemComponent = (props) => {

  const {
    dispatch
  } = useObserveChanges();


  const {
    mvId,
    data,
    isMobile
  } = props;

let _state = _Util.getStore();


let item =data && data[mvId];


let _id =item && item["id"];

let qty = item && `${item["qty"]}`

let name = item && item["details"] && `${item["details"]["name"] }`


let tt = item && item["price"]?item["price"]:item && item["cost_price"];




const removeM = () => {
  let dataM = {};
  dataM['zIndex']=450;
  dataM['observeResize']=true;    
  dataM['props']={item:_id, minHeight: '190px',title:"Desea Eliminar este Ingrediente"};
  dataM['content']=<DeleteAlertIngredient confirm={Confirm} />;
  OpenModal(dispatch,dataM);
}

//

const Confirm = async (modalID) => {
  let _2s = {};
  _2s["id"] = _id;
  _2s["action"] = "rmv";
  let Qry2Inv = {
    query: "upgradeCostTabMenu",
    params:_2s
  };
  const res = _Util.fetchStream_movie_data(_Util.get_GRAPHQLURL(),Qry2Inv);
  const td = await res;
  if(td){
    const searchHash = window.location.hash.split('?')[1]?window.location.hash.split('?')[1]:null;
    const router = _Util.parseQuery(searchHash);
    loadInvId( router.prodId, dispatch);
    CloseModal(dispatch,{id:modalID});
  }
}


let classTyp =  "";




let unitMeasurement = _state["unitMeasurement"]
  
let _unit = (item && item["details"] && item["details"]["unit"] && unitMeasurement[item["details"]["unit"]]) || {}
let _stock = (item && item["details"] && item["details"]["stock"]) || {}

if(_stock && _stock["amount"]){
  tt = (_stock["amount"] / _stock["stockIn"])
}



return (
  <div className="xwW5Ce u3mD2d " >
    {item?
    <div className="m18Ex  u3mD2d xwW5Ce">
        <div className=" u3mD2d xwW5Ce brdBt_ShopCart  movementsList">
          <article className="u3mD2d xwW5Ce u3mRow spaceAround">
            <div className={`${isMobile?"":"_dsplFlx"}  itm_ShopCart`}>
              <div className="egZxgf pqv9ne b7mrgL3x w100perc">
                <div className={` mov_type _dsplFlx SmlB ${classTyp}`} >                    
                  <div className={`mov_type_title `}>
                      {`${name}`}
                  </div>                  
                  <div className={`flexSpace`}/>   
                  <div className="egZxgf pqv9ne priceinDesktop ingredientsDetails">
                    <div className="egZxgf pqv9ne">
                      <div className="DX0ugf ApBhXe _dsplFlx">
                        <span className="unitlbl mrkPl">{`${qty} (${_unit.toUnit})`}</span>
                        <div className={`flexSpace`}/>
                      </div>
                    </div>
                    <div className="egZxgf pqv9ne">
                      <div className="DX0ugf ApBhXe _dsplFlx">
                        <span className="unitlbl mrkPl">{`${_Util.translatetext(16)}: $${(tt?tt:0).toFixed(2)}`}</span>
                        <div className={`flexSpace`}/>
                      </div>
                    </div>
                  </div>               
                </div>
                <div className="recvr">{""}</div>
                <div className={`sendBtn _dsplFlx mov_actions`}>
                  <div className={`flexSpace`}/>
                  <div className={`sendBtn _dsplFlx spaceAround`}>
                    <div className={`fieldPadding _MrgV _actBtnMg`} >
                      <span onClick={()=>removeM()}>
                        <BTNH theme={`fire_brick`} title={`${_Util.translatetext(68)}`}/>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </article>
        </div>   
      </div>
      :null}
    </div>

  )

}





const calcCostPrice = (inv2upd,unitMeasurement) =>{
  let am = 0;
  inv2upd && _Util.ObjectKeys(inv2upd).map(dd=>{
    let item = inv2upd[dd];
    let _stock = (item && item["details"] && item["details"]["stock"]) || {};
    let _unitObj = (item && item["details"] && item["details"]["unit"] && unitMeasurement[item["details"]["unit"]]) || {};
    let _qty = (item && item["qty"]) || 0;
    let prc = 0;
    if(_stock && _stock["amount"]){
      prc = (_stock["amount"] / _stock["stockIn"])
    }
    let _prcP = (prc / (_unitObj["rate"])) || 0;
    am += _qty * _prcP;
  })
  return am;
}







