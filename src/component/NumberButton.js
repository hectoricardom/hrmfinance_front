
import React from 'react'
import loadable from '@loadable/component'
import './_styles.css';
const Icon2 = loadable(() => import('./Icons'))

const NumberButton = (props) => {
    const {amount, minValue} = props;
    const handleChange = (e) => {
        if(typeof props.change === "function"){
            let _v = parseInt(e.target.value)
            if(_v>=0 && _v<=2000){
                props.change(_v);
            }
        }
    }  
    const _minus = () => {
        if(typeof props.change === "function"){
            let _v = amount - 10;
            if(_v>=minValue){
                props.change(_v);
            }
        }
    }    
    const _plus = () => {   
        if(typeof props.change === "function"){
            let _v = amount + 10;
            props.change(_v);
            if(_v>2000){
                props.change(2000);
            }else{
                props.change(_v);
            }
        }
    }    
    let isvalid = true;
    if(amount>2000 || amount<minValue){
        isvalid = false;
    }
    return(
        <div className={` _dsplFlx ${isvalid?"":'inValid'}`}>
            <div  className={`_groupBtn left active`}  onClick={_minus}>
                <Icon2 name={`minus`} />
            </div>
            <div className={`inptNumb`} >
                <input type="number" value={amount} onChange={handleChange}/>
            </div>
            <div  className={`_groupBtn right active`}  onClick={_plus} >
                <Icon2 name={`add`} />
            </div>
        </div>
    )
}

export default NumberButton