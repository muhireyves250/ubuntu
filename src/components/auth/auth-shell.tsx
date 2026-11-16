import Image from "next/image";
import { AuthSlider } from "./auth-slider";

// Full-screen, edge-to-edge split for the signed-out pages: the slider panel
// on the left, the form in a narrow column centred on the right. Below lg the
// panel is gone and a small brand row heads the form instead. `footer` is
// pinned to the bottom of the form column.
export function AuthShell({
  children,
  footer,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-white lg:flex-row">
      <AuthSlider />
      <main className="flex flex-1 flex-col px-5 py-6 sm:px-10 sm:py-10 lg:px-12">
        <div className="flex items-center gap-2.5 lg:hidden">
          <Image src="/logo-mark-v3.png" alt="" width={40} height={40} className="h-10 w-10 object-contain" />
          <span className="text-base font-semibold tracking-tight text-zinc-900">ubuntumed</span>
        </div>
        <div className="flex flex-1 flex-col justify-center py-8">
          <div className="mx-auto w-full max-w-sm">{children}</div>
        </div>
        {footer ? <p className="text-center text-xs text-zinc-500">{footer}</p> : null}
      </main>
    </div>
  );
}
