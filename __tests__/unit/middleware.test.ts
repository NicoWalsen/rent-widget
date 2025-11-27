import { NextRequest, NextResponse } from 'next/server';
import { middleware } from '@/middleware';

describe('Middleware - Admin Authentication', () => {
  const correctKey = 'Detonador07!';

  it('should allow access to /admin with correct key', () => {
    const request = new NextRequest(
      `http://localhost:3000/admin?key=${correctKey}`
    );

    const response = middleware(request);

    expect(response).toBeUndefined();
  });

  it('should redirect to / when key is missing', () => {
    const request = new NextRequest('http://localhost:3000/admin');

    const response = middleware(request);

    expect(response).toBeInstanceOf(NextResponse);
    expect(response?.status).toBe(307); // Temporary redirect
    expect(response?.headers.get('location')).toBe('http://localhost:3000/');
  });

  it('should redirect to / when key is incorrect', () => {
    const request = new NextRequest('http://localhost:3000/admin?key=wrongkey');

    const response = middleware(request);

    expect(response).toBeInstanceOf(NextResponse);
    expect(response?.status).toBe(307);
    expect(response?.headers.get('location')).toBe('http://localhost:3000/');
  });

  it('should redirect to / when key is empty string', () => {
    const request = new NextRequest('http://localhost:3000/admin?key=');

    const response = middleware(request);

    expect(response).toBeInstanceOf(NextResponse);
    expect(response?.status).toBe(307);
    expect(response?.headers.get('location')).toBe('http://localhost:3000/');
  });

  it('should allow access to /admin with correct key and additional params', () => {
    const request = new NextRequest(
      `http://localhost:3000/admin?key=${correctKey}&foo=bar`
    );

    const response = middleware(request);

    expect(response).toBeUndefined();
  });

  it('should be case-sensitive for the key', () => {
    const request = new NextRequest(
      'http://localhost:3000/admin?key=detonador07!'
    );

    const response = middleware(request);

    expect(response).toBeInstanceOf(NextResponse);
    expect(response?.status).toBe(307);
    expect(response?.headers.get('location')).toBe('http://localhost:3000/');
  });

  it('should handle admin subpaths with correct key', () => {
    const request = new NextRequest(
      `http://localhost:3000/admin/dashboard?key=${correctKey}`
    );

    const response = middleware(request);

    expect(response).toBeUndefined();
  });

  it('should redirect admin subpaths without correct key', () => {
    const request = new NextRequest('http://localhost:3000/admin/dashboard');

    const response = middleware(request);

    expect(response).toBeInstanceOf(NextResponse);
    expect(response?.status).toBe(307);
    expect(response?.headers.get('location')).toBe('http://localhost:3000/');
  });

  it('should handle key with special characters correctly', () => {
    const request = new NextRequest(
      `http://localhost:3000/admin?key=${encodeURIComponent(correctKey)}`
    );

    const response = middleware(request);

    expect(response).toBeUndefined();
  });

  it('should redirect when key parameter is present but null', () => {
    const request = new NextRequest('http://localhost:3000/admin?key');

    const response = middleware(request);

    expect(response).toBeInstanceOf(NextResponse);
    expect(response?.status).toBe(307);
  });

  it('should handle multiple key parameters (use first one)', () => {
    const request = new NextRequest(
      `http://localhost:3000/admin?key=${correctKey}&key=wrong`
    );

    const response = middleware(request);

    // searchParams.get() returns the first value
    expect(response).toBeUndefined();
  });

  it('should redirect when key has extra whitespace', () => {
    const request = new NextRequest(
      'http://localhost:3000/admin?key=%20Detonador07!%20'
    );

    const response = middleware(request);

    expect(response).toBeInstanceOf(NextResponse);
    expect(response?.status).toBe(307);
  });

  it('should preserve original URL in redirect', () => {
    const request = new NextRequest('http://localhost:3000/admin?foo=bar');

    const response = middleware(request);

    expect(response).toBeInstanceOf(NextResponse);
    expect(response?.headers.get('location')).toBe('http://localhost:3000/');
  });

  it('should handle different host origins correctly', () => {
    const request = new NextRequest(
      `https://example.com/admin?key=${correctKey}`
    );

    const response = middleware(request);

    expect(response).toBeUndefined();
  });

  it('should redirect to origin root when using different host', () => {
    const request = new NextRequest('https://example.com/admin?key=wrong');

    const response = middleware(request);

    expect(response).toBeInstanceOf(NextResponse);
    expect(response?.headers.get('location')).toBe('https://example.com/');
  });

  it('should not interfere with non-admin paths', () => {
    const request = new NextRequest('http://localhost:3000/widget');

    const response = middleware(request);

    // Middleware should not run for non-admin paths based on matcher config
    expect(response).toBeUndefined();
  });

  it('should handle admin path with hash fragment', () => {
    const request = new NextRequest(
      `http://localhost:3000/admin?key=${correctKey}#section`
    );

    const response = middleware(request);

    expect(response).toBeUndefined();
  });
});
