let products = [];

async function loadProducts() {
    const res = await fetch('api/products.php?status=active');
    products = await res.json();

    displayProducts();
}

function displayProducts() {
    const container = document.getElementById('products-container');

    container.innerHTML = products.map(product => `
        <div class="card">
            <img src="uploads/${product.image}" class="food-image">
            <h3>${product.name}</h3>
            <p>$${product.price}</p>
        </div>
    `).join('');
}

loadProducts();