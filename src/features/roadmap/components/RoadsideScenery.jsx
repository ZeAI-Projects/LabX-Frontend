const SCENES = ['grove', 'skyline', 'station', 'crystal', 'transit', 'observatory'];

function HoloTree({ x, scale = 1 }) {
  return <g className="rm-scenery-tree" transform={`translate(${x} 99) scale(${scale})`}>
    <path className="rm-scenery-trunk" d="M0 0V-27" />
    <g className="rm-scenery-canopy">
      <path className="rm-scenery-crown" d="M0-73 17-45 12-25 0-19-12-25-17-45Z" />
      <path className="rm-scenery-facet" d="M0-69 0-22 12-29 14-44Z" />
      <path className="rm-scenery-branches" d="M0-68V-21M-13-43 0-37 13-43M-9-30 0-26 9-30" />
      <circle className="rm-scenery-beacon" cx="0" cy="-73" r="2.4" />
    </g>
  </g>;
}

function HoloBuilding({ x, height }) {
  return <g className="rm-scenery-building" transform={`translate(${x} 99)`}>
    <path className="rm-scenery-building-face" d={`M-18 0V${-height + 9}L0 ${-height} 18 ${-height + 9}V0Z`} />
    <path className="rm-scenery-building-side" d={`M0 ${-height}V0H18V${-height + 9}Z`} />
    <path className="rm-scenery-roof" d={`M-18 ${-height + 9}L0 ${-height} 18 ${-height + 9}`} />
    {[0, 1, 2].map((row) => <g key={row} className={row === 1 ? 'rm-scenery-window-glint' : undefined}>
      <rect className="rm-scenery-window" x="-10" y={-height + 17 + row * 11} width="5" height="4" rx="1" />
      <rect className="rm-scenery-window" x="3" y={-height + 17 + row * 11} width="5" height="4" rx="1" />
    </g>)}
    <path className="rm-scenery-antenna" d={`M0 ${-height}V${-height - 13}`} />
    <circle className="rm-scenery-beacon" cx="0" cy={-height - 15} r="2.6" />
  </g>;
}

function Crystal({ x, height, width = 22 }) {
  return <g className="rm-scenery-crystal" transform={`translate(${x} 100)`}>
    <path className="rm-scenery-crystal-body" d={`M0 ${-height} ${width} ${-height * .48} ${width * .7} 0H${-width * .7}L${-width} ${-height * .48}Z`} />
    <path className="rm-scenery-crystal-facet" d={`M0 ${-height}V0H${width * .7}L${width} ${-height * .48}Z`} />
    <path className="rm-scenery-crystal-vein" d={`M0 ${-height}V0M${-width} ${-height * .48}H${width}`} />
  </g>;
}

