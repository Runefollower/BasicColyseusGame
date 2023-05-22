import { PlayerShip } from "./GameEntities";
import { SpaceShipRender } from "./SpaceShipRenderer";

export class SSGameEngineClient {
    playerShips: Map<string, PlayerShip> = new Map();;
    playerSessionID: string = "";
    ssRenderer: SpaceShipRender;
    showPlayerLabels = false;

    constructor() {
        this.ssRenderer = new SpaceShipRender();
    }

    //Update the game engine, passed the udt or update delta time
    //the time since last update from the sever
    //and dt, time since last render
    update(udt: number, dt: number) {
        this.ssRenderer.update(dt);

        for (let playerShip of this.playerShips.values()) {
            playerShip.update(udt);
        }
    }

    draw(ctx: CanvasRenderingContext2D) {
        for (let playerShip of this.playerShips.values()) {
            const color = playerShip.sessionId === this.playerSessionID ? "blue" : "green";
            this.ssRenderer.render(
                //playerShip.x + playerShip.vx * udt,
                //playerShip.y + playerShip.vy * udt,
                playerShip.rx,
                playerShip.ry,
                playerShip.vx,
                playerShip.vy,
                playerShip.direction,
                color,
                playerShip.accel,
                ctx,
                playerShip.name,
                this.showPlayerLabels,
                true
            );
        }
    }


    setSessionID(newSessionID: string) {
        this.playerSessionID = newSessionID;
    }

    async updateFromServer(roomState: any) {

        // Create a set of all session IDs in the new state
        //const newStateIDs = new Set(Object.keys(roomState.players));
        const newStateIDs = new Set([...roomState.players.keys()]);

        // Iterate over the existing playerShips map
        for (let [sessionID, playerShip] of this.playerShips) {
            if (newStateIDs.has(sessionID)) {
                // If this player exists in the new state, update its properties
                const playerServerState = roomState.players[sessionID];
                playerShip.name = playerServerState.username;
                playerShip.x = playerServerState.x;
                playerShip.y = playerServerState.y;
                playerShip.vx = playerServerState.vx;
                playerShip.vy = playerServerState.vy;
                playerShip.direction = playerServerState.direction;
                playerShip.vr = playerServerState.vr;
                playerShip.accel = playerServerState.accel;
                playerShip.firing = playerServerState.firing;
                playerShip.lastFired = playerServerState.lastFired;
                playerShip.score = playerServerState.score;

                // Remove the ID from the newStateIDs set
                newStateIDs.delete(sessionID);
            } else {
                // If this player doesn't exist in the new state, remove it
                this.playerShips.delete(sessionID);
            }
        }

        // Any IDs left over in newStateIDs are new players, so add them to the map
        for (let sessionID of newStateIDs) {
            const playerServerState = roomState.players[sessionID];
            this.playerShips.set(sessionID, new PlayerShip(
                playerServerState.x,
                playerServerState.y,
                playerServerState.vx,
                playerServerState.vy,
                playerServerState.direction,
                playerServerState.vr,
                playerServerState.accel,
                playerServerState.name,
                playerServerState.firing,
                playerServerState.lastFired,
                playerServerState.score,
                sessionID
            ));
        }
    }
}