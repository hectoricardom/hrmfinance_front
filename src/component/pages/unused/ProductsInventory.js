

import React, { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import loadable from '@loadable/component'



import { withRouter} from 'react-router-dom';

import {  OpenWatchDialog, fetchCities, fetchRemesa, fetchProductsAll, fetchUsers, fetchInventoryAll, deleteByInventory, fetchSenders } from '../../actions/common'



import * as _Util from '../../store/Util'

import '../_styles.css'

/*

const InputText = loadable(() => import('../InputText'))
const InputAutocomplete = loadable(() => import('../InputAutocomplete'))
const BTN_f = loadable(() => import('../btns_confirm'))
const MoreInfoButton = loadable(() => import('../MoreInfoButton'))
const ChoiceButton = loadable(() => import('../ChoiceButton'))

*/




const Icon2 = loadable(() => import('../Icons'))


const TabsHRM = loadable(() => import('../tabsHRM'))


const PaymentSlideUp = loadable(() => import('../paymentSlideUp'))


const ProductsCombo = loadable(() => import('./ProductsCombo'))

const ProductsStock = loadable(() => import('./ProductsStock'))


const ProductsReceiving = loadable(() => import('./ProductsReceiving'))



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

  







const _formName = 'add_inventory';






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
  
  
  const [agentList, setAgentList] = useState({});
  const [agentLoaded, setAgentLoaded] = useState(false);


  const [senderList, setSenderList] = useState({});  
  const [senderLoaded, setSenderLoaded] = useState(false);






  let fld2Prs = ['id','price',"productID","qty","agentId","date","description"];    

  let outerWidth = _state["outerWidth"];




  useEffect(() => {  
    if(widthScreen!==outerWidth){
      setWidthScreen(outerWidth);
    } 
    if(!initialize){
      setInitialize(true);
      let Qry2 = {
        query:"getQueryProductsAll",
        auth:{
          authCode:"850217"
        },
      };
      fetchProductsAll(Qry2,dispatch);

      let Qry2Inv = {
        query:"getQueryProductsInventoryAll",
        auth:{
          authCode:"850217"
        },
      };
      fetchInventoryAll(Qry2Inv,dispatch);


      
      let QryStockProduct = {
        query:"getStockProduct",
        auth:{
          authCode:"850217"
        },
      };
      fetchRemesa(QryStockProduct,dispatch);


      let QryUser = {
        auth:{
          authCode:"850217"
        },
        query:"getQueryUsersDetails",
        Collection:"Users"
      };
      fetchUsers(QryUser,dispatch);

      setTimeout(()=>window.scrollTo(0,0),350);
      setTimeout(()=>setView(true),50);
      window.localStorage.setItem("lng","es");
      let frm =  _Util.getFormStore(_formName);
      if(!frm || !frm["id"]){
        let initF = {         
          date:(new Date()).getTime()
        }
        _Util.updFormStore(_formName,initF)
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
    qty:{reqired: true, number: true,minValue:1, maxValue:50000},
    price:{reqired: true, number: true,minValue:1, maxValue:50000},
    productID:{reqired:true},
    agentId:{reqired:true}
    //,date:{reqired:true}
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
      console.log("form 2 save")
      console.log(_2s)
      let Qry = {
        form:_2s,
        auth:{
          authCode:"850217"
        },
        fields:[
          "id","productID","qty","price","agentId"
        ],
        query:"upgradeProductsInventory"
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


  const handleInputAgentChange = (v,f) => {
    _Util.updFormStore(_formName+"_combo_prod",{});
    let frm =  _form;
    frm[f] = v.id
    _Util.updFormStore(_formName,frm);
    validateFields()
    _updFormObs();
  }


  const handleInputAutoProdCombo = (v,f,fNm) => {
    let frm =  _form;
    frm[f] = v.id
    _Util.updFormStore(fNm,frm)
    validateFields()
  }



  var _tabs = ["List","add","combo","stock"]

  var _categoriesList = _state["productsList"];
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

  var _inventoryListList = _state["InventoryList"];

  var _sendersList = _state["sendersList"];





  const UpdateIndex = (i) => {
    if(i===0){
      _Util.updFormStore(_formName,{});
    }
    if(i===2){
      console.log(_sendersList)
      if(!_sendersList){
        let Qry2 = {
          auth:{
            authCode:"850217"
          },
          query:"getQuerySenderDetails",
          Collection:"Senders"
        };
        fetchSenders(Qry2,dispatch); 
      }
    }
    setTabsIndex(i)
  }
  



  var _usersList = _state["usersList"];

  var _usersList2Prs = _usersList;



 
  let _usersPrs = parseAutoObj(_usersList2Prs,"personName")


  const setAgentSearch = (v,f) => {
    if(v){
      _usersPrs = parseAutoFilterObj(_usersList2Prs,"personName",v);
      setAgentList(_usersPrs);
    }else{
      _usersPrs = parseAutoObj(_usersList2Prs,"personName",v);
      setAgentList(_usersPrs);
    }
    
  }

  

  if(_usersList && !agentLoaded){
    _usersPrs = parseAutoObj(_usersList,"personName");
    setAgentList(_usersPrs);
    setAgentLoaded(true);
  }
  


 
  let _sendersPrs = parseAutoObj(_sendersList,"name")


  var _senderId = _form["senderId"];
  let _receiversBySender = _sendersList && _senderId && _sendersList[_senderId] && _sendersList[_senderId]["receivers"];
  let _hasRreceiversBySender = _receiversBySender && _Util.ObjectKeys(_receiversBySender) && _Util.ObjectKeys(_receiversBySender).length>0; 
  
  
  let _receiversPrs = _receiversBySender && parseAutoObj(_receiversBySender,"name")




  const setSenderSearch = (v,f) => {
    if(v){
      _sendersPrs = parseAutoFilterObj(_sendersList,"name",v);
      setSenderList(_sendersPrs);
    }else{
      _sendersPrs = parseAutoObj(_sendersList,"name");
      setSenderList(_sendersPrs);
    }
    
  }


  if(_sendersList && !senderLoaded){
    _sendersPrs = parseAutoObj(_sendersList,"name");
    setSenderList(_sendersPrs);
    setSenderLoaded(true);
  }

  const stockProductD = _state["stockProduct"] || {}; 


  const stockProduct = stockProductD && stockProductD[_form["agentId"]];



  const _form_combo_prod = _Util.getFormStore(_formName+"_combo_prod") || {};

  

  var _combo_prod_list = _state["combo_prod"];

  let recomendedPrice = 0;


  if(_combo_prod_list){
    _Util.ObjectKeys(_combo_prod_list).map(prdId=>{
      if(stockProduct && stockProduct[prdId]){
        recomendedPrice += stockProduct[prdId]["ave"] * _combo_prod_list[prdId];
      }
    })
  } 


  console.log(_Util.gen16CodeId())

  // console.log("_inventoryListList",_inventoryListList)


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
        <div className={`mainViewHero palette formContainer  inventory`} style={{opacity:view?1:0, backgroundColor:"#f5f5f5"}} >
          <TabsHRM data={_tabs}  UpdateIndex={(i)=>UpdateIndex(i)}  pth={'inventory'} indexTab={tabIndex}/>
              
                <div className={`formContainer`} style={{opacity:1}}>               
                  <div className={`formContainer`} style={{opacity:tabIndex === 0?1:0}}>
                    {tabIndex === 0?
                      <div className={`centerCardForm`}> 
                        <div className={` sendBx scrollWrp `} >
                          <div className={`_dsplFlx spaceAround _flxWrp`}>
                          {
                            _inventoryListList && _Util.ObjectKeys(_inventoryListList).map(fV=>{
                              let slc = _inventoryListList[fV] ;
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
                  <div className={`formContainer`} style={{opacity:tabIndex === 2?1:0}}>
                  {tabIndex === 2?
                  <>
                    <ProductsCombo  />
                  </>
                  :null}
                  </div>
                  <div className={`formContainer`} style={{opacity:tabIndex === 1?1:0}}>
                  {tabIndex === 1?
                  <>
                    <ProductsReceiving  />
                  </>
                  :null}
                  </div>
                  <div className={`formContainer`} style={{opacity:tabIndex === 3?1:0}}>
                  {tabIndex === 3?
                  <>
                    <ProductsStock  />
                  </>
                  :null}
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



  var _product = item && item["product"];
  var _agent = item && item["agent"];

  // var _categoryID = _product &&  _product["categoryID"];

  
  const handleDetails = (id) => {
    _Util.updFormStore(_formName,item);
    if(typeof props.editProd === "function"){
      props.editProd();
    }
    //history.push({pathname:"/products"});
  }


  const handleRemove = (id) => {
    let Qry = {
      auth:{
        authCode:"850217"
      },
      params:{id:item["id"]},
      query:"deleteByColl",
      Collection:"ProductsInventory"
    };
    deleteByInventory(Qry);  
  }

let price = item && item["price"] && parseFloat(item["price"].toString()).toFixed(2)

var _ammount = item && (item["qty"] * price ).toFixed(2);


  return (
    <div>
        <div className={`pym81b sendBx cardCustomer`} >
          <div  className={`_dsplFlx  _usrState`}>
            <div  onClick={()=>handleDetails()}   className={`_dsplFlx  agentClick`}> 
              {_product && _product["name"]}
            </div>
            <div className={"flexSpace"}></div>            
            <div  className={`iconDelete`}  onClick={()=>handleRemove()}  >
              <Icon2 name={`outline_delete`} size={22}/>
            </div>
          </div>
          <div  className={`_dsplFlx  _usrState`}>
            <div className={"flexSpace"}></div>
            <div  className={`title_k `}  >
              {` cantidad: `}
            </div>
            <div  className={`title_v `}  >
              {`${item && item["qty"] && item["qty"].toFixed(2)}`}
            </div>
          </div>
          <div  className={`_dsplFlx  _usrState`}>
            <div className={"flexSpace"}></div>
            <div  className={`title_k `}  >
              {` price: `}
            </div>
            <div  className={`title_v `}  >
              {`$${price}`}
            </div>
          </div>
          <div  className={`_dsplFlx  _usrState`}>
            <div className={"flexSpace"}></div>
            <div  className={`title_k `}  >
              {` Total: `}
            </div>
            <div  className={`title_v `}  >
              {`$${_ammount}`}
            </div>
          </div>
          <div className={``} >
            {_agent && _agent["personName"]}              
          </div>
          <div  className={`_dsplFlx  _usrState`}>
                  
            <div  className={`iconDelete`}  >
              
            </div>
            <div className={"flexSpace"}></div>    
            <div  className={`_dsplFlx  agentClick`}> 
              {item && item["orderId"]}
            </div>
            
          </div>


        </div>
    </div>
  )

}






/*


<div className={`formContainer`} style={{opacity:tabIndex === 99?1:0}}>
                  {tabIndex === 99?
                  <>
                  <div className={`centerCardForm`}> 
                  <div className={`pym81b sendBx `}>
                    <div className={`_labelBx`}>Product Movement</div>
                    <div className={`_dsplFlx spaceAround _flxWrp`}>
                      <div className={`paddField address`}>
                          <InputAutocomplete 
                            icon={`more_vert`} 
                            form={_formName} 
                            field={`agentId`}  
                            keyCode={49} 
                            background={`#f5f5f5`}
                            color={`var(--base-color)`}
                            placeholder={`Agent`} 
                            validations={vldFlds[`agentId`]}
                            initvalue={_form["agentId"]}
                            OnSelect={(e)=>handleInputAutoReceive(e,`agentId`)} 
                            data={agentList}
                            OnChange={(e)=>setAgentSearch(e,"name")}
                          />
                      </div>
                      <div className={`paddField address`}>
                          <InputAutocomplete 
                            icon={`more_vert`} 
                            form={_formName} 
                            field={`productID`}  
                            keyCode={29} 
                            background={`#f5f5f5`}
                            color={`var(--base-color)`}
                            placeholder={`Productos`}
                          //  validations={vldFlds2[`categoryID`]}
                            initvalue={_form["productID"]}
                            OnSelect={(e)=>handleInputAutoReceive(e,`productID`)} 
                            data={catgList}
                            OnChange={(e)=>setCategorieSearch(e,"productID")}
                          />
                      </div>
                      <div className={`paddField`}>
                        <InputText 
                          icon={`more_vert`} 
                          form={_formName} 
                          field={`qty`}  
                          keyCode={39} 
                          background={`#f5f5f5`}
                          color={`var(--base-color)`}
                          placeholder={`Cantidad`} 
                          OnChange={(e)=>handleInput(e,`qty`)}
                          validations={vldFlds[`qty`]}
                          initvalue={_form["qty"]}
                        />
                      </div>
                      <div className={`paddField`}>
                        <InputText 
                          icon={`more_vert`} 
                          form={_formName} 
                          field={`price`}  
                          keyCode={27} 
                          placeholder={`Precio`} 
                          background={`#f5f5f5`}
                          color={`var(--base-color)`}
                          OnChange={(e)=>handleInput(e,`price`)}
                          validations={vldFlds[`price`]}
                          initvalue={_form["price"]}
                        />
                      </div>
                      
                      <div className={`paddField address`}>
                        <InputText 
                          icon={`more_vert`} 
                          form={_formName} 
                          field={`description`}  
                          keyCode={93} 
                          background={`#f5f5f5`}
                          color={`var(--base-color)`}
                          placeholder={`Descripcion`} 
                          OnChange={(e)=>handleInput(e,`description`)}
                          validations={vldFlds[`description`]}
                          initvalue={_form["description"]}
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

*/