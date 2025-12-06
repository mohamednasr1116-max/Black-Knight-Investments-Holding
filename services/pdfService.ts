import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Liability, Transaction, InventoryItem, Project, Customer, SaleOrder, InvestmentSale, Asset } from "../types";

// Helper to initialize document with title and date
const createDoc = (title: string) => {
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text(title, 14, 22);
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
  return doc;
};

// Helper to save document
const saveDoc = (doc: jsPDF, fileName: string) => {
  doc.save(`${fileName}.pdf`);
};

export const exportLiabilitiesToPDF = (liabilities: Liability[], currency: string, title: string = "Liabilities Report") => {
  const doc = createDoc(title);

  const tableColumn = ["Creditor", "Description", "Due Date", "Amount", "Status", "Source"];
  const tableRows: any[] = [];

  liabilities.forEach((debt) => {
    tableRows.push([
      debt.creditorName,
      debt.description || '-',
      debt.dueDate,
      `${currency} ${debt.amount.toLocaleString()}`,
      debt.status,
      debt.status === 'Paid' ? (debt.paymentSource || '-') : 'Pending'
    ]);
  });

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 40,
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 3 },
    headStyles: { fillColor: [220, 38, 38] }, // Red for Liabilities
    columnStyles: { 3: { halign: 'right', fontStyle: 'bold' } }
  });

  // Totals
  const totalAmount = liabilities.reduce((acc, l) => acc + l.amount, 0);
  const pendingAmount = liabilities.filter(l => l.status === 'Pending').reduce((acc, l) => acc + l.amount, 0);
  const finalY = (doc as any).lastAutoTable.finalY || 50;
  
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.text(`Total Liabilities: ${currency} ${totalAmount.toLocaleString()}`, 14, finalY + 10);
  doc.text(`Outstanding Pending: ${currency} ${pendingAmount.toLocaleString()}`, 14, finalY + 16);

  saveDoc(doc, "liabilities_report");
};

export const exportTransactionsToPDF = (transactions: Transaction[], currency: string, title: string = "Financial Transactions") => {
  const doc = createDoc(title);

  const tableColumn = ["Date", "Description", "Category", "Type", "Status", "Amount"];
  const tableRows: any[] = [];

  transactions.forEach((tx) => {
    tableRows.push([
      tx.date,
      tx.description,
      tx.category,
      tx.type,
      tx.status,
      `${currency} ${tx.amount.toLocaleString()}`
    ]);
  });

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 40,
    theme: 'striped',
    styles: { fontSize: 9 },
    headStyles: { fillColor: [79, 70, 229] }, // Indigo
    columnStyles: { 5: { halign: 'right', fontStyle: 'bold' } }
  });

  saveDoc(doc, "transactions_report");
};

export const exportFinancialReportToPDF = (reportData: any[], year: number, currency: string) => {
  const doc = createDoc(`Financial Report - FY ${year}`);

  const tableColumn = ["Period", "Revenue", "Expense", "Net Profit", "Margin (%)"];
  const tableRows: any[] = [];

  reportData.forEach((row: any) => {
    tableRows.push([
      row.Period,
      `${currency} ${row.Revenue.toLocaleString()}`,
      `${currency} ${row.Expense.toLocaleString()}`,
      `${currency} ${row['Net Profit'].toLocaleString()}`,
      `${row['Margin (%)']}%`
    ]);
  });

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 40,
    theme: 'grid',
    headStyles: { fillColor: [16, 185, 129] }, // Emerald
    columnStyles: { 
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right', fontStyle: 'bold' },
        4: { halign: 'right' }
    }
  });

  saveDoc(doc, `financial_report_${year}`);
};

export const exportInventoryToPDF = (items: InventoryItem[], currency: string) => {
  const doc = createDoc("Stock Management Report");

  const tableColumn = ["SKU", "Name", "Category", "Stock", "Reorder Pt", "Unit Price", "Value", "Status"];
  const tableRows: any[] = [];

  items.forEach((item) => {
    tableRows.push([
      item.sku,
      item.name,
      item.category,
      item.stockLevel,
      item.reorderPoint,
      `${currency} ${item.unitPrice}`,
      `${currency} ${(item.stockLevel * item.unitPrice).toLocaleString()}`,
      item.status
    ]);
  });

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 40,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [59, 130, 246] }, // Blue
    columnStyles: { 6: { halign: 'right' } }
  });

  const totalValue = items.reduce((acc, i) => acc + (i.stockLevel * i.unitPrice), 0);
  const finalY = (doc as any).lastAutoTable.finalY || 50;
  doc.text(`Total Stock Value: ${currency} ${totalValue.toLocaleString()}`, 14, finalY + 10);

  saveDoc(doc, "inventory_report");
};

export const exportProjectsToPDF = (projects: Project[], currency: string) => {
  const doc = createDoc("Projects Report");

  const tableColumn = ["Name", "Client", "Status", "Deadline", "Budget", "Progress"];
  const tableRows: any[] = [];

  projects.forEach((p) => {
    tableRows.push([
      p.name,
      p.client,
      p.status,
      p.deadline,
      `${currency} ${p.budget.toLocaleString()}`,
      `${p.progress}%`
    ]);
  });

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 40,
    headStyles: { fillColor: [139, 92, 246] }, // Violet
  });

  saveDoc(doc, "projects_report");
};

export const exportCustomersToPDF = (customers: Customer[]) => {
  const doc = createDoc("Customer Database");

  const tableColumn = ["Name", "Email", "Phone", "Status", "Address"];
  const tableRows: any[] = [];

  customers.forEach((c) => {
    tableRows.push([c.name, c.email, c.phone, c.status, c.address]);
  });

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 40,
    headStyles: { fillColor: [79, 70, 229] },
  });

  saveDoc(doc, "customers_list");
};

export const exportSalesOrdersToPDF = (orders: SaleOrder[], currency: string) => {
  const doc = createDoc("Sales Orders Report");

  const tableColumn = ["Order ID", "Date", "Customer", "Items Count", "Total Amount"];
  const tableRows: any[] = [];

  orders.forEach((o) => {
    tableRows.push([
      o.id,
      o.date,
      o.customerName,
      o.items.reduce((acc, i) => acc + i.quantity, 0),
      `${currency} ${o.totalAmount.toLocaleString()}`
    ]);
  });

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 40,
    headStyles: { fillColor: [16, 185, 129] }, // Emerald
    columnStyles: { 4: { halign: 'right', fontStyle: 'bold' } }
  });

  saveDoc(doc, "sales_orders");
};

export const exportAssetsToPDF = (assets: Asset[], currency: string) => {
  const doc = createDoc("Assets Valuation Report");

  const tableColumn = ["Name", "Type", "Acquisition Date", "Value", "Notes"];
  const tableRows: any[] = [];

  assets.forEach((a) => {
    tableRows.push([
      a.name,
      a.type,
      a.acquisitionDate,
      `${currency} ${a.value.toLocaleString()}`,
      a.description || (a.stockSymbol ? `Symbol: ${a.stockSymbol}` : '-')
    ]);
  });

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 40,
    headStyles: { fillColor: [245, 158, 11] }, // Amber
    columnStyles: { 3: { halign: 'right', fontStyle: 'bold' } }
  });

  const totalVal = assets.reduce((acc, a) => acc + a.value, 0);
  const finalY = (doc as any).lastAutoTable.finalY || 50;
  doc.text(`Total Assets Value: ${currency} ${totalVal.toLocaleString()}`, 14, finalY + 10);

  saveDoc(doc, "assets_report");
};