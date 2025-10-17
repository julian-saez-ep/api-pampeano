import dotenv from 'dotenv';
dotenv.config();

export const odooConfig = {
    db: process.env.ODOO_DB || 'your_database',
    username: process.env.ODOO_USERNAME || 'admin',
    password: process.env.ODOO_PASSWORD || 'admin',
    url: process.env.ODOO_URL || 'http://localhost:8069',
    port: process.env.ODOO_PORT || 8069,
};





