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

/**
 * Builds the pool options depending on whether a full DB_URL is provided
 * (production / remote DB) or individual connection params are used (Docker / local dev).
 */
const poolOptions: mysql.PoolOptions = config.DBUrl
  ? {
      uri: config.DBUrl,
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
      timezone: 'Z',
    }
  : {
      host: config.DBHost,
      user: config.DBUser,
      port: config.DBPort,
      password: config.DBPassword,
      database: config.DBName,
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
      timezone: 'Z',
    };

/**
 * MySQL connection pool.
 * Uses DB_URL when available (production), otherwise falls back to individual
 * connection parameters (local / Docker development).
 * 
 * @constant {mysql.Pool} 
 * @see https://www.npmjs.com/package/mysql2#pooling-connections
 */
export const connection = mysql.createPool(poolOptions)



