

import React, { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import loadable from '@loadable/component'

import { withRouter} from 'react-router-dom';

import {  fetchCities, fetchRemesa,  loadStockProduct, loadMovs }
from '../../../actions/common'


import * as _Util from '../../../store/Util'


import '../../_styles.css'



const RecyclerViewByDate = loadable(() => import('../Movements/ReciclerView'))

const MovementItem = loadable(() => import('./MovementItemStore'))
 

const BTNH = _Util.BTNH_Cmpt();

const Icon2 = _Util.Icon_Cmpt();

const SearchInput =  _Util.SearchInput_Cmpt();

const ModalDate =  _Util.ModalDate_Cmpt();



const OpacityContainer = _Util.OpacityContainer_Cmpt(); 




const useObserveChanges = () => {
  const observeChanges =  useSelector(state => state.observeChanges);
  const dispatch = useDispatch(); 


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
    _updRemesa
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

  






const _formName = 'store_list_search';










const MovementsComponent = (props) => {
  const {
    dispatch,
    LoadUA
  } = useObserveChanges();


  let _state = _Util.getStore();
  let keys = _Util.getGlobalsKeys()
  _state["keys"] = keys;

  const _form = _Util.getFormStore(_formName) || {};

  let _userId = _Util.getProfileId();
  let pnOrStMk = _state["pnOrStMk"];

  

  const [initialize, setInitialize] = useState(false);

  const [widthScreen, setWidthScreen] = useState(null);

  const [view, setView] = useState(false);

  const [viewTypeMov, setViewTypeMov] = useState(1);

  
  const [range, setRange] = useState(24);

  const [searchQ, setSearch] = useState("");

  const [searchA, setSearchA] = useState("");

  const [viewAgents, setViewAgents] = useState(false);


  const [obs, setObs] = useState(0);


 



  let outerWidth = _state["outerWidth"];
  
  let agentId = _state["agentId2"];


  let _usAg = agentId || _userId;


  /// _usAg = _Util.getUserAgent();
  




  useEffect(() => {  
    if(widthScreen!==outerWidth){
      setWidthScreen(outerWidth);
    } 
    if(!initialize){
      setInitialize(true);
      _Util.updViewActive(8);

      if(_Util.IsAdmin()){
        LoadUA();
      }
      
      let Qry2Inv = {
        query:"getStockProductQvaMarket"
      };
      loadStockProduct(Qry2Inv,dispatch);

      
      loadMovs(_usAg);


      setTimeout(()=>setView(true),50);
      window.localStorage.setItem("lng","es");
    }
  });
  



  
 
let userA = _Util.getBrowser();
  
let isMobile = userA.os === "Android" || userA.os === "iPhone" || _state["outerWidth"]<550 ;


var _movementsP = _state["movementsPendingStore"];



let _movementsPShow = groupbyTab(_movementsP,_state["movements"]);


let keyCodes =   _Util.getGlobalsKeys();



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
        <div className={` palette formContainer shopping_cart  _movements ${isMobile?"is_mobile":""}`} style={{opacity:view?1:0}} >
                
            <div className={`formContainer `} style={{opacity:1}}>
                {view?
                <div className={`centerListCardProd `}>                   
                      
                    <div className={` sendBx scroll3Wrp `} >
                      <OpacityContainer 
                        lbl={""}                        
                        index={1}
                        indexTag={1}
                        isMobile={isMobile}
                      >
                        <div className={`_dsplFlx space2Around _flxWrp op4oU`}>
                          {
                            _movementsPShow && _Util.ObjectKeys(_movementsPShow).map((fV,i)=>{
                              //console.log(_movements2Show)
                              return(
                                <div key={`${keyCodes[i]}_${i}_pend_Mov`} >
                                  <div className={`date_lbl _dsplFlx`}>
                                    <div  className={`bar`}/>                                  
                                    <span>{fV}</span>
                                  </div>
                                  <RecyclerViewByDate 
                                    data={_movementsPShow[fV]} 
                                    ind={i}
                                    range={range} 
                                    updRange={(v)=>setRange(v)}
                                    ItemComponent={<MovementItem/>}
                                    tag={"_pend_Mov"}
                                  />
                                </div>
                              )
                          })}
                        </div>
                      </OpacityContainer>
                      </div>
                    </div>:null}
                  </div>
                  <div  className={`footSpace`}/>
          </div>
      </>
    );
  
}  





export default withRouter(MovementsComponent)




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


export function groupbyTab(obj,obj2) {
  let h = {}
  obj && obj.map((d)=>{
    if(d){ 
      let _ddt = obj2[d]["deliveryDate"] ||  obj2[d]["date"];
      let d2 = _Util.date2pretyfy(_ddt)      
      if(!h[d2]){
        h[d2] = [];
      }
      h[d2].push(d);
    } 
  })
  return h;
}





