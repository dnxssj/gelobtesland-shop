import { supabase } from './supabase'

export async function getProducts({ featuredOnly = false } = {}) {
  if (!supabase) {
    throw new Error('Supabase ist noch nicht konfiguriert.')
  }

  let query = supabase
    .from('products')
    .select(`
      id,
      slug,
      name,
      description,
      long_description,
      category,
      weight,
      price,
      image_url,
      stock,
      featured,
      published,
      translations
    `)
    .eq('published', true)
    .order('created_at', { ascending: true })

  if (featuredOnly) {
    query = query.eq('featured', true)
  }

  const { data, error } = await query

  if (error) throw error

  return (data || []).map(mapProduct)
}

export async function getProductBySlug(slug) {
  if (!supabase) {
    throw new Error('Supabase ist noch nicht konfiguriert.')
  }

  const { data, error } = await supabase
    .from('products')
    .select(`
      id,
      slug,
      name,
      description,
      long_description,
      category,
      weight,
      price,
      image_url,
      stock,
      featured,
      published,
      translations
    `)
    .eq('slug', slug)
    .eq('published', true)
    .maybeSingle()

  if (error) throw error

  return data ? mapProduct(data) : null
}

function mapProduct(product) {
  const translations = product.translations || {}

  return {
    id: product.id,
    slug: product.slug,
    category: product.category,
    weight: product.weight,
    price: Number(product.price),
    image: product.image_url,
    featured: Boolean(product.featured),
    available: Number(product.stock) > 0,
    stock: Number(product.stock),
    published: Boolean(product.published),

    translations: {
      de: {
        name: translations.de?.name || product.name,
        category: translations.de?.category || product.category,
        description: translations.de?.description || product.description,
        longDescription:
          translations.de?.longDescription || product.long_description,
      },
      en: {
        name: translations.en?.name || product.name,
        category: translations.en?.category || product.category,
        description: translations.en?.description || product.description,
        longDescription:
          translations.en?.longDescription || product.long_description,
      },
      es: {
        name: translations.es?.name || product.name,
        category: translations.es?.category || product.category,
        description: translations.es?.description || product.description,
        longDescription:
          translations.es?.longDescription || product.long_description,
      },
    },
  }
}