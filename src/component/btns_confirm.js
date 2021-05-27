
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

const HandlerOnMouseUp = (e,setFocus,setRipple) => { 
  setTimeout(()=>{
    setFocus(false)
  },280)  
  //console.log('HandlerOnMouseUp',e.target)
}

const HandlerOnMouseDown = (e,setFocus,setRipple) => { 
  setFocus(true) 
  setRipple(true) 
  setTimeout(()=>{
    setRipple(false)
  },1200)  
  //console.log('HandlerOnMouseDown',e.target)
}

const HandlerOnMouseEnter = (e,setHover) => { 
  setTimeout(()=>{
    setHover(true)
  },20)  
  //console.log('HandlerOnMouseUp',e.target)
}

const HandlerOnMouseLeave = (e,setHover) => { 
  setTimeout(()=>{
    setHover(false)
  },200)  
  //console.log('HandlerOnMouseUp',e.target)
}


const BTN_S = (props) => {  
  const {theme,title,index} = props;
  const { observeChanges } = useObserveChanges();
  
  const [ focus, setFocus] = useState(false);
  const [ hover, setHover] = useState(false);
  const [ ripple, setRipple] = useState(false);
  
  const [ btnId ] = useState(_Util.gen12CodeId());
  const _state = _Util.getStore();
  const _className = _state["maskClassName"]

  
  let classComponent = stylesClass(_className, _className[theme]); 






  let styleRpl = {
    "--mdc-ripple-fg-size": `91px`,
    "--mdc-ripple-fg-scale": 1.82476,
    "--mdc-ripple-fg-translate-start": `69px, -25.5px`,
    "--mdc-ripple-fg-translate-end": `30.4219px, -27.5px`,
    "--mdc-ripple-fg-animations":'mdc-ripple-fg-radius-in 225ms forwards,mdc-ripple-fg-opacity-in 75ms forwards',
    "--mdc-theme-init-opacity": theme==="blue_white"?0.6:theme==="fire_brick"?0.0:theme==="light_blue"?0:theme==="light_green"?0:0.02,
    "--mdc-theme-hover-opacity": theme==="blue_white"?0.8:theme==="fire_brick"?0.04:theme==="light_blue"?0.04:theme==="light_green"?0.04:0.04,
    "--mdc-theme-primary": theme==="blue_white"?"#1a73e8":theme==="fire_brick"?"transparent":theme==="light_blue"?"transparent":theme==="light_green"?"transparent":"rgba(0,0,0,0.812)",
    "--mdc-theme-primary-hover": theme==="blue_white"?"#1a73e8":theme==="fire_brick"?"firebrick":theme==="light_blue"?"#1a73e8":theme==="light_green"?"#00796b":"rgba(0,0,0,0.812)",
    "--mdc-theme-primary-color": theme==="blue_white"?"#fff":theme==="fire_brick"?"firebrick":theme==="light_blue"?"#1a73e8":theme==="light_green"?"#00796b":"rgba(0,0,0,0.41)",
    "--mdc-theme-primary-color-hover": theme==="blue_white"?"#fff":theme==="fire_brick"?"firebrick":theme==="light_blue"?"#174ea6":theme==="light_green"?"#174ea6":"rgba(0,0,0,0.973)",
  }   
  
  /// <RippleHRM/>
  // V2fPpkd-ksKsZd-mWPk3d-OWXEXe-Tv8l5d-
  // focus_active ripple_in ripple_out 
// ${_className.hove r_base}  - _p91CuWOY1kwy_
/*
  console.log('props',props)
  console.log('hover',hover)
  console.log('focus',focus)
  console.log('ripple',ripple)
  console.log('now',(new Date()).getTime())

  */
  return (
    <>      
      <style>
        {classComponent}
      </style>
      <button style={styleRpl} 
        onMouseDown={(e)=>HandlerOnMouseDown(e,setFocus,setRipple)} 
        onMouseUp={(e)=>HandlerOnMouseUp(e,setFocus,setRipple)}
        onMouseEnter={(e)=>HandlerOnMouseEnter(e,setHover,setRipple)} 
        onMouseLeave={(e)=>HandlerOnMouseLeave(e,setHover,setRipple)}  
        className={` ${_className.btn_base}  ${_className[theme]} ${hover?"Rj2Mlf":""} ${focus?ripple?`lJfZMc ${_className.focus_active}`:`OmS1vf ${_className.focus_active}`:''} `} 
        tabIndex={index}
      >
        {true &&  <div className={`_p91CuWOY1kwy_`}></div>}
      
        <span className="_txt_">{title}</span>
      </button>


    </>
  )
}


