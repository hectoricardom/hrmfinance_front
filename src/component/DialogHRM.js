

import React from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { CloseModal, getComponentStore } from './../actions/common'

const useObserveChanges = () => {
  const observeChanges =  useSelector(state => state.observeComponent);  
  const dispatch = useDispatch()
  const close = (Id) => {
    CloseModal(dispatch,{id:Id});
  }

  return { observeChanges, close }
}

// import styles from './DialogHRM.module.css'




const DialogHRM = () => {
  const {  observeChanges, close } = useObserveChanges();
  const list = getComponentStore()['listDialog'] || {};
  
  var _list = Object.keys(list);  
  return (
            <>       
            {
              _list.map((dg,indg)=>{               
                var dlg = list[dg];
               
                if(dlg && dlg.visible){
                  var _Style={}
                  var _cldg = cleanbase64(dg);

                  _Style[`--s__${_cldg}_heigth__`]='750px';
                  _Style[`--s__${_cldg}_width__`]='80vw';
                  _Style[`--s__${_cldg}_zIndex__`]=250;
                  _Style[`--overlay__${_cldg}_zIndex__`]=249;    
                  if(dlg.display){ }
                    if(dlg.height){
                      _Style[`--s__${_cldg}_heigth__`]=dlg.height;
                    }
                    if(dlg.width){
                      _Style[`--s__${_cldg}_width__`]=dlg.width; 
                    }
                    if(dlg.zIndex){
                      _Style[`--s__${_cldg}_zIndex__`]=dlg.zIndex;
                      _Style[`--overlay__${_cldg}_zIndex__`]=dlg.zIndex-1;
                    }
                 
                  var ts = {
                    //transform:`translate3d(0, var(--s__${_cldg}_heigth__), 0)`,
                    marginTop:  dlg.height / -2,
                    marginLeft: dlg.width / -2,
                    top:`50%`,
                    left:`50%`,
                    height: dlg.height,
                    width: dlg.width,
                    zIndex: `var(--s__${_cldg}_zIndex__)`
                  };
                  if(dlg.isView){
                    ts = {          
                      marginTop:  0,
                      marginLeft: 0,   
                      top:`0%`,
                      left:`0%`,         
                      height: '100%',
                      maxHeight: '100%',
                      width: '100%',
                      zIndex: `var(--s__${_cldg}_zIndex__)`
                    };
                  }
                  var ovts = {zIndex: `var(--overlay__${_cldg}_zIndex__)`};
                  //let Ach = dlg.content;
                  let cmp2render = null;
                  let data = dlg.data
                  if(dlg.content){
                    //console.log(dlg.content)
                    cmp2render = React.cloneElement(dlg.content, {data});
                  }
                  return (
                      <div className={dlg.display?'active':''} style={_Style} key={dg} >
                        <div className="DialogHRM" style={ts} id={dg}>
                         
                          {cmp2render?cmp2render:null}
                        </div>
                        {dlg.visible?<div className={`DialogHRMOverlay`}  style={ovts} onClick={()=>close(dg)}/> :null}        
                      </div>
                    ) 
                }
              })
            }    
             <style >{`
                                
                                .DialogHRM{    
                                    
                                  position: fixed;  /*Stay in place */
                                  z-index: 220; /* Sit on top */
                                  background-color: transparent; /* Black fallback color */
                                  /*background-color: rgba(0,0,0, 0.6); /* Black w/opacity */
                                  overflow: hidden;  
                                  opacity: 0;
                                  top: 50%;
                                  left: 50%;   
                                  visibility: hidden;
                                  max-height: calc(100vh - 48px);
                                  transition: opacity ease-in-out .25s,visibility ease-in-out .25s;               
                                  /*  max-width: 80vw; */
                                  margin-left: -40vw;
                                  transition: opacity .125s cubic-bezier(0.0,0.0,0.2,1), visibility .125s cubic-bezier(0.0,0.0,0.2,1);
                                }
                                
                                
                                .active .DialogHRM{
                                /* transform: translate3d(0, var(--slide-option-heigth-perc--), 0); position: static;*/
                                  opacity: 1;
                                  visibility: visible;   
                                  pointer-events: auto;
                                  transition: opacity .325s cubic-bezier(0.0,0.0,0.2,1), visibility .325s cubic-bezier(0.0,0.0,0.2,1);
                                }
                                
                                .DialogHRMOverlay{
                                  height: 100vh; 
                                  width: 100%;     
                                  opacity: 0;
                                  position: fixed;
                                  z-index: 210; 
                                  left: 0;
                                  bottom: 0;
                                  background-color: rgba(0,0,0,0.62); 
                                  overflow-x: hidden;   
                                  transition: opacity ease-in-out .500s;
                                  transform-origin:  50% 210% 0;
                                }
                                
                                
                                .active .DialogHRMOverlay{    
                                  opacity: 1;
                                  bottom: 0;    
                                  transition: opacity ease-in-out .358s;
                                }
                                  `}</style>              
            </>
         )
}

export default DialogHRM;



const cleanbase64 = id => {
  var cClss = id;
  var h = new RegExp('=','g')
  cClss=cClss.replace(h,'');
  return cClss;
};






const dialog_Style = {}