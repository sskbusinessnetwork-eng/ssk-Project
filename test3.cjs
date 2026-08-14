const express = require('express');
const app = express();
app.post('/api/meetings/update', (req, res) => res.json({}));
app.get('*', (req, res) => res.status(200).send('get *'));
const server = app.listen(0, () => {
  const port = server.address().port;
  fetch(`http://localhost:${port}/api/meetings/update`, { method: 'OPTIONS' }).then(res => {
    console.log("OPTIONS:", res.status);
    server.close();
  });
});
