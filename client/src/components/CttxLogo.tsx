/**
 * CTTX brand logo.
 * Uses the official dark-background PNG from the CTTX Services site.
 */

const LOGO_URL =
  "https://cttxsrvcs-zatfctzm.manus.space/manus-storage/cttx-logo-dark-bg_0856a61b.png";

type Props = {
  /** Tailwind height class, e.g. "h-8" (default). Width scales automatically. */
  height?: string;
  className?: string;
};

export function CttxLogo({ height = "h-8", className = "" }: Props) {
  return (
    <img
      src={LOGO_URL}
      alt="CTTX Services"
      className={`${height} w-auto object-contain ${className}`}
      draggable={false}
    />
  );
}
