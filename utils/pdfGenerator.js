const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

class PDFGenerator {
  constructor() {
    this.doc = null;
  }

  // Generate PDF for resume
  async generateResumePDF(content, format = 'A4') {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: format,
          margins: {
            top: 50,
            bottom: 50,
            left: 50,
            right: 50
          }
        });

        const filename = `resume_${Date.now()}.pdf`;
        const filepath = path.join(__dirname, '../temp', filename);
        
        // Ensure temp directory exists
        const tempDir = path.join(__dirname, '../temp');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }

        const stream = fs.createWriteStream(filepath);
        doc.pipe(stream);

        // Add header
        doc.fontSize(24)
           .font('Helvetica-Bold')
           .text('Professional Resume', { align: 'center' })
           .moveDown(0.5);

        // Add content
        doc.fontSize(12)
           .font('Helvetica')
           .text(content, {
             align: 'left',
             lineGap: 2
           });

        doc.end();

        stream.on('finish', () => {
          logger.info('Resume PDF generated successfully', { filename });
          resolve({ filepath, filename });
        });

        stream.on('error', (error) => {
          logger.error('Error generating resume PDF', { error: error.message });
          reject(error);
        });

      } catch (error) {
        logger.error('Error in generateResumePDF', { error: error.message });
        reject(error);
      }
    });
  }

  // Generate PDF for cover letter
  async generateCoverLetterPDF(content, format = 'A4') {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: format,
          margins: {
            top: 50,
            bottom: 50,
            left: 50,
            right: 50
          }
        });

        const filename = `cover_letter_${Date.now()}.pdf`;
        const filepath = path.join(__dirname, '../temp', filename);
        
        // Ensure temp directory exists
        const tempDir = path.join(__dirname, '../temp');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }

        const stream = fs.createWriteStream(filepath);
        doc.pipe(stream);

        // Add header
        doc.fontSize(24)
           .font('Helvetica-Bold')
           .text('Cover Letter', { align: 'center' })
           .moveDown(0.5);

        // Add content
        doc.fontSize(12)
           .font('Helvetica')
           .text(content, {
             align: 'left',
             lineGap: 2
           });

        doc.end();

        stream.on('finish', () => {
          logger.info('Cover letter PDF generated successfully', { filename });
          resolve({ filepath, filename });
        });

        stream.on('error', (error) => {
          logger.error('Error generating cover letter PDF', { error: error.message });
          reject(error);
        });

      } catch (error) {
        logger.error('Error in generateCoverLetterPDF', { error: error.message });
        reject(error);
      }
    });
  }

  // Generate combined PDF (resume + cover letter)
  async generateCombinedPDF(resumeContent, coverLetterContent, format = 'A4') {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: format,
          margins: {
            top: 50,
            bottom: 50,
            left: 50,
            right: 50
          }
        });

        const filename = `combined_${Date.now()}.pdf`;
        const filepath = path.join(__dirname, '../temp', filename);
        
        // Ensure temp directory exists
        const tempDir = path.join(__dirname, '../temp');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }

        const stream = fs.createWriteStream(filepath);
        doc.pipe(stream);

        // Add cover letter
        doc.fontSize(24)
           .font('Helvetica-Bold')
           .text('Cover Letter', { align: 'center' })
           .moveDown(0.5);

        doc.fontSize(12)
           .font('Helvetica')
           .text(coverLetterContent, {
             align: 'left',
             lineGap: 2
           });

        // Add page break
        doc.addPage();

        // Add resume
        doc.fontSize(24)
           .font('Helvetica-Bold')
           .text('Professional Resume', { align: 'center' })
           .moveDown(0.5);

        doc.fontSize(12)
           .font('Helvetica')
           .text(resumeContent, {
             align: 'left',
             lineGap: 2
           });

        doc.end();

        stream.on('finish', () => {
          logger.info('Combined PDF generated successfully', { filename });
          resolve({ filepath, filename });
        });

        stream.on('error', (error) => {
          logger.error('Error generating combined PDF', { error: error.message });
          reject(error);
        });

      } catch (error) {
        logger.error('Error in generateCombinedPDF', { error: error.message });
        reject(error);
      }
    });
  }

  // Clean up temporary files
  async cleanupTempFiles(filename) {
    try {
      const filepath = path.join(__dirname, '../temp', filename);
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
        logger.info('Temporary file cleaned up', { filename });
      }
    } catch (error) {
      logger.error('Error cleaning up temporary file', { filename, error: error.message });
    }
  }
}

module.exports = new PDFGenerator(); 