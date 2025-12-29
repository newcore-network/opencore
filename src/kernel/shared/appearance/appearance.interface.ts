/**
 * Component variation data for a ped.
 *
 * @remarks
 * Used for clothing, hair, and other visual components.
 * Component IDs range from 0 to 11.
 */
export interface ComponentVariation {
  /** Drawable index for the component */
  drawable: number
  /** Texture index for the drawable */
  texture: number
}

/**
 * Prop data for a ped.
 *
 * @remarks
 * Used for hats, glasses, watches, and other accessories.
 * Prop IDs range from 0 to 7.
 */
export interface PropVariation {
  /** Drawable index for the prop (-1 to remove) */
  drawable: number
  /** Texture index for the drawable */
  texture: number
}

/**
 * Head blend data for freemode character creation.
 *
 * @remarks
 * Controls the facial structure inheritance from parent faces.
 * Shape and skin IDs range from 0 to 45.
 * Mix values range from 0.0 to 1.0.
 */
export interface HeadBlendData {
  /** First parent shape ID (0-45) */
  shapeFirst: number
  /** Second parent shape ID (0-45) */
  shapeSecond: number
  /** Third parent shape ID (0-45), optional */
  shapeThird?: number
  /** First parent skin ID (0-45) */
  skinFirst: number
  /** Second parent skin ID (0-45) */
  skinSecond: number
  /** Third parent skin ID (0-45), optional */
  skinThird?: number
  /** Shape mix between first and second parent (0.0-1.0) */
  shapeMix: number
  /** Skin mix between first and second parent (0.0-1.0) */
  skinMix: number
  /** Third parent mix (0.0-1.0), optional */
  thirdMix?: number
}

/**
 * Head overlay data for facial features like makeup, beard, etc.
 *
 * @remarks
 * Overlay IDs range from 0 to 12:
 * - 0: Blemishes (0-23)
 * - 1: Facial Hair (0-28)
 * - 2: Eyebrows (0-33)
 * - 3: Ageing (0-14)
 * - 4: Makeup (0-74)
 * - 5: Blush (0-6)
 * - 6: Complexion (0-11)
 * - 7: Sun Damage (0-10)
 * - 8: Lipstick (0-9)
 * - 9: Moles/Freckles (0-17)
 * - 10: Chest Hair (0-16)
 * - 11: Body Blemishes (0-11)
 * - 12: Add Body Blemishes (0-1)
 *
 * Set index to 255 to disable the overlay.
 */
export interface HeadOverlayData {
  /** Overlay variation index (use 255 to disable) */
  index: number
  /** Opacity of the overlay (0.0-1.0) */
  opacity: number
  /**
   * Color type for the overlay.
   * - 0: Default
   * - 1: Hair colors (eyebrows, beards, chest hair)
   * - 2: Makeup colors (blush, lipstick)
   */
  colorType?: number
  /** Primary color ID */
  colorId?: number
  /** Secondary color ID */
  secondColorId?: number
}

/**
 * Hair color data including highlights.
 */
export interface HairColorData {
  /** Primary hair color ID */
  colorId: number
  /** Highlight color ID */
  highlightColorId: number
}

/**
 * Tattoo/decoration data.
 *
 * @remarks
 * Tattoos are applied using collection and overlay hashes.
 * Collections are defined in game files (e.g., "mpbeach_overlays").
 */
export interface TattooData {
  /** Collection name hash (e.g., "mpbeach_overlays") */
  collection: string
  /** Overlay name hash within the collection */
  overlay: string
}

/**
 * Complete player appearance data structure.
 *
 * @remarks
 * This interface contains all customization options for a freemode ped.
 * Not all fields are required - only include what needs to be changed.
 *
 * @example
 * ```typescript
 * const appearance: PlayerAppearance = {
 *   model: 'mp_m_freemode_01',
 *   headBlend: {
 *     shapeFirst: 0,
 *     shapeSecond: 21,
 *     skinFirst: 0,
 *     skinSecond: 21,
 *     shapeMix: 0.5,
 *     skinMix: 0.5
 *   },
 *   components: {
 *     3: { drawable: 15, texture: 0 }, // Torso
 *     4: { drawable: 21, texture: 0 }, // Legs
 *     6: { drawable: 34, texture: 0 }, // Shoes
 *   },
 *   eyeColor: 3,
 *   hairColor: { colorId: 5, highlightColorId: 0 }
 * }
 * ```
 */
