import React, { useCallback, useMemo, useState } from 'react';
import { Field, Form as FinalForm } from 'react-final-form';
import arrayMutators from 'final-form-arrays';
import classNames from 'classnames';

// Import configs and util modules
import { FormattedMessage, useIntl } from '../../../../util/reactIntl';
import { propTypes } from '../../../../util/types';
import * as validators from '../../../../util/validators';
import { formatMoney } from '../../../../util/currency';
import { types as sdkTypes } from '../../../../util/sdkLoader';

// Import shared components
import {
  Button,
  FieldCurrencyInput,
  FieldQuantity,
  FieldSelect,
  FieldSelectImage,
  FieldTextInput,
  Form,
  IconDelete,
  InlineTextButton,
  SecondaryButton,
} from '../../../../components';

// Import modules from this directory
import css from './EditListingVariantsForm.module.css';
import { COLOR_ENUMS, MATERIAL_ENUMS, SIZE_ENUMS } from '../../../../util/variants';
import appSettings from '../../../../config/settings';

const { Money } = sdkTypes;

const getPriceValidators = (listingMinimumPriceSubUnits, marketplaceCurrency, intl) => {
  const priceRequiredMsgId = { id: 'EditListingVariantsForm.priceRequired' };
  const priceRequiredMsg = intl.formatMessage(priceRequiredMsgId);
  const priceRequired = validators.required(priceRequiredMsg);

  const minPriceRaw = new Money(listingMinimumPriceSubUnits, marketplaceCurrency);
  const minPrice = formatMoney(intl, minPriceRaw);
  const priceTooLowMsgId = { id: 'EditListingVariantsForm.priceTooLow' };
  const priceTooLowMsg = intl.formatMessage(priceTooLowMsgId, { minPrice });
  const minPriceRequired = validators.moneySubUnitAmountAtLeast(
    priceTooLowMsg,
    listingMinimumPriceSubUnits
  );

  return listingMinimumPriceSubUnits
    ? validators.composeValidators(priceRequired, minPriceRequired)
    : priceRequired;
};

const getVariantNameSelectOptions = (listingFieldsConfig, variantType, intl) => {
  if (variantType === 'size') {
    const enumOptions = listingFieldsConfig.find(field => field.key === 'size')?.enumOptions || [];
    const hasFetchedEnumOptions = enumOptions.length > 0;
    const sizeEnum = hasFetchedEnumOptions ? enumOptions : SIZE_ENUMS;
    return sizeEnum.map(size => ({
      value: size.option,
      label: !hasFetchedEnumOptions
        ? intl.formatMessage({ id: size.label })
        : size.label || size.option,
    }));
  }
  if (variantType === 'color') {
    const enumOptions =
      listingFieldsConfig.find(field => field.key === 'colour')?.enumOptions || [];
    const hasFetchedEnumOptions = enumOptions.length > 0;
    const colorEnum = hasFetchedEnumOptions ? enumOptions : COLOR_ENUMS;
    return colorEnum.map(color => ({
      value: color.option,
      label: !hasFetchedEnumOptions
        ? intl.formatMessage({ id: color.label })
        : color.label || color.option,
    }));
  }
  if (variantType === 'material') {
    const enumOptions =
      listingFieldsConfig.find(field => field.key === 'quality_standards')?.enumOptions || [];
    const hasFetchedEnumOptions = enumOptions.length > 0;
    const materialEnum = hasFetchedEnumOptions ? enumOptions : MATERIAL_ENUMS;

    return materialEnum.map(material => ({
      value: material.option,
      label: !hasFetchedEnumOptions
        ? intl.formatMessage({ id: material.label })
        : material.label || material.option,
    }));
  }
  return [];
};

