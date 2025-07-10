const axios = require('axios');
const logger = require('./logger');

class OpenAIProvider {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
    this.baseUrl = 'https://api.openai.com/v1';
    
    if (!this.apiKey) {
      logger.error('OpenAI API key not found. Please set OPENAI_API_KEY environment variable.');
    }
  }

  async generateContent(prompt, options = {}) {
    try {
      const systemPrompt = options.systemPrompt || 'You are a helpful AI assistant.';
      const temperature = options.temperature || 0.7;
      const maxTokens = options.maxTokens || 2048;

      const response = await axios.post(`${this.baseUrl}/chat/completions`, {
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: temperature,
        max_tokens: maxTokens,
        top_p: 0.9
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data && response.data.choices && response.data.choices[0]) {
        return {
          success: true,
          data: {
            content: response.data.choices[0].message.content,
            model: this.model
          }
        };
      }

      return {
        success: false,
        error: 'Invalid response format from OpenAI'
      };

    } catch (error) {
      logger.error('OpenAI API error', { error: error.message });
      return {
        success: false,
        error: error.message
      };
    }
  }

  async generateResume(resumeContent, jobDescription, preferences = {}) {
    const systemPrompt = `You are an expert resume writer and career coach. Your task is to improve and optimize resumes based on job descriptions. 

Guidelines:
- Maintain the original structure and key information
- Enhance the content to better match the job requirements
- Use action verbs and quantifiable achievements
- Keep it professional and concise
- Focus on relevant skills and experiences
- Format as clean, readable text

Style preferences: ${preferences.style || 'professional'}
Tone: ${preferences.tone || 'confident'}`;

    const prompt = `Please improve this resume for the following job description:

RESUME CONTENT:
${resumeContent}

JOB DESCRIPTION:
${jobDescription}

Please provide an enhanced version of the resume that better aligns with the job requirements.`;

    return await this.generateContent(prompt, { systemPrompt, maxTokens: 3000 });
  }

  async generateCoverLetter(resumeContent, jobDescription, preferences = {}) {
    const systemPrompt = `You are an expert cover letter writer. Create compelling, personalized cover letters that connect the candidate's experience with the job requirements.

Guidelines:
- Start with a strong opening that shows enthusiasm
- Connect specific experiences to job requirements
- Use concrete examples and achievements
- Keep it concise (3-4 paragraphs)
- End with a call to action
- Maintain professional tone

Style: ${preferences.style || 'professional'}
Tone: ${preferences.tone || 'enthusiastic'}`;

    const prompt = `Please write a cover letter for this position based on the candidate's resume:

RESUME CONTENT:
${resumeContent}

JOB DESCRIPTION:
${jobDescription}

Write a compelling cover letter that highlights relevant experience and shows why the candidate is a great fit for this role.`;

    return await this.generateContent(prompt, { systemPrompt, maxTokens: 2000 });
  }

  async analyzeJob(jobDescription) {
    const systemPrompt = `You are an expert job analyst. Analyze job descriptions to extract key information and provide insights.

Please provide:
1. Key skills and requirements
2. Experience level needed
3. Industry and company type
4. Salary range indicators
5. Growth opportunities
6. Required vs preferred qualifications`;

    const prompt = `Please analyze this job description:

${jobDescription}

Provide a comprehensive analysis including key skills, experience level, industry insights, and growth opportunities.`;

    return await this.generateContent(prompt, { systemPrompt, maxTokens: 1500 });
  }

  async parseResume(resumeText) {
    const systemPrompt = `You are an expert resume parser. Extract and structure information from resume text into a standardized format.

Please parse the resume and return a JSON object with the following structure:
{
  "extractedText": "The full extracted text from the resume",
  "sections": {
    "contact": {
      "name": "Full name",
      "email": "Email address",
      "phone": "Phone number",
      "location": "City, State/Country",
      "linkedin": "LinkedIn URL (if found)"
    },
    "summary": "Professional summary or objective",
    "experience": [
      {
        "title": "Job title",
        "company": "Company name",
        "duration": "Duration (e.g., 2020-2023)",
        "location": "Location (if mentioned)",
        "description": "Job description and achievements"
      }
    ],
    "education": [
      {
        "degree": "Degree name",
        "institution": "Institution name",
        "year": "Graduation year",
        "gpa": "GPA (if mentioned)"
      }
    ],
    "skills": ["Skill 1", "Skill 2", "Skill 3"],
    "certifications": ["Certification 1", "Certification 2"],
    "languages": ["Language 1", "Language 2"],
    "projects": [
      {
        "name": "Project name",
        "description": "Project description",
        "technologies": ["Tech 1", "Tech 2"],
        "url": "Project URL (if mentioned)"
      }
    ]
  }
}

Guidelines:
- Extract all available information accurately
- If a section is not found, omit it from the JSON
- For skills, extract both technical and soft skills
- For experience, include all relevant details like duration, location, achievements
- Clean and format the text appropriately
- Return valid JSON only`;

    const prompt = `Please parse this resume text and extract structured information:

${resumeText}

Return the parsed information in the specified JSON format.`;

    const result = await this.generateContent(prompt, { 
      systemPrompt, 
      maxTokens: 4000,
      temperature: 0.1 // Lower temperature for more consistent parsing
    });

    if (!result.success) {
      return result;
    }

    try {
      // Try to parse the JSON response
      const parsedData = JSON.parse(result.data.content);
      return {
        success: true,
        data: parsedData
      };
    } catch (parseError) {
      logger.error('Error parsing AI response as JSON', { error: parseError.message });
      // Fallback: return the raw text if JSON parsing fails
      return {
        success: true,
        data: {
          extractedText: resumeText,
          sections: {
            contact: {},
            experience: [],
            education: [],
            skills: []
          }
        }
      };
    }
  }

  async chat(message, context = 'general') {
    const systemPrompt = `You are an AI assistant for a recruitment platform. You help users with job-related questions, resume advice, and career guidance. 

Context: ${context}
Be helpful, professional, and provide actionable advice.`;

    return await this.generateContent(message, { systemPrompt });
  }

  async healthCheck() {
    try {
      const response = await axios.get(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (response.status === 200) {
        return {
          success: true,
          data: {
            provider: 'openai',
            model: this.model,
            status: 'healthy'
          }
        };
      }

      return {
        success: false,
        error: 'Health check failed'
      };

    } catch (error) {
      logger.error('OpenAI health check failed', { error: error.message });
      return {
        success: false,
        error: error.message
      };
    }
  }

  getProvider() {
    return 'openai';
  }
}

module.exports = OpenAIProvider; 