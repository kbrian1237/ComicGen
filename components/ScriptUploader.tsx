import React, { useState, useCallback } from 'react';
import { ArtStyle } from '../types';

interface ScriptUploaderProps {
  artStyles: ArtStyle[];
  onStart: (config: { script: string; style: ArtStyle; aspectRatio: '1:1' | '3:4' | '4:3'; }) => void;
  isLoading: boolean;
}

const ScriptUploader: React.FC<ScriptUploaderProps> = ({ artStyles, onStart, isLoading }) => {
  const [scriptText, setScriptText] = useState('');
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [selectedStyleId, setSelectedStyleId] = useState<string | null>(artStyles[0]?.id || null);
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '3:4' | '4:3'>('3:4');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const selectedFile = event.target.files[0];
      if (selectedFile.type === 'text/plain') {
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            setScriptText(text);
            setFileName(selectedFile.name);
            setError(null);
        };
        reader.readAsText(selectedFile);
      } else {
        setError('Please upload a valid .txt file.');
        setFileName('');
        setScriptText('');
      }
    }
  };

  const handleTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      setScriptText(event.target.value);
      if (fileName) {
          setFileName(''); // Clear file name if user types manually
      }
  }

  const handleSubmit = useCallback(() => {
    if (scriptText.trim() && selectedStyleId) {
      const selectedStyle = artStyles.find(s => s.id === selectedStyleId);
      if (!selectedStyle) {
        setError('Please select a valid art style.');
        return;
      }
      onStart({ script: scriptText.trim(), style: selectedStyle, aspectRatio });
    } else if (!selectedStyleId) {
      setError('Please select an art style.');
    } else {
      setError('Please provide a script by uploading a file or pasting it into the text box.');
    }
  }, [scriptText, onStart, selectedStyleId, artStyles, aspectRatio]);

  return (
    <div className="w-full max-w-4xl mx-auto text-center p-8 glass-card rounded-2xl">
      <h1 className="text-4xl font-black mb-2 text-cyan-400">Create Your Comic</h1>
      <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
        Customize the look and feel of your story, then upload or paste your script to bring it to life with AI.
      </p>

      <div className="space-y-8 text-left">
        {/* Step 1: Style Selection */}
        <div>
          <h2 className="text-2xl font-bold mb-4 text-white"><span className="text-cyan-400">1.</span> Choose Your Art Style</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {artStyles.map(style => (
              <div
                key={style.id}
                className={`style-card ${selectedStyleId === style.id ? 'selected' : ''}`}
                onClick={() => setSelectedStyleId(style.id)}
                title={style.name}
              >
                <img src={style.imageUrl} alt={style.name} className="w-full h-full object-cover" />
                <div className="overlay"></div>
                <h3>{style.name}</h3>
              </div>
            ))}
          </div>
        </div>

        {/* Step 2: Aspect Ratio */}
        <div>
          <h2 className="text-2xl font-bold mb-4 text-white"><span className="text-cyan-400">2.</span> Select Panel Shape</h2>
          <div className="flex gap-4">
            {(['3:4', '4:3', '1:1'] as const).map(ratio => (
              <div key={ratio}>
                <input
                  type="radio"
                  id={`ratio-${ratio}`}
                  name="aspectRatio"
                  value={ratio}
                  checked={aspectRatio === ratio}
                  onChange={(e) => setAspectRatio(e.target.value as '1:1' | '3:4' | '4:3')}
                  className="hidden radio-input"
                />
                <label htmlFor={`ratio-${ratio}`} className="radio-label">
                  {ratio === '3:4' && 'Portrait (3:4)'}
                  {ratio === '4:3' && 'Landscape (4:3)'}
                  {ratio === '1:1' && 'Square (1:1)'}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Step 3: Upload Script */}
        <div>
          <h2 className="text-2xl font-bold mb-4 text-white"><span className="text-cyan-400">3.</span> Provide Your Script</h2>
           <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-40 border-2 border-gray-600 border-dashed rounded-lg cursor-pointer bg-gray-700/50 hover:bg-gray-700 transition-colors">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <svg className="w-8 h-8 mb-4 text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2" /></svg>
              <p className="mb-2 text-sm text-gray-400">
                {fileName ? <span className="text-green-400 font-semibold">{fileName}</span> : <><span className="font-semibold">Click to upload</span> or drag and drop</>}
              </p>
              <p className="text-xs text-gray-500">Plain Text (.txt)</p>
            </div>
            <input id="dropzone-file" type="file" className="hidden" accept=".txt" onChange={handleFileChange} />
          </label>
          <div className="relative flex items-center my-6">
              <div className="flex-grow border-t border-gray-600"></div>
              <span className="flex-shrink mx-4 text-gray-400">OR</span>
              <div className="flex-grow border-t border-gray-600"></div>
            </div>
          <textarea
                value={scriptText}
                onChange={handleTextChange}
                placeholder="Paste your script here..."
                className="w-full p-3 h-48 bg-gray-700/50 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-gray-200"
            />
        </div>
      </div>
      
      {error && (
        <p className="mt-6 text-red-400 text-center">{error}</p>
      )}

      <button
        onClick={handleSubmit}
        disabled={!scriptText.trim() || !selectedStyleId || isLoading}
        className="mt-8 btn-primary"
      >
        {isLoading ? 'Starting...' : 'Generate My Comic'}
      </button>
    </div>
  );
};

export default ScriptUploader;