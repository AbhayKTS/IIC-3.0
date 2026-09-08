type DotLottieLoaderProps = {
  size?: number;
  className?: string;
  src?: string;
};

const DEFAULT_DOT_LOTTIE_SRC =
  'https://lottie.host/8e9ba250-f217-46e0-af8a-8a6ba339f28d/MZcE3bcIZH.lottie';

export default function DotLottieLoader({
  size = 300,
  className,
  src = DEFAULT_DOT_LOTTIE_SRC,
}: DotLottieLoaderProps) {
  return (
    <dotlottie-wc
      src={src}
      autoplay
      loop
      className={className}
      style={{ width: `${size}px`, height: `${size}px`, display: 'inline-block' }}
    />
  );
}
