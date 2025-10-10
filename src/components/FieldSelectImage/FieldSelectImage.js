import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import classNames from 'classnames';
import { Field } from 'react-final-form';
import { AspectRatioWrapper, ResponsiveImage, ValidationError } from '../../components';

import css from './FieldSelectImage.module.css';

const FieldSelectImageComponent = props => {
  const {
    rootClassName,
    className,
    id,
    label,
    input,
    meta,
    options,
    onChange,
    showLabelAsDisabled,
    disabled,
    itemClassName,
    labelClassName,
    imageClassName,
    intl,
    listingImageConfig,
    isOpen: isOpenProp,
    onOpenChange,
    hideErrorMessage,
    ...rest
  } = props;

  if (label && !id) {
    throw new Error('id required when a label is given');
  }

  const { touched, invalid, error } = meta;
  const hasError = touched && invalid && error;

  const classes = classNames(rootClassName || css.root, className);
  const groupLabelClasses = classNames({
    [css.labelDisabled]: showLabelAsDisabled,
    [labelClassName]: !!labelClassName,
  });

  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = typeof isOpenProp === 'boolean';
  const isOpen = isControlled ? isOpenProp : internalOpen;
  const setOpen = useCallback(
    next => {
      if (disabled) return;
      if (onOpenChange) onOpenChange(next);
      if (!isControlled) setInternalOpen(next);
    },
    [disabled, onOpenChange, isControlled]
  );

  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const [menuStyle, setMenuStyle] = useState({});
  useEffect(() => {
    if (!isOpen) return;
    const handleDocClick = e => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target)) {
        setOpen(false);
        if (input.onBlur) {
          input.onBlur();
        }
      }
    };
    const handleKey = e => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleDocClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleDocClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isOpen, setOpen]);

  // Position dropdown as fixed overlay relative to viewport
  const updateMenuPosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const estimatedMenuHeight = 280; // heuristic; actual max-height in CSS is 320px

    // Prefer opening downward; if not enough space, open upward.
    const spaceBelow = viewportHeight - rect.bottom;
    const openUpward = spaceBelow < Math.min(estimatedMenuHeight, viewportHeight / 2);
    const top = openUpward ? Math.max(8, rect.top - estimatedMenuHeight) : rect.bottom;

    setMenuStyle({
      top: Math.round(top),
      left: Math.round(rect.left),
      minWidth: Math.round(rect.width),
      maxWidth: Math.round(Math.min(rect.width, window.innerWidth - rect.left - 8)),
    });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    updateMenuPosition();
    const onScroll = () => updateMenuPosition();
    const onResize = () => updateMenuPosition();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [isOpen, updateMenuPosition]);

  const handleSelect = value => {
    if (disabled) {
      return;
    }
    // Mirror FieldSelect: call input.onChange with synthetic-like event
    input.onChange(value);
    if (onChange) {
      onChange(value);
    }
    if (input.onBlur) {
      input.onBlur();
    }
    // Close dropdown after selection
    setOpen(false);
  };

  const { aspectWidth = 1, aspectHeight = 1, variantPrefix } = listingImageConfig;

  const selectedOption = useMemo(() => {
    if (!options || options.length === 0) return null;
    const key = input.value;
    return options.find(o => o.id.uuid === key) || null;
  }, [options, input.value]);
  const variants = options[0]
    ? Object.keys(options[0]?.attributes?.variants).filter(k => k.startsWith(variantPrefix))
    : [];

  const selectedVariants = selectedOption
    ? Object.keys(selectedOption?.attributes?.variants).filter(k => k.startsWith(variantPrefix))
    : [];

  const onToggle = () => {
    const next = !isOpen;
    setOpen(next);
    if (!isOpen) {
      // opening: compute position immediately
      setTimeout(() => updateMenuPosition(), 0);
    }
  };

  return (
    <div className={classes} {...rest} ref={containerRef}>
      {label ? (
        <label htmlFor={id} className={groupLabelClasses}>
          {label}
        </label>
      ) : null}
      <div className={css.dropdown}>
        <button
          type="button"
          className={classNames(css.trigger, {
            [css.triggerPlaceholder]: !selectedOption,
            [css.triggerError]: hasError,
          })}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          onClick={onToggle}
          disabled={disabled}
          ref={triggerRef}
        >
          {selectedOption ? (
            <div className={css.triggerContent}>
              {selectedOption.image ? (
                <div className={classNames(css.image, imageClassName)}>{selectedOption.image}</div>
              ) : (
                <AspectRatioWrapper
                  className={css.aspectRatioWrapper}
                  width={aspectWidth}
                  height={aspectHeight}
                >
                  <ResponsiveImage
                    rootClassName={css.rootForImage}
                    image={selectedOption}
                    alt={intl.formatMessage({
                      id: 'FieldSelectImage.savedImageAltText',
                    })}
                    variants={selectedVariants}
                  />
                </AspectRatioWrapper>
              )}
              {selectedOption.label ? (
                <span className={css.selectedLabel}>{selectedOption.label}</span>
              ) : null}
            </div>
          ) : (
            <div className={css.placeholder}>
              {intl.formatMessage({
                id: 'FieldSelectImage.placeholder',
              })}
            </div>
          )}
        </button>
        <div
          className={classNames(css.menuFixed, {
            [css.menuFixedOpen]: isOpen,
          })}
          role="listbox"
          aria-labelledby={id}
          style={menuStyle}
        >
          {(options || []).map(option => {
            const optionKey = option.id.uuid;
            const isSelected = input.value === optionKey;
            const itemClasses = classNames(
              css.option,
              { [css.optionSelected]: isSelected, [css.itemDisabled]: disabled },
              itemClassName
            );
            return (
              <button
                key={optionKey}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={itemClasses}
                onClick={() => handleSelect(optionKey)}
                disabled={disabled}
              >
                {option.image ? (
                  <div className={classNames(css.image, imageClassName)}>{option.image}</div>
                ) : (
                  <AspectRatioWrapper
                    className={css.aspectRatioWrapper}
                    width={aspectWidth}
                    height={aspectHeight}
                  >
                    <ResponsiveImage
                      rootClassName={css.rootForImage}
                      image={option}
                      alt={intl.formatMessage({
                        id: 'FieldSelectImage.savedImageAltText',
                      })}
                      variants={variants}
                    />
                  </AspectRatioWrapper>
                )}
                {option.label ? <span className={css.itemLabel}>{option.label}</span> : null}
              </button>
            );
          })}
        </div>
      </div>
      {!hideErrorMessage ? <ValidationError fieldMeta={meta} /> : null}
    </div>
  );
};

/**
 * Final Form Field wrapping an image selection grid
 *
 * @component
 * @param {Object} props
 * @param {string?} props.className Additional styles for root
 * @param {string?} props.rootClassName Overwrite component root styles
 * @param {string} props.name Name of the Final Form field
 * @param {string?} props.id Id required when label is given
 * @param {ReactNode?} props.label Optional group label
 * @param {Array<{key?: string, value?: string, label?: React.ReactNode, image?: React.ReactNode, imageUrl?: string, imageAlt?: string}>} props.options Options to render
 * @param {boolean?} props.disabled Disable selections
 * @param {Function?} props.onChange Callback receiving selected value
 * @returns {JSX.Element}
 */
const FieldSelectImage = props => {
  return <Field component={FieldSelectImageComponent} {...props} />;
};

export default FieldSelectImage;
