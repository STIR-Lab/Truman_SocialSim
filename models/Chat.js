const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const messageSchema = new Schema({
  msg: {
    type: String,
    body: String,
    mimeType: String,
    fileName: String,
    time: String,
    thumbsUp: {
      self: {
        type: Boolean,
        default: false,
      },
      other: {
        type: Boolean,
        default: false,
      },
    },
    thumbsDown: {
      self: {
        type: Boolean,
        default: false,
      },
      other: {
        type: Boolean,
        default: false,
      },
    },
    like: {
      self: {
        type: Boolean,
        default: false,
      },
      other: {
        type: Boolean,
        default: false,
      },
    },
    laugh: {
      self: {
        type: Boolean,
        default: false,
      },
      other: {
        type: Boolean,
        default: false,
      },
    },
  },
  from: {
    username: String,
    userId: String,
  },
  to: {
    username: String,
    userId: String,
  },
});

const conversationSchema = new Schema({
  usernameA: String,
  userIdA: String,
  usernameB: String,
  userIdB: String,
  content: [{ type: Schema.Types.ObjectId, ref: messageSchema }],
});

const Message = mongoose.model("Message", messageSchema);
const Conversation = mongoose.model("Conversation", conversationSchema);
module.exports = { Conversation, Message };
