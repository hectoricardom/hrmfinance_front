import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux'
import { CloseSlideMenu, getComponentStore } from '../actions/common'

import './_styles.css';


const useObserveChanges = () => {
  const observeComponent =  useSelector(state => state.observeComponent);  
  const dispatch = useDispatch()
  const close = (Id) => {
    CloseSlideMenu(dispatch,{id:Id});
  }

  return { observeComponent, close }
}

  const ViewSlideHRM = () => {
    const {  observeComponent, close } = useObserveChanges();
    const list = getComponentStore()['listViewSlideOption'] || {};

    var _list = Object.keys(list);  
    
    return (
            <>       
            {
              _list.map((dg)=>{
                var dlg = list[dg];
                if(dlg && dlg.visible){
                  var StyleDlg = {}; 
                  StyleDlg = { opacity: 1, visibility: `visible`,zIndex:dlg.zIndex,width: dlg.width }                    
                  let cmp2render = null;
                  let data = dlg.data
                  if(dlg.content){
                    //console.log(dlg.content)
                    cmp2render = React.cloneElement(dlg.content, {data});
                  }      
                  return (
                    <>
                      <div key={dg} className={`ViewSlideHRM ${dlg.direction==="left"?"left":"right"} ${dlg.display?'show':''}`} id={dg} style={StyleDlg}>
                      {cmp2render?cmp2render:null}
                      </div> 
                    {dlg.overlay?<div className="ViewSlideOverlay" onClick={()=>close(dg)}/>:null }
                    </> 
                  )
                }
                else{return(null)}
              })

            }   
                              
            </>
         )
        
     
  }



export default ViewSlideHRM;

