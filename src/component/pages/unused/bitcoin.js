

import React, { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import loadable from '@loadable/component'



import { withRouter} from 'react-router-dom';

import { fetchRemesa} from '../../actions/common';


import * as _Util from '../../store/Util'

import '../_styles.css'


const Icon2 = loadable(() => import('../Icons'))

const InputText = loadable(() => import('../InputText'))

const MoreInfoButton = loadable(() => import('../MoreInfoButton'))

const NumberButton = loadable(() => import('../NumberButton'))



const useObserveForms = () => {
  const observeForms =  useSelector(state => state.observeForms);
  const dispatch = useDispatch(); 


  const _updFormObs = (q,operation) => {
    dispatch({
      type: 'UPD_KEY_VALUE',
      kv:{key:'observeForms',value:_Util.gen12CodeId()}
    })
  }

  const _buyBitcoin = (q,operation) => {
    fetchRemesa(q,dispatch)
  }
  

  return { 
    _updFormObs,
    _buyBitcoin,
    observeForms
  }
}

  














const BrowseComponent = (props) => { 
  const {
    _updFormObs,
    _buyBitcoin
  } = useObserveForms();
  


  let _state = _Util.getStore();
  let keys = _Util.getGlobalsKeys()
  _state["keys"] = keys;
  const _formName = 'add_bitcoin';
  const _form = _Util.getFormStore(_formName) || {};




  const [initialize, setInitialize] = useState(false);

  const [widthScreen, setWidthScreen] = useState(null);

  const [choosePayView, setChoosePayView] = useState(0);
  const [validForm, setIsValidForm] = useState(false);


  /*
  const searchHash = window.location.search.split('?')[1]?window.location.search.split('?')[1]:null;
  const typeBrowse = window.location.hash.split('/')[1];
  const router = _Util.parseQuery(searchHash);
  
  */
  let outerWidth = _state["outerWidth"];


  useEffect(() => {  
    if(widthScreen!==outerWidth){
      setWidthScreen(outerWidth);
    } 
    if(!initialize){
      setInitialize(true);
      setTimeout(()=>window.scrollTo(0,0),350);

      let initF = {
        amount:100
      }
      _Util.updFormStore(_formName,initF)
      _updFormObs();
    }
  });
  


  
  

  const updAmount = (v) => {
    let frm =  _form;
    frm['amount'] = v
    _Util.updFormStore(_formName,frm)
    validateFields()
  }



  const handleInput = (v,f) => {
    let frm =  _form;
    frm[f] = v
    _Util.updFormStore(_formName,frm)
    validateFields()
  }


  const vldFlds = {
    name:{reqired:true, minLength:3},
    phoneNumber:{reqired:true, cubaphone: true},
    email:{reqired:true, email:true},
    amount:{reqired: true, number: true,minValue:100, maxValue:1000}
  };


  const validateFields = (v,f) => {  
    let frm =  _Util.getFormStore(_formName);
    let fld2Prs = ['id','name',"email","phoneNumber","amount"];    
    let _2Fs = frm || {};     
    let _2s = {};
    _2Fs && fld2Prs.map(fld=>{
      if(_2Fs[fld]){
        _2s[fld] = _2Fs[fld];
      }
    })    
    var _Valid = _Util.validations(vldFlds,_2s);
    if(_Valid.valid){
      setIsValidForm(true)
    }else{
      setIsValidForm(false)
    }
    _updFormObs();
  }




  var amount = _form["amount"];
  var _email = _form["email"];


  var _currentprice = _state["currentprice"];
  
  const clearD = (v,f) => {
    setChoosePayView(0);
    _Util.updFormStore(_formName,{});
    setIsValidForm(false);
  }


  const reqBuyBitcoin = (v,f) => {
    setChoosePayView(1);
    let frm = _form;
    frm["date"] =(new Date()).getTime();
    let Qry = {
      form:frm,
      fields:[
        "id","email","name","phoneNumber"
      ],
      query:"buyBitcoin"
    };
    _buyBitcoin(Qry);
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
        <div className={`mainViewHero palette`} >
          <div className={`loloHero`}> 
            <div className={`formHero _dsplFlx spaceAround`}> 
              <div className={`hdWrp`}> 
                <div className={`titleHero`}>
                  {`${_Util.translatetext(28)}`}
                </div>
                <div className={`descHero`}>
                {`${_Util.translatetext(29)}.`}
                </div>
                <div className={`form`}> 
                <div className={`formContainer`} style={{opacity:choosePayView === 0?1:0}}>
                  {choosePayView === 0?
                  <>
                  <div className={`_dsplFlx spaceAround _flxWrp`}>
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
                        field={`phoneNumber`}  
                        keyCode={29} 
                        background={`#f5f5f5`}
                        color={`var(--base-color)`}
                        placeholder={`${_Util.translatetext(24)}`} 
                        OnChange={(e)=>handleInput(e,`phoneNumber`)}
                        validations={vldFlds[`phoneNumber`]}
                        initvalue={_form["phoneNumber"]}
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
                      <>
                        <div className={'  _dsplFlx spaceAround amount_label2'}>{'Amount'}</div>  
                        <div className={'  _dsplFlx spaceAround'}>
                          <div className={'  _dsplFlx _currentprice box_alert green_alert'}>
                            <span>{`${_Util.translatetext(6)}: `} </span>
                            <span className={' _cpBtcn'}>{_currentprice && _currentprice["USD"] && _currentprice["USD"]["rate_float"] }</span>
                          </div>  
                        </div>                    
                        <div className={'  _dsplFlx spaceAround'}>
                          <NumberButton change={(n)=>updAmount(n)}  amount={amount?amount:0}  color={`var(--base-color)`} minValue={100}/>
                        </div>
                      </>
                      <div style={{marginBottom:'65px'}}></div>                      
                  {validForm ? 
                    <div className={'_w100  _dsplFlx spaceAround'}  >
                      <MoreInfoButton title={`${_Util.translatetext(1)}`} theme={"purple"} clickEvent={()=>reqBuyBitcoin()} />
                    </div>
                    :null}
                    </>
                    :null}
                  </div>
                  <div className={`formContainer`} style={{opacity:choosePayView === 1?1:0}}>
                    {choosePayView === 1?
                    <> 
                      <div className={'__title_bitC__ _dsplFlx  spaceAround '}>
                        {`${_Util.translatetext(5)}`}
                      </div>
                      <div className={'__minimun__pay__Wrapper__'}>                  
                        <div className={'pym81b bxPyDt'} >
                          <div className={'_dsplFlx spaceAround' }>
                            <div className={'_icon_confirm  flexColor _dsplFlx spaceAround' }>
                              <Icon2   
                                name={"thumb_up_ntflx"} 
                                color={'currentColor'} 
                                size={36}
                              />      
                            </div> 
                          </div> 
                          <div className={'_dsplFlx spaceAround'}  >
                            <div className={'_txt_confirm flexColor' }>
                              <span className={'' }>{`${_Util.translatetext(3)} `}</span>
                              <span className={'_email_confirm' }>{_email}</span>
                              <span className={'' }>{` ${_Util.translatetext(4)}`}</span>        
                            </div> 
                          </div> 
                        </div>                 
                      </div>
                      <div className={'_w100  _dsplFlx spaceAround'} >
                        <div className={`paddField`}>
                          <MoreInfoButton title={`${_Util.translatetext(2)}`}  theme={"purple"} icon={'Xclose'}  clickEvent={()=>clearD()}/>
                        </div>
                      </div>
                    </>
                    :null}
                  </div>

                    
                </div>
              </div>
            </div>
          </div>
          <div className={`formHero_gradient`} />
         
        </div>
      </>
    );
  
}  





export default withRouter(BrowseComponent)
