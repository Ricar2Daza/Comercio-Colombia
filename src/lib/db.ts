import { randomUUID } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { buildPaymentAttempt, type PaymentProvider } from '@/lib/payments'

export type Category = {
  id: string
  name: string
  slug: string
  description: string | null
}

export type Product = {
  id: string
  name: string
  slug: string
  description: string
  price: number
  stock: number
  imageUrl: string | null
  active: number
  categoryId: string
  category: Category
}

export type ServiceCategory = {
  id: string
  name: string
  slug: string
  description: string | null
}

export type Service = {
  id: string
  name: string
  slug: string
  description: string
  basePrice: number
  duration: string
  active: number
  categoryId: string
  category: ServiceCategory
}

export type Order = {
  id: string
  orderNumber: string
  status: string
  subtotal: number
  shipping: number
  total: number
  customerName: string
  customerEmail: string
  customerPhone: string
  city: string
  address: string
  items: OrderItem[]
  payments: PaymentAttempt[]
}

type OrderItem = {
  id: string
  itemType: 'PRODUCT' | 'SERVICE'
  name: string
  quantity: number
  unitPrice: number
  total: number
}

type PaymentAttempt = {
  id: string
  provider: PaymentProvider
  status: string
  amount: number
  installments: number | null
  externalReference: string | null
  redirectUrl: string | null
}

type CheckoutInput = {
  customerName: string
  customerEmail: string
  customerPhone: string
  city: string
  address: string
  provider: PaymentProvider
  installments?: number | null
  items: Array<{ itemType: 'PRODUCT' | 'SERVICE'; itemId: string; quantity: number }>
}

type SqlValue = string | number | bigint | Uint8Array | null

const dbPath = join(process.cwd(), 'data', 'app.db')
mkdirSync(dirname(dbPath), { recursive: true })

const globalForDb = globalThis as unknown as { sqlite?: DatabaseSync }
const db = globalForDb.sqlite ?? new DatabaseSync(dbPath)
globalForDb.sqlite = db

