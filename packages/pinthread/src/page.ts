/** Static hosts may add a trailing slash to the same page. */
export function canonicalPage(pathname: string): string {
  return pathname.replace(/\/+$/, "") || "/";
}
