const axios = require('axios');
const logger = require('../utils/logger');

const API_VERSION = '2024-11-30';
const MAX_POLL_ATTEMPTS = 15;
const POLL_INTERVAL_MS = 1000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getAzureConfig = () => {
  const endpoint = (process.env.AZURE_DOCINT_ENDPOINT || '').replace(/\/+$/, '');
  const apiKey = process.env.AZURE_DOCINT_KEY;

  if (!endpoint || !apiKey) {
    logger.warn('[OCR] Missing AZURE_DOCINT_ENDPOINT or AZURE_DOCINT_KEY — Azure Document Intelligence disabled');
    return null;
  }

  return { endpoint, apiKey };
};

/**
 * Polls the Operation-Location URL returned by Azure Document Intelligence until completion
 */
const pollOperation = async (operationUrl, apiKey) => {
  let attempts = 0;

  while (attempts < MAX_POLL_ATTEMPTS) {
    attempts += 1;
    await sleep(POLL_INTERVAL_MS);

    const response = await axios.get(operationUrl, {
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
      },
    });

    const status = response.data?.status;

    if (status === 'succeeded') {
      return response.data;
    }

    if (status === 'failed' || status === 'canceled') {
      const errorDetail = response.data?.error?.message || `Operation ${status}`;
      throw new Error(errorDetail);
    }
  }

  throw new Error(`OCR operation timed out after ${MAX_POLL_ATTEMPTS} attempts`);
};

/**
 * Submits an image buffer to an Azure Document Intelligence model and polls for the result
 */
const analyzeWithModel = async (modelId, imageBuffer, mimeType, config) => {
  const url = `${config.endpoint}/documentintelligence/documentModels/${modelId}:analyze?api-version=${API_VERSION}`;

  const initialResponse = await axios.post(url, imageBuffer, {
    headers: {
      'Ocp-Apim-Subscription-Key': config.apiKey,
      'Content-Type': mimeType || 'image/jpeg',
    },
    validateStatus: (status) => status === 202 || status === 200,
  });

  if (initialResponse.status === 200 && initialResponse.data?.analyzeResult) {
    return initialResponse.data;
  }

  const operationUrl =
    initialResponse.headers['operation-location'] ||
    initialResponse.headers['Operation-Location'];

  if (!operationUrl) {
    throw new Error('Missing Operation-Location header from Azure response');
  }

  return await pollOperation(operationUrl, config.apiKey);
};

/**
 * Helper to extract value and confidence from an Azure field object
 */
const getFieldValue = (field) => {
  if (!field) return null;
  if (field.valueString !== undefined) return field.valueString;
  if (field.valueDate !== undefined) return field.valueDate;
  if (field.valueNumber !== undefined) return field.valueNumber;
  if (field.content !== undefined) return field.content;
  return null;
};

/**
 * Extracts structured fields from Azure prebuilt-idDocument model
 */
const parseIdModelFields = (analyzeResult) => {
  const documents = analyzeResult?.documents || [];
  if (!documents.length) return null;

  const doc = documents[0];
  const fields = doc.fields || {};

  // Log raw response once during development to inspect actual field structures
  logger.debug('[OCR] Azure prebuilt-idDocument raw fields:', JSON.stringify(fields));

  const rawFields = {};
  const confidences = [];

  Object.entries(fields).forEach(([key, val]) => {
    rawFields[key] = {
      value: getFieldValue(val),
      confidence: typeof val.confidence === 'number' ? val.confidence : null,
    };
    if (typeof val.confidence === 'number') {
      confidences.push(val.confidence);
    }
  });

  const firstName = getFieldValue(fields.FirstName) || '';
  const lastName = getFieldValue(fields.LastName) || '';
  const combinedName = [firstName, lastName].filter(Boolean).join(' ').trim();
  const studentName = combinedName || getFieldValue(fields.FullName) || getFieldValue(fields.Name) || null;

  const rollNumber =
    getFieldValue(fields.DocumentNumber) ||
    getFieldValue(fields.IdentificationNumber) ||
    getFieldValue(fields.PersonalNumber) ||
    null;

  const validUntil =
    getFieldValue(fields.DateOfExpiration) ||
    getFieldValue(fields.ExpirationDate) ||
    null;

  const collegeName =
    getFieldValue(fields.Issuer) ||
    getFieldValue(fields.Organization) ||
    getFieldValue(fields.IssuingAuthority) ||
    null;

  const avgConfidence = confidences.length
    ? Number((confidences.reduce((a, b) => a + b, 0) / confidences.length).toFixed(3))
    : 0;

  return {
    studentName,
    rollNumber,
    collegeName,
    validUntil,
    confidence: avgConfidence,
    rawFields,
  };
};

/**
 * Fallback regex extractor using raw OCR text from prebuilt-read
 */
