import React from 'react'
import * as _Util from '../store/Util';
import { useDispatch } from 'react-redux'
import loadable from '@loadable/component'
import {  CloseModal } from '../actions/common'



const BTNH = loadable(() => import('./btns_confirm'))
const CheckBoxSlide = loadable(() => import('./CheckBoxSlide'))


const useObserveChanges = () => {

  const dispatch = useDispatch();  

  return { 
    dispatch
  }
}


const DeleteAlertReceiver = (props) => {
  const { data } = props;
  const {  modalID } = data;

  const {
    dispatch
  } = useObserveChanges();


  let _state = _Util.getStore();

  let userProfile = _state["userProfile"];


  const revokeAllScopes = () => {
    const gapi = window.gapi;
    const auth2 = gapi.auth2 && gapi.auth2.getAuthInstance();
    auth2.disconnect();
    _Util.updStore('userProfile',null);
    dispatch({
      type: 'UPD_KEY_VALUE',
      kv:{key:'observeChanges',value:_Util.gen12CodeId()}
    })
    CloseModal(dispatch,{id:modalID});
  }


  let lng = window.localStorage.getItem("language_profile");
  const updLng = (v) => { 
    window.localStorage.setItem("language_profile",v?"es":"en");
    _Util.updLang();
  }

 
  let inV = lng === "es"?true:false;

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
            { userProfile && userProfile["name"]}
            </div>
        </div>
        <div className={`delete_alert_t2 `}>
          <div>
            { userProfile && userProfile["email"]}
          </div>
        </div>

        <div className={`sendBtn _dsplFlx spaceAround _mrgSwith `}>    
          <div className={`in_stock_switch _dsplFlx`}>
            <span className={`sw_left_span `}>{"English"}</span>
            <div  className={`in_stock_switch_btn`}>
              <CheckBoxSlide initvalue={inV} keyCode={77} updChange={(e)=>updLng(e)}/>
            </div>
            <span className={`sw_rgh_span`}>{"Español"}</span>
            
          </div>
        </div>
        <div className={`sendBtn _dsplFlx spaceAround`}>          
          <div className={`fieldPadding _MrgV`} style={{ marginTop: "10px"}}>
            <span onClick={()=>revokeAllScopes()}>
              <BTNH theme={``} title={_Util.translatetext(10)}/>
            </span>
          </div>
        </div>
    </div>
    )
}


export default DeleteAlertReceiver