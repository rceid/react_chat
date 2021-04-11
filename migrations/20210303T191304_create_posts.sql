-- sudo mysql -u reid7 -p < migrations/20210303T191304_create_posts.sql

use reid7;

create table if not exists channels (
    channel_id INT AUTO_INCREMENT,
    channel_name VARCHAR(40) UNIQUE,
    creator VARCHAR(40),
    PRIMARY KEY (channel_id),
    CONSTRAINT FOREIGN KEY(creator) REFERENCES users(username)
);

create table if not exists last_viewed (
  username VARCHAR(40), 
  channel_id INT,
  last_read INT DEFAULT 0,
  CONSTRAINT FOREIGN KEY(username) REFERENCES users(username),
  CONSTRAINT FOREIGN KEY(channel_id) REFERENCES channels(channel_id)
);


create table if not exists messages (
  message_id INT AUTO_INCREMENT PRIMARY KEY, 
  reply_to INT DEFAULT NULL,
  channel_id INT,
  author VARCHAR(40), 
  body TEXT,
  CONSTRAINT FOREIGN KEY(author) REFERENCES users(username),
  CONSTRAINT FOREIGN KEY(channel_id) REFERENCES channels(channel_id)
);
