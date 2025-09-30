<?
ini_set('display_errors', 'Off');         // <-- IMPORTANT: Do NOT display errors on screen
ini_set('display_startup_errors', 'Off'); // <-- IMPORTANT: Do NOT display startup errors on screen
error_reporting(E_ALL);                   // Report all types of errors

// Enable logging of errors
ini_set('log_errors', 'On');

// Set error_log to an empty string so PHP logs to the SAPI logger (your terminal for dev server)
ini_set('error_log', '');

require_once "http_page.php";
// Get the requested URI
$requestUri = $_SERVER['REQUEST_URI'];
$method = $_SERVER['REQUEST_METHOD'];

function require_method(array $required_methods) {
  $actual_method = $_SERVER['REQUEST_METHOD'];
  if (!in_array($actual_method, $required_methods)) {
      // Send a 405 Method Not Allowed response
      http_response_code(405);
      $required_string = implode(', ', array_map('htmlspecialchars', $required_methods));
      $actual_method = htmlspecialchars($actual_method);
      header("Allow: $required_string");
      make_page("405: Method Not Allowed", "Use {$required_string} instead of {$actual_method}");
      die;
  }
}

// Remove query string if any
$requestUri = strtok($requestUri, '?');

if ($requestUri === '/') {
    require_method(["GET"]);
    require 'index.php';
    exit;
}

if ($requestUri === '/account') {
  require_method(["GET"]);
  require 'account.php';
  exit;
}

if ($requestUri === '/api/logout') {
  require_method(["POST"]);
  require 'api/logout.php';
  exit;
}
if ($requestUri === '/api/login') {
  require_method(["POST"]);
  require 'api/login.php';
  exit;
}

if ($requestUri === '/api/boards') {
  require_method(["POST"]);
  require 'api/create_board.php';
  exit;
}

if (preg_match('#^/api/boards/(\d+)$#', $requestUri, $matches)) {
  require_method(["GET"]);
  $_GET['board_id'] = (int) $matches[1];
  require 'api/get_board_info.php';
  exit;
}

if (preg_match('#^/api/boards/(\d+)/cells$#', $requestUri, $matches)) {
  require_method(["GET", "POST", "DELETE"]);
  $_GET['board_id'] = (int) $matches[1];
  if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    require 'api/get_cell_info.php';
  } else if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    require 'api/write_cell_info.php';
  } else {
    require 'api/delete_from_cell.php';
  }
  exit;
}

if (preg_match('#^/api/boards/(\d+)/chunks$#', $requestUri, $matches)) {
  require_method(["GET"]);
  $_GET['board_id'] = (int) $matches[1];
  require 'api/get_chunk.php';
  exit;
}

// tasks
if (preg_match('#^/api/card/(\d+)$#', $requestUri, $matches)) {
    // Extract the task_id
    require_method(["GET"]);
    $_GET['task_id'] = (int) $matches[1];
    require 'api/card.php';
    exit;
}

if (preg_match('#^/components/(.*)\.js$#', $requestUri, $matches)) {
    require_method(["GET"]);
    $dir = dirname($requestUri);
    $component = $matches[1];
    require ".$dir/$component/.serve.php";
    exit;
}

// If no route matches, serve the requested file if it exists,
// otherwise return a 404.
$filePath = __DIR__ . $requestUri;

// Check if the file actually exists on the filesystem
if (file_exists($filePath) && is_file($filePath)) {
  require_method(["GET"]);
  if (str_ends_with($filePath, ".php")) {
    ?>
      <h1><?= htmlspecialchars($filePath) ?> </h1>
      <pre><code><?= htmlspecialchars(file_get_contents($filePath), ENT_HTML5, 'UTF-8');?></code></pre>
    <?
    die;
  }
  // otherwise serve as normal content
  return false;
}

// If nothing matches, return a 404
http_response_code(404);
echo '<h1>404 Not Found</h1>';
echo '<p>The requested URL ' . htmlspecialchars($requestUri) . ' was not found on this server.</p>';

?>
