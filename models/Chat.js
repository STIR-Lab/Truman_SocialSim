const { mongo } = require("mongoose");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// const messageSchema = new Schema({

//   from: {
//     username: String,
//     userId: String,
//   },
//   to: {
//     username: String,
//     userId: String,
//   },
//   msg: {
//     type: String,
//     body: String,
//     // mimeType: String,
//     // fileName: String,
//     time: String,
//     thumbsUp: {
//       self: Boolean,
//       other: Boolean,
//     },
//     thumbsDown: {
//       self: Boolean,
//       other: Boolean,
//     },
//     like: {
//       self: Boolean,
//       other: Boolean,
//     },
//     laugh: {
//       self: Boolean,
//       other: Boolean,
//     },
//   },
// });

const messageSchema = new Schema(
  {
    from: {
      username: String,
      userId: String,
    },
    to: {
      username: String,
      userId: String,
    },
    msg: Object,
  },
  { versionKey: false }
);

const conversationSchema = new Schema(
  {
    usernameA: String,
    userIdA: String,
    usernameB: String,
    userIdB: String,
    content: [messageSchema | nudgeSchema],
  },
  { versionKey: false }
);

const Message = mongoose.model("Message", messageSchema);
const Conversation = mongoose.model("Conversation", conversationSchema);
module.exports = { Conversation, Message };
