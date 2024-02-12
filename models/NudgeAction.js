const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const NudgeActionSchema = new Schema({
  // Use email as it is the unique key in User model
  offender_email: String, // the email of the person sending the sensitive message or adding a sensitive comment to a post

  recipient_email: String, // the email of the recipient or the user to whom the sensitive message or comment is directed.

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