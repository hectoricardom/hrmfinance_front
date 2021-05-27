
import React, { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'

import * as _Util from '../store/Util'

import {  CloseSlideMenu,  } from '../actions/common'

import { NavLink} from 'react-router-dom';


import loadable from '@loadable/component'



const Icon2 = loadable(() => import('./Icons'))



const routerListIndex = {"finance":0,"group_list":1,"shopping_cart":2, "dashboard":3,"inventory":4, "agents":5, "stores":6,"users":7,"receivers":7,"deliverys":9, "logout":10}
/*
const routerListPathIndex = {
  "/finances":0,
  "/loans":1,
  "/inventory":2,
  "/daycare":3,
  "/departments":4,
  "/categories":5,
  "/settings":6,
  "/logout":7
}
*/
const routerListDefault ={  
  
  'categories':true,
  //'settings':true,
  'logout':true
}



const useObserve = () => {
  const observe =  useSelector(state => state.observeChanges);
  const forms =  useSelector(state => state.forms);
  const dispatch = useDispatch()

  const close = (Id) => {
    CloseSlideMenu(dispatch,{id:Id});    
  }

 



  return { observe,  close, dispatch }
}







const SlideMenuOptionsComponent = (props) => {  
  const {data, operation} = props;  
  const { observe,  close,  dispatch } = useObserve();
  let _state = _Util.getStore();  
  const {  navIndex } = _state;


  const updParams = (y) => {
    dispatch({
      type: 'UPD_KEY_VALUE',
      kv:{key:'observeChanges',value:_Util.gen12CodeId()}
    })
    close(data.modalID);    
  }


  const revokeAllScopes = () => {
    const gapi = window.gapi;
    const auth2 = gapi.auth2 && gapi.auth2.getAuthInstance();
    auth2.disconnect();
    _Util.updStore('singinView',true);
    _Util.updStore('userProfile',null);
    dispatch({
      type: 'UPD_KEY_VALUE',
      kv:{key:'observeChanges',value:_Util.gen12CodeId()}
    })
  }




  const UpdateIndex = (i,tb) => {
    _Util.updStore("navIndex",i);
    if(i===10){
      updParams();
      _state["route_history"].push({pathname:"/marketplace"})
      revokeAllScopes();
      //document.cookie = `g_tk_id=${""}; expires=${null}; path=/;g_state = {"i_l":1,"i_p":${null}}`; 
      //window.location.reload();
    }else{
      updParams();
      //CloseSlideMenu(dispatch,{id:data.modalID})
    }
  }

let _navIndex = navIndex || 0;

  
const [initialize, setInitialize] = useState(false);
// let userProfile = _state["userProfile"];



useEffect(() => {    
  if(!initialize){ 
      let _hash = window.location.hash.split('#')[1];
      let path = _hash && _hash.split('?')[0] && _hash.split('?')[0].split('/')[1];
      let i = routerListIndex[path];
      _Util.updStore("navIndex",i);
      dispatch({
        type: 'UPD_KEY_VALUE',
        kv:{key:'observeChanges',value:_Util.gen12CodeId()}
      })
    setInitialize(true);
  }
});

var _thumbnailJson = _state['thumbnailJsonBlob'] && _state['thumbnailJsonBlob']["qvaMarket_logo2.png"];
let _blobrequested =  _thumbnailJson && _thumbnailJson['requested'];
let _blob = _blobrequested? _thumbnailJson['blob'] : null;


var _div_List  = <> 
  <div  className={`header_title`}>
    <NavLink  to={{pathname:"/marketplace"}}>
      <div className={`_dsplFlx`}>
        {_blob?<img src={_blob} alt="qvaMarket"/>:null}
        <div  className={`title`}>
          {``}
        </div>
      </div>
    </NavLink>              
  </div>
</>

const routerList = _Util.routerList();

let userProfile = _state["userProfile"];



  return (
    <>
      <div className={`menuslide_wrp`}  {...data.modalID?{"dialog-key-id":data.modalID}:""}> 
        {_div_List}
        
        <div className="loT5Qd xwW5Ce FxfUvb xvt5Cx">
        {routerList.map((tb,i)=>{
          let active_ = _navIndex===i;
          if(!tb.isR){
            let isValid = false;
            if(userProfile["email"]){
              isValid = true;
            }else{
              if(!(i===10 || i===1)){
                isValid = true;
              }
            }

            if(isValid){
              return(
                <NavLink  to={{pathname:tb.path}} onClick={()=>UpdateIndex(i,tb)}  key={i+"sld_mn"}>
                  <div className={`DX0ugf ApBhXe nqSzVe ${active_?'_activeNav':''}`} role="button" tabIndex={i} style={{color:"rgba(60,64,67,1)"}}>
                    <div className="CfDnHe">
                      <Icon2 name={tb.icon} size={24}/>
                    </div>
                    <span className="hKCo7d">{_Util.translatetext(tb.lbl) } </span>
                  </div>
                </NavLink> 
              )
            } 
            else{
              return null
            }

          }else{
            let isInv = tb.inventory && _state["allowInventory"];
            let isOnIn = tb.onlyAgent && _state["allowInventory"];
            let isOnqv = tb.onlyAgent && _state["isqvmAgent"];
            let isDlv = tb.onlyDrivers && _state["isDelivery"];
            let isStr = tb.onlyStore && _state["isStore"];
            let isValid = false;
            
            if(_Util.IsAdmin() || isInv || isOnIn || isOnqv || isDlv || isStr){
              isValid = true;
            }
            if(isValid){
              return(
                <NavLink  to={{pathname:tb.path}}  onClick={()=>UpdateIndex(i,tb)}  key={i+"sld_mn"}>
                    <div className={`DX0ugf ApBhXe nqSzVe ${active_?'_activeNav':''}`} role="button" tabIndex={i} style={{color:"rgba(60,64,67,1)"}}>
                      <div className="CfDnHe">
                        <Icon2 name={tb.icon} size={24}/>
                      </div>
                      <span className="hKCo7d">{_Util.translatetext(tb.lbl) } </span>
                    </div>
                  </NavLink>
              )
            }else{
              return null;
            }
          }
        })}
        </div>    
        </div>  
      <style>{AddUser_styles}</style>
    </>
  )
}




export default SlideMenuOptionsComponent




const AddUser_styles = `

`

