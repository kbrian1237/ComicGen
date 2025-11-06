import React, { useState } from 'react';
import * as jspdf from 'jspdf';
import { ComicPage } from '../types';
import DownloadIcon from './icons/DownloadIcon';
import LoadingSpinner from './LoadingSpinner';

interface ComicDisplayProps {
  pages: ComicPage[];
  coverImageUrl: string | null;
  onReset: () => void;
  onSave: (title: string) => Promise<void>;
}

const renderLayout = (page: ComicPage) => {
    const { layout, panels } = page;

    if (!panels || panels.length === 0) {
        return <div className="flex items-center justify-center h-full text-gray-500">Empty Page</div>;
    }

    const panelElements = panels.map((panel, idx) => (
        <div key={idx} className="bg-gray-900 rounded-md overflow-hidden">
            <img 
                src={panel.imageUrl} 
                alt={panel.description} 
                className="w-full h-full object-cover" 
                title={panel.description}
            />
        </div>
    ));

    switch (layout) {
        case '2x1':
            return <div className="grid grid-cols-2 gap-2 h-full">{panelElements}</div>;
        case '1x2':
            return <div className="grid grid-rows-2 gap-2 h-full">{panelElements}</div>;
        case '2x2':
            return <div className="grid grid-cols-2 grid-rows-2 gap-2 h-full">{panelElements}</div>;
        case '3_strip_vertical':
            return <div className="grid grid-rows-3 gap-2 h-full">{panelElements}</div>;
        case '2_over_1':
            return (
                <div className="grid grid-cols-2 grid-rows-2 gap-2 h-full">
                    <div className="col-span-1 row-span-1">{panelElements[0]}</div>
                    <div className="col-span-1 row-span-1">{panelElements[1]}</div>
                    <div className="col-span-2 row-span-1">{panelElements[2]}</div>
                </div>
            );
        case '1_over_2':
            return (
                <div className="grid grid-cols-2 grid-rows-2 gap-2 h-full">
                    <div className="col-span-2 row-span-1">{panelElements[0]}</div>
                    <div className="col-span-1 row-span-1">{panelElements[1]}</div>
                    <div className="col-span-1 row-span-1">{panelElements[2]}</div>
                </div>
            );
        default:
            // Fallback for any unexpected layout or single panel pages
            if (panelElements.length === 1) {
                return <div className="h-full">{panelElements}</div>
            }
            return <div className="grid grid-cols-2 gap-2 h-full">{panelElements}</div>;
    }
}

