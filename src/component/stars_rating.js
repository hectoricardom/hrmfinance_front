import React from 'react'

import loadable from '@loadable/component'

const Icon2 = loadable(() => import('./Icons'))



export default function StarsRating(props) {
  let rate = props.rate;



  return (
      <div className="COzjKb DX0ugf ApBhXe">
        <Icon2
          name={rate>=1?"star":rate>0?"star_half_full":"star_outline"}
          color={"rgb(249, 171, 0)"}
          size={14}
        />
        <Icon2
          name={rate>=2?"star":rate>1?"star_half_full":"star_outline"}
          color={"rgb(249, 171, 0)"}
          size={14}
        />
        <Icon2
          name={rate>=3?"star":rate>2?"star_half_full":"star_outline"}
          color={"rgb(249, 171, 0)"}
          size={14}
        />
        <Icon2
          name={rate>=4?"star":rate>3?"star_half_full":"star_outline"}
          color={"rgb(249, 171, 0)"}
          size={14}
        />
        <Icon2
          name={rate>=5?"star":rate>4?"star_half_full":"star_outline"}
          color={"rgb(249, 171, 0)"}
          size={14}
        />
      </div>
    )
}


/*
star : "M12,17.27L18.18,21L16.54,13.97L22,9.24L14.81,8.62L12,2L9.19,8.62L2,9.24L7.45,13.97L5.82,21L12,17.27Z"
star_half_full : "M12,15.4V6.1L13.71,10.13L18.09,10.5L14.77,13.39L15.76,17.67M22,9.24L14.81,8.63L12,2L9.19,8.63L2,9.24L7.45,13.97L5.82,21L12,17.27L18.18,21L16.54,13.97L22,9.24Z"
star_outline: "M12,15.39L8.24,17.66L9.23,13.38L5.91,10.5L10.29,10.13L12,6.09L13.71,10.13L18.09,10.5L14.77,13.38L15.76,17.66M22,9.24L14.81,8.63L12,2L9.19,8.63L2,9.24L7.45,13.97L5.82,21L12,17.27L18.18,21L16.54,13.97L22,9.24Z"

*/