import React, { useState } from 'react'

import { useDispatch, useSelector } from 'react-redux'


import {  CloseModal} 
from '../../../actions/common'

import * as _Util from '../../../store/Util';

const BTNH = _Util.BTNH_Cmpt();


const InputText =  _Util.InputText_Cmpt();



const useObserveChanges = () => {

  const dispatch = useDispatch();  

  return { 
    dispatch
  }
}


const DeleteAlertReceiver = (props) => {
  const { data } = props;
  const {  modalID, item  } = data;

  const {
    dispatch
  } = useObserveChanges();

  
  let _state = _Util.getStore();
  const inv2upd = _state["inv2upd"] || {}; 
  const idI = item && item["id"];


  const remove = async () => {   
    if(typeof props.confirm === "function"){
      props.confirm();
    }
    CloseModal(dispatch,{id:modalID});
  }

  

  const handleInput = (v,f) => {
    let frm = inv2upd;
    if(!frm[idI]){
      frm[idI] = {};
    }
    frm[idI][f] = v;
    _Util.updStore('inv2upd',frm);
    dispatch({
      type: 'UPD_KEY_VALUE',
      kv:{key:'observeChanges',value:_Util.gen12CodeId()}
    })
  }

  
  let fnM = "inv2upd_"+idI;


  const clear = (v,f) => {
    let frm = inv2upd;
    delete frm[idI];
    console.log(frm)
    _Util.updStore('inv2upd',frm);
    
    dispatch({
      type: 'UPD_KEY_VALUE',
      kv:{key:'observeChanges',value:_Util.gen12CodeId()}
    })
    _Util.updFormStore(fnM,{});
    dispatch({
      type: 'UPD_KEY_VALUE',
      kv:{key:'observeForms',value:_Util.gen12CodeId()}
    })
  }

  let initV = inv2upd[idI] || {};
 
  

  return (
    <div {...modalID?{"dialog-key-id":modalID}:""}  className={`pym81b sendBx upd_alert_bx`}>
      <style>
        {`
        .palette{
          --base-color: rgb(21, 100, 191,1);
          --base-color-gradient: 21, 100, 191;
        }
        `}
        </style>
        <div className={`delete_alert_t1 `}>
            <div>
            {`${_Util.translatetext(67)} ${_Util.translatetext(5)}`}
            </div>
        </div>
        <div className={`delete_alert_t2 `}>
          <div>
            { item && item["name"]}
          </div>
        </div>

        <div className={`paddField palette`}>
          <InputText 
            icon={`more_vert`} 
            form={fnM} 
            field={`qty`}  
            keyCode={39} 
            background={`#f9f9f9`}
            color={`var(--base-color)`}
            placeholder={_Util.translatetext(15)} 
            OnChange={(e)=>handleInput(e,`qty`)}
            validations={{reqired: true, number: true, minValue:0.1, maxValue:50000}}
            initvalue={initV[`qty`]}
          />
        </div>

        <div className={`paddField palette`}>
          <InputText 
            icon={`more_vert`} 
            form={fnM} 
            field={`price`}  
            keyCode={38} 
            background={`#f9f9f9`}
            color={`var(--base-color)`}
            placeholder={_Util.translatetext(16)} 
            OnChange={(e)=>handleInput(e,`price`)}
            validations={{reqired: true, number: true, minValue:0.1, maxValue:50000}}
            initvalue={initV[`price`]}
          />
        </div>

        <div className={`sendBtn _dsplFlx spaceAround`}>
          <div className={`fieldPadding _MrgV`} style={{ marginTop: "10px"}}>
            <span onClick={()=>clear()}>
              <BTNH theme={`fire_brick`} title={_Util.translatetext(79)}/>
            </span>
          </div>
          <div className={`fieldPadding _MrgV`} style={{ marginTop: "10px"}}>
            <span onClick={()=>remove()}>
              <BTNH theme={`light_blue`} title={_Util.translatetext(78)}/>
            </span>
          </div>
        </div>
    </div>
    )
}


export default DeleteAlertReceiver