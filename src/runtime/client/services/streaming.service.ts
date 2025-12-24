import { injectable } from 'tsyringe'

export interface StreamingRequest {
  type: 'model' | 'animDict' | 'ptfx' | 'texture' | 'audio'
  asset: string
  loaded: boolean
  hash?: number
}

/**
 * Service for managing asset streaming (models, animations, particles, etc.).
 */
@injectable()
export class StreamingService {
  private loadedAssets: Map<string, StreamingRequest> = new Map()

  // ─────────────────────────────────────────────────────────────────────────────
  // Model Loading
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Request and load a model.
   *
   * @param model - Model name or hash
   * @param timeout - Maximum wait time in ms
   * @returns Whether the model was loaded successfully
   */
  async requestModel(model: string | number, timeout = 10000): Promise<boolean> {
    const hash = typeof model === 'string' ? GetHashKey(model) : model
    const key = `model:${hash}`

    // Already loaded
    if (this.loadedAssets.get(key)?.loaded) {
      return true
    }

    // Check if valid
    if (!IsModelInCdimage(hash) || !IsModelValid(hash)) {
      return false
    }

    RequestModel(hash)

    const startTime = GetGameTimer()
    while (!HasModelLoaded(hash)) {
      if (GetGameTimer() - startTime > timeout) {
        return false
      }
      await new Promise((r) => setTimeout(r, 0))
    }

    this.loadedAssets.set(key, { type: 'model', asset: String(model), loaded: true, hash })
    return true
  }

  /**
   * Check if a model is loaded.
   *
   * @param model - Model name or hash
   */
  isModelLoaded(model: string | number): boolean {
    const hash = typeof model === 'string' ? GetHashKey(model) : model
    return HasModelLoaded(hash)
  }

  /**
   * Release a loaded model.
   *
   * @param model - Model name or hash
   */
  releaseModel(model: string | number): void {
    const hash = typeof model === 'string' ? GetHashKey(model) : model
    SetModelAsNoLongerNeeded(hash)
    this.loadedAssets.delete(`model:${hash}`)
  }

  /**
   * Check if a model is valid and exists in the game files.
   *
   * @param model - Model name or hash
   */
  isModelValid(model: string | number): boolean {
    const hash = typeof model === 'string' ? GetHashKey(model) : model
    return IsModelInCdimage(hash) && IsModelValid(hash)
  }

  /**
   * Check if a model is a vehicle.
   *
   * @param model - Model name or hash
   */
  isModelVehicle(model: string | number): boolean {
    const hash = typeof model === 'string' ? GetHashKey(model) : model
    return IsModelAVehicle(hash)
  }

