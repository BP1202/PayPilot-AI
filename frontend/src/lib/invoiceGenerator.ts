import { Transaction, Business, User } from "@/types";

export function formatCurrency(amount: string | number, currency: string = "USD"): string {
  const num = typeof amount === "string" ? parseFloat(amount || "0") : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(num);
}

export function formatDate(isoDate: string): string {
  try {
    return new Date(isoDate).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return isoDate;
  }
}

export function generateInvoiceHtml(
  transaction: Transaction,
  business?: Business | null,
  currentUser?: User | null
): string {
  const isPaid = transaction.status === "COMPLETED";
  const invoiceNumber = transaction.transaction_ref.startsWith("TXN-")
    ? transaction.transaction_ref.replace("TXN-", "INV-")
    : `INV-${transaction.transaction_ref}`;

  const formattedTotal = formatCurrency(transaction.amount, transaction.currency);
  const formattedDate = formatDate(transaction.created_at);

  const payeeName = currentUser?.full_name || business?.name || "Commercial Participant";
  const payeeEmail = currentUser?.email || "verified-participant@opnly.network";
  const payerName = transaction.customer_name || "Commercial Counterparty";
  const payerEmail = transaction.customer_email || "counterparty@opnly.network";

  const description = transaction.description || "Core Architecture & Milestone Deliverables";
  const paymentRail = transaction.payment_method || "PAYPAL_SANDBOX";
  const captureId = transaction.paypal_capture_id || transaction.provider_reference || "N/A";
  const orderId = transaction.paypal_order_id || "N/A";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoiceNumber} - Opnly Opportunity Network</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background-color: #f8fafc;
      padding: 40px 20px;
      line-height: 1.5;
    }
    .invoice-card {
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 20px;
      padding: 48px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 36px;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 28px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .logo-badge {
      width: 44px;
      height: 44px;
      background: linear-gradient(135deg, #4f46e5, #7c3aed);
      color: #ffffff;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      font-weight: 900;
    }
    .brand-title {
      font-size: 24px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.5px;
    }
    .brand-sub {
      font-size: 12px;
      color: #64748b;
      margin-top: 2px;
      font-weight: 500;
    }
    .status-badge {
      display: inline-block;
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    .status-paid {
      background: #ecfdf5;
      color: #047857;
      border: 1px solid #a7f3d0;
    }
    .status-pending {
      background: #fffbeb;
      color: #b45309;
      border: 1px solid #fde68a;
    }
    .invoice-meta {
      text-align: right;
    }
    .invoice-num {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 15px;
      font-weight: 700;
      color: #1e293b;
    }
    .invoice-date {
      font-size: 12px;
      color: #64748b;
      margin-top: 4px;
    }
    .parties-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 24px;
      margin-bottom: 32px;
    }
    .party-title {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #94a3b8;
      margin-bottom: 8px;
    }
    .party-name {
      font-size: 15px;
      font-weight: 700;
      color: #0f172a;
    }
    .party-sub {
      font-size: 12px;
      color: #64748b;
      margin-top: 2px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
    }
    th {
      background: #f8fafc;
      text-align: left;
      font-size: 12px;
      font-weight: 700;
      color: #475569;
      padding: 12px 16px;
      border-bottom: 1px solid #e2e8f0;
    }
    th.text-right, td.text-right {
      text-align: right;
    }
    th.text-center, td.text-center {
      text-align: center;
    }
    td {
      padding: 16px;
      font-size: 13px;
      color: #1e293b;
      border-bottom: 1px solid #f1f5f9;
    }
    .item-title {
      font-weight: 700;
      color: #0f172a;
    }
    .item-desc {
      font-size: 11px;
      color: #64748b;
      margin-top: 4px;
    }
    .totals-area {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px 24px;
      margin-bottom: 28px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      color: #475569;
      margin-bottom: 8px;
    }
    .total-row.final {
      font-size: 18px;
      font-weight: 800;
      color: #0f172a;
      border-top: 2px solid #e2e8f0;
      padding-top: 12px;
      margin-top: 8px;
      margin-bottom: 0;
    }
    .total-highlight {
      color: #4338ca;
    }
    .audit-box {
      background: #eef2ff;
      border: 1px solid #c7d2fe;
      border-radius: 14px;
      padding: 18px 20px;
      margin-bottom: 28px;
      font-size: 12px;
      color: #312e81;
    }
    .audit-title {
      font-weight: 800;
      font-size: 13px;
      margin-bottom: 4px;
      color: #1e1b4b;
    }
    .audit-row {
      margin-top: 4px;
    }
    .audit-mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-weight: 600;
    }
    .footer {
      text-align: center;
      font-size: 11px;
      color: #94a3b8;
      border-top: 1px solid #f1f5f9;
      padding-top: 20px;
    }
    @media print {
      body { background: #ffffff; padding: 0; }
      .invoice-card { border: none; box-shadow: none; padding: 20px; max-width: 100%; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="invoice-card">
    <div class="header">
      <div class="brand">
        <div class="logo-badge">O</div>
        <div>
          <h1 class="brand-title">Opnly Invoice</h1>
          <p class="brand-sub">AI-Powered Commercial Opportunity Network</p>
        </div>
      </div>
      <div class="invoice-meta">
        <span class="status-badge ${isPaid ? "status-paid" : "status-pending"}">
          ${isPaid ? "PAID & SETTLED" : "PENDING RELEASE"}
        </span>
        <div class="invoice-num">${invoiceNumber}</div>
        <div class="invoice-date">Issued: ${formattedDate}</div>
      </div>
    </div>

    <div class="parties-grid">
      <div>
        <div class="party-title">Issued By (Payee)</div>
        <div class="party-name">${payeeName}</div>
        <div class="party-sub">${payeeEmail}</div>
        <div class="party-sub">Verified Commercial Participant</div>
      </div>
      <div>
        <div class="party-title">Billed To (Client / Counterparty)</div>
        <div class="party-name">${payerName}</div>
        <div class="party-sub">${payerEmail}</div>
        <div class="party-sub">Contractual Deal Room Partner</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Deliverable & Scope</th>
          <th class="text-center" style="width: 80px;">Stage</th>
          <th class="text-right" style="width: 130px;">Rate</th>
          <th class="text-right" style="width: 130px;">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <div class="item-title">${description}</div>
            <div class="item-desc">Accepted milestone deliverable under bilateral commercial agreement.</div>
          </td>
          <td class="text-center" style="font-family: ui-monospace, monospace;">1</td>
          <td class="text-right" style="font-family: ui-monospace, monospace;">${formattedTotal}</td>
          <td class="text-right" style="font-weight: 700; font-family: ui-monospace, monospace;">${formattedTotal}</td>
        </tr>
      </tbody>
    </table>

    <div class="totals-area">
      <div class="total-row">
        <span>Subtotal</span>
        <span style="font-family: ui-monospace, monospace;">${formattedTotal}</span>
      </div>
      <div class="total-row">
        <span>Opnly Direct Settlement Platform Fee (0%)</span>
        <span style="font-family: ui-monospace, monospace;">$0.00</span>
      </div>
      <div class="total-row final">
        <span>Total ${isPaid ? "Settled" : "Payable"}</span>
        <span class="total-highlight" style="font-family: ui-monospace, monospace;">${formattedTotal} ${transaction.currency}</span>
      </div>
    </div>

    <div class="audit-box">
      <div class="audit-title">Verified Payment Provenance & Ledger Sync</div>
      <div class="audit-row">
        Payment Rail: <strong>${paymentRail}</strong> &middot; Transaction Ref: <span class="audit-mono">${transaction.transaction_ref}</span>
      </div>
      ${transaction.deal_room_id ? `<div class="audit-row">Deal Room ID: <span class="audit-mono">${transaction.deal_room_id}</span> &middot; Milestone ID: <span class="audit-mono">${transaction.milestone_id || "N/A"}</span></div>` : ""}
      ${isPaid ? `<div class="audit-row">PayPal Capture ID: <span class="audit-mono">${captureId}</span> &middot; Order ID: <span class="audit-mono">${orderId}</span></div>` : ""}
    </div>

    <div class="footer">
      Official commercial invoice generated by Opnly Opportunity Network &middot; Registered Commercial Ledger Transaction
    </div>
  </div>
</body>
</html>`;
}

export function downloadInvoiceFile(
  transaction: Transaction,
  business?: Business | null,
  currentUser?: User | null
): void {
  const html = generateInvoiceHtml(transaction, business, currentUser);
  const invoiceNumber = transaction.transaction_ref.startsWith("TXN-")
    ? transaction.transaction_ref.replace("TXN-", "INV-")
    : `INV-${transaction.transaction_ref}`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Invoice-${invoiceNumber}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
