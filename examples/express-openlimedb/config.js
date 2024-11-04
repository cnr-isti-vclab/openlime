const env = process.env;

const config = {
    db: { /* don't expose password or any sensitive info, done only for demo */
        host: env.DB_HOST || 'localhost',
        user: env.DB_USER || 'openlime',
        password: env.DB_PASSWORD || 'NydROTic20',
        database: env.DB_NAME || 'openlime',
    },
};

module.exports = config;