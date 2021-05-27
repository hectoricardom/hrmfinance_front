
import React , {useRef, useEffect, useState} from 'react'

import * as _Util from '../store/Util'
import './_styles.css'
const Icon2 = _Util.Icon_Cmpt();



let paymentToken = null


const GooglePayCheckOut = (props) => {
 
  const {
    prod2Show
  } = props;

  const [paypalLoaded, setPaypalLoaded] = useState(false);
  const [paidFor, setPaidFor] = useState(false);
  const [error, setError] = useState(null);
  const paypalRef = useRef();

  const [initialize, setInitialize] = useState(false);
  const [loaded, setLoaded] = useState(false);


  const [obs, setObs] = useState(0);
  

  
  useEffect(() => {
    if(!initialize){
      setInitialize(true);
      if(window.google.payments){
        onGooglePayLoaded();
      }
      else{
        const script = document.createElement('script');
        script.src = "https://pay.google.com/gp/p/js/pay.js";
        script.addEventListener("load",()=>{
          setLoaded(1);
          setTimeout(()=>{
            onGooglePayLoaded();
          },450)
        });
        document.body.appendChild(script);
      }


    }
  })




  const baseRequest = {
    apiVersion: 2,
    apiVersionMinor: 0
  };
  

  const allowedCardNetworks = ["AMEX", "DISCOVER", "INTERAC", "JCB", "MASTERCARD", "VISA"];
  

  const allowedCardAuthMethods = ["PAN_ONLY", "CRYPTOGRAM_3DS"];
  
  const tokenizationSpecification = {
    type: 'PAYMENT_GATEWAY',
    parameters: {
      'gateway': 'example',
      'gatewayMerchantId': 'exampleGatewayMerchantId'
    }
  };


  const baseCardPaymentMethod = {
    type: 'CARD',
    parameters: {
      allowedAuthMethods: allowedCardAuthMethods,
      allowedCardNetworks: allowedCardNetworks
    }
  };
  
 
  const cardPaymentMethod = Object.assign(
    {},
    baseCardPaymentMethod,
    {
      tokenizationSpecification: tokenizationSpecification
    }
  );
  

  let paymentsClient = null;
  
 
  function getGoogleIsReadyToPayRequest() {
    return Object.assign(
        {},
        baseRequest,
        {
          allowedPaymentMethods: [baseCardPaymentMethod]
        }
    );
  }

  
  function getGooglePaymentDataRequest() {
    const paymentDataRequest = Object.assign({}, baseRequest);
    paymentDataRequest.allowedPaymentMethods = [cardPaymentMethod];
    paymentDataRequest.transactionInfo = getGoogleTransactionInfo();
    paymentDataRequest.merchantInfo = {
      // @todo a merchant ID is available for a production environment after approval by Google
      // See {@link https://developers.google.com/pay/api/web/guides/test-and-deploy/integration-checklist|Integration checklist}
      // merchantId: '01234567890123456789',
      merchantName: 'Example Merchant'
    };
    return paymentDataRequest;
  }
 


  function getGooglePaymentsClient() {
    if ( paymentsClient === null && window.google.payments ) {
      paymentsClient = new window.google.payments.api.PaymentsClient({environment: 'TEST'});
    }
    return paymentsClient;

  }
  
  /**
   * Initialize Google PaymentsClient after Google-hosted JavaScript has loaded
   *
   * Display a Google Pay payment button after confirmation of the viewer's
   * ability to pay.
   */
  function onGooglePayLoaded() {
    const paymentsClient = getGooglePaymentsClient();
    paymentsClient && paymentsClient.isReadyToPay(getGoogleIsReadyToPayRequest())
        .then(function(response) {
          if (response.result) {
            addGooglePayButton();
            // @todo prefetch payment data to improve performance after confirming site functionality
            // prefetchGooglePaymentData();
          }
        })
        .catch(function(err) {
          // show error in developer console for debugging
          console.error(err);
        });
  }
  

  function addGooglePayButton() {
    const paymentsClient = getGooglePaymentsClient();
    const button =
        paymentsClient && paymentsClient.createButton({
          onClick: onGooglePaymentButtonClicked,
          buttonSizeMode: 'fill',
        });
    document.getElementById('googlePayButton').appendChild(button);
  }
  
 
  function getGoogleTransactionInfo() {
    return {
      countryCode: 'US',
      currencyCode: 'USD',
      totalPriceStatus: 'FINAL',
      // set to cart total
      totalPrice: '1.00'
    };
  }
  

  function prefetchGooglePaymentData() {
    const paymentDataRequest = getGooglePaymentDataRequest();
    // transactionInfo must be set but does not affect cache
    paymentDataRequest.transactionInfo = {
      totalPriceStatus: 'NOT_CURRENTLY_KNOWN',
      currencyCode: 'USD'
    };
    const paymentsClient = getGooglePaymentsClient();
    paymentsClient && paymentsClient.prefetchPaymentData(paymentDataRequest);
  }
  
 
  function onGooglePaymentButtonClicked() {
    const paymentDataRequest = getGooglePaymentDataRequest();
    paymentDataRequest.transactionInfo = getGoogleTransactionInfo();
  
    const paymentsClient = getGooglePaymentsClient();
    paymentsClient && paymentsClient.loadPaymentData(paymentDataRequest)
        .then(function(paymentData) {
          // handle the response
          processPayment(paymentData);
        })
        .catch(function(err) {
          // show error in developer console for debugging
          console.error(err);
        });
  }
  
  /**
   * Process payment data returned by the Google Pay API
   *
   * @param {object} paymentData response from Google Pay API after user approves payment
   * @see {@link https://developers.google.com/pay/api/web/reference/response-objects#PaymentData|PaymentData object reference}
   */
  function processPayment(paymentData) {
    // show returned data in developer console for debugging
      console.log(paymentData);
    // @todo pass payment token to your gateway to process payment
    paymentToken = paymentData.paymentMethodData.tokenizationData.token;
  }

  return (
    <div id="googlePayButton"/>
  )

}


export default  GooglePayCheckOut;