'use client';

import { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

export default function Home() {
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfText, setPdfText] = useState('');
  const [summary, setSummary] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [numPages, setNumPages] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [annotations, setAnnotations] = useState([]);
  const [isAnnotating, setIsAnnotating] = useState(false);
  const canvasRef = useRef(null);
  const [actions, setActions] = useState({
    summarize: false,
    quiz: false,
    annotate: false
  });

  useEffect(() => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/4.7.76/pdf.worker.min.mjs`;
  }, []);

  const handleDrop = async (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
      await renderPdf(file, 1);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const extractTextFromPdf = async (file) => {
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
      reader.onload = async (event) => {
        const typedarray = new Uint8Array(event.target.result);
        const pdf = await pdfjsLib.getDocument(typedarray).promise;
        let text = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          text += content.items.map(item => item.str).join(' ') + '\n';
        }
        resolve(text);
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const handleSummarize = async () => {
    if (!pdfFile) return;
    
    setIsLoading(true);
    setSummary('');
    
    try {
      const text = await extractTextFromPdf(pdfFile);
      setPdfText(text);
      
      const response = await fetch('/api/summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch summary');
      }
      
      const data = await response.json();
      setSummary(data.summary);
    } catch (error) {
      console.error('Error summarizing PDF:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnnotate = async () => {
    if (!pdfFile) return;
    
    setIsAnnotating(true);
    setAnnotations([]);
    
    try {
      const text = await extractTextFromPdf(pdfFile);
      
      const response = await fetch('/api/annotate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch annotations');
      }
      
      const data = await response.json();
      setAnnotations(data.annotations);
    } catch (error) {
      console.error('Error annotating PDF:', error);
    } finally {
      setIsAnnotating(false);
    }
  };

  const renderPdf = async (file, pageNumber) => {
    const fileReader = new FileReader();

    fileReader.onload = async function() {
      const typedarray = new Uint8Array(this.result);
      const loadingTask = pdfjsLib.getDocument(typedarray);
      const pdf = await loadingTask.promise;

      setNumPages(pdf.numPages);

      // Render the specified page
      const page = await pdf.getPage(pageNumber);
      const scale = 1.5;
      const viewport = page.getViewport({ scale });

      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };
      await page.render(renderContext);
    };

    fileReader.readAsArrayBuffer(file);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prevPage => prevPage - 1);
      renderPdf(pdfFile, currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < numPages) {
      setCurrentPage(prevPage => prevPage + 1);
      renderPdf(pdfFile, currentPage + 1);
    }
  };

  const handleActionChange = (action) => {
    setActions(prev => ({ ...prev, [action]: !prev[action] }));
  };

  const handleGenerate = async () => {
    if (actions.summarize) await handleSummarize();
    if (actions.annotate) await handleAnnotate();
    // Add quiz functionality when implemented
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-900 to-black overflow-auto">
      <div className="w-72 bg-black bg-opacity-50 p-6 shadow-lg backdrop-blur-md sticky top-0 h-screen overflow-auto">
        <h2 className="text-2xl font-semibold mb-6 text-purple-300">Actions</h2>
        {['summarize', 'quiz', 'annotate'].map((action) => (
          <div key={action} className="mb-4">
            <label className="flex items-center text-white cursor-pointer">
              <input
                type="checkbox"
                checked={actions[action]}
                onChange={() => handleActionChange(action)}
                className="form-checkbox h-5 w-5 text-purple-600 rounded focus:ring-purple-400"
              />
              <span className="ml-2 capitalize">{action}</span>
            </label>
          </div>
        ))}
        <button 
          onClick={handleGenerate}
          className="w-full bg-purple-600 text-white py-2 px-4 rounded-md transition duration-300 ease-in-out hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isLoading || isAnnotating}
        >
          Generate
        </button>
      </div>
      <div className="flex-1 flex flex-col p-8 overflow-auto">
        <h1 className="text-6xl font-bold mb-12 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">noot</h1>
        {!pdfFile ? (
          <div
            className="border-2 border-dashed border-gray-600 rounded-lg p-12 mb-8 w-full max-w-2xl mx-auto transition duration-300 ease-in-out hover:border-purple-500 cursor-pointer"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <p className="text-center text-gray-400">Drag and drop a PDF file here</p>
          </div>
        ) : (
          <div className="w-full max-w-6xl mx-auto mb-8 flex space-x-4">
            <div className="flex-1 flex flex-col bg-gray-800 rounded-lg shadow-xl overflow-hidden">
              <div className="h-[calc(100vh-16rem)] relative">
                <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full object-contain" />
              </div>
              {numPages && (
                <div className="flex justify-between items-center p-4 bg-gray-700">
                  <button 
                    onClick={handlePrevPage} 
                    disabled={currentPage === 1}
                    className="bg-purple-600 text-white py-2 px-4 rounded-md disabled:opacity-50 transition duration-300 ease-in-out hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50"
                  >
                    Previous
                  </button>
                  <p className="text-center text-gray-300">
                    Page {currentPage} of {numPages}
                  </p>
                  <button 
                    onClick={handleNextPage} 
                    disabled={currentPage === numPages}
                    className="bg-purple-600 text-white py-2 px-4 rounded-md disabled:opacity-50 transition duration-300 ease-in-out hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
            {annotations.length > 0 && (
              <div className="w-72 p-4 bg-gray-800 rounded-lg shadow-xl overflow-auto">
                <h3 className="text-xl font-semibold mb-4 text-purple-300">Annotations</h3>
                {annotations.map((annotation, index) => (
                  <div key={index} className="mb-4 p-3 bg-gray-700 rounded-lg">
                    <p className="text-sm text-gray-300">{annotation}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {isLoading && (
          <div className="mt-8 w-full max-w-5xl mx-auto">
            <p className="text-center text-gray-400">Processing PDF...</p>
          </div>
        )}
        {summary && (
          <div className="mt-8 w-full max-w-5xl mx-auto bg-gray-800 rounded-lg shadow-xl p-6">
            <h2 className="text-2xl font-semibold mb-4 text-purple-300">Summary</h2>
            <p className="text-gray-300">{summary}</p>
          </div>
        )}
      </div>
    </div>
  );
}
