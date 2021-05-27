const express = require('express');
const app = express();
const request = require('request');
const _fs$$_ = require('fs');


///    sudo mitmdump -p 5891 --set block_global=false -s /home/ubuntu/proxy/addon.py


const _Util = require('./Utils');

const monthsList_Short =[``,`Jan`,`Feb`,`Mar`,`Apr`,`May`,`Jun`,`Jul`,`Aug`,`Sep`,`Oct`,`Nov`,`Dec`];



var _PORT_ = 4082


var ActiveUser = "AERIPDL22YQ5C5R2UFI6T3FIQ3FA"


var prX = {"token":"Atna|EwICIO8rXlukarn1QSOWEW4ND9hRTvqYzeKye_Pm6y06MN4nZirNnHJYnPQSNhecsHZuo137qubzgq_U0JZz9ucOgCXHJOwklNEuiVRR2v3ZeiFM3OXkj-15rTOYjDdSi24ctBHL9u5fzCB8AKcyoztZo-O8YMxMqjflv2TBBwIF6AxM8oIMlfR1c4pjajd_XpMLz-nPowbiMj07--K_cx5zlJjPncIY9O27VJQyJAUnOS4RURcRjliVUIlk5DO48OT90PuCrVm5qml8jyIKYkWXCS5MhEXGXnhZmv4gnVtTChDTT6V0OpiF9_dAd3XTJGz-IUFyNOCsVDJEkGnjv3pQALUNvr9MXrzGFykGDJZCPWnBoQ","email":"dailynpineragallardo@gmail.com","phoneNumber":"+13059866785","isActive":{"active":true,"expire":1581138000000,"msg":""},"port":4082,"region":"01551827-aabe-4692-b386-86ab5e0e8653","serviceAreaIds":["08a38a1c-a2b7-47b3-beb9-9f376b58e45f"],"frBsToken":"cupoK3g2hkY:APA91bGGBwefkFV3TLWqkEhr4YDEgPTJs1XQDhGbkfWV7en90wVipdnARe-2K6iPkbK0qcwoKAbH4w2Znimo0cIb_ayzoQzp01fsl6lfnXdGzfdPrdPEhH7gO2Av5leUN7R8F66JkoQ6","isValidToken":true}


var user_agent  = 'iOS/11.0.1 (iPhone Darwin) Model/iPhone Platform/iPhone9,1 RabbitiOS/2.15';


var FLEX_INSTANT_OFFER = 0;

var FLEX_EXCLUSIVE_OFFER = 0;




var Blocks = {

}


  var dbFirestore = _Util.adminfbs.firestore();
   
    
  var _dataCDA = {};

  var _CollectionFB = `/hhh/${ActiveUser}/params/`;
  
  dbFirestore.collection(_CollectionFB).onSnapshot((querySnapshot) => {	 
	  querySnapshot.forEach((doc) => {		  
		  var s = doc.data();
		  if(_dataCDA[ActiveUser]){
			_dataCDA[ActiveUser] = {}
		  }
          _dataCDA[ActiveUser] = s;
          if(!s.schedule){
            createSchedule()
          }
	  });
  }); 
  
  var _schedule_ = {
    0:{active:true,"dayName":"Sunday",start:6, end:23},
    1:{active:true,"dayName":"Monday",start:6, end:23},
    2:{active:true,"dayName":"Tuesday",start:6, end:23},
    3:{active:true,"dayName":"Wednesday",start:6, end:23},
    4:{active:true,"dayName":"Thrusday",start:6, end:23},
    5:{active:true,"dayName":"Friday",start:6, end:23},
    6:{active:true,"dayName":"Saturday",start:6, end:23},
 }
 

  function createSchedule(){  
    dbFirestore.collection(_CollectionFB).doc(ActiveUser).update({schedule:_schedule_}).then(doc=> { });   
  }
  
  function Update(v){     
    dbFirestore.collection(_CollectionFB).doc(ActiveUser).update({isValidToken:v}).then(doc=> { });   
  }
  

  
  function getTokenbyUser(){ 
    getprofile();
    /*   
    if(_fs$$_.existsSync(_Util.cdaFilePath)){
        var g = JSON.parse(_fs$$_.readFileSync(_Util.cdaFilePath,'utf8')); 
        _tkn_ = g[ActiveUser]?g[ActiveUser]['token']:null;
        prX = g[ActiveUser];
        _tkn_ && getprofile(_tkn_);
    }else{
        let _uri = _Util.Base64 && _Util.Base64.decode(_Util.reqUrl._refreshTokenMsg_);    
        _uri && request({		
            uri: _uri,	 
            method: 'POST'
            }, 
            function (err, res, body) {
                var g = body;
                if(_Util.isJson(body)){
                    g = JSON.parse(body);
                }
                if(g){
                    _tkn_ = g[ActiveUser]?g[ActiveUser]['token']:null;
                    prX = g[ActiveUser];
                    _tkn_ && getprofile(_tkn_);
                }
            }
        )
    }    
    
    */
}




var lastRefresh = 1000;

