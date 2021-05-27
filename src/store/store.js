import { createStore, applyMiddleware } from 'redux'
import { composeWithDevTools } from 'redux-devtools-extension'


const initialState = {
  lastUpdate: 0,
  light: false,
  count: 0,
  listBezel: {},  
  operations:null,
  data: {},  
  forms: {},
  observeChanges:0,
  observeImage:0
}






const reducer = (state = initialState, action) => {
  switch (action.type) {    
    case "UPD_KEY_VALUE":
      return {
          ...state,
          [action.kv.key]: action.kv.value
      };
    default:
      return state
  }
}

export const initializeStore = (preloadedState = initialState) => {
  return createStore(
    reducer,
    preloadedState,
    composeWithDevTools(applyMiddleware())
  )
}

