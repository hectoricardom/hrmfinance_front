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


  const select = async (m) => {   
    if(typeof props.confirm === "function"){
      props.confirm(modalID, m);
    }
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

  
  let fnM = "addCategory";


  const clear = (v,f) => {
    CloseModal(dispatch,{id:modalID});
  }

  let initV = inv2upd[idI] || {};
 

  const monthsList_Short =[`Jan`,`Feb`,`Mar`,`Apr`,`May`,`Jun`,`Jul`,`Aug`,`Sep`,`Oct`,`Nov`,`Dec`];

  let monthList = Array.from(Array(12).keys());
  
  let filtersMov = _state["filtersMov"] || {}
  let currentMonth = filtersMov["month"]


  console.log("currentMonth",currentMonth)
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
            {`Meses of Year ${filtersMov["year"]} `}
            </div>
        </div>
        <div className={`delete_alert_t2 `}>
          <div>
           {`Escoja un mes para filtrar`}
          </div>
        </div>

        {monthList.map(mnt=>{
          return (
            <div className={`icon_open `}  onClick={()=>select(mnt)}>
              <BTNH theme={currentMonth===mnt?`blue_white`:`light_blue`} title={monthsList_Short[mnt]}/>
          </div>
          )
        }
        )}
    </div>
    )
}


export default DeleteAlertReceiver