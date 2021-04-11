-- sudo mysql -u reid7 -p < migrations/20210301T191156_create_db_users.sql

create database if not exists reid7 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

use reid7;

create table if not exists users (
  email VARCHAR(40) PRIMARY KEY, 
  username VARCHAR(40) UNIQUE KEY,
  password VARCHAR(100)
);
