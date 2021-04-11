-- sudo mysql -u reid7 -p < migrations/20210304T121607_session_token.sql
use reid7;
ALTER TABLE users
ADD token_session VARCHAR(10);
ALTER TABLE users
ADD token_expires TIMESTAMP;