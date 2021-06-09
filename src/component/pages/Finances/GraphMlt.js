import React, { Component } from 'react';
import './style.css';


import * as Util from '../../state/Util';
import { retrieveDialogObserve } from '../../state/dialogActions';

/*
const monthsList_Short =[`Jan`,`Feb`,`Mar`,`Apr`,`May`,`Jun`,`Jul`,`Aug`,`Sep`,`Oct`,`Nov`,`Dec`];
*/


export  class GraphMultiLine extends Component {

  constructor(props) {
    super(props);  
    this.state = {        
      key:0,
      id:Util.gen6CodeId(),
      idGraph:Util.generateUUID(),
      activeGraphtab:0,
      activeGraphLine:null,
      hoverDotActive:null,
      hoverDotIndexActive:null
    };
  }


  activeGraphtab(i){
    this.setState({activeGraphtab:i});
   }


   ref2 = (r) =>{
     this.graphContainer = r; 
   }


   activeGraphLine(i){
    this.setState({activeGraphtab:i});
   
   }
   

   onMouseMoveHandle(e,i){
    var x = e.clientX;
    var yy =  (x - (e.target.getBoundingClientRect().left)) + 32;
    this.setState({hoverPosition:yy});
    


    //console.log(x,yy)
   }
   



   downloadMetric(e,i){
      var svg = document.getElementById(this.state.idGraph);
      const url = getSvgUrl(svg);
      //svg2img(svg);
      
      svgUrlToPng(url, (imgData) => {
        console.log(imgData)
          //callback(imgData);
          URL.revokeObjectURL(url);
      });
      

   }

   onMouseOutHandle(e,i){
    //this.setState({hoverPosition:null});
    var toElement = e.toElement || e.relatedTarget || e.target;
    var _Elmm = document.getElementById(this.state.id);   
    if(_Elmm.contains(toElement)){
      if(toElement.className.baseVal !== "brush-marker"){      
        this.setState({hoverPosition:null});
      }
    }
    if(_Elmm.contains(toElement)){
      if(toElement.className.baseVal !== "path_line"){      
        this.setState({hoverPosition:null});
      }
    }
   }


   
   onMouseMovePathHandle(e,i){
    this.setState({hoverDotActive:e});
   }

   onMouseOutPathHandle(e,i){
    this.setState({hoverDotActive:null,hoverDotIndexActive:null});
    /*
    var toElement = e.toElement || e.relatedTarget || e.target;
    var _Elmm = document.getElementById(this.state.id);   
    if(_Elmm.contains(toElement)){ 
      if(toElement.className.baseVal !== "brush-marker"){      
        this.setState({hoverDotActive:null});
      }
    }
    */
   }

   onMouseMoveDotsHandle(e,i){
    this.setState({hoverDotActive:e,hoverDotIndexActive:i});
   }

   onMouseOutDotsHandle(e,i){
    this.setState({hoverDotActive:null});
    /*
    var toElement = e.toElement || e.relatedTarget || e.target;
    var _Elmm = document.getElementById(this.state.id);   
    if(_Elmm.contains(toElement)){ 
      if(toElement.className.baseVal !== "brush-marker"){      
        this.setState({hoverDotActive:null});
      }
    }
    */
   }

