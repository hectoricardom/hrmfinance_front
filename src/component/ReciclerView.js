

import React, { useState } from 'react'
import * as _Util from '../store/Util'
import './_styles.css'



const ScrollDc =  _Util.ScrollDc_Cmpt();



const RecyclerView = (props) => {

  const {
    data, ind, range, ItemComponent, tag
  } = props;

  const [initialize, setInitialize] = useState(false);

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



  return (    
    <div id={ind+tag+ind} style={{minHeight:"100px"}}>
    {initialize?
      <div className={``}>
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