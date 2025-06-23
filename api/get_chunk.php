<?
// @var ContextDB $db
$db_operations = require_once "db.php";
// @var PDO $db
$db = $db_operations->db;

header("Content-Type: application/json");
$chunk_row =   (int) $_GET['row'];
$chunk_col =   (int) $_GET['col'];
$board_id  =   (int) $_GET['board_id'];

try {
  $select_cards = $db->prepare(
    <<<SQL
      SELECT c.cell_row, c.cell_col, c.task_id, t.task_completed 
      FROM 
        cells AS c 
      LEFT JOIN 
        tasks AS t
      ON 
        c.task_id = t.task_id
      WHERE c.cell_row >= :chunk_row_start AND 
            c.cell_row <  :chunk_row_end   AND
            c.cell_col >= :chunk_col_start AND
            c.cell_col <  :chunk_col_end   AND
            c.board_id = :board_id
    SQL
  );

  $select_cards->execute([
    'chunk_row_start' => $chunk_row * 10,
    'chunk_row_end' => ($chunk_row + 1) * 10,
    'chunk_col_start' => $chunk_col * 10,
    'chunk_col_end' => ($chunk_col + 1) * 10,
    'board_id' => $board_id
  ]);

  $cards = $select_cards->fetchAll(PDO::FETCH_ASSOC);
  foreach ($cards as &$card) {
    $card['task_completed'] = (bool) $card['task_completed'];
  }
  unset($card);

  http_response_code(200);
  echo json_encode($cards);
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
