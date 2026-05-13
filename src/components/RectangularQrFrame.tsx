export function RectangularQrFrame({ src }: { src: string }) {
  return (
    <div className="inline-flex items-stretch overflow-hidden rounded-md border bg-white">
      <div className="flex flex-col items-center justify-center bg-foreground px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-background">
        <span className="[writing-mode:vertical-rl] rotate-180">PAH · Verified</span>
      </div>
      <img src={src} alt="Verification QR code" className="h-40 w-40 object-contain" />
    </div>
  );
}
