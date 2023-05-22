import { PlayerShip } from "./GameEntities";
import { SpaceShipRender } from "./SpaceShipRenderer";

export class SSGameEngineClient {
    //Map of active ships
    playerShips: Map<string, PlayerShip> = new Map();;

    //This current player session id
    playerSessionID: string = "";

    //The ship renderer
    ssRenderer: SpaceShipRender;

    //Flag to indicate if the labels for players should be shown
    showPlayerLabels = false;

    //The dimension of the displayed region
    displayWidth = 100;
    displayHeight = 100;

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

    draw(ctx: CanvasRenderingContext2D, udt: number, roomState: any) {
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

        roomState.lasers.forEach((laser) => {
            this.ssRenderer.renderLaser(
                laser.x + laser.vx * udt,
                laser.y + laser.vy * udt,
                laser.direction,
                ctx
            );
        });



        // Rendering game scores.
        this.renderScores(ctx, roomState);
    }



    // This function will render the scores.
    renderScores(ctx: CanvasRenderingContext2D, roomState: any) {
        const sortedPlayers = this.getSortedPlayers(roomState);
        ctx.fillStyle = 'black';
        ctx.font = '16px Arial';
        ctx.textAlign = 'right';

        let maxWidth = 0;
        (sortedPlayers as Array<[string, any]>).forEach(([id, player], index) => {
            const playerLabel = `${player.username}: ${player.score}`;
            const textWidth = ctx.measureText(playerLabel).width;
            if (textWidth > maxWidth) {
                maxWidth = textWidth;
            }
        });

        // Include some padding between the spaceship and the text
        const padding = 30;

        // Using sortedPlayers array for ordering
        (sortedPlayers as Array<[string, any]>).forEach(([id, player], index) => {
            const playerLabel = `${player.username}: ${player.score}`;

            ctx.fillStyle = `rgba(10, 10, 10, 1)`;
            ctx.fillText(playerLabel, this.displayWidth - 10, 20 + index * 20);

            // Render a small spaceship to the left of the player name, shift by maxWidth
            this.ssRenderer.render(
                this.displayWidth - maxWidth - padding - 10, // shifted x-position
                12 + index * 20, // same y-position as the text
                0, // static vx
                0, // static vy
                player.direction, // same orientation
                id === this.playerSessionID ? "blue" : "green", // same color
                player.accel, // no acceleration
                ctx,
                "", false, false
            );
        });
    }

    getSortedPlayers(roomState: any) {
        const playersArray = Array.from(roomState.players.entries());
        return playersArray.sort((a, b) => b[1].score - a[1].score);
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