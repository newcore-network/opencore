import { Controller, Command, OnNet, Guard } from '../src/runtime/server/decorators'
import { Server } from '../src/runtime/server'
import { Channels } from '../src/runtime/server/apis/channel.api'
import { Players } from '../src/runtime/server/ports/player-directory'
import { ChannelType } from '../src/runtime/server/types/channel.types'

@Controller()
export class RadioController {
  private playerFrequencies = new Map<number, number>()

  constructor(
    private readonly channelService: Channels,
    private readonly playerDirectory: Players,
  ) {}

  @Command('radio')
  setFrequency(player: Server.Player, frequency: number) {
    if (frequency < 1 || frequency > 999) {
      return 'Frecuencia inválida. Usa un valor entre 1 y 999'
    }

    const currentFreq = this.playerFrequencies.get(player.clientID)
    if (currentFreq) {
      this.channelService.unsubscribe(`radio:${currentFreq}`, player)
    }

    const radioChannel = this.channelService.createRadioChannel(frequency, 5000)
    const subscribed = this.channelService.subscribe(radioChannel.id, player)

    if (subscribed) {
      this.playerFrequencies.set(player.clientID, frequency)
      return `📻 Sintonizado en frecuencia ${frequency}`
    }

    return 'No se pudo sintonizar la frecuencia'
  }

  @Command('r')
  transmit(player: Server.Player, ...message: string[]) {
    const frequency = this.playerFrequencies.get(player.clientID)
    if (!frequency) {
      return 'No estás sintonizado en ninguna frecuencia. Usa /radio [frecuencia]'
    }

    const msg = message.join(' ')
    this.channelService.broadcast(
      `radio:${frequency}`,
      player,
      msg,
      `[Radio ${frequency}] ${player.name}`,
      { r: 255, g: 200, b: 100 },
    )
  }

  @Command('radiooff')
  turnOff(player: Server.Player) {
    const frequency = this.playerFrequencies.get(player.clientID)
    if (!frequency) {
      return 'No tienes ninguna radio activa'
    }

    this.channelService.unsubscribe(`radio:${frequency}`, player)
    this.playerFrequencies.delete(player.clientID)
    return '📻 Radio apagada'
  }
}

@Controller()
export class PhoneController {
  private activeCalls = new Map<number, string>()

  constructor(
    private readonly channelService: Channels,
    private readonly playerDirectory: Players,
  ) {}

  @Command('call')
  initiateCall(caller: Server.Player, targetId: number) {
    if (this.activeCalls.has(caller.clientID)) {
      return 'Ya tienes una llamada activa. Usa /hangup primero'
    }

    const target = this.playerDirectory.getByClient(targetId)
    if (!target) {
      return 'Jugador no encontrado'
    }

    if (this.activeCalls.has(target.clientID)) {
      return `${target.name} está ocupado en otra llamada`
    }

    const phoneChannel = this.channelService.createPhoneChannel(
      caller.clientID.toString(),
      target.clientID.toString(),
    )

    this.channelService.subscribe(phoneChannel.id, caller)
    this.channelService.subscribe(phoneChannel.id, target)

    this.activeCalls.set(caller.clientID, phoneChannel.id)
    this.activeCalls.set(target.clientID, phoneChannel.id)

    this.channelService.broadcastSystem(
      phoneChannel.id,
      `Llamada conectada entre ${caller.name} y ${target.name}`,
      'PHONE',
      { r: 150, g: 255, b: 150 },
    )

    return `📞 Llamando a ${target.name}...`
  }

  @Command('hangup')
  endCall(player: Server.Player) {
    const channelId = this.activeCalls.get(player.clientID)
    if (!channelId) {
      return 'No tienes ninguna llamada activa'
    }

    const channel = this.channelService.get(channelId)
    if (channel) {
      const subscribers = channel.getSubscribers()
      for (const sub of subscribers) {
        this.activeCalls.delete(sub.clientID)
      }
    }

    this.channelService.delete(channelId)
    return '📞 Llamada finalizada'
  }

  @Command('say')
  speak(player: Server.Player, ...message: string[]) {
    const channelId = this.activeCalls.get(player.clientID)
    if (!channelId) {
      return 'No estás en una llamada. Usa /call [id]'
    }

    const msg = message.join(' ')
    this.channelService.broadcast(channelId, player, msg, `[📞] ${player.name}`, {
      r: 150,
      g: 255,
      b: 150,
    })
  }
}

@Controller()
export class ProximityController {
  constructor(private readonly channelService: Channels) {}

  @Command('me')
  actionMessage(player: Server.Player, ...action: string[]) {
    const proximityChannel = this.channelService.createProximityChannel(player, 30)

    if (!proximityChannel) {
      return 'No se pudo crear el canal de proximidad'
    }

    const msg = action.join(' ')
    this.channelService.broadcast(proximityChannel.id, player, msg, `* ${player.name}`, {
      r: 200,
      g: 150,
      b: 255,
    })

    this.channelService.delete(proximityChannel.id)
  }

  @Command('do')
  descriptionMessage(player: Server.Player, ...description: string[]) {
    const proximityChannel = this.channelService.createProximityChannel(player, 30)

    if (!proximityChannel) {
      return 'No se pudo crear el canal de proximidad'
    }

    const msg = description.join(' ')
    this.channelService.broadcast(proximityChannel.id, player, `${msg} (( ${player.name} ))`, '*', {
      r: 150,
      g: 200,
      b: 255,
    })

    this.channelService.delete(proximityChannel.id)
  }

