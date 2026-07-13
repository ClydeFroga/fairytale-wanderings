import { ROOT_URL } from '@/config'

type RequestOptions = {
  method?: string
  body?: unknown
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
    const { method = 'GET', body } = options

    return fetch(this.baseUrl + path, {
      method,
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
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
