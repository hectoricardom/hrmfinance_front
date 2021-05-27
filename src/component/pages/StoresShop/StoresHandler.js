

import React, { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'



import { withRouter} from 'react-router-dom';



import * as _Util from '../../../store/Util'

import '../../_styles.css'

import { 
  loadReceivers,
} from '../../../actions/common'





const InputText = _Util.InputText_Cmpt();

const BTNH = _Util.BTNH_Cmpt();

const Icon2 = _Util.Icon_Cmpt();

const InputAutocomplete = _Util.InputAutocomplete_Cmpt(); 




const _formName = "983432sd196sd5"





const useObserveChanges = () => {
  const observeChanges =  useSelector(state => state.observeChanges);
  const dispatch = useDispatch(); 

  
  const LoadUA = async (dis) => {
    let flds = ["id","name","email","allowInventory", "isAdmin"]
    let QryUser = {
      query:"getQueryUsersDetails",
      params:{userId:_Util.getUAd()},
      Collection:"Users",
      arraySerialization: _Util.isArraySerialization(),
      fields:flds,
    };
    const res = _Util.fetchStream_movie_data(_Util.get_GRAPHQLURL(),QryUser);
    const td = await res;
    if(td){
      let dZs = _Util.isArraySerialization()?_Util.deZerialize2Array(td,flds,1):td;
      _Util.updStore('agentsList',dZs);
      dispatch({
        type: 'UPD_KEY_VALUE',
        kv:{key:'observeChanges',value:_Util.gen12CodeId()}
      })
    }
  }
  
  return { 
    observeChanges,
    LoadUA,
    dispatch,
  }
}





const SendersComponent = (props) => {
  const {
    dispatch,LoadUA
  } = useObserveChanges();


  let _state = _Util.getStore();
  let keys = _Util.getGlobalsKeys()
  _state["keys"] = keys;

  

  const [initialize, setInitialize] = useState(false);

  const [widthScreen, setWidthScreen] = useState(null);

  const [view, setView] = useState(false);



  let outerWidth = _state["outerWidth"];

  const searchHash = window.location.hash.split('?')[1]?window.location.hash.split('?')[1]:null;
 


  let _userId = _Util.getProfileId();
  useEffect(() => {  
    if(widthScreen!==outerWidth){
      setWidthScreen(outerWidth);
    } 
    if(!initialize){
      setInitialize(true);
      LoadUA();
      loadReceivers(_userId,_userId,dispatch);
      setTimeout(()=>setView(true),50);
    }
  });
  

let userA = _Util.getBrowser();
  
let isMobile = userA.os === "Android" || userA.os === "iPhone" || _state["outerWidth"]<550 ;


const [searchA, setSearchA] = useState("");



let fld2Prs = ["userID","name","providerId","description","imageUrl"];


const _save = async () => {
  let frm =  _Util.getFormStore(_formName);
  let _2Fs = frm || {};     
  let _2s = {};
  _2Fs && fld2Prs.map(fld=>{
    _2s[fld] = _2Fs[fld];
  })    
  let vld = vldFlds;
  var _Valid = _Util.validations(vld,_2s);   
  if(_Valid.valid){      
    if(!_2s["description"]){
      _2s["description"] = "";
    }
    
    let Qry = {
      form:_2s,
      fields:[
        "id","name",
      ],
      query:"upgradeStoreMarket"
    };
  
    const res = _Util.fetchStream_movie_data(_Util.get_GRAPHQLURL(),Qry);
    const td = await res;
    if(td){
      _formName && _Util.updFormStore(_formName,{});
      _state["route_history"].push({pathname:"/inventory"});
    }
  }
}

const _form = _Util.getFormStore(_formName) || {};



const handleInput = (v,f) => {
  let frm =  _form;
  frm[f] = v
  _Util.updFormStore(_formName,frm)
  // validateFields()
}




const vldFlds = {
  name:{reqired:true, minLength:3}
}



  let agentsList = {}
  if(searchA && searchA.length>0){
    agentsList = searchAgents(_state["agentsList"],searchA);

  }else{
    agentsList = searchAgents(_state["agentsList"],"");
  }



  const handleInputAutoProv = (v,f) => {
    let frm =  _form;
    frm[f] = v.id
    _Util.updFormStore(_formName,frm);
  }


    return (
      <>
        <style>
        {`
        .palette{
          --base-color: rgb(21, 100, 191,1);
          --base-color-gradient: 21, 100, 191;
        }
        `}
        </style>

        <div className={`palette  formContainer   InfoM ${isMobile?"is_mobile":""}`} style={{opacity:view?1:0}} >
          <div className={`centerListCardProd ${isMobile?"mrg_15_tp":""}`}> 
            <div className={`formContainer  `} style={{opacity:1}}>  
              <div className={`_dsplFlx spaceAround _flxWrp mwAuM`}>

                <div className={`_dsplFlx spaceAround d_w100p`}>
                  {_Util.IsAdmin()?
                      <div className={`paddField inp_w360`}>
                        <InputAutocomplete 
                          icon={`more_vert`} 
                          form={_formName} 
                          field={`agentId`}
                          keyCode={19} 
                          background={`#f9f9f9`}
                          color={`var(--base-color)`}
                          placeholder={`Agente`}
                          //  validations={vldFlds2[`categoryID`]}
                          initvalue={_form["agentId"]}
                          OnSelect={(e)=>handleInputAutoProv(e,`agentId`)}
                          data={agentsList}
                          OnChange={(e)=>setSearchA(e)}
                        />
                      </div>
                      :null}
                </div>
                
                  <div className={`paddField inp_w360`}>
                        <InputText 
                          icon={`more_vert`} 
                          form={_formName} 
                          field={`name`}  
                          keyCode={27} 
                          placeholder={`${_Util.translatetext(34)}`} 
                          background={`#f9f9f9`}
                          color={`var(--base-color)`}
                          OnChange={(e)=>handleInput(e,`name`)}
                          validations={vldFlds[`name`]}
                          initvalue={_form["name"]}
                        />
                      </div>
                      <div className={`paddField inp_w360`}>
                          <InputText 
                            icon={`more_vert`} 
                            form={_formName} 
                            field={`imageUrl`}  
                            keyCode={23} 
                            background={`#f9f9f9`}
                            color={`var(--base-color)`}
                            placeholder={_Util.translatetext(36)}
                            initvalue={_form["imageUrl"]}
                            OnChange={(e)=>handleInput(e,`imageUrl`)}
                          />
                      </div>

                      <div className={`paddField inp_w360`}>
                          <InputText 
                            icon={`more_vert`} 
                            form={_formName} 
                            field={`address`}  
                            keyCode={71} 
                            background={`#f9f9f9`}
                            color={`var(--base-color)`}
                            placeholder={_Util.translatetext(60)}
                            initvalue={_form["address"]}
                            OnChange={(e)=>handleInput(e,`address`)}
                          />
                      </div>

                      <div className={`paddField inp_w360`}>
                          <InputText 
                            icon={`more_vert`} 
                            form={_formName} 
                            field={`description`}  
                            keyCode={73} 
                            background={`#f9f9f9`}
                            color={`var(--base-color)`}
                            placeholder={_Util.translatetext(37)}
                            initvalue={_form["description"]}
                            OnChange={(e)=>handleInput(e,`description`)}
                          />
                      </div>
                      
                     



                  <div className={`pym81b sendBx mov_type _dsplFlx activeBlue `} onClick={()=>_save()}>
                    <div className={`icon_mov`}>
                      <Icon2 name={`market`} />
                    </div>
                    <div className={`mov_type_title `}>
                      {_Util.translatetext(12)}
                    </div>
                    <div className={`flexSpace`}/>                    
                  </div> 
                </div>
              </div>
          </div>
        </div>
      </>
    );
  
}  



/*

return(
                              <div className={`_dsplFlx`}>
                                <div className={`_value`}>
                                  {prodItm && prodItm["name"]}
                                </div>
                                <div className={`flexSpace`}/>
                                <div className={`_value`}>
                                  {prodItm && prodItm["qty"]}
                                </div>
                                <div className={`_value`}>
                                  {prodItm && prodItm["unit"]?`(${prodItm["unit"]})`:""}
                                </div>
                                {viewUpdProd?    
                                <div className={`icon_mov`}  onClick={()=>updProduct(prId,hasProducts[prId])}>
                                  <Icon2 name={`success`} />
                                </div>
                                :null
                                }
                              </div>
                            )



  <div class="sh-div__zoomed" data-ih="1000" data-iw="1000" style="background-image:url(https://encrypted-tbn1.gstatic.com/shopping?q=tbn:ANd9GcRCtzg2hxRcRsKWk0rMztnz3SJswdtiDeLLZ-cg0ttYiHtv0JpFFM0iumy7s9_D7ID0Op5ri9BeAE4tn3eqR2xUf61OjQ66&amp;usqp=CAY)"></div>
  <div class="sh-div__zoomed" data-ih="1000" data-iw="1000" style="background-image:url(https://encrypted-tbn2.gstatic.com/shopping?q=tbn:ANd9GcSSn4ILkx166Dku-6stH5dAQJR7m5ChOVJRXEqImcX45_Gwn2kygUmDO3F0JxQmadgheSPSe1jU0MYurPSIfP9JZMj97jKRsQ&amp;usqp=CAY)"></div>
  <div class="sh-div__zoomed" data-ih="1000" data-iw="1000" style="background-image:url(https://encrypted-tbn2.gstatic.com/shopping?q=tbn:ANd9GcR9tUvXrkgHJRDg_2C_bHEuFY-W4PIDMjb8FeoNvpGSDrWTaAXzDFEZKPrJvQ-EunLKWc39Lm4WsTlZ-ffE0v6ah7J_smDIRw&amp;usqp=CAY)"></div>
  <div class="sh-div__zoomed" data-ih="1000" data-iw="1000" style="background-image:url(https://encrypted-tbn1.gstatic.com/shopping?q=tbn:ANd9GcTMlGTd9PnGge9QuK1-E7eLYPydiP0nisv-PAMSjHLUrm2eaEylfn20aOWxEFzRztjDEDIQCkQSyPMLFSgH2rHzAGKkToqjOA&amp;usqp=CAY)"></div>
*/



export default withRouter(SendersComponent)




const isEntrega = (type) => {
  return type === "Entrega" || type === "REM_CARD_CUP" || type === "REM_CARD_MLC" || type === "REM_CASH_USD" || type === "REM_CASH_CUP" || type === "COMBO";
}

function searchb(o,q){
  let rrs = {}
  _Util.ObjectKeys(o).map(k=>{
    let qLw = q && q.toLowerCase();
    let nLw = o[k]["name"] && o[k]["name"].toLowerCase();
    if(qLw && nLw && nLw.indexOf(qLw)>=0){
      rrs[k] = o[k]
    }
  })
  return rrs;
} 


function searchAgents(o,q){
  let rrs = {}
  _Util.ObjectKeys(o).map(k=>{
    if(o[k]["allowInventory"]){
      if(q){
        let qLw = q.toLowerCase();
        let nLw = o[k]["name"] && o[k]["name"].toLowerCase();
        if(qLw && nLw && nLw.indexOf(qLw)>=0){
          rrs[k] = o[k];
        }
      }
      else{
        rrs[k] = o[k];
      }
    }
    
  })

  return rrs;
} 