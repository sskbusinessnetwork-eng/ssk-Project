const express = require('express');
const app = express();
app.post('/api/meetings/update', (req, res) => res.json({}));
app.use(express.static('dist'));
app.get('*', (req, res) => res.status(200).send('get *'));
const server = app.listen(0, () => {
  const port = server.address().port;
  fetch(`http://localhost:${port}/api/meetings/update`, { method: 'PUT' }).then(res => {
    console.log("PUT:", res.status);
    server.close();
  });
});
