window.addEventListener("load", () => {
    setTimeout(() => {
        document.getElementById("loader").classList.add("hide");
    }, 1000); // 1 second
});

document.addEventListener("DOMContentLoaded", () => {
    // --- Observers: price animate & cake focus ---
    const targets = document.querySelectorAll(".price-container");
    const priceObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("animate");
                priceObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.5
    });
    targets.forEach(t => priceObserver.observe(t));

    const cakes = document.querySelectorAll(".cake");
    const cakeObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("focused");
                entry.target.classList.remove("not-focused");
            } else {
                entry.target.classList.remove("focused");
                entry.target.classList.add("not-focused");
            }
        });
    }, {
        threshold: 0.6
    });
    cakes.forEach(c => cakeObserver.observe(c));

    // Smooth scroll for menu radio changes
    document.querySelectorAll('input[name="menu"]').forEach(radio => {
        radio.addEventListener("change", () => {
            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });
        });
    });

    // --- Cart state & elements ---
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    const cartEl = document.getElementById('cart-container');
    const cartCount = document.getElementById('cart-count');
    const cartItems = document.getElementById('cart-items');
    const cartTotal = document.getElementById('cart-total');
    const itemsTotal = document.getElementById('items-total');
    const toast = document.getElementById('toast');
    const PHONE = "918105749018"; // Your WhatsApp number

    // --- Toast helper ---
    function showToast(msg) {
        if (!toast) {
            console.info('Toast:', msg);
            return;
        }
        toast.textContent = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 1600);
    }

    // --- Cart persistence & UI update ---
    function saveCart() {
        localStorage.setItem('cart', JSON.stringify(cart));
    }

    function updateCart() {
        if (cartItems) cartItems.innerHTML = '';
        let total = 0,
            totalQty = 0;
        cart.forEach((item, i) => {
            total += item.price * item.quantity;
            totalQty += item.quantity;
            const li = document.createElement('li');
            li.innerHTML = `
        <div>${item.name} — ₹${item.price}</div>
        <div class="qty">
          <button class="qty-btn" onclick="changeQuantity(${i}, -1)">-</button>
          ${item.quantity}
          <button class="qty-btn" onclick="changeQuantity(${i}, 1)">+</button>
          <button class="remove-btn" onclick="removeFromCart(${i})">✖</button>
        </div>`;
            if (cartItems) cartItems.appendChild(li);
        });
        if (cartCount) cartCount.textContent = totalQty;
        if (itemsTotal) itemsTotal.textContent = total.toFixed(2);

        const grand = total + (total > 0 ? 20 : 0);
        if (cartTotal) cartTotal.textContent = grand.toFixed(2);

        // Update the main cart's WhatsApp link
        assignCartWhatsAppLink();
    }

    // --- WhatsApp Link Builders ---

    // For the main cart (.order-btn2)
    function assignCartWhatsAppLink() {
        if (!Array.isArray(cart)) return;
        const lines = [];

        if (cart.length === 0) {
            lines.push("My cart is empty, but I'd like to inquire about your products.");
        } else {
            cart.forEach(item => {
                const subtotal = (item.price || 0) * (item.quantity || 0);
                lines.push(`${item.name} ${item.quantity} x ₹${item.price} = ₹${subtotal}`);
            });
            lines.push(""); // blank line
            const itemsTotalNum = cart.reduce((s, it) => s + (Number(it.price || 0) * (it.quantity || 0)), 0);
            const delivery = itemsTotalNum > 0 ? 20 : 0;
            const grand = itemsTotalNum + delivery;
            lines.push(`Subtotal: ₹${itemsTotalNum}`);
            lines.push(`Delivery: ₹${delivery}`);
            lines.push(`Total: ₹${grand}`);
        }

        const prefix = "Hello! I would like to place the following order:";
        const text = `${prefix}\n\n${lines.join('\n')}`;
        const url = `https://wa.me/${PHONE}?text=${encodeURIComponent(text)}`;

        document.querySelectorAll('.order-btn2').forEach(btn => {
            if (btn.hasAttribute('onclick')) btn.removeAttribute('onclick');
            if (btn._waClickHandler) btn.removeEventListener('click', btn._waClickHandler);
            
            const handler = () => window.open(url, '_blank', 'noopener');
            btn.addEventListener('click', handler);
            btn._waClickHandler = handler;
        });
    }

    // [FIX APPLIED HERE] For individual product order buttons (.order-btn)
    function setupDirectOrderLinks() {
        document.querySelectorAll('.order-btn').forEach(button => {
            const productElement = button.closest('.cake');
            if (!productElement) return;

            const nameElement = productElement.querySelector('.cake-info h2');
            const priceElement = productElement.querySelector('.new-price');

            if (nameElement && priceElement) {
                const productName = nameElement.textContent.trim();
                const productPrice = priceElement.textContent.trim(); // e.g., "₹400"

                const message = `Hello! I would like to order one ${productName} for ${productPrice} .`;
                const url = `https://wa.me/${PHONE}?text=${encodeURIComponent(message)}`;

                button.setAttribute('href', url);
                button.setAttribute('target', '_blank');
                button.setAttribute('rel', 'noopener');
            }
        });
    }


    // --- Global Cart Functions ---
    window.addToCart = function(name, price) {
        const found = cart.find(p => p.name === name);
        if (found) {
            found.quantity++;
        } else {
            cart.push({
                name,
                price,
                quantity: 1
            });
        }
        saveCart();
        updateCart();
        showToast(`${name} added!`);
    };

    window.changeQuantity = function(i, d) {
        if (!cart[i]) return;
        cart[i].quantity += d;
        if (cart[i].quantity <= 0) cart.splice(i, 1);
        saveCart();
        updateCart();
    };

    window.removeFromCart = function(i) {
        if (!cart[i]) return;
        const itemName = cart[i].name;
        cart.splice(i, 1);
        saveCart();
        updateCart();
        showToast(`${itemName} removed.`);
    };

    window.clearCart = function() {
        cart = [];
        saveCart();
        updateCart();
        showToast('Cart cleared 🧹');
    };

    // This function is kept for potential future use but is overridden for .order-btn2 by assignCartWhatsAppLink
    window.placeOrder = function() {
        if (cart.length === 0) {
            showToast("Your cart is empty!");
        } else {
            showToast("Order placed successfully ✅");
            clearCart();
        }
    };

    // --- Initial Execution ---
    updateCart(); // Renders the cart from localStorage
    setupDirectOrderLinks(); // [FIX APPLIED HERE] Makes the individual "Order Now" buttons work

}); // DOMContentLoaded end