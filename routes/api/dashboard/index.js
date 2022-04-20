const express = require('express');
const router = express.Router();
const c = require('./dashboard.controller');
const {auth, queryCek} = require('../../helpers');

router.get('/kemitraan', auth, queryCek, c.dashboardKemitraan);
router.get('/kemitraan/populasi', auth, queryCek, c.dashboardKemitraanPopulasi);
router.get('/kemitraan/ketersediaan', auth, queryCek, c.dashboardKemitraanKetersediaan);
router.get('/sales/ketersediaan', auth, queryCek, c.dashboardSalesKetersediaan);

module.exports = router;