import * as Util from './Util';

const monthsList_Short =[`Jan`,`Feb`,`Mar`,`Apr`,`May`,`Jun`,`Jul`,`Aug`,`Sep`,`Oct`,`Nov`,`Dec`];

const jsPDF = window.jsPDF;








export function PrintPendingOrders( obj){

  var nR = 0;    
  const Pformat = localStorage.getItem('pgSz') || 'a4';


  var doc = new jsPDF({
    orientation: 'portrait',
    format:Pformat      
  }) 


  obj && Util.ObjectKeys(obj).map((m,pg)=>{
    if(pg>0){
      doc.addPage();
    }
    let yguide = 3;
    doc.setFontSize(14);
   
    
    
    let headerheight  = yguide+12;
    
    
   
    /*
    doc.setFontType("normal");
    doc.text(10,headerheight+8, 'Total : ');
    doc.text(39,headerheight+8,  `` );
  */

    
    let _state = Util.getStore();

 
    var headerheight2  = headerheight+2;
    let _Str = "" 
    let tt = 0;
    obj[m] && Util.ObjectKeys(obj[m]).map((pro,i)=>{
      let _proDitm = obj[m][pro];
      let _nM =  _proDitm && _proDitm.name;
      _Str =  _proDitm && _proDitm.store  && _proDitm.store.name ;
      let _qty =  _proDitm && (_proDitm.qty*-1);
      let _cost_price =  _proDitm && _proDitm.cost_price?_proDitm.cost_price-50:0;
      tt += _cost_price * _qty;
      let imgI = _proDitm && _proDitm["imageUrl"];
      var _thumbnailJson = imgI && _state['thumbnailJsonBlob'] && _state['thumbnailJsonBlob'][imgI];
      let _blobrequested =  _thumbnailJson && _thumbnailJson['requested'];      
      let imgData = _blobrequested && `data:${_thumbnailJson.type};base64,${_thumbnailJson.b64}`;

      nR = (i+1)*26+headerheight2+1;
      //doc.line(10, nR+2, 200, nR+2);
      doc.setFontType("normal");
      doc.setFontSize(15);      
      
      doc.text(53, nR, `${_nM}`);
      doc.setFontType("bold");
      doc.setFontSize(17);    
      doc.text(13,nR, `${_qty}`);
      doc.setFontType("normal");
      doc.setFontSize(15);    
      doc.text(183, nR, `${_cost_price.toFixed(2)}`);  
      _blobrequested && doc.addImage(imgData, 'PNG', 20, nR-12, 24, 24);  
    })

    let dTt = 1; 
    if(tt>9999){
      dTt = 5; 
    }
    else if(tt>999){
      dTt = 4; 
    }
    else if(tt>99){
      dTt = 3; 
    }
    else if(tt>9){
      dTt = 2; 
    }
    


    var totalLeft =  190-(dTt+4)*1.4;

    doc.setFontSize(14);   
    doc.setFontType("normal");
    doc.text(totalLeft - 15 ,headerheight +14, 'Total : ');
    doc.setFontType("bold"); 
    doc.text(totalLeft, headerheight + 14,  `$${tt?tt.toFixed(2):0 }` ); 


    //doc.text(totalLeft, headerheight + 14,  `$22600.00` ); 

    doc.setFont("Roboto");
    doc.setFontType("normal");
    doc.setTextColor(60,60,60);
    doc.setFontSize(21);	
    doc.text(30, yguide+10, `${'Ordenes Pendientes para '} ${_Str}`);

  })




  doc.save(`${'ordenes'}_${(new Date()).getTime()}.pdf`);
  //doc.autoPrint();  window.open(doc.output('bloburl'), '_blank'); 
  
}





































const _formName = 'mov_list_search';





export const  PrintResume =( obj) =>{
  var nR = 0;    
  const Pformat = localStorage.getItem('pgSz') || 'a4';



  let _2Saldo = Util.sortObjectsByKey(obj,"date",true);
  let doneS = Util.sortObjectsByKey(obj,"date",false);


  var doc = new jsPDF({
    orientation: 'portrait',
    format:Pformat      
  }) 

  let _2Show = {};
  let total = 0;
  const _form = Util.getFormStore(_formName) || {};
  let qry = _form["search"];
  let dateQ = _form["date"];
  _2Saldo.map((mvI,inM)=>{
    if(obj[mvI]["IsDelivery"]){
      let type = obj[mvI]["type"];
      if(type==="COMBO" || type==="INVESTMENT_FOOD"){
        let prdDtls =obj[mvI] && obj[mvI]["prdDtls"] ;
        //let prodsL =prdDtls && prdDtls["products"];
        //let prodNm = prodsL && _Util.ObjectKeys(prodsL).length;
        let am = obj[mvI]["amount"] * obj[mvI]["tasa"]
        if(prdDtls && prdDtls["total"]>0){
          am = prdDtls["total"];
        }    
        
        if(type==="COMBO"){
          if(qry || dateQ){
            if(am>1){
             // am = am *-1;
            }
            total +=am *-1;
          }
        }
        else{
          total +=am *-1;
        }
      }
      else{
        let am = obj[mvI]["amount"] * obj[mvI]["tasa"]
        let bF = balanceFactor(type,am);             
        total += bF * am;
      }
      _2Show[mvI] = total;
    }
  })




let pgs = {}




  doneS && doneS.map((m,inM)=>{
    let pg = Math.floor(inM/36);
    
    if(!pgs[pg]){
      pgs[pg] = [];
    }
    if(obj[m]["IsDelivery"]){
      pgs[pg].push(m);
    }
  })
    
   
    
   
    /*
    doc.setFontType("normal");
    doc.text(10,headerheight+8, 'Total : ');
    doc.text(39,headerheight+8,  `` );
  */

    
  let _state = Util.getStore();
  pgs && Util.ObjectKeys(pgs).map((pg,inPg)=>{
    if(inPg>0){
      doc.addPage();
    }
    doc.setFont("Roboto");
    let yguide = 3;
    doc.setFontSize(14);
    let headerheight  = yguide+12;

    var headerheight2  = headerheight+6;
    let _Str = "" 
    let tt = 0;


    doc.setFont("Roboto");
    doc.setFontType("normal");
    doc.setFontSize(11);  
    doc.text(38, headerheight + 6, `Operacion`);
    ///doc.setFontType("bold");
    //doc.setFontSize(17);
    doc.setFont("Roboto");    
    doc.setFontType("normal");
    doc.setFontSize(11);  
    doc.text(13,headerheight + 6, `Fecha`);

    doc.setFont("Roboto");    
    doc.setFontType("normal");
    doc.setFontSize(11);  
    doc.text(63,headerheight + 6, `Orden No`);

    
    doc.setFont("Roboto");    
    doc.setFontType("normal");
    doc.setFontSize(11);  
    doc.text(183,headerheight + 6, `Saldo`);


    

    doc.setFontType("normal");
    //doc.setFontSize(15);    
    doc.text(153, headerheight + 6, `Importe`);  

    doc.setTextColor(0,0,0);

    doc.setDrawColor(90, 90, 90);       
    doc.setLineWidth(0.025);
    doc.line(10, headerheight + 8, 200, headerheight+8);


    pgs[pg] && pgs[pg].map((mID,i)=>{


      let item = obj[mID];

      let _proDitm =  {};
     

      let _nM =  (item && item.orderId) ||  (item && item.id);
     
      //let _qty =  _proDitm && (_proDitm.qty*-1);
      //let _cost_price =  _proDitm && _proDitm.cost_price?_proDitm.cost_price-50:0;
      //tt += _cost_price * _qty;
     // let imgI = _proDitm && _proDitm["imageUrl"];
     // var _thumbnailJson = imgI && _state['thumbnailJsonBlob'] && _state['thumbnailJsonBlob'][imgI];
      //let _blobrequested =  _thumbnailJson && _thumbnailJson['requested'];      
      //let imgData = _blobrequested && `data:${_thumbnailJson.type};base64,${_thumbnailJson.b64}`;


      let hasDate = item && Util.date2pretyfy(item["date"]) ;

      let am = item["amount"] * item["tasa"]
      if(item["type"]==="INVESTMENT_FOOD"){
        let prdDtls =item && item["prdDtls"] ;
        if(prdDtls && prdDtls["total"]>0){
          am = prdDtls["total"] *-1;
        }
      }
      else if(item["type"]==="COMBO"){
        am = 0;
      }

      let Sld = _2Show && _2Show[item["id"]]?_2Show[item["id"]].toFixed(2):0;


      let Nm = item["type"];
      if(item["type"]==="INVESTMENT_FOOD"){
        Nm = "INVERSION";
      }


      nR = (i+1)*7+headerheight2+1;
      //doc.line(10, nR+2, 200, nR+2);
      doc.setFont("Roboto");
      doc.setFontType("normal");
      doc.setFontSize(11);  
      doc.text(38, nR, `${Nm}`);
      ///doc.setFontType("bold");
      //doc.setFontSize(17);
      doc.setFont("Roboto");    
      doc.setFontType("normal");
      doc.setFontSize(11);  
      doc.text(13,nR, `${hasDate}`);

      doc.setFont("Roboto");    
      doc.setFontType("normal");
      doc.setFontSize(11);  
      doc.text(63,nR, `${_nM}`);

      
      doc.setFont("Roboto");    
      doc.setFontType("normal");
      doc.setFontSize(11);  
      doc.text(183,nR, `${Sld}`);


      

      doc.setFontType("normal");
      //doc.setFontSize(15);    
      doc.text(153, nR, `${am.toFixed(2)}`);  
      // _blobrequested && doc.addImage(imgData, 'PNG', 20, nR-12, 24, 24);  
    })

/*
    let dTt = 1; 
    if(tt>9999){
      dTt = 5; 
    }
    else if(tt>999){
      dTt = 4; 
    }
    else if(tt>99){
      dTt = 3; 
    }
    else if(tt>9){
      dTt = 2; 
    }
    

    var totalLeft =  190-(dTt+4)*1.4;

    doc.setFontSize(14);   
    doc.setFontType("normal");
    doc.text(totalLeft - 15 ,yguide+10, 'Total : ');
    doc.setFontType("bold"); 
    doc.text(totalLeft, yguide+10,  `$${tt?tt.toFixed(2):0 }` ); 
*/

    //doc.text(totalLeft, headerheight + 14,  `$22600.00` ); 

    doc.setFont("Roboto");
    doc.setFontType("normal");
    doc.setTextColor(60,60,60);
    doc.setFontSize(18);	
    doc.text(30, yguide+10, `${' Resumen de Movimientos '} ${""}`);

  })


  
/*
  const _mnts = Array.from(Array(Math.floor(12)).keys());
  _mnts.map((m,i)=>{   
    var _mnt =year*12+m;
    if(list[_mnt]){
      //console.log(list[_mnt])
      nR = (i+1)*10+headerheight2+9;     
      doc.setFontSize(11);
      doc.setFont("Roboto");        
      doc.setFontType("bold");  
      doc.text(12, nR-7, monthsList_Short[m]);
      doc.setFontType("normal");
      doc.text(47, nR-7, `${""}`);

      //doc.text(79, nR-7, `${list[_mnt]['total'].toFixed(2)}`);
    }
    else{
      nR = (i+1)*10+headerheight2+9;     
      doc.setFontSize(11);
      doc.setFont("Roboto");        
      doc.setFontType("bold");  
      doc.text(12, nR-7, monthsList_Short[m]);
      doc.setFontType("normal");
      doc.text(47, nR-7, `${0.00}`);
    }

  })


*/

  doc.save(`${'resumen_movimientos'}_${(new Date()).getTime()}.pdf`);
  //doc.autoPrint();  window.open(doc.output('bloburl'), '_blank'); 
  
}













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
































































