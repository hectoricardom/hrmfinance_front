
import React, { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import * as _Util from '../store/Util'
import { withRedux } from '../store/redux';

import { Switch, Route ,withRouter} from 'react-router-dom';


import { UpdateRdx, LoadData, getSectionByGtoken, getAnonymusTknWe, initSocket, initWebSocketClient, getDispatch } from '../actions/common';

import loadable from '@loadable/component'

// const AsyncPage = loadable(props => import(`./${props.page}`))



import  './_styles.css';





const Header = loadable(() => import('./Header'))

const DialogModal = loadable(() => import('./SlideModalHRM'))

const LoadingColorSpinner = loadable(() => import('./LoadingColorSpinner'))

const DialogHRM = loadable(() => import('./DialogHRM'))

const Toast = loadable(() => import('./Toast'))

const SlideModalHRM = loadable(() => import('./ViewSlideHRM'))

const Footer = loadable(() => import('./Footer'))

const SlideMenuOptionsComponent = loadable(() => import('./SlideMenuOptions'))


/*************************  Finance ******************************/

const OrdersHistory = loadable(() => import('./pages/Finances/OrdersHistory'))

const AddOpera = loadable(() => import('./pages/Finances/viewAddOperation'))

const EditOpera = loadable(() => import('./pages/Finances/viewEditOperation'))


const GroupList = loadable(() => import('./pages/Finances/GroupList'))



//*************************  UsersAgents ******************************

const UserHandler = loadable(() => import('./pages/usersAgents/UserHandler'))





/*************************  MarketPlace ******************************




const MarketPlace = loadable(() => import('./pages/MarketPlace'))

const MarketProductDetails = loadable(() => import('./pages/MarketProductDetails'))

const ShoppingCart = loadable(() => import('./pages/ShoppingCart'))





//*************************  Movements ******************************



const MovementsList2 = loadable(() => import('./pages/Movements/Movements'))

const MovementDetails = loadable(() => import('./pages/Movements/MovementDetails'))




const OrdersHistoryDetails = loadable(() => import('./pages/Movements/OrdersHistoryDetails'))




//*************************  UsersAgents ******************************

const Receivers = loadable(() => import('./pages/usersAgents/Receivers'))

const UserHandler = loadable(() => import('./pages/usersAgents/UserHandler'))

const AgentHandler = loadable(() => import('./pages/usersAgents/AgentHandler'))





//*************************  ProductsInventory ***************************** *

const ProductsInventory = loadable(() => import('./pages/ProductsInventory/productStock'))

const InventoryM = loadable(() => import('./pages/ProductsInventory/InventoryM'))

const Product2Edit = loadable(() => import('./pages/ProductsInventory/editProduct'))



//*************************  StoresShop ***************************** *



const EditIngredients = loadable(() => import('./pages/StoresShop/editIngredients'))

const StoresCostTab = loadable(() => import('./pages/StoresShop/CostTab'))

const IngredientsList = loadable(() => import('./pages/StoresShop/IngredientsInv'))

const IngredientsMov = loadable(() => import('./pages/StoresShop/CompletedMov'))

const Stores = loadable(() => import('./pages/StoresShop/StoreView'))

const MovementDetailStore = loadable(() => import('./pages/StoresShop/MovementDetailStore'))


//*************************  DeliveryDrivers ******************************

const DeliveryDriver = loadable(() => import('./pages/DeliveryDrivers/DeliveryDriver'))



*********************************************************************/


let auth2 = null;


const _styleWatch = (idWatch) => {  
  return `
  ._${idWatch}{
    --heliumPlayer__bckcolor_blck_opacity_:rgba(10,10,10,.695);
    --hxrymz_color_base_hover: #ff7817;
    --hxrymz_color_base_label: #c6c6c6;
    --hxrymz_panel_background_color: #242424;
    --hxrymz_color_base_detail_label: #c6c6c6;
    --hxrymz_color_base_detail_dark_label: #e5e5e5;
    --hxrymz_color_base_detail_gray_label: #2a2a2a;
    --hxrymz_app_background_color: #263238;
  }

  `
}






const useObserveChanges = () => {
  const observeChanges =  useSelector(state => state.observeChanges);
  const _state =  {};  
  const rdxOK = useSelector(state => state.rdxOK);
  const goDark = useSelector(state => state.goDark);
  
  const dispatch = useDispatch();
  const updKV= (k,v) => {
    dispatch({
      type: 'UPD_KEY_VALUE',
      kv:{key:k,value:v}
    })  
    dispatch({
      type: 'UPD_KEY_VALUE',
      kv:{key:'observeChanges',value:_Util.gen12CodeId()}
    })  
  }

  const getState= () => {
    return _state;
  }

  const _LoadData= (q) => {
    LoadData(q,dispatch);
  }
  

  if(!rdxOK){
    UpdateRdx(dispatch, getState )
  }
 


  return {  updKV,  _LoadData, dispatch, goDark }
}



let options = null


var intAuth = null;

const Browser= (props)=>{
 
  const {  updKV, dispatch } = useObserveChanges();

  let _state = _Util.getStore();
  let keys = _Util.getGlobalsKeys();
  let idWatch = "";
  let classN = "";

  const [initialize, setInitialize] = useState(false);  
  const [obs, setObs] = useState(0);  


  const [authenticate, setAuthenticate] = useState(1);  
  const [code, setCode] = useState("");  
  const [codeErr, setCodeErr] = useState(false);  

  

  let userProfile = _state["userProfile"];


  useEffect(() => {
    let _store = _Util.getStore();    
    if(props.history && !_store["route_history"]){
      _Util.updStore('route_history',props.history);
      updKV("route_history",props.history);
      if(props.location ){
        if(props.location.pathname ===  "/" || props.location.pathname ===  "/logout"){
          props.history.push({pathname:"/finance"})
          window.scrollTo(0,0)
        }
      }
    }
    if(!initialize){

    
      initWebSocketClient();
      var h = document.getElementById("g_signin2_bx");
      if(h){
        h.hidden = true;
      }
      window.scrollTo(0,0)
      setInitialize(true);
      let filtersMov = _state["filtersMov"] || {}

      if(!filtersMov["year"]){
        filtersMov["year"] = (new Date()).getFullYear();
      }
      if(!filtersMov["month"]){
        filtersMov["month"] = (new Date()).getMonth();
      }

      _Util.updStore("filtersMov",filtersMov)
      setTimeout(()=>{
        let cmp = <Header/>;
        cmp = <OrdersHistory/>;
        cmp = <SlideMenuOptionsComponent/>;
        cmp = null;
      },450)
      
      _Util.initConfig(dispatch).then(d=>{
        setTimeout(()=>{
          _Util.getBrowser();         
          idWatch = keys[99];
          classN = _styleWatch(idWatch)
          _Util.updStore('imageBlob',false);          
          window.scrollTo(0,0);
          _Util.initCryptoJS();
          if(!_Util.genFP16bytes(true)){
            _Util.initFingerprint2();
          }
          verifyTk();
        },350)
        
      })
    }
  });


  const verifyTk = async () => {  
    let id_token = _Util.check_cookie_name("g_tk_id") || window.localStorage.getItem("g_tk_id");
    if(id_token){
      let Qry = {
        params:{
          sectionId:id_token
        },
        query:"validateSectionId"
      };
      const res = _Util.fetch_auth_validation(_Util.get_GRAPHQLURL(),Qry);
      const td = await res;
      if(td && td.token){
        _Util.setSectionId(td.token);
        _Util.setsectionKey(td.sectionKey);
        _Util.updStore('userProfile',td.user);
        _Util.updIsAdmin(td.isAdmin);
        _Util.updStore('isqvmAgent',td.user && td.user.isqvmAgent)
        _Util.updStore('allowInventory',td.user && td.user.allowInventory);
        dispatch({
          type: 'UPD_KEY_VALUE',
          kv:{key:'observeChanges',value:_Util.gen12CodeId()}
        })
      }
      else{
        intAuthFunc()
      }
    }
    else{
      intAuthFunc()
    }
  }


  const intAuthFunc = () => {  
    intAuth = setInterval(()=>{
      _Util.initCryptoJS();
      if(_Util.genFP16bytes(true)){
        // initSocket();
      
        let _gapi = window.gapi;
        if(_gapi){
          auth2 = _gapi.auth2 && _gapi.auth2.getAuthInstance();    
          if(auth2){
            auth2.isSignedIn.listen(()=>{
              validateToken(auth2);
              //_Util.updStore('singinView',null);
              setObs(_Util.gen6CodeId())
            });
            auth2.currentUser.listen(()=>{
              validateToken(auth2);
            });
            validateToken(auth2);
            userProfile = _state["userProfile"];
            if(userProfile && userProfile["id"]){
              if(intAuth){
                clearInterval(intAuth);
              }
            }
          }
        }
      }
      else{
        _Util.initFingerprint2();
      }
      setObs(_Util.gen6CodeId())
    },450);

  }


  const OpenLogin = (e) => {
    var h = document.getElementById("g_signin2_bx");
    h.hidden = false;
    _Util.updStore('singinView',true);
    setObs(_Util.gen12CodeId());
  }




const validateToken = (auth2) => {  
  var h = document.getElementById("g_signin2_bx");

  let isSignedIn = auth2 && auth2.isSignedIn.get();

  if(!isSignedIn){
    //h.hidden = false;
 
    let Qry = {
      query:"getAnonymusTknWe"
    };
    OpenLogin();
    /*
    getAnonymusTknWe(Qry, dispatch)
    */
  }
  else if(isSignedIn) {
    
    h.hidden = true;
    let currentUser = auth2.currentUser.get()
    var id_token = currentUser.getAuthResponse().id_token;
    var access_token = currentUser.getAuthResponse().access_token;
    let Qry = {
      params:{
        id_token:id_token,
        access_token:access_token
      },
      query:"getGoogleUserbyToken"
    };
    getSectionByGtoken(Qry, dispatch)
  }
  setObs(_Util.gen6CodeId())
}

const passCode = (e) => {  
  setCode(e.target.value);
  if("MTAxMTI4"===_Util.Base64.encode(e.target.value)){
    setAuthenticate(true);
  }else if(e.target.value.length>=6){
    if(!codeErr){
      setCodeErr(true);
    }
  }else{
    if(codeErr){
      setCodeErr(false);
    }
  }
} 



if(props.location ){
  if(props.location.pathname ===  "/" || props.location.pathname ===  "/logout"){
    props.history.push({pathname:"/finance"});
    window.scrollTo(0,0)
  }
}

let userA = _Util.getBrowser();
  
let isMobile = userA.os === "Android" || userA.os === "iPhone" || _state["outerWidth"]<550 ;


let appLoaded = true;


let singinView = _state["singinView"];


if(singinView){
  return (
      <div>
      </div>
  )
}
else if(appLoaded && userProfile && userProfile["id"] &&  _Util.getsectionKey()){
    return (
      <>
      {authenticate?
      <div  id={keys[90]} is-mobile={`${isMobile}`} >
          <div className={!isMobile?'_app_body_content_':""}>  
            <div id={`data_ui_${keys[93]}`}  className={'hrm_finance'} style={{position:"static"}}>
              <>
              <Header />
              <div style={{ minHeight:"1100px"}}>
              <Switch>
                
                  <Route path={"/finance"} component={OrdersHistory} />
                  <Route path={"/add_operation"} component={AddOpera} />
                  <Route path={"/edit_operation"} component={EditOpera} />
                  <Route path={"/group_list"} component={GroupList} />
                  {_Util.IsAdmin()?
                  <>
                    <Route path="/users" component={UserHandler} />
                  </>
                  :null}

              </Switch>
              </div>
            
              </>
            </div>
          </div>   
          <style>{classN}</style>
        </div>
        :null}
        {authenticate?
        <>
          <BackDrop />
          <DialogModal/>
          <DialogHRM/>
          <SlideModalHRM />
          <Toast/>
        </>
        :null}
      </>
    )
  }
  else{
      return (
        <>
        <div className={`_dsplFlx spaceAround loadingContainer`}>
          <LoadingColorSpinner stroke={'#1a73e8'} height={120} width={120}/>
        </div>
        </>
      )
    
  }
  
} 


export default  withRouter(withRedux(Browser))



const BackDrop= ()=>{
  const {  goDark } = useObserveChanges();
  const _goDark = goDark?1:0;
  return(
    <div className="backDrop"  tabIndex="-1" style={{opacity: _goDark, zIndex:_goDark?5000:-1}}>
      <div className="previewModal--backDrop" tabIndex="-1" data-uia="previewModal--backDrop" style={{display: _goDark?"block":"none"}}></div>
    </div>
  )
}