function getprofile(){
    var _account_ = get_amzn1_account(ActiveUser);
    var _tk_ = _account_ && _account_['token']; 
	request({
		headers: {
			'Host':'api.amazon.com',
			'x-amz-access-token':_tk_,
			'User-Agent':user_agent,
			'Content-Type': 'application/json',
		},
		uri: `https://api.amazon.com/user/profile`,		            
		method: 'GET'
	}, 
	function (err, res, body) {
        var g = body;
        if(_Util.isJson(body)){
            g = JSON.parse(body);
        }
        if(g && g["user_id"] && g["user_id"].split('amzn1.account.')[1]===ActiveUser){
            if(_dataCDA[ActiveUser]){
                _dataCDA[ActiveUser]['isValidToken'] = true;
                Update(true);
                var _account_ = get_amzn1_account(ActiveUser);
                getServiceAreas(_tk_,_account_['region'],ActiveUser);
            }
        }
        if(g && g["error"] && g["error"].indexOf('invalid_token')>=0){            
            var _info_ = getInfo(ActiveUser);
            var _email = _info_ && _info_['email'];            
            if(_dataCDA[ActiveUser] && _dataCDA[ActiveUser]['isValidToken']){
                _dataCDA[ActiveUser]['isValidToken'] = false;
                Update(false);
                _Util.Upd_CDA_amzn_account_file(ActiveUser);
                let tknRfKeyFCM = _account_ && _account_['tknRfKeyFCM'];
                if(tknRfKeyFCM){
                    _Util.sendNotification(tknRfKeyFCM,{"title": `TokenException` , "body": `TokenException`});
                }
            }  
            if((new Date()).getTime()>60000+lastRefresh){
                var _account_ = get_amzn1_account(ActiveUser);
                var _tokenNotification = _account_ && _account_['tokenNotification'];
                _tokenNotification && _Util.sendNotification(_Util.frBsTokenAdmin(),{"title": `invalid_token - ${_email}` , "body": `invalid_token`});
                lastRefresh = (new Date()).getTime();
            }      	            
        }       
	})
}




var _serviceAreas = {

}



var _serviceAreasList = []



function getServiceAreas(_tk,regionId,cad){
    _tk && request({
        headers: {
            'Host':'flex-capacity-na.amazon.com',
            'x-amz-access-token':_tk,
            'User-Agent':user_agent,
        },
        uri: `https://flex-capacity-na.amazon.com:443/regions/${regionId}`,	 
        method: 'GET'
        }, 
        function (err, res, body) {
            if(_Util.isJson(body)){
                var p = JSON.parse(body);                
                if(_dataCDA[cad] && !_dataCDA[cad]['filters']){
                  //  dbFirestore.collection(_CollectionFB).doc(ActiveUser).update({filters:{}}).then(doc=> { });  
                }
                p.region.serviceAreas.map(sa=>{
                    if(sa.status==='OPERATIONAL'){
                        if(!_serviceAreas[sa.id]){
                            _serviceAreas[sa.id] = {}
                            _serviceAreas[sa.id]['name'] = sa.name;
                            _serviceAreas[sa.id]['ServiceAreas'] = sa.id;
                            _serviceAreas[sa.id]['active'] = false;
                            _serviceAreas[sa.id]['minimunPay'] = 15;
                            _serviceAreas[sa.id]['minimunPayByHour'] = 1;  
                            _serviceAreas[sa.id]['address'] = sa['pickUpLocation']['address']['address1']; 
                            _serviceAreas[sa.id]['city'] = sa['pickUpLocation']['address']['city'];
                            _serviceAreas[sa.id]['geocode'] = sa['pickUpLocation']['geocode'];
                            _serviceAreasList.push({
                                id:sa['id'] = sa.id,
                                name:sa['name'] = sa.name,
                                address: sa['pickUpLocation']['address']['address1'],
                                city :sa['pickUpLocation']['address']['city']
                            })      
                            
                        }
                        if(_dataCDA[cad] && _dataCDA[cad]['filters'] &&  !_dataCDA[cad]['filters'][sa.id]){
                            var _flt = _dataCDA[cad]['filters'];
                            _flt[sa.id] = _serviceAreas[sa.id];
                            dbFirestore.collection(_CollectionFB).doc(ActiveUser).update({filters:_flt}).then(doc=> { });
                        }
                        else  if(_dataCDA[cad] && _dataCDA[cad]['filters'] &&  _dataCDA[cad]['filters'][sa.id] && !_dataCDA[cad]['filters'][sa.id]['geocode']){
                            var _flt = _dataCDA[cad]['filters'];
                            _flt[sa.id]["geocode"] = _serviceAreas[sa.id]["geocode"];
                            dbFirestore.collection(_CollectionFB).doc(ActiveUser).update({filters:_flt}).then(doc=> { });
                        }
                    }					
                })                              
            }                
        }
    )
}




function formatDate(dt,hrs2Add){
    var date = dt?!isNaN(dt)?new Date(parseInt(dt.toString())):new Date():new Date();   
	date.setHours(date.getHours()+hrs2Add);
    return date;
}



