const express = require('express');
const app = express();
app.post('/api/meetings/update', (req, res) => res.json({}));
app.use(express.static('dist'));
app.get('*', (req, res) => res.sendFile('index.html', {root: 'dist'}));
const server = app.listen(0, () => {
  const port = server.address().port;
  fetch(`http://localhost:${port}/api/meetings/update`, { method: 'OPTIONS' }).then(res => {
    console.log(res.status);
    server.close();
  });
});
