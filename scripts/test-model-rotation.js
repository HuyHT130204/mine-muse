// Test script for model rotation functionality

const { modelManager } = require('../src/lib/model-manager');

async function testModelRotation() {
  console.log('🧪 Testing Model Rotation...\n');
  
  try {
    // Test 1: Check model initialization
    console.log('📊 Model Statistics:');
    const stats = modelManager.getStats();
    console.log(JSON.stringify(stats, null, 2));
    
    if (stats.totalModels === 0) {
      console.log('❌ No models available. Please check HF_API_KEY configuration.');
      return;
    }
    
    console.log('\n🔄 Testing Model Rotation:');
    
    // Test 2: Test rotation
    for (let i = 0; i < 6; i++) {
      const model = modelManager.rotateModel();
      const modelName = modelManager.getCurrentModelName();
      console.log(`Iteration ${i + 1}: ${modelName} (has model: ${!!model})`);
    }
    
    // Test 3: Test specific model selection
    console.log('\n🎯 Testing Specific Model Selection:');
    const availableModels = stats.availableModels;
    if (availableModels.length > 0) {
      const firstModel = availableModels[0];
      const success = modelManager.setModel(firstModel);
      console.log(`Set model to ${firstModel}: ${success ? 'Success' : 'Failed'}`);
      console.log(`Current model: ${modelManager.getCurrentModelName()}`);
    }
    
    // Test 4: Test task-specific model selection
    console.log('\n📝 Testing Task-Specific Model Selection:');
    const writingModel = modelManager.getModelForTask('writing');
    const researchModel = modelManager.getModelForTask('research');
    console.log(`Writing model: ${modelManager.getCurrentModelName()}`);
    console.log(`Research model: ${modelManager.getCurrentModelName()}`);
    
    console.log('\n✅ Model rotation test completed successfully!');
    
  } catch (error) {
    console.error('❌ Model rotation test failed:', error);
  }
}

// Run the test
testModelRotation();
