<!doctype html>

<html>
  <head>
    <style>
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
    
    <p>
      Welcome. Please login
    </p>

    <form class="login-form" method="post">
      <p> 
        <input id=login placeholder="login" name="login" /> 
      </p>
      <p>
        <input id=password 
               placeholder="password"
               type=password
               name="password" /> 
      </p>
      <p>
        <button type=submit>go</button>
      </p>
    </form>
  </body>
</html>
