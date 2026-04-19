'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export function ThreeBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let animId = 0
    let disposed = false

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)

    const s = new THREE.Scene()
    const cam = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 300)
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

    // dot grid
    const grid = new THREE.GridHelper(60, 60, 0x1b2742, 0x111b2e)
    ;(grid.material as THREE.Material).opacity = 0.5
    ;(grid.material as THREE.Material).transparent = true
    s.add(grid)

    const dotGeo = new THREE.SphereGeometry(0.055, 4, 4)
    const dotMat = new THREE.MeshBasicMaterial({ color: 0x243354 })
    const dotsInst = new THREE.InstancedMesh(dotGeo, dotMat, 31 * 31)
    const dd = new THREE.Object3D()
    let di = 0
    for (let x = -15; x <= 15; x++) {
      for (let z = -15; z <= 15; z++) {
        dd.position.set(x * 2, 0.01, z * 2)
        dd.updateMatrix()
        dotsInst.setMatrixAt(di++, dd.matrix)
      }
    }
    s.add(dotsInst)

    // service node cards
    type NodeDef = {
      id: string
      pos: [number, number, number]
      color: number
      w: number; h: number; d: number
      mesh?: THREE.Mesh
      vec?: THREE.Vector3
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

    const nodeGroup = new THREE.Group()
    NODE_TYPES.forEach(n => {
      const geo = new THREE.BoxGeometry(n.w, n.h, n.d)
      const mat = new THREE.MeshStandardMaterial({
        color: 0x0d1322,
        emissive: new THREE.Color(n.color).multiplyScalar(0.18),
        metalness: 0.3,
        roughness: 0.6,
      })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.set(...n.pos)
      mesh.position.y = n.h / 2
      const ec = new THREE.Color(n.color)
      const edgeMat = new THREE.MeshBasicMaterial({ color: ec })
      const th = 0.045
      const edgeDefs: [number, number, number, number, number, number][] = [
        [0,              n.h / 2 + th / 2, 0, n.w,           th,            th],
        [0,             -n.h / 2 - th / 2, 0, n.w,           th,            th],
        [ n.w / 2 + th / 2, 0,             0,  th, n.h + th * 2,  th],
        [-n.w / 2 - th / 2, 0,             0,  th, n.h + th * 2,  th],
      ]
      edgeDefs.forEach(([ex, ey, ez, ew, eh, ed]) => {
        const em = new THREE.Mesh(new THREE.BoxGeometry(ew, eh, ed), edgeMat)
        em.position.set(ex, ey, ez)
        mesh.add(em)
      })
      const pl = new THREE.PointLight(ec.getHex(), 0.7, 5)
      pl.position.set(0, 1.5, 0)
      mesh.add(pl)
      nodeGroup.add(mesh)
      n.mesh = mesh
      n.vec = new THREE.Vector3(...n.pos).setY(n.h / 2)
    })
    s.add(nodeGroup)

    s.add(new THREE.AmbientLight(0xffffff, 0.25))
    const dir = new THREE.DirectionalLight(0xffffff, 0.4)
    dir.position.set(5, 12, 8)
    s.add(dir)

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
    const wireGroup = new THREE.Group()
    const pktGroup  = new THREE.Group()
    const allPkts: Array<{
      curve: THREE.QuadraticBezierCurve3
      geo: THREE.BufferGeometry
      state: Array<{ t: number; spd: number }>
    }> = []

    CONNECTIONS.forEach(conn => {
      const a = nodeMap[conn.from].vec!
      const b = nodeMap[conn.to].vec!
      const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5)
      mid.y += 1.4
      const curve = new THREE.QuadraticBezierCurve3(a.clone(), mid, b.clone())
      const lg = new THREE.BufferGeometry().setFromPoints(curve.getPoints(50))
      wireGroup.add(new THREE.Line(lg, new THREE.LineBasicMaterial({ color: conn.color, transparent: true, opacity: 0.38 })))
      const pGeo = new THREE.BufferGeometry()
      pGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(conn.pktCount * 3), 3))
      pktGroup.add(new THREE.Points(pGeo, new THREE.PointsMaterial({
        color: conn.pktColor, size: 0.6, transparent: true, opacity: 1,
        blending: THREE.AdditiveBlending, depthWrite: false,
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
        const pa = geo.getAttribute('position') as THREE.BufferAttribute
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
      const now = performance.now()
      const dt = Math.min((now - prevTime) / 1000, 0.05)
      prevTime = now
      tick(dt)
      renderer.render(s, cam)
    }
    animate()

    return () => {
      disposed = true
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
      s.traverse(o => {
        if ((o as THREE.Mesh).geometry) (o as THREE.Mesh).geometry.dispose?.()
        const m = (o as THREE.Mesh).material
        if (m)(Array.isArray(m) ? m : [m]).forEach((x: THREE.Material) => x.dispose?.())
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
