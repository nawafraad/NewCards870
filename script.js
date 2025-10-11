/* 
  تكامل MyFatoorah عبر Serverless API
  تم حل مشكلة CORS باستخدام Backend API
*/

const API_ENDPOINT = "https://60h5imcl6953.manus.space/api/create-payment";
const CALLBACK_URL = window.location.origin + "/success.html";
const ERROR_URL    = window.location.origin + "/error.html";

function renderProducts() {
  const host = document.getElementById("products");
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
      <button data-id="${p.id}">اشتري الآن</button>
    `;
    card.querySelector("button").addEventListener("click", () => sendPayment(p));
    host.appendChild(card);
  });
}

async function sendPayment(product) {
  try {
    // رقم مرجعي للطلب
    const uid = "ORD-" + Date.now();

    const payload = {
      CustomerName: "NewCards Buyer",
      CustomerEmail: "buyer@example.com",
      MobileCountryCode: "+965",
      CustomerMobile: "50000000",
      InvoiceValue: product.amount,
      DisplayCurrencyIso: product.currency,
      CallBackUrl: CALLBACK_URL + "?ref=" + encodeURIComponent(uid) + "&pid=" + encodeURIComponent(product.id),
      ErrorUrl: ERROR_URL + "?ref=" + encodeURIComponent(uid) + "&pid=" + encodeURIComponent(product.id),
      Language: "ar",
      CustomerReference: uid,
      UserDefinedField: product.id
    };

    // Call our backend API instead of MyFatoorah directly
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

document.addEventListener("DOMContentLoaded", renderProducts);

