'use client'

import {useEffect, useRef, useState} from 'react'
import {FLAG_EVENT, type FlagState} from './flag-state'

const POSE: Record<FlagState, {raise: number; wind: number; speed: number}> = {
  idle: {raise: 1, wind: 1, speed: 1},
  checking: {raise: .55, wind: .75, speed: 1},
  scam: {raise: 1, wind: 1.4, speed: 1.45},
  suspicious: {raise: 1, wind: 1.2, speed: 1.25},
  unclear: {raise: .6, wind: .8, speed: .9},
  safe: {raise: .32, wind: .4, speed: .6},
}

// Cloth is fixed along the hoist. The pole and fabric share the same projection.
const vertex = `#version 300 es
precision highp float;
in vec2 aUv;
in vec3 aPosition;
in float aMaterial;
uniform float uTime;
uniform float uAspect;
uniform vec2 uPointer;
// How high the flag sits on the pole (1 raised, 0 lowered) and how hard the wind blows.
uniform float uRaise;
uniform float uWind;
out vec3 vPosition;
out vec2 vUv;
flat out float vMaterial;
vec3 cloth(vec2 uv) {
  float edge = pow(uv.x, 1.15);
  float x = -1.65 + uv.x * 3.28;
  float y = (uv.y - .5) * 1.83 + .2;
  float z = sin(uv.x * 6.8 - uTime * 1.4) * .33 * edge * uWind;
  z += sin(uv.x * 13.0 + uv.y * 3.5 - uTime * 1.7) * .075 * edge * uWind;
  y += sin(uv.x * 5.5 - uTime * 1.1) * .055 * edge * uWind;
  // Less wind, more droop at the free end.
  y -= uv.x * (.075 + max(0., 1. - uWind) * .2);
  y -= (1. - uRaise) * .85;
  return vec3(x, y, z);
}
void main() {
  vUv = aUv;
  vMaterial = aMaterial;
  vec3 p = aMaterial < .5 ? cloth(aUv) : aPosition;
  float ry = -.14 + uPointer.x * .10;
  float rz = -.055 + uPointer.y * .012;
  p = vec3(p.x*cos(ry)+p.z*sin(ry),p.y,-p.x*sin(ry)+p.z*cos(ry));
  p.xy = mat2(cos(rz),sin(rz),-sin(rz),cos(rz))*p.xy;
  p.y += .28;
  vPosition = p;
  float perspective = 3.9 / (4.6 - p.z);
  float scale = min(.64, uAspect * .62);
  gl_Position = vec4(p.x*scale/uAspect*perspective,p.y*scale*perspective,p.z*.08,1.);
}`
const fragment = `#version 300 es
precision highp float;
in vec3 vPosition;
in vec2 vUv;
flat in float vMaterial;
uniform sampler2D uPrint;
out vec4 outColor;
void main() {
  vec3 n = normalize(cross(dFdx(vPosition),dFdy(vPosition)));
  if (!gl_FrontFacing) n = -n;
  vec3 light = normalize(vec3(-.6,1.2,2.2));
  vec3 view = normalize(vec3(0.,0.,4.)-vPosition);
  float diffuse = max(dot(n,light),0.);
  float spec = pow(max(dot(n,normalize(light+view)),0.),24.);
  if (vMaterial > .5) {
    vec3 metal = vec3(.48,.55,.59)*(.38+diffuse*.65)+vec3(.82,.86,.88)*spec*.35;
    outColor = vec4(metal,1.);
    return;
  }
  float weave = sin(vUv.x*1400.)*sin(vUv.y*900.)*.004;
  float printAlpha = texture(uPrint,vec2(vUv.x,1.-vUv.y)).a;
  vec3 fabric = mix(vec3(.84,.15,.11),vec3(.96,.94,.89),printAlpha);
  float hem = step(vUv.x,.023) + step(.985,vUv.x) + step(vUv.y,.023) + step(.977,vUv.y);
  vec3 color = fabric*(.40+diffuse*.63+weave)-fabric*min(hem,1.)*.12;
  color += vec3(.95,.73,.63)*spec*.06;
  outColor = vec4(color,1.);
}`

