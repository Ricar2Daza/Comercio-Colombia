'use client'

import { Boxes, ClipboardList, Plus, Wrench } from 'lucide-react'
import { useEffect, useState } from 'react'
import { formatCop } from '@/lib/money'

type Category = { id: string; name: string }
type ServiceCategory = { id: string; name: string }
type Product = { id: string; name: string; price: number; stock: number; category: Category }
type Service = { id: string; name: string; basePrice: number; duration: string; category: ServiceCategory }
type Order = { id: string; orderNumber: string; status: string; total: number; customerName: string }

const dashboardQuery = `
  query Dashboard {
    categories { id name }
    serviceCategories { id name }
    products { id name price stock category { id name } }
    services { id name basePrice duration category { id name } }
    orders { id orderNumber status total customerName }
  }
`

export default function AdminPage() {
  const [data, setData] = useState<{
    categories: Category[]
    serviceCategories: ServiceCategory[]
    products: Product[]
    services: Service[]
    orders: Order[]
  } | null>(null)
  const [message, setMessage] = useState('')

  async function loadDashboard() {
    const response = await fetch('/api/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: dashboardQuery }),
    })
    const payload = await response.json()
    setData(payload.data)
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  async function submitProduct(formData: FormData) {
    setMessage('')
    const response = await fetch('/api/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          mutation CreateProduct($input: ProductInput!) {
            createProduct(input: $input) { id name }
          }
        `,
        variables: {
          input: {
            name: formData.get('name'),
            description: formData.get('description'),
            price: Number(formData.get('price')),
            stock: Number(formData.get('stock')),
            imageUrl: formData.get('imageUrl'),
            categoryId: formData.get('categoryId'),
          },
        },
      }),
    })
    const payload = await response.json()
    setMessage(payload.errors?.[0]?.message ?? 'Producto registrado.')
    await loadDashboard()
  }

  async function submitService(formData: FormData) {
    setMessage('')
    const response = await fetch('/api/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          mutation CreateService($input: ServiceInput!) {
            createService(input: $input) { id name }
          }
        `,
        variables: {
          input: {
            name: formData.get('name'),
            description: formData.get('description'),
            basePrice: Number(formData.get('basePrice')),
            duration: formData.get('duration'),
            categoryId: formData.get('categoryId'),
          },
        },
      }),
    })
    const payload = await response.json()
    setMessage(payload.errors?.[0]?.message ?? 'Servicio registrado.')
    await loadDashboard()
  }

  return (
    <main className="adminWorkspace">
      <section className="adminHeader">
        <div>
          <p className="eyebrow">Panel administrativo</p>
          <h1>Catálogo, servicios y órdenes</h1>
        </div>
        <div className="statStrip">
          <span><Boxes size={18} /> {data?.products.length ?? 0} productos</span>
          <span><Wrench size={18} /> {data?.services.length ?? 0} servicios</span>
          <span><ClipboardList size={18} /> {data?.orders.length ?? 0} órdenes</span>
        </div>
      </section>

      <section className="adminGrid">
        <form action={submitProduct} className="adminForm">
          <h2><Plus size={18} /> Registrar producto</h2>
          <input name="name" placeholder="Nombre" required />
          <textarea name="description" placeholder="Descripción" required />
          <div className="formRow">
            <input name="price" min="1" placeholder="Precio COP" required type="number" />
            <input name="stock" min="0" placeholder="Stock" required type="number" />
          </div>
          <input name="imageUrl" placeholder="URL de imagen" />
          <select name="categoryId" required>
            <option value="">Categoría</option>
            {data?.categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <button className="primary" type="submit">Guardar producto</button>
        </form>

        <form action={submitService} className="adminForm">
          <h2><Plus size={18} /> Registrar servicio</h2>
          <input name="name" placeholder="Nombre" required />
          <textarea name="description" placeholder="Descripción" required />
          <div className="formRow">
            <input name="basePrice" min="1" placeholder="Precio base COP" required type="number" />
            <input name="duration" placeholder="Duración" required />
          </div>
          <select name="categoryId" required>
            <option value="">Categoría de servicio</option>
            {data?.serviceCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <button className="primary" type="submit">Guardar servicio</button>
        </form>
      </section>

      {message && <p className="message wide">{message}</p>}

      <section className="tableGrid">
        <div className="tablePanel">
          <h2>Productos activos</h2>
          {data?.products.map((product) => (
            <div className="row" key={product.id}>
              <span>{product.name}<small>{product.category.name}</small></span>
              <strong>{formatCop(product.price)} · {product.stock} und.</strong>
            </div>
          ))}
        </div>
        <div className="tablePanel">
          <h2>Servicios activos</h2>
          {data?.services.map((service) => (
            <div className="row" key={service.id}>
              <span>{service.name}<small>{service.category.name}</small></span>
              <strong>{formatCop(service.basePrice)} · {service.duration}</strong>
            </div>
          ))}
        </div>
        <div className="tablePanel">
          <h2>Órdenes recientes</h2>
          {data?.orders.length ? (
            data.orders.map((order) => (
              <div className="row" key={order.id}>
                <span>{order.orderNumber}<small>{order.customerName}</small></span>
                <strong>{order.status} · {formatCop(order.total)}</strong>
              </div>
            ))
          ) : (
            <p className="muted">Sin órdenes todavía.</p>
          )}
        </div>
      </section>
    </main>
  )
}
