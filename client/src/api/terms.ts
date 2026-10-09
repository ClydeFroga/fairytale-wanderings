import { apiClient } from '@/api/client'
import { ROOT_URL } from '@/config'
import type { SellerInfo } from '@/api/about'

/** Те же форматы и лимит, что проверяет сервер (global/utils/documents.ts). */
const DOCUMENT_EXTENSIONS = ['pdf', 'doc', 'docx', 'odt', 'rtf']
const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024
export const DOCUMENT_ACCEPT = DOCUMENT_EXTENSIONS.map((ext) => `.${ext}`).join(',')

export type DocumentKind = 'offer' | 'privacy'

export type DocumentInfo = { name: string; updatedAt: string }

export type TermsData = {
  payment: string
  delivery: string
  returns: string
  offer: DocumentInfo | null
  privacy: DocumentInfo | null
  seller: SellerInfo
}

// Тексты уходят целиком; файл — только новый, флаг — если документ убирают.
export type TermsInput = {
  payment: string
  delivery: string
  returns: string
  offer: File | null
  privacy: File | null
  removeOffer: boolean
  removePrivacy: boolean
}

export function getTerms() {
  return apiClient.requestJson<TermsData>('/content/terms')
}

export function saveTerms(input: TermsInput) {
  const fd = new FormData()
  fd.set('payment', input.payment)
  fd.set('delivery', input.delivery)
  fd.set('returns', input.returns)
  if (input.offer) fd.set('offer', input.offer)
  if (input.privacy) fd.set('privacy', input.privacy)
  if (input.removeOffer) fd.set('removeOffer', 'true')
  if (input.removePrivacy) fd.set('removePrivacy', 'true')
  return apiClient.requestJson<TermsData>('/content/terms', { method: 'PATCH', body: fd })
}

/** Постоянный адрес файла: не меняется, когда владелица заменяет документ. */
export function documentUrl(kind: DocumentKind): string {
  return `${ROOT_URL}/content/terms/${kind}`
}

/** Что не так с файлом (текст для CRM) или null. Окончательно проверяет сервер. */
export function documentProblem(file: File): string | null {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (!file.name.includes('.') || !DOCUMENT_EXTENSIONS.includes(ext)) {
    return 'Файл должен быть PDF, DOC, DOCX, ODT или RTF'
  }
  if (file.size > MAX_DOCUMENT_BYTES) return 'Файл больше 10 МБ'
  return null
}

export function formatDocumentDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU')
}
