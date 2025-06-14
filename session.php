<?
final class Session {
  public static string $failure_redirect = 'session_failed.html';

  /**
   * Activates session and redirects onto $failure_redirect page
   */
  public static function activate(): void {
    if (! self::isActive() ) {
      session_start();
    }
    if (! self::isActive() ) {
      self::redirect();
    }
  }

  /**
   * Destroys current session entirely with associated cookies.
   */
  public static function destroyWithCookies(): bool {
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

  /**
   * Shorthand for $_SESSION[$key] ?? $default. 
   * Which returns null when default is not specified.
   */
  public static function read(string $key, mixed $default = null) : mixed {
    return $_SESSION[$key] ?? $default; 
  }

  /**
   * Checks if session is active/inaccessible right now.
   */
  public static function isActive(): bool {
    return match (session_status()) {
      PHP_SESSION_DISABLED => false,
      PHP_SESSION_NONE => false,
      PHP_SESSION_ACTIVE => true
    };
  }

  public static function redirect(): void {
    if (headers_sent()) {
      error_log("SESSION[1] : Session inactive \n" . 
                "SESSION[2] : Redirect failed, headers sent");
    } else {
      header("Location: " . self::$failure_redirect);
      error_log("SESSION[1] : Session is inactive");
    }  
    die(1);
  }
}

// configure 
Session::activate();
