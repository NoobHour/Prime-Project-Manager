const http = require('node:http');
// Probe the local socket with the configured public Host, without following redirects or exposing setup state.
const origin = new URL(process.env.MGMT_ORIGIN || 'http://localhost:3333');
const request = http.get(
  {
    hostname: '127.0.0.1',
    port: Number(process.env.MGMT_PORT || 3333),
    path: '/api/health',
    headers: { Host: origin.host },
    timeout: 4000,
  },
  handleResponse,
);
/** Accepts the readiness response; drains it and sets the process exit status. Returns nothing. */
function handleResponse(response) {
  response.resume();
  process.exitCode = response.statusCode === 200 ? 0 : 1;
}
/** Accepts no input; aborts a stalled probe. Returns nothing. */
function handleTimeout() {
  request.destroy(new Error('Health check timed out'));
}
/** Accepts a request error; marks the health check unsuccessful. Returns nothing. */
function handleError(_error) {
  process.exitCode = 1;
}
request.on('timeout', handleTimeout);
request.on('error', handleError);
