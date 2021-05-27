

import React, { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import loadable from '@loadable/component'



import { withRouter, NavLink} from 'react-router-dom';


import * as _Util from '../../../store/Util'

import '../../_styles.css'




const UpdInventory = loadable(() => import('../ProductsInventory/updInventory'))





const BTNH = _Util.BTNH_Cmpt();


const SearchInput =  _Util.SearchInput_Cmpt();


const ScrollDc =  _Util.ScrollDc_Cmpt();

const CheckBoxSlide =  _Util.CheckBoxSlide_Cmpt();

const PaymentSlideUp = _Util.PaymentSlideUp_Cmpt(); 


const Icon2 = _Util.Icon_Cmpt();




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
   _Util.getCommon().OpenWatchDialog(dispatch,data);
  }

  
  
  return { 
    observeChanges,
    dispatch,
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

  // const [searchQ, setSearch] = useState("");

  const [view, setView] = useState(false);

  let _userId = _Util.getProfileId();
  let fld2Prs = ['id','name',"categoryID","unit","description","imageUrl","salePrice"];    

  let outerWidth = _state["outerWidth"];


  const [list, setList] = useState(null);

  const [range, setRange] = useState(24);




  const loadStockProduct = async () => {


    let fields2 = [
      "id","name","salePrice","isPublic","unit","imageUrl","ignoreStock","categoryID",{N:"stock",f:["amount", "stock", "stockIn", "stockOut"]}
    ];


    let fields = [
      "id","name","isPublic","unit","imageUrl","categoryID","hasCostTab" ,{N:"stock",f:["amount", "stock", "stockIn", "stockOut"]}
    ];
  
    let Qry2Inv = {
      query:"getStockProductQvaMarket",
      params:{
        showInventory:true,
        providerId:_userId,
      }, 
      arraySerialization: _Util.isArraySerialization(),
      fields:fields
    };


    if(_Util.IsAdmin()){            
      Qry2Inv = {
        query:"getStockProductQvaMarket",       
        params:{
          showInventory:true
        },
        arraySerialization: _Util.isArraySerialization(),
        fields:fields
      };
    }

    const res = _Util.fetchStream_movie_data(_Util.get_GRAPHQLURL(),Qry2Inv)
    const td = await res;
    if(td){
      let dZs =  _Util.isArraySerialization()?_Util.deZerialize2Array(td,fields,1):td;

      _Util.updStore('stockProduct',dZs);
      
      /*
      _Util.ObjectKeys(td).map(scit=>{
        if(td[scit] && td[scit].imageUrl){
          //getThumbnailImg(td[scit].imageUrl,dispatch)
        }
      })
      */
      searchInventory();
      dispatch({
        type: 'UPD_KEY_VALUE',
        kv:{key:'observeChanges',value:_Util.gen12CodeId()}
      })
    }
  }




  useEffect(() => {  
    if(widthScreen!==outerWidth){
      setWidthScreen(outerWidth);
    }
    

    if(!initialize){
      setInitialize(true);    
      loadStockProduct();
      setTimeout(()=>{
        setView(true); 
        //window.scrollTo(0,0);
      },50);
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






const inv2upd = _state["inv2upd"] || {}; 

const updInventory = async (i) => {
  let _idOrder = _Util.gen12CodeId();    
  let _2s = {};     
  if(!_2s["description"]){
    _2s["description"] = "";
  }
  _2s["orderId"] = _idOrder;    
  _2s["type"] = "INVESTMENT_FOOD";
  if(!_2s["delivery"]){
    _2s["delivery"] = true;
  }
  if(!_2s["amount"]){
    _2s["amount"] = calcAmount(inv2upd) / 25;
  }
  if(!_2s["tasa"]){
    _2s["tasa"] = 25;
  }
  if(!_2s["products"]){
    _2s["products"] = inv2upd;
  }
  if(!_2s["agentId"]){
    _2s["agentId"] = _userId;
  }
  if(!_2s["date"]){
    _2s["date"] = (new Date()).getTime();
  }

  let QryShp = {
    query:"AddProductstoInventoryfromQvamarket",
    form:_2s,
    params:{
      userId:_userId
    }
  };
  const ttt = _Util.fetchStream_movie_data(_Util.get_GRAPHQLURL(),QryShp);
  const spR = 1 && await ttt;
  if(spR){

    for(let idI in inv2upd){
      let fnM = "inv2upd_"+idI ;
      _Util.updFormStore(fnM,{});
    }
    _Util.updStore('inv2upd',{}); 
    loadStockProduct();
  }
}

const invTt = calcInv(_state["stockProduct"]);

const handleAdd = () => {
  _Util.updFormStore(_formName,{});
}


var _categoriesList = _state["categoriesProducts"];

let _movements2Show = _Util.groupbyTab(list,range,12);


const searchInventory = (searchQ) => {
  if(searchQ && searchQ.length>1){
    let dt = _Util.parseInventory(_state["stockProduct"],_categoriesList,searchQ);
    setList(dt);
  }else{
    let dt = _Util.parseInventory(_state["stockProduct"],_categoriesList,null);
    setList(dt);
  }
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
        <div className={` palette formContainer menu_list ${isMobile?"is_mobile":""}`} style={{opacity:view?1:0}} >
                <div className={`formContainer `} style={{opacity:1}}>
                    {view?
                      <div className={`centerListCardProd  ${isMobile?"mrg_15_tp":""} `}> 
                        <NavLink  to={{pathname:"/ingredients_list"}}>
                          <BtnIconTab  
                              lbl={"Ingredientes"}
                              icon={"food_variant"}
                              classN={"activeOrange"}
                              index={1}
                              indexTag={1}
                              isMobile={isMobile}
                            />
                        </NavLink>
                      <div  className={` _dsplFlx `}>
                        {inv2upd && _Util.ObjectKeys(inv2upd).length>0?
                        <div className={`fieldPadding _MrgV _svInvt`}>
                          <span onClick={()=>updInventory()}>
                            <BTNH theme={`light_blue`} title={_Util.translatetext(74)}/>
                          </span>
                        </div>
                        :null}
                        <div className={`flexSpace`}/>
                        <div className={`in_stock_switch _dsplFlx`}>
                        <div className={`fieldPadding _MrgV`}>
                        <NavLink  to={{pathname:"/edit_products"}} className=" u3mD2d xwW5Ce"   onClick={()=>handleAdd()} >
                          <BTNH theme={`light_blue`} title={`${_Util.translatetext(12)} ${_Util.translatetext(108)}`}/> 
                        </NavLink>
                        </div>
                        </div>
                      </div>

                      <div className={` _search_MrgV  `} >
                        <SearchInput updChanges={searchInventory} placeholderCode={20}/>
                      </div>


                      {/*
                      <div className={` sendBx scroll3Wrp `} >
                          <div className={`_dsplFlx spaceAround _flxWrp op4oU`}>
                          {
                            prod2Show && _Util.ObjectKeys(prod2Show).map(fV=>{
                              return (
                                <ItemProdComponent  key={"stock_"+fV} stckId={fV} dispatch={dispatch}/>  
                              )
                            })
                          }
                          </div>
                        </div>
                        */}
                        <div className={` sendBx scroll3Wrp `} >
                          <div className={`_dsplFlx spaceAround _flxWrp `}>
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



function calcInv(o){
  let tt = 0;
  o && _Util.ObjectKeys(o).map(k=>{
    let stckDt = o[k] && o[k]["stock"];
    let stock =   stckDt && stckDt["stock"]?stckDt["stock"]:0;
    let prc =   stckDt && (stckDt["amount"] / stckDt["stockIn"])?(stckDt["amount"] / stckDt["stockIn"]):0;
    tt += stock * prc;
  })
  return tt;
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
            <ItemProdComponent mvId={_grTGid}  key={_grTGid_ind+"k_mInV"}/>
          )
        })}
      </div> 
      : 
      <ScrollDc scrollhandler={_scrollhandler} /> 
    }  
    </div>                                   
  )

}











