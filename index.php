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


  // @var PDO $db
  $db = require_once 'db.php';
    
  function get_user() {
    $logged_on = $_SESSION['logged_in'] ?? false;
    if ($logged_on) {
      return $_SESSION['username'];
    } else {
      return null;
    }
  }

  function load_user() {
    ?>
    <a href="/account.php" id="account">
      <? 
         $user = get_user();
         $user ??= "login";
         echo $user; 
      ?>
    </a>
    <?
  }

  function load_his_tasks() {
    global $db;
    $user = get_user();
    if (!$user) {
      echo "<p> No tasks found </p>";
    }
    
    $task = null;
    if (!isset($_SESSION['task_id'])) {
      $stmt = $db->prepare("SELECT id, title, description, completed FROM tasks WHERE user_id = :username ORDER BY id ASC LIMIT 1");
      $stmt->execute([
          ':username' => $user
      ]);
      $task = $stmt->fetch(PDO::FETCH_ASSOC);
    } else {
      $stmt = $db->prepare("SELECT id, title, description, completed FROM tasks WHERE id = :task_id");
      $stmt->execute([
          ':task_id' => $_SESSION['task_id']
      ]);
      $task = $stmt->fetch(PDO::FETCH_ASSOC);
    }
    if (!$task) {
      echo "<p> No tasks found </p>";
    } else {
      ?>
        <ul> </ul>
        <p> <b> <? echo $task['title']; ?> </b> </p>
        <p> <? echo $task['description']; ?> </p>
        <ul> </ul>
      <?
    }
  }

  function load_navigation() {
    ?>
    <nav>
      <ul>
        <li id="here"> 
          Main 
        </li>
        <li> 
          <? load_user(); ?>
        </li>
      </ul>
    </nav>
    <?
  }

  function load_footer() {
    ?>
    <footer>
      <p> session_id: <? echo session_id(); ?> </p>
    </footer>
    <?
  }
?>
<!-- 
  actually what should I do?

  1. test if the user is already in cache and session did not expired
     it basically should send session key and ask if it matches
     server should check if some time did not elapsed since the last login
     otherwise we ask to login again

     this is somewhat paranoid thing to do
     we are not a bank so by default we should keep all sessions no matter what

  2. then we send back the data?
     should we cache something? I think so
     it would be a nice UX to go off the internet without loosing things and such
     you do the work and then it reconnects and sends the data back

     it seems we should use IndexedDB
     but I am somewhat not sure, how large can be the changes?
    
     should we just collect all the data when we login
     or we should do it on demand? 

     on demand is kinda dangerous since we cannot be sure that all things are synced
     but collecting all the notes seems bad too? 
     I mean... we download everything when somebody presses CTRL + F5 to remove the cache?

     maybe we should stick with on-demand and 

     but it is better to do something usable right now rather than
     you get it

  if the user is not registered he should be permitted to write some things and test
  we keep dangling sessions for some time (1-2 days)
  and then we clear them up

  then if a guy registers on the site we bind his login to session and data
  and thus he does not lose anything

  okay seems fine
-->


<!doctype html>
<html>
  <head>
    <style>
      
      #here {
        font-weight: bold;  
      }

      nav ul {
        display: flex;
        list-style: none;
        li {
          flex: 1; 
        }
        li:has(#account) {
          flex-align: end;
          flex: none;
        }
      }
      
      footer {
        position: absolute;
        bottom: 0;
        right: 1em;
      }
    </style> 
    <script>
    </script>   
  </head>
  <body>
    <?
      load_navigation();
      load_his_tasks();
      load_footer();
    ?>
  </body>
</html>
