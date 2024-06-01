const express = require('express');
const scriptController = require('../controllers/script');

const router = express.Router();

router.get('/:caseId', scriptController.getScriptFeed);

module.exports = router;