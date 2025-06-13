# Introduction (English)

I developed a **RESTful API** for managing users, news, and authentication using **Node.js** as the runtime environment and **Express.js** as the framework for creating HTTP routes. The application supports authentication via **JWT (JSON Web Tokens)**, user management with specific roles (such as administrators), and interaction with news through **CRUD operations**. Users can comment on, like, and interact with news articles. Additionally, third-party services like the **Google News API** were integrated to fetch news from various sources and display them on the platform.

---

### **Technologies Used**:

- **Node.js**: JavaScript runtime built on Chrome's V8 engine for server-side development.
- **Express.js**: Web framework for building RESTful APIs and web applications.
- **MySQL2**: Relational database used to store users, news, and comments, powered by MySQL as the DBMS.
- **JWT (JSON Web Tokens)**: For authenticating and authorizing users, securing sessions and role-based access.
- **Axios**: Used for making HTTP requests to external APIs, like Google News API.
- **Bcrypt**: Library for hashing passwords to enhance security.
- **CORS**: Middleware to manage cross-origin requests and control API access.
- **dotenv**: Loads environment variables to manage sensitive configuration like API keys and DB credentials.
- **cookie-parser**: Middleware to handle cookies, mainly for managing authentication tokens.
- **Railway**: Used for deploying the MySQL database in the cloud with scalable configuration.
- **Render**: Deployment service for the API server, offering high availability and scalability.

---

### **Deployment**:

- **Database**: Hosted on Railway, a platform that simplifies cloud-based database creation and management with auto-scaling.
- **Server**: Deployed on Render, a cloud service offering continuous deployment and scalability for Node.js applications.

---

# Backend API - News & User Management (English)

This is a **backend API** built with **Node.js**, **Express**, and **MySQL**, designed to manage news, users, authentication, and comments. It includes routes for user authentication, news handling, role management, and more.

---

## Requirements

Make sure you have the following installed:

- **Node.js**: Version 14 or higher  
- **MySQL**: Or a compatible database service  
- **API Key**: Required for integrations like the Google News API  

---

## Installation

1. **Clone the repository**:  
   `git clone https://github.com/paliyo22/server-news-project.git`

2. **Navigate to the project folder**:  
   `cd mi-proyecto`

3. **Install dependencies**:  
   `bun install`

4. **Configure the .env file**:  
   In the project root, create a `.env` file and add the following:

   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=password
   DB_NAME=my_database
   DB_PORT=3306
   API_KEY=your_api_key
   API_HOST=your_api_host
   SECRET_KEY=your_secret_key
   SECRET_REFRESH_KEY=your_refresh_secret_key
   SALT=10
5. **Start the server**:
    `bun dev`
    The server will run at http://localhost:1234

## Libraries and Key Features

- **Express**  
  - *Function*: Web framework for defining HTTP routes.  
  - *Usage*: Handles HTTP requests and API route definitions.

- **Axios**  
  - *Function*: HTTP client for external API requests.  
  - *Usage*: Fetches news data from third-party sources like Google News API.

- **Valibot**  
  - *Function*: Data validation.  
  - *Usage*: Ensures incoming request data conforms to expected schemas.

- **JWT (JSON Web Token)**  
  - *Function*: User authentication and authorization.  
  - *Usage*: Generates and validates tokens to protect API routes.

- **Bcrypt**  
  - *Function*: Secure password hashing.  
  - *Usage*: Hashes passwords before storage and verifies them during login.

- **CORS**  
  - *Function*: Manages cross-origin request permissions.  
  - *Usage*: Enables access to the API from other domains or origins.

- **MySQL2**  
  - *Function*: MySQL database client.  
  - *Usage*: Performs secure, asynchronous SQL queries with support for prepared statements.

- **dotenv**  
  - *Function*: Loads environment variables from `.env` files.  
  - *Usage*: Handles sensitive configuration like API keys and DB credentials.

- **cookie-parser**  
  - *Function*: Middleware to parse cookies from HTTP requests.  
  - *Usage*: Manages authentication tokens and session data in cookies.

- **Middleware**  
  - *Function*: Intercepts requests for validation and authorization.  
  - *Usage*: Functions like `authenticateToken` and `authorizeAdmin` protect sensitive routes.

---

## API Routes

