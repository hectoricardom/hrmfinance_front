

import React, { useEffect, useState } from 'react'
import { withRedux } from '../../store/redux'
import { useSelector, useDispatch } from 'react-redux'


import { 
  /*OpenModal, 
  getGastosById,
  getIngresosById,
  OpenSlideMenu,
  getGastos,
  getIngresos,
  getOrdersTrackbyDay
  */
} from '../../actions/common'


import * as Print2 from '../../store/printDoc';
import * as _Util from '../../store/Util'
import Icons from '../Icons'

import { withRouter} from 'react-router-dom';


import ModalDate from '../ModalDate'


import AddFinance from '../operations/AddFinance'

import AddUPSTag from '../operations/AddUPSTag'


import GraphMultiLine from '../GraphMultiLineHRM'



import AddUserIPS from '../operations/AddUserIPS'
import DeleteVideo from '../operations/deleteVideo'


import ViewFinance from '../operations/ViewItemFinance'

import YearFilter from '../operations/YearFilter'
import YearMonth from '../operations/YearMonth'
import CategoryFilter from '../operations/CategoryFilter'

import DesktopFilter from '../operations/DesktopFilter'
import DeleteFinance from '../operations/deleteFinance'


import BTNH from  '../btns_confirm';


import TabsHRM from '../tabsHRM'
import NavigationHRM from '../navigationList'

import WithScroll from '../scroll-decorator'



import '../_styles.css'


var sort__List = ['date','title','group'];



var lastScroll = 0;

