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

export function buildBaseEmailWrapper(content: string, preheader: string = ''): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>The Menu Crew — Tap. Sign up. Eat.</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1f2937;">
      ${preheader ? `<div style="display: none; max-height: 0px; overflow: hidden;">${preheader}</div>` : ''}
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f4f6; padding: 32px 16px;">
        <tr>
          <td align="center">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);">
              
              <!-- Brand Header -->
              <tr>
                <td style="padding: 28px 32px; background: linear-gradient(135deg, #fffbf0 0%, #fef3c7 100%); border-bottom: 1px solid #fcd34d; text-align: center;">
                  <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td align="center">
                        <div style="display: inline-block; width: 48px; height: 48px; background-color: #d97706; border-radius: 12px; line-height: 48px; text-align: center; color: #ffffff; font-size: 24px; font-weight: bold; margin-bottom: 12px; box-shadow: 0 2px 6px rgba(217, 119, 6, 0.25);">
                          🍽️
                        </div>
                        <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #78350f; letter-spacing: -0.3px; text-transform: uppercase;">The Menu Crew</h1>
                        <p style="margin: 4px 0 0 0; font-size: 13px; color: #92400e; font-weight: 600;">Tap. Sign up. Eat.</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Email Body Content -->
              <tr>
                <td style="padding: 32px;">
                  ${content}
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding: 24px 32px; background-color: #f9fafb; border-top: 1px solid #f3f4f6; text-align: center;">
                  <p style="margin: 0 0 8px 0; font-size: 12px; color: #6b7280; font-weight: 600;">
                    The Menu Crew &bull; Tap. Sign up. Eat.
                  </p>
                  <p style="margin: 0; font-size: 11px; color: #9ca3af; line-height: 1.5;">
                    This is an automated operational notification. If you did not request this communication or have questions, please reach out to your event organizer.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

export function format12HourTime(timeStr?: string): string {
  if (!timeStr) return '';
  const trimmed = timeStr.trim();
  if (!trimmed) return '';

  // If already contains AM or PM (case-insensitive), return as is
  if (/am|pm/i.test(trimmed)) return trimmed;

  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = match[2];
    if (isNaN(hours)) return trimmed;

    const period = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    if (hours === 0) hours = 12;

    return `${hours}:${minutes} ${period}`;
  }

  return trimmed;
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
  eventLink?: string;
}): string {
  const formattedTime = format12HourTime(params.eventTime);
  const innerContent = `
    <h2 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 700; color: #111827; letter-spacing: -0.2px;">
      ${params.eventTitle}
    </h2>

    <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #4b5563;">
      ${params.updateMessage || 'Here are the official details and updates for your upcoming gathering:'}
    </p>

    <!-- Event Summary Card -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #faf8f5; border: 1px solid #eee7e0; border-left: 4px solid #9d5d5d; border-radius: 8px; margin-bottom: 24px;">
      <tr>
        <td style="padding: 16px 20px;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="padding-bottom: 8px; font-size: 13px; color: #6b7280; width: 80px;"><strong>Date:</strong></td>
              <td style="padding-bottom: 8px; font-size: 14px; color: #1f2937; font-weight: 600;">${params.eventDate}</td>
            </tr>
            <tr>
              <td style="padding-bottom: 8px; font-size: 13px; color: #6b7280;"><strong>Time:</strong></td>
              <td style="padding-bottom: 8px; font-size: 14px; color: #1f2937; font-weight: 600;">${formattedTime}</td>
            </tr>
            ${params.type ? `
            <tr>
              <td style="padding-bottom: 8px; font-size: 13px; color: #6b7280;"><strong>Type:</strong></td>
              <td style="padding-bottom: 8px; font-size: 14px; color: #1f2937;">
                <span style="display: inline-block; padding: 2px 8px; background-color: #f0e6e0; color: #7c4040; border-radius: 4px; font-size: 12px; font-weight: 600; text-transform: capitalize;">
                  ${params.type === 'temple' ? 'Temple Seva' : params.type}
                </span>
              </td>
            </tr>
            ` : ''}
            ${params.description ? `
            <tr>
              <td colspan="2" style="padding-top: 8px; border-top: 1px dashed #e2d9d0; font-size: 13px; color: #4b5563; font-style: italic;">
                "${params.description}"
              </td>
            </tr>
            ` : ''}
          </table>
        </td>
      </tr>
    </table>

    ${params.eventLink ? `
      <!-- Action Button -->
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 28px 0 16px 0;">
        <tr>
          <td align="center">
            <a href="${params.eventLink}" target="_blank" style="display: inline-block; padding: 14px 32px; background-color: #9d5d5d; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; border-radius: 10px; box-shadow: 0 4px 10px rgba(157, 93, 93, 0.25); text-align: center;">
              Open Event Dashboard & RSVP
            </a>
          </td>
        </tr>
      </table>
      <p style="margin: 0; text-align: center; font-size: 11px; color: #9ca3af;">
        If button is unclickable, copy link: <a href="${params.eventLink}" style="color: #9d5d5d; text-decoration: underline;">${params.eventLink}</a>
      </p>
    ` : ''}
  `;

  return buildBaseEmailWrapper(innerContent, `Event Notice: ${params.eventTitle}`);
}

