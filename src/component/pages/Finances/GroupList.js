

import React, { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'


import { withRouter, NavLink} from 'react-router-dom';

import {  OpenWatchDialog, fetchCities, fetchRemesa, OpenModal, CloseModal, loadGroups }  from '../../../actions/common'
import loadable from '@loadable/component'



import * as _Util from '../../../store/Util'


import '../../_styles.css'


const BTNH = _Util.BTNH_Cmpt();


const SearchInput =  _Util.SearchInput_Cmpt();




const RecyclerViewByDate = loadable(() => import('./ReciclerView_Type'))


const MovementItem = loadable(() => import('./MovementItemGroup'))

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

  







const _formName = 'add_operation';




const _formNameSearch = '_search_M';














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

  
  const [range, setRange] = useState(24);

  const [searchQ, setSearchQ] = useState("");



  let fld2Prs = ['id','name',"categoryID","unit","description","imageUrl","salePrice"];    

  let outerWidth = _state["outerWidth"];



  let _userId = _Util.getProfileId();


  const changeView = (i) => {
    if(i===viewTypeMov){
      //setViewTypeMov(null)
    }else{
      setViewTypeMov(i)
      _Util.updStore("ViewTypeMov",i);
     
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
      let frm =  _Util.getFormStore(_formName);

      if(!frm || !frm["id"]){
        _Util.updFormStore(_formName,{})
        _updFormObs();
      }
    }
  });
  


 
let userA = _Util.getBrowser();
  
let isMobile = userA.os === "Android" || userA.os === "iPhone" || _state["outerWidth"]<550 ;


var _movementsP = _state["Groups"];

var _movements = viewTypeMov===2?_state["Incomes"]:_state["Expenses"];


let _movementsPShow = groupbyTab(_movementsP,searchQ);




const searchMov = (i) => {
  let frm =  _form;
  frm["search"] = i;
  _Util.updFormStore(_formNameSearch,frm);
  //setObs(_Util.gen16CodeId());
}







const Confirm = async (modalID) => {
  
  let _2s =  _Util.getFormStore("addCategory");
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
      CloseModal(dispatch,{id:modalID});
    }
  }
}



const _addGroup = (_id) => {
  let data = {};
  data['zIndex']=450;
  data['observeResize']=true;    
  data['props']={item:_id, minHeight: '330px', showType:true};
  data['content']=<AddGroup confirm={Confirm} />;
  OpenModal(dispatch,data);
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
        <div className={` palette formContainer shopping_cart  _movements ${isMobile?"is_mobile":""}`} style={{opacity:view?1:0}} >
                <div className={`formContainer `} style={{opacity:tabIndex === 0?1:0}}>
                    {tabIndex === 0?
                    <div className={`centerListCardProd `}>
                      <div className={`delete_alert_t1 `}>
                            <div>
                            {`${_Util.translatetext(32)}`}
                            </div>
                      </div>

                      <div className={`_dsplFlx`}>
                          <div className={`flexSpace`}/>  
                          <span className=" u3mD2d xwW5Ce" onClick={_addGroup}>
                              <BTNH theme={`blue_white`} title={ _Util.translatetext(12)}/>
                          </span>
                      </div>

                      <div className={` _search_MrgV  `} >
                          <SearchInput updChanges={setSearchQ} placeholderCode={20}/>
                      </div>

                      <div className={` sendBx scroll3Wrp `} >
                        <div className={`formContainer `} style={{opacity:viewTypeMov === 1?1:0}}>
                        {viewTypeMov === 1?
                        <div className={`_dsplFlx space2Around _flxWrp op4oU`}>
                        {
                          _movementsPShow && _Util.ObjectKeys(_movementsPShow).map((fV,i)=>{
                            //let stck = _movements2Show[fV];
                            return(
                              <RecyclerViewByDate
                                  data={_movementsPShow[fV]} 
                                  ind={i}
                                  fV={fV}
                                  range={range} 
                                  updRange={(v)=>setRange(v)}
                                  ItemComponent={<MovementItem/>}
                                  tag={"_pend_Mov"}
                                />
                            )
                          })
                        }
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






export function groupbyTab(obj,q) {
  let h = {}
  obj && _Util.ObjectKeys(obj).map((d)=>{
    if(d){
      let d2 = obj[d]["type"] && obj[d]["type"].toString().toLowerCase();
      let nMn = obj[d]["name"] && obj[d]["name"].toString().toLowerCase();
      if(q){
        let qLw = q.toString().toLowerCase();
        if((nMn.indexOf(qLw)>=0)){
          if(!h[d2]){
            h[d2] = [];
          }
          h[d2].push(d);
        }
      }else{
        if(!h[d2]){
          h[d2] = [];
        }
        h[d2].push(d);
      }
    } 
  })
  return h;
}