<?
require "vendor/autoload.php";

// NOTE(ivan): this is a simple DEV router 
//             for the development / debugging purposes
//
//             it: 
//
//             1. serves & resolves 
//                debugging webcomponents automatically
//             2. shows the .php source

// NOTE(ivan): project's http page for displaying errors
//             like 404 and etc
require_once "http_page.php";

// Report all types of errors
error_reporting(E_ALL);                   

enum ServeTag {
  case FILE;
  case FUNCTION;
  case SCRIPT;
  case COMPONENT;
}

class FR_Index {
  public const int STATUS    = 0;
  public const int HANDLER   = 1;
  public const int ARGUMENTS = 2;
}

// RESEARCH(ivan): switch this into proper C/PHP utility function
//
//                 system independent if possible
//                 not strictly tied to linux
//
//                 currently project calls realpath from shell by gnu
function resolve_path($path_source) {
  $path_shellescaped = escapeshellarg($path_source);
  return trim(`realpath --canonicalize-missing --no-symlinks $path_shellescaped`);
};

class Serve {

  public function __construct
  (
    public ServeTag $tag, 
    public mixed    $payload
  ) {}

  static function file(string $path): self {
    return new self(ServeTag::FILE, $path);
  }
  static function func(callable $fn): self {
    return new self(ServeTag::FUNCTION, $fn);
  }
  static function script(string $scriptPath): self {
    return new self(ServeTag::SCRIPT, $scriptPath);
  }
  static function component(): self {
    return new self(ServeTag::COMPONENT, null);
  }
}

class FileDispatcher extends FastRoute\Dispatcher\GroupCountBased {
  public function dispatch($httpMethod, $uri) {
    $dispatched = parent::dispatch($httpMethod, $uri);

    $status = $dispatched[FR_Index::STATUS];

    if ($status === FastRoute\Dispatcher::NOT_FOUND) {
      $project_root             = resolve_path(__DIR__);
      $supposedly_existing_file = resolve_path(__DIR__ . $uri);

      $safe_to_provide = (
           str_starts_with($supposedly_existing_file, $project_root . '/')
        && is_file($supposedly_existing_file)
      );

      if ($safe_to_provide) {
        if ($httpMethod === "GET") {
          return [FastRoute\Dispatcher::FOUND, Serve::file($supposedly_existing_file), []];
        } else {
          return [FastRoute\Dispatcher::METHOD_NOT_ALLOWED, ["GET"]];
        }
      }
    }
    
    return $dispatched;
  }
}

$dispatcher = FastRoute\simpleDispatcher(
  function(FastRoute\RouteCollector $router) {
    // Basic routes
    $router->addRoute('GET',  '/',           Serve::script('index.php'     ));
    $router->addRoute('GET',  '/account',    Serve::script('account.php'   ));
    $router->addRoute('POST', '/api/logout', Serve::script('api/logout.php'));
    $router->addRoute('POST', '/api/login',  Serve::script('api/login.php' ));

    // Boards
    $router->addRoute('POST', '/api/boards',                       Serve::script('api/create_board.php'    ));
    $router->addRoute('GET',  '/api/boards/{board_id:\d+}',        Serve::script('api/get_board_info.php'  ));
    $router->addRoute('GET',  '/api/boards/{board_id:\d+}/chunks', Serve::script('api/get_chunk.php'       ));
    
    // Board Cells
    $router->addRoute('GET',    '/api/boards/{board_id:\d+}/cells',Serve::script('api/get_cell_info.php'   ));
    $router->addRoute('POST',   '/api/boards/{board_id:\d+}/cells',Serve::script('api/write_cell_info.php' ));
    $router->addRoute('DELETE', '/api/boards/{board_id:\d+}/cells',Serve::script('api/delete_from_cell.php'));

    // Javascript Components
    $router->addRoute('GET', '/components/{path:.+}\.js', Serve::component());
  }, 
  ['dispatcher' => FileDispatcher::class]
);

$unmodified_uri    = $_SERVER['REQUEST_URI'];
$method            = $_SERVER['REQUEST_METHOD'];

// Remove query string if any
$uri = $unmodified_uri;

if (strpos($uri, '/') !== 0) {
  $uri = '/' . $uri;
}

$query_found = strpos($uri, '?'); 
if ($query_found !== false) {
  $uri = substr($uri, 0, $query_found);
}
if ($uri !== '/') {
  $uri = rtrim($uri, '/');
}


$dispatched = $dispatcher->dispatch($method, $uri);

switch ($dispatched[FR_Index::STATUS]) {
  case FastRoute\Dispatcher::FOUND: {
    /**
     * @var Serve $handler
     * @var array $args
     */
    $handler   = $dispatched[FR_Index::HANDLER];
    $arguments = $dispatched[FR_Index::ARGUMENTS];

    switch ($handler->tag) {
      case ServeTag::SCRIPT: {
        $php_file = $handler->payload;
        $_GET = array_merge($_GET, $arguments);
        require($php_file);
      } break;
      case ServeTag::COMPONENT: {
        $maybe_nested_component_path = $arguments['path'];

        // this is a web component it is built and served by its own .serve.php
        // but it appears as if it was just {path}.js for the browser
        
        
        $allowed_prefix = resolve_path(__DIR__ . '/components/');
        $component_dir  = resolve_path(__DIR__ . "/components/{$maybe_nested_component_path}");

        $component_dir_found = (
             str_starts_with($component_dir . '/', $allowed_prefix . '/')
          && is_dir($component_dir)
        );
        
        $component_build_script = "{$component_dir}/.serve.php";
        $component_is_safe_to_load = false;

        if ($component_dir_found) {
          $component_is_safe_to_load = is_file($component_build_script);
        }

        if ($component_is_safe_to_load) {
          require($component_build_script);
        } else {
          page_404_not_found($method, $unmodified_uri);
        }
      } break;
      case ServeTag::FILE: {
        /**
         * @var string $file_path
         */
        $file_path             = $handler->payload;
        $file_contents         = file_get_contents($file_path);

        $file_path_encoded     = htmlspecialchars($file_path,     ENT_HTML5, 'UTF-8');
        $file_contents_encoded = htmlspecialchars($file_contents, ENT_HTML5, 'UTF-8');

        if (str_ends_with($file_path, ".php")) {
          echo <<<HTML
            <!doctype html>
            <h1> 
              {$file_path_encoded}
            </h1>
            <pre>
              <code>
                {$file_contents_encoded}
              </code>
            </pre>
          HTML; 
        }
        // Otherwise serve it normally
        return false;
      } break;
      default: {
        page_501_not_implemented($method, $unmodified_uri);
      } break;
    }
  } break;
  case FastRoute\Dispatcher::NOT_FOUND: {
    page_404_not_found($method, $unmodified_uri);
  } break;
  case FastRoute\Dispatcher::METHOD_NOT_ALLOWED: {
    [$_, $allowed_methods_array] = $dispatched;
    page_405_not_allowed($method, $unmodified_uri, $allowed_methods_array);
  } break;
}
