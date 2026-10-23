import { createBrowserRouter } from "react-router";
import Layout from '../components/Layout';
import Home from '../pages/Home';
import Login from '../pages/Login';
import Register from '../pages/Register';
import GroupSetup from '../pages/GroupSetup';
import Meals from '../pages/Meals';
import Finance from '../pages/Finance';
import Bazar from '../pages/Bazar';
import MyHistory from '../pages/MyHistory';
import Profile from '../pages/Profile';
import Fine from '../pages/Fine';
import AdminMembers from '../pages/AdminMembers';
import AdminMeals from '../pages/AdminMeals';
import AdminCosts from '../pages/AdminCosts';
import AdminBazar from '../pages/AdminBazar';
import AdminFineRequests from '../pages/AdminFineRequests';
import AdminControl from '../pages/AdminControl';
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
                path: "/meals",
                element: <ProtectedRoute requireGroup={true}><Meals /></ProtectedRoute>,
            },
            {
                path: "/finance",
                element: <ProtectedRoute requireGroup={true}><Finance /></ProtectedRoute>,
            },
            {
                path: "/bazar",
                element: <ProtectedRoute requireGroup={true}><Bazar /></ProtectedRoute>,
            },
            {
                path: "/my-history",
                element: <ProtectedRoute requireGroup={true}><MyHistory /></ProtectedRoute>,
            },
            {
                path: "/profile",
                element: <ProtectedRoute requireGroup={true}><Profile /></ProtectedRoute>,
            },
            {
                path: "/fine",
                element: <ProtectedRoute requireGroup={true}><Fine /></ProtectedRoute>,
            },
            // Admin routes
            {
                path: "/admin/members",
                element: <ProtectedRoute requireGroup={true}><AdminMembers /></ProtectedRoute>,
            },
            {
                path: "/admin/meals",
                element: <ProtectedRoute requireGroup={true}><AdminMeals /></ProtectedRoute>,
            },
            {
                path: "/admin/costs",
                element: <ProtectedRoute requireGroup={true}><AdminCosts /></ProtectedRoute>,
            },
            {
                path: "/admin/bazar",
                element: <ProtectedRoute requireGroup={true}><AdminBazar /></ProtectedRoute>,
            },
            {
                path: "/admin/fine-requests",
                element: <ProtectedRoute requireGroup={true}><AdminFineRequests /></ProtectedRoute>,
            },
            {
                path: "/admin/control",
                element: <ProtectedRoute requireGroup={true}><AdminControl /></ProtectedRoute>,
            },
        ],
    },
]);