const useObserveChanges = () => {
  const observeChanges =  useSelector(state => state.observeChanges);

  const forms =  useSelector(state => state.forms);
  const dispatch = useDispatch();

  let _state = _Util.getStore();

  const updKV= (k,v) => {
    dispatch({
      type: 'UPD_KEY_VALUE',
      kv:{key:k,value:v}
    })  
    dispatch({
      type: 'UPD_KEY_VALUE',
      kv:{key:"observeChanges",value:_Util.gen12CodeId()}
    })  
  }

  
  const updForms= (form,field,v) => {
    let _forms = forms;
    if(!_forms[form]){
      _forms[form] = {};
    }
    _forms[form][field] = v;    
    dispatch({
      type: 'UPD_KEY_VALUE',
      kv:{key:'forms',value:_forms}
    })   
  }

   

  
const historyDate = (dt) => {
  _Util.updStore('date',dt);
  _Util.updStore('OrdersTrackByDay',null);
  _getOrdersTrackbyDay(dt);
}
  

const OpenModalDate = (i, _ID) => {
  let data = {};
  data['zIndex']=150;
  data['observeResize']=true;
  data['props']={title:"", id: _ID, item:i};
  data['content'] = <ModalDate valueUpdate={(e)=>historyDate(e)}/>; 
  
  OpenModal(dispatch,data);
}

const _OpenSlideFilters = (i, _ID) => {
  let data = {};
  data['list']=_state.listDialog;
  data['zIndex']=350;
  data['width']="550px";
  data['direction']="right";
  data['overlay']=true;
  data['props']={title:""};
  data['content'] = <DesktopFilter  
    upd={()=>{
      fetchOp(0)
      fetchOp(1)
    }}  
    updCategory={()=>fetchOp(i)}
    operation={i}
  />;
  OpenSlideMenu(dispatch,data);
}



const DeleteFinanceDialog = (i, _ID) => {
  let data = {};
  data['zIndex']=150;
  data['observeResize']=true;
  data['props']={title:"", id: _ID, item:i};
  data['content'] = <DeleteFinance />; 
  
  OpenModal(dispatch,data);
}



const fetchOp = (operation) => {
  let _store = _Util.getStore();  
  const {year, month, filterQuery, searchText, monthAll, navigations} = _store;
  const {catgory2F} = filterQuery || {}; 
  const _operation_ = operation?"ingresos":"gastos";
  let _navigations = navigations && navigations[_operation_];
  const { page, limit, sortBy } = _navigations || {}; 
  /*
  let desc = sortBy.split(':')[1];
  let key = sortBy.split(':')[0];
  var _key = sort__List[key || 0]
  let _sort = desc?'desc':'asc';
  */
  let _sortBy = sortBy || "date.asc";
  let q = {
    limit: limit || 100,
    page: page || 1,
    sortBy: _sortBy,
    year: year
  };
  if(!monthAll){
    var m = month + (year*12)+1;
    q['month'] = m;
  };
  if(searchText){q['query'] = `title,import:`+searchText};
  if(catgory2F){q['category'] = catgory2F};
  if(operation===0){
    getGastos(q);
  }else if(operation===1){
    getIngresos(q);
  } 
}


const OpenModalYear = (i, _ID) => {
  let data = {};
  data['zIndex']=150;
  data['observeResize']=true;
  data['content'] = <YearFilter upd={()=>{
    fetchOp(0)
    fetchOp(1)
  }} />
  
  OpenModal(dispatch,data);
}

const OpenModalMonth = (i, _ID) => {
  let data = {};
  data['zIndex']=150;
  //data['observeResize']=true;
  data['isView']=true;
  data['content'] = <YearMonth upd={()=>{
    fetchOp(0)
    fetchOp(1)
  }} />
  
  OpenModal(dispatch,data);
}



const OpenModalCategory = (i, _ID) => {
  let data = {};
  data['zIndex']=150;
  //data['observeResize']=true;
  data['isView']=true;
  data['content'] = <CategoryFilter upd={()=>fetchOp(i)} operation={i} />
  
  OpenModal(dispatch,data);
}



const OpenUploadImageTag = (i) => {
  let data = {};  
  _Util.updStore("ImageProccesDone",null); 
  _Util.updStore("isLoadingReceipt",false);      
  _Util.updStore("ImageProccesData",null); 
  clearForms("_addOrder_",{});
  data['zIndex']=150;
  data['observeResize']=true;
  data['props']={title:"",  operation:i};
  data['content'] = <AddUPSTag operation={i} />; 
  
  OpenModal(dispatch,data);
}
  




const OpenUploadImage = (i) => {
  let data = {};  
  _Util.updStore("ImageProccesDone",null); 
  _Util.updStore("isLoadingReceipt",false);      
  _Util.updStore("ImageProccesData",null); 
  clearForms("_addOrder_",{});
  data['zIndex']=150;
  data['observeResize']=true;
  data['props']={title:"",  operation:i};
  data['content'] = <AddFinance operation={i} />; 
  
  OpenModal(dispatch,data);
}
  



const OpenViewFinance = (items, _ID) => {
  let data = {};
  data['zIndex']=150;
  data['observeResize']=true;
  data['props']={title:"Options", item:items, operation:_ID };
  data['content'] = <ViewFinance />; 
  _Util.updStore('detailByID',{}); 
  if(_ID==="gastos"){
    getGastosById(items.id)
  }
  else if(_ID==="ingresos"){
    getIngresosById(items.id)
  }
  
  
  OpenModal(dispatch,data);
}



  const OpenPlayer = (items, _ID) => {

  }


  const _addVideo = (items, _ID) => {
    let data = {};
    data['zIndex']=150;
    data['observeResize']=true;
    // data['props']={title:"", id: _ID, items:items};
    //data['content'] = AddVideo; 
    
    OpenModal(dispatch,data);
  }


  const _addUser = (items, _ID) => {
    let data = {};
    data['zIndex']=150;
    data['observeResize']=true;
    data['props']={title:"", id: _ID, items:items};
    //data['content'] = AddUser; 
    
    OpenModal(dispatch,data);
  }
  
  const clearForms= (form,v) => {
    if(!v){
      v={};
    }
    let _forms = forms;
    if(!_forms[form]){
      _forms[form] = {};
    }
    _forms[form] = v;    
    dispatch({
      type: 'UPD_KEY_VALUE',
      kv:{key:'forms',value:_forms}
    })   
  }

  const _addUserIPAllowed = (items, _ID) => {
    let data = {};
    data['zIndex']=150;
    data['observeResize']=true;
    data['props']={title:"", id: _ID, items:items};
    data['content'] = <AddUserIPS />; 
    clearForms("newIP_User",items);
    
    OpenModal(dispatch,data);
  }


 


  const _rmvVideo = (items, _ID) => {
    let data = {};
    data['zIndex']=150; 
    data['observeResize']=true;   
    data['props']={title:"", id: _ID, item:items};
    data['content'] = <DeleteVideo />; 
    
    OpenModal(dispatch,data);
  }


  const _getOrdersTrackbyDay = (Id) => {
    getOrdersTrackbyDay(Id,dispatch);
  }


  return { 
    observeChanges, 
    forms, 
    updForms, 
    OpenModalDate,
    updKV,
    OpenUploadImage,
    OpenPlayer,
    OpenViewFinance,
    _addVideo,
    _addUser,
    _addUserIPAllowed,
    fetchOp,
    OpenModalMonth,
    OpenModalYear,
    OpenModalCategory,
    _getOrdersTrackbyDay,
    _OpenSlideFilters,
    DeleteFinanceDialog,
    OpenUploadImageTag,
    _rmvVideo
  }
}






  let lastSearch = 0;

  const handleSearch= (e,operationType,_searchProducts) => {
  let _now = (new Date()).getTime();
      lastSearch = _now;
      let _q_ = e;
      setTimeout(()=>{
        if(_now-lastSearch>=0){         
          _searchProducts(_q_, operationType);
        }
      },500)
     return true;
  }
  
  


  


