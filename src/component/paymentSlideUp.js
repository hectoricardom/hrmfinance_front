


import React, { useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import loadable from '@loadable/component'

import './_styles.css'

import * as _Util from '../store/Util'
import {  fetchRemesa } from '../actions/common'



const MoreInfoButton = loadable(() => import('./MoreInfoButton'))



const useObserveChanges = () => {
  const observeChanges =  useSelector(state => state.observeChanges);
  const dispatch = useDispatch(); 

  const _addRemesa = (q,operation) => {
    fetchRemesa(q,dispatch)
  }


  return {
    dispatch,
    _addRemesa
  }
}








const Details = (props) => {
  

  const {
    dispatch,
    _addRemesa
  } = useObserveChanges();

  const { closePop } = props;

  const [view, setView] = useState(1); 
  
  let _state = _Util.getStore();
 
  const goback = (e) => { 
    if(typeof props.closePop === "function"){
      setTimeout(()=>window.scrollTo(0,0),325);
      closePop();
      let initF = {
        amount:100,
        currency:"MLC"
      }
      _Util.updFormStore(_formName,initF)
      dispatch({
        type: 'UPD_KEY_VALUE',
        kv:{key:'observeForms',value:_Util.gen12CodeId()}
      })
     
    }

  }

  const goConfirmation = (e) => { 
    setView(2)
    window.scrollTo(0,0)
    let frm = _form;
    frm["date"] =(new Date()).getTime();
    let Qry = {
      form:frm,
      auth:{
        authCode:"850217"
      },
      fields:[
        "id","email","name","phoneNumber"
      ],
      query:"addRemesa"
    };
    _addRemesa(Qry);
  }
  
  const _formName = 'add_remesa';
  const _form = _Util.getFormStore(_formName) || {};

  
  const PaymentMethod =  _Util.getPaymentMethod()


  let _currency = _form["currency"] || "CUP";
  let _name = _form["name"] || "";
  let _delivery = _form["delivery"] || "";
  let _nameR = _form["detinationName"] || "";
  let _phoneR = _form["detinationPhoneNumber"] || "";
  let _phone = _form["phoneNumber"] || "";
  let _email = _form["email"] || "";
  let _tarjeta = _form["cardNumber"] || "";
  let _amount = _form["amount"] || "";
  let _cid = _form["cid"] || "";
  let _address = ` ${_form.address}, ${_form.city}, ${_form.state}` || "";
  const _paymentMethod = _form["paymentMethod"] || ""
  const _paymentMethodActive = PaymentMethod[_paymentMethod]


  var _rateCurrency = _state["rateCurrency"];
  let _currentrate = _rateCurrency && _rateCurrency[_currency]


  let topay = 0;
  let toReceive = 0;

if(_currentrate){
  topay = _amount*_currentrate.pay;
  toReceive = _amount*_currentrate.delivery;
}

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
        <div className={`paymentView boxCard palette`}>
          <div className={`slideWrp`}>
            <div className={'option__edit_payments'}>
            <div className="__body__">  
            <div className={`formContainer`} style={{opacity:view === 1?1:0}}>
                  {view === 1?
                  <> 
              <div className={'titlePaymentheader  flexColor _dsplFlx spaceAround' }>
                  {`${_Util.translatetext(31)}`}
              </div>
              <div className={'pym81b bxPyDt'}>
                <div className={`_labelBx`}>Recibe</div>
                <div className={'__Label_description__ _dsplFlx'}>
                    {`${_Util.translatetext(32)}: `}  
                </div>
                <div className={'__title_description__ _dsplFlx '}>
                    {_nameR}
                </div>

                <div className={'__Label_description__ _dsplFlx'}>
                    {`${_Util.translatetext(33)}: `}  
                </div>
                <div className={'__title_description__ _dsplFlx '}>
                    {_phoneR}
                </div>

                <div className={'__Label_description__ _dsplFlx'}>
                    {`${_delivery}: `}
                </div>
                <div className={'pym81b bxPyDt'}>
                  {_delivery==="Entrega"?
                    <div className={'__cI__ _dsplFlx '} >
                     {`CI: ${_cid}`}                    
                    </div> 
                  :null}
                  {_delivery==="Deposito"?
                  <div className={'__title_body__  flexColor _dsplFlx spaceAround' }>
                      {_tarjeta}              
                  </div>
                   :null}
                  {_delivery!=="Deposito"?
                  <div className={'_address_  flexColor _dsplFlx spaceAround' }>
                      {_address}              
                  </div>
                   :null}
                  <div className={'__pay_amount__  flexColor _dsplFlx spaceAround'} >
                    {`${toReceive && toReceive.toFixed(2)}  ${_currency}`}
                  </div>   
                </div>                  
              </div>
              <div className={'pym81b bxPyDt'}>
                <div className={`_labelBx`}>Envia</div>
                <div className={'__Label_description__ _dsplFlx'}>
                    {`${_Util.translatetext(21)}: `}  
                </div>
                <div className={'__title_description__ _dsplFlx '}>
                    {_name}
                </div>

                <div className={'__Label_description__ _dsplFlx'}>
                    {`${_Util.translatetext(33)}: `}  
                </div>
                <div className={'__title_description__ _dsplFlx '}>
                    {_phone}
                </div>
                <div className={'__title_description__ _dsplFlx '}>
                    {_email}
                </div>
                <div className={'__minimun__pay__Wrapper__'}>
                    <div className={'__Label_description__ _dsplFlx'}>
                        {`${_Util.translatetext(35)}: `}
                    </div>
                    <div className={'pym81b bxPyDt'}>
                      <div className={'__minimun__pay__ _dsplFlx spaceAround'}  >
                          <img  class="icon-product lazy-img js-only" alt={_paymentMethod} src={_paymentMethodActive&& _paymentMethodActive['url']}/>
                      </div>  
                      <div className={'__pay_amount__  flexColor _dsplFlx spaceAround' }>
                        {`$${topay && topay.toFixed(2)}`}           
                      </div>  
                    </div>  
                    <div className={'  _dsplFlx spaceAround'}>
                      <div className={'  _dsplFlx _currentprice  box_alert green_alert tCambio'}>
                        <span> {`${_Util.translatetext(25)}: `} </span>
                        <span className={' _cpBtcn'}>{_currentrate?`${_currentrate.delivery}${_currency} X ${_currentrate.pay}USD`:""}</span>
                      </div>  
                    </div>               
                </div>
              </div>
              
                <div className={'_w100  _dsplFlx spaceAround'} >
                  <div className={`paddField`} >
                    <MoreInfoButton title={`${_Util.translatetext(7)}`}  theme={"purple"} icon={'send'} clickEvent={()=>goConfirmation()}/>
                  </div>
                </div>
                </>:null}
                </div>


                <div className={`formContainer`} style={{opacity:view === 2?1:0}}>
                  {view === 2?
                  <> 
                  <div className={'__title_description__ _dsplFlx  spaceAround '}>
                    {`${_Util.translatetext(36)}`}
                  </div>


                <div className={'__minimun__pay__Wrapper__'}>                  
                  <div className={'pym81b bxPyDt'} >
                  
                    <div className={'_title_confirm  flexColor _dsplFlx spaceAround' }>
                      {`${_Util.translatetext(37)}`} 
                    </div> 
                    <div className={'__minimun__pay__ _dsplFlx spaceAround'}  >
                        <img  class="icon-product lazy-img js-only" alt={_paymentMethod} src={_paymentMethodActive&&  _paymentMethodActive['url']}/>
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
              
                <div className={'_w100  _dsplFlx spaceAround'}  >
                  <div className={`paddField`}>
                    <MoreInfoButton title={`${_Util.translatetext(38)}`}  theme={"purple"} icon={'home'} clickEvent={()=>goback()}/>
                  </div>
                </div>
                </>:null}
                </div>
            </div>
          </div> 
      </div> 
    </div>   
     
    </>
  );
}  


export default Details

