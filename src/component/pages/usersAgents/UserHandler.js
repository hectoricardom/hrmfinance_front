

import React, { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'


import { withRouter} from 'react-router-dom';



import * as _Util from '../../../store/Util'

import '../../_styles.css'

const Icon2 = _Util.Icon_Cmpt();

const InputAutocomplete = _Util.InputAutocomplete_Cmpt(); 

const InputText =  _Util.InputText_Cmpt();

const CheckBoxSlide =  _Util.CheckBoxSlide_Cmpt();

/*

const BTNH = _Util.BTNH_Cmpt();


const ModalDate =  _Util.ModalDate_Cmpt();


const LoadingColorSpinner=  _Util.LoadingColorSpinner_Cmpt();

const ScrollDc =  _Util.ScrollDc_Cmpt();


const DeleteAlertMov = _Util.DeleteAlertMov_Cmpt();

const SearchInput =  _Util.SearchInput_Cmpt();

*/





const _formName = "243876nt5fdgomwy"

const vldFlds2 = {
  amount:{reqired: true, number: true,minValue:10, maxValue:250000},
  agentId:{reqired:true},
  date:{reqired:true},
  tasa:{reqired: true, number: true, minValue:0.01, maxValue:1000},
}



const useObserveChanges = () => {
  const observeChanges =  useSelector(state => state.observeChanges);
  const dispatch = useDispatch(); 

  const LoadUA = async (dis) => {
    let flds = ["id","name","email","isqvmAgent", "telegram_chat_id","isDelivery","allowInventory"]
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
 

  useEffect(() => {  
    if(widthScreen!==outerWidth){
      setWidthScreen(outerWidth);
    } 
    if(!initialize){
      setInitialize(true);
      
      if(!_Util.IsAdmin()){
        _state["route_history"].push({pathname:"/marketplace"})
      }else{
        LoadUA();
        setTimeout(()=>{
          window.scrollTo(0,0);
        },350);
        setTimeout(()=>setView(true),50);
        window.localStorage.setItem("lng","es");
      }
    }
  });
  

let userA = _Util.getBrowser();
  
let isMobile = userA.os === "Android" || userA.os === "iPhone" || _state["outerWidth"]<550 ;


const [searchQ, setSearch] = useState("");
const [searchA, setSearchA] = useState("");



const [receiverId, setReceiverId] = useState(false);
const [amount, setAmount] = useState(false);
const [chatId, setchatId] = useState("");
const [agentId, setAgentId] = useState(null);
const [agentDestination, setAgentDestination] = useState(null);




const [collection, setCollection] = useState("");
const [oldUser, setOldUser] = useState("");



const confirmAgentId = (v) => {
  if(v && v.id){
    setAgentId(v.id);
    setSearch(null);
  }
}




const _form = _Util.getFormStore(_formName) || {};






let agentsList = _state["agentsList"] || {}
if(_Util.IsAdmin() && searchA && searchA.length>0){
  agentsList = searchb(_state["agentsList"],searchA);
}else{
  agentsList = searchb(_state["agentsList"],"");
}


let currAgnt = agentId &&  _state["agentsList"] && _state["agentsList"][agentId] || {}


const updUserByFld = async (f,v) => {
  let Qry = {
    params:{
      userId:currAgnt["id"],
      fld:f,
      value:v
    },
    query:"upgradeUserByAdmin"
  };
  
  if(currAgnt && currAgnt["id"]){
    const res = _Util.fetchStream_movie_data(_Util.get_GRAPHQLURL(),Qry);
    const td = await res;
    if(td && td[currAgnt["id"]]){
      agentsList[currAgnt["id"]] = td[currAgnt["id"]]
      _Util.updStore('agentsList',agentsList);
      dispatch({
        type: 'UPD_KEY_VALUE',
        kv:{key:'observeChanges',value:_Util.gen12CodeId()}
      })
    }
  }
}


const updUserchatID = async () => {
  let Qry = {
    params:{
      userId:currAgnt["id"],
      fld:"telegram_chat_id",
      value:chatId
    },
    query:"upgradeUserByAdmin"
  };
  
  if(currAgnt && currAgnt["id"]){
    const res = _Util.fetchStream_movie_data(_Util.get_GRAPHQLURL(),Qry);
    const td = await res;
    if(td && td[currAgnt["id"]]){
      agentsList[currAgnt["id"]] = td[currAgnt["id"]]
      _Util.updStore('agentsList',agentsList);
      dispatch({
        type: 'UPD_KEY_VALUE',
        kv:{key:'observeChanges',value:_Util.gen12CodeId()}
      })
    }
  }
}




const updUserColl = async () => {
  let Qry = {
    params:{
      newUser:currAgnt["id"],
      oldUser:oldUser["id"],
      Collection:collection
    },
    query:"updUserColl"
  };
  
  console.log(Qry)
  if(currAgnt && currAgnt["id"]){
    /* */
    const res = _Util.fetchStream_movie_data(_Util.get_GRAPHQLURL(),Qry);
    const td = await res;
    if(td && td[currAgnt["id"]]){
      agentsList[currAgnt["id"]] = td[currAgnt["id"]]
      _Util.updStore('agentsList',agentsList);
      dispatch({
        type: 'UPD_KEY_VALUE',
        kv:{key:'observeChanges',value:_Util.gen12CodeId()}
      })
    }
   
  }
}







    return (
      <>
        <style>
        {`
        .palette{
          --base-color: rgb(21, 100, 191,1);
          --base-color-gradient: 21, 100, 191;
          --base-color_telegram: #0088cc;
          --checkBox--button--color: #0088cc;
          --checkBox--button--Active--color: #0088cc;
        }
        `}
        </style>



        <div className={`palette  formContainer shopping_cart InfoM ${isMobile?"is_mobile":""}`} style={{opacity:view?1:0}} >
          <div className={`centerListCardProd `}> 
            <div className={`formContainer centerListCardProd `} style={{opacity:1}}>  
              <div className={` _flxWrp HUs`}>
                <div className={`paddField address`}>
                  <InputAutocomplete 
                    icon={`more_vert`} 
                    form={_formName} 
                    field={`agentId`}  
                    keyCode={49} 
                    background={`#f9f9f9`}
                    color={`var(--base-color)`}
                    placeholder={`Agente`}
                    //  validations={vldFlds2[`categoryID`]}
                    initvalue={_form["agentId"]}
                    OnSelect={(e)=>confirmAgentId(e)}
                    data={agentsList}
                    OnChange={(e)=>setSearchA(e)}
                  />
                </div>
                <div  className={`  headerTtl `}>
                  <div className={`mainTitle`}>
                      { currAgnt["id"]}
                    </div>
                    <div className={`descTitle`}>
                    { currAgnt["name"]}
                  </div>
                </div>

                {currAgnt && currAgnt["id"]?
                  <div>
                  <div className={`paddField address`}>
                  <InputAutocomplete 
                    icon={`more_vert`} 
                    form={_formName} 
                    field={`oldUser`}  
                    keyCode={79} 
                    background={`#f9f9f9`}
                    color={`var(--base-color)`}
                    placeholder={`Agente`}
                    //  validations={vldFlds2[`categoryID`]}
                    initvalue={_form["oldUser"]}
                    OnSelect={(e)=>setOldUser(e)}
                    data={agentsList}
                    OnChange={(e)=>setSearchA(e)}
                  />
                </div>
                <div className={`paddField paletteTlg`}>
                      <InputText 
                        icon={`more_vert`} 
                        form={_formName} 
                        field={`collection`}  
                        keyCode={33} 
                        background={`#f9f9f9`}
                        color={`var(--base-color_telegram)`}
                        placeholder={`Collection`} 
                        OnChange={(e)=>setCollection(e)}
                      />
                    </div>
                      <div className={`pym81b sendBx mov_type _dsplFlx telegram_color `} onClick={()=>updUserColl()} >
                        <div className={`icon_mov`}>
                          <Icon2 name={`telegram`} />
                        </div>
                        <div className={`mov_type_title `}>
                          {`Update Collection`}
                        </div>
                        <div className={`flexSpace`}/>                    
                      </div>

                </div>
                :null}

                {currAgnt && currAgnt["id"]?
                  <div>
                  <div className={`in_stock_switch _dsplFlx`}>
                    {`Is QvaMarket Agent`}
                    <div  className={`in_stock_switch_btn`}>
                      <CheckBoxSlide initvalue={currAgnt["isqvmAgent"]} keyCode={77} updChange={(e)=>updUserByFld("isqvmAgent",e)}/>
                    </div>
                  </div> 
                  <div className={`in_stock_switch _dsplFlx`}>
                    {`Is Reseller`}
                    <div  className={`in_stock_switch_btn`}>
                      <CheckBoxSlide initvalue={currAgnt["allowInventory"]} keyCode={73} updChange={(e)=>updUserByFld("allowInventory",e)}/>
                    </div>
                  </div>
                  <div className={`in_stock_switch _dsplFlx`}>
                    {`Is Delivery`}
                    <div  className={`in_stock_switch_btn`}>
                      <CheckBoxSlide initvalue={currAgnt["isDelivery"]} keyCode={75} updChange={(e)=>updUserByFld("isDelivery",e)}/>
                    </div>
                  </div> 

                  <div className={`in_stock_switch _dsplFlx`}>
                    {`Is Store`}
                    <div  className={`in_stock_switch_btn`}>
                      <CheckBoxSlide initvalue={currAgnt["isStore"]} keyCode={75} updChange={(e)=>updUserByFld("isStore",e)}/>
                    </div>
                  </div>
                  
                    <div className={`paddField paletteTlg`}>
                      <InputText 
                        icon={`more_vert`} 
                        form={_formName} 
                        field={`telegram_chat_id`}  
                        keyCode={36} 
                        background={`#f9f9f9`}
                        color={`var(--base-color_telegram)`}
                        placeholder={`Telegram Id`} 
                        OnChange={(e)=>setchatId(e)}
                        validations={vldFlds2[`telegram_chat_id`]}
                        initvalue={currAgnt["telegram_chat_id"]}
                      />
                    </div>
                      <div className={`pym81b sendBx mov_type _dsplFlx telegram_color `} onClick={()=>updUserchatID()} >
                        <div className={`icon_mov`}>
                          <Icon2 name={`telegram`} />
                        </div>
                        <div className={`mov_type_title `}>
                          {`Guardar Telegram ChatID`}
                        </div>
                        <div className={`flexSpace`}/>                    
                      </div>




                



                  </div>

                  :null}
                  
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




function searchb(o,q){
  let rrs = {}
  _Util.ObjectKeys(o).map(k=>{
    if(q){
      let qLw = q && q.toLowerCase();
      let nLw = o[k]["name"] && o[k]["name"].toLowerCase();
      if(qLw && nLw && nLw.indexOf(qLw)>=0){
        rrs[k] = o[k]
      }
    }
    else{
      rrs[k] = o[k]
    }
  })
  return rrs;
} 
