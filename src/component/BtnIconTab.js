
import React from 'react'

import * as _Util from '../store/Util'
import './_styles.css'
const Icon2 = _Util.Icon_Cmpt();





const BtnIconTab = (props) => {
 
  const {
    lbl,
    icon,
    classN,
    index,
    indexTag,
    changeView,
    isMobile
  } = props;



  return (
    <div className={`pym81b sendBx mov_type _dsplFlx ${classN} mxWdth ${index===indexTag?"fillBack":""}`} onClick={()=>changeView(indexTag)}>
      {isMobile? <div className={`flexSpace`}/>:null}
      <div className={`icon_mov`}>
        <Icon2 name={icon} />
      </div>
      <div className={`mov_type_title `}>
        {isMobile?"":_Util.translatetext(lbl)}
      </div>
      <div className={`flexSpace`}/>                            
    </div>
  )

}


export default  BtnIconTab;