  /**
   * Check if a model is a ped.
   *
   * @param model - Model name or hash
   */
  isModelPed(model: string | number): boolean {
    const hash = typeof model === 'string' ? GetHashKey(model) : model
    return IsModelAPed(hash)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Animation Dictionary Loading
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Request and load an animation dictionary.
   *
   * @param dict - Animation dictionary name
   * @param timeout - Maximum wait time in ms
   * @returns Whether the dictionary was loaded successfully
   */
  async requestAnimDict(dict: string, timeout = 10000): Promise<boolean> {
    const key = `anim:${dict}`

    // Already loaded
    if (this.loadedAssets.get(key)?.loaded) {
      return true
    }

    RequestAnimDict(dict)

    const startTime = GetGameTimer()
    while (!HasAnimDictLoaded(dict)) {
      if (GetGameTimer() - startTime > timeout) {
        return false
      }
      await new Promise((r) => setTimeout(r, 0))
    }

    this.loadedAssets.set(key, { type: 'animDict', asset: dict, loaded: true })
    return true
  }

  /**
   * Check if an animation dictionary is loaded.
   *
   * @param dict - Animation dictionary name
   */
  isAnimDictLoaded(dict: string): boolean {
    return HasAnimDictLoaded(dict)
  }

  /**
   * Release a loaded animation dictionary.
   *
   * @param dict - Animation dictionary name
   */
  releaseAnimDict(dict: string): void {
    RemoveAnimDict(dict)
    this.loadedAssets.delete(`anim:${dict}`)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Particle Effects (PTFX) Loading
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Request and load a particle effect asset.
   *
   * @param asset - PTFX asset name
   * @param timeout - Maximum wait time in ms
   * @returns Whether the asset was loaded successfully
   */
  async requestPtfxAsset(asset: string, timeout = 10000): Promise<boolean> {
    const key = `ptfx:${asset}`

    // Already loaded
    if (this.loadedAssets.get(key)?.loaded) {
      return true
    }

    RequestNamedPtfxAsset(asset)

    const startTime = GetGameTimer()
    while (!HasNamedPtfxAssetLoaded(asset)) {
      if (GetGameTimer() - startTime > timeout) {
        return false
      }
      await new Promise((r) => setTimeout(r, 0))
    }

    this.loadedAssets.set(key, { type: 'ptfx', asset, loaded: true })
    return true
  }

  /**
   * Check if a PTFX asset is loaded.
   *
   * @param asset - PTFX asset name
   */
  isPtfxAssetLoaded(asset: string): boolean {
    return HasNamedPtfxAssetLoaded(asset)
  }

  /**
   * Release a loaded PTFX asset.
   *
   * @param asset - PTFX asset name
   */
  releasePtfxAsset(asset: string): void {
    RemoveNamedPtfxAsset(asset)
    this.loadedAssets.delete(`ptfx:${asset}`)
  }

  /**
   * Start a particle effect at a position.
   *
   * @param asset - PTFX asset name
   * @param effectName - Effect name within the asset
   * @param position - World position
   * @param rotation - Rotation
   * @param scale - Scale
   * @param looped - Whether to loop
   * @returns The particle effect handle
   */
  async startParticleEffect(
    asset: string,
    effectName: string,
    position: { x: number; y: number; z: number },
    rotation: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 },
    scale = 1.0,
    looped = false,
  ): Promise<number> {
    await this.requestPtfxAsset(asset)

    UseParticleFxAssetNextCall(asset)

    if (looped) {
      return StartParticleFxLoopedAtCoord(
        effectName,
        position.x,
        position.y,
        position.z,
        rotation.x,
        rotation.y,
        rotation.z,
        scale,
        false,
        false,
        false,
        false,
      )
    } else {
      return StartParticleFxNonLoopedAtCoord(
        effectName,
        position.x,
        position.y,
        position.z,
        rotation.x,
        rotation.y,
        rotation.z,
        scale,
        false,
        false,
        false,
      )
    }
  }

  /**
   * Stop a looped particle effect.
   *
   * @param handle - Particle effect handle
   */
  stopParticleEffect(handle: number): void {
    StopParticleFxLooped(handle, false)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Texture Dictionary Loading
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Request and load a texture dictionary.
   *
   * @param dict - Texture dictionary name
   * @param timeout - Maximum wait time in ms
   * @returns Whether the dictionary was loaded successfully
   */
  async requestTextureDict(dict: string, timeout = 10000): Promise<boolean> {
    const key = `texture:${dict}`

    // Already loaded
    if (this.loadedAssets.get(key)?.loaded) {
      return true
    }

    RequestStreamedTextureDict(dict, true)

    const startTime = GetGameTimer()
    while (!HasStreamedTextureDictLoaded(dict)) {
      if (GetGameTimer() - startTime > timeout) {
        return false
      }
      await new Promise((r) => setTimeout(r, 0))
    }

    this.loadedAssets.set(key, { type: 'texture', asset: dict, loaded: true })
    return true
  }

  /**
   * Check if a texture dictionary is loaded.
   *
   * @param dict - Texture dictionary name
   */
  isTextureDictLoaded(dict: string): boolean {
    return HasStreamedTextureDictLoaded(dict)
  }

  /**
   * Release a loaded texture dictionary.
   *
   * @param dict - Texture dictionary name
   */
  releaseTextureDict(dict: string): void {
    SetStreamedTextureDictAsNoLongerNeeded(dict)
    this.loadedAssets.delete(`texture:${dict}`)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Audio Loading
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Request and load a script audio bank.
   *
   * @param audioBank - Audio bank name
   * @param networked - Whether the audio should be networked
   * @param timeout - Maximum wait time in ms
   * @returns Whether the audio bank was loaded successfully
   */
  async requestAudioBank(audioBank: string, networked = false, _timeout = 10000): Promise<boolean> {
    const key = `audio:${audioBank}`

    // Already loaded
    if (this.loadedAssets.get(key)?.loaded) {
      return true
    }

    const success = RequestScriptAudioBank(audioBank, networked)
    if (!success) return false

    this.loadedAssets.set(key, { type: 'audio', asset: audioBank, loaded: true })
    return true
  }

  /**
   * Release a loaded audio bank.
   *
   * @param audioBank - Audio bank name
   */
  releaseAudioBank(audioBank: string): void {
    ReleaseScriptAudioBank()
    this.loadedAssets.delete(`audio:${audioBank}`)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Utility Methods
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get all currently loaded assets.
   */
  getLoadedAssets(): StreamingRequest[] {
    return Array.from(this.loadedAssets.values())
  }

  /**
   * Release all loaded assets.
   */
  releaseAll(): void {
    for (const asset of this.loadedAssets.values()) {
      switch (asset.type) {
        case 'model':
          if (asset.hash) SetModelAsNoLongerNeeded(asset.hash)
          break
        case 'animDict':
          RemoveAnimDict(asset.asset)
          break
        case 'ptfx':
          RemoveNamedPtfxAsset(asset.asset)
          break
        case 'texture':
          SetStreamedTextureDictAsNoLongerNeeded(asset.asset)
          break
        case 'audio':
          ReleaseScriptAudioBank()
          break
      }
    }
    this.loadedAssets.clear()
  }

  /**
   * Get hash key for a string.
   *
   * @param str - String to hash
   */
  getHash(str: string): number {
    return GetHashKey(str)
  }
}
