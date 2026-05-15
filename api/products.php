<?php

require 'config.php';

$status = $_GET['status'] ?? 'active';

$stmt = $pdo->prepare("SELECT * FROM products WHERE status = ?");
$stmt->execute([$status]);

$products = $stmt->fetchAll(PDO::FETCH_ASSOC);

header('Content-Type: application/json');

echo json_encode($products);