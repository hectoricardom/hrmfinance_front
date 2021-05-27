

import React, { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import loadable from '@loadable/component'



import { withRouter} from 'react-router-dom';

import {  OpenWatchDialog, fetchCities, fetchRemesa, fetchSenders } from '../../actions/common'



import * as _Util from '../../store/Util'

import '../_styles.css'

const Icon2 = loadable(() => import('../Icons'))

const MoreInfoButton = loadable(() => import('../MoreInfoButton'))

const ImageButton = loadable(() => import('../ImageButton'))

const ChoiceButton = loadable(() => import('../ChoiceButton'))

const PaymentSlideUp = loadable(() => import('../paymentSlideUp'))

const InputText = loadable(() => import('../InputText'))

const InputAutocomplete = loadable(() => import('../InputAutocomplete'))


const _formName = 'list_customer_search';

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

  
  
  return { 
    observeChanges,
    _LoadCities,
    dispatch,
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

  














const SendersComponent = (props) => {
  const {
    _openMd,
    dispatch,
    _updRemesa
  } = useObserveChanges();

  const {
    _updFormObs
  } = useObserveForms();
  


  let _state = _Util.getStore();
  let keys = _Util.getGlobalsKeys()
  _state["keys"] = keys;

  const _form = _Util.getFormStore(_formName) || {};




  const [initialize, setInitialize] = useState(false);

  const [widthScreen, setWidthScreen] = useState(null);

  const [choosePayView, setChoosePayView] = useState(0);
  const [validForm, setIsValidForm] = useState(false);
  const [nextValidForm, setNextValidForm] = useState(false);
  const [formView, setformView] = useState(1);
  const [view, setView] = useState(false);

  
  const [searchTxt, setSearchTxt] = useState("");


  let outerWidth = _state["outerWidth"];




  useEffect(() => {  
    if(widthScreen!==outerWidth){
      setWidthScreen(outerWidth);
    } 
    if(!initialize){
      setInitialize(true);

      let Qry2 = {
        auth:{
          authCode:"850217"
        },
        query:"getQuerySenderDetails",
        Collection:"Senders"
      };
      fetchSenders(Qry2,dispatch);
      

      setTimeout(()=>window.scrollTo(0,0),350);
      setTimeout(()=>setView(true),50);
      window.localStorage.setItem("lng","es");
      _Util.updFormStore(_formName,{})
      _updFormObs();
    }
  });
  
  const handleSearch = (v,f) => {
    setSearchTxt(v);
  }



  var _sendersList = _state["sendersList"];


  
    return (
      <>
        <style>
        {`
        .palette{
            --base-color: rgb(0, 137, 123,1);
            --base-color-gradient: 0, 137, 123;
        }

        `}
        </style>
        <div className={`mainViewHero palette formContainer   ${choosePayView === 1?'_payView':''} `} style={{opacity:view?1:0}} >
          <div className={`loloHero`}> 
            <div className={`formHero _dsplFlx spaceAround`}> 
              <div className={`hdWrp`} style={{marginTop:"35px"}}> 
                <div className={`titleHero`}>
                  {``}
                </div>
                <div className={`descHero`}>
                {``}
                </div>
                <div className={`form`}> 
                <div className={`formContainer`} style={{opacity:1}}>
                <div className={`formContainer`} style={{opacity:choosePayView === 0?1:0}}>
                  <div className={`paddField`}>
                        <InputText 
                          icon={`more_vert`} 
                          form={_formName} 
                          field={`search`}  
                          keyCode={69} 
                          background={`#f5f5f5`}
                          color={`#5e35b1`}
                          placeholder={`Tasa`} 
                          OnChange={(e)=>handleSearch(e)}
                        />
                      </div>
                  <div className={`formContainer`} style={{opacity:formView === 1?1:0}}>
                  {formView===1?
                  <div className={` sendBx scrollWrp `} >
                    <div className={`_dsplFlx spaceAround _flxWrp`}>
                    {
                      _sendersList && _Util.ObjectKeys(_sendersList).map(fV=>{
                        let slc = _sendersList[fV];
                        if(!searchTxt.length){
                          return (
                            <>
                              <ListItemComponent title={fV} item={slc} />
                            </>
                          )
                        }
                        else {
                          if(slc["name"].toLowerCase().indexOf(searchTxt.toLowerCase())>=0){
                            return (
                              <>
                                <ListItemComponent title={fV} item={slc} />
                              </>
                            )
                          }else{
                            return null;
                          }
                        }
                      })
                    }
                    </div>
                  </div>
                  :null}
                  </div>
                  <div style={{marginBottom:'65px'}}></div>                  
                  </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  
}  





export default withRouter(SendersComponent)



function parseAutoI(o){
  let res = {}
  _Util.ObjectKeys(o).map(k=>{
    res[k] = {name:k, id:k}
  })
  return res;
} 





const ListItemComponent = (props) => {

  const {
    title, item
  } = props;


  const handleEditSender = () => {
    let _2s = {};
    let _state = _Util.getStore();

    let fld2Sender = ['id','name',"phoneNumber","email","dispatherId"];
 
    fld2Sender && fld2Sender.map(fld=>{
      _2s[fld] = item[fld];
    })
    _Util.updFormStore('add_sender',_2s);
    _state.route_history.push({pathname:"/senders"});
  }
  
  let hasReceivers = item && item["receivers"] && _Util.ObjectKeys(item["receivers"]).length >0;

  console.log(item)
  return (
    <div>
        <div className={`pym81b sendBx cardCustomer`} >
        
          <div  className={' _dsplFlx spaceAround2 client'} >
            <div className={' _name'}>{item && item["name"]}</div>
            <div  className={`iconDelete`}  onClick={handleEditSender}  >
              <Icon2 name={`outline_edit`} size={22}/>
            </div>
          </div>
          <div  className={`phoneNumber `} >
            {item && item["phoneNumber"]}
          </div>
          { hasReceivers ?
          <div className={` receiversWrp`} >
            {
              hasReceivers && _Util.ObjectKeys(item["receivers"]).map(fV=>{
                let slc = item["receivers"][fV];
                return (
                  <div  className={' _dsplFlx spaceAround2 receiversItm'} >
                    <div className={' _name'}>{slc && slc["name"]}</div>
                    <div  className={`iconDelete`}  onClick={()=>{}}  >
                      <Icon2 name={`outline_edit`} size={22}/>
                    </div>
                  </div>
                )
              })
            }
          </div>
          :null}
        </div>
    </div>
  )

}
