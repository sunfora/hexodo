<?
require_once "session.php";
// @var ContextDB $db
$db_operations = require_once "db.php";
// @var PDO $db
$db = $db_operations->db;

const START_PAGE = '/';
const FORM_PAGE = '/account';

/**
 * Clear all the crap from previous attemps of login.
 * Populate SESSION fields
 */
unset($_SESSION['form_errors']);
unset($_SESSION['form_input']);

$username = trim($_POST['username'] ?? '');
$password = trim($_POST['password'] ?? '');

$_SESSION['form_input'] = [ 'username' => $username ];

/**
 * Redirects to START_PAGE or to FORM_PAGE if conditions are met.
 */ 
function redirect() {
  if (Session::read('logged_in', false)) {
    header('Location: ' . START_PAGE);
    die;
  }
  if (!empty(Session::read('form_errors', []))) {
    header('Location: ' . FORM_PAGE);
    die;
  }
}

/**
 * Here I do some validation logic.
 */
if (empty($username)) {
  $_SESSION['form_errors'][] = "username should not be empty";
}
if (empty($password)) {
  $_SESSION['form_errors'][] = "password should not be empty";
} else if (strlen($password) < 8) {
  $_SESSION['form_errors'][] = "password is too short";
}

// fast-fail after validation
redirect();

/**
 * Now we need to authorize the user.
 * But since auth and registration is combined here.
 * We'll do it in a huge transaction.
 *
 * summary: 
 *   check if user exists
 *   if not create him
 *   if is - check his password
 *   populate $_SESSION
 *   redirect
 */
try {
  $db->beginTransaction();

  // search user account and retrieve hash
  $phash_stmt = $db->prepare( 
    <<<SQL
      SELECT user_password_hash FROM users WHERE
        user_name = :username
    SQL
  );
  $phash_stmt->execute(
    ['username' => $username]
  );

  // @var string|false $password_hash
  $password_hash = $phash_stmt->fetchColumn();

  // if user does not exist we should create him
  if (!$password_hash) {
    $password_hash = password_hash($password, PASSWORD_DEFAULT);

    $create_user_stmt = $db->prepare(
      <<<SQL
        INSERT INTO users (user_name, user_password_hash) VALUES
          (:user_name, :user_password_hash)
      SQL
    );
    $create_user_stmt->execute([
      'user_name' => $username,
      'user_password_hash' => $password_hash
    ]);
  }

  // now user must exist
  // verify his password
  if (password_verify($password, $password_hash)) {
    // matches let him go
    $_SESSION['logged_in'] = true;
    $_SESSION['username'] = $username;
    session_regenerate_id(true);
  } else {
    $_SESSION['form_errors'][] = 'invalid password';
  }
  $db->commit();
} catch (\PDOException $e) {
  error_log("AUTH[1] : " . $e->getMessage());
} catch (\Throwable $e) {
  error_log("AUTH[1] : " . $e->getMessage());
  if ($db->inTransaction()) {
    $db->rollBack();
    $_SESSION['form_errors'][] = "Transaction failed.";
  }
}
redirect();
