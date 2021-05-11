//mysql connection
const mysql = require('mysql');
const dbCon = mysql.createConnection({
    host: 'app.chickin.id',
    user: 'n1111039_chickin_app',
    password: '@1M@r}bJL?aC',
    database: 'n1111039_chickin_app'

})

dbCon.connect(function(err){
    if(err) throw err;
    console.log("Database Connected");
})

module.exports = dbCon;