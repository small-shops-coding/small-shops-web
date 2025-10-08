import React, { useMemo } from 'react';
import classNames from 'classnames';

// Import configs and util modules
import { FormattedMessage } from '../../../../util/reactIntl';
import { LISTING_STATE_DRAFT, propTypes } from '../../../../util/types';
import { types as sdkTypes } from '../../../../util/sdkLoader';
import { isValidCurrencyForTransactionProcess } from '../../../../util/fieldHelpers';

// Import shared components
import { H3, ListingLink } from '../../../../components';

// Import modules from this directory
import css from './EditListingPricingAndStockPanel.module.css';
import EditListingVariantsForm from './EditListingVariantsForm';

const { Money } = sdkTypes;

const getListingTypeConfig = (publicData, listingTypes) => {
  const selectedListingType = publicData.listingType;
  return listingTypes.find(conf => conf.listingType === selectedListingType);
};
const toAttributeGroups = variants => {
  const allowedTypes = ['color', 'size', 'material'];
  const typeToValues = {};
  for (const v of variants) {
    const attrs = v.attributes || {};
    for (const type of allowedTypes) {
      if (attrs[type]) {
        if (!typeToValues[type]) typeToValues[type] = new Set();
        typeToValues[type].add(String(attrs[type]));
      }
    }
  }
  return Object.entries(typeToValues).map(([type, valuesSet], index) => ({
    id: index,
    type,
    values: Array.from(valuesSet),
  }));
};

const DEFAULT_INITIAL_VALUES = {
  variants: [
    {
      type: 'size',
      values: ['oneSize'],
    },
  ],
  variantInfo: [
    {
      id: 'oneSize',
      attributes: {
        size: 'oneSize',
      },
    },
  ],
};

const generateInitialValues = (listing, marketplaceCurrency) => {
  const { variants = [] } = listing?.attributes?.publicData;
  const listingImages = listing?.images || [];
  if (variants.length > 0 && !!listing) {
    return {
      variants: toAttributeGroups(variants),
      variantInfo: variants.map(variant => {
        const { priceAsSubunits, imageId, ...rest } = variant;
        const price = priceAsSubunits ? new Money(priceAsSubunits, marketplaceCurrency) : null;
        const image = listingImages.find(image => image.id.uuid === variant.imageId);
        return { ...rest, imageId: image, price };
      }),
    };
  }
  return {
    variants: DEFAULT_INITIAL_VALUES.variants,
    variantInfo: DEFAULT_INITIAL_VALUES.variantInfo,
  };
};

/**
 * The EditListingPricingAndStockPanel component.
 *
 * @component
 * @param {Object} props
 * @param {string} [props.className] - Custom class that extends the default class for the root element
 * @param {string} [props.rootClassName] - Custom class that overrides the default class for the root element
 * @param {propTypes.ownListing} props.listing - The listing object
 * @param {string} props.marketplaceCurrency - The marketplace currency (e.g. 'USD')
 * @param {number} props.listingMinimumPriceSubUnits - The listing minimum price sub units
 * @param {Array<propTypes.listingType>} props.listingTypes - The listing types
 * @param {boolean} props.disabled - Whether the form is disabled
 * @param {boolean} props.ready - Whether the form is ready
 * @param {Function} props.onSubmit - The submit function
 * @param {string} props.submitButtonText - The submit button text
 * @param {boolean} props.panelUpdated - Whether the panel is updated
 * @param {boolean} props.updateInProgress - Whether the update is in progress
 * @param {Object} props.errors - The errors object
 * @param {Object} props.listingFieldsConfig - The listing fields config
 * @param {Object} props.listingImageConfig - The listing image config
 * @param {number} props.listingImageConfig.aspectWidth - The aspect width
 * @param {number} props.listingImageConfig.aspectHeight - The aspect height
 * @param {string} props.listingImageConfig.variantPrefix - The variant prefix
 * @param {Function} props.onUploadVariantsImage - The upload variants image function
 * @param {Function} props.onRemoveVariantsImage - The remove variants image function
 * @param {Object} props.variantsImages - The variants images
 * @param {Object} props.images - The images
 * @returns {JSX.Element}
 */