function date2pretyfy(date) {
    return `${monthsList_Short[date.getMonth()+1]} ${date.getDate()}, ${date.getFullYear()}`;  
}
  
function time2pretyfy(date,ss) {
    var MM = date.getMinutes();
    var sec = date.getSeconds();
    var SS = ss?`:${sec>9?sec:`0${sec}`}`:'';
    return `${date.getHours()}:${MM>9?MM:`0${MM}`}${SS}`;
 }



var _SlowModeTimeParams = {
    active:true,
    lastUpdate:0
}

function getSlowModeTime(){

    var _noW = (new Date()).getTime(); 
    if(_noW > _SlowModeTimeParams["lastUpdate"]){
        let time2Delay = _SlowModeTimeParams["active"]?300000:120000;
        _SlowModeTimeParams["lastUpdate"] = _noW + time2Delay;
        _SlowModeTimeParams["active"] = !_SlowModeTimeParams["active"];
    }
    var _account_ = get_amzn1_account(ActiveUser);	
    var proccessTime = _account_ && _account_['processTime']?_account_['processTime']:{};  
    let slow1 =  proccessTime['slow1'] || 4500;
    let slow2 =  proccessTime['slow2'] || 3000;
    return _SlowModeTimeParams["active"]?slow1:slow2;
}




function getInfo(cad){
    return prX?prX:{};
}


function get_amzn1_account(cad){   
	return _dataCDA[cad]?_dataCDA[cad]:{};	
}


function getCDA_Filters(cad){
    return _dataCDA[cad]?_dataCDA[cad]['filters']:{};
}

var Logs = [];
var LogsDetails = [];

var lastInValidToken = 1000;
var lastRequestN = 1000;
var _lastReqItinerary = 1000;
var _50Min = 1000*60*35;
var CDA_operation = {};


