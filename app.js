const CONFIG = {
  tokenSymbol: "FGMS",
  stageCount: 8,
  stageLengthDays: 7,
  stageOnePrice: 0.01,
  stageIncrease: 1.25,
  presaleStart: "2026-07-17T00:00:00+02:00",
  launchDate: "2026-10-01T00:00:00+02:00",
  walletAddress: "Add your wallet address in app.js",
  network: "Add network, for example BSC BEP20 or TRC20"
};

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 4,
  maximumFractionDigits: 6
});

const number = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2
});

const shortDate = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric"
});

const elements = {
  slides: document.querySelectorAll(".hero-slide"),
  slideDots: document.querySelectorAll("#slideDots span"),
  stageRows: document.querySelector("#stageRows"),
  days: document.querySelector("#days"),
  hours: document.querySelector("#hours"),
  minutes: document.querySelector("#minutes"),
  seconds: document.querySelector("#seconds"),
  stageName: document.querySelector("#stageName"),
  stageStatus: document.querySelector("#stageStatus"),
  stageWindow: document.querySelector("#stageWindow"),
  heroPrice: document.querySelector("#heroPrice"),
  finalPrice: document.querySelector("#finalPrice"),
  launchPriceText: document.querySelector("#launchPriceText"),
  projectWallet: document.querySelector("#projectWallet"),
  projectNetwork: document.querySelector("#projectNetwork"),
  copyWallet: document.querySelector("#copyWallet"),
  balanceChip: document.querySelector("#balanceChip"),
  purchaseForm: document.querySelector("#purchaseForm"),
  buyerEmail: document.querySelector("#buyerEmail"),
  usdtAmount: document.querySelector("#usdtAmount"),
  txHash: document.querySelector("#txHash"),
  senderWallet: document.querySelector("#senderWallet"),
  tokenQuote: document.querySelector("#tokenQuote"),
  purchaseNote: document.querySelector("#purchaseNote"),
  openAuth: document.querySelector("#openAuth"),
  closeAuth: document.querySelector("#closeAuth"),
  authModal: document.querySelector("#authModal"),
  authForm: document.querySelector("#authForm"),
  authName: document.querySelector("#authName"),
  authEmail: document.querySelector("#authEmail"),
  authPassword: document.querySelector("#authPassword"),
  authSubmit: document.querySelector("#authSubmit"),
  authMessage: document.querySelector("#authMessage"),
  signupTab: document.querySelector("#signupTab"),
  signinTab: document.querySelector("#signinTab"),
  nameField: document.querySelector("#nameField"),
  userSummary: document.querySelector("#userSummary"),
  refreshUser: document.querySelector("#refreshUser")
};

let activeSlide = 0;
let authMode = "signup";
let currentAccount = { user: null, summary: null, purchases: [] };

function stagePrice(index) {
  return CONFIG.stageOnePrice * CONFIG.stageIncrease ** index;
}

function buildStages() {
  const start = new Date(CONFIG.presaleStart);
  return Array.from({ length: CONFIG.stageCount }, (_, index) => {
    const stageStart = new Date(start.getTime() + index * CONFIG.stageLengthDays * 86400000);
    const stageEnd = new Date(stageStart.getTime() + CONFIG.stageLengthDays * 86400000);
    return {
      number: index + 1,
      start: stageStart,
      end: stageEnd,
      price: stagePrice(index)
    };
  });
}

function getCurrentStage(now = new Date()) {
  const stages = buildStages();
  const live = stages.find((stage) => now >= stage.start && now < stage.end);
  if (live) return { stage: live, status: "Live", target: live.end };
  if (now < stages[0].start) return { stage: stages[0], status: "Upcoming", target: stages[0].start };
  return { stage: stages[stages.length - 1], status: "Completed", target: new Date(CONFIG.launchDate) };
}

function formatPrice(value) {
  return currency.format(value);
}

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
      ...(options.headers || {})
    },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data;
}

function renderStages() {
  const now = new Date();
  elements.stageRows.innerHTML = buildStages()
    .map((stage) => {
      const status = now < stage.start ? "Upcoming" : now >= stage.end ? "Completed" : "Live";
      const className = status === "Live" ? "" : status === "Upcoming" ? "pending" : "done";
      return `
        <tr>
          <td>Stage ${stage.number}</td>
          <td>${shortDate.format(stage.start)} - ${shortDate.format(stage.end)}</td>
          <td>${formatPrice(stage.price)}</td>
          <td><span class="status-pill ${className}">${status}</span></td>
        </tr>
      `;
    })
    .join("");
}

