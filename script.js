/*
  NewCards870 - نظام سلة المشتريات مع Google Apps Script
*/

// Google Apps Script Web App URL
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbx1JFSBYw9GZ8wMVt_8BUhXYGs0KKCwYr8mdVvMByWudQaLdp5t3ZaXQnJi-dvwe3rUvw/exec";
const CLIENT_SECRET = "NC-Client-Secret-8c1a7e5f";
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

// حساب الإجمالي
function getCartTotal() {
  return cart.reduce((total, item) => total + (item.amount * item.quantity), 0);
}

// تحديث واجهة السلة
function updateCartUI() {
  const cartCount = document.getElementById('cart-count');
  const cartItems = document.getElementById('cart-items');
  const cartTotal = document.getElementById('cart-total');
  
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  cartCount.textContent = totalItems;
  
  if (cart.length === 0) {
    cartItems.innerHTML = '<p style="text-align:center;padding:20px;color:#666">السلة فارغة</p>';
    cartTotal.textContent = '$0';
    return;
  }
  
  cartItems.innerHTML = cart.map(item => `
    <div class="cart-item">
      <img src="${item.image}" alt="${item.name}">
      <div class="cart-item-details">
        <h4>${item.name}</h4>
        <p>${item.description}</p>
        <p class="cart-item-price">$${item.amount}</p>
      </div>
      <div class="cart-item-actions">
        <button onclick="updateQuantity('${item.id}', ${item.quantity - 1})">-</button>
        <span>${item.quantity}</span>
        <button onclick="updateQuantity('${item.id}', ${item.quantity + 1})">+</button>
        <button onclick="removeFromCart('${item.id}')" class="remove-btn">حذف</button>
      </div>
    </div>
  `).join('');
  
  cartTotal.textContent = `$${getCartTotal()}`;
}

// فتح/إغلاق السلة
function toggleCart() {
  const modal = document.getElementById('cart-modal');
  modal.style.display = modal.style.display === 'flex' ? 'none' : 'flex';
}

// إظهار الإشعارات
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

// عرض المنتجات
function displayProducts() {
  const container = document.getElementById('products');
  if (!container) return;
  
  container.innerHTML = products.map(product => `
    <div class="product-card">
      <img src="${product.image}" alt="${product.name}">
      <span class="product-badge">${product.currency}</span>
      <h3>${product.name}</h3>
      <p>${product.description}</p>
      <p class="product-price">${product.currency} ${product.amount}</p>
      <button onclick='addToCart(${JSON.stringify(product).replace(/'/g, "&#39;")})'>أضف للسلة</button>
    </div>
  `).join('');
}

// إتمام الشراء
async function checkout() {
  if (cart.length === 0) {
    alert('السلة فارغة!');
    return;
  }
  
  // طلب البريد الإلكتروني
  const email = prompt('الرجاء إدخال بريدك الإلكتروني لاستلام الأكواد:');
  if (!email || !email.includes('@')) {
    alert('الرجاء إدخال بريد إلكتروني صحيح');
    return;
  }
  
  const name = prompt('الرجاء إدخال اسمك (اختياري):', 'عميل NewCards') || 'عميل NewCards';
  
  const checkoutBtn = document.getElementById('checkout-btn');
  if (checkoutBtn) {
    checkoutBtn.disabled = true;
    checkoutBtn.textContent = 'جاري المعالجة...';
  }
  
  try {
    // معالجة كل منتج في السلة
    for (const item of cart) {
      const sku = item.id.split('-')[0].toUpperCase(); // ITUNES, PLAYSTATION, etc.
      const denomination = item.amount.toString();
      
      for (let i = 0; i < item.quantity; i++) {
        const params = new URLSearchParams({
          action: 'createInvoice',
          secret: CLIENT_SECRET,
          email: email,
          name: name,
          sku: sku,
          denomination: denomination,
          qty: '1',
          amount: item.amount.toString(),
          currency: item.currency,
          returnUrl: CALLBACK_URL
        });
        
        const response = await fetch(`${WEB_APP_URL}?${params.toString()}`, {
          method: 'GET'
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.ok || !data.InvoiceURL) {
          throw new Error(data.error || 'فشل إنشاء الفاتورة');
        }
        
        // فتح أول فاتورة فقط (يمكن تحسين هذا لاحقاً)
        if (i === 0 && cart.indexOf(item) === 0) {
          // مسح السلة
          cart = [];
          saveCart();
          
          // التحويل لصفحة الدفع
          window.location.href = data.InvoiceURL;
          return;
        }
      }
    }
    
  } catch (error) {
    console.error('Checkout error:', error);
    alert('حدث خطأ أثناء إنشاء الفاتورة. الرجاء المحاولة مرة أخرى.');
    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) {
      checkoutBtn.disabled = false;
      checkoutBtn.textContent = 'إتمام الشراء';
    }
  }
}

// تهيئة الصفحة
document.addEventListener('DOMContentLoaded', function() {
  loadCart();
  displayProducts();
  
  // إضافة event listener لزر checkout
  const checkoutBtn = document.getElementById('checkout-btn');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', checkout);
  }
  
  // إضافة event listener لزر إغلاق السلة
  const closeBtn = document.getElementById('close-cart');
  if (closeBtn) {
    closeBtn.addEventListener('click', toggleCart);
  }
  
  // إغلاق السلة عند الضغط خارجها
  const modal = document.getElementById('cart-modal');
  if (modal) {
    modal.addEventListener('click', function(e) {
      if (e.target === modal) {
        toggleCart();
      }
    });
  }
});