export default BTN_S;




const stylesClass = (_className, theme) => {
  let clsss =  `

  
         
  .${_className.btn_base} {
    height: 36px;
    cursor: pointer;
  }




  .${_className.btn_base} {
    -webkit-font-smoothing: antialiased;
    font-family: Roboto,sans-serif;
    font-size: 14px;
    line-height: 2.25rem;
    font-weight: 500;
    letter-spacing: .0892857143em;
    text-decoration: none;
    text-transform: uppercase;
    padding: 0 8px 0 8px;
    position: relative;
    display: -webkit-inline-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    min-width: 64px;
    border: none;
    outline: none;
    line-height: inherit;
    -webkit-user-select: none;
    -webkit-appearance: none;
    overflow: visible;
    vertical-align: middle;
    border-radius: 4px;
    background-color: transparent;
}





.${_className.btn_base}
._txt_ {
  font-family: "Google Sans",Roboto,Arial,sans-serif;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: .0107142857em;
  text-transform: none;        
}











.${_className.btn_base}:not(:disabled) ._txt_{
  color: #1a73e8;       
  color: var(--mdc-theme-primary-color,#1a73e8);     
}

.${_className.btn_base}:hover:not(:disabled) ._txt_,
.${_className.btn_base}:active:not(:disabled) ._txt_{            
    color: #174ea6;
    color: var(--mdc-theme-primary-color,#174ea6);
}



.${_className.btn_base} ._txt_{  
  z-index: 2;          
}


.${_className.btn_base}:not(:disabled) ._txt_{
  font-weight: 500;  
}

.${_className.btn_base}:hover:not(:disabled) ._txt_,
.${_className.btn_base}:active:not(:disabled) ._txt_{ 
    font-weight:500;              
}







.${_className.btn_base} ._p91CuWOY1kwy_  {
  position: absolute;
  box-sizing: content-box;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: 4px;
}


.${_className.btn_base} ._p91CuWOY1kwy_::before,
.${_className.btn_base} ._p91CuWOY1kwy_::after {
  top: calc(50% - 100%);
  left: calc(50% - 100%);
  width: 200%;
  height: 200%;
  transition: opacity 15ms linear,background-color 15ms linear;
  z-index: 1;
}



.${_className.btn_base} ._p91CuWOY1kwy_::before,
.${_className.btn_base} ._p91CuWOY1kwy_::after {
  background-color: transparent;
  background-color: var(--mdc-theme-primary,transparent);
}



.${_className.btn_base} ._p91CuWOY1kwy_::before,
.${_className.btn_base} ._p91CuWOY1kwy_::after {
  position: absolute;
  border-radius: 50%;
  opacity: 0; 
  opacity: var(--mdc-theme-init-opacity,0);  
  pointer-events: none;
  content: "";
}



.${_className.btn_base} ._p91CuWOY1kwy_::before, 
.${_className.btn_base} ._p91CuWOY1kwy_::after { 
  transition: opacity 150ms linear;
  top: calc(50% - 100%);
  left: calc(50% - 100%);
  width: 200%;
  height: 200%;
}

.${_className.btn_base} ._p91CuWOY1kwy_::before {
  transition: opacity 15ms linear,background-color 15ms linear;
  z-index: 1;
}





.${_className.btn_base}.VfPpkd-ksKsZd-mWPk3d ._p91CuWOY1kwy_::before{
  transform:scale(var(--mdc-ripple-fg-scale,1))
}

.${_className.btn_base}.VfPpkd-ksKsZd-mWPk3d ._p91CuWOY1kwy_::after{
  top:0;left:0;transform:scale(0);transform-origin:center center
}





.${_className.btn_base}.VfPpkd-ksKsZd-mWPk3d ._p91CuWOY1kwy_::after{    
  width:var(--mdc-ripple-fg-size,100%);
  height:var(--mdc-ripple-fg-size,100%)
}



.${_className.btn_base}.${_className.focus_active} ._p91CuWOY1kwy_::before{
  transition-duration:75ms;
  opacity:.12
}

.${_className.btn_base}:not(.VfPpkd-ksKsZd-mWPk3d) ._p91CuWOY1kwy_::after{
  transition:opacity 150ms linear
}

.${_className.btn_base}.VfPpkd-ksKsZd-mWPk3d{
  --mdc-ripple-fg-opacity:.12;
}


.${_className.btn_base} ._p91CuWOY1kwy_{
  position:absolute;box-sizing:content-box;width:100%;height:100%;overflow:hidden
}

.${_className.btn_base}:not(.${_className.btn_base}-OWXEXe-INsAgc) ._p91CuWOY1kwy_{
  top:0;left:0
}




.${_className.btn_base}.Rj2Mlf ._p91CuWOY1kwy_::before,
.${_className.btn_base}.Rj2Mlf ._p91CuWOY1kwy_::after{
  opacity: .04;
  opacity: var(--mdc-theme-hover-opacity,0.04);
}


.${_className.btn_base}.Rj2Mlf ._p91CuWOY1kwy_::before,
.${_className.btn_base}.Rj2Mlf ._p91CuWOY1kwy_::after {
  background-color: transparent;
  background-color: var(--mdc-theme-primary-hover,transparent);
}

  
.${_className.btn_base}.${_className.focus_active} ._p91CuWOY1kwy_::before
  {
    transition-duration:175ms;
    opacity:.24
  }


/*

.${_className.btn_base}:not(.VfPpkd-ksKsZd-mWPk3d):focus ._p91CuWOY1kwy_::before,
.${_className.btn_base}:not(.VfPpkd-ksKsZd-mWPk3d):active ._p91CuWOY1kwy_::after{

}

.${_className.btn_base}:not(.VfPpkd-ksKsZd-mWPk3d):focus ._p91CuWOY1kwy_::before{

}

*/

.${_className.btn_base}:not(.VfPpkd-ksKsZd-mWPk3d) ._p91CuWOY1kwy_::after,
.${_className.btn_base}:not(.VfPpkd-ksKsZd-mWPk3d) ._p91CuWOY1kwy_::after{
  transition:opacity 150ms linear
}


.${_className.btn_base}.VfPpkd-ksKsZd-mWPk3d,
.${_className.btn_base}.VfPpkd-ksKsZd-mWPk3d{
  --mdc-ripple-fg-opacity:.24
}

.${_className.btn_base}{
  height:36px
}



.${_className.btn_base}.VfPpkd-ksKsZd-mWPk3d-OWXEXe-ZNMTqd ._p91CuWOY1kwy_::after{
  top:var(--mdc-ripple-top,0);
  left:var(--mdc-ripple-left,0)
}

.${_className.btn_base}.lJfZMc ._p91CuWOY1kwy_::after{
  animation: mdc-ripple-fg-radius-in 225ms forwards,mdc-ripple-fg-opacity-in 75ms forwards
}

.${_className.btn_base}.OmS1vf ._p91CuWOY1kwy_::after{
  animation: mdc-ripple-fg-opacity-out 150ms;
  transform: translate(var(--mdc-ripple-fg-translate-end,0)) scale(var(--mdc-ripple-fg-scale,1))
}









.${_className.btn_base}.OmS1vf ._p91CuWOY1kwy_::after{
  animation: mdc-ripple-fg-opacity-out 150ms;
  transform: translate(var(--mdc-ripple-fg-translate-end,0)) scale(var(--mdc-ripple-fg-scale,1))
}






@keyframes mdc-ripple-fg-radius-in{
  0%{
    animation-timing-function:cubic-bezier(0.4,0,0.2,1);
    transform:translate(var(--mdc-ripple-fg-translate-start,0)) scale(1)
  }
  to{
    transform:translate(var(--mdc-ripple-fg-translate-end,0)) scale(var(--mdc-ripple-fg-scale,1))
  }
}
  
  
@keyframes mdc-ripple-fg-opacity-in{
  0%{animation-timing-function:linear;opacity:0}
  to{opacity:var(--mdc-ripple-fg-opacity,0)}
}
  
@keyframes mdc-ripple-fg-opacity-out{
  0%{animation-timing-function:linear;
    opacity:var(--mdc-ripple-fg-opacity,0)
  }
  to{opacity:0}
}


























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
