import React, { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import * as _Util from '../store/Util'
// import Icons from './Icons';
import Icons from './Icons'


const useObserveChanges = () => {
  const observeChanges =  useSelector(state => state.observeChanges);
  const observeForms =  useSelector(state => state.observeForms); 
  const navigations =  useSelector(state => state.navigations);  

  const dispatch = useDispatch()
  
  const updForms= (form,field,v) => {
    let _form = _Util.getFormStore(form) || {};
    _form[field] = v;
    _Util.updFormStore(form,_form);
    dispatch({
      type: 'UPD_KEY_VALUE',
      kv:{key:'observeForms',value:_Util.gen12CodeId()}
    })   
  }




  return { observeChanges,  updForms, navigations }
}









const InputText = (props) => {
  const { forms, observeChanges,  updForms } = useObserveChanges();
 
  const _state = _Util.getStore();
  let keys = _Util.getGlobalsKeys()
  const _className = _state["maskClassName"]

  
  let _classComponent = textInputClass(_className); 
  
  const {placeholder , index, keyCode, field, form, background, color} = props ;


  const [textValue, setTextValue] = useState('');
  const [focus, setFocus] = useState(false);
  const [initialize, setInitialize] = useState(false);
  const [valid, setValid] = useState({v:true});
  const [init, setInit] = useState(null);
  let _keyCode = keyCode?keyCode:_Util.genNumber();
  const inputId = keys && keys[_keyCode]?keys[_keyCode]:_Util.gen12CodeId();
  
  let placeholderText = placeholder?placeholder:'label'

  const [passwordShow, setPasswordShow] = useState(false);
  let _form = _Util.getFormStore(form) || {};
  var initValue = props.initvalue?props.initvalue :_form && _form[field]?_form[field]:null;





  const handleChange = (e) => {
    let _v = e.target.value?e.target.value:'';
    setTimeout(()=>{
        validateField(_v);
    },20);    
    return
  }
  
  const handleFocus = () => {
    setFocus(true);
  }
  
  const handleKeyUp = (e) => {
    if(typeof props.submitKeyEnter  === "function" &&  e.keyCode===13){
      props.submitKeyEnter();
    }
  }
  
  const handleBlur = () => {
    const { form , field } = props; 
    updForms(form,field,textValue);
    setFocus(false);
  }
  

  
  const updateInput = (v) => {
    let InputCmp = document.getElementById(`${inputId}_input`);
    if(InputCmp){
      InputCmp.value = v;
    }
  }
  
  
  
  const validateField = (v ) => {
  
    const { validations,  placeholder } = props; 
    var valid = {v:true,m:''};  
    if(validations){
      if(v){   
        if(validations['minLength']){
          if(v.toString().length<validations['minLength']){
            valid={v:false,m:`Minimum ${validations['minLength']} characters required`};
          }        
        } 
        if(validations['maxLength']){
          if(v.toString().length>validations['maxLength']){
            valid={v:false,m:`Maximum characters are ${validations['maxLength']}`};
          }       
        } 
        if(validations['email']){
          let isEmail = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(v)
          if(!isEmail){
            valid={v:false,m:'email not valid'};
          }
        }
        if(validations['ssn']){  
          let isSSN = /^[\dX]{3}-?[\dX]{2}-?[\dX]{4}$/.test(v)
          if(!isSSN){
            valid={v:false,m:'ssn not valid'};
          }
        }
        if(validations['phone']){
          if(!isNaN(v)){ 
            v = parseInt(v.toString());
            let isPhone = /^[\dX]{3}-?[\dX]{3}-?[\dX]{4}$/.test(v)
            if(!isPhone){
              valid={v:false,m:'phone not valid'};
            }
          }else{
            valid={v:false,m:'phone not valid'}
          }
        }
        if(validations['cubaphone']){
          if(!isNaN(v)){ 
            v = parseInt(v.toString());
            let isPhone = /^(?:535[0-9]{7})$/.test(v)
            if(!isPhone){
              valid={v:false,m:'Invalid cuban phone format'};
            }
          }else{
            valid={v:false,m:'phone not valid'}
          }
        }
        if(validations['date']){
          let isDOB = /^(\d{2})(\/)(\d{2})(\/)(\d{4})$/.test(v)
          if(!isDOB){
            valid={v:false,m:'date not valid'};
          }
        }
        if(validations['ip']){
          let isDOB = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(v)
          if(!isDOB){
            valid={v:false,m:'invalid IP address'};
          }
        }
        if(validations['number']){      
          if(!isNaN(v)){
            v = parseFloat(v.toString());
            if(validations['minValue']){
              if(v<validations['minValue']){
                  valid={v:false,m:`value must be at least ${validations['minValue']}`};
              }        
            }
            if(validations['maxValue']){
                if(v>validations['maxValue']){
                  valid={v:false,m:'value greater than maximum allowed'}
                }        
            }
          }  
          else{
            valid={v:false,m:'number not valid'};
          }
        } 
        if(validations['uppercase']){
          v = v.toString().toUpperCase();
        }
        if(validations['lowercase']){  
          v = v.toString().toLowerCase();
          //valid={v:false,m:'number not valid'};
        }
        if(validations['card']){ 
          let isCard = visaRegEx.test(v)
          if(!isCard){
            valid={v:false,m:'card not valid'};
          }
          //valid={v:false,m:'number not valid'};
        }
      }else{  
        if(validations['required']){
          valid={v:false,m:`${placeholder} required`};
        }
      }
    }
  
  
    updateInput(v)
    setTextValue(v)
    setValid(valid); 
    if (typeof props.OnChange === 'function') { 
      props.OnChange(v);       
    } 
  }




  useEffect((e) => {
     
   
    
    if(!initialize){ 
      if(props.initvalue){
        setTimeout(()=>{
          let txt = initValue?initValue:'';
          validateField(txt );
          setInitialize(true);
        },75)
      }else{
        setInitialize(true);
      }
    }

    if(!focus){
      if(initValue!==init ){
        setInit(initValue);
        if(!initValue){
          let txt = initValue?initValue:'';
          setTimeout(()=>{
            validateField(txt);
          },80);
        }else if(!init){
          let txt = initValue?initValue:'';
          setTimeout(()=>{
            validateField(txt);
          },80);
        }
      }
    }
  });

  

  let isNonEmpty=false;
  
  var Text2Show =   initValue?initValue:textValue?textValue:"";

 
  if(Text2Show.toString().length>0){
    isNonEmpty=true; 
  } 

  let isInValid = false;
  if(!valid.v){
    isInValid = true;
    valid.m?placeholderText = valid.m:placeholderText = placeholderText+' required' ;
  }

  let labelActive = `._${inputId}_.${_className.N3Hzgf} .${_className.AxOyFc}.labelActive{ -webkit-transform: scale(.75) translateY(-39px); transform: scale(.75) translateY(-39px);} `;
  var labelStyle = {
    color:isInValid?'firebrick':focus?color?color:"#1a38e8":'#80868b'
  } 

  let validColor = color?color:"#1a38e8"
  var boxStyle = {
    border:isInValid?'2px solid firebrick':focus?"2px solid "+validColor:'1px solid #dadce0'   
  }


  
  let  IsLabelActive = focus?true:isNonEmpty?true:isInValid?true:false;
  var inpuType = 'text';
  if(props['validations']){
    if(props['validations']['number']){
      inpuType = 'number';
    }
    if(props['validations']['email']){
        inpuType = 'email';
    }  
    if(props['validations']['password']){
      if(!passwordShow){
        inpuType = 'password';
      }
    } 
  }
  // focus

  let dynamicVALUE = !focus?{"value":Text2Show}:{};
  if(background){
    labelStyle["background"] = background;
  }

  return (
    <>     
    <div id={`${inputId}`} className={`_${inputId}_ ${_className.N3Hzgf} ${_className.rFrNMe} ${_className.jjwyfe} ${focus?_className.u3bW4e:''} ${isNonEmpty?_className.CDELXb:''} ${isInValid?_className.INVALID:''} _input`}> 
      <div className={`${_className.aCsJod} ${_className.oJeWuf}`} >
        <div className={`${_className.aXBtI} ${_className.Wic03c}`} style={boxStyle}>
          <div className={`${_className.Xb9hP}`}>
            <input 
              type={inpuType} 
              className={`${_className.whsOnd} ${_className.zHQkBf}`} 
              autoComplete="false" 
              // spellcheck="false" 
              id={`${inputId}_input`}
              tabIndex={index}
              // ariaLabel="Correo electrónico o teléfono" 
              // name="identifier" 
              // autocapitalize="none" 
              // id="identifierId" 
              dir="ltr" 
              // data-initial-dir="ltr" 
              // data-initial-value=""
              //value={textValue} 
             
              {...dynamicVALUE}
              onChange={(e)=>handleChange(e)} 
              onFocus={(e)=>handleFocus()}        
              onKeyUp={(e)=>handleKeyUp(e)} 
              onBlur={(e)=>handleBlur()}    
            />
            {IsLabelActive && <style>
              {labelActive}
            </style>}
            <div className={`${_className.AxOyFc} ${_className.snByac} labelActive`} style={labelStyle}>{placeholderText}</div>
            {props['validations'] && props['validations']['password'] &&  
            <div className={`visibility_passW`}  onClick={()=>setPasswordShow(!passwordShow)}>
              <Icons name={!passwordShow?'visibility_on_outline':'visibility_off_outline'} />
            </div>  }
          </div>
          {false &&  <div className={`${_className.i9lrp} ${_className.mIZh1c}`}></div> }
          {false &&   <div className={`${_className.OabDMe} ${_className.cXrdqd} ${_className.Y2Zypf}`}style={{"transform-origin":"146.5px center"}}> </div> }
        </div>
      </div>

      <style>
        {_classComponent}
      </style> 
     
    </div>
    </> 
  )
}






export default InputText






const textInputClass = (_className) => {
  return `

    .visibility_passW{
      padding-top: 12px;
      color: rgb(128, 134, 139);
    }

    .${_className.N3Hzgf} .${_className.oJeWuf} {
        height: 56px;
        padding-top: 0;
    }

    .${_className.rFrNMe}.sdJrJc>.${_className.aCsJod} {
        padding-top: 24px;
    }

    .${_className.aCsJod} {
      height: 40px;
      position: relative;
      vertical-align: top;
    }

    .${_className.N3Hzgf} .${_className.Wic03c} {
    -webkit-align-items: center;
    align-items: center;
    position: static;
    top: 0;
    border-radius:4px;
    border: 1px solid #e1e1e1;
    }

    .${_className.aXBtI} {
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    position: relative;
    top: 14px;
    }


    .${_className.whsOnd} {
    -webkit-box-flex: 1;
    box-flex: 1;
    -webkit-flex-grow: 1;
    flex-grow: 1;
    -webkit-flex-shrink: 1;
    flex-shrink: 1;
    background-color: transparent;
    border: none;
    display: block;
    font: 400 16px Roboto,RobotoDraft,Helvetica,Arial,sans-serif;
    height: 24px;
    min-height: 24px;
    line-height: 24px;
    margin: 0;
    min-width: 0%;
    outline: none;
    padding: 0;
    z-index: 0;
    }


    .${_className.AxOyFc} {
    -webkit-transform-origin: bottom left;
    transform-origin: bottom left;
    -webkit-transition: all .3s cubic-bezier(0.4,0,0.2,1);
    transition: all .3s cubic-bezier(0.4,0,0.2,1);
    -webkit-transition-property: color,bottom,transform;
    transition-property: color,bottom,transform;
    color: rgba(0,0,0,0.38);
    font: 400 16px Roboto,RobotoDraft,Helvetica,Arial,sans-serif;
    font-size: 16px;
    pointer-events: none;
    position: absolute;
    bottom: 3px;
    left: 0;
    width: 100%;
    }


    .${_className.Xb9hP} {
        display: -webkit-box;
        display: -webkit-flex;
        display: flex;
        -webkit-box-flex: 1;
        box-flex: 1;
        -webkit-flex-grow: 1;
        flex-grow: 1;
        -webkit-flex-shrink: 1;
        flex-shrink: 1;
        min-width: 0%;
        position: relative;
    }

    .${_className.Xb9hP}::after,
    .${_className.Xb9hP}::before {
      color: #202124;
    }
      


    .${_className.N3Hzgf} .${_className.zHQkBf} {
    -webkit-border-radius: 4px;
    border-radius: 4px;
    color: #202124;
    font-size: 16px;
    height: 28px;
    min-height: 28px;
    margin: 1px 1px 0 1px;
    padding: 13px 15px;
    z-index: 1;
    }

    .${_className.jjwyfe} .${_className.zHQkBf}, .${_className.jjwyfe} .MQL3Ob {
    direction: ltr;
    text-align: left;
    }
    .${_className.N3Hzgf} .${_className.AxOyFc} {
    font-family: roboto,arial,sans-serif;
    }

    .${_className.N3Hzgf} .${_className.AxOyFc} {
    background: #fff;
    bottom: 17px;
    -webkit-box-sizing: border-box;
    box-sizing: border-box;
    color: #80868b;
    font-size: 16px;
    font-weight: 400;
    left: 8px;
    max-width: -webkit-calc(100% - (2*8px));
    max-width: calc(100% - (2*8px));
    overflow: hidden;
    padding: 0 8px;
    text-overflow: ellipsis;
    -webkit-transition: transform 150ms cubic-bezier(0.4,0,0.2,1),opacity 150ms cubic-bezier(0.4,0,0.2,1);
    transition: transform 150ms cubic-bezier(0.4,0,0.2,1),opacity 150ms cubic-bezier(0.4,0,0.2,1);
    white-space: nowrap;
    width: auto;
    z-index: 1;
    }



    .${_className.N3Hzgf}.${_className.u3bW4e} .${_className.whsOnd}:not([disabled]):focus~.${_className.AxOyFc}{
      color: #1a38e8;
    }


    .${_className.N3Hzgf}.${_className.u3bW4e} .${_className.Wic03c}{
      border: 2px solid #1a38e8;
    }
   
    .${_className.N3Hzgf}.${_className.INVALID} .${_className.Wic03c}{
      border: 2px solid firebrick;
    }
   
   

    .${_className.N3Hzgf} .${_className.mIZh1c}, .${_className.N3Hzgf}.${_className.k0tWj} .${_className.mIZh1c} {
        height: 100%;
    }

    .${_className.N3Hzgf} .${_className.mIZh1c}, 
    .${_className.N3Hzgf} .${_className.cXrdqd}
    {
    background-color: transparent;
    }

    .${_className.N3Hzgf} .${_className.mIZh1c} {
    border: 1px solid #dadce0;
    -webkit-border-radius: 4px;
    border-radius: 4px;
    bottom: 0;
    -webkit-box-sizing: border-box;
    box-sizing: border-box;
    }



    .${_className.N3Hzgf}.${_className.u3bW4e} .${_className.cXrdqd} {
      border: 2px solid #1a73e8;
    }
   
  .${_className.N3Hzgf}.${_className.u3bW4e} .${_className.cXrdqd}, .N3Hzgf.IYewr .${_className.cXrdqd} {
    -webkit-animation: none;
    animation: none;
    opacity: 1;
  }



`;
}


  /*
 
  .${_className.rFrNMe}.${_className.u3bW4e} .${_className.OabDMe} {
      -webkit-animation: quantumWizPaperInputAddUnderline .3s cubic-bezier(0.4,0,0.2,1);
      animation: quantumWizPaperInputAddUnderline .3s cubic-bezier(0.4,0,0.2,1);
      -webkit-transform: scaleX(1);
      transform: scaleX(1);
  }
  .${_className.N3Hzgf} .${_className.cXrdqd}, .${_className.N3Hzgf}.IYewr.${_className.u3bW4e} .${_className.cXrdqd} {
      height: -webkit-calc(100% - 2*2px);
      height: calc(100% - 2*2px);
      width: -webkit-calc(100% - 2*2px);
      width: calc(100% - 2*2px);
  }
*/

/*

${false?`
.${_className.i9lrp} {
background-color: rgba(0,0,0,0.12);
bottom: -2px;
height: 1px;
left: 0;
margin: 0;
padding: 0;
position: absolute;
width: 100%;
}

.${_className.i9lrp}:before {
content: "";
position: absolute;
top: 0;
bottom: -2px;
left: 0;
right: 0;
border-bottom: 1px solid rgba(0,0,0,0);
pointer-events: none;
}
`:``
}
    .${_className.whsOnd}:not([disabled]):focus~.${_className.AxOyFc},
    .${_className.whsOnd}[badinput="true"]~.${_className.AxOyFc},
    .${_className.rFrNMe}.${_className.CDELXb} .${_className.AxOyFc},
    .${_className.rFrNMe}.dLgj8b .${_className.AxOyFc}
    .${_className.N3Hzgf}.${_className.INVALID} .${_className.AxOyFc} {
      -webkit-transform: scale(.75) translateY(-39px);
      transform: scale(.75) translateY(-39px);
    }
*/


var visaRegEx = /^(?:9[0-9]{15})$/;
var cubaPhoneRegEx = /^(?:535[0-9]{7})$/;
/*
var mastercardRegEx = /^(?:5[1-5][0-9]{14})$/;
var amexpRegEx = /^(?:3[47][0-9]{13})$/;
var discovRegEx = /^(?:6(?:011|5[0-9][0-9])[0-9]{12})$/; 
*/