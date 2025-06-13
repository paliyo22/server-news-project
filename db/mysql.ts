import mysql from 'mysql2/promise'
import config from '../config';

/**
 * Default configuration object for connecting to the database.
 * These values are fetched from the `config` object, which contains
 * the database credentials and connection parameters.
 * 
 * @constant {object}
 */
const DEFAULT_CONFIG={
    host: config.DBHost,
    user: config.DBUser,
    port: config.DBPort,
    password: config.DBPassword,
    database: config.DBName
}

//export const connection = await mysql.createConnection(DEFAULT_CONFIG);  // dev

/**
 * MySQL connection pool configuration for production environments.
 * Instead of creating a single connection, a pool of connections is established.
 * The pool allows for multiple connections to be managed efficiently.
 * 
 * @constant {mysql.Pool} 
 * @see https://www.npmjs.com/package/mysql2#pooling-connections
 */
export const connection = mysql.createPool({  // production
  uri: config.DBUrl,
  waitForConnections: true,
  connectionLimit: 10,
  timezone: 'Z'
})
  
