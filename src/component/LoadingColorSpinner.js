import React from 'react';
import './_styles.css';


const LoadingColorSpinner= (props)=>{

    var style  = {
      position: 'relative',
      width: props.width+'px' || '10px',
      height: props.height+'px' || '10px',
    }
    var classCircle  = 'spinnerPath', styleCircle={}
    if(props.stroke){
      classCircle = 'spinnerPathWC';
      styleCircle={stroke: props.stroke};
    }
    
    return (
      <div id="loadingSpinner"  style={style}>
        <svg className="spinnerSvg" viewBox="25 25 50 50">
            <circle className={classCircle} cx="50" cy="50" r="20" fill="none" style={styleCircle} strokeWidth="2" strokeMiterlimit="10"></circle>
        </svg>
    </div>
    );
}


export default LoadingColorSpinner