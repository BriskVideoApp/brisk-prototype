export type Emphasis = "bold" | "italic";

export function EmphasisButtons({ bold, italic, preserveSelection, onToggle }: {
  bold: boolean;
  italic: boolean;
  preserveSelection?: boolean;
  onToggle: (style: Emphasis) => void;
}) {
  return <>{(["bold", "italic"] as const).map((style) => {
    const isBold = style === "bold";
    const active = isBold ? bold : italic;
    return <button key={style} type="button" aria-label={isBold ? "Bold" : "Italic"}
      aria-keyshortcuts={isBold ? "Control+B Meta+B" : "Control+I Meta+I"}
      aria-pressed={active} className={active ? "active" : ""}
      onMouseDown={preserveSelection ? (event) => event.preventDefault() : undefined}
      onClick={() => onToggle(style)}>{isBold ? <strong>B</strong> : <em>I</em>}</button>;
  })}</>;
}
