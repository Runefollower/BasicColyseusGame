const fs = require('fs');
const path = require('path');
const prefixPath = "src/";

// Static array of file paths and descriptions
const clientFiles = [
  { path: 'client/ClientGameEngine.ts', description: 'This contains any client game logic and rendering' },
  { path: 'client/GameEntities.ts', description: 'These are game objects to keep track of' },
  { path: 'client/SimpleGame.ts', description: 'This is the main client side code' },
  { path: 'client/SpaceShipRenderer.ts', description: 'This is the code to render the spaceship and laser' },
  { path: 'client/index.html', description: 'This is the client html code' },
];

const serverFiles = [
  { path: 'server/SimpleGameRoom.ts', description: 'This is the server side game room code' },
  { path: 'server/SimpleGameLogic.ts', description: 'This is the main server game logic code' },
  { path: 'server/GameState.ts', description: 'This defines the game state that is shared with the client' },
];

// Static output file path
const outputPath = 'prompt.txt';

// Write header to the prompt
let content = "This is the code for a web based multiplayer game based on the colyseus server.  \n";

// Choose the files based on command-line arguments
let chosenFiles;
if (process.argv.includes('-c')) {
  chosenFiles = clientFiles;
} else if (process.argv.includes('-s')) {
  chosenFiles = serverFiles;
} else {
  chosenFiles = [...clientFiles, ...serverFiles];
}

chosenFiles.forEach((file) => {
  // Check if file exists
  if (!fs.existsSync(prefixPath + file.path)) {
    console.log(`File ${file.path} does not exist`);
    process.exit(1);
  }

  // Read file
  const fileContent = fs.readFileSync(prefixPath + file.path, 'utf-8');
  
  // Add description and content to the combined content
  content += `\n${file.description}: ${file.path}\n\n${fileContent}\n`;
});

// Write to output file
fs.writeFileSync(outputPath, content);

console.log(`Content of files written to ${outputPath}`);
