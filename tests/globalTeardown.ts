module.exports = async () => {
  console.log('🧹 Cleaning up global test environment...');

  const mongoServer = (global as any).__MONGOD__;
  if (mongoServer) {
    await mongoServer.stop();
    console.log('✅ MongoDB test server stopped');
  }

  // Clean up any remaining processes
  if (process.platform !== 'win32') {
    try {
      require('child_process').execSync('pkill -f "tsx watch" || true');
      require('child_process').execSync('pkill -f "node.*dist" || true');
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  console.log('✅ Global test environment cleanup complete');
};