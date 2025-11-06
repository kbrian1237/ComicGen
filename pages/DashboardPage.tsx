import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getUserProjects, deleteProject } from '../services/firebaseService';
import { Project } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import ComicDisplay from '../components/ComicDisplay';
import TrashIcon from '../components/icons/TrashIcon';
import CloseIcon from '../components/icons/CloseIcon';

const DashboardPage: React.FC = () => {
    const { user } = useAuth();
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);

    const fetchProjects = async () => {
        if (!user) return;
        try {
            setIsLoading(true);
            const userProjects = await getUserProjects(user.uid);
            setProjects(userProjects);
        } catch (error) {
            console.error("Failed to fetch projects", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchProjects();
    }, [user]);

    const handleDelete = async (e: React.MouseEvent, projectId: string) => {
        e.stopPropagation(); // Prevent modal from opening
        if (window.confirm("Are you sure you want to delete this comic project permanently?")) {
            try {
                await deleteProject(projectId);
                setProjects(projects.filter(p => p.id !== projectId));
            } catch (error) {
                console.error("Failed to delete project", error);
                alert("Sorry, there was an error deleting the project.");
            }
        }
    };

    const renderProjects = () => {
        if (isLoading) {
            return (
                <div className="flex justify-center items-center h-40">
                    <LoadingSpinner className="w-12 h-12" />
                </div>
            );
        }

        if (projects.length === 0) {
            return (
                <div className="text-center col-span-full py-10">
                    <p className="text-gray-400">You haven't saved any comics yet. <a href="#/create" className="text-cyan-400 font-semibold hover:underline">Create one!</a></p>
                </div>
            );
        }

        return projects.map(project => (
            <div 
                key={project.id} 
                className="glass-card rounded-2xl text-left overflow-hidden cursor-pointer group relative transition-all duration-300 transform hover:-translate-y-1 hover:shadow-cyan-500/20 hover:shadow-2xl"
                onClick={() => setSelectedProject(project)}
            >
                <img src={project.coverImageUrl || ''} alt={`${project.title} cover`} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent"></div>
                <div className="relative p-6 flex flex-col justify-end h-full aspect-[3/4]">
                     <h3 className="text-2xl font-bold text-white mb-1">{project.title}</h3>
                     <p className="text-sm text-gray-400">{new Date(project.createdAt.seconds * 1000).toLocaleDateString()}</p>
                </div>
                <button 
                    onClick={(e) => handleDelete(e, project.id)}
                    className="absolute top-3 right-3 p-2 bg-black/50 rounded-full text-gray-300 hover:bg-red-600 hover:text-white transition-all duration-300 opacity-0 group-hover:opacity-100"
                    title="Delete Project"
                >
                    <TrashIcon className="w-5 h-5" />
                </button>
            </div>
        ));
    };

    return (
        <>
            <div className="w-full max-w-6xl mx-auto p-4 md:p-8 animate-fade-in">
                <div className="text-center">
                    <h1 className="text-4xl md:text-5xl font-black text-white">
                        Welcome back, <span className="text-cyan-400">{user?.displayName}!</span>
                    </h1>
                    <p className="text-gray-400 mt-4 mb-10 text-xl">Ready to create your next masterpiece?</p>
                </div>

                <a href="#/create" className="block glass-card rounded-2xl p-8 mb-12 text-left hover:border-cyan-400/50 transition-all duration-300 transform hover:-translate-y-1">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <h2 className="text-3xl font-bold text-cyan-400 mb-2">Create New Comic</h2>
                            <p className="text-gray-400">Start with a fresh script and bring a new story to life.</p>
                        </div>
                        <div className="text-lg font-bold text-white bg-cyan-600 rounded-lg text-center py-3 px-8 hover:bg-cyan-700 transition-colors flex-shrink-0">
                            Get Started
                        </div>
                    </div>
                </a>

                <div>
                    <h2 className="text-3xl font-bold text-white mb-6 text-center md:text-left">My Projects</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                        {renderProjects()}
                    </div>
                </div>

                 <footer className="w-full text-center p-4 mt-12 text-gray-500 text-sm">
                    <p>Powered by Google Gemini</p>
                </footer>
            </div>

            {selectedProject && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-slate-900 rounded-2xl w-full h-full max-w-7xl overflow-y-auto">
                        <ComicDisplay 
                            pages={selectedProject.comicPages}
                            coverImageUrl={selectedProject.coverImageUrl}
                            onReset={() => setSelectedProject(null)}
                            onSave={async () => { alert("This project is already saved."); }}
                        />
                    </div>
                    <button 
                        onClick={() => setSelectedProject(null)}
                        className="fixed top-4 right-4 p-2 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors z-50"
                    >
                        <CloseIcon className="w-8 h-8"/>
                    </button>
                </div>
            )}
        </>
    );
};

export default DashboardPage;