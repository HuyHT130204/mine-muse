'use client';

import React, { useState, useEffect } from 'react';
import { ContentPackage, ContentTopic, OnChainData } from '@/lib/types';

interface RealTimeGeneratorProps {
  onComplete: (contentPackages: ContentPackage[]) => void;
}

const RealTimeGenerator: React.FC<RealTimeGeneratorProps> = ({ onComplete }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentTopic, setCurrentTopic] = useState<ContentTopic | null>(null);
  const [currentContent, setCurrentContent] = useState('');
  const [generatedPackages, setGeneratedPackages] = useState<ContentPackage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const startRealTimeGeneration = async () => {
    setIsGenerating(true);
    setCurrentTopic(null);
    setCurrentContent('');
    setGeneratedPackages([]);
    setError(null);
    setProgress({ current: 0, total: 0 });

    try {
      const response = await fetch('/api/generate-realtime', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok || !response.body) {
        throw new Error('Failed to start real-time generation');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          console.log('Real-time generation completed');
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data:')) {
            try {
              const data = JSON.parse(line.substring(5).trim());
              
              if (data.type === 'topic_start') {
                setCurrentTopic({
                  id: data.data.topicId,
                  title: data.data.topicTitle,
                  description: '',
                  onChainData: {} as OnChainData,
                  keywords: [],
                  difficulty: 'intermediate',
                  category: 'technical'
                });
                setCurrentContent('');
                setProgress(prev => ({ ...prev, total: data.data.topicIndex + 1 }));
              } else if (data.type === 'content_chunk') {
                if (currentTopic && data.data.topicId === currentTopic.id) {
                  setCurrentContent(data.data.fullContent);
                }
              } else if (data.type === 'topic_complete') {
                setGeneratedPackages(prev => [...prev, data.data.contentPackage]);
                setProgress(prev => ({ ...prev, current: prev.current + 1 }));
                setCurrentTopic(null);
                setCurrentContent('');
              } else if (data.type === 'complete') {
                onComplete(data.data.contentPackages);
                setIsGenerating(false);
              } else if (data.type === 'error') {
                setError(data.data.error);
                setIsGenerating(false);
              }
            } catch (parseError) {
              console.error('Error parsing SSE data:', parseError);
            }
          }
        }
      }
    } catch (err) {
      console.error('Real-time generation error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Real-time Content Generation</h2>
      
      <button
        onClick={startRealTimeGeneration}
        disabled={isGenerating}
        className="w-full px-6 py-3 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-green-300 rounded-lg transition-colors mb-4"
      >
        {isGenerating ? 'Generating Content...' : 'Start Real-time Generation'}
      </button>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {isGenerating && (
        <div className="space-y-4">
          {/* Progress Bar */}
          {progress.total > 0 && (
            <div className="bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              ></div>
            </div>
          )}

          {/* Current Topic */}
          {currentTopic && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-2">
                Generating: {currentTopic.title}
              </h3>
              <div className="text-gray-700 whitespace-pre-wrap min-h-[150px] max-h-[300px] overflow-y-auto">
                {currentContent}
              </div>
            </div>
          )}

          {/* Generated Packages Count */}
          {generatedPackages.length > 0 && (
            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
              ✅ Generated {generatedPackages.length} content packages
            </div>
          )}
        </div>
      )}

      {!isGenerating && generatedPackages.length > 0 && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
          ✅ All content generated successfully! {generatedPackages.length} packages ready.
        </div>
      )}
    </div>
  );
};

export default RealTimeGenerator;


