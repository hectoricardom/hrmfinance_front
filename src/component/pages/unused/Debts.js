

import React, { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import loadable from '@loadable/component'



import { withRouter, NavLink} from 'react-router-dom';

import {  OpenWatchDialog, fetchCities, fetchRemesa, OpenModal, loadStockProduct } from '../../actions/common'



import * as _Util from '../../store/Util'

import '../_styles.css'


// import '../deleteAlertMov'


/*
const InputText = loadable(() => import('../InputText'))

const InputAutocomplete = loadable(() => import('../InputAutocomplete'))

const MoreInfoButton = loadable(() => import('../MoreInfoButton'))

const TabsHRM = loadable(() => import('../tabsHRM'))
*/

const ScrollDc = loadable(() => import('../scroll-decorator'))


const PaymentSlideUp = loadable(() => import('../paymentSlideUp'))

const BTNH = loadable(() => import('../btns_confirm'))

const Icon2 = loadable(() => import('../Icons'))

const DeleteAlertMov = loadable(() => import('../deleteAlertMov'))

const InputText = loadable(() => import('../InputText'))

const ModalDate = loadable(() => import('../ModalDate'));



const useObserveChanges = () => {
  const observeChanges =  useSelector(state => state.observeChanges);
  const dispatch = useDispatch(); 


  const _openMd = (_id, item) => {
    let data = {};
    data['zIndex']=450;
    data['Id']=_id;
    data['observeResize']=true;    
    data['props']={item:item, minHeight: '1vh'};
    data['content']=<PaymentSlideUp />;
    OpenWatchDialog(dispatch,data);
  }

  const _LoadCities= (q) => {
    fetchCities(q,dispatch);
  }

  const _updRemesa= (q,fNm) => {
    fetchRemesa(q,dispatch,fNm);
  }

  const LoadUA = async (dis) => {
    let QryUser = {
      query:"getQueryUsersDetails",
      params:{userId:_Util.getUAd()},
      Collection:"Users"
    };
    
    const res = _Util.fetchStream_movie_data(_Util.get_GRAPHQLURL(),QryUser);
    const td = await res;
    if(td){
      _Util.updStore('agentsList',td);
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
    _updRemesa,
    _openMd
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

  







const _formName = 'mov_list_search';


const calcMov = async (dispatch,td,qry,dateQ) => {
    let mm = td && td["list"];
    _Util.updStore('movements',td);
    _Util.updStore('movementsM',mm);
    let done = {};
    let total = 0;
    
    _Util.ObjectKeys(mm).map((mv,ii)=>{
      let type = mm[mv]["type"];
      if(qry || dateQ){
        let _qr = qry && qry.toLowerCase()?qry.toLowerCase():"";
        let _typ = mm[mv]["type"].toLowerCase();
        let _rcv = mm[mv]["receiver"] && mm[mv]["receiver"]["name"] && mm[mv]["receiver"]["name"].toLowerCase();
        let _dte = mm[mv]["date"];
        let _dtQ = dateQ || 0;
        let _hasDt = _dte>_dtQ;
        let _hasTyp = _typ && _typ.indexOf(_qr)>=0 && _hasDt;
        let _hasRcv = _rcv && _rcv.indexOf(_qr)>=0 && _hasDt;
        
        /*
        console.log("_typ",mm[mv]["receiver"])
        console.log("_typ",_typ)
        console.log("_rcv",_rcv)
        let _addr = mm[mv]["receiver"] && mm[mv]["receiver"]["address"]&& mm[mv]["receiver"]["address"].toLowerCase();
        let _hasAdr = _addr && _addr.indexOf(_qr)>=0;
        console.log("_addr",_addr)
        
        console.log("_hasTyp",_hasTyp)
        console.log("_hasRcv",_hasRcv)
        */
        if(_hasTyp || _hasRcv){
            done[mv] = mm[mv];
            if(type!=="COMBO"){
              let am = mm[mv]["amount"] * mm[mv]["tasa"]
              let bF = balanceFactor(type,am);             
              total += bF * am;
            }else{
              let prdDtls =mm[mv] && mm[mv]["prdDtls"] ;
              let prodsL =prdDtls && prdDtls["products"];
              let prodNm = prodsL && _Util.ObjectKeys(prodsL).length;
              let am = mm[mv]["amount"] * mm[mv]["tasa"]
              if(prodNm){
                am = prdDtls["total"];
              }           
              total +=am *-1;
            }
          }
        }
        else{
          done[mv] = mm[mv];
            if(type!=="COMBO"){
              let am = mm[mv]["amount"] * mm[mv]["tasa"]
              let bF = balanceFactor(type,am);             
              total += bF * am;
            }else{
              let prdDtls =mm[mv] && mm[mv]["prdDtls"] ;
              let prodsL =prdDtls && prdDtls["products"];
              let prodNm = prodsL && _Util.ObjectKeys(prodsL).length;
              let am = mm[mv]["amount"] * mm[mv]["tasa"]
              if(prodNm){
                am = prdDtls["total"];
              }           
              total +=am *-1;
            }
        }
    })

    let doneS = _Util.sortObjectsByKey(done,"date",false);
    _Util.updStore('movementsDone',doneS);
    _Util.updStore('balanceM',total);
    doneS = null;
    done = null;
    mm = null;
    //let stt2 = (new Date()).getTime() -stt;
    //console.log("loadMovs calc duration " + stt2 + "ms")
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
      calcMov(dispatch,td,null);
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

  const [viewTypeMov, setViewTypeMov] = useState(1);

  
  const [range, setRange] = useState(24);

  const [searchQ, setSearch] = useState("");
  const [searchA, setSearchA] = useState("");

  const [viewAgents, setViewAgents] = useState(false);


  const [obs, setObs] = useState(0);




  let outerWidth = _state["outerWidth"];
  let agentId = _state["agentId2"];


  let _usAg = agentId || _userId;


  /// _usAg = _Util.getUserAgent();
  




  useEffect(() => {  
    if(widthScreen!==outerWidth){
      setWidthScreen(outerWidth);
    } 
    if(!initialize){
      setInitialize(true);
      

      if(_Util.IsAdmin()){
        LoadUA();
      }
      
      let Qry2Inv = {
        query:"getStockProductQvaMarket"
      };
      loadStockProduct(Qry2Inv,dispatch);

      
      loadMovs(dispatch,_usAg);


      setTimeout(()=>window.scrollTo(0,0),350);
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


var _movementsL = _state["movementsDone"];

let _movements2Show = groupbyTab(_movementsL,range);


var balance = _state["balanceM"];




const changeView = (i) => {
  if(i===viewTypeMov){
    setViewTypeMov(null)
  }else{
    setViewTypeMov(i)
  }
  window.scrollTo(0,0);
}



const searchMov = (i) => {
    let td = _state["movements"];
    let _date = _form && _form["date"]
    if(i && i.length>1){
      calcMov(dispatch,td,i,_date);
    }else{
      calcMov(dispatch,td,null,_date);
    }
}


let agentsList = _state["agentsList"] || {};
let agentsListArr = [];
let agentRcv = {}
if(_Util.IsAdmin()){
  if(_Util.IsAdmin() && searchA && searchA.length>1){
    agentsList = searchb(_state["agentsList"],searchA);
    agentsListArr = _Util.ObjectKeys(agentsList) || [];
  }
  agentRcv = agentsList && agentsList[_usAg];
}




const confirmAgentId = (v) => {
  _Util.updStore('agentId2',v);
  setSearch(null);
  setViewAgents(0)
  loadMovs(dispatch,v);
}

const callBackDate= (f,v) => {
  let dD = new Date(v);  
  const _form = _Util.getFormStore(_formName) || {};
  let frm =  _form;
  frm[f] = dD.getTime();
  _Util.updFormStore(_formName,frm)
  setObs(_Util.gen16CodeId());
  let _date = _form && _form["date"];
  let i = _form && _form["search"];
  let td = _state["movements"];
  if(i && i.length>1){
    calcMov(dispatch,td,i,_date);
  }else{
    calcMov(dispatch,td,null,_date);
  }
}


const OpenModalDate = (i) => {
    let data = {};   
    const _form = _Util.getFormStore(_formName) || {};
    let  _date = _form && _form[i];
    data['zIndex']=190;
    data['observeResize']=true;
    data['props']={title:"", item:i};
    data['content'] = <ModalDate valueUpdate={(e)=>callBackDate(i,e)} initValue={_date}/>; 
    OpenModal(dispatch,data);
  }


let keyCodes =   _Util.getGlobalsKeys();




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
                  {_Util.IsAdmin()?
                  <>
                  {!viewAgents?
                  <div className={`shopping_cart receivers`} >
                    <div className={`pym81b sendBx receiversItm `}>
                        <div className={`total_cart `}>
                            <div>
                            {agentRcv && agentRcv["name"]}
                            </div>
                        </div>
                        <div className={`subtotal_cart `}>
                            <div>
                            {agentRcv && agentRcv["email"]}
                            </div>
                        </div>
                        <div className={`sendBtn _dsplFlx spaceAround`}>
                          <div className={`fieldPadding _MrgV`} style={{ marginTop: "10px"}}>
                          </div>
                          <div className={`fieldPadding _MrgV`} style={{ marginTop: "10px"}}>
                            <span onClick={()=>setViewAgents(1)}>
                              <BTNH theme={`light_blue`} title={`Escoger Agente`}/>
                            </span>
                          </div>
                        </div>
                    </div>
                  </div>
                  :
                  <div className={`shopping_cart receivers`} >
                    <div className={`paddField address`}>
                      <InputText 
                        icon={`more_vert`} 
                        form={_formName} 
                        field={`agentId`}  
                        keyCode={15} 
                        placeholder={`Agent`} 
                        background={`#f9f9f9`}
                        color={`var(--base-color)`}
                        OnChange={(e)=>setSearchA(e)}
                        initvalue={searchA}
                      />
                    </div>
                    <div className={`_dsplFlx spaceAround _flxWrp `}>
                      {agentsListArr && agentsListArr.map(rcvL=>{
                        let Itm = agentsList[rcvL];
                        let nmF = Itm && Itm["name"].split(' ')[0];
                        return(
                          <div className={`pym81b sendBx receiversItm `}>
                              <div className={`total_cart `}>
                                  <div>
                                  {Itm && Itm["name"]}
                                  </div>
                              </div>
                              <div className={`subtotal_cart `}>
                                  <div>
                                  {Itm && Itm["email"]}
                                  </div>
                              </div>
                              <div className={`sendBtn _dsplFlx spaceAround`}>
                                <div className={`fieldPadding _MrgV`} style={{ marginTop: "10px"}}>
                                </div>
                                <div className={`fieldPadding _MrgV`} style={{ marginTop: "10px"}}>
                                  <span onClick={()=>confirmAgentId(rcvL)}>
                                    <BTNH theme={`light_blue`} title={`Asignar a ${nmF}`}/>
                                  </span>
                                </div>
                              </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  }
                  </>
                  :null}
                  <div className={`  headerTtl`}>
                        <div className={`pym81b sendBx `}>
                            <div className={`subtotal_cart `}>
                                {`Balance`}
                            </div>
                            <div className={`total_cart ${balance>0?"pos":"neg"}`}>
                              {`$ ${balance?balance.toFixed(2):0}`}
                              <div className={`sendBtn`}>
                              </div>
                            </div>
                        </div>
                      </div>
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
                      <div className={`fieldPadding _MrgV`}>
                        <span onClick={()=>OpenModalDate( `date` )}>
                          <BTNH theme={`light_blue`} title={_form && _form["date"]?_Util.parseDate(_form["date"]):_Util.parseDate(_Util.gTm())}/>
                        </span>
                      </div>


                      

                      
                        <div className={`formContainer `} style={{opacity:1}}>
                        <div className={`_dsplFlx space2Around _flxWrp op4oU`}>
                        {
                          _movements2Show &&_movements2Show.map((fV,i)=>{
                            //let stck = _movements2Show[fV];
                            return(
                              <RecyclerView data={fV} ind={i} range={range} key={`${keyCodes[i]}_${i}_cmpl_Mov`} updRange={(v)=>setRange(v)}/>
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



function parseAutoObj(o,ky){
  let res = {}
  _Util.ObjectKeys(o).map(k=>{
    res[k] = {name:o[k][ky], id:k}
  })
  return res;
} 

function parseAutoFilterObj(o,ky,v){
  let res = {}
  _Util.ObjectKeys(o).map(k=>{
    if(o[k][ky].toLowerCase().indexOf(v.toLowerCase())>=0){
      res[k] = {name:o[k][ky], id:k}
    }
  })
  return res;
} 








const RecyclerView = (props) => {

  const {
    data, ind, range, dataObj
  } = props;

  const [initialize, setInitialize] = useState(false);

  const _scrollhandler = (sc) => {
    if(!initialize){
      let cmp =document.getElementById(ind+"_gpr_"+ind);
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
    <div id={ind+"_gpr_"+ind} style={{minHeight:"100px"}}>
    {initialize?
      <div className={``}>
        {data.map((_grTGid,_grTGid_ind)=>{
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

var _movements = _state["movementsM"];


let item =_movements && _movements[mvId];


let _id =item && item["id"];

let prdDtls =item && item["prdDtls"] ;
let prodsL =prdDtls && prdDtls["products"];
let prodNm = prodsL && _Util.ObjectKeys(prodsL).length;



let tt =item && item["amount"]?item["amount"]:0
if(prodNm){
  tt = prdDtls["total"] / 25;
}


let hasDate = item && _Util.date2pretyfy(item["date"]) ;

let name = item && `${item["type"]}`

let dest = item && item["receiver"] && item["receiver"]["name"];


if(item){
  if(item["type"]==="COMBO"){
    name = item && `${item["type"]} `
  }
  else if(isEntrega(item["type"])){
    name =  `REMESA`
  }
  else if(item["type"]==="INVESTMENT_FOOD"){
    name =  `INVERSION`
  }
  else if(item["type"]==="BTC"){
    name =  `BTC - ${item && item["amount"]}`
  }
  else if(item["type"]==="TRANSFER"){
    dest =  item && item["agentDestinationDetails"] && item["agentDestinationDetails"]["name"];
  }
}

const _openDtls = (sc) => {
  _Util.updStore('movementsDetails',item);
}

let isPaid = item && item["isPaid"];



const removeM = () => {
  let data = {};
  data['zIndex']=450;
  data['observeResize']=true;    
  data['props']={item:_id, minHeight: '190px'};
  data['content']=<DeleteAlertMov confirm={Confirm} />;
  OpenModal(dispatch,data);
}


const upd_isPaid = async (r) => {
  let QryR = {
    form:{
      id:item["id"],
      isPaid: !isPaid
    },
    query:"upgradeMovements"
  };
  const res = _Util.fetchStream_movie_data(_Util.get_GRAPHQLURL(),QryR);
  const td = await res;
  if(td){
    
  }
}


const Confirm = async () => {
  loadMovs(dispatch);
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
                    <div className={`mov_type_title `}>
                      {name}
                    </div>
                    <div className={`flexSpace`}/>                    
                </div>
                <div className="_dsplFlx mov_det">
                  <div className="date">{hasDate}</div>
                  <div className={`flexSpace`}/>
                  <div className="egZxgf pqv9ne priceinDesktop">
                    <div className="egZxgf pqv9ne">
                      <div className="DX0ugf ApBhXe _dsplFlx">
                      <span className="unitlbl mrkPl">{tt && tt.toFixed(2)}</span>
                        <div className={`flexSpace`}/>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="recvr">{dest}</div>
                <div className={`sendBtn _dsplFlx mov_actions`}>
                  <div className={`flexSpace`}/>
                  <div className={`sendBtn _dsplFlx spaceAround`}>
                    {_Util.IsAdmin()?
                    <div className={`fieldPadding _MrgV _actBtnMg`} >
                      <span onClick={()=>removeM()}>
                        <BTNH theme={`fire_brick`} title={`Eliminar`}/>
                      </span>
                    </div>
                    :null}
                    {_Util.IsAdmin() && !_state["delivery"]?
                    <div className={`fieldPadding _MrgV _actBtnMg`}>
                      <span onClick={()=>upd_isPaid()}>
                        <BTNH theme={isPaid?`light_green`:``} title={isPaid?`Paid`:`Unpaid`}/>
                      </span>
                    </div>
                    :null}
                    <div className={`fieldPadding _MrgV _actBtnMg`}>
                      <span>
                      <NavLink  to={{pathname:"/mov_details",search:"?movId="+ _id}} className=" u3mD2d xwW5Ce" onClick={_openDtls}>
                          <BTNH theme={`light_blue`} title={`Detalles`}/>
                      </NavLink>
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



/*


export function sortObjectsByKey(obj,_key,order) {
  let _list = ObjectKeys(obj);
  let arrSrt = _list.sort(function(a, b) {
    let objA = obj[a];
    let objB = obj[b]          
    if(order==="desc"){
      if(objA[_key] < objB[_key]) { return -1; }
      if(objA[_key] > objB[_key]) { return 1; }
    }else{
      if(objA[_key] > objB[_key]) { return -1; }
      if(objA[_key] < objB[_key]) { return 1; }
    }
    return 0;
  })
  return arrSrt;
}

*/

const isEntrega = (type) => {
  return type === "Entrega" || type === "REM_CARD_CUP" || type === "REM_CARD_MLC" || type === "REM_CASH_USD" || type === "REM_CASH_CUP" || type === "COMBO";
}

const balanceFactor = (type,am) => {
  if (isEntrega(type)) {
    if(am>0){
      return -1;
    }else{
      return 1;
    }
  } 
  else if (type ==="INVESTMENT_FOOD") {
    return -1;
  }
  else if (type ==="BTC" || type ==="TRANSFER" || type ==="ADJUSTMENTS"  || type ==="DEBT"  || type ==="COMISION_AGENT") {
    return 1;
  }
  else if (type ==="COMBO") {
    return 0;
  }
  else{
    return 0
  }
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