const FinanceComponent = (props) => {
  const {   
    fetchOp,
    _OpenSlideFilters,
    OpenUploadImage,    
    OpenModalMonth,
    OpenModalYear,
    OpenModalCategory,
    OpenUploadImageTag
  } = useObserveChanges();

  let _state = _Util.getStore();
  let keys = _Util.getGlobalsKeys()
  _state["keys"] = keys;

  const { year, month, totals, monthAll, categories, filterQuery, searchText, fetching, navigations} = _state;
  //const {catgory2F, page, limit, desc, key} = filterQuery || {}; 
  const {catgory2F} = filterQuery || {}; 


  const [initialize, setInitialize] = useState(false);

   const [view, setView] = useState(0);
  const [viewType, setViewType] = useState(0);


  const [tabIndex, setTabIndex] = useState(0); 

  const [searchTextF, setSearchTextF] = useState(""); 

  const [tabShow, setTabShow] = useState(0); 

  const [navStart, setnavStart] = useState(0); 


  const [filtersBackUp, setfiltersBackUp] = useState({}); 

  let userA = _Util.getBrowser();
    
  let isMobile = userA.os === "Android" || userA.os === "iPhone" || _state["outerWidth"]<720 ;
  


  if(filtersBackUp.year!==year || filtersBackUp.month!==month || filtersBackUp.catgory2F!==catgory2F || filtersBackUp.isMobile!==isMobile){
    let flb = filtersBackUp;
    flb["year"] = year;
    flb["month"] = month;
    flb["catgory2F"] = catgory2F;
    flb["isMobile"] = isMobile;
    setnavStart(0);
    setfiltersBackUp(flb);
  }
 

  const _operation_ = tabIndex?"ingresos":"gastos";
  
  let totalOp = totals && totals[_operation_]?totals[_operation_].toFixed(2):0;

  
  let _loadingFetch = fetching && fetching[_operation_];

  let _navigations = navigations && navigations[_operation_];

  let profits = totals?(totals["ingresos"] - totals["gastos"]):0;
  const _tabs = [_Util.translateTxt('expenses'),_Util.translateTxt('income')];
  let _tbs = {"expenses":0,"income":1}
  let _tbsIndx = ["expenses","income"]




const setViewTypeFunc = (d) => {   
  window.scrollTo(0,0); 
  //let operT = dt===0?"gastos":"ingresos";
  if(!_state["gastos"]){
    fetchOp(0);
  }
  if(!_state["ingresos"]){
    fetchOp(1);
  }
  setViewType(d);
  setTabIndex(0);
  setnavStart(0);
}








  useEffect(() => {    
    if(!initialize){
      let _hash = window.location.hash.split('#')[1];
      let pathQuery = _hash && _hash.split('?')[1];
      var s = _Util.parseQuery(pathQuery);
      if(s && s.tb){
        setTabsIndex(_tbs[s.tb]);
      }
      setInitialize(true);
      setTimeout(()=>{
        setView(1);
        fetchOp(tabIndex);
        setTimeout(()=>{
          setTabShow(1)}
        ,375)
      },250)
    }
    if(searchText!==searchTextF){
      setSearchTextF(searchText);      
      let operT = tabIndex===0?"gastos":"ingresos";
      let lrQ =  _state["lastReq"] && _state["lastReq"][operT]?_state["lastReq"][operT]:0;
      let nextReq = _state["fetching"] &&  !_state["fetching"][operT] && _Util.gTm()-lrQ>3500;
      if(nextReq){
        fetchOp(tabIndex);
      }
    }
  });
  

const _printCategoryResume = (upl) => {
  //let _d = tabIndex===0?_state["OrdersTrack"]:_state["OrdersTrackByDay"];
  //PrintCategoryResume(_d);
  let dataObj =  _state[_operation_];
  let _list = _Util.convertObj2Array(dataObj);  
  _list && Print2.PrintMonthResume2(_list, totalOp, _Util.monthsList_Short[month+1], year,catgory2F); 
}






const setTabsIndex = (dt) => {
  if(dt!==tabIndex){
    setTabShow(0);
    setnavStart(0);
    setTabIndex(dt);
    _Util.updStore("monthAll",false);
    let _filterQuery = filterQuery || {};;
    _filterQuery["catgory2F"] = null;
    _Util.updStore("filterQuery",_filterQuery);    
    let operT = dt===0?"gastos":"ingresos";
    let lrQ =  _state["lastReq"] && _state["lastReq"][operT]?_state["lastReq"][operT]:0;
    let nextReq = _state["fetching"] &&  !_state["fetching"][operT] && _Util.gTm()-lrQ>3500;
    if(!_state[operT] && nextReq){
      fetchOp(dt);
    }
    _state["route_history"].push({pathname:`/finances`,search:`?tb=${_tbsIndx[dt]}` })
    setTimeout(()=>{
      setTabShow(1)}
    ,375)
  }
}




const OpenFilters = (dt) => {
  if(isMobile){
    OpenModalCategory(tabIndex);
  }else{
    _OpenSlideFilters(tabIndex);
  }
  
}

// var _rplPnt = new RegExp('.','g')   

let isGraph = viewType === 1;

let _graph =  null;


if(isGraph){
  let multiGraph ={}; 
  let _key2Graph = 'total';
  let graphColor = "#1a73e8";
  let dataObj =  _state[_operation_];  
  let _dataList ={}  
  if(tabIndex===2){    
    _dataList = createListMonthProfit(_state["ingresos"],_state["gastos"],_key2Graph, month);
  }
  else{
    _dataList = createListMonth(dataObj,_key2Graph, month);
  }

  multiGraph['data']={data:_dataList,color:graphColor} 
  let _width = 560;  
  let _height = 300;  
  let _margin = 30;
  if(isMobile){
    _width = 320;  
    _height = 200;
  }
  let xAxle =  createXAxleListMonths(month,_width,_margin);
  _graph = <GraphMultiLine graph={multiGraph} axleX={xAxle} margin={_margin} WidthGraph={_width} HeightGraph={_height}/>  
}

    return (
      <>      
        <div className={`mainView whiteTheme`}>       
          <div className={`_wrpView2_ ${view && 'visible'}`}>
            {view? 
            <div className={`${isMobile?"":"isDsktp"}`} >  
            
              <div className={'_dsplFlx  '} style={{margin:!isMobile ?'2px 20px 2px':""}}>  
                {!isMobile ?
                <div  className={` _dsplFlx `}  style={{margin:'20px 20px 2px'}}> 
                  <div  className={` ${viewType?"":"active"}`}  onClick={()=>OpenFilters()}> 
                      <Icons 
                        name={'filter'} 
                        color={'#555'} 
                        size={24}
                        ripple={true}
                        //  tooltip={'filters'}
                        //extraClass={'view'}
                      />
                  </div>
                </div>
                :null}
                {isMobile ?
                <div  className={` _dsplFlx `}  style={{margin:'30px 20px 2px'}}> 
                  <div  className={`_history_acctions _dsplFlx`}> 
                    <div  className={`_label`}> 
                    {_Util.translatetext(24)}:
                    </div>
                    <div  className={`_value`}  onClick={()=>OpenModalYear(tabIndex)}> 
                      {year}
                    </div>
                    { <div  className={`_arrow_separator`} /> }
                    { <div  className={`_label`}> 
                    {_Util.translatetext(25)}:
                    </div>}
                    {<div  className={`_value`} onClick={()=>OpenModalMonth(tabIndex)}> 
                      {monthAll?'All':_Util.monthsList_Short[month+1]}
                    </div>}
                  </div>
                </div>
                :null}
                <div className="flexSpace"/>   
                <div  className={` _dsplFlx `}  style={{margin:'20px 20px 2px'}}>                 
                  <div  className={`_groupBtn left ${viewType?"":"active"}`}  onClick={()=>setViewTypeFunc(0)}> 
                    <Icons 
                      name={'view_list'} 
                      color={'#555'} 
                      size={24}
                      //ripple={true}
                      //tooltip={'details'}
                      //extraClass={'view'}
                    />
                  </div>
                  <div  className={`_groupBtn right ${viewType?"active":""}`}  onClick={()=>setViewTypeFunc(1)}>  
                    <Icons 
                      name={'analytics'} 
                      color={'#555'} 
                      size={24}
                      //ripple={true}
                      //tooltip={'details'}
                      //extraClass={'view'}
                    />
                  </div>
                </div>
              </div>

              {isMobile && catgory2F && categories[catgory2F] ?
              <div className={'_dsplFlx  '} style={{margin:'20px 20px 2px'}}>               
                <div  className={`_history_acctions _dsplFlx`}>                   
                  <div  className={`_label`}> 
                  {_Util.translatetext(23)}:
                  </div>  
                  <div className={`_value _ellipsized`} onClick={()=>OpenModalCategory(tabIndex)}> 
                    {catgory2F?categories[catgory2F]?categories[catgory2F]['name']:"All":"All" }
                  </div>
                </div>   
              </div>
              :null}
              {!isGraph?
              <>  
              <div className={`_dsplFlx  `} style={{margin:'10px 20px 2px'}}>  
                  {isMobile ?
                  <div  className={` _dsplFlx `} > 
                    <div  className={` ${viewType?"":"active"}`}  onClick={()=>OpenFilters()}> 
                        <Icons 
                          name={'filter'} 
                          color={'#555'} 
                          size={24}
                          ripple={true}
                          //  tooltip={'filters'}
                          //extraClass={'view'}
                        />
                    </div>
                  </div>
                  :null} 
                <span className={`_captBtn `} onClick={()=>_printCategoryResume()}>
                  <BTNH theme={`light_blue`} title={_Util.translatetext(328)}/>
                </span>              
                <div className="flexSpace"/> 
                <div className={' _totals_  '}>
                  $ {totalOp}    
                </div>       
                <span className={`_captBtn`} onClick={()=>OpenUploadImage(tabIndex=== 0 ? "gastos":"ingresos")}>
                  <BTNH theme={`light_blue`} title={_Util.translatetext(323)}/>
                </span>   
              
                {/*
                  <span className={`_captBtn`} onClick={()=>OpenUploadImageTag(tabIndex=== 0 ? "gastos":"ingresos")}>
                  <BTNH theme={`light_blue`} title={'capture Tag'}/>
                </span>   
                */}              
              </div>          
             <div className={`_addMrgBtn`} style={{margin:'0 10px'}}>
             <TabsHRM data={_tabs}  UpdateIndex={(i)=>setTabsIndex(i)}  pth={'finance'} indexTab={tabIndex}/>
             <div className={`_fncView_ wdt100  ${tabIndex===0 && 'visible'}`}  style={{margin:'0px', width:"98%"}}>
              {tabIndex=== 0 ? 
              <div className={'_desktopV  '} > 
                {tabShow?
                <>
                <NavigationHRM loading={_loadingFetch} navigation={_navigations}  operations={_operation_} fethOp={()=>fetchOp(tabIndex)}/>   
                <div className={' htWpr_d8 scrollViewFnc2  '} 
                  //onScroll={(e)=>scrollhandlerView(e)}
                >
                { 
                  _state["gastos"] && Object.keys(_state["gastos"]).map((fV,ind_l)=>{
                   
                      let slc = _state["gastos"][fV];
                      if(isMobile){
                        return (
                          <ItemFinanceMobileRender slc={slc} indeX={ind_l} operation={"gastos"}  key={_Util.gen12CodeId()}/>
                        )
                      }else{
                        return (
                          <ItemFinanceRender slc={slc} indeX={ind_l} operation={"gastos"}  key={_Util.gen12CodeId()}/>
                        )
                      }
                    
                  })
                }
              </div>
              </>
                :null}              
              </div>
              :null
            
            }
          </div>
          <div className={`_fncView_ wdt100  ${tabIndex===1 && 'visible'}`}  style={{margin:'0px', width:"98%"}}>
              {tabIndex=== 1 ? 
              <div className={'_desktopV  '} >
                {tabShow?
                <>
                <NavigationHRM loading={_loadingFetch} navigation={_navigations} operations={_operation_} fethOp={()=>fetchOp(tabIndex)}/>               
               <div className={' htWpr_d8 scrollViewFnc2 '} 
                //onScroll={(e)=>scrollhandlerView(e)}
               >
                { 
                  _state["ingresos"] && Object.keys(_state["ingresos"]).map((fV,ind_l)=>{
                      //let slc =fV; 
                      let slc = _state["ingresos"][fV];                  
                      if(isMobile){
                        return (
                          <ItemFinanceMobileRender slc={slc} indeX={ind_l} operation={"ingresos"}  key={_Util.gen12CodeId()}/>
                        )
                      }else{
                        return (
                          <ItemFinanceRender slc={slc} indeX={ind_l} operation={"ingresos"}  key={_Util.gen12CodeId()}/>
                        )
                      }
                    
                  })
                }
              </div>
              </>
              :null}            
              </div>
              :null
            
            }
          </div>
          </div>
          </>
          :null}

          {isGraph?
            <>     
             <div className={`_addMrgBtn`} style={{margin:'0 10px'}}>  

              <div className={'  roWTd_Itm_ graphBtn '} key={_Util.gen12CodeId()}>
                <div  className={'_dsplFlx   tZjT9b pym81b '}>
                  <div class={`fNm5wd qs41qe ${tabIndex===1?"_active":""}`} onClick={()=>setTabsIndex(1)}>
                    <div class="RbBDcc" id="c2">{_Util.translatetext(54)}</div>
                    <div class="UvMayb" aria-describedby="c2">{totals && totals["ingresos"]?totals["ingresos"].toFixed(2):0}</div> 
                  </div>  
                  <div className="flexSpace"/> 
                  <div  className={`_arrow_separator`} />  
                  <div className="flexSpace"/> 
                  <div class={`fNm5wd qs41qe ${tabIndex===0?"_active":""}`} onClick={()=>setTabsIndex(0)}>
                    <div class="RbBDcc" id="c2">{_Util.translatetext(53)}</div>
                    <div class="UvMayb" aria-describedby="c2">{totals && totals["gastos"]?totals["gastos"].toFixed(2):0}</div> 
                  </div>   
                  <div className="flexSpace"/> 
                  <div  className={`_arrow_separator`} />    
                  <div className="flexSpace"/>                          
                  <div class={`fNm5wd qs41qe ${profits<0?"_loosing":""} ${tabIndex===2?"_active":""}`} onClick={()=>setTabsIndex(2)}>
                    <div class="RbBDcc" id="c2">{_Util.translatetext(112)}</div>
                    <div class="UvMayb" aria-describedby="c2">{profits.toFixed(2)}</div> 
                  </div>    
                </div>
              </div>
              <div  className={`  `}  style={{margin:'20px 0px'}}> 
                {_graph}
              </div>
             <div className={`_fncView_ wdt100  ${tabIndex===0 && 'visible'}`}  style={{margin:'0px', width:"98%"}}>
              {tabIndex=== 0 ? 
              <div className={'_desktopV  '} > 
                
              </div>
              :null
            }
          </div>
          <div className={`_fncView_ wdt100  ${tabIndex===1 && 'visible'}`}  style={{margin:'0px', width:"98%"}}>
              {tabIndex=== 1 ? 
              <div className={'_desktopV  '} >
                
              </div>
              :null
            }
          </div>
          </div>
          </>
          :null}
        </div>
         :null
        }
          </div>
          <div  style={{margin:'0px 0px'}}/>
        </div>
        <style>         
        </style> 
       
      </>
    );
  
}  


