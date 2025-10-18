import { Sequelize } from 'sequelize';
import config from './config.js';

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

const sequelize = new Sequelize(
    dbConfig.database,
    dbConfig.username,
    dbConfig.password,
    {
        host: dbConfig.host,
        port: dbConfig.port,
        dialect: dbConfig.dialect,
        logging: dbConfig.logging !== false ? console.log : false,
        pool: dbConfig.pool || {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        }
    }
);

export default sequelize;