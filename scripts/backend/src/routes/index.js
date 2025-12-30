const express = require('express');
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const productRoutes = require('./productRoutes');
const orderRoutes = require('./orderRoutes');
const paymentRoutes = require('./paymentRoutes');
const revenueRoutes = require('./revenueRoutes');
const linkRoutes = require('./linkRoutes');
const boostRoutes = require('./boostRoutes');
const affiliateRoutes = require('./affiliateRoutes');
const categoryRoutes = require('./categoryRoutes');
const searchRoutes = require('./searchRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/products', productRoutes);
router.use('/orders', orderRoutes);
router.use('/payments', paymentRoutes);
router.use('/revenue', revenueRoutes);
router.use('/links', linkRoutes);
router.use('/boost', boostRoutes);
router.use('/affiliates', affiliateRoutes);
router.use('/categories', categoryRoutes);
router.use('/search', searchRoutes);

module.exports = router;