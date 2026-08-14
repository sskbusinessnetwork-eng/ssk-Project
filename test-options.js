const express = require('express');
const app = express();
app.use(express.static('dist'));
const server = app.listen(0, () => {
  const port = server.address().port;
  fetch(`http://localhost:${port}/api/meetings/update`, { method: 'OPTIONS' }).then(res => {
    console.log(res.status);
    server.close();
  });
});