  render() {

    
    const {graph,axleX,margin,WidthGraph,HeightGraph} = this.props;   
    
    const {hoverPosition} = this.state;

    var Wgraph = 320;
    var Hgraph = 300;
    
    if(WidthGraph){
      Wgraph = WidthGraph;
    }
    if(HeightGraph){
      Hgraph = HeightGraph;
    }
    if(!WidthGraph && this.graphContainer){
      let parentDimention = this.graphContainer.parentNode.getBoundingClientRect()   
      Wgraph = parentDimention.width;     
    }
    if(!HeightGraph && this.graphContainer){
      let parentDimention = this.graphContainer.parentNode.getBoundingClientRect()     
       Hgraph = parentDimention.height;
    }

    var l = Object.keys(graph).length;
    

    var Xgraph = 32;
    var _max = sumMaxMultiData(graph);
    var _min = sumMinMultiData(graph);
    var range = l>0?_max-_min===0?null:_max-_min:null;
    var limitY = 6;
    const Moneys = range>0?createAmmountList(_max,_min,limitY,Hgraph):null;
    var brushI = Moneys?Moneys.length*(Hgraph/limitY)-55:1;
    var YbyUnit = (26*8)/range;    
    var xX2 = ((Hgraph-30)/limitY+1);
    var xIn3 = xX2 + 28+40;
    var xX_Range = ((Hgraph-xIn3)/range);


    return (
          <div  className={'_graphHRM_'}  ref={this.ref2} style={{width: `${Wgraph+20}px`}} aria-label="Un gráfico."  id={`${this.state.id}`}>
            <svg width={Wgraph+20} height={Hgraph} aria-label="Un gráfico." style={{overflow: 'hidden'}}   id={`${this.state.idGraph}`} xmlns="http://www.w3.org/2000/svg">
              {/*   */}
              <defs id="_ABSTRACT_RENDERER_ID_32"><clipPath id="_ABSTRACT_RENDERER_ID_33"><rect x={Xgraph} y="45" width={Wgraph} height={Hgraph}></rect></clipPath></defs>
             
              <g  transform={`translate(0,${(xX2)*-1.6})`}>
              {hoverPosition?
              <g  className="brush" style={{pointerEvents: "none"}} transform={`translate(${hoverPosition},${(xX2)})`}>
                <path className="brush-marker" style={{strokeWidth: 2}} width="2" height={Hgraph}  d={`M0,${(Hgraph/limitY)} L0,${brushI}`}>
                </path>
                <circle  className="brush-marker" cy={brushI+15} cx="0" r="4"
                fill="white" stroke="black"
                //onmouseover="evt.target.setAttribute('r', '72');"
                //onmouseout="evt.target.setAttribute('r', '59');"
                />
              </g>
             :null}
               {/* <rect x={Xgraph} y="45" width={Wgraph} height="210" stroke="none" strokeWidth="0" fillOpacity="0" fill="transparent"></rect> */}
                <g clipPath="">
                  <g>
                  {Moneys && Moneys.map((mn,In2)=>{
                    var xX = (In2*xX2);
                    var xIn = xX + 46;
                    let colorFill =  In2%2===0?"#d6d6d6":"#efefef";     
                    var xInText = xX + 55;  
                    let colorFillText =  mn>=0?"#9e9e9e":"#c62828";
                    let _label = mn;
                    if(_max<20){
                      _label = In2%2===0?mn:""; 
                    }
                      return(
                        <g key={In2}>
                          <text textAnchor="middle" x={'15'} y={xIn} fontFamily="Arial" fontSize="9" stroke="none" strokeWidth="0" fill={colorFillText}>{_label}</text>
                          <rect x={Xgraph} y={xIn} width={Wgraph} height="1" stroke="none" strokeWidth="0" fill={colorFill} key={In2}></rect>  
                        </g>                  
                      )
                  })} 
                  
                  </g>                  
                  
                </g>

                <g>


                </g>
                <g>
                  {axleX && axleX.map((mnt,In2)=>{ 
                    return(
                      <g key={In2}>
                        <text textAnchor="middle" x={mnt.x} y={Hgraph+40} fontFamily="Arial" fontSize="10" stroke="none" strokeWidth="0" fill="#9e9e9e">{mnt.label}</text>
                      </g>
                    )
                  })}

                  {/*false && Moneys.map((mn,In2)=>{
                    var xIn = (In2*26)+50;  
                    let colorFill =  mn>=0?"#9e9e9e":"#c62828";                
                      return(
                        <g key={In2}>
                          <text textAnchor="middle" x={'15'} y={xIn} fontFamily="Arial" fontSize="9" stroke="none" strokeWidth="0" fill={colorFill}>{mn}</text>
                        </g>
                      )
                  })
  <g  transform={`translate(0,${(xIn3)*0.15})`}   transform={`translate(0,${(xX2)*-1.6})`}>

                */}                 
                    
                </g>              
                  
                </g>
                <rect  className="overlayGraph"  x={Xgraph} y="0" width={Wgraph} height={Hgraph} stroke="none" strokeWidth="0" fill="transparent"  onMouseMove={this.onMouseMoveHandle.bind(this)} onMouseOut={this.onMouseOutHandle.bind(this)}></rect>
                <g  transform={`translate(0,${(xX2)*-1.6})`}>
                
                {Object.keys(graph).map((grphData,i2nd) =>{
                      if(graph[grphData]){
                        //YbyUnit = Hgraph/range;
                        
                        let dPath = createD_Path_List_Year(graph[grphData]['data'],xX_Range,_max,axleX,margin,Wgraph,Hgraph);
                        let pods = create_pods_List_Year(graph[grphData]['data'],xX_Range,_max,axleX,margin,Wgraph,Hgraph);   
                        
                        var stroke_dasharray = null;
                        var strokeWidth = 2;
                        var fillOpacity=0.65;
                        var strokeOpacity=0.65
                        if(this.state.hoverDotActive){
                          if(this.state.hoverDotActive===grphData){
                            strokeWidth = 4;
                            fillOpacity=1
                            strokeOpacity = 1;
                          }
                          else{                          
                            strokeWidth = 1;
                            //strokeOpacity = 0.1;
                          }
                        }
                        
                        var _style =   {stroke:graph[grphData]['color'],fill:graph[grphData]['color']}

                       
                        if(this.state.hoverDotActive){
                          if(this.state.hoverDotActive===grphData){
                           
                            fillOpacity=1;
                            strokeOpacity = 1;
                          }
                          else{                          
                         
                            //strokeOpacity = 0.1;
                            //fillOpacity=0.1
                          }
                        }
                        
                        return (
                          <g  key={`grphData_${grphData}`}  transform={`translate(0,${(xIn3)*0.79})`}  >
                            <path d={dPath} strokeWidth={strokeWidth} strokeOpacity={strokeOpacity} fillOpacity={fillOpacity} fill="none" style={{stroke:graph[grphData]['color']}} strokeDasharray={stroke_dasharray} onClick={this.activeGraphLine.bind(this,i2nd)}
                                onMouseMove={this.onMouseMovePathHandle.bind(this,grphData)} onMouseOut={this.onMouseOutPathHandle.bind(this,grphData)}
                              className={'path_line'}
                            ></path>
                            {
                                pods.map((pod,Indp2)=>{                                  
                                  if(this.state.hoverDotActive===grphData && this.state.hoverDotIndexActive === Indp2){
                                    _style =   {stroke:graph[grphData]['color'],fill:graph[grphData]['color']}                                   
                                    fillOpacity=1;
                                    strokeOpacity = 1;
                                    return (
                                      <g  key={`grphData_dot_${Util.gen6CodeId()}`}>
                                        <circle  className="brush-marker" cy={pod.y} cx={pod.x} r={4.5} fillOpacity={fillOpacity} strokeOpacity={0.25} style={{stroke:'rgb(0,0,0)',fill:'none'}} onClick={this.downloadMetric.bind(this,i2nd)}
                                          onMouseMove={this.onMouseMoveDotsHandle.bind(this,grphData,Indp2)} onMouseOut={this.onMouseOutDotsHandle.bind(this,grphData)}
                                        />
                                        <circle  className="brush-marker" cy={pod.y} cx={pod.x} r={5.5} fillOpacity={fillOpacity} strokeOpacity={0.1} style={{stroke:'rgb(0,0,0)',fill:'none'}} onClick={this.downloadMetric.bind(this,i2nd)}
                                        onMouseMove={this.onMouseMoveDotsHandle.bind(this,grphData,Indp2)} onMouseOut={this.onMouseOutDotsHandle.bind(this,grphData)}
                                        />
                                        <circle  className="brush-marker" cy={pod.y} cx={pod.x} r={6.5} fillOpacity={fillOpacity} strokeOpacity={0.05} style={{stroke:'rgb(0,0,0)',fill:'none'}} onClick={this.downloadMetric.bind(this,i2nd)}
                                          onMouseMove={this.onMouseMoveDotsHandle.bind(this,grphData,Indp2)} onMouseOut={this.onMouseOutDotsHandle.bind(this,grphData)}
                                        />
                                        <circle  className="brush-marker" cy={pod.y} cx={pod.x} r={4} fillOpacity={fillOpacity} strokeOpacity={strokeOpacity} style={{stroke:'none',fill:graph[grphData]['color']}} onClick={this.downloadMetric.bind(this,i2nd)}
                                          onMouseMove={this.onMouseMoveDotsHandle.bind(this,grphData,Indp2)} onMouseOut={this.onMouseOutDotsHandle.bind(this,grphData)}
                                        />
                                      </g>
                                    )
                                  }else{
                                    _style =   {stroke:'transparent',fill:'transparent'}                                   
                                    strokeOpacity = 0.1;
                                    fillOpacity=0.1
                                    return (
                                      <circle  key={`grphData_dot_${Util.gen6CodeId()}`} className="brush-marker" cy={pod.y} cx={pod.x} r={4} fillOpacity={fillOpacity} strokeOpacity={strokeOpacity} style={_style} onClick={this.downloadMetric.bind(this,i2nd)}
                                        onMouseMove={this.onMouseMoveDotsHandle.bind(this,grphData,Indp2)} onMouseOut={this.onMouseOutDotsHandle.bind(this,grphData)}
                                      />
                                    )
                                  }                                  
                                })
                            }
                          
                          </g>
                        )
                      }else{
                        return null
                      }
                      
                    })                                       
                    }
                  
                </g>
                </svg>
            </div>
    );
  }
}



