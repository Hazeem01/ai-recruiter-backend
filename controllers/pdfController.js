const pdfGenerator = require('../utils/pdfGenerator');
const logger = require('../utils/logger');
const fs = require('fs');

exports.exportResumePDF = async (req, res, next) => {
  const { content, format = 'A4' } = req.body;
  
  try {
    logger.info('Exporting resume to PDF', { format });

    const { filepath, filename } = await pdfGenerator.generateResumePDF(content, format);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    const fileStream = fs.createReadStream(filepath);
    fileStream.pipe(res);
    
    fileStream.on('end', () => {
      pdfGenerator.cleanupTempFiles(filename);
    });

    fileStream.on('error', (error) => {
      logger.error('Error streaming PDF file', { error: error.message, filename });
      pdfGenerator.cleanupTempFiles(filename);
      next(error);
    });

  } catch (error) {
    logger.error('Error exporting resume PDF', {
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

exports.exportCoverLetterPDF = async (req, res, next) => {
  const { content, format = 'A4' } = req.body;
  
  try {
    logger.info('Exporting cover letter to PDF', { format });

    const { filepath, filename } = await pdfGenerator.generateCoverLetterPDF(content, format);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    const fileStream = fs.createReadStream(filepath);
    fileStream.pipe(res);
    
    fileStream.on('end', () => {
      pdfGenerator.cleanupTempFiles(filename);
    });

    fileStream.on('error', (error) => {
      logger.error('Error streaming PDF file', { error: error.message, filename });
      pdfGenerator.cleanupTempFiles(filename);
      next(error);
    });

  } catch (error) {
    logger.error('Error exporting cover letter PDF', {
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

exports.exportCombinedPDF = async (req, res, next) => {
  const { resumeContent, coverLetterContent, format = 'A4' } = req.body;
  
  try {
    logger.info('Exporting combined PDF', { format });

    const { filepath, filename } = await pdfGenerator.generateCombinedPDF(
      resumeContent, 
      coverLetterContent, 
      format
    );
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    const fileStream = fs.createReadStream(filepath);
    fileStream.pipe(res);
    
    fileStream.on('end', () => {
      pdfGenerator.cleanupTempFiles(filename);
    });

    fileStream.on('error', (error) => {
      logger.error('Error streaming combined PDF file', { error: error.message, filename });
      pdfGenerator.cleanupTempFiles(filename);
      next(error);
    });

  } catch (error) {
    logger.error('Error exporting combined PDF', {
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

exports.getPDFPreview = async (req, res, next) => {
  const { content, type = 'resume', format = 'A4' } = req.body;
  
  try {
    logger.info('Generating PDF preview', { type, format });

    let result;
    
    if (type === 'resume') {
      result = await pdfGenerator.generateResumePDF(content, format);
    } else if (type === 'cover-letter') {
      result = await pdfGenerator.generateCoverLetterPDF(content, format);
    } else {
      throw new Error('Invalid PDF type specified');
    }

    const fileBuffer = fs.readFileSync(result.filepath);
    const base64PDF = fileBuffer.toString('base64');
    
    pdfGenerator.cleanupTempFiles(result.filename);
    
    res.status(200).json({
      success: true,
      data: {
        pdf: base64PDF,
        filename: result.filename
      }
    });

  } catch (error) {
    logger.error('Error generating PDF preview', {
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
}; 