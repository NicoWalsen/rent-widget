import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import AdminPage from '@/app/admin/page';

jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children, data }: any) => <div data-testid="bar-chart" data-chart-data={JSON.stringify(data)}>{children}</div>,
  Bar: ({ dataKey, fill }: any) => <div data-testid="bar" data-key={dataKey} data-fill={fill} />,
  XAxis: ({ dataKey, label }: any) => <div data-testid="x-axis" data-key={dataKey} data-label={JSON.stringify(label)} />,
  YAxis: ({ label }: any) => <div data-testid="y-axis" data-label={JSON.stringify(label)} />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
}));

global.fetch = jest.fn();

describe('AdminPage Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  it('should show loading state initially', () => {
    (global.fetch as jest.Mock).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<AdminPage />);

    expect(screen.getByText('Cargando...')).toBeInTheDocument();
  });

  it('should fetch admin data on mount', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({
        total: 100,
        last: '2024-01-15, 10:00:00',
        data: [
          { bucket: '0-300k', count: 20 },
          { bucket: '300k-500k', count: 30 },
        ],
      }),
    });

    render(<AdminPage />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/admin-data');
    });
  });

  it('should display total listings count', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({
        total: 150,
        last: '2024-01-15, 10:00:00',
        data: [],
      }),
    });

    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getByText(/Total listings: 150/i)).toBeInTheDocument();
    });
  });

  it('should display last scrape time', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({
        total: 100,
        last: '2024-01-15, 10:30:00',
        data: [],
      }),
    });

    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getByText(/Último scrape: 2024-01-15, 10:30:00/i)).toBeInTheDocument();
    });
  });

  it('should display null when last scrape is null', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({
        total: 100,
        last: null,
        data: [],
      }),
    });

    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getByText(/Último scrape:/i)).toBeInTheDocument();
    });
  });

  it('should render page title', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({
        total: 100,
        last: '2024-01-15, 10:00:00',
        data: [],
      }),
    });

    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getByText('Rent Widget – Admin')).toBeInTheDocument();
    });
  });

  it('should render bar chart with correct data', async () => {
    const mockData = [
      { bucket: '0-300k', count: 20 },
      { bucket: '300k-500k', count: 30 },
      { bucket: '500k-700k', count: 25 },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({
        total: 75,
        last: '2024-01-15, 10:00:00',
        data: mockData,
      }),
    });

    render(<AdminPage />);

    await waitFor(() => {
      const barChart = screen.getByTestId('bar-chart');
      expect(barChart).toBeInTheDocument();
      expect(barChart.getAttribute('data-chart-data')).toBe(JSON.stringify(mockData));
    });
  });

  it('should render responsive container', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({
        total: 100,
        last: '2024-01-15, 10:00:00',
        data: [],
      }),
    });

    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });
  });

  it('should render X axis with bucket data key', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({
        total: 100,
        last: '2024-01-15, 10:00:00',
        data: [{ bucket: '0-300k', count: 20 }],
      }),
    });

    render(<AdminPage />);

    await waitFor(() => {
      const xAxis = screen.getByTestId('x-axis');
      expect(xAxis).toBeInTheDocument();
      expect(xAxis.getAttribute('data-key')).toBe('bucket');
    });
  });

  it('should render Y axis', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({
        total: 100,
        last: '2024-01-15, 10:00:00',
        data: [{ bucket: '0-300k', count: 20 }],
      }),
    });

    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getByTestId('y-axis')).toBeInTheDocument();
    });
  });

  it('should render Bar with count data key', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({
        total: 100,
        last: '2024-01-15, 10:00:00',
        data: [{ bucket: '0-300k', count: 20 }],
      }),
    });

    render(<AdminPage />);

    await waitFor(() => {
      const bar = screen.getByTestId('bar');
      expect(bar).toBeInTheDocument();
      expect(bar.getAttribute('data-key')).toBe('count');
      expect(bar.getAttribute('data-fill')).toBe('#8884d8');
    });
  });

  it('should render Tooltip', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({
        total: 100,
        last: '2024-01-15, 10:00:00',
        data: [{ bucket: '0-300k', count: 20 }],
      }),
    });

    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    });
  });

  it('should handle empty data array', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({
        total: 0,
        last: null,
        data: [],
      }),
    });

    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getByText(/Total listings: 0/i)).toBeInTheDocument();
      const barChart = screen.getByTestId('bar-chart');
      expect(barChart.getAttribute('data-chart-data')).toBe('[]');
    });
  });

  it('should handle all price buckets', async () => {
    const allBuckets = [
      { bucket: '0-300k', count: 20 },
      { bucket: '300k-500k', count: 30 },
      { bucket: '500k-700k', count: 25 },
      { bucket: '700k-1M', count: 15 },
      { bucket: '1M+', count: 10 },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({
        total: 100,
        last: '2024-01-15, 10:00:00',
        data: allBuckets,
      }),
    });

    render(<AdminPage />);

    await waitFor(() => {
      const barChart = screen.getByTestId('bar-chart');
      expect(barChart.getAttribute('data-chart-data')).toBe(JSON.stringify(allBuckets));
    });
  });

  it('should display data after loading completes', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({
        total: 100,
        last: '2024-01-15, 10:00:00',
        data: [{ bucket: '0-300k', count: 20 }],
      }),
    });

    render(<AdminPage />);

    expect(screen.getByText('Cargando...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText('Cargando...')).not.toBeInTheDocument();
      expect(screen.getByText('Rent Widget – Admin')).toBeInTheDocument();
    });
  });

  it('should only fetch data once on mount', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({
        total: 100,
        last: '2024-01-15, 10:00:00',
        data: [],
      }),
    });

    render(<AdminPage />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  it('should handle large numbers in total', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({
        total: 999999,
        last: '2024-01-15, 10:00:00',
        data: [],
      }),
    });

    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getByText(/Total listings: 999999/i)).toBeInTheDocument();
    });
  });

  it('should handle BigInt values in count', async () => {
    const mockData = [
      { bucket: '0-300k', count: 9007199254740991 }, // Large number
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({
        total: 100,
        last: '2024-01-15, 10:00:00',
        data: mockData,
      }),
    });

    render(<AdminPage />);

    await waitFor(() => {
      const barChart = screen.getByTestId('bar-chart');
      expect(barChart).toBeInTheDocument();
    });
  });
});
