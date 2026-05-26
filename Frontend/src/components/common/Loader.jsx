import { DotLottieReact } from '@lottiefiles/dotlottie-react';

const Loader = ({ fullScreen = false, overlay = false }) => {
  const lottie = (
    <>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .fade-in-anim {
          animation: fadeIn 0.5s ease-in-out forwards;
        }
      `}</style>
      <div className="w-48 h-48 fade-in-anim flex items-center justify-center">
        <DotLottieReact
          src="https://lottie.host/d979fbaa-1f80-4a10-8006-a0c5f3fbb294/BPfdTbB60I.lottie"
          loop
          autoplay
        />
      </div>
    </>
  );

  if (overlay) {
    return (
      <div className="fixed inset-0 bg-bg/80 backdrop-blur-sm z-50 flex items-center justify-center fade-in-anim">
        {lottie}
      </div>
    );
  }

  if (fullScreen) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg w-full fade-in-anim">
        {lottie}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center w-full p-8">
      {lottie}
    </div>
  );
};

export default Loader;
