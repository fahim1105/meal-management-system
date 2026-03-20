import toast from 'react-hot-toast';
import burgerImg from '../assets/Burger_For_Toast.png';

const bgColors = {
  success: '#22c55e',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
  default: '#E8A84C',
};

const B = 100; // burger size (width & height)
const C = 40;
const OVERLAP = 65; // how much burger overlaps into the green box

const BurgerToastContent = ({ message, type }) => {
  const bg = bgColors[type] || bgColors.default;

  return (
    <div style={{
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      height: B,
      // total width = burger_left_part + box
      // burger left part that sticks out = B - OVERLAP
    }}>

      {/* Green box — starts after the non-overlapping burger part */}
      <div style={{
        background: bg,
        borderRadius: C / 2,
        minHeight: C,
        height: 'auto',
        display: 'flex',
        alignItems: 'center',
        // left padding accounts for the burger overlap inside the box
        paddingLeft: OVERLAP + 10,
        paddingRight: 28,
        minWidth: 200,
        maxWidth: 320,
        marginLeft: B - OVERLAP,
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        boxSizing: 'border-box',
      }}>
        <span style={{
          color: '#fff',
          fontWeight: 700,
          fontSize: 14,
          lineHeight: 1.4,
          whiteSpace: 'normal',
          wordBreak: 'break-word',
        }}>
          {message}
        </span>
      </div>

      {/* Burger — absolutely on the left, vertically centered, overlaps box */}
      <img
        src={burgerImg}
        alt=""
        // className='h-xl w-xl'
        style={{
          width: B,
          height: B,
          objectFit: 'contain',
          position: 'absolute',
          left: 0,
          top: 0,
          zIndex: 2,
          filter: 'drop-shadow(1px 3px 5px rgba(0,0,0,0.2))',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
};

const burgerToast = {
  success: (msg) => toast.custom(<BurgerToastContent message={msg} type="success" />, { duration: 3000 }),
  error: (msg) => toast.custom(<BurgerToastContent message={msg} type="error" />, { duration: 4000 }),
  warning: (msg) => toast.custom(<BurgerToastContent message={msg} type="warning" />, { duration: 3500 }),
  info: (msg) => toast.custom(<BurgerToastContent message={msg} type="info" />, { duration: 3000 }),
  default: (msg) => toast.custom(<BurgerToastContent message={msg} type="default" />, { duration: 3000 }),
};

export default burgerToast;