export default withRouter(withRedux(FinanceComponent))




const ItemFinanceRender = (props) => {  

  const {  
    DeleteFinanceDialog,
    OpenViewFinance,
  } = useObserveChanges();
  const {  
    slc,
    operation,
    indeX
  } = props;

  const [isVisible, setIsVisible] = useState(false); 

 
  let _state = _Util.getStore();
  let keys = _Util.getGlobalsKeys()
  _state["keys"] = keys;


  let ItId=`_${keys[83]}_${indeX}_`;


  const scrollhandlerView = (e) => { 
    let sc = e;
    let Elm = document.getElementById(ItId);    
    var dm = _Util.offset(Elm);
    var _top = dm.top;
    if(_top>=sc-50 && _top<=(sc+window.innerHeight)+350){
      setIsVisible(true)
    }
  }

  return (    
    <div id={ItId} className={`roWTd ${isVisible?"visible":""}`} key={_Util.gen12CodeId()}>
     {isVisible?
      <div className={'_dsplFlx showActions'}>
        <div className={'coLTd flxbsc30 _total2 '}   onClick={()=>OpenViewFinance(slc,operation)} >
            <div  className={'locations _link_'}> {slc && slc['title']}</div>
        </div>
        <div className="flexSpace"/>  
        <div className={'coLTd flxbsc20 _total2 '}   onClick={()=>OpenViewFinance(slc,operation)}>
            <div  className={'locations _link_'}> {slc && slc['category'] && slc['category']["name"]}</div>
        </div>
        <div className="flexSpace"/>  
        <div className={'_dsplFlx flxbsc30'}>
          <div className={'_dsplFlx hide_when_action flxbsc90'}>
            <div className={'_dsplFlx flxbsc40 _price_'}>                         
              <div className={'coLTd  _total2  _price_ '}>
                  <div  className={'locations _link_'}> {slc && slc['import'].toFixed(2)}</div>
              </div>                       
            </div>
            <div className={'_dsplFlx  flxbsc60'}>                         
              <div className={'coLTd  _total2 '}>
                  <div  className={'locations _link_'}> {slc && slc['date'] && _Util.date2pretyfy(slc['date'])}</div>
              </div>                         
            </div>
          </div>
          <div className={'_actions_Wrp_ flxbsc90'}>
            <div className="flexSpace"/>  
            <div className={'_actions_Btns_ flxbsc40'}>                             
              <div className={``} onClick={()=>OpenViewFinance(slc,operation)} >
                  <Icons 
                    name={'outline_view'} 
                    color={'#555'} 
                    size={24}
                    ripple={true}
                    //tooltip={'details'}
                    extraClass={'view'}
                  />
              </div>                           
              <div className={'_spaceMrg_'}/>
              <div onClick={()=>DeleteFinanceDialog(slc,operation)}>
                <Icons 
                  name={'outline_delete'} 
                  color={'#555'} 
                  size={24} 
                  ripple={true}
                  //tooltip={'delete locations'}
                  extraClass={'delete'}
                />
              </div>
            </div>
          </div>
        </div>
      </div>: 
      <WithScroll scrollhandler={(e)=>scrollhandlerView(e)}/>
      }
    </div>
  )
}









