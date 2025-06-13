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

function make_login_form() {
    ?>
    <p>
      Welcome. Please login
    </p>
    <?
      if ($_SESSION['form_errors'] ?? false) {
        echo "<ul class='login-error'>";
        foreach($_SESSION['form_errors'] as $err) {
          echo "<li>";
          echo $err;
          echo "</li>";
        }
        echo "</ul>";
      }
    ?>

    <form class="login-form" method="post" action="auth.php">
      <p> 
        <input id=login 
               placeholder="login" 
               name="login" 
               required /> 
      </p>
      <p>
        <input id=password 
               placeholder="password"
               type=password
               name="password" 
               required /> 
      </p>
      <p>
        <button type=submit>go</button>
      </p>
    </form>
    <?
}
?>
<!doctype html>

<html>
  <head>
    <style>

      .login-error {
        padding: 1em;
        list-style: none;
        background: red;
        color: white;  
      }
      .login-form {
        padding: 1em;
        display: flex;
        p {
          margin: 0 0.5em;
        }
      }
      
      .login-form {
        background-color: aliceblue;
        button {
          color: white;
          background-color: blue;
          border: 1px solid blue;
        }
      }
    </style>    
  </head>
  <body>
    <?
      $logged_in = $_SESSION['logged_in'] ?? false;
      if (!$logged_in) {
        make_login_form();
        exit;
      }
    ?>
        <p>
          Account: <? echo $_SESSION['username']; ?>
        </p>
        <form action="logout.php" method="post">
            <button type="submit">Logout</button>
        </form>
  </body>
</html>