export function buildWelcomeEmailHtml(userName: string, userEmail: string, role: string): string {
  const roleTitle = role === 'temple_team' ? 'Temple Seva Volunteer Team' : 'Gathering Host Member';
  const innerContent = `
    <h2 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 700; color: #111827; letter-spacing: -0.2px;">
      Welcome aboard, ${userName}!
    </h2>

    <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #4b5563;">
      Thank you for registering with <strong>The Menu Crew</strong>. Your account has been verified and is ready to organize culinary gatherings and temple sevas.
    </p>

    <!-- Account Details Table -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-left: 4px solid #9d5d5d; border-radius: 8px; margin-bottom: 24px;">
      <tr>
        <td style="padding: 16px 20px;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="padding-bottom: 8px; font-size: 13px; color: #6b7280; width: 110px;"><strong>Username:</strong></td>
              <td style="padding-bottom: 8px; font-size: 14px; color: #1f2937; font-weight: 600;">${userName}</td>
            </tr>
            <tr>
              <td style="padding-bottom: 8px; font-size: 13px; color: #6b7280;"><strong>Email:</strong></td>
              <td style="padding-bottom: 8px; font-size: 14px; color: #1f2937;">${userEmail}</td>
            </tr>
            <tr>
              <td style="font-size: 13px; color: #6b7280;"><strong>Account Type:</strong></td>
              <td style="font-size: 14px; color: #1f2937; font-weight: 500;">${roleTitle}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <p style="margin: 0 0 12px 0; font-size: 14px; line-height: 1.6; color: #4b5563;">
      <strong>What you can do next:</strong>
    </p>
    <ul style="margin: 0 0 24px 0; padding-left: 20px; color: #4b5563; font-size: 13px; line-height: 1.7;">
      <li>Create private gatherings or community temple events.</li>
      <li>Organize dish allocations (appetizers, main course, desserts) with dietary tags.</li>
      <li>Coordinate preparation timelines and send direct guest email invites.</li>
    </ul>
  `;

  return buildBaseEmailWrapper(innerContent, `Welcome to The Menu Crew, ${userName}!`);
}

export function buildLoginAlertEmailHtml(userName: string): string {
  const currentFormattedTime = new Date().toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    hour12: true
  });

  const innerContent = `
    <h2 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 700; color: #111827;">
      Security Alert: Successful Sign-In
    </h2>

    <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #4b5563;">
      Hello <strong>${userName}</strong>,
    </p>

    <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #4b5563;">
      We detected a successful sign-in to your <strong>The Menu Crew</strong> account on <strong>${currentFormattedTime}</strong>.
    </p>

    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-left: 4px solid #16a34a; border-radius: 8px; margin-bottom: 20px;">
      <tr>
        <td style="padding: 14px 18px; font-size: 13px; color: #166534; line-height: 1.6;">
          <strong>Status:</strong> Authentication verified. If this was you, no action is required. If this was not you, please reply immediately to this email or update your password in account settings.
        </td>
      </tr>
    </table>
  `;

  return buildBaseEmailWrapper(innerContent, `Security Alert: Sign-in detected for ${userName}`);
}

export function buildPasswordResetLinkEmailHtml(userName: string, userEmail: string, resetLink: string): string {
  const innerContent = `
    <h2 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 700; color: #111827;">
      Password Reset Request
    </h2>

    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #4b5563;">
      Hello <strong>${userName}</strong>,
    </p>

    <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #4b5563;">
      We received a request to reset the password for your The Menu Crew account associated with <strong>${userEmail}</strong>. Click the button below to set a new password:
    </p>

    <!-- Reset Link Button -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 24px 0 24px 0;">
      <tr>
        <td align="center">
          <a href="${resetLink}" target="_blank" style="display: inline-block; padding: 14px 32px; background-color: #9d5d5d; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; border-radius: 10px; box-shadow: 0 4px 10px rgba(157, 93, 93, 0.25); text-align: center;">
            Reset Password Now
          </a>
        </td>
      </tr>
    </table>

    <p style="margin: 0 0 16px 0; font-size: 12px; color: #6b7280; text-align: center;">
      If the button above does not work, copy and paste this link into your web browser:
      <br/>
      <a href="${resetLink}" style="color: #9d5d5d; word-break: break-all; text-decoration: underline;">${resetLink}</a>
    </p>

    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fefce8; border: 1px solid #fef08a; border-left: 4px solid #eab308; border-radius: 8px; margin-top: 20px;">
      <tr>
        <td style="padding: 12px 16px; font-size: 12px; color: #854d0e; line-height: 1.5;">
          <strong>Notice:</strong> If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.
        </td>
      </tr>
    </table>
  `;

  return buildBaseEmailWrapper(innerContent, `Password Reset Request for ${userName}`);
}

export function buildPasswordResetEmailHtml(userName: string, userEmail: string): string {
  const innerContent = `
    <h2 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 700; color: #111827;">
      Password Reset Confirmation
    </h2>

    <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #4b5563;">
      Hello <strong>${userName}</strong>,
    </p>

    <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #4b5563;">
      This email confirms that the password for your account associated with <strong>${userEmail}</strong> was successfully updated.
    </p>

    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fefce8; border: 1px solid #fef08a; border-left: 4px solid #eab308; border-radius: 8px; margin-bottom: 20px;">
      <tr>
        <td style="padding: 14px 18px; font-size: 13px; color: #854d0e; line-height: 1.5;">
          <strong>Security Notice:</strong> If you did not perform this password change, please reply immediately to this email or contact your account administrator.
        </td>
      </tr>
    </table>
  `;

  return buildBaseEmailWrapper(innerContent, `Password updated for ${userName}`);
}