const SetVariantInfoTable = props => {
  const {
    variants,
    intl,
    getVariantTypeLabel,
    marketplaceCurrency,
    listingImageConfig,
    rows,
    images,
  } = props;

  const priceValidators = getPriceValidators(1, marketplaceCurrency, intl);

  return (
    <div className={css.variantInfoTable}>
      <h4 className={css.variantInfoTableTitle}>
        {intl.formatMessage({ id: 'EditListingVariantsForm.variantInfoTableTitle' })}
      </h4>
      <div className={css.variantInfoTableWrapper}>
        <table className={css.variantInfoTableTable}>
          <thead>
            <tr>
              <th>{intl.formatMessage({ id: 'EditListingVariantsForm.no' })}</th>
              {variants.map(variant => (
                <th key={variant.id} style={{ width: variant.type === 'material' ? '300px' : '' }}>
                  <span>{getVariantTypeLabel(variant.type)}</span>
                </th>
              ))}
              <th className={css.thSku}>
                {intl.formatMessage({ id: 'EditListingVariantsForm.sku' })}
              </th>
              <th className={css.thPrice}>
                {intl.formatMessage({ id: 'EditListingVariantsForm.price' })}
              </th>
              <th className={css.thStock}>
                {intl.formatMessage({ id: 'EditListingVariantsForm.stock' })}
              </th>
              <th className={css.thImage}>
                {intl.formatMessage({ id: 'EditListingVariantsForm.image' })}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={row.id}>
                <td>{rowIndex + 1}</td>
                {variants.map(variant => (
                  <td key={variant.type}>{row[`${variant.type}_label`] || '-'}</td>
                ))}
                <td>
                  <FieldTextInput
                    name={`variantInfo.${rowIndex}.sku`}
                    placeholder="SKU"
                    className={css.inputField}
                  />
                </td>
                <td>
                  <FieldCurrencyInput
                    name={`variantInfo.${rowIndex}.price`}
                    currencyConfig={appSettings.getCurrencyFormatting(marketplaceCurrency)}
                    placeholder="Price"
                    className={css.inputField}
                    validate={priceValidators}
                    hideErrorMessage
                  />
                </td>
                <td>
                  <FieldQuantity
                    id={`variantInfo.${rowIndex}.stock`}
                    name={`variantInfo.${rowIndex}.stock`}
                    className={css.inputField}
                  />
                </td>
                <td className={css.tdImage}>
                  <FieldSelectImage
                    hideErrorMessage
                    name={`variantInfo.${rowIndex}.imageId`}
                    className={css.inputField}
                    options={images}
                    listingImageConfig={listingImageConfig}
                    intl={intl}
                    validate={validators.required(
                      intl.formatMessage({ id: 'EditListingVariantsForm.imageRequired' })
                    )}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const mappingAllPossibleVariants = (
  variants,
  listingFieldsConfig,
  originalVariantInfo = [],
  intl
) => {
  // Filter variants that have both type and values selected
  const validVariants = variants.filter(variant => variant.type && variant.values.length > 0);

  if (validVariants.length === 0) {
    return [];
  }

  // Generate cartesian product of all variant values
  const generateCombinations = (arrays, variants, index = 0, current = []) => {
    if (index === arrays.length) {
      return [current];
    }

    const result = [];
    for (const value of arrays[index]) {
      result.push(...generateCombinations(arrays, variants, index + 1, [...current, value]));
    }
    return result;
  };

  // Extract values from each variant type
  const variantValues = validVariants.map(variant => variant.values);

  // Generate all possible combinations
  const combinations = generateCombinations(variantValues, variants);

  // Helper function to get label from enum options
  const getValueLabel = (variantType, value) => {
    const options = getVariantNameSelectOptions(listingFieldsConfig, variantType, intl);
    const option = options.find(opt => opt.value === value);
    return option ? option.label : value;
  };

  // Map combinations to objects with variant type and value pairs (with labels)
  const rows = combinations.map((combination, index) => {
    let row = {};
    validVariants.forEach((variant, variantIndex) => {
      const value = combination[variantIndex];
      row[variant.type] = value;
      row.attributes = {
        ...row.attributes,
        [variant.type]: value,
      };
      row[`${variant.type}_label`] = getValueLabel(variant.type, value);
    });
    row.id = Object.values(row.attributes).join('-');
    const originalRow = originalVariantInfo.find(originalRow => originalRow.id === row.id) || {};
    row = {
      ...originalRow,
      ...row,
    };
    return row;
  });
  return rows;
};

const RenderVariantsSettings = props => {
  const {
    variants,
    intl,
    listingFieldsConfig,
    form,
    marketplaceCurrency,
    listingImageConfig,
    listingMinimumPriceSubUnits,
    saveActionMsg,
    submitInProgress,
    submitDisabled,
    submitReady,
    images,
  } = props;
  const sizeLabel = intl.formatMessage({ id: 'EditListingVariantsForm.size' });
  const colorLabel = intl.formatMessage({ id: 'EditListingVariantsForm.color' });
  const materialLabel = intl.formatMessage({ id: 'EditListingVariantsForm.material' });
  const [step, setStep] = useState(1);

  const renderVariantTypeOptions = variantType => {
    let options = [
      { value: 'size', label: sizeLabel },
      { value: 'color', label: colorLabel },
      { value: 'material', label: materialLabel },
    ];

    const alreadySelectedTypes = variants
      .filter(variant => variant.type !== variantType)
      .map(variant => variant.type);

    if (alreadySelectedTypes.includes('size')) {
      options = options.filter(option => option.value !== 'size');
    }
    if (alreadySelectedTypes.includes('color')) {
      options = options.filter(option => option.value !== 'color');
    }
    if (alreadySelectedTypes.includes('material')) {
      options = options.filter(option => option.value !== 'material');
    }

    return options;
  };

  const getVariantTypeLabel = variantType => {
    if (variantType === 'size') {
      return sizeLabel;
    }
    if (variantType === 'color') {
      return colorLabel;
    }
    if (variantType === 'material') {
      return materialLabel;
    }
    return '';
  };

  const onAddVariant = () => {
    const newVariants = [
      ...variants,
      {
        id: new Date().getTime(),
        type: '',
        values: [],
      },
    ];
    form.change(`variants`, newVariants);
  };

  const onDeleteVariant = variant => {
    const { id, values = [] } = variant;
    const newVariants = variants.filter(variant => variant.id !== id);
    const originalVariantInfo = form.getState().initialValues.variantInfo;
    const newVariantInfo = mappingAllPossibleVariants(
      newVariants,
      listingFieldsConfig,
      originalVariantInfo,
      intl
    );
    if (values.length > 0) {
      form.change(`variantInfo`, newVariantInfo);
    }
    form.change(`variants`, newVariants);
  };

  const toggleVariantValue = (type, value) => {
    const newVariants = variants.map(variant => {
      if (variant.type === type) {
        return {
          ...variant,
          values: variant.values.includes(value)
            ? variant.values.filter(v => v !== value)
            : [...variant.values, value],
        };
      }
      return variant;
    });
    const variantInfo = mappingAllPossibleVariants(newVariants, listingFieldsConfig, [], intl);
    const formattedVariantInfo = variantInfo.map(variant => {
      return {
        id: Object.values(variant.attributes).join('-'),
        attributes: variant.attributes,
      };
    });
    form.change(`variantInfo`, formattedVariantInfo);
    form.change(`variants`, newVariants);
  };

  const allVariantHasSelectedType = variants.length > 0 && variants.length === 3;
  const onChangeVariantType = (type, index) => {
    form.change(`variants.${index}.type`, type);
    form.change(`variants.${index}.values`, []);
  };

  const renderVariantTypeStep = () => {
    return (
      <div className={css.variantTypeStep}>
        {variants.map((variant, index) => (
          <div key={variant.id} className={css.variant}>
            <div className={css.variantName}>
              <FieldSelect
                onChange={value => onChangeVariantType(value, index)}
                name={`variants.${index}.type`}
                className={css.variantNameSelect}
              >
                <option value="" disabled>
                  {intl.formatMessage({ id: 'EditListingVariantsForm.selectVariantType' })}
                </option>
                {renderVariantTypeOptions(variant.type).map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </FieldSelect>
              {variants.length > 1 && (
                <InlineTextButton
                  type="button"
                  onClick={() => {
                    onDeleteVariant(variant);
                  }}
                >
                  <IconDelete />
                </InlineTextButton>
              )}
            </div>
            <div className={css.variantValuesWrapper}>
              {variant.type && (
                <h4 className={css.variantValuesTitle}>
                  <FormattedMessage
                    id="EditListingVariantsForm.variantValuesTitle"
                    values={{ variantTypeLabel: getVariantTypeLabel(variant.type) }}
                  />
                </h4>
              )}
              <div className={css.variantValues}>
                {getVariantNameSelectOptions(listingFieldsConfig, variant.type, intl).map(
                  option => (
                    <InlineTextButton
                      type="button"
                      key={option.value}
                      value={option.value}
                      className={classNames(css.variantValueButton, {
                        [css.variantValueButtonSelected]: variant.values.includes(option.value),
                      })}
                      onClick={() => {
                        toggleVariantValue(variant.type, option.value);
                      }}
                    >
                      {option.label}
                    </InlineTextButton>
                  )
                )}
              </div>
            </div>
          </div>
        ))}

        {!allVariantHasSelectedType && (
          <InlineTextButton className={css.addVariantButton} type="button" onClick={onAddVariant}>
            +{' '}
            {variants.length === 0 ? (
              <FormattedMessage id="EditListingVariantsForm.addVariant" />
            ) : (
              <FormattedMessage id="EditListingVariantsForm.addMoreVariants" />
            )}
          </InlineTextButton>
        )}
      </div>
    );
  };

  const rows = useMemo(() => mappingAllPossibleVariants(variants, listingFieldsConfig, [], intl), [
    JSON.stringify(variants),
    JSON.stringify(listingFieldsConfig),
  ]);

  const renderVariantInfoStep = () => (
    <SetVariantInfoTable
      variants={variants}
      intl={intl}
      getVariantTypeLabel={getVariantTypeLabel}
      form={form}
      marketplaceCurrency={marketplaceCurrency}
      listingImageConfig={listingImageConfig}
      listingMinimumPriceSubUnits={listingMinimumPriceSubUnits}
      rows={rows}
      images={images}
    />
  );

  const renderStep = () => {
    if (step === 1) {
      return renderVariantTypeStep();
    }
    if (step === 2) {
      return renderVariantInfoStep();
    }
  };

  const shouldNext =
    variants.length > 0 &&
    step < 2 &&
    variants.every(variant => variant.type && variant.values.length > 0);

  return (
    <div className={css.variants}>
      {renderStep()}
      {step === 2 && (
        <SecondaryButton className={css.backButton} type="button" onClick={() => setStep(step - 1)}>
          Back
        </SecondaryButton>
      )}
      {step === 1 && shouldNext && (
        <SecondaryButton className={css.nextButton} type="button" onClick={() => setStep(step + 1)}>
          Next
        </SecondaryButton>
      )}
      {step === 2 && (
        <Button
          className={css.submitButton}
          type="submit"
          inProgress={submitInProgress}
          disabled={submitDisabled}
          ready={submitReady}
        >
          {saveActionMsg}
        </Button>
      )}
    </div>
  );
};

/**
 * The EditListingVariantsForm component.
 *
 * @component
 * @param {Object} props
 * @param {string} [props.formId] - The form id
 * @param {string} [props.className] - Custom class that extends the default class for the root element
 * @param {string} [props.rootClassName] - Custom class that overrides the default class for the root element
 * @param {propTypes.ownListing} props.listing - The listing object
 * @param {propTypes.listingType} props.listingType - The listing types config
 * @param {string} props.unitType - The unit type (e.g. 'item')
 * @param {string} props.marketplaceCurrency - The marketplace currency (e.g. 'USD')
 * @param {number} props.listingMinimumPriceSubUnits - The listing minimum price sub units
 * @param {boolean} [props.autoFocus] - Whether the form should autofocus
 * @param {boolean} props.disabled - Whether the form is disabled
 * @param {boolean} props.ready - Whether the form is ready
 * @param {boolean} props.updated - Whether the form is updated
 * @param {boolean} props.updateInProgress - Whether the form is updating
 * @param {Object} props.fetchErrors - The fetch errors
 * @param {propTypes.error} [props.fetchErrors.showListingsError] - The show listings error
 * @param {propTypes.error} [props.fetchErrors.updateListingError] - The update listing error
 * @param {Function} props.onSubmit - The submit function
 * @param {string} props.saveActionMsg - The save action message
 * @param {Object} props.listingFieldsConfig - The listing fields config
 * @param {Object} props.listingImageConfig - The listing image config
 * @param {number} props.listingImageConfig.aspectWidth - The aspect width
 * @param {number} props.listingImageConfig.aspectHeight - The aspect height
 * @param {string} props.listingImageConfig.variantPrefix - The variant prefix
 * @returns {JSX.Element}
 */
export const EditListingVariantsForm = props => (
  <FinalForm
    {...props}
    mutators={{ ...arrayMutators }}
    render={formRenderProps => {
      const {
        className,
        rootClassName,
        disabled,
        ready,
        handleSubmit,
        invalid,
        pristine,
        marketplaceCurrency,
        listingMinimumPriceSubUnits = 0,
        saveActionMsg,
        updated,
        updateInProgress,
        fetchErrors,
        values,
        form,
        listingFieldsConfig,
        listingImageConfig,
        images,
      } = formRenderProps;
      const intl = useIntl();
      const classes = classNames(rootClassName || css.root, className);
      const submitReady = (updated && pristine) || ready;
      const submitInProgress = updateInProgress;
      const submitDisabled =
        invalid ||
        disabled ||
        submitInProgress ||
        !values.variantInfo ||
        values.variantInfo?.length === 0 ||
        values.variantInfo?.some(variant => !variant.imageId || !variant.price);
      console.log(values.variantInfo);
      const { updateListingError, showListingsError } = fetchErrors || {};
      const variants = values.variants || [];
      return (
        <Form onSubmit={handleSubmit} className={classes}>
          {updateListingError ? (
            <p className={css.error}>
              <FormattedMessage id="EditListingVariantsForm.updateFailed" />
            </p>
          ) : null}
          {showListingsError ? (
            <p className={css.error}>
              <FormattedMessage id="EditListingVariantsForm.showListingFailed" />
            </p>
          ) : null}

          <RenderVariantsSettings
            form={form}
            listingFieldsConfig={listingFieldsConfig}
            variants={variants}
            intl={intl}
            marketplaceCurrency={marketplaceCurrency}
            listingImageConfig={listingImageConfig}
            listingMinimumPriceSubUnits={listingMinimumPriceSubUnits}
            saveActionMsg={saveActionMsg}
            submitInProgress={submitInProgress}
            submitDisabled={submitDisabled}
            submitReady={submitReady}
            images={images}
          />
        </Form>
      );
    }}
  />
);

export default EditListingVariantsForm;
