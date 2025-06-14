<?
// Get the requested URI
$requestUri = $_SERVER['REQUEST_URI'];

// Remove query string if any
$requestUri = strtok($requestUri, '?');

if ($requestUri === '/') {
    require 'index.php';
    exit;
}

if ($requestUri === '/account') {
  require 'account.php';
  exit;
}

if ($requestUri === '/api/logout') {
  require 'api/logout.php';
  exit;
}
if ($requestUri === '/api/login') {
  require 'api/login.php';
  exit;
}


// tasks
if (preg_match('/^\/tasks\/(\d+)$/', $requestUri, $matches)) {
    // Extract the task_id
    $_GET['task_id'] = $matches[1];
    require 'get_task.php';
    exit; // Stop further execution
}

// If no route matches, serve the requested file if it exists,
// otherwise return a 404.
$filePath = __DIR__ . $requestUri;

// Check if the file actually exists on the filesystem
if (file_exists($filePath) && is_file($filePath)) {
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
