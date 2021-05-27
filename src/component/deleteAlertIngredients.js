import React from 'react'
import * as _Util from '../store/Util';
import { useDispatch } from 'react-redux'
import {  CloseModal } from '../actions/common'



const BTNH = _Util.BTNH_Cmpt();



const useObserveChanges = () => {

  const dispatch = useDispatch();  

  return { 
    dispatch
  }
}






const DeleteAlertReceiver = (props) => {
  const { data } = props;
  const {  modalID, title } = data;

  const {
    dispatch
  } = useObserveChanges();





  const remove = async () => {
    if(typeof props.confirm === "function"){
      props.confirm(modalID);
    }
  }


  return (
    <div {...modalID?{"dialog-key-id":modalID}:""}  className={`pym81b sendBx delete_alert_bx`}>
        <div className={`delete_alert_t1 `}>
            <div>
            {title}
            </div>
        </div>
        <div className={`delete_alert_t2 `}>
            <div>
            {'una vez eliminado no podra ser recuperado'}
            </div>
        </div>
        <div className={`sendBtn _dsplFlx spaceAround`}>
          <div className={`fieldPadding _MrgV`} style={{ marginTop: "10px"}}>
            <span onClick={()=>CloseModal(dispatch,{id:modalID})}>
              <BTNH theme={`light_blue`} title={`Cancelar`}/>
            </span>
          </div>          
          <div className={`fieldPadding _MrgV`} style={{ marginTop: "10px"}}>
            <span onClick={()=>remove()}>
              <BTNH theme={`fire_brick`} title={`Confirmar`}/>
            </span>
          </div>
        </div>
    </div>
    )
}


export default DeleteAlertReceiver