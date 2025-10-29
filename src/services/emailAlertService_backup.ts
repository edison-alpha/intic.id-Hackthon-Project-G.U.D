/**
 * Email Alert Service
 * Handles sending email alerts for event actions (cancel, pause, refund, etc.)
 * Uses Web3Forms API for serverless email functionality
 */

export interface EventAlertData {
  userEmail: string;
  userName?: string;
  eventName: string;
  eventDate: string;
  eventTime: string;
  location: string;
  ticketCount: number;
  totalAmount: string;
  contractAddress: string;
  organizerName?: string;
}

export interface RefundAlertData extends EventAlertData {
  refundAmount: string;
  refundReason: 'cancel' | 'emergency' | 'partial';
  transactionHash?: string;
}

// Web3Forms public access key
const WEB3FORMS_ACCESS_KEY = import.meta.env.VITE_WEB3FORMS_KEY || 'YOUR_WEB3FORMS_KEY';

/**
 * Send email alert when event is cancelled
 */
export async function sendEventCancelledAlert(
  data: EventAlertData
): Promise<{ success: boolean; message: string }> {
  try {
    const formData = new FormData();
    formData.append('access_key', WEB3FORMS_ACCESS_KEY);
    formData.append('subject', `❌ Event Cancelled: ${data.eventName}`);
    formData.append('from_name', 'INTIC Event Platform');
    formData.append('email', data.userEmail);
    formData.append('reply_to', 'support@intic.app');

    const emailBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; }
          .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 40px 30px; text-align: center; }
          .header h1 { margin: 0 0 10px 0; font-size: 28px; }
          .content { background: #ffffff; padding: 30px; }
          .alert-box { background: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; margin: 20px 0; border-radius: 4px; }
          .event-details { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .detail-row { display: flex; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
          .detail-row:last-child { border-bottom: none; }
          .detail-label { font-weight: 600; width: 140px; color: #6b7280; }
          .detail-value { color: #111827; flex: 1; }
          .refund-notice { background: #d1fae5; border: 2px solid #10b981; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
          .refund-notice h3 { margin: 0 0 10px 0; color: #047857; }
          .cta-button { display: inline-block; background: #d548ec; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: 600; }
          .cta-button:hover { background: #c030d6; }
          .footer { text-align: center; color: #6b7280; font-size: 13px; padding: 20px; background: #f9fafb; }
          .icon { font-size: 48px; margin-bottom: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="icon">❌</div>
            <h1>Event Cancelled</h1>
            <p>Important notice about your upcoming event</p>
          </div>
          
          <div class="content">
            <div class="alert-box">
              <h3 style="margin-top: 0; color: #dc2626;">⚠️ Event Cancellation Notice</h3>
              <p style="margin-bottom: 0;">
                We regret to inform you that <strong>${data.eventName}</strong> has been cancelled by the event organizer.
              </p>
            </div>

            <div class="event-details">
              <h3 style="margin-top: 0; color: #111827;">Event Details</h3>
              <div class="detail-row">
                <span class="detail-label">🎫 Event Name:</span>
                <span class="detail-value">${data.eventName}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">📅 Date & Time:</span>
                <span class="detail-value">${data.eventDate} at ${data.eventTime}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">📍 Location:</span>
                <span class="detail-value">${data.location}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">🎟️ Tickets:</span>
                <span class="detail-value">${data.ticketCount} ticket(s)</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">💰 Amount Paid:</span>
                <span class="detail-value">${data.totalAmount} PUSH</span>
              </div>
            </div>

            <div class="refund-notice">
              <h3>💚 Full Refund Available</h3>
              <p style="margin: 10px 0;">
                You are eligible for a <strong>full refund</strong> of ${data.totalAmount} PUSH.<br>
                Please claim your refund through the INTIC platform.
              </p>
            </div>

            <center>
              <a href="${typeof window !== 'undefined' ? window.location.origin : 'https://intic.app'}/app/my-tickets" class="cta-button">
                Claim Refund Now →
              </a>
            </center>

            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              <strong>What to do next:</strong>
            </p>
            <ul style="color: #6b7280; font-size: 14px;">
              <li>Visit "My Tickets" section in the INTIC app</li>
              <li>Select the cancelled event</li>
              <li>Click "Claim Refund" button</li>
              <li>Your PUSH tokens will be returned to your wallet</li>
            </ul>

            <p style="color: #6b7280; font-size: 13px; margin-top: 20px;">
              Contract Address: <code style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px;">${data.contractAddress}</code>
            </p>
          </div>

          <div class="footer">
            <p><strong>INTIC</strong> - NFT Event Ticketing Platform</p>
            <p>Powered by PushChain Blockchain Technology</p>
            <p style="margin-top: 10px;">
              Need help? Contact us at <a href="mailto:support@intic.app" style="color: #d548ec;">support@intic.app</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    formData.append('message', emailBody);
    formData.append('redirect', 'false');

    const response = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ Event cancelled alert sent to:', data.userEmail);
      return { success: true, message: 'Alert sent successfully' };
    } else {
      console.error('❌ Failed to send alert:', result);
      return { success: false, message: result.message || 'Failed to send alert' };
    }
  } catch (error) {
    console.error('❌ Error sending event cancelled alert:', error);
    return { success: false, message: 'Network error' };
  }
}

/**
 * Send email alert when event is paused
 */
export async function sendEventPausedAlert(
  data: EventAlertData
): Promise<{ success: boolean; message: string }> {
  try {
    const formData = new FormData();
    formData.append('access_key', WEB3FORMS_ACCESS_KEY);
    formData.append('subject', `⏸️ Event Paused: ${data.eventName}`);
    formData.append('from_name', 'INTIC Event Platform');
    formData.append('email', data.userEmail);
    formData.append('reply_to', 'support@intic.app');

    const emailBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; }
          .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 40px 30px; text-align: center; }
          .header h1 { margin: 0 0 10px 0; font-size: 28px; }
          .content { background: #ffffff; padding: 30px; }
          .alert-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 4px; }
          .event-details { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .detail-row { display: flex; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
          .detail-row:last-child { border-bottom: none; }
          .detail-label { font-weight: 600; width: 140px; color: #6b7280; }
          .detail-value { color: #111827; flex: 1; }
          .info-box { background: #dbeafe; border: 2px solid #3b82f6; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .cta-button { display: inline-block; background: #d548ec; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: 600; }
          .footer { text-align: center; color: #6b7280; font-size: 13px; padding: 20px; background: #f9fafb; }
          .icon { font-size: 48px; margin-bottom: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="icon">⏸️</div>
            <h1>Event Temporarily Paused</h1>
            <p>Important update about your event</p>
          </div>
          
          <div class="content">
            <div class="alert-box">
              <h3 style="margin-top: 0; color: #d97706;">⚠️ Ticket Sales Paused</h3>
              <p style="margin-bottom: 0;">
                The event organizer has temporarily paused ticket sales for <strong>${data.eventName}</strong>. Your existing tickets remain valid.
              </p>
            </div>

            <div class="event-details">
              <h3 style="margin-top: 0; color: #111827;">Event Details</h3>
              <div class="detail-row">
                <span class="detail-label">🎫 Event Name:</span>
                <span class="detail-value">${data.eventName}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">📅 Date & Time:</span>
                <span class="detail-value">${data.eventDate} at ${data.eventTime}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">📍 Location:</span>
                <span class="detail-value">${data.location}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">🎟️ Your Tickets:</span>
                <span class="detail-value">${data.ticketCount} ticket(s)</span>
              </div>
            </div>

            <div class="info-box">
              <h3 style="margin-top: 0; color: #1e40af;">ℹ️ What This Means</h3>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li><strong>Your tickets are still valid</strong> - No action needed</li>
                <li>New ticket sales are temporarily suspended</li>
                <li>The event is still scheduled as planned</li>
                <li>You'll be notified when sales resume</li>
              </ul>
            </div>

            <center>
              <a href="${typeof window !== 'undefined' ? window.location.origin : 'https://intic.app'}/app/my-tickets" class="cta-button">
                View My Tickets →
              </a>
            </center>

            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              <strong>Stay Updated:</strong> We'll notify you immediately when the event organizer resumes ticket sales or makes any changes.
            </p>
          </div>

          <div class="footer">
            <p><strong>INTIC</strong> - NFT Event Ticketing Platform</p>
            <p>Powered by PushChain Blockchain Technology</p>
            <p style="margin-top: 10px;">
              Questions? Contact us at <a href="mailto:support@intic.app" style="color: #d548ec;">support@intic.app</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    formData.append('message', emailBody);
    formData.append('redirect', 'false');

    const response = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ Event paused alert sent to:', data.userEmail);
      return { success: true, message: 'Alert sent successfully' };
    } else {
      console.error('❌ Failed to send alert:', result);
      return { success: false, message: result.message || 'Failed to send alert' };
    }
  } catch (error) {
    console.error('❌ Error sending event paused alert:', error);
    return { success: false, message: 'Network error' };
  }
}

/**
 * Send email alert when refund is claimed
 */
export async function sendRefundClaimedAlert(
  data: RefundAlertData
): Promise<{ success: boolean; message: string }> {
  try {
    const refundReasonText = {
      cancel: 'Event Cancellation',
      emergency: 'Emergency Refund (Fraud Protection)',
      partial: 'Partial Refund'
    };

    const formData = new FormData();
    formData.append('access_key', WEB3FORMS_ACCESS_KEY);
    formData.append('subject', `✅ Refund Processed: ${data.eventName}`);
    formData.append('from_name', 'INTIC Event Platform');
    formData.append('email', data.userEmail);
    formData.append('reply_to', 'support@intic.app');

    const emailBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 40px 30px; text-align: center; }
          .header h1 { margin: 0 0 10px 0; font-size: 28px; }
          .content { background: #ffffff; padding: 30px; }
          .success-box { background: #d1fae5; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0; border-radius: 4px; }
          .refund-amount { background: linear-gradient(135deg, #d548ec 0%, #9333ea 100%); color: white; padding: 30px; border-radius: 12px; text-align: center; margin: 20px 0; }
          .refund-amount h2 { margin: 0 0 10px 0; font-size: 42px; }
          .event-details { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .detail-row { display: flex; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
          .detail-row:last-child { border-bottom: none; }
          .detail-label { font-weight: 600; width: 160px; color: #6b7280; }
          .detail-value { color: #111827; flex: 1; word-break: break-all; }
          .cta-button { display: inline-block; background: #d548ec; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: 600; }
          .footer { text-align: center; color: #6b7280; font-size: 13px; padding: 20px; background: #f9fafb; }
          .icon { font-size: 48px; margin-bottom: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="icon">✅</div>
            <h1>Refund Processed Successfully</h1>
            <p>Your PUSH tokens have been returned</p>
          </div>
          
          <div class="content">
            <div class="success-box">
              <h3 style="margin-top: 0; color: #047857;">💚 Refund Completed</h3>
              <p style="margin-bottom: 0;">
                Your refund for <strong>${data.eventName}</strong> has been successfully processed and the funds have been returned to your wallet.
              </p>
            </div>

            <div class="refund-amount">
              <p style="margin: 0 0 5px 0; opacity: 0.9; font-size: 14px;">Refunded Amount</p>
              <h2>${data.refundAmount} PUSH</h2>
              <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 14px;">
                Reason: ${refundReasonText[data.refundReason]}
              </p>
            </div>

            <div class="event-details">
              <h3 style="margin-top: 0; color: #111827;">Transaction Details</h3>
              <div class="detail-row">
                <span class="detail-label">🎫 Event Name:</span>
                <span class="detail-value">${data.eventName}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">📅 Event Date:</span>
                <span class="detail-value">${data.eventDate} at ${data.eventTime}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">🎟️ Tickets Refunded:</span>
                <span class="detail-value">${data.ticketCount} ticket(s)</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">💰 Original Amount:</span>
                <span class="detail-value">${data.totalAmount} PUSH</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">💸 Refund Amount:</span>
                <span class="detail-value">${data.refundAmount} PUSH</span>
              </div>
              ${data.transactionHash ? `
              <div class="detail-row">
                <span class="detail-label">🔗 Transaction Hash:</span>
                <span class="detail-value" style="font-family: monospace; font-size: 11px;">${data.transactionHash}</span>
              </div>
              ` : ''}
              <div class="detail-row">
                <span class="detail-label">📝 Contract Address:</span>
                <span class="detail-value" style="font-family: monospace; font-size: 11px;">${data.contractAddress}</span>
              </div>
            </div>

            <center>
              <a href="${typeof window !== 'undefined' ? window.location.origin : 'https://intic.app'}/app/my-tickets" class="cta-button">
                View Transaction History →
              </a>
            </center>

            <p style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 15px; border-radius: 4px; color: #1e40af; font-size: 14px; margin-top: 30px;">
              <strong>ℹ️ Note:</strong> The refunded PUSH tokens are now available in your wallet. You can verify the transaction on PushChain Explorer using the transaction hash above.
            </p>
          </div>

          <div class="footer">
            <p><strong>INTIC</strong> - NFT Event Ticketing Platform</p>
            <p>Powered by PushChain Blockchain Technology</p>
            <p style="margin-top: 10px;">
              Questions about your refund? Contact us at <a href="mailto:support@intic.app" style="color: #d548ec;">support@intic.app</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    formData.append('message', emailBody);
    formData.append('redirect', 'false');

    const response = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ Refund claimed alert sent to:', data.userEmail);
      return { success: true, message: 'Alert sent successfully' };
    } else {
      console.error('❌ Failed to send alert:', result);
      return { success: false, message: result.message || 'Failed to send alert' };
    }
  } catch (error) {
    console.error('❌ Error sending refund claimed alert:', error);
    return { success: false, message: 'Network error' };
  }
}

/**
 * Send email confirmation when ticket is purchased
 */
export async function sendTicketPurchaseConfirmation(
  data: EventAlertData & { tokenIds: number[]; transactionHash?: string }
): Promise<{ success: boolean; message: string }> {
  try {
    const formData = new FormData();
    formData.append('access_key', WEB3FORMS_ACCESS_KEY);
    formData.append('subject', `🎫 Ticket Purchase Confirmed: ${data.eventName}`);
    formData.append('from_name', 'INTIC Event Platform');
    formData.append('email', data.userEmail);
    formData.append('reply_to', 'support@intic.app');

    const ticketNumbers = data.tokenIds.map(id => `#TKT-${id.toString().padStart(6, '0')}`).join(', ');

    const emailBody = `🎉 PURCHASE CONFIRMED!
═══════════════════════════════════════

✅ Payment Successful

Congratulations! You've successfully purchased ${data.ticketCount} ticket${data.ticketCount > 1 ? 's' : ''} for ${data.eventName}.

═══════════════════════════════════════

🎟️ YOUR TICKET NUMBER${data.ticketCount > 1 ? 'S' : ''}:
${ticketNumbers}

💰 Amount Paid: ${data.totalAmount} PUSH

═══════════════════════════════════════

📋 EVENT DETAILS:

🎫 Event Name: ${data.eventName}
📅 Date & Time: ${data.eventDate} at ${data.eventTime}
📍 Location: ${data.location}
🎟️ Quantity: ${data.ticketCount} ticket${data.ticketCount > 1 ? 's' : ''}
💰 Total Paid: ${data.totalAmount} PUSH
${data.transactionHash ? `🔗 Transaction: ${data.transactionHash}` : ''}
📝 Contract: ${data.contractAddress}

═══════════════════════════════════════

📧 EVENT REMINDERS

We'll send you reminder emails at:
• 3 days before the event
• 2 days before the event
• 1 day before the event
• 5 hours before the event

═══════════════════════════════════════

📱 WHAT'S NEXT:

✓ Your NFT tickets are now in your wallet
✓ View them anytime in "My Tickets" section
✓ Bring your ticket QR code on event day
✓ Check your email for event reminders

═══════════════════════════════════════

🔗 View My Tickets:
${typeof window !== 'undefined' ? window.location.origin : 'https://intic.app'}/app/my-tickets

═══════════════════════════════════════

INTIC - NFT Event Ticketing Platform
Powered by PushChain Blockchain Technology

Questions? Contact us at support@intic.app
`;


    formData.append('message', emailBody);
    formData.append('redirect', 'false');

    const response = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ Purchase confirmation sent to:', data.userEmail);
      return { success: true, message: 'Confirmation sent successfully' };
    } else {
      console.error('❌ Failed to send confirmation:', result);
      return { success: false, message: result.message || 'Failed to send confirmation' };
    }
  } catch (error) {
    console.error('❌ Error sending purchase confirmation:', error);
    return { success: false, message: 'Network error' };
  }
}

/**
 * Send email confirmation when ticket is used (checked-in)
 */
export async function sendTicketCheckInConfirmation(
  data: EventAlertData & { tokenId: number; checkInTime: string }
): Promise<{ success: boolean; message: string }> {
  try {
    const formData = new FormData();
    formData.append('access_key', WEB3FORMS_ACCESS_KEY);
    formData.append('subject', `✅ Check-In Confirmed: ${data.eventName}`);
    formData.append('from_name', 'INTIC Event Platform');
    formData.append('email', data.userEmail);
    formData.append('reply_to', 'support@intic.app');

    const ticketNumber = `#TKT-${data.tokenId.toString().padStart(6, '0')}`;

    const emailBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; }
          .header { background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; padding: 40px 30px; text-align: center; }
          .header h1 { margin: 0 0 10px 0; font-size: 28px; }
          .content { background: #ffffff; padding: 30px; }
          .success-box { background: #ede9fe; border-left: 4px solid #8b5cf6; padding: 20px; margin: 20px 0; border-radius: 4px; }
          .checkin-box { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; border-radius: 12px; text-align: center; margin: 20px 0; }
          .checkin-box h2 { margin: 0 0 10px 0; font-size: 32px; }
          .event-details { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .detail-row { display: flex; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
          .detail-row:last-child { border-bottom: none; }
          .detail-label { font-weight: 600; width: 160px; color: #6b7280; }
          .detail-value { color: #111827; flex: 1; }
          .enjoy-box { background: #fef3c7; border: 2px solid #f59e0b; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
          .footer { text-align: center; color: #6b7280; font-size: 13px; padding: 20px; background: #f9fafb; }
          .icon { font-size: 48px; margin-bottom: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="icon">🎊</div>
            <h1>Welcome to the Event!</h1>
            <p>Check-in successful</p>
          </div>
          
          <div class="content">
            <div class="success-box">
              <h3 style="margin-top: 0; color: #6d28d9;">✅ Ticket Validated</h3>
              <p style="margin-bottom: 0;">
                Your ticket <strong>${ticketNumber}</strong> has been successfully checked-in at <strong>${data.eventName}</strong>.
              </p>
            </div>

            <div class="checkin-box">
              <div class="icon">✓</div>
              <h2>CHECK-IN COMPLETE</h2>
              <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 16px;">
                ${data.checkInTime}
              </p>
            </div>

            <div class="event-details">
              <h3 style="margin-top: 0; color: #111827;">Event Details</h3>
              <div class="detail-row">
                <span class="detail-label">🎫 Event Name:</span>
                <span class="detail-value">${data.eventName}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">📅 Date & Time:</span>
                <span class="detail-value">${data.eventDate} at ${data.eventTime}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">📍 Location:</span>
                <span class="detail-value">${data.location}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">🎟️ Ticket Number:</span>
                <span class="detail-value">${ticketNumber}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">⏰ Check-In Time:</span>
                <span class="detail-value">${data.checkInTime}</span>
              </div>
            </div>

            <div class="enjoy-box">
              <h3 style="margin-top: 0; color: #92400e;">🎉 Enjoy the Event!</h3>
              <p style="margin-bottom: 0; color: #78350f;">
                Have a great time at ${data.eventName}. Thank you for using INTIC!
              </p>
            </div>

            <p style="color: #6b7280; font-size: 14px; margin-top: 30px; text-align: center;">
              <strong>Note:</strong> This ticket has been marked as used and cannot be checked-in again.
            </p>
          </div>

          <div class="footer">
            <p><strong>INTIC</strong> - NFT Event Ticketing Platform</p>
            <p>Powered by PushChain Blockchain Technology</p>
            <p style="margin-top: 10px;">
              Share your experience! <a href="mailto:support@intic.app" style="color: #d548ec;">support@intic.app</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    formData.append('message', emailBody);
    formData.append('redirect', 'false');

    const response = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ Check-in confirmation sent to:', data.userEmail);
      return { success: true, message: 'Confirmation sent successfully' };
    } else {
      console.error('❌ Failed to send check-in confirmation:', result);
      return { success: false, message: result.message || 'Failed to send confirmation' };
    }
  } catch (error) {
    console.error('❌ Error sending check-in confirmation:', error);
    return { success: false, message: 'Network error' };
  }
}

/**
 * Send event reminder email
 */
export async function sendEventReminder(
  data: EventAlertData & { reminderType: '3-days' | '2-days' | '1-day' | '5-hours'; timeUntilEvent: string }
): Promise<{ success: boolean; message: string }> {
  try {
    const reminderTitles = {
      '3-days': '3 Days Until Your Event',
      '2-days': '2 Days Until Your Event',
      '1-day': 'Tomorrow is Your Event!',
      '5-hours': 'Your Event Starts in 5 Hours!'
    };

    const reminderEmojis = {
      '3-days': '📅',
      '2-days': '⏰',
      '1-day': '🎯',
      '5-hours': '🚨'
    };

    const reminderColors = {
      '3-days': { from: '#3b82f6', to: '#2563eb' },
      '2-days': { from: '#8b5cf6', to: '#7c3aed' },
      '1-day': { from: '#f59e0b', to: '#d97706' },
      '5-hours': { from: '#ef4444', to: '#dc2626' }
    };

    const formData = new FormData();
    formData.append('access_key', WEB3FORMS_ACCESS_KEY);
    formData.append('subject', `${reminderEmojis[data.reminderType]} Reminder: ${data.eventName}`);
    formData.append('from_name', 'INTIC Event Platform');
    formData.append('email', data.userEmail);
    formData.append('reply_to', 'support@intic.app');

    const color = reminderColors[data.reminderType];

    const emailBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; }
          .header { background: linear-gradient(135deg, ${color.from} 0%, ${color.to} 100%); color: white; padding: 40px 30px; text-align: center; }
          .header h1 { margin: 0 0 10px 0; font-size: 28px; }
          .content { background: #ffffff; padding: 30px; }
          .reminder-box { background: linear-gradient(135deg, #d548ec 0%, #9333ea 100%); color: white; padding: 30px; border-radius: 12px; text-align: center; margin: 20px 0; }
          .reminder-box h2 { margin: 0 0 10px 0; font-size: 36px; }
          .event-details { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .detail-row { display: flex; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
          .detail-row:last-child { border-bottom: none; }
          .detail-label { font-weight: 600; width: 140px; color: #6b7280; }
          .detail-value { color: #111827; flex: 1; }
          .checklist { background: #f0f9ff; border: 2px solid #3b82f6; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .cta-button { display: inline-block; background: #d548ec; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: 600; }
          .footer { text-align: center; color: #6b7280; font-size: 13px; padding: 20px; background: #f9fafb; }
          .icon { font-size: 48px; margin-bottom: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="icon">${reminderEmojis[data.reminderType]}</div>
            <h1>${reminderTitles[data.reminderType]}</h1>
            <p>Don't forget your upcoming event!</p>
          </div>
          
          <div class="content">
            <div class="reminder-box">
              <p style="margin: 0 0 5px 0; opacity: 0.9; font-size: 14px;">Time Until Event</p>
              <h2>${data.timeUntilEvent}</h2>
              <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 16px;">
                ${data.eventName}
              </p>
            </div>

            <div class="event-details">
              <h3 style="margin-top: 0; color: #111827;">Event Details</h3>
              <div class="detail-row">
                <span class="detail-label">🎫 Event Name:</span>
                <span class="detail-value">${data.eventName}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">📅 Date & Time:</span>
                <span class="detail-value">${data.eventDate} at ${data.eventTime}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">📍 Location:</span>
                <span class="detail-value">${data.location}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">🎟️ Your Tickets:</span>
                <span class="detail-value">${data.ticketCount} ticket${data.ticketCount > 1 ? 's' : ''}</span>
              </div>
            </div>

            <div class="checklist">
              <h3 style="margin-top: 0; color: #1e40af;">✓ Pre-Event Checklist</h3>
              <ul style="margin: 10px 0; padding-left: 20px; color: #1e3a8a;">
                <li>✓ Check event time and location</li>
                <li>✓ Plan your transportation</li>
                <li>✓ Prepare your ticket QR code (available in My Tickets)</li>
                <li>✓ Check event updates from organizer</li>
                ${data.reminderType === '5-hours' ? '<li>✓ <strong>Start getting ready!</strong></li>' : ''}
              </ul>
            </div>

            <center>
              <a href="${typeof window !== 'undefined' ? window.location.origin : 'https://intic.app'}/app/my-tickets" class="cta-button">
                View My Tickets →
              </a>
            </center>

            <p style="color: #6b7280; font-size: 14px; margin-top: 30px; text-align: center;">
              ${data.reminderType === '5-hours' 
                ? '<strong>Event starts soon!</strong> Make sure you have everything ready.' 
                : 'We\'ll send you another reminder as the event gets closer.'}
            </p>
          </div>

          <div class="footer">
            <p><strong>INTIC</strong> - NFT Event Ticketing Platform</p>
            <p>Powered by PushChain Blockchain Technology</p>
            <p style="margin-top: 10px;">
              See you at the event! <a href="mailto:support@intic.app" style="color: #d548ec;">support@intic.app</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    formData.append('message', emailBody);
    formData.append('redirect', 'false');

    const response = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();

    if (result.success) {
      console.log(`✅ ${data.reminderType} reminder sent to:`, data.userEmail);
      return { success: true, message: 'Reminder sent successfully' };
    } else {
      console.error('❌ Failed to send reminder:', result);
      return { success: false, message: result.message || 'Failed to send reminder' };
    }
  } catch (error) {
    console.error('❌ Error sending event reminder:', error);
    return { success: false, message: 'Network error' };
  }
}

/**
 * Send email alert when event is resumed (un-paused)
 */
export async function sendEventResumedAlert(
  data: EventAlertData
): Promise<{ success: boolean; message: string }> {
  try {
    const formData = new FormData();
    formData.append('access_key', WEB3FORMS_ACCESS_KEY);
    formData.append('subject', `▶️ Event Resumed: ${data.eventName}`);
    formData.append('from_name', 'INTIC Event Platform');
    formData.append('email', data.userEmail);
    formData.append('reply_to', 'support@intic.app');

    const emailBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; }
          .header { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 40px 30px; text-align: center; }
          .header h1 { margin: 0 0 10px 0; font-size: 28px; }
          .content { background: #ffffff; padding: 30px; }
          .alert-box { background: #dbeafe; border-left: 4px solid #3b82f6; padding: 20px; margin: 20px 0; border-radius: 4px; }
          .event-details { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .detail-row { display: flex; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
          .detail-row:last-child { border-bottom: none; }
          .detail-label { font-weight: 600; width: 140px; color: #6b7280; }
          .detail-value { color: #111827; flex: 1; }
          .cta-button { display: inline-block; background: #d548ec; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: 600; }
          .footer { text-align: center; color: #6b7280; font-size: 13px; padding: 20px; background: #f9fafb; }
          .icon { font-size: 48px; margin-bottom: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="icon">▶️</div>
            <h1>Event Sales Resumed</h1>
            <p>Ticket sales are now active again</p>
          </div>
          
          <div class="content">
            <div class="alert-box">
              <h3 style="margin-top: 0; color: #1e40af;">✅ Back on Track</h3>
              <p style="margin-bottom: 0;">
                Great news! Ticket sales for <strong>${data.eventName}</strong> have resumed. The event is proceeding as scheduled.
              </p>
            </div>

            <div class="event-details">
              <h3 style="margin-top: 0; color: #111827;">Event Details</h3>
              <div class="detail-row">
                <span class="detail-label">🎫 Event Name:</span>
                <span class="detail-value">${data.eventName}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">📅 Date & Time:</span>
                <span class="detail-value">${data.eventDate} at ${data.eventTime}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">📍 Location:</span>
                <span class="detail-value">${data.location}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">🎟️ Your Tickets:</span>
                <span class="detail-value">${data.ticketCount} ticket(s)</span>
              </div>
            </div>

            <center>
              <a href="${typeof window !== 'undefined' ? window.location.origin : 'https://intic.app'}/app/event-detail/${data.contractAddress}" class="cta-button">
                View Event Details →
              </a>
            </center>

            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              <strong>Your existing tickets remain valid.</strong> No action is needed from you. We'll see you at the event!
            </p>
          </div>

          <div class="footer">
            <p><strong>INTIC</strong> - NFT Event Ticketing Platform</p>
            <p>Powered by PushChain Blockchain Technology</p>
          </div>
        </div>
      </body>
      </html>
    `;

    formData.append('message', emailBody);
    formData.append('redirect', 'false');

    const response = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ Event resumed alert sent to:', data.userEmail);
      return { success: true, message: 'Alert sent successfully' };
    } else {
      console.error('❌ Failed to send alert:', result);
      return { success: false, message: result.message || 'Failed to send alert' };
    }
  } catch (error) {
    console.error('❌ Error sending event resumed alert:', error);
    return { success: false, message: 'Network error' };
  }
}
