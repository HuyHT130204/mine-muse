// Auto-fill utility functions for social media platforms

export interface AutoFillOptions {
  content: string;
  hashtags?: string[];
  url?: string;
}

export class AutoFillManager {
  static openTwitterWithContent(options: AutoFillOptions) {
    const { content, hashtags = [], url } = options;
    let text = content;
    
    if (hashtags.length > 0) {
      text += '\n\n' + hashtags.map(tag => `#${tag}`).join(' ');
    }
    
    if (url) {
      text += `\n\n${url}`;
    }
    
    const encodedText = encodeURIComponent(text);
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedText}`;
    window.open(twitterUrl, '_blank', 'width=600,height=400');
  }

  static openLinkedInWithContent(options: AutoFillOptions) {
    const { content, hashtags = [], url } = options;
    let text = content;
    
    if (hashtags.length > 0) {
      text += '\n\n' + hashtags.map(tag => `#${tag}`).join(' ');
    }
    
    if (url) {
      text += `\n\n${url}`;
    }
    
    const encodedText = encodeURIComponent(text);
    const linkedinUrl = `https://www.linkedin.com/feed/?shareActive=true&text=${encodedText}`;
    window.open(linkedinUrl, '_blank', 'width=800,height=600');
  }

  static openFacebookWithContent(options: AutoFillOptions) {
    const { content, hashtags = [], url } = options;
    let text = content;
    
    if (hashtags.length > 0) {
      text += '\n\n' + hashtags.map(tag => `#${tag}`).join(' ');
    }
    
    // Facebook sharer requires a URL; quote is only preserved when sharing a link
    try {
      const encodedText = encodeURIComponent(text);
      const shareUrl = url || 'https://mine-muse.app';
      const encodedShare = encodeURIComponent(shareUrl);
      const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedShare}&quote=${encodedText}`;
      window.open(facebookUrl, '_blank', 'width=800,height=600');
      try { void navigator.clipboard?.writeText(text); } catch {}
    } catch (error) {
      console.error('Facebook sharing failed:', error);
      // Fallback: Copy to clipboard
      this.copyToClipboardForFacebook({ content: text, hashtags });
    }
  }

  static async copyToClipboardForFacebook(options: AutoFillOptions): Promise<{ success: boolean; message: string }> {
    const { content, hashtags = [] } = options;
    let text = content;
    
    if (hashtags.length > 0) {
      text += '\n\n' + hashtags.map(tag => `#${tag}`).join(' ');
    }
    
    try {
      await navigator.clipboard.writeText(text);
      return { success: true, message: 'Content copied to clipboard! Please paste it in Facebook.' };
    } catch (err) {
      console.error('Failed to copy content:', err);
      return { success: false, message: 'Failed to copy content to clipboard. Please copy manually.' };
    }
  }

  static async copyToClipboardForInstagram(options: AutoFillOptions) {
    const { content, hashtags = [] } = options;
    let text = content;
    
    if (hashtags.length > 0) {
      text += '\n\n' + hashtags.map(tag => `#${tag}`).join(' ');
    }
    
    try {
      await navigator.clipboard.writeText(text);
      return { success: true, message: 'Content copied to clipboard! Paste it in Instagram app.' };
    } catch {
      return { success: false, message: 'Failed to copy to clipboard. Please copy manually.' };
    }
  }

  static async copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      return { success: true, message: 'Content copied to clipboard!' };
    } catch {
      return { success: false, message: 'Failed to copy to clipboard.' };
    }
  }

  static getPlatformIcon(platform: string): string {
    switch (platform.toLowerCase()) {
      case 'twitter':
        return '🐦';
      case 'linkedin':
        return '💼';
      case 'instagram':
        return '📷';
      case 'facebook':
        return '👥';
      default:
        return '📱';
    }
  }

  static getPlatformColor(platform: string): string {
    switch (platform.toLowerCase()) {
      case 'twitter':
        return 'bg-blue-500 hover:bg-blue-600';
      case 'linkedin':
        return 'bg-blue-700 hover:bg-blue-800';
      case 'instagram':
        return 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600';
      case 'facebook':
        return 'bg-blue-600 hover:bg-blue-700';
      default:
        return 'bg-gray-500 hover:bg-gray-600';
    }
  }

  static getPlatformName(platform: string): string {
    switch (platform.toLowerCase()) {
      case 'twitter':
        return 'Tweet This';
      case 'linkedin':
        return 'Post to LinkedIn';
      case 'instagram':
        return 'Copy for Instagram';
      case 'facebook':
        return 'Share on Facebook';
      default:
        return 'Share';
    }
  }
}
