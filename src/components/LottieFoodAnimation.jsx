import { DotLottieReact } from '@lottiefiles/dotlottie-react';

const LOTTIE_SRC =
  'https://lottie.host/f5dd7f95-bc65-4762-a774-83b0a8335e54/90oebfUk5O.lottie';

const LottieFoodAnimation = () => (
  <div className="h-full sm:w-full flex items-center justify-center overflow-hidden">
    <DotLottieReact
      src={LOTTIE_SRC}
      loop
      autoplay
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'contain'
      }}
      rendererSettings={{
        preserveAspectRatio: 'xMidYMid meet'
      }}
    />
  </div>
);

export default LottieFoodAnimation;
