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

    //Flag to indicate if the labels for players should be shown
    showServerMetrics = false;

    //The dimension of the displayed region
    displayWidth = 100;
    displayHeight = 100;

    /*
     *Client side performance stats
     */
    //To keep track the time of the last server update
    lastStateUpdate = 0.0;

    //To keep track the time of the last frame render
    lastFrameRender = 0.0;

    //For counting the number of frame updates since the
    //last server update
    framesBetweenState = 0;
    maxFramesBetweenState = 0;
    nextResetMax = 0;

    //Will become a queue of last X
    //frame updates to calculate moving 
    //average framerate
    renderUpdateTimestamps: number[];
    framesPerSecond: number = 0.0;

    //Will become a queue of last X
    //server updates to calculate moving 
    //average server updates per second
    serverUpdateTimestamps: number[];
    updatesPerSecond: number = 0.0;

    constructor() {
        this.ssRenderer = new SpaceShipRender();
        
        //Initialize metrics to keep track of the framerate
        //and rate of server updates
        this.lastStateUpdate = performance.now();
        this.framesBetweenState = 0;
        this.renderUpdateTimestamps = [];
        this.serverUpdateTimestamps = [];
    }

    //Update the game engine, passed the udt or update delta time
    //the time since last update from the sever
    //and dt, time since last render
    update(udt: number, dt: number, elapsedTime: number) {
        this.ssRenderer.update(dt);

        for (let playerShip of this.playerShips.values()) {
            playerShip.update(udt);
        }

        //Keep track of how many frames have been rendered
        //without a server update, and keep track of the
        //max max frames without update
        this.framesBetweenState++;
        if ((this.framesBetweenState > this.maxFramesBetweenState) || (elapsedTime > this.nextResetMax)) {
            this.maxFramesBetweenState = this.framesBetweenState;
            this.nextResetMax = elapsedTime + 60000;
        }
    }

    draw(ctx: CanvasRenderingContext2D, udt: number, elapsedTime: number, roomState: any) {
        this.renderUpdateTimestamps.push(elapsedTime);
        if (this.renderUpdateTimestamps.length > 50) {
            const firstTimestamp = this.renderUpdateTimestamps.shift();
            const secondsPassed = (elapsedTime - firstTimestamp!) / 1000;
            this.framesPerSecond = 50 / secondsPassed;
        }

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

        if (this.showServerMetrics) {
            this.renderServerMetrics(ctx, roomState);
        }
    }



    // This function will render the scores.
    renderScores(ctx: CanvasRenderingContext2D, roomState: any) {
        const sortedPlayers = this.getSortedPlayers(roomState);
        ctx.fillStyle = 'black';
        ctx.font = '16px Courier';
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

    renderServerMetrics(ctx: CanvasRenderingContext2D, roomState: any) {
        const fontSize = 14;
        ctx.font = `${fontSize}px Courier`;
        ctx.fillStyle = "blue";
        ctx.textAlign = 'left';

        const metrics = [
            `Clients Count....: ${roomState.currentClientsCount}`,
            `Max Clients......: ${roomState.maxClientsCountLastMinute}`,
            `High Score Player: ${roomState.highestScorePlayer}`,
            `High Score.......: ${roomState.highestScore}`,
            `Max fr per update: ${this.maxFramesBetweenState}`,
            `Server LPS.......: ${roomState.gameUpdateCyclesPerSecond.toFixed(2)}`,
            `Server UPS.......: ${this.updatesPerSecond.toFixed(2)}`,
            `FPS..............: ${this.framesPerSecond.toFixed(2)}`
        ];

        const xOffset = 20; // Adjust this as needed
        const yOffset = 20; // Adjust this as needed

        for (let i = 0; i < metrics.length; i++) {
            ctx.fillText(metrics[i], xOffset, yOffset + (i * fontSize));
        }
    }

    getSortedPlayers(roomState: any) {
        const playersArray = Array.from(roomState.players.entries());
        return playersArray.sort((a, b) => b[1].score - a[1].score);
    }


    setSessionID(newSessionID: string) {
        this.playerSessionID = newSessionID;
    }

    async updateFromServer(roomState: any) {
        // Update state received from the server
        // keeping track of the timestep and resetting the counter to check
        // frames without update
        this.lastStateUpdate = performance.now();
        this.framesBetweenState = 0;

        this.serverUpdateTimestamps.push(this.lastStateUpdate);
        if (this.serverUpdateTimestamps.length > 50) {
            const firstTimestamp = this.serverUpdateTimestamps.shift();
            const secondsPassed = (this.lastStateUpdate - firstTimestamp!) / 1000;
            this.updatesPerSecond = 50 / secondsPassed;
        }

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