  @Command('shout')
  shout(player: Server.Player, ...message: string[]) {
    const channel = this.channelService.createProximityChannel(player, 100)

    if (!channel) {
      return 'No se pudo crear el canal de proximidad'
    }

    const msg = message.join(' ')
    this.channelService.broadcast(channel.id, player, msg.toUpperCase(), `${player.name} grita`, {
      r: 255,
      g: 100,
      b: 100,
    })

    this.channelService.delete(channel.id)
  }

  @Command('whisper')
  whisper(player: Server.Player, targetId: number, ...message: string[]) {
    const target = this.channelService['playerDirectory'].getByClient(targetId)
    if (!target) {
      return 'Jugador no encontrado'
    }

    const targetPos = target.getPosition()
    const playerPos = player.getPosition()

    if (!targetPos || !playerPos) {
      return 'No se pudo determinar la posición'
    }

    const dx = targetPos.x - playerPos.x
    const dy = targetPos.y - playerPos.y
    const dz = targetPos.z - playerPos.z
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz)

    if (distance > 5) {
      return 'El jugador está demasiado lejos para susurrar'
    }

    const privateChannel = this.channelService.createPrivate([player, target], {
      type: ChannelType.PROXIMITY,
    })

    const msg = message.join(' ')
    this.channelService.broadcast(privateChannel.id, player, msg, `${player.name} susurra`, {
      r: 180,
      g: 180,
      b: 180,
    })

    this.channelService.delete(privateChannel.id)
  }
}

@Controller()
export class TeamController {
  private playerTeams = new Map<number, string>()

  constructor(
    private readonly channelService: Channels,
    private readonly playerDirectory: Players,
  ) {}

  @OnNet('team:join')
  @Guard({ permission: 'team.join' })
  joinTeam(player: Server.Player, teamId: string) {
    const currentTeam = this.playerTeams.get(player.clientID)
    if (currentTeam) {
      this.channelService.unsubscribe(`team:${currentTeam}`, player)
    }

    const teamChannel = this.channelService.createTeamChannel(teamId)
    this.channelService.subscribe(teamChannel.id, player, {
      joinedAt: Date.now(),
      role: 'member',
    })

    this.playerTeams.set(player.clientID, teamId)

    this.channelService.broadcastSystem(
      teamChannel.id,
      `${player.name} se ha unido al equipo`,
      'TEAM',
      { r: 100, g: 255, b: 100 },
    )
  }

  @Command('t')
  @Guard({ permission: 'team.chat' })
  teamChat(player: Server.Player, ...message: string[]) {
    const teamId = this.playerTeams.get(player.clientID)
    if (!teamId) {
      return 'No perteneces a ningún equipo'
    }

    const msg = message.join(' ')
    this.channelService.broadcast(`team:${teamId}`, player, msg, `[TEAM] ${player.name}`, {
      r: 100,
      g: 200,
      b: 255,
    })
  }

  @Command('teamleave')
  leaveTeam(player: Server.Player) {
    const teamId = this.playerTeams.get(player.clientID)
    if (!teamId) {
      return 'No perteneces a ningún equipo'
    }

    this.channelService.unsubscribe(`team:${teamId}`, player)
    this.playerTeams.delete(player.clientID)

    this.channelService.broadcastSystem(
      `team:${teamId}`,
      `${player.name} ha abandonado el equipo`,
      'TEAM',
      { r: 255, g: 100, b: 100 },
    )

    return 'Has abandonado el equipo'
  }

  @Command('teaminfo')
  teamInfo(player: Server.Player) {
    const teamId = this.playerTeams.get(player.clientID)
    if (!teamId) {
      return 'No perteneces a ningún equipo'
    }

    const channel = this.channelService.get(`team:${teamId}`)
    if (!channel) {
      return 'Canal de equipo no encontrado'
    }

    const subscribers = channel.getSubscribers()
    const memberNames = subscribers.map((p) => p.name).join(', ')

    return `Equipo: ${teamId} | Miembros (${subscribers.length}): ${memberNames}`
  }
}

@Controller()
export class AdminController {
  constructor(private readonly channelService: Channels) {}

  @Command('a')
  @Guard({ permission: 'admin' })
  adminChat(player: Server.Player, ...message: string[]) {
    const adminChannel = this.channelService.createAdminChannel()

    if (!this.channelService.isSubscribed(adminChannel.id, player)) {
      this.channelService.subscribe(adminChannel.id, player)
    }

    const msg = message.join(' ')
    this.channelService.broadcast(adminChannel.id, player, msg, `[ADMIN] ${player.name}`, {
      r: 255,
      g: 50,
      b: 50,
    })
  }

  @Command('channellist')
  @Guard({ permission: 'admin' })
  listChannels(player: Server.Player) {
    const allChannels = this.channelService.getAllChannels()
    const channelInfo = allChannels.map((ch) => {
      return `${ch.id} (${ch.type}) - ${ch.getSubscriberCount()} suscriptores`
    })

    return `Canales activos (${allChannels.length}):\n${channelInfo.join('\n')}`
  }

  @Command('channelinfo')
  @Guard({ permission: 'admin' })
  channelInfo(player: Server.Player, channelId: string) {
    const channel = this.channelService.get(channelId)
    if (!channel) {
      return `Canal '${channelId}' no encontrado`
    }

    return JSON.stringify(channel.toJSON(), null, 2)
  }
}
