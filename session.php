<?
final class Session {
  public string $failure_redirect = 'session_failed.html';

  public function __construct() {
    if (! $this->isActive() ) {
      $this->start();
    }
    if (! $this->isActive() ) {
      $this->redirect();
    }
  }

  public function start(): bool {
    return session_start();
  }

  public function destroy(): bool {
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
    return session_destroy();
  }

  public function get(string $key, mixed $default = null) : mixed {
    return $_SESSION[$key] ?? $default; 
  }

  public function set(string $key, mixed $value) : void {
   $_SESSION[$key] = $value; 
  }

  public function isActive(): bool {
    return match (session_status()) {
      PHP_SESSION_DISABLED => false,
      PHP_SESSION_NONE => false,
      PHP_SESSION_ACTIVE => true
    };
  }

  public function redirect(): void {
    if (headers_sent()) {
      error_log("SESSION[1] : Session inactive \n" . 
                "SESSION[2] : Redirect failed, headers sent");
    } else {
      header("Location: " . $this->failure_redirect);
      error_log("SESSION[1] : Session is inactive");
    }  
    die(1);
  }
}

return new Session();
