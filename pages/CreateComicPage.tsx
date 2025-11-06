import React, { useState, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { AppState, Panel, PanelDescription, Character, Scene, ComicPage, ArtStyle, ProjectData } from '../types';
import { 
    parseScriptIntoPanels, 
    generateImageForPanel, 
    extractCharactersFromScript, 
    extractScenesFromScript, 
    layoutPanelsIntoPages,
    generateCoverImage,
    enhanceCharacterDescription,
    enhanceSceneDescription
} from '../services/geminiService';
import { saveProject } from '../services/firebaseService';
import ScriptUploader from '../components/ScriptUploader';
import ComicDisplay from '../components/ComicDisplay';
import LoadingSpinner from '../components/LoadingSpinner';
import ChatWidget from '../components/ChatWidget';

const ART_STYLES: ArtStyle[] = [
    { id: 'classic-american', name: 'Classic American', imageUrl: 'https://storage.googleapis.com/makerflow-prod.appspot.com/media/images/classic-american.webp', prompt: 'classic American comic book art style, bold inks, vibrant colors, dynamic action poses, reminiscent of the Silver Age of comics.' },
    { id: 'manga', name: 'Manga', imageUrl: 'https://storage.googleapis.com/makerflow-prod.appspot.com/media/images/manga.webp', prompt: 'Japanese manga style, black and white, detailed emotional expressions, dynamic panel layouts, screentones for shading, sharp lines.' },
    { id: 'film-noir', name: 'Film Noir', imageUrl: 'https://storage.googleapis.com/makerflow-prod.appspot.com/media/images/film-noir.webp', prompt: 'film noir comic style, high-contrast black and white, dramatic shadows, gritty textures, cinematic angles, mysterious atmosphere.' },
    { id: 'indie', name: 'Indie', imageUrl: 'https://storage.googleapis.com/makerflow-prod.appspot.com/media/images/indie.webp', prompt: 'indie comic art style, quirky character designs, unconventional color palettes, hand-drawn feel, expressive and simple lines.' },
    { id: 'sci-fi', name: 'Sci-Fi', imageUrl: 'https://storage.googleapis.com/makerflow-prod.appspot.com/media/images/sci-fi.webp', prompt: 'hard science fiction comic art, detailed technology, sleek futuristic designs, clean lines, cool color palette with neon highlights.' },
];

const CreateComicPage: React.FC = () => {
  const { user } = useAuth();
  const [appState, setAppState] = useState<AppState>(AppState.SETUP);
  const [panels, setPanels] = useState<Panel[]>([]);
  const [comicPages, setComicPages] = useState<ComicPage[]>([]);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // State for the generation process
  const [scriptContent, setScriptContent] = useState<string>('');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [panelDescriptions, setPanelDescriptions] = useState<PanelDescription[]>([]);
  const [generationConfig, setGenerationConfig] = useState<{style: ArtStyle; aspectRatio: '1:1' | '3:4' | '4:3';} | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 1, message: '' });
  const [enhancingIndex, setEnhancingIndex] = useState<number | null>(null);


  const handleReset = () => {
    // Instead of resetting state, navigate back to the dashboard
    window.location.hash = '#/dashboard';
  };

  const handleStartGeneration = useCallback(async (config: { script: string; style: ArtStyle; aspectRatio: '1:1' | '3:4' | '4:3'; }) => {
    setAppState(AppState.GENERATING);
    setError(null);
    setScriptContent(config.script);
    setGenerationConfig({ style: config.style, aspectRatio: config.aspectRatio });
    setPanels([]);
    setComicPages([]);
    setCoverImageUrl(null);
    setCharacters([]);
    setScenes([]);
    setPanelDescriptions([]);

    try {
      const totalInitialSteps = 3;
      setProgress({ current: 1, total: totalInitialSteps, message: 'Step 1: Analyzing script for characters...' });
      const extractedCharacters = await extractCharactersFromScript(config.script);
      setCharacters(extractedCharacters);

      setProgress({ current: 2, total: totalInitialSteps, message: 'Step 2: Defining scene styles...' });
      const extractedScenes = await extractScenesFromScript(config.script);
      setScenes(extractedScenes);

      setProgress({ current: 3, total: totalInitialSteps, message: 'Step 3: Breaking script into panels...' });
      const parsedPanels = await parseScriptIntoPanels(config.script);
      setPanelDescriptions(parsedPanels);

      if (parsedPanels.length === 0) {
        throw new Error("Could not extract any panels from the script. Please check the script format.");
      }

      setAppState(AppState.CHARACTER_REVIEW);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      console.error(err);
      setError(errorMessage);
      setAppState(AppState.SETUP);
    }
  }, []);

  const handleCharacterReviewConfirm = (editedCharacters: Character[]) => {
    setCharacters(editedCharacters);
    setAppState(AppState.SCENE_REVIEW);
  };
  
  const handleSceneReviewConfirm = async (editedScenes: Scene[]) => {
    setScenes(editedScenes);
    setAppState(AppState.GENERATING);
    setError(null);
    setPanels([]); // Reset panels for generation
    
    if (!generationConfig || panelDescriptions.length === 0 || !scriptContent) {
        setError("Generation configuration is missing. Please start over.");
        setAppState(AppState.SETUP);
        return;
    }

    try {
        const totalGenerationSteps = panelDescriptions.length + 2; // panels + cover + layout
        
        setProgress({ current: 1, total: totalGenerationSteps, message: 'Generating comic book cover...'});
        const scriptSummary = scriptContent.slice(0, 500);
        const coverUrl = await generateCoverImage(scriptSummary, generationConfig.style.prompt);
        setCoverImageUrl(coverUrl);

        const characterMap = new Map<string, string>(
            characters.map(char => [char.name.toLowerCase(), char.description])
        );
        const sceneMap = new Map<string, string>(
            editedScenes.map(scene => [scene.id.toLowerCase(), scene.description])
        );

        const generatedPanels: Panel[] = [];
        for (let i = 0; i < panelDescriptions.length; i++) {
            const panelDesc = panelDescriptions[i];
            setProgress({
                current: i + 2,
                total: totalGenerationSteps,
                message: `Generating image for panel ${i + 1} of ${panelDescriptions.length}...`
            });
            
            const characterDetails = panelDesc.characters
                .map(name => characterMap.get(name.toLowerCase()))
                .filter((d): d is string => !!d);
            
            const sceneDetails = sceneMap.get(panelDesc.sceneId.toLowerCase()) || '';
            const shotType = panelDesc.shotType || 'medium shot';

            const imageUrl = await generateImageForPanel(panelDesc.description, characterDetails, sceneDetails, generationConfig.style.prompt, generationConfig.aspectRatio, shotType);
            const newPanel: Panel = { description: panelDesc.description, imageUrl };
            generatedPanels.push(newPanel);
            setPanels([...generatedPanels]);

            // Add a delay to avoid hitting API rate limits
            if (i < panelDescriptions.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1200));
            }
        }
        
        setProgress({ 
            current: totalGenerationSteps, 
            total: totalGenerationSteps, 
            message: 'Arranging panels into comic book pages...' 
        });
        const panelDescriptionsForLayout = panelDescriptions.map(p => p.description);
        const pageLayouts = await layoutPanelsIntoPages(panelDescriptionsForLayout);

        const finalPages: ComicPage[] = pageLayouts.map(pageLayout => ({
            layout: pageLayout.layout,
            panels: pageLayout.panel_indices.map(panelIndex => generatedPanels[panelIndex]).filter(Boolean)
        }));

        setComicPages(finalPages);
        setAppState(AppState.DISPLAY);

    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        console.error(err);
        if (errorMessage.includes('429') || errorMessage.toLowerCase().includes('resource_exhausted')) {
             setError('Image generation failed due to API rate limits. This can happen with long scripts. Please wait a minute and try again.');
        } else {
            setError(errorMessage);
        }
        setAppState(AppState.SETUP);
    }
  };
  
  const handleCharacterDescriptionChange = (index: number, newDescription: string) => {
    setCharacters(prev => {
        const updated = [...prev];
        updated[index].description = newDescription;
        return updated;
    });
  };

  const handleSceneDescriptionChange = (index: number, newDescription: string) => {
    setScenes(prev => {
        const updated = [...prev];
        updated[index].description = newDescription;
        return updated;
    });
  };

  const handleEnhanceCharacter = async (index: number) => {
    setEnhancingIndex(index);
    try {
        const characterToEnhance = characters[index];
        const enhancedDesc = await enhanceCharacterDescription(characterToEnhance);
        setCharacters(prev => {
            const updated = [...prev];
            updated[index].description = enhancedDesc;
            return updated;
        });
    } catch (err) {
        console.error(err);
        setError(`Failed to enhance description for ${characters[index].name}.`);
    } finally {
        setEnhancingIndex(null);
    }
  };

  const handleEnhanceScene = async (index: number) => {
    setEnhancingIndex(index);
    try {
        const sceneToEnhance = scenes[index];
        const enhancedDesc = await enhanceSceneDescription(sceneToEnhance);
        setScenes(prev => {
            const updated = [...prev];
            updated[index].description = enhancedDesc;
            return updated;
        });
    } catch (err) {
        console.error(err);
        setError(`Failed to enhance description for ${scenes[index].id}.`);
    } finally {
        setEnhancingIndex(null);
    }
  };

  const handleSaveProject = async (title: string) => {
    if (!user || !generationConfig) {
      throw new Error("User or generation config not available.");
    }

    const projectData: ProjectData = {
      title,
      script: scriptContent,
      artStyle: generationConfig.style,
      aspectRatio: generationConfig.aspectRatio,
      characters,
      scenes,
      comicPages,
      coverImageUrl,
    };

    await saveProject(user.uid, projectData);
  };

  const renderContent = () => {
    switch (appState) {
      case AppState.SETUP:
        return (
          <div className="w-full">
            {error && (
              <div className="max-w-4xl mx-auto mb-4 bg-red-800/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-center" role="alert">
                <strong className="font-bold">Error: </strong>
                <span className="block sm:inline">{error}</span>
              </div>
            )}
            <ScriptUploader
              onStart={handleStartGeneration}
              // Fix: The comparison `appState === AppState.GENERATING` is always false
              // inside the `case AppState.SETUP` block due to TypeScript's type narrowing.
              // The whole view changes to a loading state when generation starts, so the
              // button's loading state isn't strictly necessary. Setting to `false` resolves the error.
              isLoading={false}
              artStyles={ART_STYLES}
            />
          </div>
        );
      case AppState.CHARACTER_REVIEW:
        return (
            <div className="w-full max-w-4xl mx-auto p-8 glass-card rounded-2xl animate-fade-in">
                <h1 className="text-4xl font-black mb-2 text-cyan-400">Review Characters</h1>
                <p className="text-gray-400 mb-8">
                    Edit character descriptions to refine their appearance. For best results, click "Enhance for Consistency" to create a detailed visual guide for the AI.
                </p>
                {generationConfig && (
                    <div className="mb-8 p-4 bg-slate-800/60 rounded-lg border border-slate-700 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        <div className="flex items-center gap-4">
                            <img src={generationConfig.style.imageUrl} alt={generationConfig.style.name} className="w-20 aspect-[4/3] rounded-md object-cover flex-shrink-0" />
                            <div>
                                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Art Style</h3>
                                <p className="text-lg font-bold text-white">{generationConfig.style.name}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                             <div className="w-20 h-full flex-shrink-0 flex items-center justify-center bg-slate-700/50 rounded-md text-cyan-400 font-black text-2xl aspect-[4/3]">
                                {generationConfig.aspectRatio}
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Panel Shape</h3>
                                <p className="text-lg font-bold text-white">
                                    {generationConfig.aspectRatio === '3:4' && 'Portrait'}
                                    {generationConfig.aspectRatio === '4:3' && 'Landscape'}
                                    {generationConfig.aspectRatio === '1:1' && 'Square'}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
                <div className="space-y-6 max-h-[40vh] overflow-y-auto pr-4">
                    {characters.map((char, index) => (
                        <div key={index}>
                            <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
                                <label htmlFor={`char-desc-${index}`} className="block text-lg font-bold text-white">{char.name}</label>
                                <button 
                                    onClick={() => handleEnhanceCharacter(index)}
                                    disabled={enhancingIndex === index}
                                    className="px-3 py-1 text-sm font-semibold text-cyan-300 bg-gray-700 rounded-md hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-wait transition-colors flex items-center gap-2"
                                >
                                    {enhancingIndex === index ? <LoadingSpinner className="w-4 h-4" /> : '✨'}
                                    {enhancingIndex === index ? 'Enhancing...' : 'Enhance for Consistency'}
                                </button>
                            </div>
                            <textarea
                                id={`char-desc-${index}`}
                                value={char.description}
                                onChange={(e) => handleCharacterDescriptionChange(index, e.target.value)}
                                className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-gray-200"
                                rows={4}
                            />
                        </div>
                    ))}
                </div>
                 <button onClick={() => handleCharacterReviewConfirm(characters)} className="mt-8 btn-primary">
                    Confirm Characters & Review Scenes
                </button>
            </div>
        );
    case AppState.SCENE_REVIEW:
        return (
            <div className="w-full max-w-4xl mx-auto p-8 glass-card rounded-2xl animate-fade-in">
                <h1 className="text-4xl font-black mb-2 text-cyan-400">Review Scenes</h1>
                <p className="text-gray-400 mb-8">
                    Review the scenes to ensure a consistent background and mood. Use "Enhance for Consistency" to add rich detail to the environments.
                </p>
                {generationConfig && (
                     <div className="mb-8 p-4 bg-slate-800/60 rounded-lg border border-slate-700 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        <div className="flex items-center gap-4">
                            <img src={generationConfig.style.imageUrl} alt={generationConfig.style.name} className="w-20 aspect-[4/3] rounded-md object-cover flex-shrink-0" />
                            <div>
                                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Art Style</h3>
                                <p className="text-lg font-bold text-white">{generationConfig.style.name}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                             <div className="w-20 h-full flex-shrink-0 flex items-center justify-center bg-slate-700/50 rounded-md text-cyan-400 font-black text-2xl aspect-[4/3]">
                                {generationConfig.aspectRatio}
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Panel Shape</h3>
                                <p className="text-lg font-bold text-white">
                                    {generationConfig.aspectRatio === '3:4' && 'Portrait'}
                                    {generationConfig.aspectRatio === '4:3' && 'Landscape'}
                                    {generationConfig.aspectRatio === '1:1' && 'Square'}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
                <div className="space-y-6 max-h-[40vh] overflow-y-auto pr-4">
                    {scenes.map((scene, index) => (
                        <div key={index}>
                             <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
                                <label htmlFor={`scene-desc-${index}`} className="block text-lg font-bold mb-2 text-white">{scene.id}</label>
                                <button 
                                    onClick={() => handleEnhanceScene(index)}
                                    disabled={enhancingIndex === index}
                                    className="px-3 py-1 text-sm font-semibold text-cyan-300 bg-gray-700 rounded-md hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-wait transition-colors flex items-center gap-2"
                                >
                                    {enhancingIndex === index ? <LoadingSpinner className="w-4 h-4" /> : '✨'}
                                    {enhancingIndex === index ? 'Enhancing...' : 'Enhance for Consistency'}
                                </button>
                            </div>
                            <textarea
                                id={`scene-desc-${index}`}
                                value={scene.description}
                                onChange={(e) => handleSceneDescriptionChange(index, e.target.value)}
                                className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-gray-200"
                                rows={4}
                            />
                        </div>
                    ))}
                </div>
                 <button onClick={() => handleSceneReviewConfirm(scenes)} className="mt-8 btn-primary">
                    Confirm & Generate Comic
                </button>
            </div>
        );
      case AppState.GENERATING:
        const progressPercentage = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;
        return (
          <div className="flex flex-col items-center justify-center text-center w-full max-w-6xl">
            <LoadingSpinner className="w-16 h-16 mb-6" />
            <h2 className="text-3xl font-bold text-cyan-400 mb-2">Creating Your Masterpiece...</h2>
            <p className="text-gray-300 mb-6">{progress.message}</p>
            
            <div className="w-full bg-gray-700 rounded-full h-2.5 mb-8">
                <div className="bg-cyan-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progressPercentage}%` }}></div>
            </div>

            {panels.length > 0 && (
                <div className="w-full">
                    <h3 className="text-xl font-semibold mb-4">Generated Panels:</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {panels.map((panel, index) => (
                            <div key={index} className="aspect-[3/4] bg-gray-800 border border-gray-700 rounded-lg overflow-hidden animate-fade-in">
                                 <img src={panel.imageUrl} alt={`Panel preview ${index + 1}`} className="w-full h-full object-cover" />
                            </div>
                        ))}
                         {Array.from({ length: Math.max(0, panelDescriptions.length - panels.length) }).map((_, index) => (
                            <div key={`placeholder-${index}`} className="aspect-[3/4] bg-gray-800 border-2 border-dashed border-gray-700 rounded-lg flex items-center justify-center">
                                <LoadingSpinner className="w-6 h-6 text-gray-600" />
                            </div>
                        ))}
                    </div>
                </div>
            )}
          </div>
        );
      case AppState.DISPLAY:
        return <ComicDisplay pages={comicPages} coverImageUrl={coverImageUrl} onReset={handleReset} onSave={handleSaveProject} />;
      default:
        return null;
    }
  };

  return (
    <div className="w-full flex flex-col items-center justify-center">
        {renderContent()}
        <ChatWidget />
    </div>
  );
};

export default CreateComicPage;