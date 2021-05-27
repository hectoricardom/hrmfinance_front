
import React, { useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import * as _Util from '../store/Util'

// import styles from './btns.module.css'

import {CloseModal} from "../actions/common";


const useObserveChanges = () => {
  const observeChanges =  useSelector(state => state.observeChanges);
  const dispatch = useDispatch()
  const close = (Id) => {
    CloseModal(dispatch,{id:Id});
  }

  return { observeChanges,  close }
}


const BTN_S = (props) => {  
  const {theme,value,list} = props;
  const { observeChanges } = useObserveChanges();
  
  const [ focus, setFocus] = useState(false);
  const [ hover, setHover] = useState(false);
  const [ dropDownView, setdropDownView] = useState(0);
  
  const [ btnId ] = useState(_Util.gen12CodeId());
  const _state = _Util.getStore();
  const _className = _state["maskClassName"]

  
  let classComponent = stylesClass(_className, _className[theme]); 


  const upd = (e) => { 
    if(typeof props.updchange === "function"){
      props.updchange(e)
    }
  } 


return (
    <div className="dropBx_hrm" 
      onBlur={()=>{  setTimeout(()=>setdropDownView(false),200)}}
      //style={{zIndex:dropDownView?25:1}}
    >
      <button 
            aria-expanded="false" 
            aria-haspopup="true" 
            aria-label="dropdown-menu-trigger-button" 
            className="dropdown-toggle dropBx_btn_hrm" 
            data-uia="dropdown-toggle"
            onClick={()=>setdropDownView(!dropDownView)}
        >
          {value}
        </button>
        {dropDownView?
        <ul data-uia="dropdown-menu" role="menu" className="dropdown_menu_hrm" style={{zIndex:27}}>
            {list && list.map((sId,inS)=>{
              return (
                <li data-index={`${inS}`} data-uia="dropdown-menu-item" role="menuitem" tabIndex={`${inS}`} 
                  onClick={()=>upd(sId)} className="dropdown_menu_item_hrm">
                  {sId||""}
                </li>
              )
            })}
        </ul>
        :null}
    </div>
)
}


export default BTN_S;




const stylesClass = (_className, theme) => {
  let clsss =  `

  







`
return clsss;
}






/*



${theme===_className.blue_white?` 
      

.${_className.blue_white} {
  font-family: "Google Sans",Roboto,Arial,sans-serif;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: .0107142857em;
  text-transform: none;
  transition: border 280ms cubic-bezier(0.4,0,0.2,1),box-shadow 280ms cubic-bezier(0.4,0,0.2,1);
  box-shadow: none;
}

.${_className.blue_white}:not(:disabled) {
  background-color: #1a73e8;
  color: #fff;
}

.${_className.blue_white}:active {
  box-shadow: 0 1px 2px 0 rgba(60,64,67,0.3), 0 2px 6px 2px rgba(60,64,67,0.15);
  box-shadow: 0 1px 2px 0 var(--gm-fillbutton-keyshadow-color,rgba(60,64,67,0.3)),0 2px 6px 2px var(--gm-fillbutton-ambientshadow-color,rgba(60,64,67,0.15));
}

.${_className.blue_white}:hover,
.${_className.blue_white}:focus {
    box-shadow: 0 1px 2px 0 rgba(60,64,67,0.3), 0 1px 3px 1px rgba(60,64,67,0.15);
    box-shadow: 0 1px 2px 0 var(--gm-fillbutton-keyshadow-color,rgba(60,64,67,0.3)),0 1px 3px 1px var(--gm-fillbutton-ambientshadow-color,rgba(60,64,67,0.15));
}
.${_className.blue_white}:not(:disabled) {
    background-color: #1a73e8;
    background-color: var(--gm-fillbutton-container-color,#1a73e8);
    color: #fff;
    color: var(--gm-fillbutton-ink-color,#fff);
}

.Rj2Mlf:not(:disabled) {
  color: #1a73e8;
  color: var(--gm-hairlinebutton-ink-color,#1a73e8);
  border-color: #dadce0;
  border-color: var(--gm-hairlinebutton-outline-color,#dadce0);
}

`:''}




${ theme===_className.light_blue?`      

/*
.${_className.btn_base}.${_className.light_blue}:not(:disabled) {
  background-color: transparent;
  color: #1a73e8;
}

.${_className.btn_base}.${_className.light_blue} ._p91CuWOY1kwy_ {
  height: 100%;
  position: absolute;
  overflow: hidden;
  width: 100%;
  z-index: 0;
}


.${_className.btn_base}.${_className.light_blue}:hover:not(:disabled),
.${_className.btn_base}.${_className.light_blue}:active:not(:disabled){
 color: #174ea6; 
 cursor:pointer;
                   
}

.${_className.btn_base}.${_className.light_blue}:hover:not(:disabled) ._p91CuWOY1kwy_,
.${_className.btn_base}.${_className.light_blue}:active:not(:disabled) ._p91CuWOY1kwy_{
    
    background-color: #1a73e8;
        
}

.${_className.btn_base}.${_className.light_blue} ._p91CuWOY1kwy_::before, 
.${_className.btn_base}.${_className.light_blue} ._p91CuWOY1kwy_::after {
  background-color: #1a73e8; 
  transition: opacity 150ms linear;
      
}

.${_className.btn_base}.${_className.light_blue}:hover:not(:disabled) ._txt_,
.${_className.btn_base}.${_className.light_blue}:active:not(:disabled) ._txt_{            
    color: #174ea6;
    font-weight:700;              
}

.${_className.btn_base}.${_className.light_blue}:not(:disabled) ._txt_{
    font-weight: 600;              
}












.${_className.btn_base} :hover:not(:disabled), 
.${_className.btn_base} :active:not(:disabled) {
  border-color: #dadce0;
  border-color: var(--gm-hairlinebutton-outline-color,#dadce0);
}

.${_className.btn_base} :focus:not(:disabled) {
  border-color: #174ea6;
  border-color: var(--gm-hairlinebutton-outline-color--stateful,#174ea6;);
}



.${_className.btn_base}:hover:not(:disabled), 
.${_className.btn_base}:active:not(:disabled), 
.${_className.btn_base}:not(.VfPpkd-ksKsZd-mWPk3d):focus:not(:disabled), 
.${_className.btn_base}.${_className.focus_active}:not(:disabled) {
  color: #174ea6;
  color: var(--gm-hairlinebutton-ink-color--stateful,#174ea6;);
}





`:''}







${theme===_className.fire_brick?`

.${_className.btn_base} ._p91CuWOY1kwy_::before,
.${_className.btn_base} ._p91CuWOY1kwy_::after {
  background-color: firebrick;
  background-color: var(--mdc-theme-primary,firebrick);
}

/*

.${_className.btn_base}:hover:not(:disabled), 
.${_className.btn_base}:active:not(:disabled) {
  border-color: #dadce0;
  border-color: var(--gm-hairlinebutton-outline-color,#dadce0);
}

.${_className.btn_base}:focus:not(:disabled) {
  border-color: firebrick;
  border-color: var(--gm-hairlinebutton-outline-color--stateful,firebrick);
}




.${_className.btn_base}:hover:not(:disabled), 
.${_className.btn_base}:active:not(:disabled), 
.${_className.btn_base}:not(.VfPpkd-ksKsZd-mWPk3d):focus:not(:disabled), 
.${_className.btn_base}.${_className.focus_active}:not(:disabled) {
  color: firebrick;
  color: var(--gm-hairlinebutton-ink-color--stateful,firebrick);
}


`:''}




`

*/
