<?
// @var PDO $db
$db = require_once "db.php";

header("Content-Type: application/json");
$task_id = $_GET['task_id'];

try {
  $db->beginTransaction();
  
  $select_card_data = $db->prepare(
    <<<SQL
      SELECT id, title, description, user_id, completed FROM tasks
        WHERE id = :task_id
    SQL
  );
  $select_parents = $db->prepare(
    <<<SQL
      SELECT depends_on_task_id FROM depends_on
        WHERE task_id = :task_id
    SQL
  );
  $select_children = $db->prepare(
    <<<SQL
      SELECT task_id FROM depends_on
        WHERE depends_on_task_id = :task_id
    SQL
  );

  $select_parents->execute(['task_id' => $task_id]);
  $select_children->execute(['task_id' => $task_id]);
  $select_card_data->execute(['task_id' => $task_id]);

  $parents = $select_parents->fetchAll(PDO::FETCH_COLUMN);
  $children = $select_children->fetchAll(PDO::FETCH_COLUMN);
  $card = $select_card_data->fetch(PDO::FETCH_ASSOC);

  $db->commit();

  $card['completed'] = (bool) $card['completed'];

  http_response_code(200);
  echo json_encode([
    "card" => $card,
    "depends_on" => $parents,
    "provides" => $children
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
