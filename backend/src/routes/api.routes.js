'use strict';

const { Router } = require('express');
const rateLimit = require('express-rate-limit');

const { authenticate } = require('../middlewares/auth.middleware');
const cartController = require('../controllers/cartController');
const orderController = require('../controllers/orderController');
const User = require('../models/User');

/**
 * Mini App uchun REST API.
 * Ochiq (public) va himoyalangan (initData imzosi bilan) endpointlar ajratilgan.
 */

const router = Router();

/** Buyurtma spam'iga qarshi: 1 daqiqada maksimum 5 ta checkout. */
const checkoutLimiter = rateLimit({
  windowMs: 60_000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: { code: 'TOO_MANY_REQUESTS', message: 'Juda ko‘p urinish. Biroz kuting.' } },
});

// ── Public ───────────────────────────────────────────────────
router.get('/catalog', cartController.getCatalog);
router.get('/stories', cartController.getStories);

// ── Himoyalangan (Telegram initData) ─────────────────────────
router.use(authenticate);

/** Joriy foydalanuvchi + statistika. */
router.get('/me', async (req, res, next) => {
  try {
    const stats = await User.getStats(req.user.id);
    res.json({ ok: true, data: { ...req.user, stats } });
  } catch (err) {
    next(err);
  }
});

router.post('/cart/validate', cartController.validateCart);

router.post('/orders', checkoutLimiter, orderController.createOrder);
router.get('/orders', orderController.getMyOrders);
router.get('/orders/:id', orderController.getOrderById);

module.exports = router;
