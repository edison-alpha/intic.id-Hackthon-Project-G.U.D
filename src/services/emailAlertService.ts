/**
 * Email Alert Service
 * Handles sending email alerts for event actions (cancel, pause, refund, etc.)
 * Uses Web3Forms API for serverless email functionality
 * Plain text format for better email compatibility
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

    const emailBody = `❌ EVENT CANCELLED
═══════════════════════════════════════

⚠️ Event Cancellation Notice

We regret to inform you that ${data.eventName} has been cancelled by the event organizer.

═══════════════════════════════════════

📋 EVENT DETAILS:

🎫 Event Name: ${data.eventName}
📅 Date & Time: ${data.eventDate} at ${data.eventTime}
📍 Location: ${data.location}
🎟️ Tickets: ${data.ticketCount} ticket(s)
💰 Amount Paid: ${data.totalAmount} PUSH

═══════════════════════════════════════

💚 FULL REFUND AVAILABLE

You are eligible for a full refund of ${data.totalAmount} PUSH.
Please claim your refund through the INTIC platform.

═══════════════════════════════════════

📱 WHAT TO DO NEXT:

1. Visit "My Tickets" section in the INTIC app
2. Select the cancelled event
3. Click "Claim Refund" button
4. Your PUSH tokens will be returned to your wallet

═══════════════════════════════════════

📝 Contract Address: ${data.contractAddress}

═══════════════════════════════════════

INTIC - NFT Event Ticketing Platform
Powered by PushChain Blockchain Technology

Need help? Contact us at support@intic.app
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

    const emailBody = `⏸️ EVENT TEMPORARILY PAUSED
═══════════════════════════════════════

⚠️ Ticket Sales Paused

The event organizer has temporarily paused ticket sales for ${data.eventName}. 
Your existing tickets remain valid.

═══════════════════════════════════════

📋 EVENT DETAILS:

🎫 Event Name: ${data.eventName}
📅 Date & Time: ${data.eventDate} at ${data.eventTime}
📍 Location: ${data.location}
🎟️ Your Tickets: ${data.ticketCount} ticket(s)

═══════════════════════════════════════

ℹ️ WHAT THIS MEANS:

✓ Your tickets are still valid - No action needed
✓ New ticket sales are temporarily suspended
✓ The event is still scheduled as planned
✓ You'll be notified when sales resume

═══════════════════════════════════════

Stay Updated: We'll notify you immediately when the event organizer 
resumes ticket sales or makes any changes.

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

    const emailBody = `✅ REFUND PROCESSED SUCCESSFULLY
═══════════════════════════════════════

💚 Refund Completed

Your refund for ${data.eventName} has been successfully processed 
and the funds have been returned to your wallet.

═══════════════════════════════════════

💰 REFUNDED AMOUNT:
${data.refundAmount} PUSH

Reason: ${refundReasonText[data.refundReason]}

═══════════════════════════════════════

📋 TRANSACTION DETAILS:

🎫 Event Name: ${data.eventName}
📅 Event Date: ${data.eventDate} at ${data.eventTime}
🎟️ Tickets Refunded: ${data.ticketCount} ticket(s)
💰 Original Amount: ${data.totalAmount} PUSH
💸 Refund Amount: ${data.refundAmount} PUSH
${data.transactionHash ? `🔗 Transaction Hash: ${data.transactionHash}` : ''}
📝 Contract Address: ${data.contractAddress}

═══════════════════════════════════════

ℹ️ NOTE: 

The refunded PUSH tokens are now available in your wallet. 
You can verify the transaction on PushChain Explorer using 
the transaction hash above.

═══════════════════════════════════════

INTIC - NFT Event Ticketing Platform
Powered by PushChain Blockchain Technology

Questions about your refund? Contact us at support@intic.app
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

    const emailBody = `🎊 WELCOME TO THE EVENT!
═══════════════════════════════════════

✅ Ticket Validated

Your ticket ${ticketNumber} has been successfully checked-in 
at ${data.eventName}.

═══════════════════════════════════════

✓ CHECK-IN COMPLETE
${data.checkInTime}

═══════════════════════════════════════

📋 EVENT DETAILS:

🎫 Event Name: ${data.eventName}
📅 Date & Time: ${data.eventDate} at ${data.eventTime}
📍 Location: ${data.location}
🎟️ Ticket Number: ${ticketNumber}
⏰ Check-In Time: ${data.checkInTime}

═══════════════════════════════════════

🎉 Enjoy the Event!

Have a great time at ${data.eventName}. 
Thank you for using INTIC!

═══════════════════════════════════════

NOTE: This ticket has been marked as used and cannot be 
checked-in again.

═══════════════════════════════════════

INTIC - NFT Event Ticketing Platform
Powered by PushChain Blockchain Technology

Share your experience! support@intic.app
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
      '3-days': '📅 3 Days Until Your Event',
      '2-days': '⏰ 2 Days Until Your Event',
      '1-day': '🎯 Tomorrow is Your Event!',
      '5-hours': '🚨 Your Event Starts in 5 Hours!'
    };

    const reminderEmojis = {
      '3-days': '📅',
      '2-days': '⏰',
      '1-day': '🎯',
      '5-hours': '🚨'
    };

    const formData = new FormData();
    formData.append('access_key', WEB3FORMS_ACCESS_KEY);
    formData.append('subject', `${reminderEmojis[data.reminderType]} Reminder: ${data.eventName}`);
    formData.append('from_name', 'INTIC Event Platform');
    formData.append('email', data.userEmail);
    formData.append('reply_to', 'support@intic.app');

    const emailBody = `${reminderTitles[data.reminderType]}
═══════════════════════════════════════

${reminderEmojis[data.reminderType]} Don't forget your upcoming event!

═══════════════════════════════════════

⏱️ TIME UNTIL EVENT:
${data.timeUntilEvent}

${data.eventName}

═══════════════════════════════════════

📋 EVENT DETAILS:

🎫 Event Name: ${data.eventName}
📅 Date & Time: ${data.eventDate} at ${data.eventTime}
📍 Location: ${data.location}
🎟️ Your Tickets: ${data.ticketCount} ticket${data.ticketCount > 1 ? 's' : ''}

═══════════════════════════════════════

✓ PRE-EVENT CHECKLIST:

✓ Check event time and location
✓ Plan your transportation
✓ Prepare your ticket QR code (available in My Tickets)
✓ Check event updates from organizer
${data.reminderType === '5-hours' ? '✓ Start getting ready!' : ''}

═══════════════════════════════════════

🔗 View My Tickets:
${typeof window !== 'undefined' ? window.location.origin : 'https://intic.app'}/app/my-tickets

═══════════════════════════════════════

${data.reminderType === '5-hours' 
  ? 'Event starts soon! Make sure you have everything ready.' 
  : 'We\'ll send you another reminder as the event gets closer.'}

═══════════════════════════════════════

INTIC - NFT Event Ticketing Platform
Powered by PushChain Blockchain Technology

See you at the event! support@intic.app
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

    const emailBody = `▶️ EVENT SALES RESUMED
═══════════════════════════════════════

✅ Back on Track

Great news! Ticket sales for ${data.eventName} have resumed. 
The event is proceeding as scheduled.

═══════════════════════════════════════

📋 EVENT DETAILS:

🎫 Event Name: ${data.eventName}
📅 Date & Time: ${data.eventDate} at ${data.eventTime}
📍 Location: ${data.location}
🎟️ Your Tickets: ${data.ticketCount} ticket(s)

═══════════════════════════════════════

Your existing tickets remain valid. No action is needed from you. 
We'll see you at the event!

═══════════════════════════════════════

🔗 View Event Details:
${typeof window !== 'undefined' ? window.location.origin : 'https://intic.app'}/app/event-detail/${data.contractAddress}

═══════════════════════════════════════

INTIC - NFT Event Ticketing Platform
Powered by PushChain Blockchain Technology
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
