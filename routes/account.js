const express = require('express');
const multer = require('multer');
const path = require('path');
const lusca = require('lusca');
const passportConfig = require('../config/passport');
const userController = require('../controllers/user');

const router = express.Router();
const useravatar_options = multer.diskStorage({
  destination: path.join(__dirname, '../uploads/user_post'),
  async filename(req, file, cb) {
    const prefix = req.user.id + Math.random().toString(36).slice(2, 10);
    cb(null, prefix + file.originalname.replace(/[^A-Z0-9]+/gi, '.'));
  },
});
const useravatarupload = multer({ storage: useravatar_options });

const csrf = lusca({ csrf: true });

router.get(
  '/signup_info',
  passportConfig.isAuthenticated,
  userController.getSignupInfo
);

router.get('/', passportConfig.isAuthenticated, userController.getAccount);

router.post(
  '/signup_info_post',
  passportConfig.isAuthenticated,
  useravatarupload.single('picinput'),
  csrf,
  userController.postSignupInfo
);

router.post(
  '/profile',
  passportConfig.isAuthenticated,
  useravatarupload.single('picinput'),
  csrf,
  userController.postUpdateProfile
);

router.post(
  '/password',
  passportConfig.isAuthenticated,
  userController.postUpdatePassword
);

router.post(
  '/profile',
  passportConfig.isAuthenticated,
  useravatarupload.single('picinput'),
  csrf,
  userController.postUpdateProfile
);

module.exports.accountRouter = router;
module.exports.csrf = csrf;