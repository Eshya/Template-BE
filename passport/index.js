const passport = require('passport');
const BasicStrategy = require('passport-http').BasicStrategy;
const {JWT_SECRET} = require('./secret');
const passportJwt = require('passport-jwt');
const JWTStrategy = passportJwt.Strategy;
const ExtractJWT = passportJwt.ExtractJwt;

const UserCtrl = require('../routes/api/users/users.controller');
const Users = require('../routes/api/users/users.model');

passport.serializeUser((user, done)=>{
    done(null, user);
});
passport.deserializeUser((obj, done)=>{
    done(null, obj);
});

passport.use(new BasicStrategy(async (username, passwd, done)=> {
    try {
        const user = await UserCtrl.login(username, passwd);
        return done(null, user, {message: 'Logged In Successfully!'});
    } catch (error) {
        return done(error, null);
    }
}));

passport.use(new JWTStrategy({
    jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken(),
    secretOrKey: JWT_SECRET,
}, async({username}, done) => {
    try {
        const user = await Users.findOne({username})
        return done(null, user);
    } catch (error) {
        return done(error, null)
    }
}))

module.exports = passport;