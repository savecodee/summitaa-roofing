import '@tanstack/react-start/server-only'

import { whopPublicConfig } from '../../config/whop'
import { centsToMajorUnits } from '../../lib/deposit'
import type { FinalInvoiceDraft } from '../../lib/invoice'
import { asRecord, pickString, whopRequest } from './client'

/**
 * The dated pin is required: `2026-10-24` and later route this endpoint to the
 * native invoice API, which only accepts variant items rather than an inline
 * one-time plan. The legacy shape is what supports a project total plus an
 * explicit negative deposit-credit line.
 *
 * `save_as_draft: true` is deliberate. Whop documents it as creating the
 * invoice "as a draft without sending or charging", so this server call can
 * never email the customer or move money; an operator reviews the draft and
 * sends it manually in Whop.
 */
const INVOICES_API_VERSION = '2026-09-22'

export type CreatedInvoice = {
  id: string | null
  status: string | null
  url: string | null
}

/**
 * Reads the legacy invoice response.
 *
 * The legacy `LegacyInvoice` schema defines the hosted payment link as
 * `pay_online_url`; it does not define `invoice_url`, `hosted_url`, or `url`.
 * Those names are kept as fallbacks because older callers/tests used them and a
 * future response shape may add one, but the official field must win when both
 * are present. A missing link is not treated as a failed creation: the invoice
 * may still exist and be reviewed in Whop by its `inv_...` id.
 */
export function readCreatedInvoice(payload: unknown): CreatedInvoice {
  const root = asRecord(payload)
  const nested = asRecord(root.invoice)
  const record = pickString(nested, 'id') ? nested : root

  return {
    id: pickString(record, 'id'),
    status: pickString(record, 'status'),
    url:
      pickString(record, 'pay_online_url') ??
      pickString(record, 'invoice_url') ??
      pickString(record, 'hosted_url') ??
      pickString(record, 'url'),
  }
}

export async function createFinalInvoice(draft: FinalInvoiceDraft): Promise<CreatedInvoice> {
  const payload = await whopRequest('/invoices', {
    method: 'POST',
    apiVersion: INVOICES_API_VERSION,
    idempotencyKey: draft.idempotencyKey,
    timeoutMs: 20_000,
    body: {
      account_id: whopPublicConfig.accountId,
      product_id: whopPublicConfig.productId,
      collection_method: 'send_invoice',
      save_as_draft: true,
      customer_name: draft.customerName,
      email_address: draft.email,
      due_date: draft.dueDate,
      plan: {
        currency: draft.currency,
        plan_type: 'one_time',
        initial_price: centsToMajorUnits(draft.balanceDueCents),
      },
      line_items: draft.lineItems.map((item) => ({
        label: item.label,
        quantity: item.quantity,
        unit_price: item.unit_price,
      })),
    },
  })

  return readCreatedInvoice(payload)
}
