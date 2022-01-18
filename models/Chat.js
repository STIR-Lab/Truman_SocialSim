import mongoose from 'mongoose';
const {Schema} = mongoose;

//Figuring out the ideal schema for this
const chatSchema = new Schema({
    message_body : String,
    }
);

const Chat = mongoose.model('Chat', chatSchema);
module.exports = Chat;
