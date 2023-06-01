import { SSGameEngineClient } from "./ClientGameEngine";

import * as nipplejs from "nipplejs";
import type { JoystickManagerOptions } from "nipplejs";

import * as Colyseus from "colyseus.js";

const canvas = document.getElementById("game") as HTMLCanvasElement;
const gameDiv = document.getElementById("game-div") as HTMLCanvasElement;
const ctx = canvas.getContext("2d");

const gamePrefix = "/BasicGameServer/";
// const gamePrefix="";
const protocol = window.location.protocol === "https:" ? "wss" : "ws";
const client = new Colyseus.Client(
  `${protocol}://${window.location.hostname}:${window.location.port}${gamePrefix}`
);
let room: Colyseus.Room;
let gameMetrics: any;

const gameEngine: SSGameEngineClient = new SSGameEngineClient();

let lastStateUpdate = performance.now();
let lastFrameRender = performance.now();

function render(): void {
  // error checking for null on the context
  if (ctx !== null) {
    ctx.fillStyle = "rgb(230 230 230)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const thisFrameRender = performance.now();
    const udt = thisFrameRender - lastStateUpdate;
    const dt = thisFrameRender - lastFrameRender;
    lastFrameRender = thisFrameRender;

    gameEngine.update(udt, dt, thisFrameRender);

    gameEngine.draw(ctx, udt, thisFrameRender, room.state);

    requestAnimationFrame(() => {
      render();
    });
  }
}

let joystickUP = false;
let joystickRight = false;
let joystickLeft = false;
let joystickDown = false;

if ("ontouchstart" in window) {
  const optionsR: JoystickManagerOptions = {
    zone: gameDiv,
    mode: "static",
    position: { right: "10%", bottom: "20%" },
    size: 100,
    color: "blue",
  };

  const joystickR = nipplejs.create(optionsR);

  joystickR.on("move", function (evt, data) {
    const angle = data.angle.degree;
    const force = data.force;

    // Determine player direction based on joystick angle
    if (angle >= 20 && angle < 160 && force > 0.2) {
      if (!joystickUP) {
        room.send("input", "w-down");
        joystickUP = true;
      }
    } else if (joystickUP) {
      room.send("input", "w-up");
      joystickUP = false;
    }

    if (angle >= 135 && angle < 225 && force > 0.2) {
      if (!joystickLeft) {
        room.send("input", "a-down");
        joystickLeft = true;
      }
    } else if (joystickLeft) {
      room.send("input", "a-up");
      joystickLeft = false;
    }

    if (angle >= 225 && angle < 315 && force > 0.2) {
      if (!joystickDown) {
        room.send("input", "s-down");
        joystickDown = true;
      }
    } else if (joystickDown) {
      room.send("input", "s-up");
      joystickDown = false;
    }

    if (angle >= 315 || (angle < 45 && force > 0.2)) {
      if (!joystickRight) {
        room.send("input", "d-down");
        joystickRight = true;
      }
    } else if (joystickRight) {
      room.send("input", "d-up");
      joystickRight = false;
    }
  });

  joystickR.on("end", function (evt, data) {
    // Send an 'up' command for every direction to stop moving/fire when joystick is released
    room.send("input", "w-up");
    room.send("input", "s-up");
    room.send("input", "a-up");
    room.send("input", "d-up");
  });

  const optionsL: JoystickManagerOptions = {
    zone: gameDiv,
    mode: "static",
    position: { left: "10%", bottom: "20%" },
    size: 100,
    color: "blue",
  };

  const joystickL = nipplejs.create(optionsL);

  joystickL.on("move", function (evt, data) {
    room.send("input", "fire-down");
    room.send("mouseDirection", -data.angle.radian);
  });

  joystickR.on("end", function (evt, data) {
    room.send("input", "fire-up");
  });
}

// Make this a let so it can be set when the username is entered.
let username: string | null = null;

