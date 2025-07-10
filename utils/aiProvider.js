const OpenAIProvider = require('./openaiProvider');

class AIProvider {
  constructor() {
    this.openaiProvider = new OpenAIProvider();
  }

  async generateContent(prompt, options = {}) {
    return await this.openaiProvider.generateContent(prompt, options);
  }

  async generateResume(resumeContent, jobDescription, preferences = {}) {
    return await this.openaiProvider.generateResume(resumeContent, jobDescription, preferences);
  }

  async generateCoverLetter(resumeContent, jobDescription, preferences = {}) {
    return await this.openaiProvider.generateCoverLetter(resumeContent, jobDescription, preferences);
  }

  async analyzeJob(jobDescription) {
    return await this.openaiProvider.analyzeJob(jobDescription);
  }

  async parseResume(resumeText) {
    return await this.openaiProvider.parseResume(resumeText);
  }

  async chat(message, context = 'general') {
    return await this.openaiProvider.chat(message, context);
  }

  async healthCheck() {
    return await this.openaiProvider.healthCheck();
  }

  // Get current provider
  getProvider() {
    return 'openai';
  }
}

module.exports = new AIProvider(); 