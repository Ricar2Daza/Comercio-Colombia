export type PaymentProvider = 'PSE' | 'WOMPI' | 'SISTECREDITO' | 'ADDI'

type PaymentRequest = {
  orderNumber: string
  amount: number
  provider: PaymentProvider
  installments?: number | null
}

export function buildPaymentAttempt(input: PaymentRequest) {
  const reference = `${input.provider}-${input.orderNumber}-${Date.now()}`
  const isCredit = input.provider === 'SISTECREDITO' || input.provider === 'ADDI'

  return {
    status: 'PENDING' as const,
    externalReference: reference,
    installments: isCredit ? input.installments ?? 6 : null,
    redirectUrl: `/checkout/${input.orderNumber}?provider=${input.provider.toLowerCase()}`,
    providerPayloadJson: JSON.stringify({
      country: 'CO',
      currency: 'COP',
      provider: input.provider,
      reference,
      amountInCents: Math.round(input.amount * 100),
      mode: isCredit ? 'installments' : 'single_payment',
    }),
  }
}
