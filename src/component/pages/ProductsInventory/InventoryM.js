

import React, { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import loadable from '@loadable/component'



import { withRouter, NavLink} from 'react-router-dom';

import {  OpenWatchDialog, fetchCities, fetchRemesa, OpenModal }
from '../../../actions/common'



import * as _Util from '../../../store/Util'

import '../../_styles.css'





const DeleteAlertMov =_Util.DeleteAlertMov_Cmpt();

const Icon2 = _Util.Icon_Cmpt();


const BTNH = _Util.BTNH_Cmpt();






const useObserveChanges = () => {
  const observeChanges =  useSelector(state => state.observeChanges);
  const dispatch = useDispatch(); 


  const _openMd = (_id, item) => {
    let data = {};
    data['zIndex']=450;
    data['Id']=_id;
    data['observeResize']=true;    
    data['props']={item:item, minHeight: '1vh'};
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




const loadInvId = async (pI,dispatch) => {
  let Qry2Inv = {
    query: "getQueryProducts_Inv_ID",
    params:{
      id:pI
    }
  };
  const res = _Util.fetchStream_movie_data(_Util.get_GRAPHQLURL(),Qry2Inv);
  const td = await res;
  if(td){
    _Util.updStore('invProdDetail',td);

    if(td[pI] && td[pI].imageUrl){
      //aI.push(td[pI].imageUrl);
      //getThumbnailImg(td[pI].imageUrl,dispatch)
    }

    dispatch({
      type: 'UPD_KEY_VALUE',
      kv:{key:'observeChanges',value:_Util.gen12CodeId()}
    })
  }
}























const SendersComponent = (props) => {
  const {
    dispatch,
    LoadUA
  } = useObserveChanges();

  let _state = _Util.getStore();
  let keys = _Util.getGlobalsKeys()
  _state["keys"] = keys;



  const [initialize, setInitialize] = useState(false);

  const [widthScreen, setWidthScreen] = useState(null);

  const [view, setView] = useState(false);




  let outerWidth = _state["outerWidth"];


  /// _usAg = _Util.getUserAgent();
  

  const searchHash = window.location.hash.split('?')[1]?window.location.hash.split('?')[1]:null;
  const router = _Util.parseQuery(searchHash);






  
 
let userA = _Util.getBrowser();
  
let isMobile = userA.os === "Android" || userA.os === "iPhone" || _state["outerWidth"]<550 ;



let keyCodes =   _Util.getGlobalsKeys();

/*





*/

var itm = _state["invProdDetail"] && _state["invProdDetail"][router.prodId]?_state["invProdDetail"][router.prodId]:{};


let sz = "360";


const stockDetails = itm && itm["stock"] ;
const _cost_pr = stockDetails && (stockDetails["amount"] / stockDetails["stockIn"])? (stockDetails["amount"] / stockDetails["stockIn"]):0;
const _stock = stockDetails && stockDetails["stock"]?stockDetails["stock"]:0;


const invHistory = itm && itm["movements"] ;



let _id =itm && itm["id"];

let pId = "pId_mk_inv" +_id

const [hid, setHidd] = useState(null);
const [obs, setObs] = useState(null);


let imgI = itm && itm["imageUrl"] && itm["imageUrl"]+"?sz="+sz;
let _imgI = imgI && _Util.imageRxUrl()+ imgI;
let _blob = _Util.getImageStore()[_imgI];



  
useEffect(() => {
  if(!_blob && !hid){
    setTimeout(()=>{
      _Util.updImageStore(_imgI,1);
      let logo = document.createElement('img');
      logo.id = pId;
      logo.style.display="none";
      // assign and onload event handler
      logo.addEventListener('load', (event) => {
          setHidd(true);
          _Util.removeElement(pId);
          _Util.updImageStore(_imgI,2);
          setObs(_Util.gen6CodeId());
      });
      // add logo to the document
      document.body.appendChild(logo);
      logo.src = _imgI;
    },75)
  }


  if(widthScreen!==outerWidth){
    setWidthScreen(outerWidth);
  } 
  if(!initialize){
    setInitialize(true);
    _Util.updViewActive(3);

    if(_Util.IsAdmin()){
      LoadUA();
    }
    
    
    loadInvId( router.prodId, dispatch);      

    setTimeout(()=>window.scrollTo(0,0),350);
    setTimeout(()=>setView(true),50);
    window.localStorage.setItem("lng","es");
  }
});





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
                <div className={`centerListCardInvM invMov`}>

                    <div className={`formContainer `} style={{opacity:1}}>  
                        <div className={`_dsplFlx _flxWrp HRKRR`}>
                        <div className={`formContainer info_prod`}>
                            <div className={`mainTitle`}>
                              {`${itm && itm["name"]}`}
                            </div>
                          </div>
                          <div className={`B6hqVd`}>
                            <div class="sh-div__viewport img_dtl"  style={{height: "300px"}} >
                              <div class="TiQ3Vc main-image">
                                {_blob===2?<img src={_imgI} className="sh-div__image sh-div__current" alt="" />:null}
                              </div>
                            </div>
                          </div>
                          <div className={`formContainer info_prod`}>
                            {itm && itm["desc"]?
                              <div className={`descTitle`}>
                                  {`${itm["desc"]}`}
                              </div>
                            :null}
                            <div className={`_dsplFlx _price_unit `}>
                              <div className={`flexSpace`}/>   
                              <div className={`mainTitle`}>
                                {itm && itm["salePrice"]?`$${itm && itm["salePrice"]}`:""}                      
                              </div>
                              <div className={`unitlbl`}>
                                {itm && itm["unit"]?`(${itm && itm["unit"]})`:""}                      
                              </div>
                            </div>
                            <div className={`  headerTtl`}>
                              <div className={`pym81b sendBx `}>
                                  <div className={`subtotal_cart `}>
                                      {_Util.translatetext(5)}
                                  </div>
                                  <div className={`total_cart `}>
                                    {` ${_stock} X  $ ${_cost_pr?_cost_pr.toFixed(2):0}`}
                                    <div className={`sendBtn`}>
                                    </div>
                                  </div>
                              </div>
                            </div>

                          </div>
                        </div>
                      </div>

                  



                      <div className={`paddField address`}>
                        <div className={`pym81b sendBx mov_type _dsplFlx activeBlue`}>
                          <div className={`icon_mov`}>
                            <Icon2 name={`send`} />
                          </div>
                          <div className={`mov_type_title `}>
                            {`${_Util.translatetext(77)}`}
                          </div>
                          <div className={`flexSpace`}/>                    
                        </div>
                      </div>
                      
                      <div className={` sendBx scroll3Wrp `} >
                        <div className={`formContainer `} style={{opacity:1}}>
                        
                        <div className={`_dsplFlx space2Around _flxWrp op4oU`}>
                        {
                          invHistory && Object.keys(invHistory).map((fV,i)=>{
                            return(
                              <ItemComponent mvId={fV} data={invHistory} ind={i} key={`${keyCodes[i]}_${i}_pend_Mov`} isMobile={isMobile}/>
                            )
                        })}
                        </div>
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





const ItemComponent = (props) => {

  const {
    dispatch
  } = useObserveChanges();


  const {
    mvId,
    data,
    isMobile
  } = props;

let item =data && data[mvId];


let _id =item && item["id"];

let qty = item && `${item["qty"]}`

let name = item && `${item["orderId"]}`


let tt = item && item["price"]?item["price"]:item && item["cost_price"];




const removeM = () => {
  let dataM = {};
  dataM['zIndex']=450;
  dataM['observeResize']=true;    
  dataM['props']={item:_id, minHeight: '190px'};
  dataM['content']=<DeleteAlertMov confirm={Confirm} />;
  OpenModal(dispatch,dataM);
}



const Confirm = async () => {
  const searchHash = window.location.hash.split('?')[1]?window.location.hash.split('?')[1]:null;
  const router = _Util.parseQuery(searchHash);
  loadInvId( router.prodId, dispatch);
}


let classTyp =  "";



let movId = item &&  item["movementId"];


//let movObj =  item && item["movDetails"];


let hasDate = item && _Util.date2pretyfy(item && item["date"]) ;


return (
  <div className="xwW5Ce u3mD2d " >
    {item?
    <div className="m18Ex  u3mD2d xwW5Ce">
        <div className=" u3mD2d xwW5Ce brdBt_ShopCart  movementsList">
          <article className="u3mD2d xwW5Ce u3mRow spaceAround">
            <div className={`${isMobile?"":"_dsplFlx"}  itm_ShopCart`}>
              <div className="egZxgf pqv9ne b7mrgL3x ">
                <div className={` mov_type _dsplFlx SmlB ${classTyp}`} >  
                  {movId?
                    <NavLink  to={{pathname:"/mov_details",search:"?movId="+ movId}} className=" u3mD2d xwW5Ce">              
                      <div className={`mov_type_title `}>
                        {`${_Util.translatetext(82)}:   ${name}`}
                      </div>
                    </NavLink>
                    :
                    <div className={`mov_type_title `}>
                        {`${_Util.translatetext(82)}:   ${name}`}
                    </div>
                  }
                  <div className={`flexSpace`}/>                  
                </div>
                <div className={`${isMobile?"":"_dsplFlx"} `}>
                  {hasDate?
                  <div className="date">{`${_Util.translatetext(80)}: ${hasDate}`}</div>
                  :
                  <div className="_error_no_link ">{`${_Util.translatetext(81)} Movimiento no Relacionado`}</div>
                  }
                  <div className={`flexSpace`}/>
                  <div className="egZxgf pqv9ne priceinDesktop">
                    <div className="egZxgf pqv9ne">
                      <div className="DX0ugf ApBhXe _dsplFlx">
                        <span className="unitlbl mrkPl">{`${_Util.translatetext(15)}: ${qty}`}</span>
                        <div className={`flexSpace`}/>
                      </div>
                    </div>
                    <div className="egZxgf pqv9ne">
                      <div className="DX0ugf ApBhXe _dsplFlx">
                        <span className="unitlbl mrkPl">{`${_Util.translatetext(16)}: $${tt && tt.toFixed(2)}`}</span>
                        <div className={`flexSpace`}/>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="recvr">{""}</div>
                <div className={`sendBtn _dsplFlx mov_actions`}>
                  <div className={`flexSpace`}/>
                  <div className={`sendBtn _dsplFlx spaceAround`}>
                    {_Util.IsAdmin()?
                    <div className={`fieldPadding _MrgV _actBtnMg`} >
                      <span onClick={()=>removeM()}>
                        <BTNH theme={`fire_brick`} title={`${_Util.translatetext(68)}`}/>
                      </span>
                    </div>
                    :null}
                  </div>
                </div>
              </div>
            </div>
          </article>
        </div>   
      </div>
      :null}
    </div>

  )

}



