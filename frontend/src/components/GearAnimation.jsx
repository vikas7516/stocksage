import React from 'react'

const GEAR_PATH = 'M 0,-38 L 7,-28 L 18,-32 L 20,-21 L 30,-17 L 26,-7 L 36,0 L 26,7 L 30,17 L 20,21 L 18,32 L 7,28 L 0,38 L -7,28 L -18,32 L -20,21 L -30,17 L -26,7 L -36,0 L -26,-7 L -30,-17 L -20,-21 L -18,-32 L -7,-28 Z'

const styles = `
  @keyframes spinCW {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  @keyframes spinCCW {
    from { transform: rotate(0deg); }
    to   { transform: rotate(-360deg); }
  }
  .gear-large  { animation: spinCW  10s linear infinite; transform-origin: 100px 100px; }
  .gear-medium { animation: spinCCW 5s linear infinite; transform-origin: 190px 155px; }
  .gear-small  { animation: spinCW  2.5s linear infinite; transform-origin: 100px 215px; }
`

export default function GearAnimation() {
  return (
    <>
      <style>{styles}</style>
      <svg
        width="280"
        height="300"
        viewBox="0 0 300 320"
        xmlns="http://www.w3.org/2000/svg"
        style={{ overflow: 'visible' }}
        aria-label="Animated gears"
      >
        <defs>
          <linearGradient id="gearGradPrimary" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1a56db" />
          </linearGradient>
          <linearGradient id="gearGradSecondary" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
          <linearGradient id="gearGradAccent" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
          <filter id="gearShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#0f172a" floodOpacity="0.12" />
          </filter>
        </defs>

        {/* Large gear — top-left area, centre at (100,100) */}
        <g className="gear-large" filter="url(#gearShadow)">
          <path
            d={GEAR_PATH}
            transform="translate(100,100) scale(1.6)"
            fill="url(#gearGradPrimary)"
            stroke="#ffffff"
            strokeWidth="1.5"
          />
          {/* Centre holes */}
          <circle cx="100" cy="100" r="18" fill="#ffffff" />
          <circle cx="100" cy="100" r="10" fill="#f1f5f9" />
        </g>

        {/* Medium gear — right side, centre at (190,155) */}
        <g className="gear-medium" filter="url(#gearShadow)">
          <path
            d={GEAR_PATH}
            transform="translate(190,155) scale(1.1)"
            fill="url(#gearGradSecondary)"
            stroke="#ffffff"
            strokeWidth="1.5"
          />
          <circle cx="190" cy="155" r="13" fill="#ffffff" />
          <circle cx="190" cy="155" r="7"  fill="#f1f5f9" />
        </g>

        {/* Small gear — bottom, centre at (100,215) */}
        <g className="gear-small" filter="url(#gearShadow)">
          <path
            d={GEAR_PATH}
            transform="translate(100,215) scale(0.75)"
            fill="url(#gearGradAccent)"
            stroke="#ffffff"
            strokeWidth="1.5"
          />
          <circle cx="100" cy="215" r="9" fill="#ffffff" />
          <circle cx="100" cy="215" r="5" fill="#f1f5f9" />
        </g>
      </svg>
    </>
  )
}

