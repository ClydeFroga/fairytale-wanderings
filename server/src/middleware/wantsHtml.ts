export function wantsHtml(accept: string | undefined): boolean {
  if (accept == null || accept.trim() === '') return true
  return accept.includes('text/html') || accept.includes('*/*')
}
