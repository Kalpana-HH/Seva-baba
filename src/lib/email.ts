export interface SendEmailPayload {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  customSmtp?: {
    host?: string;
    port?: number;
    user?: string;
    pass?: string;
  };
}

export interface SendEmailResponse {
  success: boolean;
  message?: string;
  previewUrl?: string;
  isTestInbox?: boolean;
  error?: string;
}

/**
  Fully automated background email sender.
  Uses free backend SMTP / Ethereal preview inbox or optional user Gmail App Password.
 */
export async function sendAutomatedEmail(payload: SendEmailPayload): Promise<SendEmailResponse> {
  try {
    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to dispatch email');
    }

    return data;
  } catch (err: any) {
    console.warn('Automated email dispatch failed:', err);
    return {
      success: false,
      error: err.message || 'Network error sending automated email',
    };
  }
}

/**
  Automated email template builder for Gathering / Temple Events
 */
export function buildEventEmailHtml(params: {
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  description?: string;
  type?: string;
  updateMessage?: string;
}): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 16px; background-color: #ffffff;">
      <div style="background-color: #fcf8f6; padding: 16px 20px; border-radius: 12px; margin-bottom: 20px; text-align: center;">
        <h2 style="color: #9d5d5d; margin: 0; font-size: 22px; font-weight: bold;">GatherCraft Planner</h2>
        <p style="color: #6b7280; margin: 4px 0 0 0; font-size: 13px;">Automated Gathering Notification</p>
      </div>

      <h3 style="color: #111827; font-size: 18px; margin-top: 0;">${params.eventTitle}</h3>
      <p style="color: #374151; font-size: 14px; line-height: 1.5;">
        ${params.updateMessage || 'Here are the details for your upcoming event gathering:'}
      </p>

      <div style="background-color: #f9fafb; padding: 16px; border-left: 4px solid #c88a8a; border-radius: 8px; margin: 16px 0;">
        <p style="margin: 4px 0; color: #4b5563; font-size: 14px;"><strong>Date:</strong> ${params.eventDate}</p>
        <p style="margin: 4px 0; color: #4b5563; font-size: 14px;"><strong>Time:</strong> ${params.eventTime}</p>
        ${params.type ? `<p style="margin: 4px 0; color: #4b5563; font-size: 14px;"><strong>Type:</strong> ${params.type}</p>` : ''}
        ${params.description ? `<p style="margin: 8px 0 4px 0; color: #4b5563; font-size: 13px; font-style: italic;">"${params.description}"</p>` : ''}
      </div>

      <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 24px;">
        Sent automatically by GatherCraft Planner.
      </p>
    </div>
  `;
}
