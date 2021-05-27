import React, { useState } from 'react'

import { useDispatch, useSelector } from 'react-redux'


import * as _Util from '../../../store/Util';
import '../../_styles.css'





const BTNH = _Util.BTNH_Cmpt();

const Icon2 = _Util.Icon_Cmpt();



const InputAutocomplete = _Util.InputAutocomplete_Cmpt(); 

const InputText =  _Util.InputText_Cmpt();





const useObserveChanges = () => {

  const dispatch = useDispatch();  

  return { 
    dispatch
  }
}


const DeleteAlertReceiver = (props) => {
  const { data, closePop } = props;
  const {  modalID, item  } = data || {};
  const {
    dispatch
  } = useObserveChanges();

  
  let _state = _Util.getStore();
  const addPr2cmb = _state["addPr2cmb"] || {}; 
  const idI = item && item["id"];

  const [searchQ, setSearch] = useState("");
  const [prodID, setprodID] = useState(null);
  const [prodQty, setprodQty] = useState(null);

  
  
  
  let fnM = "addPr2cmb_"+idI ;


  const clear = (v,f) => {
    setprodID(null)
    setprodQty(null)
    _Util.updFormStore(fnM,{});
    dispatch({
      type: 'UPD_KEY_VALUE',
      kv:{key:'observeForms',value:_Util.gen12CodeId()}
    })
  }

 
 


  const setprodobjID = (v,f) => {
    setprodID(v["id"])
  }
  
  


  const confirm = async () => {   
    let prcStck = _state["stockProduct"] && _state["stockProduct"][prodID]&& _state["stockProduct"][prodID]["stock"];   
    let prc = prcStck && (prcStck["amount"] / prcStck["stockIn"]);
    if(prc){
      if(typeof props.confirm === "function"){      
        props.confirm(prodID,prodQty,prc);
      }
      closePop();
    }
  }



  let prList = {}
  if(_Util.IsAdmin() && searchQ && searchQ.length>0){
    prList = _Util.parseAutoFilterObj(_state["stockProduct"],"name",searchQ);
  }

 


  return (
    <div {...modalID?{"dialog-key-id":modalID}:""}  className={`add_prod_cmb`}>
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
            {'Add Product to Combo'}
            </div>
        </div>
        <div className={`paddField palette`}>
          <InputText 
            icon={`more_vert`} 
            form={fnM} 
            field={`qty`}  
            keyCode={39} 
            background={`#f9f9f9`}
            color={`rgb(21, 100, 191,1)`}
            placeholder={`Cantidad`} 
            OnChange={(e)=>setprodQty(e)}
            validations={{reqired: true, number: true, maxValue:50000}}
          />
        </div>
        <div className={`paddField address`}>
          <InputAutocomplete 
            icon={`more_vert`} 
            form={"_add_prod_cmb"} 
            field={`productID`}  
            keyCode={29} 
            background={`#f9f9f9`}
            color={`rgb(21, 100, 191,1)`}
            placeholder={`Productos`}
            OnSelect={(e)=>setprodobjID(e)}
            data={prList}
            OnChange={(e)=>setSearch(e)}
          />
        </div> 

        <div className={`sendBtn _dsplFlx spaceAround`}>
          <div className={`fieldPadding _MrgV`} style={{ marginTop: "10px"}}>
            <span onClick={()=>clear()}>
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



