const { getVariant } = require('../../api-util/variants');
const { getIntegrationSdk } = require('../../api-util/sdk');
module.exports = async (orderData, listing, transaction) => {
  try {
    const integrationSdk = getIntegrationSdk();
    const variants = listing?.attributes?.publicData?.variants || [];
    const orderVariant = getVariant(listing, orderData);

    const newVariants = variants.map(v => {
      if (orderVariant && v.id === orderVariant.id) {
        return { ...v, stock: v.stock - orderData.stockReservationQuantity };
      }
      return v;
    });

    const updatedListing = await integrationSdk.listings.update({
      id: listing?.id,
      publicData: { variants: newVariants },
    });
    return updatedListing.data.data;
  } catch (e) {
    console.error('[afterInitiateOrderHandler] Error:', e, 'Transaction:', transaction?.id?.uuid);
  }
};
