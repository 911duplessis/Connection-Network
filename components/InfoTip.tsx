// Tap-to-reveal micro-explanation, not a hover tooltip -- most of this app's
// traffic is mobile, and hover states don't exist on touch. Built on native
// <details>/<summary> so it needs no client-side state and stays accessible
// (keyboard-focusable, screen-reader friendly) for free.
export default function InfoTip({ text }: { text: string }) {
  return (
    <details className="group relative inline-block align-middle">
      <summary
        className="flex h-4 w-4 cursor-pointer list-none items-center justify-center rounded-full border border-white/30 text-[10px] font-bold leading-none text-white/50 hover:border-white/50 hover:text-white/80 [&::-webkit-details-marker]:hidden"
        aria-label="More info"
      >
        i
      </summary>
      <div className="absolute right-0 top-7 z-20 w-56 max-w-[80vw] rounded-md border border-white/10 bg-[#11151f] p-3 text-xs font-normal leading-relaxed text-white/70 shadow-xl">
        {text}
      </div>
    </details>
  )
}