function updateCountdown() {
  const current = getCurrentStage();
  const now = new Date();
  const remaining = Math.max(0, current.target - now);
  const days = Math.floor(remaining / 86400000);
  const hours = Math.floor((remaining % 86400000) / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);

  elements.days.textContent = String(days).padStart(2, "0");
  elements.hours.textContent = String(hours).padStart(2, "0");
  elements.minutes.textContent = String(minutes).padStart(2, "0");
  elements.seconds.textContent = String(seconds).padStart(2, "0");
  elements.stageName.textContent = `Stage ${current.stage.number}`;
  elements.stageStatus.textContent = current.status;
  elements.stageWindow.textContent =
    current.status === "Completed"
      ? `Presale completed. Launch countdown ends ${shortDate.format(new Date(CONFIG.launchDate))}.`
      : `${current.status} window: ${shortDate.format(current.stage.start)} to ${shortDate.format(current.stage.end)}.`;
  elements.heroPrice.textContent = formatPrice(current.stage.price);
  renderQuote();
}

function renderQuote() {
  const amount = Number(elements.usdtAmount.value || 0);
  const { stage } = getCurrentStage();
  const tokens = amount / stage.price;
  elements.tokenQuote.textContent = `${number.format(tokens)} ${CONFIG.tokenSymbol}`;
}

function setAuthMode(mode) {
  authMode = mode;
  elements.signupTab.classList.toggle("is-active", mode === "signup");
  elements.signinTab.classList.toggle("is-active", mode === "signin");
  elements.nameField.style.display = mode === "signup" ? "grid" : "none";
  elements.authName.required = mode === "signup";
  elements.authSubmit.textContent = mode === "signup" ? "Create account" : "Sign in";
  elements.authMessage.textContent = "";
}

function updateAccountUI() {
  const user = currentAccount.user;
  const approvedTokens = Number(currentAccount.summary?.approved_tokens || 0);
  elements.openAuth.textContent = user ? "Sign out" : "Sign in";
  elements.openAuth.title = user ? `Signed in as ${user.email}` : "Sign in";
  elements.balanceChip.textContent = `${number.format(approvedTokens)} ${CONFIG.tokenSymbol}`;
  elements.buyerEmail.value = user ? user.email : "";
  elements.purchaseForm.querySelector("button[type='submit']").disabled = !user;
  elements.purchaseNote.textContent = user
    ? "Your request will be saved to your account and show as pending until owner approval."
    : "Sign in before submitting a transfer. Your request will show as pending until the owner approves it.";
  renderUserPanel();
}

async function loadAccount() {
  try {
    currentAccount = await api("/api/auth/me", { method: "GET" });
  } catch (error) {
    currentAccount = { user: null, summary: null, purchases: [] };
  }
  updateAccountUI();
}

function renderUserPanel() {
  const { user, summary, purchases } = currentAccount;
  if (!user) {
    elements.userSummary.className = "empty-state";
    elements.userSummary.textContent = "Create an account or sign in to see your FGMS allocation.";
    return;
  }

  const approvedTokens = Number(summary?.approved_tokens || 0);
  const pendingTokens = Number(summary?.pending_tokens || 0);
  const approvedUsdt = Number(summary?.approved_usdt || 0);

  elements.userSummary.className = "request-list";
  elements.userSummary.innerHTML = `
    <div class="request-card">
      <strong>${escapeHtml(user.name)}</strong>
      <dl>
        <dt>Email</dt><dd>${escapeHtml(user.email)}</dd>
        <dt>Approved</dt><dd>${number.format(approvedTokens)} ${CONFIG.tokenSymbol}</dd>
        <dt>Pending</dt><dd>${number.format(pendingTokens)} ${CONFIG.tokenSymbol}</dd>
        <dt>Paid approved</dt><dd>${number.format(approvedUsdt)} USDT</dd>
      </dl>
    </div>
    ${
      purchases.length
        ? purchases.map(renderPurchaseCard).join("")
        : '<div class="empty-state">No transfer requests yet.</div>'
    }
  `;
}

function renderPurchaseCard(purchase) {
  return `
    <div class="request-card">
      <strong>${escapeHtml(purchase.status)} transfer</strong>
      <dl>
        <dt>USDT</dt><dd>${number.format(purchase.usdt_amount)} USDT</dd>
        <dt>Tokens</dt><dd>${number.format(purchase.token_amount)} ${escapeHtml(purchase.token_symbol)}</dd>
        <dt>Price</dt><dd>${formatPrice(purchase.token_price)}</dd>
        <dt>Stage</dt><dd>Stage ${purchase.stage_number}</dd>
        <dt>TX hash</dt><dd>${escapeHtml(purchase.tx_hash)}</dd>
        <dt>Wallet</dt><dd>${escapeHtml(purchase.sender_wallet)}</dd>
        ${purchase.admin_note ? `<dt>Note</dt><dd>${escapeHtml(purchase.admin_note)}</dd>` : ""}
      </dl>
    </div>
  `;
}

