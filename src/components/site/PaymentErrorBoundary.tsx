import { Component, type ErrorInfo, type ReactNode } from 'react'

type PaymentErrorBoundaryProps = {
  children: ReactNode
  title?: string
  description?: string
}

type PaymentErrorBoundaryState = {
  hasError: boolean
}

/**
 * Catches render-time failures from Whop Elements.
 *
 * A misplaced element (for example a Payments-only element inside `<Checkout>`)
 * throws during render. Without a boundary that error escapes to the router and
 * replaces the whole page with the generic "Something went wrong!" screen. This
 * keeps the surrounding page intact and tells the buyer that no payment was
 * taken.
 */
export class PaymentErrorBoundary extends Component<
  PaymentErrorBoundaryProps,
  PaymentErrorBoundaryState
> {
  state: PaymentErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): PaymentErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Whop Elements failed to render', error, info.componentStack)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="mt-5 border border-error/30 bg-[#fbf0ec] p-4" role="alert">
        <p className="text-[12px] font-bold text-error">
          {this.props.title ?? 'The secure payment form could not be displayed.'}
        </p>
        <p className="mt-1.5 text-[11px] leading-[1.7] text-slate">
          {this.props.description ??
            'No payment has been taken. Reload the page to try again, and contact the office if it keeps happening.'}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 inline-flex min-h-10 items-center justify-center border border-ink bg-ink px-4 py-2 text-[11px] font-semibold text-cream transition-colors hover:bg-ink-soft"
        >
          Reload page
        </button>
      </div>
    )
  }
}
