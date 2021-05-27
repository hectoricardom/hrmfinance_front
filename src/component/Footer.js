
import React from 'react'

import loadable from '@loadable/component'

import * as _Util from '../store/Util'

import './_styles.css';


const Icon2 = loadable(() => import('./Icons'))


const Footer= ()=>{


    let linkLabelList = [501,502,503,504,505,506,507,508,509];
  
    let linkSocialList = [
     /* {
        name:"facebook",
        iconName:"facebook_logo", 
        iconColor:"#9d9d9d" 
      },
      {
        name:"instagram",
        iconName:"instagram_logo", 
        iconColor:"#9d9d9d" 
      },
      */
      {
        name:"whatsapp",
        iconName:"whatsapp", 
        iconColor:"#25D366",
        href:"https://chat.whatsapp.com/DJn0mgp12MG16QSBwX1QB95"
      },
      {
        name:"telegram",
        iconName:"telegram", 
        iconColor:"#0088cc",
        href: "https://t.me/qvamarkets"
      }
    ]
  
  
  
    return(
      <div role="contentinfo" className="member-footer">


        
        <div className="social-links">
          {linkSocialList && linkSocialList.map(scId=>{
              return <FooterSocialLink socialLink={scId} key={_Util.gen12CodeId()} />
          })}
        </div>
        <div className="member-footer-copyright" >
          <span className="member-footer-copyright-instance">{'@qvamarkets'}</span>
          <p>{"qvamarkets@gmail.com"}</p>
        </div>
        <div>
          {'© 2021 QvaMarkets. All Rights Reserved.'}
        </div>
      </div>
    ) 
  
  }
  
  export default Footer
  
  
  const FooterLink= (props)=>{
    const {textId} = props;
    return(
      <li className="member-footer-link-wrapper">
        <a className="member-footer-link" >
          <span className="member-footer-link-content">{_Util.translatetext(textId)}</span>
        </a>
      </li>
    )
  }
  
  
  const FooterSocialLink= (props)=>{
    const {socialLink} = props;

    let dynamicref = socialLink["href"]?{"href":socialLink["href"]}:{};

    let colorKey = `--color-social-link-${socialLink["iconName"]}`
    return(
      <>
      <style>
      {`
        
        .social-link_${socialLink["iconName"]}:hover svg{
          fill:var(--color-social-link-${socialLink["iconName"]});
        }

        [is-mobile=true] .social-link_${socialLink["iconName"]} svg{
          fill:var(--color-social-link-${socialLink["iconName"]});
        }
      
      `}
      </style>
      <a {...dynamicref} className={`social-link social-link_${socialLink["iconName"]} `}  aria-label={socialLink["iconName"]} style={{[colorKey]:socialLink["iconColor"]}}>
          <Icon2   
            name={socialLink["iconName"]}
            size={36}
          />
      </a>
      </>
    )
  }



  /*
  
  <div className={`_dsplFlx _logo`}>
          <div className={`_q_`}>
            Q
          </div>
          <div className={`_V_`}>
            V
          </div>
          <div className={`_I_`}>
            <Icon2   
              name={'money'} 
              color={'#5d5d5D'} 
              size={24}
            />
          </div>
          <div className={`_a_`}>
            A
          </div>
        </div>
  
  */