function createD_Path_List_Year(g,YbyUnit,max,axleX,margin,_width){

  var dPath = '';
  Object.keys(g).map((_day,In2)=>{
    if(g[_day]){   
      let Yp = (max-g[_day])*YbyUnit;
      let multiplier = (_width-margin)/axleX.length;
      let Xp = (In2*multiplier)+margin;  
      let Xvert = Xp.toFixed(2);
      let Yvert = Yp.toFixed(2); 
      if(In2===0){
        dPath += `M${Xvert} ${Yvert} L ${Xvert} ${Yvert} `;
      }else{
        dPath += `L ${Xvert} ${Yvert} `;
      }
    }else{
      let Yp = (max)*YbyUnit+46;

      let multiplier = (_width-margin)/axleX.length;
      let Xp = (In2*multiplier)+margin;   
      let Xvert = Xp.toFixed(2);
      let Yvert = Yp.toFixed(2);        
      if(In2===0){
        dPath += `M${Xvert} ${Yvert} L ${Xvert} ${Yvert} `;
      }else{
        dPath += `L ${Xvert} ${Yvert} `;
      }
    }   
  })
  return dPath;
}





function svg2img(svg){
  var xml = new XMLSerializer().serializeToString(svg);
  var svg64 = btoa(xml);
  var b64start = 'data:image/svg+xml;base64,';
  var image64 = b64start + svg64;
  return image64;
};