const ItemFinanceMobileRender = (props) => {  

  const {  
    OpenViewFinance,
    DeleteFinanceDialog
  } = useObserveChanges();
  const {  
    slc,
    operation,
    indeX
  } = props;

  const [isVisible, setIsVisible] = useState(false); 


  let _state = _Util.getStore();
  let keys = _Util.getGlobalsKeys()
  _state["keys"] = keys;

  let ItId=`_${keys[83]}_${indeX}_mobile_`;


  const scrollhandlerView = (e) => { 
    let sc = e;
    let Elm = document.getElementById(ItId);   
    var dm = _Util.offset(Elm);
    var _top = dm.top;
    if(_top>=sc-50 && _top<=(sc+window.innerHeight)+350){
      setIsVisible(true)
    }
  }
 
  return (
    <div  id={ItId} className={` roWMbilTd  ${isVisible?"visible":""}`} key={_Util.gen12CodeId()}>
      {isVisible?
      <div  className={'_dsplFlx showActions '}>
        <div className={'flxbsc60 '} onClick={()=>OpenViewFinance(slc,operation)}>
          <div className={'  _date_finance '}>
            <div  className={'_text_ _ellipsis'}> {slc && slc['date'] && _Util.date2pretyfy(slc['date'])}</div>
          </div> 
          <div className={'  _category_finance '}   >
              <div  className={'_text_ _ellipsis'}> {slc && slc['category'] && slc['category']["name"]}</div>
          </div>
          <div className={'  _title_finance '} >
              <div  className={'_text_ _ellipsis'}> {slc && slc['title']}</div>
          </div> 
          
        </div>      
        <div className="flexSpace"/>  
        <div className={'_dsplFlx flxbsc30'}>
          <div className={'_dsplFlx  '}>                         
            <div className={'coLTd  _total2 '}>
                <div  className={'locations _link_'}> {slc && slc['import']}</div>
            </div>                         
          </div>
        </div>
      </div>: <WithScroll scrollhandler={(e)=>scrollhandlerView(e)}/>}
    </div>
  )
}



