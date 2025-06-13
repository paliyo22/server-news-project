import mysql from 'mysql2/promise'
import config from '../config';

const DEFAULT_CONFIG={
    host: config.DBHost,
    user: config.DBUser,
    port: config.DBPort,
    password: config.DBPassword,
    database: config.DBName
}

//export const connection = await mysql.createConnection(DEFAULT_CONFIG);  // dev

export const connection = mysql.createPool({  // production
  uri: config.DBUrl,
  waitForConnections: true,
  connectionLimit: 10,
  timezone: 'Z'
})
  
