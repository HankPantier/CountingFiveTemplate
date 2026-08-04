import Script from 'next/script'

// The booking widget itself (no Section wrapper), shared by the Booking page
// block and the contact drawer's "Book a call" view. Renders nothing when the
// provider is 'none' or the url is blank, so an unconfigured client is safe.
export function BookingEmbed({
  provider,
  url,
  height = 700,
}: {
  provider: 'calendly' | 'iframe' | 'none'
  url: string
  height?: number
}) {
  if (provider === 'none' || !url) return null

  if (provider === 'calendly') {
    return (
      <>
        <div
          className="calendly-inline-widget"
          data-url={url}
          style={{ minWidth: 280, height }}
          data-slot="widget"
        />
        <Script src="https://assets.calendly.com/assets/external/widget.js" strategy="lazyOnload" />
      </>
    )
  }

  return (
    <iframe
      src={url}
      title="Book a meeting"
      loading="lazy"
      className="w-full"
      style={{ height, border: 0 }}
      data-slot="widget"
    />
  )
}
