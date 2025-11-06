import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

const Navbar: React.FC = () => {
    const { user, signOut } = useAuth();
    const [dropdownOpen, setDropdownOpen] = useState(false);

    if (!user) return null;

    return (
        <header className="w-full bg-slate-900/80 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-40">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center">
                        <a href="#/dashboard" className="text-2xl font-black text-cyan-400">
                           ComicGen
                        </a>
                        <nav className="hidden md:flex md:ml-10 md:space-x-8">
                            <a href="#/dashboard" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Dashboard</a>
                            <a href="#/create" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Create New</a>
                        </nav>
                    </div>
                    <div className="relative">
                        <button 
                            onClick={() => setDropdownOpen(!dropdownOpen)}
                            className="flex items-center space-x-2 p-1 rounded-full hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-cyan-500"
                        >
                            <span className="text-white text-sm font-medium hidden sm:block">{user.displayName}</span>
                            <img className="h-8 w-8 rounded-full" src={user.photoURL || undefined} alt="User avatar" />
                        </button>
                        {dropdownOpen && (
                            <div 
                                className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-slate-800 ring-1 ring-black ring-opacity-5 focus:outline-none"
                                onMouseLeave={() => setDropdownOpen(false)}
                            >
                                <a href="#/dashboard" className="block px-4 py-2 text-sm text-gray-300 hover:bg-slate-700">My Projects</a>
                                <button
                                    onClick={signOut}
                                    className="w-full text-left block px-4 py-2 text-sm text-gray-300 hover:bg-slate-700"
                                >
                                    Sign out
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Navbar;