<?
$pdo = new PDO("sqlite:db/tokoharu.db");
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

class ContextDB {
  public function __construct(public \PDO $db) {}
  
  /**
   * Run custom database operation with bindings ($this->db)
   * @param $callback Database operation to run.
   */
  public function run(Closure $callback): mixed {
      // 1. Bind the closure
      //    - First argument ($this): This is the object the closure's $this will refer to.
      //      We want it to be the *current* DBContext instance.
      //    - Second argument ($this): This is the scope. By passing the object itself,
      //      the closure gains access to private/protected members (like $this->db).
      $boundCallback = $callback->bindTo($this, $this);

      // 2. Error handling if binding failed (e.g., if a static closure was passed)
      if ($boundCallback === false) { // bindTo returns false on failure
        throw new LogicException("Could not bind the closure. Ensure it's not a static closure if you intend to use \$this inside it.");
      }

      // 3. Execute the bound closure
      return $boundCallback();
  }
  
  /**
   * Create new board in database.
   * @param $user_id Id of the user new board will be bound 
   * @param $board_name Name of the board to be assigned.
   * @return array Newly created board (if success).
   */
  public function create_board(string $user_id, string $board_name): array {
    $db = $this->db;
    $insert_board = $db->prepare(
      <<<SQL
        INSERT INTO boards (user_id, board_name) VALUES
          (:user_id, :board_name)
      SQL
    );
    $insert_board->execute([
      'board_name' => $board_name,
      'user_id' => $user_id
    ]);
    $board_id = $db->lastInsertId();
    return [
      'board_name' => $board_name,
      'user_id' => $user_id,
      'board_id' => $board_id
    ];
  }

  /**
   * Retrieve board by id.
   * @param $board_id Id of the board.
   * @return array Board information.
   */
  public function find_board(int $board_id): array {
    $db = $this->db;
    $select_board = $db->prepare(
      <<<SQL
        SELECT board_id, user_id, board_name FROM boards
          WHERE board_id = :board_id
      SQL
    );
    $select_board->execute([
      'board_id' => $board_id
    ]);
    $board = $select_board->fetch(PDO::FETCH_ASSOC);
    return $board;
  }
}

return new ContextDB($pdo);