function getSvgUrl(svg) {
  var svgString = new XMLSerializer().serializeToString(svg);
  var svgBlob = new Blob([svgString], {type: "image/svg+xml;charset=utf-8"});
  return  URL.createObjectURL(svgBlob);
}



function svgUrlToPng(svgUrl, callback) {
    const svgImage = document.createElement('img');
    //svgImage.setAttribute("hidden",true);
    // imgPreview.style.position = 'absolute';
    // imgPreview.style.top = '-9999px';
    document.body.appendChild(svgImage);
    svgImage.onload = function () {
        const canvas = document.createElement('canvas');
        canvas.width = svgImage.clientWidth;
        canvas.height = svgImage.clientHeight;
        const canvasCtx = canvas.getContext('2d');
        canvasCtx.drawImage(svgImage, 0, 0);
        const imgData = canvas.toDataURL('image/png');
        callback(imgData);
        document.body.removeChild(svgImage);
    };
    svgImage.src = svgUrl;
 }





function create_pods_List_Year(g,YbyUnit,max,axleX,margin,_width){
  var _pods = [];
  Object.keys(g).map((_day,In2)=>{
    if(g[_day]){   
      let Yp = (max-g[_day])*YbyUnit;
      let multiplier = (_width-margin)/axleX.length;
      let Xp = (In2*multiplier)+margin;  
      let Xvert = Xp.toFixed(2);
      let Yvert = Yp.toFixed(2);
      _pods.push({x:Xvert,y:Yvert})
    }else{
      let Yp = (max)*YbyUnit+46;
      let multiplier = (_width-margin)/axleX.length;
      let Xp = (In2*multiplier)+margin;   
      let Xvert = Xp.toFixed(2);
      let Yvert = Yp.toFixed(2);        
      _pods.push({x:Xvert,y:Yvert})
    }   
  })
  return _pods;
}




