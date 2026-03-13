import { inject, injectable } from 'tsyringe'
import { IClientPlatformBridge } from '../adapter/platform-bridge'
import { IClientRuntimeBridge } from '../adapter/runtime-bridge'

export interface StreamingRequest {
  type: 'model' | 'animDict' | 'ptfx' | 'texture' | 'audio'
  asset: string
  loaded: boolean
  hash?: number
}

@injectable()
export class StreamingService {
  private loadedAssets: Map<string, StreamingRequest> = new Map()

  constructor(
    @inject(IClientPlatformBridge as any) private readonly platform: IClientPlatformBridge,
    @inject(IClientRuntimeBridge as any) private readonly runtime: IClientRuntimeBridge,
  ) {}

  async requestModel(model: string | number, timeout = 10000): Promise<boolean> {
    const hash = typeof model === 'string' ? this.platform.getHashKey(model) : model
    const key = `model:${hash}`

    if (this.loadedAssets.get(key)?.loaded) return true
    if (!this.platform.isModelInCdimage(hash) || !this.platform.isModelValid(hash)) return false

    this.platform.requestModel(hash)
    const startTime = this.runtime.getGameTimer()
    while (!this.platform.hasModelLoaded(hash)) {
      if (this.runtime.getGameTimer() - startTime > timeout) return false
      await new Promise((r) => setTimeout(r, 0))
    }

    this.loadedAssets.set(key, { type: 'model', asset: String(model), loaded: true, hash })
    return true
  }

  isModelLoaded(model: string | number): boolean {
    const hash = typeof model === 'string' ? this.platform.getHashKey(model) : model
    return this.platform.hasModelLoaded(hash)
  }

  releaseModel(model: string | number): void {
    const hash = typeof model === 'string' ? this.platform.getHashKey(model) : model
    this.platform.setModelAsNoLongerNeeded(hash)
    this.loadedAssets.delete(`model:${hash}`)
  }

  isModelValid(model: string | number): boolean {
    const hash = typeof model === 'string' ? this.platform.getHashKey(model) : model
    return this.platform.isModelInCdimage(hash) && this.platform.isModelValid(hash)
  }

  isModelVehicle(model: string | number): boolean {
    const hash = typeof model === 'string' ? this.platform.getHashKey(model) : model
    return this.platform.isModelAVehicle(hash)
  }

  isModelPed(model: string | number): boolean {
    const hash = typeof model === 'string' ? this.platform.getHashKey(model) : model
    return this.platform.isModelAPed(hash)
  }

  async requestAnimDict(dict: string, timeout = 10000): Promise<boolean> {
    const key = `anim:${dict}`
    if (this.loadedAssets.get(key)?.loaded) return true

    this.platform.requestAnimDict(dict)
    const startTime = this.runtime.getGameTimer()
    while (!this.platform.hasAnimDictLoaded(dict)) {
      if (this.runtime.getGameTimer() - startTime > timeout) return false
      await new Promise((r) => setTimeout(r, 0))
    }

    this.loadedAssets.set(key, { type: 'animDict', asset: dict, loaded: true })
    return true
  }

  isAnimDictLoaded(dict: string): boolean {
    return this.platform.hasAnimDictLoaded(dict)
  }

  releaseAnimDict(dict: string): void {
    this.platform.removeAnimDict(dict)
    this.loadedAssets.delete(`anim:${dict}`)
  }

  async requestPtfxAsset(asset: string, timeout = 10000): Promise<boolean> {
    const key = `ptfx:${asset}`
    if (this.loadedAssets.get(key)?.loaded) return true

    this.platform.requestNamedPtfxAsset(asset)
    const startTime = this.runtime.getGameTimer()
    while (!this.platform.hasNamedPtfxAssetLoaded(asset)) {
      if (this.runtime.getGameTimer() - startTime > timeout) return false
      await new Promise((r) => setTimeout(r, 0))
    }

    this.loadedAssets.set(key, { type: 'ptfx', asset, loaded: true })
    return true
  }

  isPtfxAssetLoaded(asset: string): boolean {
    return this.platform.hasNamedPtfxAssetLoaded(asset)
  }

  releasePtfxAsset(asset: string): void {
    this.platform.removeNamedPtfxAsset(asset)
    this.loadedAssets.delete(`ptfx:${asset}`)
  }

  async startParticleEffect(
    asset: string,
    effectName: string,
    position: { x: number; y: number; z: number },
    rotation: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 },
    scale = 1.0,
    looped = false,
  ): Promise<number> {
    await this.requestPtfxAsset(asset)
    this.platform.useParticleFxAssetNextCall(asset)
    return looped
      ? this.platform.startParticleFxLoopedAtCoord(effectName, position, rotation, scale)
      : this.platform.startParticleFxNonLoopedAtCoord(effectName, position, rotation, scale)
  }

  stopParticleEffect(handle: number): void {
    this.platform.stopParticleFxLooped(handle, false)
  }

  async requestTextureDict(dict: string, timeout = 10000): Promise<boolean> {
    const key = `texture:${dict}`
    if (this.loadedAssets.get(key)?.loaded) return true

    this.platform.requestStreamedTextureDict(dict, true)
    const startTime = this.runtime.getGameTimer()
    while (!this.platform.hasStreamedTextureDictLoaded(dict)) {
      if (this.runtime.getGameTimer() - startTime > timeout) return false
      await new Promise((r) => setTimeout(r, 0))
    }

    this.loadedAssets.set(key, { type: 'texture', asset: dict, loaded: true })
    return true
  }

  isTextureDictLoaded(dict: string): boolean {
    return this.platform.hasStreamedTextureDictLoaded(dict)
  }

  releaseTextureDict(dict: string): void {
    this.platform.setStreamedTextureDictAsNoLongerNeeded(dict)
    this.loadedAssets.delete(`texture:${dict}`)
  }

  async requestAudioBank(audioBank: string, networked = false, _timeout = 10000): Promise<boolean> {
    const key = `audio:${audioBank}`
    if (this.loadedAssets.get(key)?.loaded) return true

    const success = this.platform.requestScriptAudioBank(audioBank, networked)
    if (!success) return false

    this.loadedAssets.set(key, { type: 'audio', asset: audioBank, loaded: true })
    return true
  }

  releaseAudioBank(audioBank: string): void {
    this.platform.releaseScriptAudioBank(audioBank)
    this.loadedAssets.delete(`audio:${audioBank}`)
  }

  getLoadedAssets(): StreamingRequest[] {
    return Array.from(this.loadedAssets.values())
  }

  releaseAll(): void {
    for (const asset of this.loadedAssets.values()) {
      switch (asset.type) {
        case 'model':
          if (asset.hash) this.platform.setModelAsNoLongerNeeded(asset.hash)
          break
        case 'animDict':
          this.platform.removeAnimDict(asset.asset)
          break
        case 'ptfx':
          this.platform.removeNamedPtfxAsset(asset.asset)
          break
        case 'texture':
          this.platform.setStreamedTextureDictAsNoLongerNeeded(asset.asset)
          break
        case 'audio':
          this.platform.releaseScriptAudioBank(asset.asset)
          break
      }
    }
    this.loadedAssets.clear()
  }

  getHash(str: string): number {
    return this.platform.getHashKey(str)
  }
}
