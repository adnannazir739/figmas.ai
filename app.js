const CONFIG = {
  tokenSymbol: "FGMS",
  totalSupply: 1_000_000_000,
  launchCirculation: 100_000_000,
  stageCount: 8,
  stageLengthDays: 7,
  stageOnePrice: 0.01,
  stageIncrease: 1.25,
  presaleStart: "2026-07-17T00:00:00+02:00",
  launchDate: "2026-10-01T00:00:00+02:00",
  walletAddress: "Add your wallet address in app.js",
  network: "Add network, for example BSC BEP20 or TRC20",
  adminPasscode: "FIGMAS-OWNER-2026"
};

const store = {
  get(key, fallback) {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  },
  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }
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
  purchaseForm: document.querySelector("#purchaseForm"),
  buyerEmail: document.querySelector("#buyerEmail"),
  usdtAmount: document.querySelector("#usdtAmount"),
  txHash: document.querySelector("#txHash"),
  senderWallet: document.querySelector("#senderWallet"),
  tokenQuote: document.querySelector("#tokenQuote"),
  openAuth: document.querySelector("#openAuth"),
  closeAuth: document.querySelector("#closeAuth"),
  authModal: document.querySelector("#authModal"),
  authForm: document.querySelector("#authForm"),
  authEmail: document.querySelector("#authEmail"),
  userSummary: document.querySelector("#userSummary"),
  refreshUser: document.querySelector("#refreshUser"),
  unlockAdmin: document.querySelector("#unlockAdmin"),
  adminCode: document.querySelector("#adminCode"),
  adminList: document.querySelector("#adminList")
};

let adminUnlocked = false;
let activeSlide = 0;

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

function getRequests() {
  return store.get("figmas_requests", []);
}

function saveRequests(requests) {
  store.set("figmas_requests", requests);
}

function getCurrentUser() {
  return store.get("figmas_user", null);
}

function setCurrentUser(email) {
  store.set("figmas_user", { email, createdAt: new Date().toISOString() });
  elements.buyerEmail.value = email;
  elements.openAuth.textContent = email;
  renderUserPanel();
}

function renderUserPanel() {
  const user = getCurrentUser();
  if (!user) {
    elements.userSummary.className = "empty-state";
    elements.userSummary.textContent = "Sign in or submit a purchase to see allocations.";
    return;
  }

  const requests = getRequests().filter((request) => request.email.toLowerCase() === user.email.toLowerCase());
  if (!requests.length) {
    elements.userSummary.className = "empty-state";
    elements.userSummary.textContent = `Signed in as ${user.email}. No purchase requests yet.`;
    return;
  }

  const approvedTokens = requests
    .filter((request) => request.status === "Approved")
    .reduce((sum, request) => sum + request.tokens, 0);
  const pendingTokens = requests
    .filter((request) => request.status === "Pending")
    .reduce((sum, request) => sum + request.tokens, 0);

  elements.userSummary.className = "request-list";
  elements.userSummary.innerHTML = `
    <div class="request-card">
      <dl>
        <dt>Email</dt><dd>${user.email}</dd>
        <dt>Approved</dt><dd>${number.format(approvedTokens)} ${CONFIG.tokenSymbol}</dd>
        <dt>Pending</dt><dd>${number.format(pendingTokens)} ${CONFIG.tokenSymbol}</dd>
      </dl>
    </div>
    ${requests.map(renderRequestCard).join("")}
  `;
}

function renderRequestCard(request) {
  return `
    <div class="request-card">
      <strong>${request.status} transfer</strong>
      <dl>
        <dt>USDT</dt><dd>${number.format(request.usdt)} USDT</dd>
        <dt>Tokens</dt><dd>${number.format(request.tokens)} ${CONFIG.tokenSymbol}</dd>
        <dt>Price</dt><dd>${formatPrice(request.price)}</dd>
        <dt>TX hash</dt><dd>${request.txHash}</dd>
        <dt>Wallet</dt><dd>${request.senderWallet}</dd>
      </dl>
    </div>
  `;
}

