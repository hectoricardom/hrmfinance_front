

import React, {useState, useEffect} from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { CloseModal } from './../actions/common'
import * as _Util from '../store/Util'

import './_styles_date.css';

const useObserveChanges = () => {
  const observeChanges =  useSelector(state => state.observeComponent);  
  const dispatch = useDispatch()
  const close = (Id) => {
    CloseModal(dispatch,{id:Id});
  }

  
  

  return { observeChanges, close,  }
}

// import styles from './DialogHRM.module.css'




const ModalDate = (props) => {
  const {  observeChanges, close } = useObserveChanges();
  const _store = _Util.getStore();

  const { placeholder,dob,color, data, initValue } = props;
  const item = data.item || {};
  let modalID = data.modalID; 
  let _ID = data.dID; 

  var ctd = new Date()
  var minY = ctd.getFullYear();
  var maxY = minY+50;
  if(true){
      maxY = ctd.getFullYear()+100;
      minY = ctd.getFullYear()-100;
  }
  const [yyyy, setYYYY] = useState(null);
  const [mm, setMM] = useState(null);
  const [dd, setDD] = useState(null);
  const [maxDays, setMaxDays] = useState(31);
  const [valid, setValid] = useState(false);
  const [initialize, setInitialize] = useState(false);
  const [init, setInit] = useState(null);
  const [initVLoaded, setInitVLoaded] = useState(null);
  

  useEffect(() => {    
    if(!initialize){
      setInitialize(true);
      setTimeout(()=>{
        var dD = new Date();
        if(_store["date"]){
          dD = new Date(_store["date"]);          
        }
        if(initValue){
          dD = new Date(initValue);          
        }
        setYYYY(dD.getFullYear());
        setMM(dD.getMonth()+1);
        setDD(dD.getDate());        
        checkvalid(yyyy,mm,dd);
        
      },250)
      //_getVideosSearch("taxi","videoSearch");
    }   
  });





  var StyText = {color:color}
  var maxDay = _Util.MaxDayperMotnh(yyyy,mm);      
  var savebutton =  <div className="button disable"><div className="cc" >save </div></div>
  var _dob = ``;
 


  const UpdYear = (r) => {
    var ctd = new Date()
    var minY = ctd.getFullYear();
    var maxY = minY+50;
    if(true){
      maxY = ctd.getFullYear()+100;
      minY = ctd.getFullYear()-100;
    }
    r = parseInt(r);   
    setYYYY(r);
    checkvalid(r,mm,dd)  
    /*
    if(maxY>= r && minY<=r){      
      setYYYY(r);
      checkvalid(r,mm,dd)       
    }else{
      setYYYY(null);
      checkvalid(r,mm,dd)
    }
    */
  }





  const UpdMonth = (r) => {
    r = parseInt(r);
    
    if(12>= r && 1<=r){     
      setMM(r);
      checkvalid(yyyy,r,dd)   
    }else{
      setMM(null);
      checkvalid(yyyy,r,dd)    
    }
  }


  const UpdDay = (r) => {
    r = parseInt(r);
    var maxDay = _Util.MaxDayperMotnh(yyyy,mm);
    if(maxDay>= r && 1<=r){        
        setDD(r);
        checkvalid(yyyy,mm,r)    
    }else{  
      setDD(null);
      checkvalid(yyyy,mm,r)
    }
  }

  const SaveC = () => {
    const {form,field} = props;
    var dt = `${mm}/${dd}/${yyyy}`;
    if(typeof props.valueUpdate === "function"){
      props.valueUpdate(dt);
    }
    close(modalID);
  }


  /*

  const setDay = (r,m,year) => {
    _Util.updStore('date',`${m}/${r}/${year}`);
  }
  */
  const C_cancel= (y,m,d) => {
    close(modalID);
  }


  const checkvalid= (y,m,d) => { 
    if(_Util.isDate(y,m,d)){
      if(_Util.isInteger(m) && m<10){ m='0'+m}
      if(_Util.isInteger(d) && d<10){ d='0'+d}    
      var dt = `${m}/${d}/${y}`   
      var dD = new Date(dt);
      var dNow = new Date();
      var ctd = new Date()
      var minY = ctd.getFullYear();
      var maxY = minY+50;
      var maxDay = _Util.MaxDayperMotnh(y,m);
      if(true){
        maxY = ctd.getFullYear()+100;
        minY = ctd.getFullYear()-100;
      }
      if(false){        
        if(maxDay< d){
          setValid(false);
        }
        else if(y > minY && dD.getTime()<dNow.getTime()){         
          setValid(true);
        }
        else{
          setValid(false);          
        }      
      }
      else{  
        /*
        if(maxDay< d){         
          setValid(false);
        }
        else if(y >= minY && dD.getTime()>=dNow.getTime()){
          setValid(true);
        }
        else{          
          setValid(false);           
        }
        */
        setValid(true); 
      }      
    }else{      
      setValid(false);
    }
}



  let  dt = `${mm}/${dd}/${yyyy}`;   
  if(valid){
    _dob = _Util.parseFullDate((new Date(dt)).getTime());
    savebutton =  <div className="button" onClick={()=>SaveC()}  style={StyText}><div className="cc" >save </div></div>
  }else{  
    if(yyyy && mm && dd ){     
      _dob = _Util.parseFullDate((new Date(dt)).getTime());
    }else{
      //_dob = _Util.parseFullDate((new Date()).getTime());
    }
  }


  return (
            <>    
        <div className="DateModalWrapp" {...data.modalID?{"dialog-key-id":data.modalID}:""}>   
        <div className="headerDateModal" style={{backgroundColor:color}}>
          <div className="Title">
            {placeholder}
            <div className="date">
            {_dob}
            </div>
          </div>      
        </div>
        <div className="bodyDateModal">
          <div className="formCont">
          <MDateInput color={color} label={_Util.translatetext(`year`)} _maxLengt={4} _text={yyyy} _minValue={minY}  _maxValue={maxY} minValueError={`the year is too old`} maxValueError={`the year need be less or equal to ${maxY}`} OnChange={(e)=>UpdYear(e)}/>
          <MDateInput color={color} label={_Util.translatetext(`month`)} _maxLengt={2}  _text={mm} _minValue={1}  _maxValue={12} minValueError={`the month is invalid`} maxValueError={`the month need be less or equal to ${12}`} OnChange={(e)=>UpdMonth(e)}/> 
          <MDateInput color={color} label={_Util.translatetext(`day`)} _maxLengt={2}  _text={dd} _minValue={1}  _maxValue={maxDay} minValueError={`the day is invalid`} maxValueError={`the day need be less or equal to ${maxDay}`} OnChange={(e)=>UpdDay(e)}/>         
          </div>
        </div>
        <div className="actionContainer">
          <div className="button" onClick={()=>C_cancel()} style={StyText}>
            <div className="cc" >
              cancel 
            </div>
          </div>
          {savebutton}
        </div>
      </div>          
            </>
         )
}

