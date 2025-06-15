<?
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


// tasks
if (preg_match('#^/api/card/(\d+)$#', $requestUri, $matches)) {
    // Extract the task_id
    require_method(["GET"]);
    $_GET['task_id'] = (int) $matches[1];
    require 'api/card.php';
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