function renderAdmin() {
  if (!adminUnlocked) {
    elements.adminList.className = "request-list locked";
    elements.adminList.textContent = "Owner dashboard locked.";
    return;
  }

  const requests = getRequests();
  elements.adminList.className = "request-list";
  if (!requests.length) {
    elements.adminList.innerHTML = '<div class="empty-state">No transfer requests yet.</div>';
    return;
  }

  elements.adminList.innerHTML = requests
    .map((request) => `
      <div class="request-card">
        <strong>${request.email}</strong>
        <dl>
          <dt>Status</dt><dd>${request.status}</dd>
          <dt>USDT</dt><dd>${number.format(request.usdt)} USDT</dd>
          <dt>Tokens</dt><dd>${number.format(request.tokens)} ${CONFIG.tokenSymbol}</dd>
          <dt>Stage</dt><dd>Stage ${request.stage}</dd>
          <dt>TX hash</dt><dd>${request.txHash}</dd>
          <dt>Wallet</dt><dd>${request.senderWallet}</dd>
        </dl>
        <div class="request-actions">
          <button class="approve-button" type="button" data-action="approve" data-id="${request.id}">Approve</button>
          <button class="reject-button" type="button" data-action="reject" data-id="${request.id}">Reject</button>
        </div>
      </div>
    `)
    .join("");
}

function handlePurchase(event) {
  event.preventDefault();
  const email = elements.buyerEmail.value.trim();
  const usdt = Number(elements.usdtAmount.value);
  const txHash = elements.txHash.value.trim();
  const senderWallet = elements.senderWallet.value.trim();
  const { stage } = getCurrentStage();

  if (!email || !usdt || !txHash || !senderWallet) return;

  const request = {
    id: crypto.randomUUID(),
    email,
    usdt,
    txHash,
    senderWallet,
    stage: stage.number,
    price: stage.price,
    tokens: usdt / stage.price,
    status: "Pending",
    createdAt: new Date().toISOString()
  };

  saveRequests([request, ...getRequests()]);
  setCurrentUser(email);
  elements.purchaseForm.reset();
  renderQuote();
  renderAdmin();
  alert("Verification pending. The owner can now approve this transfer from the dashboard.");
}

function handleAdminAction(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const requests = getRequests().map((request) => {
    if (request.id !== button.dataset.id) return request;
    return {
      ...request,
      status: button.dataset.action === "approve" ? "Approved" : "Rejected",
      reviewedAt: new Date().toISOString()
    };
  });
  saveRequests(requests);
  renderAdmin();
  renderUserPanel();
}

function openModal() {
  const user = getCurrentUser();
  elements.authEmail.value = user?.email || "";
  elements.authModal.classList.add("is-open");
  elements.authModal.setAttribute("aria-hidden", "false");
  elements.authEmail.focus();
}

function closeModal() {
  elements.authModal.classList.remove("is-open");
  elements.authModal.setAttribute("aria-hidden", "true");
}

function init() {
  const finalPresalePrice = stagePrice(CONFIG.stageCount - 1);
  elements.finalPrice.textContent = formatPrice(finalPresalePrice);
  elements.launchPriceText.textContent = formatPrice(finalPresalePrice);
  elements.projectWallet.textContent = CONFIG.walletAddress;
  elements.projectNetwork.textContent = `Network: ${CONFIG.network}`;

  const user = getCurrentUser();
  if (user) {
    elements.buyerEmail.value = user.email;
    elements.openAuth.textContent = user.email;
  }

  renderStages();
  updateCountdown();
  renderUserPanel();
  renderAdmin();

  setInterval(updateCountdown, 1000);
  setInterval(renderStages, 60000);
  setInterval(() => {
    activeSlide = (activeSlide + 1) % elements.slides.length;
    elements.slides.forEach((slide, index) => slide.classList.toggle("is-active", index === activeSlide));
    elements.slideDots.forEach((dot, index) => dot.classList.toggle("is-active", index === activeSlide));
  }, 6200);

  elements.usdtAmount.addEventListener("input", renderQuote);
  elements.purchaseForm.addEventListener("submit", handlePurchase);
  elements.copyWallet.addEventListener("click", async () => {
    await navigator.clipboard.writeText(CONFIG.walletAddress);
    elements.copyWallet.textContent = "Copied";
    setTimeout(() => {
      elements.copyWallet.textContent = "Copy";
    }, 1400);
  });
  elements.openAuth.addEventListener("click", openModal);
  elements.closeAuth.addEventListener("click", closeModal);
  elements.authModal.addEventListener("click", (event) => {
    if (event.target === elements.authModal) closeModal();
  });
  elements.authForm.addEventListener("submit", (event) => {
    event.preventDefault();
    setCurrentUser(elements.authEmail.value.trim());
    closeModal();
  });
  elements.refreshUser.addEventListener("click", renderUserPanel);
  elements.unlockAdmin.addEventListener("click", () => {
    if (elements.adminCode.value === CONFIG.adminPasscode) {
      adminUnlocked = true;
      renderAdmin();
      return;
    }
    alert("Invalid owner passcode.");
  });
  elements.adminList.addEventListener("click", handleAdminAction);
}

init();
