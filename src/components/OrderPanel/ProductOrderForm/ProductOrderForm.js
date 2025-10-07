import React, { useCallback, useEffect, useImperativeHandle, useState } from 'react';
import { Form as FinalForm, FormSpy } from 'react-final-form';

import { FormattedMessage, useIntl } from '../../../util/reactIntl';
import { propTypes } from '../../../util/types';
import { numberAtLeast, required } from '../../../util/validators';
import { PURCHASE_PROCESS_NAME } from '../../../transactions/transaction';

import {
  Form,
  FieldSelect,
  FieldTextInput,
  InlineTextButton,
  PrimaryButton,
  H3,
  H6,
  FieldQuantity,
} from '../../../components';

import EstimatedCustomerBreakdownMaybe from '../EstimatedCustomerBreakdownMaybe';

import FetchLineItemsError from '../FetchLineItemsError/FetchLineItemsError.js';

import css from './ProductOrderForm.module.css';
import debounce from 'lodash/debounce';
import { COLOR_ENUMS, MATERIAL_ENUMS, SIZE_ENUMS } from '../../../util/variants.js';

// Browsers can't render huge number of select options.
// (stock is shown inside select element)
// Note: input element could allow ordering bigger quantities

const handleFetchLineItems = ({
  quantity,
  deliveryMethod,
  color,
  size,
  material,
  displayDeliveryMethod,
  listingId,
  isOwnListing,
  fetchLineItemsInProgress,
  onFetchTransactionLineItems,
}) => {
  const stockReservationQuantity = Number.parseInt(quantity, 10);
  const deliveryMethodMaybe = deliveryMethod ? { deliveryMethod } : {};
  const isBrowser = typeof window !== 'undefined';
  if (
    isBrowser &&
    stockReservationQuantity &&
    (!displayDeliveryMethod || deliveryMethod) &&
    !fetchLineItemsInProgress
  ) {
    onFetchTransactionLineItems({
      orderData: { stockReservationQuantity, ...deliveryMethodMaybe, color, size, material },
      listingId,
      isOwnListing,
    });
  }
};

const DeliveryMethodMaybe = props => {
  const {
    displayDeliveryMethod,
    hasMultipleDeliveryMethods,
    deliveryMethod,
    hasStock,
    formId,
    intl,
  } = props;
  const showDeliveryMethodSelector = displayDeliveryMethod && hasMultipleDeliveryMethods;
  const showSingleDeliveryMethod = displayDeliveryMethod && deliveryMethod;
  return !hasStock ? null : showDeliveryMethodSelector ? (
    <FieldSelect
      id={`${formId}.deliveryMethod`}
      className={css.deliveryField}
      name="deliveryMethod"
      label={intl.formatMessage({ id: 'ProductOrderForm.deliveryMethodLabel' })}
      validate={required(intl.formatMessage({ id: 'ProductOrderForm.deliveryMethodRequired' }))}
    >
      <option disabled value="">
        {intl.formatMessage({ id: 'ProductOrderForm.selectDeliveryMethodOption' })}
      </option>
      <option value={'pickup'}>
        {intl.formatMessage({ id: 'ProductOrderForm.pickupOption' })}
      </option>
      <option value={'shipping'}>
        {intl.formatMessage({ id: 'ProductOrderForm.shippingOption' })}
      </option>
    </FieldSelect>
  ) : showSingleDeliveryMethod ? (
    <div className={css.deliveryField}>
      <H3 rootClassName={css.singleDeliveryMethodLabel}>
        {intl.formatMessage({ id: 'ProductOrderForm.deliveryMethodLabel' })}
      </H3>
      <p className={css.singleDeliveryMethodSelected}>
        {deliveryMethod === 'shipping'
          ? intl.formatMessage({ id: 'ProductOrderForm.shippingOption' })
          : intl.formatMessage({ id: 'ProductOrderForm.pickupOption' })}
      </p>
      <FieldTextInput
        id={`${formId}.deliveryMethod`}
        className={css.deliveryField}
        name="deliveryMethod"
        type="hidden"
      />
    </div>
  ) : (
    <FieldTextInput
      id={`${formId}.deliveryMethod`}
      className={css.deliveryField}
      name="deliveryMethod"
      type="hidden"
    />
  );
};

const getLabel = (value, enumOptions) => {
  const option = enumOptions.find(option => option.option === value);
  return option ? option.label : value;
};

const DEBOUNCE_TIME = 500;

