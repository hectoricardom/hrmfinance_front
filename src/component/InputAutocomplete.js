import React, { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import * as _Util from '../store/Util'
// import Icons from './Icons'


const useObserveChanges = () => {
  const observeChanges =  useSelector(state => state.observeChanges);
  const forms =  useSelector(state => state.forms);  
  const keys =  useSelector(state => state.keysId);  
  const navigations =  useSelector(state => state.navigations);  
  const maskClassName=  useSelector(state => state.maskClassName);   
  const dispatch = useDispatch()
  const close = (Id) => {
    //CloseModal(dispatch,{id:Id});
  }
  const updForms= (form,field,v) => {
    let _forms = forms;
    if(!_forms[form]){
      _forms[form] = {};
    }
    _forms[form][field] = v;    
    dispatch({
      type: 'UPD_KEY_VALUE',
      kv:{key:'forms',value:_forms}
    })   
  }




  return { observeChanges, close, maskClassName, forms, updForms, navigations, keys }
}












const InputAutocomplete = (props) => {
  // const { count, increment, decrement, reset } = useCounter();


  const { forms, navigations, observeChanges,  updForms} = useObserveChanges();
  
  const {placeholder , index, data , field, form, wdt, keyCode, color, background} = props;
  
  var _state = _Util.getStore();
  let keys = _Util.getGlobalsKeys()
  const _className = _state["maskClassName"]
  _state["keys"] = keys;  

  let _keyCode = keyCode?keyCode:_Util.genNumber();
  const inputId = keys && keys[_keyCode]?keys[_keyCode]:_Util.gen12CodeId();
  
  
  let _classComponent = textInputClass(_className,inputId); 
  
 
  let _list = data?_Util.ObjectKeys(data):[];

  const [textValue, setTextValue] = useState('');
  const [focus, setFocus] = useState(false);
  const [initialize, setInitialize] = useState(false);
  const [valid, setValid] = useState({v:true});
  const [init, setInit] = useState(false);

  
  let placeholderText = placeholder?placeholder:'label'

  

  useEffect((e) => {
    
    let initValue = props.initvalue;
   
    if(!initialize){ 
      if(props.initvalue){
        updateInput(props.initvalue) 
      }
      setInitialize(true);
    }

    
    if(initValue!==init ){
      setInit(initValue);
      if(!initValue){
        setTimeout(()=>{
          validateItems({})          
        },80);
      }else if(!init){
        let txt = initValue?data[initValue]:{};
        setTimeout(()=>{
          validateItems(txt)    
        },80);
      }
    }
    function handleStatusChange(status) {
      
    }
    
    //ChatAPI.subscribeToFriendStatus(props.friend.id, handleStatusChange);
    // Specify how to clean up after this effect:
    return function cleanup() {
      // 
    };
    
    
  });

  



  let isNonEmpty=false;
  
  var isText = textValue?textValue.toString().length:0;
  if(isText>0){
    isNonEmpty=true; 
  } 

  let isInValid = false;
  if(!valid.v){
    isInValid = true;
    valid.m?placeholderText = valid.m:placeholderText = placeholderText+' required' ;
  }
  let validColor = color?color:"#1a38e8"

  
  let labelActive = `._${inputId}_.${_className.N3Hzgf}_${inputId} .${_className.AxOyFc}_${inputId}.labelActive{ -webkit-transform: scale(.75) translateY(-39px); transform: scale(.75) translateY(-39px);} `;
  var labelStyle = {
    color:isInValid?'firebrick':focus?validColor:'#80868b'   
  }
 


  var boxStyle = {
    border:isInValid?'2px solid firebrick':focus?"2px solid "+validColor:'1px solid #dadce0',   
    //background:'#fff'  
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
      inpuType = 'password';
    } 
  }

  const clearText = () => {
    validateItems("")     
    if (typeof props.OnChange === 'function') { 
      props.OnChange("");       
    }      
  }
 
  if(background){
    labelStyle["background"] = background;
  }


  let isData = _list.length>0;
















  const handleChange = (e) => {
    let _v = e.target.value?e.target.value:'';
    if (typeof props.OnChange === 'function') { 
      props.OnChange(_v);       
    }
  }
  
  const handleFocus = (e,setFocus ) => {
  
    setFocus(true);
  }
  
  const handleKeyUp = () => {
    
  }
  
  const handleBlur = (e) => {   
    setTimeout(()=>{
      setFocus(false);
    },50)
  }
  
  
  
  const HandlerOnMouseLeave = (e) => {}
  
  
  
  
  const handleSetItems = (ss) => {  
    setFocus(false);
    updateInput(ss.name);
    validateField(ss.id );
    if (typeof props.OnSelect === 'function') { 
      props.OnSelect(ss);       
    } 
  }
  
  
  const validateItems = (ss) => {  
    setFocus(false);
    updateInput(ss && ss.name?ss.name:"");
    validateField(ss && ss.id );
  }
  
  
  
  const updateInput = (v) => {
    let InputCmp = document.getElementById(inputId);
    if(InputCmp){
      InputCmp.value = v
    }
    InputCmp && setTextValue(v);
  }
  
  
  
  const validateField = (v ) => {
    const { form , validations,  placeholder, field } = props; 
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
            v = parseFloat(v.toString());
            let isPhone = /^[\dX]{3}-?[\dX]{3}-?[\dX]{4}$/.test(v)
            if(!isPhone){
              valid={v:false,m:'phone not valid'};
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
  
      }else{  
        if(validations['required']){
          valid={v:false,m:`${placeholder} required`};
        }
      }
    }  
  
    // setTextValue(v)
    //UpdateForm(form,field,v);
    setValid(valid); 
    
  }




  return (
    <>     
    <style>
        {_classComponent}
    </style> 
    <div style={{width: wdt+"px"}} className={`_${inputId}_ ${_className.N3Hzgf}_${inputId} ${_className.rFrNMe}_${inputId} ${_className.jjwyfe}_${inputId} ${focus?`${_className.u3bW4e}_${inputId}` : ''}   ${isData && focus ?'RT1Mb576wSi5':''} ${isNonEmpty?`${_className.CDELXb}_${inputId}`:''} ${isInValid?`${_className.INVALID}_${inputId}`:''} _input`}> 
      <div className={`${_className.aCsJod}_${inputId} ${_className.oJeWuf}_${inputId}`}>
        <div className={`${_className.Wic03c}_${inputId}`} style={boxStyle}>
          <div className={`${_className.Xb9hP}_${inputId}`}>
            <input 
              type={inpuType} 
              className={`${_className.whsOnd}_${inputId} ${_className.zHQkBf}_${inputId}`} 
              id={`${inputId}`} 
              // spellcheck="false" 
              tabIndex={index}
              // ariaLabel="Correo electrónico o teléfono" 
              // name="identifier" 
              // autocapitalize="none" 
              // id="identifierId" 
              dir="ltr" 
              // data-initial-dir="ltr" 
              // data-initial-value=""
              //value={textValue}  
              autoComplete="off"
              onChange={(e)=>handleChange(e)} 
              onFocus={(e)=>handleFocus(e,setFocus)}        
              onKeyUp={(e)=>handleKeyUp(e)} 
              // onBlur={(e)=>handleBlur(e,setFocus,inputId)}    
            />
            {IsLabelActive && <style>
              {labelActive}
            </style>}
            <div className={`${_className.AxOyFc}_${inputId} ${_className.snByac}_${inputId} labelActive`} aria-hidden="true" style={labelStyle}>{placeholderText}</div>
            
            <div style={{margin: "15px 10px 0 0",color:"#80868b"}} onClick={(e)=>clearText()}>
              X
            </div>
            
          </div>
          

          {false &&  <div className={`${_className.i9lrp}_${inputId} ${_className.mIZh1c}`}></div> }
          
        </div>
      </div>
      <div id={`_${inputId}_list_`} 
        className={`${_className.OabDMe}_${inputId} ${_className.cXrdqd}2_${inputId} `}  
        onMouseLeave={(e)=>HandlerOnMouseLeave(e)}   
        style={{"transformOrigin":"146.5px center", width:"100%", zIndex: 500}}
        >
        <div className={`_b6gX9sT3_${inputId}_`}>
        {
          focus && isData && _list.map(d=>{       
            let ss = data[d];
            return(
            <div className={`item_${inputId} `} onClick={()=>handleSetItems(ss)}   >
              <span>
                {ss.name}
              </span>
            </div>
            )
          })
        }
        </div>
      </div> 
     

      {/*
      true &&   
          <div className={`${_className.OabDMe} ${_className.cXrdqd}2_${inputId} `}style={{"transform-origin":"146.5px center"}}>
            <div className={`popFloatWrapper`}>

           
            {focus && isData && _list.map(d=>{       
              let ss = data[d];
              return(
              <div className={`item_${inputId} `} onClick={(e)=>handleSetItems(ss, setTextValue,props,updForms,setValid,setFocus, inputId )}   >
                {ss && ss.name}
              </div>
              )
              
            })}
             </div>
          </div> */}


     
     
    </div>
    <div className={`Overlay_${inputId}`} onClick={(e)=>handleBlur(e)}/>

   {/* <div className={`Overlay_${inputId}`} onClick={(e)=>handleBlur(e,setFocus,inputId)}/> */}
    </> 
  )
}






