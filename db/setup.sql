CREATE TABLE sessions (
  session_id varchar(50) PRIMARY KEY,
  user       varchar(50)
);

CREATE TABLE auth (
  user      varchar(50) PRIMARY KEY,
  salt      varchar(50),
  hash      varchar(50)
);
