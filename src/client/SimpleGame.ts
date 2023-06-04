import { SSGameEngineClient } from "./ClientGameEngine";
import { SettingsController } from "./SettingsController";
import { TouchInterface } from "./TouchInterface";

import * as Colyseus from "colyseus.js";

// Grab handles to all relevant HTML elements
const canvas = document.getElementById("game") as HTMLCanvasElement;
const gameDiv = document.getElementById("game-div") as HTMLCanvasElement;
const moveZone = document.getElementById("movement-zone") as HTMLDivElement;
const fireZone = document.getElementById("fire-zone") as HTMLDivElement;
const ctx = canvas.getContext("2d");

// Construct the url back to the game server
const gamePrefix = "/BasicGameServer/";
// const gamePrefix="";
const protocol = window.location.protocol === "https:" ? "wss" : "ws";
const client = new Colyseus.Client(
  `${protocol}://${window.location.hostname}:${window.location.port}${gamePrefix}`
);

// Room connection for the game server
let room: Colyseus.Room;

// Static game metrics that will be retrived after server connection.
let gameMetrics: any;

// Client game engine, contains all client side game logic
const gameEngine: SSGameEngineClient = new SSGameEngineClient();

// UI Controls for the touch interface
const touchInterface: TouchInterface = new TouchInterface();

const settingsController = new SettingsController(gameEngine);

// The current username, will be provided by the user on start
let username: string | null = null;

// Timer varibles, last time of server update and frame render
let lastStateUpdate = performance.now();
let lastFrameRender = performance.now();

let inputForward = false;
let inputBack = false;
let inputRight = false;
let inputLeft = false;

let isTouchInterface = false;

// If we are in a touch interface, set up the touch controls
if ("ontouchstart" in window) {
  touchInterface.initMobileUI(moveZone, fireZone);
  isTouchInterface = true;
}

/**
 * Main render loop, grabbing the timestamps, giving the game
 * engine an opportunity to update and then rendering the scene
 */
function render(): void {
  // update any settings from the menu
  updateSettings();

  // error checking for null on the context
  if (ctx !== null) {
    // Capture current time, time since server update and time
    // since last frame update
    const thisFrameRender = performance.now();
    const udt = thisFrameRender - lastStateUpdate;
    const dt = thisFrameRender - lastFrameRender;
    lastFrameRender = thisFrameRender;

    // Let the engine update the state
    gameEngine.update(udt, dt, thisFrameRender);

    // Erase the last frame
    ctx.fillStyle = "rgb(230 230 230)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw the new frame
    gameEngine.draw(ctx, udt, thisFrameRender, room.state);

    settingsController.render(ctx);

    // Request the next update
    requestAnimationFrame(() => {
      render();
    });
  }
}

/**
 * Callback from the server to pass game initialization data.
 *
 * @param message Game server initialization data
 */
function gameServerInit(message: any): void {
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
}

// Add menu item to toggle the ship
function toggleClientShip(): void {
  room.send("input", "change-type");
}
settingsController.addCallbackMenuItem(
  "toggleShip",
  "Toggle Ship",
  toggleClientShip
);

// Add menu item to flip the joysticks
if (isTouchInterface) {
  settingsController.addCheckMenuItem(
    settingsController.invertJoyKey,
    "Flip Joysticks",
    touchInterface.joystickPositionInverted
  );
}

function updateSettings(): void {
  gameEngine.showPlayerLabels = settingsController.getMenuItemBoolValue(
    settingsController.showLabelsKey
  );
  gameEngine.showServerMetrics = settingsController.getMenuItemBoolValue(
    settingsController.showMetricsKey
  );
  gameEngine.showInstructions = settingsController.getMenuItemBoolValue(
    settingsController.showInstKey
  );

  if (isTouchInterface) {
    touchInterface.joystickPositionInverted =
      settingsController.getMenuItemBoolValue(settingsController.invertJoyKey);
  }
}

/**
 * Called when the game state is updated from the server
 */
function gameServerStateChange(): void {
  lastStateUpdate = performance.now();

  gameEngine.updateFromServer(room.state);
}

/**
 * Handle keyboard key down
 *
 * @param event Keydown keyboard event
 */
function uiKeyDown(event: KeyboardEvent): void {
  if (username !== null) {
    switch (event.key) {
      case "ArrowUp":
      case "w":
      case "W":
        inputForward = true;
        break;
      case "ArrowDown":
      case "s":
      case "S":
        inputBack = true;
        break;
      case "ArrowLeft":
      case "a":
      case "A":
        inputLeft = true;
        break;
      case "ArrowRight":
      case "d":
      case "D":
        inputRight = true;
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

  sendMovementEvents();
}

/**
 * Handle key up events
 *
 * @param event Key up events
 */
function uiKeyUp(event: KeyboardEvent): void {
  if (username !== null) {
    switch (event.key) {
      case "ArrowUp":
      case "w":
      case "W":
        inputForward = false;
        break;
      case "ArrowDown":
      case "s":
      case "S":
        inputBack = false;
        break;
      case "ArrowLeft":
      case "a":
      case "A":
        inputLeft = false;
        break;
      case "ArrowRight":
      case "d":
      case "D":
        inputRight = false;
        break;
      case " ":
        room.send("input", "fire-up");
        break;
    }
  }

  sendMovementEvents();
}

function sendMovementEvents(): void {
  let turn = 0;
  let accel = 0;

  if (inputForward) accel += 1;
  if (inputBack) accel -= 1;
  if (inputRight) turn += 1;
  if (inputLeft) turn -= 1;

  room.send("turn", turn);
  room.send("accel", accel);
}

/**
 * Handle mouse movement, sending direction events to the server
 *
 * @param event Mouse event
 */
function uiMouseMove(event: MouseEvent): void {
  // Assuming the spaceship is always at the center of the canvas.
  const spaceshipPos = { x: canvas.width / 2, y: canvas.height / 2 };

  // Calculate the direction from the spaceship to the mouse position.
  const dx = event.x - spaceshipPos.x;
  const dy = event.y - spaceshipPos.y;
  const direction = Math.atan2(dy, dx);
  room.send("mouseDirection", direction);
}

function uiMouseClick(event: MouseEvent): void {
  settingsController.clickEvent(event.clientX, event.clientY);
}

/**
 * Display is resized so reset the game play region
 *
 * @param event UIEvent
 */
function uiResize(event: UIEvent): void {
  // Resize canvas to match game area dimensions
  canvas.width = gameDiv.clientWidth;
  canvas.height = gameDiv.clientHeight;

  // Update game engine display dimensions
  gameEngine.displayWidth = canvas.width;
  gameEngine.displayHeight = canvas.height;
}

/**
 * Connect to the server and set up event handlers
 *
 * @returns Promise with status
 */
async function connectToServer(): Promise<string> {
  room = await client.joinOrCreate("game");
  gameEngine.setSessionID(room.sessionId);
  touchInterface.assignRoom(room);

  room.onStateChange.once(() => {});

  room.onMessage("init", gameServerInit);
  room.onStateChange(gameServerStateChange);
  document.addEventListener("keydown", uiKeyDown);
  document.addEventListener("keyup", uiKeyUp);
  document.addEventListener("mousemove", uiMouseMove, false);
  document.addEventListener("click", uiMouseClick);
  window.addEventListener("resize", uiResize);

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
