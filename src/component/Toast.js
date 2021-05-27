

import React from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { CloseToast, getComponentStore} from '../actions/common'

const useObserveChanges = () => {
  const observeChanges =  useSelector(state => state.observeComponent);
  const dispatch = useDispatch()
  const close = (Id) => {
    CloseToast(dispatch,{id:Id});
  }
  return { observeChanges,  close }
}



const ToastHRM = () => {
  const {  observeChanges, close } = useObserveChanges();
  const list = getComponentStore()['listToat'] || {};
  var _list = Object.keys(list);
  return (
            <>       
            {
              list && _list.map((dg,indg)=>{
                var dlg = list[dg];
                if(dlg && dlg.visible){
                  var _Style={}
                  var _cldg = cleanbase64(dg); 
                  if(dlg.display){ }
                  let data = dlg.data                  
                  let classT ="toast active";
                  let Tstyle= {opacity:dlg.display?1:0} 
                  let _text  =  data && data.text?data.text:"sdgfdsfgsdfg";
                  var toastButtonStyle = {},_buttonText_ = `Ok`;

                  return (                      
                      <div id={dg} className={'TtBase_Toast'}>        
                        <div className={dlg.display?classT:"toast"} style={Tstyle}>
                            <div className="text">{_text}</div>
                            <div className="actions">                              
                                <button className="md-button md-ink-ripple" type="button" style={toastButtonStyle} onClick={()=>close(dg)}>{_buttonText_}</button>
                            </div>
                        </div>
                    </div>
                    ) 
                }
              })
            } 
             <style >{`
                        .TtBase_Toast{
                          position:fixed;
                      }
                      
                  
                      .toast {
                        -webkit-transform: translate3d(0,0,0);
                        transform: translate3d(0,0,0);
                        opacity: 0;
                        box-shadow: 0 2px 4px -1px rgba(0,0,0,.2), 0 4px 5px 0 rgba(0,0,0,.14), 0 1px 10px 0 rgba(0,0,0,.12);
                        -webkit-transition: all .4s cubic-bezier(.4,0,.2,1);
                        transition: all .4s cubic-bezier(.4,0,.2,1);
                        background-color: #424242;
                        color: #fff;
                        display: -webkit-box;
                        display: -ms-flexbox;
                        display: flex;
                        -webkit-box-orient: vertical;
                        -webkit-box-direction: normal;
                        -ms-flex-direction: column;
                        flex-direction: column;
                        font-size: 14px;
                        padding-top: 12px;
                        padding-left: 16px;
                        padding-right: 16px;
                        position: fixed;
                        min-height: 65px;                        
                        top: 70px;
                        right: 28px;
                        min-width: 240px;
                        max-width: 340px
                      }
                      
                      
                      .accessibility__toast, .toast {
                        line-height: 20px;
                      /*  z-index: -1; */
                        border-radius: 2px;
                      }
                      
                      .toast.active {
                        -webkit-transform: translate3d(0,0,0);
                        transform: translate3d(0,0,0);
                        opacity: 0.87;
                        z-index: 500;
                      }
                      
                      .toast .actions {
                        display: -webkit-box;
                        display: -ms-flexbox;
                        display: flex;
                        -webkit-box-pack: end;
                        -ms-flex-pack: end;
                        justify-content: flex-end;
                        -webkit-box-orient: horizontal;
                        -webkit-box-direction: normal;
                        -ms-flex-direction: row;
                        flex-direction: row;
                      }
                      
                      
                      .toast .actions .md-button {
                        color: rgb(0, 145, 234);
                        -webkit-box-flex: 1;
                        -ms-flex: 1;
                        flex: 1;
                        height: 18px;
                        margin: 0;
                        min-height: 40px;
                        max-height: 40px;
                        min-width: 100px;
                        max-width: 100px;
                        width: 85px;
                        font-weight: 700;
                      }
                      
                      .md-button {
                        letter-spacing: .010em;
                        display: inline-block;
                        position: relative;
                        cursor: pointer;
                        min-height: 36px;
                        min-width: 88px;
                        line-height: 36px;
                        vertical-align: middle;
                        -webkit-box-align: center;
                        -webkit-align-items: center;
                        align-items: center;
                        text-align: center;
                        border-radius: 2px;
                        box-sizing: border-box;
                        -webkit-user-select: none;
                        -moz-user-select: none;
                        -ms-user-select: none;
                        user-select: none;
                        outline: 0;
                        border: 0;
                        padding: 0 6px;
                        margin: 6px 8px;
                        background: 0 0;
                        color: currentColor;
                        white-space: nowrap;
                        font-size: 14px;
                        font-style: inherit;
                        font-variant: inherit;
                        font-family: inherit;
                        overflow: hidden;
                        -webkit-transition: box-shadow .4s cubic-bezier(.25,.8,.25,1),background-color .4s cubic-bezier(.25,.8,.25,1);
                        transition: box-shadow .4s cubic-bezier(.25,.8,.25,1),background-color .4s cubic-bezier(.25,.8,.25,1);
                      }
                      
                                  `}</style>              
            </>
         )
}

export default ToastHRM;



const cleanbase64 = id => {
  var cClss = id;
  var h = new RegExp('=','g')
  cClss=cClss.replace(h,'');
  return cClss;
};


/*
<div className={dlg.display?'active':''} style={_Style} key={dg} >
  <div className="DialogHRM" style={ts}>
    
    {cmp2render?cmp2render:null}
  </div>
  {dlg.visible?<div className={`DialogHRMOverlay ${dlg.display?'show':''}`}  style={ovts} onClick={()=>close(dg)}/> :null}        
</div>

*/


    

/*

<div class="toast active" ng-class="{ 'active': main.isEducationToastActive }" style="">
  <div class="text">Pick a color from the palette (or a custom color) to see how it looks in a UI.</div>
  <div class="actions">
    <button class="md-button md-ink-ripple" type="button" ng-transclude="" ng-click="main.disableEducationToast()">Got it</button>
  </div>
</div>


*/