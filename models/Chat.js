const mongoose = require('mongoose');
const Schema = mongoose.Schema;



const conversationSchema = new Schema ({
    usernameA: String,
    userIdA: String,
    usernameB: String,
    userIdB: String,
    content: Array
})


const Conversation = mongoose.model('Conversation', conversationSchema);
module.exports = Conversation;