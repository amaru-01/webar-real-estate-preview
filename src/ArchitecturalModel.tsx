import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

export type ViewMode = 'wireframe' | 'render'

type ArchitecturalModelProps = {
  floors: number
  mode: ViewMode
}

type Part = 'wall' | 'glass' | 'slab' | 'frame' | 'wood'

function makeModel(floors: number, mode: ViewMode) {
  const model = new THREE.Group()
  const wireframe = mode === 'wireframe'

  const colors: Record<Part, number> = {
    wall: 0xe6e7db,
    glass: 0x396476,
    slab: 0xf2f0e6,
    frame: 0x273d42,
    wood: 0xa38568,
  }

  const materials = Object.fromEntries(
    (Object.keys(colors) as Part[]).map((part) => {
      if (wireframe) {
        return [part, new THREE.MeshBasicMaterial({
          color: part === 'glass' ? 0x6fe2e6 : 0x72e1e3,
          transparent: true,
          opacity: part === 'glass' ? 0.045 : part === 'frame' ? 0.26 : 0.085,
          depthWrite: false,
          side: THREE.DoubleSide,
        })]
      }

      return [part, new THREE.MeshStandardMaterial({
        color: colors[part],
        roughness: part === 'glass' ? 0.18 : 0.76,
        metalness: part === 'glass' ? 0.32 : 0.04,
        transparent: part === 'glass',
        opacity: part === 'glass' ? 0.8 : 1,
        depthWrite: part !== 'glass',
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1,
      })]
    }),
  ) as Record<Part, THREE.Material>

  const edgeMaterial = new THREE.LineBasicMaterial({
    color: wireframe ? 0x9dffff : 0x364f50,
    transparent: true,
    opacity: wireframe ? 0.82 : 0.42,
    depthTest: !wireframe,
  })
  const fineMaterial = new THREE.LineBasicMaterial({
    color: wireframe ? 0x83f5f3 : 0x526e6b,
    transparent: true,
    opacity: wireframe ? 0.57 : 0.46,
    depthTest: !wireframe,
  })

  function box(
    width: number,
    height: number,
    depth: number,
    x: number,
    y: number,
    z: number,
    part: Part,
    outline = true,
  ) {
    const geometry = new THREE.BoxGeometry(width, height, depth)
    const mesh = new THREE.Mesh(geometry, materials[part])
    mesh.position.set(x, y, z)
    model.add(mesh)

    if (outline) {
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), edgeMaterial)
      edges.position.copy(mesh.position)
      edges.renderOrder = 2
      model.add(edges)
    }
  }

  function line(points: number[], material = fineMaterial) {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3))
    const segment = new THREE.LineSegments(geometry, material)
    segment.renderOrder = 3
    model.add(segment)
  }

  // A lightly drawn plot grid keeps the model legible without hiding the land.
  const gridPoints: number[] = []
  for (let x = -6; x <= 6; x += 1) {
    gridPoints.push(x, 0.015, -4.4, x, 0.015, 4.4)
  }
  for (let z = -4; z <= 4; z += 1) {
    gridPoints.push(-6, 0.015, z, 6, 0.015, z)
  }
  const gridMaterial = new THREE.LineBasicMaterial({
    color: 0x83f5f3,
    transparent: true,
    opacity: wireframe ? 0.22 : 0.16,
    depthWrite: false,
  })
  line(gridPoints, gridMaterial)

  const perimeter = [
    -6, 0.03, -4.4, 6, 0.03, -4.4,
    6, 0.03, -4.4, 6, 0.03, 4.4,
    6, 0.03, 4.4, -6, 0.03, 4.4,
    -6, 0.03, 4.4, -6, 0.03, -4.4,
  ]
  line(perimeter, edgeMaterial)

  box(9.8, 0.18, 6.35, -0.15, 0.12, 0.1, 'slab')
  box(3.4, 0.10, 1.0, -1.35, 0.09, 3.72, 'slab')
  box(3.7, 0.08, 0.65, -1.35, 0.045, 4.18, 'slab')

  const storyHeight = 2.35
  const baseHeight = 0.22

  for (let floor = 0; floor < floors; floor += 1) {
    const base = baseHeight + floor * storyHeight
    const centerY = base + storyHeight / 2
    const shift = floor === 0 ? 0 : -0.3
    const facadeZ = 2.48

    if (floor > 0) {
      box(9.5, 0.16, 6.15, -0.25, base, 0.05, 'slab')
    }

    // Flat wall planes, generous glazing, and mullions form a contemporary villa.
    box(8.15, storyHeight - 0.15, 0.13, shift, centerY, -2.42, 'wall')
    box(0.14, storyHeight - 0.15, 4.95, -4.04 + shift, centerY, 0.02, 'wall')
    box(0.14, storyHeight - 0.15, 1.85, 4.04 + shift, centerY, -1.5, 'wall')
    box(0.07, storyHeight - 0.25, 3.0, 4.04 + shift, centerY, 0.88, 'glass')
    box(7.98, storyHeight - 0.27, 0.055, shift, centerY, facadeZ, 'glass')
    box(1.22, storyHeight - 0.15, 0.14, -3.48 + shift, centerY, facadeZ, 'wall')
    box(0.62, storyHeight - 0.15, 0.14, 3.73 + shift, centerY, facadeZ, 'wall')

    for (const x of [-2.84, -1.55, -0.22, 1.12, 2.45, 3.37]) {
      box(0.055, storyHeight - 0.15, 0.1, x + shift, centerY, facadeZ + 0.045, 'frame')
    }
    box(7.8, 0.055, 0.1, shift + 0.06, base + 1.47, facadeZ + 0.05, 'frame')
    box(0.07, 0.06, 4.75, 4.08 + shift, base + 1.47, 0.02, 'frame')
    for (const z of [-1.75, -0.55, 0.65, 1.85]) {
      box(0.1, storyHeight - 0.15, 0.055, 4.09 + shift, centerY, z, 'frame')
    }

    // A timber inset adds contrast in the solid render, and rhythm in wireframe.
    for (let i = 0; i < 7; i += 1) {
      box(0.035, storyHeight - 0.25, 0.045, -3.99 + shift + i * 0.16, centerY, facadeZ + 0.1, 'wood', false)
    }

    if (floor > 0) {
      const railY = base + 1.0
      box(8.65, 0.055, 0.055, -0.22, railY, 3.0, 'frame')
      box(8.65, 0.055, 0.055, -0.22, base + 0.17, 3.0, 'frame')
      for (const x of [-4.45, -3.0, -1.55, -0.1, 1.35, 2.8, 4.1]) {
        box(0.045, 0.85, 0.045, x, base + 0.57, 3.0, 'frame')
      }
      box(0.055, 0.055, 0.62, 4.1, railY, 2.72, 'frame')
    }
  }

  const roofY = baseHeight + floors * storyHeight
  box(9.25, 0.2, 5.95, -0.3, roofY, -0.08, 'slab')
  box(8.4, 0.07, 5.1, -0.3, roofY + 0.14, -0.08, 'slab')

  // A small open-sided canopy creates a recognizable architectural silhouette.
  box(2.05, 0.13, 4.2, 4.95, 2.48, 0.15, 'slab')
  box(0.11, 2.35, 0.11, 5.75, 1.25, 1.95, 'frame')
  box(0.11, 2.35, 0.11, 5.75, 1.25, -1.65, 'frame')
  for (const z of [-1.5, -0.8, -0.1, 0.6, 1.3, 2.0]) {
    box(1.9, 0.045, 0.045, 4.96, 2.57, z, 'frame', false)
  }

  return model
}