/*



export function PrintMonthResume2(data,total,month,year,category){

  var nR = 0;
  var LImT = 28;
  //200 max on portrait;
  const Pformat = localStorage.getItem('pgSz') || 'a4';
  var doc = new jsPDF({
    orientation: 'portrait',
    format:Pformat      
  }) 
  
  var categoryName = '';

  var numPagesIngresos = [0];
  var sumaryIngresos = data && data.sort((a,b)=>b.date-a.date);

  if(sumaryIngresos && sumaryIngresos.length>LImT){
    numPagesIngresos = Array.from(Array(parseInt(sumaryIngresos.length/LImT)+1).keys());        
  }
  
  sumaryIngresos && numPagesIngresos.map(pg=>{
    if(pg>0){
      doc.addPage();
    }
    let start = pg*LImT;
    let limit = start+LImT;
    let Klist = [];
    for(var x = start;x<limit;x++){
      if(sumaryIngresos[x]){
        Klist.push(sumaryIngresos[x])
      }        
    }     
    
    let utilTotal = total;
    let yguide = 3;
    let title = `Report`;
    
  

    
    var headerheight  = yguide+20;
    doc.line(10, headerheight+2, 200, headerheight+2);
    doc.setFontType("bold");
    doc.setFontSize(11);
    doc.text(10,headerheight, Util.translatetext(20).toUpperCase());
    doc.text(30, headerheight, Util.translatetext(36).toUpperCase());  
    doc.text(62, headerheight, Util.translatetext(33).toUpperCase());
    doc.text(112, headerheight, Util.translatetext(19).toUpperCase());    
    Klist.map((m,i)=>{   
      doc.setTextColor(0,0,0);
      var dtC = new Date(parseInt(m.date));
      var mes = Util.parseDateShort(parseInt(m.date));         
      var _titleCategory = m["category"]?m["category"].name:''
      if(category){
        categoryName = _titleCategory;
      }
      var _description = m.title || '';
      
      if(_description && _description.length>60){
        _description = m.title.substring(0,60)+`...`
      }
      doc.setFont("arial");
      doc.setFontType("normal");
      //if(_title.length>65){     _title = m.title.substring(0,60)+`...`   }
      var utility = parseFloat(m.import).toFixed(2);                          
      nR = (i+1)*8+headerheight+9;   
      // doc.setDrawColor(204, 204, 204);       
      // doc.setLineWidth(0.025);
      // doc.line(10, nR, 200, nR); 
      doc.setFontSize(10);
      //doc.text(100, nR-7, 'fhwreywvy');
      doc.text(9, nR-7, mes);
      //var utP = 193-utility.length;
      doc.text(29, nR-7,utility);        
      doc.text(60, nR-7, _titleCategory);
      doc.text(110, nR-7, _description);   
      //doc.text(10, nR-2, _description); 
    })   
    if(Klist.length>0){
      let ttGby = Util.sumArraybyKey(Klist,`import`)
      doc.setFontSize(14);	
      doc.text(145, nR+20, `SubTotal`);
      doc.text(180, nR+20, `${ttGby}`);   
      if(pg>=numPagesIngresos.length-1){
        doc.setFontSize(14);
        doc.setLineWidth(0.25);
        doc.line(143, nR+22, 200, nR+22);
        doc.text(145, nR+28, `Total`);
        doc.text(180, nR+28, `${utilTotal}`); 
      }
    }


    doc.setFontSize(14);
    doc.setFont("Roboto");
    doc.setFontType("normal");
    doc.setTextColor(60,60,60);
    doc.setFontSize(17);	
    doc.text(10, yguide+10, `${title}  ${category?categoryName:''} ${month}, ${year}`);
    doc.setFillColor(30, 30, 30);
    doc.setDrawColor(30, 30, 30);       
    doc.setLineWidth(0.05);
    
  })

  




  doc.save(` ${category?categoryName:""}_${month}_report_${(new Date()).getTime()}_${Util.generateUUID()}.pdf`);
  //doc.autoPrint();  window.open(doc.output('bloburl'), '_blank'); 
  
}





export function PrintMonthResume( ingresos,total_ingresos,gastos,total_gastos,categories,month,year){

    var nR = 0;
    var LImT = 28;
    //200 max on portrait;
    const Pformat = localStorage.getItem('pgSz') || 'a4';
    var doc = new jsPDF({
      orientation: 'portrait',
      format:Pformat      
    }) 
    
    
    var numPagesIngresos = [0];
    var sumaryIngresos = ingresos.sort((a,b)=>b.date-a.date);

    if(sumaryIngresos.length>LImT){
      numPagesIngresos = Array.from(Array(parseInt(sumaryIngresos.length/LImT)+1).keys());        
    }
    
    numPagesIngresos.map(pg=>{
      if(pg>0){
        doc.addPage();
      }
      let start = pg*LImT;
      let limit = start+LImT;
      let Klist = [];
      for(var x = start;x<limit;x++){
        if(sumaryIngresos[x]){
          Klist.push(sumaryIngresos[x])
        }        
      }     
      
      let utilTotal = total_ingresos.toFixed(2);
      let yguide = 3;
      let title = `Ingresos`;
      
      doc.setFontSize(14);
      doc.setFont("Roboto");
      doc.setFontType("normal");
      doc.setTextColor(60,60,60);
      doc.setFontSize(17);	
      doc.text(10, yguide+10, `${title}  ${month}, ${year}`);
      doc.setFillColor(30, 30, 30);
      doc.setDrawColor(30, 30, 30);       
      doc.setLineWidth(0.05);
      var headerheight  = yguide+20;
      doc.line(10, headerheight+2, 200, headerheight+2);
      doc.setFontType("bold");
      doc.setFontSize(11);      
      doc.text(10,headerheight, 'Fecha');
      doc.text(30, headerheight, 'Importe');  
      doc.text(62, headerheight, 'Categorias');
      doc.text(112, headerheight, 'Detalles');    
      Klist.map((m,i)=>{   
        doc.setTextColor(0,0,0);
        var dtC = new Date(parseInt(m.date));
        var mes = Util.parseDateShort(parseInt(m.date));         
        var _titleCategory = m.group && categories[m.group] && categories[m.group].name;
        var _description = m.title || '';
        
        if(_description && _description.length>60){
          _description = m.description.substring(0,60)+`...`
        }
        doc.setFont("arial");
        doc.setFontType("normal");
        //if(_title.length>65){     _title = m.title.substring(0,60)+`...`   }
        var utility = parseFloat(m.import).toFixed(2);                          
        nR = (i+1)*8+headerheight+9;   
        // doc.setDrawColor(204, 204, 204);       
        // doc.setLineWidth(0.025);
        // doc.line(10, nR, 200, nR); 
        doc.setFontSize(10);
        //doc.text(100, nR-7, 'fhwreywvy');
        doc.text(9, nR-7, mes);
        //var utP = 193-utility.length;
        doc.text(29, nR-7,utility);        
        doc.text(60, nR-7, _titleCategory);
        doc.text(110, nR-7, _description);   
        //doc.text(10, nR-2, _description); 
      })   
      if(Klist.length>0){
        let ttGby = Util.sumArraybyKey(Klist,`import`)
        doc.setFontSize(14);	
        doc.text(145, nR+20, `SubTotal`);
        doc.text(180, nR+20, `${ttGby}`);   
        if(pg>=numPagesIngresos.length-1){
          doc.setFontSize(14);
          doc.setLineWidth(0.25);
          doc.line(143, nR+22, 200, nR+22);
          doc.text(145, nR+28, `Total`);
          doc.text(180, nR+28, `${utilTotal}`); 
        }
      } 
      
      
    })

    
    var numPagesGastos = [0];
    var sumaryGastos = gastos.sort((a,b)=>b.date-a.date);

    if(sumaryGastos.length>LImT){
      numPagesGastos = Array.from(Array(parseInt(sumaryGastos.length/LImT)+1).keys());        
    }
    numPagesGastos.map(pg=>{
      doc.addPage();      
      let start = pg*LImT;
      let limit = start+LImT;
      let Klist = [];
      for(var x = start;x<limit;x++){
        if(sumaryGastos[x]){
          Klist.push(sumaryGastos[x])
        }        
      }     
      
      let utilTotal = total_gastos.toFixed(2);
      let yguide = 3;
      let title = `Gastos`;

      doc.setFontSize(14);
      doc.setFont("Roboto");
      doc.setFontType("normal");
      doc.setTextColor(60,60,60);
      doc.setFontSize(17);	
      doc.text(10, yguide+10, `${title}  ${month}, ${year}`);
      doc.setFillColor(30, 30, 30);
      doc.setDrawColor(30, 30, 30);       
      doc.setLineWidth(0.05);
      var headerheight  = yguide+20;
      doc.line(10, headerheight+2, 200, headerheight+2);
      doc.setFontType("bold");
      doc.setFontSize(11);      
      doc.text(10,headerheight, 'Fecha');
      doc.text(30, headerheight, 'Importe');  
      
      doc.text(62, headerheight, 'Categorias');
      doc.text(112, headerheight, 'Detalles'); 
      Klist.map((m,i)=>{   
        doc.setTextColor(0,0,0);
        var dtC = new Date(parseInt(m.date));
        var mes = Util.parseDateShort(parseInt(m.date));         
        var _titleCategory = m.group && categories[m.group] && categories[m.group].name;
        var _description = m.title || '';

        if(_description && _description.length>60){
          _description = m.description.substring(0,60)+`...`
        }
        //if(_title.length>65){     _title = m.title.substring(0,60)+`...`   }
        var utility = parseFloat(m.import).toFixed(2);                          
        nR = (i+1)*8+headerheight+9;   
        doc.setFont("arial");
        doc.setFontType("normal");
        //doc.setDrawColor(204, 204, 204);       
        //doc.setLineWidth(0.025);
        //doc.line(10, nR, 200, nR); 
        doc.setFontSize(10);
        doc.text(12, nR-7, mes);
        //var utP = 193-utility.length;
        doc.text(29, nR-7,utility);        
        doc.text(60, nR-7, _titleCategory);
        //doc.text(10, nR-2, _description); 

        doc.text(110, nR-7, _description);   
      })   
      if(Klist.length>0){
        let ttGby = Util.sumArraybyKey(Klist,`import`)
        doc.setFontSize(14);	
        doc.text(145, nR+20, `SubTotal`);
        doc.text(180, nR+20, `${ttGby}`);   
        if(pg>=numPagesGastos.length-1){
          doc.setFontSize(14);
          doc.setLineWidth(0.25);
          doc.line(143, nR+22, 200, nR+22);
          doc.text(145, nR+28, `Total`);
          doc.text(180, nR+28, `${utilTotal}`); 
        }
      }
      
    })
    doc.save(`${month}_Monthly__resume_${(new Date()).getTime()}.pdf`);
    //doc.autoPrint();  window.open(doc.output('bloburl'), '_blank'); 
    
  }





  export function PrintYearResume( ingresos,total_ingresos,gastos,total_gastos,categories,ingresos_categories,gastos_categories,year){

   

    var nR = 0;


    var LImT = 23;
    //200 max on portrait;
    const Pformat = localStorage.getItem('pgSz') || 'a4';
    var doc = new jsPDF({
      orientation: 'portrait',
      format:Pformat      
    }) 
    
    
    var numPagesIngresos = [];
    
    
    let yguide = 3;
    doc.setFontSize(14);
    doc.setFont("Roboto");
    doc.setFontType("normal");
    doc.setTextColor(60,60,60);
    doc.setFontSize(17);	
    doc.text(120, yguide+10, `${'Resume'} , ${year}`);
    
    let headerheight  = yguide+30;
    
    doc.setFontSize(14);      
    doc.text(10,headerheight, 'Ingresos : ');
    doc.text(39,headerheight,  `${total_ingresos.toFixed(2)}` );
    doc.text(10, headerheight+6, 'Gastos : ');  
    doc.text(39,headerheight+6, `${total_gastos.toFixed(2)}` );
    doc.text(10,headerheight+12, 'Ganancias : ');
    doc.text(39,headerheight+12, `${(total_ingresos - total_gastos).toFixed(2)}` );

    var headerheight2  = headerheight+50;
    doc.line(10, headerheight2+2, 200, headerheight2+2);
    doc.setFontType("bold");
    doc.setFontSize(15);      
    doc.text(13,headerheight2, 'Mes');
    doc.text(53, headerheight2, 'Ingresos');  
    doc.text(108, headerheight2, 'Gastos');
    doc.text(168, headerheight2, 'Ganancias');


    const _mnts = Array.from(Array(Math.floor(12)).keys());
    _mnts.map((m,i)=>{   
      var _mnt =year*12+m;
      var _ctIngresos = ingresos[_mnt]?ingresos[_mnt]['total']:0;
      var _ctgastos = gastos[_mnt]?gastos[_mnt]['total']:0;
      nR = (i+1)*12+headerheight2+9;
      doc.setFontSize(13);
      doc.setFont("Roboto");
      doc.setFontType("normal");
      doc.text(12, nR-7, monthsList_Short[m]);
      doc.text(52, nR-7, `${_ctIngresos.toFixed(2)}`);
      doc.text(107, nR-7, `${_ctgastos.toFixed(2)}`);
      doc.text(167, nR-7, `${(_ctIngresos-_ctgastos).toFixed(2)}`);
    })



    var numPagesCatIng = [0];
    var sumaryCatIng = Util.ObjectKeys(ingresos_categories);

    if(sumaryCatIng.length>LImT){
      numPagesCatIng = Array.from(Array(parseInt(sumaryCatIng.length/LImT)+1).keys());        
    }
    
    numPagesCatIng.map(pg=>{
      doc.addPage();      
      let start = pg*LImT;
      let limit = start+LImT;
      let Klist = [];
      let _tottal_ = 0;
      for(var x = start;x<limit;x++){
        if(sumaryCatIng[x]){
          var total = ingresos_categories[sumaryCatIng[x]]?ingresos_categories[sumaryCatIng[x]]['total']:0;
          Klist.push({category:categories[sumaryCatIng[x]],total:total})
          _tottal_ += total; 
        }        
      }

       
      let Hguide = 3;      
      doc.setFont("Roboto");
      doc.setFontType("normal");
      doc.setTextColor(60,60,60);
      doc.setFontSize(17);	
      doc.text(40, Hguide+10, `${'Resume by categories'}  -  ${'Ingresos'}  -  ${year}`); 
      
      doc.text(60, Hguide+20, `${_tottal_}`); 

      doc.setFontType("bold");  
      doc.text(40, Hguide+20, `Total :   `); 
      let headerh  = Hguide+30;

      Klist.map((ctg,i)=>{ 
        nR = (i+1)*11+headerh+9;
        doc.setFontSize(11);
        doc.setFont("Roboto");        
        doc.setFontType("bold");  
        doc.text(12, nR-7, `${ctg.total.toFixed(2)}`);
        doc.setFontType("normal");
        doc.text(42, nR-7, `${ctg.category.name}`);
      })

    })










    var numPagesCatGastos = [0];
    var sumaryCatGastos = Util.ObjectKeys(gastos_categories);

    if(sumaryCatGastos.length>LImT){
      numPagesCatGastos = Array.from(Array(parseInt(sumaryCatGastos.length/LImT)+1).keys());        
    }
    
    numPagesCatGastos.map(pg=>{
      doc.addPage();      
      let start = pg*LImT;
      let limit = start+LImT;
      let Klist = [];
      let _tottal_ = 0;
      for(var x = start;x<limit;x++){
        if(sumaryCatGastos[x]){
          let total = gastos_categories[sumaryCatGastos[x]]?gastos_categories[sumaryCatGastos[x]]['total']:0;
          Klist.push({category:categories[sumaryCatGastos[x]],total:total})
          _tottal_ += total; 
        }        
      }

       
      let Hguide = 3;      
      doc.setFont("Roboto");
      doc.setFontType("normal");
      doc.setTextColor(60,60,60);
      doc.setFontSize(17);	
      doc.text(40, Hguide+10, `${'Resume by categories'}  -  ${'Gastos'}  -  ${year}`); 
      
      doc.text(60, Hguide+20, `${_tottal_}`); 

      doc.setFontType("bold");  
      doc.text(40, Hguide+20, `Total :   `); 

      let headerh  = Hguide+30;

      Klist.map((ctg,i)=>{ 
        nR = (i+1)*11+headerh+9;
        doc.setFontSize(11);
        doc.setFont("Roboto");
        doc.setFontType("bold");        
        doc.text(12, nR-7, `${ctg.total.toFixed(2)}`);        
        doc.setFontType("normal");
        doc.text(42, nR-7, `${ctg.category.name}`);
        
      })



    })




    doc.save(`${'Year'}_${year}_resume_${(new Date()).getTime()}.pdf`);
    //doc.autoPrint();  window.open(doc.output('bloburl'), '_blank'); 
    
  }




































  



  

  




  export function handlePdfAttendanceAll(attobj,kidsObj,categories,week2print,img64){
    var dwk2work = {};
    var i2d = localStorage.getItem('wdp');
    if(Util.isJson(i2d)){
      dwk2work = JSON.parse(i2d); 
    }   
 
    var nR = 0;    
    //var imgData = `data:${'image/png'};base64,${Spirit}`; 
    var imgData = `data:${img64.type};base64,${img64.b64}`; 
    var hguide = 3;
    var yguide = 15;
    var LImT = 6;
    var footerHeight = 160 + yguide    
    //200 max on portrait;
    const Pformat = localStorage.getItem('size-pdf-assistance') || 'a4';
  
    var doc = new jsPDF({
      orientation: 'landscape',
      format:Pformat      
    })   
    
     
    var Iwk = ``,ewk='',provDr ='';
  
    if(week2print){
      var prswkdy = parse_range_date(week2print)
      Iwk = prswkdy['Iwk'];
      ewk = prswkdy['ewk'];
    }
  
    if(window.localStorage.getItem('provider')){
      provDr =window.localStorage.getItem('provider');
    }
  
    
    Util.ObjectKeys(attobj).map((att,ii2)=>{      
      var list = Util.convertObj2Array(attobj[att]);
      var kids = []  
      list.map(k=>{
        kidsObj[k.kid] && kidsObj[k.kid]['id'] && kids.push(kidsObj[k.kid]);
      })
      if(kids && kids.length>0){     
        if(ii2>0){
          doc.addPage();
        }

      var title = categories[att]?categories[att].name:'';
      var Gname = '';
      if(window.localStorage.getItem('title-pdf-assistance')===true || window.localStorage.getItem('title-pdf-assistance')==='true'){  
        Gname = title || '';      
      }
      var numPages = [0];
      
  
      if(kids.length>6){
        numPages = Array.from(Array(parseInt(kids.length/LImT)+1).keys());        
      }
  
  
    numPages.map(pg=>{

      var start = pg*LImT;
      var limit = start+LImT;
      var Klist = [];
      for(var x = start;x<limit;x++){
        if(kids[x]){
          Klist.push(kids[x])
        }else{
          Klist.push({name:``})
        }          
      }

      if(pg>0){
        doc.addPage();
      }
           
      
      doc.setFont("times");
      doc.setFontType("normal");
      doc.setTextColor(0,0,0);
      doc.setFontSize(8);	
      doc.text(7, hguide+3, 'DCC-94E');
      doc.setFontType("normal");
      doc.text(7, hguide+6, `(R.07/13)`);
      doc.text(7, hguide+9, `922 KAR  2:160`);
      doc.setFontSize(9);	
      doc.text(118, hguide+8, 'Cabinet for Healt and Family Services');
      doc.setFontType("normal");
      doc.text(115, hguide+11, 'Department of Community Based Services');
      doc.text(125, hguide+14, 'Division of Child Care');
  
  
  
      
      doc.setFont("times");
      doc.setFontType("bold");
      doc.setTextColor(0,0,0);
      doc.setFontSize(11);	
      doc.text(7, yguide+10, Gname);
      doc.text(115, yguide+10, `Child Care Dayli Attendance Record`);
      doc.setFontSize(10);
      doc.setFontType("normal");
      doc.text(7, yguide+15, `Provider's Name`);
      doc.text(115, yguide+15, `Provider's Registered/Certifled/License #`);
  
  
      doc.setLineWidth(0.05);
      doc.setDrawColor(0,0,0);
      doc.line(5, yguide+11, 290, yguide+11);
      doc.line(5, yguide+30, 290, yguide+30);      
      doc.line(235, yguide+25, 288, yguide+25);
      doc.line(290, yguide+11, 290, yguide+30);
      doc.line(5, yguide+11, 5, yguide+30);
      doc.line(110, yguide+11, 110, yguide+30);
      doc.line(233, yguide+11, 233, yguide+30);
  
      doc.setFontSize(10);
      doc.text(240, yguide+15, `Week of:`);
      doc.setFontSize(10);        
      doc.text(240, yguide+23, Iwk);
      doc.text(270, yguide+23, ewk);
      doc.setFontSize(8); 
      doc.text(240, yguide+28.2, `(mm/dd/yyyy)   througt   (mm/dd/yyyy)`);
      doc.setFontSize(8);
      doc.setFontType("normal");
      doc.text(5, yguide+33, `Daily Attendance Record: Enter the child's full name as listed on the Provider Billing Form (PDF), Beside child's name, record the actual time the child arrives and departs (do not record this information in advance). If the parent or authorizes person falls`);
      doc.text(5, yguide+36,`to initial each entry in or out, funds may be recouped. It is recommended that providers have the parents review this form for accuracy at the end of the week and sign the form as verification that it is correct. The PDF and sign in sheets should be compared `);
      doc.text(5, yguide+39,`to ensure accuracy of the child's attendance, absences and holidays that are being billed.`);
    
      var headerTab = yguide+39;
      var headerText = headerTab+5;
      var HText =  headerText+1.25;
      var lineVert = headerTab+20; 
      doc.setFontSize(13);
      doc.setFontType("bold");
      doc.text(17, yguide+21, provDr);
      doc.setFontSize(11);
      doc.setFontType("normal");
      doc.text(10, HText+2, `Child's Name`); 
      doc.text(10, HText+6, `(as it appears on PDF)`); 
  
      [`Sunday`,`Monday`,`Tuesday`,`Wednesday`,`Thursday`,`Friday`,`Saturday`].map((d,inDx)=>{        
        var factor = (inDx+1)*27;
        var LvPos  = factor+32;
        var vPos = LvPos+5;
        var hPos =factor+45.5;  
        if(inDx%2==0){
          doc.setDrawColor(224, 224, 224); 
          doc.setFillColor(224, 224, 224);            
          doc.rect(LvPos, headerTab+2, 27, 18, 'F');
        }
        doc.setFontSize(11);      
        doc.text(vPos, HText, d);
        doc.setFontSize(9);
        doc.text(LvPos+5, headerText+7, 'In');
        doc.text(LvPos+16, headerText+7, 'Out');
        doc.text(LvPos+2, headerText+13, 'Initial');
        doc.text(LvPos+15, headerText+13, 'Initial');
        doc.setDrawColor(0,0,0);
        doc.line(LvPos, headerTab+2, LvPos, lineVert);
        doc.setLineWidth(0.005);
        doc.line(LvPos, headerTab+8, LvPos+27, headerTab+8);
        doc.setLineWidth(0.005);
        doc.line(LvPos, headerTab+14, LvPos+27, headerTab+14);
        doc.setLineWidth(0.005);
        doc.line(LvPos, headerTab+20, LvPos+27, headerTab+20);
        doc.setLineWidth(0.005);
        doc.line(hPos, headerTab+8, hPos, lineVert);
        
      })  
      doc.setFontSize(10);    
      doc.text(252, HText, `Parents Signature to`);
      doc.text(252, HText+4, `Verify Accuracy of`);
      doc.text(252, HText+8, `Attendance for week`);
      
      Klist.map((dnm,inDx)=>{      
        var lin = headerTab + (inDx+1)*16;
        [`Sunday`,`Monday`,`Tuesday`,`Wednesday`,`Thursday`,`Friday`,`Saturday`].map((d,inDY)=>{          
          var factor = (inDY+1)*27;
          var LvPos  = factor+32;          
          var hPos =factor+45.5;
          if(inDY%2===0){
            doc.setDrawColor(0);
            doc.setFillColor(224, 224, 224);            
            doc.rect(LvPos,lin+4, 27, 16, 'F');
            doc.setLineWidth(0.005);
            doc.setDrawColor(0,0,0);
            
  
            if(!dwk2work[d]){
              doc.setFontSize(16);
              doc.setFontType("bold");
              doc.text(LvPos+2, lin+9.5,  '|||||||');
              doc.text(LvPos+2, lin+17.5, '|||||||');
              doc.text(LvPos+16, lin+9.5, '|||||||');
              doc.text(LvPos+16, lin+17.5,'|||||||');
            } 
  
            doc.line(LvPos, lin+4, LvPos, lin+20);
            doc.line(hPos, lin+4, hPos, lin+20);
            doc.line(LvPos, lin+12, LvPos+27, lin+12);
            doc.line(LvPos, lin+20, LvPos+27, lin+20);
            doc.line(5, lin+4, 290, lin+4);
            doc.line(5, lin+20, 290, lin+20);
          }else{
            doc.setLineWidth(0.005);
            doc.setDrawColor(0,0,0);
            doc.line(LvPos, lin+4, LvPos, lin+20);
            doc.line(hPos, lin+4, hPos, lin+20);
            doc.line(LvPos, lin+12, LvPos+27, lin+12);
            doc.line(LvPos, lin+20, LvPos+27, lin+20);
          }
                  
        })  
        doc.setFontType("normal"); 
        doc.setFontSize(12);
        doc.text(6, lin+12, dnm.name);  
        doc.setLineWidth(0.05);      
        doc.setDrawColor(0,0,0);  
        doc.line(5, lin+20, 290, lin+20);
        doc.line(5, lin+4, 5, lin+20); 
        doc.line(248, lin+4, 248, lin+20);
        doc.line(290, lin+4, 290, lin+20);
      })       
      doc.setDrawColor(0,0,0);
      doc.line(5, headerTab+2, 290, headerTab+2);
      doc.line(5, headerTab+20, 290, headerTab+20);
      doc.line(5, headerTab+2, 5, lineVert);      
      doc.line(248, headerTab+2, 248, lineVert);
      doc.line(290, headerTab+2, 290, lineVert);
      doc.setFontSize(8);
      doc.setFontType("normal");   
      doc.text(5, footerHeight,  'I certify that I have not altered this form in accordance with KRS 13A.130, and this information was used when completing the DCC-97, Provider Billing Form. I understand that if I or staff acting on the child care providers behalf does not bill accurately');
      doc.text(5, footerHeight+3,'in accordance with 922 KAR 2:160 for a child, the child care provider will not be paid for days that are not verified and will be required to pay back any overpayment. An overpayment may be pursued as an intentional program violation in accordance with');
      doc.text(5, footerHeight+6, '922 KAR 2:020.');
      doc.setFontSize(8);
      doc.setFontType("bold");
      doc.text(5, footerHeight+9, 'Licensee/On-Site Director or Certified/Registered Providers Signature: ________________________________ Date:  __________________');
      doc.setFontSize(8);
      doc.setFontType("normal");
      doc.text(5, footerHeight+13, 'Licensee, as defined by 922 KAR 2:090, is an owner or operator of a child care center to include sole proprietor, corporation, Limited Liability Company, partnership, association or organization.');
      doc.setFontSize(8);
      doc.setFontType("bold")
      doc.text(5, footerHeight+16, 'NOTE: MISSING SIGNATURES MAY RESULT IN NON-PAYMENT OR RECOUPMENT OF CCAP PAYMENT IN ACCORDANCE WITH 922 KAR 2:160 and 922 KAR 2:020.');															
      doc.setFontSize(8);
      doc.setFontType("normal");
      doc.text(5, footerHeight+21, 'Cabinet for Health and Family Services');	
      doc.text(5, footerHeight+25, 'Web Site: http://chfs.ky.gov/');	
      doc.text(225, footerHeight+25, 'An Equal Opportunity Employer M/F/D');      
      doc.addImage(imgData, 'PNG', 120, footerHeight+20, 24, 6);      
    })   
  }
  })     


    var ct22 = new Date()
    doc.save(`${'All'}_Kids_Asistencia_${ct22.getTime()}.pdf`);
    
  
  }
  

















  export function handlePdfAttendanceById(kids,title,week2print,img64){
    var dwk2work = {};
    var i2d = localStorage.getItem('wdp');
    if(Util.isJson(i2d)){
      dwk2work = JSON.parse(i2d); 
    }    
    var nR = 0;    
    var imgData = `data:${img64.type};base64,${img64.b64}`; 
    var hguide = 3;
    var yguide = 15;
    var LImT = 6;
    var footerHeight = 160 + yguide    
    //200 max on portrait;
    const Pformat = localStorage.getItem('size-pdf-assistance') || 'a4';
  
    var doc = new jsPDF({
      orientation: 'landscape',
      format:Pformat      
    })   
    
     
    var Iwk = ``,ewk='',provDr ='';
  
    if(week2print){
      var prswkdy = parse_range_date(week2print)
      Iwk = prswkdy['Iwk'];
      ewk = prswkdy['ewk'];
    }
  
    if(window.localStorage.getItem('provider')){
      provDr =window.localStorage.getItem('provider');
    }
  
    var Gname = '';
    [0].map((att,ii2)=>{      
      if(kids && kids.length>0){     
        if(ii2>0){
          doc.addPage();
        }

      
      if(window.localStorage.getItem('title-pdf-assistance')===true || window.localStorage.getItem('title-pdf-assistance')==='true'){  
        Gname = title || '';      
      }
      var numPages = [0];
      
  
      if(kids.length>6){
        numPages = Array.from(Array(parseInt(kids.length/LImT)+1).keys());        
      }
  
  
    numPages.map(pg=>{

      var start = pg*LImT;
      var limit = start+LImT;
      var Klist = [];
      for(var x = start;x<limit;x++){
        if(kids[x]){
          Klist.push(kids[x])
        }else{
          Klist.push({name:``})
        }          
      }

      if(pg>0){
        doc.addPage();
      }
           
      
      doc.setFont("times");
      doc.setFontType("normal");
      doc.setTextColor(0,0,0);
      doc.setFontSize(8);	
      doc.text(7, hguide+3, 'DCC-94E');
      doc.setFontType("normal");
      doc.text(7, hguide+6, `(R.07/13)`);
      doc.text(7, hguide+9, `922 KAR  2:160`);
      doc.setFontSize(9);	
      doc.text(118, hguide+8, 'Cabinet for Healt and Family Services');
      doc.setFontType("normal");
      doc.text(115, hguide+11, 'Department of Community Based Services');
      doc.text(125, hguide+14, 'Division of Child Care');
  
  
  
      
      doc.setFont("times");
      doc.setFontType("bold");
      doc.setTextColor(0,0,0);
      doc.setFontSize(11);	
      doc.text(7, yguide+10, Gname);
      doc.text(115, yguide+10, `Child Care Dayli Attendance Record`);
      doc.setFontSize(10);
      doc.setFontType("normal");
      doc.text(7, yguide+15, `Provider's Name`);
      doc.text(115, yguide+15, `Provider's Registered/Certifled/License #`);
  
  
      doc.setLineWidth(0.05);
      doc.setDrawColor(0,0,0);
      doc.line(5, yguide+11, 290, yguide+11);
      doc.line(5, yguide+30, 290, yguide+30);      
      doc.line(235, yguide+25, 288, yguide+25);
      doc.line(290, yguide+11, 290, yguide+30);
      doc.line(5, yguide+11, 5, yguide+30);
      doc.line(110, yguide+11, 110, yguide+30);
      doc.line(233, yguide+11, 233, yguide+30);
  
      doc.setFontSize(10);
      doc.text(240, yguide+15, `Week of:`);
      doc.setFontSize(10);        
      doc.text(240, yguide+23, Iwk);
      doc.text(270, yguide+23, ewk);
      doc.setFontSize(8); 
      doc.text(240, yguide+28.2, `(mm/dd/yyyy)   througt   (mm/dd/yyyy)`);
      doc.setFontSize(8);
      doc.setFontType("normal");
      doc.text(5, yguide+33, `Daily Attendance Record: Enter the child's full name as listed on the Provider Billing Form (PDF), Beside child's name, record the actual time the child arrives and departs (do not record this information in advance). If the parent or authorizes person falls`);
      doc.text(5, yguide+36,`to initial each entry in or out, funds may be recouped. It is recommended that providers have the parents review this form for accuracy at the end of the week and sign the form as verification that it is correct. The PDF and sign in sheets should be compared `);
      doc.text(5, yguide+39,`to ensure accuracy of the child's attendance, absences and holidays that are being billed.`);
    
      var headerTab = yguide+39;
      var headerText = headerTab+5;
      var HText =  headerText+1.25;
      var lineVert = headerTab+20; 
      doc.setFontSize(13);
      doc.setFontType("bold");
      doc.text(17, yguide+21, provDr);
      doc.setFontSize(11);
      doc.setFontType("normal");
      doc.text(10, HText+2, `Child's Name`); 
      doc.text(10, HText+6, `(as it appears on PDF)`); 
  
      [`Sunday`,`Monday`,`Tuesday`,`Wednesday`,`Thursday`,`Friday`,`Saturday`].map((d,inDx)=>{        
        var factor = (inDx+1)*27;
        var LvPos  = factor+32;
        var vPos = LvPos+5;
        var hPos =factor+45.5;  
        if(inDx%2==0){
          doc.setDrawColor(224, 224, 224); 
          doc.setFillColor(224, 224, 224);            
          doc.rect(LvPos, headerTab+2, 27, 18, 'F');
        }
        doc.setFontSize(11);      
        doc.text(vPos, HText, d);
        doc.setFontSize(9);
        doc.text(LvPos+5, headerText+7, 'In');
        doc.text(LvPos+16, headerText+7, 'Out');
        doc.text(LvPos+2, headerText+13, 'Initial');
        doc.text(LvPos+15, headerText+13, 'Initial');
        doc.setDrawColor(0,0,0);
        doc.line(LvPos, headerTab+2, LvPos, lineVert);
        doc.setLineWidth(0.005);
        doc.line(LvPos, headerTab+8, LvPos+27, headerTab+8);
        doc.setLineWidth(0.005);
        doc.line(LvPos, headerTab+14, LvPos+27, headerTab+14);
        doc.setLineWidth(0.005);
        doc.line(LvPos, headerTab+20, LvPos+27, headerTab+20);
        doc.setLineWidth(0.005);
        doc.line(hPos, headerTab+8, hPos, lineVert);
        
      })  
      doc.setFontSize(10);    
      doc.text(252, HText, `Parents Signature to`);
      doc.text(252, HText+4, `Verify Accuracy of`);
      doc.text(252, HText+8, `Attendance for week`);
      
      Klist.map((dnm,inDx)=>{      
        var lin = headerTab + (inDx+1)*16;
        [`Sunday`,`Monday`,`Tuesday`,`Wednesday`,`Thursday`,`Friday`,`Saturday`].map((d,inDY)=>{          
          var factor = (inDY+1)*27;
          var LvPos  = factor+32;          
          var hPos =factor+45.5;
          if(inDY%2===0){
            doc.setDrawColor(0);
            doc.setFillColor(224, 224, 224);            
            doc.rect(LvPos,lin+4, 27, 16, 'F');
            doc.setLineWidth(0.005);
            doc.setDrawColor(0,0,0);
            
  
            if(!dwk2work[d]){
              doc.setFontSize(16);
              doc.setFontType("bold");
            
              doc.text(LvPos+2, lin+9.5,  '|||||||');
              doc.text(LvPos+2, lin+17.5, '|||||||');
              doc.text(LvPos+16, lin+9.5, '|||||||');
              doc.text(LvPos+16, lin+17.5,'|||||||');
            } 
  
            doc.line(LvPos, lin+4, LvPos, lin+20);
            doc.line(hPos, lin+4, hPos, lin+20);
            doc.line(LvPos, lin+12, LvPos+27, lin+12);
            doc.line(LvPos, lin+20, LvPos+27, lin+20);
            doc.line(5, lin+4, 290, lin+4);
            doc.line(5, lin+20, 290, lin+20);
          }else{
            doc.setLineWidth(0.005);
            doc.setDrawColor(0,0,0);
            doc.line(LvPos, lin+4, LvPos, lin+20);
            doc.line(hPos, lin+4, hPos, lin+20);
            doc.line(LvPos, lin+12, LvPos+27, lin+12);
            doc.line(LvPos, lin+20, LvPos+27, lin+20);
          }
                  
        })  
        doc.setFontType("normal"); 
        doc.setFontSize(12);
        doc.text(6, lin+12, dnm.name);  
        doc.setLineWidth(0.05);      
        doc.setDrawColor(0,0,0);  
        doc.line(5, lin+20, 290, lin+20);
        doc.line(5, lin+4, 5, lin+20); 
        doc.line(248, lin+4, 248, lin+20);
        doc.line(290, lin+4, 290, lin+20);
      })       
      doc.setDrawColor(0,0,0);
      doc.line(5, headerTab+2, 290, headerTab+2);
      doc.line(5, headerTab+20, 290, headerTab+20);
      doc.line(5, headerTab+2, 5, lineVert);      
      doc.line(248, headerTab+2, 248, lineVert);
      doc.line(290, headerTab+2, 290, lineVert);
      doc.setFontSize(8);
      doc.setFontType("normal");   
      doc.text(5, footerHeight,  'I certify that I have not altered this form in accordance with KRS 13A.130, and this information was used when completing the DCC-97, Provider Billing Form. I understand that if I or staff acting on the child care providers behalf does not bill accurately');
      doc.text(5, footerHeight+3,'in accordance with 922 KAR 2:160 for a child, the child care provider will not be paid for days that are not verified and will be required to pay back any overpayment. An overpayment may be pursued as an intentional program violation in accordance with');
      doc.text(5, footerHeight+6, '922 KAR 2:020.');
      doc.setFontSize(8);
      doc.setFontType("bold");
      doc.text(5, footerHeight+9, 'Licensee/On-Site Director or Certified/Registered Providers Signature: ________________________________ Date:  __________________');
      doc.setFontSize(8);
      doc.setFontType("normal");
      doc.text(5, footerHeight+13, 'Licensee, as defined by 922 KAR 2:090, is an owner or operator of a child care center to include sole proprietor, corporation, Limited Liability Company, partnership, association or organization.');
      doc.setFontSize(8);
      doc.setFontType("bold")
      doc.text(5, footerHeight+16, 'NOTE: MISSING SIGNATURES MAY RESULT IN NON-PAYMENT OR RECOUPMENT OF CCAP PAYMENT IN ACCORDANCE WITH 922 KAR 2:160 and 922 KAR 2:020.');															
      doc.setFontSize(8);
      doc.setFontType("normal");
      doc.text(5, footerHeight+21, 'Cabinet for Health and Family Services');	
      doc.text(5, footerHeight+25, 'Web Site: http://chfs.ky.gov/');	
      doc.text(225, footerHeight+25, 'An Equal Opportunity Employer M/F/D');      
      doc.addImage(imgData, 'PNG', 120, footerHeight+20, 24, 6);      
    })   
  }
  })     


    var ct22 = new Date()
    doc.save(`${title}_Kids_Asistencia_${ct22.getTime()}.pdf`);
    
    if(Util.getBrowser().browser === `Edge` || Util.getBrowser().browser === `Internet Explorer` || Util.getBrowser().os === 'iPhone'){
      var ct22 = new Date()
      doc.save(`${Gname}_Kids_Asistencia_${ct22.getTime()}.pdf`);
    }
    else{
      doc.autoPrint();  // <<--------------------- !!
      window.open(doc.output('bloburl'), '_blank'); 
    }
    
  
  }
  


















































  export function handlePdfResumenHistoriaClinica(){
    var dwk2work = {};
    var i2d = localStorage.getItem('wdp');
    if(Util.isJson(i2d)){
      dwk2work = JSON.parse(i2d); 
    }   
    var nR = 0;    
    
    var yguide = 15;
    var LImT = 6;
    var footerHeight = 160 + yguide    
    //200 max on portrait;
    const Pformat = localStorage.getItem('size-pdf-assistance') || 'a4';
  
    var doc = new jsPDF({
      orientation: 'portrait',
      format:Pformat      
    })   
    

    var title = `Resumen de Historia Clinica`


  // add custom font to file
 doc.addFont("ConsolasHex.ttf", "ConsolasHex", "Bold");





    doc.addFont('ComicSansMS', 'Comic Sans', 'normal');
    doc.addFont('Roboto.ttf', 'Roboto','normal');
    console.log(doc.getFontList())
  
    var Gname = '';
    [0].map((att,ii2)=>{      
      if(ii2>0){
        doc.addPage();
      }
      
      var numPages = [0];
  
  
    numPages.map(pg=>{

      var start = pg*LImT;
      var limit = start+LImT;
      var Klist = [];
     

      if(pg>0){
        doc.addPage();
      }

      var hguide = 35;
      
      doc.setFont("Comic Sans");     
      //doc.setFont("ConsolasHex");
      doc.setFontSize(21);
      doc.setFontType("bold");
      doc.text(52, 15, title.toUpperCase());

      var marginLeft = 10;
      var marginTOP = 6;
      var nn = 'Nombre y Apellidos del paciente';

      var DIRECTION = 'DIRECION PARTICULAR';


      doc.setFont("times");
      doc.setFontType("normal");
      doc.setTextColor(0,0,0);
      doc.setFontSize(10);
     
      
      doc.setLineWidth(0.05);
      doc.setDrawColor(0,0,0);


      doc.text(marginLeft, hguide+marginTOP*0, 'FECHA');
      doc.line(marginLeft+12,hguide+marginTOP*0, marginLeft+190, hguide+marginTOP*0);


      doc.text(marginLeft, hguide+marginTOP*1, nn.toUpperCase());
      doc.line(marginLeft+65,hguide+marginTOP*1+1, marginLeft+190, hguide+marginTOP*1+1);




      doc.text(marginLeft, hguide+marginTOP*2, 'FECHA DE NACIMIENTO');
      doc.text(marginLeft+130, hguide+marginTOP*2, 'EDAD');
      doc.text(marginLeft+160, hguide+marginTOP*2, 'SEXO');
      doc.line(marginLeft+42,hguide+marginTOP*2+1, marginLeft+128, hguide+marginTOP*2+1);
      doc.line(marginLeft+140,hguide+marginTOP*2+1, marginLeft+158, hguide+marginTOP*2+1);
      doc.line(marginLeft+170,hguide+marginTOP*2+1, marginLeft+190, hguide+marginTOP*2+1);


      doc.setDrawColor(0,0,0);
      doc.text(marginLeft, hguide+marginTOP*3, DIRECTION);
      doc.line(marginLeft+42,hguide+marginTOP*3+1, marginLeft+190, hguide+marginTOP*3+1);
      doc.line(marginLeft+0,hguide+marginTOP*4+1, marginLeft+190, hguide+marginTOP*4+1);



      doc.text(marginLeft, hguide+marginTOP*5, "CONSULTORIO MEDICO No");
      doc.line(marginLeft+46, hguide+marginTOP*5+1, marginLeft+190, hguide+marginTOP*5+1);


      doc.text(marginLeft, hguide+marginTOP*6, "POLICLINICO AL QUE PERTENECE");
      doc.line(marginLeft+58, hguide+marginTOP*6+1, marginLeft+190, hguide+marginTOP*6+1);



      doc.setFontSize(8);
      doc.setFontType("bold");
      doc.text(marginLeft, hguide+marginTOP*16+4, "(Se anexa carne de vacunacion del paciente)");  
      doc.text(marginLeft, hguide+marginTOP*19+4, "(Se anexa documento oficial cito-diagnostico del paciente)");  






      doc.setFontSize(12);
      doc.setFontType("bold");
      doc.text(marginLeft, hguide+marginTOP*7, "RESUMEN CLINICO ( PADECIMIENTOS Y TRATAMIENTOS )");      
      doc.line(marginLeft+0, hguide+marginTOP*8, marginLeft+190, hguide+marginTOP*8);
      doc.line(marginLeft+0, hguide+marginTOP*9, marginLeft+190, hguide+marginTOP*9);
      doc.line(marginLeft+0, hguide+marginTOP*10, marginLeft+190, hguide+marginTOP*10);
      doc.line(marginLeft+0, hguide+marginTOP*11, marginLeft+190, hguide+marginTOP*11);
      doc.line(marginLeft+0, hguide+marginTOP*12, marginLeft+190, hguide+marginTOP*12);
      doc.line(marginLeft+0, hguide+marginTOP*13, marginLeft+190, hguide+marginTOP*13);


      doc.text(marginLeft, hguide+marginTOP*14, "ALERGIAS: SI");  
      doc.text(marginLeft+40, hguide+marginTOP*14, "NO");  
      doc.text(marginLeft+60, hguide+marginTOP*14, "A:");

      doc.line(marginLeft+29, hguide+marginTOP*14+1, marginLeft+39, hguide+marginTOP*14+1);
      doc.line(marginLeft+47, hguide+marginTOP*14+1, marginLeft+58, hguide+marginTOP*14+1);
      doc.line(marginLeft+65, hguide+marginTOP*14+1, marginLeft+190, hguide+marginTOP*14+1);


      doc.text(marginLeft, hguide+marginTOP*16, "VACUNACION");  
      doc.line(marginLeft+28, hguide+marginTOP*16+1, marginLeft+190, hguide+marginTOP*16+1);
    




      doc.text(marginLeft, hguide+marginTOP*18, "PRUEBA CITO-DIAGNOSTICO (CITOLOGIA)"); 


      doc.setFontType("normal");
      doc.setTextColor(0,0,0);
      doc.setFontSize(10);

      doc.text(marginLeft, hguide+marginTOP*19, "FECHA TOMA DE MUESTRA");  
      doc.text(marginLeft+72, hguide+marginTOP*19, "FECHA DE RESULTADO");
      doc.text(marginLeft+140, hguide+marginTOP*19, "RESULTADO");


      doc.line(marginLeft+47, hguide+marginTOP*19+1, marginLeft+70, hguide+marginTOP*19+1);
      doc.line(marginLeft+112, hguide+marginTOP*19+1, marginLeft+138, hguide+marginTOP*19+1);
      doc.line(marginLeft+162, hguide+marginTOP*19+1, marginLeft+190, hguide+marginTOP*19+1);


      doc.setFontSize(12);
      doc.setFontType("bold");
      var 
      _hfisico = hguide+marginTOP*22;
      doc.text(marginLeft, _hfisico, "EXAMEN FISICO Y RESUMEN MEDICO"); 
      Array.from(Array(7).keys()).map(i9=>{
        let _mTop = i9+1;
        doc.line(marginLeft+0, _hfisico+marginTOP*_mTop, marginLeft+190, _hfisico+marginTOP*_mTop);
      })

      

      doc.setFontSize(8);
      doc.setFontType("normal");
      doc.line(marginLeft+0, hguide+marginTOP*33, marginLeft+100, hguide+marginTOP*33);
      doc.text(marginLeft+30, hguide+marginTOP*33+3, "Nombre y Apellidos");  
      doc.text(marginLeft+30, hguide+marginTOP*34, "Doctor(a) que certifica");  


      doc.line(marginLeft+110, hguide+marginTOP*33, marginLeft+150, hguide+marginTOP*33);
      doc.text(marginLeft+126, hguide+marginTOP*33+3, "Firma"); 

      doc.line(marginLeft+160, hguide+marginTOP*33, marginLeft+190, hguide+marginTOP*33);
      doc.text(marginLeft+164, hguide+marginTOP*33+3, "Cuño del Doctor(a)");  




      doc.line(marginLeft+100, hguide+marginTOP*39, marginLeft+160, hguide+marginTOP*39);
      doc.text(marginLeft+14, hguide+marginTOP*39, "Cuño del Policlinico u Hospital al que pertenece");  



    }) 
  })    


    var ct22 = new Date()
    doc.save(`${title}_Kids_Asistencia_${ct22.getTime()}.pdf`);
  
  
  }
  


























  function parse_range_date(dt) {
    var date = !isNaN(dt)?new Date(parseInt(dt.toString())):new Date(); 
    var ws = new Date(date.setDate(date.getDate() + (0-date.getDay())));
    var we = new Date(date.setDate(date.getDate() + (6-date.getDay())));   
    return {
      "Iwk": `${ws.getMonth()+1}/${ws.getDate()}/${we.getFullYear()}`,
      "ewk": `${we.getMonth()+1}/${we.getDate()}/${we.getFullYear()}`,
    } 
  }
  


















  export function handlePdf_I864(){
    var dwk2work = {};
    var i2d = localStorage.getItem('wdp');
    if(Util.isJson(i2d)){
      dwk2work = JSON.parse(i2d); 
    }   
    var nR = 0;        
    var title = `Affidavit of Support Under Section 213A of the INA`
    
    var yguide = 15;
    var LImT = 6;
    var footerHeight = 160 + yguide    
    //200 max on portrait;
    const Pformat = localStorage.getItem('size-pdf-assistance') || 'letter';
    // 215.9 × 279.4 mm (Carta, vertical)
    // 'mm', [297, 210]
    var doc = new jsPDF({
      orientation: 'portrait',
      format:'letter'      
    })   
    

 

  // add custom font to file
 doc.addFont("ConsolasHex.ttf", "ConsolasHex", "Bold");





    doc.addFont('ComicSansMS', 'Comic Sans', 'normal');
    doc.addFont('Roboto.ttf', 'Roboto','normal');
    console.log(doc.getFontList())
  
    var Gname = '';
    [0].map((att,ii2)=>{      
      if(ii2>0){
        doc.addPage();
      }
      
      var numPages = [0];
  
  
    numPages.map(pg=>{

      var start = pg*LImT;
      var limit = start+LImT;
      var Klist = [];
     

      if(pg>0){
        doc.addPage();
      }

      var hguide = 35;
      
      // title 



    if(false){

      
      
      let v20 = Array.from(Array(220).keys());   
      v20.map(cl=>{
        if(cl%10===0){
          doc.setFontSize(10);
          doc.text(cl, 3, '|');
          doc.setFontSize(6);
          doc.text(cl, 5, (cl).toString());
        }else{
          doc.setFontSize(10);
          doc.text(cl, 1, '.');
        }
      })

      let v30 = Array.from(Array(300).keys());    
      v30.map(cl=>{
        if(cl%10===0){
          doc.setFontSize(10);
          doc.text(1,cl, '....');
          doc.setFontSize(6);
          doc.text(5, cl, (cl).toString());
        }else{
          doc.setFontSize(10);
          doc.text(1, cl, '.');
        }
      })

    }


      var title2 = `Department of Homeland Security`
  
      doc.setFont("Comic Sans");     
      //doc.setFont("ConsolasHex");
      doc.setFontSize(14);
      doc.setFontType("bold");
      doc.text(53, 15.5, title);
      doc.setFontSize(14);

      
      
      doc.setFontSize(11);
      doc.setFontType("bold");
      doc.text(79.4, 22, title2);

      var title3 = `U.S. Citizenship and Immigration Services`
  
      doc.setFontType("normal");
      doc.text(74.5, 26.6, title3);


      var UscisTop = 14;
      doc.setFontType("bold");
      doc.text(182.8, UscisTop, 'USCIS'); 
      doc.text(179, UscisTop+4.8, 'Form I-864 ');

      doc.setFontType("normal");
      doc.setFontSize(9);
      doc.text(175, UscisTop+8.8, 'OMB No. 1615-0075'); 
      doc.text(176, UscisTop+13, 'Expires 03/31/2020');

      var marginLeft = 10;
      var marginTOP = 6;
      var nn = 'Nombre y Apellidos del paciente';

      var DIRECTION = 'DIRECION PARTICULAR';


      doc.setFont("times");
      doc.setFontType("normal");
      doc.setTextColor(0,0,0);
      doc.setFontSize(10);
     
      
      doc.setLineWidth(2.05);
      doc.setDrawColor(0,0,0);

      var rightSquare = 12.6;


      doc.line(rightSquare, 29.8, 203, 29.8);


      doc.setLineWidth(0.20);

      doc.line(rightSquare, 32, 203, 32);


      doc.setLineWidth(0.35);

      var topHeaderTitle = 34; 
      var bottom = 68;


      doc.setDrawColor(224, 224, 224); 
      doc.setFillColor(224, 224, 224);  

      doc.rect(rightSquare,topHeaderTitle, 15.6, topHeaderTitle , 'F');

      doc.setDrawColor(0,0,0);
      doc.line(rightSquare, topHeaderTitle, 203, topHeaderTitle);
      doc.line(rightSquare, bottom, 203, bottom);

      doc.line(rightSquare, topHeaderTitle, rightSquare, bottom);
      doc.line(203, topHeaderTitle, 203, bottom);


     

      doc.setLineWidth(0.20);
      doc.line(28, topHeaderTitle, 28, bottom);
               


      
      doc.setFontType("bold");
      doc.text(17, topHeaderTitle + 11.5, 'For');
      doc.text(15, topHeaderTitle + 15.8, 'USCIS');
      doc.text(17, topHeaderTitle + 20, 'Use');
      doc.text(16.4, topHeaderTitle + 24, 'Only');
      // doc.line(5,205, 20, 20 , 5);

      
     

      doc.setLineWidth(0.20);
      doc.line(79, topHeaderTitle, 79, bottom);

      doc.line(141, topHeaderTitle, 141, bottom);








  doc.text(30, topHeaderTitle + 4, 'Affidavit of Support Submitter');



 

  var submitter = topHeaderTitle + 9;
  ['Petitioner','1st Joint Sponsor','2nd Joint Sponsor','Substitute Sponsor','5% Owner'].map((subm, In6)=>{
    doc.setFontType("normal");
    doc.setFontSize(10);
    doc.text(36, submitter + (In6 * 5.4) , subm);
  })


  doc.setFontType("bold");
  doc.text(93, topHeaderTitle + 4, 'Section 213A Review');


  doc.setFontType("normal");
  doc.text(85, topHeaderTitle + 9.6, 'MEETS');
  doc.text(110, topHeaderTitle + 9.6, 'DOES NOT MEET');

  doc.setFontSize(10);
  doc.text(85, topHeaderTitle + 13, 'requirements');
  doc.text(110, topHeaderTitle + 13, 'requirements');




    doc.setLineWidth(0.20);
    doc.line(79, topHeaderTitle + 17, 141, topHeaderTitle + 17);
    doc.line(102, topHeaderTitle + 21, 138, topHeaderTitle + 21);
    doc.line(92, topHeaderTitle + 26, 138, topHeaderTitle + 26);
    doc.line(111, topHeaderTitle + 31.5, 138, topHeaderTitle + 31.5);
    doc.setFontSize(10);
    doc.text(81, topHeaderTitle + 21, 'Reviewed By:');
    doc.text(81, topHeaderTitle + 26, 'Office:');
    doc.text(81, topHeaderTitle + 31.5, 'Date (mm/dd/yyyy):');



    doc.setFontType("bold");
    doc.text(144, topHeaderTitle + 4, 'Number of Support Affidavits in File');

    doc.line(141, topHeaderTitle + 13, 203, topHeaderTitle + 13);
    
    doc.text(143, topHeaderTitle + 17.5, 'Remarks');



      /*

      
      


      doc.text(marginLeft, hguide+marginTOP*2, 'FECHA DE NACIMIENTO');
      doc.text(marginLeft+130, hguide+marginTOP*2, 'EDAD');
      doc.text(marginLeft+160, hguide+marginTOP*2, 'SEXO');
      doc.line(marginLeft+42,hguide+marginTOP*2+1, marginLeft+128, hguide+marginTOP*2+1);
      doc.line(marginLeft+140,hguide+marginTOP*2+1, marginLeft+158, hguide+marginTOP*2+1);
      doc.line(marginLeft+170,hguide+marginTOP*2+1, marginLeft+190, hguide+marginTOP*2+1);


      doc.setDrawColor(0,0,0);
      doc.text(marginLeft, hguide+marginTOP*3, DIRECTION);
      doc.line(marginLeft+42,hguide+marginTOP*3+1, marginLeft+190, hguide+marginTOP*3+1);
      doc.line(marginLeft+0,hguide+marginTOP*4+1, marginLeft+190, hguide+marginTOP*4+1);



      doc.text(marginLeft, hguide+marginTOP*5, "CONSULTORIO MEDICO No");
      doc.line(marginLeft+46, hguide+marginTOP*5+1, marginLeft+190, hguide+marginTOP*5+1);


      doc.text(marginLeft, hguide+marginTOP*6, "POLICLINICO AL QUE PERTENECE");
      doc.line(marginLeft+58, hguide+marginTOP*6+1, marginLeft+190, hguide+marginTOP*6+1);



      doc.setFontSize(8);
      doc.setFontType("bold");
      doc.text(marginLeft, hguide+marginTOP*16+4, "(Se anexa carne de vacunacion del paciente)");  
      doc.text(marginLeft, hguide+marginTOP*19+4, "(Se anexa documento oficial cito-diagnostico del paciente)");  






      doc.setFontSize(12);
      doc.setFontType("bold");
      doc.text(marginLeft, hguide+marginTOP*7, "RESUMEN CLINICO ( PADECIMIENTOS Y TRATAMIENTOS )");      
      doc.line(marginLeft+0, hguide+marginTOP*8, marginLeft+190, hguide+marginTOP*8);
      doc.line(marginLeft+0, hguide+marginTOP*9, marginLeft+190, hguide+marginTOP*9);
      doc.line(marginLeft+0, hguide+marginTOP*10, marginLeft+190, hguide+marginTOP*10);
      doc.line(marginLeft+0, hguide+marginTOP*11, marginLeft+190, hguide+marginTOP*11);
      doc.line(marginLeft+0, hguide+marginTOP*12, marginLeft+190, hguide+marginTOP*12);
      doc.line(marginLeft+0, hguide+marginTOP*13, marginLeft+190, hguide+marginTOP*13);


      doc.text(marginLeft, hguide+marginTOP*14, "ALERGIAS: SI");  
      doc.text(marginLeft+40, hguide+marginTOP*14, "NO");  
      doc.text(marginLeft+60, hguide+marginTOP*14, "A:");

      doc.line(marginLeft+29, hguide+marginTOP*14+1, marginLeft+39, hguide+marginTOP*14+1);
      doc.line(marginLeft+47, hguide+marginTOP*14+1, marginLeft+58, hguide+marginTOP*14+1);
      doc.line(marginLeft+65, hguide+marginTOP*14+1, marginLeft+190, hguide+marginTOP*14+1);


      doc.text(marginLeft, hguide+marginTOP*16, "VACUNACION");  
      doc.line(marginLeft+28, hguide+marginTOP*16+1, marginLeft+190, hguide+marginTOP*16+1);
    




      doc.text(marginLeft, hguide+marginTOP*18, "PRUEBA CITO-DIAGNOSTICO (CITOLOGIA)"); 


      doc.setFontType("normal");
      doc.setTextColor(0,0,0);
      doc.setFontSize(10);

      doc.text(marginLeft, hguide+marginTOP*19, "FECHA TOMA DE MUESTRA");  
      doc.text(marginLeft+72, hguide+marginTOP*19, "FECHA DE RESULTADO");
      doc.text(marginLeft+140, hguide+marginTOP*19, "RESULTADO");


      doc.line(marginLeft+47, hguide+marginTOP*19+1, marginLeft+70, hguide+marginTOP*19+1);
      doc.line(marginLeft+112, hguide+marginTOP*19+1, marginLeft+138, hguide+marginTOP*19+1);
      doc.line(marginLeft+162, hguide+marginTOP*19+1, marginLeft+190, hguide+marginTOP*19+1);


      doc.setFontSize(12);
      doc.setFontType("bold");
      var 
      _hfisico = hguide+marginTOP*22;
      doc.text(marginLeft, _hfisico, "EXAMEN FISICO Y RESUMEN MEDICO"); 
      Array.from(Array(7).keys()).map(i9=>{
        let _mTop = i9+1;
        doc.line(marginLeft+0, _hfisico+marginTOP*_mTop, marginLeft+190, _hfisico+marginTOP*_mTop);
      })

      

      doc.setFontSize(8);
      doc.setFontType("normal");
      doc.line(marginLeft+0, hguide+marginTOP*33, marginLeft+100, hguide+marginTOP*33);
      doc.text(marginLeft+30, hguide+marginTOP*33+3, "Nombre y Apellidos");  
      doc.text(marginLeft+30, hguide+marginTOP*34, "Doctor(a) que certifica");  


      doc.line(marginLeft+110, hguide+marginTOP*33, marginLeft+150, hguide+marginTOP*33);
      doc.text(marginLeft+126, hguide+marginTOP*33+3, "Firma"); 

      doc.line(marginLeft+160, hguide+marginTOP*33, marginLeft+190, hguide+marginTOP*33);
      doc.text(marginLeft+164, hguide+marginTOP*33+3, "Cuño del Doctor(a)");  




      doc.line(marginLeft+100, hguide+marginTOP*39, marginLeft+160, hguide+marginTOP*39);
      doc.text(marginLeft+14, hguide+marginTOP*39, "Cuño del Policlinico u Hospital al que pertenece");  

 

    }) 
  })    


    var ct22 = new Date()
    doc.save(`${title}_Kids_Asistencia_${ct22.getTime()}.pdf`);
    /*
    if(Util.getBrowser().browser === `Edge` || Util.getBrowser().browser === `Internet Explorer` || Util.getBrowser().os === 'iPhone'){
      var ct22 = new Date()
      doc.save(`${Gname}_Kids_Asistencia_${ct22.getTime()}.pdf`);
    }
    else{
      doc.autoPrint();  // <<--------------------- !!
      window.open(doc.output('bloburl'), '_blank'); 
    }


    QP1A.190711.020.G965USQS7DTE1
    
  
  }
  

*/