const express = require('express');
const passportConfig = require('../config/passport');
const actorsController = require('../controllers/actors');

const router = express.Router();

router.get(
  '/:userId',
  passportConfig.isAuthenticated,
  actorsController.getActor
);

router.post(
  '/',
  passportConfig.isAuthenticated,
  actorsController.postBlockOrReportOrFriend
);

module.exports = router;  