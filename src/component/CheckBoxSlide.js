

import React, { useState, useEffect } from 'react';


const CheckBoxSlide = (props) => {
  const [active, setActive] = useState(false);
  const [initialize, setInitialize] = useState(false);

  const  _style_ = _styleClass_(props.keyCode);

  useEffect(() => {
    if(!initialize){
      // setTimeout(()=>{  },1);
      setActive(props.initvalue)  
      setInitialize(true);
    }
    if(props.initvalue!==active){
      setActive(props.initvalue)  
    }
  });

  const handleChange = () => {
    if(!props.disabled){
      if(typeof props.updChange === 'function') {      
        props.updChange(!active)
      }  
      setActive(!active);  
    }
  }

  return (
    <>
      <div className={`toggle-container ptoggle-button_${props.keyCode} ${active?'_active':''}`} 
        onClick={()=>handleChange()} 
      >
        <div  className={`toggle-bar ptoggle-button_${props.keyCode}`}></div>
        <div className={`toggle-button ptoggle-button_${props.keyCode}`} >
          <div  className="pripple" style={{opacity: 0.00448}}></div>
          <div className="pripple"></div>
        </div>
        <div className={`toggle-label ptoggle-button_${props.keyCode}`}></div>      
      </div>
      <style>
        {_style_}
      </style>
    </>

  )
}

export default CheckBoxSlide



const  _styleClass_ = (_id_)  => `

.toggle-container.ptoggle-button_${_id_} {
  display: inline-block;
  position: relative;
  width: 36px;
  height: 14px;
  margin: 4px 1px;
  cursor: pointer;
  --checkBox--button--color:rgb(24, 128, 56);
  --checkBox--button--Active--color: rgb(24, 128, 56);
}

.toggle-label.ptoggle-button_${_id_} {
  position: relative;
  display: inline-block;
  vertical-align: middle;
  pointer-events: none;
  color: navy;
}


.toggle-bar.ptoggle-button_${_id_} {
  position: absolute;
  height: 100%;
  width: 100%;
  border-radius: 8px;
  pointer-events: none;
  opacity: 0.4;
  transition: background-color linear .08s;
  background-color: #d3d3d3;
  
}

.toggle-button.ptoggle-button_${_id_} {
  -webkit-transform: translate(0px, 0);
  transform: translate(0px, 0);
  background-color: var(--checkBox--button--color,#1a73e8);
}

.toggle-button.ptoggle-button_${_id_} {
  position: absolute;
  top: -3px;
  left: 0;
  height: 20px;
  width: 20px;
  border-radius: 50%;
  box-shadow: 0 1px 5px 0 rgba(0, 0, 0, 0.6);
  transition: -webkit-transform linear .08s, background-color linear .08s;
  transition: transform linear .08s, background-color linear .08s;
  will-change: transform;
  background-color: #fafafa;
}

.toggle-container._active .toggle-button.ptoggle-button_${_id_} {
  -webkit-transform: translate(16px, 0);
  transform: translate(16px, 0);
  background-color:var(--checkBox--button--Active--color,#1a73e8);
}


.toggle-container._active .toggle-bar.ptoggle-button_${_id_} {
  opacity: 0.5;
  background-color: var(--checkBox--button--Active--color,#1a73e8);
}



/*
--checkBox--button--color
--checkBox--button--Active--color
*/
`