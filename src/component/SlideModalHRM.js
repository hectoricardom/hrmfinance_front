
import React, { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { CloseWatchDialog, getComponentStore } from '../actions/common'

import './_styles.css';

import * as _Util from '../store/Util'
// import { Icon2 } from './Icons'




var dataH = {}



const useObserveChanges = () => {
  const observeChanges =  useSelector(state => state.observeComponent);  
  const dispatch = useDispatch()
  const close = (Id) => {
    dataH[Id]["isTitleDetail"] = false; 
    CloseWatchDialog(dispatch,{id:Id});
  }

  const updKV= (k,v) => {
    dispatch({
      type: 'UPD_KEY_VALUE',
      kv:{key:k,value:v}
    })  
    dispatch({
      type: 'UPD_KEY_VALUE',
      kv:{key:observeChanges,value:_Util.gen12CodeId()}
    })  
  }


  return { observeChanges, close, dispatch }
}







const DialogModalHRM = () => {
  const {  observeChanges} = useObserveChanges();
  const list = getComponentStore()['listWathDialog'] || {};

 
  var _list = Object.keys(list); 
  return (
            <>       
            {
              _list.map((dg)=>{               
                var dlg = list[dg];                
                if(dlg && dlg.visible){                
                    return (                      
                        <DialogModalDetails 
                            dlg={dlg}
                            dg={dg}
                            content = {dlg.content}
                            //updTitleDetail={(v)=>updTitleDetail(v)}
                        />
                    ) 
                }
                else{
                    return null
                }
              })
            }          
            </>
         )
}

export default DialogModalHRM;















const DialogModalDetails = (props) => {
    const {  observeChanges, close, dispatch, _getVideosById, _openPlayer } = useObserveChanges();
    
    const {  dg, dlg, content } = props;
    let keys = _Util.getGlobalsKeys()
    let _state = _Util.getStore();
  
    const [initialize, setInitialize] = useState(false);  
    
    const [obs, setObs] = useState(0);  
    

    const [initImg, setinitImg] = useState(false);  

    const [seasonList, setSeasonList] = useState(false);  
    
  
   
    let data = dlg.data
    
    let item =  _state["detailVideoByID"] || data.item;

  

    let searchHash = window.location.hash.split('?')[1]?window.location.hash.split('?')[1]:null;
 
  
    const router = _Util.parseQuery(searchHash);
    let _idRoute = router.title;

    let {top,left} = data.dmz || {};    
    let isTd = dataH && dataH[dg] && dataH[dg]["lastScroll"];   

    let _top = top;
    if(dlg.action==="showing" && isTd){
        _top = top-dataH[dg]["lastScroll"];
    }
    
    
    let _style = { 
        width:0,      
        transform: `translateX(${left}px) translateY(${1000}px) scaleX(0.4) scaleY(0.4) translateZ(0px)`,   
        transition: "opacity 150ms ease, transform 150ms ease, -webkit-transform 150ms ease",                    
        top: 0, 
        left: 0, 
        opacity: 0
        
    } 
    _style["width"] = "calc(98vmin - 17px)";
    _style["transform"] = "translateX(calc(50vw - (calc(98vmin - 17px) / 2))) translateY(calc( 52em)) scaleX(1) scaleY(1) translateZ(0px)"; 
    _style["transition"] = "opacity 450ms ease, transform 450ms ease, -webkit-transform 450ms ease";
    _style["marginBottom"] = "2em";
    _style["minWidth"] = "350px";
    _style["zIndex"] = dlg.zIndex || 180;    
    _style["top"] = 0;
    _style["left"] = 0;
    ///_style["boxShadow"] = "rgba(0, 0, 0, 0.75) 0px 3px 10px";
    
    if(dlg.display){
        _style["transform"] = "translateX(calc(50vw - (calc(98vmin - 17px) / 2))) translateY(calc( 2em)) scaleX(1) scaleY(1) translateZ(0px)";
        _style["opacity"] = 1; 
    }
  
let _kid = `${keys[74]}_${dg}_d`;
    
if(!dataH[dg]){
    dataH[dg] = {}
}




const closeTitleDetail = (preventRedirect) => {
    let _Elmm =document.getElementById(`data_ui_${keys[93]}`);         
    let _scrollTop =  dataH[dg]["lastScroll"];
    close(dg,false);
    dataH[dg]["isTitleDetail"] = false;
    let timeOut = dataH[dg]["timeOut"];
    if(timeOut){
        clearInterval(timeOut);
        dataH[dg]["timeOut"] = null;
    }
    
    if(preventRedirect){
        _Elmm.style.position = "static";              
        window.scrollTo(0,_scrollTop);
        _Elmm.style.top = null;
        setTimeout(()=>{
            _Util.updStore("detailVideoByID",null)
            _Util.updStore("seasonsbyVideoByID",null)
            _Util.updStore("similarList",null)
        },240);
    }
    else if(_state["route_history"]){ 
        // let rd = _state["prevUrl"] || {pathname:'/browse'};
        // _state["route_history"].push(rd);
        setTimeout(()=>{  
            _Elmm.style.position = "static";              
            window.scrollTo(0,_scrollTop);
            _Elmm.style.top = null;
            _Util.updStore("detailVideoByID",null)
            _Util.updStore("seasonsbyVideoByID",null)
            _Util.updStore("similarList",null)

        },240);
    }
    
}



const updTitleDetail = (v) => {
    if(typeof props.updTitleDetail === "function"){
        props.updTitleDetail(v)
    }
}





const closeOutside = (v) => { 
    let _evt = _Util.getEventStore();    
    let lastClick =  _evt["click"];
    let _Elmm =document.getElementById(_kid+"dialog"); 
    let timeOut = dataH[dg]["timeOut"];
    if(lastClick && lastClick["target"] &&  _Elmm ){
        let toElement =  lastClick["target"];
        if(timeOut &&  toElement.tagName && _Elmm && _Elmm.contains(toElement)){            
        }else{
            closeTitleDetail();
            clearInterval(timeOut);
            dataH[dg]["timeOut"] = null;
        }
    }
}

let _idK =  dg;  

// https://vd294.mycdn.me/?expires=1599613618320&srcIp=96.28.143.166&srcAg=CHROME&ms=185.226.52.44&type=3&sig=WMQqiCEsPSI&ct=4&urls=45.136.21.32&clientType=0&id=140045585059&bytes=0-1055760809




useEffect(() => {
    if(!initialize){
        let _Elmm =document.getElementById(`data_ui_${keys[93]}`);                        
        _Elmm.style.position = "fixed";    
        let _evt = _Util.getEventStore();                    
        let _scrollTop =  _evt["scrollPosition"];                
        //dataH[dg]["lastScroll"] =  _scrollTop; 
        _Elmm.style.top = _scrollTop*-1+"px"; 
        _Elmm.style.width = "100%"; 
        window.scrollTo(0,0);
        dataH[dg]["lastScroll"] = _scrollTop;
        setInitialize(true);
        updTitleDetail(true)
    }
    _Util.updEventStore("click",null);
    setInitialize(true);
});



let cmp2render = null
if(content){
    cmp2render = React.cloneElement(content, {modalId:dg, closePop:closeTitleDetail });
  }

  let spaceTrns = {minHeight: '70vh'}

  if(dlg.data && dlg.data.minHeight){
    spaceTrns = {minHeight: dlg.data.minHeight}
  }
  
    return (                      
        <div id={_kid} className={`focus-trap-wrapper previewModal--wrapper detail-modal`} tabindex="-1">
            <div tabIndex="-1" style={{opacity: 0.96, zIndex: 160}}>
                <div className="previewModal--backDrop trnsp2" tabindex="-1" data-uia="previewModal--backDrop" onClick={()=>closeOutside()}></div>
            </div>
            <div id={_kid+"dialog"} role="dialog" aria-modal="true" tabindex="-1" 
                className={`previewModal--container  detail-modal` }                 
                style={_style}
                >
                <div  className={`spaceTransparent`} style={spaceTrns} onClick={()=>closeTitleDetail()}></div>
                {/*
                <div className="previewModal-close" data-uia="previewModal-closebtn" >
                    <Icon2 name={'Xclose'} color={'currentColor'} />
                </div>
                */}

                {cmp2render}
            </div>
        </div>     
   
    )
} 






