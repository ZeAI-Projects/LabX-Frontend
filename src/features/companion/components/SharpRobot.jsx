import { useId } from 'react'
import character from '../assets/sharp-character.png'

// The silver shell is rendered artwork; the face stays live and expressive.
export function SharpRobot({ className = '', happy = false, expression = happy ? 'happy' : 'idle' }) {
  const id = useId().replaceAll(':', '')
  return <svg className={`sharp-robot sharp-robot--${expression} ${className}`} data-expression={expression} viewBox="0 0 1280 1280" fill="none" aria-hidden="true" focusable="false">
    <defs>
      <filter id={`${id}-eye-glow`} x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="12"/></filter>
      <filter id={`${id}-eye-light`} x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="3"/></filter>
      <linearGradient id={`${id}-eye`} x1="0" y1="355" x2="0" y2="435" gradientUnits="userSpaceOnUse"><stop stopColor="#8EF9FF"/><stop offset=".45" stopColor="#20DFFF"/><stop offset="1" stopColor="#009BEF"/></linearGradient>
    </defs>
    <image href={character} width="1280" height="1280" preserveAspectRatio="xMidYMid meet"/>
    <g className="sharp-robot__face">
      <g className="sharp-robot__gaze">
        <g className="sharp-robot__eye-glow" fill="#00CEFF" opacity=".4" filter={`url(#${id}-eye-glow)`}><ellipse cx="523" cy="395" rx="29" ry="40"/><ellipse cx="713" cy="395" rx="29" ry="40"/></g>
        <g className="sharp-robot__eyelids" fill={`url(#${id}-eye)`} strokeLinecap="round">
          <g className="sharp-robot__eyes--idle"><rect x="501" y="361" width="44" height="68" rx="22"/><rect x="691" y="361" width="44" height="68" rx="22"/></g>
          <path className="sharp-robot__eyes--happy" d="M496 401Q523 355 550 401M686 401Q713 355 740 401" stroke="#3FE9FF" strokeWidth="15" fill="none"/>
          <g className="sharp-robot__eyes--thinking"><circle className="sharp-robot__thinking-left" cx="523" cy="395" r="21"/><circle className="sharp-robot__thinking-right" cx="713" cy="395" r="21"/></g>
        </g>
      </g>
      <path d="M596 477Q618 493 640 477" stroke="#11DFFF" strokeWidth="8" strokeLinecap="round" filter={`url(#${id}-eye-light)`}/>
      <path d="M596 477Q618 493 640 477" stroke="#65F1FF" strokeWidth="5" strokeLinecap="round"/>
    </g>
  </svg>
}
