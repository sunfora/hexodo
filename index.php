<?
require_once "session.php";
// @var PDO $db
$db = require_once 'db.php';

function load_user() {
  ?>
  <a href="/account" id="account">
    <?= Session::read('username', 'login'); ?>
  </a>
  <?
}

function load_his_tasks() {
?>
  <div class="hex-grid-draggable-container">
    <canvas id=hex-grid> 
    </canvas>
  </div>
<?
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
      }
      #hex-grid {
        background-color: white;
        border-radius: 2px;
        border: 1px solid black;
        width: 100%;  
        height: 100%;  
        cursor: default;
      }
      footer {
        position: absolute;
        bottom: 0;
        right: 1em;
      }
    </style> 
    <script>
      document.addEventListener('DOMContentLoaded', () => {
          let grid_container_data = {
              resizing: false,
              pageX : 0,
              pageY : 0,
              width : 0,
              height: 0,
              animationFrame: null
          }
          const grid_container = document.querySelector('.hex-grid-draggable-container')
          grid_container.addEventListener('mousedown', (event) => {
            grid_container.style.cursor = 'crosshair';
            grid_container_data.pageX = event.pageX;
            grid_container_data.pageY = event.pageY;
            grid_container_data.resizing = true;
            grid_container_data.width = grid_container.clientWidth;
            grid_container_data.height = grid_container.clientHeight;
          });
          document.addEventListener('mousemove', (even) => {
            if (grid_container_data.resizing) {

              const diffX = grid_container_data.pageX - event.pageX;
              const diffY = grid_container_data.pageY - event.pageY;

              if (grid_container_data.animationFrame) {
                cancelAnimationFrame(grid_container_data.animationFrame);
              } 
              grid_container_data.animationFrame = requestAnimationFrame( () => {
                grid_container.style.width = `${Math.max(grid_container_data.width - diffX,  0)}px`;
                grid_container.style.height = `${Math.max(grid_container_data.height - diffY,  0)}px`;
              });
            }
          });
          document.addEventListener('mouseup', (event) => {
            grid_container.style.cursor = 'grab';
            if (grid_container_data.resizing) {
              grid_container_data.resizing = false;
              grid_container_data.animationFrame = null;
            }
          });

          const canvas = document.getElementById('hex-grid');
          const ctx = canvas.getContext('2d');

          function

          function drawAnimationFrame() {
            canvas.width = canvas.clientWidth;
            canvas.height = canvas.clientHeight;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            // Draw a blue rectangle that always fills 50% of the canvas width and 30% of the height
            let speed = 0.001;
            ctx.save()
            ctx.translate(canvas.width / 2, canvas.height / 2);
            let t = (Date.now() / 10000) % 1.0;
            ctx.rotate(t * 2 * Math.PI);
            const rectWidth = canvas.width * 0.5;
            const rectHeight = canvas.height * 0.3;

            ctx.fillStyle = 'blue';
            ctx.fillRect(-rectWidth / 2, -rectHeight / 2, rectWidth, rectHeight);
            ctx.restore();
          }
          let canvasFrame = null;
          function loop() {
            if (canvasFrame) {
              cancelAnimationFrame(canvasFrame);
            }
            drawAnimationFrame();
            canvasFrame = requestAnimationFrame(loop);
          }
          requestAnimationFrame(loop);
      });
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
