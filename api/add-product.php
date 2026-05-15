<?php

require 'config.php';

if ($_POST) {

    $name = $_POST['name'];
    $price = $_POST['price'];
    $description = $_POST['description'];
    $category = $_POST['category'];
    $stock = $_POST['stock'];

    $image = $_FILES['image']['name'];
    $tmp = $_FILES['image']['tmp_name'];

    move_uploaded_file($tmp, '../uploads/' . $image);

    $stmt = $pdo->prepare("INSERT INTO products
    (name, price, description, image, category, stock)
    VALUES (?, ?, ?, ?, ?, ?)");

    $stmt->execute([
        $name,
        $price,
        $description,
        $image,
        $category,
        $stock
    ]);

    header('Location: ../admin/index.php');
    exit;
}