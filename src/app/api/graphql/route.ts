import { createSchema, createYoga } from 'graphql-yoga'
import { z } from 'zod'
import {
  createOrder,
  createProduct,
  createService,
  getCategories,
  getOrders,
  getProducts,
  getServiceCategories,
  getServices,
} from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const typeDefs = /* GraphQL */ `
  enum PaymentProvider {
    PSE
    WOMPI
    SISTECREDITO
    ADDI
  }

  enum ItemType {
    PRODUCT
    SERVICE
  }

  type Category {
    id: ID!
    name: String!
    slug: String!
    description: String
  }

  type Product {
    id: ID!
    name: String!
    slug: String!
    description: String!
    price: Float!
    stock: Int!
    imageUrl: String
    active: Boolean!
    category: Category!
  }

  type ServiceCategory {
    id: ID!
    name: String!
    slug: String!
    description: String
  }

  type Service {
    id: ID!
    name: String!
    slug: String!
    description: String!
    basePrice: Float!
    duration: String!
    active: Boolean!
    category: ServiceCategory!
  }

  type OrderItem {
    id: ID!
    itemType: ItemType!
    name: String!
    quantity: Int!
    unitPrice: Float!
    total: Float!
  }

  type PaymentAttempt {
    id: ID!
    provider: PaymentProvider!
    status: String!
    amount: Float!
    installments: Int
    externalReference: String
    redirectUrl: String
  }

  type Order {
    id: ID!
    orderNumber: String!
    status: String!
    subtotal: Float!
    shipping: Float!
    total: Float!
    customerName: String!
    customerEmail: String!
    customerPhone: String!
    city: String!
    address: String!
    items: [OrderItem!]!
    payments: [PaymentAttempt!]!
  }

  input ProductInput {
    name: String!
    description: String!
    price: Float!
    stock: Int!
    imageUrl: String
    categoryId: ID!
  }

  input ServiceInput {
    name: String!
    description: String!
    basePrice: Float!
    duration: String!
    categoryId: ID!
  }

  input CartItemInput {
    itemType: ItemType!
    itemId: ID!
    quantity: Int!
  }

  input CheckoutInput {
    customerName: String!
    customerEmail: String!
    customerPhone: String!
    city: String!
    address: String!
    provider: PaymentProvider!
    installments: Int
    items: [CartItemInput!]!
  }

  type Query {
    products: [Product!]!
    services: [Service!]!
    categories: [Category!]!
    serviceCategories: [ServiceCategory!]!
    orders: [Order!]!
  }

  type Mutation {
    createProduct(input: ProductInput!): Product!
    createService(input: ServiceInput!): Service!
    createOrder(input: CheckoutInput!): Order!
  }
`

const productInput = z.object({
  name: z.string().min(2),
  description: z.string().min(8),
  price: z.number().positive(),
  stock: z.number().int().nonnegative(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  categoryId: z.string().min(1),
})

const serviceInput = z.object({
  name: z.string().min(2),
  description: z.string().min(8),
  basePrice: z.number().positive(),
  duration: z.string().min(2),
  categoryId: z.string().min(1),
})

const checkoutInput = z.object({
  customerName: z.string().min(2),
  customerEmail: z.string().email(),
  customerPhone: z.string().min(7),
  city: z.string().min(2),
  address: z.string().min(5),
  provider: z.enum(['PSE', 'WOMPI', 'SISTECREDITO', 'ADDI']),
  installments: z.number().int().min(1).max(36).nullable().optional(),
  items: z
    .array(
      z.object({
        itemType: z.enum(['PRODUCT', 'SERVICE']),
        itemId: z.string().min(1),
        quantity: z.number().int().min(1).max(20),
      }),
    )
    .min(1),
})

const resolvers = {
  Query: {
    products: getProducts,
    services: getServices,
    categories: getCategories,
    serviceCategories: getServiceCategories,
    orders: getOrders,
  },
  Mutation: {
    createProduct: (_: unknown, args: { input: unknown }) => {
      const input = productInput.parse(args.input)
      const product = createProduct(input)
      if (!product) throw new Error('No fue posible crear el producto')
      return product
    },
    createService: (_: unknown, args: { input: unknown }) => {
      const input = serviceInput.parse(args.input)
      const service = createService(input)
      if (!service) throw new Error('No fue posible crear el servicio')
      return service
    },
    createOrder: (_: unknown, args: { input: unknown }) => createOrder(checkoutInput.parse(args.input)),
  },
  Product: {
    active: (product: { active: number }) => Boolean(product.active),
  },
  Service: {
    active: (service: { active: number }) => Boolean(service.active),
  },
}

const yoga = createYoga({
  schema: createSchema({ typeDefs, resolvers }),
  graphqlEndpoint: '/api/graphql',
  fetchAPI: { Response },
})

export { yoga as GET, yoga as POST }
