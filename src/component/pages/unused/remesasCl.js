

import React, { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import loadable from '@loadable/component'



import { withRouter} from 'react-router-dom';

import {  OpenWatchDialog, fetchCities, fetchRateCurrency } from '../../actions/common'



import * as _Util from '../../store/Util'

import '../_styles.css'

const Icon2 = loadable(() => import('../Icons'))

const MoreInfoButton = loadable(() => import('../MoreInfoButton'))

const ImageButton = loadable(() => import('../ImageButton'))

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

  const _LoadRateCurrency= (q) => {
    fetchRateCurrency(q,dispatch);
  }


  
  return { 
    observeChanges,
    _LoadCities,
    _LoadRateCurrency,
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

  














const BrowseComponent = (props) => {
  const {
    _openMd,
    _LoadCities,
    _LoadRateCurrency
  } = useObserveChanges();

  const {
    _updFormObs
  } = useObserveForms();
  


  let _state = _Util.getStore();
  let keys = _Util.getGlobalsKeys()
  _state["keys"] = keys;
  const _formName = 'add_remesa';
  const _form = _Util.getFormStore(_formName) || {};




  const [initialize, setInitialize] = useState(false);

  const [widthScreen, setWidthScreen] = useState(null);

  const [choosePayView, setChoosePayView] = useState(0);
  const [validForm, setIsValidForm] = useState(false);
  const [nextValidForm, setNextValidForm] = useState(false);
  const [formView, setformView] = useState(1);
  const [view, setView] = useState(false);

  
  const searchHash = window.location.search.split('?')[1]?window.location.search.split('?')[1]:null;
  //const typeBrowse = window.location.hash.split('/')[1];


  const router = _Util.parseQuery(searchHash);
  
  let outerWidth = _state["outerWidth"];




  useEffect(() => {  
    if(widthScreen!==outerWidth){
      setWidthScreen(outerWidth);
    } 
    if(!initialize){
      setInitialize(true);
      setTimeout(()=>window.scrollTo(0,0),350);
      setTimeout(()=>setView(true),50);
      window.localStorage.setItem("lng","es");
      let Qry = {
        query:"getRateCurrency"
      };
      _LoadRateCurrency(Qry);
      /*

    
     
      let initF = {
        amount:100,
        currency:"CUP",
        name:"hector",
        cardNumber:"9854589625478804",
        phoneNumber:"5023892075",
        email:"hectoricardom@yahoo.com",
        delivery:"Deposito",
        detinationPhoneNumber:"5352986898",
        detinationName:"Irene",
        cid:"85028547851",
        address:"Fomento 325A E/ 2 y 4 Rpto Peralta"
      }
      */
       
      let initF = {
        amount:100,
        delivery:"Deposito",
        currency:"MLC"
      }
      _Util.updFormStore(_formName,initF)
      _updFormObs();
    }
  });
  



  const _clear = (v) => {
    setChoosePayView(0);
    setformView(1);
  }
  
  
  
  const _openDialog = (v) => {
    let frm =  _form;
    setChoosePayView(0)
    frm['paymentMethod'] = v
    _Util.updFormStore(_formName,frm)
    _openMd();
    _clear();
  }
  /*
  const updAmount = (v) => {
    let frm =  _form;
    frm['amount'] = v
    _Util.updFormStore(_formName,frm)
    setNextValidForm()
  }
  */

  const updCurrency = (v) => {
    let frm =  _form;
    frm['currency'] = v;
    _Util.updFormStore(_formName,frm);
    _updFormObs();
    //setNextValidForm()
  }

  const updDelivery = (v) => {
    let frm =  _form;
    frm['delivery'] = v
    _Util.updFormStore(_formName,frm);
    // _updFormObs();
    validateFields()
  }

  
  const handlePhoneInput = (v,f) => {
    let frm =  _form;
    frm[f] = v
    _Util.updFormStore(_formName,frm)
    validateSendFields()
  }

  const handleInput = (v,f) => {
    let frm =  _form;
    frm[f] = v
    _Util.updFormStore(_formName,frm)
    validateSendFields()
  }


  const vldFlds = {
    name:{reqired:true, minLength:3},
    phoneNumber:{reqired:true, phone: true, number:true},
    email:{reqired:true, email:true},
    currency:{reqired:true},
    amount:{reqired: true, number: true,minValue:30, maxValue:1000}
  }

  const vldFlds2 = {
    name:{reqired:true, minLength:3},
    phoneNumber:{reqired:true, phone: true, number:true},
    cardNumber:{reqired:true, minLength:16, maxLength:16, card:true},
    email:{reqired:true, email:true},
    currency:{reqired:true},
    amount:{reqired: true, number: true,minValue:30, maxValue:1000},
    delivery:{reqired:true},
    detinationPhoneNumber:{reqired:true, cubaphone: true, number:true},
    detinationName:{reqired:true, minLength:3},
    cid:{reqired:true, minLength:11, maxLength:11, number:true},
    address:{reqired:true}, 
    city:{reqired:true},
    state:{reqired:true},
  }



  

  const validateSendFields = (v,f) => {  
    let frm =  _Util.getFormStore(_formName);
    let fld2Prs = ['id','name',"cardNumber","email","phoneNumber","amount","currency"];    
    let _2Fs = frm || {};     
    let _2s = {};
    _2Fs && fld2Prs.map(fld=>{
      _2s[fld] = _2Fs[fld];
    })    
    var _Valid = _Util.validations(vldFlds,_2s);    
    if(_Valid.valid){
      setNextValidForm(true)
    }else{
      setNextValidForm(false)
    }
    _updFormObs();
  }


  const handleInputAutoReceiveState = (v) => {
    let frm =  _form;
    frm['state'] = v.id
    frm['city'] = null;
    _Util.updFormStore(_formName,frm)
    _updFormObs();
    validateFields()
  }
  const handleInputAutoReceive = (v,f) => {
    let frm =  _form;
    frm[f] = v.id
    _Util.updFormStore(_formName,frm)
    validateFields()
  }

  const handleInputReceive = (v,f) => {
    let frm =  _form;
    frm[f] = v
    _Util.updFormStore(_formName,frm)
    validateFields()
  }
  
  

  const validateFields = (v,f) => {  
    let frm =  _Util.getFormStore(_formName);
    let fld2Prs = [
      'id',
      'name',
      "cardNumber",
      "email",
      "phoneNumber",
      "amount",
      "currency",
      "delivery",
      "detinationPhoneNumber",
      "detinationName",
      "cid",
      "address", 
      "city",
      "state"
    ];    
    let _2Fs = frm || {};     
    let _2s = {};
    _2Fs && fld2Prs.map(fld=>{
      _2s[fld] = _2Fs[fld];
    })    
    if(_2s["delivery"]){
      let vld = vldFlds2;
      if(_2s["delivery"]==="Deposito"){
        delete vld["cid"];
        delete vld["address"];
        delete vld["city"];
        delete vld["state"];
      }else if(_2s["delivery"]==="Entrega"){
        delete vld["cardNumber"];
      }
      var _Valid = _Util.validations(vld,_2s); 
      if(_Valid.valid){
        setIsValidForm(true)
      }else{
        setIsValidForm(false)
      }
    }
    
    _updFormObs();
  }



  const _gobackPrgs = (v) => {
    if(v===1 && formView>v){
      setformView(1)
      setChoosePayView(0)
    }
    else if(v===2 && formView===2 && choosePayView > 0){
      setformView(2)
      setChoosePayView(0)
    }
  }


  const openReveiver = (v) => {
    let Qry = {
      query:"getCity"
    };
    _LoadCities(Qry)

    setformView(2)
  }

  var _cities = _state["cities"];

  const PaymentMethod =  _Util.getPaymentMethod()
  var amount = _form["amount"];
  var _currency = _form["currency"];
  var _delivery = _form["delivery"];
  var _stateID = _form["state"];
  let _citiesByState = _cities && _stateID && _cities[_stateID];
  
  let _stateList = parseAutoI(_cities)
  let _cityList;
  if(_citiesByState){
    _cityList = parseAutoI(_citiesByState)
  }

  var _rateCurrency = _state["rateCurrency"];
  let _currentrate = _rateCurrency && _rateCurrency[_currency]


  
  
  let isExpand = choosePayView === 0 && _currency!=="MLC" && formView === 2 && _delivery === "Entrega";

    return (
      <>
        <style>
        {`

        .palette{
            --base-color: rgb(94, 53, 177,1);
            --base-color-gradient: 94, 53, 177;
        }

        `}
        </style>
        <div className={`mainViewHero palette formContainer ${isExpand?'_expand':''}  ${choosePayView === 1?'_payView':''} `} style={{opacity:view?1:0}} >
          <div className={`loloHero`}> 
            <div className={`formHero _dsplFlx spaceAround`}> 
              <div className={`hdWrp`}> 
                <div className={`titleHero`}>
                  {`${_Util.translatetext(26)}`}
                </div>
                <div className={`descHero`}>
                {`${_Util.translatetext(27)}.`}
                </div>
                <div className={`form`}> 
                <div className={`formContainer`} style={{opacity:1}}>
                  <div className={' locationProgress _dsplFlx spaceAround'}>
                      <div  className={`_ponit ${choosePayView === 0 && formView===1?'_active':''}`} onClick={()=>_gobackPrgs(1)}>
                        Envia
                      </div>
                      <Icon2 name={`circle_small`}/>
                      <div className={`_ponit ${choosePayView === 0 && formView===2?'_active':''}`} onClick={()=>_gobackPrgs(2)}>
                        Recibe
                      </div>
                      <Icon2 name={`circle_small`}/>
                      <div className={`_ponit ${choosePayView === 1?'_active':''}`}>
                        Pago
                      </div>
                  </div>
                <div className={`formContainer`} style={{opacity:choosePayView === 0?1:0}}>
                  {choosePayView === 0?
                  <>
                  <div className={`formContainer`} style={{opacity:_currentrate?1:0}}>
                    {_currentrate?
                    <div className={'  _dsplFlx spaceAround'}>
                        <div className={'  _dsplFlx _currentprice box_alert green_alert rtCambio'}>
                          <span>{`${_Util.translatetext(25)}:`} </span>
                          <span className={' _cpBtcn'}>{_currentrate?`${_currentrate.delivery}${_currency} X ${_currentrate.pay}USD`:""}</span>
                        </div>  
                    </div> 
                    :null}
                  </div>
                  <div className={`formContainer`} style={{opacity:formView === 1?1:0}}>
                  {formView===1?
                  <div className={`pym81b sendBx `}>
                    <div className={`_labelBx`}>Envia</div>
                    <div className={`_dsplFlx spaceAround _flxWrp`}>
                      <div className={`paddField`}>
                        <InputText 
                          icon={`more_vert`} 
                          form={_formName} 
                          field={`phoneNumber`}  
                          keyCode={29} 
                          background={`#f5f5f5`}
                          color={`#5e35b1`}
                          placeholder={`${_Util.translatetext(24)}`} 
                          OnChange={(e)=>handlePhoneInput(e,`phoneNumber`)}
                          validations={vldFlds[`phoneNumber`]}
                          initvalue={_form["phoneNumber"]}
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
                          color={`#5e35b1`}
                          OnChange={(e)=>handleInput(e,`name`)}
                          validations={vldFlds[`name`]}
                          initvalue={_form["name"]}
                        />
                      </div>
                      <div className={`paddField`}>
                        <InputText 
                          icon={`more_vert`} 
                          form={_formName} 
                          field={`email`}  
                          keyCode={39} 
                          background={`#f5f5f5`}
                          color={`#5e35b1`}
                          placeholder={`${_Util.translatetext(23)}`} 
                          OnChange={(e)=>handleInput(e,`email`)}
                          validations={vldFlds[`email`]}
                          initvalue={_form["email"]}
                        />
                      </div>
                      <div className={`paddField`}>
                        <ChoiceButton list={["MLC","CUP"]}  value={_currency}  change={(n)=>updCurrency(n)} />
                      </div>
                      {_currency?
                      <div className={`paddField`}>
                        <InputText 
                          icon={`more_vert`} 
                          form={_formName} 
                          field={`amount`}  
                          keyCode={39} 
                          background={`#f5f5f5`}
                          color={`#5e35b1`}
                          placeholder={`${_Util.translatetext(41)}`} 
                          OnChange={(e)=>handleInput(e,`amount`)}
                          validations={vldFlds[`amount`]}
                          initvalue={_form["amount"]}
                        />
                      </div>
                      :null}
                      </div>
                  </div>
                  :null}
                  </div>
                  <div className={`formContainer`} style={{opacity:formView === 2?1:0}}>
                  {formView===2?
                  <div className={`pym81b sendBx `}>
                      <div className={`_labelBx`}>Recibe</div>
                      <div className={`_dsplFlx spaceAround _flxWrp`}>
                          <div className={`paddField`}>
                            <InputText 
                              icon={`more_vert`} 
                              form={_formName} 
                              field={`detinationName`}  
                              keyCode={41} 
                              placeholder={`${_Util.translatetext(21)}`} 
                              background={`#f5f5f5`}
                              color={`#5e35b1`}
                              OnChange={(e)=>handleInputReceive(e,`detinationName`)}
                              validations={vldFlds2[`detinationName`]}
                              initvalue={_form["detinationName"]}
                            />
                          </div>
                          <div className={`paddField`}>
                            <InputText 
                              icon={`more_vert`} 
                              form={_formName} 
                              field={`detinationPhoneNumber`}  
                              keyCode={59} 
                              background={`#f5f5f5`}
                              color={`#5e35b1`}
                              placeholder={`${_Util.translatetext(24)}`} 
                              OnChange={(e)=>handleInputReceive(e,`detinationPhoneNumber`)}
                              validations={vldFlds2[`detinationPhoneNumber`]}
                              initvalue={_form["detinationPhoneNumber"]}
                            />
                          </div>
                          <div className={`paddField`}>
                            <ChoiceButton list={["Deposito","Entrega"]}  value={_delivery} width={'75px'} change={(n)=>updDelivery(n)} />
                          </div>
                      </div>
                      <div className={`_dsplFlx spaceAround _flxWrp`}>
                      {_delivery === "Deposito"?
                          <div className={`paddField`}>
                            <InputText 
                              icon={`more_vert`} 
                              form={_formName} 
                              field={`cardNumber`}  
                              keyCode={37} 
                              background={`#f5f5f5`}
                              color={`#5e35b1`}
                              placeholder={`${_Util.translatetext(22)}`} 
                              OnChange={(e)=>handleInputReceive(e,`cardNumber`)}
                              validations={vldFlds2[`cardNumber`]}
                              initvalue={_form["cardNumber"]}
                            />
                          </div>
                          :null}
                          {_delivery === "Entrega" && _currency!=="MLC"?
                          <div className={`paddField`}>
                            <InputText 
                              icon={`more_vert`} 
                              form={_formName} 
                              field={`cid`}  
                              keyCode={97} 
                              background={`#f5f5f5`}
                              color={`#5e35b1`}
                              placeholder={`Carnet Identidad`} 
                              OnChange={(e)=>handleInputReceive(e,`cid`)}
                              validations={vldFlds2[`cid`]}
                              initvalue={_form["cid"]}
                            />
                          </div>
                          :null}
                          {_delivery === "Entrega" && _currency!=="MLC"?
                          <div className={`paddField`}>
                            <InputAutocomplete 
                              icon={`more_vert`} 
                              form={_formName} 
                              field={`state`}  
                              keyCode={77} 
                              background={`#f5f5f5`}
                              color={`#5e35b1`}
                              placeholder={`Provincia`} 
                              // OnChange={(e)=>handleInputReceive(e,`state`)}
                              validations={vldFlds2[`state`]}
                              initvalue={_form["state"]}
                              OnSelect={(e)=>handleInputAutoReceiveState(e,`state`)} 
                              // OnSelect={(e)=>handleGroupValidate(e, `state` ) } 
                              data={_stateList}
                              //OnChange={(e)=>setGroupSearch(e,"name")}
                            />
                          </div>
                          :null}
                          {_delivery === "Entrega" && _currency!=="MLC" && _cityList?
                          <div className={`paddField`}>
                            <InputAutocomplete 
                              icon={`more_vert`} 
                              form={_formName} 
                              field={`city`}  
                              keyCode={81} 
                              background={`#f5f5f5`}
                              color={`#5e35b1`}
                              placeholder={`Municipio`} 
                              // OnChange={(e)=>handleInputReceive(e,`city`)}
                              validations={vldFlds2[`city`]}
                              initvalue={_form["city"]}
                              OnSelect={(e)=>handleInputAutoReceive(e,`city`)} 
                              data={_cityList}
                              //OnChange={(e)=>setGroupSearch(e,"name")}
                            />
                          </div>
                          :null}
                          {_delivery === "Entrega" && _currency!=="MLC" && _form["city"]?
                          <div className={`paddField address`}>
                            <InputText 
                              icon={`more_vert`} 
                              form={_formName} 
                              field={`address`}  
                              keyCode={67} 
                              background={`#f5f5f5`}
                              color={`#5e35b1`}
                              placeholder={`direcion`} 
                              OnChange={(e)=>handleInputReceive(e,`address`)}
                              validations={vldFlds2[`address`]}
                              initvalue={_form["address"]}
                            />
                          </div>
                          :null}                         
                        {_delivery === "Entrega" && _currency==="MLC"?
                        <div className={'  _dsplFlx spaceAround'} style={{marginTop:'25px'}}>
                          <div className={'  _dsplFlx _currentprice box_alert red_alert rtCambio'}>
                            <span>{`Solo se permite depositar`} </span>
                            <span className={' _cpBtcn'}>{`MLC en Tarjeta `}</span>
                          </div>  
                        </div> 
                        :null}
                      </div>
                    </div>
                    :null}
                    </div>
                  <div style={{marginBottom:'65px'}}></div>
                  {formView===2 && validForm ? 
                    <div className={'_w100  _dsplFlx spaceAround'}  >
                      <MoreInfoButton title={`${_Util.translatetext(1)}`} value={amount} theme={"purple"}  clickEvent={()=>setChoosePayView(1)} />
                    </div>
                    :null}
                    {formView===1 && nextValidForm ? 
                    <div className={'_w100  _dsplFlx spaceAround'}  >
                      <MoreInfoButton title={`${_Util.translatetext(39)}`} value={amount} theme={"purple"}  clickEvent={()=>openReveiver()} />
                    </div>
                    :null}
                    </>
                    :null}
                  </div>
                  <div className={`formContainer`} style={{opacity:choosePayView === 1?1:0}}>
                    {choosePayView === 1?
                    <> 
                      <div className={`_dsplFlx spaceAround _flxWrp`}>
                        {PaymentMethod && _Util.ObjectKeys(PaymentMethod).map(mth=>{                         
                          let itm = PaymentMethod[mth]
                          let src =  itm['url']
                          return(
                            <div className={`margField`}>
                              <div className={'_w100  _dsplFlx spaceAround'} onClick={()=>_openDialog(mth)} >
                                <ImageButton src={src} title={mth}/>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      <div className={`margField`}>
                          <div className={'_w100  _dsplFlx spaceAround'} >
                            <MoreInfoButton title={`${_Util.translatetext(2)}`}  theme={"gray"}  clickEvent={()=>_clear()} />
                          </div>
                        </div>
                    </>
                    :null}
                  </div>
                  </div>
                    
                </div>
              </div>
            </div>
          </div>
          <div className={`formHero_gradient`} />
          <div  className={`mainView2Info`} />
        </div>
      </>
    );
  
}  





export default withRouter(BrowseComponent)



function parseAutoI(o){
  let res = {}
  _Util.ObjectKeys(o).map(k=>{
    res[k] = {name:k, id:k}
  })
  return res;
} 
