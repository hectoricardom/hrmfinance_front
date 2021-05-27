

import React, { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import loadable from '@loadable/component'



import { withRouter} from 'react-router-dom';

import {  OpenWatchDialog, fetchCities, fetchRemesa, fetchProductsAll } from '../../actions/common'



import * as _Util from '../../store/Util'

import '../_styles.css'

const Icon2 = loadable(() => import('../Icons'))

const MoreInfoButton = loadable(() => import('../MoreInfoButton'))

const TabsHRM = loadable(() => import('../tabsHRM'))

const ChoiceButton = loadable(() => import('../ChoiceButton'))

const PaymentSlideUp = loadable(() => import('../paymentSlideUp'))

const InputText = loadable(() => import('../InputText'))

const InputAutocomplete = loadable(() => import('../InputAutocomplete'))




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

  







const _formName = 'add_products';






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

  const [tabIndex, setTabsIndex] = useState(0);

  const [catgList, setcatgList] = useState([]);

  const [catLoaded, setcatLoaded] = useState(false);
  
  
  let fld2Prs = ['id','name',"categoryID","unit","description","imageUrl","salePrice"];    

  let outerWidth = _state["outerWidth"];




  useEffect(() => {  
    if(widthScreen!==outerWidth){
      setWidthScreen(outerWidth);
    } 
    if(!initialize){
      setInitialize(true);
      let Qry2 = {
        auth:{
          authCode:"850217"
        },
        query:"getQueryProductsAll",
      };
      fetchProductsAll(Qry2,dispatch);
      

      setTimeout(()=>window.scrollTo(0,0),350);
      setTimeout(()=>setView(true),50);
      window.localStorage.setItem("lng","es");
      let frm =  _Util.getFormStore(_formName);

      if(!frm || !frm["id"]){
        _Util.updFormStore(_formName,{})
        _updFormObs();
      }
    }
  });
  



  const _clear = (v) => {
    setChoosePayView(0);
    setformView(1);
  }
  
  

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



 
  const _save = () => {
    let frm =  _Util.getFormStore(_formName);
    let _2Fs = frm || {};     
    let _2s = {};
    _2Fs && fld2Prs.map(fld=>{
      _2s[fld] = _2Fs[fld];
    })    
    let vld = vldFlds;
    var _Valid = _Util.validations(vld,_2s);   
    if(_Valid.valid){      
      if(!_2s["description"]){
        _2s["description"] = "";
      }
      _updFormObs();
      let Qry = {
        form:_2s,
        fields:[
          "id","name",
        ],
        auth:{
          authCode:"850217"
        },
        query:"upgradeProducts"
      };
      fetchRemesa(Qry,dispatch,_formName);
      _formName && _Util.updFormStore(_formName,{});
      //props.history.push({pathname:"/sale_btc"});
      UpdateIndex(0);
    }
  }


  const handleInputAutoReceive = (v,f) => {
    let frm =  _form;
    frm[f] = v.id
    _Util.updFormStore(_formName,frm)
    validateFields()
  }



  var _tabs = ["product List","add Product"]

  var _categoriesList = _state["categoriesProducts"];
  let _categoriesPrs = parseAutoObj(_categoriesList,"name")

  const setCategorieSearch = (v,f) => {
    if(v){
      _categoriesPrs = parseAutoFilterObj(_categoriesList,"name",v);
      setcatgList(_categoriesPrs);
    }else{
      _categoriesPrs = parseAutoObj(_categoriesList,"name");
      setcatgList(_categoriesPrs);
    }
    
  }


  if(_categoriesList && !catLoaded){
    _categoriesPrs = parseAutoObj(_categoriesList,"name");
    setcatgList(_categoriesPrs);
    setcatLoaded(true);
  }

  var _productsList = _state["productsList"];


  const UpdateIndex = (i) => {
    if(i===0){
      _Util.updFormStore(_formName,{});
    }
    setTabsIndex(i)
  }
  
let userA = _Util.getBrowser();
  
let isMobile = userA.os === "Android" || userA.os === "iPhone" || _state["outerWidth"]<550 ;


  
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
        <div className={`mainView3Hero palette formContainer ${isMobile?"is_mobile":""}`} style={{opacity:view?1:0, backgroundColor:"#f5f5f5"}} >
        <TabsHRM data={_tabs}  UpdateIndex={(i)=>UpdateIndex(i)}  pth={'products'} indexTab={tabIndex}/>
              
                <div className={`formContainer`} style={{opacity:1}}>
                <div className={`formContainer`} style={{opacity:tabIndex === 1?1:0}}>
                  {tabIndex === 1?
                  <>
                  <div className={`centerCardForm`}> 
                  <div className={`pym81b sendBx `}>
                    <div className={`_labelBx`}>Product</div>
                    <div className={`_dsplFlx spaceAround _flxWrp`}>
                      <div className={`paddField address`}>
                          <InputAutocomplete 
                            icon={`more_vert`} 
                            form={_formName} 
                            field={`categoryID`}  
                            keyCode={29} 
                            background={`#f5f5f5`}
                            color={`var(--base-color)`}
                            placeholder={`Categoria`}
                          //  validations={vldFlds2[`categoryID`]}
                            initvalue={_form["categoryID"]}
                            OnSelect={(e)=>handleInputAutoReceive(e,`categoryID`)} 
                            data={catgList}
                            OnChange={(e)=>setCategorieSearch(e,"categoryID")}
                          />
                      </div>
                      <div className={`paddField`}>
                        <InputText 
                          icon={`more_vert`} 
                          form={_formName} 
                          field={`name`}  
                          keyCode={27} 
                          placeholder={`${_Util.translatetext(21)}`} 
                          background={`#f5f5f5`}
                          color={`var(--base-color)`}
                          OnChange={(e)=>handleInput(e,`name`)}
                          validations={vldFlds[`name`]}
                          initvalue={_form["name"]}
                        />
                      </div>
                      <div className={`paddField`}>
                        <InputText 
                          icon={`more_vert`} 
                          form={_formName} 
                          field={`unit`}  
                          keyCode={39} 
                          background={`#f5f5f5`}
                          color={`var(--base-color)`}
                          placeholder={`Unidad`} 
                          OnChange={(e)=>handleInput(e,`unit`)}
                          validations={vldFlds[`unit`]}
                          initvalue={_form["unit"]}
                        />
                      </div>
                      <div className={`paddField`}>
                        <InputText 
                          icon={`more_vert`} 
                          form={_formName} 
                          field={`salePrice`}  
                          keyCode={26} 
                          background={`#f5f5f5`}
                          color={`var(--base-color)`}
                          placeholder={`Precio Venta`} 
                          OnChange={(e)=>handleInput(e,`salePrice`)}
                          validations={{reqired: true, number: true, minValue:0.10, maxValue:90000}}
                          initvalue={_form["salePrice"]}
                        />
                      </div>
                      <div className={`paddField address`}>
                          <InputText 
                            icon={`more_vert`} 
                            form={_formName} 
                            field={`imageUrl`}  
                            keyCode={23} 
                            background={`#f5f5f5`}
                            color={`var(--base-color)`}
                            placeholder={`Image`}
                            initvalue={_form["imageUrl"]}
                            OnChange={(e)=>handleInput(e,`imageUrl`)}
                          />
                      </div>
                      </div>
                      </div>
                  </div>                 
                  <div style={{marginBottom:'65px'}}></div>
                    {formView===1 && validForm ? 
                    <div className={'_w100  _dsplFlx spaceAround'}  >
                      <MoreInfoButton title={`Save`} theme={"purple"}  clickEvent={()=>_save()} />
                    </div>
                    :null}
                    </>
                    :null}
                  </div>
                  <div className={`formContainer`} style={{opacity:tabIndex === 0?1:0}}>
                    {tabIndex === 0?
                      <div className={`centerListCardProd`}> 
                        <div className={` sendBx scroll3Wrp `} >
                          <div className={`_dsplFlx spaceAround _flxWrp op4oU`}>
                          {
                            _productsList && _Util.ObjectKeys(_productsList).map(fV=>{
                              let slc = _productsList[fV] ;
                                return (
                                  <>
                                    <ListItemComponent item={slc}  history={props.history} dispatch={dispatch} _openMd={_openMd} categoriesList={_categoriesList} editProd={()=>setTabsIndex(1)}/>
                                  </>
                                )
                            })
                          }
                          </div>
                        </div>
                      </div>:null}
                  </div>
            </div>
        </div>
      </>
    );
  
}  





