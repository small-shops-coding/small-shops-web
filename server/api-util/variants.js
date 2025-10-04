const validateVariantStock = (listing, orderData) => {
  const variants = listing?.attributes?.publicData?.variants || [];
  if (variants.length === 0) {
    const error = new Error('No variants found');
    error.code = 'no-variants-found';
    throw error;
  }
  const { color, size, material, stockReservationQuantity } = orderData;
  const currentVariant = variants.find(
    variant =>
      ((color && variant.attributes.color === color) || !color) &&
      ((size && variant.attributes.size === size) || !size) &&
      ((material && variant.attributes.material === material) || !material)
  );
  if (!currentVariant) {
    const error = new Error('Variant not found');
    error.code = 'variant-not-found';
    throw error;
  }
  const variantStock = currentVariant?.stock;
  if (!variantStock) {
    const error = new Error('Variant out of stock');
    error.code = 'variant-out-of-stock';
    throw error;
  }

  if (variantStock < stockReservationQuantity) {
    const error = new Error('Variant stock is not enough');
    error.code = 'variant-stock-not-enough';
    throw error;
  }
};

const getVariant = (listing, orderData) => {
  const variants = listing?.attributes?.publicData?.variants || [];
  if (variants.length === 0) {
    const error = new Error('No variants found');
    error.code = 'no-variants-found';
    throw error;
  }
  const { color, size, material } = orderData;
  const atLeastOneAttributeIsProvided = !!color || !!size || !!material;
  if (!atLeastOneAttributeIsProvided) {
    const error = new Error('At least one attribute is required');
    error.code = 'at-least-one-attribute-is-required';
    throw error;
  }
  validateVariantStock(listing, orderData);
  const variant =
    variants.find(
      variant =>
        ((color && variant.attributes.color === color) || !color) &&
        ((size && variant.attributes.size === size) || !size) &&
        ((material && variant.attributes.material === material) || !material)
    ) ?? 0;

  return variant;
};

module.exports = { validateVariantStock, getVariant };
