'use client'

import { CreditCard, Minus, Plus, ShoppingBag, Wrench } from 'lucide-react'
import { useMemo, useState } from 'react'
import { formatCop } from '@/lib/money'

type Product = {
  id: string
  name: string
  description: string
  price: number
  stock: number
  imageUrl: string | null
  category: { name: string }
}

type Service = {
  id: string
  name: string
  description: string
  basePrice: number
  duration: string
  category: { name: string }
}

type CartItem = {
  id: string
  itemType: 'PRODUCT' | 'SERVICE'
  name: string
  price: number
  quantity: number
}

const paymentOptions = [
  { value: 'WOMPI', label: 'Wompi', detail: 'Tarjeta, Nequi y métodos habilitados' },
  { value: 'PSE', label: 'PSE', detail: 'Débito desde bancos colombianos' },
  { value: 'SISTECREDITO', label: 'Sistecrédito', detail: 'Servicios a cuotas' },
  { value: 'ADDI', label: 'ADDI', detail: 'Financiación flexible' },
] as const

export function CommerceShell({ products, services }: { products: Product[]; services: Service[] }) {
  const [cart, setCart] = useState<CartItem[]>([])
  const [provider, setProvider] = useState<(typeof paymentOptions)[number]['value']>('WOMPI')
  const [installments, setInstallments] = useState(6)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const subtotal = useMemo(() => cart.reduce((total, item) => total + item.price * item.quantity, 0), [cart])
  const shipping = cart.some((item) => item.itemType === 'PRODUCT') ? 12000 : 0
  const total = subtotal + shipping
  const usesInstallments = provider === 'SISTECREDITO' || provider === 'ADDI'

  function addItem(item: CartItem) {
    setCart((current) => {
      const existing = current.find((cartItem) => cartItem.id === item.id && cartItem.itemType === item.itemType)
      if (!existing) return [...current, item]
      return current.map((cartItem) =>
        cartItem.id === item.id && cartItem.itemType === item.itemType
          ? { ...cartItem, quantity: cartItem.quantity + 1 }
          : cartItem,
      )
    })
  }

  function increment(item: CartItem, amount: number) {
    setCart((current) =>
      current
        .map((cartItem) =>
          cartItem.id === item.id && cartItem.itemType === item.itemType
            ? { ...cartItem, quantity: Math.max(0, cartItem.quantity + amount) }
            : cartItem,
        )
        .filter((cartItem) => cartItem.quantity > 0),
    )
  }

  async function checkout(formData: FormData) {
    setLoading(true)
    setMessage('')

    const response = await fetch('/api/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          mutation CreateOrder($input: CheckoutInput!) {
            createOrder(input: $input) {
              orderNumber
              total
              payments { provider status redirectUrl externalReference installments }
            }
          }
        `,
        variables: {
          input: {
            customerName: formData.get('customerName'),
            customerEmail: formData.get('customerEmail'),
            customerPhone: formData.get('customerPhone'),
            city: formData.get('city'),
            address: formData.get('address'),
            provider,
            installments: usesInstallments ? installments : null,
            items: cart.map((item) => ({
              itemType: item.itemType,
              itemId: item.id,
              quantity: item.quantity,
            })),
          },
        },
      }),
    })

    const payload = await response.json()
    setLoading(false)

    if (payload.errors?.length) {
      setMessage(payload.errors[0].message)
      return
    }

    const order = payload.data.createOrder
    setCart([])
    setMessage(`Orden ${order.orderNumber} creada. Pago ${order.payments[0].provider} en estado ${order.payments[0].status}.`)
  }

  return (
    <main className="workspace">
      <section className="hero">
        <div>
          <p className="eyebrow">Ecommerce y servicios en Colombia</p>
          <h1>Productos, reparaciones y pagos locales desde un solo flujo.</h1>
          <p>
            Catálogo con productos, servicios técnicos, checkout en pesos colombianos y registro de pagos por Wompi,
            PSE, Sistecrédito o ADDI.
          </p>
        </div>
        <div className="heroPanel">
          <span>Orden promedio</span>
          <strong>{formatCop(238900)}</strong>
          <small>Datos demo listos para reemplazar por métricas reales.</small>
        </div>
      </section>

      <section className="contentGrid">
        <div className="catalog">
          <div className="sectionTitle">
            <ShoppingBag size={20} />
            <h2>Productos</h2>
          </div>
          <div className="itemGrid">
            {products.map((product) => (
              <article className="itemCard" key={product.id}>
                <div
                  className="productImage"
                  style={{ backgroundImage: product.imageUrl ? `url(${product.imageUrl})` : undefined }}
                />
                <span>{product.category.name}</span>
                <h3>{product.name}</h3>
                <p>{product.description}</p>
                <div className="cardFooter">
                  <strong>{formatCop(product.price)}</strong>
                  <button
                    onClick={() =>
                      addItem({
                        id: product.id,
                        itemType: 'PRODUCT',
                        name: product.name,
                        price: product.price,
                        quantity: 1,
                      })
                    }
                  >
                    <Plus size={16} /> Agregar
                  </button>
                </div>
              </article>
            ))}
          </div>

          <div className="sectionTitle">
            <Wrench size={20} />
            <h2>Servicios</h2>
          </div>
          <div className="itemGrid">
            {services.map((service) => (
              <article className="itemCard serviceCard" key={service.id}>
                <span>{service.category.name}</span>
                <h3>{service.name}</h3>
                <p>{service.description}</p>
                <small>{service.duration}</small>
                <div className="cardFooter">
                  <strong>{formatCop(service.basePrice)}</strong>
                  <button
                    onClick={() =>
                      addItem({
                        id: service.id,
                        itemType: 'SERVICE',
                        name: service.name,
                        price: service.basePrice,
                        quantity: 1,
                      })
                    }
                  >
                    <Plus size={16} /> Agregar
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>

        <aside className="checkout">
          <div className="sectionTitle">
            <CreditCard size={20} />
            <h2>Checkout</h2>
          </div>

          <div className="cartList">
            {cart.length === 0 ? (
              <p className="muted">Agrega productos o servicios para crear una orden.</p>
            ) : (
              cart.map((item) => (
                <div className="cartItem" key={`${item.itemType}-${item.id}`}>
                  <div>
                    <strong>{item.name}</strong>
                    <span>{formatCop(item.price)}</span>
                  </div>
                  <div className="stepper">
                    <button aria-label="Disminuir" onClick={() => increment(item, -1)}>
                      <Minus size={14} />
                    </button>
                    <span>{item.quantity}</span>
                    <button aria-label="Aumentar" onClick={() => increment(item, 1)}>
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="totals">
            <span>Subtotal <strong>{formatCop(subtotal)}</strong></span>
            <span>Envío <strong>{formatCop(shipping)}</strong></span>
            <span>Total <strong>{formatCop(total)}</strong></span>
          </div>

          <form action={checkout} className="checkoutForm">
            <input name="customerName" placeholder="Nombre completo" required />
            <input name="customerEmail" type="email" placeholder="Correo" required />
            <input name="customerPhone" placeholder="Celular" required />
            <div className="formRow">
              <input name="city" placeholder="Ciudad" required />
              <input name="address" placeholder="Dirección" required />
            </div>

            <div className="paymentGrid">
              {paymentOptions.map((option) => (
                <button
                  className={provider === option.value ? 'selected' : ''}
                  key={option.value}
                  onClick={() => setProvider(option.value)}
                  type="button"
                >
                  <strong>{option.label}</strong>
                  <span>{option.detail}</span>
                </button>
              ))}
            </div>

            {usesInstallments && (
              <label className="installments">
                Cuotas
                <input
                  max={36}
                  min={2}
                  onChange={(event) => setInstallments(Number(event.target.value))}
                  type="number"
                  value={installments}
                />
              </label>
            )}

            <button className="primary" disabled={cart.length === 0 || loading} type="submit">
              {loading ? 'Creando orden...' : 'Crear orden y pago'}
            </button>
            {message && <p className="message">{message}</p>}
          </form>
        </aside>
      </section>
    </main>
  )
}
