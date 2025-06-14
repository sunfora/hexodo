<?
$session = require_once "session.php";

function make_login_form() {
    global $session;
    ?>
    <p>
      Welcome. Please login
    </p>
    <?
      if ($_SESSION['form_errors'] ?? false) {
        echo "<ul class='login-error'>";
        foreach($session->get('form_errors') as $err) {
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
      $logged_in = $session->get('logged_in', false);
      if (!$logged_in) {
        make_login_form();
        exit;
      }
    ?>
        <p>
          Account: <? echo $session->get('username'); ?>
        </p>
        <form action="logout.php" method="post">
            <button type="submit">Logout</button>
        </form>
  </body>
</html>