export interface PlayerAppearance {
  /**
   * Ped model name.
   * @example "mp_m_freemode_01" or "mp_f_freemode_01"
   */
  model?: string

  /**
   * Component variations (clothing, hair, etc.).
   * Keys are component IDs (0-11).
   */
  components?: Record<number, ComponentVariation>

  /**
   * Prop variations (hats, glasses, etc.).
   * Keys are prop IDs (0-7).
   */
  props?: Record<number, PropVariation>

  /**
   * Face feature morphs.
   * Keys are feature indices (0-19), values range from -1.0 to 1.0.
   *
   * @remarks
   * Feature indices:
   * - 0-5: Nose (width, peak, length, curve, tip, twist)
   * - 6-7: Eyebrows (up/down, in/out)
   * - 8-10: Cheeks (height, width, puffed)
   * - 11: Eye opening
   * - 12: Lip thickness
   * - 13-14: Jaw (width, shape)
   * - 15-18: Chin (height, length, shape, hole)
   * - 19: Neck thickness
   */
  faceFeatures?: Record<number, number>

  /**
   * Head blend data for facial structure.
   */
  headBlend?: HeadBlendData

  /**
   * Head overlays (makeup, facial hair, etc.).
   * Keys are overlay IDs (0-12).
   */
  headOverlays?: Record<number, HeadOverlayData>

  /**
   * Hair color and highlights.
   */
  hairColor?: HairColorData

  /**
   * Eye color index (0-31).
   */
  eyeColor?: number

  /**
   * Tattoos/decorations to apply.
   */
  tattoos?: TattooData[]
}

/**
 * Result of appearance validation.
 */
export interface AppearanceValidationResult {
  /** Whether the appearance data is valid */
  valid: boolean
  /** List of validation errors if any */
  errors: string[]
}

/**
 * Component ID enum for better code readability.
 */
export enum ComponentId {
  Face = 0,
  Mask = 1,
  Hair = 2,
  Torso = 3,
  Legs = 4,
  Parachute = 5,
  Shoes = 6,
  Accessory = 7,
  Undershirt = 8,
  Kevlar = 9,
  Badge = 10,
  Torso2 = 11,
}

/**
 * Prop ID enum for better code readability.
 */
export enum PropId {
  Hat = 0,
  Glasses = 1,
  Ears = 2,
  Watch = 6,
  Bracelet = 7,
}

/**
 * Overlay ID enum for better code readability.
 */
export enum OverlayId {
  Blemishes = 0,
  FacialHair = 1,
  Eyebrows = 2,
  Ageing = 3,
  Makeup = 4,
  Blush = 5,
  Complexion = 6,
  SunDamage = 7,
  Lipstick = 8,
  MolesFreckles = 9,
  ChestHair = 10,
  BodyBlemishes = 11,
  AddBodyBlemishes = 12,
}

/**
 * Face feature index enum for better code readability.
 */
export enum FaceFeatureIndex {
  NoseWidth = 0,
  NosePeak = 1,
  NoseLength = 2,
  NoseCurve = 3,
  NoseTip = 4,
  NoseTwist = 5,
  EyebrowHeight = 6,
  EyebrowDepth = 7,
  CheekHeight = 8,
  CheekWidth = 9,
  CheekDepth = 10,
  EyeOpening = 11,
  LipThickness = 12,
  JawWidth = 13,
  JawShape = 14,
  ChinHeight = 15,
  ChinLength = 16,
  ChinShape = 17,
  ChinHole = 18,
  NeckThickness = 19,
}
