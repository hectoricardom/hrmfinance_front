import React, { useState } from 'react'
import * as _Util from '../store/Util';

export default function Icon2(props) {
  let _name = props.name;
  const [iconId] = useState(_Util.gen12CodeId());
  const _dList = _Util.getSvgSymbols();
  const _d = _dList && _dList[_name];
  let sZ = props.size?props.size:24;
  let _color =  props.color?props.color:'#5c5c5c' ;
  return (
        <svg className={`_Icons_${iconId}_`} fill={_color} height={sZ} viewBox="0 0 24 24" width={sZ} >
          <path d={_d?_d:''}/>
        </svg>
    )
}