const ItemProdComponent = (props) => {

  const {
    mvId
  } = props;

  
  let stckId = mvId

  let _state = _Util.getStore();

  const productsList = _state["stockProduct"] || {}; 

  let item = productsList && productsList[stckId]

  let stck = item && item["stock"];

  const handleDetails = async () => {
    //_Util.updFormStore(_formName,item);
    let Qry2Inv = {
      query:"getQueryProductsID",
      params:{
        id: item.id
      }
    };
    const res = _Util.fetchStream_movie_data(_Util.get_GRAPHQLURL(),Qry2Inv);
    const td = await res;
    if(td && td[item.id] && td[item.id].id){
      _Util.updFormStore(_formName,td[item.id]);
      _Util.getCommon().getDispatch()({
        type: 'UPD_KEY_VALUE',
        kv:{key:'observeChanges',value:_Util.gen12CodeId()}
      })
    }
  }

  
  const Confirm = () => {

  }


  const updInv = () => {
  
    let data = {};
    data['zIndex']=450;
    data['observeResize']=true;    
    data['props']={item:item, minHeight: '240px'};
    data['content']=<UpdInventory confirm={Confirm} />;
    _Util.getCommon().OpenModal(_Util.getCommon().getDispatch(),data);
  }
  


  
/*
  let imgI = item && item["imageUrl"];
  var _thumbnailJson = imgI && _state['thumbnailJsonBlob'] && _state['thumbnailJsonBlob'][imgI];
  let _blobrequested =  _thumbnailJson && _thumbnailJson['requested'];
  let _blob = _blobrequested? _thumbnailJson['blob'] : null;
*/

  let sz = "170";



  let isPublic = item && item["isPublic"];
  

 
  var _stock = stck && stck["stock"]?stck["stock"]:0;


  let _InStock = _stock && _stock>=1;

  let _id =item && item["id"];

  let pId = "pId_mk_inv" +_id

  const [hid, setHidd] = useState(null);
  const [initialize, setInitialize] = useState(false);
  const [obs, setObs] = useState(null);
  
  
  let imgI = item && item["imageUrl"] && item["imageUrl"]+"?sz="+sz;
  let _imgI = imgI && _Util.imageRxUrl()+ imgI;
  let _blob = _Util.getImageStore()[_imgI];
  

  let userA = _Util.getBrowser();
  
  let isMobile = userA.os === "Android" || userA.os === "iPhone" || _state["outerWidth"]<550 ;
  
  
  



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
      _Util.updViewActive(0);
      
    }
  })



  const updPublicProduct = async () => {
    let QryR = {
      params:{
        id: _id,
        providerId: item && item["providerId"],
        isPublic: !isPublic
      },
      query:"updateIsPublicProduct"
    };
    const res = _Util.fetchStream_movie_data(_Util.get_GRAPHQLURL(),QryR);
    const td = await res;
    if(td){
      const ddd = _state["stockProduct"] || {}; 
      ddd[_id]["isPublic"] = !isPublic;
      _Util.updStore('stockProduct',ddd);
      _Util.getCommon().getDispatch()({
        type: 'UPD_KEY_VALUE',
        kv:{key:'observeChanges',value:_Util.gen12CodeId()}
      })
    }
  }

  
  let _hasCostTab = item && item["hasCostTab"];




  return (


    <div jsname="JNwhwd" className="xwW5Ce u3mD2d " >
      <div className="m18Ex  u3mD2d xwW5Ce">
          <div  className=" u3mD2d xwW5Ce brd_stck">
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
                    <span className="PTXMyf">{_stock && (typeof _stock === "number")?_stock.toFixed(2):0}</span>
                    <span className="unitlbl mrkPl">{item && `(${item["unit"]})`}</span>
                    <div className={`flexSpace`}/>
                  </div>
                </div>
                
                <NavLink  to={{pathname:"/edit_products",search:"?prodId="+ _id}} className=" u3mD2d xwW5Ce" onClick={handleDetails}>
                  <div className="MPhl6c pqv9ne azTb0d YAEPj SGmlof" title={item && `${item["name"]}` }>{item && `${item["name"]}` }</div>
                </NavLink>
                
                  
                  <div className={`in_stock_switch _dsplFlx`}>
                    {_Util.translatetext(76)}
                    <div  className={`in_stock_switch_btn`}>
                      <CheckBoxSlide initvalue={isPublic} keyCode={73} updChange={()=>updPublicProduct()}/>
                    </div>
                  </div>
                </div>
            </article>
            <div className="egZxgf pqv9ne">
              <div className={`_dsplFlx spaceAround _flxWrp `}>
                {_hasCostTab?
                <div className={`fieldPadding _MrgV`}>
                  <NavLink  to={{pathname:"/cost_tab_menu", search:"?prodId="+ _id}}>
                    <BTNH theme={`light_blue`} title={_Util.translatetext(109)}/>
                  </NavLink>
                </div>
                :
                <div className={`fieldPadding _MrgV`}>
                  <span onClick={()=>updInv()}>
                    <BTNH theme={`light_blue`} title={`${_Util.translatetext(67)} ${_Util.translatetext(5)}`}/>
                  </span>
                </div>
                }
                <div className={`fieldPadding _MrgV`} style={{marginTop:isMobile?"":"10px"}}>
                  <NavLink  to={{pathname:"/inventory_products", search:"?prodId="+ _id}}>
                    <BTNH theme={`light_green`} title={_Util.translatetext(77)}/>
                  </NavLink>
                </div>
              </div>
            </div>
          </div>   
        </div>
      </div>

)

}









