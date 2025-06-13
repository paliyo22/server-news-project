import { connection } from "../db/mysql";
import mysql, { type ResultSetHeader } from 'mysql2/promise'

async function checkMySQLConnection(): Promise<void> {
  try {
    await connection.query(
        `CREATE TABLE role(
            id int auto_increment primary key,
            name varchar(50) not null unique
        );`
    );

    await connection.query(
        `create table genre(
            id int auto_increment primary key,
            name varchar(50) not null unique
        );`
    );


    await connection.query(
        `create table news(
            id binary(16) primary key default(uuid_to_bin(uuid())),
            created timestamp not null,
            title varchar(250) not null,
            snippet text not null,
            thumbnail varchar(500),
            thumbnail_proxied varchar(500),
            image_url varchar(500),
            subnews binary(16),
            has_subnews boolean default false,
            news_url varchar(500) not null unique,
            publisher varchar(100) not null,
            is_active boolean default true,
            news_genre int not null,
            foreign key (subnews) references news(id) on delete set null,
            foreign key (news_genre) references genre(id)
        );`
    );

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

    await connection.query(
        `CREATE TABLE likes_x_news (
            user_id BINARY(16) NOT NULL,
            news_id BINARY(16) NOT NULL,
            PRIMARY KEY (user_id, news_id),
            FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
            FOREIGN KEY (news_id) REFERENCES news(id) ON DELETE CASCADE
        );`
    );

    await connection.query(
        `create table likes_x_comment(
            user_id BINARY(16) NOT NULL,
            comment_id BINARY(16) NOT NULL,
            PRIMARY KEY (user_id, comment_id),
            FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
            FOREIGN KEY (comment_id) REFERENCES comment(id) ON DELETE CASCADE
        );`
    );

    await connection.query(
        `CREATE TABLE last_pull (
            id TINYINT PRIMARY KEY DEFAULT 1,
            fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );`
    );

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

    await connection.query(
        `INSERT INTO role (id, name) VALUES
            ( 1, 'user'),
            ( 2, 'admin');`
    );

    console.log('✅ Tablas creadas correctamente.');
  } catch (error) {
    console.log(error);
    console.error('❌ Error al conectar con MySQL:', error);
  }
}

const DEFAULT_CONFIG={ //esto se manda a config despues
    //se borro luego de ejecutarse.
}

const LocalConnection = await mysql.createConnection(DEFAULT_CONFIG); 

async function transferData(): Promise<void> {
  try {
    // 1. Leer todos los registros de la base local
    const [rows] = await LocalConnection.query(`SELECT * FROM news;`) as [any[], any];

    if (!rows.length) {
      console.log('No hay registros para migrar.');
      return;
    }

    console.log(`Migrando ${rows.length} registros...`);

    // 2. Preparar la query de inserción (evita problemas con columnas)
    const insertQuery = `
      INSERT INTO news (
        id, created, title, snippet, thumbnail, thumbnail_proxied,
        image_url, subnews, has_subnews, news_url, publisher,
        is_active, news_genre
      ) VALUES ?`;

    // 3. Mapear los datos a un array de arrays
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

    // 4. Insertar todos los registros en lote
    const [result] = await connection.query(insertQuery, [values]) as [ResultSetHeader, any];

    console.log(`✅ Migración completada: ${result.affectedRows} registros insertados.`);
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
  }
}



