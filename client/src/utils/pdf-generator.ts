// PDF Generation utility for Indian GST invoices
export const generatePDF = async (invoice: any, type: 'quotation' | 'proforma' | 'gst_invoice' | 'final_invoice') => {
  const companyDetails = {
    name: "SWITCH RENTAL SERVICES LLP",
    address: "Ground Floor, Gupta Mills Estate,\nMagazine Street,\nDarukhana, Mazgaon,\nMumbai, 400010\nMaharashtra, India",
    gstin: "27AFHFS2025K1ZV",
    phone: "+91 9876543210",
    email: "info@switchrental.com"
  };

  // Create a professional invoice HTML template
  const invoiceHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${type.toUpperCase().replace('_', ' ')} - ${invoice.invoiceNumber}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; font-size: 12px; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; }
        .company-info { flex: 1; }
        .company-name { font-size: 18px; font-weight: bold; color: #2563eb; margin-bottom: 5px; }
        .invoice-type { font-size: 16px; font-weight: bold; text-align: center; margin-bottom: 20px; text-transform: uppercase; }
        .invoice-details { background: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .customer-details { margin-bottom: 20px; }
        .table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .table th { background-color: #f8f9fa; font-weight: bold; }
        .text-right { text-align: right; }
        .total-section { margin-top: 20px; }
        .total-row { display: flex; justify-content: space-between; padding: 5px 0; }
        .total-row.final { font-weight: bold; font-size: 14px; border-top: 2px solid #000; margin-top: 10px; padding-top: 10px; }
        .terms { margin-top: 30px; font-size: 10px; }
        .signature { margin-top: 50px; text-align: right; }
        .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 72px; color: rgba(0,0,0,0.1); z-index: -1; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company-info">
          <div class="company-name">${companyDetails.name}</div>
          <div>${companyDetails.address}</div>
          <div>GSTIN: ${companyDetails.gstin}</div>
          <div>Phone: ${companyDetails.phone}</div>
          <div>Email: ${companyDetails.email}</div>
        </div>
        <div>
          <div style="text-align: right;">
            <div><strong>${invoice.invoiceNumber}</strong></div>
            <div>Date: ${new Date(invoice.createdAt).toLocaleDateString('en-IN')}</div>
            ${type === 'quotation' ? '<div style="color: #dc2626;">QUOTATION</div>' : ''}
            ${type === 'proforma' ? '<div style="color: #7c3aed;">PROFORMA INVOICE</div>' : ''}
            ${type === 'gst_invoice' ? '<div style="color: #059669;">GST INVOICE</div>' : ''}
            ${type === 'final_invoice' ? '<div style="color: #ea580c;">FINAL INVOICE</div>' : ''}
          </div>
        </div>
      </div>

      <div class="invoice-type">${type.replace('_', ' ').toUpperCase()}</div>

      <div class="invoice-details">
        <div style="display: flex; justify-content: space-between;">
          <div>
            <strong>Bill To:</strong><br>
            ${invoice.customer?.name}<br>
            ${invoice.customer?.company || ''}<br>
            ${invoice.customer?.email}<br>
            ${invoice.customer?.phone || ''}
          </div>
          <div style="text-align: right;">
            <strong>Dispatch Date:</strong> ${new Date(invoice.dispatchDate).toLocaleDateString('en-IN')}<br>
            <strong>Rental Period:</strong> ${new Date(invoice.startDate).toLocaleDateString('en-IN')} to ${new Date(invoice.endDate).toLocaleDateString('en-IN')}<br>
            <strong>Event Details:</strong> ${invoice.eventDetails}
          </div>
        </div>
      </div>

      <table class="table">
        <thead>
          <tr>
            <th>Sr. No.</th>
            <th>Description of Goods</th>
            <th>HSN/SAC</th>
            <th>Quantity</th>
            <th>Rate per Day</th>
            <th>Days</th>
            <th>Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${invoice.items?.map((item: any, index: number) => `
            <tr>
              <td>${index + 1}</td>
              <td>${item.item?.name || 'Item'}</td>
              <td>9965</td>
              <td class="text-right">${item.quantity}</td>
              <td class="text-right">₹${parseFloat(item.ratePerDay).toFixed(2)}</td>
              <td class="text-right">${item.days}</td>
              <td class="text-right">₹${parseFloat(item.lineTotal).toFixed(2)}</td>
            </tr>
          `).join('') || ''}
        </tbody>
      </table>

      <div class="total-section">
        <div style="float: right; width: 300px;">
          <div class="total-row">
            <span>Subtotal:</span>
            <span>₹${parseFloat(invoice.subtotal).toFixed(2)}</span>
          </div>
          ${invoice.sampleType === 'paid' ? `
          <div class="total-row">
            <span>Sample Charges (10%):</span>
            <span>₹${(parseFloat(invoice.subtotal) * 0.1).toFixed(2)}</span>
          </div>` : ''}
          ${parseFloat(invoice.depositAmount || 0) > 0 ? `
          <div class="total-row">
            <span>Security Deposit:</span>
            <span>₹${parseFloat(invoice.depositAmount).toFixed(2)}</span>
          </div>` : ''}
          <div class="total-row">
            <span>CGST (${parseFloat(invoice.gstRate)/2}%):</span>
            <span>₹${(parseFloat(invoice.gstAmount)/2).toFixed(2)}</span>
          </div>
          <div class="total-row">
            <span>SGST (${parseFloat(invoice.gstRate)/2}%):</span>
            <span>₹${(parseFloat(invoice.gstAmount)/2).toFixed(2)}</span>
          </div>
          <div class="total-row final">
            <span>Total Amount:</span>
            <span>₹${parseFloat(invoice.totalAmount).toFixed(2)}</span>
          </div>
        </div>
        <div style="clear: both;"></div>
      </div>

      <div class="terms">
        <strong>Terms & Conditions:</strong><br>
        ${invoice.terms || 'Payment Terms: 50% advance, balance on delivery. Security deposit refundable after return of items in good condition.'}
        <br><br>
        ${invoice.notes ? `<strong>Notes:</strong><br>${invoice.notes}<br><br>` : ''}
        
        <strong>Declaration:</strong><br>
        We declare that this invoice shows the actual price of goods described and that all particulars are true and correct.
      </div>

      <div class="signature">
        <div style="margin-top: 50px;">
          <div>For ${companyDetails.name}</div>
          <div style="margin-top: 40px; border-top: 1px solid #000; width: 200px; margin-left: auto;">Authorized Signatory</div>
        </div>
      </div>

      ${type === 'quotation' ? '<div class="watermark">QUOTATION</div>' : ''}
    </body>
    </html>
  `;

  // Create a blob and download
  const blob = new Blob([invoiceHTML], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${invoice.invoiceNumber}-${type}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return true;
};