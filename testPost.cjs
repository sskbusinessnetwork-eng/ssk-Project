const http = require('http');

const data = JSON.stringify({
  meetingId: 'some-id',
  callerId: 'some-caller-id',
  date: '2026-10-10',
  time: '10:00 AM',
  location: 'Online',
  attendance: {},
  amountCollected: {},
  memberNotes: {},
  isCompleted: false,
  guestUpdates: []
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/meetings/update',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, res => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => console.log('Response:', body));
});

req.on('error', e => console.error(e));
req.write(data);
req.end();
