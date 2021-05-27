import React, { useState , useEffect} from 'react'
import { useSelector, useDispatch } from 'react-redux'
import * as _Util from '../store/Util'

import Icons from './Icons'


const useObserveChanges = () => {
  const observeChanges =  useSelector(state => state.observeChanges);
  const dispatch = useDispatch()
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
  return { observeChanges,updKV  }
}








const TabletNavigatorControls = (props) => {  
  
  const { updKV } = useObserveChanges();
  
  const { navigation, loading, operations  } = props;
 
  const { total, limit, page, sortBy  } = navigation || {};
  var sort2 = sortBy && sortBy.split(".") && sortBy.split(".")[1];
  var sort = sort2 && sort2==='desc'?true:false;


  var _page  = page?page>=1?page:1:1;
  var _limit  = limit || 50; 
  let _total = total || 0;

  let start = (_page-1)*_limit<_total?(_page-1)*_limit:_total;
  let end = (_page)*_limit <= _total?(_page)*_limit:_total ;

  let lastPg = Math.ceil(_total / _limit);
  let _nxBtn = false, _prvBtn = false;
  if(_page<lastPg){
    _nxBtn = true
  }
  if(_page>1){
    _prvBtn = true
  }


  const _state = _Util.getStore();
  const keys = _state["keys"]
  const _className = _state["maskClassName"]
  let nav_Id = keys[19];
  let nav_pop_Id = keys[39];
  let nav_pop_Id_Limit = keys[59];
  


  const [ visible, setvisible] = useState(false);
  const [ visible_Limit_Pop, setvisible_Limit_Pop] = useState(false);
  const [ lastHover, setlastHover] = useState(false);




  const handleOnMouseIn = (e) => { 
    setTimeout(()=>{      
      setvisible(true);
    },80)
  }
  
  const handleOnMouseOut = (e) => {  
    let Cnt = document.getElementById(nav_Id);
    let CntPop = document.getElementById(nav_pop_Id);
    var toElement = e.toElement || e.relatedTarget || e.target;  
    if(toElement.document){
      setTimeout(()=>{
        setvisible(false);
      },80)
    }
    else{
      try{
        if(CntPop.contains(toElement)){    
          
        }
        else if(Cnt.contains(toElement)){    
          
        }else{
          setTimeout(()=>{            
            setvisible(false);
          },80)
        }
      }
      catch(e){} 
    }  
  }
  
  

  const handleLimitOnMouseOut = (e) => {    
    let Cnt = document.getElementById(nav_Id);
    let CntPop = document.getElementById(nav_pop_Id_Limit);
    var toElement = e.toElement || e.relatedTarget || e.target;  
    if(toElement.document){
      setTimeout(()=>{
        setvisible_Limit_Pop(false);
      },80)
    }
    else{
      try{
        if(CntPop.contains(toElement)){    
          
        }
        else{
          setTimeout(()=>{
            setvisible_Limit_Pop(false);            
          },80)
        }
      }
      catch(e){} 
    }  
  }
  
  
  const handleNext = (e) => { 
    let lastPg = Math.floor(total / limit);
    if(page<=lastPg){
      setTimeout(()=>{    
        let navigations = _state.navigations || {};      
        if(!navigations[operations]){
          navigations[operations]={}
        }
        navigations[operations]['page'] = page+1;      
        _Util.updStore('navigations',navigations);
        updKV();
        if (typeof props.fethOp === 'function') {
          props.fethOp();
        }
      },40)
    }
  }

  const handlePrev = (e) => {
    if(page>1){
      setTimeout(()=>{        
        let navigations = _state.navigations || {};      
        if(!navigations[operations]){
          navigations[operations]={}
        }
        navigations[operations]['page'] = page-1;      
        _Util.updStore('navigations',navigations);
        updKV();
        if (typeof props.fethOp === 'function') {
          props.fethOp();
        }
      },40)
    }
  }
  

  const requestSort = (v) => { 
    if(sort!==v){    
      let navigations = _state.navigations || {};      
      if(!navigations[operations]){
        navigations[operations]={}
      }
      //navigations[operations]['limit'] = doc["limit"];
      let key = sortBy.split('.')[0];
      let _sort = v?'desc':'asc';
      navigations[operations]['sortBy'] = `${key}.${_sort}`;      
      _Util.updStore('navigations',navigations);
      updKV();
      if (typeof props.fethOp === 'function') {
        props.fethOp();
        setvisible(false);
      }
    }
  }
  
  const handleSett = (e) => { 
    let _vs = !visible_Limit_Pop;
    setTimeout(()=>{
      setvisible_Limit_Pop(_vs);
    },80)
  }
  
  const requestLimitUpd = (v) => { 
    var _limit  = limit || 50; 
    if(_limit!==v){
      let navigations = _state.navigations || {};      
      if(!navigations[operations]){
        navigations[operations]={}
      }
      navigations[operations]['limit'] = v;
      _Util.updStore('navigations',navigations);
      updKV();
      if (typeof props.fethOp === 'function') {
        props.fethOp();
        setvisible_Limit_Pop(false);
      }
    }
  }
  
  

  return(
    <div className="nH aqK">
    <div className="navigator_bar">
    <div className={`navigator_controls ${visible?"_visible":""} `}>
        <span className="navigator_controls_span">
          <div className="flexSpace"/>
          <div >
            <div  className={`_dsplFlx`}> 
              <div id={`${nav_Id}`} className={`_navigation_counters`}  
                onMouseEnter={(e)=>handleOnMouseIn(e)} 
                onMouseLeave={(e)=>handleOnMouseOut(e)}
              >
              {loading? 
                <div className={`_counters_Wrp`}>
                  <div>loading ... </div>
                </div>:
                <div className={`_counters_Wrp _dsplFlx`}>
                  <span>{start}</span> <span><Icons name={'minus'} color={'#555'} size={10}/></span> <span>{end}</span> <span className={`_counters_OF`}>{` de `}</span> <span>{_total}</span>
                </div>
                }
              </div>
              <div className={`_navigation_actions`}>
                <div className={`IconRippleEffectContainer`}  onClick={()=>handlePrev()}>
                  <Icons name={'arrow_left'} color={_prvBtn?'#555':'#d5d5d5'} size={20} ripple={_prvBtn}/>
                </div>                
                <div className={`IconRippleEffectContainer`}  onClick={()=>handleNext()}>
                  <Icons name={'arrow_right'} color={_nxBtn?'#555':'#d5d5d5'} size={20} ripple={_nxBtn}/>
                </div>
                <div className={`IconRippleEffectContainer`}  onClick={()=>handleSett()}>
                  <Icons name={'setting'} color={'#555'} size={20} ripple={true}/>
                </div>
              </div>
            </div>
            <div id={`${nav_pop_Id}`} className={`popFloat`}  onMouseLeave={(e)=>handleOnMouseOut(e)} >
             { visible && <div class="popFloatWrapper AX" style={{userSelect: "none"}}>
                    <div id=":110" className={`J-N ${!sort?'J-N-JT':'J-N-JE'}`} role="menuitem" style={{userSelect: "none"}} aria-disabled={sort?false:true}  onClick={(e)=>requestSort(true)}>
                      <div class="J-N-Jz" style={{userSelect: "none"}}>{_Util.translatetext(308)}</div>
                    </div>
                    <div id=":113" className={`J-N ${sort?'J-N-JT':'J-N-JE'}`} role="menuitem" aria-disabled={sort?true:false} style={{userSelect: "none"}}  onClick={(e)=>requestSort(false)}>
                      <div class="J-N-Jz" style={{userSelect: "none"}}>{_Util.translatetext(307)}</div>
                    </div>
              </div>
              }
            </div>
            <div id={`${nav_pop_Id_Limit}`} className={`popFloat ${visible_Limit_Pop?'_show':''}`}  onMouseLeave={(e)=>handleLimitOnMouseOut(e)} >
             { visible_Limit_Pop && <div class="popFloatWrapper AX" style={{userSelect: "none"}}>
                    <div id=":110" className={`J-N ${limit!==50?'J-N-JT':'J-N-JE'}`} role="menuitem" style={{userSelect: "none"}} aria-disabled={sort?false:true}  onClick={(e)=>requestLimitUpd(50)}>
                      <div class="J-N-Jz" style={{userSelect: "none"}}>{50}</div>
                    </div>
                    <div id=":113" className={`J-N ${limit!==100?'J-N-JT':'J-N-JE'}`} role="menuitem" aria-disabled={sort?true:false} style={{userSelect: "none"}}  onClick={(e)=>requestLimitUpd(100)}>
                      <div class="J-N-Jz" style={{userSelect: "none"}}>{100}</div>
                    </div>
                    <div id=":113" className={`J-N ${limit!==150?'J-N-JT':'J-N-JE'}`} role="menuitem" aria-disabled={sort?true:false} style={{userSelect: "none"}}  onClick={(e)=>requestLimitUpd(150)}>
                      <div class="J-N-Jz" style={{userSelect: "none"}}>{150}</div>
                    </div>
              </div>
              }
            </div>
          </div>
          
        </span>
        </div>
        </div>
      </div>
    )
}



export default TabletNavigatorControls;



function searchMark(text,_initSearchvalue) {  
  let _text = text && text.toString().toLowerCase();
  let _search = _initSearchvalue && _initSearchvalue.toString().toLowerCase();    
  let _colorBckYlw = {backgroundColor:'#fef7e0',color:'#fbbc04',padding:'3px 0'};
  let _colorBckGrn = {backgroundColor:'#e6f4ea',color:'#34a853',padding:'3px 0'};
  if(_search && _text){
      if(_text.indexOf(_search)>=0){
        var spl = _text.split(_search)
        return <span>{spl[0]}<span style={_colorBckGrn}>{_initSearchvalue}</span>{spl[1]}</span>
      }
  }
  return <span>{text}</span>;
}




