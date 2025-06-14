<?
require_once "session.php";
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    // Send a 405 Method Not Allowed response
    http_response_code(405);
    header('Allow: POST');  
?>  
    <h1> 405 : Method Not Allowed </h1>
    <p>
      Use POST instead of <?= htmlspecialchars($_SERVER['REQUEST_METHOD']) ?>
    </p>
<?
    exit(); // Terminate script execution
}
if (Session::destroyWithCookies()) {
  // Redirect the user to the login page (or a public welcome page)
  header('Location: /');
  die;
} else {
  error_log("SESSION[1] : failed to destroy");
  http_response_code(500);
?>  
    <h1> 500 : Internal failure </h1>
    <p>
      Failed to logout. Try again later.
    </p>
<?
  die(1);
}