const renderForm = formRenderProps => {
  const [mounted, setMounted] = useState(false);
  const {
    // FormRenderProps from final-form
    handleSubmit,
    form: formApi,

    // Custom props passed to the form component
    intl,
    formId,
    currentStock,
    hasMultipleDeliveryMethods,
    displayDeliveryMethod,
    listingId,
    isOwnListing,
    onFetchTransactionLineItems,
    onContactUser,
    lineItems,
    fetchLineItemsInProgress,
    fetchLineItemsError,
    price,
    payoutDetailsWarning,
    marketplaceName,
    values,
    variants,
    listingFieldConfigs,
    onSetSelectedVariant,
    hideSubmitButton,
    formRef,
  } = formRenderProps;

  useImperativeHandle(formRef, () => ({
    submit: () => {
      formApi.submit();
    },
  }));

  const colorEnum =
    listingFieldConfigs.find(field => field.key === 'colour')?.enumOptions || COLOR_ENUMS;
  const sizeEnum =
    listingFieldConfigs.find(field => field.key === 'size')?.enumOptions || SIZE_ENUMS;
  const materialEnum =
    listingFieldConfigs.find(field => field.key === 'quality_standards')?.enumOptions ||
    MATERIAL_ENUMS;

  const { colors, sizes, materials } = variants.reduce(
    (acc, variant) => {
      if (variant.attributes.color) {
        const alreadyExists = acc.colors.find(color => color.value === variant.attributes.color);
        if (!alreadyExists) {
          const label = getLabel(variant.attributes.color, colorEnum);
          acc.colors.push({
            label: intl.formatMessage({ id: label }),
            value: variant.attributes.color,
          });
        }
      }
      if (variant.attributes.size) {
        const alreadyExists = acc.sizes.find(size => size.value === variant.attributes.size);
        if (!alreadyExists) {
          const label = getLabel(variant.attributes.size, sizeEnum);
          acc.sizes.push({
            label: intl.formatMessage({ id: label }),
            value: variant.attributes.size,
          });
        }
      }
      if (variant.attributes.material) {
        const alreadyExists = acc.materials.find(
          material => material.value === variant.attributes.material
        );
        if (!alreadyExists) {
          const label = getLabel(variant.attributes.material, materialEnum);
          acc.materials.push({
            label: intl.formatMessage({ id: label }),
            value: variant.attributes.material,
          });
        }
      }

      return acc;
    },
    { colors: [], sizes: [], materials: [] }
  );

  const hasColors = colors.length > 0;
  const hasSizes = sizes.length > 0;
  const hasMaterials = materials.length > 0;

  const hasEnoughVariantsData =
    ((hasColors && values.color) || !hasColors) &&
    ((hasSizes && values.size) || !hasSizes) &&
    ((hasMaterials && values.material) || !hasMaterials);

  // Note: don't add custom logic before useEffect
  useEffect(() => {
    setMounted(true);

    // Side-effect: fetch line-items after mounting if possible
    const { quantity, deliveryMethod, color, size, material } = values;
    if (quantity && !formRenderProps.hasMultipleDeliveryMethods && hasEnoughVariantsData) {
      handleFetchLineItems({
        quantity,
        deliveryMethod,
        displayDeliveryMethod,
        listingId,
        isOwnListing,
        fetchLineItemsInProgress,
        onFetchTransactionLineItems,
        color,
        size,
        material,
      });
    }
  }, []);

  useEffect(() => {
    if (hasEnoughVariantsData) {
      onSetSelectedVariant({
        color: values.color,
        size: values.size,
        material: values.material,
      });
    }
  }, [hasEnoughVariantsData, values.color, values.size, values.material]);

  const debounceFetchLineItems = useCallback(debounce(handleFetchLineItems, DEBOUNCE_TIME), []);

  // If form values change, update line-items for the order breakdown
  const handleOnChange = formValues => {
    const { quantity, deliveryMethod, color, size, material } = formValues.values;
    if (mounted && hasEnoughVariantsData) {
      debounceFetchLineItems({
        quantity,
        deliveryMethod,
        color,
        size,
        material,
        listingId,
        isOwnListing,
        fetchLineItemsInProgress,
        onFetchTransactionLineItems,
      });
    }
  };

  // In case quantity and deliveryMethod are missing focus on that select-input.
  // Otherwise continue with the default handleSubmit function.
  const handleFormSubmit = e => {
    const { quantity, deliveryMethod } = values || {};
    if (!quantity || quantity < 1) {
      e.preventDefault();
      // Blur event will show validator message
      formApi.blur('quantity');
      formApi.focus('quantity');
    } else if (displayDeliveryMethod && !deliveryMethod) {
      e.preventDefault();
      // Blur event will show validator message
      formApi.blur('deliveryMethod');
      formApi.focus('deliveryMethod');
    } else if (!hasEnoughVariantsData) {
      e.preventDefault();
      // Blur event will show validator message
      if (hasColors) {
        formApi.blur('color');
        formApi.focus('color');
      }
      if (hasSizes) {
        formApi.blur('size');
        formApi.focus('size');
      }
      if (hasMaterials) {
        formApi.blur('material');
        formApi.focus('material');
      }
    } else {
      handleSubmit(e);
    }
  };

  const breakdownData = {};
  const showBreakdown =
    breakdownData && lineItems && !fetchLineItemsInProgress && !fetchLineItemsError;

  const showContactUser = typeof onContactUser === 'function';

  const onClickContactUser = e => {
    e.preventDefault();
    onContactUser();
  };

  const contactSellerLink = (
    <InlineTextButton onClick={onClickContactUser}>
      <FormattedMessage id="ProductOrderForm.finePrintNoStockLinkText" />
    </InlineTextButton>
  );
  const quantityRequiredMsg = intl.formatMessage({ id: 'ProductOrderForm.quantityRequired' });

  // Listing is out of stock if currentStock is zero.
  // Undefined/null stock means that stock has never been set.
  const hasStock = currentStock && currentStock > 0;

  const submitInProgress = fetchLineItemsInProgress;
  const submitDisabled = !hasStock;

  const currentVariantStock = variants.find(
    variant =>
      ((hasColors && variant.attributes.color === values.color) || !hasColors) &&
      ((hasSizes && variant.attributes.size === values.size) || !hasSizes) &&
      ((hasMaterials && variant.attributes.material === values.material) || !hasMaterials) &&
      variant.stock > 0
  )?.stock;

  const showErrorMessage = !currentVariantStock && hasEnoughVariantsData;

  return (
    <Form onSubmit={handleFormSubmit}>
      <FormSpy subscription={{ values: true }} onChange={handleOnChange} />

      <div className={css.formFields}>
        {hasColors && (
          <FieldSelect
            id={`${formId}.color`}
            className={css.colorField}
            name="color"
            label={intl.formatMessage({ id: 'ProductOrderForm.colorLabel' })}
          >
            <option disabled value="">
              {intl.formatMessage({ id: 'ProductOrderForm.colorPlaceholder' })}
            </option>
            {colors.map(color => (
              <option value={color.value} key={color.value}>
                {color.label}
              </option>
            ))}
          </FieldSelect>
        )}

        {hasSizes && (
          <FieldSelect
            id={`${formId}.size`}
            className={css.sizeField}
            name="size"
            label={intl.formatMessage({ id: 'ProductOrderForm.sizeLabel' })}
          >
            <option disabled value="">
              {intl.formatMessage({ id: 'ProductOrderForm.sizePlaceholder' })}
            </option>
            {sizes.map(size => (
              <option value={size.value} key={size.value}>
                {size.label}
              </option>
            ))}
          </FieldSelect>
        )}

        {hasMaterials && (
          <FieldSelect
            id={`${formId}.material`}
            className={css.materialField}
            name="material"
            label={intl.formatMessage({ id: 'ProductOrderForm.materialLabel' })}
          >
            <option disabled value="">
              {intl.formatMessage({ id: 'ProductOrderForm.materialPlaceholder' })}
            </option>
            {materials.map(material => (
              <option value={material.value} key={material.value}>
                {material.label}
              </option>
            ))}
          </FieldSelect>
        )}

        {currentVariantStock > 0 ? (
          <FieldQuantity
            id={`${formId}.quantity`}
            className={css.quantityField}
            name="quantity"
            validate={numberAtLeast(quantityRequiredMsg, 1)}
            maxQuantity={currentVariantStock}
          />
        ) : showErrorMessage ? (
          <p className={css.variantOutOfStock}>
            <FormattedMessage id="ProductOrderForm.variantOutOfStock" />
          </p>
        ) : null}
      </div>

      <DeliveryMethodMaybe
        displayDeliveryMethod={displayDeliveryMethod}
        hasMultipleDeliveryMethods={hasMultipleDeliveryMethods}
        deliveryMethod={values?.deliveryMethod}
        hasStock={hasStock}
        formId={formId}
        intl={intl}
      />

      {showBreakdown ? (
        <div className={css.breakdownWrapper}>
          <H6 as="h3" className={css.bookingBreakdownTitle}>
            <FormattedMessage id="ProductOrderForm.breakdownTitle" />
          </H6>
          <hr className={css.totalDivider} />
          <EstimatedCustomerBreakdownMaybe
            breakdownData={breakdownData}
            lineItems={lineItems}
            currency={price.currency}
            marketplaceName={marketplaceName}
            processName={PURCHASE_PROCESS_NAME}
          />
        </div>
      ) : null}

      <FetchLineItemsError error={fetchLineItemsError} />

      {!hideSubmitButton && (
        <div className={css.submitButton}>
          <PrimaryButton type="submit" inProgress={submitInProgress} disabled={submitDisabled}>
            {hasStock ? (
              <FormattedMessage id="ProductOrderForm.ctaButton" />
            ) : (
              <FormattedMessage id="ProductOrderForm.ctaButtonNoStock" />
            )}
          </PrimaryButton>
        </div>
      )}
      <p className={css.finePrint}>
        {payoutDetailsWarning ? (
          payoutDetailsWarning
        ) : hasStock && isOwnListing ? (
          <FormattedMessage id="ProductOrderForm.ownListing" />
        ) : hasStock ? (
          <FormattedMessage id="ProductOrderForm.finePrint" />
        ) : showContactUser ? (
          <FormattedMessage id="ProductOrderForm.finePrintNoStock" values={{ contactSellerLink }} />
        ) : null}
      </p>
    </Form>
  );
};

