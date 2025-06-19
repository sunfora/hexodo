<?
// @var PDO $db
$db = require_once "db.php";

header("Content-Type: application/json");
$row =   (int) $_GET['row'];
$col =   (int) $_GET['col'];
$board = (int) $_GET['board'];

try {
  $db->beginTransaction();

  $find_card_id = $db->prepare(
    <<<SQL
      SELECT task_id FROM boards
        WHERE row = :row AND col = :col AND board_id = :board
    SQL
  );
  $find_card_id->execute([
    'row' => $row,
    'col' => $col,
    'board' => $board
  ]);
  $task_id = $find_card_id->fetchColumn();
  
  if ($task_id !== false) {
    $select_card_data = $db->prepare(
      <<<SQL
        SELECT id, title, description, user_id, completed FROM tasks
          WHERE id = :task_id
      SQL
    );

    $select_card_data->execute(['task_id' => $task_id]);

    $card = $select_card_data->fetch(PDO::FETCH_ASSOC);
    $card['completed'] = (bool) $card['completed'];
  } else {
    $card = null;
  }

  $db->commit();

  http_response_code(200);
  echo json_encode([
    "card" => $card,
    "board" => $board,
    "row" => $row,
    "col" => $col
  ]);

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
