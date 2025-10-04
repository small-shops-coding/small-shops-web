const { transactionLineItems } = require('../api-util/lineItems');
const {
  getSdk,
  getTrustedSdk,
  handleError,
  serialize,
  fetchCommission,
} = require('../api-util/sdk');
const TransactionServices = require('../services/transaction');

module.exports = async (req, res) => {
  const { isSpeculative, orderData, bodyParams, queryParams } = req.body;

  const sdk = getSdk(req, res);

  try {
    const listingPromise = () => sdk.listings.show({ id: bodyParams?.params?.listingId });

    const [showListingResponse, fetchAssetsResponse] = await Promise.all([
      listingPromise(),
      fetchCommission(sdk),
    ]);

    const listing = showListingResponse.data.data;
    const commissionAsset = fetchAssetsResponse.data.data[0];

    const { providerCommission, customerCommission } =
      commissionAsset?.type === 'jsonAsset' ? commissionAsset.attributes.data : {};

    const lineItems = transactionLineItems(
      listing,
      { ...orderData, ...bodyParams.params },
      providerCommission,
      customerCommission
    );

    const trustedSdk = await getTrustedSdk(req);

    const { params } = bodyParams;

    // Add lineItems to the body params
    const body = {
      ...bodyParams,
      params: {
        ...params,
        lineItems,
      },
    };

    const apiResponse = isSpeculative
      ? await trustedSdk.transactions.initiateSpeculative(body, queryParams)
      : await trustedSdk.transactions.initiate(body, queryParams);
    if (!isSpeculative) {
      TransactionServices.afterInitiateOrderHandler(
        { ...orderData, ...bodyParams.params },
        listing,
        apiResponse.data.data
      );
    }
    const { status, statusText, data } = apiResponse;
    res
      .status(status)
      .set('Content-Type', 'application/transit+json')
      .send(
        serialize({
          status,
          statusText,
          data,
        })
      )
      .end();
  } catch (e) {
    handleError(res, e);
  }
};