/**
 * A form for ordering a product.
 *
 * @component
 * @param {Object} props
 * @param {string} [props.rootClassName] - Custom class that overrides the default class for the root element
 * @param {string} [props.className] - Custom class that extends the default class for the root element
 * @param {string} props.marketplaceName - The name of the marketplace
 * @param {string} props.formId - The ID of the form
 * @param {Function} props.onSubmit - The function to handle the form submission
 * @param {propTypes.uuid} props.listingId - The ID of the listing
 * @param {propTypes.money} props.price - The price of the listing
 * @param {number} props.currentStock - The current stock of the listing
 * @param {boolean} props.isOwnListing - Whether the listing is owned by the current user
 * @param {boolean} props.pickupEnabled - Whether pickup is enabled
 * @param {boolean} props.shippingEnabled - Whether shipping is enabled
 * @param {boolean} props.displayDeliveryMethod - Whether the delivery method is displayed
 * @param {Object} props.lineItems - The line items
 * @param {Function} props.onFetchTransactionLineItems - The function to fetch the transaction line items
 * @param {boolean} props.fetchLineItemsInProgress - Whether the line items are being fetched
 * @param {propTypes.error} props.fetchLineItemsError - The error for fetching the line items
 * @param {Function} props.onContactUser - The function to contact the user
 * @param {Object} props.listingFieldConfigs - The listing field configs
 * @param {boolean} props.hideSubmitButton - Whether the submit button is hidden
 * @returns {JSX.Element}
 */
