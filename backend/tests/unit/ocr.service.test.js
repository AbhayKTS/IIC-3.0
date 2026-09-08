jest.mock('axios');
const axios = require('axios');
const { extractIdCardData, extractFieldsFromRawText } = require('../../src/services/ocr.service');

describe('ocr.service', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      AZURE_DOCINT_ENDPOINT: 'https://test-docint.cognitiveservices.azure.com',
      AZURE_DOCINT_KEY: 'test-api-key-12345',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('extractFieldsFromRawText (fallback helper)', () => {
    it('extracts roll number, name, college and validity from raw OCR text', () => {
      const rawText = `
        INDIAN INSTITUTE OF TECHNOLOGY DELHI
        Student Identity Card
        Student Name: Rahul Verma
        Roll No: 2022CS10456
        Branch: Computer Science & Engineering
        Valid Thru: 30/06/2026
      `;

      const result = extractFieldsFromRawText(rawText);

      expect(result.studentName).toBe('Rahul Verma');
      expect(result.rollNumber).toBe('2022CS10456');
      expect(result.collegeName).toContain('INDIAN INSTITUTE OF TECHNOLOGY DELHI');
      expect(result.validUntil).toBe('30/06/2026');
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('handles text without clear fields gracefully', () => {
      const result = extractFieldsFromRawText('Some random blurred text 123');

      expect(result.studentName).toBeNull();
      expect(result.confidence).toBeLessThanOrEqual(0.5);
    });
  });

  describe('extractIdCardData', () => {
    it('returns failure when Azure credentials are not configured', async () => {
      delete process.env.AZURE_DOCINT_ENDPOINT;
      delete process.env.AZURE_DOCINT_KEY;

      const result = await extractIdCardData(Buffer.from('fake-image'), 'image/jpeg');

      expect(result.success).toBe(false);
      expect(result.reason).toBe('azure_credentials_missing');
      expect(axios.post).not.toHaveBeenCalled();
    });

    it('returns failure when image buffer is invalid', async () => {
      const result = await extractIdCardData(null, 'image/jpeg');

      expect(result.success).toBe(false);
      expect(result.reason).toBe('invalid_image_buffer');
    });

    it('extracts structured fields via prebuilt-idDocument on success', async () => {
      const operationUrl = 'https://test-docint.cognitiveservices.azure.com/documentintelligence/documentModels/prebuilt-idDocument/analyzeResults/op-123';

      axios.post.mockResolvedValueOnce({
        status: 202,
        headers: {
          'operation-location': operationUrl,
        },
      });

      axios.get.mockResolvedValueOnce({
        data: {
          status: 'succeeded',
          analyzeResult: {
            documents: [
              {
                fields: {
                  FirstName: { valueString: 'Arjun', confidence: 0.96 },
                  LastName: { valueString: 'Sharma', confidence: 0.94 },
                  DocumentNumber: { valueString: '2023CS0123', confidence: 0.98 },
                  DateOfExpiration: { valueString: '2027-06-30', confidence: 0.9 },
                  Issuer: { valueString: 'IIT Delhi', confidence: 0.92 },
                },
              },
            ],
          },
        },
      });

      const buffer = Buffer.from('image-data');
      const result = await extractIdCardData(buffer, 'image/jpeg');

      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('prebuilt-idDocument:analyze'),
        buffer,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Ocp-Apim-Subscription-Key': 'test-api-key-12345',
            'Content-Type': 'image/jpeg',
          }),
        })
      );

      expect(axios.get).toHaveBeenCalledWith(
        operationUrl,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Ocp-Apim-Subscription-Key': 'test-api-key-12345',
          }),
        })
      );

      expect(result.success).toBe(true);
      expect(result.source).toBe('prebuilt-id');
      expect(result.studentName).toBe('Arjun Sharma');
      expect(result.rollNumber).toBe('2023CS0123');
      expect(result.collegeName).toBe('IIT Delhi');
      expect(result.validUntil).toBe('2027-06-30');
      expect(result.confidence).toBeCloseTo(0.94, 2);
    });

    it('falls back to prebuilt-read when prebuilt-idDocument returns low/no structured fields', async () => {
      const idOpUrl = 'https://test-docint.cognitiveservices.azure.com/operations/id-op';
      const readOpUrl = 'https://test-docint.cognitiveservices.azure.com/operations/read-op';

      // 1. prebuilt-idDocument call returns empty documents
      axios.post.mockResolvedValueOnce({
        status: 202,
        headers: { 'operation-location': idOpUrl },
      });

      axios.get.mockResolvedValueOnce({
        data: {
          status: 'succeeded',
          analyzeResult: {
            documents: [], // no structured ID fields recognized
          },
        },
      });

      // 2. Fallback to prebuilt-read
      axios.post.mockResolvedValueOnce({
        status: 202,
        headers: { 'operation-location': readOpUrl },
      });

      axios.get.mockResolvedValueOnce({
        data: {
          status: 'succeeded',
          analyzeResult: {
            content: `
              NATIONAL INSTITUTE OF TECHNOLOGY TRICHY
              STUDENT IDENTITY CARD
              Name: Priya Patel
              Roll No: 2024NITT1029
              Valid Until: 2028
            `,
          },
        },
      });

      const buffer = Buffer.from('non-standard-card');
      const result = await extractIdCardData(buffer, 'image/png');

      expect(axios.post).toHaveBeenCalledTimes(2);
      expect(axios.post).toHaveBeenNthCalledWith(1, expect.stringContaining('prebuilt-idDocument'), expect.anything(), expect.anything());
      expect(axios.post).toHaveBeenNthCalledWith(2, expect.stringContaining('prebuilt-read'), expect.anything(), expect.anything());

      expect(result.success).toBe(true);
      expect(result.source).toBe('prebuilt-read-fallback');
      expect(result.studentName).toBe('Priya Patel');
      expect(result.rollNumber).toBe('2024NITT1029');
      expect(result.collegeName).toContain('NATIONAL INSTITUTE OF TECHNOLOGY TRICHY');
      expect(result.validUntil).toBe('2028');
    });

    it('handles Azure operation failure gracefully without throwing', async () => {
      const operationUrl = 'https://test-docint.cognitiveservices.azure.com/operations/failed-op';

      axios.post.mockResolvedValueOnce({
        status: 202,
        headers: { 'operation-location': operationUrl },
      });

      axios.get.mockResolvedValueOnce({
        data: {
          status: 'failed',
          error: { message: 'Invalid image format or corrupted data' },
        },
      });

      // Fallback prebuilt-read also errors out
      axios.post.mockRejectedValueOnce(new Error('Internal Azure server error'));

      const result = await extractIdCardData(Buffer.from('corrupt'), 'image/jpeg');

      expect(result.success).toBe(false);
      expect(result.reason).toBeDefined();
    });
  });
});
