import React, { useRef, useEffect } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Keyboard, A11y } from 'swiper/modules';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

import css from './MediaSlider.module.css';

const AutoPlayVideo = ({ url, className }) => {
  const videoRef = useRef(null);

  if (!url) {
    return null;
  }

  useEffect(() => {
    if (!videoRef.current) return;

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          videoRef.current?.play();
        } else {
          videoRef.current?.pause();
        }
      });
    });

    observer.observe(videoRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <video
      ref={videoRef}
      src={url}
      muted
      playsInline
      className={className}
      controls
      loop
      preload="metadata"
    />
  );
};

const isVideo = url => {
  return url.includes('video%2Fmp4') || url.includes('video/mp4');
};

const SwiperWrapper = ({ media }) => {
  return (
    <Swiper
      modules={[Navigation, Pagination, Keyboard, A11y]}
      spaceBetween={0}
      slidesPerView={1}
      loop={media.length > 1}
      navigation={media.length > 1}
      pagination={media.length > 1 ? { clickable: true } : false}
      keyboard={{
        enabled: true,
      }}
      className={css.swiper}
    >
      {media.map((item, index) => {
        const isVideoFile = isVideo(item.url);

        return (
          <SwiperSlide key={item.id} className={css.slide}>
            {isVideoFile ? (
              <AutoPlayVideo className={css.media} url={item.url} />
            ) : (
              <img className={css.media} src={item.url} alt={`Media ${index + 1}`} loading="lazy" />
            )}
          </SwiperSlide>
        );
      })}
    </Swiper>
  );
};

export default SwiperWrapper;