export default withRouter(SendersComponent)



function parseAutoObj(o,ky){
  let res = {}
  _Util.ObjectKeys(o).map(k=>{
    res[k] = {name:o[k][ky], id:k}
  })
  return res;
} 

function parseAutoFilterObj(o,ky,v){
  let res = {}
  _Util.ObjectKeys(o).map(k=>{
    if(o[k][ky].toLowerCase().indexOf(v.toLowerCase())>=0){
      res[k] = {name:o[k][ky], id:k}
    }
  })
  return res;
} 






const ListItemComponent = (props) => {

  const {
    history, item, dispatch, _openMd, categoriesList
  } = props;



  var _ammountTasa = item && item["amount"] * item["tasa"];


  let _state = _Util.getStore();

  const handleDetails = (id) => {
    _Util.updFormStore(_formName,item);
    if(typeof props.editProd === "function"){
      props.editProd();
    }
    //history.push({pathname:"/products"});
  }


  let hasPrice = item && item["salePrice"]?true:false;

  
let userA = _Util.getBrowser();
  
let isMobile = userA.os === "Android" || userA.os === "iPhone" || _state["outerWidth"]<550 ;

let imgI = item && item["imageUrl"];
var _thumbnailJson = imgI && _state['thumbnailJsonBlob'] && _state['thumbnailJsonBlob'][imgI];
let _blobrequested =  _thumbnailJson && _thumbnailJson['requested'];
let _blob = _blobrequested? _thumbnailJson['blob'] : null;




  return (
    <div>
      {!isMobile?
        <div className={`pym81b sendBx cardProd`} >
          <div className={`imgProd `}>
            {_blob?<img src={_blob} className="Ws3Esf" alt="" data-iml="11510.614999991958"/>:null}
          </div>
          <div  className={`productName  `} onClick={()=>handleDetails()}> 
            {item && `${item["name"]}` }
          </div>
          <div  className={`_dsplFlx  `}>
            <div  className={`flexSpace `}  >
              {``}
            </div>
            <div  className={`prod_price ${hasPrice?"":"out_stock"}`} >
              {hasPrice?`$${item["salePrice"]}`:"No disponible"}
              {hasPrice?<span> {item && `${item["unit"]}` }</span>:null}
            </div>
          </div>
          <div className={``} >
            {/*item && item["categoryID"] && categoriesList[item["categoryID"]] && categoriesList[item["categoryID"]]["name"]*/}
          </div>
        </div>:
        <div className={`pym81b nPd sendBx cardProd _dsplFlx ${isMobile?"is_mobile":""}`} >
          <div className={`imgProd `}>
            {_blob?<img src={_blob} className="Ws3Esf" alt="" data-iml="11510.614999991958"/>:null}
          </div>

          <div  className={` details`}>
            <div  className={`productName  `} onClick={()=>handleDetails()}> 
              {item && `${item["name"]}` }
            </div>
            <div  className={`flexSpace `}  >
              {``}
            </div>
            <div  className={`prod_price ${hasPrice?"":"out_stock"}`} >
              {hasPrice?`$${item["salePrice"]}`:"No disponible"}
              {hasPrice?<span> {item && `${item["unit"]}` }</span>:null}
            </div>
          </div>
        </div>
        }
    </div>
  )

}








