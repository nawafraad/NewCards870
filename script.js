/* 
  NewCards870 - نظام سلة المشتريات مع MyFatoorah
*/

const API_ENDPOINT = "https://60h5imcl6953.manus.space/api/create-payment";
const CALLBACK_URL = window.location.origin + "/success.html";
const ERROR_URL    = window.location.origin + "/error.html";

// سلة المشتريات
let cart = [];

// تحميل السلة من localStorage
function loadCart() {
  const saved = localStorage.getItem('newcards_cart');
  if (saved) {
    cart = JSON.parse(saved);
    updateCartUI();
  }
}

// حفظ السلة في localStorage
function saveCart() {
  localStorage.setItem('newcards_cart', JSON.stringify(cart));
  updateCartUI();
}

// إضافة منتج للسلة
function addToCart(product) {
  const existing = cart.find(item => item.id === product.id);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ ...product, quantity: 1 });
  }
  saveCart();
  showNotification(`تم إضافة ${product.name} إلى السلة`);
}

// حذف منتج من السلة
function removeFromCart(productId) {
  cart = cart.filter(item => item.id !== productId);
  saveCart();
}

// تحديث كمية منتج
function updateQuantity(productId, quantity) {
  const item = cart.find(item => item.id === productId);
  if (item) {
    item.quantity = Math.max(1, quantity);
    saveCart();
  }
}

// حساب إجمالي السلة
function getCartTotal() {
  return cart.reduce((total, item) => total + (item.amount * item.quantity), 0);
}

// تحديث واجهة السلة
function updateCartUI() {
  const cartCount = document.getElementById('cart-count');
  const cartItems = document.getElementById('cart-items');
  const cartTotal = document.getElementById('cart-total');
  const emptyCart = document.getElementById('empty-cart');
  const cartContent = document.getElementById('cart-content');
  
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  
  if (cartCount) {
    cartCount.textContent = totalItems;
    cartCount.style.display = totalItems > 0 ? 'block' : 'none';
  }
  
  if (cartItems && cartTotal) {
    if (cart.length === 0) {
      if (emptyCart) emptyCart.style.display = 'block';
      if (cartContent) cartContent.style.display = 'none';
    } else {
      if (emptyCart) emptyCart.style.display = 'none';
      if (cartContent) cartContent.style.display = 'block';
      
      cartItems.innerHTML = cart.map(item => `
        <div class="cart-item">
          <img src="${item.img}" alt="${item.name}" class="cart-item-img">
          <div class="cart-item-details">
            <h4>${item.name}</h4>
            <p>${item.desc}</p>
            <div class="cart-item-quantity">
              <button onclick="updateQuantity('${item.id}', ${item.quantity - 1})">-</button>
              <span>${item.quantity}</span>
              <button onclick="updateQuantity('${item.id}', ${item.quantity + 1})">+</button>
            </div>
          </div>
          <div class="cart-item-price">
            <span class="price">$${item.amount * item.quantity}</span>
            <button class="remove-btn" onclick="removeFromCart('${item.id}')">حذف</button>
          </div>
        </div>
      `).join('');
      
      cartTotal.textContent = `$${getCartTotal()}`;
    }
  }
}

// عرض إشعار
function showNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('show');
  }, 100);
  
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// فتح/إغلاق السلة
function toggleCart() {
  const cartModal = document.getElementById('cart-modal');
  if (cartModal) {
    cartModal.classList.toggle('show');
  }
}

// عرض المنتجات
function renderProducts() {
  const host = document.getElementById("products");
  if (!host) return;
  
  host.innerHTML = "";
  (window.PRODUCTS || []).forEach(p => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <img class="thumb" alt="${p.name}" src="${p.img || 'assets/placeholder.jpg'}" />
      <div class="badge">${p.currency}</div>
      <h3>${p.name}</h3>
      <p>${p.desc || ""}</p>
      <div class="price">${p.amount} ${p.currency}</div>
      <button class="add-to-cart-btn" data-id="${p.id}">أضف للسلة</button>
    `;
    
    card.querySelector(".add-to-cart-btn").addEventListener("click", () => addToCart(p));
    host.appendChild(card);
  });
}

// إتمام الشراء
async function checkout() {
  if (cart.length === 0) {
    alert("السلة فارغة!");
    return;
  }
  
  try {
    const uid = "ORD-" + Date.now();
    const totalAmount = getCartTotal();
    
    // إنشاء وصف الطلب
    const itemsDesc = cart.map(item => `${item.name} x${item.quantity}`).join(', ');
    
    const payload = {
      CustomerName: "NewCards Buyer",
      CustomerEmail: "buyer@example.com",
      MobileCountryCode: "+965",
      CustomerMobile: "50000000",
      InvoiceValue: totalAmount,
      DisplayCurrencyIso: "USD",
      CallBackUrl: CALLBACK_URL + "?ref=" + encodeURIComponent(uid),
      ErrorUrl: ERROR_URL + "?ref=" + encodeURIComponent(uid),
      Language: "ar",
      CustomerReference: uid,
      UserDefinedField: itemsDesc
    };

    const res = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const t = await res.text();
      alert("فشل إنشاء الفاتورة: " + t);
      console.error("API Error:", t);
      return;
    }
    
    const data = await res.json();
    console.log("API Response:", data);
    
    if (data?.IsSuccess && data?.Data?.InvoiceURL) {
      // حفظ الطلب قبل التحويل
      localStorage.setItem('last_order', JSON.stringify({
        orderId: uid,
        items: cart,
        total: totalAmount,
        date: new Date().toISOString()
      }));
      
      // مسح السلة
      cart = [];
      saveCart();
      
      // تحويل للفاتورة
      window.location.href = data.Data.InvoiceURL;
    } else {
      alert("خطأ في إنشاء الفاتورة: " + (data?.Message || "Unknown error"));
      console.error("Payment Error:", data);
    }
  } catch (e) {
    alert("خطأ في الاتصال: " + e.message);
    console.error("Network Error:", e);
  }
}

// تهيئة الصفحة
document.addEventListener("DOMContentLoaded", () => {
  loadCart();
  renderProducts();
  
  // إضافة مستمع لزر الدفع
  const checkoutBtn = document.getElementById('checkout-btn');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', checkout);
  }
  
  // إضافة مستمع لإغلاق السلة
  const closeCartBtn = document.getElementById('close-cart');
  if (closeCartBtn) {
    closeCartBtn.addEventListener('click', toggleCart);
  }
});

