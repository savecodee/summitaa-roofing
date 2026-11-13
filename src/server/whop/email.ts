import '@tanstack/react-start/server-only'

import { pricingPlans, serviceOptions, siteConfig } from '@/config'
import { asRecord, pickString } from './client'

export type EstimateEmailInput = {
  to: string
  customerName: string
  requestId: string
  service: string
  zip: string
  details?: string
}

export type JourneyEmailInput = {
  to: string
  requestId: string
  planKey?: string | null
  plansUrl: string
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function serviceLabel(service: string): string {
  return serviceOptions.find((option) => option.value === service)?.label ?? service
}

function readEnv(name: string): string | null {
  if (typeof process === 'undefined' || !process.env) return null
  const value = process.env[name]
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function isEmailConfigured(): boolean {
  return Boolean(readEnv('RESEND_API_KEY') && readEnv('EMAIL_FROM'))
}

type ResendEmail = {
  apiKey: string
  from: string
  idempotencyKey: string
  subject: string
  html: string
  to: string
}

/**
 * Sends one email through Resend. Only the official Resend host is allowed, so
 * a misconfigured value cannot redirect the API key to an attacker-controlled
 * endpoint.
 */
async function sendResendEmail(input: ResendEmail): Promise<boolean> {
  const baseUrl = readEnv('RESEND_API_BASE_URL') ?? 'https://api.resend.com'
  if (!/^https:\/\/api\.resend\.com\/?$/.test(baseUrl.replace(/\/$/, ''))) {
    return false
  }

  const normalizedBase = baseUrl.replace(/\/$/, '')

  const response = await fetch(`${normalizedBase}/emails`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${input.apiKey}`,
      'content-type': 'application/json',
      'idempotency-key': input.idempotencyKey,
    },
    body: JSON.stringify({
      from: input.from,
      to: [input.to],
      subject: input.subject,
      html: input.html,
    }),
  })

  if (!response.ok) return false

  const payload = await response.json().catch(() => null)
  const record = asRecord(payload)
  return Boolean(pickString(record, 'id'))
}

function emailShell(title: string, body: string, footer: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f7f2e9;font-family:Manrope,ui-sans-serif,system-ui,sans-serif;color:#0d202b;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f2e9;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fcfaf5;border:1px solid #ddd4c6;">
          <tr>
            <td style="background:#0d202b;padding:24px 28px;color:#f7f2e9;">
              <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:#d9a27d;">${escapeHtml(siteConfig.name)}</p>
              <h1 style="margin:8px 0 0;font-family:Fraunces,Georgia,serif;font-size:26px;font-weight:500;line-height:1.1;">${escapeHtml(title)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              ${body}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px;border-top:1px solid #ddd4c6;font-size:11px;color:#50616a;line-height:1.6;">
              ${footer}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export async function sendEstimateConfirmation(input: EstimateEmailInput): Promise<boolean> {
  const apiKey = readEnv('RESEND_API_KEY')
  const from = readEnv('EMAIL_FROM')
  if (!apiKey || !from) return false

  const label = serviceLabel(input.service)

  const html = emailShell(
    'We received your estimate request.',
    `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;">Hello ${escapeHtml(input.customerName)},</p>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.7;">Thank you for reaching out to ${escapeHtml(siteConfig.name)}. Your request has been recorded and our team will review it and contact you to schedule an inspection and prepare a written scope.</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #ddd4c6;background:#f7f2e9;margin:0 0 20px;">
                <tr><td style="padding:12px 16px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:#50616a;">Request details</td></tr>
                <tr><td style="padding:0 16px 14px;">
                  <p style="margin:6px 0;font-size:14px;"><strong>Request ID:</strong> ${escapeHtml(input.requestId)}</p>
                  <p style="margin:6px 0;font-size:14px;"><strong>Service:</strong> ${escapeHtml(label)}</p>
                  <p style="margin:6px 0;font-size:14px;"><strong>Property ZIP:</strong> ${escapeHtml(input.zip)}</p>
                  ${input.details ? `<p style="margin:6px 0;font-size:14px;"><strong>Notes:</strong> ${escapeHtml(input.details)}</p>` : ''}
                </td></tr>
              </table>
              <p style="margin:0 0 16px;font-size:14px;line-height:1.7;color:#50616a;">If anything about your request needs correction, reply to this email and we will update it. A ${escapeHtml(siteConfig.shortName)} specialist will follow up with you shortly.</p>
              <p style="margin:0;font-size:14px;line-height:1.7;">— ${escapeHtml(siteConfig.name)}<br />Inspection-first residential roofing</p>`,
    'This is an automated confirmation for your estimate request. It is not a quote or an offer. Actual pricing depends on an on-site inspection and a signed written agreement.',
  )

  return sendResendEmail({
    apiKey,
    from,
    idempotencyKey: `estimate-email-${input.requestId}`,
    subject: `We received your estimate request (${input.requestId})`,
    html,
    to: input.to,
  })
}

/**
 * Confirms the email-first entry. This does not create an account or verify
 * ownership of the address; it only confirms that the address was received and
 * shows the plans the visitor can select without signing in.
 */
export async function sendJourneyConfirmation(input: JourneyEmailInput): Promise<boolean> {
  const apiKey = readEnv('RESEND_API_KEY')
  const from = readEnv('EMAIL_FROM')
  if (!apiKey || !from) return false

  const selected = input.planKey
    ? pricingPlans.find((plan) => plan.key === input.planKey)
    : null

  const planRows = pricingPlans
    .map((plan) => {
      const isSelected = selected?.key === plan.key
      return `<tr>
        <td style="padding:12px 16px;border-top:1px solid #ddd4c6;">
          <p style="margin:0;font-size:14px;font-weight:700;color:#0d202b;">${escapeHtml(plan.name)}${
            isSelected ? ' <span style="color:#9a5a32;">(selected)</span>' : ''
          }</p>
          <p style="margin:4px 0 0;font-size:13px;color:#50616a;">${escapeHtml(plan.priceNote)}</p>
        </td>
        <td style="padding:12px 16px;border-top:1px solid #ddd4c6;text-align:right;font-size:16px;font-weight:700;color:#0d202b;white-space:nowrap;">$${plan.amountUsd}</td>
      </tr>`
    })
    .join('')

  const html = emailShell(
    'Your plan selection is saved for this visit.',
    `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;">Hello,</p>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.7;">We received <strong>${escapeHtml(input.to)}</strong>. No account or password was created, and you can choose any of the plans below without signing in to Whop.</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #ddd4c6;background:#f7f2e9;margin:0 0 22px;">
                <tr><td colspan="2" style="padding:12px 16px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:#50616a;">Available plans</td></tr>
                ${planRows}
              </table>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.7;">
                <a href="${escapeHtml(input.plansUrl)}" style="display:inline-block;background:#9a5a32;color:#ffffff;text-decoration:none;padding:13px 22px;font-size:14px;font-weight:700;">Choose a plan</a>
              </p>
              <p style="margin:0;font-size:14px;line-height:1.7;color:#50616a;">Payment is collected by Whop in secure, PCI-isolated fields. This site never sees or stores your card number.</p>`,
    'This is an automated confirmation. It is not a quote, an offer, or a receipt. Plan prices are configurable examples; actual project pricing depends on an on-site inspection and a signed written agreement.',
  )

  return sendResendEmail({
    apiKey,
    from,
    idempotencyKey: `journey-email-${input.requestId}`,
    subject: `Your ${siteConfig.shortName} plan selection`,
    html,
    to: input.to,
  })
}
