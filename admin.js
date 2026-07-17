const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const dateTime = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit"
});

const elements = {
  adminLogin: document.querySelector("#adminLogin"),
  adminCode: document.querySelector("#adminCode"),
  adminMessage: document.querySelector("#adminMessage"),
  usersList: document.querySelector("#usersList"),
  purchaseList: document.querySelector("#purchaseList"),
  refreshUsers: document.querySelector("#refreshUsers"),
  refreshPurchases: document.querySelector("#refreshPurchases")
};

let adminPasscode = sessionStorage.getItem("figmas_admin_passcode") || "";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-Admin-Passcode": adminPasscode,
      ...(options.headers || {})
    },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data;
}

async function loadUsers() {
  if (!adminPasscode) return;
  elements.usersList.className = "empty-state";
  elements.usersList.textContent = "Loading users...";

  try {
    const data = await api("/api/admin/users", { method: "GET" });
    elements.usersList.className = "request-list";
    elements.usersList.innerHTML = data.users.length
      ? data.users.map(renderUser).join("")
      : '<div class="empty-state">No users yet.</div>';
  } catch (error) {
    elements.usersList.className = "empty-state";
    elements.usersList.textContent = error.message;
  }
}

async function loadPurchases() {
  if (!adminPasscode) return;
  elements.purchaseList.className = "empty-state";
  elements.purchaseList.textContent = "Loading transfer requests...";

  try {
    const data = await api("/api/admin/purchases", { method: "GET" });
    elements.purchaseList.className = "request-list";
    elements.purchaseList.innerHTML = data.purchases.length
      ? data.purchases.map(renderPurchase).join("")
      : '<div class="empty-state">No transfer requests yet.</div>';
  } catch (error) {
    elements.purchaseList.className = "empty-state";
    elements.purchaseList.textContent = error.message;
  }
}

function renderUser(user) {
  return `
    <div class="request-card">
      <strong>${escapeHtml(user.name)}</strong>
      <dl>
        <dt>Email</dt><dd>${escapeHtml(user.email)}</dd>
        <dt>Verified</dt><dd>${user.email_verified_at ? "Yes" : "No"}</dd>
        <dt>Approved</dt><dd>${number.format(user.approved_tokens)} FGMS</dd>
        <dt>Pending</dt><dd>${number.format(user.pending_tokens)} FGMS</dd>
        <dt>Requests</dt><dd>${number.format(user.purchase_count)}</dd>
        <dt>Joined</dt><dd>${formatDate(user.created_at)}</dd>
      </dl>
    </div>
  `;
}

function renderPurchase(purchase) {
  return `
    <div class="request-card">
      <strong>${escapeHtml(purchase.name)} · ${escapeHtml(purchase.email)}</strong>
      <dl>
        <dt>Status</dt><dd>${escapeHtml(purchase.status)}</dd>
        <dt>USDT</dt><dd>${number.format(purchase.usdt_amount)} USDT</dd>
        <dt>Tokens</dt><dd>${number.format(purchase.token_amount)} ${escapeHtml(purchase.token_symbol)}</dd>
        <dt>Stage</dt><dd>Stage ${purchase.stage_number}</dd>
        <dt>Price</dt><dd>$${Number(purchase.token_price).toFixed(6)}</dd>
        <dt>TX hash</dt><dd>${escapeHtml(purchase.tx_hash)}</dd>
        <dt>Wallet</dt><dd>${escapeHtml(purchase.sender_wallet)}</dd>
        <dt>Created</dt><dd>${formatDate(purchase.created_at)}</dd>
      </dl>
      <div class="request-actions">
        <button class="approve-button" type="button" data-action="Approved" data-id="${escapeHtml(purchase.id)}">Approve</button>
        <button class="reject-button" type="button" data-action="Rejected" data-id="${escapeHtml(purchase.id)}">Reject</button>
      </div>
    </div>
  `;
}

function formatDate(value) {
  if (!value) return "-";
  return dateTime.format(new Date(value));
}

async function reviewPurchase(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  try {
    button.disabled = true;
    await api("/api/admin/review", {
      method: "POST",
      body: JSON.stringify({
        purchaseId: button.dataset.id,
        action: button.dataset.action
      })
    });
    await Promise.all([loadPurchases(), loadUsers()]);
  } catch (error) {
    alert(error.message);
    button.disabled = false;
  }
}

async function unlock(event) {
  event.preventDefault();
  adminPasscode = elements.adminCode.value.trim();
  sessionStorage.setItem("figmas_admin_passcode", adminPasscode);
  elements.adminMessage.textContent = "Loading dashboard...";
  await Promise.all([loadUsers(), loadPurchases()]);
  elements.adminMessage.textContent = "Dashboard unlocked.";
}

elements.adminLogin.addEventListener("submit", unlock);
elements.refreshUsers.addEventListener("click", loadUsers);
elements.refreshPurchases.addEventListener("click", loadPurchases);
elements.purchaseList.addEventListener("click", reviewPurchase);

if (adminPasscode) {
  elements.adminCode.value = adminPasscode;
  Promise.all([loadUsers(), loadPurchases()]);
}
