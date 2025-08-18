window.addEventListener("load", () => {
    setTimeout(() => {
        document.getElementById("loader").classList.add("hide");
    }, 1000); // 1 second
});
// script.js - cleaned for no-toggle usage (cart-whatsapp integrated, override placeOrder onclick)
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
    }, { threshold: 0.5 });
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
    }, { threshold: 0.6 });
    cakes.forEach(c => cakeObserver.observe(c));

    // Smooth scroll when menu radios change (if present)
    document.querySelectorAll('input[name="menu"]').forEach(radio => {
        radio.addEventListener("change", () => {
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
    });

    // --- Cart state & elements ---
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    const cartOpen = JSON.parse(localStorage.getItem('cartOpen') || 'false');

    const cartEl = document.getElementById('cart-container');
    const cartCount = document.getElementById('cart-count');
    const cartItems = document.getElementById('cart-items');
    const cartTotal = document.getElementById('cart-total');
    const itemsTotal = document.getElementById('items-total');
    const toast = document.getElementById('toast');

    // --- WhatsApp builder (inside DOMContentLoaded so it can access cart) ---
    function assignCartWhatsAppLink() {
        const PHONE = "918105749018"; // change to "" to let user pick recipient

        if (!Array.isArray(cart)) return;
        const lines = [];

        if (cart.length === 0) {
            lines.push("Cart is empty.");
        } else {
            cart.forEach(item => {
                const name = item.name || "Item";
                const qty = item.quantity || 0;
                const price = Number(item.price || 0);
                const subtotal = price * qty;
                // "Name, qty x ₹price = ₹subtotal"
                lines.push(`${name}, ${qty} x ₹${price} = ₹${subtotal}`);
            });

            lines.push(""); // blank line
            const itemsTotalNum = cart.reduce((s, it) => s + (Number(it.price || 0) * (it.quantity || 0)), 0);
            const delivery = itemsTotalNum > 0 ? 20 : 0;
            const grand = itemsTotalNum + delivery;
            lines.push(`Subtotal: ₹${itemsTotalNum}`);
            lines.push(`Delivery: ₹${delivery}`);
            lines.push(`Total: ₹${grand}`);
        }

        const text = lines.join('\n');
        const base = PHONE ? `https://wa.me/${PHONE}` : `https://wa.me/`;
        const url = `${base}?text=${encodeURIComponent(text)}`;

        document.querySelectorAll('.cart .order-btn2, .order-btn2').forEach(btn => {
            if (!btn) return;

            if (btn.tagName.toLowerCase() === 'a') {
                // anchor: set href (safe)
                btn.setAttribute('href', url);
                btn.setAttribute('target', '_blank');
                btn.setAttribute('rel', 'noopener');
                // Remove any inline onclick to prevent conflicts
                if (btn.hasAttribute('onclick')) btn.removeAttribute('onclick');
            } else {
                // button-like element:
                // Remove inline onclick if present (this prevents placeOrder() from running and clearing cart)
                if (btn.hasAttribute('onclick')) btn.removeAttribute('onclick');
                btn.onclick = null; // ensure any property is cleared

                // remove previous handler if exists
                if (btn._waClickHandler) btn.removeEventListener('click', btn._waClickHandler);

                // Create a fresh handler that opens wa.me with current cart summary
                const handler = (e) => {
                    // We open the URL in a new tab
                    window.open(url, '_blank', 'noopener');
                };
                btn.addEventListener('click', handler);
                btn._waClickHandler = handler;
            }
        });
    }

    // --- Toast helper (safe if toast missing) ---
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
    function saveCart() { localStorage.setItem('cart', JSON.stringify(cart)); }

    function updateCart() {
        if (cartItems) cartItems.innerHTML = '';
        let total = 0, totalQty = 0;
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

        // important: update whatsapp link for cart after re-render
        assignCartWhatsAppLink();
    }

    // expose these globally because the HTML calls them inline
    window.addToCart = function (name, price) {
        const found = cart.find(p => p.name === name);
        if (found) found.quantity++;
        else cart.push({ name, price, quantity: 1 });
        saveCart(); updateCart();
        showToast(`${name} added!`);
    };

    window.changeQuantity = function (i, d) {
        if (!cart[i]) return;
        cart[i].quantity += d;
        if (cart[i].quantity <= 0) cart.splice(i, 1);
        saveCart(); updateCart();
    };

    window.removeFromCart = function (i) {
        if (!cart[i]) return;
        cart.splice(i, 1); saveCart(); updateCart();
    };

    window.clearCart = function () {
        cart = []; saveCart(); updateCart(); showToast('Cart cleared 🧹');
    };

    // NOTE: we DO NOT call placeOrder automatically on cart checkout click anymore.
    // If you still want placeOrder behavior after sending WhatsApp, we can call it manually inside the handler.
    window.placeOrder = function () {
        if (cart.length === 0) {
            showToast("Cart is empty !");
        } else {
            showToast("Order placed successfully ✅");
            clearCart();
        }
    };

    // Initial render
    updateCart();
    assignCartWhatsAppLink();

    function assignCartWhatsAppLink() {
        const PHONE = "918105749018"; // change to "" if you want user to pick recipient

        if (!Array.isArray(cart)) return;
        const lines = [];

        if (cart.length === 0) {
            lines.push("Cart is empty.");
        } else {
            cart.forEach(item => {
                const name = item.name || "Item";
                const qty = item.quantity || 0;
                const price = Number(item.price || 0);
                const subtotal = price * qty;
                // removed comma after name as requested
                lines.push(`${name} ${qty} x ₹${price} = ₹${subtotal}`);
            });

            lines.push(""); // blank line
            const itemsTotalNum = cart.reduce((s, it) => s + (Number(it.price || 0) * (it.quantity || 0)), 0);
            const delivery = itemsTotalNum > 0 ? 20 : 0;
            const grand = itemsTotalNum + delivery;
            lines.push(`Subtotal: ₹${itemsTotalNum}`);
            lines.push(`Delivery: ₹${delivery}`);
            lines.push(`Total: ₹${grand}`);
        }

        const prefix = "I want";
        const text = `${prefix}\n${lines.join('\n')}`;

        const base = PHONE ? `https://wa.me/${PHONE}` : `https://wa.me/`;
        const url = `${base}?text=${encodeURIComponent(text)}`;

        document.querySelectorAll('.cart .order-btn2, .order-btn2').forEach(btn => {
            if (!btn) return;

            if (btn.tagName.toLowerCase() === 'a') {
                if (btn.hasAttribute('onclick')) btn.removeAttribute('onclick');
                btn.setAttribute('href', url);
                btn.setAttribute('target', '_blank');
                btn.setAttribute('rel', 'noopener');
            } else {
                if (btn.hasAttribute('onclick')) btn.removeAttribute('onclick');
                if (btn._waClickHandler) btn.removeEventListener('click', btn._waClickHandler);
                const handler = () => window.open(url, '_blank', 'noopener');
                btn.addEventListener('click', handler);
                btn._waClickHandler = handler;
            }
        });
    }



}); // DOMContentLoaded end
