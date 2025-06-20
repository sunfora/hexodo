<?
// @var ContextDB $db
$db_operations = require_once "db.php";
// @var PDO $db
$db = $db_operations->db;

header("Content-Type: application/json");
$cell_row =   (int) $_GET['row'];
$cell_col =   (int) $_GET['col'];
$board_id = (int) $_GET['board_id'];

try {
  $db->beginTransaction();

  $find_card_id = $db->prepare(
    <<<SQL
      SELECT task_id FROM cells
        WHERE cell_row = :cell_row AND cell_col = :cell_col AND board_id = :board_id
    SQL
  );
  $find_card_id->execute([
    'cell_row' => $cell_row,
    'cell_col' => $cell_col,
    'board_id' => $board_id
  ]);

  $task_id = $find_card_id->fetchColumn();
  
  if ($task_id !== false) {
    $select_card_data = $db->prepare(
      <<<SQL
        SELECT task_id, task_title, task_description, user_id, task_completed FROM tasks
          WHERE task_id = :task_id
      SQL
    );

    $select_card_data->execute(['task_id' => $task_id]);

    $card = $select_card_data->fetch(PDO::FETCH_ASSOC);
    $card['task_completed'] = (bool) $card['task_completed'];
  } else {
    $card = null;
  }

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
