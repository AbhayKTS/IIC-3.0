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

  describe('parseResumeData runtime detection', () => {
    it('uses Azure OpenAI when AZURE_OPENAI_ENDPOINT is configured', async () => {
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

    it('falls back to rule-based parsing when AZURE_OPENAI_ENDPOINT is missing', async () => {
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
