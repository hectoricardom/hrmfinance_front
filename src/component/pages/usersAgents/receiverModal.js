

import React, { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import loadable from '@loadable/component'



import { withRouter} from 'react-router-dom';

import {  OpenWatchDialog, fetchCities, fetchRemesa, fetchSenders, CloseModal } from '../../../actions/common'



import * as _Util from '../../../store/Util'
import '../../_styles.css'




const BTNH = _Util.BTNH_Cmpt();

const InputText =  _Util.InputText_Cmpt();







const useObserveChanges = () => {
  const observeChanges =  useSelector(state => state.observeChanges);
  const dispatch = useDispatch(); 


  const _openMd = (_id, item) => {
    let data = {};
    data['zIndex']=450;
    data['Id']=_id;
    data['observeResize']=true;    
    data['props']={item:item, minHeight: '1vh'};
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
  const _formName = 'add_receiver_modal';
  const _form = _Util.getFormStore(_formName) || {};

  const { data } = props;
  const {  modalID  } = data;
  

 
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
    "lon",
    "lat",
    "senderId",
    "phoneNumber",
    "cid",
    "address", 
    "city",
    "state"
  ]; 


  let _userId = _Util.getProfileId();
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
        let _ncv = {"senderId":_userId,state:"holguin",city:"holguin"}
        _Util.updFormStore(_formName,_ncv)
        _updFormObs();
      }
    }
  });
  


  const vldFlds2 = {
    phoneNumber:{reqired:true, minLength:8, maxLength:8,number:true},
    name:{reqired:true, minLength:3},
    address:{reqired:true}
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
    var _Valid = _Util.validations(vldFlds2,_2s); 
    if(_Valid.valid){
      setIsValidForm(true)
    }else{
      setIsValidForm(false)
    }
    _updFormObs();
  }


  const _saveReceiver = async () => {
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
          "id","name","phoneNumber","email","address"
        ],
        params:{
          userId:_userId
        },
        query:"upgradeReceivers"
      };
      const res = _Util.fetchStream_movie_data(_Util.get_GRAPHQLURL(),Qry);
      const td = await res;
      if(td){
        const receiversList = _state["receiversList"] || {};
        const _Id =  _Util.ObjectKeys(td)[0];
        receiversList[_Id] = td[_Id];
        _Util.updStore('receiversList',receiversList);
        _formName && _Util.updFormStore(_formName,{});

        //props.history.push({pathname:"/shopping_cart"});

        CloseModal(dispatch,{id:modalID})
        dispatch({
          type: 'UPD_KEY_VALUE',
          kv:{key:'observeChanges',value:_Util.gen12CodeId()}
        })
      }
      
    }
    
    
  }


  
  let userA = _Util.getBrowser();
  
  let isMobile = userA.os === "Android" || userA.os === "iPhone" || _state["outerWidth"]<550 ;
  


    return (
        <div  {...modalID?{"dialog-key-id":modalID}:""} className={` palette isReceiverModal formContainer ${isMobile?"is_mobile":""}`} style={{opacity:view?1:0, backgroundColor: "#f9f9f9", minHeight:"450px"}} >
          <style>
          {`
          .palette{
              --base-color: rgb(21, 100, 191,1);
              --base-color-gradient: 21, 100, 191;
          }

          `}
          </style>
          <div className={`formContainer  `} style={{opacity:1}}>
              {view?
                <div className={`  `}> 
                <div  className={`  headerTtl `}>
                  <div className={`mainTitle`}>
                      {_form["id"]?_Util.translatetext(67):_Util.translatetext(12)}
                    </div>
                </div>
                <div className={``}>
                  <div className={`formContainer`} style={{opacity:1}}>
                  {true?
                  <div className={`pym81b sendBx `}>
                    <div className={`_dsplFlx spaceAround _flxWrp`}>
                          <div className={`paddField address`}>
                            <InputText 
                              icon={`more_vert`} 
                              form={_formName} 
                              field={`name`}  
                              keyCode={41} 
                              placeholder={`${_Util.translatetext(34)}`} 
                              background={`#f9f9f9`}
                              color={`var(--base-color)`}
                              OnChange={(e)=>handleInputReceive(e,`name`)}
                              validations={vldFlds2[`name`]}
                              initvalue={_form["name"]}
                            />
                          </div>
                          <div className={`formFieldOpacity address`} style={{opacity:_form["city"]?1:0}}>
                              {_form["city"]?
                              <div className={`paddField address`}>
                                <InputText 
                                  icon={`more_vert`} 
                                  form={_formName} 
                                  field={`address`}  
                                  keyCode={67} 
                                  background={`#f9f9f9`}
                                  color={`var(--base-color)`}
                                  placeholder={_Util.translatetext(60)} 
                                  OnChange={(e)=>handleInputReceive(e,`address`)}
                                  validations={vldFlds2[`address`]}
                                  initvalue={_form["address"]}
                                />
                              </div>
                            :null} 
                          </div>

                          <div className={`paddField`}>
                            <InputText 
                              icon={`more_vert`} 
                              form={_formName} 
                              field={`phoneNumber`}  
                              keyCode={59} 
                              background={`#f9f9f9`}
                              color={`var(--base-color)`}
                              placeholder={`${_Util.translatetext(61)}`} 
                              OnChange={(e)=>handleInputReceive(e,`phoneNumber`)}
                              validations={vldFlds2[`phoneNumber`]}
                              initvalue={_form["phoneNumber"]}
                            />
                          </div>


                          { _Util.IsAdmin()?
                          <>
                            <div className={`paddField`}>
                              <InputText 
                                icon={`more_vert`} 
                                form={_formName} 
                                field={`lat`}  
                                keyCode={32} 
                                background={`#f9f9f9`}
                                color={`var(--base-color)`}
                                placeholder={_Util.translatetext(92)} 
                                OnChange={(e)=>handleInputReceive(e,`lat`)}
                                initvalue={_form["lat"]}
                              />
                            </div>
                            <div className={`paddField`}>
                              <InputText 
                                icon={`more_vert`} 
                                form={_formName} 
                                field={`lon`}  
                                keyCode={34} 
                                background={`#f9f9f9`}
                                color={`var(--base-color)`}
                                placeholder={_Util.translatetext(93)}
                                OnChange={(e)=>handleInputReceive(e,`lon`)}
                                initvalue={_form["lon"]}
                              />
                            </div>
                          </>
                        :null}
                          
                      </div>
                    </div>
                    :null}
                    </div>
                  </div>
                  {formView===1 && validForm ? 
                    <div className={`_dsplFlx  btn_action`}>
                      <div className={` flexSpace `}/>
                      <span onClick={()=>_saveReceiver()}>
                        <BTNH theme={`light_blue`} title={ _form["id"]?_Util.translatetext(67):_Util.translatetext(12)}/>
                      </span>
                    </div>
                    :null}
                  </div>
                :null}
            </div>
        </div>
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