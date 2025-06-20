<?
// @var ContextDB $db
$db_operations = require_once "db.php";
// @var PDO $db
$db = $db_operations->db;

header("Content-Type: application/json");
$board_id = (int) $_GET['board_id'];

try {
  http_response_code(200);
  $board = $db_operations->find_board($board_id);
  echo json_encode($board);
} catch (\PDOException $e) {
  error_log("task.php : {$e->getMessage()}");
  http_response_code(500);
  echo json_encode(["message" => "database failure"]);
} catch (\Throwable $e) {
  error_log("task.php : unexpected error {$e->getMessage()}");
  http_response_code(500);
  echo json_encode(["message" => "unexpected internal failure"]);
}
