

import React, { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import loadable from '@loadable/component'



import { withRouter} from 'react-router-dom';

import {  OpenWatchDialog, fetchCities, fetchRemesa, fetchProductsAll, fetchUsers, fetchInventoryAll, OpenModal, fetchSenders } from '../../actions/common'



import * as _Util from '../../store/Util'

import '../_styles.css'

const Icon2 = loadable(() => import('../Icons'))

const MoreInfoButton = loadable(() => import('../MoreInfoButton'))

const TabsHRM = loadable(() => import('../tabsHRM'))

const ChoiceButton = loadable(() => import('../ChoiceButton'))

const PaymentSlideUp = loadable(() => import('../paymentSlideUp'))

const InputText = loadable(() => import('../InputText'))

const InputAutocomplete = loadable(() => import('../InputAutocomplete'))

const BTN_f = loadable(() => import('../btns_confirm'))

const ModalDate = loadable(() => import('../ModalDate'))




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

  

  const callBackDate= (f,v) => {

    let dD = new Date(v);
  
    const _form = _Util.getFormStore(_formName) || {};
    let frm =  _form;



    frm[f] = dD.getTime();
    //_Util.updFormStore(_formName,frm)
  }


  const OpenModalDate = (i, callBack) => {
    let data = {};   
    const _form = _Util.getFormStore(_formName) || {};
    let  _date = _form && _form[i];
    data['zIndex']=190;
    data['observeResize']=true;
    data['props']={title:"", item:i};
    data['content'] = <ModalDate valueUpdate={(e)=>callBackDate(i,e)} initValue={_date}/>; 
    OpenModal(dispatch,data);
  }
  


  
  return { 
    observeChanges,
    _LoadCities,
    dispatch,
    OpenModalDate,
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

  







const _formName = 'add_prod_investing';






const SendersComponent = (props) => {
  const {
    _openMd,
    dispatch,
    OpenModalDate,
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






  let fld2Prs = [
    'id',
    "amount",
    "agentId",
    "description",
    "tasa",
    "type",
    "delivery",
    "date"
  ];


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

      let Qry2Inv = {
        auth:{
          authCode:"850217"
        },
        query:"getQueryProductsInventoryAll",
      };
      fetchInventoryAll(Qry2Inv,dispatch);


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
    agentId:{reqired:true},
    date:{reqired:true},
    //tasa:{reqired: true, number: true, minValue:1, maxValue:90},
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



 

  const handleInputAutoReceive = (v,f) => {
    let frm =  _form;
    frm[f] = v.id
    _Util.updFormStore(_formName,frm)
    validateFields()
  }


  const handleInputAgentChange = (v,f) => {
    _Util.updFormStore(_formName+"_receiving_prod",{});
    _Util.updStore("receiving_prod",{});
    setcatgList({})
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



  const stockProductD = _state["stockProduct"] || {}; 


  const stockProduct = stockProductD && stockProductD[_form["agentId"]];




  
  var _prodList = _state["productsList"];

  var _categoriesList = _prodList;



  var _receiving_prod_list = _state["receiving_prod"];

  let recomendedPrice = 0;

  if(_receiving_prod_list){
    _Util.ObjectKeys(_receiving_prod_list).map(prdId=>{
       recomendedPrice += _receiving_prod_list[prdId]["qty"] * _receiving_prod_list[prdId]["price"];
    })
  } 

  let _categoriesPrs = parseAutoObj(_prodList,"name")


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


  var _sendersList = _state["sendersList"];


  console.log(_categoriesList)

  console.log(_categoriesPrs)

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
  
 

  const _form_receiving_prod = _Util.getFormStore(_formName+"_receiving_prod") || {};

  const add_receiving_prod = (v,f) => {
    let qty = _form_receiving_prod["qty"];
    let price = _form_receiving_prod["price"];
    let _idProd = _form_receiving_prod["productID"];
    let _receiving_prod = _state["receiving_prod"] || {};
    _receiving_prod[_idProd] = {qty:qty,price:price}
    _Util.updStore("receiving_prod",_receiving_prod);
    _Util.updFormStore(_formName+"_receiving_prod",{});
    _updFormObs();
  }


  const handleRemoveCombo = (id) => {
    let _receiving_prod = _state["receiving_prod"] || {};
    delete _receiving_prod[id];
    _Util.updStore("receiving_prod",_receiving_prod);
    _Util.updFormStore(_formName+"_receiving_prod",{});
    _updFormObs();
  }
  
 


  const _save = () => {
    let frm =  _Util.getFormStore(_formName);
    let _idOrder = _Util.gen12CodeId();
    let _2Fs = frm || {};     
    let _2s = {};
    _2Fs && fld2Prs.map(fld=>{
      _2s[fld] = _2Fs[fld];
    });
    
    let vld = vldFlds;
    var _Valid = _Util.validations(vld,_2s);   
    if(_Valid.valid){      
      if(!_2s["description"]){
        _2s["description"] = "";
      }
      _2s["orderId"] = _idOrder;    
      _2s["type"] = "INVESTMENT_FOOD";
      if(!_2s["delivery"]){
        _2s["delivery"] = true;
      }
      if(!_2s["amount"]){
        _2s["amount"] = recomendedPrice / 25;
      }
      if(!_2s["tasa"]){
        _2s["tasa"] = 25;
      }
      _updFormObs();

      _Util.ObjectKeys(_receiving_prod_list).map(pd=>{
        //let prc = stockProduct[pd]["ave"];
        let itm2 = {};
        itm2["price"] = _receiving_prod_list[pd]["price"];
        itm2["qty"] = _receiving_prod_list[pd]["qty"] * 1;
        itm2["productID"] = pd;
        itm2["agentId"] = _2s["agentId"]; 
        itm2["orderId"] = _idOrder;    
        itm2["description"] = "";
        let QryInv = {
          form:itm2,
          auth:{
            authCode:"850217"
          },
          fields:[
            "id","productID","qty","price","agentId"
          ],
          query:"upgradeProductsInventory"
        };
        fetchRemesa(QryInv,dispatch,_formName);

      })

     
      setTimeout(()=>{
        let Qry = {
          form:_2s,
          auth:{
            authCode:"850217"
          },
          fields:[
            "id","productID","qty","price","agentId"
          ],
          query:"upgradeMovements"
        };
        fetchRemesa(Qry,dispatch,_formName);
      },350);
     


      
      _formName && _Util.updFormStore(_formName,{});
      //props.history.push({pathname:"/sale_btc"});
      UpdateIndex(0);
    }
  }





  var exVld = {
    "qty":{reqired: true, number: true, minValue:1, maxValue:90000},
    "price":{reqired: true, number: true, minValue:1, maxValue:90000}
  }





    return (
     
            <div className={`centerCardForm`}> 
                  <div className={`pym81b sendBx `}>
                    <div className={`_labelBx`}>Receiving</div>
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
                            OnSelect={(e)=>handleInputAgentChange(e,`agentId`)} 
                            data={agentList}
                            OnChange={(e)=>setAgentSearch(e,"name")}
                          />
                      </div>
                      <div className={`paddField address`}>
                          <InputText 
                            icon={`more_vert`} 
                            form={_formName+"_combo"} 
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

                      <div className={`fieldPadding _MrgV`}>
                        <span onClick={()=>OpenModalDate( `date` )}>
                          <BTN_f theme={`light_blue`} title={_form && _form["date"]?_Util.parseDate(_form["date"]):_Util.parseDate(_Util.gTm())}/>
                        </span>
                      </div>

                  {_form["agentId"]?
                  <div className={`pym81b sendBx `}>
                    <div className={`_labelBx _small `}>Productos</div>
                    <div className={`_dsplFlx spaceAround _flxWrp`}>

                      <div className={`paddField address`}>
                          <InputAutocomplete 
                            icon={`more_vert`} 
                            form={_formName+"_receiving_prod"} 
                            field={`productID`}  
                            keyCode={29} 
                            background={`#f5f5f5`}
                            color={`var(--base-color)`}
                            placeholder={`Productos`}
                            OnSelect={(e)=>handleInputAutoProdCombo(e,`productID`,_formName+"_receiving_prod")} 
                            data={catgList}
                            OnChange={(e)=>setCategorieSearch(e,"productID")}
                          />
                      </div>                     
                      <div className={`paddField`}>
                        <InputText 
                          icon={`more_vert`} 
                          form={_formName+"_receiving_prod" } 
                          field={`qty`}  
                          keyCode={91} 
                          background={`#f5f5f5`}
                          color={`var(--base-color)`}
                          placeholder={`Cantidad`} 
                          OnChange={(e)=>handleInput(e,`qty`)}
                          validations={exVld[`qty`]}
                        />
                      </div>
                      <div className={`paddField`}>
                        <InputText 
                          icon={`more_vert`} 
                          form={_formName+"_receiving_prod" } 
                          field={`price`}  
                          keyCode={31} 
                          background={`#f5f5f5`}
                          color={`var(--base-color)`}
                          placeholder={`Precio`} 
                          OnChange={(e)=>handleInput(e,`price`)}
                          validations={exVld[`price`]}
                        />
                      </div>
                      <div className={`paddField`}>
                            <div className={`fieldPadding _MrgV`} style={{ marginTop: "10px"}}>
                              <span onClick={()=>add_receiving_prod()}>
                                <BTN_f theme={`light_blue`} title={`Add`}/>
                              </span>
                            </div>
                          </div>
                      </div>
                      <div>
                      {
                            _receiving_prod_list && _Util.ObjectKeys(_receiving_prod_list).map(prdId=>{
                              let qty = _receiving_prod_list[prdId] && _receiving_prod_list[prdId]["qty"] ;
                              let price = _receiving_prod_list[prdId] && _receiving_prod_list[prdId]["price"] ;
                              let prodName = _categoriesList[prdId] &&  _categoriesList[prdId]["name"] ;
                              return (
                                <div className={' _dsplFlx spaceAround prodByCombo'}  >
                                  <div className={'prodNameCombo'} >{prodName}</div>
                                  <div  className={' _dsplFlx spaceAround prodQtyCombo'} >
                                    <div className={' _qty'}>{qty}</div>
                                    <div className={' _qty'}>{price}</div>
                                    <div  className={`iconDelete`}  onClick={()=>handleRemoveCombo(prdId)}  >
                                      <Icon2 name={`outline_delete`} size={22}/>
                                    </div>
                                  </div>
                                </div>
                              )
                            })
                        }
                      </div>
                      </div>
                      :null}
                      </div>
                      </div>
                      <div className={' _dsplFlx spaceAround'} >
                        <div className={`fieldPadding _MrgV`} style={{ marginTop: "10px"}}>
                            <span>
                              <BTN_f theme={`light_blue`} title={recomendedPrice}/>
                            </span>
                        </div>
                        <div className={`fieldPadding _MrgV`} style={{ marginTop: "10px"}}>
                            <span>
                              <BTN_f theme={`light_blue`} title={`${recomendedPrice / 25}`}/>
                            </span>
                        </div>
                        <div onClick={()=>_save()} className={`fieldPadding _MrgV`} style={{ marginTop: "10px"}}>
                            <span>
                              <BTN_f theme={`light_blue`} title={`Save Order`}/>
                            </span>
                        </div>
                      </div>
                  </div>  
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
    if(o[k] && o[k][ky] && o[k][ky].toLowerCase().indexOf(v.toLowerCase())>=0){
      res[k] = {name:o[k][ky], id:k}
    }
  })
  return res;
} 

