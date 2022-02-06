// const { server } = require("../app");
const { Server } = require("socket.io");
const moment = require("moment");

const chatBot = "chatBot";

// format message object to send to the front end
function formatMessage(username, msg) {
  console.log("formatting msg...");
  return {
    ...msg,
    time: moment().format("h:mm a"),
  };
}

const chatSocket = (server) => {
  const io = new Server(server);

  io.on("connection", (socket) => {
    console.log("Websocket connection...");

    // FE event: joinRoom
    // Parameter: username
    socket.on("joinRoom", (username) => {
      // Welcome current user
      socket.emit("message", formatMessage(chatBot, "Say Hi!"));

      // On user join: emit to everyone but the user just joined
      socket.broadcast.emit(
        "message",
        formatMessage(chatBot, `${username} has joined the chat`)
      );
    });

    // FE event: chatMessage
    // Paramter: msg obj
    // expected msg object (similar to):
    // {
    //   username,
    //   userId?, // not socket.id
    //   type, // "txt" | "img"
    //   body,
    //   mimeType?,
    //   fileName?,
    // }
    socket.on("chatMessage", (msg) => {
      // Emit back to the client
      io.emit("message", formatMessage(msg));
    });

    // On user leave: emit to everyone left in the room
    socket.on("disconnect", () => {
      io.emit("message", formatMessage(chatBot, "User has left the chat"));
    });
  });
};

module.exports = { chatSocket };
