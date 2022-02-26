const { Server } = require("socket.io");
const moment = require("moment");
const { InMemorySessionStore } = require("../sessionStore");
const crypto = require("crypto");
const Chat = require("../models/Chat");
const mongoose = require("mongoose");
const Conversation = require("../models/Chat");

const sessionStore = new InMemorySessionStore();
const randomId = () => crypto.randomBytes(8).toString("hex");

const chatBot = "chatBot";

function leaveNotification(from) {
  return {
    type: "txt",
    body: `${from} has left the chat`,
  };
}

function formatMessage(msg, from, to) {
  return {
    msg: {
      ...msg,
      time: moment().format("h:mm a"),
    },
    from: from, // NOTE: string | object
    to: to, // NOTE: string | object
  };
}

function getCurrentUsers() {
  const userList = [];
  sessionStore.findAllSessions().forEach((session) => {
    if (session.connected) {
      userList.push({
        userId: session.userId,
        username: session.username,
      });
    }
  });

  return userList;
}

const chatSocket = (server) => {
  const io = new Server(server);

  // TODO: Receive pfp from the frontend
  // middleware: check username & userId, allows connection
  io.use((socket, next) => {
    const sessionId = socket.handshake.auth.sessionId;
    if (sessionId) {
      const session = sessionStore.findSession(sessionId);
      if (session) {
        socket.sessionId = sessionId;
        socket.userId = session.userId;
        socket.username = session.username;
        return next();
      }
    } else {
      const username = socket.handshake.auth.username;
      const userId = socket.handshake.auth.userId;
      if (!username || !userId) {
        return next(new Error("Invalid username/userId"));
      }
      socket.sessionId = randomId();
      socket.username = username;
      socket.userId = userId;
      next();
    }
    const username = socket.handshake.auth.username;
    const userId = socket.handshake.auth.userId;
    if (!username || !userId) {
      return next(new Error("Invalid username/userId"));
    }
    socket.sessionId = randomId();
    socket.username = username;
    socket.userId = userId;
    next();
  });

  io.on("connection", (socket) => {
    console.log("Websocket connection...");

    // Save session info and emit to the client
    sessionStore.saveSession(socket.sessionId, {
      userId: socket.userId,
      username: socket.username,
      socketId: socket.id,
      connected: true,
    });
    socket.emit("session", {
      sessionId: socket.sessionId,
    });

    // Fetch existing users
    const userList = getCurrentUsers();
    socket.emit("userList", userList);

    /*
    {
      msg: {
        type: "txt" | "img"
        body: string | blob, actual content of the message
        mimeType?: "png" | "jpg", etc
        fileName?: string
      },
      to: {
        username: string
        userId: string,
        socketId: string
      }
    }
    */

    // diff tabs opened by the same user, thus we need to make diff sockets join the same room
    socket.join(socket.userId);
    socket.on("send-message", async ({ msg, to }) => {
      // NOTE: io.to(socket.io) || socket.to(socket.io)?

      const formattedMsg = formatMessage(
        msg,
        { username: socket.username, userId: socket.userId },
        to
      );

      // TODO: Check if the conversation exists in db
      // If YES: Fetch the object, push formatted message to content array
      // If NO: Create new convo, save accordingly
      // A: socket.username, socket.userId
      // B: to.username, to.userId

      let curConvo = await Conversation.findOne({
        usernameA: socket.username,
        userIdA: socket.userId,
        usernameB: to.username,
        userIdB: to.userId,
      });

      // 1st try
      if (curConvo) {
        console.log("found existing convo", curConvo);
        curConvo.content.push(formattedMsg);
        Conversation.updateOne(
          {
            usernameA: socket.username,
            userIdA: socket.userId,
            usernameB: to.username,
            userIdB: to.userId,
          },
          curConvo
        );
      }
      // 2nd try
      else {
        curConvo = await Conversation.findOne({
          usernameA: to.username,
          userIdA: to.userId,
          usernameB: socket.username,
          userIdB: socket.userId,
        });
        if (curConvo) {
          console.log("found existing convo", curConvo);
          curConvo.content.push(formattedMsg);
          Conversation.updateOne(
            {
              usernameA: to.username,
              userIdA: to.userId,
              usernameB: socket.username,
              userIdB: socket.userId,
            },
            curConvo
          );
        }
        // ok new convo
        else {
          console.log("no ongoing convo found, creating a new one.");
          let newConvo = new Conversation({
            usernameA: to.username,
            userIdA: to.userId,
            usernameB: socket.username,
            userIdB: socket.userId,
            content: [formattedMsg],
          });
          await newConvo.save();
        }
      }

      io.to(to.userId) // to recipient
        .to(socket.userId) // to sender room
        .emit(
          "receive-message",
          formatMessage(
            msg,
            { username: socket.username, userId: socket.userId },
            to
          )
        );
    });

    socket.on("disconnect", async () => {
      const matchingSockets = await io.in(socket.userId).allSockets();
      const isDisconnected = matchingSockets.size === 0;
      if (isDisconnected) {
        // Disconnect current session from sessionStore
        sessionStore.disconnectSession(socket.sessionId);
        /** 
        socket.broadcast.emit(
          "disconneted",
          formatMessage(leaveNotification(socket.username), chatBot, "ALL")
        );
        */
        // FIXME: Name of the event subject to change for FE's convenience
        socket.rooms.forEach((roomId) => {
          socket.broadcast
            .to(roomId)
            .emit(
              "disconneted",
              formatMessage(leaveNotification(socket.username), chatBot, "ALL")
            );
        });
        // refresh current users
        const userList = getCurrentUsers();
        socket.emit("userList", userList);
      }
    });
  });
};

getChat = (req, res) => {
  res.render("chat", {});
};

module.exports = { chatSocket, getChat };
