/** Canvas screenshot of Livepeer text-to-speech in ComfyUI Desktop. */
export function HeroDiagram() {
  return (
    <figure className="overflow-hidden rounded-lg border border-border bg-surface">
      <img
        src="/comfyui-text-to-speech.jpg"
        alt="ComfyUI Desktop with a Livepeer Audio text-to-speech node wired to Preview Audio, and a ComfyPeer account signed in."
        width={1024}
        height={718}
        className="h-auto w-full"
      />
      <figcaption className="px-4 py-3 text-center text-xs text-faint">
        Text-to-speech on the ComfyUI canvas, signed in with a ComfyPeer account.
      </figcaption>
    </figure>
  );
}
