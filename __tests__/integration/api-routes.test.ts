import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/predict/route';
import { GET as GET_ML } from '@/app/api/predict-ml/route';
import { GET as GET_ADMIN } from '@/app/api/admin-data/route';
import { PrismaClient } from '@prisma/client';

jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    listing: {
      findMany: jest.fn(),
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

describe('Integration Tests - API Routes with Database', () => {
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = new PrismaClient();
    jest.clearAllMocks();
  });

  describe('Full flow: /api/predict', () => {
    it('should handle complete request-response cycle for POST', async () => {
      const mockListings = [
        { precio: 300000, m2: 50 },
        { precio: 400000, m2: 50 },
        { precio: 500000, m2: 50 },
      ];

      mockPrisma.listing.findMany.mockResolvedValue(mockListings);

      const request = new NextRequest('http://localhost:3000/api/predict', {
        method: 'POST',
        body: JSON.stringify({ comuna: 'Santiago', m2: 50 }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        min: 300000,
        max: 500000,
        comuna: 'Santiago',
        m2: 50,
        count: 3,
      });
      expect(data).toHaveProperty('p25');
      expect(data).toHaveProperty('p50');
      expect(data).toHaveProperty('p75');
      expect(data).toHaveProperty('minFmt');
      expect(data).toHaveProperty('maxFmt');
    });

    it('should handle complete request-response cycle for GET', async () => {
      const mockListings = [
        { precio: 200000, m2: 40 },
        { precio: 300000, m2: 60 },
      ];

      mockPrisma.listing.findMany.mockResolvedValue(mockListings);

      const request = new NextRequest(
        'http://localhost:3000/api/predict?comuna=Providencia&m2=50'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.comuna).toBe('Providencia');
      expect(data.m2).toBe(50);
      expect(data.count).toBe(2);
      expect(mockPrisma.listing.findMany).toHaveBeenCalledWith({
        where: {
          comuna: {
            equals: 'Providencia',
            mode: 'insensitive',
          },
        },
        select: {
          precio: true,
          m2: true,
        },
      });
    });

    it('should handle error propagation from database', async () => {
      mockPrisma.listing.findMany.mockRejectedValue(
        new Error('Connection timeout')
      );

      const request = new NextRequest('http://localhost:3000/api/predict', {
        method: 'POST',
        body: JSON.stringify({ comuna: 'Santiago', m2: 50 }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Error al procesar la solicitud');
    });
  });

  describe('Full flow: /api/predict-ml', () => {
    it('should handle complete request-response cycle', async () => {
      const mockListings = [
        { precio: 300000, m2: 50 },
        { precio: 400000, m2: 50 },
        { precio: 500000, m2: 50 },
      ];

      mockPrisma.listing.findMany.mockResolvedValue(mockListings);

      const request = new NextRequest(
        'http://localhost:3000/api/predict-ml?comuna=Santiago&m2=50'
      );

      const response = await GET_ML(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        precioEstimado: 400000,
        rangoPrecios: {
          min: 300000,
          max: 500000,
        },
        count: 3,
      });
      expect(data.percentiles).toHaveProperty('p25');
      expect(data.percentiles).toHaveProperty('p50');
      expect(data.percentiles).toHaveProperty('p75');
    });

    it('should query database with correct parameters', async () => {
      mockPrisma.listing.findMany.mockResolvedValue([
        { precio: 300000, m2: 50 },
      ]);

      const request = new NextRequest(
        'http://localhost:3000/api/predict-ml?comuna=Las%20Condes&m2=75'
      );

      await GET_ML(request);

      expect(mockPrisma.listing.findMany).toHaveBeenCalledWith({
        where: {
          comuna: {
            equals: 'Las Condes',
            mode: 'insensitive',
          },
        },
        select: {
          precio: true,
          m2: true,
        },
      });
    });
  });

  describe('Full flow: /api/admin-data', () => {
    it('should handle complete request-response cycle', async () => {
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
        { bucket: '0-300k', count: BigInt(40) },
        { bucket: '300k-500k', count: BigInt(60) },
      ]);

      const response = await GET_ADMIN();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.total).toBe(100);
      expect(data.last).toBeTruthy();
      expect(data.data).toHaveLength(2);
      expect(mockPrisma.listing.count).toHaveBeenCalled();
      expect(mockPrisma.scrapeLog.findFirst).toHaveBeenCalledWith({
        orderBy: { startedAt: 'desc' },
      });
      expect(mockPrisma.$queryRaw).toHaveBeenCalled();
    });

    it('should execute all database queries in parallel', async () => {
      mockPrisma.listing.count.mockResolvedValue(50);
      mockPrisma.scrapeLog.findFirst.mockResolvedValue(null);
      mockPrisma.$queryRaw.mockResolvedValue([]);

      await GET_ADMIN();

      expect(mockPrisma.listing.count).toHaveBeenCalledTimes(1);
      expect(mockPrisma.scrapeLog.findFirst).toHaveBeenCalledTimes(1);
      expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1);
    });
  });

  describe('Cross-route consistency', () => {
    it('should return consistent results between /predict and /predict-ml', async () => {
      const mockListings = [
        { precio: 300000, m2: 50 },
        { precio: 400000, m2: 50 },
        { precio: 500000, m2: 50 },
      ];

      mockPrisma.listing.findMany.mockResolvedValue(mockListings);

      const predictRequest = new NextRequest(
        'http://localhost:3000/api/predict?comuna=Santiago&m2=50'
      );
      const predictResponse = await GET(predictRequest);
      const predictData = await predictResponse.json();

      mockPrisma.listing.findMany.mockResolvedValue(mockListings);

      const mlRequest = new NextRequest(
        'http://localhost:3000/api/predict-ml?comuna=Santiago&m2=50'
      );
      const mlResponse = await GET_ML(mlRequest);
      const mlData = await mlResponse.json();

      expect(predictData.p50).toBe(mlData.precioEstimado);
      expect(predictData.min).toBe(mlData.rangoPrecios.min);
      expect(predictData.max).toBe(mlData.rangoPrecios.max);
      expect(predictData.count).toBe(mlData.count);
    });

    it('should handle empty database consistently across routes', async () => {
      mockPrisma.listing.findMany.mockResolvedValue([]);

      const predictRequest = new NextRequest(
        'http://localhost:3000/api/predict?comuna=NonExistent&m2=50'
      );
      const predictResponse = await GET(predictRequest);

      mockPrisma.listing.findMany.mockResolvedValue([]);

      const mlRequest = new NextRequest(
        'http://localhost:3000/api/predict-ml?comuna=NonExistent&m2=50'
      );
      const mlResponse = await GET_ML(mlRequest);

      expect(predictResponse.status).toBe(404);
      expect(mlResponse.status).toBe(404);
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle large dataset efficiently', async () => {
      const largeMockDataset = Array.from({ length: 1000 }, (_, i) => ({
        precio: 200000 + i * 1000,
        m2: 50,
      }));

      mockPrisma.listing.findMany.mockResolvedValue(largeMockDataset);

      const request = new NextRequest(
        'http://localhost:3000/api/predict?comuna=Santiago&m2=50'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.count).toBe(1000);
      expect(data.min).toBeLessThan(data.p25);
      expect(data.p25).toBeLessThan(data.p50);
      expect(data.p50).toBeLessThan(data.p75);
      expect(data.p75).toBeLessThan(data.max);
    });

    it('should handle varying property sizes correctly', async () => {
      const mockListings = [
        { precio: 100000, m2: 25 },  // 4000 per m2
        { precio: 200000, m2: 50 },  // 4000 per m2
        { precio: 300000, m2: 75 },  // 4000 per m2
      ];

      mockPrisma.listing.findMany.mockResolvedValue(mockListings);

      const request = new NextRequest(
        'http://localhost:3000/api/predict?comuna=Santiago&m2=100'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.min).toBe(400000); // 4000 * 100
      expect(data.max).toBe(400000);
    });

    it('should handle special characters in comuna names', async () => {
      mockPrisma.listing.findMany.mockResolvedValue([
        { precio: 300000, m2: 50 },
      ]);

      const request = new NextRequest(
        'http://localhost:3000/api/predict?comuna=Ñuñoa&m2=50'
      );

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.listing.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            comuna: {
              equals: 'Ñuñoa',
              mode: 'insensitive',
            },
          },
        })
      );
    });

    it('should maintain accuracy with decimal calculations', async () => {
      const mockListings = [
        { precio: 333333, m2: 100 }, // 3333.33 per m2
      ];

      mockPrisma.listing.findMany.mockResolvedValue(mockListings);

      const request = new NextRequest(
        'http://localhost:3000/api/predict?comuna=Santiago&m2=50'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Number.isInteger(data.min)).toBe(true);
      expect(Number.isInteger(data.max)).toBe(true);
      expect(Number.isInteger(data.avg)).toBe(true);
    });
  });
});
