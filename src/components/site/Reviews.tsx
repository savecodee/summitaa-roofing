import { copy } from '@/config'
import { Star } from './icons'
import { Container, Eyebrow } from './primitives'

export function Reviews() {
  return (
    <section
      id="reviews"
      aria-labelledby="reviews-heading"
      className="border-b border-line bg-cream"
    >
      <Container className="py-20 sm:py-24 lg:py-28">
        <div className="max-w-[720px] mx-auto text-center">
          <Eyebrow>{copy.reviews.eyebrow}</Eyebrow>
          <h2
            id="reviews-heading"
            className="mt-5 font-display text-[clamp(2.5rem,4.8vw,4.4rem)] font-medium leading-[1.02] tracking-[-0.035em] text-ink balance"
          >
            {copy.reviews.title}
          </h2>
          <p className="mt-6 max-w-[580px] mx-auto text-[14.5px] leading-[1.85] text-slate pretty">
            {copy.reviews.intro}
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3 lg:max-w-[1100px] lg:mx-auto">
          {copy.reviews.items.map((review, index) => (
            <article
              key={index}
              className="relative flex flex-col border border-line bg-paper p-6 shadow-card-tight transition-[border-color,box-shadow] duration-300 hover:border-ink/25 hover:shadow-service"
            >
              <div className="flex items-center gap-1" aria-label={`${review.rating} out of 5 stars`}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`size-4.5 shrink-0 ${
                      star <= review.rating ? 'text-copper' : 'text-line'
                    }`}
                    fill={star <= review.rating ? 'currentColor' : 'none'}
                    stroke={star <= review.rating ? 'none' : 'currentColor'}
                  />
                ))}
              </div>
              <blockquote className="mt-4 flex-1">
                <p className="text-[14px] leading-[1.75] text-ink pretty">
                  {review.text}
                </p>
              </blockquote>
              <footer className="mt-6 pt-5 border-t border-line">
                <div className="flex items-center gap-3">
                  <div className="size-10 shrink-0 rounded-full bg-copper/[0.15] flex items-center justify-center">
                    <span className="text-[14px] font-bold text-copper">
                      {review.author.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-ink">{review.author}</p>
                    <p className="text-[11px] text-slate">{review.location}</p>
                  </div>
                </div>
              </footer>
            </article>
          ))}
        </div>

        <div className="mt-10 text-center border-t border-line pt-8">
          <p className="text-[11px] leading-[1.7] text-slate">
            {copy.reviews.disclaimer}
          </p>
        </div>
      </Container>
    </section>
  )
}