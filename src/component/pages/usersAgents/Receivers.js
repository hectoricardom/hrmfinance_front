

import React, { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import loadable from '@loadable/component'



import { withRouter, NavLink} from 'react-router-dom';

import {  
  fetchCities, 
  fetchRemesa, 
  OpenModal, 
  loadReceivers
}

from '../../../actions/common'


import * as _Util from '../../../store/Util'

import '../../_styles.css'






const ReceiversAlertDelete = loadable(() => import('../../deleteAlert'))



const ReceiversMdl = loadable(() => import('./receiverModal'))




const BTNH = _Util.BTNH_Cmpt();

const Icon2 = _Util.Icon_Cmpt();
const ScrollDc =  _Util.ScrollDc_Cmpt();
const InputText =  _Util.InputText_Cmpt();




/*

const InputAutocomplete = _Util.InputAutocomplete_Cmpt(); 


const CheckBoxSlide =  _Util.CheckBoxSlide_Cmpt();



const BTNH = _Util.BTNH_Cmpt();


const ModalDate =  _Util.ModalDate_Cmpt();


const LoadingColorSpinner=  _Util.LoadingColorSpinner_Cmpt();

const ScrollDc =  _Util.ScrollDc_Cmpt();


const DeleteAlertMov = _Util.DeleteAlertMov_Cmpt();

const SearchInput =  _Util.SearchInput_Cmpt();

*/




const useObserveChanges = () => {
  const observeChanges =  useSelector(state => state.observeChanges);
  const dispatch = useDispatch(); 


  const _LoadCities= (q) => {
    fetchCities(q,dispatch);
  }

  const _updRemesa= (q,fNm) => {
    fetchRemesa(q,dispatch,fNm);
  }

  const LoadUA = async (dis) => {
    let flds = ["id","name","email","isqvmAgent", "isAdmin"]
    let QryUser = {
      query:"getQueryUsersDetails",
      params:{userId:_Util.getUAd()},
      Collection:"Users",
      arraySerialization: _Util.isArraySerialization(),
      fields:flds,
    };
    const res = _Util.fetchStream_movie_data(_Util.get_GRAPHQLURL(),QryUser);
    const td = await res;
    if(td){
      let dZs = _Util.isArraySerialization()?_Util.deZerialize2Array(td,flds,1):td;
      _Util.updStore('agentsList',dZs);
      dispatch({
        type: 'UPD_KEY_VALUE',
        kv:{key:'observeChanges',value:_Util.gen12CodeId()}
      })
    }
  }
  
  
  return { 
    observeChanges,
    _LoadCities,
    dispatch,
    LoadUA,
    _updRemesa
  }
}





const useObserveForms = () => {
  const observeForms =  useSelector(state => state.observeForms);
  const dispatch = useDispatch(); 


  const _updFormObs = (q,operation) => {
    dispatch({
      type: 'UPD_KEY_VALUE',
      kv:{key:'observeForms',value:_Util.gen12CodeId()}
    })
  }
  

 
  return { 
    _updFormObs,
    observeForms
  }
}

  







const _formName = 'add_receiver_modal';

const calcMov = async (dispatch,qry) => {
    let _state = _Util.getStore();
    let mm = _state["receiversList"];
    let done = {};
    _Util.ObjectKeys(mm).map((mv,ii)=>{
      if(qry){
        let _qr = qry && qry.toLowerCase()?qry.toLowerCase():"";
        let _typ = mm[mv]["name"]?mm[mv]["name"].toLowerCase():null;
        let _rcv = mm[mv]["address"]?mm[mv]["address"].toLowerCase():null;
        let _phn = mm[mv]["phoneNumber"];
        let _hasTyp = _typ && _typ.indexOf(_qr)>=0;
        let _hasRcv = _rcv && _rcv.indexOf(_qr)>=0;
        let _hasphNmb = _phn && _phn.toString().indexOf(_qr)>=0;
        if(_hasTyp || _hasRcv || _hasphNmb){
          done[mv] = mm[mv];
        }
      }
      else{
        done[mv] = mm[mv];
      }
    })

    let doneS = _Util.sortObjectsByKey(done,"name",true);
    _Util.updStore('receiversF',doneS);
    doneS = null;
    done = null;
    mm = null;
    dispatch({
      type: 'UPD_KEY_VALUE',
      kv:{key:'observeChanges',value:_Util.gen12CodeId()}
    })


}


const loadMovs = async (dispatch,userId) => {
  let stt = (new Date()).getTime()
  let Qry2Inv = {
    query:"getQueryMovementsbyUserID",
    params:{
      userId:userId,
      //userId:_Util.getUserAgent(),
    }
  };
  const res = _Util.fetchStream_movie_data(_Util.get_GRAPHQLURL(),Qry2Inv);
    const td = await res;
    if(td){
      calcMov(dispatch,null);
    }
}


























const SendersComponent = (props) => {
  const {
    dispatch,
    LoadUA
  } = useObserveChanges();

  const {
    _updFormObs
  } = useObserveForms();
  


  let _state = _Util.getStore();
  let keys = _Util.getGlobalsKeys()
  _state["keys"] = keys;

  const _form = _Util.getFormStore(_formName) || {};

  let _userId = _Util.getProfileId();


  const [initialize, setInitialize] = useState(false);

  const [widthScreen, setWidthScreen] = useState(null);

  const [view, setView] = useState(false);
  
  const [range, setRange] = useState(24);

  const [obs, setObs] = useState(0);




  let outerWidth = _state["outerWidth"];
  


  useEffect(() => {  
    if(widthScreen!==outerWidth){
      setWidthScreen(outerWidth);
    } 
    if(!initialize){
      setInitialize(true);
      

      if(_Util.IsAdmin()){
         LoadUA();
      }
      
      loadReceivers(_userId,_userId,dispatch);


      setTimeout(()=>{
        window.scrollTo(0,0);
        calcMov(dispatch)
      },350);
      setTimeout(()=>setView(true),50);
      window.localStorage.setItem("lng","es");
      let frm =  _Util.getFormStore(_formName);

      if(!frm || !frm["id"]){
        _Util.updFormStore(_formName,{})
        _updFormObs();
      }
    }
  });
  



  
 
let userA = _Util.getBrowser();
  
let isMobile = userA.os === "Android" || userA.os === "iPhone" || _state["outerWidth"]<550 ;


let keyCodes =   _Util.getGlobalsKeys();


let receiversList = _state["receiversF"] ||[];
let receiversListArr = groupbyTab(receiversList,range) || [];


const searchMov = (i) => {
  if(i && i.length>1){
    calcMov(dispatch,i);
  }else{
    calcMov(dispatch);
  }
}







    return (
      <>
        <style>
        {`
        .palette{
          --base-color: rgb(21, 100, 191,1);
          --base-color-gradient: 21, 100, 191;
        }

        `}
        </style>
        <div className={` palette formContainer shopping_cart  _movements ${isMobile?"is_mobile":""}`} style={{opacity:view?1:0}} >
                
            <div className={`formContainer `} style={{opacity:1}}>
                {view?
                <div className={`centerListCardProd `}> 
                  
                      <div className={`paddField address`}>
                        <InputText 
                          icon={`more_vert`} 
                          form={_formName} 
                          field={`search`}  
                          keyCode={42} 
                          placeholder={`Buscar..`} 
                          background={`#f9f9f9`}
                          color={`var(--base-color)`}
                          OnChange={(e)=>searchMov(e)}
                          initvalue={_form["search"]}
                        />
                      </div>
                      
                        <div className={`formContainer `} style={{opacity:1}}>
                        <div className={`_dsplFlx space2Around _flxWrp op4oU`}>
                        {
                          receiversListArr &&receiversListArr.map((fV,i)=>{
                            return(
                              <RecyclerView data={fV} ind={i} range={range} key={`${keyCodes[i]}_${i}_rcv`} updRange={(v)=>setRange(v)}/>
                            )
                        })}
                        </div>
                        </div>
                    </div>:null}
                  </div>
                  <div  className={`footSpace`}/>
          </div>
      </>
    );
  
}  





export default withRouter(SendersComponent)









const RecyclerView = (props) => {

  const {
    data, ind, range
  } = props;

  const [initialize, setInitialize] = useState(false);

  const _scrollhandler = (sc) => {
    if(!initialize){
      let cmp =document.getElementById(ind+"_rcvs_"+ind);
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
    <div id={ind+"_rcvs_"+ind} style={{minHeight:"100px"}}>
    {initialize?
      <div className={``}>
        {data && Array.isArray(data) &&  data.map((_grTGid,_grTGid_ind)=>{
          return (
            <ItemComponent mvId={_grTGid}/>
          )
        })}
      </div> 
      : 
      <ScrollDc   scrollhandler={_scrollhandler} /> 
    }  
    </div>                                   
  )

}







const ItemComponent = (props) => {

  const {
    dispatch
  } = useObserveChanges();


  const {
    mvId
  } = props;

let _state = _Util.getStore();

var _movements = _state["receiversList"];


let item =_movements && _movements[mvId];


let _id =item && item["id"];

let hasPhoneNumber = item && `${item["phoneNumber"]}`

let name = item && `${item["name"]}`
let _address = item && `${item["address"]}`



const _openDtls = (sc) => {
  //_Util.updStore('movementsDetails',item);
  _Util.updFormStore(_formName,item)
  _openNewReceiver();
}



const removeM = () => {
  let data = {};
  data['zIndex']=450;
  data['observeResize']=true;    
  data['props']={item:_id, minHeight: '190px'};
  data['content']=<ReceiversAlertDelete confirm={Confirm} />;
  OpenModal(dispatch,data);
}







const _openNewReceiver = () => {
  let data = {};
  data['zIndex']=450;
  data['Id']=_id;
  data['observeResize']=true;    
  data['props']={item:item, minHeight: '1vh'};
  data['content']=<ReceiversMdl />;
  OpenModal(dispatch,data);
}




const Confirm = async () => {
  //loadMovs(dispatch);
}
let classTyp =  "";
let iconTyp =  "";

if(item){
  classTyp =  item["type"]==="Entrega"?"_Rem":item["type"]==="BTC"?"_btc":item["type"]==="COMBO"?"_cmb":item["type"]==="INVESTMENT_FOOD"?"_investFood":item["type"]==="DEBT"?"_debt":item["type"]==="TRANSFER"?"_trnsfr":"";
  iconTyp =  item["type"]==="Entrega"?"money_outline":item["type"]==="BTC"?"btc":item["type"]==="COMBO"?"food_variant":item["type"]==="INVESTMENT_FOOD"?"shopping_outline":item["type"]==="DEBT"?"bank_outline":item["type"]==="TRANSFER"?"bank_transfer":"";

}



return (
  <div className="xwW5Ce u3mD2d " >
    <div className="m18Ex  u3mD2d xwW5Ce">
        <div className=" u3mD2d xwW5Ce brdBt_ShopCart  movementsList">
          <article className="u3mD2d xwW5Ce u3mRow spaceAround">
            <div className="_dsplFlx  itm_ShopCart">
              <div className="egZxgf pqv9ne b7mrgL">
                <div className={` mov_type _dsplFlx SmlB ${classTyp}`} >
                    <div className={`icon_mov`}>
                      <Icon2 name={iconTyp} />
                    </div>
                    {name?
                    <div className={`mov_type_title `}>
                      {name}
                    </div>
                    :null}
                    <div className={`flexSpace`}/>                    
                </div>
                <div className="_dsplFlx mov_det">
                  {hasPhoneNumber?
                  <div className="date">{hasPhoneNumber}</div>
                  :null}
                  <div className={`flexSpace`}/>
                </div>
                {_address?
                <div className="recvr">{_address}</div>
                :null}
                <div className={`sendBtn _dsplFlx mov_actions`}>
                  <div className={`flexSpace`}/>
                  <div className={`sendBtn _dsplFlx spaceAround`}>
                    {_Util.IsAdmin()?
                    <div className={`fieldPadding _MrgV _actBtnMg`} >
                      <span onClick={()=>removeM()}>
                        <BTNH theme={`fire_brick`} title={_Util.translatetext(68)}/>
                      </span>
                    </div>
                    :null}
                    <div className={`fieldPadding _MrgV _actBtnMg`}>
                      <span className=" u3mD2d xwW5Ce" onClick={_openDtls}>
                        <BTNH theme={`light_blue`} title={_Util.translatetext(71)}/>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </article>
        </div>   
      </div>
    </div>

  )

}



function groupbyTab(obj,range,q) {
  let h = []
  let count = 0;
  obj && obj.map((d)=>{
    if(count<=range){
      let ind = Math.floor(count/12);
      if(!h[ind]){
        h[ind] = [];
      }
      h[ind].push(d);
      count += 1;
    }
  })
  return h;
}



function searchb(o,q){
  let rrs = {}
  _Util.ObjectKeys(o).map(k=>{
    let qLw = q && q.toLowerCase();
    let nLw = o[k]["name"] && o[k]["name"].toLowerCase();
    if(qLw && nLw && nLw.indexOf(qLw)>=0){
      rrs[k] = o[k]
    }
  })
  return rrs;
} 

