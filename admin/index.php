<?php
session_start();
if (!isset($_SESSION['admin'])) {
    header('Location: login.php');
    exit;
}

require '../api/config.php';

$stmt = $pdo->query("SELECT * FROM products ORDER BY id DESC");
$products = $stmt->fetchAll();
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RA Admin Dashboard</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        body {
            font-family: Arial, sans-serif;
            background: #f5f5f5;
            margin: 0;
        }

        .header {
            background: #ff5722;
            color: white;
            padding: 1rem 2rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .container {
            width: 95%;
            margin: auto;
            padding: 2rem 0;
        }

        .card {
            background: white;
            padding: 2rem;
            border-radius: 15px;
            margin-bottom: 2rem;
            box-shadow: 0 5px 20px rgba(0,0,0,0.1);
        }

        input, textarea, select {
            width: 100%;
            padding: 12px;
            margin-top: 10px;
            margin-bottom: 20px;
            border-radius: 10px;
            border: 1px solid #ddd;
        }

        button {
            background: #ff5722;
            color: white;
            border: none;
            padding: 12px 20px;
            border-radius: 10px;
            cursor: pointer;
        }

        table {
            width: 100%;
            border-collapse: collapse;
        }

        th, td {
            padding: 15px;
            border-bottom: 1px solid #eee;
            text-align: left;
        }

        img {
            width: 70px;
            height: 70px;
            object-fit: cover;
            border-radius: 10px;
        }
    </style>
</head>
<body>

<div class="header">
    <h1>RA Food Shop Admin</h1>
    <a href="logout.php" style="color:white;text-decoration:none;">Logout</a>
</div>

<div class="container">

    <div class="card">
        <h2>Add New Product</h2>

        <form action="../api/add-product.php" method="POST" enctype="multipart/form-data">
            <input type="text" name="name" placeholder="Product Name" required>

            <input type="number" step="0.01" name="price" placeholder="Price" required>

            <textarea name="description" placeholder="Description"></textarea>

            <input type="text" name="category" placeholder="Category">

            <input type="number" name="stock" placeholder="Stock Quantity">

            <input type="file" name="image" required>

            <button type="submit">
                <i class="fas fa-plus"></i>
                Add Product
            </button>
        </form>
    </div>

    <div class="card">
        <h2>All Products</h2>

        <table>
            <tr>
                <th>Image</th>
                <th>Name</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Status</th>
            </tr>

            <?php foreach($products as $product): ?>
            <tr>
                <td>
                    <img src="../uploads/<?php echo $product['image']; ?>">
                </td>

                <td><?php echo $product['name']; ?></td>
                <td>$<?php echo $product['price']; ?></td>
                <td><?php echo $product['stock']; ?></td>
                <td><?php echo $product['status']; ?></td>
            </tr>
            <?php endforeach; ?>
        </table>
    </div>

</div>

</body>
</html>