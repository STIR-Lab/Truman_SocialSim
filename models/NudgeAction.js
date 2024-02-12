const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const NudgeActionSchema = new Schema({
  offender_username: String, // the username of the person sending the sensitive message or adding a sensitive comment to a post

  recipient_username: String, // the username of the recipient or the user to whom the sensitive message or comment is directed.

  original_msg: Object,

  // Example:
  // First-layer nudge: ‘commentNudge’, ‘chatInfoNudge’, ‘chatCreepyNudge’
  // Second-layer nudge: ‘protective_commentNudge’, ‘unhide_CommentNudge’
  nudge_name: String, // the name of the involved nudge

  // Example:
  // ‘unhide_commentNudge’, ‘block_protective_commentNudge’
  nudge_action_name: String, // the recipient's action to the nudge

}, { timestamps: true });

const NudgeAction = mongoose.model('NudgeAction', NudgeActionSchema);

module.exports = NudgeAction;