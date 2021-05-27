

import React, { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'



import { withRouter} from 'react-router-dom';



import * as _Util from '../../../store/Util'

import '../../_styles.css'



const BTNH = _Util.BTNH_Cmpt();



const InputAutocomplete = _Util.InputAutocomplete_Cmpt(); 

const InputText = _Util.InputText_Cmpt(); 









const useObserveChanges = () => {
  const observeChanges =  useSelector(state => state.observeChanges);
  const dispatch = useDispatch(); 


  const _openMd = (_id, item) => {
    let data = {};
    data['zIndex']=450;
    data['Id']=_id;
    data['observeResize']=true;    
    data['props']={item:item, minHeight: '1vh'};
    _Util.getCommon().OpenWatchDialog(dispatch,data);
  }

  const _LoadCities= (q) => {
    _Util.getCommon().fetchCities(q,dispatch);
  }

  const LoadUA = async (dis) => {
    let flds = ["id","name","email","isStore"]
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

  const _updRemesa = (q,operation) => {
    _Util.getCommon().fetchRemesa(q,dispatch)
  }

  
  return { 
    observeChanges,
    _LoadCities,
    dispatch,
    LoadUA,
    _updRemesa,
    _openMd
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

  














const EditProdComponent = (props) => {
  const {
    LoadUA,dispatch
  } = useObserveChanges();

  const {
    _updFormObs
  } = useObserveForms();
  


  let _state = _Util.getStore();
  let keys = _Util.getGlobalsKeys()
  _state["keys"] = keys;
  const _formName = 'add_ingredient';
  const _form = _Util.getFormStore(_formName) || {};


 
  const [initialize, setInitialize] = useState(false);

  const [widthScreen, setWidthScreen] = useState(null);


  const [catgList, setcatgList] = useState([]);

  const [catLoaded, setcatLoaded] = useState(false);
  
  const [providerId, setProviderId] = useState(null);
  
  
  
  const [validForm, setIsValidForm] = useState(false);
  const [formView, setformView] = useState(1);
  const [view, setView] = useState(false);

  const [obs, setObs] = useState(0);

  const [searchUnit, setSearchUnit] = useState(null);


  

  
  let fld2Prs = [
    'id',
    'name',
    "categoryID",
    "unit",
    "description",
    "providerId"
    
  ];    

  let outerWidth = _state["outerWidth"];



  let _userId = _Util.getProfileId();

  // const searchHash = window.location.hash.split('?')[1]?window.location.hash.split('?')[1]:null;
  // const router = _Util.parseQuery(searchHash);

  

  useEffect(() => {  
    if(widthScreen!==outerWidth){
      setWidthScreen(outerWidth);
    } 
    if(!initialize){
      setInitialize(true);
      if(!(_Util.IsAdmin() || _state["isStore"])){
          _state["route_history"].push({pathname:_state["isqvmAgent"]?"/ingredients_list":"/marketplace"});
      }else{
        if(_Util.IsAdmin()){
          LoadUA();
        }

        _Util.getCommon().LoadStoreMarkets();
        setTimeout(()=>window.scrollTo(0,0),350);
        setTimeout(()=>setView(true),50);
        let frm =  _Util.getFormStore(_formName);
        if(!frm || !frm["id"]){
          let _ncv = {}
          _Util.updFormStore(_formName,_ncv)
          _updFormObs();
        }
      }
    }
  });
  
  
  const handleInput = (v,f) => {
    let frm =  _form;
    frm[f] = v
    _Util.updFormStore(_formName,frm)
    validateFields()
  }


  const vldFlds = {
    name:{reqired:true, minLength:3},
    unit:{reqired:true, minLength:2},
    categoryID:{reqired:true}
  }


  

  const validateFields = (v,f) => {  
    let frm =  _Util.getFormStore(_formName);       
    let _2Fs = frm || {};     
    let _2s = {};
    _2Fs && fld2Prs.map(fld=>{
      _2s[fld] = _2Fs[fld];
    })    
    let vld = vldFlds;
    var _Valid = _Util.validations(vld,_2s); 
    if(_Valid.valid){
      setIsValidForm(true)
    }else{
      setIsValidForm(false)
    }
    _updFormObs();
  }



 
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
      if(_Util.IsAdmin()){
        if(providerId){
          _2s["providerId"] = providerId;
          _2s["userId"] = providerId;
        }
      }
      else{
        _2s["providerId"] = _userId;
        _2s["userId"] = _userId;
      }

      _updFormObs();
      let Qry = {
        form:_2s,
        fields:[
          "id","name",
        ],
        query:"upgradeIngredients"
      };
    
      const res = _Util.fetchStream_movie_data(_Util.get_GRAPHQLURL(),Qry);
      const td = await res;
      if(td){
        _formName && _Util.updFormStore(_formName,{});
        _state["route_history"].push({pathname:"/ingredients_list"})
      }
    }
  }


  const handleInputAutoReceive = (v,f) => {
    let frm =  _form;
    frm[f] = v.id
    _Util.updFormStore(_formName,frm)
    validateFields()
  }


  const handleInputAutoProv = (v,f) => {
    let frm =  _form;
    frm[f] = v.id
    _Util.updFormStore(_formName,frm)
    validateFields()
  }

 
  


  var _categoriesList = _state["categoriesProducts"];
  let _categoriesPrs = parseAutoObj(_categoriesList,"name")

  const setCategorieSearch = (v,f) => {
    if(v){
      _categoriesPrs = parseAutoFilterObj(_categoriesList,"name",v);
      setcatgList(_categoriesPrs);
    }else{
      _categoriesPrs = parseAutoObj(_categoriesList,"name");
      setcatgList(_categoriesPrs);
    }
    
  }


  if(_categoriesList && !catLoaded){
    _categoriesPrs = parseAutoObj(_categoriesList,"name");
    setcatgList(_categoriesPrs);
    setcatLoaded(true);
  }

 


  let userA = _Util.getBrowser();
  
  let isMobile = userA.os === "Android" || userA.os === "iPhone" || _state["outerWidth"]<550 ;
  

  const [searchA, setSearchA] = useState("");

  let agentsList = {}
  if(searchA && searchA.length>0){
    agentsList = searchAgents(_state["agentsList"],searchA);
  }
  else{
    agentsList = searchAgents(_state["agentsList"],"");
  }


  let unitMeasurement = {}
  if(searchUnit && searchUnit.length>0){
    unitMeasurement = parseAutoFilterObj(_state["unitMeasurement"],"name",searchUnit);
  }
  else{
    unitMeasurement = parseAutoFilterObj(_state["unitMeasurement"],"name","");
  }


  //{...modalID?{"dialog-key-id":modalID}:""}

    return (
        <div   className={` palette centerListCardProd formContainer ${isMobile?"is_mobile":""}`} style={{opacity:view?1:0, backgroundColor: "#f9f9f9", minHeight:"450px"}} >
          <style>
          {`
          .palette{
              --base-color: rgb(21, 100, 191,1);
              --base-color-gradient: 21, 100, 191;
          }

          `}
          </style>
          <div className={`formContainer  `} style={{opacity:1}}>
              {view?
                <div className={`  `}> 
                <div  className={`  headerTtl `}>
                  <div className={`mainTitle`}>
                      {_form && _form["id"]?`${_Util.translatetext(67)} ${""}`:`${_Util.translatetext(12)} ${""}`}
                    </div>
                </div>
                <div className={``}>
                  <div className={`formContainer`} style={{opacity:1}}>
                  {true?
                  <div className={`pym81b sendBx `}>
                    <div className={`_dsplFlx spaceAround _flxWrp`}>
                    {_Util.IsAdmin()?
                      <div className={`paddField address`}>
                        <InputAutocomplete 
                          icon={`more_vert`} 
                          form={_formName} 
                          field={`providerId`}  
                          keyCode={19} 
                          background={`#f9f9f9`}
                          color={`var(--base-color)`}
                          placeholder={_Util.translatetext(31)}
                          //  validations={vldFlds2[`categoryID`]}
                          initvalue={_form["providerId"]}
                          OnSelect={(e)=>handleInputAutoProv(e,`providerId`)}
                          data={agentsList}
                          OnChange={(e)=>setSearchA(e)}
                        />
                      </div>
                      :null}


                    <div className={`paddField address`}>
                          <InputAutocomplete 
                            icon={`more_vert`} 
                            form={_formName} 
                            field={`categoryID`}  
                            keyCode={29} 
                            background={`#f9f9f9`}
                            color={`var(--base-color)`}
                            placeholder={_Util.translatetext(32)}
                          //  validations={vldFlds2[`categoryID`]}
                            initvalue={_form["categoryID"]}
                            OnSelect={(e)=>handleInputAutoReceive(e,`categoryID`)} 
                            data={catgList}
                            OnChange={(e)=>setCategorieSearch(e,"categoryID")}
                          />
                      </div>
                      <div className={`paddField address`}>
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
                      <div className={`paddField`}>
                          <InputAutocomplete 
                            icon={`more_vert`} 
                            form={_formName} 
                            field={`unit`}  
                            keyCode={39} 
                            background={`#f9f9f9`}
                            color={`var(--base-color)`}
                            placeholder={_Util.translatetext(33)}
                          //  validations={vldFlds2[`categoryID`]}
                            initvalue={_form["unit"]}
                            OnSelect={(e)=>handleInputAutoReceive(e,`unit`)} 
                            data={unitMeasurement}
                            OnChange={(e)=>setSearchUnit(e)}
                          />
                      </div>
                      <div className={`paddField address`}>
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
                      </div>
                    </div>
                    :null}
                    </div>
                  </div>
                  {formView===1 && validForm ? 
                    <div className={`_dsplFlx  btn_action`}>
                      <div className={` flexSpace `}/>
                      <span onClick={()=>_save()}>
                        <BTNH theme={`light_blue`} title={ _form["id"]?_Util.translatetext(67):_Util.translatetext(12)}/>
                      </span>
                    </div>
                    :null}
                  </div>
                :null}
            </div>
        </div>
    );
  
}  





export default withRouter(EditProdComponent)



function parseAutoObj(o,ky){
  let res = {}
  _Util.ObjectKeys(o).map(k=>{
    res[k] = {name:o[k][ky], id:k}
  })
  return res;
} 

function parseAutoFilterObj(o,ky,v){
  let res = {}
  _Util.ObjectKeys(o).map(k=>{
    if(o[k][ky].toLowerCase().indexOf(v.toLowerCase())>=0){
      res[k] = {name:o[k][ky], id:k}
    }
  })
  return res;
} 


function searchAgents(o,q){
  let rrs = {}
  _Util.ObjectKeys(o).map(k=>{
    if(o[k]["isStore"]){
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