<?
// @var boolean $session_is_working
$session_is_working = match (session_status()) {
  PHP_SESSION_DISABLED => false,
  PHP_SESSION_NONE => @session_start(),
  PHP_SESSION_ACTIVE => true
};

if (! $session_is_working) {
  header("Location: session_failed.html");
  die("Session failed to start");
}

// Unset all of the session variables
$_SESSION = [];

// Delete the session cookie.
// Note: This will destroy the session, and not just the session data!
// It's crucial for security.
if (ini_get("session.use_cookies")) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000,
        $params["path"], $params["domain"],
        $params["secure"], $params["httponly"]
    );
}

// Finally, destroy the session itself.
session_destroy();

// Redirect the user to the login page (or a public welcome page)
header('Location: /index.php');
exit;
