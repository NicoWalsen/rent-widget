import { NextRequest } from 'next/server';
import { GET } from '@/app/api/predict-ml/route';
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

describe('/api/predict-ml - GET', () => {
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = new PrismaClient();
    jest.clearAllMocks();
  });

  it('should return 400 when comuna is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/predict-ml?m2=50');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Comuna y metros cuadrados son requeridos');
  });

  it('should return 400 when m2 is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/predict-ml?comuna=Santiago');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Comuna y metros cuadrados son requeridos');
  });

  it('should return 400 when both parameters are missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/predict-ml');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Comuna y metros cuadrados son requeridos');
  });

  it('should return 404 when comuna has no listings', async () => {
    mockPrisma.listing.findMany.mockResolvedValue([]);

    const request = new NextRequest('http://localhost:3000/api/predict-ml?comuna=NonExistent&m2=50');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('No se encontraron propiedades en la comuna especificada');
  });

  it('should return correct response structure with valid data', async () => {
    mockPrisma.listing.findMany.mockResolvedValue([
      { precio: 100000, m2: 50 },
      { precio: 150000, m2: 50 },
      { precio: 200000, m2: 50 },
      { precio: 250000, m2: 50 },
    ]);

    const request = new NextRequest('http://localhost:3000/api/predict-ml?comuna=Santiago&m2=50');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('precioEstimado');
    expect(data).toHaveProperty('rangoPrecios');
    expect(data).toHaveProperty('percentiles');
    expect(data).toHaveProperty('count');
    expect(data.rangoPrecios).toHaveProperty('min');
    expect(data.rangoPrecios).toHaveProperty('max');
    expect(data.percentiles).toHaveProperty('p25');
    expect(data.percentiles).toHaveProperty('p50');
    expect(data.percentiles).toHaveProperty('p75');
  });

  it('should calculate percentiles correctly', async () => {
    mockPrisma.listing.findMany.mockResolvedValue([
      { precio: 100000, m2: 50 }, // 2000 per m2
      { precio: 150000, m2: 50 }, // 3000 per m2
      { precio: 200000, m2: 50 }, // 4000 per m2
      { precio: 250000, m2: 50 }, // 5000 per m2
    ]);

    const request = new NextRequest('http://localhost:3000/api/predict-ml?comuna=Santiago&m2=50');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.precioEstimado).toBe(150000); // p50
    expect(data.rangoPrecios.min).toBe(100000);
    expect(data.rangoPrecios.max).toBe(250000);
    expect(data.percentiles.p25).toBe(100000);
    expect(data.percentiles.p50).toBe(150000);
    expect(data.percentiles.p75).toBe(200000);
    expect(data.count).toBe(4);
  });

  it('should handle single listing correctly', async () => {
    mockPrisma.listing.findMany.mockResolvedValue([
      { precio: 150000, m2: 50 },
    ]);

    const request = new NextRequest('http://localhost:3000/api/predict-ml?comuna=Santiago&m2=60');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.precioEstimado).toBe(180000); // (150000/50) * 60
    expect(data.rangoPrecios.min).toBe(180000);
    expect(data.rangoPrecios.max).toBe(180000);
    expect(data.percentiles.p25).toBe(180000);
    expect(data.percentiles.p50).toBe(180000);
    expect(data.percentiles.p75).toBe(180000);
    expect(data.count).toBe(1);
  });

  it('should calculate rent based on different m2 values', async () => {
    mockPrisma.listing.findMany.mockResolvedValue([
      { precio: 200000, m2: 100 }, // 2000 per m2
    ]);

    const request = new NextRequest('http://localhost:3000/api/predict-ml?comuna=Santiago&m2=50');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.precioEstimado).toBe(100000); // (200000/100) * 50
    expect(data.rangoPrecios.min).toBe(100000);
    expect(data.rangoPrecios.max).toBe(100000);
  });

  it('should handle case-insensitive comuna matching', async () => {
    mockPrisma.listing.findMany.mockResolvedValue([
      { precio: 150000, m2: 50 },
    ]);

    const request = new NextRequest('http://localhost:3000/api/predict-ml?comuna=SANTIAGO&m2=50');

    const response = await GET(request);

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

    const request = new NextRequest('http://localhost:3000/api/predict-ml?comuna=Santiago&m2=50');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Error al procesar la solicitud');
  });

  it('should round rent values correctly', async () => {
    mockPrisma.listing.findMany.mockResolvedValue([
      { precio: 100001, m2: 100 }, // 1000.01 per m2
    ]);

    const request = new NextRequest('http://localhost:3000/api/predict-ml?comuna=Santiago&m2=50');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Number.isInteger(data.precioEstimado)).toBe(true);
    expect(Number.isInteger(data.rangoPrecios.min)).toBe(true);
    expect(Number.isInteger(data.rangoPrecios.max)).toBe(true);
  });

  it('should handle numeric m2 conversion correctly', async () => {
    mockPrisma.listing.findMany.mockResolvedValue([
      { precio: 150000, m2: 50 },
    ]);

    const request = new NextRequest('http://localhost:3000/api/predict-ml?comuna=Santiago&m2=75');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.count).toBe(1);
  });

  it('should sort rents array correctly before calculating percentiles', async () => {
    mockPrisma.listing.findMany.mockResolvedValue([
      { precio: 250000, m2: 50 }, // 5000 per m2
      { precio: 100000, m2: 50 }, // 2000 per m2
      { precio: 200000, m2: 50 }, // 4000 per m2
      { precio: 150000, m2: 50 }, // 3000 per m2
    ]);

    const request = new NextRequest('http://localhost:3000/api/predict-ml?comuna=Santiago&m2=50');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.rangoPrecios.min).toBe(100000);
    expect(data.rangoPrecios.max).toBe(250000);
    expect(data.percentiles.p25).toBe(100000);
    expect(data.percentiles.p50).toBe(150000);
    expect(data.percentiles.p75).toBe(200000);
  });

  it('should handle multiple listings with varying m2 values', async () => {
    mockPrisma.listing.findMany.mockResolvedValue([
      { precio: 100000, m2: 100 }, // 1000 per m2
      { precio: 150000, m2: 50 },  // 3000 per m2
      { precio: 200000, m2: 200 }, // 1000 per m2
    ]);

    const request = new NextRequest('http://localhost:3000/api/predict-ml?comuna=Santiago&m2=100');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.count).toBe(3);
    // Should calculate: 1000*100=100000, 3000*100=300000, 1000*100=100000
    // Sorted: [100000, 100000, 300000]
    expect(data.rangoPrecios.min).toBe(100000);
    expect(data.rangoPrecios.max).toBe(300000);
  });
});
