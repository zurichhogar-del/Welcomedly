import sequelize from '../database/connection.js';
import Sequelize from 'sequelize';
import dotenv from 'dotenv';
dotenv.config();

import Campana from './Campana.js';
import BaseCampana from './BaseCampana.js';
import Formulario from './Formulario.js';
import User from './User.js';
import Disposicion from './Disposicion.js';
import AgentStatus from './AgentStatus.js';
import PauseHistory from './PauseHistory.js';
import WorkSession from './WorkSession.js';
import Call from './Call.js';
import SipPeer from './SipPeer.js';
import Trunk from './Trunk.js';
import AgentMetric from './AgentMetric.js';
import CampaignMetric from './CampaignMetric.js';

const db = {};

db.sequelize = sequelize;
db.Sequelize = Sequelize;

// Inicializamos modelos
db.Campana = Campana(sequelize, Sequelize.DataTypes);
db.BaseCampana = BaseCampana(sequelize, Sequelize.DataTypes);
db.Formulario = Formulario(sequelize, Sequelize.DataTypes);
db.User = User(sequelize, Sequelize.DataTypes);
db.Disposicion = Disposicion(sequelize, Sequelize.DataTypes);
db.AgentStatus = AgentStatus(sequelize);
db.PauseHistory = PauseHistory(sequelize);
db.WorkSession = WorkSession(sequelize);
db.Call = Call(sequelize, Sequelize.DataTypes);
db.SipPeer = SipPeer(sequelize, Sequelize.DataTypes);
db.Trunk = Trunk(sequelize, Sequelize.DataTypes);
db.AgentMetric = AgentMetric(sequelize);
db.CampaignMetric = CampaignMetric(sequelize);



// Asociaciones automáticas si existen
Object.keys(db).forEach((modelName) => {
    if ('associate' in db[modelName]) {
        db[modelName].associate(db);
    }
});

export default db;