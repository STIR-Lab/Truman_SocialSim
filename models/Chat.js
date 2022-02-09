const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const chatSchema = new mongoose.Schema({

    //message:{
        username: String,
        userId: Number, // not socket.id
        type: String,// "txt" | "img"
        body: String,
        mimeType: String,
        fileName: String,

    //}

})

const Chat = mongoose.model('chat', chatSchema);
module.exports = Chat;

/* const MessageSchema = mongoose.Schema({
    message:{
        text: { type:String, required:true }
        // you can add any other properties to the message here.
        // for example, the message can be an image ! so you need to tweak this a little
    }
    // if you want to make a group chat, you can have more than 2 users in this array
    users:[{
        user: { type:mongoose.Schema.Types.ObjectId, ref:'User', required:true }
    }]
    sender: { type:mongoose.Schema.Types.ObjectId, ref:'User', required:true },
    read: { type:Date }
},
{
    timestamps: true
});
*/