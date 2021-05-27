

import React, { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'


import { withRouter, NavLink} from 'react-router-dom';

import {  OpenWatchDialog, fetchCities, fetchRemesa, OpenModal, getDispatch }  from '../../../actions/common'
import loadable from '@loadable/component'



import * as _Util from '../../../store/Util'


import '../../_styles.css'


const BTNH = _Util.BTNH_Cmpt();


const SearchInput =  _Util.SearchInput_Cmpt();


const ScrollDc =  _Util.ScrollDc_Cmpt();

const DeleteAlertMov =_Util.DeleteAlertMov_Cmpt();


const InputAutocomplete = _Util.InputAutocomplete_Cmpt(); 

const BtnIconTab = _Util.BtnIconTab_Cmpt(); 

const OpacityContainer = _Util.OpacityContainer_Cmpt(); 

const RecyclerViewByDate = loadable(() => import('./ReciclerView'))

const MovementItem = loadable(() => import('./MovementItem33'))






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

  







const _formName = 'add_operation';




const _formNameSearch = '_search_M';


export const calcMovExpInc = async (mm) => {

  let _state = _Util.getStore();
  let op = _state["ViewTypeMov"]===2;
  _Util.updStore(op?"Incomes":"Expenses",mm);


  let done = {};
  let total = 0;
  const _form = _Util.getFormStore('_search_M') || {};
  let qry = _form["search"];
  
  _Util.ObjectKeys(mm).map((mv,ii)=>{
    let isValid = false;
    let _ord = mm[mv]["import"] && mm[mv]["import"].toString().toLowerCase();
      
    if(qry){
      let _qr = qry && qry.toLowerCase()?qry.toString().toLowerCase():"";
      let _typ = mm[mv]["title"].toString().toLowerCase();
      let _rcv = mm[mv]["group"] && mm[mv]["group"]["name"] && mm[mv]["group"]["name"].toString().toLowerCase();
      let _hasPrdNm = false;
      let _dte = mm[mv]["date"];
      let _dtQ = 1
      let _hasDt = _dte>_dtQ;
      let _hasTyp = _typ && _typ.indexOf(_qr)>=0 && _hasDt;
      let _hasRcv = _rcv && _rcv.indexOf(_qr)>=0 && _hasDt;
      let _has_ord = _ord && _ord.indexOf(_qr)>=0 && _hasDt;
      if(_hasTyp || _hasRcv || _hasPrdNm || _has_ord){
        isValid = true;
      }
    }else{
      isValid = true;
    }

    let validUsr =  _Util.IsAdmin() ||  _Util.getProfileId();
  
  
    if(isValid && validUsr){
      done[mv] = mm[mv];
      total +=  mm[mv]["import"];
    }
  })


  let Sorts = _Util.sortObjectsByKey(done,"date",false);

  _Util.updStore(op?"IncomeSort":"ExpenseSort",Sorts);
  _Util.updStore('balanceM',total);

  done = null;
  mm = null;

  getDispatch()({
    type: 'UPD_KEY_VALUE',
    kv:{key:'observeChanges',value:_Util.gen12CodeId()}
  })
}














export const loadGastos = async (usI,qry ) => {
  let _userId = usI || _Util.getProfileId();
  let stt = (new Date()).getTime();

  //108686162968008261445 - - MgSEDxeebdtS12gT



  let fields = [ 
    "id",
    "title",
    "description",    
    "import",
    "date",
    "year",
    "month",
    "image",
    {
      N:"users",
      Q:"",
      f:["id", "name","email"]
    },
    {
      N:"group",
      Q:"",
      f:["id", "name"]
    }
  ];




  let arraySerialization = _Util.isArraySerialization();

  let _qry = qry?qry:"getQueryExpensesDetails";

  let Qry2Inv = {
    query:_qry,
    fields:fields,
    arraySerialization: arraySerialization,
    params:{
      userId:_userId,
      filterK:"month",
      filterV:"24242"
    }
  };

  const res = _Util.fetchStream_movie_data(_Util.get_GRAPHQLURL(),Qry2Inv);

  const td = await res;
  if(td){
    let dZs = arraySerialization?_Util.deZerialize2Array(td,fields,1):td;

    calcMovExpInc(dZs,qry)
    
  }
}













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



  let fld2Prs = ['id','name',"categoryID","unit","description","imageUrl","salePrice"];    

  let outerWidth = _state["outerWidth"];



  let _userId = _Util.getProfileId();


  const changeView = (i) => {
    if(i===viewTypeMov){
      //setViewTypeMov(null)
    }else{
      setViewTypeMov(i)
      _Util.updStore("ViewTypeMov",i);
      loadGastos(_userId,i===2?"getQueryIncomesDetails":"getQueryExpensesDetails");
    }
  }
  



  useEffect(() => {
    if(widthScreen!==outerWidth){
      setWidthScreen(outerWidth);
    }
    if(userID2!==_userId){
      setUserID2(_userId);
      loadGastos(_userId);
    } 
    
    

    if(!initialize){
      setInitialize(true);
      _Util.updViewActive(7);
      loadGastos(_userId);

      setTimeout(()=>window.scrollTo(0,0),350);
      setTimeout(()=>setView(true),50);
      window.localStorage.setItem("lng","es");
      let frm =  _Util.getFormStore(_formName);

      if(!frm || !frm["id"]){
        _Util.updFormStore(_formName,{})
        _updFormObs();
      }
    }
  });
  


 
let userA = _Util.getBrowser();
  
let isMobile = userA.os === "Android" || userA.os === "iPhone" || _state["outerWidth"]<550 ;



var viewType = _state["ViewTypeMov"];


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
                          <div className={`descTitle`}>
                          {viewType===2?_Util.translatetext(201):_Util.translatetext(202)}
                        </div>
                      </div>
                    
                      <div className={` sendBx scroll3Wrp `} >
                        <div className={`formContainer `} style={{opacity:viewTypeMov === 1?1:0}}>
                        {viewTypeMov === 1?
                        <div className={`_dsplFlx space2Around _flxWrp op4oU`}>
                      
                        </div>
                        :null}
                      </div>
                      </div>


                      <div className={` sendBx scroll3Wrp `} >
                        <div className={`formContainer `} style={{opacity:viewTypeMov === 2?1:0}}>
                        {viewTypeMov === 2?
                        <div className={`_dsplFlx space2Around _flxWrp op4oU`}>
                      
                        </div>
                        :null}
                      </div>
                      </div>


                    </div>:null}
                  </div>
                  <div  className={`footSpace`}/>
          </div>
      </>
    );
  
}  





export default withRouter(SendersComponent)



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












export function groupbyTab(obj,obj2) {
  let h = {}
  let _1d = 86400000;
  obj && obj.map((d)=>{
    if(d && obj2[d]){ 
      let _ddt = obj2[d]["date"];
      let d2 = Math.ceil(((new Date(_ddt)).getTime())/_1d);
      if(!h[d2]){
        h[d2] = [];
      }
      h[d2].push(d);
    } 
  })
  return h;
}




/*


 <div className={`_dsplFlx  spaceAround _flxWrp`}>
                        <BtnIconTab  
                          lbl={202}
                          icon={"text"}
                          classN={"activeRed"}
                          index={viewTypeMov}
                          indexTag={1}
                          changeView={changeView}
                          isMobile={isMobile}
                        />
                        <BtnIconTab  
                          lbl={201}
                          icon={"image_outline"}
                          classN={"complete"}
                          index={viewTypeMov}
                          indexTag={2}
                          changeView={changeView}
                          isMobile={isMobile}
                        />
                      </div>



*/