function SceneArtwork({ scene, seed }) {
  if (scene === 'grove') return <>
    <path className="rm-scenery-terrain" d="M17 100Q81 88 150 99T283 99" />
    <HoloTree x={44} scale={.7 + seed % 3 * .08} />
    <HoloTree x={91} scale={1.04} />
    <HoloTree x={151} scale={.73} />
    <HoloTree x={210} scale={.94} />
    <HoloTree x={260} scale={.63 + seed % 2 * .12} />
    <g className="rm-scenery-fireflies"><circle cx="65" cy="42" r="2" /><circle cx="178" cy="32" r="2.4" /><circle cx="240" cy="48" r="1.8" /></g>
  </>;

  if (scene === 'skyline') return <>
    <HoloBuilding x={48} height={38 + seed % 3 * 4} />
    <HoloBuilding x={98} height={59} />
    <HoloBuilding x={151} height={44 + seed % 2 * 8} />
    <HoloBuilding x={204} height={66} />
    <HoloBuilding x={254} height={35 + seed % 4 * 3} />
    <g className="rm-scenery-drone"><path d="M132 24 150 18 168 24 150 29Z" /><circle cx="150" cy="23" r="3" /><path d="M127 26h-9m55 0h9" /></g>
  </>;

  if (scene === 'station') return <>
    <path className="rm-scenery-pylon" d="M45 99V48l-19 9m19-9 19 9M255 99V48l-19 9m19-9 19 9M36 73h18m192 0h18" />
    <path className="rm-scenery-panel" d="M17 58 64 67 58 78 11 69ZM236 67 283 58 289 69 242 78Z" />
    <g className="rm-scenery-reactor">
      <circle className="rm-scenery-reactor-halo" cx="150" cy="67" r="37" />
      <ellipse className="rm-scenery-reactor-ring" cx="150" cy="67" rx="57" ry="17" />
      <circle className="rm-scenery-reactor-core" cx="150" cy="67" r="17" />
      <path className="rm-scenery-reactor-bolt" d="m155 52-13 17h9l-5 14 14-19h-9Z" />
    </g>
    <path className="rm-scenery-pylon" d="M130 99V89h40v10" />
  </>;

  if (scene === 'crystal') return <>
    <Crystal x={54} height={48 + seed % 3 * 4} />
    <Crystal x={111} height={71} width={27} />
    <Crystal x={172} height={45} width={20} />
    <Crystal x={229} height={62 + seed % 2 * 6} width={25} />
    <path className="rm-scenery-crystal-arc" d="M28 81Q150 13 274 82" />
    <g className="rm-scenery-fireflies"><circle cx="70" cy="25" r="2.5" /><circle cx="151" cy="14" r="2" /><circle cx="251" cy="34" r="2.5" /></g>
  </>;

  if (scene === 'transit') return <>
    <path className="rm-scenery-transit-rail" d="M13 70H287M25 76H275M47 76V99m206-23v23" />
    <path className="rm-scenery-transit-tower" d="M32 70V34l13-8 13 8v36m184 0V34l13-8 13 8v36" />
    <path className="rm-scenery-transit-window" d="M40 40h10m-10 10h10m200-10h10m-10 10h10" />
    <g className="rm-scenery-pod">
      <path className="rm-scenery-pod-body" d="M107 56q8-16 28-16h38q18 0 27 16l-8 12h-78Z" />
      <path className="rm-scenery-pod-window" d="M129 48h43q7 0 12 8h-64q3-8 9-8Z" />
      <circle className="rm-scenery-beacon" cx="126" cy="69" r="2.2" /><circle className="rm-scenery-beacon" cx="182" cy="69" r="2.2" />
    </g>
  </>;

  return <>
    <path className="rm-scenery-observatory-dome" d="M88 99V78a62 62 0 0 1 124 0v21Z" />
    <path className="rm-scenery-observatory-grid" d="M107 99V76m29 23V56m28 43V56m29 43V76M91 80h118M100 63h100" />
    <path className="rm-scenery-observatory-tower" d="M39 99V53h18v46m186 0V53h18v46M47 53V39m205 14V39" />
    <g className="rm-scenery-dish">
      <path d="M110 32q40 35 80 0-40 15-80 0Z" />
      <path d="M150 45V64M128 26l-9-10m62 10 9-10" />
      <circle className="rm-scenery-beacon" cx="150" cy="38" r="3" />
    </g>
    <g className="rm-scenery-fireflies"><circle cx="73" cy="34" r="1.8" /><circle cx="226" cy="24" r="2.2" /></g>
  </>;
}

export function RoadsideScenery({ points, reached, stageIndex = 0 }) {
  const spaces = points.map((point, index) => ({ point, index })).filter(({ index }) => index % 3 !== 2);
  return <div className="rm-roadside-scenery" aria-hidden="true">
    {spaces.map(({ point, index }, ordinal) => {
      const scene = SCENES[(ordinal + stageIndex * 2) % SCENES.length];
      return <div key={point.id} data-scenery={scene}
        className={`rm-scenery-cluster is-scene-${scene} ${index % 2 ? 'is-left' : 'is-right'}${index <= reached ? ' is-lit' : ''}`}
        style={{ top: point.y, '--scenery-delay': `${(index % 5) * -1.3}s` }}>
        <svg viewBox="0 0 300 120" focusable="false" preserveAspectRatio="xMidYMid meet">
          <ellipse className="rm-scenery-ground" cx="150" cy="104" rx="140" ry="13" />
          <path className="rm-scenery-platform" d="M16 101H279L289 108H7Z" />
          <path className="rm-scenery-circuit" d="M14 104H86M213 104H286" />
          <SceneArtwork scene={scene} seed={index} />
        </svg>
      </div>;
    })}
  </div>;
}
