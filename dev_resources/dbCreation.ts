import mysql, { type ResultSetHeader } from 'mysql2/promise'
import config from '../config';

const DEFAULT_CONFIG_A={ 
  host: '',
  user: '',
  port: 3306,
  password: '',
  database: ''
}


export const connection = mysql.createPool({  // production
  uri: config.DBUrl,
  waitForConnections: true,
  connectionLimit: 10,
  timezone: 'Z'
})

/**
 * Function to check and create necessary tables in the MySQL database.
 * This function creates several tables related to roles, genres, news, users, comments, and likes.
 * It also inserts default data into the genre and role tables.
 * 
 * @returns {Promise<void>} - A promise that indicates if the tables were successfully created.
 */
async function checkMySQLConnection(): Promise<void> {
  try {
    // Create the "role" table to store user roles
    await connection.query(
        `CREATE TABLE role(
            id int auto_increment primary key,
            name varchar(50) not null unique
        );`
    );

    // Create the "genre" table to store news genres
    await connection.query(
        `create table genre(
            id int auto_increment primary key,
            name varchar(50) not null unique
        );`
    );

    // Create the "news" table to store news items
    await connection.query(
        `create table news(
            id binary(16) primary key default(uuid_to_bin(uuid())),
            created timestamp not null,
            title varchar(250) not null,
            snippet text not null,
            thumbnail varchar(500),
            thumbnail_proxied varchar(500),
            image_url varchar(500),
            has_subnews boolean default false,
            news_url varchar(500) not null unique,
            publisher varchar(100) not null,
            is_active boolean default true,
            news_genre int not null,
            foreign key (subnews) references news(id) on delete set null,
            foreign key (news_genre) references genre(id)
        );`
    );

    // Create the "user" table to store user information
    await connection.query(
        `create table user(
            id binary(16) primary key default(uuid_to_bin(uuid())),
            user_name varchar(50) not null,
            lastname varchar(50) not null,
            birthday date not null,
            username varchar(50) not null unique,
            email varchar(100) unique not null,
            password varchar(100) not null,
            subscription boolean default false not null,
            user_role int not null,
            is_active boolean default true,
            created timestamp default current_timestamp,
            refresh_token varchar(600),
            foreign key (user_role) references role(id)
        );`
    );

    // Create the "comment" table to store comments for news items
    await connection.query(
        `create table comment(
            id binary(16) primary key default(uuid_to_bin(uuid())),
            news_id binary(16) not null,
            user_id binary(16) not null,
            parent_comment_id binary(16),
            content text,
            created timestamp default current_timestamp not null,
            is_active boolean default true,
            foreign key (parent_comment_id) references comment(id) on delete cascade,
            foreign key (news_id) references news(id) on delete cascade,
            foreign key (user_id) references user(id) on delete cascade
        );`
    );

    // Create the "likes_x_news" table to store users' likes for news items
    await connection.query(
        `CREATE TABLE likes_x_news (
            user_id BINARY(16) NOT NULL,
            news_id BINARY(16) NOT NULL,
            PRIMARY KEY (user_id, news_id),
            FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
            FOREIGN KEY (news_id) REFERENCES news(id) ON DELETE CASCADE
        );`
    );

    // Create the "likes_x_comment" table to store users' likes for comments
    await connection.query(
        `create table likes_x_comment(
            user_id BINARY(16) NOT NULL,
            comment_id BINARY(16) NOT NULL,
            PRIMARY KEY (user_id, comment_id),
            FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
            FOREIGN KEY (comment_id) REFERENCES comment(id) ON DELETE CASCADE
        );`
    );

    // Create the "last_pull" table to store the timestamp of the last pull
    await connection.query(
        `CREATE TABLE last_pull (
            id TINYINT PRIMARY KEY DEFAULT 1,
            fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );`
    );

    await connection.query(
      `create table news_x_subnews(
        id int auto_increment primary key,
        news_id BINARY(16) NOT NULL,
        subnews_id BINARY(16) NOT NULL,
        FOREIGN KEY (news_id) REFERENCES news(id) ON DELETE CASCADE,
        FOREIGN KEY (subnews_id) REFERENCES news(id),
        CONSTRAINT chk_subnews_unique CHECK (news_id <> subnews_id)
      );`
    )

    // Insert default data into the genre table
    await connection.query(
        `INSERT INTO genre (id, name) VALUES
            ( 1, 'entertainment'),
            ( 2, 'world'),
            ( 3, 'business'),
            ( 4, 'health'),
            ( 5, 'sport'),
            ( 6, 'science'),
            ( 7, 'technology');`
    );

    // Insert default data into the role table
    await connection.query(
        `INSERT INTO role (id, name) VALUES
            ( 1, 'user'),
            ( 2, 'admin');`
    );
 
    console.log('✅ Conected succesfully. ');
  } catch (error) {
    console.error('❌ Error connecting to MySQL:', error);
  }
}

/**
 * Default configuration for MySQL database connection.
 * This configuration is used to establish an initial connection to the database.
 * 
 * @constant {object} DEFAULT_CONFIG - Default database connection configuration.
 */
const DEFAULT_CONFIG={ 
  host: 'localhost',
  user: 'root',
  port: 3306,
  password: '',
  database: 'newspagedb'
}

const LocalConnection = await mysql.createConnection(DEFAULT_CONFIG); 

/**
 * Function to transfer data from a local database to a remote database.
 * It connects to a local database, selects news records, and inserts them into the remote database.
 * 
 * @returns {Promise<void>} - A promise that indicates if the data migration was successful.
 */
async function transferData(): Promise<void> { //se hace en 3 partes para evitar errores y no crear el codigo
  try {

    const [rows] = await LocalConnection.query(
      `SELECT count(id) FROM news where subnews is null;
      SELECT count(id) FROM news where subnews is not null and has_subnews is true;
      SELECT count(id) FROM news where subnews is not null and has_subnews is false;`
    ) as [any[], any];

    if (!rows.length) {
      console.log('No records to migrate.');
      return;
    }

    console.log(`Migrating records...`);


    const insertQuery = `
      INSERT INTO news (
        id, created, title, snippet, thumbnail, thumbnail_proxied,
        image_url, subnews, has_subnews, news_url, publisher,
        is_active, news_genre
      ) VALUES ?`;


    const values = rows.map(row => [
      row.id,
      row.created,
      row.title,
      row.snippet,
      row.thumbnail || null,
      row.thumbnail_proxied || null,
      row.image_url || null,
      row.subnews || null,
      row.has_subnews,
      row.news_url,
      row.publisher,
      row.is_active,
      row.news_genre,
    ]);


    const [result] = await connection.query(insertQuery, [values]) as [ResultSetHeader, any];

    console.log(`✅ Migration completed: ${result.affectedRows} records inserted.`);
  } catch (error) {
    console.error('❌ Error during migration:', error);
  }
}

const run = async () => {
    try {
      //await checkMySQLConnection();
      //await transferData();
    } catch (e) {
      console.error("Error: NO FUNCA BIEN");
    }finally {
      await connection.end();
      await LocalConnection.end();
    }
};

run();