
import React from 'react'
import './_styles.css';

const ImageButton = (props) => {
    const {src, title} = props;

    const _clickEvent = () => {
      if(typeof props.clickEvent === "function"){
        props.clickEvent();
      }
    }

    let _src = src || ``
    
    return(
        <a tabindex="0" className="primary-button playLink isToolkit" >
            <button className="color-primary hasLabel hasIcon ltr-h73cpj mW265" tabindex="-1" type="button" onClick={()=>_clickEvent()}>
                <div className="ltr-1e4713l">
                    <div className="medium ltr-sar853" role="presentation">
                        <img  class="icon-product lazy-img js-only" alt={title} src={_src}/>
                    </div>
                </div>
                <div className="ltr-1i33xgl" style={{width: "0.8rem"}}></div>
                <span className="ltr-14hip7q">{""}</span>
            </button>
        </a>
    )
}


export default ImageButton