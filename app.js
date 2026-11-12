const STORAGE_KEY = "vitta-demo-account-v1";
const INITIAL_BALANCE = 8450.90;
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
let storageLoadFailed = false;

const initialTransactions = [
  { id: "initial-1", title: "Salário", detail: "Pagamento recebido", date: "2026-11-10", amount: 5200, type: "entrada", icon: "↙" },
  { id: "initial-2", title: "Mercado Pão de Açúcar", detail: "Cartão de débito", date: "2026-11-09", amount: -284.65, type: "saida", icon: "▣" },
  { id: "initial-3", title: "Pix recebido · Lucas M.", detail: "Pix recebido", date: "2026-11-08", amount: 150, type: "entrada", icon: "✳" },
  { id: "initial-4", title: "Netflix", detail: "Assinatura mensal", date: "2026-11-07", amount: -55.90, type: "saida", icon: "▣" },
  { id: "initial-5", title: "Farmácia São João", detail: "Cartão de débito", date: "2026-11-05", amount: -86.40, type: "saida", icon: "▣" },
  { id: "initial-6", title: "Freelance · Projeto Aurora", detail: "Transferência recebida", date: "2026-11-03", amount: 890, type: "entrada", icon: "↙" },
  { id: "initial-7", title: "Academia Movimento", detail: "Mensalidade", date: "2026-11-01", amount: -119.90, type: "saida", icon: "▣" },
  { id: "initial-8", title: "Conta de luz", detail: "Pagamento de conta", date: "2026-10-28", amount: -178.20, type: "saida", icon: "▣" },
];

function loadAccount() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return { balance: INITIAL_BALANCE, transactions: initialTransactions };
    const account = JSON.parse(saved);
    if (typeof account.balance !== "number" || !Array.isArray(account.transactions)) throw new Error("Dados da conta inválidos.");
    return account;
  } catch (error) {
    console.error("Não foi possível carregar os dados locais da conta demonstrativa.", error);
    storageLoadFailed = true;
    return { balance: INITIAL_BALANCE, transactions: initialTransactions };
  }
}

let account = loadAccount();
let pendingTransfer = null;
let balanceVisible = true;
let toastTimeout;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function saveAccount(nextAccount) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextAccount));
    return true;
  } catch (error) {
    console.error("Não foi possível salvar as alterações da conta demonstrativa.", error);
    showToast("Não foi possível salvar os dados neste navegador.", true);
    return false;
  }
}

function parseCurrency(value) {
  const digits = String(value).replace(/\D/g, "");
  return digits ? Number(digits) / 100 : 0;
}

function formatCurrencyInput(input) {
  const amount = parseCurrency(input.value);
  input.value = amount ? amount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "";
}

function formatDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR").format(new Date(year, month - 1, day));
}

function localDateISO(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

function showToast(message, isError = false) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.toggle("error-toast", isError);
  toast.classList.add("show");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove("show"), 3500);
}

function renderTransaction(transaction) {
  const incoming = transaction.type === "entrada";
  const signedAmount = `${incoming ? "+" : "−"} ${money.format(Math.abs(transaction.amount))}`;
  return `<div class="transaction-row">
    <div class="transaction-description"><span class="transaction-icon ${incoming ? "income" : "outgoing"}">${escapeHTML(transaction.icon || (incoming ? "↙" : "↗"))}</span><span><strong>${escapeHTML(transaction.title)}</strong><small>${escapeHTML(transaction.detail)}</small></span></div>
    <span class="transaction-date">${formatDate(transaction.date)}</span>
    <span class="transaction-amount ${incoming ? "income" : "outgoing"}">${signedAmount}</span>
    <span class="transaction-status">›</span>
  </div>`;
}

function renderAccount() {
  const formattedBalance = money.format(account.balance);
  $("#balance-value").textContent = balanceVisible ? formattedBalance : "R$ ••••••";
  $("#transfer-balance").textContent = formattedBalance;
  $("#statement-balance").textContent = formattedBalance;
  $("#recent-transactions").innerHTML = account.transactions.slice(0, 4).map(renderTransaction).join("");
  renderStatement();
}

