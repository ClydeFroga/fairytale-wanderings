export abstract class ServerSend {
  abstract send(body: object, url: string, method: string): Promise<any>
}

export class Send implements ServerSend {
  constructor() {}

  async send(body: object, url: string, method: string) {
    const response = await fetch(import.meta.env.VITE_API_URL + url, {
      method: method,
      body: JSON.stringify(body),
    })

    return response
  }

  protected getInfo(response: Response) {
    return response.json()
  }

  protected getError(error: any) {
    console.log(error)
  }
}

export class MakeOrder extends Send {
  constructor() {
    super()
  }

  async send(body: {
    items: {
      productId: string
      quantity: number
    }[]
    deliveryAddress: string
  }) {
    try {
      const response = await super.send(body, '/orders/create', 'POST')

      return this.getInfo(response)
    } catch (error) {
      this.getError(error)
    }
  }
}
