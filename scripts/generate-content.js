// Script to generate content via command line

const fetch = require('node-fetch');

async function generateContent() {
  try {
    console.log('🚀 Starting content generation...');
    
    const response = await fetch('http://localhost:3000/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Content generated successfully!');
      console.log(`📊 Generated ${result.data.contentPackages.length} content packages`);
      console.log(`⏱️ Processing time: ${result.metadata.totalProcessingTime}ms`);
      
      // Display first content package as example
      if (result.data.contentPackages.length > 0) {
        const firstPackage = result.data.contentPackages[0];
        console.log('\n📝 Example Content Package:');
        console.log(`Title: ${firstPackage.longForm.title}`);
        console.log(`Lead: ${firstPackage.longForm.lead}`);
        console.log(`Platforms: ${firstPackage.platforms.map(p => p.platform).join(', ')}`);
      }
    } else {
      console.error('❌ Content generation failed:', result.message);
      if (result.errors) {
        console.error('Errors:', result.errors);
      }
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

generateContent();


