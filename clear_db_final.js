const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend/.env') });

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
};

async function clearDB() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');
        const tables = ['audit_logs', 'recommendations', 'profiles', 'users'];
        for (const table of tables) {
            await connection.query(`TRUNCATE TABLE ${table}`);
        }
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');
        console.log('SUCCESS: Database is now empty.');
    } catch (err) {
        console.error('FAIL:', err.message);
    } finally {
        if (connection) await connection.end();
        process.exit();
    }
}

clearDB();
