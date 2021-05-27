

import React, { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'



import { withRouter} from 'react-router-dom';


import { 
  loadReceivers,
  OpenModal
} 
from '../../../actions/common'



import * as _Util from '../../../store/Util'

import '../../_styles.css'


const BTNH = _Util.BTNH_Cmpt();

const Icon2 = _Util.Icon_Cmpt();
const ScrollDc =  _Util.ScrollDc_Cmpt();
const InputText =  _Util.InputText_Cmpt();



const LoadingColorSpinner=  _Util.LoadingColorSpinner_Cmpt();



const InputAutocomplete = _Util.InputAutocomplete_Cmpt(); 





const ModalDate =  _Util.ModalDate_Cmpt();









const _formName = "243876nt5fdgomwy"



const vldFlds2 = {
  import:{reqired: true, number: true,minValue:0.10, maxValue:250000},
  date:{reqired:true},
  title:{reqired: true},
  group:{reqired: true},
}



const useObserveChanges = () => {
  const observeChanges =  useSelector(state => state.observeChanges);
  const dispatch = useDispatch(); 

  const LoadUA = async (dis) => {
    let flds = ["id","name","email","isqvmAgent", "isAdmin"]
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





const useObserveForms = () => {
  const observeForms =  useSelector(state => state.observeForms);
  const dispatch = useDispatch(); 


  const _updFormObs = (q,operation) => {
    dispatch({
      type: 'UPD_KEY_VALUE',
      kv:{key:'observeForms',value:_Util.gen12CodeId()}
    })
  }

 
  return { 
    _updFormObs,
    observeForms
  }
}

  








const SendersComponent = (props) => {
  const {
    dispatch,LoadUA
  } = useObserveChanges();


  const {
    _updFormObs
  } = useObserveForms();
  




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
      setTimeout(()=>setView(true),50);
      
    }
  });
  

  let fld2Prs = [
    'id',
    'title',
    "group",
    "date",
    "import",
    "user",
    "description"
  ];    

let userA = _Util.getBrowser();
  
let isMobile = userA.os === "Android" || userA.os === "iPhone" || _state["outerWidth"]<550 ;


const [searchQ, setSearch] = useState("");


var viewType = _state["ViewTypeMov"];



const [validForm, setIsValidForm] = useState(false);

const [saving, setSaving] = useState(0);



const _form = _Util.getFormStore(_formName) || {};



const _save = async () => {
  let frm =  _Util.getFormStore(_formName);
  let _2Fs = frm || {};     
  let _2s = {};
  _2Fs && fld2Prs.map(fld=>{
    _2s[fld] = _2Fs[fld];
  })    
  let vld = vldFlds2;
  if(!_2s["date"]){
    _2s["date"] = (new Date()).getTime();
  }
  var _Valid = _Util.validations(vld,_2s);   
  if(_Valid.valid){      
    if(!_2s["description"]){
      _2s["description"] = "";
    }
    _2s["user"] = _Util.getProfileId();

    let queryQ  = _2s["id"]?viewType===2? "upgradeIncomes" : "upgradeExpenses":viewType===2? "addIncome" : "addGastos";
    
    let Qry = {
      form:_2s,
      query: queryQ
    };
    setSaving(1);
    const res = _Util.fetchStream_movie_data(_Util.get_GRAPHQLURL(),Qry);
    const td = await res;
    if(td){
      _formName && _Util.updFormStore(_formName,{});
      _state["route_history"].push({pathname:"/finance"})
      setSaving(0);
    }else{
      setSaving(0);
    }
    
  }
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
    data['zIndex']=190;
    data['observeResize']=true;
    data['props']={title:"", item:i};
    data['content'] = <ModalDate valueUpdate={(e)=>callBackDate(i,e)} initValue={_date}/>; 
    OpenModal(dispatch,data);
  }






  const handleInput = (v,f) => {
    let frm =  _form;
    frm[f] = v
    _Util.updFormStore(_formName,frm)
    validateFields()
  }



  let _idType = viewType===2? "ingresos" : "gastos";
  let Groups  = _state["Groups"]; 
  let categoryList  = groupbyType(Groups,_idType,searchQ); 

  console.log(categoryList)  
  

  



  const validateFields = (v,f) => {  
    let frm =  _Util.getFormStore(_formName);       
    let _2Fs = frm || {};     
    let _2s = {};

    
    _2Fs && fld2Prs.map(fld=>{
      _2s[fld] = _2Fs[fld];
    })   
    
    if(!_2s["date"]){
      _2s["date"] = (new Date()).getTime();
    }
    let vld = vldFlds2;
    var _Valid = _Util.validations(vld,_2s);
    if(_Valid.valid){
      setIsValidForm(true)
    }else{
      setIsValidForm(false)
    }
    _updFormObs();
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

         <div className={isMobile?"mrgAuT":`centerListCardProd `}> 
            {validForm?saving?
                  <div className={` _dsplFlx _flxWrp spaceAround`}>   
                    <div className={`_dsplFlx saving_form`}>
                      <LoadingColorSpinner stroke={'#1a73e8'} height={40} width={40}/>
                      <span>
                        {_Util.translatetext(212)} ....
                      </span>
                    </div>
                  </div>
                  :
                  <div className={`pym81b sendBx mov_type _dsplFlx activeBlue _svFrm`} onClick={()=>_save()}>
                    <div className={`icon_mov`}>
                      <Icon2 name={`plus`} />
                    </div>
                    <div className={`mov_type_title `}>
                      {_Util.translatetext(_form["id"]?67:12)}
                    </div>
                    <div className={`flexSpace`}/>                    
                  </div>  
                  :null}
            <div className={`formContainer `} style={{opacity:1}}>  
              <div className={` _flxWrp HRKRR mrgAuT`}>

                
                <div className={`paddField address`}>
                    <InputAutocomplete 
                      icon={`more_vert`} 
                      form={_formName} 
                      field={`group`}  
                      keyCode={29} 
                      background={`#f9f9f9`}
                      color={`var(--base-color)`}
                      placeholder={_Util.translatetext(32)}
                      //  validations={vldFlds2[`categoryID`]}
                      initvalue={_form["group"]}
                      OnSelect={(e)=>handleInput(e.id,"group")}
                      data={categoryList}
                      OnChange={(e)=>setSearch(e)}
                    />
                  </div>


                  <div className={`paddField address`}>
                        <InputText 
                          icon={`more_vert`} 
                          form={_formName} 
                          field={`title`}  
                          keyCode={86} 
                          background={`#f9f9f9`}
                          color={`var(--base-color)`}
                          placeholder={_Util.translatetext(205)} 
                          OnChange={(e)=>handleInput(e,"title")}
                          //validations={vldFlds2[`desc`]}
                          initvalue={_form["title"]}
                        />
                      </div>

                <div className={` _dsplFlx _flxWrp spaceAround`}>               
                  <div className={`paddField smallTxtIn`}>
                        <InputText 
                          icon={`more_vert`} 
                          form={_formName} 
                          field={`import`}  
                          keyCode={26} 
                          background={`#f9f9f9`}
                          color={`var(--base-color)`}
                          placeholder={_Util.translatetext(15)} 
                          OnChange={(e)=>handleInput(e,"import")}
                          validations={vldFlds2[`import`]}
                          initvalue={_form["import"]}
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

                  <div className={`paddField address`}>
                        <InputText 
                          icon={`more_vert`} 
                          form={_formName} 
                          field={`description`}  
                          keyCode={81} 
                          background={`#f9f9f9`}
                          color={`var(--base-color)`}
                          placeholder={_Util.translatetext(37)} 
                          OnChange={(e)=>handleInput(e,"description")}
                          //validations={vldFlds2[`desc`]}
                          initvalue={_form["description"]}
                        />
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


//allowInventory

function searchAgents(o,q){
  let rrs = {}
  _Util.ObjectKeys(o).map(k=>{
    if(o[k]["isqvmAgent"]){
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
    }
    
  })
  return rrs;
} 





export function groupbyType(obj,type,q) {
  let h = {}
  obj && _Util.ObjectKeys(obj).map((d)=>{
    if(d){
      let nLw = obj[d]["type"] && obj[d]["type"].toLowerCase();
      let nMn = obj[d]["name"] && obj[d]["name"].toLowerCase();
      if(q){
        let qLw = q.toLowerCase();
        if((type===nLw && nMn.indexOf(qLw)>=0)){
          h[d] = obj[d];
        }
      }else{
        if(type===nLw){
          h[d] = obj[d];
        }
      }
    } 
  })
  return h;
}