async function connectToServer(): Promise<string> {
  room = await client.joinOrCreate("game");
  gameEngine.setSessionID(room.sessionId);

  room.onStateChange.once(() => {});

  room.onMessage("init", (message) => {
    // retrieve initialization metrics
    gameMetrics = message;

    gameEngine.ssRenderer.setShipDesigns(gameMetrics.ShipDesigns);

    // Resize canvas to match game area dimensions
    canvas.width = gameDiv.clientWidth;
    canvas.height = gameDiv.clientHeight;
    gameEngine.gameAreaWidth = gameMetrics.playAreaWidth;
    gameEngine.gameAreaHeight = gameMetrics.playAreaHeight;
    gameEngine.gridSize = gameMetrics.gridSize;
    gameEngine.cellSize = gameMetrics.cellSize;
    gameEngine.gameGrid = gameMetrics.grid;

    gameEngine.displayWidth = canvas.width;
    gameEngine.displayHeight = canvas.height;
  });

  room.onStateChange(() => {
    lastStateUpdate = performance.now();

    gameEngine.updateFromServer(room.state);
  });

  document.addEventListener("keydown", (event) => {
    if (username !== null) {
      switch (event.key) {
        case "ArrowUp":
        case "w":
        case "W":
          room.send("input", "w-down");
          break;
        case "ArrowDown":
        case "s":
        case "S":
          room.send("input", "s-down");
          break;
        case "ArrowLeft":
        case "a":
        case "A":
          room.send("input", "a-down");
          break;
        case "ArrowRight":
        case "d":
        case "D":
          room.send("input", "d-down");
          break;
        case " ":
          room.send("input", "fire-down");
          break;
        case "l":
        case "L":
          gameEngine.showPlayerLabels = !gameEngine.showPlayerLabels;
          break;
        case "k":
        case "K":
          gameEngine.showServerMetrics = !gameEngine.showServerMetrics;
          break;
        case "i":
        case "I":
          gameEngine.showInstructions = !gameEngine.showInstructions;
          break;
        case "t":
        case "T":
          room.send("input", "change-type");
          break;
      }
    }
  });

  document.addEventListener("keyup", (event) => {
    if (username !== null) {
      switch (event.key) {
        case "ArrowUp":
        case "w":
        case "W":
          room.send("input", "w-up");
          break;
        case "ArrowDown":
        case "s":
        case "S":
          room.send("input", "s-up");
          break;
        case "ArrowLeft":
        case "a":
        case "A":
          room.send("input", "a-up");
          break;
        case "ArrowRight":
        case "d":
        case "D":
          room.send("input", "d-up");
          break;
        case " ":
          room.send("input", "fire-up");
          break;
      }
    }
  });

  document.addEventListener(
    "mousemove",
    function (evt) {
      // Assuming the spaceship is always at the center of the canvas.
      const spaceshipPos = { x: canvas.width / 2, y: canvas.height / 2 };

      // Calculate the direction from the spaceship to the mouse position.
      const dx = evt.x - spaceshipPos.x;
      const dy = evt.y - spaceshipPos.y;
      const direction = Math.atan2(dy, dx);
      room.send("mouseDirection", direction);
    },
    false
  );

  window.addEventListener("resize", () => {
    // Resize canvas to match game area dimensions
    canvas.width = gameDiv.clientWidth;
    canvas.height = gameDiv.clientHeight;

    // Update game engine display dimensions
    gameEngine.displayWidth = canvas.width;
    gameEngine.displayHeight = canvas.height;
  });

  render();

  return "connected";
}

connectToServer().then(
  function (value) {
    console.log(value);
  },
  function (error) {
    console.log("Failed to connect to server:" + String(error));
  }
);

if (document !== null) {
  const connectButton = document.getElementById("connect");

  if (connectButton === null) {
    console.log(
      "Failed to grab the connect button, the HTML should have a login " +
        'form with a button with id="connect"'
    );
  } else {
    connectButton.addEventListener("click", () => {
      username = (document.getElementById("PlayerName") as HTMLInputElement)
        .value;

      if (username.trim() === "") {
        alert("Please enter a username.");
        return;
      }

      const gameLoginElement = document.getElementById("game-login");
      const gameDivElement = document.getElementById("game-div");
      if (gameLoginElement === null || gameDivElement === null) {
        console.log(
          "Failed to get handle to login or game div, the html should have a " +
            'div block with form for login with id="game-login" and a div ' +
            'block for the game with id="game-div"'
        );
      } else {
        gameLoginElement.style.display = "none";
        gameDivElement.style.zIndex = "1";
        gameDivElement.style.display = "block";
      }

      // Now that we have the username, send it to the server.
      room.send("joinGame", username);
      gameEngine.showInstructions = true;
    });
  }
}
