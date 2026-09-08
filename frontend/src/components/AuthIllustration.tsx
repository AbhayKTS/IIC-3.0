import DotLottieLoader from '@/components/Loader';

type AuthIllustrationProps = {
  className?: string;
};

const AUTH_DOT_LOTTIE_SRC =
  'https://lottie.host/7a753e3c-14a7-4657-b5dc-cd8c6b952ffd/F4qKTN4Ubz.lottie';

export default function AuthIllustration({ className }: AuthIllustrationProps) {
  return (
    <div className={`flex items-center justify-center ${className || ''}`.trim()}>
      <div className="w-full max-w-sm sm:max-w-md lg:max-w-lg rounded-3xl border border-white/10 bg-secondary/20 backdrop-blur-sm p-6 sm:p-8 flex items-center justify-center">
        <div className="scale-90 sm:scale-100 lg:scale-110">
          <DotLottieLoader size={240} src={AUTH_DOT_LOTTIE_SRC} />
        </div>
      </div>
    </div>
  );
}
