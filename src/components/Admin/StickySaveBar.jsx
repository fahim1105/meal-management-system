const StickySaveBar = ({ statusContent, button, mobile = false }) => {
  return (
    <div 
      className={`bg-base-200 border border-base-content/15 rounded-[18px] p-[12px_14px] flex gap-[14px] sticky z-10 ${
        mobile 
          ? 'bottom-[calc(88px+env(safe-area-inset-bottom,0px))] flex-col' 
          : 'bottom-[14px] flex-row items-center'
      }`}
      style={{ 
        boxShadow: '0 14px 34px -16px rgba(0,0,0,.5)'
      }}
    >
      {statusContent && (
        <div className="flex-1 min-w-0">
          {statusContent}
        </div>
      )}
      <div className={mobile ? 'w-full' : 'min-w-[200px]'}>
        {button}
      </div>
    </div>
  );
};

export default StickySaveBar;
