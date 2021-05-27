import React, { useState,useEffect } from 'react'
import { NavLink } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux'
import * as _Util from '../store/Util'
import loadable from '@loadable/component'



import { getThumbnailImg, OpenSlideMenu, OpenModal, loadShoppingCart } from '../actions/common';

/*
import LOGIN from './login';
import PROFILE from './Profile';
*/



import ScrollPosition from './scroll-decorator';

import './_styles.css';





const Icon2 = loadable(() => import('./Icons'))

const SlideMenuOptionsComponent = loadable(() => import('./SlideMenuOptions'))

const ProfileModal = loadable(() => import('./profileModal'))





const useObserveChanges = () => {
  const observeChanges =  useSelector(state => state.observeChanges);
 
  const dispatch = useDispatch();

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


  

  let _dispatch_ = dispatch;
  return {_dispatch_, updKV, observeChanges}
}



const HeaderFlx =() => {


  const {  observeChanges, _dispatch_ } = useObserveChanges();
  let _state = _Util.getStore();


  const [hover, setHover] = useState(null);
  const [hoverNav, setHoverNav] = useState(null);
  const [initialize, setInitialize] = useState(0);

  const [text, setText] = useState("");

  const [headerTransparent, setHeaderTransparent] = useState(true);

  getThumbnailImg("qvaMarket_logo2.png",_dispatch_);


  let userProfile = _state["userProfile"];


  const shopping_cart = _state["shopping_cart"] || {};
  
  let shQty = calc_qty_cart(shopping_cart);
  

  let _userId = _Util.getProfileId();

  const changePathSearch = (e) => {
    setHover(false);
    setText("");
    let ii = document.getElementById("_search_input_header_");
    if(ii){
      ii.value = "";
    }
    setHoverNav(false);
  }
  

  useEffect(() => {
    if(!initialize){
      setInitialize(1);
      let QrySC = {
        params:{userId:_userId},
        query:"getShoppingCartbyUserId"
      };
      loadShoppingCart(QrySC)
      let h = <SlideMenuOptionsComponent/>
      h = null;
    }
  })

  const revokeAllScopes = () => {

  }

  const _openSlidemenu = () => {
    let data = {};
    data['zIndex']=350;
    data['width']="280px";
    data['direction']="left";
    data['overlay']=true;
    data['props']={title:""};
    data['content'] = <SlideMenuOptionsComponent />;
    OpenSlideMenu(_dispatch_,data);
  }



  const _openProfile = (item) => {
    let data = {};
    data['zIndex']=450;
    data['observeResize']=true;    
    data['props']={item:item, minHeight: '1vh'};
    data['content']=<ProfileModal />;
    OpenModal(_dispatch_,data);
  }
  



  const handleScroll = (e) => {

    if(e>50){
      setHeaderTransparent(false)
    }else{
      setHeaderTransparent(true)
    }
  
  }
  
  const OpenLogin = (e) => {
    var h = document.getElementById("g_signin2_bx");
    h.hidden = false;
    _Util.updStore('singinView',true);
    _dispatch_({
      type: 'UPD_KEY_VALUE',
      kv:{key:'observeChanges',value:_Util.gen12CodeId()}
    })
  }
  


  if(hover && text && _state["route_history"] && _state["route_history"]["location"] && _state["route_history"]["location"]["pathname"] && _state["route_history"]["location"]["pathname"]!=="/search"){
    setHover(false);
    setText("");
    let ii = document.getElementById("_search_input_header_");
    ii.value = "";
  }



  let _outerWidth = _state["outerWidth"] 
  let userA = _Util.getBrowser();  
  let isMobile = userA.os === "Android" || userA.os === "iPhone" || _state["outerWidth"]<720 ;


  var _div_List3  = _outerWidth ? <>    
            <div className="navigation-tab" onCdivck={()=>changePathSearch(true)}>
              <NavLink  to={{pathname:"/operations"}} className="logo" role="sdivde_item">
                <a className="menu-trigger" role="button" aria-haspopup="true" tabindex="0">{`Operations`} </a>
              </NavLink>             
            </div> 
           
            {isMobile?null:
             <div className="navigation-tab"  onCdivck={()=>changePathSearch(true)}>
              <NavLink  to={{pathname:"/products"}} className="logo" role="sdivde_item">
                <a className="menu-trigger" role="button" aria-haspopup="true" tabindex="0">{`Products`}</a>
              </NavLink>              
            </div>
            }

           
            <div className="navigation-tab"  onCdivck={()=>changePathSearch(true)}>
              <NavLink  to={{pathname:"/marketplace"}} className="logo" role="sdivde_item">
                <a className="menu-trigger" role="button" aria-haspopup="true" tabindex="0">{`Marketplace`}</a>
              </NavLink>              
            </div>
           


            <div className="navigation-tab"  onCdivck={()=>changePathSearch(true)}>
              <NavLink  to={{pathname:"/inventory"}} className="logo" role="sdivde_item">
                <a className="menu-trigger" role="button" aria-haspopup="true" tabindex="0">{`Inventory`}</a>
              </NavLink>              
            </div>
           


            {isMobile?null:
             <div className="navigation-tab"  onCdivck={()=>changePathSearch(true)}>
              <NavLink  to={{pathname:"/customers_list"}} className="logo" role="sdivde_item">
                <a className="menu-trigger" role="button" aria-haspopup="true" tabindex="0">{`Customers List`}</a>
              </NavLink>              
            </div>
            }

            {isMobile?null:
            <div className="navigation-tab"  onCdivck={()=>changePathSearch(true)}>
              <NavLink  to={{pathname:"/senders"}} className="logo" role="sdivde_item">
                <a className="menu-trigger" role="button" aria-haspopup="true" tabindex="0">{`Senders`}</a>
              </NavLink>              
            </div>
            }
            {isMobile?null:
            <div className="navigation-tab"  onCdivck={()=>changePathSearch(true)}>
              <NavLink  to={{pathname:"/receivers"}} className="logo" role="sdivde_item">
                <a className="menu-trigger" role="button" aria-haspopup="true" tabindex="0">{`Receivers`}</a>
              </NavLink>              
            </div>
            }
           
            <div className="navigation-tab"  onCdivck={()=>changePathSearch(true)}>
              <NavLink  to={{pathname:"/dispatcher"}} className="logo" role="sdivde_item">
                <a className="menu-trigger" role="button" aria-haspopup="true" tabindex="0">{`Dispatcher`}</a>
              </NavLink>              
            </div>
            



            <div className="navigation-tab"  onCdivck={()=>changePathSearch(true)}>
              <NavLink  to={{pathname:"/movements_list"}} className="logo" role="sdivde_item">
                <a className="menu-trigger" role="button" aria-haspopup="true" tabindex="0">{`Movements`}</a>
              </NavLink>              
            </div>

            
  </>:null

var _thumbnailJson = _state['thumbnailJsonBlob'] && _state['thumbnailJsonBlob']["qvaMarket_logo2.png"];
let _blobrequested =  _thumbnailJson && _thumbnailJson['requested'];
let _blob = _blobrequested? _thumbnailJson['blob'] : null;


let imgI = "gg_lg_96-min.png";
var _thumbnailJsonG = imgI && _state['thumbnailJsonBlob'] && _state['thumbnailJsonBlob'][imgI];
let _blobrequestedG =  _thumbnailJsonG && _thumbnailJsonG['requested'];
let _blobG = _blobrequestedG? _thumbnailJsonG['blob'] : null;


var _div_List  = _outerWidth ? <>    

  <div  className={`header_title`}>
    <NavLink  to={{pathname:"/finance"}}>
      <div className={`_dsplFlx`}>
        {_blob?<img src={_blob} alt="qvaMarket"/>:null}
        <div  className={`title`}>
          {``}
        </div>
      </div>
    </NavLink>
  </div>
</>:null





  return (
    <>
    <ScrollPosition  scrollhandler={(e)=>handleScroll(e)}/>
    <div className={``}  is-mobile={`${isMobile}`}>
      <div className={`header_nav_container_  header_floating_  Wht ${headerTransparent?'':"Wht"}`}  >
        <div className={`_dsplFlx  _w100 `}>          
          <div className={`__icons__menu__slide_nav`}  onClick={()=>_openSlidemenu()}>
              <Icon2 name={'menu'} color={'#555'} size={24}/>
          </div> 
          <div  className={`_dsplFlx spaceAround`} >
            {_div_List}
          </div>
          <div className="flexSpace"/>  
          <div className={`_right_header_content  _dsplFlx ${hover?"_hover_":""}`} >
            <div  className={`prof_icon`}>
              {userProfile && userProfile["picture"]?
              <img src={userProfile && userProfile["picture"]} alt={userProfile && userProfile["email"]}  onClick={()=>_openProfile()}  />
              :
              <div onClick={()=>OpenLogin()}>
                {_blobG?<img src={_blobG} alt="google login"/>:null}
              </div>
              }
            </div>
          </div>
        </div>
        <div className={` hd_black_bckGrnd ${headerTransparent?"":"boxShadow"}`} style={headerTransparent?{backgroundColor:"transparent"}:{}}></div>    
      </div>      
    </div>
    </>  
  )
}


export default HeaderFlx




function calc_qty_cart(o){
  let tt = 0
  _Util.ObjectKeys(o).map(k=>{
    tt += o[k]["qty"];
  })
  return tt;
} 
