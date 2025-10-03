import sequelize from '../database/connection.js';
import Sequelize from 'sequelize';
import dotenv from 'dotenv';
dotenv.config();

import Campana from './Campana.js';
import BaseCampana from './BaseCampana.js';
import Formulario from './Formulario.js';
import User from './User.js';

const db = {};

db.sequelize = sequelize;
db.Sequelize = Sequelize;

// Inicializamos modelos
db.Campana = Campana(sequelize, Sequelize.DataTypes);
db.BaseCampana = BaseCampana(sequelize, Sequelize.DataTypes);
db.Formulario = Formulario(sequelize, Sequelize.DataTypes);
db.User = User(sequelize, Sequelize.DataTypes);



// Asociaciones automáticas si existen
Object.keys(db).forEach((modelName) => {
    if ('associate' in db[modelName]) {
        db[modelName].associate(db);
    }
});

export default db;