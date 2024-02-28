const { Server } = require("socket.io");
const moment = require("moment");
const { InMemorySessionStore } = require("../sessionStore");
const crypto = require("crypto");
const mongoose = require("mongoose");
const { Conversation, Message } = require("../models/Chat");
const { format } = require("path");
const User = require("../models/User");
const NudgeAction = require("../models/NudgeAction");
const util = require('util');

const { uploadFile } = require("../s3");

const sessionStore = new InMemorySessionStore();

const chatSocket = (server) => {
	const io = new Server(server, {
		maxHttpBufferSize: 1e7,
		pingTimeout: 30000,
	});

	// TODO: Receive pfp from the frontend
	// middleware: check username & userId, allows connection
	io.use(async (socket, next) => {
		const sessionId = socket.handshake.auth.sessionId;

		if (sessionId) {
			const session = sessionStore.findSession(sessionId);
			if (session) {
				// attach user pfp to session
				session.userpfp = await getChatPartnerPFP(session.userId); // socket.handshake.auth.userpfp;

				socket.sessionId = sessionId;
				socket.userId = session.userId;
				socket.username = session.username;
				socket.userpfp = session.userpfp;

				console.log("HERE 1");
				console.log(session);

				return next();
			}
		} else {
			const username = socket.handshake.auth.username;
			const userId = socket.handshake.auth.userId;
			const userpfp = socket.handshake.auth.userpfp;
			if (!username || !userId) {
				return next(new Error("Invalid username/userId"));
			}
			socket.sessionId = randomId();
			socket.username = username;
			socket.userId = userId;
			socket.userpfp = userpfp;

			console.log("HERE 2");
			// console.log(socket.userpfp)

			return next();
		}
		const username = socket.handshake.auth.username;
		const userId = socket.handshake.auth.userId;
		const userpfp = socket.handshake.auth.userpfp;
		if (!username || !userId) {
			return next(new Error("Invalid username/userId"));
		}
		socket.sessionId = randomId();
		socket.username = username;
		socket.userId = userId;
		socket.userpfp = userpfp;
		return next();
	});

	io.on("connection", async (socket) => {
		console.log("Websocket connection...");

		
        socket.onAny((event, ...args) => {
            console.log(event, args);
        });

		// Save session info and emit to the client
		sessionStore.saveSession(socket.sessionId, {
			userId: socket.userId,
			username: socket.username,
			socketId: socket.id,
			userpfp: socket.userpfp,
			connected: true,
		});
		socket.emit("session", {
			sessionId: socket.sessionId,
		});

		socket.on("find-partner", async (userId) => {
			const pfp = await getChatPartnerPFP(userId.userId);

			// console.log(pfp)

			io.to(socket.userId).emit("partner-pfp", {
				pfp,
				userId: userId.userId,
			});
		});

		// Diff tabs opened by the same user, thus we need to make diff sockets join the same room
		socket.join(socket.userId);

		// Fetch existing users
		console.log("=============emmitting userlist===============");
		socket.emit("userList", getCurrentUsers());
		// socket.broadcast.emit("userList", getCurrentUsers());


		// Finds all conversation history of a user
		const allConvo = await getChatHistory(socket.username, socket.userId);
		io.to(socket.userId).emit("receive-chat-history", allConvo);

		// Fetch all active users
		const allUsers = await User.find({
			active: true,
		});
		const formattedAllUsers = allUsers.map((user) => ({
			userId: user._id,
			username: user.username,
		}));
		io.to(socket.userId).emit("discover-users", formattedAllUsers);

		// Finds a specific conversation in db and sends back to the front end
		socket.on("get-messages", async ({ to }) => {
			const convoInfo = await searchConvo(
				socket.username,
				socket.userId,
				// socket.userpfp,
				to.username,
				to.userId
			);

			// Sending back the conversation content to user
			io.to(socket.userId).emit(
				"message-list",
				convoInfo ? convoInfo.content : {}
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
        nudge: {
          nudgeShown: Boolean, --> Nudge was shown/not shown, keep true for all for now, future research will only show the nudge to half of the teens
          riskyScenario: String, --> Risky Scenario type, "info_breach_1", "explicit_content_2", etc
          nudgeType: String, --> Nudge type, Pop up vs censored
          userAction: String, --> Action taken by the user
        },
        to: {
          username: string,
          userId: string,
          socketId: string
        }
      }
     */

		socket.on("send-message", async ({ msg, nudge, to }) => {
			// NOTE: io.to(socket.io) || socket.to(socket.io)?
			console.log("send-message activated", to);
			console.log(socket.username, socket.userId);
			nudge = nudge == undefined ? {} : nudge;

			const formattedMsg = await formatMessage(
				msg,
				nudge,
				{ username: socket.username, userId: socket.userId }, // from
				to
			);

			const convoInfo = await searchConvo(
				socket.username,
				socket.userId,
				to.username,
				to.userId
			);

			// console.log(convoInfo);

			if (convoInfo) {
				await storeMessage(formattedMsg, convoInfo);
			}
			// ok new convo
			else {
				console.log("no ongoing convo found, creating a new one.");

				const newConvo = new Conversation({
					usernameA: to.username,
					userIdA: to.userId,
					// userpfpA: to.userpfp,
					usernameB: socket.username,
					// userpfpB: socket.userpfp,
					userIdB: socket.userId,
				});
				await newConvo.save();
				// console.log(newConvo);
				await storeMessage(formattedMsg, newConvo);
			}

			// console.log(formattedMsg);
			await io
				.to(to.userId) // to recipient
				// .to(socket.userId) // to sender room
				.emit("receive-message", formattedMsg);

			// io.to(to.userId) // to recipient
			await io
				.to(socket.userId) // to sender room
				.emit("receive-message", formattedMsg);
		});

		socket.on("nudge-reaction", async ({ messageId, userAction, other }) => {
			const convoInfo = await searchConvo(
				socket.username,
				socket.userId,
				other.username,
				other.userId
			);

			if (!convoInfo) {
				return;
			}

			// Finding index of the content array where messageID is equal to an id within that array
			const messageIndex = convoInfo.content.findIndex(
				(message) => message._id == messageId
			);

			// Save userAction to db
			convoInfo.content[messageIndex].nudge.userAction = userAction;
			convoInfo.markModified("content");

			if (userAction === "deleteMessageAndLetOthersKnow") {
				console.log(`${other.username} has sent potentially harmful content.`);
				const harmfulContentString = `${other.username} has sent potentially harmful content.`;
				// emit to other users that potenially harmful content has been sent
				socket.broadcast.emit("letOthersKnowLinkNudge", harmfulContentString);
			}

			if (userAction === "blockUser") {
				convoInfo.blocked = other.userId;
				convoInfo.markModified("blocked");
			}

			if (userAction === "reportUser") {
				convoInfo.reported = other.userId;
				convoInfo.markModified("reported");
			}

			const nudgeAction = new NudgeAction({
				offender_username: convoInfo.content[messageIndex].from.username,
				recipient_username: convoInfo.content[messageIndex].to.username,
				nudge_name: convoInfo.content[messageIndex].nudge.nudgeType,
				nudge_action_name: convoInfo.content[messageIndex].nudge.userAction + 
				"_" + convoInfo.content[messageIndex].nudge.nudgeType,
				original_msg: convoInfo.content[messageIndex].msg
			})

			nudgeAction.save(err => {
				if (err) {
					console.log(err);
				} else {
					console.log('Nudge action updated successfully.');
				}
			});

			console.log("=============NudgeAction===============");
			console.log(nudgeAction);
			// console.log(util.inspect(nudgeAction, { depth: null }));

			await convoInfo.save();
			console.log("=============convo info===============");
			console.log(convoInfo);
			console.log(util.inspect(convoInfo, { depth: null }));



			console.log(userAction);
			if (userAction === "blockUser") {
				console.log("=============emmitting block===============");
				// console.log(formattedMsg);
				    User.findOne({username: socket.username}, (err, user) => {
			          if (err) {
			            console.log(err);
			            return;
			          }
					  
			          if (user) {
			            user.blocked.push(other.username);
			            user.save(err => {
			              if (err) {
			                console.log(err);
			              } else {
			                console.log('User blocked list updated successfully.');
			              }
			            });
			          }
			        });
				io.to(other.userId) // to recipient
					// .to(socket.userId) // to sender room
					.emit("blocked", "You've been blocked.");

				// io.to(to.userId) // to recipient
				io.to(socket.userId) // to sender room
					.emit("block-success", "Successfully blocked.");
			}

		    if (userAction === "reportUser") {
				console.log("=============emmitting report===============");
				// console.log(formattedMsg);
				    User.findOne({username: socket.username}, (err, user) => {
			          if (err) {
			            console.log(err);
			            return;
			          }
					  
			          if (user) {
			            user.reported.push(other.username);
			            user.save(err => {
			              if (err) {
			                console.log(err);
			              } else {
			                console.log('User reported list updated successfully.');
			              }
			            });
			          }
			        });
				io.to(other.userId) // to recipient
					// .to(socket.userId) // to sender room
					.emit("reported", "You've been reported.");

				// io.to(to.userId) // to recipient
				io.to(socket.userId) // to sender room
					.emit("report-success", "Successfully reported.");
			}
		});

		

		socket.on("read-messages", async ({ messageIds, other }) => {
			// search convo between from & socket user
			// eslint-disable-next-line prefer-const
			let convoInfo = await searchConvo(
				socket.username,
				socket.userId,
				other.username,
				other.userId
			);

			if (!convoInfo) {
				return;
			}

			convoInfo.content.forEach((content) => {
				messageIds.forEach((id) => {
					if (id == content._id) {
						content.msg.read = true;
					}
				});
			});

			convoInfo.markModified("content");
			await convoInfo.save();
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
     // eslint-disable-next-line max-len
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

		socket.on(
			"send-reaction",
			async ({ messageID, person, reactionType, reactions, to }) => {
				io.to(socket.userId) // to sender room
					.to(to.userId) // to recipient
					.emit("receive-reaction", {
						reactions,
						reactionType,
						person,
						messageID,
					});

				const convoInfo = await searchConvo(
					socket.username,
					socket.userId,
					to.username,
					to.userId
				);

				if (!convoInfo) {
					return;
				}

				// Finding index of the content array where messageID is equal to an id within that array
				const messageIndex = convoInfo.content.findIndex(
					(message) => message._id == messageID
				);

				// Save reaction to db
				convoInfo.content[messageIndex].msg.reactions[person] = reactionType;

				convoInfo.markModified("content");
				await convoInfo.save();
			}
		);

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
				socket.rooms.forEach(async (roomId) => {
					socket.broadcast
						.to(roomId)
						.emit(
							"disconneted",
							await formatMessage(
								leaveNotification(socket.username),
								chatBot,
								"ALL"
							)
						);
				});
				// refresh current users
				console.log(
					"=============emmitting userlist DISCONNECT==============="
				);
				const userList = getCurrentUsers();
				console.log(userList);
				socket.emit("userList", userList);
				socket.broadcast.emit("userList", getCurrentUsers());
			}
		}); // socket.on disconnect
	}); // io.on connection
}; // chatSocket

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
async function formatMessage(msg, nudge, from, to) {
	if (msg.type == "img" || msg.type == "vid") {
		//   for (var value of msg.body.values()) {
		//     console.log(value);
		//  }

		const prefix = from.userId + Math.random().toString(36).slice(2, 10);
		msg.body.filename = prefix + msg.body.filename.replace(/[^A-Z0-9]+/gi, "_");
		console.log(msg.body);
		await uploadFile(msg.body);

		msg.body = msg.body.filename;
	}

	return new Message({
		msg: {
			...msg,
			read: false,
			time: moment().utc().format("h:mm:ss a"),
			reactions: {
				self: "none",
				other: "none",
			},
		},
		nudge: {
			...nudge,
			userAction: "",
		},
		from,
		to,
	});
}

/**
 * Store new message obejct to the existing conversation and save to the DB
 *
 * @param {object} msg
 * @param {object} convoInfo
 */
async function storeMessage(msg, convoInfo) {
	convoInfo.content.push(msg);

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
				userpfp: session.userpfp,
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
	const allConvo = await Conversation.find({
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

async function getChatPartnerPFP(userId) {
	let chatPartner;

	try {
		chatPartner = await User.find({
			_id: userId,
		});

		console.log(`GOT ${userId} PFP`);
		return chatPartner[0].profile.picture;
	} catch (error) {
		console.log(error);
		return "";
	}

	// console.log(chatPartner[0].profile.picture)
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
		usernameA,
		userIdA,
		usernameB,
		userIdB,
	});

	if (curConvo) {
		// console.log("found existing convo", curConvo);
		return curConvo;

		// {
		//   curConvo: curConvo,
		//   usernameA: usernameA,
		//   userIdA: userIdA,
		//   usernameB: usernameB,
		//   userIdB: userIdB,
		// };
	}
	curConvo = await Conversation.findOne({
		usernameA: usernameB,
		userIdA: userIdB,
		usernameB: usernameA,
		userIdB: userIdA,
	});
	if (curConvo) {
		// console.log("found existing convo", curConvo);
		return curConvo;

		// {
		//   curConvo: curConvo,
		//   usernameA: usernameB,
		//   userIdA: userIdB,
		//   usernameB: usernameA,
		//   userIdB: userIdA,
		// };
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

getRiskInformation = (req, res) => {
	res.render("risk_information", {});
};

module.exports = { chatSocket, getChat, getRiskInformation };