export default ModalDate;



const cleanbase64 = id => {
  var cClss = id;
  var h = new RegExp('=','g')
  cClss=cClss.replace(h,'');
  return cClss;
};






const dialog_Style = {}





const MDateInput = (props) => {
  const {  observeChanges, close } = useObserveChanges();
  const { label,_maxLengt,color, _text} = props;
  
  const [focus, setfocus] = useState(null);
  const [text, setText] = useState("");
  const [error, setError] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  

  var _TexT = text || _text || '';
  var labelStyle = {}
  var _colorS =  color || `#4285f4`
  var borderBottomStyle = {}
  var borderBottom = `borderBottomActive`
  if(focus){
    labelStyle = {color:_colorS}
    borderBottom = `borderBottomActive load`
    borderBottomStyle = {backgroundColor:_colorS}
  }

  
  const handleFocus = () => {    
    setfocus(true);
  }
  

  const handleBlur = () => {
    setfocus(false);
  }

  const handleChange = (e) => {
    const { _minValue , _maxValue ,minValueError, maxValueError} = props;  
    var value = parseInt(e.target.value);
    setText(e.target.value);  
    if(parseInt(_maxValue)<value){     
      setError(true);
      setErrMsg(maxValueError);
      //this.setState({error:true,errMsg:maxValueError,text:e.target.value});
      if (typeof props.OnChange === 'function') { 
        props.OnChange(null);       
      } 
    }else if(parseInt(_minValue)>value){      
      //this.setState({error:true,errMsg:minValueError,text:e.target.value}); 
      setError(true);
      setErrMsg(minValueError);
      if (typeof props.OnChange === 'function') { 
        props.OnChange(null);       
      }
    }
    else{
      setError(false);
      setErrMsg(null);
      //this.setState({error:false,text:e.target.value});      
      if (typeof props.OnChange === 'function') { 
        props.OnChange(value);       
      }      
    } 
    
  }



  return(   
      <div className="inputDatePick">
          <div className="base">  
            <div className="date">
              <div className="inputCont">  
                <input type="number" tabIndex="0" aria-label="Año" maxLength={_maxLengt} value={_TexT} 
                  onFocus={()=>handleFocus()} 
                  onChange={(e)=>handleChange(e)} 
                  onBlur={()=>handleBlur()}
                />
                <div className="label" style={labelStyle}>{label}</div>
              </div>
              <div className="borderBottom"/>
              <div className={borderBottom} style={borderBottomStyle}/>
            </div>   
          </div>     
      </div>
  )  

}