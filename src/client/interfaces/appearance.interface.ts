export interface PlayerAppearance {
  components?: Record<number, { drawable: number; texture: number }>
  props?: Record<number, { drawable: number; texture: number }>
  faceFeatures?: Record<number, number>
  headBlend?: {
    shapeFirst: number
    shapeSecond: number
    shapeMix: number
    skinFirst: number
    skinSecond: number
    skinMix: number
  }
}
