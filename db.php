<?
$pdo = new PDO("sqlite:db/tokoharu.db");
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
return $pdo;
