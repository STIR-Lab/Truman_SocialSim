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
      reacted: Boolean,
      userReacted: Array,
    },
    thumbsDown: {
      reacted: Boolean,
      userReacted: Array,
    },
    like: {
      reacted: Boolean,
      userReacted: Array,
    },
    laugh: {
      reacted: Boolean,
      userReacted: Array,
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
  content: [messageSchema],
});

const Conversation = mongoose.model("Conversation", conversationSchema);
module.exports = Conversation;
