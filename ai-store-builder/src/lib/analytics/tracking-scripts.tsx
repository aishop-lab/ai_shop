'use client'

import Script from 'next/script'
import type { MarketingPixels } from './types'

interface TrackingScriptsProps {
  pixels: MarketingPixels | null
}

export function TrackingScripts({ pixels }: TrackingScriptsProps) {
  if (!pixels) return null

  const { facebook_pixel_id, google_analytics_id, google_ads_conversion_id } = pixels

  return (
    <>
      {/* Facebook Pixel */}
      {facebook_pixel_id && (
        <Script
          id="fb-pixel"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${facebook_pixel_id}');
              fbq('track', 'PageView');
            `
          }}
        />
      )}

      {/* Google Analytics 4 */}
      {google_analytics_id && (
        <>
          <Script
            id="ga-script"
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${google_analytics_id}`}
          />
          <Script
            id="ga-init"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${google_analytics_id}', {
                  send_page_view: false
                });
                ${google_ads_conversion_id ? `gtag('config', '${google_ads_conversion_id}');` : ''}
              `
            }}
          />
        </>
      )}

      {/* Google Ads (if GA4 not present but Google Ads is) */}
      {!google_analytics_id && google_ads_conversion_id && (
        <>
          <Script
            id="gads-script"
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${google_ads_conversion_id}`}
          />
          <Script
            id="gads-init"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${google_ads_conversion_id}');
              `
            }}
          />
        </>
      )}
    </>
  )
}
