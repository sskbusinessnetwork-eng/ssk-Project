const express = require('express');
const app = express();
app.use(express.static('.'));
const server = app.listen(0, () => {
  const port = server.address().port;
  const http = require('http');
  const req = http.request({ port, path: '/package.json', method: 'POST' }, (res) => {
    console.log('Static POST status:', res.statusCode);
    server.close();
  });
  req.end();
});