const ProductOrderForm = props => {
  const intl = useIntl();
  const {
    price,
    currentStock,
    pickupEnabled,
    shippingEnabled,
    displayDeliveryMethod,
    allowOrdersOfMultipleItems,
  } = props;

  // Should not happen for listings that go through EditListingWizard.
  // However, this might happen for imported listings.
  if (displayDeliveryMethod && !pickupEnabled && !shippingEnabled) {
    return (
      <p className={css.error}>
        <FormattedMessage id="ProductOrderForm.noDeliveryMethodSet" />
      </p>
    );
  }

  const hasOneItemLeft = currentStock && currentStock === 1;
  const hasOneItemMode = !allowOrdersOfMultipleItems && currentStock > 0;
  const quantityMaybe = hasOneItemLeft || hasOneItemMode ? { quantity: '1' } : {};
  const deliveryMethodMaybe =
    shippingEnabled && !pickupEnabled
      ? { deliveryMethod: 'shipping' }
      : !shippingEnabled && pickupEnabled
      ? { deliveryMethod: 'pickup' }
      : !shippingEnabled && !pickupEnabled
      ? { deliveryMethod: 'none' }
      : {};
  const hasMultipleDeliveryMethods = pickupEnabled && shippingEnabled;
  const initialValues = { ...quantityMaybe, ...deliveryMethodMaybe };

  return (
    <FinalForm
      initialValues={initialValues}
      hasMultipleDeliveryMethods={hasMultipleDeliveryMethods}
      displayDeliveryMethod={displayDeliveryMethod}
      {...props}
      intl={intl}
      render={renderForm}
    />
  );
};

export default ProductOrderForm;
