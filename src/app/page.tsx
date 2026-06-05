import { CommerceShell } from '@/components/commerce-shell'
import { getProducts, getServices } from '@/lib/db'

export const dynamic = 'force-dynamic'

export default function HomePage() {
  const products = getProducts()
  const services = getServices()

  return <CommerceShell products={products} services={services} />
}
