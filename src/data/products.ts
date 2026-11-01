import productsJson from './products.json'

interface Product {
  readonly id: string
  readonly name: string
  readonly image_path: string
}

const products: readonly Product[] = productsJson.products
const productsById = new Map(products.map((product) => [product.id, product]))

export function getProductById(productId: string): Product | undefined {
  return productsById.get(productId)
}
