import { ROOT_URL } from '@/config'

type RequestOptions = {
  method?: string
  body?: unknown
  headers?: Record<string, string>
}

type ApiErrorBody = {
  error?: string
  code?: string
  details?: unknown
}

// Ошибка запроса с машиночитаемым кодом и деталями от сервера.
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly details?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export class ApiClient {
  constructor(private readonly baseUrl: string = ROOT_URL) {}

  async request(path: string, options: RequestOptions = {}) {
    const { method = 'GET', body, headers } = options

    // FormData отправляем как есть — Content-Type (с boundary) выставит браузер.
    const isFormData = body instanceof FormData

    const finalHeaders: Record<string, string> = { ...headers }
    if (body !== undefined && !isFormData) finalHeaders['Content-Type'] = 'application/json'

    return fetch(this.baseUrl + path, {
      method,
      headers: Object.keys(finalHeaders).length ? finalHeaders : undefined,
      body: body === undefined ? undefined : isFormData ? (body as FormData) : JSON.stringify(body),
    })
  }

  async requestJson<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const response = await this.request(path, options)

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as ApiErrorBody | null
      throw new ApiError(
        body?.error || `Ошибка запроса: ${response.status}`,
        response.status,
        body?.code,
        body?.details,
      )
    }

    return response.json() as Promise<T>
  }
}

export const apiClient = new ApiClient()
