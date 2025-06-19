PRAGMA foreign_keys = ON;

CREATE TABLE users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_name TEXT NOT NULL UNIQUE,
    user_password_hash TEXT NOT NULL,
    user_created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    user_email TEXT
);

CREATE TABLE tasks (
    task_id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_title TEXT NOT NULL,
    task_description TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    task_completed INTEGER DEFAULT 0,

    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE boards (
  board_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  board_name TEXT

  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE cells (
   task_id INTEGER NOT NULL,
  board_id INTEGER NOT NULL,
  cell_row INTEGER NOT NULL,
  cell_col INTEGER NOT NULL,

  PRIMARY KEY (board_id, cell_row, cell_col),

  FOREIGN KEY (board_id) REFERENCES boards(board_id) ON DELETE CASCADE,
  FOREIGN KEY (task_id) REFERENCES tasks(task_id) ON DELETE CASCADE
);
