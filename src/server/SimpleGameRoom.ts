import { Room, type Client } from "colyseus";
import { GameState } from "./GameState";
import { SimpleGameLogic } from "./SimpleGameLogic";
import { generateLogWithTimestamp } from "./ServerTools";

export class SimpleGameRoom extends Room<GameState> {
  gameLogic: SimpleGameLogic;

  onAuth(_client, _options, _req): boolean {
    return true;
  }

  onInit(_options): void {
  }

  async onCreate(): Promise<void> {
    console.log(generateLogWithTimestamp("CreateGameRoom"));
    this.setState(new GameState());

    this.gameLogic = new SimpleGameLogic(
      this.state,
      this.onGridRefresh.bind(this)
    );

    const messageRouting: Record<string, keyof SimpleGameLogic> = {
      input: "handleInput",
      turn: "handleTurn",
      accel: "handleAccel",
      mouseDirection: "mouseDirection",
    };

    for (const [message, handler] of Object.entries(messageRouting)) {
      this.onMessage(message, (client, payload) =>
        (this.gameLogic[handler] as any)(client.sessionId, payload)
      );
    }

    this.onMessage("joinGame", (client, input) => {
      console.log(
        generateLogWithTimestamp(
          "ClientJoined ClientID:" +
            String(client.sessionId) +
            " Username:" +
            String(input)
        )
      );
      this.gameLogic.addPlayer(client, input);
    });

    this.setSimulationInterval((deltaTime) => {
      this.gameLogic.update(deltaTime, this.clock.elapsedTime);
    });
  }

  private onGridRefresh(
    gy: number,
    gx: number,
    gridValue: number,
    visibilityMatrix: any
  ): void {
    this.broadcast("gridRefresh", { gy, gx, gridValue, visibilityMatrix });
  }

  async onJoin(client: Client): Promise<void> {
    console.log(
      generateLogWithTimestamp(
        "ClientConnected ClientID:" + String(client.sessionId)
      )
    );

    client.send("init", this.gameLogic.getInitializationData());
  }

  onLeave(client: Client): void {
    console.log(
      generateLogWithTimestamp(
        "ClientLeft   ClientID:" + String(client.sessionId)
      )
    );
    this.gameLogic.removePlayer(client);
  }

  onDispose(): void {
  }
}
