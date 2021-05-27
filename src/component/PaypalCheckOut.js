
import React , {useRef, useEffect, useState} from 'react'

import * as _Util from '../store/Util'
import './_styles.css'
const Icon2 = _Util.Icon_Cmpt();





const Paypal = (props) => {
 
  const {
    prod2Show
  } = props;

  const [paypalLoaded, setPaypalLoaded] = useState(false);
  const [paidFor, setPaidFor] = useState(false);
  const [error, setError] = useState(null);
  const paypalRef = useRef();

  const [initialize, setInitialize] = useState(false);


  const [obs, setObs] = useState(0);
  

  
  useEffect(() => {



    let al = document.querySelectorAll('.paypal-buttons-context-iframe');    
    if(al.length<1){
      paypalFunc();
    }
    if(!initialize){
      if(window.paypal){
        setPaypalLoaded(1);
        //paypalFunc();
      }
      else{
        setInitialize(true);
        const script2 = document.createElement('script');
        script2.src = "https://www.paypal.com/sdk/js?client-id=AeYboJPR4z69eByjA_3M7dTzb_3pgxf3nlBd7zsFDgB-9lyv3aSWasNwfnHyR5wtelQiU6ePuTdnTmMa";
        script2.addEventListener("load",()=>{
          setPaypalLoaded(1);
          setTimeout(()=>{ paypalFunc();},1450)
        });
        document.body.appendChild(script2);
      }
    }
  })



  const paypalFunc = () => {
  
    let units = []
    prod2Show && _Util.ObjectKeys(prod2Show).map(fV=>{
      let uu = {}
      uu["description"] = prod2Show[fV]['product'] && prod2Show[fV]['product']['name']?prod2Show[fV]['product']['name']:""
      uu["amount"] = {}
      uu["amount"]["currency_code"] ='USD';
      uu["amount"]["value"] =prod2Show[fV]['sale_price'];
      units.push(uu);
    })
    paypalLoaded &&  window.paypal  && window.paypal
      .Buttons({
        createOrder: (data, actions) => {
          return actions.order.create({
            purchase_units: units,
          });
        },
        onApprove: async (data, actions) => {
          const order = await actions.order.capture();
          setPaidFor(true);
        },
        onError: err => {
          setError(err);
        },
      })
      .render(paypalRef.current);
      setObs();
  }


  return (
      <div ref={paypalRef}/>
  )

}


export default  Paypal;