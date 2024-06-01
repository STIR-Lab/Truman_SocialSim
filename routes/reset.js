const express = require('express');
const userController = require('../controllers/user');

const router = express.Router();

router.get('/:token', userController.getReset);
router.post('/:token', userController.postReset);

module.exports = router;