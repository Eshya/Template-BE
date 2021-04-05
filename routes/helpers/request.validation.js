const {query, param, validationResult} = require('express-validator');
exports.param = [
  param('id').isMongoId().withMessage('Invalid Mongo ID'),
];
exports.query = [
  query('limit').toInt(10),
  query('offset').toInt(10),
];
exports.after = (req, res, next)=>{
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({error: errors.array()});
  } else {
    if (req.method=='PUT') {
      delete req.body._id;
      delete req.body.__v;
    }
    next();
  }
};