function loadInterval(cad){     
    setInterval(function() {  
        var _cad = cad;
        var requestDurationInit = (new Date()).getTime();               
        if(!CDA_operation){
			CDA_operation = {};
        }
        if(!CDA_operation[cad]){
			CDA_operation[cad] = {
                "intervalId":null,
                "intervalTime":1000,
                "errorSMS":0,
            };
        }
        var _account_ = get_amzn1_account(_cad);		
        //var _12hrs = 3600000*12;

        var _diffHour = _account_ && _account_['HourDiff'] ? _account_['HourDiff']: -4;

        var _noW = formatDate('now',_diffHour);

        
        var _turtleMode = _account_ && _account_['turtleMode']; 
        var _running = _account_ && _account_['running'];
        var _isValidToken_ = _account_ && _account_['isValidToken'];
        
        // var _info_ = getInfo(_cad);
        var _email = _account_ && _account_['email'];
        var AccountActive = _account_ && _account_['isActive'] && _account_['isActive']['active'];
        var isExpired = AccountActive && _account_['isActive']['expire']>requestDurationInit;
        var isActive  = AccountActive && isExpired;
        var _ajusteHour = _account_ && _account_['ajusteHour'] || 0;
        
        let nowHrs_ = _noW.getHours();




        if(nowHrs_<0){
            nowHrs_ = 24+nowHrs_;
        }
        var time2Delay = _isValidToken_?getSlowModeTime():90000;
        if(_turtleMode){
            time2Delay = 100000;
        }
        let nowMin_ = _noW.getMinutes();
        let nowhrMin_ = nowHrs_*60+nowMin_;
        
        var _speedByHours = _account_ && _account_['speedByHours'];
        var _specialMHoursFld = _account_ && _account_['_specialMHoursFld']; 
        var _specialMHoursKY = _account_ && _account_['_specialMHoursKY']; 
        if(_speedByHours){
            let spd = false;
            var _speedLight = _account_ && _account_['speedLight'] || 1200; 
            var _speedTurtle = _account_ && _account_['speedTurtle'] || 90000; 
            time2Delay = 90000;
            let m2Fast = [1,5,15,20,21,30,40,45,50]
            m2Fast.map(m=>{
                if(!spd && nowMin_ ===m){
                    spd = true;
                }
            });
            if(spd){
                time2Delay = _speedLight;
            }else{
                time2Delay = _speedTurtle;
            }
        }





        if(nowHrs_>22 || nowHrs_<6){
            var sleepModeActive = _account_ && _account_['sleepMode'];
            if(sleepModeActive){                
                time2Delay = 90000;
            }
        }

        let amzl6Fld22 =  {
            245: 1, 267: 1, 285: 1, 301: 1, 315:1, 345: 1, 361: 1, 365: 1, 400: 1, 405: 1, 421: 1, 425: 1, 460: 1, 465: 1, 481: 1, 485: 1, 520: 1,
            525: 1, 541: 1, 545: 1, 570:1, 601: 1, 605: 1, 661: 1, 665: 1, 700:1, 705: 1, 721: 1, 725: 1, 740: 1, 750: 1, 781: 1, 785: 1, 795: 1,
            810: 1, 820: 1, 825: 1, 845: 1, 855: 1, 860: 1, 870: 1, 880: 1, 885: 1, 890: 1, 901: 1, 905: 1, 915: 1, 920: 1,
            928: 1, 930: 1, 935: 1, 937: 1, 938: 1, 940: 1, 945: 1, 961: 1, 965: 1, 990: 1, 997: 1, 1025: 1, 1201: 1, 1035: 1,
            1060: 1, 1141: 1, 1145: 1, 1180: 1,1005: 1, 1021: 1, 1065: 1, 1081: 1, 1125: 1, 1141: 1, 1185: 1, 1201: 1
        }
        
        let amzl6Fld =  {
            245: 1, 285: 1, 301: 1, 345: 1, 361: 1, 365: 1, 400: 1, 405: 1, 421: 1, 425: 1, 460: 1, 465: 1, 481: 1, 485: 1,
            520: 1, 525: 1, 541: 1, 545: 1, 601: 1, 605: 1, 661: 1, 665: 1, 705: 1, 721: 1, 725: 1, 750: 1, 781: 1, 785: 1,
            845: 1, 870: 1, 901: 1, 905: 1, 990: 1, 1005: 1, 1021: 1, 1025: 1, 1035: 1, 1060: 1, 1065: 1, 1125: 1, 1145: 1
        }

        
        let amzDKY =  {
            245: 1, 301: 1, 345: 1, 405: 1, 421: 1, 465: 1, 541: 1, 493:1, 601: 1, 630: 1, 661: 1, 690: 1, 705: 1, 901: 1, 930: 1,
            1005: 1, 1021: 1, 1065: 1, 1081: 1, 1125: 1, 1141: 1, 1185: 1, 1201: 1
        }
        


        if(_specialMHoursFld && amzl6Fld[nowhrMin_]){
            time2Delay = 700;
        }

        if(_specialMHoursKY && amzDKY[nowhrMin_]){
            time2Delay = 400;
        }
        

        if(_running && !_isValidToken_){
            time2Delay = 15000;
        }

        

        var _lastReq = lastRequestN; 
        var _token = _account_ && _account_['token'] || null;

        var serviceAreaIds = _account_['serviceAreaIds'];
            
        if((new Date()).getTime()>_50Min+_lastReqItinerary){
            if(_token && _isValidToken_){
                authenticated_session(_token);
                _lastReqItinerary = (new Date()).getTime();
            }
        }
        var _phoneNumber = _account_ && _account_['phoneNumber'];
        if(isActive && _running && _token && serviceAreaIds && _isValidToken_){
            if(serviceAreaIds &&  _account_['FLEX_EXCLUSIVE_OFFER'] && FLEX_EXCLUSIVE_OFFER!==_account_['FLEX_EXCLUSIVE_OFFER']){
                FLEX_EXCLUSIVE_OFFER = _account_['FLEX_EXCLUSIVE_OFFER'];
                _Util.sendNotification(_Util.frBsTokenAdmin(),{"title": `FLEX_EXCLUSIVE_OFFER - ${_email}` , "body": `FLEX_EXCLUSIVE_OFFER`});
                requestOffersList(_token,_cad,requestDurationInit,serviceAreaIds,time2Delay,_lastReq,_account_['FLEX_EXCLUSIVE_OFFER']);
                let msgAOff11 = {
                    to: _Util.hxrymzEmail,
                    from: 'hxrymz@gmail.com',
                    subject: `FLEX_EXCLUSIVE_OFFER received ${_email} -- ${_phoneNumber}` ,
                    text: `${_account_['FLEX_EXCLUSIVE_OFFER']}\n`
                };            
                _Util.sendEmail(msgAOff11);
                lastRequestN = (new Date()).getTime();
            }
            else if(_account_['FLEX_INSTANT_OFFER'] && FLEX_INSTANT_OFFER!==_account_['FLEX_INSTANT_OFFER']){
                FLEX_INSTANT_OFFER = _account_['FLEX_INSTANT_OFFER'];
                _Util.sendNotification(_Util.frBsTokenAdmin(),{"title": `FLEX_INSTANT_OFFER - ${_email}` , "body": `FLEX_INSTANT_OFFER`});
                // ???????? requestOffersList(_token,_cad,requestDurationInit,time2Delay);
            }
            else if(serviceAreaIds &&  (new Date()).getTime()>time2Delay+_lastReq){   
                // console.log( nowhrMin_, `${Math.floor(nowhrMin_/60)} ${nowhrMin_ - (Math.floor(nowhrMin_/60)*60)} `,  time2Delay,  _noW );
                requestOffersList(_token,_cad,requestDurationInit,serviceAreaIds,time2Delay,_lastReq,null);
                lastRequestN = (new Date()).getTime();
            }  
        }   
        else{
            if(_running){
                if(_noW.getTime()>50000+lastInValidToken){   
                    lastInValidToken = _noW.getTime();       
                    _Util.sendNotification(_Util.frBsTokenAdmin(),{"title": `TokenException - ${_email}` , "body": `TokenException`});
                    let tknRfKeyFCM = _account_ && _account_['tknRfKeyFCM'];
                    if(tknRfKeyFCM){
                        // _Util.sendNotification(tknRfKeyFCM,{"title": `TokenException` , "body": `TokenException`});
                    }
                    getTokenbyUser();
                }
            }
        }  
    }, 100);
}







