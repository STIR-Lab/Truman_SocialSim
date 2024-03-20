// Import Mongoose
const mongoose = require('mongoose');

// Define Schema for Access Codes
const accessCodeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  email: { type: String, default: null},
  isMaster: { type: Boolean, default: false } // Flag to indicate if the access code is a master code
});

// Create Access Code Model
const AccessCode = mongoose.model('AccessCode', accessCodeSchema);

// Export the Access Code Model
module.exports = AccessCode;