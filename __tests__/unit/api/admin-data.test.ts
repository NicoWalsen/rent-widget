import { NextRequest } from 'next/server';
import { GET } from '@/app/api/admin-data/route';
import { PrismaClient } from '@prisma/client';

jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    listing: {
      count: jest.fn(),
    },
    scrapeLog: {
      findFirst: jest.fn(),
    },
    $queryRaw: jest.fn(),
  };
  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
  };
});

describe('/api/admin-data - GET', () => {
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = new PrismaClient();
    jest.clearAllMocks();
  });

  it('should return admin data with total, last scrape, and price distribution', async () => {
    const mockDate = new Date('2024-01-15T10:00:00Z');

    mockPrisma.listing.count.mockResolvedValue(100);
    mockPrisma.scrapeLog.findFirst.mockResolvedValue({
      id: 1,
      startedAt: mockDate,
      created: 10,
      updated: 5,
      durationMs: 5000,
    });
    mockPrisma.$queryRaw.mockResolvedValue([
      { bucket: '0-300k', count: BigInt(20) },
      { bucket: '300k-500k', count: BigInt(30) },
      { bucket: '500k-700k', count: BigInt(25) },
      { bucket: '700k-1M', count: BigInt(15) },
      { bucket: '1M+', count: BigInt(10) },
    ]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('total');
    expect(data).toHaveProperty('last');
    expect(data).toHaveProperty('data');
    expect(data.total).toBe(100);
    expect(data.last).toBeTruthy();
    expect(Array.isArray(data.data)).toBe(true);
    expect(data.data.length).toBe(5);
  });

  it('should return null for last when no scrape logs exist', async () => {
    mockPrisma.listing.count.mockResolvedValue(50);
    mockPrisma.scrapeLog.findFirst.mockResolvedValue(null);
    mockPrisma.$queryRaw.mockResolvedValue([
      { bucket: '0-300k', count: BigInt(50) },
    ]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.total).toBe(50);
    expect(data.last).toBeNull();
  });

  it('should return zero total when no listings exist', async () => {
    mockPrisma.listing.count.mockResolvedValue(0);
    mockPrisma.scrapeLog.findFirst.mockResolvedValue(null);
    mockPrisma.$queryRaw.mockResolvedValue([]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.total).toBe(0);
    expect(data.last).toBeNull();
    expect(data.data).toEqual([]);
  });

  it('should call listing.count to get total count', async () => {
    mockPrisma.listing.count.mockResolvedValue(75);
    mockPrisma.scrapeLog.findFirst.mockResolvedValue(null);
    mockPrisma.$queryRaw.mockResolvedValue([]);

    await GET();

    expect(mockPrisma.listing.count).toHaveBeenCalledTimes(1);
  });

  it('should call scrapeLog.findFirst with correct orderBy', async () => {
    mockPrisma.listing.count.mockResolvedValue(100);
    mockPrisma.scrapeLog.findFirst.mockResolvedValue(null);
    mockPrisma.$queryRaw.mockResolvedValue([]);

    await GET();

    expect(mockPrisma.scrapeLog.findFirst).toHaveBeenCalledWith({
      orderBy: { startedAt: 'desc' },
    });
  });

  it('should execute raw SQL query for price distribution', async () => {
    mockPrisma.listing.count.mockResolvedValue(100);
    mockPrisma.scrapeLog.findFirst.mockResolvedValue(null);
    mockPrisma.$queryRaw.mockResolvedValue([
      { bucket: '0-300k', count: BigInt(40) },
      { bucket: '300k-500k', count: BigInt(60) },
    ]);

    await GET();

    expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it('should format the last scrape date as locale string', async () => {
    const mockDate = new Date('2024-01-15T10:30:00Z');

    mockPrisma.listing.count.mockResolvedValue(100);
    mockPrisma.scrapeLog.findFirst.mockResolvedValue({
      id: 1,
      startedAt: mockDate,
      created: 10,
      updated: 5,
      durationMs: 5000,
    });
    mockPrisma.$queryRaw.mockResolvedValue([]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(typeof data.last).toBe('string');
    expect(data.last).toBeTruthy();
  });

  it('should handle all price buckets correctly', async () => {
    mockPrisma.listing.count.mockResolvedValue(100);
    mockPrisma.scrapeLog.findFirst.mockResolvedValue(null);
    mockPrisma.$queryRaw.mockResolvedValue([
      { bucket: '0-300k', count: BigInt(20) },
      { bucket: '300k-500k', count: BigInt(30) },
      { bucket: '500k-700k', count: BigInt(25) },
      { bucket: '700k-1M', count: BigInt(15) },
      { bucket: '1M+', count: BigInt(10) },
    ]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toHaveLength(5);
    expect(data.data[0].bucket).toBe('0-300k');
    expect(data.data[1].bucket).toBe('300k-500k');
    expect(data.data[2].bucket).toBe('500k-700k');
    expect(data.data[3].bucket).toBe('700k-1M');
    expect(data.data[4].bucket).toBe('1M+');
  });

  it('should handle partial bucket data', async () => {
    mockPrisma.listing.count.mockResolvedValue(50);
    mockPrisma.scrapeLog.findFirst.mockResolvedValue(null);
    mockPrisma.$queryRaw.mockResolvedValue([
      { bucket: '300k-500k', count: BigInt(30) },
      { bucket: '500k-700k', count: BigInt(20) },
    ]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toHaveLength(2);
  });

  it('should handle BigInt counts from database', async () => {
    mockPrisma.listing.count.mockResolvedValue(100);
    mockPrisma.scrapeLog.findFirst.mockResolvedValue(null);
    mockPrisma.$queryRaw.mockResolvedValue([
      { bucket: '0-300k', count: BigInt(9007199254740991) }, // Max safe integer + 1
    ]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data[0].count).toBeTruthy();
  });

  it('should return data even when scrape log has startedAt as null', async () => {
    mockPrisma.listing.count.mockResolvedValue(100);
    mockPrisma.scrapeLog.findFirst.mockResolvedValue({
      id: 1,
      startedAt: null,
      created: 10,
      updated: 5,
      durationMs: 5000,
    });
    mockPrisma.$queryRaw.mockResolvedValue([
      { bucket: '0-300k', count: BigInt(100) },
    ]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.last).toBeNull();
  });

  it('should handle multiple scrape logs and return the most recent', async () => {
    const recentDate = new Date('2024-01-20T10:00:00Z');

    mockPrisma.listing.count.mockResolvedValue(100);
    mockPrisma.scrapeLog.findFirst.mockResolvedValue({
      id: 5,
      startedAt: recentDate,
      created: 20,
      updated: 10,
      durationMs: 6000,
    });
    mockPrisma.$queryRaw.mockResolvedValue([]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockPrisma.scrapeLog.findFirst).toHaveBeenCalledWith({
      orderBy: { startedAt: 'desc' },
    });
  });
});
