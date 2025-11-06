import { describe, it, expect } from 'vitest';
import { loginSchema, signUpSchema } from '../validation';

/**
 * Tests for authentication validation schemas
 */
describe('Validation Schemas', () => {
  describe('loginSchema', () => {
    it('should validate correct login data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'password123',
      };
      
      const result = loginSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'password123',
      };
      
      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('email');
      }
    });

    it('should reject short password', () => {
      const invalidData = {
        email: 'test@example.com',
        password: '12345', // Less than 6 characters
      };
      
      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('password');
      }
    });

    it('should reject empty email', () => {
      const invalidData = {
        email: '',
        password: 'password123',
      };
      
      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('signUpSchema', () => {
    it('should validate correct signup data', () => {
      const validData = {
        fullName: 'John Doe',
        email: 'test@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
      };
      
      const result = signUpSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject mismatched passwords', () => {
      const invalidData = {
        fullName: 'John Doe',
        email: 'test@example.com',
        password: 'Password123',
        confirmPassword: 'Password456',
      };
      
      const result = signUpSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('confirmPassword');
      }
    });

    it('should reject weak password', () => {
      const invalidData = {
        fullName: 'John Doe',
        email: 'test@example.com',
        password: 'password', // No uppercase or number
        confirmPassword: 'password',
      };
      
      const result = signUpSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('password');
      }
    });

    it('should reject invalid full name', () => {
      const invalidData = {
        fullName: 'J', // Too short
        email: 'test@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
      };
      
      const result = signUpSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});

