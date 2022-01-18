const { server } = require("../../app");
const socketio = require("socket.io");
const moment = require("moment");

const io = socketio(server);

const chatBot = "chatBot";

// format message object to send to the front end
function formatMessage(username, text) {
  return {
    username,
    text,
    time: moment().format("h:mm a"),
  };
}

io.on("connection", (socket) => {
  console.log("Websocket connection...");

  // Listen for FE event: joinRoom
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

  // Listen for FE event: chatMessage
  // Parameter: username, msg
  socket.on("chatMessage", (username, msg) => {
    // Emit back to the client
    io.emit("message", formatMessage(username, msg));
  });

  // On user leave: emit to everyone left in the room
  socket.on("disconnect", () => {
    io.emit("message", formatMessage(chatBot, "User has left the chat"));
  });
});
