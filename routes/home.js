const express = require('express');
const chatController = require('../controllers/chat');
const notificationController = require('../controllers/notification');
const passportConfig = require('../config/passport');
const scriptController = require('../controllers/script');
const userController = require('../controllers/user');

const router = express.Router();

router.get('/', passportConfig.isAuthenticated, scriptController.getScript);

router.get('/tos', (req, res) => {
  res.render('tos', {
    title: 'TOS',
  });
});

router.get('/com', (req, res) => {
  res.render('com', {
    title: 'Community Rules',
  });
});

router.get('/info', passportConfig.isAuthenticated, (req, res) => {
  res.render('info', {
    title: 'User Docs',
  });
});

router.get('/profile_info', passportConfig.isAuthenticated, (req, res) => {
  res.render('profile_info', {
    title: 'Profile Introductions',
  });
});

router.get('/me', passportConfig.isAuthenticated, userController.getMe);

router.get(
  '/completed',
  passportConfig.isAuthenticated,
  userController.userTestResults
);

router.get(
  '/notifications',
  passportConfig.isAuthenticated,
  notificationController.getNotifications
);

router.get('/chat', passportConfig.isAuthenticated, chatController.getChat);

router.get(
  '/risk_information',
  passportConfig.isAuthenticated,
  chatController.getRiskInformation
);

router.get('/test_comment', (req, res) => {
  res.render('test', {
    title: 'Test Comments',
  });
});

router.get('/login', userController.getLogin);
router.post('/login', userController.postLogin);
router.get('/logout', userController.logout);
router.get('/forgot', userController.getForgot);
router.post('/forgot', userController.postForgot);
router.get('/signup', userController.getSignup);
router.post('/signup', userController.postSignup);
router.get('/bell', passportConfig.isAuthenticated, userController.checkBell);
router.get('/bell', passportConfig.isAuthenticated, userController.checkBell);
router.get('/feed', passportConfig.isAuthenticated, scriptController.getScript);

router.post(
  '/feed',
  passportConfig.isAuthenticated,
  scriptController.postUpdateFeedAction
);
router.post(
  '/pro_feed',
  passportConfig.isAuthenticated,
  scriptController.postUpdateProFeedAction
);
router.post(
  '/userPost_feed',
  passportConfig.isAuthenticated,
  scriptController.postUpdateUserPostFeedAction
);
router.post(
  '/userPost_comment',
  passportConfig.isAuthenticated,
  scriptController.postNewCommentOnUserPost
);

module.exports = router;