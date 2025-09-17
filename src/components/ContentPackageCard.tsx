'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ContentPackage } from '@/lib/types';
import { AutoFillManager } from '@/lib/auto-fill';
import React from 'react';

interface ContentPackageCardProps {
  contentPackage: ContentPackage;
  onViewDetails: (contentPackage: ContentPackage) => void;
  label?: 'Latest' | 'Previous';
  onToggleSave?: (pkg: ContentPackage) => void;
  isSaved?: boolean;
}

export default function ContentPackageCard({ contentPackage, onViewDetails, label, onToggleSave, isSaved }: ContentPackageCardProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const platforms = ['twitter', 'linkedin', 'instagram', 'facebook'];
  
  const currentPlatform = platforms[currentSlide];
  const currentContent = contentPackage.platforms.find(p => p.platform === currentPlatform);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % platforms.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + platforms.length) % platforms.length);
  };

  const handleAutoFill = async (platform: string, content: string) => {
    const hashtags = currentContent?.hashtags || [];
    const options = { content, hashtags };

    switch (platform.toLowerCase()) {
      case 'twitter':
        AutoFillManager.openTwitterWithContent(options);
        break;
      case 'linkedin':
        AutoFillManager.openLinkedInWithContent(options);
        break;
      case 'facebook':
        try {
          AutoFillManager.openFacebookWithContent(options);
        } catch {
          // Fallback to clipboard if Facebook sharing fails
          AutoFillManager.copyToClipboardForFacebook(options).then(result => {
            alert(result.message);
          });
        }
        break;
      case 'instagram':
        const result = await AutoFillManager.copyToClipboardForInstagram(options);
        alert(result.message);
        break;
    }
  };


  const formatDate = (dateString: string) => {
    const iso = /Z$/.test(dateString) ? dateString : `${dateString}Z`;
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPlatformIcon = (platform: string) => {
    const size = 14;
    switch (platform) {
      case 'twitter':
        return <Image src="/X.png" alt="X" width={size} height={size} />;
      case 'linkedin':
        return <Image src="/LinkedIn.png" alt="LinkedIn" width={size} height={size} />;
      case 'facebook':
        return <Image src="/facebook.png" alt="Facebook" width={size} height={size} />;
      case 'instagram':
        return <Image src="/Instagram.png" alt="Instagram" width={size} height={size} />;
      default:
        return <span className="text-[10px] font-semibold">{platform.charAt(0).toUpperCase()}</span>;
    }
  };

  const getPlatformImageSrc = (platform: string): string | null => {
    switch (platform) {
      case 'twitter':
        return '/X.png';
      case 'linkedin':
        return '/LinkedIn.png';
      case 'facebook':
        return '/facebook.png';
      case 'instagram':
        return '/Instagram.png';
      default:
        return null;
    }
  };

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'twitter': return 'bg-gray-900 text-white';
      case 'linkedin': return 'bg-blue-600 text-white';
      case 'instagram': return 'bg-gradient-to-r from-purple-500 to-pink-500 text-white';
      case 'facebook': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  // decorative meteor styles now set inline where used

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden mm-card">
      {/* Header */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-gray-900 font-semibold text-sm">Mine‑Muse</span>
            <div>
              <p className="text-gray-500 text-xs">{formatDate(contentPackage.createdAt)}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {label && (
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${label === 'Latest' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                {label}
              </span>
            )}
            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
              {contentPackage.status}
            </span>
            {/* Bookmark moved here */}
            <button
              onClick={() => onToggleSave && onToggleSave(contentPackage)}
              aria-label={isSaved ? 'Unsave' : 'Save'}
              className={`mm-bookmark ${isSaved ? 'mm-bookmark--active' : ''}`}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </button>
            <button
              onClick={() => onViewDetails(contentPackage)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="relative">
        {/* Platform Navigation */}
        <div className="flex items-center justify-between p-4">
          <div className="flex space-x-1">
            {platforms.map((platform, index) => (
              <button
                key={platform}
                onClick={() => setCurrentSlide(index)}
                aria-label={platform}
                className={`h-8 w-8 rounded-md flex items-center justify-center transition-all mm-focus ${
                  currentSlide === index
                    ? 'bg-gray-900 text-white shadow-sm'
                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                {getPlatformIcon(platform)}
              </button>
            ))}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={prevSlide}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-xs text-gray-500">
              {currentSlide + 1} / {platforms.length}
            </span>
            <button
              onClick={nextSlide}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content Display */}
        <div className="p-6 min-h-[320px]">
          {currentContent ? (
            <div className="space-y-4 animate-[mm-fade-in_var(--duration-base)_var(--ease-standard)]">
              {/* Platform Header */}
              <div className="flex items-center space-x-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${getPlatformColor(currentPlatform)}`}>
                  {getPlatformIcon(currentPlatform)}
                </div>
                <span className="font-semibold text-gray-900 capitalize">{currentPlatform}</span>
                <span className="text-gray-500 text-sm">
                  {currentContent.characterCount} characters
                </span>
              </div>

              {/* Content */}
              <div className="rounded-xl p-0">
                <div className="whitespace-pre-wrap text-gray-900 leading-relaxed min-h-[100px]">
                  {currentContent.content}
                </div>
              </div>

              {/* Hashtags */}
              {currentContent.hashtags && currentContent.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {currentContent.hashtags.map((hashtag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                    >
                      {hashtag}
                    </span>
                  ))}
                </div>
              )}

              {/* Auto-fill Button */}
              <div className="mt-4">
                <button
                  onClick={() => handleAutoFill(currentPlatform, currentContent.content)}
                  className={`w-full px-4 py-2 rounded-full text-white font-medium transition-all duration-200 ${AutoFillManager.getPlatformColor(currentPlatform)} hover:shadow-lg transform hover:scale-[1.02]`}
                >
                  <span className="flex items-center justify-center space-x-2">
                    {getPlatformImageSrc(currentPlatform) ? (
                      <Image src={getPlatformImageSrc(currentPlatform) as string} alt={currentPlatform} width={16} height={16} />
                    ) : (
                      <span className="text-xs font-semibold">{currentPlatform.toUpperCase()[0]}</span>
                    )}
                    <span>{AutoFillManager.getPlatformName(currentPlatform)}</span>
                  </span>
                </button>
              </div>

              {/* Metadata */}
              {currentContent.metadata && (
                <div className="text-xs text-gray-500 space-y-1 mt-4">
                  {currentContent.metadata.hook && (
                    <div>
                      <span className="font-medium">Hook:</span> {currentContent.metadata.hook}
                    </div>
                  )}
                  {currentContent.metadata.cta && (
                    <div>
                      <span className="font-medium">CTA:</span> {currentContent.metadata.cta}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              No content available for this platform
            </div>
          )}
        </div>
      </div>

      {/* Footer removed */}
    </div>
  );
}
