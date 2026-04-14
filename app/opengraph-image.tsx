import { ImageResponse } from 'next/og'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const CHIPS = ['Load Balancing', 'Caching', 'Queues', 'Sharding', 'Fault Tolerance']

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0a0a0f',
          fontFamily: 'monospace',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <div style={{ width: '8px', height: '8px', backgroundColor: '#22d3ee', borderRadius: '50%' }} />
          <span style={{ color: '#22d3ee', fontSize: '13px', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
            Distributed Systems Design Game
          </span>
        </div>
        <div style={{ color: '#f1f5f9', fontSize: '72px', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '16px' }}>
          Poly-SD
        </div>
        <div style={{ color: '#94a3b8', fontSize: '26px', textAlign: 'center', maxWidth: '680px', lineHeight: 1.4 }}>
          Master distributed systems by designing them
        </div>
        <div style={{ display: 'flex', gap: '12px', marginTop: '40px' }}>
          {CHIPS.map((label) => (
            <div
              key={label}
              style={{
                padding: '6px 14px',
                border: '1px solid rgba(34,211,238,0.3)',
                color: '#22d3ee',
                fontSize: '12px',
                letterSpacing: '0.1em',
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  )
}
