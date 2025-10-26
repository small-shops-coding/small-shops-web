const { getIntegrationSdk, handleError } = require('../api-util/sdk');

module.exports = async (req, res) => {
  try {
    const iSdk = getIntegrationSdk();
    const { tokenUserId, displayName } = req;

    const listingsRes = await iSdk.listings.query({
      authorId: tokenUserId,
    });

    const listings = listingsRes.data.data;

    for (const listing of listings) {
      await iSdk.listings.update({
        id: listing.id,
        publicData: { shopName: displayName },
      });
    }

    res.status(200).json({ data: { success: true } });
  } catch (e) {
    handleError(res, e);
  }
};
