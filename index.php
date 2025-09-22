<?
require_once "session.php";
// @var ContextDB $db_operations
$db_operations = require_once 'db.php';
// @var PDO $db
$db = $db_operations->db;

function load_user() {
  ?>
  <a href="/account" id="account">
    <?= Session::read('username', 'login'); ?>
  </a>
  <?
}

function load_board() : array {
  // @var ContextDB $db_operations
  global $db_operations;

  if (isset($_GET['board_id'])) {
    $board_id = (int) $_GET['board_id'];
    $_SESSION['board_id'] = $board_id;
    return $db_operations->find_board($board_id);
  } else if (isset($_SESSION['board_id'])) {
    $board_id = $_SESSION['board_id'];
    return $db_operations->find_board($board_id);
  } else {
    // create new board
    $user_name = Session::read('username', 'anon');
    $board_name = 'new board';
    $board = $db_operations->create_board($user_name, $board_name);
    $_SESSION['board_id'] = $board['board_id'];
    return $board;
  }
}

$board = load_board();

$config = [
  'board' => $board,
  'user_id' => Session::read('username', 'anon')
];

function load_his_tasks() {
?>
  <div class="todo-ui">
    <div class="hex-grid-draggable-container">
      <canvas id=hex-grid> 
      </canvas>
    </div>
    <div class="task-viewer">
    <button id="toggle-list-view"> list view </button>
    <button id="remove-button"> remove task from cell </button>
    <section id="list-view" hidden>
      <section id="active-section">
          <ul id="active-list"></ul>
      </section>
      <section id="done-section">
          <ul id="done-list"></ul>
      </section>
      <section id="locked-section">
          <ul id="locked-list"></ul>
      </section>
    </section>
    <form id="task-form">
        <div id="task-form-tools"> 
          <h2 id="task-form-header">Loading Task...</h2>
          <button id="task-form-copy">#</button>
        </div>
        <label for="task-title">Task Title:</label>
        <br>
        <input type="text" id="task-title" name="task-title" placeholder="New task" required>
        <br>
        <label for="task-description">Task Description:</label>
        <br>
        <textarea id="task-description" name="task-description" placeholder="description" rows="8"></textarea>
        <input id="task-completed" name="task-completed" type="checkbox"/>

        <br>
        <button type="submit">Save Changes</button>
      </form>
    </div>
  </div>
  <div>
    <p id='cam-debug'>
      cam(0, 0)
    </p>
  </div>
<?
}

function load_navigation() {
  global $board;
  ?>
  <nav>
    <ul>
      <li id="here"> 
         <?= htmlspecialchars($board['board_name']) ?> ;
         <?= htmlspecialchars($board['board_id']) ?> 
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
       
      #list-view {
        padding: 1em;
        margin: 1em 0;

        li {
          &::before {
            display: inline-block;
            content: '⬣';
            margin-right: 1em;
          }
        }

        li.selected {
          &::before {
            color: gold !important;
          }
          text-decoration: underline !important;
        }

        max-height: 60vh;
        overflow: scroll;
        scroll-snap-type: x mandatory;
        #active-list li::before {
          color: orange;
        }
        #done-list li {
          &::before {
            color: green;
          }
          text-decoration: line-through;
        }

        #locked-list li::before {
          color: red;
        }

        section {
          width: 100%;
          flex: none;
          scroll-snap-align: center; 
          scroll-snap-stop: always;
        }
        h2 {
          font-size: 16px;
        }
        ul {
          margin: 0;
          list-style: none;
          padding: 0;
          width: 100%;
          li {
            font-size: 14px;
            cursor: pointer;
            padding: 1em;
            font-family: "Helvetia Neue", Arial, sans-serif;
            font-weight: bold;
          }
        }
      }
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
      .hex-grid-draggable-container {
        border: 1px solid black;
        background: repeating-linear-gradient(
            45deg,         
            #000000,       
            #000000 5px,   
            #ff8c00 5px,   
            #ff8c00 10px  
        );
        padding: 10px;
        border-radius: 5px;
        width: 60vw;
        height: 500px;  
        cursor: grab;
        flex: none;
      }
      #hex-grid {
        background-color: white;
        border-radius: 2px;
        border: 1px solid black;
        width: 100%;  
        height: 100%;  
        cursor: default;
      }
      .todo-ui {
        display: flex;
        width: 100vw;
      }
      .task-viewer {
        flex: 1;
        border: 1px solid black;
        border-radius: 5px;
        margin: 0 2em;
        padding: 1em;
      }
      #task-form {
        background: white;
        border: 1px solid black;
        margin-top: 1em;
        padding: 1em;
        h2 {
          font-family: monospace;
        }
        label {
          font-size: 16px;
          font-family: "Helvetia Neue", Arial, sans-serif;
          font-style: italic;
          color: grey;
        }
        input[type='text'] {
          width: 100%;
          border: none;
          font-size: 16px;
          font-family: "Helvetia Neue", Arial, sans-serif;
          font-weight: bold;
          margin-bottom: 2em;
        }
        textarea {
          width: 100%;
          border: none;
          font-size: 16px;
          font-family: "Helvetia Neue", Arial, sans-serif;
        }
      }
      #task-form-tools {
        display: flex;
        justify-content: space-between; 
        align-items: center;
        button {
          border: none;
        }
      }
      footer {
        position: absolute;
        bottom: 0;
        right: 1em;
      }
    </style> 
    <script>
      window.appConfig = <?= json_encode($config); ?>
    </script>
    <script src="board.js" type=module defer></script>   
    <script src="draggable-container.js" defer></script>   
  </head>
  <body>
    <?
      load_navigation();
      load_his_tasks();
      load_footer();
    ?>
  </body>
</html>
