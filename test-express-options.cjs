const express = require('express');
const app = express();
app.post('/api/test', (req, res) => res.json({ ok: true }));
const server = app.listen(0, async () => {
  const port = server.address().port;
  const http = require('http');
  const req = http.request({ port, path: '/api/test', method: 'OPTIONS' }, (res) => {
    console.log('OPTIONS status:', res.statusCode);
    server.close();
  });
  req.end();
});
