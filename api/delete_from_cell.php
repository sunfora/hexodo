<?
// @var ContextDB $db
$db_operations = require_once "db.php";
// @var PDO $db
$db = $db_operations->db;

$cell_row = (int) $_GET['row'];
$cell_col = (int) $_GET['col'];
$board_id = (int) $_GET['board_id'];

try {
  $delete_cell = $db->prepare(
    <<<SQL
      DELETE FROM cells
        WHERE cell_row = :cell_row 
          AND cell_col = :cell_col
          AND board_id = :board_id
    SQL
  );
  $delete_cell->execute([
    'cell_row' => $cell_row,
    'cell_col' => $cell_col,
    'board_id' => $board_id
  ]);
  http_response_code(204);
} catch (\PDOException $e) {
  header("Content-Type: application/json");
  error_log("task.php : {$e->getMessage()}");
  http_response_code(500);
  echo json_encode(["message" => "database failure"]);
} catch (\Throwable $e) {
  header("Content-Type: application/json");
  error_log("task.php : unexpected error {$e->getMessage()}");
  http_response_code(500);
  echo json_encode(["message" => "unexpected internal failure"]);
}
