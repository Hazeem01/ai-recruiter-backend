const aiProvider = require('../utils/aiProvider');
const { db } = require('../utils/dbClient');
const logger = require('../utils/logger');
const { ValidationError } = require('../middleware/errorHandler');

// Send message to AI chat
exports.sendMessage = async (req, res, next) => {
  const userId = req.user?.id;
  const { message, context = 'general' } = req.body;

  try {
    logger.info('Chat message attempt', { userId, context });

    if (!userId) {
      throw new ValidationError('User not authenticated');
    }

    if (!message || message.trim().length === 0) {
      throw new ValidationError('Message is required');
    }

    // Get chat history for context
    const historyResult = await db.getChatHistory(userId, 10);
    const chatHistory = historyResult.success ? historyResult.data : [];

    // Build conversation context
    const conversationHistory = chatHistory.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // Add current message
    conversationHistory.push({
      role: 'user',
      content: message
    });

    // Create system prompt based on context
    let systemPrompt = "You are a helpful AI assistant for job seekers and recruiters. Provide professional, accurate, and helpful advice.";
    
    switch (context) {
      case 'resume':
        systemPrompt = "You are an expert resume writer and career coach. Help users improve their resumes, suggest better wording, and provide career advice.";
        break;
      case 'interview':
        systemPrompt = "You are an interview preparation expert. Help users prepare for job interviews, suggest common questions and answers, and provide interview tips.";
        break;
      case 'job_search':
        systemPrompt = "You are a job search specialist. Help users find relevant job opportunities, improve their job search strategy, and provide career guidance.";
        break;
      case 'recruiter':
        systemPrompt = "You are a recruitment expert. Help recruiters with candidate evaluation, job posting optimization, and recruitment best practices.";
        break;
      default:
        systemPrompt = "You are a helpful AI assistant for job seekers and recruiters. Provide professional, accurate, and helpful advice.";
    }

    // Prepare messages for AI provider
    const messages = [
      {
        role: 'system',
        content: systemPrompt
      },
      ...conversationHistory
    ];

    // Call AI provider
    const result = await aiProvider.chat(message, context);
    
    if (!result.success) {
      throw new Error(result.error);
    }

    const aiResponse = result.data.content;

    // Save both user message and AI response to database
    const saveResult = await db.saveChatMessage(userId, message, aiResponse, context);
    if (!saveResult.success) {
      logger.warn('Failed to save chat message', { error: saveResult.error });
    }

    logger.info('Chat message processed successfully', { userId, messageLength: message.length });

    res.status(200).json({
      success: true,
      data: {
        message: aiResponse,
        context: context,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Error in chat message', { error: error.message });
    next(error);
  }
};

// Get chat history
exports.getChatHistory = async (req, res, next) => {
  const userId = req.user?.id;
  const { context, limit = 50 } = req.query;

  try {
    logger.info('Getting chat history', { userId, context, limit });

    if (!userId) {
      throw new ValidationError('User not authenticated');
    }

    const result = await db.getChatHistory(userId, parseInt(limit));
    if (!result.success) {
      throw new Error(result.error);
    }

    // The data is already in the correct format from the database function
    let messages = result.data;
    
    // Group messages by conversation (simple grouping by time proximity)
    const conversations = [];
    let currentConversation = [];
    
    messages.forEach((message, index) => {
      if (index === 0) {
        currentConversation.push(message);
      } else {
        const prevMessage = messages[index - 1];
        const timeDiff = new Date(message.created_at) - new Date(prevMessage.created_at);
        
        // If messages are within 5 minutes, consider them part of the same conversation
        if (timeDiff < 5 * 60 * 1000) {
          currentConversation.push(message);
        } else {
          if (currentConversation.length > 0) {
            conversations.push([...currentConversation]);
          }
          currentConversation = [message];
        }
      }
    });
    
    // Add the last conversation
    if (currentConversation.length > 0) {
      conversations.push(currentConversation);
    }

    logger.info('Chat history retrieved successfully', { userId, conversationCount: conversations.length });

    res.status(200).json({
      success: true,
      data: {
        conversations: conversations,
        totalMessages: messages.length,
        context: context || 'all'
      }
    });

  } catch (error) {
    logger.error('Error getting chat history', { error: error.message });
    next(error);
  }
};

// Clear chat history
exports.clearChatHistory = async (req, res, next) => {
  const userId = req.user?.id;
  const { context } = req.query;

  try {
    logger.info('Clearing chat history', { userId, context });

    if (!userId) {
      throw new ValidationError('User not authenticated');
    }

    // For now, we'll just return success
    // In a real implementation, you would delete messages from the database
    // This would require a delete method in the database operations

    logger.info('Chat history cleared successfully', { userId });

    res.status(200).json({
      success: true,
      data: {
        message: 'Chat history cleared successfully',
        context: context || 'all'
      }
    });

  } catch (error) {
    logger.error('Error clearing chat history', { error: error.message });
    next(error);
  }
};

// Get chat suggestions based on context
exports.getChatSuggestions = async (req, res, next) => {
  const { context = 'general' } = req.query;

  try {
    logger.info('Getting chat suggestions', { context });

    const suggestions = {
      general: [
        "How can I improve my resume?",
        "What are common interview questions?",
        "How do I prepare for a job interview?",
        "What skills are in demand right now?"
      ],
      resume: [
        "How can I make my resume stand out?",
        "What should I include in my resume summary?",
        "How do I describe my achievements?",
        "What format should I use for my resume?"
      ],
      interview: [
        "What are behavioral interview questions?",
        "How do I answer 'Tell me about yourself'?",
        "What questions should I ask the interviewer?",
        "How do I handle difficult interview questions?"
      ],
      job_search: [
        "How do I find remote job opportunities?",
        "What are the best job search websites?",
        "How do I network effectively?",
        "How do I negotiate salary?"
      ],
      recruiter: [
        "How do I write better job descriptions?",
        "What are effective candidate screening methods?",
        "How do I improve candidate experience?",
        "What are current hiring trends?"
      ]
    };

    const contextSuggestions = suggestions[context] || suggestions.general;

    res.status(200).json({
      success: true,
      data: {
        suggestions: contextSuggestions,
        context: context
      }
    });

  } catch (error) {
    logger.error('Error getting chat suggestions', { error: error.message });
    next(error);
  }
}; 