exports.defaultPort = process.env.SERVER_PORT || 8081;
exports.dbServer = process.env.DB_SERVER || 'localhost:27017';
exports.projectName = process.env.npm_package_name;
exports.JWT_SECRET = process.env.JWT_SECRET || 'iniR4hasi4loh1!1!-chickin';