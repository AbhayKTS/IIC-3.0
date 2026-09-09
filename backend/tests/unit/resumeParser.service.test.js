jest.mock('axios');
const axios = require('axios');
const { parseResumeData, parseWithRules, extractSections, extractLinks } = require('../../src/services/resumeParser.service');

describe('resumeParser.service', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('extractSections & extractLinks', () => {
    it('splits raw text into sections by standard headings', () => {
      const text = `
        Arjun Sharma
        SKILLS
        Python, React, Docker, Kubernetes, Leadership
        EDUCATION
        B.Tech Computer Science - IIT Delhi (2024)
        EXPERIENCE
        Software Engineering Intern at Google (Summer 2023)
        CERTIFICATIONS
        AWS Certified Solutions Architect
      `;

      const sections = extractSections(text);

      expect(sections.SKILLS).toContain('Python, React');
      expect(sections.EDUCATION).toContain('IIT Delhi');
      expect(sections.EXPERIENCE).toContain('Google');
      expect(sections.CERTIFICATIONS).toContain('AWS Certified');
    });

    it('extracts GitHub, LinkedIn, and portfolio links', () => {
      const text = 'Find me at https://github.com/arjunsharma and https://linkedin.com/in/arjun-sharma or arjun.dev';
      const links = extractLinks(text);

      expect(links.github).toBe('https://github.com/arjunsharma');
      expect(links.linkedin).toBe('https://linkedin.com/in/arjun-sharma');
    });
  });

  describe('parseWithRules (rule-based fallback)', () => {
    it('matches known skills and extracts sections', () => {
      const rawText = `
        Arjun Sharma
        SKILLS
        JavaScript, React, Node.js, Docker, Problem Solving, Teamwork
        EDUCATION
        B.Tech in Computer Science, IIT Delhi, 2024
        EXPERIENCE
        Web Developer Intern at Acme Corp
        CERTIFICATIONS
        Certified Kubernetes Administrator
      `;

      const result = parseWithRules(rawText);

      expect(result.method).toBe('rule-based');
      const skillNames = result.skills.map((s) => s.name);
      expect(skillNames).toContain('JavaScript');
      expect(skillNames).toContain('React');
      expect(skillNames).toContain('Docker');
      expect(skillNames).toContain('Problem Solving');
      expect(result.education.length).toBeGreaterThan(0);
      expect(result.experience.length).toBeGreaterThan(0);
    });
  });

  describe('parseResumeData runtime detection & multi-provider fallback', () => {
    it('uses Groq as primary provider when GROQ_API_KEY is configured', async () => {
      process.env.GROQ_API_KEY = 'test-groq-key';
      delete process.env.AZURE_OPENAI_ENDPOINT;
      delete process.env.AZURE_OPENAI_KEY;

      const mockGroqResponse = {
        data: {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  skills: [
                    { name: 'Python', category: 'technical' },
                    { name: 'Docker', category: 'technical' },
                  ],
                  education: [
                    { degree: 'B.Tech', institution: 'IIT Bombay', year: '2023' },
                  ],
                  experience: [
                    { title: 'Backend Dev', org: 'Startup', duration: '6 mos', description: 'APIs' },
                  ],
                  certifications: ['GCP Associate Cloud Engineer'],
                  links: {
                    github: 'https://github.com/coder',
                    linkedin: null,
                    portfolio: null,
                  },
                }),
              },
            },
          ],
        },
      };

      axios.post.mockResolvedValueOnce(mockGroqResponse);

      const rawText = 'Resume with Python, Docker and Backend Dev';
      const result = await parseResumeData(rawText);

      expect(axios.post).toHaveBeenCalledWith(
        'https://api.groq.com/openai/v1/chat/completions',
        expect.objectContaining({
          model: 'llama-3.3-70b-versatile',
          response_format: { type: 'json_object' },
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-groq-key',
          }),
        })
      );

      expect(result.method).toBe('groq');
      expect(result.skills).toHaveLength(2);
      expect(result.skills[0].name).toBe('Python');
      expect(result.education[0].institution).toBe('IIT Bombay');
    });

    it('falls through from failed Groq to Azure OpenAI when configured', async () => {
      process.env.GROQ_API_KEY = 'test-groq-key';
      process.env.AZURE_OPENAI_ENDPOINT = 'https://test-openai.openai.azure.com/openai/v1';
      process.env.AZURE_OPENAI_KEY = 'test-azure-key';
      process.env.AZURE_OPENAI_DEPLOYMENT = 'gpt-4o-mini';

      const mockAzureResponse = {
        data: {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  skills: [
                    { name: 'Go', category: 'technical' },
                    { name: 'Kubernetes', category: 'technical' },
                  ],
                  education: [],
                  experience: [],
                  certifications: [],
                  links: {},
                }),
              },
            },
          ],
        },
      };

      // First call (Groq) fails, second call (Azure) succeeds
      axios.post
        .mockRejectedValueOnce(new Error('Groq rate limited (429)'))
        .mockResolvedValueOnce(mockAzureResponse);

      const rawText = 'Resume text with Go and Kubernetes';
      const result = await parseResumeData(rawText);

      expect(axios.post).toHaveBeenCalledTimes(2);
      expect(axios.post).toHaveBeenNthCalledWith(
        1,
        'https://api.groq.com/openai/v1/chat/completions',
        expect.anything(),
        expect.anything()
      );
      expect(axios.post).toHaveBeenNthCalledWith(
        2,
        'https://test-openai.openai.azure.com/openai/v1/chat/completions?api-version=preview',
        expect.objectContaining({ model: 'gpt-4o-mini' }),
        expect.anything()
      );

      expect(result.method).toBe('azure-openai');
      expect(result.skills[0].name).toBe('Go');
    });

    it('falls through from failed Groq to rule-based when Azure is not configured', async () => {
      process.env.GROQ_API_KEY = 'test-groq-key';
      delete process.env.AZURE_OPENAI_ENDPOINT;
      delete process.env.AZURE_OPENAI_KEY;

      axios.post.mockRejectedValueOnce(new Error('Groq connection timeout'));

      const rawText = 'SKILLS\nJavaScript, React, Node.js';
      const result = await parseResumeData(rawText);

      expect(axios.post).toHaveBeenCalledTimes(1);
      expect(result.method).toBe('rule-based');
      const names = result.skills.map((s) => s.name);
      expect(names).toContain('JavaScript');
      expect(names).toContain('React');
    });

    it('uses Azure OpenAI when GROQ_API_KEY is not set and AZURE_OPENAI_ENDPOINT is configured', async () => {
      delete process.env.GROQ_API_KEY;
      process.env.AZURE_OPENAI_ENDPOINT = 'https://test-openai.openai.azure.com/openai/v1';
      process.env.AZURE_OPENAI_KEY = 'test-openai-key';
      process.env.AZURE_OPENAI_DEPLOYMENT = 'gpt-4o-mini';

      const mockOpenAIResponse = {
        data: {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  skills: [
                    { name: 'TypeScript', category: 'technical' },
                    { name: 'React', category: 'technical' },
                    { name: 'Leadership', category: 'soft' },
                  ],
                  education: [
                    { degree: 'B.Tech', institution: 'IIT Delhi', year: '2024' },
                  ],
                  experience: [
                    { title: 'Frontend Intern', org: 'TechCorp', duration: '3 mos', description: 'Built UI' },
                  ],
                  certifications: ['AWS Cloud Practitioner'],
                  links: {
                    github: 'https://github.com/arjun',
                    linkedin: 'https://linkedin.com/in/arjun',
                  },
                }),
              },
            },
          ],
        },
      };

      axios.post.mockResolvedValueOnce(mockOpenAIResponse);

      const rawText = 'Resume text with TypeScript, React, and Leadership';
      const result = await parseResumeData(rawText);

      expect(axios.post).toHaveBeenCalledWith(
        'https://test-openai.openai.azure.com/openai/v1/chat/completions?api-version=preview',
        expect.objectContaining({
          model: 'gpt-4o-mini',
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            'api-key': 'test-openai-key',
          }),
        })
      );
      const postUrl = axios.post.mock.calls[0][0];
      expect(postUrl).not.toContain('/openai/deployments/');

      expect(result.method).toBe('azure-openai');
      expect(result.skills).toHaveLength(3);
      expect(result.skills[0].name).toBe('TypeScript');
      expect(result.education[0].institution).toBe('IIT Delhi');
    });

    it('falls back to rule-based parsing when no AI providers are configured', async () => {
      delete process.env.GROQ_API_KEY;
      delete process.env.AZURE_OPENAI_ENDPOINT;
      delete process.env.AZURE_OPENAI_KEY;

      const rawText = 'SKILLS\nPython, Django, PostgreSQL, Communication';
      const result = await parseResumeData(rawText);

      expect(axios.post).not.toHaveBeenCalled();
      expect(result.method).toBe('rule-based');
      const names = result.skills.map((s) => s.name);
      expect(names).toContain('Python');
      expect(names).toContain('PostgreSQL');
    });

    it('falls back to rule-based parsing when Azure OpenAI call fails', async () => {
      delete process.env.GROQ_API_KEY;
      process.env.AZURE_OPENAI_ENDPOINT = 'https://test-openai.openai.azure.com/openai/v1';
      process.env.AZURE_OPENAI_KEY = 'test-openai-key';

      axios.post.mockRejectedValueOnce(new Error('Azure OpenAI rate limited (429)'));

      const rawText = 'SKILLS\nRust, Go, Docker';
      const result = await parseResumeData(rawText);

      expect(result.method).toBe('rule-based');
      const names = result.skills.map((s) => s.name);
      expect(names).toContain('Rust');
      expect(names).toContain('Docker');
    });
  });
});
