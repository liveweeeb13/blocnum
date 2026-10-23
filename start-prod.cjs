const { spawn } = require('child_process');

console.log('Starting BlocNum in production mode...');

const server = spawn('node', ['api-server.cjs'], {
  stdio: 'inherit',
  shell: true,
  cwd: __dirname
});

const client = spawn('npm', ['run', 'preview'], {
  stdio: 'inherit',
  shell: true,
  cwd: __dirname
});

function cleanup() {
  server.kill();
  client.kill();
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
