const { Server } = require("socket.io");
const moment = require("moment");
const { InMemorySessionStore } = require("../sessionStore");
const crypto = require("crypto");
const mongoose = require("mongoose");
const { Conversation, Message } = require("../models/Chat");
const { format } = require("path");
const { ObjectId } = require("mongoose");
const User = require("../models/User");

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

  io.on("connection", async (socket) => {
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
    socket.emit("userList", getCurrentUsers());

    // Diff tabs opened by the same user, thus we need to make diff sockets join the same room
    socket.join(socket.userId);

    // Finds all conversation history of a user
    let allConvo = await getChatHistory(socket.username, socket.userId);
    io.to(socket.userId).emit("receive-chat-history", allConvo);

    // TODO: Fetch all users to FE for discorver
    socket.on("discover-users", async () => {
      let allUsers = await User.find({
        active: true,
      });

      return allUsers;
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

      let formattedMsg = formatMessage(
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
        storeMessage(formattedMsg, convoInfo);
      }
      // ok new convo
      else {
        console.log("no ongoing convo found, creating a new one.");

        let newConvo = new Conversation({
          usernameA: to.username,
          userIdA: to.userId,
          usernameB: socket.username,
          userIdB: socket.userId,
        });
        await newConvo.save();

        storeMessage(formattedMsg, newConvo);
      }

      io.to(to.userId) // to recipient
        //.to(socket.userId) // to sender room
        .emit(
          "receive-message",

          formatMessage(
            msg,
            { username: socket.username, userId: socket.userId },
            to
          )
        );

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
              // FIXME: Update a specific field in a specific message object in the content array
              if (curMsg.from.userId === socket.userId) {
                // flip self
                let keyString = "content." + i + ".msg." + r + ".self";

                await Conversation.updateOne(
                  {
                    usernameA: convoInfo.usernameA,
                    userIdA: convoInfo.userIdA,
                    usernameB: convoInfo.usernameB,
                    userIdB: convoInfo.userIdB,
                  },
                  {
                    $set: { keyString: !curMsg.msg.r.self },
                  }
                );
              } else {
                // flip other
                let keyString = "content." + i + ".msg." + r + ".other";
                await Conversation.updateOne(
                  {
                    usernameA: convoInfo.usernameA,
                    userIdA: convoInfo.userIdA,
                    usernameB: convoInfo.usernameB,
                    userIdB: convoInfo.userIdB,
                  },
                  {
                    $set: { keyString: !curMsg.msg.r.other },
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
                formatMessage(
                  leaveNotification(socket.username),
                  chatBot,
                  "ALL"
                )
              );
          });
          // refresh current users
          const userList = getCurrentUsers();
          socket.emit("userList", userList);
        }
      });
    });
  });

  /**
   * Utils
   *
   */

  /**
   * Generate a session id for a newly joined user
   *
   */
  const randomId = () => crypto.randomBytes(8).toString("hex");

  const chatBot = "chatBot";

  /**
   * Format leave notification which is different from user message object
   *
   * @param {object} from
   *
   */
  function leaveNotification(from) {
    return {
      type: "txt",
      body: `${from} has left the chat`,
    };
  }

  /**
   * Format message with reactions and a timestamp, etc.
   *
   * @param {object} msg
   * @param {object} from
   * @param {object} to
   *
   */
  function formatMessage(msg, from, to) {
    return {
      msg: {
        ...msg,
        time: moment().format("h:mm:ss a"),
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
      },
      from: from, // NOTE: string | object
      to: to,
    };
  }

  /**
   * Store new message obejct to the existing conversation and save to the DB
   *
   * @param {object} msg
   * @param {object} convoInfo
   */
  async function storeMessage(msg, convoInfo) {
    let newMessage = new Message(msg);
    convoInfo.content.push(newMessage);

    await convoInfo.save();
  }

  /**
   * Fetch a list of current active users
   *
   */
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

  /**
   * Find all conversation history of a user
   *
   * @param {string} username
   * @param {string} userId
   *
   */
  async function getChatHistory(username, userId) {
    let allConvo = await Conversation.find({
      $or: [
        {
          usernameA: username,
          userIdA: userId,
        },
        {
          usernameB: username,
          userIdB: userId,
        },
      ],
    });

    return allConvo;
  }

  /**
   * Find a specific conversation history between two users
   *
   * @param {string} usernameA
   * @param {string} userIdA
   * @param {string} usernameB
   * @param {string} userIdB
   *
   */
  async function searchConvo(usernameA, userIdA, usernameB, userIdB) {
    let curConvo = await Conversation.findOne({
      usernameA: usernameA,
      userIdA: userIdA,
      usernameB: usernameB,
      userIdB: userIdB,
    });

    if (curConvo) {
      console.log("found existing convo", curConvo);
      return curConvo;

      // {
      //   curConvo: curConvo,
      //   usernameA: usernameA,
      //   userIdA: userIdA,
      //   usernameB: usernameB,
      //   userIdB: userIdB,
      // };
    } else {
      curConvo = await Conversation.findOne({
        usernameA: usernameB,
        userIdA: userIdB,
        usernameB: usernameA,
        userIdB: userIdA,
      });
      if (curConvo) {
        console.log("found existing convo", curConvo);
        return curConvo;

        // {
        //   curConvo: curConvo,
        //   usernameA: usernameB,
        //   userIdA: userIdB,
        //   usernameB: usernameA,
        //   userIdB: userIdA,
        // };
      }
    }

    return null;
  }

  /**
   * Routes, Exports
   *
   */
};
getChat = (req, res) => {
  res.render("chat", {});
};

module.exports = { chatSocket, getChat };
