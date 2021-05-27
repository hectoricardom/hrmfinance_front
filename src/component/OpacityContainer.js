
import React from 'react'

import * as _Util from '../store/Util'
import './_styles.css'





const OpacityContainer = (props) => {
 
  const {
    lbl,
    index,
    indexTag,
    isMobile,
    children
  } = props;

  return (
    <div className={`formContainer `} style={{opacity:index === indexTag?1:0}}>
      {index === indexTag?
      <div className={``}>
        {isMobile?
        <div className={`mov_type_title `}>
          <p>{_Util.translatetext(lbl)}</p>
        </div>
        :null}
        {children}
      </div>
      :null}
    </div>
  )

}

export default  OpacityContainer;