

import React, { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import loadable from '@loadable/component'



import { withRouter} from 'react-router-dom';

import {  OpenWatchDialog, fetchCities, fetchRemesa, fetchSenders } from '../../actions/common'



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

  


  const _updRemesa = (q,operation) => {
    fetchRemesa(q,dispatch)
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

  














const SendersComponent = (props) => {
  const {
    _openMd,
    _LoadCities,
    dispatch,
    _updRemesa
  } = useObserveChanges();

  const {
    _updFormObs
  } = useObserveForms();
  


  let _state = _Util.getStore();
  let keys = _Util.getGlobalsKeys()
  _state["keys"] = keys;
  const _formName = 'add_receiver';
  const _form = _Util.getFormStore(_formName) || {};




  const [initialize, setInitialize] = useState(false);

  const [widthScreen, setWidthScreen] = useState(null);

  const [choosePayView, setChoosePayView] = useState(0);
  const [validForm, setIsValidForm] = useState(false);
  const [formView, setformView] = useState(1);
  const [view, setView] = useState(false);

  
  let outerWidth = _state["outerWidth"];



  const [senderList, setSenderList] = useState({});
  const [senderLoad, setSenderLoad] = useState(false);



  let fld2Prs = [
    'id',
    'name',
    "email",
    "senderId",
    "phoneNumber",
    "cid",
    "address", 
    "city",
    "state"
  ]; 


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
        auth:{
          authCode:"850217"
        },
        query:"getCity"
      };
      _LoadCities(Qry);

      let Qry2 = {
        auth:{
          authCode:"850217"
        },
        query:"getQueryCollectionsAll",
        Collection:"Senders"
      };
      fetchSenders(Qry2,dispatch);

      let frm =  _Util.getFormStore(_formName);

      if(!frm || !frm["id"]){
        _Util.updFormStore(_formName,{"senderId":"6kCinbwqrdkIlHzA"})
        _updFormObs();
      }
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


  const vldFlds2 = {
    //cardNumber:{reqired:true, minLength:16, maxLength:16, card:true},
    //email:{reqired:true, email:true},
    //phoneNumber:{reqired:true, cubaphone: true, number:true},
    name:{reqired:true, minLength:3},
    //cid:{reqired:true, minLength:11, maxLength:11, number:true},
    address:{reqired:true}, 
    city:{reqired:true},
    senderId:{reqired:true},
    state:{reqired:true},
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
    let _2Fs = frm || {};     
    let _2s = {};
    _2Fs && fld2Prs.map(fld=>{
      _2s[fld] = _2Fs[fld];
    })    
    let vld = vldFlds2;
    var _Valid = _Util.validations(vld,_2s); 
    if(_Valid.valid){
      setIsValidForm(true)
    }else{
      setIsValidForm(false)
    }
    _updFormObs();
  }


  const _saveReceiver = () => {
    let frm =  _Util.getFormStore(_formName);
       
    let _2Fs = frm || {};     
    let _2s = {};
    _2Fs && fld2Prs.map(fld=>{
      _2s[fld] = _2Fs[fld];
    })    
    let vld = vldFlds2;
    var _Valid = _Util.validations(vld,_2s);   
    if(_Valid.valid){
      _updFormObs();
      let Qry = {
        form:_2s,
        auth:{
          authCode:"850217"
        },
        fields:[
          "id","name","phoneNumber"
        ],
        query:"upgradeReceivers"
      };
      _updRemesa(Qry);
      _formName && _Util.updFormStore(_formName,{});
      props.history.push({pathname:"/senders"});
    }
  }


  


  var _cities = _state["cities"];
  var _stateID = _form["state"];
  let _citiesByState = _cities && _stateID && _cities[_stateID];
  
  let _stateList = parseAutoI(_cities)
  let _cityList;
  if(_citiesByState){
    _cityList = parseAutoI(_citiesByState)
  }

  var _sendersList = _state["sendersList"];
  let _sendersPrs = parseAutoObj(_sendersList,"name")
  

  const setSenderSearch = (v,f) => {
    if(v){
      _sendersPrs = parseAutoFilterObj(_sendersList,"name",v);
      setSenderList(_sendersPrs);
    }else{
      _sendersPrs = parseAutoObj(_sendersList,"name");
      setSenderList(_sendersPrs);
    }
  }
  



  if(_sendersList && !senderLoad){
    _sendersPrs = parseAutoObj(_sendersList,"name");
    setSenderList(_sendersPrs);
    setSenderLoad(true);
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
        <div className={` palette formContainer ${isMobile?"is_mobile":""}`} style={{opacity:view?1:0}} >
          <div className={`formContainer `} style={{opacity:1}}>
              {view?
                <div className={`centerListCardProd  `}> 
                <div  className={`  headerTtl `}>
                  <div className={`mainTitle`}>
                      {`Beneficiarios`}
                    </div>
                    <div className={`descTitle`}>
                    {`detalles de su familiar en cuba `}
                  </div>
                </div>
                <div className={``}>
                  <div className={`formContainer`} style={{opacity:formView?1:0}}>
                  {formView===1?
                  <div className={`pym81b sendBx `}>
                      <div className={`_labelBx`}>Recibe</div>
                      <div className={`_dsplFlx spaceAround _flxWrp`}>
                          <div className={`paddField address`}>
                            <InputText 
                              icon={`more_vert`} 
                              form={_formName} 
                              field={`name`}  
                              keyCode={41} 
                              placeholder={`${_Util.translatetext(21)}`} 
                              background={`#f5f5f5`}
                              color={`var(--base-color)`}
                              OnChange={(e)=>handleInputReceive(e,`name`)}
                              validations={vldFlds2[`name`]}
                              initvalue={_form["name"]}
                            />
                          </div>
                          <div className={`paddField`}>
                            <InputText 
                              icon={`more_vert`} 
                              form={_formName} 
                              field={`phoneNumber`}  
                              keyCode={59} 
                              background={`#f5f5f5`}
                              color={`var(--base-color)`}
                              placeholder={`${_Util.translatetext(24)}`} 
                              OnChange={(e)=>handleInputReceive(e,`phoneNumber`)}
                              validations={vldFlds2[`phoneNumber`]}
                              initvalue={_form["phoneNumber"]}
                            />
                          </div>
                          <div className={`paddField`}>
                            <InputText 
                              icon={`more_vert`} 
                              form={_formName} 
                              field={`cid`}  
                              keyCode={97} 
                              background={`#f5f5f5`}
                              color={`var(--base-color)`}
                              placeholder={`Carnet Identidad`} 
                              OnChange={(e)=>handleInputReceive(e,`cid`)}
                              validations={vldFlds2[`cid`]}
                              initvalue={_form["cid"]}
                            />
                          </div>
                      </div>
                      <div className={`_dsplFlx spaceAround _flxWrp`}>
                          <div className={`paddField`}>
                            <InputAutocomplete 
                              icon={`more_vert`} 
                              form={_formName} 
                              field={`state`}  
                              keyCode={77} 
                              background={`#f5f5f5`}
                              color={`var(--base-color)`}
                              placeholder={`Provincia`} 
                              // OnChange={(e)=>handleInputReceive(e,`state`)}
                              validations={vldFlds2[`state`]}
                              initvalue={_form["state"]}
                              OnSelect={(e)=>handleInputAutoReceiveState(e)} 
                              // OnSelect={(e)=>handleGroupValidate(e, `state` ) } 
                              data={_stateList}
                              //OnChange={(e)=>setGroupSearch(e,"name")}
                            />
                          </div>
                          <div className={`formFieldOpacity`} style={{opacity:_cityList?1:0}}>
                            {_cityList?
                            <div className={`paddField`}>
                              <InputAutocomplete 
                                icon={`more_vert`} 
                                form={_formName} 
                                field={`city`}  
                                keyCode={81} 
                                background={`#f5f5f5`}
                                color={`var(--base-color)`}
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
                          </div>
                          <div className={`formFieldOpacity address`} style={{opacity:_form["city"]?1:0}}>
                            {_form["city"]?
                            <div className={`paddField address`}>
                              <InputText 
                                icon={`more_vert`} 
                                form={_formName} 
                                field={`address`}  
                                keyCode={67} 
                                background={`#f5f5f5`}
                                color={`var(--base-color)`}
                                placeholder={`direcion`} 
                                OnChange={(e)=>handleInputReceive(e,`address`)}
                                validations={vldFlds2[`address`]}
                                initvalue={_form["address"]}
                              />
                            </div>
                            :null} 
                          </div>
                      </div>
                    </div>
                    :null}
                    </div>
                  </div>
                  <div style={{marginBottom:'65px'}}></div>
                  {formView===1 && validForm ? 
                    <div className={'_w100  _dsplFlx spaceAround'}  >
                      <MoreInfoButton title={`Save`} theme={"purple"}  clickEvent={()=>_saveReceiver()} />
                    </div>
                    :null}
                    </div>
                :null}
              </div>
            </div>
          <div  className={`mainView2Info`} />
      </>
    );
  
}  





export default withRouter(SendersComponent)



function parseAutoI(o){
  let res = {}
  _Util.ObjectKeys(o).map(k=>{
    res[k] = {name:k, id:k}
  })
  return res;
} 


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