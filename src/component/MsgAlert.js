import React, { useState } from 'react'
import * as _Util from '../store/Util';

import loadable from '@loadable/component'


const Icon2 = loadable(() => import('./Icons'))


export default function Msg(props) {
  let _name = props.text;
  let _theme = props.theme;
 
 let styleTheme = _theme==="red"?{backgroundColor:"#fce8e6", color:"firebrick"}:_theme==="green"?{backgroundColor:"rgba(230,244,234,1)", color:"rgba(24,128,56,1)"}:_theme==="yellow"?{backgroundColor:"rgba(230,244,234,1)", color:"rgba(24,128,56,1)"}:{}

  return (
      <div className={`msg_alert _dsplFlx btc_color `} style={styleTheme}>
        <div className={`msg_alert_title `}>
        {_name} 
        </div>
        <div className={`flexSpace`}/>                    
      </div>

    )
}

/*

<div className={`icon_mov`}>
          <Icon2 name={`btc`} />
        </div>
*/