export function FlagScene({paused}: {paused: boolean}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pauseRef = useRef(paused)
  const [ready, setReady] = useState(false)
  const wakeRef = useRef<() => void>(() => {})
  useEffect(() => {
    pauseRef.current = paused
    wakeRef.current()
  }, [paused])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const gl = canvas.getContext('webgl2', {alpha: true, antialias: true, powerPreference: 'low-power'})
    if (!gl) return
    const shaders: WebGLShader[] = []
    function compile(type: number, source: string) {
      const shader = gl!.createShader(type)
      if (!shader) throw new Error('No shader')
      shaders.push(shader)
      gl!.shaderSource(shader, source)
      gl!.compileShader(shader)
      if (!gl!.getShaderParameter(shader, gl!.COMPILE_STATUS)) throw new Error('Shader unavailable')
      return shader
    }
    let program: WebGLProgram | null = null
    try {
      program = gl.createProgram()
      if (!program) return
      gl.attachShader(program, compile(gl.VERTEX_SHADER, vertex))
      gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment))
      gl.linkProgram(program)
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Program unavailable')
    } catch {
      shaders.forEach(shader => gl.deleteShader(shader))
      if (program) gl.deleteProgram(program)
      return
    }
    gl.useProgram(program)
    // Interleaved UV, position and material; cloth positions are computed in the shader.
    const vertices: number[] = [], indices: number[] = []
    const columns = 112, rows = 64
    for (let y = 0; y <= rows; y++) {
      for (let x = 0; x <= columns; x++) vertices.push(x/columns, y/rows, 0, 0, 0, 0)
    }
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < columns; x++) {
        const a = y*(columns+1)+x, b = a+columns+1
        indices.push(a, a+1, b, a+1, b+1, b)
      }
    }
    // A slender cylinder makes the fixed edge and the flag's silhouette unambiguous.
    const poleStart = vertices.length/6, sides = 20
    for (let y = 0; y <= 1; y++) {
      for (let i = 0; i <= sides; i++) {
        const angle = i/sides*Math.PI*2
        vertices.push(0, 0, -1.676+Math.cos(angle)*.026, y ? 1.24 : -1.70, Math.sin(angle)*.026, 1)
      }
    }
    for (let i = 0; i < sides; i++) {
      const a = poleStart+i, b = a+sides+1
      indices.push(a, b, a+1, a+1, b, b+1)
    }
    const capStart = vertices.length/6, capRows = 8
    for (let y = 0; y <= capRows; y++) {
      for (let i = 0; i <= sides; i++) {
        const phi = y/capRows*Math.PI, theta = i/sides*Math.PI*2
        vertices.push(0, 0, -1.676+Math.sin(phi)*Math.cos(theta)*.044, 1.24+Math.cos(phi)*.044, Math.sin(phi)*Math.sin(theta)*.044, 1)
      }
    }
    for (let y = 0; y < capRows; y++) {
      for (let i = 0; i < sides; i++) {
        const a = capStart+y*(sides+1)+i, b = a+sides+1
        indices.push(a, b, a+1, a+1, b, b+1)
      }
    }
    const vertexBuffer = gl.createBuffer(), indexBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW)
    for (const [name, size, offset] of [['aUv', 2, 0], ['aPosition', 3, 8], ['aMaterial', 1, 20]] as const) {
      const location = gl.getAttribLocation(program, name)
      gl.enableVertexAttribArray(location)
      gl.vertexAttribPointer(location, size, gl.FLOAT, false, 24, offset)
    }
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW)
    const print = document.createElement('canvas')
    print.width = 2048; print.height = 1024
    const ctx = print.getContext('2d')
    if (ctx) {
      ctx.font = '400 300px Arial, sans-serif'
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText('red flag.', 1060, 525)
    }
    const texture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, print)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    const timeUniform = gl.getUniformLocation(program, 'uTime')
    const aspectUniform = gl.getUniformLocation(program, 'uAspect')
    const pointerUniform = gl.getUniformLocation(program, 'uPointer')
    const raiseUniform = gl.getUniformLocation(program, 'uRaise')
    const windUniform = gl.getUniformLocation(program, 'uWind')
    const pose = {...POSE.idle}
    let target = POSE.idle
    let width = 1, height = 1, inView = true, frame = 0, last = 0, time = 1.8, dirty = true, contextLost = false
    const pointer = {x: 0, y: 0}, smooth = {x: 0, y: 0}
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    let reduced = media.matches
    // The loop sleeps when there's nothing to draw (hidden, off screen, paused) and wakes on the events below.
    let running = false
    const wake = () => {
      dirty = true
      if (running) return
      running = true
      last = performance.now()
      frame = requestAnimationFrame(render)
    }
    wakeRef.current = wake
    const mediaChanged = () => {reduced = media.matches; wake()}
    const onState = (event: Event) => {
      target = POSE[(event as CustomEvent<FlagState>).detail] ?? POSE.idle
      if (reduced) Object.assign(pose, target)
      wake()
    }
    window.addEventListener(FLAG_EVENT, onState)
    const onContextLost = (event: Event) => {event.preventDefault(); contextLost = true; setReady(false)}
    canvas.addEventListener('webglcontextlost', onContextLost)
    document.addEventListener('visibilitychange', wake)
    media.addEventListener('change', mediaChanged)
    const resize = new ResizeObserver(([entry]) => {
      width = entry.contentRect.width; height = entry.contentRect.height; dirty = true
      const dpr = Math.min(devicePixelRatio, 1.75)
      canvas.width = Math.round(width*dpr); canvas.height = Math.round(height*dpr)
      gl.viewport(0, 0, canvas.width, canvas.height)
      wake()
    })
    resize.observe(canvas)
    const observer = new IntersectionObserver(([entry]) => {inView = entry.isIntersecting; if (inView) wake()})
    observer.observe(canvas)
    const move = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      pointer.x = (event.clientX-rect.left)/rect.width*2-1
      pointer.y = (event.clientY-rect.top)/rect.height*2-1
    }
    const leave = () => {pointer.x = 0; pointer.y = 0}
    canvas.addEventListener('pointermove', move)
    canvas.addEventListener('pointerleave', leave)
    function render(now: number) {
      const delta = Math.min((now-last)/1000, .04)
      last = now
      // Ease the pose towards the checker's state, fast at first and settling softly.
      const ease = 1-Math.exp(-delta*2.6)
      let moving = false
      for (const k of ['raise', 'wind', 'speed'] as const) {
        const gap = target[k]-pose[k]
        if (Math.abs(gap) > .002) {pose[k] += reduced ? gap : gap*ease; moving = true} else pose[k] = target[k]
      }
      if (moving) dirty = true
      const still = pauseRef.current || reduced
      if (!inView || document.hidden || contextLost || !gl || width === 0 || height === 0 || (still && !dirty)) {
        running = false
        return
      }
      frame = requestAnimationFrame(render)
      dirty = false
      if (!pauseRef.current && !reduced) time += delta*pose.speed
      smooth.x += (pointer.x-smooth.x)*.045; smooth.y += (pointer.y-smooth.y)*.045
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
      gl.enable(gl.DEPTH_TEST)
      gl.uniform1f(timeUniform, time)
      gl.uniform1f(aspectUniform, width/height)
      gl.uniform1f(raiseUniform, pose.raise)
      gl.uniform1f(windUniform, pose.wind)
      gl.uniform2f(pointerUniform, reduced || pauseRef.current ? 0 : smooth.x, reduced || pauseRef.current ? 0 : smooth.y)
      gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0)
    }
    wake()
    const readyFrame = requestAnimationFrame(() => setReady(true))
    return () => {
      cancelAnimationFrame(frame); cancelAnimationFrame(readyFrame)
      resize.disconnect(); observer.disconnect(); media.removeEventListener('change', mediaChanged)
      canvas.removeEventListener('pointermove', move); canvas.removeEventListener('pointerleave', leave)
      canvas.removeEventListener('webglcontextlost', onContextLost)
      document.removeEventListener('visibilitychange', wake)
      window.removeEventListener(FLAG_EVENT, onState)
      wakeRef.current = () => {}
      gl.deleteBuffer(vertexBuffer); gl.deleteBuffer(indexBuffer); gl.deleteTexture(texture)
      shaders.forEach(shader => gl.deleteShader(shader)); gl.deleteProgram(program)
    }
  }, [])
  return (
    <div className="flag-scene" data-ready={ready} aria-hidden>
      <div className="flag-fallback">red flag.</div>
      <canvas ref={canvasRef} className="flag-canvas" />
    </div>
  )
}
