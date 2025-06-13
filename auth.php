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


$pdo = require_once 'db.php';

$start_page = '/index.php';
$login_form_page = '/account.php';

// Clear any previous form errors or input from session
unset($_SESSION['form_errors']);
unset($_SESSION['form_input']);

// --- 2. Retrieve and Sanitize Input ---

$login_identifier = trim($_POST['login'] ?? ''); // This will be email or username
$password = $_POST['password'] ?? '';

// --- 3. Input Validation ---

$errors = [];

function fail_if_errors() {
  global $errors, $login_identifier, $login_form_page;
  if (!empty($errors)) {
    $_SESSION['form_errors'] = $errors;
    $_SESSION['form_input'] = ['login' => $login_identifier];
    header('Location: ' . $login_form_page);
    exit;
  }
}

if (empty($login_identifier)) {
    $errors[] = "Login (email or username) cannot be empty.";
}

// Basic email format check if you expect email
if (!empty($login_identifier) && !filter_var($login_identifier, FILTER_VALIDATE_EMAIL)) {
    // If it's not a valid email, assume it's a username.
    // If you only allow emails, then make this an error:
    // $errors[] = "Please enter a valid email address.";
}

if (empty($password)) {
    $errors[] = "Password cannot be empty.";
} elseif (strlen($password) < 8) { // Basic password length check for new registrations
    // This will apply to registration only, but caught early here.
    $errors[] = "Password must be at least 8 characters long.";
}

// If there are immediate validation errors, redirect back
fail_if_errors();

// --- 4. Process Login or Registration ---

try {
    // Check if a user with this login_identifier (email/username) already exists
    $stmt = $pdo->prepare("SELECT id, username, password_hash FROM users WHERE username = :identifier");
    $stmt->execute([':identifier' => $login_identifier]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($user) {
        // --- A. User Exists: Attempt Login ---
        if (password_verify($password, $user['password_hash'])) {
            // Password matches! Authentication successful.
            $_SESSION['logged_in'] = true;
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['username'] = $user['username']; // Use the actual username from DB

            // Regenerate session ID to prevent session fixation attacks
            session_regenerate_id(true);

            // Redirect to the start page
            header('Location: ' . $start_page);
            exit;
        } else {
            // Password incorrect
            $errors[] = "Invalid login or password."; // Generic message for security
        }
    } else {
        // --- B. User Does NOT Exist: Attempt Registration ---

        // At this point, we need to create a new user.
        // You might want to confirm the password on the client-side for registration UX.
        // If not, this means the user only entered one password field for registration.
        // You might add stricter password complexity rules here.

        $hashed_password = password_hash($password, PASSWORD_DEFAULT);

        // Determine username for new user (e.g., from email, or a default)
        // If you require a distinct username field in the form, you'd get it from $_POST here.
        $new_username = $login_identifier;
        // Check if the chosen username is unique if you're not strictly using email as username
        // This is a simple example; you might need a more robust username uniqueness check
        $stmt_check_username = $pdo->prepare("SELECT id FROM users WHERE username = :username");
        $stmt_check_username->execute([':username' => $new_username]);
        if ($stmt_check_username->fetch()) {
          $errors[] = "User with such name already exists";
          fail_if_errors();
        }

        $stmt = $pdo->prepare("INSERT INTO users (username, password_hash) VALUES (:username, :password_hash)");
        $insert_success = $stmt->execute([
            ':username' => $new_username, // Use the identifier as username or derived
            ':password_hash' => $hashed_password
        ]);

        if ($insert_success) {
            $_SESSION['logged_in'] = true;
            $_SESSION['username'] = $new_username; 

            session_regenerate_id(true); // Crucial for security

            // Redirect to the start page
            header('Location: ' . $start_page);
            exit;
        } else {
            $errors[] = "Registration failed. Please try again.";
        }
    }

} catch (\PDOException $e) {
    // Log the actual database error for debugging purposes (NEVER show to user)
    error_log("Auth processing error: " . $e->getMessage());
    $errors[] = "An internal server error occurred. Please try again later.";
}

// --- 5. Handle Errors (If we reach here, something went wrong) ---
fail_if_errors();
