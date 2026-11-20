import Lottie from 'lottie-react';
import foodAnimation from '../assets/buVb1xsacB.json';

const LottieFoodAnimation = () => {
  return (
    <div className="h-full sm:w-full flex items-center justify-center overflow-hidden">
      <Lottie
        animationData={foodAnimation}
        loop
        autoplay
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain'
        }}
      />
    </div>
  );
};

export default LottieFoodAnimation;
