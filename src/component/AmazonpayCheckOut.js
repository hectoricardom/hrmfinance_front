
import React , {useRef, useEffect, useState} from 'react'

import * as _Util from '../store/Util'
import './_styles.css'
const Icon2 = _Util.Icon_Cmpt();





const AmazonpayCheckOut = (props) => {
 
  const {
    prod2Show
  } = props;

  const [paypalLoaded, setPaypalLoaded] = useState(false);
  const [paidFor, setPaidFor] = useState(false);
  const [error, setError] = useState(null);
  const paypalRef = useRef();

  const [initialize, setInitialize] = useState(false);
  const [amzPayLoaded, setAmzPayLoaded] = useState(false);


  const [obs, setObs] = useState(0);
  

  
  useEffect(() => {
    if(!initialize){
      setInitialize(true);
      if(window.OffAmazonPayments){
        AmazonPay();
      }
      else{
        const scriptAmzPay = document.createElement('script');
        scriptAmzPay.src = "https://static-na.payments-amazon.com/OffAmazonPayments/us/sandbox/js/Widgets.js";
        scriptAmzPay.addEventListener("load",()=>{
          setAmzPayLoaded(1);
          setTimeout(()=>{
            window.amazon.Login.setClientId('amzn1.application-oa2-client.11e6fe58f59a487195d03cd5de80e7f8');
            AmazonPay();
          },1450)
        });
        document.body.appendChild(scriptAmzPay);
      }


    }
  })





  const AmazonPay = () => {
    let authRequest = null;
    window.OffAmazonPayments.Button("AmazonPayButton", "A1YITQBU9YGSQC", { 
      color: "Gold",
  
      authorization: function() { 
      let loginOptions = {
        scope: ["payments:widget","payments:shipping_address"], 
        popup: true,
        currency:"USD",
        language:"en-US"
      };
      authRequest = window.amazon.Login.authorize (loginOptions, 
        "https://qvamarkets.com"); 
      }, 
  
      onError: function(error) { 
        // your error handling code.
        // alert("The following error occurred: " 
        //        + error.getErrorCode() 
        //        + ' - ' + error.getErrorMessage());
      } 
    });
  }

  return (
    <div id="AmazonPayButton"/>
  )

}


export default  AmazonpayCheckOut;









/*

<script async src="https://static-na.payments-amazon.com/OffAmazonPayments/us/js/Widgets.js"></script>
<div
    data-ap-widget-type="expressPaymentButton"
    data-ap-signature="WlaDHQoXE4I3FudJCySNZ7KsSSB%2F7ctibZQIfc4Chy0%3D"
    data-ap-seller-id="A1YITQBU9YGSQC"
    data-ap-access-key="AKIAIGC4ELLB5TPJ5TBQ"
    data-ap-lwa-client-id="amzn1.application-oa2-client.11e6fe58f59a487195d03cd5de80e7f8"
    data-ap-return-url="https://qvamarkets.com"

        data-ap-cancel-return-url="https://qvamarkets.com"

    data-ap-currency-code="USD"
    data-ap-amount="2"
    data-ap-note=""
    data-ap-shipping-address-required="false"
    data-ap-payment-action="AuthorizeAndCapture"
>
</div>



*/