function ModelFallback() {
  return (
    <svg className="model-fallback" viewBox="0 0 700 440" aria-hidden="true">
      <g fill="rgba(109, 237, 230, .08)" stroke="#b0fffa" strokeWidth="1.5" strokeLinejoin="round">
        <path d="M90 325 337 390 627 300 393 241Z" opacity=".6" />
        <path d="M125 164 342 211 342 337 125 288Z" />
        <path d="M342 211 552 150 552 274 342 337Z" />
        <path d="M112 158 329 96 566 145 342 213Z" />
        <path d="M134 95 332 43 530 84 325 143Z" />
        <path d="M134 95 325 143 325 207 134 160Z" />
        <path d="M325 143 530 84 530 151 325 211Z" />
        <path d="M117 91 329 34 547 79 328 146Z" />
        <path d="M164 171 164 295M209 181 209 305M256 192 256 315M299 202 299 327M385 198 385 324M428 185 428 311M470 173 470 298M512 161 512 285" fill="none" />
        <path d="M170 105 170 168M211 115 211 178M252 125 252 188M291 135 291 197M370 130 370 196M412 118 412 183M455 105 455 170M495 94 495 158" fill="none" />
        <path d="M125 233 342 282 552 220M134 126 325 174 530 115" fill="none" opacity=".65" />
      </g>
      <g fill="none" stroke="#85eeee" strokeWidth=".7" opacity=".45">
        <path d="M90 325 393 241M150 342 451 256M210 358 510 271M270 374 568 286M150 309 397 373M210 292 456 355M270 275 514 336M330 258 572 318" />
      </g>
    </svg>
  )
}

