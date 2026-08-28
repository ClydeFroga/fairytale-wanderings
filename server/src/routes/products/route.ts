import { Hono } from 'hono'
import { ProductMethods } from '@global/database/methods/product'
import {
  MAX_PRODUCT_IMAGES,
  createProductValidator,
  listProductsValidator,
  updateProductValidator,
} from './validator'
import { mapFormToProduct, resolveKeptImages } from './helpers'
import type { INewProduct } from '@global/database/shema'
import { Upload } from '@global/utils/upload'
import { AppError, ProductNotFoundError, TooManyImagesError } from '@global/errors'
import { requireAdmin } from '../../middleware/requireAdmin'
import { uniqueSlug } from '@global/utils/slugify'
import { isUuid } from '@global/utils/isUuid'

const app = new Hono()

// Каталог читают все; менять товары может только владелица.

app.get('/', listProductsValidator, async (c) => {
  const products = await ProductMethods.getList(c.req.valid('query'))

  return c.json(products)
})

app.get('/:id', async (c) => {
  const { id } = c.req.param()
  const product = isUuid(id)
    ? await ProductMethods.getById(id)
    : await ProductMethods.getBySlug(id)

  if (!product || !product.isActive) {
    throw new ProductNotFoundError(id)
  }

  return c.json(product)
})

app.post('/', requireAdmin, createProductValidator, async (c) => {
  const form = c.req.valid('form')

  if (form.image.length > MAX_PRODUCT_IMAGES) {
    throw new TooManyImagesError(MAX_PRODUCT_IMAGES, form.image.length)
  }

  const slug = uniqueSlug(form.name, await ProductMethods.listSlugs(), 'product')
  const images = await Upload.saveImages(form.image)
  const productData = { ...mapFormToProduct(form), slug, image: images } as INewProduct

  try {
    const newProduct = await ProductMethods.create(productData)
    return c.json(newProduct, 201)
  } catch (error) {
    // Товар не создался — только что загруженные файлы никому не нужны.
    await Upload.removeMany(images)
    console.error('Ошибка при создании продукта:', error)
    throw new AppError('Не удалось создать продукт', 500)
  }
})

app.patch('/:id', requireAdmin, updateProductValidator, async (c) => {
  const { id } = c.req.param()
  const form = c.req.valid('form')

  const current = await ProductMethods.getById(id)
  if (!current) {
    throw new ProductNotFoundError(id)
  }

  // Итоговый набор: оставленные клиентом старые картинки + только что загруженные.
  const kept = resolveKeptImages(form.existingImages, current.image)
  const total = kept.length + form.image.length
  if (total > MAX_PRODUCT_IMAGES) {
    throw new TooManyImagesError(MAX_PRODUCT_IMAGES, total)
  }

  // Картинки трогаем, только если клиент про них что-то сказал: прислал файлы
  // или явный список оставленных. Иначе PATCH одного поля не тронет галерею.
  const imagesTouched = form.image.length > 0 || form.existingImages !== undefined
  const uploaded = await Upload.saveImages(form.image)

  const productData = mapFormToProduct(form)
  if (imagesTouched) productData.image = [...kept, ...uploaded]

  let updatedProduct
  try {
    updatedProduct = await ProductMethods.update(id, productData)
  } catch (error) {
    await Upload.removeMany(uploaded)
    console.error('Ошибка при обновлении продукта:', error)
    throw new AppError('Не удалось обновить продукт', 500)
  }

  // Файлы, выпавшие из товара, удаляем с диска — уже после успешного апдейта.
  if (imagesTouched) {
    await Upload.removeMany(current.image.filter((path) => !kept.includes(path)))
  }

  return c.json(updatedProduct, 200)
})

app.delete('/:id', requireAdmin, async (c) => {
  const { id } = c.req.param()
  const images = await ProductMethods.remove(id)

  if (images) {
    await Upload.removeMany(images)
  }

  return c.json({ message: 'Продукт успешно удален' }, 200)
})

export default app
