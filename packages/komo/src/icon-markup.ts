import {
  ArrowUp,
  Check,
  ChevronDown,
  ChevronsUpDown,
  CodeXml,
  Copy,
  Ellipsis,
  GitBranch,
  Info,
  Link,
  MessageCircle,
  MousePointer2,
  PanelRight,
  PencilLine,
  Plus,
  Search,
  Smile,
  Trash2,
  User,
  X,
  type IconNode,
} from "lucide";

// Lucide (ISC) icon data, serialized once. The package build evaluates this
// module and inlines the SVG strings, so browser code never loads Lucide.
export type IconName =
  | "chevron"
  | "drawer"
  | "edit"
  | "trash"
  | "info"
  | "more"
  | "person"
  | "search"
  | "plus"
  | "comment"
  | "copy"
  | "pointer"
  | "expand"
  | "close"
  | "check"
  | "arrow"
  | "link"
  | "code"
  | "smile"
  | "branch";

export const iconNodes: Record<IconName, IconNode> = {
  chevron: ChevronDown,
  drawer: ChevronsUpDown,
  edit: PencilLine,
  trash: Trash2,
  info: Info,
  more: Ellipsis,
  person: User,
  search: Search,
  plus: Plus,
  comment: MessageCircle,
  copy: Copy,
  pointer: MousePointer2,
  expand: PanelRight,
  close: X,
  check: Check,
  arrow: ArrowUp,
  link: Link,
  code: CodeXml,
  smile: Smile,
  branch: GitBranch,
};

const escapeAttribute = (value: string | number) =>
  String(value).replace(
    /[&"<>]/g,
    (character) =>
      ({ "&": "&amp;", '"': "&quot;", "<": "&lt;", ">": "&gt;" })[character]!,
  );

const attributes = (values: Record<string, string | number | undefined>) =>
  Object.entries(values)
    .filter(([, value]) => value !== undefined)
    .map(([name, value]) => ` ${name}="${escapeAttribute(value!)}"`)
    .join("");

/** Serialize Lucide icon data to a decorative, currentColor SVG string. */
export function iconSvg(node: IconNode): string {
  const children = node
    .map(([tag, values]) => `<${tag}${attributes(values)}></${tag}>`)
    .join("");
  return `<svg${attributes({
    xmlns: "http://www.w3.org/2000/svg",
    width: 24,
    height: 24,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    "stroke-width": 2,
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    "aria-hidden": "true",
  })}>${children}</svg>`;
}

export const iconMarkup = Object.fromEntries(
  Object.entries(iconNodes).map(([name, node]) => [name, iconSvg(node)]),
) as Record<IconName, string>;
