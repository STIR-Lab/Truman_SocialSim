const { Server } = require("socket.io");
const moment = require("moment");
const { InMemorySessionStore } = require("../sessionStore");
const crypto = require("crypto");
const mongoose = require("mongoose");
const { Conversation, Message } = require("../models/Chat");
const { format } = require("path");
const { ObjectId } = require("mongoose");

const sessionStore = new InMemorySessionStore();

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

    // diff tabs opened by the same user, thus we need to make diff sockets join the same room
    socket.join(socket.userId);

    // Finds conversation in db and sends back to the front end
    socket.on("get-messages", async ({ to }) => {
      let convoInfo = searchConvo(
        socket.username,
        socket.userId,
        to.username,
        to.userId
      );

      //Sending back the conversation content to user
      io.to(socket.userId).emit(
        "message-list",
        convoInfo ? convoInfo.curConvo.content : []
      );
    });

    /**
     * Message
     *
     * {
     *  msg: {
     *     type: "txt" | "img"
     *     body: string | blob, actual content of the message
     *     mimeType?: "png" | "jpg", etc
     *     fileName?: string
     *   },
     *  to: {
     *     username: string
     *     userId: string,
     *     socketId: string
     *   }
     * }
     */

    socket.on("send-message", async ({ msg, to }) => {
      // NOTE: io.to(socket.io) || socket.to(socket.io)?

      const formattedMsg = formatMessage(
        msg,
        { username: socket.username, userId: socket.userId },
        to
      );

      let convoInfo = await searchConvo(
        socket.username,
        socket.userId,
        to.username,
        to.userId
      );

      if (convoInfo) {
        try {
          await Conversation.updateOne(
            {
              usernameA: convoInfo.usernameA,
              userIdA: convoInfo.userIdA,
              usernameB: convoInfo.usernameB,
              userIdB: convoInfo.userIdB,
            },
            {
              $push: { content: new Message({ ...formattedMsg }) },
            }
          );
        } catch (err) {
          console.log(err);
        }
      }
      // ok new convo
      else {
        console.log("no ongoing convo found, creating a new one.");
        let newMsg = new Message({
          ...formattedMsg,
        });
        let newConvo = new Conversation({
          usernameA: to.username,
          userIdA: to.userId,
          usernameB: socket.username,
          userIdB: socket.userId,
          content: [newMsg],
        });
        await newConvo.save();
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

    /**
     * Reactions: Thumbs Up, Love, Laugh, Thumbs Down
     *
     * {
     *  msg: {
     *    type: "txt" | "img"
     *    body: string | blob, actual content of the message
     *    mimeType?: "png" | "jpg", etc
     *    fileName?: string
     *    time: string
     *    reaction: [ "thumbsUp", "thumbsDown", "love", "laugh" ] // NOTE: This is an array, only add reactions to the array if it's being updated
     *  }
     *  to: {
     *     username: string
     *     userId: string,
     *     socketId: string
     *   }
     * }
     *
     */

    socket.on("send-reaction", async ({ msg, to }) => {
      let convoInfo = await searchConvo(
        socket.username,
        socket.userId,
        to.username,
        to.userId
      );

      if (!convoInfo) {
        console.log("Did not find corresponding conversation.");
        return;
      }

      // search for the message according to body & time
      for (let i = 0; i < convoInfo.curConvo.content.length; i++) {
        let curMsg = convoInfo.curConvo.content[i];
        if (curMsg.body === msg.body && curMsg.time === msg.time) {
          // loop through and update each reaction in reaction array
          for (let r of msg.reaction) {
            if (curMsg.from.userId === socket.userId) {
              // flip self
              let keyString = "content." + i + "." + r + ".self";
              await Conversation.updateOne(
                {
                  usernameA: convoInfo.usernameA,
                  userIdA: convoInfo.userIdA,
                  usernameB: convoInfo.usernameB,
                  userIdB: convoInfo.userIdB,
                },
                {
                  $set: { keyString: !curMsg.r.self },
                }
              );
            } else {
              // flip other
              let keyString = "content." + i + "." + r + ".other";
              await Conversation.updateOne(
                {
                  usernameA: convoInfo.usernameA,
                  userIdA: convoInfo.userIdA,
                  usernameB: convoInfo.usernameB,
                  userIdB: convoInfo.userIdB,
                },
                {
                  $set: { keyString: !curMsg.r.other },
                }
              );
            }
          }

          break;
        }
      }
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

/**
 * Utils
 *
 */

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
      time: moment().format("h:mm:ss a"),
    },
    thumbsUp: {
      self: false,
      other: false,
    },
    thumbsDown: {
      self: false,
      other: false,
    },
    like: {
      self: false,
      other: false,
    },
    laugh: {
      self: false,
      other: false,
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

async function searchConvo(usernameA, userIdA, usernameB, userIdB) {
  let curConvo = await Conversation.findOne({
    usernameA,
    userIdA,
    usernameB,
    userIdB,
  });

  if (curConvo) {
    console.log("found existing convo", curConvo);
    return {
      curConvo,
      usernameA,
      userIdA,
      usernameB,
      userIdB,
    };
  } else {
    curConvo = await Conversation.findOne({
      usernameB,
      userIdB,
      usernameA,
      userIdA,
    });
    if (curConvo) {
      console.log("found existing convo", curConvo);
      return {
        curConvo,
        usernameA: usernameB,
        userIdA: userIdB,
        usernameB: usernameA,
        userIdB: userIdA,
      };
    }
  }

  return null;
}

/**
 * Routes, Exports
 *
 */

getChat = (req, res) => {
  res.render("chat", {});
};

module.exports = { chatSocket, getChat };
