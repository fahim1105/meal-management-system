const MODEL_ID = 'c826a9119bb347908ea445dbdcd798e2';

const SketchfabCookingMachine = ({ className = '' }) => (
  <div className={`sketchfab-embed-wrapper w-full h-full min-h-[320px] ${className}`}>
    <iframe
      title="Cooking Machine"
      className="w-full h-full rounded-3xl border-0 bg-transparent"
      allow="autoplay; fullscreen; xr-spatial-tracking"
      allowFullScreen
      src={`https://sketchfab.com/models/${MODEL_ID}/embed?autostart=1&ui_theme=dark&ui_infos=0&ui_watermark_link=0&ui_watermark=0&ui_hint=0&dnt=1`}
    />
    <p className="sr-only">
      <a href={`https://sketchfab.com/3d-models/cooking-machine-${MODEL_ID}`} target="_blank" rel="noreferrer">
        Cooking Machine
      </a>
      {' '}by{' '}
      <a href="https://sketchfab.com/pootine" target="_blank" rel="noreferrer">Yinuo Chen</a>
      {' '}on Sketchfab
    </p>
  </div>
);

export default SketchfabCookingMachine;
