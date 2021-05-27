

import React, { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import loadable from '@loadable/component'



import { withRouter} from 'react-router-dom';

import {  OpenWatchDialog, fetchCities, fetchRemesa, fetchSenders, fetchUsers } from '../../actions/common'



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
  const _formName = 'add_sender';
  const _form = _Util.getFormStore(_formName) || {};




  const [initialize, setInitialize] = useState(false);

  const [widthScreen, setWidthScreen] = useState(null);

  const [choosePayView, setChoosePayView] = useState(0);
  const [validForm, setIsValidForm] = useState(false);
  const [nextValidForm, setNextValidForm] = useState(false);
  const [formView, setformView] = useState(1);
  const [view, setView] = useState(false);

  
  let fld2Prs = ['id','name',"phoneNumber","email","dispatcherId"];

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
        query:"getQuerySenderDetails",
        Collection:"Senders"
      };
      fetchSenders(Qry2,dispatch);

      let QryUser = {
        auth:{
          authCode:"850217"
        },
        query:"getQueryUsersDetails",
        params:{userId:"113699695841584167881"},
        Collection:"Users"
      };
      fetchUsers(QryUser,dispatch);



      

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
  
  
  
  const _openDialog = (v) => {
    let frm =  _form;
    setChoosePayView(0)
    frm['paymentMethod'] = v
    _Util.updFormStore(_formName,frm)
    _openMd();
    _clear();
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
    //email:{reqired:true, email:true}
  }


  

  const validateSendFields = (v,f) => {  
    let frm =  _Util.getFormStore(_formName);
    
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

  
  

  const saveSender = () => {
    let frm =  _Util.getFormStore(_formName);   
    let _2Fs = frm || {};     
    let _2s = {};
    _2Fs && fld2Prs.map(fld=>{
      _2s[fld] = _2Fs[fld];
    })    
    var _Valid = _Util.validations(vldFlds,_2s);    
    if(_Valid.valid){
      _updFormObs();

      let Qry = {
        form:_2s,
        auth:{
          authCode:"850217"
        },
        fields:['id','name',"phoneNumber","email","dispatcherId"],
        query:"upgradeSenders"
      };
      console.log(Qry);
      _updRemesa(Qry, _formName);
      _formName && _Util.updFormStore(_formName,{});
      props.history.push({pathname:"/receivers"});

    }
  }



  const [agentList, setAgentList] = useState({});
  const [agentLoaded, setAgentLoaded] = useState(false);



  const handleInputAutoReceive = (v,f) => {
    let frm =  _form;
    frm[f] = v.id
    _Util.updFormStore(_formName,frm)
    validateSendFields()
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
  



  console.log("_form", _form)


  
    return (
      <>
        <style>
        {`
        .palette{
            --base-color: rgb(0, 137, 123,1);
            --base-color-gradient: 0, 137, 123;
        }

        `}
        </style>
        <div className={`mainViewHero palette formContainer   ${choosePayView === 1?'_payView':''} `} style={{opacity:view?1:0}} >
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
                <div className={`formContainer`} style={{opacity:choosePayView === 0?1:0}}>
                  {choosePayView === 0?
                  <>
                  <div className={`formContainer`} style={{opacity:formView === 1?1:0}}>
                  {formView===1?
                  <div className={`pym81b sendBx `}>
                    <div className={`_labelBx`}>Envia</div>
                    <div className={`_dsplFlx spaceAround _flxWrp`}>
                    <div className={`paddField address`}>
                          <InputAutocomplete 
                            icon={`more_vert`} 
                            form={_formName} 
                            field={`dispatcherId`}  
                            keyCode={79} 
                            background={`#f5f5f5`}
                            color={`var(--base-color)`}
                            placeholder={`Agent`} 
                            validations={vldFlds[`dispatcherId`]}
                            initvalue={_form["dispatcherId"]}
                            OnSelect={(e)=>handleInputAutoReceive(e,`dispatcherId`)} 
                            data={agentList}
                            OnChange={(e)=>setAgentSearch(e,"name")}
                          />
                      </div>
                      <div className={`paddField`}>
                        <InputText 
                          icon={`more_vert`} 
                          form={_formName} 
                          field={`phoneNumber`}  
                          keyCode={29} 
                          background={`#f5f5f5`}
                          color={`var(--base-color)`}
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
                          field={`email`}  
                          keyCode={39} 
                          background={`#f5f5f5`}
                          color={`var(--base-color)`}
                          placeholder={`${_Util.translatetext(23)}`} 
                          OnChange={(e)=>handleInput(e,`email`)}
                          validations={vldFlds[`email`]}
                          initvalue={_form["email"]}
                        />
                      </div>
                      </div>
                  </div>
                  :null}
                  </div>
                  <div style={{marginBottom:'65px'}}></div>
                    {formView===1 && nextValidForm ? 
                    <div className={'_w100  _dsplFlx spaceAround'}  >
                      <MoreInfoButton title={`Save`} theme={"purple"}  clickEvent={()=>saveSender()} />
                    </div>
                    :null}
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