export const DEFAULT_ACCENT = "#c8b5f4";

export function applyAccent(node: HTMLElement, value?: string) {
  const color = value && /^#[0-9a-f]{6}$/i.test(value) ? value : DEFAULT_ACCENT;
  const channels = [1, 3, 5].map((offset) => {
    const channel = parseInt(color.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  const luminance =
    channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722;
  node.style.backgroundColor = color;
  node.style.color = luminance > 0.179 ? "#161616" : "#ffffff";
  node.style.setProperty("--reviewer-accent", color);
  node.style.setProperty(
    "--reviewer-ink",
    luminance > 0.179 ? "#161616" : "#ffffff"
  );
}