### `/auth`
- `POST /auth/register`: Register a new user.  
- `POST /auth/login`: Log in an existing user.  
- `POST /auth/logout`: Log out the current user.  
- `POST /auth/refresh`: Generate a new access token.  
- `POST /auth/password`: Change the user password.  
- `POST /auth/role`: Modify user roles (admin only).

### `/user`
- `GET /user`: Get information about the authenticated user.  
- `GET /user/getall`: Retrieve a list of all users (admin only).  
- `PATCH /user/update`: Update user profile information.  
- `POST /user/delete`: Soft-delete a user (deactivate).  
- `DELETE /user/erase`: Permanently delete inactive users (admin + extra password).  
- `GET /user/like/:id`: Check if the user has liked a specific news post.  
- `POST /user/like/:id`: Add a like to a news article.  
- `DELETE /user/like/:id`: Remove a like from a news article.  
- `POST /user/comment/:id`: Add a comment to a news article.  
- `DELETE /user/comment/:id`: Delete a comment from a news article.  
- `GET /user/:id`: Retrieve user info by ID (admin only).

### `/news`
- `GET /news`: Get a list of all news articles.  
- `GET /news/featured`: Get featured or highlighted news.  
- `POST /news/fetch`: Fetch news from an external API (e.g., Google News).  
- `POST /news/:id`: Toggle visibility status of a news article.  
- `DELETE /news/clean`: Delete inactive news entries (admin only).  
- `GET /news/inactive`: Get non-visible news (admin only).  
- `GET /news/newsComment/:id`: Get comments on a news article.  
- `GET /news/replies/:id`: Get replies to a specific comment.  
- `GET /news/category/:category`: Filter news by category.  
- `GET /news/:id`: Get a single news article by ID.

### `/comment`
- *(To be implemented due to an initial design oversight.)*

---

## Project Structure

- `routes/`: Defines all API endpoints related to authentication, users, news, and comments.  
- `models/`: Contains database models for interacting with MySQL (users, news, comments, etc.).  
- `controllers/`: Handles the logic for each route and communicates with the database layer.  
- `middlewares/`: Includes middleware for input validation, token verification, and role protection.   
- `schemas/` : Defines validation schemas for incoming data using Valibot to ensure payload integrity.
- `interfaces` : Contains TypeScript interfaces and types used throughout the app for consistency and type safety.
- `enum/`: Defines application-wide enumerations, such as user roles and news categories.  
- `db/` : Establishes the connection to the MySQL database using configuration values from `.env`.
- `dbStructure/` : Contains the SQL scripts or models that define the structure of the MySQL database (tables, relations, constraints). 
- `config.ts`: Holds global configuration (e.g., secret keys, database settings, API host).  
- `services/`: Contains utility and service-level functions (e.g., for delay functions, external API calls, and URL transformations).
- `tests/`: Includes Firebase migration scripts, experimental/tested functions before integration, and mock data used for unit testing and development validation.


---

## Key Features

### Authentication & Authorization
The system uses JWT tokens stored in cookies for session management.  
Users can register, log in, and use access tokens in headers to access protected routes. Admin-only actions are protected by middleware.

### News Management
Admins can fetch external news (e.g., Google News API), store them in the database, and toggle their visibility.  
News can be filtered, featured, and managed through secure API routes.

### Comment System
Users can add, delete, and retrieve comments related to news articles.  
Each comment is linked to a specific article and can have replies from other users.

### Likes System
Users can "like" news posts.  
Likes are stored per user-news pair and impact content ranking or visibility.



# Introducción (Español)

Desarrollé una **API RESTful** para la gestión de usuarios, noticias y autenticación utilizando **Node.js** como entorno de ejecución y **Express.js** como framework para la creación de rutas HTTP.  
La aplicación admite autenticación mediante **JWT (JSON Web Tokens)**, gestión de usuarios con roles específicos (como administradores) e interacción con noticias a través de operaciones **CRUD**.  
Los usuarios pueden comentar, dar "like" e interactuar con las noticias. Además, se integró la **API de Google News** para obtener noticias de múltiples fuentes y mostrarlas en la plataforma.

---

### **Tecnologías Utilizadas**:

