// public/js/logger.js

const mongoose = require('mongoose');
const NudgeAction = require('../../models/NudgeAction')


// Function to log nudge actions
async function logNudgeAction(offenderEmail, recipientEmail, nudgeName, nudgeActionName) {
  try {
    // Create a new NudgeAction document
    const newNudgeAction = new NudgeAction({
      offender_email: offenderEmail,
      recipient_email: recipientEmail,
      nudge_name: nudgeName,
      nudge_action_name: nudgeActionName
    });

    // Save the document to the database
    await newNudgeAction.save();

  } catch (error) {
    console.error('Error logging nudge action:', error);
  }
}

module.exports = { logNudgeAction };