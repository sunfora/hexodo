<?
// @var ContextDB $db_operations
$db_operations = require_once "db.php";
// @var PDO $db
$db = $db_operations->db;

header("Content-Type: application/json");
$user_id    = (int) $_POST['user_id'];
$board_name =       $_POST['board_name'] ?? 'new board';

try {
  $board = $db_operations->create_board($user_id, $board_name, $db);
  // Resource created
  http_response_code(201);
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
