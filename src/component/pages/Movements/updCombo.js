import React, { useState } from 'react'

import { useDispatch, useSelector } from 'react-redux'


import {  CloseModal } from '../actions/common'




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
  const {  modalID, item , id } = data;

  const {
    dispatch
  } = useObserveChanges();

  
  const [qty, setqty] = useState(0);

  const idI = id;

  let v = qty || item["qty"];
  
  const remove = async () => {   
    if(typeof props.remove === "function"){
      props.remove(idI);
    }
    CloseModal(dispatch,{id:modalID});
  }


  const confirm = async () => {   
    if(typeof props.confirm === "function"){
      props.confirm(idI,v);
    }
    CloseModal(dispatch,{id:modalID});
  }
  

 

  
  let fnM = "inv2upd_"+idI ;

 

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
            {'Actualizar Inventario'}
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
            placeholder={`Cantidad`} 
            OnChange={(e)=>setqty(e)}
            validations={{reqired: true, number: true}}
            initvalue={v}
          />
        </div>
        <div className={`sendBtn _dsplFlx spaceAround`}>
          <div className={`fieldPadding _MrgV`} style={{ marginTop: "10px"}}>
            <span onClick={()=>remove()}>
              <BTNH theme={`fire_brick`} title={`Borrar`}/>
            </span>
          </div>
          <div className={`fieldPadding _MrgV`} style={{ marginTop: "10px"}}>
            <span onClick={()=>confirm()}>
              <BTNH theme={`light_blue`} title={`Confirmar`}/>
            </span>
          </div>
        </div>
    </div>
    )
}


export default DeleteAlertReceiver