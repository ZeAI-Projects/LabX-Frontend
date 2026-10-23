import { useId } from 'react';
import { Award } from 'lucide-react';

export function Medal({ icon: Icon = Award, earned = true, tone = 'violet', size = 76 }) {
  const id = useId().replaceAll(':', '');
  const colors = earned ? ({ gold: ['#fff0ae', '#ce9b3e', '#68421c'], mint: ['#c2fff1', '#4ba895', '#174c50'], violet: ['#e9e0ff', '#9680dc', '#3b346c'] }[tone] || ['#e9e0ff', '#9680dc', '#3b346c']) : ['#718097', '#38485f', '#182336'];
  return <svg className={`labx-medal${earned ? ' is-earned' : ' is-locked'}`} width={size} height={size * 1.12} viewBox="0 0 100 112" fill="none" aria-hidden="true" focusable="false">
    <defs><linearGradient id={`${id}-metal`} x1="16" y1="10" x2="84" y2="92" gradientUnits="userSpaceOnUse"><stop stopColor={colors[0]}/><stop offset=".3" stopColor={colors[1]}/><stop offset=".54" stopColor={colors[0]}/><stop offset=".59" stopColor={colors[1]}/><stop offset="1" stopColor={colors[2]}/></linearGradient><linearGradient id={`${id}-face`} x1="25" y1="20" x2="78" y2="80" gradientUnits="userSpaceOnUse"><stop stopColor={colors[1]}/><stop offset="1" stopColor={colors[2]}/></linearGradient></defs>
    <path d="M26 65L22 107L43 96L50 107L56 65M74 65L78 107L57 96L50 107L44 65" fill={colors[2]} stroke={colors[1]} strokeWidth="1.5"/>
    <path d="M50 4L86 25V67L50 88L14 67V25L50 4Z" fill={`url(#${id}-metal)`} stroke={colors[0]} strokeWidth="1.2"/>
    <path d="M50 14L77 30V62L50 78L23 62V30L50 14Z" fill={`url(#${id}-face)`} stroke={colors[0]} strokeOpacity=".55"/>
    <path d="M17 27L49 8L82 27" stroke="white" strokeOpacity=".5" strokeWidth="2"/>
    <Icon x="32" y="27" width="36" height="36" stroke={earned ? '#f4f8ff' : '#9aabc1'} strokeWidth="1.6"/>
    <circle cx="50" cy="8" r="2" fill={colors[0]}/>
  </svg>;
}
