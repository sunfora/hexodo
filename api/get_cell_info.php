<?
// @var ContextDB $db
$db_operations = require_once "db.php";
// @var PDO $db
$db = $db_operations->db;

header("Content-Type: application/json");

$cell_row =   (int) $_GET['row'];
$cell_col =   (int) $_GET['col'];
$board_id =   (int) $_GET['board_id'];

try {
  $select_card_data = $db->prepare(
    <<<SQL
      SELECT t.* 
      FROM tasks t
      JOIN cells c ON t.task_id = c.task_id
      WHERE c.cell_row = :cell_row 
        AND c.cell_col = :cell_col 
        AND c.board_id = :board_id
    SQL
  );

  $select_card_data->execute([
    'cell_row' => $cell_row,
    'cell_col' => $cell_col,
    'board_id' => $board_id
  ]);

  $card = $select_card_data->fetch(PDO::FETCH_ASSOC) ?: null;

  http_response_code(200);
  echo json_encode($card);
} catch (\PDOException $e) {
  error_log("task.php : {$e->getMessage()}");
  http_response_code(500);
  echo json_encode(["message" => "database failure"]);
} catch (\Throwable $e) {
  error_log("task.php : unexpected error {$e->getMessage()}");
  http_response_code(500);
  echo json_encode(["message" => "unexpected internal failure"]);
}