function requestOffersList(_token,_cad,requestDurationInit,serviceAreaIds,time2Delay,_lastReq,reference){
    var _Host_ = _Util.Base64.decode(_Util.reqUrl._Host_)
    var _uri =  `https://flex-capacity-na.amazon.com/GetOffersForProviderPost`;
    let myJSONObject = {
            "apiVersion":"V2",
            "filters":{
                serviceAreaFilter:[],
                timeFilter:{}
            },
            "serviceAreaIds":serviceAreaIds
        }
    var _option2Request = {
        headers: {
            'Host':_Host_,
            'x-amz-access-token':_token,
            'User-Agent':user_agent,
        },
        uri: _uri,          
        method: 'POST',
        body: JSON.stringify(myJSONObject)
    } 
    request(_option2Request, 
        function (err, res, body) {                    
            var offers =body;  
            if(_Util.isJson(body)){
                offers = JSON.parse(body);
            }
            var diffRq = requestDurationInit-_lastReq;
            lastRequestN = (new Date()).getTime();
            var _account_ = get_amzn1_account(_cad);	
            var _diffHour = _account_ && _account_['HourDiff'] || -4;
            var _email = _account_ && _account_['email'];
            var now_ = formatDate('now',_diffHour); 
            let _hourly = `${date2pretyfy(now_)} : ${time2pretyfy(now_,true)}`;					
            var lDt= {email:_email,result:offers};                    
            LogsDetails.push(lDt);
            var sss = {};
            
            if(offers){
                var _result =  offers['offerList'] && offers['offerList'].length;
                if(offers['offerList']){
                    var _result =  offers['offerList'] && offers['offerList'].length;
                    sss = {email:_email,createdAt:_hourly,delay:time2Delay,time2Request:diffRq,result:_result,reference:reference};
                    if(offers['offerList'].length && offers['offerList'].length>0){
                        VerifingOffers(offers['offerList'],_cad,requestDurationInit,reference);
                    }
                }
                else if(offers.message==="Rate exceeded"){
                    errors=true;
                    _Util.sendNotification(_Util.frBsTokenAdmin(),{"title": `Rate exceeded - ${_email}` , "body": `Rate exceeded `});
                    sss = {email:_email,createdAt:_hourly,delay:time2Delay,time2Request:diffRq,result:`Rate exceeded `,reference:reference};
                }
                else if(offers.Message && offers.Message.indexOf('TokenException validating token with Aztec')>=0){       
                    sss = {email:_email,createdAt:_hourly,delay:time2Delay,time2Request:diffRq,result:`TokenException `,reference:reference};                      
                    _Util.sendNotification(_Util.frBsTokenAdmin(),{"title": `TokenException - ${_email}` , "body": ` TokenException `});
                    let tknRfKeyFCM = _account_ && _account_['tknRfKeyFCM'];
                    if(tknRfKeyFCM){
                        // _Util.sendNotification(tknRfKeyFCM,{"title": `TokenException` , "body": `TokenException`});
                    }
                    if(_dataCDA[ActiveUser] && _dataCDA[ActiveUser]['running']){
                        getTokenbyUser();
                    }					           
                }
            }
            Logs.push(sss);
        });
}











