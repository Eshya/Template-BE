const express = require('express');
const { queryCek, paramCek } = require('../../helpers');
const router = express.Router();
const c = require('./berita.controller')

router.get('/categories', queryCek, c.findCategories);
router.get('/', queryCek, c.findPosts);
router.get('/smartfarm', queryCek, c.postBycategories);
router.get('/rekomendasi', queryCek, c.findRekomendasi);
router.get('/banner', c.findBanner);
router.get('/:id', paramCek, c.postById);

module.exports = router;