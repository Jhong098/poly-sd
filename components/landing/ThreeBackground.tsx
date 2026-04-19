'use client'

import { useEffect, useRef } from 'react'
import {
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  GridHelper,
  BufferGeometry,
  BufferAttribute,
  Points,
  PointsMaterial,
  AdditiveBlending,
  BoxGeometry,
  Mesh,
  MeshBasicMaterial,
  Group,
  Object3D,
  Color,
  Vector3,
  Line,
  LineBasicMaterial,
  QuadraticBezierCurve3,
  AmbientLight,
} from 'three'

export function ThreeBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const canvas = canvasRef.current
    if (!canvas) return

    let animId = 0
    let disposed = false

    const renderer = new WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)

    const s = new Scene()
    const cam = new PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 300)
    cam.position.set(-2, 20, 16)
    cam.lookAt(-2, 0, 0)

    const resize = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      renderer.setSize(w, h, false)
      cam.aspect = w / h
      cam.updateProjectionMatrix()
    }
    window.addEventListener('resize', resize)
    resize()

    // dot grid — single Points geometry instead of 961 sphere meshes
    const grid = new GridHelper(60, 60, 0x1b2742, 0x111b2e)
    ;(grid.material as InstanceType<typeof LineBasicMaterial>).opacity = 0.5
    ;(grid.material as InstanceType<typeof LineBasicMaterial>).transparent = true
    s.add(grid)

    const dotCount = 31 * 31
    const dotPositions = new Float32Array(dotCount * 3)
    let di = 0
    for (let x = -15; x <= 15; x++) {
      for (let z = -15; z <= 15; z++) {
        dotPositions[di++] = x * 2
        dotPositions[di++] = 0.01
        dotPositions[di++] = z * 2
      }
    }
    const dotGeo = new BufferGeometry()
    dotGeo.setAttribute('position', new BufferAttribute(dotPositions, 3))
    s.add(new Points(dotGeo, new PointsMaterial({ color: 0x243354, size: 0.12 })))

    // service node cards — MeshBasicMaterial, no lights needed
    type NodeDef = {
      id: string
      pos: [number, number, number]
      color: number
      w: number; h: number; d: number
      mesh?: Mesh
      vec?: Vector3
    }
    const NODE_TYPES: NodeDef[] = [
      { id: 'client', pos: [-14, 0,  1], color: 0xf59e0b, w: 2.2, h: 0.55, d: 1.4 },
      { id: 'lb',     pos: [ -6, 0, -1], color: 0xf97316, w: 1.8, h: 0.55, d: 1.2 },
      { id: 'srv1',   pos: [  1, 0,  3], color: 0x22d3ee, w: 2.0, h: 0.55, d: 1.4 },
      { id: 'srv2',   pos: [  1, 0, -4], color: 0x22d3ee, w: 2.0, h: 0.55, d: 1.4 },
      { id: 'db',     pos: [  9, 0, -4], color: 0xa78bfa, w: 2.2, h: 0.55, d: 1.4 },
      { id: 'cache',  pos: [  9, 0,  4], color: 0x4ade80, w: 2.0, h: 0.55, d: 1.2 },
      { id: 'queue',  pos: [  3, 0,  9], color: 0xfb923c, w: 2.0, h: 0.55, d: 1.2 },
    ]

    const nodeGroup = new Group()
    NODE_TYPES.forEach(n => {
      const ec = new Color(n.color)
      // dark body with color tint via emissive-like mix in basic material
      const bodyColor = new Color(0x0d1322).lerp(ec, 0.12)
      const mesh = new Mesh(
        new BoxGeometry(n.w, n.h, n.d),
        new MeshBasicMaterial({ color: bodyColor })
      )
      mesh.position.set(...n.pos)
      mesh.position.y = n.h / 2
      const th = 0.045
      const edgeDefs: [number, number, number, number, number, number][] = [
        [0,              n.h / 2 + th / 2, 0, n.w,           th,            th],
        [0,             -n.h / 2 - th / 2, 0, n.w,           th,            th],
        [ n.w / 2 + th / 2, 0,             0,  th, n.h + th * 2,  th],
        [-n.w / 2 - th / 2, 0,             0,  th, n.h + th * 2,  th],
      ]
      edgeDefs.forEach(([ex, ey, ez, ew, eh, ed]) => {
        const em = new Mesh(new BoxGeometry(ew, eh, ed), new MeshBasicMaterial({ color: ec }))
        em.position.set(ex, ey, ez)
        mesh.add(em)
      })
      nodeGroup.add(mesh)
      n.mesh = mesh
      n.vec = new Vector3(...n.pos).setY(n.h / 2)
    })
    s.add(nodeGroup)

    // minimal ambient to keep scene readable (no per-node point lights)
    s.add(new AmbientLight(0xffffff, 0.5))

    // bezier wires + traffic packets
    type ConnDef = { from: string; to: string; color: number; pktColor: number; pktCount: number; spd: number }
    const CONNECTIONS: ConnDef[] = [
      { from: 'client', to: 'lb',    color: 0xf59e0b, pktColor: 0xf59e0b, pktCount: 4, spd: 0.35 },
      { from: 'lb',     to: 'srv1',  color: 0x22d3ee, pktColor: 0x22d3ee, pktCount: 3, spd: 0.4  },
      { from: 'lb',     to: 'srv2',  color: 0x22d3ee, pktColor: 0x22d3ee, pktCount: 3, spd: 0.38 },
      { from: 'srv1',   to: 'db',    color: 0xa78bfa, pktColor: 0xa78bfa, pktCount: 2, spd: 0.42 },
      { from: 'srv1',   to: 'cache', color: 0x4ade80, pktColor: 0x4ade80, pktCount: 2, spd: 0.45 },
      { from: 'srv2',   to: 'db',    color: 0xa78bfa, pktColor: 0xa78bfa, pktCount: 2, spd: 0.4  },
      { from: 'srv2',   to: 'queue', color: 0xfb923c, pktColor: 0xfb923c, pktCount: 2, spd: 0.38 },
    ]

    const nodeMap = Object.fromEntries(NODE_TYPES.map(n => [n.id, n])) as Record<string, NodeDef>
    const wireGroup = new Group()
    const pktGroup  = new Group()
    const allPkts: Array<{
      curve: QuadraticBezierCurve3
      geo: BufferGeometry
      state: Array<{ t: number; spd: number }>
    }> = []

    CONNECTIONS.forEach(conn => {
      const a = nodeMap[conn.from].vec!
      const b = nodeMap[conn.to].vec!
      const mid = new Vector3().addVectors(a, b).multiplyScalar(0.5)
      mid.y += 1.4
      const curve = new QuadraticBezierCurve3(a.clone(), mid, b.clone())
      // 20 segments instead of 50 — visually identical at this scale
      const lg = new BufferGeometry().setFromPoints(curve.getPoints(20))
      wireGroup.add(new Line(lg, new LineBasicMaterial({ color: conn.color, transparent: true, opacity: 0.38 })))
      const pGeo = new BufferGeometry()
      pGeo.setAttribute('position', new BufferAttribute(new Float32Array(conn.pktCount * 3), 3))
      pktGroup.add(new Points(pGeo, new PointsMaterial({
        color: conn.pktColor, size: 0.6, transparent: true, opacity: 1,
        blending: AdditiveBlending, depthWrite: false,
      })))
      allPkts.push({
        curve,
        geo: pGeo,
        state: Array.from({ length: conn.pktCount }, (_, i) => ({
          t: i / conn.pktCount,
          spd: conn.spd * (0.9 + Math.random() * 0.2),
        })),
      })
    })
    s.add(wireGroup)
    s.add(pktGroup)

    let elapsed = 0
    let prevTime = performance.now()

    const tick = (dt: number) => {
      elapsed += dt * 2
      cam.position.x = -2 + Math.sin(elapsed * 0.04) * 4
      cam.position.z = 16 + Math.cos(elapsed * 0.04) * 3
      cam.position.y = 18 + Math.sin(elapsed * 0.05) * 1.5
      cam.lookAt(-2, 0, 0)
      NODE_TYPES.forEach(n => {
        const sc = 1 + Math.sin(elapsed * 1.4 + n.vec!.x) * 0.015
        n.mesh!.scale.set(sc, sc, sc)
      })
      allPkts.forEach(({ curve, geo, state }) => {
        const pa = geo.getAttribute('position') as BufferAttribute
        state.forEach((p, i) => {
          p.t += dt * p.spd * 2
          if (p.t > 1) p.t -= 1
          const pos = curve.getPoint(p.t)
          pa.array[i * 3]     = pos.x
          pa.array[i * 3 + 1] = pos.y + 0.1
          pa.array[i * 3 + 2] = pos.z
        })
        pa.needsUpdate = true
      })
    }

    const animate = () => {
      if (disposed) return
      animId = requestAnimationFrame(animate)
      if (document.hidden) return
      const now = performance.now()
      const dt = Math.min((now - prevTime) / 1000, 0.05)
      prevTime = now
      tick(dt)
      renderer.render(s, cam)
    }

    const onVisibilityChange = () => {
      if (!document.hidden) prevTime = performance.now()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    animate()

    return () => {
      disposed = true
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      s.traverse(o => {
        if ((o as Mesh).geometry) (o as Mesh).geometry.dispose?.()
        const m = (o as Mesh).material
        if (m)(Array.isArray(m) ? m : [m]).forEach((x: { dispose?: () => void }) => x.dispose?.())
      })
      renderer.dispose()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', inset: 0, zIndex: 0, display: 'block', width: '100vw', height: '100vh' }}
    />
  )
}