var _dayPerMonth = [31,_Util.febMaxDays((new Date()).getFullYear()),31,30,31,30,31,31,30,31,30,31];


function createListMonth(ing,_key,m){
  var gDays = {}
  const _days = m?Array.from(Array(Math.floor(_dayPerMonth[m])).keys()):[];
  _days.map((mnt,In0)=>{
    if(!gDays[mnt]){
      gDays[mnt+1] =0
    }
  })   
  ing && Object.keys(ing).map((dt,In2)=>{    
    var _date = (new Date(ing[dt]['date'])).getDate(); 
    if(!gDays[_date]){
      gDays[_date] = ing[dt]['import']
    }
    else if(gDays[_date]){
      gDays[_date] += ing[dt]['import'];
    }    
  })

  return gDays;
}




function createXAxleListMonths(m,_width,margin){
  var y = [];
  const _days = Array.from(Array(Math.floor(_dayPerMonth[m])).keys());
  _days.map((mnt,In2)=>{
    let multiplier = (_width-margin)/_dayPerMonth[m];
    var xIn = (In2*multiplier)+margin;
    var _label_ = In2%2===0?`${In2+1}`:'';  
    y.push({x:xIn,label:_label_})
  })
  return y;
}




function createListMonthProfit(ing,gast,_key,m){
  var gDays = {}
  const _days = m?Array.from(Array(Math.floor(_dayPerMonth[m])).keys()):[];
  _days.map((mnt,In0)=>{
    if(!gDays[mnt]){
      gDays[mnt+1] =0
    }
  })   
  ing && Object.keys(ing).map((dt,In2)=>{    
    var _date = (new Date(ing[dt]['date'])).getDate(); 
    if(!gDays[_date]){
      gDays[_date] = ing[dt]['import']
    }
    else if(gDays[_date]){
      gDays[_date] += ing[dt]['import'];
    }    
  })
  gast && Object.keys(gast).map((dt,In2)=>{    
    var _date = (new Date(gast[dt]['date'])).getDate(); 
    if(!gDays[_date]){
      gDays[_date] = (gast[dt]['import']*-1)
    }
    else if(gDays[_date]){
      gDays[_date] += (gast[dt]['import']*-1);
    }    
  })

  return gDays;
}

