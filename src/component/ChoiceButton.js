
import React from 'react'
import Icon2 from './Icons';

import './_styles.css';

const ChoiceButton = (props) => {
    const {value, list, width} = props;
    const handleChange = (_v) => {
        if(typeof props.change === "function"){
            props.change(_v);
        }
    }   

    let dynW = width?{"style":{width:width}}:null;
    return(
        <div className={` _dsplFlx choiceBtn `}>
            <div  className={`_groupBtn _dsplFlx left ${value===list[0]?"active":''} `} {...dynW}  onClick={()=>handleChange(list[0])}>
                <Icon2 name="credit_card" />
                <span>{list[0]}</span>
            </div>
            <div  className={`_groupBtn _dsplFlx center ${value===list[1]?"active":''}`} {...dynW} onClick={()=>handleChange(list[1])} >
                <Icon2 name="credit_card" />
                <span>{list[1]}</span>
            </div>
            <div  className={`_groupBtn _dsplFlx center ${value===list[2]?"active":''}`} {...dynW} onClick={()=>handleChange(list[2])} >
                <Icon2 name="cash_bill" />
                <span>{list[2]}</span>
            </div>
            <div  className={`_groupBtn _dsplFlx right ${value===list[3]?"active":''}`} {...dynW} onClick={()=>handleChange(list[3])} >
                <Icon2 name="cash_bill" />
                <span>{list[3]}</span>
            </div>
        </div>
    )
}

export default ChoiceButton