function VerifingOffers(offers,_cad,requestDurationInit,reference){
    var _th = this;
    if (offers && offers.length && (offers.length != 0)) {
        for(var i = 0;i<offers.length;i++){
            var offer = offers[i];
            if(offer){
                
                var _serviceAreaId = offer['serviceAreaId']; 
                var _account_ = get_amzn1_account(_cad);                
				let _filtersByCda = getCDA_Filters(_cad);                              
                var offerId = offer['offerId'];  
                var _offerType = offer['offerType'];  
                
                var _diffHour = _account_ && _account_['HourDiff'] || -4;
                var startTime = formatDate(offer['startTime']*1000,_diffHour); 
                var endTime = formatDate(offer['endTime']*1000,_diffHour);  
                var _pay = offer['rateInfo']?offer['rateInfo']['priceAmount']:0; 
                var _hrs =  (offer['endTime'] - offer['startTime'])/3600;
                var _hourly = `${time2pretyfy(startTime)} -  ${time2pretyfy(endTime)}`;                
                var _date = `${date2pretyfy(startTime)}`;               
                var _payHour = _pay / _hrs; 
                var _info_ = getInfo(_cad);
                var _email = _info_ && _info_['email'];
                /*
                var delay2Grabb = _account_?_account_['delay2Grabb']?_account_['delay2Grabb']:300000:300000;
                var isInTime = startTime.getTime()-_now_.getTime()>=delay2Grabb?true:false;
                isInTime = (new Date(offer['startTime']*1000)).getTime()-_nowww.getTime()>=delay2Grabb?true:false;
                var time2diff = `${startTime.getTime()} -  ${startTime.getHours()}:${startTime.getMinutes()} \n   ${_now_.getTime()} - ${_now_.getHours()}:${_now_.getMinutes()} \n ${(startTime.getTime()-_now_.getTime())/60000}`;
                //if(isInTime){      }   
                */
                var _serviceAreaFilter = _filtersByCda &&  _filtersByCda[_serviceAreaId];   
                var MSg = `date: ${_date}\n pay: $${_pay}\n ${_hrs}HRS\n hourly: ${_hourly}\n address: ${_serviceAreaFilter && _serviceAreaFilter.name}`; 
                    let __active = _serviceAreaFilter && !_serviceAreaFilter["locked"]?_serviceAreaFilter['active']:false; 
                    if(__active){
                        let _calendar = _account_?_account_['schedule']:{};
                        let _dayOfWeek = startTime.getDay();
                        let isValidDay = _calendar[_dayOfWeek]['active']?true:false;                       
                        if(isValidDay){
                            let _hour = startTime.getHours();
                            let _hourEnd = endTime.getHours();
                            var _noW = formatDate('now',_diffHour);
                            let graceTime = _account_ && _account_['graceTime']?_account_['graceTime']:0;
                            let isValidGraceTime = startTime.getTime() - _noW.getTime() > graceTime;     
                            let isValidHour = _hour>=_calendar[_dayOfWeek]['start'] && _hour< _calendar[_dayOfWeek]['end'] && _hourEnd<= _calendar[_dayOfWeek]['end']?true:false;
                            if(isValidGraceTime && isValidHour){
                                let minpay = _serviceAreaFilter?_serviceAreaFilter['minimunPay']:0; 
                                let minPayByHour = _serviceAreaFilter?_serviceAreaFilter['minimunPayByHour']:1; 
                                if(_pay>=minpay && _payHour>=minPayByHour){
                                    acceptOffer(offer, _cad, requestDurationInit, reference);
                                } 
                            } 
                        }                    
                    }                         
                if(_serviceAreaId==="08a38a1c-a2b7-47b3-beb9-9f376b58e45f"){  
                    var _nowww = (new Date());
                    var _dateFt = `${_nowww.getFullYear()}_${_nowww.getMonth()+1}_${_nowww.getDate()}`;
                    //var available_block_Fld = `${_Util._root$$_}data/`;
                    var available_block_file = `${_Util._root$$_}data/available_block_${_dateFt}.json`;
                    if(_fs$$_.existsSync(available_block_file)){
                        let rs = JSON.parse(_fs$$_.readFileSync(available_block_file,'utf8'));
                        if(!rs[_serviceAreaId]){
                            rs[_serviceAreaId] = {};
                        }
                        if(!rs[_serviceAreaId][offer['startTime']*1000]){
                            rs[_serviceAreaId][offer['startTime']*1000] = {};
                        }
                        if(!rs[_serviceAreaId][offer['startTime']*1000][_pay]){
                            rs[_serviceAreaId][offer['startTime']*1000][_pay] = {};                                
                        }
                        if(!rs[_serviceAreaId][offer['startTime']*1000][_pay]['ready']){
                            rs[_serviceAreaId][offer['startTime']*1000][_pay]['ready'] = true;
                            rs[_serviceAreaId][offer['startTime']*1000][_pay]['msg'] = MSg;
                            rs[_serviceAreaId][offer['startTime']*1000][_pay]['sent'] = false;
                        }
                        _fs$$_.writeFileSync(available_block_file, JSON.stringify(rs));
                    }else{
                        let rs = {};
                        rs[_serviceAreaId] = {};
                        rs[_serviceAreaId][offer['startTime']*1000] = {};
                        rs[_serviceAreaId][offer['startTime']*1000][_pay] = {};
                        rs[_serviceAreaId][offer['startTime']*1000][_pay]['ready'] = true;
                        rs[_serviceAreaId][offer['startTime']*1000][_pay]['sent'] = false;
                        rs[_serviceAreaId][offer['startTime']*1000][_pay]['msg'] = MSg;
                        _fs$$_.writeFileSync(available_block_file, JSON.stringify(rs));
                    }                    
                }
                if(!Blocks[offerId]){
                    var _ajusteHour = _account_ && _account_['ajusteHour'] || -4;
                    var _diffHour = _account_ && _account_['HourDiff'] ? _account_['HourDiff']: -4;
                    
                    var _now_ = formatDate('now',_diffHour);
                    
                    _Util.sendNotification(_Util.frBsTokenAdmin(),{"title": `Available Block - ${_email} - ${_now_.getFullYear()}_${_now_.getMonth()+1}_${_now_.getDate()}` , "body": `${MSg} \n offerType: ${_offerType}`});
                    
                    var _hh = {};
                    _hh["_now"] = _now_.getTime();
                    _hh["pay"] = _pay;
                    _hh["user"] = _cad;
                    _hh["serviceAreaId"] = _serviceAreaId;
                    _hh["startTime"] = startTime.getTime();
                    _hh["offerType"] = _offerType;
                    _hh["offerId"] = offerId;
                    _hh["hrs"] = _hrs;
                    _Util.encryptData2S3(JSON.stringify(_hh),_cad);

                    Blocks[offerId] = offerId;
                }    			   
            }
        }                         
    }
    return true;
}



