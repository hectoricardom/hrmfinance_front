
import React from 'react'

import loadable from '@loadable/component'

import './_styles.css';

const Icon2 = loadable(() => import('./Icons'))


const MoreInfoButton = (props) => {
    const {title, theme, icon} = props;

    const _clickEvent = () => {
      if(typeof props.clickEvent === "function"){
        props.clickEvent();
      }
    }
    var thCls = theme==="purple"?'color-purple-4':theme==="gray"?'color-secondary ':'color-primary';
    let _icon = icon || 'add'
    return(
        <a tabindex="0" className="primary-button playLink isToolkit" >
            <button className={`${thCls} hasLabel hasIcon ltr-h73cpj`} tabindex="-1" type="button" onClick={()=>_clickEvent()}>
                <div className="ltr-1e4713l">
                    <div className="medium ltr-sar853" role="presentation">
                        <Icon2   
                            name={_icon} 
                            color={'currentColor'} 
                        />
                    </div>
                </div>
                <div className="ltr-1i33xgl" style={{width: "0.8rem"}}></div>
                <span className="ltr-14hip7q">{title}</span>
            </button>
        </a>
    )
}

export default MoreInfoButton