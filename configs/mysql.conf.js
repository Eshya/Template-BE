// const config = {
//     db: {
//         host: process.env.DB_HOST || 'app.chickin.id',
//         user: process.env.DB_USER || 'n1111039_chickin_app',
//         password: process.env.DB_PASSWORD || '@1M@r}bJL?aC',
//         database: process.env.DB_NAME || 'n1111039_chickin_app',
//         waitForConnections: true,
//         connectionLimit: process.env.DB_CONN_LIMIT || 2,
//         queueLimit: 0,
//     },
//     listPerPage: process.env.LIST_PER_PAGE || 10
// }

// module.exports = config

const config = {
    db: {
        host: process.env.DB_HOST || 'app.chickin.id',
        password: process.env.DB_PASSWORD || 'Chickin123',
        user: process.env.DB_USER || 'u3793941_chickin_iot',
        database: process.env.DB_NAME || 'u3793941_chickin_iot',
        // port: 3306,
        waitForConnections: true,
        connectionLimit: process.env.DB_CONN_LIMIT || 2,
        queueLimit: 0,
    },
    listPerPage: process.env.LIST_PER_PAGE || 10
}

module.exports = config

// fresh.chickin.id
// DB_DATABASE=fresh_chickin
// DB_USERNAME=fresh_chickin
// DB_PASSWORD=Chickin@fresh123