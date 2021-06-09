import React, { useState } from 'react'

import { useDispatch, useSelector } from 'react-redux'


import {  CloseModal} 
from '../../../actions/common'

import * as _Util from '../../../store/Util';




const useObserveChanges = () => {

  const dispatch = useDispatch();  

  return { 
    dispatch
  }
}




const GraphsHR = (props) => {
  
  const [hoverLegend, sethoverLegend] = useState(0);

  const [hoverItm, sethoverItm] = useState(null);

  const [hoverLine, sethoverLine] = useState(null);
  const [month, setMonth] = useState(null);




  let _state = _Util.getStore();

  let graph_data = _state['YearResume'];

  
  let currentColor = "rgba(0,0,0,0.87)";

  currentColor = "#5f6368";


  let lineColor = "rgba(0,0,0,0.08)";

  let initX = 5;

  let filtersMov = _state["filtersMov"] || {}

  let year = filtersMov["year"];

 


  let box = document.getElementById("_graph_container");
  let dmzBx = box.getBoundingClientRect();


let colors ={106:"#00796b",201:"#1a73e8",202:"#B22222"}

let wW = dmzBx.width || 320 ;



  
  let ks = Array.from(Array(12).keys());

  let YaxisCount = Array.from(Array(4).keys());

  let YaxisHeight = 194;

  
  let X_factor = wW / ks.length;

  let maxV = maxValue(graph_data) *1.25;

  let minV = minValue(graph_data) *1.25;

  let y_Path_factor = YaxisHeight / (maxV-minV);

 


  const pointsLine = (i) => {
    var pnts = {};
    ks.map((mnt,ind)=>{
      let tmp = {};
      let x  = ind * X_factor + initX;
      tmp["month"] = mnt;
      tmp["points"] = {};
      graph_data && Object.keys(graph_data).map((tp,In1)=>{
        if(graph_data[tp][mnt]){
          tmp["points"][tp] = YaxisHeight + (minV*y_Path_factor) - ((graph_data[tp][mnt])*y_Path_factor);
        }else{
          tmp["points"][tp] = YaxisHeight + (minV*y_Path_factor);
        }
      })
      pnts[x]=tmp;
    })
    return pnts; 
  }


  let points_hovers = pointsLine();


  const handleLengendHoverOut = (i) => {
    if(hoverLegend){
      sethoverLegend(0)
      sethoverItm(null)
    }
  }

  const handleLengendItmHover = (i,itm) => {
   
    if(itm!==hoverItm){
      sethoverItm(itm);
      sethoverLegend(1);
    
    }
  }
  

  const createD_Path_Year = (g) => {
   
    var dPath = '';
    g && Object.keys(g).map((mnt,In2)=>{
      if(g[mnt]){
        let Yp = YaxisHeight + (minV*y_Path_factor)  - ((g[mnt])*y_Path_factor);
      
        let Xp = (In2*X_factor);  
        let Xvert = Xp.toFixed(2);
        let Yvert = Yp.toFixed(2); 
        if(In2===0){
          dPath += `M${Xvert} ${Yvert} L ${Xvert} ${Yvert} `;
        }else{
          dPath += `L ${Xvert} ${Yvert} `;
        }
      }
      else{
        let Yp = YaxisHeight + (minV*y_Path_factor);
      


        let Xp = (In2*X_factor);  
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
  


  const handleHover = (e) => {
    // grab the x-y pos.s if browser is NS
      let tempX = e.pageX;

      let g = document.getElementById("chart_hover_rect_resume_");
      let dmz = g.getBoundingClientRect();
      
      let xX = tempX - dmz.left;
      let select = 0;
      let rng = 10000;
      let month = 0;
      _Util.ObjectKeys(points_hovers).map((x,ind3)=>{
        let dd = xX - (x*1);
        dd=dd<0?dd*-1:dd;
        if(dd <= rng){
          rng = dd;
          select = (x*1);
          month = points_hovers[x]["month"];
        }
      })
      if(hoverLine!==select){
        sethoverLine(select);
        setMonth(month)
      }
      
  }

  
  const handleOutHover = (e) => {
    sethoverLine(null);
    setMonth(null)
  }


  return (
      <svg width={wW} height="300" id={"chart_resume_year"}>
        <g className="header"></g>
        <g className="chart-root" transform="translate(5, 5)">
          <g className="annotations-back" clip-path="url(#clip-rect)"></g>
          
          
          {/*******************  chart-group  ************************ */}


          <g className="chart-group" transform="translate(5, 0)">
            {_Util.ObjectKeys(graph_data).map((pnt,ind)=>{
              let dPath = createD_Path_Year(graph_data[pnt],YaxisHeight,X_factor,maxV)
              return(
                <path className={`line ${hoverLegend && hoverItm!==pnt?"translucent":"selected"}`}  clip-path="url(#clip-rect)" stroke={colors[pnt]} stroke-width="2" fill-opacity="0" d={dPath}/>
              )
             })}

          </g>

          {/******************* X-axis************************ */}


          <g className="x-axis" fill="none" font-size="10" font-family="sans-serif" text-anchor="middle" transform="translate(0, 195)">
              <path className="domain" stroke={currentColor} d="M0.5,6V0.5H936.5V6"></path>
              

            {ks.map((pnt,ind)=>{
             
              let xTr = ind * X_factor + initX;
              return(
                  <g className="tick" opacity="1" transform={`translate(${xTr}, 0)`}>
                    <line stroke={currentColor} y2="6"></line>
                    <text fill={currentColor} y="9" dy="0.71em" text-anchor="start">
                      <tspan x="0" dy="7">{""}</tspan>
                      <tspan x="0" dy="12">{_Util.monthsList_Short34[ind]}</tspan>
                    </text>
                  </g>
              )
            })}


              
              
              
          </g>
          
          {/******************* Y-axis ************************ */}

          <g className="y-axis" transform={`translate(${wW}, 0)`}  fill="none" font-size="10" font-family="sans-serif" text-anchor="start">
            <path className="domain" stroke={currentColor} d="M30,195.5H0.5V0.5H30"></path>


            {1 && YaxisCount.map((yax,ind)=>{
              let lbl = Math.floor(((maxV-minV) / YaxisCount.length) * ind);
              let xTr = (maxV - lbl) * y_Path_factor;
              return(
                <g className="tick" opacity="1" transform={`translate(0,${xTr})`}>
                  <line stroke={lineColor} x2="30"></line>
                  <text fill={currentColor} x="33" dy="0.32em" transform="translate(-2, -8)" className="anchor-right">{lbl}</text>
                </g>
              )
              
              
            })}
          </g>

        {/******************* y-axis-grid-line ************************ */}

            
          <g className="y-axis-grid-line" transform={`translate(${wW}, 0)`}  fill="none" font-size="10" font-family="sans-serif" text-anchor="start">
              {1 && YaxisCount.map((yax,ind)=>{
                // let xTr = YaxisHeight - ind * Y_factor;
                let lbl = Math.floor(((maxV-minV) / YaxisCount.length) * ind);
                let xTr = (maxV - lbl) * y_Path_factor;
                return(
                  <g className="tick" opacity="1" transform={`translate(0,${xTr})`}><line stroke={lineColor} x2={wW*-1}></line></g>
                )
              })}
          </g>


          {/******************* Y-axis ************************ */}



       







          


         

            {points_hovers[hoverLine]?
            <g class="hover-group" clip-path="url(#clip-rect)">
              <g class="hover">
                <path class="hover-line" d={`M${hoverLine},0L${hoverLine},195`} style={{visibility: "visible"}}></path>

                {_Util.ObjectKeys(points_hovers[hoverLine]["points"]).map(pnt=>{
                  return (
                    <g class="hover-point" transform={`translate(${hoverLine}, ${points_hovers[hoverLine]["points"][pnt]})`} style={{visibility: "visible"}}>
                      <circle r="3" style={{fill: colors[pnt],strokeOpacity: 0}} class="selected"></circle>
                    </g>
                  )
                })}
              </g>
            </g>
            :null}


          <g className="legend-0" onMouseLeave={()=>handleLengendHoverOut()}>
            <g className="legend" transform="translate(5, 255) " style={{width:  wW+"px"}}><defs></defs>
              
                <g>
                  <text className="label_head" cursor="default" y="0" x={17}>{points_hovers[hoverLine]?_Util.monthsList_Short34[month] + " "+ year:"Year "+year}</text>
                </g>

            {_Util.ObjectKeys(graph_data).map((pnt,ind)=>{
              let sum = sumValue(graph_data[pnt])
              
              sum = points_hovers[hoverLine]?graph_data[pnt][month]:sum;


              
              // console.log(month)
              // console.log(graph_data[pnt])  

              return(
                <g className="legend-entry line dimension-legend"    transform={`translate(${ind* 108}, 28)`}
                  //onMouseLeave={()=>handleLengendItmHover(1,pnt)}
                  onMouseOver={()=>handleLengendItmHover(2,pnt)}
                >
                <line stroke={colors[pnt]} className="line" stroke-linecap="round" stroke-width="2.5" y1="-3.8" y2="-3.8"
                 x1={1} x2={12}></line>
                <text className="label" cursor="default" y="0" x={17}>{_Util.translatetext(pnt)}</text>
                <text className={`total ${sum<0?"_red":""}`} cursor="default" y="23" x={17}>{sum?sum.toFixed(2):"0.00"}</text>
                <text className="date-comparison" cursor="default" y="23" x="123.15994262695312"></text>
                <rect className={`hover ${hoverLegend && hoverItm!==pnt?"translucent":""}`} y="-12" height="57" x="0" width="128.15994262695312"></rect>
              </g>
              )
             })}

              
              
            </g>
          </g>

           

          <rect class="hover-rect" width={wW} height={YaxisHeight} id={"chart_hover_rect_resume_"}
            onMouseMove={(e)=>handleHover(e)}
            onMouseOut={(e)=>handleOutHover(e)}  >
          </rect>


      </g>
    </svg>
    )
}


export default GraphsHR










function maxValue(g){
  var mx = 0;
  g && Object.keys(g).map((tp,In1)=>{
    Object.keys(g[tp]).map((mnt,In2)=>{
      if(mx< g[tp][mnt]){
        mx = g[tp][mnt];
      }
    })
  })
  return mx;
}


function minValue(g){
  var mx = 10000000000;
  g && Object.keys(g).map((tp,In1)=>{
    Object.keys(g[tp]).map((mnt,In2)=>{
      if(mx > g[tp][mnt]){
        mx = g[tp][mnt];
      }
    })
  })
  return mx;
}



function sumValue(g){
  var mx = 0;
  Object.keys(g).map((mnt,In2)=>{
    mx += g[mnt];
  })
  return mx;
}







