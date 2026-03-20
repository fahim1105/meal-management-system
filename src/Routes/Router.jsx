import { createBrowserRouter } from "react-router";
import Layout from '../components/Layout';
import Home from '../pages/Home';
import Login from '../pages/Login';
import Register from '../pages/Register';
import GroupSetup from '../pages/GroupSetup';
import Dashboard from '../pages/Dashboard';
import MyHistory from '../pages/MyHistory';
import ProtectedRoute from '../components/ProtectedRoute';

export const router = createBrowserRouter([
    {
        element: <Layout />,
        children: [
            { path: "/", element: <Home /> },
            { path: "/login", element: <Login /> },
            { path: "/register", element: <Register /> },
            {
                path: "/group-setup",
                element: <ProtectedRoute><GroupSetup /></ProtectedRoute>,
            },
            {
                path: "/dashboard",
                element: <ProtectedRoute requireGroup={true}><Dashboard /></ProtectedRoute>,
            },
            {
                path: "/my-history",
                element: <ProtectedRoute requireGroup={true}><MyHistory /></ProtectedRoute>,
            },
        ],
    },
]);
