import React from 'react';

const UnauthorizedDomainWarning: React.FC = () => {
    return (
        <div className="w-full max-w-lg mx-auto mb-6 bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg text-left animate-fade-in" role="alert">
            <strong className="font-bold text-red-100">Action Required: Authorize Domain</strong>
            <p className="mt-2 text-sm">
                Sign-in failed because this application's domain is not authorized by Firebase.
            </p>
            <p className="mt-2 text-sm font-semibold">Please follow these steps:</p>
            <ol className="list-decimal list-inside mt-2 text-sm space-y-1">
                <li>Go to your project in the <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="underline hover:text-white font-semibold">Firebase Console</a>.</li>
                <li>From the side menu, go to <code className="bg-gray-800 text-cyan-400 p-1 rounded text-xs">Authentication</code>.</li>
                <li>Select the <code className="bg-gray-800 text-cyan-400 p-1 rounded text-xs">Sign-in method</code> tab.</li>
                <li>Scroll down to the <code className="bg-gray-800 text-cyan-400 p-1 rounded text-xs">Authorized domains</code> section.</li>
                <li>Click <code className="bg-gray-800 text-cyan-400 p-1 rounded text-xs">Add domain</code> and enter the domain you are using for this app (e.g., <code className="bg-gray-800 text-cyan-400 p-1 rounded text-xs">localhost</code> for local development).</li>
            </ol>
        </div>
    );
};

export default UnauthorizedDomainWarning;
