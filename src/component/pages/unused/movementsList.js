

import React, { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import loadable from '@loadable/component'



import { withRouter} from 'react-router-dom';

import {  OpenWatchDialog, fetchCities, fetchRemesa, fetchMovementsAll, fetchUsers, OpenModal } from '../../actions/common'



import * as _Util from '../../store/Util'

import '../_styles.css'

//  import '../MovementDetail'

/*

const Icon2 = loadable(() => import('../Icons'))

const MoreInfoButton = loadable(() => import('../MoreInfoButton'))

const ImageButton = loadable(() => import('../ImageButton'))

const ChoiceButton = loadable(() => import('../ChoiceButton'))



*/

const InputText = loadable(() => import('../InputText'))

const InputAutocomplete = loadable(() => import('../InputAutocomplete'));

const MovementDetail = loadable(() => import('../MovementDetail'));

const ModalDate = loadable(() => import('../ModalDate'));

const BTN_f = loadable(() => import('../btns_confirm'));


const _formName = 'list_customer_search';

const useObserveChanges = () => {
  const observeChanges =  useSelector(state => state.observeChanges);
  const dispatch = useDispatch(); 


  const _openMd = (_id, item) => {
    let data = {};
    data['zIndex']=450;
    data['Id']=_id;
    data['observeResize']=true;    
    data['props']={item:item, minHeight: '1vh'};
    data['content']=<MovementDetail />;
    OpenWatchDialog(dispatch,data);
  }

  const _LoadCities= (q) => {
    fetchCities(q,dispatch);
  }

  const _updRemesa= (q,fNm) => {
    fetchRemesa(q,dispatch,fNm);
  }


 
  

  
  
  return { 
    observeChanges,
    _LoadCities,
    dispatch,
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

  












const MovementsListComponent = (props) => {
  const {
    _openMd,
    dispatch,
  } = useObserveChanges();

  const {
    _updFormObs
  } = useObserveForms();
  


  let _state = _Util.getStore();
  let keys = _Util.getGlobalsKeys()
  _state["keys"] = keys;

  const _form = _Util.getFormStore(_formName) || {};




  const [initialize, setInitialize] = useState(false);

  const [widthScreen, setWidthScreen] = useState(null);

  const [choosePayView, setChoosePayView] = useState(0);
  const [validForm, setIsValidForm] = useState(false);
  const [nextValidForm, setNextValidForm] = useState(false);
  const [formView, setformView] = useState(1);
  const [view, setView] = useState(false);

  
  const [searchTxt, setSearchTxt] = useState("");


  let outerWidth = _state["outerWidth"];



  const callBackDate= (f,v) => {
    let dD = new Date(v);  
    const _form = _Util.getFormStore(_formName) || {};
    let frm =  _form;
    frm[f] = dD.getTime();
    _Util.updFormStore(_formName,frm)
  }


  const OpenModalDate = (i) => {
    let data = {};   
    const _form = _Util.getFormStore(_formName) || {};
    let  _date = _form && _form[i];
    data['zIndex']=190;
    data['observeResize']=true;
    data['props']={title:"", item:i};
    data['content'] = <ModalDate valueUpdate={(e)=>callBackDate(i,e)} initValue={_date}/>; 
    OpenModal(dispatch,data);
  }


  useEffect(() => {  
    if(widthScreen!==outerWidth){
      setWidthScreen(outerWidth);
    } 
    if(!initialize){
      setInitialize(true);

      let QryUser = {
        auth:{
          authCode:"850217"
        },
        query:"getQueryUsersDetails",
        Collection:"Users"
      };
      fetchUsers(QryUser,dispatch);

      let Qry2 = {
        auth:{
          authCode:"850217"
        },
        query:"getQueryMovementsAll",
        Collection:"Movements"
      };
      fetchMovementsAll(Qry2,dispatch);




      setTimeout(()=>window.scrollTo(0,0),350);
      setTimeout(()=>setView(true),50);
      window.localStorage.setItem("lng","es");
      _Util.updFormStore(_formName,{})
      _updFormObs();
    }
  });
  
  const handleSearch = (v,f) => {
    recalc();
  }



  const [agentList, setAgentList] = useState({});
  const [agentLoaded, setAgentLoaded] = useState(false);

  const [agentId, setAgentId] = useState(null);
  const [filterList, setfilterList] = useState([]);

  const [saldo, setSaldo] = useState(null);
  


  var _sendersList = _state["movementsList"];

  var _usersList = _state["usersList"];

  var _usersList2Prs = _usersList;



  let _usersPrs = parseAutoObj(_usersList2Prs,"personName")


  const setAgentSearch = (v,f) => {
    if(v){
      _usersPrs = parseAutoFilterObj(_usersList2Prs,"personName",v);
      setAgentList(_usersPrs);
    }else{
      _usersPrs = parseAutoObj(_usersList2Prs,"personName",v);
      setAgentList(_usersPrs);
    }
    
  }

  
  if(_usersList && !agentLoaded){
    _usersPrs = parseAutoObj(_usersList,"personName");
    setAgentList(_usersPrs);
    setAgentLoaded(true);
  }
  


  const handleInputAutoReceive = (v,f) => {
    setAgentId(v.id)
    let frm =  _form;
    frm[f] = v.id
    _Util.updFormStore(_formName,frm)
    recalc();
  }


  const recalc = () => {
    let _saldo = 0;
    let ll = [];
    let ggg = _Util.sortObjectsByKey(_sendersList,"date") 
    ggg && ggg.map(fV=>{
      let slc = _sendersList[fV];
      var _ammountTasa = slc["amount"] * slc["tasa"];
      var tt = _form["date"] || 0;
      var ss = _form["search"]?_form["search"].toLowerCase():"";
      if(agentId && agentId === slc["agentId"] && slc["date"] >= tt && slc["type"].toLowerCase().indexOf(ss)>=0){
        if(slc["delivery"]){
          if(slc["type"]==="Entrega"){
            _saldo -=  _ammountTasa;
          }
          else if(slc["type"]==="BTC"){
            _saldo +=  _ammountTasa;
          }
          else if(slc["type"]==="TRANSFER"){
            _saldo +=  _ammountTasa;
          }
          else if(slc["type"]==="INVESTMENT_FOOD"){
            _saldo -=  _ammountTasa;
          }
          else if(slc["type"]==="ADJUSTMENTS"){
            _saldo +=  _ammountTasa;
          }
          else if(slc["type"]==="COMBO"){
            //_saldo +=  0;
            _saldo +=  _ammountTasa;
          }
          slc["saldo"] = _saldo;
        }
        ll.push(slc);
      }
    })
    setfilterList(ll);
    setSaldo(_saldo);
  }

 
    return (
      <>
        <style>
        {`
        .palette{
            --base-color: rgb(0, 137, 123,1);
            --base-color-gradient: 0, 137, 123;
        }

        `}
        </style>
        <div className={`mainViewHero palette formContainer   ${choosePayView === 1?'_payView':''} `} style={{opacity:view?1:0}} >
          <div className={`mnhgtFrg`}> 
                <div className={`formContainer`} style={{opacity:choosePayView === 0?1:0}}>
                      <div className={`paddField address`}>
                          <InputAutocomplete 
                            icon={`more_vert`} 
                            form={_formName} 
                            field={`agentId`}  
                            keyCode={29} 
                            background={`#f5f5f5`}
                            color={`var(--base-color)`}
                            placeholder={`Agent`} 
                            initvalue={_form["agentId"]}
                            OnSelect={(e)=>handleInputAutoReceive(e,`agentId`)} 
                            data={agentList}
                            OnChange={(e)=>setAgentSearch(e,"name")}
                          />
                      </div>

                  <div>{saldo && saldo.toFixed(2)}</div>

                  <div className={`fieldPadding _MrgV`}>
                    <span onClick={()=>OpenModalDate( `date` )}>
                      <BTN_f theme={`light_blue`} title={_form && _form["date"]?_Util.parseDate(_form["date"]):_Util.parseDate(_Util.gTm())}/>
                    </span>
                  </div>

                  <div className={`paddField address`}>
                          <InputText
                            icon={`more_vert`} 
                            form={_formName} 
                            field={`search`}  
                            keyCode={29} 
                            background={`#f5f5f5`}
                            color={`var(--base-color)`}
                            placeholder={`search`} 
                            initvalue={_form["search"]}
                            OnChange={(e)=>handleSearch(e,"search")}
                          />
                      </div>

                  <div className={`formContainer`} style={{opacity:formView === 1?1:0}}>
                  {formView===1?
                  <div className={` sendBx scrollWrp `} >
                    <div className={`_dsplFlx spaceAround _flxWrp`}>
                    {
                      filterList && filterList.map(fV=>{
                        let slc = fV ;
                        //_sendersList[fV];      

                        //console.log("slc",slc);
                          let personName = _usersList && slc && slc["agentId"] && _usersList[slc["agentId"]] && _usersList[slc["agentId"]]["personName"];
                          return (
                            <>
                              <ListItemComponent item={slc}  history={props.history} dispatch={dispatch} _openMd={_openMd}  personName={personName}/>
                            </>
                          )
                      })
                    }
                    </div>
                  </div>
                  :null}
                  </div>
                  <div style={{marginBottom:'65px'}}></div>                  
                  </div>
                  </div>
                </div>
      </>
    );
  
}  



 

export default withRouter(MovementsListComponent)



function parseAutoI(o){
  let res = {}
  _Util.ObjectKeys(o).map(k=>{
    res[k] = {name:k, id:k}
  })
  return res;
} 





const ListItemComponent = (props) => {

  const {
    history, item, dispatch, _openMd, personName
  } = props;


  let hasSenders = item && item["sender"];
  let hasReceivers = item && item["receiver"];
  let hasDate = _Util.parseDate(item && item["date"]);


  var _ammountTasa = item && item["amount"] * item["tasa"];


  const handleDetails = (id) => {
    _Util.updStore("mov2edit",item);
    _openMd();
  }


  // console.log(item)


  return (
        <div className={`pym81b sendBx cardCustomer`} >

          <div  className={`_dsplFlx  _usrState`}>
            <div  className={`${item && item["delivery"]?"delivered":""}  deliverySpot `}> </div>
            <div  className={` `}  >
              {item && item["type"]}
            </div>
            <div className={"flexSpace"}></div>
            <div  className={`phoneNumber `}  >
              {personName}
            </div>
          </div>
          <div  onClick={()=>handleDetails()}> 
            {hasSenders && hasSenders["name"]?hasSenders["name"]:item && `${item["type"]} ${item["amount"]}` }
          </div>
          <div  className={`phoneNumber `}  >
            ${_ammountTasa && _ammountTasa.toFixed(2)}
          </div>
          <div  className={`phoneNumber `} >
            {hasDate}
          </div>
          { hasReceivers ?
          <div className={``} >
            {hasReceivers && hasReceivers["name"]}
          </div>
          :null}
        </div>
  )

}


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



