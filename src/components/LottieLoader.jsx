import Lottie from 'lottie-react';
import burgerAnimation from '../assets/Burger.json';

const LottieLoader = ({ size = 270, fullPage = false, text }) => {
  const inner = (
    <div className="flex flex-col items-center gap-3">
      <Lottie
        animationData={burgerAnimation}
        loop
        autoplay
        style={{ width: size, height: size }}
      />
      {text && <p className="text-base-content/60 text-sm font-medium">{text}</p>}
    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-base-100 z-40">
        {inner}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-100">
      {inner}
    </div>
  );
};

export default LottieLoader;
