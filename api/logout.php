<?
require_once "session.php";
require_once "http_page.php";
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    // Send a 405 Method Not Allowed response
    http_response_code(405);
    header('Allow: POST');  
    $method = htmlspecialchars($_SERVER['REQUEST_METHOD']);
    make_page("405 : Method Not Allowed", "Use POST instead of {$method}");
    die;
}
if (Session::destroyWithCookies()) {
  // Redirect the user to the login page (or a public welcome page)
  header('Location: /');
} else {
  error_log("SESSION[1] : failed to destroy");
  http_response_code(500);
  make_page("500 : Internal failure", "Failed to logout. Try again later.");
}
