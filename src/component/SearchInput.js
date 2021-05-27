
import React, { useEffect, useState } from 'react'

import loadable from '@loadable/component'

import * as _Util from '../store/Util'

import './_styles.css';


const Icon2 = loadable(() => import('./Icons'))


const SearchProdComponent = (props) => {

  const {
    placeholderCode
  } = props;
  

  const [initialize, setInitialize] = useState(false);
  const [txt, settxt] = useState("");



  useEffect(() => {
    
    if(!initialize){
      setInitialize(true);
    }
  })

  const handleInput = (v) => {
    settxt(v.target.value)
    if(typeof props.updChanges === "function"){
      props.updChanges(v.target.value);
    }
  }

  const clearTx = (v) => {
    settxt("");
    document.getElementById("SREsRA").value = "";
    if(typeof props.updChanges === "function"){
      props.updChanges("");
    }
  }



  let isOpen = false;

  return (


    <div jsname="gLFyf" className={`z86TMb ${isOpen?"FNFY6c":""}`}>
      <button jscontroller="AQajld" className="FrV7Ge" type="button" jsname="Tg7LZd" aria-label="Buscar con Google" jsaction="click:h5M12e;" data-ved="2ahUKEwjItuj_yoPwAhUL8bMKHT_FCnAQuukFegQIARAT">
        <div className="kzJn9c">
          <span className="Vx3Zn" jsname="tqj7rb">
            <Icon2 name={`search`} />
          </span>
        </div>
      </button>
      <input className="r7gAOb yyJm8b" 
        maxlength="2048" 
        id="SREsRA" 
        name="q" 
        type="text" 
        aria-autocomplete="both" 
        aria-haspopup="false" 
        autocapitalize="off" 
        autocomplete="off" 
        autocorrect="off" 
        spellcheck="false" 
        placeholder={_Util.translatetext(placeholderCode)}
        onChange={handleInput}

      />
      <button jscontroller="wa5kIf" className="hxXCL" type="button" jsname="RP0xob" jsaction="click:AVsnlb;" style={{visibility:txt.length>0?"":"hidden"}} data-ved="2ahUKEwjItuj_yoPwAhUL8bMKHT_FCnAQ5p4GegQIARAU" jslog="102246;ved:2ahUKEwjItuj_yoPwAhUL8bMKHT_FCnAQ5p4GegQIARAU;track:click">
        <span aria-label="Borrar búsqueda" onClick={clearTx} >×</span>
      </button>
    </div>
  )

}



export default SearchProdComponent;