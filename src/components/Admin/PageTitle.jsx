const PageTitle = ({ icon: Icon, title, subtitle, badge }) => {
  return (
    <div className="flex items-start gap-[14px] mb-[18px] flex-wrap">
      <div className="flex items-center gap-[14px] flex-1 min-w-0">
        <div 
          className="w-[52px] h-[52px] rounded-[15px] flex items-center justify-center shrink-0"
          style={{ background: 'var(--ad-tile)' }}
        >
          <Icon className="text-[24px] text-base-content" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-[23px] lg:text-[28px] font-[800] text-base-content leading-tight tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[15px] text-base-content/70 mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {badge}
    </div>
  );
};

export default PageTitle;
