ALTER TABLE tasks ADD task_state    INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tasks ADD task_energy   INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tasks ADD task_disabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tasks ADD task_type     INTEGER NOT NULL DEFAULT 0;

UPDATE tasks SET task_state = CASE 
  WHEN task_completed = 1 THEN 1
  ELSE 0
END;

UPDATE tasks SET task_energy = CASE 
  WHEN task_completed = 1 THEN 1
  ELSE 0
END;

ALTER TABLE tasks DROP COLUMN task_completed;
