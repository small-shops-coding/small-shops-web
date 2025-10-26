import React, { useEffect, useState } from 'react';
import loadable from '@loadable/component';
import classNames from 'classnames';

import css from './MediaSlider.module.css';

// Dynamically import Swiper to avoid SSR issues with ESM
const SwiperComponent = loadable(() => import('./SwiperWrapper'), {
  ssr: false,
});

const isVideo = url => {
  return url.includes('video%2Fmp4') || url.includes('video/mp4');
};

const MediaSlider = ({ media = [], className, rootClassName }) => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!media || media.length === 0) {
    return null;
  }

  const classes = classNames(rootClassName || css.root, className);

  // Return placeholder during SSR
  if (!isClient) {
    return (
      <div className={classes}>
        <div className={css.swiper}>
          <div className={css.slide}>
            {media[0] &&
              (isVideo(media[0].url) ? (
                <video
                  className={css.media}
                  src={media[0].url}
                  muted
                  playsInline
                  preload="metadata"
                />
              ) : (
                <img className={css.media} src={media[0].url} alt="Media 1" />
              ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={classes}>
      <SwiperComponent media={media} />
    </div>
  );
};

export default MediaSlider;