const ItemProdComponent = (props) => {

  const {
    history, item, dispatch, _openMd, categoriesList
  } = props;



  var _ammountTasa = item && item["amount"] * item["tasa"];


  let _state = _Util.getStore();

  const handleDetails = (id) => {
    _Util.updFormStore(_formName,item);
    if(typeof props.editProd === "function"){
      props.editProd();
    }
    //history.push({pathname:"/products"});
  }


  let hasPrice = item && item["salePrice"]?true:false;

  
let userA = _Util.getBrowser();
  
let isMobile = userA.os === "Android" || userA.os === "iPhone" || _state["outerWidth"]<550 ;

let imgI = item && item["imageUrl"];
var _thumbnailJson = imgI && _state['thumbnailJsonBlob'] && _state['thumbnailJsonBlob'][imgI];
let _blobrequested =  _thumbnailJson && _thumbnailJson['requested'];
let _blob = _blobrequested? _thumbnailJson['blob'] : null;



  return (
    <div role="listitem" className="xwW5Ce" >
      <div jsname="JNwhwd" className="xwW5Ce u3mD2d" >
        <div jscontroller="kOTMef" jsname="XjgM2d" jsaction="nPqrCb:NdfHie;RYzs4d:OPvZId;LukYDd:eUkXp;ctGvIe:UeiKVd" className=" xwW5Ce u3mD2d">
          <div className="m18Ex  u3mD2d xwW5Ce">
            <a className=" u3mD2d xwW5Ce" data-ved="0CAEQsJMFahcKEwiY4YXA0P7uAhUAAAAAHQAAAAAQFg" data-hveid="1" data-navigation="server">
              <article className="u3mD2d xwW5Ce">
                <div className="exewIc pqv9ne">
                  {!hasPrice?
                  <div class="OFmygf jK2Lef" style={{backgroundColor:"#fce8e6", color:"#ea4335"}}>No disponible</div>
                  :null}
                  {false?
                  <div class="OFmygf jK2Lef" style={{backgroundColor:"rgba(230,244,234,1)", color:"rgba(24,128,56,1)"}}>No disponible</div>
                  :null}
                  <div className="EbzW3 xwW5Ce qSGFRd YzcgQb UKsopf u3mD2d">
                    <div className="ap5GNb YxFYtf yhS73e" style={{paddingTop: "100%"}}>
                      {_blob?<img src={_blob} className="Ws3Esf" alt="" data-iml="11510.614999991958"/>:null}
                    </div>
                  </div>
                </div>
                <div className="egZxgf pqv9ne">
                  <div className="DX0ugf ApBhXe _dsplFlx">
                    <span className="PTXMyf">{hasPrice?`${item["salePrice"]} US$`:""}</span>
                    <div className={`flexSpace`}/>
                    <span className="UnXMyf">{item && `${item["unit"]}`}</span>
                  </div>
                </div>
                <div className="MPhl6c pqv9ne azTb0d YAEPj SGmlof" title={item && `${item["name"]}` }>{item && `${item["name"]}` }</div>
                <span className="iu5UVe DX0ugf ApBhXe m5Ca5b">
                  <div className="COzjKb DX0ugf ApBhXe">
                    <i className="google-material-icons CfDnHe" aria-hidden="true" style={{color: "rgb(249, 171, 0)", fontSize: "14px"}}>star</i>
                    <i className="google-material-icons CfDnHe" aria-hidden="true" style={{color: "rgb(249, 171, 0)", fontSize: "14px"}}>star</i>
                    <i className="google-material-icons CfDnHe" aria-hidden="true" style={{color: "rgb(249, 171, 0)", fontSize: "14px"}}>star</i>
                    <i className="google-material-icons CfDnHe" aria-hidden="true" style={{color: "rgb(249, 171, 0)", fontSize: "14px"}}>star</i>
                    <div className="wpxE0b DX0ugf ApBhXe">
                      <i className="google-material-icons CfDnHe" aria-hidden="true" style={{color: "rgb(218, 220, 224)", fontSize: "14px"}}>star</i>
                      <div className="Q7M55e DX0ugf" style={{width: "8.2px"}}>
                        <i className="google-material-icons CfDnHe" aria-hidden="true" style={{color: "rgb(249, 171, 0)", fontSize: "14px"}}>star</i>
                      </div>
                    </div>
                  </div>
                  <div className="L9k4yd">7.903</div>
                </span>
                <div className=" rBtmla75 pqv9ne rla7 ">
                  <div class="OFmygf jK2Lef" style={{backgroundColor:"rgba(230,244,234,1)", color:"rgba(24,128,56,1)"}}>Entrega gratis en 48h</div>
                </div>  
              </article>
            </a>
          </div>
        </div>
      </div>
    </div>

)

}