const EditListingPricingAndStockPanel = props => {
  // State is needed since re-rendering would overwrite the values during XHR call.

  const {
    className,
    rootClassName,
    listing,
    marketplaceCurrency,
    listingMinimumPriceSubUnits,
    listingTypes,
    disabled,
    ready,
    onSubmit,
    submitButtonText,
    panelUpdated,
    updateInProgress,
    errors,
    listingFieldsConfig,
    listingImageConfig,
    onUploadVariantsImage,
    onRemoveVariantsImage,
    variantsImages,
    images: listingImages,
  } = props;

  const classes = classNames(rootClassName || css.root, className);

  // Form needs to know data from listingType
  const publicData = listing?.attributes?.publicData;
  const unitType = publicData.unitType;
  const listingTypeConfig = getListingTypeConfig(publicData, listingTypes);
  const transactionProcessAlias = listingTypeConfig.transactionType.alias;

  const isPublished = listing?.id && listing?.attributes?.state !== LISTING_STATE_DRAFT;

  // Don't render the form if the assigned currency is different from the marketplace currency
  // or if transaction process is incompatible with selected currency
  const isStripeCompatibleCurrency = isValidCurrencyForTransactionProcess(
    transactionProcessAlias,
    marketplaceCurrency,
    'stripe'
  );

  const initialValues = useMemo(() => {
    return generateInitialValues(listing, marketplaceCurrency);
  }, [JSON.stringify(listing), JSON.stringify(marketplaceCurrency)]);
  const priceCurrencyValid = !isStripeCompatibleCurrency
    ? false
    : marketplaceCurrency && initialValues.price instanceof Money
    ? initialValues.price?.currency === marketplaceCurrency
    : !!marketplaceCurrency;

  return (
    <main className={classes}>
      <H3 as="h1">
        {isPublished ? (
          <FormattedMessage
            id="EditListingPricingAndStockPanel.title"
            values={{ listingTitle: <ListingLink listing={listing} />, lineBreak: <br /> }}
          />
        ) : (
          <FormattedMessage
            id="EditListingPricingAndStockPanel.createListingTitle"
            values={{ lineBreak: <br /> }}
          />
        )}
      </H3>
      {priceCurrencyValid ? (
        <EditListingVariantsForm
          className={css.form}
          initialValues={initialValues}
          onSubmit={values => {
            const { variantInfo } = values;
            const formattedVariantInfo = variantInfo.map(variant => {
              const { price, imageId: image, ...rest } = variant;
              const priceAsSubunits = price?.amount;
              const imageId = image?.id?.uuid;
              return {
                ...rest,
                imageId,
                priceAsSubunits,
              };
            });
            const minPriceAsSubunits = formattedVariantInfo.reduce((min, variant) => {
              return Math.min(min, variant.priceAsSubunits);
            }, Infinity);
            const minPrice = minPriceAsSubunits
              ? new Money(minPriceAsSubunits, marketplaceCurrency)
              : null;
            const originalImages = listingImages || [];
            const images = variantInfo.map(variant => variant.imageId);
            const stockUpdate = {
              oldTotal: listing?.currentStock?.attributes?.quantity ?? null,
              newTotal: formattedVariantInfo.reduce((sum, variant) => sum + variant.stock, 0),
            };
            const finalImages = [...originalImages, ...images];
            return onSubmit({
              price: minPrice,
              stockUpdate,
              publicData: {
                variants: formattedVariantInfo,
              },
              images: finalImages,
            });
          }}
          listingMinimumPriceSubUnits={listingMinimumPriceSubUnits}
          marketplaceCurrency={marketplaceCurrency}
          listingType={listingTypeConfig}
          unitType={unitType}
          saveActionMsg={submitButtonText}
          disabled={disabled}
          ready={ready}
          updated={panelUpdated}
          updateInProgress={updateInProgress}
          fetchErrors={errors}
          listingFieldsConfig={listingFieldsConfig}
          listingImageConfig={listingImageConfig}
          onUploadVariantsImage={onUploadVariantsImage}
          onRemoveVariantsImage={onRemoveVariantsImage}
          variantsImages={variantsImages}
        />
      ) : (
        <div className={css.priceCurrencyInvalid}>
          <FormattedMessage
            id="EditListingPricingAndStockPanel.listingPriceCurrencyInvalid"
            values={{ marketplaceCurrency }}
          />
        </div>
      )}
    </main>
  );
};

export default EditListingPricingAndStockPanel;
