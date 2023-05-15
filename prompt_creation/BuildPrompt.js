const fs = require('fs');
const path = require('path');
const prefixPath = "src/";


// Static array of file paths and descriptions
const files = [
  { path: 'SimpleGameRoom.ts', description: 'This is the main server side code' },
  { path: 'GameState.ts', description: 'This defines the game state that is shared with the client' },
  { path: 'static/SimpleGame.js', description: 'This is the main client side code' },
  { path: 'static/SpaceShipRenderer.js', description: 'This is the code to render the spaceship and laser' },
  { path: 'static/GameStatics.js', description: 'This defines static game values' },
  { path: 'static/index.html', description: 'This is the client html code' },
];

// Static output file path
const outputPath = 'prompt.txt';

// Write header to the prompt
let content = "This is the code for a web based multiplayer game based on the colyseus server.  \n";


files.forEach((file) => {
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

