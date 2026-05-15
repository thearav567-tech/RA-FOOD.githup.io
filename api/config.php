<?php

$host = "sql300.infinityfree.com";
$dbname = "if0_41917390_food_shop";
$username = "if0_41917390";
$password = "YOUR_DATABASE_PASSWORD";

try {

    $pdo = new PDO(
        "mysql:host=$host;dbname=$dbname",
        $username,
        $password
    );

    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

} catch(PDOException $e) {

    die("Connection Failed: " . $e->getMessage());

}