function renderStatement(startDate = "", endDate = "", type = "all") {
  const filtered = account.transactions.filter((transaction) => {
    if (startDate && transaction.date < startDate) return false;
    if (endDate && transaction.date > endDate) return false;
    if (type !== "all" && transaction.type !== type) return false;
    return true;
  });
  $("#statement-transactions").innerHTML = filtered.map(renderTransaction).join("");
  $("#empty-transactions").classList.toggle("hidden", filtered.length > 0);
  $("#statement-count").textContent = `${filtered.length} ${filtered.length === 1 ? "movimentação encontrada" : "movimentações encontradas"}`;
}

function navigate(page) {
  const titles = { inicio: "Visão geral", pix: "Área Pix", transferir: "Transferir", extrato: "Extrato" };
  if (!titles[page]) return;
  $$(".page").forEach((section) => section.classList.toggle("active-page", section.id === `page-${page}`));
  $$(".nav-item, .mobile-nav button").forEach((button) => button.classList.toggle("active", button.dataset.page === page));
  $("#page-breadcrumb").textContent = titles[page];
  $("#sidebar").classList.remove("mobile-open");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function documentIsValid(value) {
  const digits = value.replace(/\D/g, "");
  if (/^(\d)\1+$/.test(digits)) return false;
  if (digits.length === 11) {
    const check = (length) => {
      const sum = digits.slice(0, length).split("").reduce((total, digit, index) => total + Number(digit) * (length + 1 - index), 0);
      const result = (sum * 10) % 11;
      return (result === 10 ? 0 : result) === Number(digits[length]);
    };
    return check(9) && check(10);
  }
  if (digits.length === 14) {
    const calculate = (base, weights) => {
      const sum = base.split("").reduce((total, digit, index) => total + Number(digit) * weights[index], 0);
      const remainder = sum % 11;
      return remainder < 2 ? 0 : 11 - remainder;
    };
    const first = calculate(digits.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    const second = calculate(digits.slice(0, 12) + first, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    return first === Number(digits[12]) && second === Number(digits[13]);
  }
  return false;
}

function openReview(transfer) {
  pendingTransfer = transfer;
  $("#review-recipient").textContent = transfer.recipient;
  $("#review-destination").textContent = transfer.destination;
  $("#review-amount").textContent = money.format(transfer.amount);
  $("#review-description").textContent = transfer.description || "—";
  $("#modal-error").textContent = "";
  $("#confirm-modal").classList.remove("hidden");
  $("#close-modal").focus();
}

function closeReview() {
  $("#confirm-modal").classList.add("hidden");
  pendingTransfer = null;
}

function completeTransfer() {
  if (!pendingTransfer) return;
  if (pendingTransfer.amount > account.balance) {
    $("#modal-error").textContent = `Saldo insuficiente. Seu saldo disponível é ${money.format(account.balance)}.`;
    return;
  }
  const completedAmount = pendingTransfer.amount;
  const nextAccount = {
    balance: Math.round((account.balance - completedAmount) * 100) / 100,
    transactions: [{
      id: `${Date.now()}`,
      title: pendingTransfer.title,
      detail: pendingTransfer.detail,
      date: localDateISO(),
      amount: -pendingTransfer.amount,
      type: "saida",
      icon: pendingTransfer.icon || "↗",
    }, ...account.transactions],
  };
  if (!saveAccount(nextAccount)) return;
  account = nextAccount;
  renderAccount();
  closeReview();
  $("#transfer-form").reset();
  $("#pix-form").reset();
  $("#transfer-error").textContent = "";
  $("#pix-error").textContent = "";
  showToast(`Transferência de ${money.format(completedAmount)} realizada com sucesso!`);
  navigate("inicio");
}

function init() {
  const now = new Date();
  $("#today-label").textContent = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(now);
  $(".welcome-row .eyebrow").textContent = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(now).toUpperCase();
  $("#filter-end").value = localDateISO(now);
  renderAccount();
  if (storageLoadFailed) showToast("Não foi possível carregar os dados salvos. A conta demonstrativa foi reiniciada.", true);

  $("#demo-login").addEventListener("click", () => {
    $("#login-screen").classList.add("hidden");
    $("#app-screen").classList.remove("hidden");
  });
  $("#login-form").addEventListener("submit", (event) => {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;
    $("#login-error").textContent = "";
    $("#login-screen").classList.add("hidden");
    $("#app-screen").classList.remove("hidden");
  });
  $(".password-toggle").addEventListener("click", () => {
    const password = $("#login-password");
    const visible = password.type === "text";
    password.type = visible ? "password" : "text";
    $(".password-toggle").setAttribute("aria-label", visible ? "Mostrar senha" : "Ocultar senha");
  });
  $("#forgot-password").addEventListener("click", () => showToast("Para redefinir a senha, entre em contato com o suporte.", true));
  $("#signup-link").addEventListener("click", (event) => { event.preventDefault(); showToast("A abertura de conta estará disponível em breve."); });
  $("#support-button").addEventListener("click", () => showToast("Nosso atendimento está disponível no app Vitta."));
  $("#profile-button").addEventListener("click", () => showToast("Você está usando a conta demonstrativa."));
  $("#mobile-menu").addEventListener("click", () => $("#sidebar").classList.toggle("mobile-open"));
  document.addEventListener("click", (event) => {
    const pageButton = event.target.closest("[data-page]");
    if (pageButton) { event.preventDefault(); navigate(pageButton.dataset.page); }
  });

  $$(".currency-input input").forEach((input) => input.addEventListener("input", () => formatCurrencyInput(input)));
  $("#toggle-balance").addEventListener("click", () => {
    balanceVisible = !balanceVisible;
    $("#toggle-balance").setAttribute("aria-label", balanceVisible ? "Ocultar saldo" : "Mostrar saldo");
    renderAccount();
  });

  $("#transfer-document").addEventListener("input", (event) => {
    let digits = event.target.value.replace(/\D/g, "").slice(0, 14);
    if (digits.length <= 11) digits = digits.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    else digits = digits.replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2");
    event.target.value = digits;
  });
  $("#transfer-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    $("#transfer-error").textContent = "";
    if (!form.reportValidity()) return;
    const name = $("#transfer-name").value.trim();
    const document = $("#transfer-document").value;
    const amount = parseCurrency($("#transfer-amount").value);
    if (name.length < 3) { $("#transfer-error").textContent = "Informe o nome completo de quem vai receber."; return; }
    if (!documentIsValid(document)) { $("#transfer-error").textContent = "Confira o CPF ou CNPJ. O número informado não é válido."; $("#transfer-document").focus(); return; }
    if (!/^\d{1,6}$/.test($("#transfer-agency").value.trim())) { $("#transfer-error").textContent = "Informe uma agência com até 6 números."; $("#transfer-agency").focus(); return; }
    if (!/^\d{1,15}(?:-\d{1,2})?$/.test($("#transfer-account").value.trim())) { $("#transfer-error").textContent = "Confira o número da conta e o dígito."; $("#transfer-account").focus(); return; }
    if (!amount || amount <= 0) { $("#transfer-error").textContent = "Informe um valor de transferência maior que R$ 0,00."; $("#transfer-amount").focus(); return; }
    if (amount > account.balance) { $("#transfer-error").textContent = `Saldo insuficiente. Você tem ${money.format(account.balance)} disponíveis na conta.`; $("#transfer-amount").focus(); return; }
    openReview({ recipient: name, destination: `${$("#transfer-bank").value} · Ag. ${$("#transfer-agency").value} · Conta ${$("#transfer-account").value}`, amount, description: $("#transfer-description").value.trim(), title: `Transferência para ${name}`, detail: `Transferência · ${$("#transfer-bank").value}`, icon: "↗" });
  });

  $("#pix-key-type").addEventListener("change", () => {
    const placeholders = { cpf: "000.000.000-00", email: "nome@email.com", phone: "(11) 99999-9999", random: "Cole a chave aleatória" };
    $("#pix-key").placeholder = placeholders[$("#pix-key-type").value] || "Digite a chave Pix";
    $("#pix-key").type = $("#pix-key-type").value === "email" ? "email" : "text";
  });
  $("#pix-key").addEventListener("input", (event) => {
    if ($("#pix-key-type").value === "cpf") {
      event.target.value = event.target.value.replace(/\D/g, "").slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    } else if ($("#pix-key-type").value === "phone") {
      const digits = event.target.value.replace(/\D/g, "").slice(0, 11);
      event.target.value = digits.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
    }
  });
  $("#pix-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    $("#pix-error").textContent = "";
    if (!form.reportValidity()) return;
    const keyType = $("#pix-key-type").value;
    const key = $("#pix-key").value.trim();
    const recipient = $("#pix-recipient").value.trim();
    const amount = parseCurrency($("#pix-amount").value);
    if (keyType === "cpf" && !documentIsValid(key)) { $("#pix-error").textContent = "Confira a chave Pix. O CPF informado não é válido."; $("#pix-key").focus(); return; }
    if (keyType === "phone" && ![10, 11].includes(key.replace(/\D/g, "").length)) { $("#pix-error").textContent = "Informe um celular com DDD e número completo."; $("#pix-key").focus(); return; }
    if (keyType === "random" && !/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(key)) { $("#pix-error").textContent = "Informe uma chave aleatória válida."; $("#pix-key").focus(); return; }
    if (!recipient) { $("#pix-error").textContent = "Informe o nome de quem vai receber o Pix."; return; }
    if (!amount || amount <= 0) { $("#pix-error").textContent = "Informe um valor para o Pix maior que R$ 0,00."; $("#pix-amount").focus(); return; }
    if (amount > account.balance) { $("#pix-error").textContent = `Saldo insuficiente. Você tem ${money.format(account.balance)} disponíveis na conta.`; $("#pix-amount").focus(); return; }
    const keyLabels = { cpf: "CPF", email: "E-mail", phone: "Celular", random: "Chave aleatória" };
    openReview({ recipient, destination: `${keyLabels[keyType]} · ${key}`, amount, description: $("#pix-description").value.trim(), title: `Pix para ${recipient}`, detail: "Pix enviado", icon: "✳" });
  });

  $("#confirm-transfer").addEventListener("click", completeTransfer);
  $("#close-modal").addEventListener("click", closeReview);
  $("#cancel-transfer").addEventListener("click", closeReview);
  $("#confirm-modal").addEventListener("click", (event) => { if (event.target.id === "confirm-modal") closeReview(); });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") { closeReview(); $("#sidebar").classList.remove("mobile-open"); } });

  $("#filter-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const start = $("#filter-start").value;
    const end = $("#filter-end").value;
    $("#filter-error").textContent = "";
    if (start && end && start > end) {
      $("#filter-error").textContent = "A data inicial não pode ser posterior à data final.";
      $("#filter-start").focus();
      return;
    }
    renderStatement(start, end, $("#filter-type").value);
  });
  $("#clear-filters").addEventListener("click", () => {
    $("#filter-form").reset();
    $("#filter-end").value = localDateISO();
    $("#filter-error").textContent = "";
    renderStatement("", $("#filter-end").value, "all");
  });
  $("#download-statement").addEventListener("click", () => {
    const start = $("#filter-start").value;
    const end = $("#filter-end").value;
    const type = $("#filter-type").value;
    const filtered = account.transactions.filter((transaction) => (!start || transaction.date >= start) && (!end || transaction.date <= end) && (type === "all" || transaction.type === type));
    const rows = [["Data", "Descrição", "Detalhes", "Tipo", "Valor"], ...filtered.map((item) => [formatDate(item.date), item.title, item.detail, item.type === "entrada" ? "Entrada" : "Saída", item.amount.toFixed(2).replace(".", ",")])];
    const csv = `\uFEFF${rows.map((row) => row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(";")).join("\r\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "extrato-vitta.csv";
    link.click();
    URL.revokeObjectURL(url);
    showToast("Seu extrato foi baixado.");
  });
}

init();
