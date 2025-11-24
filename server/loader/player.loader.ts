import { container } from "tsyringe";
import { PlayerManager } from "../player.manager";
import { emitToClientTyped } from "@shared/net-bridge";

export const playerLoader = () => {
    const playerManager = container.resolve(PlayerManager);

    on("playerJoining", (source: string) => {
        const src = Number(source);

        const license = GetPlayerIdentifier(src.toString(), 0) ?? null
        const session = playerManager.bind(
            src,
            license ?? `temp-${src}-${Date.now()}`
        );
        emitToClientTyped("player:connected", src, {})
    });

    on("playerDropped", () => {
        const src = Number(global.source);
        playerManager.unbindByClient(src);
        emit("core:playerDisconnected", src);
    });
}