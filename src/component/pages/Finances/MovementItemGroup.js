

import React, { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'


import { NavLink} from 'react-router-dom';

import {   fetchCities, fetchRemesa, OpenModal, loadGroups, CloseModal } from '../../../actions/common'



import * as _Util from '../../../store/Util'


import '../../_styles.css'



const BTNH = _Util.BTNH_Cmpt();

const Icon2 = _Util.Icon_Cmpt();

const DeleteAlertMov = _Util.DeleteAlertMov_Cmpt();



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








const ItemComponent = (props) => {

  const {
    dispatch
  } = useObserveChanges();


  const {
    mvId
  } = props;

let _state = _Util.getStore();


var _movements = _state["Groups"];


let item =_movements && _movements[mvId];

let _id =item && item["id"];

const [viewOpen, setViewOpen] = useState(0);


let name = item && item["name"];

let _userId = _Util.getProfileId();



const _openDtls = (sc) => {
  let itm = item;
  itm["group"] = item["group"]["id"]
  delete itm["user"]
  delete itm["year"]
  delete itm["month"]
  const _formN = "243876nt5fdgomwy"
  _Util.updFormStore(_formN,itm);
  dispatch({
    type: 'UPD_KEY_VALUE',
    kv:{key:'observeChanges',value:_Util.gen12CodeId()}
  })
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


const Confirm = async (modalID) => {
  let Qry = {
    params:{id:item["id"]},
    query:"removeGroup",
    user: _userId
  }; 

  const res = _Util.fetchStream_movie_data(_Util.get_GRAPHQLURL(),Qry);
  const td = await res;
  if(td){
    loadGroups(_userId);
    CloseModal(dispatch,{id:modalID});
  }

  
}




let classTyp =  "";
let iconTyp =  "";


if(item){
  classTyp =  item["type"]==="Entrega"?"_Rem":item["type"]==="BTC"?"_btc":item["type"]==="COMBO"?"_cmb":(item["type"]==="INVESTMENT_FOOD" || item["type"]==="INVESTMENT_INGREDIENTS")?"_investFood":  item["type"]==="DEBT"?"_debt":item["type"]==="TRANSFER"?"_trnsfr":item["type"]==="DELIVERY_EXPS"?"_dlvExp":"";
  iconTyp =  item["type"]==="Entrega"?"money_outline":item["type"]==="BTC"?"btc_circle":item["type"]==="COMBO"?"food_variant":(item["type"]==="INVESTMENT_FOOD" || item["type"]==="INVESTMENT_INGREDIENTS")?"shopping_outline":item["type"]==="DEBT"?"bank_outline":item["type"]==="TRANSFER"?"bank_transfer":item["type"]==="DELIVERY_EXPS"?"moped":"";
}





return (
  <>
    <div>
      <div className={`movementItem_mobile  group ${viewOpen?"open":""}`}>
        <div className={` mov_type _dsplFlx SmlB mov_actions ${classTyp}`} >
          <div className={`details_op `}>
            <div className={`title_head3r _dsplFlx `}>
              <h5>
                {name}
              </h5> 
              <div className={`flexSpace`}/>  
            </div>
          </div>
          <div className={`flexSpace`}/> 
          <div className={`actions`}>
            <div className={`icon_open ${viewOpen?"up":"down"}`}  onClick={()=>setViewOpen(!viewOpen)}>
              <Icon2 name={"arrow_down"} />
            </div>
          </div>
        </div>
        {viewOpen?
        <>
        <div  className={`separator`}></div>
        <div className={`sendBtn _dsplFlx mov_actions`}>
          <div className={`flexSpace`}/>
          <div className={`sendBtn _dsplFlx spaceAround`}>
            <div className={`fieldPadding _MrgV _actBtnMg`} >
              <span onClick={()=>removeM()}>
                <BTNH theme={`fire_brick`} title={ _Util.translatetext(68)}/>
              </span>
            </div>

            <div className={`fieldPadding _MrgV _actBtnMg`}>
              <span>
              <NavLink  to={{pathname:"/edit_operation",search:"?movId="+ _id}} className=" u3mD2d xwW5Ce" onClick={_openDtls}>
                  <BTNH theme={`light_blue`} title={ _Util.translatetext(71)}/>
              </NavLink>
              </span>
            </div>
          </div>
        </div>
        </>
        :null}
      </div>
    </div>
    
      </>
  )

}




export default ItemComponent;
