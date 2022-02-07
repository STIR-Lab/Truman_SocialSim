const { Server } = require("socket.io");
const moment = require("moment");
const Chat = require('../models/Chat');
const mongoose = require('mongoose');
// TODO: import shcema here:
// Rough idea on the schema structure
//  schema: chat {
// ??? [message]
// }

// schema: message {
//   username:
//   body:
// }
// chat.find(currentConvo).push(newMsgObj)

const chatBot = "chatBot";

// format message object to send to the front end
function formatMessage(msg) {
  return {
    ...msg,
    time: moment().format("h:mm a"),
  };
}

const chatSocket = (server) => {
  const io = new Server(server);

  io.on("connection", (socket) => {
    Chat.find().then((result) => {
      socket.emit('output-messages', result)
    });
    console.log("Websocket connection...");

    // FE event: joinRoom
    // Parameter: msg obj
    // expected msg object (similar to):
    // {
    //   username,
    // }
    socket.on("joinRoom", (msg) => {
      // Welcome current user
      socket.emit(
        "message",
        formatMessage({
          username: chatBot,
          body: "Say Hi!",
        })
      );

      // On user join: emit to everyone but the user just joined
      socket.broadcast.emit(
        "message",
        formatMessage({
          username: chatBot,
          body: `${msg.username} has joined the chat`,
        })
      );
    });

    // FE event: chatMessage
    // Paramter: msg obj
    // expected msg object (similar to):
    // {
    //   username,
    //   userId, // not socket.id
    //   type, // "txt" | "img"
    //   body,
    //   mimeType?,
    //   fileName?,
    // }
    socket.on("chatMessage", (msg) => {
      // Emit back to the client
      // TODO: Create new msg object first
      // TODO: Store in the current convo
      // TODO: Finally, emit msg obj back to the client
      const message = new Chat({chat});
      message.save().then(()=>{
        io.emit("message", formatMessage(msg));
      })
      
    });

    // On user leave: emit to everyone left in the room
    socket.on("disconnect", () => {
      io.emit(
        "message",
        formatMessage({
          username: chatBot,
          body: "User has left the chat",
        })
      );
    });
  });
};



module.exports = { chatSocket };
