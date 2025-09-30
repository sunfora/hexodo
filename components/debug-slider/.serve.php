<?
function from_kebab_case($str) {
 return str_replace('-', '', ucwords($str, '-')); 
}

$component_config_path = __DIR__ . '/config.json';
$component_config = [
  'name' => basename(__DIR__),
  'style' => 'style.css',
  'template' => 'template.html',
  'module' => 'module.js'
];
$component_config['class'] = from_kebab_case($component_config['name']);

if (file_exists($component_config_path)) {
  $conf = json_decode(file_get_contents($component_config_path), false, 512, JSON_THROW_ON_ERROR);
  $component_config['name']     = $conf?->name     ?? $component_config['name'];
  $component_config['style']    = $conf?->style    ?? $component_config['style'];
  $component_config['template'] = $conf?->template ?? $component_config['template'];
  $component_config['module']   = $conf?->module   ?? $component_config['module'];
  $component_config['class']    = $conf?->class    ?? from_kebab_case($component_config['name']);
}

$url_path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

if ($url_path === "/" || $url_path === "/index.html") {
  require("index.html");
  die;
} else if ($url_path === "/favicon.ico") {
  http_response_code(404);
  die;
} else if (basename($url_path) === ($component_config['name'] . ".js")) {
  header('Content-Type: application/javascript');

  $stylesheet_path = __DIR__ . "/{$component_config['style']}";
  $html_template_path = __DIR__ . "/{$component_config['template']}";
  $js_module_path = __DIR__ . "/{$component_config['module']}";

  if (!file_exists($stylesheet_path)) {
    error_log("stylesheets not found");
    $componentStyle = "";
  } else {
    $componentStyle = addslashes(file_get_contents($stylesheet_path));
  }
  if (!file_exists($html_template_path)) {
    error_log("html template not found");
    $componentHTML = "";
  } else {
    $componentHTML  = addslashes(file_get_contents($html_template_path));
  }
  if (!file_exists($js_module_path)) {
    error_log("js module path not found");
    http_response_code(500);
    die(1);
  }


  include($js_module_path);
  ?>
customElements.define('<?= $component_config['name']; ?>', <?= $component_config['class'] ?>);
  <?
  exit;
} else {
  error_log("Invalid access to dynamically generated js module");
  error_log("url path: " . $url_path);
  error_log("file requested: " . basename($url_path));
  error_log("component name: {$component_config['name']}");
  http_response_code(403);
  exit;
}
