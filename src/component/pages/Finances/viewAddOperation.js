

import React, { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'


import { withRouter, NavLink} from 'react-router-dom';

import {  OpenWatchDialog, fetchCities, fetchRemesa, OpenModal, CloseModal, loadGroups }  from '../../../actions/common'
import loadable from '@loadable/component'



import * as _Util from '../../../store/Util'


import '../../_styles.css'


// import './formOperationHandler'

const BTNH = _Util.BTNH_Cmpt();


const SearchInput =  _Util.SearchInput_Cmpt();


const ScrollDc =  _Util.ScrollDc_Cmpt();

const DeleteAlertMov =_Util.DeleteAlertMov_Cmpt();


const InputAutocomplete = _Util.InputAutocomplete_Cmpt(); 

const BtnIconTab = _Util.BtnIconTab_Cmpt(); 

const OpacityContainer = _Util.OpacityContainer_Cmpt(); 

const RecyclerViewByDate = loadable(() => import('./ReciclerView'))

const AddbyForm = loadable(() => import('./formOperationHandler'))

const AddGroup = loadable(() => import('./addGroup'))





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

  







const _formName = "243876nt5fdgomwy"






const SendersComponent = (props) => {
  const {
    _openMd,
    dispatch,
    _updRemesa
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

  const [view, setView] = useState(false);

  const [userID2, setUserID2] = useState(null);


  const [tabIndex, setTabsIndex] = useState(0);


  const [viewTypeMov, setViewTypeMov] = useState(1);

  var viewType = _state["ViewTypeMov"];


 
  let outerWidth = _state["outerWidth"];


  let _idType = viewType===2? "ingresos" : "gastos";
  let Groups  = _state["Groups"]; 
  let categoryList  = groupbyType(Groups,_idType); 


  let _userId = _Util.getProfileId();


  const changeView = (i) => {
    if(i===viewTypeMov){
      //setViewTypeMov(null)
    }else{
      setViewTypeMov(i)
    }
  }
  



  useEffect(() => {
    if(widthScreen!==outerWidth){
      setWidthScreen(outerWidth);
    }
    if(userID2!==_userId){
      setUserID2(_userId);
      loadGroups(_userId);
    } 
    
    

    if(!initialize){
      setInitialize(true);
      _Util.updViewActive(7);
      loadGroups(_userId);
      setTimeout(()=>window.scrollTo(0,0),350);
      setTimeout(()=>setView(true),50);
      window.localStorage.setItem("lng","es");
      _Util.updFormStore(_formName,{})
      _updFormObs();
    }
  });
  


const Confirm = async (modalID) => {
  
  let _2s =  _Util.getFormStore("addCategory");
  _2s["type"] = viewType===2? "ingresos" : "gastos";
  _2s["user"] = _userId;
  if(_2s["name"].length>2){
    let Qry = {
      form:_2s,
      fields:[
        "id",
        "name",
      ],
      query:"upgradeGroups"
    };
    const res = _Util.fetchStream_movie_data(_Util.get_GRAPHQLURL(),Qry);
    const td = await res;
    if(td){
      loadGroups(_userId);
      CloseModal(dispatch,{id:modalID});
    }
  }
}



const _addGroup = (_id) => {
  let data = {};
  data['zIndex']=450;
  data['observeResize']=true;    
  data['props']={item:_id, minHeight: '190px'};
  data['content']=<AddGroup confirm={Confirm} />;
  OpenModal(dispatch,data);
}
  


 
let userA = _Util.getBrowser();
  
let isMobile = userA.os === "Android" || userA.os === "iPhone" || _state["outerWidth"]<550 ;




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
                <div className={`formContainer `} style={{opacity:tabIndex === 0?1:0}}>
                    {tabIndex === 0?
                    <div className={`centerListCardProd `}> 

                      <div  className={`  headerTtl `}>
                        <div className={`mainTitle`}>
                            {`${_Util.translatetext(12)}  ${viewType===2?_Util.translatetext(201):_Util.translatetext(202)}`}
                          </div>
                      </div>


                      <div className={` sendBx scroll3Wrp `} >
                        <OpacityContainer 
                          //lbl={207}                        
                          index={viewTypeMov}
                          indexTag={1}
                          isMobile={isMobile}
                        >

                          {categoryList && _Util.ObjectKeys(categoryList).length>0?
                            <AddbyForm />
                            :
                            <div className={`  headerTtl`}>
                                <div className={`pym81b sendBx `}>
                                  <div className={`subtotal_cart `}>
                                  {`${_Util.translatetext(208)} ${viewType===2?_Util.translatetext(201):_Util.translatetext(202)} ${_Util.translatetext(209)}`}
                                  </div>
                                  <div className={`_dsplFlx`}>
                                      <div className={`flexSpace`}/>  
                                      <span onClick={()=>_addGroup()}>
                                          <BTNH theme={`light_blue`} title={`${_Util.translatetext(12)} ${_Util.translatetext(32)}`}/>
                                      </span>
                                  </div>
                                </div>
                            </div>
                            }
                        </OpacityContainer>
                      </div>


                      <div className={` sendBx scroll3Wrp `} >
                        <OpacityContainer 
                          lbl={206}                        
                          index={viewTypeMov}
                          indexTag={2}
                          isMobile={isMobile}
                        >
                            <div />
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



export function groupbyType(obj,type) {
  let h = {}
  obj && _Util.ObjectKeys(obj).map((d)=>{
    if(d){
      let d2 = obj[d]["type"];
      if(type===d2){
        h[d] = obj[d];
      }
    } 
  })
  return h;
}


/*

<div className={`_dsplFlx  spaceAround _flxWrp`}>
                        <BtnIconTab  
                          lbl={207}
                          icon={"text"}
                          classN={"activeRed"}
                          index={viewTypeMov}
                          indexTag={1}
                          changeView={changeView}
                          isMobile={isMobile}
                        />
                        <BtnIconTab  
                          lbl={206}
                          icon={"image_outline"}
                          classN={"complete"}
                          index={viewTypeMov}
                          indexTag={2}
                          changeView={changeView}
                          isMobile={isMobile}
                        />
                      </div>



*/