export default function ArchitecturalModel({ floors, mode }: ArchitecturalModelProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const rotationRef = useRef(0)
  const [fallback, setFallback] = useState(false)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    } catch {
      setFallback(true)
      return
    }

    setFallback(false)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setClearColor(0x000000, 0)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    container.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-8, 8, 6, -6, 0.1, 100)
    camera.position.set(13, 8.5, 19)
    camera.lookAt(0, 2.15, 0)

    scene.add(new THREE.HemisphereLight(0xffffff, 0x506d69, 2.1))
    const sunlight = new THREE.DirectionalLight(0xfff4da, 2.4)
    sunlight.position.set(-7, 12, 10)
    scene.add(sunlight)

    const model = makeModel(floors, mode)
    model.rotation.y = rotationRef.current
    scene.add(model)

    function resize() {
      if (!container) return
      const width = container.clientWidth || 1
      const height = container.clientHeight || 1
      const aspect = width / height
      const viewHeight = floors === 3 ? 13.0 : 11.5
      camera.left = (-viewHeight * aspect) / 2
      camera.right = (viewHeight * aspect) / 2
      camera.top = viewHeight / 2
      camera.bottom = -viewHeight / 2
      camera.updateProjectionMatrix()
      renderer.setSize(width, height, false)
    }

    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(container)

    let pointerX: number | null = null
    function pointerDown(event: PointerEvent) {
      pointerX = event.clientX
      renderer.domElement.setPointerCapture(event.pointerId)
      container?.classList.add('is-dragging')
    }
    function pointerMove(event: PointerEvent) {
      if (pointerX === null) return
      rotationRef.current += (event.clientX - pointerX) * 0.008
      pointerX = event.clientX
    }
    function pointerUp() {
      pointerX = null
      container?.classList.remove('is-dragging')
    }
    function keyDown(event: KeyboardEvent) {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault()
        rotationRef.current += event.key === 'ArrowLeft' ? -0.16 : 0.16
      }
    }
    renderer.domElement.addEventListener('pointerdown', pointerDown)
    renderer.domElement.addEventListener('pointermove', pointerMove)
    renderer.domElement.addEventListener('pointerup', pointerUp)
    renderer.domElement.addEventListener('pointercancel', pointerUp)
    container.addEventListener('keydown', keyDown)

    let animationFrame = 0
    function animate() {
      model.rotation.y += (rotationRef.current - model.rotation.y) * 0.12
      renderer.render(scene, camera)
      animationFrame = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      cancelAnimationFrame(animationFrame)
      observer.disconnect()
      container.removeEventListener('keydown', keyDown)
      renderer.domElement.removeEventListener('pointerdown', pointerDown)
      renderer.domElement.removeEventListener('pointermove', pointerMove)
      renderer.domElement.removeEventListener('pointerup', pointerUp)
      renderer.domElement.removeEventListener('pointercancel', pointerUp)
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) {
          object.geometry.dispose()
          const objectMaterials = Array.isArray(object.material) ? object.material : [object.material]
          objectMaterials.forEach((material) => material.dispose())
        }
      })
      renderer.dispose()
      if (renderer.domElement.parentNode === container) container.removeChild(renderer.domElement)
    }
  }, [floors, mode])

  return (
    <div
      ref={containerRef}
      className={`model-canvas ${mode === 'wireframe' ? 'is-wireframe' : 'is-render'}`}
      tabIndex={0}
      role="img"
      aria-label={`${floors}-floor architectural ${mode} model. Drag or use the arrow keys to rotate.`}
    >
      {fallback && <ModelFallback />}
    </div>
  )
}