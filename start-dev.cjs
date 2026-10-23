const { spawn } = require('child_process');

console.log('🚀 Démarrage de BlocNum...');

// Spawn backend server
const server = spawn('node', ['api-server.cjs'], {
  stdio: 'inherit',
  shell: true,
  cwd: __dirname
});

// Spawn frontend client
const client = spawn('npm', ['run', 'client'], {
  stdio: 'inherit',
  shell: true,
  cwd: __dirname
});

function cleanup() {
  console.log('\n🛑 Arrêt des services...');
  server.kill();
  client.kill();
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

