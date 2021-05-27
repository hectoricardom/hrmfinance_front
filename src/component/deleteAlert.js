import React from 'react'
import * as _Util from '../store/Util';
import { useDispatch } from 'react-redux'
import loadable from '@loadable/component'
import {  CloseModal } from '../actions/common'



const BTN_f = loadable(() => import('./btns_confirm'))



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





  const removeReceiver = async () => {    
    let Qry = {
      params:{
        id:item
      },
      query:"deleteReceiver"
    };
    const res = _Util.fetchStream_movie_data(_Util.get_GRAPHQLURL(),Qry);
    const td = await res;
    if(td){
      let _state = _Util.getStore();
      const receiversList = _state["receiversList"] || {};
      delete receiversList[item];
      _Util.updStore('receiversList',receiversList);
      CloseModal(dispatch,{id:modalID})
      dispatch({
        type: 'UPD_KEY_VALUE',
        kv:{key:'observeChanges',value:_Util.gen12CodeId()}
      })
    }
  }
  




  return (
    <div {...modalID?{"dialog-key-id":modalID}:""}  className={`pym81b sendBx delete_alert_bx`}>
        <div className={`delete_alert_t1 `}>
            <div>
            {'Desea Eliminar este beneficiario'}
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
              <BTN_f theme={`light_blue`} title={`Cancelar`}/>
            </span>
          </div>          
          <div className={`fieldPadding _MrgV`} style={{ marginTop: "10px"}}>
            <span onClick={()=>removeReceiver()}>
              <BTN_f theme={`fire_brick`} title={`Confirmar`}/>
            </span>
          </div>
        </div>
    </div>
    )
}


export default DeleteAlertReceiver