- **Node.js**: Entorno de ejecución JavaScript basado en el motor V8 de Chrome.
- **Express.js**: Framework web para construir APIs RESTful.
- **MySQL2**: Cliente de base de datos para MySQL, utilizado para almacenar usuarios, noticias y comentarios.
- **JWT (JSON Web Tokens)**: Sistema de autenticación y autorización por medio de tokens.
- **Axios**: Cliente HTTP utilizado para conectar con APIs externas como la de Google News.
- **Bcrypt**: Biblioteca para encriptar contraseñas de forma segura.
- **CORS**: Middleware que permite solicitudes entre distintos orígenes.
- **dotenv**: Manejo de variables de entorno sensibles (como claves de API y datos de la base de datos).
- **cookie-parser**: Middleware para analizar cookies, principalmente usado en la autenticación.
- **Railway**: Plataforma para el despliegue de la base de datos MySQL en la nube.
- **Render**: Servicio de despliegue de servidores Node.js con alta disponibilidad.

---

### **Despliegue**

- **Base de datos**: Alojada en Railway, que permite la creación y escalabilidad automática en la nube.
- **Servidor**: Desplegado en Render, ofreciendo integración continua y escalabilidad para aplicaciones Node.js.

---

# Backend API - Gestión de Noticias y Usuarios (Español)

Esta es una **API backend** construida con **Node.js**, **Express** y **MySQL**, diseñada para gestionar noticias, usuarios, autenticación y comentarios.

---

## Requisitos

Asegúrate de tener instalado lo siguiente:

- **Node.js**: Versión 14 o superior  
- **MySQL**: O un servicio compatible  
- **Clave API**: Para integraciones como la API de Google News  

---

## Instalación

1. **Clona el repositorio**:  
   `git clone https://github.com/paliyo22/server-news-project.git`

2. **Accede al proyecto**:  
   `cd mi-proyecto`

3. **Instala las dependencias**:  
   `bun install`

4. **Crea y configura el archivo `.env` en la raíz del proyecto con las siguientes variables**:

   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=tu_contraseña
   DB_NAME=mi_base_de_datos
   DB_PORT=3306
   API_KEY=tu_clave_api
   API_HOST=host_de_la_api
   SECRET_KEY=clave_secreta
   SECRET_REFRESH_KEY=clave_refresh
   SALT=10

5. **Inicia el servidor**:
    `bun dev`
    El servidor correrá en: http://localhost:1234

---

## Bibliotecas y Funcionalidades Clave

- **Express**  
  - *Función*: Framework para definir y gestionar rutas HTTP.  
  - *Uso*: Manejo de solicitudes HTTP y definición de rutas de la API.

- **Axios**  
  - *Función*: Cliente HTTP para realizar solicitudes a APIs externas.  
  - *Uso*: Obtención de datos desde fuentes como la API de Google News.

- **Valibot**  
  - *Función*: Validación de datos de entrada.  
  - *Uso*: Verifica que la estructura de los datos cumpla con los esquemas definidos.

- **JWT (JSON Web Token)**  
  - *Función*: Autenticación y autorización mediante tokens.  
  - *Uso*: Generación y validación de tokens para proteger rutas y sesiones.

- **Bcrypt**  
  - *Función*: Hashing seguro de contraseñas.  
  - *Uso*: Encripta contraseñas antes de guardarlas y las compara durante el inicio de sesión.

- **CORS**  
  - *Función*: Controla permisos de origen cruzado.  
  - *Uso*: Permite que otros dominios accedan a la API de manera segura.

- **MySQL2**  
  - *Función*: Cliente para interactuar con bases de datos MySQL.  
  - *Uso*: Realiza consultas SQL de forma asíncrona con soporte para sentencias preparadas.

- **dotenv**  
  - *Función*: Carga variables de entorno desde archivos `.env`.  
  - *Uso*: Maneja configuraciones sensibles como claves de API y credenciales de base de datos.

- **cookie-parser**  
  - *Función*: Middleware para leer cookies de las solicitudes HTTP.  
  - *Uso*: Gestiona tokens de autenticación y datos de sesión almacenados en cookies.

- **Middlewares personalizados**  
  - *Función*: Validación de datos y autorización de acceso.  
  - *Uso*: Interceptan solicitudes para proteger rutas y validar roles de usuario.

---

## Estructura del Proyecto

