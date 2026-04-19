import type { WorkerInbound, WorkerOutbound, SimSnapshot } from './types'
import { createEngine } from './engine'
import { computeDelta } from './delta'

// Shadow the DOM postMessage with the worker-context signature
declare function postMessage(msg: WorkerOutbound): void

type EngineHandle = ReturnType<typeof createEngine>
let engine: EngineHandle | null = null
let prevSnapshot: SimSnapshot | null = null

addEventListener('message', (e: MessageEvent<WorkerInbound>) => {
  const msg = e.data

  switch (msg.type) {
    case 'START': {
      if (engine) engine.stop()
      prevSnapshot = null

      engine = createEngine(
        msg.graph,
        msg.traffic,
        msg.speedMultiplier,
        {
          onTick: (snapshot: SimSnapshot) => {
            if (prevSnapshot === null) {
              postMessage({ type: 'TICK', snapshot })
            } else {
              postMessage({ type: 'TICK_DELTA', delta: computeDelta(prevSnapshot, snapshot) })
            }
            prevSnapshot = snapshot
          },
          onComplete: () => postMessage({ type: 'COMPLETE' }),
        },
        msg.chaosSchedule ?? [],
      )
      engine.start()
      break
    }

    case 'PAUSE':
      engine?.pause()
      break

    case 'RESUME':
      engine?.resume()
      break

    case 'STOP':
      engine?.stop()
      engine = null
      prevSnapshot = null
      break

    case 'SET_SPEED':
      engine?.setSpeed(msg.multiplier)
      break

    case 'INJECT_CHAOS':
      engine?.injectChaos(msg.event)
      break
  }
})
