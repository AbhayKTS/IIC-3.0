const axios = require('axios');
const logger = require('../utils/logger');
const { KNOWN_SKILLS } = require('../config/knownSkills');

const OPENAI_API_VERSION = '2024-08-01-preview';
const MAX_RAW_TEXT_LENGTH = 6000;

/**
 * Splits raw resume text into sections based on standard resume headings
 */
const extractSections = (rawText) => {
  const sections = {};
  if (!rawText || typeof rawText !== 'string') return sections;

  const headerRegex = /\n\s*(?:[#=*-]+\s*)?(SKILLS|TECHNICAL SKILLS|EDUCATION|ACADEMIC BACKGROUND|EXPERIENCE|WORK EXPERIENCE|PROJECTS|CERTIFICATIONS|CERTIFICATES|HONORS|ACHIEVEMENTS|PUBLICATIONS|CONTACT|SUMMARY|PROFILE)\b/gi;

  const matches = [];
  let match;
  while ((match = headerRegex.exec(rawText)) !== null) {
    matches.push({
      header: match[1].toUpperCase(),
      index: match.index,
      length: match[0].length,
    });
  }

  if (!matches.length) {
    sections.BODY = rawText;
    return sections;
  }

  for (let i = 0; i < matches.length; i += 1) {
    const current = matches[i];
    const startIndex = current.index + current.length;
    const endIndex = i + 1 < matches.length ? matches[i + 1].index : rawText.length;
    const content = rawText.slice(startIndex, endIndex).trim();

    let normalizedKey = current.header;
    if (/SKILL/i.test(normalizedKey)) normalizedKey = 'SKILLS';
    else if (/EDUCATION|ACADEMIC/i.test(normalizedKey)) normalizedKey = 'EDUCATION';
    else if (/EXPERIENCE/i.test(normalizedKey)) normalizedKey = 'EXPERIENCE';
    else if (/PROJECT/i.test(normalizedKey)) normalizedKey = 'PROJECTS';
    else if (/CERTIF/i.test(normalizedKey)) normalizedKey = 'CERTIFICATIONS';

    sections[normalizedKey] = (sections[normalizedKey] ? sections[normalizedKey] + '\n' : '') + content;
  }

  return sections;
};

/**
 * Extracts links (GitHub, LinkedIn, Portfolio) from text using regex
 */
const extractLinks = (text) => {
  const links = { github: null, linkedin: null, portfolio: null };
  if (!text) return links;

  const githubMatch = text.match(/https?:\/\/(?:www\.)?github\.com\/[A-Za-z0-9_-]+/i) || text.match(/\bgithub\.com\/[A-Za-z0-9_-]+/i);
  if (githubMatch) links.github = githubMatch[0].startsWith('http') ? githubMatch[0] : `https://${githubMatch[0]}`;

  const linkedinMatch = text.match(/https?:\/\/(?:www\.)?linkedin\.com\/in\/[A-Za-z0-9_-]+/i) || text.match(/\blinkedin\.com\/in\/[A-Za-z0-9_-]+/i);
  if (linkedinMatch) links.linkedin = linkedinMatch[0].startsWith('http') ? linkedinMatch[0] : `https://${linkedinMatch[0]}`;

  const portfolioMatch = text.match(/https?:\/\/(?!github|linkedin)[A-Za-z0-9_.-]+\.[A-Za-z]{2,}(?:\/[^\s]*)?/i);
  if (portfolioMatch) links.portfolio = portfolioMatch[0];

  return links;
};

/**
 * Rule-based fallback parsing using regex headers and static knownSkills dictionary
 */
const parseWithRules = (rawText) => {
  const sections = extractSections(rawText);
  const searchCorpus = sections.SKILLS || rawText;

  // Match against known skills
  const matchedSkills = [];
  const lowerCorpus = searchCorpus.toLowerCase();

  for (const skill of KNOWN_SKILLS) {
    const escaped = skill.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Match whole word or exact token where appropriate
    const regex = new RegExp(`(?:^|[^a-zA-Z0-9+#])${escaped}(?:$|[^a-zA-Z0-9+#])`, 'i');
    if (regex.test(searchCorpus) || lowerCorpus.includes(skill.name.toLowerCase())) {
      matchedSkills.push(skill);
    }
  }

  // Deduplicate matched skills by name
  const seen = new Set();
  const uniqueSkills = matchedSkills.filter((s) => {
    const key = s.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Education lines
  const educationSection = sections.EDUCATION || '';
  const education = educationSection
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 4 && !/^[•\-\*]$/.test(l))
    .slice(0, 5)
    .map((line) => ({ degree: line, institution: '', year: '' }));

  // Experience lines
  const expSection = sections.EXPERIENCE || '';
  const experience = expSection
    .split(/\n{2,}|\n(?=[•\-\*]|\d{4})/)
    .map((l) => l.trim())
    .filter((l) => l.length > 5)
    .slice(0, 5)
    .map((entry) => ({ title: entry.split('\n')[0].replace(/^[•\-\*]\s*/, ''), org: '', duration: '', description: entry }));

  // Certifications lines
  const certSection = sections.CERTIFICATIONS || '';
  const certifications = certSection
    .split('\n')
    .map((l) => l.replace(/^[•\-\*]\s*/, '').trim())
    .filter((l) => l.length > 3)
    .slice(0, 8);

  const links = extractLinks(rawText);

  return {
    skills: uniqueSkills,
    education,
    experience,
    certifications,
    links,
    method: 'rule-based',
  };
};

/**
 * Groq chat completion path (Primary)
 */
const parseWithGroq = async (rawText, config) => {
  const truncated = (rawText || '').slice(0, MAX_RAW_TEXT_LENGTH);
  const url = 'https://api.groq.com/openai/v1/chat/completions';

  const prompt = `You are an expert resume parser. Extract structured resume data from the text below and respond ONLY with a valid JSON object matching this exact schema:
{
  "skills": [{"name": "Skill Name", "category": "technical" | "soft"}],
  "education": [{"degree": "...", "institution": "...", "year": "..."}],
  "experience": [{"title": "...", "org": "...", "duration": "...", "description": "..."}],
  "certifications": ["Certification Name"],
  "links": {"github": "URL or null", "linkedin": "URL or null", "portfolio": "URL or null"}
}

Resume Text:
${truncated}`;

  const response = await axios.post(
    url,
    {
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are a precise resume parser. Output ONLY valid JSON matching the requested schema. No markdown formatting, no code fences.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    },
    {
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    }
  );

  const content = response.data?.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error('Empty response from Groq');
  }

  const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const parsed = JSON.parse(cleaned);

  return {
    skills: Array.isArray(parsed.skills) ? parsed.skills : [],
    education: Array.isArray(parsed.education) ? parsed.education : [],
    experience: Array.isArray(parsed.experience) ? parsed.experience : [],
    certifications: Array.isArray(parsed.certifications) ? parsed.certifications : [],
    links: parsed.links || {},
    method: 'groq',
  };
};

/**
 * Azure OpenAI chat completion path (Secondary fallback)
 */
const parseWithAzureOpenAI = async (rawText, config) => {
  const truncated = (rawText || '').slice(0, MAX_RAW_TEXT_LENGTH);
  const endpoint = config.endpoint.replace(/\/+$/, '');
  const url = `${endpoint.replace(/\/+$/, '')}/chat/completions?api-version=preview`;

  const prompt = `You are an expert resume parser. Extract structured resume data from the text below and respond ONLY with a valid JSON object matching this exact schema:
{
  "skills": [{"name": "Skill Name", "category": "technical" | "soft"}],
  "education": [{"degree": "...", "institution": "...", "year": "..."}],
  "experience": [{"title": "...", "org": "...", "duration": "...", "description": "..."}],
  "certifications": ["Certification Name"],
  "links": {"github": "URL or null", "linkedin": "URL or null", "portfolio": "URL or null"}
}

Resume Text:
${truncated}`;

  const response = await axios.post(
    url,
    {
      model: config.deployment,
      messages: [
        {
          role: 'system',
          content: 'You are a precise resume parser. Output ONLY valid JSON matching the requested schema. No markdown formatting, no code fences.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.1,
    },
    {
      headers: {
        'api-key': config.apiKey,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    }
  );

  const content = response.data?.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error('Empty response from Azure OpenAI');
  }

  const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const parsed = JSON.parse(cleaned);

  return {
    skills: Array.isArray(parsed.skills) ? parsed.skills : [],
    education: Array.isArray(parsed.education) ? parsed.education : [],
    experience: Array.isArray(parsed.experience) ? parsed.experience : [],
    certifications: Array.isArray(parsed.certifications) ? parsed.certifications : [],
    links: parsed.links || {},
    method: 'azure-openai',
  };
};

/**
 * Main exported resume parsing function
 * Provider selection order:
 * 1. Groq (Primary path, if GROQ_API_KEY is set)
 * 2. Azure OpenAI (Secondary fallback, if AZURE_OPENAI_ENDPOINT + AZURE_OPENAI_KEY are set)
 * 3. Rule-based parsing (Final fallback if all configured providers fail or none configured)
 *
 * @param {string} rawText - Full raw text of the resume
 * @returns {Promise<{ skills: Array, education: Array, experience: Array, certifications: Array, links: Object, method: 'groq' | 'azure-openai' | 'rule-based' }>}
 */
const parseResumeData = async (rawText) => {
  const groqApiKey = process.env.GROQ_API_KEY;
  const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const azureApiKey = process.env.AZURE_OPENAI_KEY;
  const azureDeployment = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o-mini';

  // 1. Primary path: Groq
  if (groqApiKey) {
    try {
      logger.info('[ResumeParser] Parsing resume using Groq (llama-3.3-70b-versatile)');
      const result = await parseWithGroq(rawText, { apiKey: groqApiKey });
      logger.info('[ResumeParser] Groq parse succeeded');
      return result;
    } catch (err) {
      logger.warn(`[ResumeParser] Groq parse failed: ${err.message}`);
    }
  }

  // 2. Secondary fallback: Azure OpenAI
  if (azureEndpoint && azureApiKey) {
    try {
      logger.info('[ResumeParser] Parsing resume using Azure OpenAI');
      const result = await parseWithAzureOpenAI(rawText, {
        endpoint: azureEndpoint,
        apiKey: azureApiKey,
        deployment: azureDeployment,
      });
      logger.info('[ResumeParser] Azure OpenAI parse succeeded');
      return result;
    } catch (err) {
      logger.warn(`[ResumeParser] Azure OpenAI parse failed: ${err.message}`);
    }
  }

  // 3. Final fallback: Rule-based parsing
  logger.info('[ResumeParser] Falling back to rule-based parsing');
  return parseWithRules(rawText);
};

module.exports = {
  parseResumeData,
  parseWithGroq,
  parseWithAzureOpenAI,
  parseWithRules,
  extractSections,
  extractLinks,
};