- `routes/`: Define todos los endpoints relacionados con autenticación, usuarios, noticias y comentarios.  
- `models/`: Contiene los modelos para interactuar con la base de datos MySQL (usuarios, noticias, comentarios, etc.).  
- `controllers/`: Implementa la lógica de negocio para cada ruta y se comunica con la capa de base de datos.  
- `middlewares/`: Incluye middleware para validación de entradas, verificación de tokens y protección por roles.  
- `schemas/`: Define esquemas de validación para los datos entrantes utilizando Valibot.  
- `interfaces/`: Contiene interfaces y tipos de TypeScript para mantener consistencia y seguridad en el tipado.  
- `enum/`: Define enumeraciones globales como roles de usuario o categorías de noticias.  
- `db/`: Establece la conexión con la base de datos MySQL utilizando variables del entorno.  
- `dbStructure/`: Contiene los scripts SQL o modelos que definen la estructura de la base de datos (tablas, relaciones, restricciones).  
- `config.ts`: Archivo de configuración global (claves secretas, datos de entorno, host de API, etc.).  
- `services/`: Funciones utilitarias como transformaciones de URLs, llamadas a APIs externas y manejo de delays.  
- `tests/`: Incluye scripts de migración desde Firebase, funciones experimentales y mocks utilizados para pruebas unitarias y validación de funciones.

---

## Rutas de la API

### `/auth`
- `POST /auth/register`: Registro de nuevos usuarios.  
- `POST /auth/login`: Inicio de sesión.  
- `POST /auth/logout`: Cierre de sesión.  
- `POST /auth/refresh`: Genera un nuevo token de acceso.  
- `POST /auth/password`: Cambio de contraseña.  
- `POST /auth/role`: Modificación de roles de usuario (solo administrador).

### `/user`
- `GET /user`: Obtiene la información del usuario autenticado.  
- `GET /user/getall`: Devuelve una lista de todos los usuarios (solo administrador).  
- `PATCH /user/update`: Actualiza la información del perfil.  
- `POST /user/delete`: Desactiva al usuario (soft delete).  
- `DELETE /user/erase`: Elimina usuarios inactivos permanentemente (requiere rol administrador y contraseña adicional).  
- `GET /user/like/:id`: Verifica si el usuario dio "like" a una noticia.  
- `POST /user/like/:id`: Agrega un "like" a una noticia.  
- `DELETE /user/like/:id`: Elimina el "like" de una noticia.  
- `POST /user/comment/:id`: Agrega un comentario a una noticia.  
- `DELETE /user/comment/:id`: Elimina un comentario de una noticia.  
- `GET /user/:id`: Obtiene la información de un usuario por ID (solo administrador).

### `/news`
- `GET /news`: Obtiene todas las noticias.  
- `GET /news/featured`: Obtiene las noticias destacadas.  
- `POST /news/fetch`: Trae noticias desde una API externa (como Google News).  
- `POST /news/:id`: Alterna la visibilidad de una noticia.  
- `DELETE /news/clean`: Elimina noticias inactivas (solo administrador).  
- `GET /news/inactive`: Muestra noticias no visibles (solo administrador).  
- `GET /news/newsComment/:id`: Devuelve los comentarios de una noticia.  
- `GET /news/replies/:id`: Devuelve las respuestas a un comentario.  
- `GET /news/category/:category`: Filtra noticias por categoría.  
- `GET /news/:id`: Obtiene una noticia por ID.

### `/comment`
- *(Pendiente de implementación por un error de diseño inicial.)*

---

## Funcionalidades Principales

### Autenticación y Autorización
El sistema utiliza tokens JWT almacenados en cookies para gestionar sesiones.  
Los usuarios pueden registrarse, iniciar sesión y acceder a rutas protegidas según su rol.  
Acciones de administrador están protegidas por middlewares personalizados.

### Gestión de Noticias
Los administradores pueden importar noticias desde la API de Google News, almacenarlas en la base de datos y alternar su visibilidad.  
Las noticias pueden ser destacadas, filtradas por categoría, y eliminadas si están inactivas.

### Sistema de Comentarios
Los usuarios pueden comentar en noticias, borrar sus comentarios y consultar respuestas a los mismos.

### Sistema de Likes
Los usuarios pueden dar "like" a noticias específicas.  
Estos likes son únicos por usuario y noticia, y pueden ser utilizados para métricas o mejorar la visibilidad del contenido.
