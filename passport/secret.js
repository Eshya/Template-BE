const passport = require('passport');
exports.auth = passport.authenticate('jwt', {session: false});
exports.JWT_SECRET = 'Psstt!!j4n64nKas1t4u!!1!';