const calcAmount = (inv2upd) =>{
  let am = 0;
  inv2upd && _Util.ObjectKeys(inv2upd).map(dd=>{
    am += inv2upd[dd]["qty"] * inv2upd[dd]["price"];
  })
  return am;
}





/*





const ListItemComponent = (props) => {

  const {
    history, item, dispatch, _openMd, categoriesList
  } = props;



  var _ammountTasa = item && item["amount"] * item["tasa"];


  let _state = _Util.getStore();

  const handleDetails = (id) => {
    _Util.updFormStore(_formName,item);
    if(typeof props.editProd === "function"){
      props.editProd();
    }
    //history.push({pathname:"/products"});
  }


  let hasPrice = item && item["salePrice"]?true:false;

  
let userA = _Util.getBrowser();
  
let isMobile = userA.os === "Android" || userA.os === "iPhone" || _state["outerWidth"]<550 ;


  return (
    <div>
      {!isMobile?
        <div className={`pym81b sendBx cardProd`} >
          <div className={`imgProd `}>
            {item && item["imageUrl"]?  
            <img src={item["imageUrl"]} alt="" />
            :null}
          </div>
          <div  className={`productName  `} onClick={()=>handleDetails()}> 
            {item && `${item["name"]}` }
          </div>
          <div  className={`_dsplFlx  `}>
            <div  className={`flexSpace `}  >
              {``}
            </div>
            <div  className={`prod_price ${hasPrice?"":"out_stock"}`} >
              {hasPrice?`$${item["salePrice"]}`:"No disponible"}
              {hasPrice?<span> {item && `${item["unit"]}` }</span>:null}
            </div>
          </div>
          <div className={``} >
         
            </div>
            </div>:
            <div className={`pym81b nPd sendBx cardProd _dsplFlx ${isMobile?"is_mobile":""}`} >
              <div className={`imgProd `}>
                {item && item["imageUrl"]?  
                <img src={item["imageUrl"]} alt="" />
                :null}
              </div>
    
              <div  className={` details`}>
                <div  className={`productName  `} onClick={()=>handleDetails()}> 
                  {item && `${item["name"]}` }
                </div>
                <div  className={`flexSpace `}  >
                  {``}
                </div>
                <div  className={`prod_price ${hasPrice?"":"out_stock"}`} >
                  {hasPrice?`$${item["salePrice"]}`:"No disponible"}
                  {hasPrice?<span> {item && `${item["unit"]}` }</span>:null}
                </div>
              </div>
            </div>
            }
        </div>
      )
    
    }
    

*/


const BtnIconTab = (props) => {
 
  const {
    lbl,
    icon,
    classN,
    index,
    indexTag,
    isMobile
  } = props;



  return (
    <div className={`pym81b sendBx mov_type _dsplFlx ${classN} mxWdth ${index===indexTag?"fillBack":""}`}>
      {isMobile? <div className={`flexSpace`}/>:null}
      <div className={`icon_mov`}>
        <Icon2 name={icon} />
      </div>
      <div className={`mov_type_title `}>
        {isMobile?"":_Util.translatetext(lbl)}
      </div>
      <div className={`flexSpace`}/>                            
    </div>
  )

}

