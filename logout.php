<?
$session = require_once "session.php";

if ($session->destroy()) {
  // Redirect the user to the login page (or a public welcome page)
  header('Location: /index.php');
  die;
} else {
  error_log("SESSION[1] : failed to destroy");
  die(1);
}