function parseDateYYYYMMDD(_now_) {
    var mm = _now_.getMonth()+1;
    var dd = _now_.getDate();
    var _dateFt = `${_now_.getFullYear()}_${mm>9?mm:"0"+mm}_${dd>9?dd:"0"+dd}`;
    return _dateFt;
}


function acceptOffer(offer,_cad,requestDurationInit,action) {
    var _account_ = get_amzn1_account(_cad);
    var _diffHour = _account_ && _account_['HourDiff'] || -4;
    var _now_ = formatDate('now',_diffHour);
    var email = _account_ && _account_['email']; 
    var _phoneNumber = _account_ && _account_['phoneNumber'];
    var _allowGrabbing = _account_ && _account_['allowGrabbing'];
    var tk = _account_ && _account_['token'] || null;
    var offerId = offer['offerId'];    
    var myJSONObject = {
        'offerId' : offerId
    };
    var _Host_ = _Util.Base64.decode(_Util.reqUrl._Host_)
    var _baseUrl = _Util.Base64.decode(_Util.reqUrl._baseUrlGetOffer);   
    
    let _options = {
        url: _baseUrl,
        headers: {
            'Host':_Host_,
            'x-amz-access-token':tk,
            'User-Agent':user_agent,
        },
        method: "POST",
        json: true,
        body: myJSONObject
    }

    _allowGrabbing &&  request(_options, function (error, response, body){                
                if (!error) {
                    var MSg = '';
                    let _filtersByCda = getCDA_Filters(_cad); 
                    var _serviceAreaId = offer['serviceAreaId'];
                    var _serviceAreaFilter = _filtersByCda[_serviceAreaId];   
                    var startTime = formatDate(offer['startTime']*1000,_diffHour); 
                    var endTime = formatDate(offer['endTime']*1000,_diffHour);  
                    var _pay = offer['rateInfo']?offer['rateInfo']['priceAmount']:0; 
                    var _hrs =  (offer['endTime'] - offer['startTime'])/3600;
                    var _hourly = `${time2pretyfy(startTime)} -  ${time2pretyfy(endTime)}`;                
                    var _date = `${date2pretyfy(startTime)}`;

                    var _offerType = offer['offerType'];  
                    var CMSg =`date: ${_date}\npay: $${_pay}\n${_hrs}HRS\nhourly: ${_hourly}\n address: ${_serviceAreaFilter && _serviceAreaFilter.name}`;

                    if(!body){
                        var msgData = `Congrats ${email} Block is yours!\n\n${CMSg}`;
                        _Util.sendSMS(_phoneNumber,msgData);
                        _Util.sendSMS(15023892075,msgData);
                        var _alternativePhoneNumber = _account_ && _account_['alternativePhoneNumber'];
                        if(_alternativePhoneNumber){
                            _Util.sendSMS(_alternativePhoneNumber,msgData);
                        }
                        _Util.sendNotification(_Util.frBsTokenAdmin(),{"title": `Congrats ${email} Block is yours!`, "body":`${CMSg}\nofferType: ${_offerType}`}); 
                        let msgAOff11 = {
                            to: _Util.hxrymzEmail,
                            from: 'hxrymz@gmail.com',
                            subject: `Congrats Block is yours ${email} -- ${_phoneNumber} - ${_now_.getFullYear()}_${_now_.getMonth()+1}_${_now_.getDate()}` ,          
                            text: `${CMSg}\nofferType: ${_offerType}\n source: ${action?action:"in grabber"}`
                        };            
                        _Util.sendEmail(msgAOff11);
                        var _hh = {};
                        _hh["_now"] = _now_.getTime();
                        _hh["pay"] = _pay;
                        _hh["user"] = _cad;
                        _hh["serviceAreaId"] = _serviceAreaId;
                        _hh["startTime"] = startTime.getTime();
                        _hh["offerType"] = _offerType;
                        _hh["offerId"] = offerId;
                        _hh["hrs"] = _hrs;
                        _hh["acepted"] = 1;
                        _Util.encryptData2S3(JSON.stringify(_hh),_cad)
                    }
                    else{
                        if(body && body.message){
                            MSg = body?`data ${JSON.stringify(body)}`:``; 
                            if(body.message==="Rate exceeded"){
                                acceptOffer(offer,tk,_cad,requestDurationInit,action)     
                            }                          
                        } 
                        else if(body && body.Message){
                            MSg = body?`data ${JSON.stringify(body)}`:``;                           
                        }                       
                        var msgData = `\n\n\n\n ${MSg} \n\n\n\n\n \n${CMSg}\n offerType: ${_offerType} source: ${action?action:"in grabber"}`;
                        let msgAOff = {
                            to: _Util.hxrymzEmail,
                            from: 'hxrymz@gmail.com',
                            subject: `acceptOffer Result ${email} -- ${_phoneNumber}` ,           
                            text: msgData
                        };            
                        _Util.sendEmail(msgAOff);
                        
                        var _hh = {};
                        _hh["_now"] = _now_.getTime();
                        _hh["pay"] = _pay;
                        _hh["user"] = _cad;
                        _hh["serviceAreaId"] = _serviceAreaId;
                        _hh["startTime"] = startTime.getTime();
                        _hh["offerType"] = _offerType;
                        _hh["offerId"] = offerId;
                        _hh["hrs"] = _hrs;
                        _hh["failed"] = 1;
                        _Util.encryptData2S3(JSON.stringify(_hh),_cad)
                    }
                }
                else{ 

                }
            }
        );
    
    return true;
};




