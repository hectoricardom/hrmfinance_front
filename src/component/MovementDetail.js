


import React, { useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import loadable from '@loadable/component'

import './_styles.css'

import * as _Util from '../store/Util'
import {  fetchRemesa, fetchCities, fetchSenders, deleteByMovements } from '../actions/common'



const MoreInfoButton = loadable(() => import('./MoreInfoButton'))

const Icon2 = loadable(() => import('./Icons'))



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


  const mov2edit = _state["mov2edit"];

 
  const PaymentMethod =  _Util.getPaymentMethod()


  const _paymentMethod = _form["paymentMethod"] || ""
  const _paymentMethodActive = PaymentMethod[_paymentMethod]

 

let topay = 0;

let hasSenders = mov2edit && mov2edit["sender"];
let hasReceivers = mov2edit && mov2edit["receiver"];
let hasDate = _Util.parseDate(mov2edit && mov2edit["date"]);

let toReceive = mov2edit && mov2edit["amount"] * mov2edit["tasa"] ;




const handleEdit = () => {
  let _2s = {};
  mov2edit && fld2Prs.map(fld=>{
    _2s[fld] = mov2edit[fld];
  }) 
  if(mov2edit && mov2edit["type"]==="Entrega"){
    _Util.updFormStore('add_remesa_agent',_2s);
    _state.route_history.push({pathname:"/remesas"});
  }
  else if(mov2edit && mov2edit["type"]==="BTC"){
    _Util.updFormStore('add_btc_agent',_2s);
    _state.route_history.push({pathname:"/sale_btc"});
  }
  closePop();
}

const handleRemove = (id) => {



  closePop();
  let Qry = {
    auth:{
      authCode:"850217"
    },
    params:{id:mov2edit["id"]},
    query:"deleteByMovements"
  };
  deleteByMovements(Qry);  
}


const handleEditSender = () => {
  let _2s = {};

  let fld2Sender = ['id','name',"phoneNumber","email"];    
  hasSenders && fld2Sender.map(fld=>{
    _2s[fld] = hasSenders[fld];
  })
  _Util.updFormStore('add_sender',_2s);
  _state.route_history.push({pathname:"/senders"});
  closePop();
}


const handleEditReceiver = () => {
  let _2s = {};
  _2s["senderId"] = mov2edit["senderId"];
  let fld2Rcv=  [
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
  hasReceivers && fld2Rcv.map(fld=>{
    if(hasReceivers[fld]){
      _2s[fld] = hasReceivers[fld];
    }
  })
 
  let Qry2 = {
    auth:{
      authCode:"850217"
    },
    query:"getQueryCollectionsAll",
    Collection:"Senders"
  };
  fetchSenders(Qry2,dispatch);
  let Qry = {
    auth:{
      authCode:"850217"
    },
    query:"getCity"
  };
  fetchCities(Qry,dispatch);
  _Util.updFormStore('add_receiver',_2s);
  _state.route_history.push({pathname:"/receivers"});
  closePop();
}



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
        <div className={`paymentView boxCard palette`}>
          <div className={`slideWrp`}>
            <div className={'option__edit_payments'}>
            <div className="__body__">  
            <div className={`formContainer`} style={{opacity:view === 1?1:0}}>
                  {view === 1?
                  <> 
              <div className={'titlePaymentheader  flexColor _dsplFlx spaceAround' }>
                  {`Detalles`}
                  <div className={'_dsplFlx spaceAround' }>
                    <div  className={` icon_action `}  onClick={handleEdit}>
                        <Icon2 name={`outline_edit`} />
                    </div>
                    <div className="SpaceBtw">

                    </div>
                    <div  className={` icon_action `}  onClick={handleRemove}>
                        <Icon2 name={`outline_delete`} />
                    </div>
                  </div>
              </div>
              <div className={'pym81b bxPyDt'}>
                <div className={`_labelBx`}>Recibe</div>
                <div className={'__Label_description__ _dsplFlx'}>
                    {`${_Util.translatetext(32)}: `}  
                </div>
                <div className={'__title_description__ _dsplFlx '}>
                    {hasReceivers && hasReceivers["name"]?hasReceivers["name"]:"BTC"}
                </div>
                {hasReceivers  && hasReceivers["id"]?
                <div className={'_dsplFlx spaceAround' }>
                    <div  className={` icon_action `}  onClick={handleEditReceiver}>
                        <Icon2 name={`outline_edit`} />
                    </div>
                </div>:null}
                <div className={'__Label_description__ _dsplFlx'}>
                    {`${_Util.translatetext(33)}: `}  
                </div>
                <div className={'__title_description__ _dsplFlx '}>
                  {hasReceivers && hasReceivers["phoneNumber"]}
                </div>

                <div className={'pym81b bxPyDt'}>
                {hasReceivers && hasReceivers["cid"]?
                    <div className={'__cI__ _dsplFlx '} >
                      {`CI: ${hasReceivers["cid"]}`}                    
                    </div> 
                  :null}
                  {mov2edit && mov2edit["type"]==="Entrega"?
                    <div className={'_address_  flexColor _dsplFlx spaceAround' }>
                        {hasReceivers && hasReceivers["address"]}    
                    </div>
                  :null}
                  <div className={'__pay_amount__  flexColor _dsplFlx spaceAround'} >
                    {`${toReceive && toReceive.toFixed(2)}  ${"MN"}`}
                  </div>   
                </div>                  
              </div>
              <div className={'pym81b bxPyDt'}>
                <div className={`_labelBx`}>Envia</div>
                <div className={'__Label_description__ _dsplFlx'}>
                    {`${_Util.translatetext(21)}: `}  
                </div>
                {hasSenders  && hasSenders["id"]?
                <div className={'_dsplFlx spaceAround' }>
                    <div  className={`icon_action  `}  onClick={handleEditSender}>
                        <Icon2 name={`outline_edit`} />
                    </div>
                </div>:null}
                <div className={'__title_description__ _dsplFlx '}>
                  {hasSenders && hasSenders["name"]}
                </div>

                <div className={'__Label_description__ _dsplFlx'}>
                    {`${_Util.translatetext(33)}: `}  
                </div>
                <div className={'__title_description__ _dsplFlx '}>
                  {hasSenders && hasSenders["phoneNumber"]}
                </div>
                <div className={'__title_description__ _dsplFlx '}>
                  {hasSenders && hasSenders["email"]}
                </div>

                <div className={'__Label_description__ _dsplFlx'}>
                    {`Fecha: `}  
                </div>
                <div className={'__title_description__ _dsplFlx '}>
                  {hasDate && hasDate}
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




/*


<div className={'_w100  _dsplFlx spaceAround'} >
                  <div className={`paddField`} >
                    <MoreInfoButton title={`${_Util.translatetext(7)}`}  theme={"purple"} icon={'send'} clickEvent={()=>{}}/>
                  </div>
                </div>

 <div className={'  _dsplFlx spaceAround'}>
                      <div className={'  _dsplFlx _currentprice  box_alert green_alert tCambio'}>
                        <span> {`${_Util.translatetext(25)}: `} </span>
                        <span className={' _cpBtcn'}>{_currentrate?`${_currentrate.delivery}${_currency} X ${_currentrate.pay}USD`:""}</span>
                      </div>  
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
                   

                </div>

*/