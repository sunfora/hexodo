<?
// @var ContextDB $db
$db_operations = require_once "db.php";
// @var PDO $db
$db = $db_operations->db;

header("Content-Type: application/json");
$cell_row = (int) $_GET['row'];
$cell_col = (int) $_GET['col'];
$board_id = (int) $_GET['board_id'];

$task_description = $_POST['task_description'];
$task_title = $_POST['task_title'];
$user_id = $_POST['user_id'];

$task_id = $_POST['task_id'];
if ($task_id === 'null') {
  $task_id = null;
} else {
  $task_id = (int) $task_id;
}

$task_completed = $_POST['task_completed'];
if ($task_completed === 'true') {
  $task_completed = true;
} else {
  $task_completed = false;
}

try {
  $db->beginTransaction();
  if ($task_id !== null) {
    error_log("task_id: $task_id");
    error_log("task_title: $task_title");
    error_log("task_description: $task_description");
    $cmp = ($task_completed)? 'true' : 'false';
    error_log("task_completed: $cmp");
    $update_task_content = $db->prepare(
      <<<SQL
        UPDATE tasks
          SET task_title = :task_title,
              task_description = :task_description,
              task_completed = :task_completed
          WHERE task_id = :task_id
      SQL
    );
    $update_task_content->execute([
      'task_id' => $task_id,
      'task_title' => $task_title,
      'task_description' => $task_description,
      'task_completed' => $task_completed
    ]);
  } else {
    $insert_task = $db->prepare(
      <<<SQL
        INSERT INTO tasks (task_title, task_description, task_completed, user_id)
          VALUES (:task_title, :task_description, :task_completed, :user_id)
      SQL
    );
    $insert_task->execute([
      'task_title' => $task_title,
      'task_description' => $task_description,
      'task_completed' => $task_completed,
      'user_id' => $user_id
    ]);

    $task_id = $db->lastInsertId();

    $insert_cell = $db->prepare(
      <<<SQL
        INSERT INTO cells (task_id, cell_row, cell_col, board_id)
          VALUES (:task_id, :cell_row, :cell_col, :board_id)
      SQL
    );
    $insert_cell->execute([
      'task_id' => $task_id,
      'cell_row' => $cell_row,
      'cell_col' => $cell_col,
      'board_id' => $board_id
    ]);
  }

  $select_card_data = $db->prepare(
    <<<SQL
      SELECT task_id, task_title, task_description, user_id, task_completed FROM tasks
        WHERE task_id = :task_id
    SQL
  );

  $select_card_data->execute(['task_id' => $task_id]);

  $card = $select_card_data->fetch(PDO::FETCH_ASSOC);
  $card['task_completed'] = (bool) $card['task_completed'];

  $db->commit();

  http_response_code(200);
  echo json_encode($card);
} catch (\PDOException $e) {
  error_log("task.php : {$e->getMessage()}");
  if ($db->inTransaction()) {
    $db->rollBack();
  }
  http_response_code(500);
  echo json_encode(["message" => "database failure"]);
} catch (\Throwable $e) {
  error_log("task.php : unexpected error {$e->getMessage()}");
  if ($db->inTransaction()) {
    $db->rollBack();
  }
  http_response_code(500);
  echo json_encode(["message" => "unexpected internal failure"]);
}

