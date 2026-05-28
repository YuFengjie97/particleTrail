import { abs, attribute, cos, dot, float, floor, Fn, fwidth, hash, instancedArray, instanceIndex, max, min, mix, mx_noise_float, mx_noise_vec3, normalLocal, normalView, positionLocal, pow, sign, sin, smoothstep, step, texture, time, transformedNormalView, uniform, uv, varying, vec3, vec4 } from "three/tsl"
import * as THREE from "three/webgpu"
import {renderer} from './scene'

import {scene} from '@/world/scene'
import { emitter } from "@/utils/emitter"


export default function particleTrail(){
  const COUNT = 30000
  // @range: { min: 0, max: 10, step: 0.1 }
  const range = uniform(5)
  // @range: { min: 0, max: 1, step: 0.1 }
  const speed = uniform(.4)
  // @range: { min: 0, max: 3, step: 0.01 }
  const scale = uniform(1.1)
  // @range: { min: 50, max: 3000, step: 1 }
  const trailLen = uniform(1000)

  // @range: { min: 0, max: .99, step: 0.01 }
  const seedNoiseScale = uniform(.4)
  // @range: { min: 0, max: 10, step: 0.01 }
  const seedNoiseAmp = uniform(3)
  // @range: { min: 0, max: 1, step: 0.01 }
  const mixV = uniform(.5)



  // const loader = new THREE.TextureLoader();
  // const map = loader.load( import.meta.env.BASE_URL + 'img/smoke_01.png' );


  const geo = new THREE.PlaneGeometry(.1,.1)
  const mat = new THREE.SpriteNodeMaterial()

  // const posArr = new Float32Array(COUNT*3)
  // for(let i=0;i<COUNT;i++){
  //   const x = (Math.random()*2+8) * (Math.random()<.5?-1:1)
  //   const y = (Math.random()*2+8) * (Math.random()<.5?-1:1)
  //   const z = (Math.random()*2+8) * (Math.random()<.5?-1:1)

  //   posArr[i*3] = x
  //   posArr[i*3+1] = y
  //   posArr[i*3+2] = z
  // }

  const posBuffer = instancedArray(COUNT, 'vec3')
  const velBuffer = instancedArray(COUNT, 'vec3')


  const vTrailId = varying(float(0))
  const vCol = varying(vec3(1))


  mat.positionNode = Fn(() => {
    const idx = float(instanceIndex)
    const trailId = floor(idx.div(trailLen))

    vTrailId.assign(trailId)
    const col = sin(vec3(3,2,1).add(trailId.mul(1.43))).mul(.5).add(.5)
    vCol.assign(col)

    return posBuffer.element(instanceIndex)
  })()

  mat.colorNode = Fn(() => {
    return vCol
    // const tex = texture(map, uv()).r
    // return vec4(vCol.mul(tex).mul(2), tex)
  })()


  const computePos = Fn(() => {
    const idx = float(instanceIndex)
    const pos = posBuffer.element(idx)

    const trailId = floor(idx.div(trailLen))
    // const seed = hash(trailId.mul(132.23)).mul(423.45)
    // const seed = mx_noise_vec3(trailId.mul(132.23)).mul(423.45)
    const seed = mx_noise_vec3(trailId.mul(seedNoiseScale)).mul(seedNoiseAmp)

    const path1 = mx_noise_vec3(
                  idx.mul(scale.mul(.001))
                  .add(time.mul(speed))
                  .add(seed))
    
    const path2 = vec3(
      cos(idx.add(time).add(seed.x)),
      sin(idx.add(time).add(seed.y)),
      cos(idx.add(time).add(seed.z))
    )


    pos.assign(mix(path1,path2,mixV).mul(range))
  })().compute(COUNT)


  emitter.on('animate', ({delta, elapsed}) =>{
    renderer.compute(computePos)
  })


  const ins = new THREE.InstancedMesh(geo, mat, COUNT)

  scene.add(ins)

}