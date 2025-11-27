import { NextRequest, NextResponse } from 'next/server';
import { POST, GET } from '@/app/api/predict/route';
import { PrismaClient } from '@prisma/client';

jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    listing: {
      findMany: jest.fn(),
    },
  };
  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
  };
});

describe('/api/predict - POST', () => {
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = new PrismaClient();
    jest.clearAllMocks();
  });

  it('should return 400 when comuna is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/predict', {
      method: 'POST',
      body: JSON.stringify({ m2: 50 }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Comuna y metros cuadrados son requeridos');
  });

  it('should return 400 when m2 is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/predict', {
      method: 'POST',
      body: JSON.stringify({ comuna: 'Santiago' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Comuna y metros cuadrados son requeridos');
  });

  it('should return 400 when both parameters are missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/predict', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Comuna y metros cuadrados son requeridos');
  });

  it('should return 404 when comuna has no listings', async () => {
    mockPrisma.listing.findMany.mockResolvedValue([]);

    const request = new NextRequest('http://localhost:3000/api/predict', {
      method: 'POST',
      body: JSON.stringify({ comuna: 'NonExistent', m2: 50 }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('No se encontraron propiedades en la comuna especificada');
  });

  it('should calculate percentiles correctly with multiple listings', async () => {
    mockPrisma.listing.findMany.mockResolvedValue([
      { precio: 100000, m2: 50 }, // 2000 per m2 -> 50m2 = 100000
      { precio: 150000, m2: 50 }, // 3000 per m2 -> 50m2 = 150000
      { precio: 200000, m2: 50 }, // 4000 per m2 -> 50m2 = 200000
      { precio: 250000, m2: 50 }, // 5000 per m2 -> 50m2 = 250000
    ]);

    const request = new NextRequest('http://localhost:3000/api/predict', {
      method: 'POST',
      body: JSON.stringify({ comuna: 'Santiago', m2: 50 }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.min).toBe(100000);
    expect(data.max).toBe(250000);
    expect(data.p25).toBe(100000);
    expect(data.p50).toBe(150000);
    expect(data.p75).toBe(200000);
    expect(data.avg).toBe(175000);
    expect(data.count).toBe(4);
    expect(data.comuna).toBe('Santiago');
    expect(data.m2).toBe(50);
  });

  it('should handle single listing correctly', async () => {
    mockPrisma.listing.findMany.mockResolvedValue([
      { precio: 150000, m2: 50 }, // 3000 per m2
    ]);

    const request = new NextRequest('http://localhost:3000/api/predict', {
      method: 'POST',
      body: JSON.stringify({ comuna: 'Santiago', m2: 60 }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.min).toBe(180000); // 3000 * 60
    expect(data.max).toBe(180000);
    expect(data.p25).toBe(180000);
    expect(data.p50).toBe(180000);
    expect(data.p75).toBe(180000);
    expect(data.avg).toBe(180000);
    expect(data.count).toBe(1);
  });

  it('should calculate rent based on different m2 values', async () => {
    mockPrisma.listing.findMany.mockResolvedValue([
      { precio: 200000, m2: 100 }, // 2000 per m2
    ]);

    const request = new NextRequest('http://localhost:3000/api/predict', {
      method: 'POST',
      body: JSON.stringify({ comuna: 'Santiago', m2: 50 }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.min).toBe(100000); // (200000/100) * 50 = 100000
  });

  it('should format prices correctly in CLP', async () => {
    mockPrisma.listing.findMany.mockResolvedValue([
      { precio: 1000000, m2: 50 },
    ]);

    const request = new NextRequest('http://localhost:3000/api/predict', {
      method: 'POST',
      body: JSON.stringify({ comuna: 'Santiago', m2: 50 }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.minFmt).toMatch(/CLP/);
    expect(data.maxFmt).toMatch(/CLP/);
    expect(data.avgFmt).toMatch(/CLP/);
    expect(data.p25Fmt).toMatch(/CLP/);
    expect(data.p50Fmt).toMatch(/CLP/);
    expect(data.p75Fmt).toMatch(/CLP/);
  });

  it('should handle case-insensitive comuna matching', async () => {
    mockPrisma.listing.findMany.mockResolvedValue([
      { precio: 150000, m2: 50 },
    ]);

    const request = new NextRequest('http://localhost:3000/api/predict', {
      method: 'POST',
      body: JSON.stringify({ comuna: 'SANTIAGO', m2: 50 }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockPrisma.listing.findMany).toHaveBeenCalledWith({
      where: {
        comuna: {
          equals: 'SANTIAGO',
          mode: 'insensitive',
        },
      },
      select: {
        precio: true,
        m2: true,
      },
    });
  });

  it('should return 500 on database error', async () => {
    mockPrisma.listing.findMany.mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/predict', {
      method: 'POST',
      body: JSON.stringify({ comuna: 'Santiago', m2: 50 }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Error al procesar la solicitud');
  });

  it('should round rent values correctly', async () => {
    mockPrisma.listing.findMany.mockResolvedValue([
      { precio: 100001, m2: 100 }, // 1000.01 per m2
    ]);

    const request = new NextRequest('http://localhost:3000/api/predict', {
      method: 'POST',
      body: JSON.stringify({ comuna: 'Santiago', m2: 50 }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Number.isInteger(data.min)).toBe(true);
    expect(Number.isInteger(data.avg)).toBe(true);
  });
});

describe('/api/predict - GET', () => {
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = new PrismaClient();
    jest.clearAllMocks();
  });

  it('should return 400 when comuna query param is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/predict?m2=50');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Comuna y metros cuadrados son requeridos');
  });

  it('should return 400 when m2 query param is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/predict?comuna=Santiago');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Comuna y metros cuadrados son requeridos');
  });

  it('should handle GET request with valid query params', async () => {
    mockPrisma.listing.findMany.mockResolvedValue([
      { precio: 100000, m2: 50 },
      { precio: 150000, m2: 50 },
    ]);

    const request = new NextRequest('http://localhost:3000/api/predict?comuna=Santiago&m2=50');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.comuna).toBe('Santiago');
    expect(data.m2).toBe(50);
    expect(data.count).toBe(2);
  });

  it('should return 404 when comuna has no listings', async () => {
    mockPrisma.listing.findMany.mockResolvedValue([]);

    const request = new NextRequest('http://localhost:3000/api/predict?comuna=NonExistent&m2=50');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('No se encontraron propiedades en la comuna especificada');
  });

  it('should return 500 on database error', async () => {
    mockPrisma.listing.findMany.mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/predict?comuna=Santiago&m2=50');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Error al procesar la solicitud');
  });

  it('should handle numeric m2 conversion correctly', async () => {
    mockPrisma.listing.findMany.mockResolvedValue([
      { precio: 150000, m2: 50 },
    ]);

    const request = new NextRequest('http://localhost:3000/api/predict?comuna=Santiago&m2=75');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.m2).toBe(75);
    expect(typeof data.m2).toBe('number');
  });
});
