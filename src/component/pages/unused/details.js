

import React, { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'

import '../_styles.css'

import {Icon2} from '../Icons'
import { UpdateDetails, OpenWatchDialog} from '../../actions/common';

import CheckBoxSlide from '../CheckBoxSlide'
import { withRouter, NavLink} from 'react-router-dom';

import * as _Util from '../../store/Util'

import MenuSlideUp from '../menuSlideUp'
import PaymentSlideUp from '../paymentSlideUp'



const useObserveChanges = () => {
  const observeChanges =  useSelector(state => state.observeChanges);
  const dispatch = useDispatch(); 

  const _openMd = (_id, item) => {
    let data = {};
    data['zIndex']=450;
    data['Id']=_id;
    data['observeResize']=true;    
    data['props']={item:item};
    data['content']=<MenuSlideUp />;
    OpenWatchDialog(dispatch,data);
  }

  const _openPayment = (_id, item) => {
    let data = {};
    data['zIndex']=450;
    data['Id']=_id;
    data['observeResize']=true;    
    data['props']={item: item, minHeight: '2vh'};
    data['content']=<PaymentSlideUp />;
    OpenWatchDialog(dispatch,data);
  }
  

  return { 
    _openMd,
    _openPayment
  }
}








const Details = (props) => {
  

  const {
    _openMd
  } = useObserveChanges();

  const [initialize, setInitialize] = useState(false); 
  let _state = _Util.getStore();
  let keys = _Util.getGlobalsKeys()

  let searchHash = window.location.hash.split('?')[1]?window.location.hash.split('?')[1]:null;
 
  const router = _Util.parseQuery(searchHash);
  let _id = router.id?router.id:null;
  // const typeBrowse = window.location.hash.split('/')[1].split('?')[0];


  let usersFBList = _state["usersFBList"];
  const id  = _id || _state["ActiveUser"];
  let _item = usersFBList && usersFBList[id]

  const updActive = (e) => {
    // let id = _state['ActiveUser'];
    //let h = dt && dt['isActive'];
    //h["active"] = e;
    UpdateDetails(id, {running:e})
  }


  const openSetting = (e) => {    
    _openMd(id, {running:e})
  }


  
  let isAdmin =  _Util.IsAdmin();
  let servicesAreas = _item && _item["filters"];

  return (
      <>
        <div className={`browseList`}>
          <div className={`filters`}>
            <div className={` _dsplFlx `}>
              <div className={`flxbsc20`}>
                {isAdmin?
                <NavLink  to={{pathname:"/browse"}} className="">
                  <p className={`_Id_card `}>
                    <Icon2 name={'arrowBack'}/>
                  </p>
                </NavLink>
                :null}
              </div>
              <div className={`flxbsc70`}/>
              <div className={`flxbsc10`}>
                <p className={`_Id_card `} onClick={()=>openSetting()}>
                    <Icon2 name={'filter'}/>
                </p>
              </div>
            </div>
            <div className="" >
              <p className={`_Id_card `}>
                {id}
              </p>
              <div className={`_email_detail`}>
                {_item && _item.email}
              </div>
            </div>
            <div className={`pym81b boxCard`}>
              <div className={` _dsplFlx spaceAround `}>         
                <div className={`flxbsc60`}>
                  <h4>Token</h4>
                </div>
                <div className={`flxbsc20 alignSelf`}>
                  <div className={`tokenLed ${_item && _item['isValidToken']?"isValid":""}`}/>
                </div>
              </div>
              <div className={`_dsplFlx spaceAround `}>         
                <div className={`flxbsc60`}>
                  <h4>Active</h4>
                </div>
                <div className={`flxbsc20 alignSelf`}>
                  <CheckBoxSlide icon={`more_vert`} field={"inStock"} updChange={(e)=>updActive(e)} initvalue={_item && _item['running']} keyCode={keys[85]}/>
                </div>
              </div>
          </div>
          <p className={`S_A`}>
              {'Services Areas'}
          </p>
          {servicesAreas && _Util.ObjectKeys(servicesAreas).map(sAId=>{
            let _sA = servicesAreas[sAId];
            return(
              <ServicesArea key={_Util.gen12CodeId()} _item={_sA} _Id={sAId} userId={id} />
            )
          })}

        </div> 
      </div>       
    </>
  );
}  


export default withRouter(Details)





const ServicesArea = (props) => {
  const {
    _openPayment
  } = useObserveChanges();

  const {_item, _Id, userId} = props
  const [initialize, setInitialize] = useState(false); 
  let _state = _Util.getStore();
  let keys = _Util.getGlobalsKeys()

  let usersFBList = _state["usersFBList"];


  let servicesAreas = usersFBList && usersFBList[userId] && usersFBList && usersFBList[userId]["filters"]

  const updActive = (e) => {
    let sch = servicesAreas;
    sch[_Id]['active'] = e;
    UpdateDetails(userId, {filters:sch})
  }
  
  const openAddress = (e) => {
    let address = _item && _item['address'];
    let city = _item && _item['city'];
    let a2o = encodeURIComponent(`${address} ${city}`);
    window.open(`https://www.google.com/maps/search/${a2o}`)
  }

  const openPayment = (e) => {
    _Util.updStore('paymentKey',e)
    _Util.updStore('paymentKeyID',_Id)
    _openPayment(null, e)
  }


  
 
  return (
    <div className={`_dsplFlx spaceAround `}>
      <div className={`pym81b boxCard`}>
        <div className={`_dsplFlx spaceAround `}>   
          <div className={`flxbsc80 `}>   
            <div className={``} onClick={()=>openAddress()}>
              <h5>{_item && _item['name']}</h5>
            </div>
            <div className={`flxbsc60 _dsplFlx`}>
              <h4>Active</h4>
              <div className={`flxbsc20 alignSelf`} style={{marginLeft:'5px'}}>
                <CheckBoxSlide icon={`more_vert`} field={"inStock"} updChange={(e)=>updActive(e)} initvalue={_item && _item['active']} keyCode={keys[85]}/>
              </div>
            </div>
          </div> 
          <div className={` flxbsc10 `}>
            <div className={`mrgBtm32 `}  onClick={()=>openPayment('minimunPay')}>
              <h4>${_item && _item['minimunPay']}</h4>            
            </div>
            <div className={` `}  onClick={()=>openPayment('minimunPayByHour')}>
              <h4>${_item && _item['minimunPayByHour']}</h4> 
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}  