const ComicDisplay: React.FC<ComicDisplayProps> = ({ pages, coverImageUrl, onReset, onSave }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = async () => {
    if (isSaved) return;
    const title = prompt("Please enter a title for your comic:");
    if (title && title.trim()) {
      setIsSaving(true);
      try {
        await onSave(title.trim());
        setIsSaved(true);
      } catch (error) {
        console.error("Failed to save project:", error);
        alert("Sorry, there was an error saving your project. Please try again.");
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleDownloadPdf = async () => {
    const { jsPDF } = jspdf;
    const doc = new jsPDF('p', 'pt', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const gutter = 10;
    const availableWidth = pageWidth - (margin * 2);
    const availableHeight = pageHeight - (margin * 2);
    
    // Add Cover
    if (coverImageUrl) {
        doc.addImage(coverImageUrl, 'PNG', margin, margin, availableWidth, availableHeight);
    }

    for (const page of pages) {
        doc.addPage();
        
        const { layout, panels } = page;
        if (!panels || panels.length === 0) continue;

        // Simple layout logic for PDF. More complex logic can be added.
        switch (layout) {
            case '1x2':
                const h1x2 = (availableHeight - gutter) / 2;
                doc.addImage(panels[0].imageUrl, 'PNG', margin, margin, availableWidth, h1x2);
                if (panels[1]) doc.addImage(panels[1].imageUrl, 'PNG', margin, margin + h1x2 + gutter, availableWidth, h1x2);
                break;
            case '2x1':
                const w2x1 = (availableWidth - gutter) / 2;
                doc.addImage(panels[0].imageUrl, 'PNG', margin, margin, w2x1, availableHeight);
                if (panels[1]) doc.addImage(panels[1].imageUrl, 'PNG', margin + w2x1 + gutter, margin, w2x1, availableHeight);
                break;
            case '2x2':
                 const w2x2 = (availableWidth - gutter) / 2;
                 const h2x2 = (availableHeight - gutter) / 2;
                 doc.addImage(panels[0].imageUrl, 'PNG', margin, margin, w2x2, h2x2);
                 if (panels[1]) doc.addImage(panels[1].imageUrl, 'PNG', margin + w2x2 + gutter, margin, w2x2, h2x2);
                 if (panels[2]) doc.addImage(panels[2].imageUrl, 'PNG', margin, margin + h2x2 + gutter, w2x2, h2x2);
                 if (panels[3]) doc.addImage(panels[3].imageUrl, 'PNG', margin + w2x2 + gutter, margin + h2x2 + gutter, w2x2, h2x2);
                break;
             case '2_over_1':
                const w2_over_1 = (availableWidth - gutter) / 2;
                const h2_over_1 = (availableHeight - gutter) / 2;
                doc.addImage(panels[0].imageUrl, 'PNG', margin, margin, w2_over_1, h2_over_1);
                if (panels[1]) doc.addImage(panels[1].imageUrl, 'PNG', margin + w2_over_1 + gutter, margin, w2_over_1, h2_over_1);
                if (panels[2]) doc.addImage(panels[2].imageUrl, 'PNG', margin, margin + h2_over_1 + gutter, availableWidth, h2_over_1);
                break;
            // Add more cases as needed, default to single image
            default:
                doc.addImage(panels[0].imageUrl, 'PNG', margin, margin, availableWidth, availableHeight);
                break;
        }
    }
    
    doc.save('comic-book.pdf');
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 animate-fade-in">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-extrabold text-cyan-400 mb-4">Your Comic is Ready!</h1>
        <p className="text-lg text-gray-300 max-w-3xl mx-auto">Review your comic book below. You can save the project to your dashboard or download it as a PDF.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
            <button
              onClick={onReset}
              className="px-8 py-3 text-lg font-semibold text-white bg-cyan-600 rounded-lg hover:bg-cyan-700 transition-all duration-300 transform hover:scale-105"
            >
              Create Another
            </button>
            <button
                onClick={handleSave}
                disabled={isSaving || isSaved}
                className="inline-flex items-center gap-2 px-8 py-3 text-lg font-semibold text-cyan-400 bg-gray-700/50 border border-cyan-800 rounded-lg hover:bg-gray-700 transition-all duration-300 transform hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
                {isSaving && <LoadingSpinner className="w-5 h-5" />}
                {isSaved ? 'Project Saved!' : isSaving ? 'Saving...' : 'Save Project'}
            </button>
             <button
                onClick={handleDownloadPdf}
                className="inline-flex items-center gap-2 px-8 py-3 text-lg font-semibold text-cyan-400 bg-gray-700/50 border border-cyan-800 rounded-lg hover:bg-gray-700 transition-all duration-300 transform hover:scale-105"
            >
                <DownloadIcon className="w-5 h-5" />
                Download as PDF
            </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
        {coverImageUrl && (
            <div className="lg:col-span-2 flex flex-col items-center">
                 <h2 className="text-2xl font-bold text-gray-400 mb-4 font-serif italic">Cover</h2>
                 <div className="w-full max-w-lg bg-black p-2 sm:p-4 shadow-2xl rounded-lg">
                    <img src={coverImageUrl} alt="Comic Book Cover" className="w-full h-auto rounded-md" />
                 </div>
            </div>
        )}

        {pages.map((page, index) => (
          <div key={index} className="flex flex-col items-center">
            <div className="w-full paper-texture p-2 sm:p-3 shadow-2xl rounded-lg aspect-[8.5/11]">
              <div className="w-full h-full border-2 border-gray-900/10 p-2">
                {renderLayout(page)}
              </div>
            </div>
            <p className="text-center text-gray-400 mt-3 font-serif font-bold text-lg">{index + 1}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ComicDisplay;