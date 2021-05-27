import React, { useState } from 'react'

import { useDispatch, useSelector } from 'react-redux'


import {  CloseModal} 
from '../../../actions/common'

import * as _Util from '../../../store/Util';

const BTNH = _Util.BTNH_Cmpt();


const InputText =  _Util.InputText_Cmpt();


const InputAutocomplete = _Util.InputAutocomplete_Cmpt(); 



const useObserveChanges = () => {

  const dispatch = useDispatch();  

  return { 
    dispatch
  }
}


const DeleteAlertReceiver = (props) => {
  const { data } = props;
  const {  modalID, item , showType } = data;

  const {
    dispatch
  } = useObserveChanges();

  
 

  const remove = async () => {   
    if(typeof props.confirm === "function"){
      props.confirm(modalID);
    }
  }

  let fnM = "addCategory";


  const handleInput = (v,f) => {
    let frm =  _Util.getFormStore(fnM) || {};
    frm[f]=v;
    _Util.updFormStore(fnM,frm);
    dispatch({
      type: 'UPD_KEY_VALUE',
      kv:{key:'observeChanges',value:_Util.gen12CodeId()}
    })
  }

  
  
  let initV =  _Util.getFormStore(fnM) || {};


  const clear = (v,f) => {
    CloseModal(dispatch,{id:modalID});
  }

  

  let categoryList = {
    "gastos":{name:"gastos"},
    "incomes":{name:"incomes"},
  }
 
  

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
            {`${_Util.translatetext(12)} ${_Util.translatetext(32)}`}
            </div>
        </div>
        <div className={`delete_alert_t2 `}>
          <div>
            { item && item["name"]}
          </div>
        </div>

        {showType?
          <div className={`paddField address`}>
           <InputAutocomplete 
             icon={`more_vert`} 
             form={fnM} 
             field={`type`}  
             keyCode={29} 
             background={`#f9f9f9`}
             color={`var(--base-color)`}
             placeholder={"Type"}
             //  validations={vldFlds2[`categoryID`]}
             initvalue={initV["type"]}
             OnSelect={(e)=>handleInput(e.name,"type")}
             data={categoryList}
           />
         </div>
        :null}

        
      <div className={`paddField palette`}>
          <InputText 
            icon={`more_vert`} 
            form={fnM} 
            field={`name`}  
            keyCode={39} 
            background={`#f9f9f9`}
            color={`var(--base-color)`}
            placeholder={_Util.translatetext(34)} 
            OnChange={(e)=>handleInput(e,`name`)}
            validations={{reqired: true}}
            initvalue={initV[`name`]}
          />
        </div>


        <div className={`sendBtn _dsplFlx spaceAround`}>
          <div className={`fieldPadding _MrgV`} style={{ marginTop: "10px"}}>
            <span onClick={()=>clear()}>
              <BTNH theme={``} title={_Util.translatetext(210)}/>
            </span>
          </div>
          <div className={`fieldPadding _MrgV`} style={{ marginTop: "10px"}}>
            <span onClick={()=>remove()}>
              <BTNH theme={`light_blue`} title={_Util.translatetext(12)}/>
            </span>
          </div>
        </div>
    </div>
    )
}


export default DeleteAlertReceiver