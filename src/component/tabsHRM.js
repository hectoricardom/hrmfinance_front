

import React, { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'


import * as _Util from '../store/Util'




const useObserveChanges = () => {
  const observeChanges =  useSelector(state => state.observeCommonChanges);
  const observeChanges2 =  useSelector(state => state.observeChanges);
  // const _state=  useSelector(state => state); 

  const dispatch = useDispatch()  

  return { observeChanges, observeChanges2, dispatch }
}



const TabIndicator = () => {
  var els = document.querySelectorAll('[data-tab-item]'); 
  var listTabH = [],sumTH = 0;
  for(var ss =0;ss<els.length;ss++){
    var hh =els[ss].getBoundingClientRect().width;
    if(hh<200){
      listTabH.push({l:sumTH,w:hh});
      sumTH+=hh; 
    }     
  }
  this.setState({widthList:listTabH});
}





const TABSHRM = (props) => {


  const {  observeChanges, observeChanges2 } = useObserveChanges();
  
  const {      
    keyCode,
    pth, 
    indexTab,
    data
} = props;      


const _state = _Util.getStore();



let _outerWidth = _state["outerWidth"];
const [rowWidth, setRowWidth] = useState(false);
const [index, setIndex] = useState(0);
const [widthScreen, setWidthScreen] = useState(null);
/*
let _indexTab = null;
if(indexTab){
  data.map((dd,iii2)=>{
    if(dd===indexTab){
      _indexTab =  iii2;
    }
  })
}
*/

let _index_ =  indexTab?indexTab:index;



  useEffect(() => {
      /*
      if(false && !rowWidth || widthScreen!==_outerWidth){
            setWidthScreen(_outerWidth);
            TabIndicator();
      }
      */
      if(widthScreen!==_outerWidth){
        setWidthScreen(_outerWidth);
        TabIndicator();
      }
 });


 const TabIndicator = () => {
    var els = document.querySelectorAll('[data-tab-item]'); 
    var listTabH = [],sumTH = 0;
    for(var ss =0;ss<els.length;ss++){
      var hh =els[ss].getBoundingClientRect().width;
      if(hh<200){}  
        listTabH.push({l:sumTH,w:hh});
        sumTH+=hh;
    }
    setRowWidth(listTabH)
}

const UpdateIndex = (i) => {  
  setIndex(i);
  TabIndicator();
  if(typeof props.UpdateIndex === "function" ){
    props.UpdateIndex(i);
  }
}



var indcatorSize = rowWidth?rowWidth[_index_]:null;
var tabIndicator = {width: `0px`, left: `0px`};
if(indcatorSize){
  tabIndicator = {width: `${indcatorSize.w}px`, left: `${indcatorSize.l}px`}
}  

let hashLocation = window.location && window.location.hash;
let hashLocationQuery = hashLocation && hashLocation.split('?')[1]? hashLocation.split('?')[1]:'';
//var s = _Util.parseQuery(hashLocationQuery);      
//let ifQuery = hashLocationQuery?true:false;    



let _classN = _styleBezel("45yg4qwhg");


  return (
    <>     <div className="c-tabs-nav " data-active-item="1" data-default-key="0" data-c-tabs-nav="" data-ca-category="device-tray">
              <div className="center_Tab_Nav_Items" role="tablist">             
                { data && data.map((tbI,i)=>{   
                  var color = 'var(--tab--nav-Color--)';
                  var activeClass = 'center_Tab_Nav_Item';
                  if(_index_===i){
                    color = 'var(--color-base--hover)';
                    activeClass = 'center_Tab_Nav_Item is-active';
                    }     

                    return(   
                      <a  className={activeClass} key={`${tbI}---${i}`}>                                  
                        <div  data-tab-item={i} className="presentation" onClick={()=>UpdateIndex(i)} key={i}>                        
                          <a className="center_Tab_Nav_Link" role="tab"  data-tab-index={i}>                        
                            {tbI}
                          </a>
                        </div>
                      </a>     

                      )
                  })
                }                         
              </div>
              <span id="header-tabs-nav__indicator" className="c-tabs-nav__indicator" style={tabIndicator}></span>
            </div>  
        <style>
          {_classN}
        </style>
    </>
  )
 
}

export default TABSHRM;


 //<RippleHRM/>    

const _styleBezel = (dlg) => {  
  return `



  
  .c-tabs-nav  {
    font-size: 14px;
    font-size: .875rem;
    margin: 0 auto;
    max-width: 550px;
    position: relative;
    text-transform: uppercase;
    --color-base--hover: #1a73e8;
    --color-tab--base--hover: #1a73e8;
  }
  
  
  
  .center_Tab_Nav_Items {
    border-bottom: 2px solid #e0e0e0;
    display: -ms-flexbox;    
    display: -webkit-box;
    display: flex;
    -webkit-box-orient: horizontal;
    -webkit-box-direction: normal;
    -ms-flex-direction: row;
    flex-direction: row;
    list-style: none;
    padding: 0;
  }
  
  .center_Tab_Nav_Item {
    display: block;
    -webkit-box-flex: 1;
    -ms-flex: 1;
    flex: 1;
    cursor: pointer;
    outline: none;
    text-decoration: none;
  }
  
  
  .center_Tab_Nav_Item.is-active .center_Tab_Nav_Link {
    color: var(--color-base--hover);
    outline: none;
  }
  
  
  .center_Tab_Nav_Item img, .center_Tab_Nav_Item svg {
    display: block;
    margin: 0 auto;   
    fill: var(--tab--nav-icon-color--);
  }
  
  .center_Tab_Nav_Item.is-active .center_Tab_Nav_Link svg{
    fill: var(--color-base--hover);
  }
  
  .center_Tab_Nav_Item img, .center_Tab_Nav_Item svg {
    display: block;
    margin: 0 auto;   
    fill: var(--tab--nav-icon-color--);
  }
  
  
  svg:not(:root) {
    overflow: hidden;
  }
  
  
  
  .center_Tab_Nav_Link {
    color: var(--icon--color_);
    display: block;
    font-weight: 700;
    padding: 18px 0;
    text-align: center;
    -webkit-transition: color 100ms cubic-bezier(0.25, 0.1, 0.25, 1);
    transition: color 100ms cubic-bezier(0.25, 0.1, 0.25, 1);
    width: 100%;
    outline: none;
    color: #6f6f6f;
    font: 700 14px/19px Roboto,RobotoDraft,Helvetica,Arial,sans-serif;
  }
  
  .c-tabs-nav__indicator {
    background: var(--color-tab--base--hover);
    bottom: 0;
    display: block;
    height: 4px;
    left: 0;
    position: absolute;
    -webkit-transition: left, width;
    transition: left, width;
    -webkit-transition-duration: 300ms;
    transition-duration: 300ms;
    -webkit-transition-timing-function: cubic-bezier(0.25, 0.1, 0.25, 1);
    transition-timing-function: cubic-bezier(0.25, 0.1, 0.25, 1);
  }
  
  
  .text-description{
    padding: 15px 8px;
    font: 600 14px/19px Roboto,RobotoDraft,Helvetica,Arial,sans-serif;
  }
  
  
  
  .white-backColor{
     background-color: #f9f9f9;
     padding: 45px 8px;
  }
  
  


`
}





                    /*
                    var tlr =`/${pth}`;  
                    

                    let _qry2 = ``
                    if(ifQuery){
                      _qry2 = `?`;
                      s[query] = tbI;
                      Object.keys(s).map((_k,_i)=>{
                        if(_i>0){
                          _qry2 += `&`
                        }
                        _qry2 += `${_k}=${s[_k]}`
                      })
                    }
                    else{
                      _qry2 = `?tb=${tbI}`;
                    }
                    let to= { pathname: tlr,search:`${_qry2}` };
                    */