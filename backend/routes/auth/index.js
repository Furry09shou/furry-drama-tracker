const express = require('express');
const router = express.Router();
const session = require('./session');
const device = require('./device');
const password = require('./password');
const email = require('./email');
const account = require('./account');

router.use(session);
router.use(device);
router.use(password);
router.use(email);
router.use(account);

router.__isSplitAuthRouter = true;

module.exports = router;
