import { describe, it, expect } from 'vitest';
import { sanitizeString, sanitizeEmail, sanitizeNumber, sanitizeUrl } from '../sanitize';

/**
 * Tests for input sanitization functions
 */
describe('Sanitization Functions', () => {
  describe('sanitizeString', () => {
    it('should remove HTML tags', () => {
      const input = '<script>alert("xss")</script>Hello';
      const result = sanitizeString(input);
      expect(result).toBe('Hello');
      expect(result).not.toContain('<script>');
    });

    it('should remove event handlers', () => {
      const input = 'Hello onclick="alert(1)" World';
      const result = sanitizeString(input);
      expect(result).not.toContain('onclick');
    });

    it('should remove javascript: protocol', () => {
      const input = 'javascript:alert(1)';
      const result = sanitizeString(input);
      expect(result).not.toContain('javascript:');
    });

    it('should trim whitespace', () => {
      const input = '  Hello World  ';
      const result = sanitizeString(input);
      expect(result).toBe('Hello World');
    });

    it('should handle empty string', () => {
      const result = sanitizeString('');
      expect(result).toBe('');
    });

    it('should handle non-string input', () => {
      const result = sanitizeString(null as any);
      expect(result).toBe('');
    });
  });

  describe('sanitizeEmail', () => {
    it('should convert to lowercase', () => {
      const input = 'Test@Example.COM';
      const result = sanitizeEmail(input);
      expect(result).toBe('test@example.com');
    });

    it('should remove invalid characters', () => {
      const input = 'test<script>@example.com';
      const result = sanitizeEmail(input);
      expect(result).not.toContain('<script>');
    });

    it('should trim whitespace', () => {
      const input = '  test@example.com  ';
      const result = sanitizeEmail(input);
      expect(result).toBe('test@example.com');
    });
  });

  describe('sanitizeNumber', () => {
    it('should parse valid number string', () => {
      const input = '123.45';
      const result = sanitizeNumber(input);
      expect(result).toBe(123.45);
    });

    it('should remove non-numeric characters', () => {
      const input = 'abc123.45def';
      const result = sanitizeNumber(input);
      expect(result).toBe(123.45);
    });

    it('should return 0 for invalid input', () => {
      const input = 'abc';
      const result = sanitizeNumber(input);
      expect(result).toBe(0);
    });

    it('should handle number input', () => {
      const input = 123.45;
      const result = sanitizeNumber(input);
      expect(result).toBe(123.45);
    });
  });

  describe('sanitizeUrl', () => {
    it('should allow valid http URL', () => {
      const input = 'http://example.com';
      const result = sanitizeUrl(input);
      expect(result).toBe('http://example.com');
    });

    it('should allow valid https URL', () => {
      const input = 'https://example.com';
      const result = sanitizeUrl(input);
      expect(result).toBe('https://example.com');
    });

    it('should allow relative URL', () => {
      const input = '/path/to/page';
      const result = sanitizeUrl(input);
      expect(result).toBe('/path/to/page');
    });

    it('should remove javascript: protocol', () => {
      const input = 'javascript:alert(1)';
      const result = sanitizeUrl(input);
      expect(result).toBe('');
    });

    it('should reject invalid URL', () => {
      const input = 'invalid-url';
      const result = sanitizeUrl(input);
      expect(result).toBe('');
    });
  });
});

