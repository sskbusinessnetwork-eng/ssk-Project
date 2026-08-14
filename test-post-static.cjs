const express = require('express');
const app = express();
app.use(express.static('dist'));
app.get('*', (req, res) => res.status(200).send('get *'));
const server = app.listen(0, () => {
  const port = server.address().port;
  fetch(`http://localhost:${port}/index.html`, { method: 'POST' }).then(res => {
    console.log("POST static:", res.status);
    server.close();
  });
});
