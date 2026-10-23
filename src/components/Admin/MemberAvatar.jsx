const MemberAvatar = ({ photoURL, name, isYou }) => {
  const initial = name ? name.charAt(0).toUpperCase() : '?';
  
  return (
    <div className="relative w-[42px] h-[42px] shrink-0">
      {photoURL ? (
        <img 
          src={photoURL} 
          alt={name} 
          className="w-full h-full rounded-full object-cover border-[1.5px]"
          style={{ borderColor: 'var(--ad-line)' }}
        />
      ) : (
        <div 
          className="w-full h-full rounded-full flex items-center justify-center font-[700] text-base-content border-[1.5px]"
          style={{ 
            background: 'var(--ad-tile)',
            borderColor: 'var(--ad-line)'
          }}
        >
          {initial}
        </div>
      )}
      {isYou && (
        <span 
          className="absolute -bottom-1 -right-1 text-[11px] font-[700] rounded-full px-2 py-0.5 whitespace-nowrap"
          style={{ 
            background: 'var(--color-neutral)',
            color: 'var(--ad-on-strong)'
          }}
        >
          You
        </span>
      )}
    </div>
  );
};

export default MemberAvatar;
