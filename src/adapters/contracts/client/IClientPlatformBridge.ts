import type { Vector3 } from '../../../kernel/utils/vector3'

export interface TextDrawOptions {
  font?: number
  scale?: number
  color?: { r: number; g: number; b: number; a: number }
  alignment?: number
  dropShadow?: boolean
  outline?: boolean
  wrapStart?: number
  wrapEnd?: number
  center?: boolean
}

export interface MarkerDrawOptions {
  type: number
  position: Vector3
  direction?: Vector3
  rotation?: Vector3
  scale: Vector3
  color: { r: number; g: number; b: number; a: number }
  bobUpAndDown: boolean
  faceCamera: boolean
  rotate: boolean
  textureDict?: string
  textureName?: string
  drawOnEnts: boolean
}

export class IClientPlatformBridge {
  getLocalPlayerPed(): number {
    return 0
  }
  getEntityCoords(_entity: number): Vector3 {
    return { x: 0, y: 0, z: 0 }
  }
  getWorldPositionOfEntityBone(_entity: number, _bone: number): Vector3 {
    return { x: 0, y: 0, z: 0 }
  }
  getGameplayCamCoords(): Vector3 {
    return { x: 0, y: 0, z: 0 }
  }
  getDistanceBetweenCoords(a: Vector3, b: Vector3, useZ = true): number {
    const dz = useZ ? a.z - b.z : 0
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + dz ** 2)
  }
  worldToScreen(_position: Vector3): { onScreen: boolean; x: number; y: number } {
    return { onScreen: false, x: 0, y: 0 }
  }
  getHashKey(value: string): number {
    let hash = 0
    const key = value.toLowerCase()
    for (let i = 0; i < key.length; i += 1) {
      hash += key.charCodeAt(i)
      hash += hash << 10
      hash ^= hash >>> 6
    }
    hash += hash << 3
    hash ^= hash >>> 11
    hash += hash << 15
    return hash >>> 0
  }
  isModelInCdimage(_hash: number): boolean {
    return false
  }
  isModelValid(_hash: number): boolean {
    return false
  }
  isModelAVehicle(_hash: number): boolean {
    return false
  }
  isModelAPed(_hash: number): boolean {
    return false
  }
  requestModel(_hash: number): void {}
  hasModelLoaded(_hash: number): boolean {
    return false
  }
  setModelAsNoLongerNeeded(_hash: number): void {}
  requestAnimDict(_dict: string): void {}
  hasAnimDictLoaded(_dict: string): boolean {
    return false
  }
  removeAnimDict(_dict: string): void {}
  requestNamedPtfxAsset(_asset: string): void {}
  hasNamedPtfxAssetLoaded(_asset: string): boolean {
    return false
  }
  removeNamedPtfxAsset(_asset: string): void {}
  useParticleFxAssetNextCall(_asset: string): void {}
  startParticleFxLoopedAtCoord(
    _effectName: string,
    _position: Vector3,
    _rotation: Vector3,
    _scale: number,
  ): number {
    return 0
  }
  startParticleFxNonLoopedAtCoord(
    _effectName: string,
    _position: Vector3,
    _rotation: Vector3,
    _scale: number,
  ): number {
    return 0
  }
  stopParticleFxLooped(_handle: number, _stop: boolean): void {}
  requestStreamedTextureDict(_dict: string, _persistent: boolean): void {}
  hasStreamedTextureDictLoaded(_dict: string): boolean {
    return false
  }
  setStreamedTextureDictAsNoLongerNeeded(_dict: string): void {}
  requestScriptAudioBank(_bank: string, _networked: boolean): boolean {
    return false
  }
  releaseScriptAudioBank(_bank: string): void {}
  doesEntityExist(_entity: number): boolean {
    return false
  }
  setEntityAsMissionEntity(_entity: number, _mission: boolean, _scriptHostObject: boolean): void {}
  setBlockingOfNonTemporaryEvents(_ped: number, _toggle: boolean): void {}
  setPedRelationshipGroupHash(_ped: number, _groupHash: number): void {}
  createPed(
    _pedType: number,
    _modelHash: number,
    _position: Vector3,
    _heading: number,
    _networked: boolean,
    _scriptHostPed: boolean,
  ): number {
    return 0
  }
  deletePed(_ped: number): void {}
  createObject(
    _modelHash: number,
    _position: Vector3,
    _networked: boolean,
    _dynamic: boolean,
    _placeOnGround: boolean,
  ): number {
    return 0
  }
  deleteEntity(_entity: number): void {}
  attachEntityToEntity(
    _entity: number,
    _target: number,
    _boneIndex: number,
    _offset: Vector3,
    _rotation: Vector3,
  ): void {}
  getPedBoneIndex(_ped: number, bone: number): number {
    return bone
  }
  taskPlayAnim(
    _ped: number,
    _dict: string,
    _anim: string,
    _blendInSpeed: number,
    _blendOutSpeed: number,
    _duration: number,
    _flags: number,
    _playbackRate: number,
  ): void {}
  stopAnimTask(_ped: number, _dict: string, _anim: string, _blendOutSpeed: number): void {}
  clearPedTasks(_ped: number): void {}
  clearPedTasksImmediately(_ped: number): void {}
  freezeEntityPosition(_entity: number, _toggle: boolean): void {}
  setEntityInvincible(_entity: number, _toggle: boolean): void {}
  giveWeaponToPed(
    _ped: number,
    _weaponHash: number,
    _ammoCount: number,
    _hidden: boolean,
    _forceInHand: boolean,
  ): void {}
  removeAllPedWeapons(_ped: number, _includeCurrentWeapon: boolean): void {}
  getClosestPed(_position: Vector3, _radius: number): number | null {
    return null
  }
  getNearbyPeds(_position: Vector3, _radius: number, _excludeEntity?: number): number[] {
    return []
  }
  taskLookAtEntity(_ped: number, _entity: number, _duration: number): void {}
  taskLookAtCoord(_ped: number, _position: Vector3, _duration: number): void {}
  taskGoStraightToCoord(_ped: number, _position: Vector3, _speed: number): void {}
  setPedCombatAttributes(_ped: number, _attributeIndex: number, _enabled: boolean): void {}
  createVehicle(
    _modelHash: number,
    _position: Vector3,
    _heading: number,
    _networked: boolean,
    _scriptHostVehicle: boolean,
  ): number {
    return 0
  }
  deleteVehicle(_vehicle: number): void {}
  setVehicleOnGroundProperly(_vehicle: number): void {}
  getVehicleColours(_vehicle: number): [number, number] {
    return [0, 0]
  }
  setVehicleColours(_vehicle: number, _primary: number, _secondary: number): void {}
  setVehicleNumberPlateText(_vehicle: number, _plateText: string): void {}
  taskWarpPedIntoVehicle(_ped: number, _vehicle: number, _seatIndex: number): void {}
  taskLeaveVehicle(_ped: number, _vehicle: number, _flags: number): void {}
  getClosestVehicle(_position: Vector3, _radius: number): number | null {
    return null
  }
  isPedInAnyVehicle(_ped: number): boolean {
    return false
  }
  getVehiclePedIsIn(_ped: number, _lastVehicle: boolean): number | null {
    return null
  }
  getPedInVehicleSeat(_vehicle: number, _seatIndex: number): number | null {
    return null
  }
  getEntitySpeed(_entity: number): number {
    return 0
  }
  networkGetNetworkIdFromEntity(_entity: number): number {
    return 0
  }
  networkDoesEntityExistWithNetworkId(_networkId: number): boolean {
    return false
  }
  networkGetEntityFromNetworkId(_networkId: number): number {
    return 0
  }
  getEntityHeading(_entity: number): number {
    return 0
  }
  getEntityModel(_entity: number): number {
    return 0
  }
  getVehicleNumberPlateText(_vehicle: number): string {
    return ''
  }
  setVehicleModKit(_vehicle: number, _kit: number): void {}
  setVehicleMod(
    _vehicle: number,
    _modType: number,
    _modIndex: number,
    _customTires: boolean,
  ): void {}
  toggleVehicleMod(_vehicle: number, _modType: number, _toggle: boolean): void {}
  setVehicleWheelType(_vehicle: number, _wheelType: number): void {}
  setVehicleWindowTint(_vehicle: number, _tint: number): void {}
  setVehicleLivery(_vehicle: number, _livery: number): void {}
  setVehicleNumberPlateTextIndex(_vehicle: number, _index: number): void {}
  setVehicleNeonLightEnabled(_vehicle: number, _index: number, _enabled: boolean): void {}
  setVehicleNeonLightsColour(_vehicle: number, _r: number, _g: number, _b: number): void {}
  setVehicleExtra(_vehicle: number, _extraId: number, _disable: boolean): void {}
  getVehicleExtraColours(_vehicle: number): [number, number] {
    return [0, 0]
  }
  setVehicleExtraColours(_vehicle: number, _pearl: number, _wheel: number): void {}
  setVehicleFixed(_vehicle: number): void {}
  setVehicleDeformationFixed(_vehicle: number): void {}
  setVehicleUndriveable(_vehicle: number, _toggle: boolean): void {}
  setVehicleEngineOn(
    _vehicle: number,
    _value: boolean,
    _instantly: boolean,
    _disableAutoStart: boolean,
  ): void {}
  setVehicleEngineHealth(_vehicle: number, _health: number): void {}
  setVehiclePetrolTankHealth(_vehicle: number, _health: number): void {}
  setVehicleFuelLevel(_vehicle: number, _level: number): void {}
  getVehicleFuelLevel(_vehicle: number): number {
    return 0
  }
  setVehicleDoorsLocked(_vehicle: number, _doorLockStatus: number): void {}
  setEntityHeading(_entity: number, _heading: number): void {}
  setEntityCoords(_entity: number, _position: Vector3): void {}
  setEntityCoordsNoOffset(_entity: number, _position: Vector3): void {}
  setEntityHealth(_entity: number, _health: number): void {}
  getEntityMaxHealth(_entity: number): number {
    return 200
  }
  setPedArmour(_ped: number, _armour: number): void {}
  isScreenFadedOut(): boolean {
    return false
  }
  isScreenFadingOut(): boolean {
    return false
  }
  doScreenFadeOut(_ms: number): void {}
  isScreenFadedIn(): boolean {
    return true
  }
  isScreenFadingIn(): boolean {
    return false
  }
  doScreenFadeIn(_ms: number): void {}
  networkIsSessionStarted(): boolean {
    return true
  }
  networkResurrectLocalPlayer(_position: Vector3, _heading: number): void {}
  playerId(): number {
    return 0
  }
  setPlayerModel(_playerId: number, _modelHash: number): void {}
  requestCollisionAtCoord(_position: Vector3): void {}
  hasCollisionLoadedAroundEntity(_entity: number): boolean {
    return true
  }
  resetEntityAlpha(_entity: number): void {}
  setEntityAlpha(_entity: number, _alphaLevel: number): void {}
  setEntityVisible(_entity: number, _toggle: boolean): void {}
  setEntityCollision(_entity: number, _toggle: boolean): void {}
  shutdownLoadingScreen(): void {}
  shutdownLoadingScreenNui(): void {}
  addBlipForCoord(_position: Vector3): number {
    return 0
  }
  addBlipForEntity(_entity: number): number {
    return 0
  }
  addBlipForRadius(_position: Vector3, _radius: number): number {
    return 0
  }
  doesBlipExist(_handle: number): boolean {
    return false
  }
  removeBlip(_handle: number): void {}
  setBlipCoords(_handle: number, _position: Vector3): void {}
  setBlipRoute(_handle: number, _enabled: boolean): void {}
  setBlipRouteColour(_handle: number, _color: number): void {}
  setBlipSprite(_handle: number, _sprite: number): void {}
  setBlipColour(_handle: number, _color: number): void {}
  setBlipScale(_handle: number, _scale: number): void {}
  setBlipAsShortRange(_handle: number, _toggle: boolean): void {}
  setBlipDisplay(_handle: number, _displayId: number): void {}
  setBlipCategory(_handle: number, _index: number): void {}
  setBlipFlashes(_handle: number, _toggle: boolean): void {}
  setBlipAlpha(_handle: number, _alpha: number): void {}
  setBlipName(_handle: number, _label: string): void {}
  drawMarker(_options: MarkerDrawOptions): void {}
  setNotificationTextEntry(_type: string): void {}
  addTextComponentString(_text: string): void {}
  drawNotification(_blink: boolean, _saveToBrief: boolean): void {}
  beginTextCommandThefeedPost(_type: string): void {}
  endTextCommandThefeedPostMessagetext(
    _textureDict: string,
    _textureName: string,
    _flash: boolean,
    _iconType: number,
    _sender: string,
    _subject: string,
  ): void {}
  setNotificationBackgroundColor(_color: number): void {}
  setNotificationMessage(
    _textureDict: string,
    _textureName: string,
    _flash: boolean,
    _iconType: number,
    _title: string,
    _subtitle: string,
  ): void {}
  beginTextCommandDisplayHelp(_type: string): void {}
  addTextComponentSubstringPlayerName(_text: string): void {}
  endTextCommandDisplayHelp(
    _shape: number,
    _loop: boolean,
    _beep: boolean,
    _duration: number,
  ): void {}
  clearAllHelpMessages(): void {}
  beginTextCommandPrint(_type: string): void {}
  endTextCommandPrint(_duration: number, _drawImmediately: boolean): void {}
  clearPrints(): void {}
  setFloatingHelpTextWorldPosition(_style: number, _position: Vector3): void {}
  setFloatingHelpTextStyle(
    _style: number,
    _hudColor: number,
    _alpha: number,
    _p3: number,
    _arrowDirection: number,
    _p5: number,
  ): void {}
  setTextFont(_fontType: number): void {}
  setTextScale(_scale: number): void {}
  setTextColour(_color: { r: number; g: number; b: number; a: number }): void {}
  setTextJustification(_justifyType: number): void {}
  setTextDropshadow(_distance: number, _r: number, _g: number, _b: number, _a: number): void {}
  setTextDropShadow(): void {}
  setTextOutline(): void {}
  setTextWrap(_start: number, _end: number): void {}
  setTextRightJustify(_toggle: boolean): void {}
  beginTextCommandDisplayText(_type: string): void {}
  endTextCommandDisplayText(_x: number, _y: number): void {}
  setTextCentre(_toggle: boolean): void {}
  beginTextCommandBusyspinnerOn(_type: string): void {}
  endTextCommandBusyspinnerOn(_busySpinnerType: number): void {}
  busyspinnerOff(): void {}
  disableAllControlActions(_padIndex: number): void {}
  disableControlAction(_padIndex: number, _control: number, _disable: boolean): void {}
  isControlJustPressed(_padIndex: number, _control: number): boolean {
    return false
  }
  drawRect(
    _x: number,
    _y: number,
    _width: number,
    _height: number,
    _r: number,
    _g: number,
    _b: number,
    _a: number,
  ): void {}
  displayHud(_toggle: boolean): void {}
  displayRadar(_toggle: boolean): void {}
  clearTimecycleModifier(): void {}
  setTimecycleModifier(_modifierName: string): void {}
  setTimecycleModifierStrength(_strength: number): void {}
  createCam(_camName: string, _active: boolean): number {
    return 0
  }
  setCamActive(_cam: number, _active: boolean): void {}
  renderScriptCams(
    _render: boolean,
    _ease: boolean,
    _easeTimeMs: number,
    _p3: boolean,
    _p4: boolean,
  ): void {}
  destroyCam(_cam: number, _destroy: boolean): void {}
  destroyAllCams(_destroy: boolean): void {}
  setCamCoord(_cam: number, _position: Vector3): void {}
  setCamRot(_cam: number, _rotation: Vector3, _rotationOrder: number): void {}
  setCamFov(_cam: number, _fov: number): void {}
  pointCamAtCoord(_cam: number, _position: Vector3): void {}
  pointCamAtEntity(_cam: number, _entity: number, _offset: Vector3): void {}
  stopCamPointing(_cam: number): void {}
  setCamActiveWithInterp(
    _toCam: number,
    _fromCam: number,
    _durationMs: number,
    _easeLocation: number,
    _easeRotation: number,
  ): void {}
  shakeCam(_cam: number, _type: string, _amplitude: number): void {}
  stopCamShaking(_cam: number, _stopImmediately: boolean): void {}
  onLocalPlayerStateChange(_key: string, _handler: (value: unknown) => void): () => void {
    return () => {}
  }
  getEntityState<T>(_entity: number, _key: string): T | undefined {
    return undefined
  }
}