db.exec('PRAGMA foreign_keys = ON')
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    document TEXT,
    role TEXT NOT NULL DEFAULT 'CLIENT',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    price INTEGER NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    image_url TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    category_id TEXT NOT NULL REFERENCES categories(id)
  );

  CREATE TABLE IF NOT EXISTS service_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS services (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    base_price INTEGER NOT NULL,
    duration TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    category_id TEXT NOT NULL REFERENCES service_categories(id)
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    order_number TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'PENDING_PAYMENT',
    subtotal INTEGER NOT NULL,
    shipping INTEGER NOT NULL DEFAULT 0,
    total INTEGER NOT NULL,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    city TEXT NOT NULL,
    address TEXT NOT NULL,
    user_id TEXT REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES orders(id),
    item_type TEXT NOT NULL,
    name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price INTEGER NOT NULL,
    total INTEGER NOT NULL,
    product_id TEXT REFERENCES products(id),
    service_id TEXT REFERENCES services(id)
  );

  CREATE TABLE IF NOT EXISTS payment_attempts (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES orders(id),
    provider TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'CREATED',
    amount INTEGER NOT NULL,
    installments INTEGER,
    external_reference TEXT,
    redirect_url TEXT,
    provider_payload_json TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`)

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
}

function one<T>(sql: string, params: SqlValue[] = []) {
  return db.prepare(sql).get(...params) as T | undefined
}

function many<T>(sql: string, params: SqlValue[] = []) {
  return db.prepare(sql).all(...params) as T[]
}

function seedIfNeeded() {
  const existing = one<{ count: number }>('SELECT COUNT(*) as count FROM products')
  if (existing && existing.count > 0) return

  const userId = randomUUID()
  db.prepare('INSERT INTO users (id, name, email, phone, role) VALUES (?, ?, ?, ?, ?)').run(
    userId,
    'Administrador Demo',
    'admin@tiendacolombia.test',
    '+57 300 123 4567',
    'ADMIN',
  )

  const categoryIds = ['Repuestos', 'Tecnologia', 'Cuidado y mantenimiento'].map((name) => {
    const id = randomUUID()
    db.prepare('INSERT INTO categories (id, name, slug, description) VALUES (?, ?, ?, ?)').run(
      id,
      name,
      slugify(name),
      `Categoria de ${name.toLowerCase()} para clientes en Colombia.`,
    )
    return id
  })

  const products = [
    ['Kit bateria premium', 'Bateria certificada con instalacion guiada y garantia local.', 189900, 18, 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?auto=format&fit=crop&w=1200&q=80', categoryIds[0]],
    ['Modulo cargador USB-C', 'Repuesto para equipos compatibles con diagnostico previo.', 129900, 26, 'https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=1200&q=80', categoryIds[1]],
    ['Protector antiimpacto', 'Accesorio de alta resistencia para uso diario.', 69900, 64, 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80', categoryIds[2]],
  ] as const

  for (const product of products) {
    db.prepare(
      'INSERT INTO products (id, name, slug, description, price, stock, image_url, category_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    ).run(randomUUID(), product[0], slugify(product[0]), product[1], product[2], product[3], product[4], product[5])
  }

  const serviceCategoryIds = ['Reparaciones', 'Diagnosticos especializados'].map((name) => {
    const id = randomUUID()
    db.prepare('INSERT INTO service_categories (id, name, slug, description) VALUES (?, ?, ?, ?)').run(
      id,
      name,
      slugify(name),
      `Servicios de ${name.toLowerCase()} con pago de contado o financiado.`,
    )
    return id
  })

  const services = [
    ['Reparacion express', 'Revision, mano de obra y reparacion prioritaria para fallas comunes.', 159900, '24 a 48 horas', serviceCategoryIds[0]],
    ['Diagnostico tecnico completo', 'Pruebas, concepto tecnico y cotizacion detallada.', 49900, '2 horas', serviceCategoryIds[1]],
    ['Mantenimiento preventivo', 'Limpieza interna, revision de conectores y pruebas de rendimiento.', 89900, 'Medio dia', serviceCategoryIds[0]],
  ] as const

  for (const service of services) {
    db.prepare(
      'INSERT INTO services (id, name, slug, description, base_price, duration, category_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).run(randomUUID(), service[0], slugify(service[0]), service[1], service[2], service[3], service[4])
  }
}

seedIfNeeded()

function mapProduct(row: Record<string, unknown>): Product {
  return {
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug),
    description: String(row.description),
    price: Number(row.price),
    stock: Number(row.stock),
    imageUrl: row.image_url ? String(row.image_url) : null,
    active: Number(row.active),
    categoryId: String(row.category_id),
    category: {
      id: String(row.category_id),
      name: String(row.category_name),
      slug: String(row.category_slug),
      description: row.category_description ? String(row.category_description) : null,
    },
  }
}

function mapService(row: Record<string, unknown>): Service {
  return {
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug),
    description: String(row.description),
    basePrice: Number(row.base_price),
    duration: String(row.duration),
    active: Number(row.active),
    categoryId: String(row.category_id),
    category: {
      id: String(row.category_id),
      name: String(row.category_name),
      slug: String(row.category_slug),
      description: row.category_description ? String(row.category_description) : null,
    },
  }
}

export function getProducts() {
  return many<Record<string, unknown>>(
    `SELECT p.*, c.name as category_name, c.slug as category_slug, c.description as category_description
     FROM products p JOIN categories c ON c.id = p.category_id
     WHERE p.active = 1 ORDER BY p.rowid DESC`,
  ).map(mapProduct)
}

export function getServices() {
  return many<Record<string, unknown>>(
    `SELECT s.*, sc.name as category_name, sc.slug as category_slug, sc.description as category_description
     FROM services s JOIN service_categories sc ON sc.id = s.category_id
     WHERE s.active = 1 ORDER BY s.rowid DESC`,
  ).map(mapService)
}

export function getCategories() {
  return many<Category>('SELECT id, name, slug, description FROM categories ORDER BY name')
}

export function getServiceCategories() {
  return many<ServiceCategory>('SELECT id, name, slug, description FROM service_categories ORDER BY name')
}

export function createProduct(input: {
  name: string
  description: string
  price: number
  stock: number
  imageUrl?: string | null
  categoryId: string
}) {
  const id = randomUUID()
  db.prepare(
    'INSERT INTO products (id, name, slug, description, price, stock, image_url, category_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  ).run(id, input.name, `${slugify(input.name)}-${Date.now()}`, input.description, input.price, input.stock, input.imageUrl || null, input.categoryId)
  return getProducts().find((product) => product.id === id)
}

export function createService(input: {
  name: string
  description: string
  basePrice: number
  duration: string
  categoryId: string
}) {
  const id = randomUUID()
  db.prepare(
    'INSERT INTO services (id, name, slug, description, base_price, duration, category_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
  ).run(id, input.name, `${slugify(input.name)}-${Date.now()}`, input.description, input.basePrice, input.duration, input.categoryId)
  return getServices().find((service) => service.id === id)
}

export function getOrders() {
  const orders = many<Record<string, unknown>>('SELECT * FROM orders ORDER BY created_at DESC')
  return orders.map((order) => getOrderById(String(order.id))).filter(Boolean) as Order[]
}

function getOrderById(id: string): Order | undefined {
  const order = one<Record<string, unknown>>('SELECT * FROM orders WHERE id = ?', [id])
  if (!order) return undefined

  return {
    id: String(order.id),
    orderNumber: String(order.order_number),
    status: String(order.status),
    subtotal: Number(order.subtotal),
    shipping: Number(order.shipping),
    total: Number(order.total),
    customerName: String(order.customer_name),
    customerEmail: String(order.customer_email),
    customerPhone: String(order.customer_phone),
    city: String(order.city),
    address: String(order.address),
    items: many<OrderItem>(
      `SELECT id, item_type as itemType, name, quantity, unit_price as unitPrice, total
       FROM order_items WHERE order_id = ?`,
      [id],
    ),
    payments: many<PaymentAttempt>(
      `SELECT id, provider, status, amount, installments, external_reference as externalReference, redirect_url as redirectUrl
       FROM payment_attempts WHERE order_id = ?`,
      [id],
    ),
  }
}

export function createOrder(input: CheckoutInput) {
  const products = getProducts()
  const services = getServices()
  const orderItems = input.items.map((item) => {
    const source =
      item.itemType === 'PRODUCT'
        ? products.find((product) => product.id === item.itemId)
        : services.find((service) => service.id === item.itemId)

    if (!source) throw new Error(`Item ${item.itemId} no existe`)

    const price = item.itemType === 'PRODUCT' ? (source as Product).price : (source as Service).basePrice
    return {
      id: randomUUID(),
      itemType: item.itemType,
      name: source.name,
      quantity: item.quantity,
      unitPrice: price,
      total: price * item.quantity,
      productId: item.itemType === 'PRODUCT' ? source.id : null,
      serviceId: item.itemType === 'SERVICE' ? source.id : null,
    }
  })

  const subtotal = orderItems.reduce((sum, item) => sum + item.total, 0)
  const shipping = orderItems.some((item) => item.itemType === 'PRODUCT') ? 12000 : 0
  const total = subtotal + shipping
  const orderId = randomUUID()
  const orderNumber = `CO-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`
  const payment = buildPaymentAttempt({
    orderNumber,
    amount: total,
    provider: input.provider,
    installments: input.installments,
  })

  db.exec('BEGIN')
  try {
    db.prepare(
      `INSERT INTO orders
       (id, order_number, status, subtotal, shipping, total, customer_name, customer_email, customer_phone, city, address)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      orderId,
      orderNumber,
      'PENDING_PAYMENT',
      subtotal,
      shipping,
      total,
      input.customerName,
      input.customerEmail,
      input.customerPhone,
      input.city,
      input.address,
    )

    for (const item of orderItems) {
      db.prepare(
        `INSERT INTO order_items
         (id, order_id, item_type, name, quantity, unit_price, total, product_id, service_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(item.id, orderId, item.itemType, item.name, item.quantity, item.unitPrice, item.total, item.productId, item.serviceId)
    }

    db.prepare(
      `INSERT INTO payment_attempts
       (id, order_id, provider, status, amount, installments, external_reference, redirect_url, provider_payload_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      randomUUID(),
      orderId,
      input.provider,
      payment.status,
      total,
      payment.installments,
      payment.externalReference,
      payment.redirectUrl,
      payment.providerPayloadJson,
    )
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }

  const order = getOrderById(orderId)
  if (!order) throw new Error('No fue posible crear la orden')
  return order
}
