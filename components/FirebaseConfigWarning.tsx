import React from 'react';

const FirebaseConfigWarning: React.FC = () => {
    return (
        <div className="w-full max-w-lg mx-auto mb-6 bg-yellow-900/50 border border-yellow-700 text-yellow-200 px-4 py-3 rounded-lg text-left animate-fade-in" role="alert">
            <strong className="font-bold text-yellow-100">Action Required: Configure Firebase</strong>
            <p className="mt-2 text-sm">
                Your application is not connected to Firebase, which is needed for user sign-in and saving projects.
            </p>
            <p className="mt-2 text-sm font-semibold">Please follow these steps:</p>
            <ol className="list-decimal list-inside mt-2 text-sm space-y-1">
                <li>Go to your project settings in the <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="underline hover:text-white font-semibold">Firebase Console</a>.</li>
                <li>In the "General" tab, scroll down to "Your apps" and find your web app.</li>
                <li>Click the gear icon, and under "Firebase SDK snippet", select the "Config" option.</li>
                <li>Open the <code className="bg-gray-800 text-cyan-400 p-1 rounded text-xs">firebaseConfig.ts</code> file in your project's code.</li>
                <li>Copy the configuration object from Firebase and paste it to replace the placeholder values in the file.</li>
            </ol>
        </div>
    );
};

export default FirebaseConfigWarning;
