

import React, { useState } from 'react'


import * as _Util from '../../../store/Util'


import '../../_styles.css'



const ScrollDc =  _Util.ScrollDc_Cmpt();

const Icon2 =  _Util.Icon_Cmpt();



const RecyclerView = (props) => {

  const {
    data, ind, range, ItemComponent, tag, fV, checkIsLate
  } = props;

  const [initialize, setInitialize] = useState(false);
  let _1d = 86400000;

  const _scrollhandler = (sc) => {
    if(!initialize){
      let cmp =document.getElementById(ind+tag+ind);
      if(cmp){
        let dm =_Util.offset(cmp);
        var _top = dm.top;
        let delay = 1600;
        if(_top>=sc-100 && _top<=(sc+window.innerHeight)+(sc>500?delay:0)){
          setInitialize(true);
          props.updRange(range + 12);
        }
      }
    }
  }

  
  let todayDt = Math.ceil(((new Date()).getTime())/_1d);

  let isLate = checkIsLate && (fV*1) < todayDt;

  let is4Today = checkIsLate && (fV*1) === todayDt;

  let dateClss = is4Today?"btc_color":isLate?"activeRed":"green";

  let hasAlert = checkIsLate && (is4Today || isLate);

  let hasDate = fV && _Util.date2pretyfy((fV*_1d));

 
  
  return (    
    <div id={ind+tag+ind} style={{minHeight:"100px"}}>
    {initialize?
      <div className={``}>
        <div className={`date_lbl _dsplFlx`}>
          <div  className={`bar ${dateClss?dateClss:""}`}/>                                  
          <span>{hasDate}</span>
          {hasAlert?
          <div className={`deliveryAlert _dsplFlx  ${is4Today?"btc_color fillBack":isLate?"activeRed fillBack":""}`}>
            <div className={`_dsplFlx`} >
              <div className={`icon_mov`}>
                <Icon2 name={`lightning_bolt_outline`} />
              </div>
            </div>
            <div className={`flexSpace`}/>  
            <div className={`mov_type_title lblDd `}>
            {is4Today?_Util.translatetext(96):isLate?_Util.translatetext(99):null}
            </div>         
          </div>
          :null}
        </div>
        {data.map((_grTGid,_grTGid_ind)=>{
          let cmp2render = null;
          if(ItemComponent){
            cmp2render = React.cloneElement(ItemComponent, {mvId:_grTGid, key:_grTGid_ind+tag});
          }
          return (
            <>{cmp2render?cmp2render:null}</>           
          )
        })}
      </div> 
      : 
      <ScrollDc   scrollhandler={_scrollhandler} /> 
    }  
    </div>                                   
  )

}




export default  RecyclerView;