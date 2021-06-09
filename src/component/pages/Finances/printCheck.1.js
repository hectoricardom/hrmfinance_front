import React, { useState } from 'react'

import { useDispatch, useSelector } from 'react-redux'


import {  CloseModal, OpenModal } from '../../../actions/common'




import * as _Util from '../../../store/Util';


const BTNH = _Util.BTNH_Cmpt();

const InputText =  _Util.InputText_Cmpt();


const ModalDate =  _Util.ModalDate_Cmpt();


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


  let _formName = "print_check" ;

  
  const _form = _Util.getFormStore(_formName) || {};




  const confirm = async () => {   
    if(typeof props.confirm === "function"){
      props.confirm(idI);
    }
    CloseModal(dispatch,{id:modalID});
  }
  

 

  const handleInput = (v,f) => {
    let frm =  _form;
    frm[f] = v
    _Util.updFormStore(_formName,frm)
  }


  
const callBackDate= (f,v) => {
  let dD = new Date(v);  
  let _formD = _Util.getFormStore(_formName) || {};
  let frm =  _formD;
  frm[f] = dD.getTime();
  _Util.updFormStore(_formName,frm)
}


const OpenModalDate = (i) => {
    let data = {};   
    let _formD = _Util.getFormStore(_formName) || {};
    let  _date = _formD && _formD[i];
    data['zIndex']=990;
    data['observeResize']=true;
    data['props']={title:"", item:i};
    data['content'] = <ModalDate valueUpdate={(e)=>callBackDate(i,e)} initValue={_date}/>; 
    OpenModal(dispatch,data);
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
            {'Imprimir Check'}
            </div>
        </div>
        <div className={`delete_alert_t2 `}>
          <div>
            { item && item["name"]}
          </div>
        </div>
        <div className={`palette`}>
          <div className={`paddField address`}>
            <InputText 
              icon={`more_vert`} 
              form={_formName} 
              field={`pay2`}  
              keyCode={27} 
              placeholder={`Pagar a`} 
              background={`#f9f9f9`}
              color={`var(--base-color)`}
              OnChange={(e)=>handleInput(e,`pay2`)}
              initvalue={_form["pay2"]}
            />
          </div>
          <div className={`paddField palette`}>
            <InputText 
              icon={`more_vert`} 
              form={_formName} 
              field={`qty`}  
              keyCode={39} 
              background={`#f9f9f9`}
              color={`var(--base-color)`}
              placeholder={`Cantidad`} 
              OnChange={(e)=>setqty(e)}
              validations={{reqired: true, number: true}}
              initvalue={_form["qty"]}
            />
          </div>
          <div className={`paddField address`}>
            <InputText 
              icon={`more_vert`} 
              form={_formName} 
              field={`description`}  
              keyCode={35} 
              placeholder={`detalles`} 
              background={`#f9f9f9`}
              color={`var(--base-color)`}
              OnChange={(e)=>handleInput(e,`description`)}
              initvalue={_form["description"]}
            />
          </div>

          <div className={`paddField smallTxtIn`}>
            <div className={`fieldPadding _MrgV`}>
              <span onClick={()=>OpenModalDate( `date` )}>
                <BTNH theme={`light_blue`} title={_form && _form["date"]?_Util.parseDate(_form["date"]):_Util.parseDate(_Util.gTm())}/>
              </span>
            </div>
          </div>
        </div>
        <div className={`sendBtn _dsplFlx spaceAround`}>
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