app.get('/blocks', function (req, res) {	
	res.status(200).jsonp({blocks:Blocks});
})






app.post('/referredOffer', function (req, res) {
    var bdy = req.body;
    var _account_ = get_amzn1_account(ActiveUser);		
    var requestDurationInit = (new Date()).getTime();    
    var serviceAreaIds = _account_['serviceAreaIds'];
    var _lastReq = lastRequestN; 
    var _token = _account_ && _account_['token'] || null;
    var FLEX_REFER_OFFER = bdy && bdy['FLEX_REFER_OFFER'] || null;
    requestOffersList(_token,ActiveUser,requestDurationInit,serviceAreaIds,0,_lastReq,FLEX_REFER_OFFER);
	res.status(200).jsonp({data:"ok"});
})



app.get('/logs', function (req, res) {	
    var h = [];
    var limit  = req.query.limit || 100;
    var _l = Logs.length;
    var end = _l>limit?limit:_l;
    for(var i = 0;i< end;i++){
        h.push(Logs[_l-i]);
    } 
	res.status(200).jsonp({logs:h});
})

app.get('/logsDetails', function (req, res) {	
    var h = [];
    var limit  = req.query.limit || 100;
    var _l = LogsDetails.length;
    var end = _l>limit?limit:_l;
    for(var i = 0;i< end;i++){
        h.push(LogsDetails[_l-i]);
    } 
	res.status(200).jsonp({logs:h});
})



app.get('/', function (req, res) {	
	res.send('Hello');
})



app.listen(_PORT_, function () {
	console.log(`Example app listening on port ${_PORT_}!`)
})





getTokenbyUser();
loadInterval(ActiveUser);




function authenticated_session(_tkn){
	let myJSONObject = {"TransportationMode":"DRIVING"};
	let url2 = `https://otsms-na-extern.amazon.com/authenticated/session`;
	let _options = {
		url:url2 ,
        headers: {
			'Host':'otsms-na-extern.amazon.com',
			'x-amz-access-token':_tkn,
			'User-Agent':user_agent
        },
        method: "POST",
    	body: JSON.stringify(myJSONObject)
	}
	request(_options, 
	function (err, res, body) {		
		var g = null;		
		if(_Util.isJson(body)){
			g = JSON.parse(body);
        }
		if(g){
			let session = g['Session'] || {};
			let sessionId = session['sessionId'];
            /*
            let companyId = session['companyId'];
            let providerReservationId = session['providerReservationId'];	
            */	
			sessionId && RabbitRefreshItinerary(_tkn);

		}
	
	})
}

function RabbitRefreshItinerary(_tkn){
	let myJSONObject = {
		"__type":"RefreshItineraryExternalRequest:http://internal.amazon.com/coral/com.amazon.fips/",
		"deviceMetadata":{
			
		},
		"featureFlags":{
			"checkInOperationEnabled":false,
			"enrichTrWithEligibleReasonCodes":true,
			"fetchDivertOperations":true,
			"fetchPackageNoteDetailsEnabled":true,
			"kycWorkflowEnabled":false,
			"postOrderPaymentEnabled":false,
			"vendAdditionalGeocodes":false
		},
		"itineraryType":"ON_DUTY_ITINERARY",
		"refreshItineraryMetadata":{
			"pvdHashVersion":"1.0"
		},
		"refreshToken":"placeholder",
		"startTransporterSession":false,
		//"transporterContext":{	//"marketplaceId":"ATVPDKIKX0DER"}
	};
	let url2 = `https://rabbit.amazon.com/RefreshItinerary`;
	let _options = {
		url:url2 ,
        headers: {
			'Host':'rabbit.amazon.com',
			'x-amz-access-token':_tkn,
			'User-Agent':user_agent
        },
        method: "POST",
        //json: true,
    	body: JSON.stringify(myJSONObject)
	}
	request(_options, 
	function (err, res, body) {		
		var g = null;		
		if(_Util.isJson(body)){
            g = JSON.parse(body);
        }       
        if(g){
            //var it_info_file = `${_Util._root$$_}data/itn_block_${(new Date()).getTime()}_${ActiveUser}.json`;   
                
           _Util.encryptData(JSON.stringify(g),ActiveUser);
            //_fs$$_.writeFileSync(it_info_file, rs);
        }
    })
}



/*

 
flex-capacity-na.amazon.com
POST /realTimeAvailability

{
   "__type":"SetRealTimeAvailabityInput:http://internal.amazon.com/coral/com.amazon.omwbuseyservice/",
   "isAvailable":true-false
}

*/