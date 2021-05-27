

import React, { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'


import { withRouter, NavLink} from 'react-router-dom';

import {  OpenWatchDialog, fetchCities, fetchRemesa, loadStockProduct, } from '../../actions/common'



import * as _Util from '../../store/Util'

import '../_styles.css'


import '../SearchInput'





/*
import '../MsgAlert'

const InputText = loadable(() => import('../InputText'))

const InputAutocomplete = loadable(() => import('../InputAutocomplete'))

const MoreInfoButton = loadable(() => import('../MoreInfoButton'))

const TabsHRM = loadable(() => import('../tabsHRM'))
*/


const StarRating = _Util.StarRating_Cmpt(); 

const PaymentSlideUp = _Util.PaymentSlideUp_Cmpt();

const ScrollDc = _Util.ScrollDc_Cmpt();


const MsgAlert = _Util.MsgAlert_Cmpt();
const SearchInput = _Util.SearchInput_Cmpt();









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

  







const _formName = 'add_products';






const SendersComponent = (props) => {
  const {
    dispatch
  } = useObserveChanges();

  const {
    _updFormObs
  } = useObserveForms();
  


  let _state = _Util.getStore();
  let keys = _Util.getGlobalsKeys()
  _state["keys"] = keys;




  const [initialize, setInitialize] = useState(false);

  const [widthScreen, setWidthScreen] = useState(null);

  
  const [view, setView] = useState(false);

  
  const [viewInStock, setViewInStock] = useState(true);

  const [range, setRange] = useState(12);



  let outerWidth = _state["outerWidth"];


let st = (new Date()).getTime()

  useEffect(() => {  
    if(widthScreen!==outerWidth){
      setWidthScreen(outerWidth);
    } 
    if(!initialize){
      setInitialize(true);
      _Util.updViewActive(1);

    

      /*
      let Qry2 = {
        auth:{
          authCode:"850217"
        },
        query:"getQueryProductsAll",
      };
      fetchProductsAll(Qry2,dispatch);



       let QryStockProduct = {
        query:"getStockProduct",
        auth:{
          authCode:"850217"
        },
      };
      fetchRemesa(QryStockProduct,dispatch);
d
      */
      let fields = [
        "id","name","salePrice","isPublic","unit","imageUrl","ignoreStock","categoryID",{N:"stock",f:["amount", "stock", "stockIn", "stockOut"]}
      ];
  
      let Qry2Inv = {
        query:"getStockProductQvaMarket",
        params:{
          isPublic:true
        },
        arraySerialization: _Util.isArraySerialization(),
        fields:fields
      };
      loadStockProduct(Qry2Inv,dispatch);

      setTimeout(()=>{
        window.scrollTo(0,0);
        handleInput();
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
  


  let keyCodes =   _Util.getGlobalsKeys();





  let userA = _Util.getBrowser();
    
  let isMobile = userA.os === "Android" || userA.os === "iPhone" || _state["outerWidth"]<550 ;


  const [searchQ, setSearchQ] = useState(null);



  var _categoriesList = _state["categoriesProducts"];

  let _movements2Show = {};


  if(searchQ && searchQ.length>1){
    let dt = _Util.parseInventory(_state["stockProduct"],_categoriesList,searchQ);
    _movements2Show = _Util.groupbyTab(dt,range,12);
  }else{
    let dt = _Util.parseInventory(_state["stockProduct"],_categoriesList,null);
    _movements2Show = _Util.groupbyTab(dt,range,12);
  }



  const handleInput = (v) => {
    if(v && v.length>1){
      setSearchQ(v);
    }else{
      setSearchQ(null);
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
        <div className={` palette formContainer market_qva ${isMobile?"is_mobile":""}`} style={{opacity:view?1:0}} >
                <div className={`formContainer `} style={{opacity:1}}>
                    {view?
                      <div className={`centerListCardProd  `}> 
                      <div  className={`  headerTtl `}>
                        <div className={`mainTitle`}>
                            {_Util.translatetext(1)}
                          </div>
                          <div className={`descTitle`}>
                          {_Util.translatetext(23)}
                        </div>
                      </div>
                      <div  className={` _dsplFlx `}>
                        <div className={``}>
                          
                        </div>
                        <div className={`flexSpace`}/>
                      </div>
                      <div className={` _search_MrgV  `} >
                        <SearchInput updChanges={handleInput} placeholderCode={91}/>
                      </div>
                      

                        <div className={` sendBx scroll3Wrp `} >
                          <div className={`_dsplFlx spaceAround _flxWrp`}>
                            {
                            _movements2Show && _movements2Show.map((fV,i)=>{
                              //let stck = _movements2Show[fV];
                              return(
                                <RecyclerView data={fV} ind={i} range={range} key={`${keyCodes[i]}_${i}_cmpl_Mov`} updRange={(v)=>setRange(v)}/>
                              )
                            })}
                          </div>
                        </div>


                      </div>:null}
                  </div>
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
    <div id={ind+"_gpr_"+ind} style={{minHeight:"100px",width:"100%"}}>
    {initialize?
      <div className={` op4oU`}>
        {data.map((_grTGid,_grTGid_ind)=>{
          return (
            <ItemProdComponent mvId={_grTGid} key={_grTGid_ind+"v_mk"}/>
          )
        })}
      </div> 
      : 
      <ScrollDc   scrollhandler={_scrollhandler} /> 
    }  
    </div>                                   
  )

}








const ItemProdComponent = (props) => {

  const {
    mvId
  } = props;
  let _state = _Util.getStore();

  let stckId = mvId;



  const stockProduct = _state["stockProduct"] || {}; 
  const [initialize, setInitialize] = useState(false);
  const [hid, setHidd] = useState(null);
  const [obs, setObs] = useState(null);
  
  let item = stockProduct[stckId];

  let stck = item && item["stock"]

    
  let hasPrice = item && item["salePrice"]?true:false;

  var _stock = stck && stck["stock"];

  let ignoreStock = item && item["ignoreStock"];
  let _InStock = ignoreStock ? true :_stock && _stock>1;

  let _id =item && item["id"];


  let sz = "170";


  let imgI = item && item["imageUrl"] && item["imageUrl"]+"?sz="+sz;
  let _imgI = imgI && _Util.imageRxUrl()+ imgI;
  let _blob = _Util.getImageStore()[_imgI];
  

  let pId = "pId_mk_" +_id




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
    if(!initialize){
      setInitialize(true);
      
    }
  })



  let userA = _Util.getBrowser();
    
  let isMobile = userA.os === "Android" || userA.os === "iPhone" || _state["outerWidth"]<550 ;




  return (


      <div jsname="JNwhwd" className="xwW5Ce u3mD2d" >
        <div className="m18Ex  u3mD2d xwW5Ce">
            <NavLink  to={{pathname:"/product_details",search:"?prodId="+ _id}} className=" u3mD2d xwW5Ce">
              <article className="u3mD2d xwW5Ce u3mRow">
                <div className="exewIc pqv9ne">                 
                  <div className="EbzW3 xwW5Ce qSGFRd YzcgQb UKsopf u3mD2d">
                    <div className="ap5GNb YxFYtf yhS73e" style={{paddingTop: "100%"}}>
                      {_blob===2?<img src={_imgI} className="Ws3Esf" alt="" />:null}
                    </div>
                  </div>
                </div>
                <div className="egZxgf pqv9ne">
                  <div className="egZxgf pqv9ne">
                    <div className="DX0ugf ApBhXe _dsplFlx">
                      <span className="PTXMyf">{hasPrice?`${item["salePrice"]} US$`:""}</span>
                      <span className="unitlbl mrkPl">{item && `(${item["unit"]})`}</span>
                      <div className={`flexSpace`}/>
                    </div>
                  </div>
                  <div className="MPhl6c pqv9ne azTb0d YAEPj SGmlof" title={item && `${item["name"]}` }>{item && `${item["name"]}` }</div>
                  <span className="iu5UVe DX0ugf ApBhXe m5Ca5b">
                    <StarRating rate={4.65}/>
                    <div className="L9k4yd">1</div>
                  </span>
                  {!isMobile?!_InStock ?<MsgAlert text={_Util.translatetext(29)} theme={'red'}/>:<MsgAlert text={_Util.translatetext(21)} theme={'green'}/>:null}
                </div>
              </article>
              {isMobile?!_InStock ?<MsgAlert text={_Util.translatetext(29)} theme={'red'}/>:<MsgAlert text={_Util.translatetext(21)} theme={'green'}/>:null}
            </NavLink>   
          </div>
        </div>

    )

}




