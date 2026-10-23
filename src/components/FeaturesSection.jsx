import RingGallerySlider from './RingGallerySlider';

const FeaturesSection = () => {
  return (
    <section className="py-16 md:py-24 px-4 bg-base-100 relative overflow-hidden">
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-6 md:mb-10">
          <span className="inline-block px-5 py-2 bg-primary/15 text-primary rounded-full text-sm font-bold mb-6 uppercase tracking-wider">
            Features
          </span>
          <h2 className="text-4xl md:text-6xl font-black text-base-content mb-4">
            Everything You Need
          </h2>
          <p className="text-lg md:text-xl text-base-content max-w-3xl mx-auto leading-relaxed">
            A complete mess management system built for shared living — simple, fast, and organized.
          </p>
        </div>

        <RingGallerySlider autoplay interval={5000} />
      </div>
    </section>
  );
};

export default FeaturesSection;
