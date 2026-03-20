import { Outlet } from 'react-router';
import Navbar from './Navbar';

const Layout = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-base-200 via-base-100 to-base-200">
      <Navbar />
      <div className="pb-24 lg:pb-0">
        <Outlet />
      </div>
    </div>
  );
};

export default Layout;