const extractFieldsFromRawText = (rawText) => {
  if (!rawText || typeof rawText !== 'string') {
    return {
      studentName: null,
      rollNumber: null,
      collegeName: null,
      validUntil: null,
      confidence: 0,
      rawFields: { rawText: '' },
    };
  }

  // Regex patterns tailored for Indian college ID cards
  const rollPatterns = [
    /\b(?:roll\s*(?:no|number|num)?|reg\s*(?:no|number)?|registration\s*(?:no|number)?|enrollment\s*(?:no|number)?|enrolment\s*(?:no|number)?|id\s*(?:no|number)|student\s*id)\b\s*[:#-]?\s*([A-Za-z0-9\/-]{4,25})/i,
    /\b(20\d{2}[A-Za-z]{2,4}\d{3,6})\b/i,
    /\b([A-Za-z]{2,4}\/\d{2,6}\/\d{2,4})\b/i,
  ];

  let rollNumber = null;
  for (const pattern of rollPatterns) {
    const match = rawText.match(pattern);
    if (match && match[1]) {
      rollNumber = match[1].trim();
      break;
    }
  }

  const namePatterns = [
    /(?:name|student\s*name)\s*[:#-]?\s*([A-Za-z\s.]{2,40})/i,
  ];

  let studentName = null;
  for (const pattern of namePatterns) {
    const match = rawText.match(pattern);
    if (match && match[1]) {
      const candidate = match[1].split('\n')[0].trim();
      if (candidate.length > 2 && !/institute|college|university/i.test(candidate)) {
        studentName = candidate;
        break;
      }
    }
  }

  const collegePatterns = [
    /((?:Indian\s+Institute\s+of\s+Technology|National\s+Institute\s+of\s+Technology|Birla\s+Institute\s+of\s+Technology|Delhi\s+Technological\s+University)[^\n,]*)/i,
    /([A-Za-z\s&]+(?:College\s+of\s+Engineering|Institute\s+of\s+Technology|University|Campus|Vidyapeeth))/i,
  ];

  let collegeName = null;
  for (const pattern of collegePatterns) {
    const match = rawText.match(pattern);
    if (match && match[1]) {
      collegeName = match[1].split('\n')[0].trim();
      break;
    }
  }

  const validityPatterns = [
    /(?:valid\s*(?:thru|through|until|upto|to)?|exp(?:iry)?\s*date)\s*[:#-]?\s*(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}|\b20\d{2}\b)/i,
  ];

  let validUntil = null;
  for (const pattern of validityPatterns) {
    const match = rawText.match(pattern);
    if (match && match[1]) {
      validUntil = match[1].trim();
      break;
    }
  }

  // Calculate estimated confidence based on matches found
  const matchedCount = [studentName, rollNumber, collegeName, validUntil].filter(Boolean).length;
  const confidence = matchedCount > 0 ? Number((0.5 + (matchedCount * 0.12)).toFixed(2)) : 0.3;

  return {
    studentName,
    rollNumber,
    collegeName,
    validUntil,
    confidence,
    rawFields: { rawText },
  };
};

/**
 * Main exported OCR extraction function
 *
 * @param {Buffer} imageBuffer - Raw image file buffer
 * @param {string} mimeType - e.g. 'image/jpeg', 'image/png'
 * @returns {Promise<{ success: boolean, studentName?: string, rollNumber?: string, collegeName?: string, validUntil?: string, confidence?: number, rawFields?: object, source?: string, reason?: string }>}
 */
const extractIdCardData = async (imageBuffer, mimeType) => {
  const config = getAzureConfig();

  if (!config) {
    return {
      success: false,
      reason: 'azure_credentials_missing',
    };
  }

  if (!imageBuffer || !Buffer.isBuffer(imageBuffer) || imageBuffer.length === 0) {
    return {
      success: false,
      reason: 'invalid_image_buffer',
    };
  }

  try {
    // 1. Primary path: prebuilt-idDocument model
    let parsedData = null;

    try {
      const idResult = await analyzeWithModel('prebuilt-idDocument', imageBuffer, mimeType, config);
      parsedData = parseIdModelFields(idResult.analyzeResult);
    } catch (idErr) {
      logger.warn('[OCR] prebuilt-idDocument analysis failed or unparseable, falling back to prebuilt-read:', idErr.message);
    }

    // 2. Check if we need fallback:
    // If idDocument yielded no structured fields, or both studentName and rollNumber are missing, or confidence is very low
    const isWeakResult =
      !parsedData ||
      (!parsedData.studentName && !parsedData.rollNumber) ||
      parsedData.confidence < 0.35;

    if (isWeakResult) {
      logger.info('[OCR] Primary ID model returned weak/no structured fields; executing prebuilt-read fallback');

      const readResult = await analyzeWithModel('prebuilt-read', imageBuffer, mimeType, config);
      const rawText = readResult.analyzeResult?.content || '';
      const fallbackData = extractFieldsFromRawText(rawText);

      return {
        success: true,
        source: 'prebuilt-read-fallback',
        ...fallbackData,
      };
    }

    return {
      success: true,
      source: 'prebuilt-id',
      ...parsedData,
    };
  } catch (error) {
    logger.error('[OCR] Hard failure during ID card data extraction:', { message: error.message });
    return {
      success: false,
      reason: error.message || 'ocr_processing_failed',
    };
  }
};

/**
 * Extracts raw text content from any document (PDF, DOCX, image) using Azure prebuilt-read model
 *
 * @param {Buffer} fileBuffer
 * @param {string} mimeType
 * @returns {Promise<{ success: boolean, text?: string, reason?: string }>}
 */
const extractTextFromDocument = async (fileBuffer, mimeType) => {
  const config = getAzureConfig();

  if (!config) {
    return {
      success: false,
      reason: 'azure_credentials_missing',
    };
  }

  if (!fileBuffer || !Buffer.isBuffer(fileBuffer) || fileBuffer.length === 0) {
    return {
      success: false,
      reason: 'invalid_file_buffer',
    };
  }

  try {
    const readResult = await analyzeWithModel('prebuilt-read', fileBuffer, mimeType, config);
    const content = readResult.analyzeResult?.content || '';
    return {
      success: true,
      text: content,
    };
  } catch (error) {
    logger.error('[OCR] Failed to extract text from document:', { message: error.message });
    return {
      success: false,
      reason: error.message || 'text_extraction_failed',
    };
  }
};

module.exports = {
  extractIdCardData,
  extractFieldsFromRawText,
  extractTextFromDocument,
};
