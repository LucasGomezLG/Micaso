const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Read .env.local from the project root
const envPath = path.join(__dirname, '..', '.env.local');
let token = process.env.MP_ACCESS_TOKEN;

if (!token && fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/^MP_ACCESS_TOKEN=(.*)$/m);
  if (match) {
    token = match[1].trim();
  }
}

if (!token) {
  console.error("ERROR: No MP_ACCESS_TOKEN found in .env.local");
  process.exit(1);
}

// Ensure the npx command runs correctly on Windows (.cmd extension usually required)
const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';

const child = spawn(command, [
  '-y', 
  'mcp-remote', 
  'https://mcp.mercadopago.com/mcp', 
  '--header', 
  `"Authorization:Bearer ${token}"`
], {
  stdio: 'inherit',
  shell: true
});

child.on('exit', (code) => process.exit(code));
