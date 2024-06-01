const express = require('express');
const multer = require('multer');
const path = require('path');
const scriptController = require('../controllers/script');
const { csrf } = require('./account')

const router = express.Router();
const userpost_options = multer.diskStorage({
  destination: path.join(__dirname, '../uploads/user_post'),
  filename(req, file, cb) {
    const lastsix = req.user.id.substr(req.user.id.length - 6);
    const prefix = lastsix + Math.random().toString(36).slice(2, 10);
    cb(null, prefix + file.originalname.replace(/[^A-Z0-9]+/gi, '.'));
  },
});
const userpostupload = multer({ storage: userpost_options });

router.post(
  '/new',
  userpostupload.single('picinput'),
  csrf,
  scriptController.newPost
);

module.exports = router;