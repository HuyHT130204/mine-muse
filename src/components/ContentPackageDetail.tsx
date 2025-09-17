'use client';

import { useState } from 'react';
import { ContentPackage } from '@/lib/types';
import Image from 'next/image';
import { AutoFillManager } from '@/lib/auto-fill';

interface ContentPackageDetailProps {
  contentPackage: ContentPackage;
  onClose: () => void;
}

export default function ContentPackageDetail({ contentPackage, onClose }: ContentPackageDetailProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const platforms = ['longform', 'twitter', 'linkedin', 'instagram', 'facebook'];
  
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
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPlatformIcon = (platform: string) => {
    const size = 16;
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
        return <span className="text-[11px] font-semibold">{platform.charAt(0).toUpperCase()}</span>;
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

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-[mm-fade-in_var(--duration-slow)_var(--ease-standard)]">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] overflow-hidden animate-[mm-slide-up_var(--duration-slow)_var(--ease-emphasized)]">
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{contentPackage.longForm.title}</h2>
              <p className="text-gray-500 text-sm mt-1">Created: {formatDate(contentPackage.createdAt)}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors mm-focus"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex h-[calc(92vh-120px)]">
          {/* Left Panel - Long Form Content */}
          <div className="w-1/2 p-6 border-r border-gray-100 overflow-y-auto">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Long Form Article</h3>
                <div className="bg-gray-50 rounded-xl p-5 mm-card">
                  <h4 className="font-semibold text-gray-900 mb-2">{contentPackage.longForm.title}</h4>
                  <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                    {contentPackage.longForm.body}
                  </div>
                </div>
              </div>

              {/* Key Insights */}
              {contentPackage.longForm.keyInsights && contentPackage.longForm.keyInsights.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Key Insights</h4>
                  <ul className="space-y-2">
                    {contentPackage.longForm.keyInsights.map((insight, index) => (
                      <li key={index} className="text-sm text-gray-700 bg-blue-50 p-3 rounded-lg">
                        {insight}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Takeaways */}
              {contentPackage.longForm.takeaways && contentPackage.longForm.takeaways.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Takeaways</h4>
                  <ul className="space-y-2">
                    {contentPackage.longForm.takeaways.map((takeaway, index) => (
                      <li key={index} className="text-sm text-gray-700 bg-green-50 p-3 rounded-lg">
                        {takeaway}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Metadata */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Content Metrics</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-gray-50 p-3 rounded-lg mm-card">
                    <span className="font-medium">Word Count:</span> {contentPackage.longForm.metadata.wordCount}
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg mm-card">
                    <span className="font-medium">Reading Time:</span> {contentPackage.longForm.metadata.readingTime} min
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg mm-card">
                    <span className="font-medium">Difficulty:</span> Grade {contentPackage.longForm.metadata.difficulty.toFixed(1)}
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg mm-card">
                    <span className="font-medium">Industry Terms:</span> {contentPackage.longForm.metadata.industryTerms}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Platform Content */}
          <div className="w-1/2 flex flex-col">
            {/* Platform Navigation */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex space-x-1.5">
                  {platforms.map((platform, index) => (
                    <button
                      key={platform}
                      onClick={() => setCurrentSlide(index)}
                      aria-label={platform}
                      className={`h-9 px-3 rounded-md text-sm font-medium transition-colors ${
                        currentSlide === index
                          ? 'bg-gray-900 text-white shadow-sm'
                          : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {getPlatformIcon(platform)} {platform.charAt(0).toUpperCase() + platform.slice(1)}
                    </button>
                  ))}
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={prevSlide}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <span className="text-sm text-gray-500">
                    {currentSlide + 1} / {platforms.length}
                  </span>
                  <button
                    onClick={nextSlide}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Platform Content */}
            <div className="flex-1 p-6 overflow-y-auto">
              {currentContent ? (
                <div className="space-y-4 animate-[mm-fade-in_var(--duration-base)_var(--ease-standard)]">
                  {/* Platform Header */}
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getPlatformColor(currentPlatform)}`}>
                      {getPlatformIcon(currentPlatform)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 capitalize">{currentPlatform}</h3>
                      <p className="text-gray-500 text-sm">{currentContent.characterCount} characters</p>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="bg-gray-50 rounded-xl p-5 mm-card">
                    <div className="whitespace-pre-wrap text-gray-900 leading-relaxed min-h-[200px]">
                      {currentContent.content}
                    </div>
                  </div>

                  {/* Hashtags */}
                  {currentContent.hashtags && currentContent.hashtags.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Hashtags</h4>
                      <div className="flex flex-wrap gap-2">
                        {currentContent.hashtags.map((hashtag, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full"
                          >
                            {hashtag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Auto-fill Button */}
                  <div className="mt-6">
                    <button
                      onClick={() => handleAutoFill(currentPlatform, currentContent.content)}
                      className={`w-full px-6 py-3 rounded-lg text-white font-medium transition-all duration-200 ${AutoFillManager.getPlatformColor(currentPlatform)} hover:shadow-lg transform hover:scale-105`}
                    >
                      <span className="flex items-center justify-center space-x-3">
                        {getPlatformImageSrc(currentPlatform) ? (
                          <Image src={getPlatformImageSrc(currentPlatform) as string} alt={currentPlatform} width={18} height={18} />
                        ) : (
                          <span className="text-sm font-semibold">{currentPlatform.toUpperCase()[0]}</span>
                        )}
                        <span className="text-lg">{AutoFillManager.getPlatformName(currentPlatform)}</span>
                      </span>
                    </button>
                  </div>

                  {/* Metadata */}
                  {currentContent.metadata && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Post Details</h4>
                      <div className="space-y-2 text-sm">
                        {currentContent.metadata.hook && (
                          <div className="bg-yellow-50 p-3 rounded-lg">
                            <span className="font-medium text-yellow-800">Hook:</span>
                            <p className="text-yellow-700 mt-1">{currentContent.metadata.hook}</p>
                          </div>
                        )}
                        {currentContent.metadata.cta && (
                          <div className="bg-green-50 p-3 rounded-lg">
                            <span className="font-medium text-green-800">Call to Action:</span>
                            <p className="text-green-700 mt-1">{currentContent.metadata.cta}</p>
                          </div>
                        )}
                        {currentContent.metadata.engagement && (
                          <div className="bg-purple-50 p-3 rounded-lg">
                            <span className="font-medium text-purple-800">Engagement:</span>
                            <p className="text-purple-700 mt-1">{currentContent.metadata.engagement}</p>
                          </div>
                        )}
                      </div>
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
        </div>
      </div>
    </div>
  );
}
