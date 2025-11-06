import React, { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CreateComicPage from './pages/CreateComicPage';
import Navbar from './components/Navbar';
import LoadingSpinner from './components/LoadingSpinner';

const App: React.FC = () => {
    const { user, loading } = useAuth();
    const [route, setRoute] = useState(window.location.hash);

    useEffect(() => {
        const handleHashChange = () => {
            setRoute(window.location.hash);
        };

        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    const renderContent = () => {
        if (loading) {
            return (
                <div className="flex items-center justify-center h-screen">
                    <LoadingSpinner className="w-16 h-16" />
                </div>
            );
        }

        if (!user) {
            return <LoginPage />;
        }
        
        // Logged-in user routes
        switch (route) {
            case '#/create':
                return <CreateComicPage />;
            case '#/dashboard':
            default:
                return <DashboardPage />;
        }
    };

    return (
        <div className="min-h-screen text-white flex flex-col selection:bg-cyan-500 selection:text-black">
            {user && !loading && <Navbar />}
            <main className="w-full flex-grow flex items-center justify-center p-4">
                {renderContent()}
            </main>
        </div>
    );
};

export default App;