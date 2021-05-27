

import React, { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import loadable from '@loadable/component'



import { withRouter} from 'react-router-dom';

import {  OpenWatchDialog, fetchCities, fetchRateCurrency, fetchSenders, fetchUsers, fetchRemesa, OpenModal, CloseModal } from '../../actions/common'



import * as _Util from '../../store/Util'

import '../_styles.css'

const Icon2 = loadable(() => import('../Icons'))

const MoreInfoButton = loadable(() => import('../MoreInfoButton'))

const ImageButton = loadable(() => import('../ImageButton'))

const ChoiceButton = loadable(() => import('../ChoiceButton'))

const PaymentSlideUp = loadable(() => import('../paymentSlideUp'))

const InputText = loadable(() => import('../InputText'))

const InputAutocomplete = loadable(() => import('../InputAutocomplete'))

const BTN_f = loadable(() => import('../btns_confirm'))


const ModalDate = loadable(() => import('../ModalDate'))


const _formName = 'add_btc_agent';


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


  const callBackDate= (f,v) => {
    let dD = new Date(v);
    const _form = _Util.getFormStore(_formName) || {};
    let frm =  _form;
    frm[f] = dD.getTime();
    _Util.updFormStore(_formName,frm)
  }



  const OpenModalDate = (i, callBack) => {
    let data = {};
    const _form = _Util.getFormStore(_formName) || {};
    let  _date = _form && _form[i];
    data['zIndex']=190;
    data['observeResize']=true;
    data['props']={title:"", item:i};
    data['content'] = <ModalDate valueUpdate={(e)=>callBackDate(i,e)} initValue={_date}/>; 
    //console.log(data)
    OpenModal(dispatch,data);
  }
  


  
  return { 
    observeChanges,
    _LoadCities,
    dispatch,
    OpenModalDate,
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
    OpenModalDate,
    dispatch,
    _LoadRateCurrency
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


      let Qry2 = {
        query:"getQuerySenderDetails",
        Collection:"Senders"
      };
      fetchSenders(Qry2,dispatch);  
      

      let QryUser = {
        query:"getQueryUsersDetails",
        Collection:"Users"
      };
      fetchUsers(QryUser,dispatch);  

      let frm =  _Util.getFormStore(_formName);
      if(frm && !frm["id"]){
        let initF = {
          amount:100,
          date:(new Date()).getTime()
        }
        _Util.updFormStore(_formName,initF)
        _updFormObs();
      }
    }
  });
  


  const handleInput = (v,f) => {
    let frm =  _form;
    frm[f] = v
    _Util.updFormStore(_formName,frm)
    validateFields()
  }


  
  const vldFlds2 = {
    //amount:{reqired: true, number: true,minValue:10, maxValue:5000},
    agentId:{reqired:true},
    date:{reqired:true},
    tasa:{reqired: true, number: true, minValue:1, maxValue:90},
  }


  let fld2Prs = [
    'id',
    "amount",
    "agentId",
    "senderId",
    "receiverId",
    "description",
    "tasa",
    "type",
    "delivery",
    "date"
  ]; 


  const handleInputAutoReceive = (v,f) => {
    let frm =  _form;
    frm[f] = v.id
    _Util.updFormStore(_formName,frm)
    validateFields()
  }


  const validateFields = (v,f) => {  
    let frm =  _Util.getFormStore(_formName);
    let _2Fs = frm || {};     
    let _2s = {};
    _2Fs && fld2Prs.map(fld=>{
      _2s[fld] = _2Fs[fld];
    });
    let vld = vldFlds2;
    if(!_2s["date"]){
      _2s["date"] = (new Date()).getTime();
    };
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
    let vld = vldFlds2;
    if(!_2s["date"]){
      _2s["date"] = (new Date()).getTime();
    }
    var _Valid = _Util.validations(vld,_2s);   
    if(_Valid.valid){
      _updFormObs();
      _2s["type"] = "ADJUSTMENTS";
      _2s["delivery"] = true;
      let Qry = {
        form:_2s,
        fields:[
          "id","senderId","receiverId","agentId","amount","date","type"
        ],
        query:"upgradeMovements"
      };
      fetchRemesa(Qry,dispatch,_formName);
      _formName && _Util.updFormStore(_formName,{});
      props.history.push({pathname:"/movements_list"});
    }
  }

  
  var _usersList = _state["usersList"];

  let _usersPrs = parseAutoObj(_usersList,"personName")

  const handleInputDate = (v,f) => {
    let frm =  _form;
    frm[f] = v.id;
    //_Util.updFormStore(_formName,frm)
    //validateFields()
  }

  return (
      <>
        <style>
        {`

      .palette{
        --base-color: rgb(255, 111, 0);
        --base-color-gradient: 255, 111, 0;
      }

        `}
        </style>
        <div className={`mainViewHero palette formContainer  ${choosePayView === 1?'_payView':''} `} style={{opacity:view?1:0}} >
            <div className={`mnhgtFrg`}> 
                <div className={`formContainer`} style={{opacity:choosePayView === 0?1:0}}>
                  {choosePayView === 0?
                  <>
                  <div className={`formContainer`} style={{opacity:formView === 1?1:0}}>
                  {formView===1?
                  <div className={`pym81b sendBx `}>
                    <div className={`_labelBx`}>Ajustes</div>
                    <div className={`_dsplFlx spaceAround _flxWrp`}>
                      <div className={`paddField address`}>
                          <InputAutocomplete 
                            icon={`more_vert`} 
                            form={_formName} 
                            field={`agentId`}  
                            keyCode={16} 
                            background={`#f5f5f5`}
                            color={`var(--base-color)`}
                            placeholder={`Agent`} 
                            // OnChange={(e)=>handleInputReceive(e,`city`)}
                            validations={vldFlds2[`agentId`]}
                            initvalue={_form["agentId"]}
                            OnSelect={(e)=>handleInputAutoReceive(e,`agentId`)} 
                            data={_usersPrs}
                            //OnChange={(e)=>setGroupSearch(e,"name")}
                          />
                      </div>
                      <div className={`paddField`}>
                        <InputText 
                          icon={`more_vert`} 
                          form={_formName} 
                          field={`amount`}  
                          keyCode={26} 
                          background={`#f5f5f5`}
                          color={`var(--base-color)`}
                          placeholder={`${_Util.translatetext(41)}`} 
                          OnChange={(e)=>handleInput(e,`amount`)}
                          //validations={vldFlds2[`amount`]}
                          initvalue={_form["amount"]}
                        />
                      </div>
                      <div className={`paddField`}>
                        <InputText 
                          icon={`more_vert`} 
                          form={_formName} 
                          field={`tasa`}  
                          keyCode={36} 
                          background={`#f5f5f5`}
                          color={`var(--base-color)`}
                          placeholder={`Tasa`} 
                          OnChange={(e)=>handleInput(e,`tasa`)}
                          validations={vldFlds2[`tasa`]}
                          initvalue={_form["tasa"]}
                        />
                      </div>
                      <div className={`paddField address`}>
                        <InputText 
                          icon={`more_vert`} 
                          form={_formName} 
                          field={`description`}  
                          keyCode={46} 
                          background={`#f5f5f5`}
                          color={`var(--base-color)`}
                          placeholder={`Description`} 
                          OnChange={(e)=>handleInput(e,`description`)}
                          validations={vldFlds2[`description`]}
                          initvalue={_form["description"]}
                        />
                      </div>
                      </div>
                      <div className={`fieldPadding _MrgV`}>
                        <span onClick={()=>OpenModalDate( `date`, handleInputDate )}>
                          <BTN_f theme={`light_blue`} title={_form && _form["date"]?_Util.parseDate(_form["date"]):_Util.parseDate(_Util.gTm())}/>
                        </span>
                      </div>
                  </div>
                  :null}
                  </div>

                  <div style={{marginBottom:'65px'}}></div>                  
                    {formView===1 && validForm ? 
                    <div className={'_w100  _dsplFlx spaceAround'}  >
                      <MoreInfoButton title={`Save`}  theme={"purple"}  clickEvent={()=>_save()} />
                    </div>
                    :null}
                    </>
                    :null}
                  </div>
                  </div>
          <div  className={`mainView2Info`} />
        </div>
      </>
  );
}  





export default withRouter(BrowseComponent)


function parseAutoObj(o,ky){
  let res = {}
  _Util.ObjectKeys(o).map(k=>{
    res[k] = {name:o[k][ky], id:k}
  })
  return res;
} 