function sumMaxMultiData(g){
  var _max = 0; 
  Object.keys(g).map(dys=>{
    var list = g[dys] && g[dys]['data'];    
    list && Object.keys(list).map(wk=>{
      if(list[wk]){        
        let _import = list[wk];
        if(_import>_max){
          _max = _import;
        }
      }
    })
  })  
  return _max;
}

function sumMinMultiData(g){
  var _min = 1000000000;
    Object.keys(g).map(dys=>{
      var list = g[dys] && g[dys]['data'];
      list && Object.keys(list).map(wk=>{        
          let _import = list[wk];
          if(_import<_min){
            _min = _import;
          }
        
      })
    })  
    return _min;
  }







function createAmmountList(max,min,limit){  
  var y = [];
  var range = max-min;
  if(range!==0){
    let mtl = range/limit;
    for(let i=0;i<=limit;i++){
      if(mtl){
        y.push(Math.floor(max-(mtl*i)));
      }
    }
  }else{
    let mtl = Math.ceil(max*2/limit);
    for(let i=0;i<=limit;i++){
      if(mtl){
        y.push(Math.floor(max*2-(mtl*i)));
      }
    }
  }
   
 return y;
}

/*
function createXAxleList(g){
  var y = [];
  var Index0 = Object.keys(g)[0];  
  var list = g[Index0] && g[Index0]['data'];
  list && Object.keys(list).map((mnt,In2)=>{
      var xIn = (In2*27)+30;     
      var wdate = Util.getWeekDate(parseInt(mnt));
      var _label_ = In2%2==0?wdate.getTime()>(new Date()).getTime()?'':`${monthsList_Short[wdate.getMonth()]}, ${wdate.getDate()}`:'';     
      y.push({x:xIn,label:_label_})
  }) 
  return y;
}
*/