async function handlePurchase(event) {
  event.preventDefault();
  if (!currentAccount.user) {
    openModal();
    return;
  }

  const payload = {
    usdtAmount: Number(elements.usdtAmount.value),
    txHash: elements.txHash.value.trim(),
    senderWallet: elements.senderWallet.value.trim()
  };

  try {
    elements.purchaseForm.querySelector("button[type='submit']").disabled = true;
    await api("/api/purchases", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    elements.purchaseForm.reset();
    renderQuote();
    await loadAccount();
    alert("Verification pending. Your transfer request was saved to your account.");
  } catch (error) {
    alert(error.message);
  } finally {
    updateAccountUI();
  }
}

function openModal() {
  elements.authModal.classList.add("is-open");
  elements.authModal.setAttribute("aria-hidden", "false");
  elements.authEmail.focus();
}

function closeModal() {
  elements.authModal.classList.remove("is-open");
  elements.authModal.setAttribute("aria-hidden", "true");
}

async function handleAuth(event) {
  event.preventDefault();
  const payload = {
    name: elements.authName.value.trim(),
    email: elements.authEmail.value.trim(),
    password: elements.authPassword.value
  };
  const endpoint = authMode === "signup" ? "/api/auth/signup" : "/api/auth/signin";

  try {
    elements.authSubmit.disabled = true;
    elements.authMessage.textContent = authMode === "signup" ? "Creating account..." : "Signing in...";
    const result = await api(endpoint, {
      method: "POST",
      body: JSON.stringify(payload)
    });
    if (authMode === "signup") {
      setAuthMode("signin");
      elements.authMessage.innerHTML = result.verificationUrl
        ? `${escapeHtml(result.message)}<br><a href="${escapeHtml(result.verificationUrl)}">Open verification link</a>`
        : escapeHtml(result.message || "Account created. Check your email to confirm, then sign in.");
      elements.authPassword.value = "";
      return;
    }
    elements.authForm.reset();
    closeModal();
    await loadAccount();
  } catch (error) {
    elements.authMessage.textContent = error.message;
  } finally {
    elements.authSubmit.disabled = false;
  }
}

async function signOut() {
  try {
    await api("/api/auth/signout", { method: "POST", body: "{}" });
  } finally {
    currentAccount = { user: null, summary: null, purchases: [] };
    updateAccountUI();
  }
}

function initStaticUI() {
  const finalPresalePrice = stagePrice(CONFIG.stageCount - 1);
  elements.finalPrice.textContent = formatPrice(finalPresalePrice);
  elements.launchPriceText.textContent = formatPrice(finalPresalePrice);
  elements.projectWallet.textContent = CONFIG.walletAddress;
  elements.projectNetwork.textContent = `Network: ${CONFIG.network}`;

  renderStages();
  updateCountdown();

  setInterval(updateCountdown, 1000);
  setInterval(renderStages, 60000);
  setInterval(() => {
    activeSlide = (activeSlide + 1) % elements.slides.length;
    elements.slides.forEach((slide, index) => slide.classList.toggle("is-active", index === activeSlide));
    elements.slideDots.forEach((dot, index) => dot.classList.toggle("is-active", index === activeSlide));
  }, 6200);
}

function attachEvents() {
  elements.usdtAmount.addEventListener("input", renderQuote);
  elements.purchaseForm.addEventListener("submit", handlePurchase);
  elements.copyWallet.addEventListener("click", async () => {
    await navigator.clipboard.writeText(CONFIG.walletAddress);
    elements.copyWallet.textContent = "Copied";
    setTimeout(() => {
      elements.copyWallet.textContent = "Copy";
    }, 1400);
  });
  elements.openAuth.addEventListener("click", () => {
    if (currentAccount.user) {
      signOut();
      return;
    }
    openModal();
  });
  elements.closeAuth.addEventListener("click", closeModal);
  elements.authModal.addEventListener("click", (event) => {
    if (event.target === elements.authModal) closeModal();
  });
  elements.signupTab.addEventListener("click", () => setAuthMode("signup"));
  elements.signinTab.addEventListener("click", () => setAuthMode("signin"));
  elements.authForm.addEventListener("submit", handleAuth);
  elements.refreshUser.addEventListener("click", loadAccount);
}

initStaticUI();
attachEvents();
setAuthMode("signup");
if (new URLSearchParams(window.location.search).get("verified") === "1") {
  setTimeout(() => alert("Email verified. You are signed in."), 250);
}
loadAccount();
