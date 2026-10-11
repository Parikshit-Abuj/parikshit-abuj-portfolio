"use client";
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return <main className="state-page"><span className="eyebrow">A brief interruption</span><h1>Let’s try that again.</h1><p>The page could not be loaded. Your saved content is safe.</p><button className="button primary" onClick={reset}>Try again</button><a className="text-link" href="/">Back to portfolio</a></main>;
}
