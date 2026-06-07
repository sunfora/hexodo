<?

/**
 * Simple HTTP Error reporting page like 404 or 405.
 */
function make_page(string $header, string $cause) {
?>
  <!doctype html>
  <html>
  <head>
  </head>
  <body>
    <h1> <?= htmlspecialchars($header) ?> </h1>
    <p>  <?= htmlspecialchars($cause)  ?> </p>
  </body>
</html>
<?
}

function page_501_not_implemented(string $method, string $unmodified_uri) {
  http_response_code(501);
  make_page(
    "501 Not Implemented",
    "Sorry we haven't yet implemented this page: {$unmodified_uri}",
  );
}

function page_404_not_found(string $method, string $unmodified_uri) {
  http_response_code(404);
  make_page(
    "404 Not Found",
    "The requested URL {$unmodified_uri} was not found on this server",
  );
}

function page_405_not_allowed(string $method, string $unmodified_uri, array $allowed_methods_array) {
  http_response_code(405);
  $allowed_methods_str = implode(', ', $allowed_methods_array);
  header(
    "Allow: $allowed_methods_str"
  );
  make_page(
    "405: Method Not Allowed", 
    "Use {$allowed_methods_str} instead of {$method} for {$unmodified_uri}",
  );
}
