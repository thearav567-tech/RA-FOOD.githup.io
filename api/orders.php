<?php

require 'config.php';

$data = json_decode(file_get_contents("php://input"), true);

$stmt = $pdo->prepare("INSERT INTO orders
(customer_name, phone, address, email, total, products)
VALUES (?, ?, ?, ?, ?, ?)");

$stmt->execute([
    $data['customer_name'],
    $data['phone'],
    $data['address'],
    $data['email'],
    $data['total'],
    json_encode($data['products'])
]);

echo json_encode([
    'success' => true
]);