/*




<mat-grid-tile class="mat-grid-tile ng-star-inserted" rowspan="1" colspan="1" style="left: calc((50% - 0.5px + 1px) * 1); width: calc((50% - 0.5px) * 1 + 0px); top: calc(702px); height: calc(350px);"><figure class="mat-figure"><div class="cfc-width-full" style="height: 340px;"><div class="cfc-flex-container cfc-container-item"><h3>Latencia general</h3><div class="cfc-container-item cfc-flex-grow-content cfc-align-right"><button acetooltip="Descargar CSV" mat-icon-button="" class="mat-icon-button mat-button-base ace-tooltip-disable-user-select-on-touch-device" aria-label="Botón para descargar el&nbsp;CSV de Latencia general"><span class="mat-button-wrapper"><ace-icon class="ace-icon ace-icon-size-small ace-icon-download" icon="download"><!----><mat-icon class="mat-icon notranslate mat-icon-no-color ng-star-inserted" role="img" aria-hidden="true">


<svg width="100%" height="100%" viewBox="0 0 18 18" fit="" preserveAspectRatio="xMidYMid meet" focusable="false">

<path d="M3 14h12v2H3v-2zm6-1l6-7H3l6 7zM7 2h4v4H7V2z" fill-rule="evenodd"></path>

</svg></mat-icon><!----><!----><!----></ace-icon></span><div class="mat-button-ripple mat-ripple mat-button-ripple-round" matripple=""></div><div class="mat-button-focus-overlay"></div></button></div></div><ac-dashboard-chart legendtype="inline" _nghost-hfa-c83=""><div _ngcontent-hfa-c83="" class="chart-container"><!----><div _ngcontent-hfa-c83=""><ac-chart _ngcontent-hfa-c83=""><!----><!----><ac-line-chart _nghost-hfa-c98="" class="ng-star-inserted"><!----><!----><!----><div _ngcontent-hfa-c98="" class="chart-container" jslog="84054"><!----><!----><!----><!----><!----><div _ngcontent-hfa-c98="" class="band-container ng-star-inserted"><!----></div><div _ngcontent-hfa-c98="" class="band-container ng-star-inserted"><!----></div><div _ngcontent-hfa-c98="" class="band-container ng-star-inserted"><!----></div><!----><!----><!----><!----><!----><div _ngcontent-hfa-c98="" style="width:100%"><div _ngcontent-hfa-c98="" class="chart sd-chart-base-chart sd-chart-base sd-2d-chart sd-line-chart" role="group" jslog="68528;track:impression" style="height: 200px;" aria-labelledby="ac-chart-17-labelledby" aria-describedby="ac-chart-17-describedby" tabindex="0"><!----><span _ngcontent-hfa-c98="" class="ac-chart-a11y-label ac-screen-reader-only-content ng-star-inserted" id="ac-chart-17-first-leapfrog-label" tabindex="-1" style="left: 0px; top: 0px;"></span><span _ngcontent-hfa-c98="" class="ac-chart-a11y-label ac-screen-reader-only-content ng-star-inserted" id="ac-chart-17-second-leapfrog-label" tabindex="-1" style="left: 0px; top: 0px;"></span><!----><!----><div class="sd-chart-base-axis ac-scale-linear" style="position: absolute; top: 0px; left: 0px;"><canvas class="sd-chart-base-axis-canvas" width="2238" height="400" style="height: 200px; width: 1119px;"></canvas></div><div class="underlay" style="position: absolute; top: 10px; left: 10px;"><div class="mode-underlay" style="position: absolute; top: 0px; left: 0px;"></div><div class="areafill" style="position: absolute; top: 0px; left: 0px;"></div><div class="areafill-selected" style="position: absolute; top: 0px; left: 0px;"></div></div><div class="content" style="position: absolute; top: 10px; left: 10px;"><div class="tile" style="position: absolute; top: 0px; left: 0px;"><div class="fill-tile"><canvas width="2098" height="360" style="height: 180px; width: 1049px;"></canvas></div></div><div class="lines" style="position: absolute; top: 0px; left: 0px;"><div class="buffered-image"><canvas width="2098" height="362" style="height: 181px; width: 1049px; opacity: 1;"></canvas></div></div></div><div class="overlay" style="position: absolute; top: 10px; left: 10px;"></div><svg><g transform="translate(10, 10)"><defs><clipPath id="graph-clip9"><rect width="1049" height="181"></rect></clipPath><linearGradient id="svg-def-9-snap-threshold-gradient"><stop offset="0%" stop-color="black" stop-opacity="0"></stop><stop offset="100%" stop-color="black" stop-opacity="0.2"></stop></linearGradient></defs>

<g class="threshold"></g><g class="infoOverlay" style="clip-path: url(&quot;#graph-clip9&quot;);"></g><g class="brush" style="pointer-events: none;">

<path class="brush-marker" style="stroke-width: 2;" width="2" height="180" transform="translate(180.99999828246385,0)" d="M0,0L0,180"></path></g>
<g class="selected" style="clip-path: url(&quot;#graph-clip9&quot;); pointer-events: none;"></g></g></svg></div><div _ngcontent-hfa-c98="" class="ac-screen-reader-only-content" id="ac-chart-17-labelledby">
<p _ngcontent-hfa-c98="">Line chart</p><p _ngcontent-hfa-c98="">X-axis from 10:00 to 14:00, Y-axis from 0 to 2,5s</p><!----><!----></div><div _ngcontent-hfa-c98="" class="ac-screen-reader-only-content" id="ac-chart-17-describedby">  </div></div></div></ac-line-chart><!----><!----><!----></ac-chart><ac-timeline _ngcontent-hfa-c83="" _nghost-hfa-c93=""><div _ngcontent-hfa-c93="" class="timeline-wrapper"><!----><div _ngcontent-hfa-c93="" class="timeline sd-chart-base-timeline sd-chart-base sd-time-legend" with-lines="true" style="height: 20px;"><svg><g transform="translate(10, 0)"><g class="brush"><g class="brush-marker"><circle cx="180.99999828246385" cy="15" class="range-start" r="5"></circle></g><g class="brush-marker"></g></g></g></svg><div style="position: absolute;"><canvas width="2238" height="40" style="height: 20px; width: 1119px;"></canvas></div></div></div></ac-timeline></div><!----><div _ngcontent-hfa-c83="" class="legend-container ng-star-inserted"><!----><!----><ac-inline-legend _ngcontent-hfa-c83="" _nghost-hfa-c95="" class="ng-star-inserted"><div _ngcontent-hfa-c95="" class="ac-inline-legend"><!----><div _ngcontent-hfa-c95="" class="ac-inline-legend-items ng-star-inserted"><!----><div _ngcontent-hfa-c95="" class="ac-inline-legend-item ng-star-inserted" style="color: currentcolor;"><span _ngcontent-hfa-c95=""><span _ngcontent-hfa-c95="" class="ac-inline-legend-chip" style="background-color: rgb(124, 179, 66);"></span> p50: </span><span _ngcontent-hfa-c95="" class="ac-legend-value"> 49ms </span></div></div><div _ngcontent-hfa-c95="" class="ac-inline-legend-items ng-star-inserted"><!----><div _ngcontent-hfa-c95="" class="ac-inline-legend-item ng-star-inserted" style="color: currentcolor;"><span _ngcontent-hfa-c95=""><span _ngcontent-hfa-c95="" class="ac-inline-legend-chip" style="background-color: rgb(255, 87, 34);"></span> p95: </span><span _ngcontent-hfa-c95="" class="ac-legend-value"> 64ms </span></div></div><div _ngcontent-hfa-c95="" class="ac-inline-legend-items ng-star-inserted"><!----><div _ngcontent-hfa-c95="" class="ac-inline-legend-item ng-star-inserted" style="color: currentcolor;"><span _ngcontent-hfa-c95=""><span _ngcontent-hfa-c95="" class="ac-inline-legend-chip" style="background-color: rgb(170, 70, 187);"></span> p99: </span><span _ngcontent-hfa-c95="" class="ac-legend-value"> 65ms </span></div></div></div></ac-inline-legend></div><!----><ac-legacy-hovercard _ngcontent-hfa-c83="" _nghost-hfa-c96="" class="ng-star-inserted"><div _ngcontent-hfa-c96="" class="chart sd-chart-base-chart sd-chart-base sd-chart-base-hovercard" style="height: auto !important; left: 1601px; right: auto; top: 344px; bottom: auto;"><table><thead><tr><td colspan="2" class="datetime">ene. 20, 2020 15:12</td><td></td><td></td></tr></thead><tbody class="list"><tr><td class="key"><span><i class="icon" style="background-color: rgb(124, 179, 66);"> </i></span></td><td class="name">p50</td><td class="value">60ms</td><td class="value2"></td></tr><tr><td class="key"><span><i class="icon" style="background-color: rgb(255, 87, 34);"> </i></span></td><td class="name">p95</td><td class="value">123ms</td><td class="value2"></td></tr><tr><td class="key"><span><i class="icon" style="background-color: rgb(170, 70, 187);"> </i></span></td><td class="name">p99</td><td class="value">129ms</td><td class="value2"></td></tr></tbody></table></div></ac-legacy-hovercard></div></ac-dashboard-chart></div></figure></mat-grid-tile>


*/