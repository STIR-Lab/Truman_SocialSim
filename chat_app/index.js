const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const mongoose = require('mongoose');


mongoose.connect('mongodb+srv://group8:test@test.xmrsd.mongodb.net/myFirstDatabase?retryWrites=true&w=majority', (err) => {
  if (err){
    console.log(err)

  }else{
    console.log('connected to mongodb')
  }
})

let chatSchema = new mongoose.Schema({
  msg: String,
  created: {type: Date, default: Date.now}
});


app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

let Chat = mongoose.model('Message', chatSchema);


io.on('connection', (socket) => {
    socket.on('chat message', (msg) => {

      let newMsg = new Chat({msg});
      newMsg.save((err) => {
        if(err) throw err;
      })
      io.emit('chat message', msg);
    });
  });
server.listen(3000, () => {
  console.log('listening on *:3000');
});