const express = require('express');
const passportConfig = require('../config/passport');
const scriptController = require('../controllers/script');

const router = express.Router();


router.post(
  '/reaction',
  passportConfig.isAuthenticated,
  scriptController.postCommentNudgeReaction
);

module.exports = router;