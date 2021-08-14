const config = {
    db: {
        host: process.env.DB_HOST || 'app.chickin.id',
        user: process.env.DB_USER || 'n1111039_chickin_app',
        password: process.env.DB_PASSWORD || '@1M@r}bJL?aC',
        database: process.env.DB_NAME || 'n1111039_chickin_app',
        waitForConnections: true,
        connectionLimit: process.env.DB_CONN_LIMIT || 2,
        queueLimit: 0,
    },
    listPerPage: process.env.LIST_PER_PAGE || 10
}

module.exports = config