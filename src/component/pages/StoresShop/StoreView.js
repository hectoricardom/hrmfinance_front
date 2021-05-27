

import React, { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import loadable from '@loadable/component'



import { withRouter, NavLink} from 'react-router-dom';

import {  OpenWatchDialog, fetchCities, fetchRemesa, OpenModal, loadStockProduct, OpenToast } from '../../../actions/common'



import * as _Util from '../../../store/Util'

import * as PdfRpt from '../../../store/printDoc'

import '../../_styles.css'



const StoresHandler = loadable(() => import('./StoresHandler'))

const StoresPendingOrders = loadable(() => import('./Pendings'))
const CompletedMov = loadable(() => import('./CompletedMov'))

const StoresMenu = loadable(() => import('./productMenu'))


const Icon2 = _Util.Icon_Cmpt();


const CheckBoxSlide =  _Util.CheckBoxSlide_Cmpt();

const InputAutocomplete = _Util.InputAutocomplete_Cmpt(); 


const BtnIconTab = _Util.BtnIconTab_Cmpt(); 

const OpacityContainer = _Util.OpacityContainer_Cmpt(); 




/*
const BTNH = _Util.BTNH_Cmpt();

const DeleteAlertMov = _Util.DeleteAlertMov_Cmpt();

const SearchInput =  _Util.SearchInput_Cmpt();

const ModalDate =  _Util.ModalDate_Cmpt();

const ScrollDc =  _Util.ScrollDc_Cmpt();
*/



const useObserveChanges = () => {
  const observeChanges =  useSelector(state => state.observeChanges);
  const dispatch = useDispatch(); 


  const _openMd = (_id, item) => {
    let data = {};
    data['zIndex']=450;
    data['Id']=_id;
    data['observeResize']=true;    
    data['props']={item:item, minHeight: '1vh'};
    OpenWatchDialog(dispatch,data);
  }

  const _LoadCities= (q) => {
    fetchCities(q,dispatch);
  }

  const _updRemesa= (q,fNm) => {
    fetchRemesa(q,dispatch,fNm);
  }

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

  


const _formName = 'stores_search';




const SendersComponent = (props) => {
  const {
    dispatch,
    LoadUA
  } = useObserveChanges();

  const {
    _updFormObs
  } = useObserveForms();
  


  let _state = _Util.getStore();
  let keys = _Util.getGlobalsKeys()
  _state["keys"] = keys;

  const _form = _Util.getFormStore(_formName) || {};

  let _userId = _Util.getProfileId();
  let pnOrStMk = _state["pnOrStMk"];

  

  const [initialize, setInitialize] = useState(false);

  const [widthScreen, setWidthScreen] = useState(null);

  const [view, setView] = useState(false);

  const [viewTypeMov, setViewTypeMov] = useState(4);

  
  const [range, setRange] = useState(24);

  const [searchQ, setSearch] = useState("");
  const [searchA, setSearchA] = useState("");

  const [viewAgents, setViewAgents] = useState(false);


  const [obs, setObs] = useState(0);


  const [inV, setinV] = useState(false);




  let outerWidth = _state["outerWidth"];
  


  useEffect(() => {  
    if(widthScreen!==outerWidth){
      setWidthScreen(outerWidth);
    } 
    if(!initialize){
      setInitialize(true);
      _Util.updViewActive(8);
      if(_Util.IsAdmin() || _state["isStore"]){
        if(_Util.IsAdmin()){
          LoadUA();
        }
        let Qry2Inv = {
          query:"getStockProductQvaMarket"
        };
        loadStockProduct(Qry2Inv,dispatch);
        //loadReceivers(_userId,_userId,dispatch);
        setTimeout(()=>setView(true),50);
      }
      else{
        _state["route_history"].push({pathname:"/marketplace"})        
      }
    }
  });
  



  
 
let userA = _Util.getBrowser();
  
let isMobile = userA.os === "Android" || userA.os === "iPhone" || _state["outerWidth"]<550 ;


var _movementsL = _state["movementsDone"];

let _movements2Show = _Util.groupbyTab(_movementsL,range);

var balance = _state["balanceM"];


const changeView = (i) => {
  if(i===viewTypeMov){
    setViewTypeMov(null)
  }else{
    setViewTypeMov(i)
  }
  window.scrollTo(0,_Util.IsAdmin()?285:195);
}


const Printorders = () => {
  PdfRpt.PrintPendingOrders(pnOrStMk)
}


const confirmAgentId = (v) => {
  _Util.updStore('agentId2Store',v);
  setSearch(null);
  setViewAgents(0);
}


let keyCodes =   _Util.getGlobalsKeys();


let agentsQva = {};
if(_Util.IsAdmin() && searchA && searchA.length>0){
  agentsQva = searchAgents(_state["agentsList"],searchA);
}else{
  agentsQva = searchAgents(_state["agentsList"],"");
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
        <div className={` palette formContainer ${1?" _movements ":""} ${isMobile?"is_mobile":""}`} style={{opacity:view?1:0}} >
                
            <div className={`formContainer `} style={{opacity:1}}>
                {view?
                <div className={`centerListCardProd `}> 
                    {_Util.IsAdmin() ?
                      <div className={`paddField address`}>
                        <InputAutocomplete 
                          icon={`more_vert`} 
                          form={"kjsahfashflkashjaf"} 
                          field={`agentId`}  
                          keyCode={49} 
                          background={`#f9f9f9`}
                          color={`var(--base-color)`}
                          placeholder={_Util.translatetext(13)}
                          OnSelect={(e)=>confirmAgentId(e.id)}
                          data={agentsQva}
                          OnChange={(e)=>setSearchA(e)}
                        />
                      </div>
                    :null}


                    <div className={`sendBtn _dsplFlx spaceAround _mrgSwith `}>    
                      <div className={`in_stock_switch _dsplFlx`}>
                        <span className={`sw_left_span `}>{"Available"}</span>
                        <div  className={`in_stock_switch_btn`}>
                          <CheckBoxSlide initvalue={inV} keyCode={77} updChange={(e)=>setinV(e)}/>
                        </div>
                      </div>
                    </div>


                  <div className={`  headerTtl`}>
                        <div className={`pym81b sendBx `}>
                            <div className={`subtotal_cart `}>
                                {_Util.translatetext(106)}
                            </div>
                            <div className={`total_cart ${balance>0?"pos":"neg"}`}>
                              {`$ ${balance?balance.toFixed(2):0}`}
                              <div className={`sendBtn`}>
                              </div>
                            </div>
                        </div>
                      </div>
                      {pnOrStMk && _Util.ObjectKeys(pnOrStMk).length>0?                      
                      <div className={`pym81b sendBx mov_type _dsplFlx activeBlue`} onClick={()=>Printorders()}>
                        <div className={`icon_mov`}>
                          <Icon2 name={`printer`} />
                        </div>
                        <div className={`mov_type_title `}>
                          {_Util.translatetext(51)}
                        </div>
                      </div>
                      :null}

                      <div className={`_dsplFlx  spaceAround _flxWrp`}>

                        

                        <BtnIconTab  
                          lbl={108}
                          icon={"food_variant"}
                          classN={"_cmb"}
                          index={viewTypeMov}
                          indexTag={4}
                          changeView={changeView}
                          isMobile={isMobile}
                        />  

                        
                        <BtnIconTab  
                          lbl={107}
                          icon={"alert"}
                          classN={"activeBlue"}
                          index={viewTypeMov}
                          indexTag={1}
                          changeView={changeView}
                          isMobile={isMobile}
                        />

                        <BtnIconTab  
                          lbl={52}
                          icon={"timer_outline"}
                          classN={"activeRed"}
                          index={viewTypeMov}
                          indexTag={3}
                          changeView={changeView}
                          isMobile={isMobile}
                        />
                        <BtnIconTab  
                          lbl={53}
                          icon={"success"}
                          classN={"complete"}
                          index={viewTypeMov}
                          indexTag={2}
                          changeView={changeView}
                          isMobile={isMobile}
                        />
                      </div>
                    
                      <div className={` sendBx scroll3Wrp `} >

                      <OpacityContainer 
                        lbl={52}                        
                        index={viewTypeMov}
                        indexTag={3}
                        isMobile={isMobile}
                      >
                        <StoresPendingOrders/>
                      </OpacityContainer>
                      <OpacityContainer 
                        lbl={53}                        
                        index={viewTypeMov}
                        indexTag={2}
                        isMobile={isMobile}
                      >
                        <CompletedMov/>
                      </OpacityContainer>


                      <OpacityContainer 
                        lbl={107}                        
                        index={viewTypeMov}
                        indexTag={1}
                        isMobile={isMobile}
                      >
                        <StoresHandler />
                      </OpacityContainer>

                      <OpacityContainer 
                        lbl={108}                        
                        index={viewTypeMov}
                        indexTag={4}
                        isMobile={isMobile}
                      >
                        <StoresMenu />
                      </OpacityContainer>




                      </div>
                    </div>:null}
                  </div>
                  <div  className={`footSpace`}/>
          </div>
      </>
    );
  
}  





export default withRouter(SendersComponent)




function searchAgents(o,q){
  let rrs = {}
  _Util.ObjectKeys(o).map(k=>{
    if(o[k]["isqvmAgent"] || o[k]["isAdmin"]){
      if(q){
        let qLw = q && q.toLowerCase();
        let nLw = o[k]["name"] && o[k]["name"].toLowerCase();
        if(qLw && nLw && nLw.indexOf(qLw)>=0){
          rrs[k] = o[k]
        }
      }else{
        rrs[k] = o[k]
      }
    }
  })
  return rrs;
} 