export default InputAutocomplete






const textInputClass = (_className,inputId) => {
  return `
    .H2SoFe *, .H2SoFe *:before, .H2SoFe *:after {
    -webkit-box-sizing: inherit;
    box-sizing: inherit;
    }

    .${_className.N3Hzgf}_${inputId} .${_className.oJeWuf}_${inputId} {
        max-height: 40px;
        -webkit-transform-origin: bottom left;
        transform-origin: bottom left;
        -webkit-transition: max-height .3s cubic-bezier(0.4,0,0.2,1);
        transition: max-height .3s cubic-bezier(0.4,0,0.2,1);
        padding-top: 0;
    }

    .${_className.N3Hzgf}_${inputId} {
      position: relative;
    }

    .${_className.N3Hzgf}_${inputId}.${_className.u3bW4e}_${inputId}.RT1Mb576wSi5 .${_className.oJeWuf}_${inputId} {
      max-height: 56px;
    }

    .${_className.rFrNMe}_${inputId}.sdJrJc>.${_className.aCsJod}_${inputId} {
        padding-top: 24px;
    }

    .${_className.N3Hzgf}_${inputId} .${_className.aCsJod}_${inputId} {
      height: 40px;
      position: relative;
      vertical-align: top;
    }

    .${_className.N3Hzgf}_${inputId} .${_className.Wic03c}_${inputId} {
    -webkit-align-items: center;
    align-items: center;
    position: static;
    top: 0;
    border-radius:4px;
    border: 1px solid #e1e1e1;
    }

    .${_className.aXBtI}_${inputId} {
    display: -webkit-box;
    display: -webkit-flex;
    display: flex;
    position: relative;
    top: 14px;
    }


    .${_className.whsOnd}_${inputId} {
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
    line-height: 24px;
    margin: 0;
    min-width: 0%;
    outline: none;
    padding: 0;
    z-index: 0;
    }


    .${_className.AxOyFc}_${inputId} {
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


    .${_className.Xb9hP}_${inputId} {
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

    .${_className.Xb9hP}_${inputId}::after,
    .${_className.Xb9hP}_${inputId}::before {
      color: #202124;
    }
      


    .${_className.N3Hzgf}_${inputId} .${_className.zHQkBf}_${inputId} {
    -webkit-border-radius: 4px;
    border-radius: 4px;
    color: #202124;
    font-size: 16px;
    height: 28px;
    margin: 1px 1px 0 1px;
    padding: 13px 15px;
    z-index: 1;
    }

    .${_className.jjwyfe}_${inputId} .${_className.zHQkBf}_${inputId}, .${_className.jjwyfe}_${inputId} .MQL3Ob {
    direction: ltr;
    text-align: left;
    }
    .${_className.N3Hzgf}_${inputId} .${_className.AxOyFc}_${inputId} {
    font-family: roboto,arial,sans-serif;
    }

    .${_className.N3Hzgf}_${inputId} .${_className.AxOyFc}_${inputId}{
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



    .${_className.N3Hzgf}_${inputId}.${_className.u3bW4e}_${inputId} 
    .${_className.whsOnd}_${inputId}:not([disabled]):focus~.${_className.AxOyFc}_${inputId}{
      color: #1a38e8;
    }


    .${_className.N3Hzgf}_${inputId}.${_className.u3bW4e}_${inputId} 
    .${_className.Wic03c}_${inputId}{
      border: 2px solid #1a38e8;
    }
   
    .${_className.N3Hzgf}_${inputId}.${_className.INVALID}_${inputId} 
    .${_className.Wic03c}_${inputId}{
      border: 2px solid firebrick;
    }
   
   

    .${_className.N3Hzgf}_${inputId} .${_className.mIZh1c}_${inputId},
    .${_className.N3Hzgf}_${inputId}.${_className.k0tWj}_${inputId} 
    .${_className.mIZh1c}_${inputId} {
        height: 100%;
    }

    .${_className.N3Hzgf}_${inputId} .${_className.mIZh1c}_${inputId}, 
    .${_className.N3Hzgf}_${inputId} .${_className.cXrdqd}_${inputId}
    {
      background-color: transparent;
    }

    .${_className.N3Hzgf}_${inputId} .${_className.mIZh1c}_${inputId} {
    border: 1px solid #dadce0;
    -webkit-border-radius: 4px;
    border-radius: 4px;
    bottom: 0;
    -webkit-box-sizing: border-box;
    box-sizing: border-box;
    }



    .${_className.N3Hzgf}_${inputId}.${_className.u3bW4e}_${inputId} 
    .${_className.cXrdqd}_${inputId} {
      border: 2px solid #1a73e8;
      border: none;
    }
   
    .${_className.N3Hzgf}_${inputId}.${_className.u3bW4e}_${inputId} 
    .${_className.cXrdqd}_${inputId},
    .N3Hzgf.IYewr .${_className.cXrdqd}_${inputId} {
      -webkit-animation: none;
      animation: none;
      opacity: 1;
    }

    .${_className.N3Hzgf}_${inputId}.${_className.u3bW4e}_${inputId} 
    .item_${inputId}{
        padding: 7px 15px;
        display: flex;
        position: relative;
        align-items: center;
        justify-content: flex-start;
        padding: 0 16px;
        overflow: hidden;
        height: 48px;
    }

    .${_className.N3Hzgf}_${inputId}.${_className.u3bW4e}_${inputId} 
    .item_${inputId} span{

      color: rgba(0,0,0,0.48);
      color: #3c3c3c;
      font-family: "Google Sans",Roboto,Arial,sans-serif;
      font-size: 14px;
      font-weight: 500;
      letter-spacing: .0107142857em;
    }



    .VfPpkd-rymPhb-ibnC6b {
      display: flex;
      position: relative;
      align-items: center;
      justify-content: flex-start;
      padding: 0 16px;
      overflow: hidden;
    }
    .VfPpkd-rymPhb-ibnC6b {
        height: 48px;
    }



  .${_className.N3Hzgf}_${inputId}
  .${_className.OabDMe}_${inputId}{
    -webkit-font-smoothing: antialiased;
    font-size: 14px;
    letter-spacing: .2px;
    border: none;
    -webkit-border-radius: 4px;
    border-radius: 4px;
    -webkit-box-shadow: 0 8px 10px 1px rgba(0,0,0,0.14), 0 3px 14px 2px rgba(0,0,0,0.12), 0 5px 5px -3px rgba(0,0,0,0.2);
    box-shadow: 0 8px 10px 1px rgba(0,0,0,0.14), 0 3px 14px 2px rgba(0,0,0,0.12), 0 5px 5px -3px rgba(0,0,0,0.2);
    font-family: Roboto,RobotoDraft,Helvetica,Arial,sans-serif;
    line-height: 20px;
    opacity: 0;
    max-height: 320px;
    overflow: auto;
    z-index: 7;
}

.${_className.N3Hzgf}_${inputId}.${_className.u3bW4e}_${inputId}.RT1Mb576wSi5 
.${_className.OabDMe}_${inputId}{
    opacity: 1;
    transition-delay: 120ms;
    margin-top: 19px;
    position: absolute;
    min-width: 180px;
}


  .popFloatWrapper {
    -webkit-box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    -webkit-box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    border: 1px solid #ccc;
    border: 1px solid rgba(0,0,0,0.2);
    padding: 5px;
  }


  .Overlay_${inputId}{
    height: 0vh; 
    width: 0%;     
    opacity: 0;
    position: fixed;
    z-index: 260; 
    left: 0;
    bottom: 0;
    overflow-x: hidden;   
    transition: opacity ease-in-out .138s;
    transform-origin:  50% 210% 0;
  }
  
  
  .${_className.N3Hzgf}_${inputId}.${_className.u3bW4e}_${inputId}.RT1Mb576wSi5 ~ .Overlay_${inputId}{    
    opacity: 1;
    bottom: 0;    
    transition: opacity ease-in-out .58s;
    height: 100vh; 
    width: 100%;
  }






  ._b6gX9sT3_${inputId}_ {
    -webkit-box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    -webkit-box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    padding: 5px;
    background-color: #fff;
  }
  






  .item_${inputId}{
    padding-left: 56px;
    padding-right: 16px;
    cursor: pointer;
  }
  
  
  .item_${inputId} {
    display: flex;
    position: relative;
    align-items: center;
    justify-content: flex-start;
    padding: 0 16px;
    overflow: hidden;
    -webkit-user-select: none;
    height: 48px;
  }
  
  
  .item_${inputId}:hover {
  
  }
  
  
  .item_${inputId} span{
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
  }
  
  
  
  
  .item_${inputId}::before,
  .item_${inputId}::after {
    position: absolute;
    border-radius: 50%;
    opacity: 0;
    pointer-events: none;
    content: "";
  }
  
  
  
  
  .item_${inputId}:hover::before {
    opacity: .04;
    background-color: #000;
  }
  
  
  .item_${inputId}::before,
  .item_${inputId}::after {
    top: calc(50% - 100%);
    left: calc(50% - 100%);
    width: 200%;
    height: 200%;
  }
  
  .item_${inputId}::before,
  .item_${inputId}::after {
    transition: opacity 15ms linear,background-color 15ms linear;
    z-index: 1;
  }
  
  
  ._mgLf{
    margin-left: 12px;
  }
  




`;
}
